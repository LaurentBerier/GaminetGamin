const { Pool } = require('pg');
const { createHmac, timingSafeEqual } = require('crypto');
const catalog = require('../artifacts/gaminet-gamin-vote/content/catalog.json');

const validItemIds = new Set(
  catalog.items.filter((item) => item.active).map((item) => item.id),
);
const validCampaignIds = new Set([catalog.campaign.id]);

let pool;
let schemaReady;

const adminCookieName = 'gg_admin';
const adminSessionDurationSeconds = 8 * 60 * 60;

function cleanText(value, maximum = 80) {
  return typeof value === 'string'
    ? value.replace(/[<>]/g, '').trim().slice(0, maximum)
    : '';
}

function validPublicId(value) {
  return /^[a-zA-Z0-9_-]{6,100}$/.test(value);
}

function queryValue(value) {
  return Array.isArray(value) ? value[0] ?? '' : value ?? '';
}

function send(response, status, data) {
  response.statusCode = status;
  response.setHeader('Content-Type', 'application/json; charset=utf-8');
  response.setHeader('Cache-Control', 'no-store');
  response.end(JSON.stringify(data));
}

function adminSecret() {
  return process.env.ADMIN_PASSWORD || process.env.RESULTS_KEY || '';
}

function safelyMatches(supplied, expected) {
  const suppliedBuffer = Buffer.from(supplied);
  const expectedBuffer = Buffer.from(expected);
  return (
    suppliedBuffer.length === expectedBuffer.length &&
    timingSafeEqual(suppliedBuffer, expectedBuffer)
  );
}

function adminSignature(secret, expiresAt) {
  return createHmac('sha256', secret)
    .update(`gaminet-gamin-admin:${expiresAt}`)
    .digest('base64url');
}

function cookieValue(request, name) {
  const cookieHeader = request.headers?.cookie ?? '';
  for (const part of cookieHeader.split(';')) {
    const [cookieName, ...valueParts] = part.trim().split('=');
    if (cookieName === name) {
      try {
        return decodeURIComponent(valueParts.join('='));
      } catch {
        return '';
      }
    }
  }
  return '';
}

function hasAdminSession(request) {
  const secret = adminSecret();
  if (!secret) return false;
  const [rawExpiry, signature] = cookieValue(request, adminCookieName).split('.');
  const expiresAt = Number(rawExpiry);
  if (
    !Number.isSafeInteger(expiresAt) ||
    expiresAt <= Date.now() ||
    !signature
  ) {
    return false;
  }
  return safelyMatches(signature, adminSignature(secret, expiresAt));
}

function secureCookieSuffix(request) {
  const forwardedProtocol = queryValue(request.headers?.['x-forwarded-proto']);
  return process.env.NODE_ENV === 'production' || forwardedProtocol === 'https'
    ? '; Secure'
    : '';
}

function startAdminSession(request, response) {
  const secret = adminSecret();
  const expiresAt = Date.now() + adminSessionDurationSeconds * 1000;
  const value = `${expiresAt}.${adminSignature(secret, expiresAt)}`;
  response.setHeader(
    'Set-Cookie',
    `${adminCookieName}=${encodeURIComponent(value)}; HttpOnly; SameSite=Strict; Path=/; Max-Age=${adminSessionDurationSeconds}${secureCookieSuffix(request)}`,
  );
}

function endAdminSession(request, response) {
  response.setHeader(
    'Set-Cookie',
    `${adminCookieName}=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0${secureCookieSuffix(request)}`,
  );
}

async function getPool() {
  if (!process.env.DATABASE_URL) return null;
  pool ??= new Pool({ connectionString: process.env.DATABASE_URL });
  schemaReady ??= pool
    .query(`
      CREATE TABLE IF NOT EXISTS gaminet_ballots (
        id BIGSERIAL PRIMARY KEY,
        campaign_id TEXT NOT NULL,
        voter_id TEXT NOT NULL,
        voter_name TEXT,
        voter_group TEXT,
        selected_item_ids JSONB NOT NULL,
        submitted_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        UNIQUE (campaign_id, voter_id)
      )
    `)
    .then(() => undefined);
  await schemaReady;
  return pool;
}

