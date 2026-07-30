/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n5-less/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { runNm2LessGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n5-less/gate.js';
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
        info: { name: 'glass', suffix: '-glass', displayName: 'Glass', description: '', background: { kind: 'dark', css: '', note: '' } },
      }
      : { present: false, reference: null, info: null },
  };
}

const RENDER = `/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts" enhancement="_102020_/l2/enhancementAura"/>
@customElement('groupviewmetric--ml-kpi-card')
export class KpiCardMolecule extends MoleculeAuraElement {
  private baseClasses(): string {
    return ['w-full rounded-xl border p-4', 'ml-surface-bg', 'ml-border', 'ml-text'].join(' ');
  }
  private badgeClasses(): string {
    return ['absolute right-2 top-2', 'ml-kpi-badge'].join(' ');
  }
  render() { return html\`<div class="\${this.baseClasses()}"><span class="ml-label">L</span></div>\`; }
}
`;

const HEADER = '/// <mls fileReference="_102053_/l2/molecules/groupviewmetric/ml-kpi-card.less" enhancement="_102020_/l2/enhancementStyleAura"/>';

// Shaped after a real base sheet (groupviewmetric/ml-metric-card.less): consumes tokens with a
// literal FALLBACK, defines none.
const NEUTRAL = `${HEADER}

groupviewmetric--ml-kpi-card {

  .ml-surface-bg {
    background: var(--ml-surface, #ffffff);
  }

  .ml-border {
    border-color: var(--ml-outline, #e2e8f0);
  }

  .ml-text {
    color: var(--ml-on-surface, #1c1b1f);
  }

  .ml-label {
    color: var(--ml-on-surface-muted, #49454f);
  }
}
`;

const THEMED = `${HEADER}

groupviewmetric--ml-kpi-card {
  --ml-surface: rgba(255, 255, 255, 0.08);
  --ml-on-surface: #f8fafc;

  transition: none;

  .ml-surface-bg {
    background: var(--ml-surface, rgba(255, 255, 255, 0.08));
  }

  .ml-text {
    color: var(--ml-on-surface, #f8fafc);
  }
}
`;

function gate(less: string, themed = false, renderTs = RENDER) {
  return runNm2LessGate(less, PLAN, ctx(themed), { renderTs });
}

test('a neutral sheet shaped like the real base sheets passes', () => {
  assert.deepEqual(gate(NEUTRAL), []);
});

test('a themed sheet defining tokens and a motion stance passes', () => {
  assert.deepEqual(gate(THEMED, true), []);
});

// ---- what the measurement over the 147 base sheets changed ----

test('a NEUTRAL sheet is NOT required to define tokens (0 of 147 base sheets do)', () => {
  assert.ok(!gate(NEUTRAL).some(issue => issue.code === 'tokens'));
});

test('a NEUTRAL sheet is NOT required to declare a transition (only 51 of 147 do)', () => {
  assert.ok(!gate(NEUTRAL).some(issue => issue.code === 'motion'));
});

test('a THEMED sheet IS required to define tokens and a motion stance', () => {
  const codes = gate(NEUTRAL, true).map(issue => issue.code);
  assert.ok(codes.includes('tokens'));
  assert.ok(codes.includes('motion'));
});

test('`transition: none` is a valid motion stance', () => {
  assert.ok(!gate(THEMED, true).some(issue => issue.code === 'motion'));
});

test('!important is NOT a gate code — 41 of 147 base sheets use it to beat a global utility', () => {
  const withImportant = NEUTRAL.replace('background: var(--ml-surface, #ffffff);', 'background: var(--ml-surface, #ffffff) !important;');
  assert.deepEqual(gate(withImportant), []);
});

test('in a NEUTRAL sheet a colour literal outside a token is rejected — it could never be themed', () => {
  const bare = NEUTRAL.replace('border-color: var(--ml-outline, #e2e8f0);', 'box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.4);');
  const issues = gate(bare);
  assert.ok(issues.some(issue => issue.code === 'color_literal'));
  assert.ok(issues.find(issue => issue.code === 'color_literal')?.message.includes('rgba(239, 68, 68, 0.4)'));
});

// Measured: ALL 84 validated themed sheets of mls-102054/102055 write literals like this. Applying
// the neutral rule to a themed sheet would reject 84 out of 84.
test('in a THEMED sheet a colour literal is the theme\'s VALUE, not a defect', () => {
  const brutalist = `${HEADER}

groupviewmetric--ml-kpi-card {
  --ml-border-width: 3px;
  --ml-surface: #ffffff;

  .ml-surface-bg {
    background: var(--ml-surface, #ffffff);
    box-shadow: 4px 4px 0 #000000;
    transition: none;
  }

  .ml-border {
    border: 3px solid #000000;
  }
}
`;
  assert.deepEqual(gate(brutalist, true), []);
});

test('a literal used as a token FALLBACK is legitimate — it is the library pattern', () => {
  assert.deepEqual(gate(NEUTRAL), []);
});

