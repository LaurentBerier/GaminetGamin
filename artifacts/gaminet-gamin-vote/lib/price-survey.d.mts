export type PriceSurvey = {
  version: 1 | 2;
  status: 'answered' | 'unsure' | 'skipped';
  itemId: string;
  garmentId: string;
  amount: number | null;
  currency: 'CAD';
  charity: 'fondation-chu-sainte-justine';
  answerSource?: 'choice' | 'custom';
};
export type StoredPriceSurvey = PriceSurvey | { version: 2; byGarment: Record<string, PriceSurvey> };
type Item = { id: string; active: boolean; designId: string; garment: { id: string } };
export const priceChoices: Record<string, number[]>;
export function surveyEligibleItems<T extends Item>(selectedItemIds: string[], items: readonly T[]): T[];
export function priceSurveysByGarment(value: StoredPriceSurvey | null | undefined): Record<string, PriceSurvey>;
export function mergePriceSurvey(previous: StoredPriceSurvey | null | undefined, answer: PriceSurvey): StoredPriceSurvey;
export function validPriceSurvey(value: unknown, selectedItemIds: string[], items: readonly Item[]): value is PriceSurvey;
