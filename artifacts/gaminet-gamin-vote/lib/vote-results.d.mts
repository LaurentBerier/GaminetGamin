import type { PriceSurvey } from './price-survey.mjs';
export type PreferenceCounts = {
  participants: number;
  totalVotes: number;
  itemCounts: Record<string, number>;
  colorCounts: Record<string, number>;
  garmentCounts: Record<string, number>;
};
export type PriceSurveySummary = {
  responses: number;
  skipped: number;
  unsure: number;
  garments: Record<string, { amounts: Record<string, number>; unsure: number }>;
};
export type VoteSummary = PreferenceCounts & {
  priceSurvey: PriceSurveySummary;
  illustrationCounts: Record<string, number>;
  illustrations: Record<string, PreferenceCounts>;
};
export type VoteResults = VoteSummary & {
  campaignId: string;
  groups: Record<string, VoteSummary>;
  lastVoteAt: number;
};
export function summarizeBallots(
  ballots: ReadonlyArray<{ selectedItemIds: string[]; voterGroup?: string; updatedAt: number; priceSurvey?: PriceSurvey | null }>,
  items: ReadonlyArray<{ id: string; active: boolean; designId: string; color: { id: string }; garment: { id: string } }>,
): Omit<VoteResults, 'campaignId'>;
