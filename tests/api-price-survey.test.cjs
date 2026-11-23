const assert = require("node:assert/strict");
const test = require("node:test");
const Module = require("node:module");
const { createHmac } = require("node:crypto");
const catalog = require("../artifacts/gaminet-gamin-vote/content/catalog.json");
const models = [
  ...new Map(
    catalog.items
      .filter((item) => item.active && item.garment.id === "tshirt")
      .map((item) => [item.designId, item]),
  ).values(),
].slice(0, 4);
const ids = models.map((item) => item.id);
const answer = {
  version: 1,
  status: "answered",
  itemId: ids[0],
  garmentId: "tshirt",
  amount: 39.5,
  currency: "CAD",
  charity: "fondation-chu-sainte-justine",
};

for (const backend of ["postgres", "redis"])
  test(`${backend}: price responses persist, edit without duplicates, preserve favorites and require admin for results`, async () => {
    const env = { ...process.env };
    const originalFetch = global.fetch;
    const originalLoad = Module._load;
    const rows = new Map();
    const values = new Map();
    const sets = new Map();
    process.env.ADMIN_PASSWORD = "local-test-password";
    delete process.env.DATABASE_URL;
    if (backend === "postgres")
      process.env.DATABASE_URL = "postgres://offline-test";
    else {
      process.env.KV_REST_API_URL = "https://redis.invalid";
      process.env.KV_REST_API_TOKEN = "local-test";
    }
    Module._load = function (name, ...args) {
      if (name === "pg")
        return {
          Pool: class {
            async query(sql, params = []) {
              if (sql.includes("CREATE TABLE")) return { rows: [] };
              const key = params[0] + ":" + params[1];
              if (sql.includes("INSERT"))
                rows.set(key, {
                  voter_name: params[2],
                  voter_group: params[3],
                  selected_item_ids: JSON.parse(params[4]),
                  submitted_at: params[5],
                  updated_at: params[6],
                  price_survey: JSON.parse(params[7]),
                });
              if (sql.includes("DELETE")) rows.delete(key);
              if (sql.includes("SELECT"))
                return {
                  rows:
                    params.length === 2
                      ? rows.has(key)
                        ? [rows.get(key)]
                        : []
                      : [...rows.values()],
                };
              return { rows: [] };
            }
          },
        };
      return originalLoad.call(this, name, ...args);
    };
    global.fetch = async (_url, options) => {
      const [command, key, value] = JSON.parse(options.body);
      let result = null;
      if (command === "GET") result = values.get(key) ?? null;
      if (command === "SET") {
        values.set(key, value);
        result = "OK";
      }
      if (command === "SADD") {
        if (!sets.has(key)) sets.set(key, new Set());
        sets.get(key).add(value);
        result = 1;
      }
      if (command === "SMEMBERS") result = [...(sets.get(key) ?? [])];
      if (command === "MGET")
        result = JSON.parse(options.body)
          .slice(1)
          .map((key) => values.get(key) ?? null);
      if (command === "DEL") values.delete(key);
      if (command === "SREM") sets.get(key)?.delete(value);
      return { ok: true, json: async () => ({ result }) };
    };
    delete require.cache[require.resolve("../api/votes.js")];
    const handler = require("../api/votes.js");
    Module._load = originalLoad;
    async function request(input) {
      const response = {
        headers: {},
        setHeader(key, value) {
          this.headers[key] = value;
        },
        end(body) {
          this.body = JSON.parse(body);
        },
      };
      await handler(input, response);
      return response;
    }
    const base = {
      campaignId: catalog.campaign.id,
      voterId: "local-survey-voter",
    };
    const vote = (selectedItemIds) =>
      request({
        method: "POST",
        body: { ...base, selectedItemIds, voterGroup: "test" },
      });
    const survey = (priceSurvey) =>
      request({
        method: "POST",
        body: { ...base, action: "price-survey", priceSurvey },
      });
    const ballot = () =>
      request({ method: "GET", query: { ...base, mode: "ballot" } });
    try {
      assert.equal((await survey(answer)).statusCode, 400);
      await vote(ids.slice(0, 2));
      assert.equal((await survey(answer)).statusCode, 400);
      await vote(ids.slice(0, 3));
      assert.equal((await survey({ ...answer, amount: -1 })).statusCode, 400);
      assert.equal((await survey(answer)).statusCode, 200);
      await vote(ids);
      let saved = (await ballot()).body.ballot;
      assert.deepEqual(saved.selectedItemIds, ids);
      assert.equal(saved.priceSurvey.amount, 39.5);
      await survey({ ...answer, amount: 45 });
      saved = (await ballot()).body.ballot;
      assert.equal(saved.priceSurvey.amount, 45);
      assert.deepEqual(saved.selectedItemIds, ids);
      const query = { mode: "results", campaignId: catalog.campaign.id };
      assert.equal((await request({ method: "GET", query })).statusCode, 401);
      assert.equal(
        (
          await request({
            method: "POST",
            body: { action: "admin-login", password: "wrong" },
          })
        ).statusCode,
        401,
      );
      const login = await request({
        method: "POST",
        body: { action: "admin-login", password: process.env.ADMIN_PASSWORD },
        headers: { "x-forwarded-proto": "https" },
      });
      assert.equal(login.statusCode, 200);
      assert.match(login.headers["Set-Cookie"], /HttpOnly; SameSite=Strict/);
      assert.match(login.headers["Set-Cookie"], /; Secure$/);
      const cookie = login.headers["Set-Cookie"].split(";")[0];
      const result = await request({
        method: "GET",
        query,
        headers: { cookie },
      });
      assert.equal(result.body.priceSurvey.responses, 1);
      assert.equal(result.body.priceSurvey.garments.tshirt.amounts["45"], 1);
      assert.equal(
        result.body.priceSurvey.garments.tshirt.amounts["39.5"],
        undefined,
      );
      assert.equal(result.body.groups.test.priceSurvey.responses, 1);
      assert.equal(
        (
          await request({
            method: "GET",
            query,
            headers: { cookie: cookie + "tampered" },
          })
        ).statusCode,
        401,
      );
      const expiry = Date.now() - 1000;
      const signature = createHmac("sha256", process.env.ADMIN_PASSWORD)
        .update(`gaminet-gamin-admin:${expiry}`)
        .digest("base64url");
      assert.equal(
        (
          await request({
            method: "GET",
            query,
            headers: { cookie: `gg_admin=${expiry}.${signature}` },
          })
        ).statusCode,
        401,
      );
      const logout = await request({
        method: "POST",
        body: { action: "admin-logout" },
      });
      assert.match(logout.headers["Set-Cookie"], /Max-Age=0/);
      await survey({ ...answer, status: "skipped", amount: null });
      assert.equal((await ballot()).body.ballot.priceSurvey.status, "skipped");
      await vote([]);
      assert.equal((await ballot()).body.ballot, null);
      delete process.env.ADMIN_PASSWORD;
      delete process.env.RESULTS_KEY;
      assert.equal(
        (await request({ method: "GET", query, headers: { cookie } }))
          .statusCode,
        503,
      );
    } finally {
      global.fetch = originalFetch;
      Module._load = originalLoad;
      for (const key of Object.keys(process.env))
        if (!(key in env)) delete process.env[key];
      Object.assign(process.env, env);
      delete require.cache[require.resolve("../api/votes.js")];
    }
  });
