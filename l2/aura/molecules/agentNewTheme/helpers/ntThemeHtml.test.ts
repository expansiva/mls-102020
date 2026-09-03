/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntThemeHtml.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveThemeChrome, renderThemeHtml } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntThemeHtml.js';
import { NtThemeSummary } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';

const summary: NtThemeSummary = {
  name: 'neo',
  displayName: 'Neo Soft',
  background: { kind: 'light', css: 'background: #f4f4f5;' },
  palette: [{ token: '--ml-primary', label: 'Primary', color: '#6c5ce7' }],
  signature: [{ aspect: 'Corners', value: 'rounded (12px)' }],
};

test('renders a fragment carrying the theme background and content', () => {
  const html = renderThemeHtml({ summary, description: 'Soft light surfaces.', suffix: '-neo' });
  assert.ok(!/<!DOCTYPE|<html[\s>]|<head[\s>]|<body[\s>]/i.test(html), 'must be a fragment');
  assert.ok(html.includes('background: #f4f4f5;'));
  assert.ok(html.includes('Neo Soft'));
  assert.ok(html.includes('Soft light surfaces.'));
  assert.ok(html.includes('--ml-primary'));
  assert.ok(html.includes('#6c5ce7'));
  assert.ok(html.includes('rounded (12px)'));
  assert.ok(html.includes('-neo'));
});

test('dark backgrounds get light text', () => {
  const dark = renderThemeHtml({ summary: { ...summary, background: { kind: 'dark', css: 'background: #0f172a;' } } });
  assert.ok(dark.includes('rgba(255,255,255,0.92)'));
  const light = renderThemeHtml({ summary });
  assert.ok(light.includes('rgba(15,23,42,0.92)'));
});

test('LLM text cannot break out of the markup', () => {
  const html = renderThemeHtml({
    summary: {
      ...summary,
      displayName: '<script>alert(1)</script>',
      background: { kind: 'light', css: 'background: red;" onload="x' },
      palette: [{ token: '--ml-primary', label: 'P', color: '#fff" onerror="y' }],
    },
  });
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('onload="x'));
  assert.ok(!html.includes('onerror="y'));
});

test('T6: the doc chrome is derived from the signature (brutal → sharp, thick, mono)', () => {
  const brutal = {
    ...summary,
    signature: [
      { aspect: 'Corners', value: '0px — perfectly square, no rounding' },
      { aspect: 'Border', value: '3px solid #000000 on all surfaces' },
      { aspect: 'Typography', value: 'JetBrains Mono, weight 700; labels uppercase' },
    ],
  };
  const chrome = deriveThemeChrome(brutal, 'rgba(0,0,0,0.12)');
  assert.equal(chrome.radius, '0px');
  assert.equal(chrome.border, '3px solid #000000');
  assert.match(chrome.fontFamily, /monospace/);

  const html = renderThemeHtml({ summary: brutal });
  assert.ok(html.includes('border:3px solid #000000'));
  assert.ok(html.includes('border-radius:0px'));
  assert.ok(!html.includes('border-radius:0.5rem'), 'must not fall back to the neutral radius');
});

test('T6: soft themes keep a rounded chrome, and garbage falls back', () => {
  const soft = {
    ...summary,
    signature: [
      { aspect: 'Corners', value: 'rounded, radius 12px' },
      { aspect: 'Border', value: 'thin 1px rgba(255,255,255,0.18) hairline' },
      { aspect: 'Typography', value: 'Inter, sans-serif' },
    ],
  };
  const chrome = deriveThemeChrome(soft, 'rgba(0,0,0,0.12)');
  assert.equal(chrome.radius, '12px');
  assert.equal(chrome.border, '1px solid rgba(255,255,255,0.18)');
  assert.equal(chrome.fontFamily, 'system-ui,sans-serif');

  const empty = deriveThemeChrome({ ...summary, signature: [] }, 'rgba(0,0,0,0.12)');
  assert.deepEqual(empty, { radius: '0.5rem', border: '1px solid rgba(0,0,0,0.12)', fontFamily: 'system-ui,sans-serif' });
});

test('T6: absurd values from the LLM are clamped', () => {
  const wild = deriveThemeChrome({
    ...summary,
    signature: [
      { aspect: 'Corners', value: 'radius 999px pill' },
      { aspect: 'Border', value: '40px solid #000' },
    ],
  }, 'rgba(0,0,0,0.12)');
  assert.equal(wild.radius, '24px');
  assert.equal(wild.border, '6px solid #000');
});
