/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { parseThemeSource, runThemeGate } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t3-generate/gate.js';
import { NtThemeSummary } from '/_102020_/l2/aura/molecules/agentNewTheme/helpers/ntTypes.js';

const DEST = 102053;
const BG_CSS = 'background: #f4f4f5;';

// A minimal but CONTRACT-VALID theme.ts, in the exact skeleton prompt.md pins.
const validTheme = [
  `/// <mls fileReference="_${DEST}_/l2/skills/theme.ts" enhancement="_blank"/>`,
  '',
  '// Theme skill (contract v1): themeInfo + skill (payload only) + examples.',
  '',
  'export const themeInfo = {',
  "    name: 'neo',",
  "    suffix: '-neo',",
  "    displayName: 'Neo Soft',",
  "    description: 'Soft light surfaces, it\\'s calm and rounded.',",
  '    background: {',
  "        kind: 'light',",
  `        css: '${BG_CSS}',`,
  "        note: 'Light backdrop; text is dark.',",
  '    },',
  '};',
  '',
  'export const skill = `',
  '# Theme — Neo Soft',
  '',
  '## 1. Visual Signature',
  '| Aspect | Value |',
  '',
  '## 2. Tokens',
  '| Token | value | Role |',
  '| --ml-primary | #6c5ce7 | brand |',
  '| --ml-surface | #ffffff | inline surface |',
  '',
  '## 3. Canonical CSS Rules',
  'Interactive surface: `background: var(--ml-surface, #ffffff);`',
  '',
  '## 4. Theme Nuances',
  'None yet.',
  '`;',
  '',
  'export const examples = [];',
  '',
].join('\n');

const validSummary: NtThemeSummary = {
  name: 'neo',
  displayName: 'Neo Soft',
  background: { kind: 'light', css: BG_CSS },
  palette: [
    { token: '--ml-primary', label: 'Primary', color: '#6c5ce7' },
    { token: '--ml-surface', label: 'Surface', color: '#ffffff' },
  ],
  signature: [{ aspect: 'Corners', value: 'rounded (12px)' }],
};

function gate(themeTs: string, summary: NtThemeSummary | null = validSummary) {
  return runThemeGate({ themeTs, summary, destProject: DEST }).map(issue => issue.code);
}

test('the golden theme passes the gate', () => {
  assert.deepEqual(gate(validTheme), []);
});

test('parseThemeSource reads the three exports (escaped quotes included)', () => {
  const parsed = parseThemeSource(validTheme);
  assert.deepEqual(parsed.errors, []);
  const info = parsed.module?.themeInfo as Record<string, unknown>;
  assert.equal(info.name, 'neo');
  assert.equal(info.suffix, '-neo');
  assert.equal(info.description, "Soft light surfaces, it's calm and rounded.");
  assert.equal((info.background as Record<string, unknown>).css, BG_CSS);
  assert.ok(parsed.skill.includes('## 2. Tokens'));
  assert.deepEqual(parsed.module?.examples, []);
});

test('empty output and markdown fences are rejected', () => {
  assert.deepEqual(gate(''), ['empty']);
  assert.ok(gate('```ts\n' + validTheme + '\n```').includes('fence'));
});

test('the header must be unique and reference the destination project', () => {
  assert.ok(gate(validTheme.replace(`_${DEST}_`, '_102040_')).includes('header'));
  assert.ok(gate(validTheme.replace('// Theme skill', `/// <mls fileReference="_${DEST}_/l2/skills/theme.ts"/>\n// Theme skill`)).includes('header'));
});

test('the theme must be a self-contained data module', () => {
  const withImport = validTheme.replace('export const themeInfo', "import { x } from './x.js';\n\nexport const themeInfo");
  assert.ok(gate(withImport).includes('import'));
});

test('a missing export is a parse error, not a crash', () => {
  const noSkill = validTheme.replace('export const skill = `', 'const other = `');
  const codes = gate(noSkill);
  assert.ok(codes.includes('parse'));
});

test('the shared contract validator drives the contract errors', () => {
  const noSection = validTheme.replace('## 3. Canonical CSS Rules', '## 3. Rules');
  assert.ok(gate(noSection).includes('contract'));

  const badSuffix = validTheme.replace("suffix: '-neo',", "suffix: 'neo',");
  const codes = gate(badSuffix);
  assert.ok(codes.includes('contract'));   // suffix must start with '-'

  const badKind = validTheme.replace("kind: 'light',", "kind: 'pastel',");
  assert.ok(gate(badKind).includes('contract'));
});

