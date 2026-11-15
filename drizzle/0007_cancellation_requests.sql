PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_bookings` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`event_id` text NOT NULL,
	`idempotency_key` text NOT NULL,
	`player_name` text NOT NULL,
	`status` text DEFAULT 'confirmed' NOT NULL,
	`payment_method` text DEFAULT 'free' NOT NULL,
	`payment_proof` text DEFAULT '' NOT NULL,
	`amount` integer DEFAULT 0 NOT NULL,
	`organizer_contact` text DEFAULT '' NOT NULL,
	`review_note` text DEFAULT '' NOT NULL,
	`reviewed_at` integer,
	`payment_consent_version` text DEFAULT '' NOT NULL,
	`rules_revision` integer NOT NULL,
	`consent_at` integer NOT NULL,
	`created_at` integer NOT NULL,
	`checked_in_at` integer,
	`cancelled_at` integer,
	`cancellation_requested_at` integer,
	`cancellation_resolved_at` integer,
	`refund_resolution` text DEFAULT '' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`event_id`) REFERENCES `events`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "booking_status_valid" CHECK("__new_bookings"."status" in ('pending','rejected','confirmed','checked_in','cancellation_pending','cancelled','event_cancelled'))
);
--> statement-breakpoint
INSERT INTO `__new_bookings`("id", "user_id", "event_id", "idempotency_key", "player_name", "status", "payment_method", "payment_proof", "amount", "organizer_contact", "review_note", "reviewed_at", "payment_consent_version", "rules_revision", "consent_at", "created_at", "checked_in_at", "cancelled_at", "cancellation_requested_at", "cancellation_resolved_at", "refund_resolution") SELECT "id", "user_id", "event_id", "idempotency_key", "player_name", "status", "payment_method", "payment_proof", "amount", "organizer_contact", "review_note", "reviewed_at", "payment_consent_version", "rules_revision", "consent_at", "created_at", "checked_in_at", "cancelled_at", NULL, NULL, '' FROM `bookings`;--> statement-breakpoint
DROP TABLE `bookings`;--> statement-breakpoint
ALTER TABLE `__new_bookings` RENAME TO `bookings`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `booking_request_unique` ON `bookings` (`user_id`,`idempotency_key`);--> statement-breakpoint
CREATE UNIQUE INDEX `booking_active_unique` ON `bookings` (`user_id`,`event_id`) WHERE "bookings"."status" in ('pending','confirmed','checked_in');--> statement-breakpoint
CREATE INDEX `booking_roster` ON `bookings` (`event_id`,`status`);--> statement-breakpoint
ALTER TABLE `events` DROP COLUMN `level`;