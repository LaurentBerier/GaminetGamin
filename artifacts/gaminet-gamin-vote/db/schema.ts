import { integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core';

export const ballots = sqliteTable(
  'ballots',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    campaignId: text('campaign_id').notNull(),
    voterId: text('voter_id').notNull(),
    voterName: text('voter_name'),
    voterGroup: text('voter_group'),
    selectedItemIds: text('selected_item_ids').notNull(),
    submittedAt: integer('submitted_at').notNull(),
    updatedAt: integer('updated_at').notNull(),
  },
  (table) => [
    uniqueIndex('idx_ballots_campaign_voter').on(
      table.campaignId,
      table.voterId,
    ),
  ],
);

