import { indiaDay } from '../public/catalogue.js';

export const CLIENT_METRICS = new Set([
  'home_view', 'explore_view', 'external_detail_view', 'native_detail_view', 'zero_results',
]);

const ALL_METRICS = new Set([
  ...CLIENT_METRICS, 'signin_start', 'signin_error', 'consent_accepted',
  'saved_external', 'saved_native', 'booking_confirmed', 'booking_failed', 'api_error',
]);

// No route, query, account, device, or IP is stored with a count.
export async function recordMetric(db, metric, now = Date.now()) {
  if (!db || !ALL_METRICS.has(metric)) return false;
  try {
    await db.prepare('INSERT INTO site_metrics(day,metric,count) VALUES(?,?,1) ON CONFLICT(day,metric) DO UPDATE SET count=count+1')
      .bind(indiaDay(now), metric).run();
    return true;
  } catch (error) {
    console.warn('Mercury aggregate metric unavailable', { metric, name: error?.name || 'Error' });
    return false;
  }
}