function redisConfig() {
  const url =
    process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token =
    process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ''), token } : null;
}

async function redisCommand(command) {
  const config = redisConfig();
  if (!config) {
    throw new Error('Le stockage des votes n’est pas configuré sur Vercel.');
  }
  const response = await fetch(config.url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
  });
  const body = await response.json();
  if (!response.ok || body.error) {
    throw new Error(body.error || 'Le stockage des votes est indisponible.');
  }
  return body.result;
}

function ballotKey(campaignId, voterId) {
  return `gg:ballot:${campaignId}:${voterId}`;
}

function voterSetKey(campaignId) {
  return `gg:voters:${campaignId}`;
}

function normalizePostgresBallot(row) {
  return row
    ? {
        voterName: row.voter_name ?? '',
        voterGroup: row.voter_group ?? '',
        selectedItemIds: row.selected_item_ids,
        submittedAt: Number(row.submitted_at),
        updatedAt: Number(row.updated_at),
      }
    : null;
}

async function readBallot(campaignId, voterId) {
  const database = await getPool();
  if (database) {
    const result = await database.query(
      `SELECT voter_name, voter_group, selected_item_ids, submitted_at, updated_at
       FROM gaminet_ballots
       WHERE campaign_id = $1 AND voter_id = $2`,
      [campaignId, voterId],
    );
    return normalizePostgresBallot(result.rows[0]);
  }

  const raw = await redisCommand(['GET', ballotKey(campaignId, voterId)]);
  return raw ? JSON.parse(raw) : null;
}

async function readCampaignBallots(campaignId) {
  const database = await getPool();
  if (database) {
    const result = await database.query(
      `SELECT voter_name, voter_group, selected_item_ids, submitted_at, updated_at
       FROM gaminet_ballots
       WHERE campaign_id = $1`,
      [campaignId],
    );
    return result.rows.map(normalizePostgresBallot).filter(Boolean);
  }

  const voterIds = await redisCommand(['SMEMBERS', voterSetKey(campaignId)]);
  if (!voterIds.length) return [];
  const records = await redisCommand([
    'MGET',
    ...voterIds.map((voterId) => ballotKey(campaignId, voterId)),
  ]);
  return records.flatMap((raw) => (raw ? [JSON.parse(raw)] : []));
}

async function saveBallot(campaignId, voterId, ballot) {
  const database = await getPool();
  if (database) {
    await database.query(
      `INSERT INTO gaminet_ballots (
         campaign_id, voter_id, voter_name, voter_group,
         selected_item_ids, submitted_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7)
       ON CONFLICT (campaign_id, voter_id) DO UPDATE SET
         voter_name = EXCLUDED.voter_name,
         voter_group = EXCLUDED.voter_group,
         selected_item_ids = EXCLUDED.selected_item_ids,
         updated_at = EXCLUDED.updated_at`,
      [
        campaignId,
        voterId,
        ballot.voterName || null,
        ballot.voterGroup || null,
        JSON.stringify(ballot.selectedItemIds),
        ballot.submittedAt,
        ballot.updatedAt,
      ],
    );
    return;
  }

  await redisCommand([
    'SET',
    ballotKey(campaignId, voterId),
    JSON.stringify(ballot),
  ]);
  await redisCommand(['SADD', voterSetKey(campaignId), voterId]);
}

async function removeBallot(campaignId, voterId) {
  const database = await getPool();
  if (database) {
    await database.query(
      'DELETE FROM gaminet_ballots WHERE campaign_id = $1 AND voter_id = $2',
      [campaignId, voterId],
    );
    return;
  }

  await redisCommand(['DEL', ballotKey(campaignId, voterId)]);
  await redisCommand(['SREM', voterSetKey(campaignId), voterId]);
}

