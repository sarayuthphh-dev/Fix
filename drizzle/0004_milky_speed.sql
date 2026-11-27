CREATE TABLE `line_users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`active` integer DEFAULT 1 NOT NULL,
	`last_seen_at` integer NOT NULL
);
