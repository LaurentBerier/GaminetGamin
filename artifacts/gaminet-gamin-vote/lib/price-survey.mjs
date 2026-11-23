export const apparelIds = new Set([
  "tshirt",
  "longsleeve",
  "crewneck",
  "hoodie",
]);

export function surveyEligibleItems(selectedItemIds, items) {
  const selected = new Set(selectedItemIds);
  const models = new Map();
  for (const item of items) {
    if (
      item.active &&
      selected.has(item.id) &&
      apparelIds.has(item.garment.id)
    ) {
      models.set(item.designId + ":" + item.garment.id, item);
    }
  }
  return [...models.values()];
}

export function validPriceSurvey(value, selectedItemIds, items) {
  if (
    !value ||
    typeof value !== "object" ||
    value.version !== 1 ||
    value.currency !== "CAD" ||
    value.charity !== "fondation-chu-sainte-justine"
  )
    return false;
  const eligible = surveyEligibleItems(selectedItemIds, items);
  if (
    eligible.length < 3 ||
    !eligible.some(
      (item) => item.id === value.itemId && item.garment.id === value.garmentId,
    )
  )
    return false;
  if (value.status === "unsure" || value.status === "skipped")
    return value.amount === null;
  return (
    value.status === "answered" &&
    typeof value.amount === "number" &&
    Number.isFinite(value.amount) &&
    value.amount >= 1 &&
    value.amount <= 1000 &&
    Math.abs(value.amount * 100 - Math.round(value.amount * 100)) < 0.000001
  );
}
