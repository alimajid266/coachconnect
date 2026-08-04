import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const variants = [
  'sketches/001-calm-athletic/index.html',
  'sketches/002-energetic-marketplace/index.html',
];

for (const path of variants) {
  test(`${path} contains the required CoachConnect preview`, async () => {
    const html = await readFile(new URL(`../${path}`, import.meta.url), 'utf8');

    assert.match(html, /CoachConnect/i);
    assert.match(html, /Find the right coach/i);
    assert.match(html, /Cricket/i);
    assert.match(html, /Tennis/i);
    assert.match(html, /Strength/i);
    assert.match(html, /Recommended coaches/i);
    assert.match(html, /How it works/i);
    assert.match(html, /What's included/i);
    assert.match(html, /Not included/i);
    assert.match(html, /What to bring/i);
    assert.match(html, /Facilities/i);
    assert.match(html, /Rs\s?[0-9,]+/i);
    assert.match(html, /Lahore|Karachi|Islamabad/i);
    assert.match(html, /aria-label=/i);
    assert.match(html, /@media\s*\(/i);
    assert.doesNotMatch(html, /lorem ipsum/i);
    assert.doesNotMatch(html, /type=["']email["']/i);
    assert.doesNotMatch(html, /exact home address/i);
  });
}
