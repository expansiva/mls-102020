/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  collectMlClasses,
  findBaseInternals,
  findLiteralStyleAppearance,
  findRedundantCaseSelectors,
  findTailwindColorUtilities,
  runNm2RenderGate,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n4-render/gate.js';
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

const CTX: MoleculeContext = {
  schemaVersion: 1,
  createdAt: '2026-07-29T00:00:00.000Z',
  runKey: 'kpi-card',
  userPrompt: 'a KPI card',
  userLanguage: 'pt',
  destination: { project: 102053, groupFolder: 'groupviewmetric', groupCanonical: 'groupViewMetric' },
  groupSkill: { description: '', reference: '/skill/creation', usageReference: '/skill/usage' },
  base: { reference: '_102033_/l2/moleculeBase.ts', className: 'MoleculeAuraElement', importPath: '/_102033_/l2/moleculeBase.js' },
  theme: { present: false, reference: null, info: null },
};

// Shaped after a real molecule of mls-102040 (groupviewmetric/ml-metric-card.ts).
const GOOD = `/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts" enhancement="_102020_/l2/enhancementAura"/>
import { html, TemplateResult } from 'lit';
import { customElement } from 'lit/decorators.js';
import { MoleculeAuraElement } from '/_102033_/l2/moleculeBase.js';

@customElement('groupviewmetric--ml-kpi-card')
export class KpiCardMolecule extends MoleculeAuraElement {
  private baseClasses(): string {
    return ['w-full rounded-xl border p-4 transition', 'ml-surface-bg', 'ml-border', 'ml-text'].join(' ');
  }

  render(): TemplateResult {
    return html\`<div class="\${this.baseClasses()}"><span class="ml-label">Label</span></div>\`;
  }
}
`;

function gate(source: string, compileErrors: string[] = []) {
  return runNm2RenderGate(source, PLAN, CTX, { compileErrors });
}

test('a molecule shaped like the real ones passes', () => {
  assert.deepEqual(gate(GOOD), []);
});

test('an empty render fails fast', () => {
  assert.deepEqual(gate('  ').map(issue => issue.code), ['empty']);
});

test('the header must be exactly one, referencing THIS destination', () => {
  assert.ok(gate(GOOD.replace(/^\/\/\/.*\n/, '')).some(issue => issue.code === 'header'));
  assert.ok(gate(`${GOOD}\n/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts" enhancement="x"/>`).some(issue => issue.code === 'header'));
  const wrongProject = GOOD.replace('_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts', '_102040_/l2/molecules/groupviewmetric/ml-kpi-card.ts');
  assert.ok(gate(wrongProject).some(issue => issue.code === 'header'));
});

test('the tag must be the derived one', () => {
  assert.ok(gate(GOOD.replace("@customElement('groupviewmetric--ml-kpi-card')", "@customElement('ml-kpi-card')")).some(issue => issue.code === 'tag_mismatch'));
  assert.ok(gate(GOOD.replace(/@customElement\([^)]*\)\n/, '')).some(issue => issue.code === 'tag_missing'));
});

test('the molecule must extend and import the base class from mls-102033', () => {
  assert.ok(gate(GOOD.replace('extends MoleculeAuraElement', 'extends LitElement')).some(issue => issue.code === 'base_extends'));
  assert.ok(gate(GOOD.replace("'/_102033_/l2/moleculeBase.js'", "'lit'")).some(issue => issue.code === 'base_import'));
});

test('THE discipline check: no ml-* class means the molecule could never be themed', () => {
  const noMl = GOOD.replace(/, 'ml-surface-bg', 'ml-border', 'ml-text'/, '').replace('class="ml-label"', 'class="label"');
  const issues = gate(noMl);
  assert.ok(issues.some(issue => issue.code === 'discipline'));
  assert.ok(issues.find(issue => issue.code === 'discipline')?.message.includes('Variant'));
});

test('a markdown fence is rejected', () => {
  assert.ok(gate('```typescript\n' + GOOD + '\n```').some(issue => issue.code === 'fence'));
});

test('compile errors arrive as an input and become gate issues', () => {
  const issues = gate(GOOD, ["Property 'x' does not exist on type 'KpiCardMolecule'."]);
  assert.deepEqual(issues.map(issue => issue.code), ['compile']);
  assert.ok(issues[0].message.includes("Property 'x'"));
});

// ---- appearance rules, calibrated over the 147 real ml-*.ts of mls-102040 (2026-07-29) ----

test('a hardcoded Tailwind colour is rejected — it is what makes a molecule unthemeable', () => {
  for (const utility of ['bg-black', 'bg-black/70', 'text-white', 'border-white', 'text-slate-500', 'dark:bg-slate-900', 'hover:bg-blue-600']) {
    const source = GOOD.replace("'ml-surface-bg'", `'ml-surface-bg ${utility}'`);
    assert.ok(gate(source).some(issue => issue.code === 'appearance_class'), `should reject ${utility}`);
  }
});

test('Tailwind LAYOUT utilities are untouched — the library styles appearance only through ml-* classes', () => {
  for (const utility of ['w-full', 'rounded-xl', 'border', 'p-4', 'transition', 'inline-flex', 'gap-2', 'text-sm', 'font-semibold', 'border-2', 'text-center']) {
    const source = GOOD.replace("'w-full rounded-xl border p-4 transition'", `'${utility}'`);
    assert.deepEqual(gate(source), [], `should accept ${utility}`);
  }
});

