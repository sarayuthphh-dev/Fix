CREATE TABLE `line_groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`last_seen_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `line_notifications` (
	`ticket_id` text PRIMARY KEY NOT NULL,
	`status` text DEFAULT 'waiting_config' NOT NULL,
	`destination_id` text,
	`bot_id` text,
	`message` text,
	`retry_key` text NOT NULL,
	`attempts` integer DEFAULT 0 NOT NULL,
	`first_attempt_at` integer,
	`last_attempt_at` integer,
	`accepted_at` integer,
	`last_error` text,
	`last_http_status` integer,
	`lock_until` integer DEFAULT 0 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`ticket_id`) REFERENCES `tickets`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `line_notifications_status_created` ON `line_notifications` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `line_settings` (
	`id` text PRIMARY KEY NOT NULL,
	`encrypted_access_token` text DEFAULT '' NOT NULL,
	`encrypted_channel_secret` text DEFAULT '' NOT NULL,
	`bot_id` text,
	`bot_name` text,
	`destination_id` text,
	`enabled` integer DEFAULT 0 NOT NULL,
	`test_retry_key` text,
	`test_attempt_at` integer,
	`test_accepted_at` integer,
	`updated_at` integer NOT NULL,
	`updated_by` text NOT NULL
);
