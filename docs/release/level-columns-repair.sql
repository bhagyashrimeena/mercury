-- Mercury legacy-main compatibility repair; NOT executed automatically.
-- Apply only to a staging clone after a restoration rehearsal and owner review.
-- Verify production backup/PITR and the connected deployment's DB binding first.
-- Existing 2026-11 paid bookings may not have a recorded player level: preserve NULL.
BEGIN;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS level text;
ALTER TABLE public.bookings ADD COLUMN IF NOT EXISTS level text;
COMMIT;
