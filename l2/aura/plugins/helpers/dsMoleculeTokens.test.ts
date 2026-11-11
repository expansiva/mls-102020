/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsMoleculeTokens.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyMlToken, colorMapToRows, countTokenReaders, isComponentToken, literalFallback, mergeMlUses, mlTokenGroup,
  parseDurationMs, parseLength, parseMlUses, partitionMlRows, ratioMax, removeMlToken, roleOf, suggestRoles,
  upsertMlToken, valueMapToRows, type MlTokenType,
} from './dsMoleculeTokens.js';
import { selectorMentionsTag } from './dsTokenInspect.js';
import { colorRowsToMap, valueRowsToMap } from './dsDiff.js';
import { tokensCssFromTheme, type IDesignSystemTokens } from '/_102029_/l2/designSystemBase.js';

// The 61 `--ml-*` tokens the 155 molecules of 102040 read, with the fallback they write most often
// (measured 2026-11-11 over mls-102040/l2/molecules/**/ml-*.less) and the editor each must get.
const REAL_TOKENS: [string, string, MlTokenType][] = [
  ['ml-border-style', 'solid', 'borderStyle'],
  ['ml-border-width', '1px', 'length'],
  ['ml-disabled-opacity', '0.5', 'ratio'],
  ['ml-error', '#ef4444', 'color'],
  ['ml-error-dim', '#fef2f2', 'color'],
  ['ml-focus-ring-color', 'rgba(59, 130, 246, 0.4)', 'color'],
  ['ml-focus-ring-error-color', 'rgba(239, 68, 68, 0.4)', 'color'],
  ['ml-focus-ring-width', '2px', 'length'],
  ['ml-font-family', 'system-ui, -apple-system, sans-serif', 'text'],
  ['ml-font-weight-medium', '500', 'text'],
  ['ml-gradient-1', '#10b981', 'color'],
  ['ml-gradient-2', '#84cc16', 'color'],
  ['ml-gradient-3', '#eab308', 'color'],
  ['ml-gradient-4', '#f59e0b', 'color'],
  ['ml-gradient-5', '#f97316', 'color'],
  ['ml-gradient-6', '#ef4444', 'color'],
  ['ml-gradient-7', '#e11d48', 'color'],
  ['ml-info-border', '#bae6fd', 'color'],
  ['ml-nrs-handle-size', '20px', 'length'],
  ['ml-nrs-knob-active-scale', '1.15', 'ratio'],
  ['ml-nrs-knob-border-width', '2px', 'length'],
  ['ml-nrs-knob-size', '16px', 'length'],
  ['ml-nrs-tooltip-font-size', '12px', 'length'],
  ['ml-nrs-tooltip-line-height', '1.4', 'text'],
  ['ml-nrs-tooltip-offset', '6px', 'length'],
  ['ml-nrs-tooltip-padding', '2px 6px', 'text'],
  ['ml-nrs-track-height', '6px', 'length'],
  ['ml-on-gradient-1', '#ffffff', 'color'],
  ['ml-on-gradient-5', '#ffffff', 'color'],
  ['ml-on-gradient-6', '#ffffff', 'color'],
  ['ml-on-gradient-7', '#ffffff', 'color'],
  ['ml-on-primary', '#ffffff', 'color'],
  ['ml-on-primary-container', '#1c1b1f', 'color'],
  ['ml-on-surface', '#1c1b1f', 'color'],
  ['ml-on-surface-faint', '#79747e', 'color'],
  ['ml-on-surface-muted', '#49454f', 'color'],
  ['ml-outline-error', '#ef4444', 'color'],
  ['ml-outline-focus', '#3b82f6', 'color'],
  ['ml-outline-variant', '#e2e8f0', 'color'],
  ['ml-pagination-press-shadow', 'rgba(0,0,0,0.08)', 'color'],
  ['ml-primary', '#3b82f6', 'color'],
  ['ml-primary-container', 'rgba(59, 130, 246, 0.1)', 'color'],
  ['ml-radius-md', 'var(--ml-radius-sm, 6px)', 'length'],
  ['ml-radius-sm', '6px', 'length'],
  ['ml-shadow-0', 'none', 'text'],
  ['ml-skeleton-duration', '1.5s', 'duration'],
  ['ml-spinner-border-width', '2px', 'length'],
  ['ml-spinner-duration', '0.8s', 'duration'],
  ['ml-spinner-size', '16px', 'length'],
  ['ml-success', '#22c55e', 'color'],
  ['ml-success-border', '#a7f3d0', 'color'],
  ['ml-success-dim', '#f0fdf4', 'color'],
  ['ml-surface', '#ffffff', 'color'],
  ['ml-surface-dim', '#f5f5f5', 'color'],
  ['ml-surface-overlay', 'rgba(255, 255, 255, 0.9)', 'color'],
  ['ml-surface-variant', '#ede8f5', 'color'],
  ['ml-table-action-gap', '0.5rem', 'length'],
  ['ml-table-draft-marker', '3px', 'length'],
  ['ml-table-resize-width', '5px', 'length'],
  ['ml-warning', '#f59e0b', 'color'],
  ['ml-warning-border', '#fde68a', 'color'],
];

