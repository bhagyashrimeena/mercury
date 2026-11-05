import test from 'node:test';
import assert from 'node:assert/strict';
import { oauthOrigin } from '../lib/site-config.ts';

test('Google callback follows the final Mercury host without trusting arbitrary forwarded hosts', () => {
  assert.equal(oauthOrigin('www.playonmercury.com', 'https://playonmercury.com', ''), 'https://www.playonmercury.com');
  assert.equal(oauthOrigin('playonmercury.com', 'https://www.playonmercury.com', ''), 'https://playonmercury.com');
  assert.equal(oauthOrigin('attacker.example', 'https://www.playonmercury.com', ''), 'https://www.playonmercury.com');
  assert.equal(oauthOrigin('another.vercel.app', 'https://www.playonmercury.com', 'mercury-preview.vercel.app'), 'https://www.playonmercury.com');
  assert.equal(oauthOrigin('mercury-preview.vercel.app', 'https://www.playonmercury.com', 'mercury-preview.vercel.app'), 'https://mercury-preview.vercel.app');
  assert.equal(oauthOrigin('localhost:3000', 'http://localhost:3000', ''), 'http://localhost:3000');
  assert.equal(oauthOrigin('127.0.0.1:3000', 'http://127.0.0.1:3000', ''), 'http://127.0.0.1:3000');
});
