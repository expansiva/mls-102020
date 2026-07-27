/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/helpers/ntThemeHtml.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { renderThemeHtml } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntThemeHtml.js';
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
