import assert from "node:assert/strict";
import test from "node:test";
import { createRequire } from "node:module";
import {
  surveyEligibleItems,
  validPriceSurvey,
} from "../artifacts/gaminet-gamin-vote/lib/price-survey.mjs";
import { summarizeBallots } from "../artifacts/gaminet-gamin-vote/lib/vote-results.mjs";
const require = createRequire(import.meta.url);
const catalog = require("../artifacts/gaminet-gamin-vote/content/catalog.json");
const apparel = catalog.items.filter(
  (item) => item.active && item.garment.id === "tshirt",
);
const models = [
  ...new Map(apparel.map((item) => [item.designId, item])).values(),
].slice(0, 3);
const ids = models.map((item) => item.id);
const answer = {
  version: 1,
  status: "answered",
  itemId: models[0].id,
  garmentId: "tshirt",
  amount: 39.5,
  currency: "CAD",
  charity: "fondation-chu-sainte-justine",
};

test("requires three distinct apparel models, not colors or accessories", () => {
  const colors = apparel
    .filter((item) => item.designId === models[0].designId)
    .slice(0, 3)
    .map((item) => item.id);
  assert.equal(surveyEligibleItems(colors, catalog.items).length, 1);
  assert.equal(validPriceSurvey(answer, colors, catalog.items), false);
  assert.equal(validPriceSurvey(answer, ids.slice(0, 2), catalog.items), false);
  const accessories = catalog.items
    .filter((item) => item.garment.id === "tote")
    .slice(0, 3)
    .map((item) => item.id);
  assert.equal(surveyEligibleItems(accessories, catalog.items).length, 0);
  assert.equal(validPriceSurvey(answer, ids, catalog.items), true);
});

test("rejects invalid amounts, mismatched items, currencies and survey metadata", () => {
  for (const amount of [0, -1, 1001, 39.555, NaN, Infinity, "40", null])
    assert.equal(
      validPriceSurvey({ ...answer, amount }, ids, catalog.items),
      false,
    );
  for (const changes of [
    { currency: "USD" },
    { version: 2 },
    { charity: "unknown" },
    { garmentId: "hoodie" },
    { itemId: "unknown" },
  ])
    assert.equal(
      validPriceSurvey({ ...answer, ...changes }, ids, catalog.items),
      false,
    );
  assert.equal(
    validPriceSurvey(
      { ...answer, status: "unsure", amount: null },
      ids,
      catalog.items,
    ),
    true,
  );
  assert.equal(
    validPriceSurvey(
      { ...answer, status: "skipped", amount: null },
      ids,
      catalog.items,
    ),
    true,
  );
});

test("separates amounts by garment and group, excludes skipped/unsure from prices and handles old ballots", () => {
  const result = summarizeBallots(
    [
      {
        selectedItemIds: ids,
        voterGroup: "amis",
        updatedAt: 1,
        priceSurvey: answer,
      },
      {
        selectedItemIds: ids,
        voterGroup: "amis",
        updatedAt: 2,
        priceSurvey: { ...answer, status: "unsure", amount: null },
      },
      {
        selectedItemIds: ids,
        voterGroup: "famille",
        updatedAt: 3,
        priceSurvey: { ...answer, garmentId: "hoodie", amount: 65 },
      },
      {
        selectedItemIds: ids,
        voterGroup: "famille",
        updatedAt: 4,
        priceSurvey: { ...answer, status: "skipped", amount: null },
      },
      { selectedItemIds: ids, updatedAt: 5 },
    ],
    catalog.items,
  );
  assert.equal(result.participants, 5);
  assert.equal(result.priceSurvey.responses, 3);
  assert.equal(result.priceSurvey.unsure, 1);
  assert.equal(result.priceSurvey.skipped, 1);
  assert.equal(result.priceSurvey.garments.tshirt.amounts["39.5"], 1);
  assert.equal(result.priceSurvey.garments.hoodie.amounts["65"], 1);
  assert.equal(result.groups.amis.priceSurvey.responses, 2);
  assert.equal(result.groups.amis.priceSurvey.garments.hoodie, undefined);
  assert.equal(result.groups["Sans groupe"].priceSurvey.responses, 0);
});