test('classifyMlToken: the 61 real tokens get their editor (no free text for a color or a measure)', () => {
  assert.equal(REAL_TOKENS.length, 61);
  for (const [name, fallback, type] of REAL_TOKENS) assert.equal(classifyMlToken(name, fallback), type, `${name} (${fallback})`);
});

test('classifyMlToken: without a fallback the name decides', () => {
  assert.equal(classifyMlToken('ml-outline-focus', ''), 'color');
  assert.equal(classifyMlToken('ml-border-width', ''), 'length');
  assert.equal(classifyMlToken('ml-disabled-opacity', ''), 'ratio');
  assert.equal(classifyMlToken('ml-whatever', ''), 'text');
});

test('mlTokenGroup: subject groups of the inspector', () => {
  const group = (name: string, fb: string) => mlTokenGroup(name, classifyMlToken(name, fb));
  assert.equal(group('ml-outline-focus', '#3b82f6'), 'colors');
  assert.equal(group('ml-border-width', '1px'), 'border');
  assert.equal(group('ml-border-style', 'solid'), 'border');
  assert.equal(group('ml-radius-sm', '6px'), 'border');
  assert.equal(group('ml-focus-ring-width', '2px'), 'focus');
  assert.equal(group('ml-disabled-opacity', '0.5'), 'focus');
  assert.equal(group('ml-font-family', 'system-ui'), 'typography');
  assert.equal(group('ml-spinner-duration', '0.8s'), 'motion');
  assert.equal(group('ml-nrs-knob-active-scale', '1.15'), 'motion');
  assert.equal(group('ml-table-action-gap', '0.5rem'), 'other');
});

test('parseMlUses: fallbacks with nested var() and commas, nested reads too', () => {
  const css = 'border: var(--ml-border-width, 1px) var(--ml-border-style,solid) var(--border-default, #e2e8f0); '
    + 'box-shadow: 0 0 0 var(--ml-focus-ring-width) rgba(0,0,0,.1); border-radius: var(--ml-radius-md, var(--ml-radius-sm, 6px)); '
    + 'font-family: var(--ml-font-family, system-ui, -apple-system, sans-serif);';
  assert.deepEqual(parseMlUses(css), [
    { name: 'ml-border-width', fallback: '1px' },
    { name: 'ml-border-style', fallback: 'solid' },
    { name: 'ml-focus-ring-width', fallback: '' },
    { name: 'ml-radius-md', fallback: 'var(--ml-radius-sm, 6px)' },
    { name: 'ml-radius-sm', fallback: '6px' },
    { name: 'ml-font-family', fallback: 'system-ui, -apple-system, sans-serif' },
  ]);
});

