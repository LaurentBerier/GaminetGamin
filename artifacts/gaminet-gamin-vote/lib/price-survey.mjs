export const priceChoices = {
  tshirt: [20, 25, 30, 35, 40, 50],
  longsleeve: [30, 40, 50, 60, 70],
  crewneck: [40, 50, 60, 70, 80],
  hoodie: [50, 60, 70, 80, 90],
  cap: [15, 20, 25, 30, 35],
  'bucket-hat': [20, 25, 30, 35, 40],
  tote: [15, 20, 25, 30, 35],
  mug: [10, 15, 20, 25, 30],
};

// One response per visitor and garment type; retain the latest liked example.
export function surveyEligibleItems(selectedItemIds, items) {
  const byId = new Map(items.filter((item) => item.active).map((item) => [item.id, item]));
  const garments = new Map();
  for (const id of selectedItemIds) {
    const item = byId.get(id);
    if (item && Object.hasOwn(priceChoices, item.garment.id)) garments.set(item.garment.id, item);
  }
  return [...garments.values()];
}

// Read existing single answers as well as the per-type format, without losing
// responses collected before this questionnaire was introduced.
export function priceSurveysByGarment(value) {
  const answers = value?.version === 2 && value.byGarment
    ? Object.values(value.byGarment)
    : value?.version === 1 ? [value] : [];
  return Object.fromEntries(answers.filter((answer) => answer && Object.hasOwn(priceChoices, answer.garmentId))
    .map((answer) => [answer.garmentId, answer]));
}

export function mergePriceSurvey(previous, answer) {
  const { version, status, itemId, garmentId, amount, currency, charity, answerSource } = answer;
  return { version: 2, byGarment: { ...priceSurveysByGarment(previous), [garmentId]: { version, status, itemId, garmentId, amount, currency, charity, answerSource } } };
}

export function validPriceSurvey(value, selectedItemIds, items) {
  if (!value || typeof value !== 'object' || ![1, 2].includes(value.version)
    || value.currency !== 'CAD' || value.charity !== 'fondation-chu-sainte-justine') return false;
  const selected = new Set(selectedItemIds);
  if (!items.some((item) => item.active && selected.has(item.id) && item.id === value.itemId && item.garment.id === value.garmentId)
    || !Object.hasOwn(priceChoices, value.garmentId)) return false;
  if (value.status === 'unsure' || value.status === 'skipped') return value.amount === null;
  if (value.status !== 'answered' || typeof value.amount !== 'number' || !Number.isFinite(value.amount)
    || value.amount < 1 || value.amount > 1000 || Math.abs(value.amount * 100 - Math.round(value.amount * 100)) >= 0.000001) return false;
  // Older open tabs may still submit v1 answers during rollout.
  return value.version === 1 || value.answerSource === 'custom'
    || (value.answerSource === 'choice' && priceChoices[value.garmentId].includes(value.amount));
}
