CREATE TABLE `ballots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`campaign_id` text NOT NULL,
	`voter_id` text NOT NULL,
	`voter_name` text,
	`voter_group` text,
	`selected_item_ids` text NOT NULL,
	`submitted_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_ballots_campaign_voter` ON `ballots` (`campaign_id`,`voter_id`);