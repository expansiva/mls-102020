/// <mls fileReference="_102020_/l2/aura/molecules/shared/moleculeTemplates.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  deriveMoleculeTag,
  escapeSkillLiteral,
  hasUnescapedTemplateChars,
  parseMlsFileReference,
  stripLeadingMlsHeader,
  substituteDemoState,
  tagFromFileReference,
  toKebab,
  unescapeSkillLiteral,
} from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';

test('parseMlsFileReference splits a molecule reference into its parts', () => {
  assert.deepEqual(parseMlsFileReference('_102040_/l2/molecules/groupviewmetric/ml-metric-card.ts'), {
    project: 102040,
    level: 2,
    folder: 'molecules/groupviewmetric',
    shortName: 'ml-metric-card',
    extension: '.ts',
  });
});

test('parseMlsFileReference rejects malformed references instead of guessing', () => {
  assert.equal(parseMlsFileReference('/_102040_/l2/molecules/g/ml-x.ts'), null); // leading slash = import path
  assert.equal(parseMlsFileReference('102040/l2/molecules/g/ml-x.ts'), null);
  assert.equal(parseMlsFileReference('_102040_/l2/molecules/g/ml-x'), null); // no extension
  assert.equal(parseMlsFileReference(''), null);
});

test('tagFromFileReference is the derived tag, or empty on a malformed reference', () => {
  assert.equal(tagFromFileReference('_102053_/l2/molecules/groupviewcard/ml-kpi-card-glass.ts'), 'groupviewcard--ml-kpi-card-glass');
  assert.equal(tagFromFileReference('nonsense'), '');
});

test('deriveMoleculeTag reproduces the tags of real molecules in mls-102040', () => {
  assert.equal(
    deriveMoleculeTag({ shortName: 'ml-metric-card', folder: 'molecules/groupviewmetric' }),
    'groupviewmetric--ml-metric-card',
  );
  assert.equal(
    deriveMoleculeTag({ shortName: 'ml-compact-metric-sparkline', folder: 'molecules/groupviewmetric' }),
    'groupviewmetric--ml-compact-metric-sparkline',
  );
});

test('deriveMoleculeTag uses only the LAST folder segment', () => {
  assert.equal(deriveMoleculeTag({ shortName: 'ml-x', folder: 'molecules/groupentertext' }), 'groupentertext--ml-x');
  assert.equal(deriveMoleculeTag({ shortName: 'ml-x' }), 'ml-x');
});

// Why the fileReference gate must require a LOWERCASE group folder: kebab-casing a camelCase
// folder inserts dashes, producing a tag that matches no molecule in the library.
test('deriveMoleculeTag kebab-cases a camelCase folder — the wrong tag', () => {
  assert.equal(deriveMoleculeTag({ shortName: 'ml-x', folder: 'molecules/groupEnterText' }), 'group-enter-text--ml-x');
});

test('toKebab splits camelCase and lowercases', () => {
  assert.equal(toKebab('groupViewMetric'), 'group-view-metric');
  assert.equal(toKebab('groupviewmetric'), 'groupviewmetric');
});

test('stripLeadingMlsHeader removes the header the model wrote, keeping the body', () => {
  const withHeader = [
    '/// <mls fileReference="_102040_/l2/molecules/g/ml-x.less" enhancement="_blank"/>',
    '',
    'g--ml-x {',
    '  color: red;',
    '}',
  ].join('\n');
  assert.equal(stripLeadingMlsHeader(withHeader), 'g--ml-x {\n  color: red;\n}');
});

test('stripLeadingMlsHeader leaves a headerless body untouched', () => {
  const body = 'g--ml-x {\n  color: red;\n}';
  assert.equal(stripLeadingMlsHeader(body), body);
});

test('escapeSkillLiteral escapes what would break the .defs.ts template literal', () => {
  // A skill mentioning `code` and a ${placeholder} compiles only when both are escaped.
  const escaped = escapeSkillLiteral('use `cn()` and ${value}');
  assert.equal(escaped, 'use \\`cn()\\` and \\${value}');
  assert.equal(hasUnescapedTemplateChars(escaped), false);
});

test('unescapeSkillLiteral round-trips, so content checks see the real markdown', () => {
  const markdown = '# Notes\n```typescript\nconst x = 1;\n```\nand ${value}';
  assert.equal(unescapeSkillLiteral(escapeSkillLiteral(markdown)), markdown);
  // The point of the inverse: an escaped fence must become visible again to a content check.
  assert.ok(unescapeSkillLiteral(escapeSkillLiteral(markdown)).includes('```'));
  assert.ok(!escapeSkillLiteral(markdown).includes('```'));
});

test('hasUnescapedTemplateChars catches the raw markdown the model returns', () => {
  assert.equal(hasUnescapedTemplateChars('use `cn()`'), true);
  assert.equal(hasUnescapedTemplateChars('interpolates ${x}'), true);
  assert.equal(hasUnescapedTemplateChars('# Objective\n- plain markdown'), false);
});

test('substituteDemoState replaces the placeholder with the assembled playground state', () => {
  const html = '<div data-state=\'playgroundDinamicState\'></div>';
  const out = substituteDemoState(html, [
    { name: 'default', state: [{ stateName: 'playground.card1.loading', value: 'false' }] },
    { name: 'loading', state: [{ stateName: 'playground.card2.loading', value: 'true' }] },
  ]);
  assert.ok(!out.includes('playgroundDinamicState'));
  assert.deepEqual(
    JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1)),
    { playground: { card1: { loading: false }, card2: { loading: true } } },
  );
});

test('substituteDemoState keeps a non-JSON value as a string and ignores malformed stateNames', () => {
  const out = substituteDemoState('playgroundDinamicState', [
    { name: 'a', state: [{ stateName: 'playground.k.label', value: 'Revenue' }] },
    { name: 'b', state: [{ stateName: 'notPlayground.k.p', value: '1' }] },
    { name: 'c', state: [{ stateName: 'playground.tooShort', value: '1' }] },
  ]);
  assert.deepEqual(JSON.parse(out), { playground: { k: { label: 'Revenue' } } });
});
