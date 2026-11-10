import test from 'node:test';
import assert from 'node:assert/strict';
import { arenaIntroMarkup, waveRibbonMarkup, listingFlowMarkup } from '../public/kinetic-art.js';

test('Explore intro has accessible real headline and decorative original SVG sport art', () => {
  const markup = arenaIntroMarkup();
  assert.match(markup, /class="explore-intro mercury-arena"/);
  assert.match(markup, /id="explore-title"/);
  assert.match(markup, /FIND YOUR/);
  assert.match(markup, /NEXT GAME/);
  assert.match(markup, /aria-hidden="true"/);
  assert.match(markup, /<svg[^>]+viewBox="0 0 760 258"/);
  assert.match(markup, /class="arena-line arena-line-one"/);
  assert.match(markup, /class="arena-ball"/);
  assert.doesNotMatch(markup, /<img|https?:\/\//i);
});

test('Sport movement decorations never imitate inventory or hide practical actions', () => {
  const ribbon = waveRibbonMarkup();
  const stripe = listingFlowMarkup();
  assert.match(ribbon, /mercury-wave-ribbon-track/);
  assert.match(ribbon, /SPORT BELONGS TO EVERYONE/);
  assert.match(stripe, /listing-flow-stripe/);
  assert.match(stripe, /<path/);
  assert.match(ribbon, /aria-hidden="true"/);
  assert.match(stripe, /aria-hidden="true"/);
  assert.doesNotMatch(ribbon + stripe, /spots left|verified organizer|register now/i);
});

test('Art uses only authored SVG curves and CSS, never generated stock-lookalike imagery', () => {
  const all = arenaIntroMarkup() + waveRibbonMarkup() + listingFlowMarkup();
  assert.doesNotMatch(all, /data:image|pexels|unsplash|sora|imagegen/i);
  assert.match(all, /stroke="#D9FF38"/);
  assert.match(all, /MUMBAI IS MOVING/);
});