test('mergeMlUses: one per token, the most written fallback wins', () => {
  assert.deepEqual(mergeMlUses([
    { name: 'ml-primary-container', fallback: '#dbeafe' },
    { name: 'ml-primary-container', fallback: 'rgba(59, 130, 246, 0.1)' },
    { name: 'ml-primary-container', fallback: 'rgba(59, 130, 246, 0.1)' },
    { name: 'ml-x', fallback: '' },
  ]), [{ name: 'ml-primary-container', fallback: 'rgba(59, 130, 246, 0.1)' }, { name: 'ml-x', fallback: '' }]);
});

test('literalFallback / roleOf / parseLength / parseDurationMs / ratioMax', () => {
  assert.equal(literalFallback('var(--ml-radius-sm, 6px)'), '6px');
  assert.equal(literalFallback('var(--a, var(--b, #fff))'), '#fff');
  assert.equal(literalFallback('var(--a)'), '');
  assert.equal(literalFallback('2px'), '2px');
  assert.equal(roleOf('var(--border-focus)'), 'border-focus');
  assert.equal(roleOf('var(--border-focus, #000)'), null);
  assert.equal(roleOf('#fff'), null);
  assert.deepEqual(parseLength('0.5rem'), { amount: '0.5', unit: 'rem' });
  assert.deepEqual(parseLength('0'), { amount: '0', unit: 'px' });
  assert.equal(parseLength('2px 6px'), null);
  assert.equal(parseDurationMs('1.5s'), 1500);
  assert.equal(parseDurationMs('200ms'), 200);
  assert.equal(parseDurationMs('fast'), null);
  assert.equal(ratioMax('ml-disabled-opacity'), 1);
  assert.equal(ratioMax('ml-nrs-knob-active-scale'), 2);
});

test('suggestRoles: roles sharing a word with the token, closest first', () => {
  const roles = ['border-focus', 'button-primary-bg', 'status-error-text', 'surface-bg', 'focus-ring', 'text-default'];
  assert.deepEqual(suggestRoles('ml-outline-focus', roles), ['focus-ring', 'border-focus']);
  assert.deepEqual(suggestRoles('ml-outline-error', roles), ['status-error-text']);
  assert.deepEqual(suggestRoles('ml-xyz', roles), []);
});

test('isComponentToken / partitionMlRows: ml-* keys leave Colors and Global, order kept', () => {
  assert.equal(isComponentToken('ml-border-width'), true);
  assert.equal(isComponentToken('_dark-ml-primary'), true);
  assert.equal(isComponentToken('primary-bg'), false);
  const rows = colorMapToRows({ 'primary-bg': '#111', 'ml-outline-focus': '#222', 'text-default': '#333', '_dark-ml-outline-focus': '#444', '_dark-primary-bg': '#555' });
  const { base, ml } = partitionMlRows(rows);
  assert.deepEqual(base.map(r => r.name), ['primary-bg', 'text-default']);
  assert.deepEqual(ml, [{ name: 'ml-outline-focus', light: '#222', dark: '#444' }]);
});