test('inline style with GEOMETRY is legitimate — 28 of 147 molecules do it', () => {
  for (const declaration of ['width: 84px;height:84px', 'left:50%; top:50%; transform:translate(-50%,-50%)', 'padding-left: 12px', 'flex: 1;']) {
    const source = GOOD.replace('<div class=', `<div style="${declaration}" class=`);
    assert.deepEqual(gate(source), [], `should accept style="${declaration}"`);
  }
});

test('inline style with a LITERAL appearance value is rejected', () => {
  for (const declaration of ['background:#fff', 'color: #111827', 'border-color:#e2e8f0', 'box-shadow: 4px 4px 0 #000']) {
    const source = GOOD.replace('<div class=', `<div style="${declaration}" class=`);
    assert.ok(gate(source).some(issue => issue.code === 'appearance_style'), `should reject style="${declaration}"`);
  }
});

test('a DATA-DRIVEN colour in inline style stays legal (the one real case in the library)', () => {
  const source = GOOD.replace('<div class=', '<div style="background-color:${item.color}" class=');
  assert.deepEqual(gate(source), []);
});

test('geometry next to an interpolated colour does not hide the colour check', () => {
  const source = GOOD.replace('<div class=', '<div style="width:10px;background:#fff" class=');
  assert.ok(gate(source).some(issue => issue.code === 'appearance_style'));
});

test('a hex in a DATA default is legal — all 5 chart molecules keep a palette array', () => {
  const source = GOOD.replace('  private baseClasses', "  private palette = ['#0ea5e9', '#22c55e'];\n  private baseClasses");
  assert.deepEqual(gate(source), []);
});

test('collectMlClasses returns the deduped inventory the .less may style', () => {
  assert.deepEqual(collectMlClasses(GOOD), ['ml-border', 'ml-label', 'ml-surface-bg', 'ml-text']);
});

test('the detectors are individually inspectable', () => {
  assert.deepEqual(findTailwindColorUtilities("class='bg-black/70 w-full'"), ['bg-black/70']);
  assert.deepEqual(findTailwindColorUtilities("class='w-full p-4 rounded-xl'"), []);
  assert.deepEqual(findLiteralStyleAppearance('style="background:#fff"'), ['background:#fff']);
  assert.deepEqual(findLiteralStyleAppearance('style="width:10px"'), []);
});

// ---- first-run review, 2026-07-30. Each rule fires 0 times over the 231 real molecules. ----

const RENDER_HEAD = '    return html`<div';

test('a timer scheduled inside render() is rejected — render runs on every update', () => {
  const source = GOOD.replace(RENDER_HEAD, `    requestAnimationFrame(() => this.propagate());\n${RENDER_HEAD}`);
  assert.notEqual(source, GOOD);
  assert.ok(gate(source).some(issue => issue.code === 'render_side_effect'));
});

test('DOM access inside render() is rejected', () => {
  const source = GOOD.replace(RENDER_HEAD, `    this.querySelectorAll(".ml-cell");\n${RENDER_HEAD}`);
  assert.ok(gate(source).some(issue => issue.code === 'render_side_effect'));
});

test('the same call OUTSIDE render() is fine — updated() is where propagation belongs', () => {
  const source = GOOD.replace(
    '  render(): TemplateResult {',
    '  updated() {\n    requestAnimationFrame(() => this.querySelectorAll(".ml-cell"));\n  }\n\n  render(): TemplateResult {',
  );
  assert.deepEqual(gate(source), []);
});

test('a selector spelling the same tag in two cases is rejected', () => {
  assert.deepEqual(findRedundantCaseSelectors("querySelectorAll('tablecell, TableCell')"), ['tablecell, TableCell']);
  assert.deepEqual(findRedundantCaseSelectors("this.querySelector('tablebody') || this.querySelector('TableBody')"), ['tablebody || TableBody']);
  const source = GOOD.replace(
    '  private baseClasses(): string {',
    "  private rows() { return this.getSlots('tablerow, TableRow'); }\n\n  private baseClasses(): string {",
  );
  assert.ok(gate(source).some(issue => issue.code === 'selector_duplicate'));
});

test('a genuine two-tag selector list is NOT flagged', () => {
  assert.deepEqual(findRedundantCaseSelectors("querySelectorAll('input, button')"), []);
  assert.deepEqual(findRedundantCaseSelectors("querySelectorAll('TableRow, TableCell')"), []);
});

test('driving the base plumbing is rejected — sorting must not mutate the light DOM', () => {
  assert.deepEqual(findBaseInternals('this._mutationLock = true; this._onSlotTagsChanged();').sort(), ['_mutationLock', '_onSlotTagsChanged']);
  assert.deepEqual(findBaseInternals(GOOD), []);
  const source = GOOD.replace('  render(): TemplateResult {', '  private sort() {\n    this._mutationLock = true;\n  }\n\n  render(): TemplateResult {');
  assert.ok(gate(source).some(issue => issue.code === 'base_internals'));
});
