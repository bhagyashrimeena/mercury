import { getDatabase } from '../../../db/vercel';
import { getMercuryUser } from '../../auth-user';
import { apiHandler } from '../../../server/api.js';
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
async function handle(request: Request) { return apiHandler(request, getDatabase(), await getMercuryUser(), { adminEmail: process.env.MERCURY_ADMIN_EMAIL || '' }); }
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
