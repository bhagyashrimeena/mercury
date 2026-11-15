// Keep this list narrow: a public read must never include a save, booking, or owner action.
export function isPublicApiRequest(path: string, method: string) {
  if (method === 'GET') return /^\/api\/(events|listings)(\/[^/]+)?$/.test(path) || /^\/api\/events\/[^/]+\/cover$/.test(path);
  if (method === 'POST') return path === '/api/metrics' || /^\/api\/listings\/[^/]+\/click$/.test(path);
  return false;
}

export function isPublicPage(path: string) {
  return ['/', '/explore'].includes(path) || /^\/(listing|event)\/[^/]+$/.test(path);
}