test('the suffix must be derived from the name', () => {
  const drifted = validTheme.replace("suffix: '-neo',", "suffix: '-neo-soft',");
  assert.ok(gate(drifted).includes('suffix'));
});

test('examples must start empty', () => {
  const withExample = validTheme.replace(
    'export const examples = [];',
    "export const examples = [\n    { pattern: 'simple', ref: '_102053_/l2/molecules/g/ml-x-neo' },\n];",
  );
  assert.ok(gate(withExample).includes('examples'));
});

test('the summary must describe the generated theme', () => {
  assert.ok(gate(validTheme, null).includes('summary'));
  assert.ok(gate(validTheme, { ...validSummary, name: 'other' }).includes('summary_name'));
  assert.ok(gate(validTheme, { ...validSummary, background: { kind: 'dark', css: BG_CSS } }).includes('summary_background'));
  assert.ok(gate(validTheme, { ...validSummary, background: { kind: 'light', css: 'background: #000;' } }).includes('summary_background_css'));
  assert.ok(gate(validTheme, { ...validSummary, palette: [] }).includes('summary_palette'));
  assert.ok(gate(validTheme, { ...validSummary, signature: [] }).includes('summary_signature'));
});

test('T4: the overlay surface must not be the page background color', () => {
  // T27: the overlay token is --ml-surface-overlay (--ml-surface-dim is the recessed surface)
  const withOverlay = (color: string) => ({
    ...validSummary,
    palette: [...validSummary.palette, { token: '--ml-surface-overlay', label: 'Overlay', color }],
  });
  const themeWithDimToken = validTheme.replace(
    '| --ml-surface | #ffffff | inline surface |',
    '| --ml-surface | #ffffff | inline surface |\n| --ml-surface-overlay | #f4f4f5 | overlay surface |',
  );
  // page is 'background: #f4f4f5;' — an overlay of the same color has no hierarchy
  assert.ok(runThemeGate({ themeTs: themeWithDimToken, summary: withOverlay('#f4f4f5'), destProject: DEST })
    .map(i => i.code).includes('overlay_contrast'));
  // shorthand hex of the same color is still the same color
  assert.ok(runThemeGate({ themeTs: themeWithDimToken, summary: withOverlay('#F4F4F5'), destProject: DEST })
    .map(i => i.code).includes('overlay_contrast'));
  // a distinct step passes
  assert.deepEqual(runThemeGate({ themeTs: themeWithDimToken, summary: withOverlay('#ffffff'), destProject: DEST }), []);
});

test('T4: a gradient/image page background is not compared', () => {
  const gradient = 'background: linear-gradient(135deg, #0f172a 0%, #7e22ce 100%);';
  const themeTs = validTheme
    .split(BG_CSS).join(gradient)
    .replace("kind: 'light',", "kind: 'dark',")
    .replace('| --ml-surface | #ffffff | inline surface |', '| --ml-surface | #ffffff | inline surface |\n| --ml-surface-overlay | #0f172a | overlay surface |');
  const summary = {
    ...validSummary,
    background: { kind: 'dark' as const, css: gradient },
    palette: [...validSummary.palette, { token: '--ml-surface-overlay', label: 'Overlay', color: '#0f172a' }],
  };
  assert.deepEqual(runThemeGate({ themeTs, summary, destProject: DEST }), []);
});

test('T27: a theme still using --ml-surface-dim as the overlay is checked too (fallback)', () => {
  const themeTs = validTheme.replace(
    '| --ml-surface | #ffffff | inline surface |',
    '| --ml-surface | #ffffff | inline surface |\n| --ml-surface-dim | #f4f4f5 | overlay surface |',
  );
  const summary = {
    ...validSummary,
    palette: [...validSummary.palette, { token: '--ml-surface-dim', label: 'Overlay', color: '#f4f4f5' }],
  };
  const codes = runThemeGate({ themeTs, summary, destProject: DEST }).map(issue => issue.code);
  assert.ok(codes.includes('overlay_contrast'));
});

test('palette tokens must be --ml-* and declared in the Tokens table', () => {
  assert.ok(gate(validTheme, { ...validSummary, palette: [{ token: 'primary', label: 'P', color: '#000' }] }).includes('palette_token'));
  assert.ok(gate(validTheme, { ...validSummary, palette: [{ token: '--ml-tertiary', label: 'T', color: '#000' }] }).includes('palette_unknown'));
});
