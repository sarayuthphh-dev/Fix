CREATE TABLE `contacts` (
	`id` text PRIMARY KEY NOT NULL,
	`cooperative_id` text NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`phone` text DEFAULT '' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`approved_by` text,
	`approved_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`cooperative_id`) REFERENCES `cooperatives`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `contacts_cooperative_email` ON `contacts` (`cooperative_id`,`email`);--> statement-breakpoint
CREATE INDEX `contacts_email_status` ON `contacts` (`email`,`status`);--> statement-breakpoint
CREATE TABLE `cooperatives` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`province` text DEFAULT '' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `cooperatives_code_unique` ON `cooperatives` (`code`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`key` text PRIMARY KEY NOT NULL,
	`count` integer NOT NULL,
	`expires_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `rate_limits_expiry` ON `rate_limits` (`expires_at`);--> statement-breakpoint
CREATE TABLE `registry_events` (
	`id` text PRIMARY KEY NOT NULL,
	`actor` text NOT NULL,
	`action` text NOT NULL,
	`target` text NOT NULL,
	`at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `staff_members` (
	`email` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`role` text DEFAULT 'agent' NOT NULL,
	`active` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `tickets` ADD `cooperative_id` text REFERENCES cooperatives(id);--> statement-breakpoint
ALTER TABLE `tickets` ADD `submitter_verified` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `tickets` ADD `approval_status` text DEFAULT 'not_required' NOT NULL;--> statement-breakpoint
CREATE INDEX `tickets_cooperative_created` ON `tickets` (`cooperative_id`,`created_at`);