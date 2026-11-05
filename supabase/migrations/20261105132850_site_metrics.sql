-- Anonymous, aggregate counts only. The browser never reads this table directly.
CREATE TABLE public.site_metrics (
  day text NOT NULL CONSTRAINT site_metrics_day_valid CHECK (day ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'),
  metric text NOT NULL CONSTRAINT site_metrics_metric_valid CHECK (metric IN (
    'home_view', 'explore_view', 'external_detail_view', 'native_detail_view',
    'zero_results', 'signin_start', 'signin_error', 'consent_accepted',
    'saved_external', 'saved_native', 'booking_confirmed', 'booking_failed', 'api_error'
  )),
  count integer NOT NULL DEFAULT 0 CONSTRAINT site_metrics_count_valid CHECK (count >= 0),
  PRIMARY KEY (day, metric)
);
ALTER TABLE public.site_metrics ENABLE ROW LEVEL SECURITY;
