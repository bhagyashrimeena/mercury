import test from 'node:test';
import assert from 'node:assert/strict';
import { isPublicApiRequest, isPublicPage } from '../lib/public-routes.ts';

test('public API classification includes only exact browse and anonymous count routes', () => {
  for (const [path, method] of [
    ['/api/events', 'GET'], ['/api/events/game-1', 'GET'],
    ['/api/listings', 'GET'], ['/api/listings/listing-1', 'GET'],
    ['/api/metrics', 'POST'], ['/api/listings/listing-1/click', 'POST'],
  ]) assert.equal(isPublicApiRequest(path, method), true, `${method} ${path}`);

  for (const [path, method] of [
    ['/api/session', 'GET'], ['/api/bookings', 'GET'],
    ['/api/events/game-1/register', 'POST'], ['/api/events/game-1', 'PATCH'],
    ['/api/listings/listing-1/save', 'POST'], ['/api/listings/listing-1/report', 'POST'],
    ['/api/organizer/events', 'GET'], ['/api/metrics', 'GET'],
    ['/api/events/game-1/attendees', 'GET'],
  ]) assert.equal(isPublicApiRequest(path, method), false, `${method} ${path}`);
});

test('public page classification excludes private screens', () => {
  for (const path of ['/', '/explore', '/listing/listing-1', '/event/game-1']) assert.equal(isPublicPage(path), true);
  for (const path of ['/account', '/my-games', '/register/game-1', '/host', '/roster/game-1', '/admin']) assert.equal(isPublicPage(path), false);
});
