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

function buildCtx(overrides?: { portal?: boolean; inventory?: string[]; absoluteMlClasses?: string[] }): VariantContext {
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
      // Golden default: NONE render-absolute (the brutal button root is inline-flex),
      // so the golden's `.ml-button { position: relative }` is legitimately allowed.
      absoluteMlClasses: overrides?.absoluteMlClasses ?? [],
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

// --- render-owned positioning (discrete-slider bug) ---

function scoped(ctx: VariantContext, inner: string): string {
  return `/// <mls fileReference="_${ctx.theme.project}_/l2/molecules/${ctx.variant.group}/${ctx.variant.shortName}.less" enhancement="_102020_/l2/enhancementStyleAura" />\n${ctx.variant.tag} {\n  --ml-x: 1;\n${inner}\n}\n`;
}

test('position override on a render-absolute element is rejected', () => {
  const ctx = buildCtx({ inventory: ['ml-slider-thumb'], absoluteMlClasses: ['ml-slider-thumb'] });
  const less = scoped(ctx, '.ml-slider-thumb { position: relative; overflow: hidden; color: #fff; transition: none; }');
  assert.ok(runLessGate(less, ctx).some(issue => issue.code === 'position_override'));
});

test('position/overflow INSIDE a ::before overlay is allowed (scrubbed)', () => {
  const ctx = buildCtx({ inventory: ['ml-slider-thumb'], absoluteMlClasses: ['ml-slider-thumb'] });
  const less = scoped(ctx, '.ml-slider-thumb { color: #fff; transition: none; &::before { content: ""; position: absolute; inset: 0; } }');
  assert.ok(!runLessGate(less, ctx).some(issue => issue.code === 'position_override'));
});

test('position on an element the render does NOT position is allowed (golden-style)', () => {
  const ctx = buildCtx({ inventory: ['ml-button'], absoluteMlClasses: [] });
  const less = scoped(ctx, '.ml-button { position: relative; transform: translate(2px,2px); color: #fff; transition: none; }');
  assert.ok(!runLessGate(less, ctx).some(issue => issue.code === 'position_override'));
});

test('`.ml-slider-thumb` in absolute set does not match the longer `.ml-slider-thumb-arrow`', () => {
  const ctx = buildCtx({ inventory: ['ml-slider-thumb', 'ml-slider-thumb-arrow'], absoluteMlClasses: ['ml-slider-thumb', 'ml-slider-thumb-arrow'] });
  // only the -arrow class carries position, on its own ::after (scrubbed) — nothing flagged
  const less = scoped(ctx, '.ml-slider-thumb { color: #fff; transition: none; } .ml-slider-thumb-arrow { &::after { position: absolute; } }');
  assert.ok(!runLessGate(less, ctx).some(issue => issue.code === 'position_override'));
});

test('T3: a universal selector is rejected (wipes inherited animation, leaks scope)', () => {
  const ctx = buildCtx({ inventory: ['ml-button'] });
  const less = scoped(ctx, '.ml-button { color: #fff; transition: none; } * { transition: none; }');
  assert.ok(runLessGate(less, ctx).some(issue => issue.code === 'universal_selector'));

  const nested = scoped(ctx, '.ml-button { color: #fff; transition: none; } .ml-button > * { transition: none; }');
  assert.ok(runLessGate(nested, ctx).some(issue => issue.code === 'universal_selector'));
});

test('T3: `*` inside declarations/comments is not a universal selector', () => {
  const ctx = buildCtx({ inventory: ['ml-button'] });
  // calc multiplication, a /* */ comment and the mechanical spinner must all pass
  const less = scoped(ctx, '/* offset * 2 */ .ml-button { width: calc(100% * 0.5); color: #fff; transition: none; } .animate-spin { animation-timing-function: steps(8); }');
  assert.ok(!runLessGate(less, ctx).some(issue => issue.code === 'universal_selector'));
});
