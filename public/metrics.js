const allowed = new Set(['home_view', 'explore_view', 'external_detail_view', 'native_detail_view', 'zero_results']);

export function trackMetric(metric) {
  if (!allowed.has(metric)) return;
  fetch('/api/metrics', {
    method: 'POST', credentials: 'same-origin', keepalive: true,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ metric }),
  }).catch(() => {});
}
