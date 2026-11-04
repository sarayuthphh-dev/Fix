CREATE TABLE `tickets` (
	`id` text PRIMARY KEY NOT NULL,
	`number` text NOT NULL,
	`title` text NOT NULL,
	`program` text NOT NULL,
	`category` text NOT NULL,
	`priority` text NOT NULL,
	`status` text DEFAULT 'new' NOT NULL,
	`reporter` text NOT NULL,
	`office` text NOT NULL,
	`email` text NOT NULL,
	`description` text NOT NULL,
	`assignee` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`events` text NOT NULL,
	`attachments` text DEFAULT '[]' NOT NULL,
	`creator_id` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tickets_number_unique` ON `tickets` (`number`);