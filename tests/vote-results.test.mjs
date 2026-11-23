import assert from 'node:assert/strict';
import test from 'node:test';
import { summarizeBallots } from '../artifacts/gaminet-gamin-vote/lib/vote-results.mjs';

const item = (id, designId, color, garment, active = true) => ({ id, designId, active, color: { id: color }, garment: { id: garment } });
const items = [item('a-blue-shirt', 'A', 'blue', 'tshirt'), item('a-red-shirt', 'A', 'red', 'tshirt'), item('a-blue-hoodie', 'A', 'blue', 'hoodie'), item('b-blue-shirt', 'B', 'blue', 'tshirt'), item('retired', 'C', 'red', 'tshirt', false)];
const ballot = (selectedItemIds, voterGroup = '', updatedAt = 1) => ({ selectedItemIds, voterGroup, updatedAt });
const plain = (value) => JSON.parse(JSON.stringify(value));

test('several versions count once per person for each illustration, colour and garment', () => {
  const result = summarizeBallots([ballot(['a-blue-shirt', 'a-red-shirt', 'a-blue-hoodie', 'a-blue-shirt'])], items);
  assert.equal(result.participants, 1);
  assert.equal(result.totalVotes, 3);
  assert.deepEqual(plain(result.illustrationCounts), { A: 1 });
  assert.deepEqual(plain(result.colorCounts), { blue: 1, red: 1 });
  assert.deepEqual(plain(result.garmentCounts), { tshirt: 1, hoodie: 1 });
  assert.equal(result.itemCounts['a-blue-shirt'], 1);
});

test('illustrations combine support across all colours and garments without inflating percentages', () => {
  const result = summarizeBallots([ballot(['a-blue-shirt', 'a-blue-hoodie']), ballot(['a-red-shirt']), ballot(['b-blue-shirt'])], items);
  assert.deepEqual(plain(result.illustrationCounts), { A: 2, B: 1 });
  assert.deepEqual(plain(result.colorCounts), { blue: 2, red: 1 });
  assert.equal(result.illustrations.A.participants, 2);
  assert.deepEqual(plain(result.illustrations.A.garmentCounts), { tshirt: 2, hoodie: 1 });
  assert.ok(Object.values(result.garmentCounts).every((count) => count <= result.participants));
});

test('illustration details count only colours and garments chosen with that illustration', () => {
  const result = summarizeBallots([ballot(['a-red-shirt', 'b-blue-shirt']), ballot(['a-blue-hoodie'])], items);
  assert.deepEqual(plain(result.illustrations.A.colorCounts), { red: 1, blue: 1 });
  assert.deepEqual(plain(result.illustrations.B.colorCounts), { blue: 1 });
  assert.deepEqual(plain(result.illustrations.B.garmentCounts), { tshirt: 1 });
});

test('group filters have their own deduplicated rankings and tolerate arbitrary group names', () => {
  const result = summarizeBallots([ballot(['a-blue-shirt', 'a-red-shirt'], 'famille', 2), ballot(['b-blue-shirt'], '__proto__', 4), ballot(['a-blue-hoodie'])], items);
  assert.deepEqual(plain(result.groups.famille.illustrationCounts), { A: 1 });
  assert.equal(result.groups.__proto__.participants, 1);
  assert.equal(result.groups['Sans groupe'].garmentCounts.hoodie, 1);
  assert.equal(result.lastVoteAt, 4);
});

test('old ballots remain usable, unknown and retired options do not receive votes, and an empty campaign is safe', () => {
  const result = summarizeBallots([ballot(['a-blue-shirt', 'retired', 'unknown'])], items);
  assert.equal(result.totalVotes, 1);
  assert.deepEqual(plain(result.illustrationCounts), { A: 1 });
  const empty = summarizeBallots([], items);
  assert.equal(empty.participants, 0);
  assert.equal(empty.lastVoteAt, 0);
  assert.deepEqual(plain(empty.illustrationCounts), {});
});