async function handleGet(request, response) {
  const mode = queryValue(request.query.mode) || 'ballot';
  const campaignId = queryValue(request.query.campaignId);
  if (!validCampaignIds.has(campaignId)) {
    return send(response, 400, { error: 'Campagne inconnue.' });
  }

  if (mode === 'ballot') {
    const voterId = queryValue(request.query.voterId);
    if (!validPublicId(voterId)) return send(response, 200, { ballot: null });
    return send(response, 200, { ballot: await readBallot(campaignId, voterId) });
  }

  if (mode !== 'results') {
    return send(response, 400, { error: 'Mode inconnu.' });
  }
  if (!adminSecret()) {
    return send(response, 503, {
      error: 'Le mot de passe administrateur n’est pas configuré.',
    });
  }
  if (!hasAdminSession(request)) {
    return send(response, 401, { error: 'Authentification administrateur requise.' });
  }

  const ballots = await readCampaignBallots(campaignId);
  const itemCounts = {};
  const groups = {};
  let lastVoteAt = 0;
  let totalVotes = 0;
  for (const ballot of ballots) {
    const group = ballot.voterGroup.trim() || 'Sans groupe';
    groups[group] ??= { participants: 0, itemCounts: {} };
    groups[group].participants += 1;
    lastVoteAt = Math.max(lastVoteAt, ballot.updatedAt);
    for (const itemId of ballot.selectedItemIds) {
      if (!validItemIds.has(itemId)) continue;
      totalVotes += 1;
      itemCounts[itemId] = (itemCounts[itemId] ?? 0) + 1;
      groups[group].itemCounts[itemId] =
        (groups[group].itemCounts[itemId] ?? 0) + 1;
    }
  }
  return send(response, 200, {
    campaignId,
    participants: ballots.length,
    totalVotes,
    itemCounts,
    groups,
    lastVoteAt,
  });
}

async function handlePost(request, response) {
  const body =
    typeof request.body === 'string' ? JSON.parse(request.body) : request.body ?? {};

  if (body.action === 'admin-login') {
    const secret = adminSecret();
    if (!secret) {
      return send(response, 503, {
        error: 'Le mot de passe administrateur n’est pas configuré.',
      });
    }
    const password = typeof body.password === 'string' && body.password.length <= 1024
      ? body.password
      : '';
    if (!safelyMatches(password, secret)) {
      return send(response, 401, { error: 'Mot de passe incorrect.' });
    }
    startAdminSession(request, response);
    return send(response, 200, { success: true });
  }

  if (body.action === 'admin-logout') {
    endAdminSession(request, response);
    return send(response, 200, { success: true });
  }

  const campaignId = cleanText(body.campaignId, 64);
  const voterId = cleanText(body.voterId, 100);
  const voterName = cleanText(body.voterName, 80);
  const voterGroup = cleanText(body.voterGroup, 60);
  const selectedItemIds = Array.isArray(body.selectedItemIds)
    ? [...new Set(body.selectedItemIds.filter((item) => typeof item === 'string'))]
    : [];

  if (!validCampaignIds.has(campaignId) || !validPublicId(voterId)) {
    return send(response, 400, { error: 'Bulletin invalide.' });
  }
  if (
    selectedItemIds.length > catalog.campaign.maxSelections ||
    selectedItemIds.some((itemId) => !validItemIds.has(itemId))
  ) {
    return send(response, 400, {
      error: `Choisissez de ${catalog.campaign.minSelections} à ${catalog.campaign.maxSelections} morceaux.`,
    });
  }

  if (!selectedItemIds.length) {
    await removeBallot(campaignId, voterId);
    return send(response, 200, { success: true, removed: true });
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
  return send(response, 201, { success: true, updatedAt: now });
}

module.exports = async function votes(request, response) {
  try {
    if (request.method === 'GET') return await handleGet(request, response);
    if (request.method === 'POST') return await handlePost(request, response);
    response.setHeader('Allow', 'GET, POST');
    return send(response, 405, { error: 'Méthode non permise.' });
  } catch (reason) {
    return send(response, 503, {
      error:
        reason instanceof Error
          ? reason.message
          : 'Le stockage des votes est indisponible.',
    });
  }
};
