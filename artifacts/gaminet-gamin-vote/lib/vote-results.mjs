function counts() { return Object.create(null); }
function preferences() {
  return { participants: 0, totalVotes: 0, itemCounts: counts(), colorCounts: counts(), garmentCounts: counts() };
}
function summary() {
  return { ...preferences(), illustrationCounts: counts(), illustrations: counts(), priceSurvey: { responses: 0, skipped: 0, unsure: 0, garments: counts() } };
}
function increment(target, id) { target[id] = (target[id] ?? 0) + 1; }

function addPreferences(target, items) {
  target.participants += 1;
  target.totalVotes += items.length;
  for (const item of items) increment(target.itemCounts, item.id);
  for (const id of new Set(items.map((item) => item.color.id))) increment(target.colorCounts, id);
  for (const id of new Set(items.map((item) => item.garment.id))) increment(target.garmentCounts, id);
}

function addPriceSurvey(target, answer) {
  if (!answer || answer.version !== 1) return;
  const survey = target.priceSurvey;
  if (answer.status === 'skipped') { survey.skipped += 1; return; }
  if (answer.status !== 'answered' && answer.status !== 'unsure') return;
  if (answer.status === 'answered' && (typeof answer.amount !== 'number' || !Number.isFinite(answer.amount) || answer.amount < 1 || answer.amount > 1000)) return;
  survey.responses += 1;
  survey.garments[answer.garmentId] ??= { amounts: counts(), unsure: 0 };
  if (answer.status === 'unsure') {
    survey.unsure += 1;
    survey.garments[answer.garmentId].unsure += 1;
  } else increment(survey.garments[answer.garmentId].amounts, answer.amount);
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
    addPriceSurvey(result, ballot.priceSurvey);
    addPriceSurvey(result.groups[group], ballot.priceSurvey);
    result.lastVoteAt = Math.max(result.lastVoteAt, ballot.updatedAt || 0);
  }
  return result;
}
