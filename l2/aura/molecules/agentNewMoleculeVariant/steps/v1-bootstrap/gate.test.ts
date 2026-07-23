/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runBootstrapGate, VBootstrapInputs } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';
import { VariantContext } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';

function buildCtx(inventory: string[]): VariantContext {
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
      portal: false,
      mlClassInventory: inventory,
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
      shortName: 'ml-button-standard-brutal',
      tag: 'grouptriggeraction--ml-button-standard-brutal',
      className: 'ButtonStandardBrutal',
      group: 'grouptriggeraction',
      files: { ts: 'x.ts', defs: 'x.defs.ts', less: 'x.less', html: 'x.html' },
    },
    example: { pattern: 'simple', ref: null, coldStart: true },
    userLanguage: 'pt',
  };
}

function okInputs(): VBootstrapInputs {
  return {
    themeErrors: [],
    originTsFound: true,
    originLessFound: true,
    collisions: [],
    context: buildCtx(['ml-button', 'ml-disabled']),
  };
}

test('valid inputs pass', () => {
  assert.deepEqual(runBootstrapGate(okInputs()), []);
});

test('missing theme fails with the theme errors', () => {
  const inputs = okInputs();
  inputs.themeErrors = ['project 102051 has no theme skill'];
  assert.ok(runBootstrapGate(inputs).some(issue => issue.code === 'theme'));
});

test('unreadable origin fails with dependency orientation', () => {
  const inputs = okInputs();
  inputs.originTsFound = false;
  inputs.context = null;
  assert.ok(runBootstrapGate(inputs).some(issue => issue.code === 'origin_unreadable' && issue.message.includes('dependency')));
});

test('empty ml-* inventory fails the discipline rule', () => {
  const inputs = okInputs();
  inputs.context = buildCtx([]);
  assert.ok(runBootstrapGate(inputs).some(issue => issue.code === 'discipline'));
});

test('destination collision fails pointing to Improve', () => {
  const inputs = okInputs();
  inputs.collisions = ['l2/molecules/grouptriggeraction/ml-button-standard-brutal.ts'];
  assert.ok(runBootstrapGate(inputs).some(issue => issue.code === 'collision' && issue.message.includes('Improve')));
});
