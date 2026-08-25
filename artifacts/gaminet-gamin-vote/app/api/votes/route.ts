import { env } from 'cloudflare:workers';
import { NextRequest, NextResponse } from 'next/server';
import catalog from '../../../content/catalog.json';

export const runtime = 'edge';
export const dynamic = 'force-dynamic';

const validItemIds = new Set(
  catalog.items.filter((item) => item.active).map((item) => item.id),
);
const validCampaignIds = new Set([catalog.campaign.id]);

let schemaReady: Promise<void> | null = null;

function ensureSchema() {
  if (!schemaReady) {
    schemaReady = env.DB.batch([
      env.DB.prepare(`
        CREATE TABLE IF NOT EXISTS ballots (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          campaign_id TEXT NOT NULL,
          voter_id TEXT NOT NULL,
          voter_name TEXT,
          voter_group TEXT,
          selected_item_ids TEXT NOT NULL,
          submitted_at INTEGER NOT NULL,
          updated_at INTEGER NOT NULL
        )
      `),
      env.DB.prepare(`
        CREATE UNIQUE INDEX IF NOT EXISTS idx_ballots_campaign_voter
        ON ballots(campaign_id, voter_id)
      `),
      env.DB.prepare(`
        CREATE INDEX IF NOT EXISTS idx_ballots_campaign
        ON ballots(campaign_id)
      `),
    ]).then(() => undefined);
  }
  return schemaReady;
}

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function cleanText(value: unknown, maximum = 80) {
  return typeof value === 'string'
    ? value.replace(/[<>]/g, '').trim().slice(0, maximum)
    : '';
}

function validPublicId(value: string) {
  return /^[a-zA-Z0-9_-]{6,100}$/.test(value);
}

export async function GET(request: NextRequest) {
  await ensureSchema();
  const { searchParams } = request.nextUrl;
  const mode = searchParams.get('mode') ?? 'ballot';
  const campaignId = searchParams.get('campaignId') ?? '';

  if (!validCampaignIds.has(campaignId)) {
    return json({ error: 'Campagne inconnue.' }, { status: 400 });
  }

  if (mode === 'ballot') {
    const voterId = searchParams.get('voterId') ?? '';
    if (!validPublicId(voterId)) {
      return json({ ballot: null });
    }
    const ballot = await env.DB.prepare(
      `SELECT voter_name, voter_group, selected_item_ids, updated_at
       FROM ballots
       WHERE campaign_id = ? AND voter_id = ?`,
    )
      .bind(campaignId, voterId)
      .first<{
        voter_name: string | null;
        voter_group: string | null;
        selected_item_ids: string;
        updated_at: number;
      }>();

    return json({
      ballot: ballot
        ? {
            voterName: ballot.voter_name ?? '',
            voterGroup: ballot.voter_group ?? '',
            selectedItemIds: JSON.parse(ballot.selected_item_ids),
            updatedAt: ballot.updated_at,
          }
        : null,
    });
  }

  if (mode !== 'results') {
    return json({ error: 'Mode inconnu.' }, { status: 400 });
  }

  const suppliedKey = searchParams.get('key') ?? '';
  const configuredKey = env.RESULTS_KEY || 'local-preview';
  if (!suppliedKey || suppliedKey !== configuredKey) {
    return json({ error: 'Lien de résultats invalide.' }, { status: 403 });
  }

  const result = await env.DB.prepare(
    `SELECT voter_group, selected_item_ids, updated_at
     FROM ballots
     WHERE campaign_id = ?
     ORDER BY updated_at DESC`,
  )
    .bind(campaignId)
    .all<{
      voter_group: string | null;
      selected_item_ids: string;
      updated_at: number;
    }>();

  const itemCounts: Record<string, number> = {};
  const groupCounts: Record<string, { participants: number; itemCounts: Record<string, number> }> = {};
  let lastVoteAt = 0;

  for (const row of result.results) {
    const group = row.voter_group?.trim() || 'Sans groupe';
    groupCounts[group] ??= { participants: 0, itemCounts: {} };
    groupCounts[group].participants += 1;
    lastVoteAt = Math.max(lastVoteAt, row.updated_at);
    const selections = JSON.parse(row.selected_item_ids) as string[];
    for (const itemId of selections) {
      if (!validItemIds.has(itemId)) continue;
      itemCounts[itemId] = (itemCounts[itemId] ?? 0) + 1;
      groupCounts[group].itemCounts[itemId] =
        (groupCounts[group].itemCounts[itemId] ?? 0) + 1;
    }
  }

  return json({
    campaignId,
    participants: result.results.length,
    itemCounts,
    groups: groupCounts,
    lastVoteAt,
  });
}

export async function POST(request: NextRequest) {
  await ensureSchema();
  const body = (await request.json()) as Record<string, unknown>;
  const campaignId = cleanText(body.campaignId, 64);
  const voterId = cleanText(body.voterId, 100);
  const voterName = cleanText(body.voterName, 80);
  const voterGroup = cleanText(body.voterGroup, 60);
  const selectedItemIds = Array.isArray(body.selectedItemIds)
    ? [...new Set(body.selectedItemIds.filter((item): item is string => typeof item === 'string'))]
    : [];

  if (!validCampaignIds.has(campaignId) || !validPublicId(voterId)) {
    return json({ error: 'Bulletin invalide.' }, { status: 400 });
  }
  if (
    selectedItemIds.length > catalog.campaign.maxSelections ||
    selectedItemIds.some((itemId) => !validItemIds.has(itemId))
  ) {
    return json(
      { error: `Choisissez de ${catalog.campaign.minSelections} à ${catalog.campaign.maxSelections} morceaux.` },
      { status: 400 },
    );
  }

  if (selectedItemIds.length === 0) {
    await env.DB.prepare(
      `DELETE FROM ballots WHERE campaign_id = ? AND voter_id = ?`,
    )
      .bind(campaignId, voterId)
      .run();
    return json({ success: true, removed: true }, { status: 200 });
  }

  const now = Date.now();
  await env.DB.prepare(
    `INSERT INTO ballots (
       campaign_id, voter_id, voter_name, voter_group,
       selected_item_ids, submitted_at, updated_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(campaign_id, voter_id) DO UPDATE SET
       voter_name = excluded.voter_name,
       voter_group = excluded.voter_group,
       selected_item_ids = excluded.selected_item_ids,
       updated_at = excluded.updated_at`,
  )
    .bind(
      campaignId,
      voterId,
      voterName || null,
      voterGroup || null,
      JSON.stringify(selectedItemIds),
      now,
      now,
    )
    .run();

  return json({ success: true, updatedAt: now }, { status: 201 });
}
