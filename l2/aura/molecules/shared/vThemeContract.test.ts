/// <mls fileReference="_102020_/l2/aura/molecules/shared/vThemeContract.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { validateVThemeModule } from '/_102020_/l2/aura/molecules/shared/vThemeContract.js';

function validModule(): Record<string, unknown> {
  return {
    themeInfo: {
      name: 'glass',
      suffix: '-glass',
      displayName: 'Glassmorphism',
      description: 'translucent surfaces',
      background: { kind: 'dark', css: 'background: #0f172a;', note: 'dark backdrop' },
    },
    skill: '## 1. Visual Signature\nx\n## 2. Tokens\ny\n## 3. Canonical CSS Rules\nz\n## 4. Theme Nuances\nw',
    examples: [{ pattern: 'simple', ref: '_102055_/l2/molecules/g/m-glass' }],
  };
}

test('a well-formed theme module validates', () => {
  const { theme, errors } = validateVThemeModule(validModule());
  assert.deepEqual(errors, []);
  assert.ok(theme);
  assert.equal(theme!.themeInfo.suffix, '-glass');
  assert.equal(theme!.examples.length, 1);
});

test('empty examples are valid (pilot / cold start)', () => {
  const mod = validModule();
  mod.examples = [];
  const { theme, errors } = validateVThemeModule(mod);
  assert.deepEqual(errors, []);
  assert.ok(theme);
});

test('a non-object module is rejected', () => {
  assert.ok(validateVThemeModule(null).errors.length);
  assert.ok(validateVThemeModule('x').errors.length);
});

test('missing themeInfo is rejected', () => {
  const mod = validModule();
  delete mod.themeInfo;
  assert.ok(validateVThemeModule(mod).errors.some(e => e.includes('themeInfo')));
});

test('suffix that does not start with "-" is rejected', () => {
  const mod = validModule();
  (mod.themeInfo as any).suffix = 'glass';
  assert.ok(validateVThemeModule(mod).errors.some(e => e.includes("suffix must start with '-'")));
});

test('invalid background.kind is rejected', () => {
  const mod = validModule();
  (mod.themeInfo as any).background.kind = 'gradient';
  assert.ok(validateVThemeModule(mod).errors.some(e => e.includes('background.kind')));
});

test('missing a mandatory skill section is rejected', () => {
  const mod = validModule();
  mod.skill = '## 1. Visual Signature\nx\n## 3. Canonical CSS Rules\nz'; // no Tokens section
  assert.ok(validateVThemeModule(mod).errors.some(e => e.includes('## 2. Tokens')));
});

test('malformed examples entry is rejected', () => {
  const mod = validModule();
  mod.examples = [{ pattern: 'weird', ref: '' }];
  assert.ok(validateVThemeModule(mod).errors.some(e => e.includes('examples[0]')));
});