// Caught by a test: without excluding token DEFINITIONS, every themed sheet failed on its own tokens.
test('a literal as the VALUE of a token definition is legitimate — that is what a themed sheet is for', () => {
  assert.ok(!gate(THEMED, true).some(issue => issue.code === 'color_literal'));
  const onlyDefinition = `${HEADER}\n\ngroupviewmetric--ml-kpi-card {\n  --ml-surface: #0f172a;\n  transition: none;\n  .ml-text { color: var(--ml-on-surface, #f8fafc); }\n}\n`;
  assert.ok(!gate(onlyDefinition, true).some(issue => issue.code === 'color_literal'));
});

test('a sheet consuming no token at all is rejected', () => {
  const noTokens = `${HEADER}\n\ngroupviewmetric--ml-kpi-card {\n  .ml-text { font-weight: 600; }\n}\n`;
  assert.ok(gate(noTokens).some(issue => issue.code === 'token_consumption'));
});

// ---- structure ----

test('empty and fenced output fail', () => {
  assert.deepEqual(gate('  ').map(issue => issue.code), ['empty']);
  assert.ok(gate('```less\n' + NEUTRAL + '\n```').some(issue => issue.code === 'fence'));
});

test('exactly one header, referencing this .less', () => {
  assert.ok(gate(NEUTRAL.replace(HEADER, '')).some(issue => issue.code === 'header'));
  assert.ok(gate(`${NEUTRAL}\n${HEADER}`).some(issue => issue.code === 'header'));
  assert.ok(gate(NEUTRAL.replace('_102053_', '_102040_')).some(issue => issue.code === 'header'));
});

test('unbalanced braces and a missing scope root fail', () => {
  assert.ok(gate(NEUTRAL.replace(/\}\s*$/, '')).some(issue => issue.code === 'braces'));
  const wrongScope = NEUTRAL.replace('groupviewmetric--ml-kpi-card {', 'ml-kpi-card {');
  assert.ok(gate(wrongScope).some(issue => issue.code === 'scope'));
});

test('a class the render does not emit is rejected', () => {
  const invented = NEUTRAL.replace('.ml-label', '.ml-kpi-footer');
  const issues = gate(invented);
  assert.ok(issues.some(issue => issue.code === 'unknown_classes'));
  assert.ok(issues.find(issue => issue.code === 'unknown_classes')?.message.includes('ml-kpi-footer'));
});

test('a class the render DOES emit is accepted, including a per-molecule one', () => {
  const withBadge = NEUTRAL.replace('.ml-label', '.ml-kpi-badge');
  assert.deepEqual(gate(withBadge), []);
});

test('redefining a Tailwind layout utility is rejected', () => {
  const redefined = NEUTRAL.replace('.ml-text {', '.gap-2 { display: flex; }\n  .ml-text {');
  assert.ok(gate(redefined).some(issue => issue.code === 'tailwind_layout'));
});

test('setting position on a render-positioned element is rejected', () => {
  // ml-kpi-badge sits in a class list containing `absolute`.
  const override = NEUTRAL.replace('.ml-label {', '.ml-kpi-badge { position: relative; }\n  .ml-label {');
  const issues = gate(override);
  assert.ok(issues.some(issue => issue.code === 'position_override'));
  assert.ok(issues.find(issue => issue.code === 'position_override')?.message.includes('ml-kpi-badge'));
});

test('styling a render-positioned element WITHOUT touching position is fine', () => {
  const ok = NEUTRAL.replace('.ml-label {', '.ml-kpi-badge { color: var(--ml-primary, #2563eb); }\n  .ml-label {');
  assert.deepEqual(gate(ok), []);
});

test('Shadow DOM selectors and a universal selector are rejected', () => {
  assert.ok(gate(NEUTRAL.replace('groupviewmetric--ml-kpi-card {', ':host {')).some(issue => issue.code === 'shadow_dom_selector'));
  const universal = NEUTRAL.replace('.ml-text {', '* { transition: none; }\n  .ml-text {');
  assert.ok(gate(universal).some(issue => issue.code === 'universal_selector'));
});

test('portal rules are required when the render declares a portal, and banned otherwise', () => {
  const portalRender = RENDER.replace('render()', "protected portalWidgetName = 'groupviewmetric--ml-kpi-card';\n  render()");
  assert.ok(runNm2LessGate(NEUTRAL, PLAN, ctx(), { renderTs: portalRender }).some(issue => issue.code === 'portal_scope'));

  const withPortal = NEUTRAL.replace(
    'groupviewmetric--ml-kpi-card {',
    'groupviewmetric--ml-kpi-card,\ndiv[data-widget="groupviewmetric--ml-kpi-card"] {',
  );
  assert.deepEqual(runNm2LessGate(withPortal, PLAN, ctx(), { renderTs: portalRender }), []);
  assert.ok(gate(withPortal).some(issue => issue.code === 'portal_extra'));
});
