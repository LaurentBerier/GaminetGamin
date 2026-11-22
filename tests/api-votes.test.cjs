const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');

test('ballot requests recover after database initialization fails', async () => {
  let initializations = 0;
  let ballotReads = 0;
  class Pool {
    async query(sql) {
      if (sql.includes('CREATE TABLE')) {
        initializations += 1;
        if (initializations === 1) throw new Error('Database is paused');
      } else {
        ballotReads += 1;
      }
      return { rows: [] };
    }
  }

  const context = {
    require(name) {
      if (name === 'pg') return { Pool };
      if (name.endsWith('/content/catalog.json')) {
        return { campaign: { id: 'collection-2026' }, items: [] };
      }
      return require(name);
    },
    process: { env: { DATABASE_URL: 'postgres://offline-test' } },
    module: { exports: {} },
    Error,
    Buffer,
  };
  vm.runInNewContext(
    fs.readFileSync(path.join(__dirname, '../api/votes.js'), 'utf8'),
    context,
  );

  async function readBallot() {
    const response = {
      statusCode: 0,
      body: undefined,
      setHeader() {},
      end(body) { this.body = JSON.parse(body); },
    };
    await context.module.exports({
      method: 'GET',
      query: { mode: 'ballot', campaignId: 'collection-2026', voterId: 'offline-test-voter' },
    }, response);
    return response;
  }

  assert.equal((await readBallot()).statusCode, 503);
  for (let index = 0; index < 2; index += 1) {
    const response = await readBallot();
    assert.equal(response.statusCode, 200);
    assert.deepEqual(response.body, { ballot: null });
  }
  assert.equal(initializations, 2);
  assert.equal(ballotReads, 2);
});
