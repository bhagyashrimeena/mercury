import { getDatabase } from '../../../db/vercel';
import { getMercuryUser } from '../../auth-user';
import { apiHandler } from '../../../server/api.js';
import { isPublicApiRequest } from '../../../lib/public-routes';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function handle(request: Request) {
  const path = new URL(request.url).pathname;
  const user = isPublicApiRequest(path, request.method) ? null : await getMercuryUser();
  return apiHandler(request, getDatabase(), user, { adminEmail: process.env.MERCURY_ADMIN_EMAIL || '' });
}
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
