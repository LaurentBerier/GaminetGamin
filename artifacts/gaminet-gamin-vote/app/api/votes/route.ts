import { NextRequest, NextResponse } from 'next/server';
import catalog from '../../../content/catalog.json';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

type StoredBallot = {
  voterName: string;
  voterGroup: string;
  selectedItemIds: string[];
  submittedAt: number;
  updatedAt: number;
};

type RedisResponse<T> = {
  result?: T;
  error?: string;
};

const validItemIds = new Set(
  catalog.items.filter((item) => item.active).map((item) => item.id),
);
const validCampaignIds = new Set([catalog.campaign.id]);

function redisConfig() {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;

  if (!url || !token) {
    throw new Error(
      'Le stockage des votes n’est pas configuré. Connectez une base Redis Upstash au projet Vercel.',
    );
  }

  return { url: url.replace(/\/$/, ''), token };
}

async function redisCommand<T>(command: Array<string | number>) {
  const { url, token } = redisConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const body = (await response.json()) as RedisResponse<T>;
  if (!response.ok || body.error) {
    throw new Error(body.error || 'Le stockage des votes est indisponible.');
  }
  return body.result as T;
}

function ballotKey(campaignId: string, voterId: string) {
  return `gg:ballot:${campaignId}:${voterId}`;
}

function voterSetKey(campaignId: string) {
  return `gg:voters:${campaignId}`;
}

async function readBallot(campaignId: string, voterId: string) {
  const raw = await redisCommand<string | null>([
    'GET',
    ballotKey(campaignId, voterId),
  ]);
  return raw ? (JSON.parse(raw) as StoredBallot) : null;
}

async function readCampaignBallots(campaignId: string) {
  const voterIds = await redisCommand<string[]>([
    'SMEMBERS',
    voterSetKey(campaignId),
  ]);
  if (!voterIds.length) return [];

  const records = await redisCommand<Array<string | null>>([
    'MGET',
    ...voterIds.map((voterId) => ballotKey(campaignId, voterId)),
  ]);
  return records.flatMap((raw) =>
    raw ? [JSON.parse(raw) as StoredBallot] : [],
  );
}

async function saveBallot(
  campaignId: string,
  voterId: string,
  ballot: StoredBallot,
) {
  await redisCommand<string>([
    'SET',
    ballotKey(campaignId, voterId),
    JSON.stringify(ballot),
  ]);
  await redisCommand<number>([
    'SADD',
    voterSetKey(campaignId),
    voterId,
  ]);
}

async function removeBallot(campaignId: string, voterId: string) {
  await redisCommand<number>(['DEL', ballotKey(campaignId, voterId)]);
  await redisCommand<number>([
    'SREM',
    voterSetKey(campaignId),
    voterId,
  ]);
}

function json(data: unknown, init?: ResponseInit) {
  const response = NextResponse.json(data, init);
  response.headers.set('Cache-Control', 'no-store');
  return response;
}

function storageError(reason: unknown) {
  const message =
    reason instanceof Error
      ? reason.message
      : 'Le stockage des votes est indisponible.';
  return json({ error: message }, { status: 503 });
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

    try {
      return json({ ballot: await readBallot(campaignId, voterId) });
    } catch (reason) {
      return storageError(reason);
    }
  }

  if (mode !== 'results') {
    return json({ error: 'Mode inconnu.' }, { status: 400 });
  }

  const suppliedKey = searchParams.get('key') ?? '';
  const configuredKey = process.env.RESULTS_KEY || 'local-preview';
  if (!suppliedKey || suppliedKey !== configuredKey) {
    return json({ error: 'Lien de résultats invalide.' }, { status: 403 });
  }

  try {
    const ballots = await readCampaignBallots(campaignId);
    const itemCounts: Record<string, number> = {};
    const groupCounts: Record<
      string,
      { participants: number; itemCounts: Record<string, number> }
    > = {};
    let lastVoteAt = 0;

    for (const ballot of ballots) {
      const group = ballot.voterGroup.trim() || 'Sans groupe';
      groupCounts[group] ??= { participants: 0, itemCounts: {} };
      groupCounts[group].participants += 1;
      lastVoteAt = Math.max(lastVoteAt, ballot.updatedAt);
      for (const itemId of ballot.selectedItemIds) {
        if (!validItemIds.has(itemId)) continue;
        itemCounts[itemId] = (itemCounts[itemId] ?? 0) + 1;
        groupCounts[group].itemCounts[itemId] =
          (groupCounts[group].itemCounts[itemId] ?? 0) + 1;
      }
    }

    return json({
      campaignId,
      participants: ballots.length,
      itemCounts,
      groups: groupCounts,
      lastVoteAt,
    });
  } catch (reason) {
    return storageError(reason);
  }
}

export async function POST(request: NextRequest) {
  const body = (await request.json()) as Record<string, unknown>;
  const campaignId = cleanText(body.campaignId, 64);
  const voterId = cleanText(body.voterId, 100);
  const voterName = cleanText(body.voterName, 80);
  const voterGroup = cleanText(body.voterGroup, 60);
  const selectedItemIds = Array.isArray(body.selectedItemIds)
    ? [
        ...new Set(
          body.selectedItemIds.filter(
            (item): item is string => typeof item === 'string',
          ),
        ),
      ]
    : [];

  if (!validCampaignIds.has(campaignId) || !validPublicId(voterId)) {
    return json({ error: 'Bulletin invalide.' }, { status: 400 });
  }
  if (selectedItemIds.some((itemId) => !validItemIds.has(itemId))) {
    return json(
      {
        error: 'Choisissez uniquement parmi les morceaux disponibles.',
      },
      { status: 400 },
    );
  }

  try {
    if (selectedItemIds.length === 0) {
      await removeBallot(campaignId, voterId);
      return json({ success: true, removed: true }, { status: 200 });
    }

    const existing = await readBallot(campaignId, voterId);
    const now = Date.now();
    await saveBallot(campaignId, voterId, {
      voterName,
      voterGroup,
      selectedItemIds,
      submittedAt: existing?.submittedAt ?? now,
      updatedAt: now,
    });

    return json({ success: true, updatedAt: now }, { status: 201 });
  } catch (reason) {
    return storageError(reason);
  }
}
