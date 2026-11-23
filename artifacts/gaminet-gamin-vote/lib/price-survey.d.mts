export type PriceSurvey = {
  version: 1;
  status: "answered" | "unsure" | "skipped";
  itemId: string;
  garmentId: string;
  amount: number | null;
  currency: "CAD";
  charity: "fondation-chu-sainte-justine";
};
type Item = {
  id: string;
  active: boolean;
  designId: string;
  garment: { id: string };
};
export const apparelIds: Set<string>;
export function surveyEligibleItems<T extends Item>(
  selectedItemIds: string[],
  items: readonly T[],
): T[];
export function validPriceSurvey(
  value: unknown,
  selectedItemIds: string[],
  items: readonly Item[],
): value is PriceSurvey;
