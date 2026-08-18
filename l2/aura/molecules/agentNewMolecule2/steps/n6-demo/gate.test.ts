/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { findAttributeSlots, runNm2DemoGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n6-demo/gate.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { type MoleculeDemoExample } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';

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

const KEYS = ['basic', 'churn', 'active', 'noIcon', 'minimal', 'loading'];

const EXAMPLES: MoleculeDemoExample[] = KEYS.map(key => ({
  name: key,
  state: [{ stateName: `playground.${key}.loading`, value: key === 'loading' ? 'true' : 'false' }],
}));

// Shaped after a real page (groupviewmetric/ml-metric-card.html).
function page(options: { keys?: string[]; background?: string } = {}): string {
  const keys = options.keys || KEYS;
  const cards = keys.map(key => `      <div class="p-4">
        <${PLAN.tag} loading="{{playground.${key}.loading}}">
          <Label>Revenue</Label>
        </${PLAN.tag}>
      </div>`).join('\n');
  const container = options.background ? `<div style="${options.background}" class="min-h-screen">` : '<div class="bg-white dark:bg-slate-900 min-h-screen">';
  return `${container}
  <div class="mx-auto p-8 font-sans">
    <header class="text-center mb-12">
      <h1 class="text-3xl font-semibold text-slate-800 mb-2">KPI Card</h1>
    </header>
    <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'>
    </aura--molecules--playground--widget-playground-state-102020>
    <div class="grid grid-cols-2 gap-6">
${cards}
    </div>
  </div>
</div>
`;
}

function gate(html: string, examples = EXAMPLES, themed = false) {
  return runNm2DemoGate(html, examples, PLAN, ctx(themed));
}

test('a page shaped like the real ones passes', () => {
  assert.deepEqual(gate(page()), []);
});

test('a themed page passes when the container carries the theme background', () => {
  assert.deepEqual(gate(page({ background: `${GLASS_BG};` }), EXAMPLES, true), []);
});

test('a themed page WITHOUT the theme background is rejected — glass is invisible on white', () => {
  const issues = gate(page(), EXAMPLES, true);
  assert.deepEqual(issues.map(issue => issue.code), ['background']);
});

test('with no theme there is no background requirement (the library uses a neutral Tailwind one)', () => {
  assert.deepEqual(gate(page()), []);
});

test('empty and fenced output fail', () => {
  assert.deepEqual(gate('  ').map(issue => issue.code), ['empty']);
  assert.ok(gate('```html\n' + page() + '\n```').some(issue => issue.code === 'fence'));
});

test('a full document is rejected — the demo is a FRAGMENT (0 of 146 real pages have one)', () => {
  for (const wrapper of ['<!DOCTYPE html>', '<html>', '<head>', '<body>', '<style>', '<link rel="x">']) {
    assert.ok(gate(`${wrapper}\n${page()}`).some(issue => issue.code === 'document'), `should reject ${wrapper}`);
  }
});

test('<header> does NOT trip the document check', () => {
  // The real pages all open with a <header>; a naive /<head/ regex would reject every one of them.
  assert.ok(page().includes('<header'));
  assert.deepEqual(gate(page()), []);
});

test('script and footer are rejected', () => {
  assert.ok(gate(page().replace('</div>\n', '<script>alert(1)</script></div>\n')).some(issue => issue.code === 'script'));
  assert.ok(gate(page() + '<footer>made by AI</footer>').some(issue => issue.code === 'footer'));
});

test('the state widget and the substitution placeholder are both required', () => {
  const noWidget = page().replace(/<aura--molecules--playground--widget-playground-state-102020[\s\S]*?<\/aura--molecules--playground--widget-playground-state-102020>/, '');
  assert.ok(gate(noWidget).some(issue => issue.code === 'state_widget'));

  const noPlaceholder = page().replace("state='playgroundDinamicState'", `state='{"playground":{}}'`);
  assert.ok(gate(noPlaceholder).some(issue => issue.code === 'state_placeholder'));
});

test('fewer than 6 examples is rejected', () => {
  const four = EXAMPLES.slice(0, 4);
  const issues = gate(page({ keys: KEYS.slice(0, 4) }), four);
  assert.ok(issues.some(issue => issue.code === 'examples_count'));
});

test('every declared example must actually appear on the page', () => {
  // 6 examples declared, only 4 cards rendered.
  const issues = gate(page({ keys: KEYS.slice(0, 4) }), EXAMPLES);
  const tagIssue = issues.find(issue => issue.code === 'tag_uses');
  assert.ok(tagIssue);
  assert.ok(tagIssue.message.includes('6 expected'));
});

test('more examples than 6 raises the bar accordingly', () => {
  const eightKeys = [...KEYS, 'extraA', 'extraB'];
  const eight = eightKeys.map(key => ({ name: key, state: [{ stateName: `playground.${key}.loading`, value: 'false' }] }));
  assert.deepEqual(gate(page({ keys: eightKeys }), eight), []);
  assert.ok(gate(page(), eight).some(issue => issue.code === 'tag_uses'));
});

test('a malformed state name is rejected — the substitution would drop it silently', () => {
  const broken: MoleculeDemoExample[] = [
    ...EXAMPLES.slice(1),
    { name: 'basic', state: [{ stateName: 'basic.loading', value: 'false' }] },
  ];
  const issues = gate(page(), broken);
  assert.ok(issues.some(issue => issue.code === 'state_shape'));
  assert.ok(issues.find(issue => issue.code === 'state_shape')?.message.includes('basic.loading'));
});

test('a binding with no matching example state is rejected — it would render empty', () => {
  const withOrphan = page().replace('{{playground.basic.loading}}', '{{playground.ghost.loading}}');
  const issues = gate(withOrphan, EXAMPLES);
  assert.ok(issues.some(issue => issue.code === 'state_binding'));
  assert.ok(issues.find(issue => issue.code === 'state_binding')?.message.includes('playground.ghost'));
});

// ---- slot como atributo é inerte nesta biblioteca (2026-08-18) ----

test('SLOT COMO ATRIBUTO é recusado — sem Shadow DOM, `<div slot="Label">` renderiza vazio', () => {
  // Medido: este prompt DAVA `<div slot="Label">Revenue</div>` como exemplo, e duas moléculas geradas em
  // dias e grupos diferentes saíram com 68 ocorrências dele e zero tags nomeadas. A classe base lê por
  // tag: getSlotContent(tag) é querySelector(tag).
  assert.deepEqual(findAttributeSlots('<x><div slot="Label">a</div><div slot="Icon">b</div></x>'), ['Label', 'Icon']);
  assert.deepEqual(findAttributeSlots('<x><Label>a</Label></x>'), []);
});

test('a tag TRUNCADA do widget de estado é recusada — não é elemento registrado', () => {
  // ⚠️ 2026-08-18: a constante era o sufixo e a checagem era `includes`, então esta forma passava — e 5
  // páginas do NM2 foram publicadas com ela, estruturalmente perfeitas no resto (12 instâncias, 6
  // chaves, estado real) e com todos os bindings mortos, porque o widget nunca renderiza.
  const truncado = page().replace(
    /aura--molecules--playground--widget-playground-state-102020/g,
    'widget-playground-state-102020',
  );
  const issues = gate(truncado);
  assert.ok(issues.some(i => i.code === 'state_widget'), issues.map(i => i.code).join(','));
});
