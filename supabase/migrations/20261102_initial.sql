-- Mercury application schema. Timestamps remain Unix milliseconds so the API
-- keeps its existing date calculations and JSON response format.
CREATE TABLE public.users (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  created_at double precision NOT NULL
);

CREATE TABLE public.organizers (
  user_id text PRIMARY KEY REFERENCES public.users(id),
  name text NOT NULL,
  bio text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  created_at double precision NOT NULL
);

CREATE TABLE public.events (
  id text PRIMARY KEY,
  owner_id text NOT NULL REFERENCES public.users(id),
  title text NOT NULL,
  sport text NOT NULL,
  area text NOT NULL,
  venue text NOT NULL,
  description text NOT NULL,
  date text NOT NULL,
  time text NOT NULL,
  starts_at double precision NOT NULL,
  duration integer NOT NULL DEFAULT 90,
  capacity integer NOT NULL CONSTRAINT event_capacity_valid CHECK (capacity BETWEEN 2 AND 500),
  price integer NOT NULL CONSTRAINT event_price_valid CHECK (price BETWEEN 0 AND 100000),
  level text NOT NULL,
  format text NOT NULL,
  included text NOT NULL,
  bring text NOT NULL,
  cancellation text NOT NULL,
  status text NOT NULL DEFAULT 'draft' CONSTRAINT event_status_valid CHECK (status IN ('draft','published','cancelled')),
  revision integer NOT NULL DEFAULT 1,
  created_at double precision NOT NULL,
  updated_at double precision NOT NULL
);
CREATE INDEX events_owner ON public.events(owner_id);
CREATE INDEX events_discovery ON public.events(status,starts_at);

CREATE TABLE public.bookings (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id),
  event_id text NOT NULL REFERENCES public.events(id),
  idempotency_key text NOT NULL,
  player_name text NOT NULL,
  level text NOT NULL,
  status text NOT NULL DEFAULT 'confirmed' CONSTRAINT booking_status_valid CHECK (status IN ('confirmed','checked_in','cancelled','event_cancelled')),
  rules_revision integer NOT NULL,
  consent_at double precision NOT NULL,
  created_at double precision NOT NULL,
  checked_in_at double precision,
  cancelled_at double precision
);
CREATE UNIQUE INDEX booking_request_unique ON public.bookings(user_id,idempotency_key);
CREATE UNIQUE INDEX booking_active_unique ON public.bookings(user_id,event_id) WHERE status IN ('confirmed','checked_in');
CREATE INDEX booking_roster ON public.bookings(event_id,status);

CREATE TABLE public.saved_events (
  user_id text NOT NULL REFERENCES public.users(id),
  event_id text NOT NULL REFERENCES public.events(id),
  created_at double precision NOT NULL,
  PRIMARY KEY(user_id,event_id)
);
CREATE INDEX saved_events_event ON public.saved_events(event_id);

CREATE TABLE public.notifications (
  id text PRIMARY KEY,
  user_id text NOT NULL REFERENCES public.users(id),
  event_id text REFERENCES public.events(id),
  message text NOT NULL,
  read_at double precision,
  created_at double precision NOT NULL
);
CREATE INDEX notifications_user ON public.notifications(user_id,created_at);
CREATE INDEX notifications_event ON public.notifications(event_id);

CREATE TABLE public.saved_listings (
  user_id text NOT NULL REFERENCES public.users(id),
  listing_id text NOT NULL,
  created_at double precision NOT NULL,
  PRIMARY KEY(user_id,listing_id)
);

CREATE TABLE public.listing_clicks (
  listing_id text NOT NULL,
  day text NOT NULL,
  count integer NOT NULL DEFAULT 0,
  PRIMARY KEY(listing_id,day)
);

CREATE TABLE public.listing_reports (
  user_id text NOT NULL REFERENCES public.users(id),
  listing_id text NOT NULL,
  reason text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  reviewed_at double precision,
  updated_at double precision NOT NULL,
  PRIMARY KEY(user_id,listing_id)
);

CREATE TABLE public.account_consents (
  user_id text PRIMARY KEY REFERENCES public.users(id),
  version text NOT NULL,
  accepted_at double precision NOT NULL
);

CREATE TABLE public.support_requests (
  id text PRIMARY KEY,
  user_id text,
  name text NOT NULL,
  email text NOT NULL,
  category text NOT NULL,
  message text NOT NULL,
  status text NOT NULL DEFAULT 'open',
  internal_note text NOT NULL DEFAULT '',
  created_at double precision NOT NULL,
  updated_at double precision NOT NULL
);
CREATE INDEX support_status ON public.support_requests(status,created_at);

CREATE TABLE public.listing_overrides (
  listing_id text PRIMARY KEY,
  hidden integer NOT NULL DEFAULT 0,
  reason text NOT NULL DEFAULT '',
  updated_at double precision NOT NULL
);

CREATE TABLE public.request_limits (
  bucket text PRIMARY KEY,
  count integer NOT NULL,
  expires_at double precision NOT NULL
);
CREATE INDEX request_limits_expiry ON public.request_limits(expires_at);

-- The browser never queries these tables directly. The Vercel API applies
-- ownership rules and connects with the private server-side database URL.
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.account_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.listing_overrides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_limits ENABLE ROW LEVEL SECURITY;
