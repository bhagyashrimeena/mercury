ALTER TABLE public.events DROP COLUMN level;
ALTER TABLE public.bookings DROP COLUMN level;
ALTER TABLE public.bookings ADD COLUMN cancellation_requested_at double precision;
ALTER TABLE public.bookings ADD COLUMN cancellation_resolved_at double precision;
ALTER TABLE public.bookings ADD COLUMN refund_resolution text NOT NULL DEFAULT '';
ALTER TABLE public.bookings DROP CONSTRAINT booking_status_valid;
ALTER TABLE public.bookings ADD CONSTRAINT booking_status_valid CHECK(status IN ('pending','rejected','confirmed','checked_in','cancellation_pending','cancelled','event_cancelled'));
