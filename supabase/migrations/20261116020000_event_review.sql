ALTER TABLE public.events ADD COLUMN approved_at double precision;
UPDATE public.events SET approved_at=updated_at WHERE status IN ('published','cancelled');
ALTER TABLE public.events ADD COLUMN submitted_at double precision;
ALTER TABLE public.events ADD COLUMN reviewed_at double precision;
ALTER TABLE public.events ADD COLUMN reviewed_by text;
ALTER TABLE public.events ADD COLUMN review_note text NOT NULL DEFAULT '';
ALTER TABLE public.events DROP CONSTRAINT event_status_valid;
ALTER TABLE public.events ADD CONSTRAINT event_status_valid
  CHECK(status IN ('draft','pending_review','rejected','published','cancelled'));
