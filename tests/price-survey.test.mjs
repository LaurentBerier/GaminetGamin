import assert from 'node:assert/strict';
import test from 'node:test';
import { createRequire } from 'node:module';
import { surveyEligibleItems, validPriceSurvey, mergePriceSurvey, priceSurveysByGarment } from '../artifacts/gaminet-gamin-vote/lib/price-survey.mjs';
import { summarizeBallots } from '../artifacts/gaminet-gamin-vote/lib/vote-results.mjs';
const require = createRequire(import.meta.url);
const catalog = require('../artifacts/gaminet-gamin-vote/content/catalog.json');
const shirts = catalog.items.filter(item => item.active && item.garment.id === 'tshirt');
const hoodie = catalog.items.find(item => item.active && item.garment.id === 'hoodie');
const bag = catalog.items.find(item => item.active && item.garment.id === 'tote');
const ids = [shirts[0].id, hoodie.id, bag.id];
const answer = { version: 2, status: 'answered', itemId: shirts[0].id, garmentId: 'tshirt', amount: 30, answerSource: 'choice', currency: 'CAD', charity: 'fondation-chu-sainte-justine' };

test('asks after the first favorite, once for each product type including accessories', () => {
  assert.equal(validPriceSurvey(answer, [shirts[0].id], catalog.items), true);
  assert.equal(validPriceSurvey(answer, [], catalog.items), false);
  assert.equal(surveyEligibleItems(shirts.map(item => item.id), catalog.items).length, 1);
  assert.deepEqual(surveyEligibleItems(ids, catalog.items).map(item => item.garment.id), ['tshirt', 'hoodie', 'tote']);
  assert.equal(surveyEligibleItems(['unknown'], catalog.items).length, 0);
});

test('rejects invalid amounts, preset choices, item mismatches and metadata', () => {
  for (const amount of [0, -1, 1001, 39.555, NaN, Infinity, '40', null])
    assert.equal(validPriceSurvey({ ...answer, amount, answerSource: 'custom' }, ids, catalog.items), false);
  for (const changes of [{ currency: 'USD' }, { version: 3 }, { charity: 'unknown' }, { garmentId: 'hoodie' }, { itemId: 'unknown' }, { amount: 39 }, { answerSource: 'unknown' }])
    assert.equal(validPriceSurvey({ ...answer, ...changes }, ids, catalog.items), false);
  assert.equal(validPriceSurvey({ ...answer, amount: 39.5, answerSource: 'custom' }, ids, catalog.items), true);
  for (const status of ['unsure', 'skipped'])
    assert.equal(validPriceSurvey({ ...answer, status, amount: null }, ids, catalog.items), true);
});

test('merges by type, preserves historical answers and replaces edits without duplicates', () => {
  const legacy = { ...answer, version: 1, amount: 39.5, answerSource: undefined };
  assert.equal(validPriceSurvey(legacy, [shirts[0].id], catalog.items), true);
  let saved = mergePriceSurvey(legacy, { ...answer, itemId: hoodie.id, garmentId: 'hoodie', amount: 70 });
  assert.equal(saved.byGarment.tshirt.amount, 39.5);
  saved = mergePriceSurvey(saved, answer);
  assert.equal(saved.byGarment.tshirt.amount, 30);
  assert.equal(saved.byGarment.hoodie.amount, 70);
  assert.equal(Object.keys(priceSurveysByGarment(JSON.parse(JSON.stringify(saved)))).length, 2);
});

test('counts incomplete ballots and unanswered questionnaires; compiles prices by type and group', () => {
  const all = catalog.items.filter(item => item.active).slice(0, 11).map(item => item.id);
  const twoTypes = mergePriceSurvey(mergePriceSurvey(null, answer), { ...answer, itemId: hoodie.id, garmentId: 'hoodie', amount: 70 });
  const result = summarizeBallots([
    { selectedItemIds: [shirts[0].id], updatedAt: 1 },
    { selectedItemIds: all, updatedAt: 2 },
    { selectedItemIds: ids, voterGroup: 'amis', updatedAt: 3, priceSurvey: twoTypes },
    { selectedItemIds: ids, voterGroup: 'amis', updatedAt: 4, priceSurvey: { ...answer, version: 1, status: 'unsure', amount: null } },
    { selectedItemIds: ids, voterGroup: 'famille', updatedAt: 5, priceSurvey: mergePriceSurvey(null, { ...answer, status: 'skipped', amount: null }) },
  ], catalog.items);
  assert.equal(result.participants, 5);
  assert.equal(result.totalVotes, 1 + 11 + 3 + 3 + 3);
  assert.equal(result.priceSurvey.respondents, 2);
  assert.equal(result.priceSurvey.responses, 3);
  assert.equal(result.priceSurvey.unsure, 1);
  assert.equal(result.priceSurvey.skipped, 1);
  assert.equal(result.priceSurvey.garments.tshirt.amounts['30'], 1);
  assert.equal(result.priceSurvey.garments.tshirt.skipped, 1);
  assert.equal(result.priceSurvey.garments.hoodie.amounts['70'], 1);
  assert.equal(result.groups.amis.priceSurvey.responses, 3);
  assert.equal(result.groups.amis.priceSurvey.respondents, 2);
  assert.equal(result.groups.famille.priceSurvey.garments.hoodie, undefined);
  assert.equal(result.groups['Sans groupe'].priceSurvey.responses, 0);
});
