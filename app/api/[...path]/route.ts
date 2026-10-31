import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../../chatgpt-auth';
import { apiHandler } from '../../../server/api.js';
export const dynamic = 'force-dynamic';
async function handle(request: Request) { return apiHandler(request, env.DB, await getChatGPTUser()); }
export const GET = handle;
export const POST = handle;
export const PATCH = handle;
export const DELETE = handle;