test('ml rows round trip: read, edit, write — no key lost, none duplicated', () => {
  const color = { 'primary-bg': '#111', 'ml-outline-focus': '#222', '_dark-primary-bg': '#555', '_dark-ml-outline-focus': '#444' };
  const global = { 'radius-small': '6px', 'ml-border-width': '2px' };
  const c = partitionMlRows(colorMapToRows(color));
  const g = partitionMlRows(valueMapToRows(global));

  // untouched: the theme comes back as it was
  const back = {
    color: colorRowsToMap([...c.base, ...c.ml]),
    global: valueRowsToMap([...g.base, ...g.ml]),
  };
  assert.deepEqual(back.color, color);
  assert.deepEqual(back.global, global);

  // add a color with dark, change a value, add a role
  let ml = { colors: c.ml, values: g.ml };
  ml = upsertMlToken(ml, 'ml-primary', { light: '#0a0', dark: '#0f0' });
  ml = upsertMlToken(ml, 'ml-border-width', { value: '3px' });
  ml = upsertMlToken(ml, 'ml-outline-error', { light: 'var(--status-error-text)', dark: '' });
  const color2 = colorRowsToMap([...c.base, ...ml.colors]);
  const global2 = valueRowsToMap([...g.base, ...ml.values]);
  assert.equal(color2['ml-primary'], '#0a0');
  assert.equal(color2['_dark-ml-primary'], '#0f0');
  assert.equal(color2['ml-outline-error'], 'var(--status-error-text)');
  assert.equal('_dark-ml-outline-error' in color2, false, 'empty dark = no _dark- key');
  assert.equal(global2['ml-border-width'], '3px');
  assert.equal(Object.keys(global2).filter(k => k === 'ml-border-width').length, 1);

  // a token that changes kind leaves the other list
  ml = upsertMlToken(ml, 'ml-border-width', { light: '#000', dark: '' });
  assert.equal(ml.values.some(r => r.name === 'ml-border-width'), false);
  assert.equal(ml.colors.filter(r => r.name === 'ml-border-width').length, 1);

  // ✕ drops the row, and with it the _dark- pair
  ml = removeMlToken(ml, 'ml-outline-focus');
  const color3 = colorRowsToMap([...c.base, ...ml.colors]);
  assert.equal('ml-outline-focus' in color3, false);
  assert.equal('_dark-ml-outline-focus' in color3, false);
  assert.equal(color3['primary-bg'], '#111');
  assert.equal(color3['_dark-primary-bg'], '#555');
});

test('countTokenReaders: distinct molecules per token + their most common fallback', () => {
  const info = countTokenReaders([
    { id: 'groupentertext--ml-a', text: 'x { border: var(--ml-border-width, 1px) solid; } y { outline-width: var(--ml-border-width, 1px); }' },
    { id: 'groupentertext--ml-b', text: 'x { border: var(--ml-border-width, 2px) solid; color: var(--ml-primary, #3b82f6); }' },
    { id: 'groupentertext--ml-c', text: 'x { border-width: var(--ml-border-width, 1px); }' },
  ]);
  assert.deepEqual(info.get('ml-border-width'), { count: 3, fallback: '1px' });
  assert.deepEqual(info.get('ml-primary'), { count: 1, fallback: '#3b82f6' });
});

test('selectorMentionsTag: the molecule tag as a type selector, not as part of another name', () => {
  const tag = 'groupentertext--ml-address-field';
  assert.equal(selectorMentionsTag('groupentertext--ml-address-field .ml-input-container-error', tag), true);
  assert.equal(selectorMentionsTag(':is(groupentertext--ml-address-field) .x:focus-within', tag), true);
  assert.equal(selectorMentionsTag('.page > groupentertext--ml-address-field', tag), true);
  assert.equal(selectorMentionsTag('groupentertext--ml-address-field-2 .x', tag), false);
  assert.equal(selectorMentionsTag('.groupentertext--ml-address-field', tag), false);
});

test('DS compiler: ml-* keys in color/global come out as --ml-* in :root and in the dark block', () => {
  const theme: IDesignSystemTokens = {
    themeName: 'Default',
    description: '',
    color: { 'primary-bg': '#111111', 'ml-outline-focus': '#2563EB', '_dark-ml-outline-focus': '#60A5FA' },
    typography: {},
    global: { 'ml-border-width': '2px' },
  };
  const css = tokensCssFromTheme(theme);
  const root = /:root\{([^}]*)\}/.exec(css)?.[1] ?? '';
  assert.match(root, /--ml-outline-focus: #2563EB;/);
  assert.match(root, /--ml-border-width: 2px;/);
  const dark = /\.dark\s*\{([^}]*)\}|\][^{]*\{([^}]*)\}/.exec(css);
  const darkBody = dark ? (dark[1] ?? dark[2] ?? '') : '';
  assert.match(darkBody, /--ml-outline-focus: #60A5FA;/);
  assert.doesNotMatch(root, /_dark-/);
});
