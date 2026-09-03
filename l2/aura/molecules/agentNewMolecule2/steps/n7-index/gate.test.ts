/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n7-index/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runNm2IndexGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n7-index/gate.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';

const PLAN: MoleculePlan = {
  schemaVersion: 1,
  confirmedAt: '2026-07-29T00:00:00.000Z',
  fileReference: '_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts',
  shortName: 'ml-kpi-card',
  tag: 'groupviewmetric--ml-kpi-card',
  group: 'groupviewmetric',
  groupCanonical: 'groupViewMetric',
  description: 'A KPI card.',
  prompt: 'Create a KPI card.',
  functionalRequirements: ['Show a label'],
  visualRequirements: [],
  layoutConfig: { metric: 'big-number' },
};

const GLASS_BG = 'background: linear-gradient(135deg, #0f172a, #1e293b)';
const INDEX_TAG = 'molecules--groupviewmetric--index-102053';
const GROUP = ['ml-kpi-card', 'ml-metric-card'];

function ctx(themed = false): MoleculeContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-29T00:00:00.000Z',
    runKey: 'kpi-card',
    userPrompt: 'a KPI card',
    userLanguage: 'pt',
    destination: { project: 102053, groupFolder: 'groupviewmetric', groupCanonical: 'groupViewMetric' },
    groupSkill: { description: '', reference: '/skill/creation', usageReference: '/skill/usage' },
    base: { reference: '_102033_/l2/moleculeBase.ts', className: 'MoleculeAuraElement', importPath: '/_102033_/l2/moleculeBase.js' },
    theme: themed
      ? {
        present: true,
        reference: '_102053_/l2/skills/theme.ts',
        info: { name: 'glass', suffix: '-glass', displayName: 'Glass', description: '', background: { kind: 'dark', css: `${GLASS_BG};`, note: '' } },
      }
      : { present: false, reference: null, info: null },
  };
}

function indexTs(options: { background?: string; molecules?: string[] } = {}): string {
  const molecules = options.molecules || GROUP;
  const imports = molecules.map(name => `import '/_102053_/l2/molecules/groupviewmetric/${name}.js';`).join('\n');
  const cards = molecules.map(name => `        <groupviewmetric--${name}></groupviewmetric--${name}>`).join('\n');
  const container = options.background ? `<div style="${options.background}">` : '<div class="bg-white dark:bg-slate-900">';
  return `/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/index.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
${imports}

@customElement('${INDEX_TAG}')
export class GroupViewMetricIndex extends StateLitElement {
  render(): TemplateResult {
    return html\`${container}
      <div class="grid">
${cards}
      </div>
    </div>\`;
  }
}
`;
}

function gate(source: string, themed = false, groupMolecules = GROUP) {
  return runNm2IndexGate(source, PLAN, ctx(themed), { indexTag: INDEX_TAG, groupMolecules });
}

test('a showcase listing every molecule of the group passes', () => {
  assert.deepEqual(gate(indexTs()), []);
});

test('a themed showcase passes when the container carries the theme background', () => {
  assert.deepEqual(gate(indexTs({ background: `${GLASS_BG};` }), true), []);
});

test('a themed showcase without the theme background is rejected', () => {
  assert.deepEqual(gate(indexTs(), true).map(issue => issue.code), ['background']);
});

test('empty and fenced output fail', () => {
  assert.deepEqual(gate('   ').map(issue => issue.code), ['empty']);
  assert.ok(gate('```typescript\n' + indexTs() + '\n```').some(issue => issue.code === 'fence'));
});

test('the header and the index custom element are required', () => {
  assert.ok(gate(indexTs().replace(/^\/\/\/.*\n/, '')).some(issue => issue.code === 'header'));
  assert.ok(gate(indexTs().replace(`@customElement('${INDEX_TAG}')`, "@customElement('whatever')")).some(issue => issue.code === 'custom_element'));
});

test('the molecule created in this run must be imported AND shown', () => {
  const withoutImport = indexTs().replace("import '/_102053_/l2/molecules/groupviewmetric/ml-kpi-card.js';\n", '');
  assert.ok(gate(withoutImport).some(issue => issue.code === 'molecule_import'));

  const withoutAnything = indexTs({ molecules: ['ml-metric-card'] });
  const codes = gate(withoutAnything).map(issue => issue.code);
  assert.ok(codes.includes('molecule_import'));
  assert.ok(codes.includes('molecule_tag'));
});

test('a molecule of the group missing from the showcase is reported by name', () => {
  const partial = indexTs({ molecules: ['ml-kpi-card'] });
  const issues = gate(partial, false, ['ml-kpi-card', 'ml-metric-card', 'ml-metric-gauge']);
  const missing = issues.find(issue => issue.code === 'molecule_missing');
  assert.ok(missing);
  assert.ok(missing.message.includes('ml-metric-card'));
  assert.ok(missing.message.includes('ml-metric-gauge'));
});

test('a group whose only molecule is the new one passes', () => {
  assert.deepEqual(gate(indexTs({ molecules: ['ml-kpi-card'] }), false, ['ml-kpi-card']), []);
});
