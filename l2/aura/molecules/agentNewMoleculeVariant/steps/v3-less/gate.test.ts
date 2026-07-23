/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v3-less/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runLessGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v3-less/gate.js';
import { extractMlClassesFromLess } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';
import { normalizeLessContent, stripLeadingMlsHeader } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

const here = dirname(fileURLToPath(import.meta.url));
const goldenLess = readFileSync(resolve(here, 'fixture/ml-button-standard-brutal.less'), 'utf8');

function buildCtx(overrides?: { portal?: boolean; inventory?: string[] }): VariantContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-23T00:00:00.000Z',
    userNotes: '',
    origin: {
      ref: '_102040_/l2/molecules/grouptriggeraction/ml-button-standard',
      project: 102040,
      group: 'grouptriggeraction',
      groupCanonical: 'groupTriggerAction',
      shortName: 'ml-button-standard',
      tag: 'grouptriggeraction--ml-button-standard',
      className: 'ButtonStandardMolecule',
      importPath: '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js',
      portal: overrides?.portal ?? false,
      // Golden inventory: by construction every class the golden sheet styles.
      mlClassInventory: overrides?.inventory ?? extractMlClassesFromLess(goldenLess),
    },
    theme: {
      project: 102054,
      ref: '_102054_/l2/skills/theme',
      info: {
        name: 'brutal',
        suffix: '-brutal',
        displayName: 'Brutalism',
        description: 'x',
        background: { kind: 'light', css: 'background: #f5f5f5;', note: 'x' },
      },
    },
    variant: {
      shortName: 'ml-button-standard-brutal',
      tag: 'grouptriggeraction--ml-button-standard-brutal',
      className: 'ButtonStandardBrutal',
      group: 'grouptriggeraction',
      files: {
        ts: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.ts',
        defs: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.defs.ts',
        less: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.less',
        html: 'l2/molecules/grouptriggeraction/ml-button-standard-brutal.html',
      },
    },
    example: { pattern: 'simple', ref: null, coldStart: true },
    userLanguage: 'pt',
  };
}

test('golden: the hand-made brutal button sheet passes the gate', () => {
  const issues = runLessGate(goldenLess, buildCtx());
  assert.deepEqual(issues, []);
});

test('markdown fences are rejected', () => {
  const issues = runLessGate('```less\n' + goldenLess + '\n```', buildCtx());
  assert.ok(issues.some(issue => issue.code === 'fence'));
});

test('unknown ml-* classes are rejected', () => {
  const issues = runLessGate(goldenLess + '\n.ml-invented-thing { color: red; }', buildCtx());
  assert.ok(issues.some(issue => issue.code === 'unknown_classes' && issue.message.includes('ml-invented-thing')));
});

test('sheet not scoped under the variant tag is rejected', () => {
  const ctx = buildCtx();
  const unscoped = goldenLess.split(ctx.variant.tag).join('some-other-tag');
  const issues = runLessGate(unscoped, ctx);
  assert.ok(issues.some(issue => issue.code === 'scope'));
});

test('portal molecule requires the data-widget selector', () => {
  const issues = runLessGate(goldenLess, buildCtx({ portal: true }));
  assert.ok(issues.some(issue => issue.code === 'portal_scope'));
});

test('unbalanced braces are rejected', () => {
  const issues = runLessGate(goldenLess + '\n.ml-button {', buildCtx());
  assert.ok(issues.some(issue => issue.code === 'braces'));
});

test('missing motion stance is rejected', () => {
  const noTransition = goldenLess.replace(/transition[^;]*;/g, '');
  const issues = runLessGate(noTransition, buildCtx());
  assert.ok(issues.some(issue => issue.code === 'motion'));
});

// --- M2: header ownership ---

test('a sheet whose mls header points at the WRONG project is rejected', () => {
  // Simulates the real defect: the model copied the origin (102040) header.
  const wrongHeader = goldenLess.replace('_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.less', '_102040_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.less');
  assert.ok(runLessGate(wrongHeader, buildCtx()).some(issue => issue.code === 'header'));
});

test('normalizeLessContent fixes a wrong header deterministically -> gate passes', () => {
  const ctx = buildCtx();
  const wrong = goldenLess.replace('_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.less', '_102040_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.less');
  const fixed = normalizeLessContent(wrong, ctx);
  assert.deepEqual(runLessGate(fixed, ctx), []);
});

test('normalizeLessContent prepends a header when the model omitted one', () => {
  const ctx = buildCtx();
  const bodyOnly = stripLeadingMlsHeader(goldenLess);
  assert.ok(!/^\s*\/\/\/\s*<mls/.test(bodyOnly));
  const fixed = normalizeLessContent(bodyOnly, ctx);
  assert.ok(fixed.startsWith('/// <mls fileReference="_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal.less"'));
  assert.deepEqual(runLessGate(fixed, ctx), []);
});

test('normalizeLessContent collapses two headers into one', () => {
  const ctx = buildCtx();
  const doubled = '/// <mls fileReference="_102040_/x.less" enhancement="_blank" />\n' + goldenLess;
  const fixed = normalizeLessContent(doubled, ctx);
  assert.equal((fixed.match(/\/\/\/\s*<mls/g) || []).length, 1);
});
