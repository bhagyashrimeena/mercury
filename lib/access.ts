export function canEnterPrivatePilot(email: string | null | undefined): boolean {
  if (process.env.MERCURY_PUBLIC_LAUNCH === 'true') return true;
  if (!email) return false;
  const allowed = [process.env.MERCURY_ADMIN_EMAIL || '', ...(process.env.MERCURY_ALLOWED_EMAILS || '').split(',')]
    .map(value => value.trim().toLowerCase()).filter(Boolean);
  return allowed.includes(email.toLowerCase());
}
