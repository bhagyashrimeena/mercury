export function clientIp(request) {
  return request.headers.get('x-vercel-forwarded-for') || request.headers.get('x-forwarded-for') || request.headers.get('cf-connecting-ip') || 'unknown';
}
