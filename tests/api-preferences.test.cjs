const assert = require('node:assert/strict');
const test = require('node:test');
const Module = require('node:module');
const catalog = require('../artifacts/gaminet-gamin-vote/content/catalog.json');

test('protected results return per-person rankings from existing ballots without changing storage', async () => {
  const lapinou = catalog.items.filter((item) => item.designId === 'V3_Lapinou');
  const shirt = lapinou.find((item) => item.garment.id === 'crewneck');
  const bag = lapinou.find((item) => item.garment.id === 'tote');
  const rows = [
    { voter_group: 'famille', selected_item_ids: [shirt.id, bag.id], updated_at: 1 },
    { voter_group: 'famille', selected_item_ids: [shirt.id], updated_at: 2 },
  ];
  let queries = 0;
  const originalLoad = Module._load;
  const originalEnv = { database: process.env.DATABASE_URL, password: process.env.ADMIN_PASSWORD };
  process.env.DATABASE_URL = 'postgres://offline-test';
  process.env.ADMIN_PASSWORD = 'test-preferences-only';
  Module._load = function (name, ...args) {
    if (name === 'pg') return { Pool: class {
      async query(sql) { queries += 1; return { rows: sql.includes('SELECT') ? rows : [] }; }
    } };
    return originalLoad.call(this, name, ...args);
  };
  const handler = require('../api/votes.js');
  Module._load = originalLoad;
  async function request(input) {
    const response = { headers: {}, setHeader(key, value) { this.headers[key] = value; }, end(body) { this.body = JSON.parse(body); } };
    await handler(input, response);
    return response;
  }
  try {
    const query = { mode: 'results', campaignId: catalog.campaign.id };
    const rejected = await request({ method: 'GET', query });
    assert.equal(rejected.statusCode, 401);
    assert.equal(queries, 0);
    const login = await request({ method: 'POST', body: { action: 'admin-login', password: 'test-preferences-only' } });
    const response = await request({ method: 'GET', query, headers: { cookie: login.headers['Set-Cookie'].split(';')[0] } });
    assert.equal(response.statusCode, 200);
    assert.equal(response.body.illustrationCounts.V3_Lapinou, 2);
    assert.equal(response.body.itemCounts[shirt.id], 2);
    assert.equal(response.body.totalVotes, 3);
    assert.equal(response.body.groups.famille.illustrations.V3_Lapinou.participants, 2);
    assert.equal(response.body.illustrations.V3_Lapinou.garmentCounts.tote, 1);
    assert.equal(JSON.stringify(response.body).includes('selected_item_ids'), false);
  } finally {
    if (originalEnv.database === undefined) delete process.env.DATABASE_URL; else process.env.DATABASE_URL = originalEnv.database;
    if (originalEnv.password === undefined) delete process.env.ADMIN_PASSWORD; else process.env.ADMIN_PASSWORD = originalEnv.password;
  }
});
