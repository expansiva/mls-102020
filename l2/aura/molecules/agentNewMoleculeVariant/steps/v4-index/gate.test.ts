/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runIndexGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v4-index/gate.js';
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

const VALID_INDEX = `/// <mls fileReference="_102054_/l2/molecules/grouptriggeraction/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import '/_102054_/l2/molecules/grouptriggeraction/ml-split-button-brutal';

@customElement('molecules--grouptriggeraction--index-102054')
export class GroupTriggerActionIndex extends StateLitElement {
  render(): TemplateResult {
    return html\`<div class="font-sans min-h-screen">
      <grouptriggeraction--ml-split-button-brutal .isEditing=\${true}></grouptriggeraction--ml-split-button-brutal>
    </div>\`;
  }
}
`;

test('a well-formed showcase index passes the gate', () => {
  assert.deepEqual(runIndexGate(VALID_INDEX, buildCtx()), []);
});

test('empty content fails', () => {
  assert.ok(runIndexGate('   ', buildCtx()).some(i => i.code === 'no_content'));
});

test('markdown fences are rejected', () => {
  const fenced = '```ts\n' + VALID_INDEX + '\n```';
  assert.ok(runIndexGate(fenced, buildCtx()).some(i => i.code === 'fenced'));
});

test('wrong header project is rejected', () => {
  const bad = VALID_INDEX.replace('_102054_/l2/molecules/grouptriggeraction/index.ts', '_102040_/l2/molecules/grouptriggeraction/index.ts');
  assert.ok(runIndexGate(bad, buildCtx()).some(i => i.code === 'header'));
});

test('missing custom element declaration is rejected', () => {
  const bad = VALID_INDEX.replace("@customElement('molecules--grouptriggeraction--index-102054')", '@customElement()');
  assert.ok(runIndexGate(bad, buildCtx()).some(i => i.code === 'custom_element'));
});

test('missing variant import is rejected', () => {
  const bad = VALID_INDEX.replace("import '/_102054_/l2/molecules/grouptriggeraction/ml-split-button-brutal';\n", '');
  const issues = runIndexGate(bad, buildCtx());
  assert.ok(issues.some(i => i.code === 'variant_import'));
});

test('missing variant tag is rejected', () => {
  // Rename only the element tags (`<group--variant>`); the import path
  // (`/group/variant'`) has no `--` so it is untouched — ONLY variant_tag trips.
  const bad = VALID_INDEX.split('grouptriggeraction--ml-split-button-brutal').join('grouptriggeraction--ml-other');
  const issues = runIndexGate(bad, buildCtx());
  assert.ok(issues.some(i => i.code === 'variant_tag'));
  assert.ok(!issues.some(i => i.code === 'variant_import'));
});
