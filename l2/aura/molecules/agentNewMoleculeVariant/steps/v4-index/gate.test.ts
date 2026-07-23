/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runIndexGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.js';
import { insertIndexImport, renderNewGroupIndexTs } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTemplates.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

function buildCtx(): VariantContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-23T00:00:00.000Z',
    userNotes: '',
    origin: {
      ref: '_102040_/l2/molecules/grouptriggeraction/ml-split-button',
      project: 102040,
      group: 'grouptriggeraction',
      groupCanonical: 'groupTriggerAction',
      shortName: 'ml-split-button',
      tag: 'grouptriggeraction--ml-split-button',
      className: 'SplitButtonMolecule',
      importPath: '/_102040_/l2/molecules/grouptriggeraction/ml-split-button.js',
      portal: false,
      mlClassInventory: ['ml-button'],
    },
    theme: {
      project: 102054,
      ref: '_102054_/l2/skills/theme',
      info: {
        name: 'brutal', suffix: '-brutal', displayName: 'Brutalism', description: 'x',
        background: { kind: 'light', css: 'background: #f5f5f5;', note: 'x' },
      },
    },
    variant: {
      shortName: 'ml-split-button-brutal',
      tag: 'grouptriggeraction--ml-split-button-brutal',
      className: 'SplitButtonMoleculeBrutal',
      group: 'grouptriggeraction',
      files: {
        ts: 'l2/molecules/grouptriggeraction/ml-split-button-brutal.ts',
        defs: 'l2/molecules/grouptriggeraction/ml-split-button-brutal.defs.ts',
        less: 'l2/molecules/grouptriggeraction/ml-split-button-brutal.less',
        html: 'l2/molecules/grouptriggeraction/ml-split-button-brutal.html',
      },
    },
    example: { pattern: 'simple', ref: null, coldStart: false },
    userLanguage: 'pt',
  };
}

const existingIndex = `/// <mls fileReference="_102054_/l2/molecules/grouptriggeraction/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';

// Registra as moléculas do grupo (side-effect import)
import '/_102054_/l2/molecules/grouptriggeraction/ml-button-standard-brutal';
import '/_102054_/l2/molecules/grouptriggeraction/ml-icon-button-brutal';

export class X {}
`;

test('insert adds the import after the last molecule import, preserving all', () => {
  const ctx = buildCtx();
  const updated = insertIndexImport(existingIndex, ctx);
  assert.ok(updated);
  assert.deepEqual(runIndexGate(updated!, existingIndex, ctx), []);
  const lines = updated!.split('\n');
  const idx = lines.findIndex(line => line.includes('ml-split-button-brutal'));
  assert.ok(lines[idx - 1].includes('ml-icon-button-brutal'));
});

test('insert is idempotent (already registered => unchanged)', () => {
  const ctx = buildCtx();
  const once = insertIndexImport(existingIndex, ctx)!;
  const twice = insertIndexImport(once, ctx)!;
  assert.equal(once, twice);
});

test('unrecognizable index (no molecule import block) returns null — report, never guess', () => {
  const ctx = buildCtx();
  assert.equal(insertIndexImport('export class X {}\n', ctx), null);
});

test('lost imports are detected by the gate', () => {
  const ctx = buildCtx();
  const updated = insertIndexImport(existingIndex, ctx)!.replace("import '/_102054_/l2/molecules/grouptriggeraction/ml-icon-button-brutal';\n", '');
  assert.ok(runIndexGate(updated, existingIndex, ctx).some(issue => issue.code === 'import_lost'));
});

test('freshly created minimal index passes the gate', () => {
  const ctx = buildCtx();
  const created = renderNewGroupIndexTs(ctx);
  assert.deepEqual(runIndexGate(created, '', ctx), []);
});
