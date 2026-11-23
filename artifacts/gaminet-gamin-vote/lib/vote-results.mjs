function counts() { return Object.create(null); }
function preferences() {
  return { participants: 0, totalVotes: 0, itemCounts: counts(), colorCounts: counts(), garmentCounts: counts() };
}
function summary() {
  return { ...preferences(), illustrationCounts: counts(), illustrations: counts() };
}
function increment(target, id) { target[id] = (target[id] ?? 0) + 1; }

function addPreferences(target, items) {
  target.participants += 1;
  target.totalVotes += items.length;
  for (const item of items) increment(target.itemCounts, item.id);
  for (const id of new Set(items.map((item) => item.color.id))) increment(target.colorCounts, id);
  for (const id of new Set(items.map((item) => item.garment.id))) increment(target.garmentCounts, id);
}

function addBallot(target, items) {
  addPreferences(target, items);
  const byIllustration = new Map();
  for (const item of items) {
    if (!byIllustration.has(item.designId)) byIllustration.set(item.designId, []);
    byIllustration.get(item.designId).push(item);
  }
  for (const [id, variants] of byIllustration) {
    increment(target.illustrationCounts, id);
    target.illustrations[id] ??= preferences();
    addPreferences(target.illustrations[id], variants);
  }
}

// A ballot contributes at most once to each preference, regardless of how many
// matching colour/product variants it contains. No voter identity is returned.
export function summarizeBallots(ballots, catalogItems) {
  const byId = new Map(catalogItems.filter((item) => item.active).map((item) => [item.id, item]));
  const result = { ...summary(), groups: counts(), lastVoteAt: 0 };
  for (const ballot of ballots) {
    const items = [...new Set(ballot.selectedItemIds)].map((id) => byId.get(id)).filter(Boolean);
    const group = ballot.voterGroup?.trim() || 'Sans groupe';
    result.groups[group] ??= summary();
    addBallot(result, items);
    addBallot(result.groups[group], items);
    result.lastVoteAt = Math.max(result.lastVoteAt, ballot.updatedAt || 0);
  }
  return result;
}
