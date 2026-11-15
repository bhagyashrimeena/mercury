ALTER TABLE events ADD COLUMN payment_methods text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE events ADD COLUMN qr_image text NOT NULL DEFAULT '';--> statement-breakpoint
CREATE TABLE `bookings_new` (
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
	CONSTRAINT "booking_status_valid" CHECK("status" in ('pending','rejected','confirmed','checked_in','cancelled','event_cancelled'))
);--> statement-breakpoint

INSERT INTO bookings_new SELECT * FROM bookings;--> statement-breakpoint
DROP TABLE bookings;--> statement-breakpoint
ALTER TABLE bookings_new RENAME TO bookings;--> statement-breakpoint
CREATE UNIQUE INDEX booking_request_unique ON bookings(user_id,idempotency_key);--> statement-breakpoint
CREATE UNIQUE INDEX booking_active_unique ON bookings(user_id,event_id) WHERE status IN ('pending','confirmed','checked_in');--> statement-breakpoint
CREATE INDEX booking_roster ON bookings(event_id,status);--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN payment_method text NOT NULL DEFAULT 'free';--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN payment_proof text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN amount integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN organizer_contact text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN review_note text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN payment_consent_version text NOT NULL DEFAULT '';--> statement-breakpoint
ALTER TABLE bookings ADD COLUMN reviewed_at integer;--> statement-breakpoint
