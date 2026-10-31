CREATE TABLE `bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`player_name` text NOT NULL,
	`level` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`rules_revision` integer NOT NULL,
	`consent_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`checked_in_at` integer,
	`cancelled_at` integer,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "booking_status_valid" CHECK("bookings"."status" in ('confirmed','checked_in','cancelled','event_cancelled'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `booking_request_unique` ON `bookings` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_active_unique` ON `bookings` (`user_id`,`event_id`) WHERE "bookings"."status" in ('confirmed','checked_in');--> statement-breakpoint
CREATE INDEX `booking_roster` ON `bookings` (`event_id`,`status`);--> statement-breakpoint
CREATE TABLE `events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`sport` text NOT NULL,
	`area` text NOT NULL,
	`venue` text NOT NULL,
	`description` text NOT NULL,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration` integer DEFAULT 90 NOT NULL,
	`capacity` integer NOT NULL,
	`price` integer NOT NULL,
	`level` text NOT NULL,
	`format` text NOT NULL,
	`included` text NOT NULL,
	`bring` text NOT NULL,
	`cancellation` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_capacity_valid" CHECK("events"."capacity" between 2 and 500),
	CONSTRAINT "event_price_valid" CHECK("events"."price" between 0 and 100000),
	CONSTRAINT "event_status_valid" CHECK("events"."status" in ('draft','published','cancelled'))
);
--> statement-breakpoint
CREATE INDEX `events_owner` ON `events` (`owner_id`);--> statement-breakpoint
CREATE INDEX `events_discovery` ON `events` (`status`,`starts_at`);--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text,
	`message` text NOT NULL,
	`read_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `notifications_user` ON `notifications` (`user_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `organizers` (
	`user_id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`bio` text DEFAULT '' NOT NULL,
	`contact` text DEFAULT '' NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `saved_events` (
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`created_at` integer NOT NULL,
	PRIMARY KEY(`user_id`, `event_id`),
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`created_at` integer NOT NULL
);
