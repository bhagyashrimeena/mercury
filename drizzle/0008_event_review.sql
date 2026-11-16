PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_events` (
	`id` text PRIMARY KEY NOT NULL,
	`owner_id` text NOT NULL,
	`title` text NOT NULL,
	`sport` text NOT NULL,
	`area` text NOT NULL,
	`venue` text NOT NULL,
	`description` text,
	`date` text NOT NULL,
	`time` text NOT NULL,
	`starts_at` integer NOT NULL,
	`duration` integer DEFAULT 90 NOT NULL,
	`capacity` integer NOT NULL,
	`price` integer NOT NULL,
	`payment_methods` text DEFAULT '' NOT NULL,
	`qr_image` text DEFAULT '' NOT NULL,
	`cover_image` text DEFAULT '' NOT NULL,
	`format` text NOT NULL,
	`included` text,
	`bring` text,
	`cancellation` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_at` integer,
	`submitted_at` integer,
	`reviewed_at` integer,
	`reviewed_by` text,
	`review_note` text DEFAULT '' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`owner_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "event_capacity_valid" CHECK("__new_events"."capacity" between 2 and 500),
	CONSTRAINT "event_price_valid" CHECK("__new_events"."price" between 0 and 100000),
	CONSTRAINT "event_status_valid" CHECK("__new_events"."status" in ('draft','pending_review','rejected','published','cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_events`("id", "owner_id", "title", "sport", "area", "venue", "description", "date", "time", "starts_at", "duration", "capacity", "price", "payment_methods", "qr_image", "cover_image", "format", "included", "bring", "cancellation", "status", "approved_at", "submitted_at", "reviewed_at", "reviewed_by", "review_note", "revision", "created_at", "updated_at") SELECT "id", "owner_id", "title", "sport", "area", "venue", "description", "date", "time", "starts_at", "duration", "capacity", "price", "payment_methods", "qr_image", "cover_image", "format", "included", "bring", "cancellation", "status", CASE WHEN status IN ('published','cancelled') THEN updated_at ELSE NULL END, NULL, NULL, NULL, '', "revision", "created_at", "updated_at" FROM `events`;--> statement-breakpoint
DROP TABLE `events`;--> statement-breakpoint
ALTER TABLE `__new_events` RENAME TO `events`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `events_owner` ON `events` (`owner_id`);--> statement-breakpoint
CREATE INDEX `events_discovery` ON `events` (`status`,`starts_at`);