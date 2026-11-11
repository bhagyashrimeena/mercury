import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const app = readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');
const home = app.slice(app.indexOf('function home()'), app.indexOf('function bindSaves()'));

test('Mercury homepage presents the sports identity before search and event listings', () => {
  const hero = home.indexOf('<section class="hero">');
  const search = home.indexOf('<form class="search-bar"');
  const discovery = home.indexOf('<section class="discovery-section">');
  const organizers = home.indexOf('<section class="host-banner">');
  assert.ok(hero >= 0 && search > hero && discovery > search && organizers > discovery);
  assert.doesNotMatch(home, /\.discovery-section"\)\.after\(document\.querySelector\("\.hero"\)\)/);
  assert.doesNotMatch(home, /<section class="quickline"/);
  assert.match(home, /Find your people/);
  assert.match(home, /Play your game/);
});

test('homepage keeps working search, event filters and authentic image disclosures', () => {
  assert.match(home, /id="hero-search"/);
  assert.match(home, /new FormData\(e.target\)/);
  assert.match(home, /data-home-sport=/);
  assert.match(home, /id="featured-grid"/);
  assert.match(home, /Illustrative sports photo/);
  assert.match(home, /homeHero\.page/);
  assert.match(home, /href="\/for-organizers"/);
});

test('homepage motion respects reduced motion and does not hide event content', () => {
  assert.match(css, /MERCURY HOME \/ ARENA FIRST/);
  assert.match(css, /\.home-journey \.hero/);
  assert.match(css, /@media\(prefers-reduced-motion:reduce\)/);
  assert.doesNotMatch(home, /style="display:none"|\\shidden="true"/);
});
