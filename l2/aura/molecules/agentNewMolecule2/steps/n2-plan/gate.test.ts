/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n2-plan/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeMoleculeName,
  normalizeNm2Plan,
  runNm2PlanGate,
  type NmPlanCandidate,
} from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n2-plan/gate.js';
import { MoleculeContext } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmContext.js';
import { type NmKnownGroup } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n1-bootstrap/gate.js';

const KNOWN: NmKnownGroup[] = [
  { name: 'groupViewMetric', skillReference: '/skill/creation' },
  { name: 'groupViewCard', skillReference: '/skill/creation' },
];

function ctx(themed = false): MoleculeContext {
  return {
    schemaVersion: 1,
    createdAt: '2026-07-29T00:00:00.000Z',
    runKey: 'kpi-card',
    userPrompt: 'a KPI card with a label and a big value',
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

const CANDIDATE: NmPlanCandidate = {
  shortName: 'ml-kpi-card',
  description: 'A KPI card with a label, a big value and a variation badge.',
  prompt: 'Create a KPI card molecule.',
  functionalRequirements: ['Show a label', 'Show a value'],
  visualRequirements: ['The value dominates the label'],
  layoutConfig: { metric: 'big-number' },
};

test('normalizeMoleculeName kebabs and enforces a single ml- prefix', () => {
  assert.equal(normalizeMoleculeName('ml-kpi-card'), 'ml-kpi-card');
  assert.equal(normalizeMoleculeName('kpiCard'), 'ml-kpi-card');
  assert.equal(normalizeMoleculeName('ml-ml-KPI Card'), 'ml-kpi-card');
  assert.equal(normalizeMoleculeName('ml-kpi-card.ts'), 'ml-kpi-card');
  assert.equal(normalizeMoleculeName('  '), '');
});

test('code assembles the path — the model only proposes a base name', () => {
  const { plan } = normalizeNm2Plan(CANDIDATE, ctx());
  assert.equal(plan.fileReference, '_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts');
  assert.equal(plan.tag, 'groupviewmetric--ml-kpi-card');
  assert.equal(plan.group, 'groupviewmetric');
  assert.equal(plan.groupCanonical, 'groupViewMetric');
  assert.deepEqual(runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }), []);
});

test('the theme suffix is APPENDED by code, not asked of the model (Q2)', () => {
  const { plan, coercions } = normalizeNm2Plan(CANDIDATE, ctx(true));
  assert.equal(plan.shortName, 'ml-kpi-card-glass');
  assert.equal(plan.tag, 'groupviewmetric--ml-kpi-card-glass');
  assert.ok(coercions.some(item => item.includes('suffix')));
  assert.deepEqual(runNm2PlanGate(plan, ctx(true), { known: KNOWN, collisions: [] }), []);
});

test('an already-suffixed name is not double-suffixed', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, shortName: 'ml-kpi-card-glass' }, ctx(true));
  assert.equal(plan.shortName, 'ml-kpi-card-glass');
});

test('a model-written fileReference in the wrong project is coerced to the destination', () => {
  const { plan, coercions } = normalizeNm2Plan(
    { ...CANDIDATE, fileReference: '_102040_/l2/molecules/groupviewmetric/ml-kpi-card.ts' },
    ctx(),
  );
  assert.equal(plan.fileReference, '_102053_/l2/molecules/groupviewmetric/ml-kpi-card.ts');
  assert.ok(coercions.some(item => item.includes('destination')));
});

test('a human edit that moves the molecule to another KNOWN group is accepted', () => {
  const { plan } = normalizeNm2Plan(
    // Moving groups also moves the axes: groupViewCard is governed by cardLayout, not metric.
    { ...CANDIDATE, fileReference: '_102053_/l2/molecules/groupviewcard/ml-kpi-card.ts', layoutConfig: { cardLayout: 'vertical' } },
    ctx(),
  );
  assert.equal(plan.group, 'groupviewcard');
  assert.equal(plan.tag, 'groupviewcard--ml-kpi-card');
  assert.deepEqual(runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }), []);
});

test('moving groups re-validates the axes against the NEW group', () => {
  const { plan } = normalizeNm2Plan(
    { ...CANDIDATE, fileReference: '_102053_/l2/molecules/groupviewcard/ml-kpi-card.ts' },
    ctx(),
  );
  // `metric` came from the original group and does not govern groupViewCard.
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.ok(codes.includes('axis_not_governing'));
});

test('the confirmed layout axes are validated against the vocabulary (D7)', () => {
  const bad = normalizeNm2Plan({ ...CANDIDATE, layoutConfig: { metric: 'huge-number' } }, ctx()).plan;
  assert.ok(runNm2PlanGate(bad, ctx(), { known: KNOWN, collisions: [] }).some(issue => issue.code === 'axis_value'));

  const none = normalizeNm2Plan({ ...CANDIDATE, layoutConfig: {} }, ctx()).plan;
  assert.ok(runNm2PlanGate(none, ctx(), { known: KNOWN, collisions: [] }).some(issue => issue.code === 'axis_required'));
});

test('an axis set to the wildcard marker is simply omitted', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, layoutConfig: { metric: 'gauge', density: '' } }, ctx());
  assert.deepEqual(plan.layoutConfig, { metric: 'gauge' });
  assert.deepEqual(runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }), []);
});

test('an edit into an unknown group is rejected — no group means no contract', () => {
  const { plan } = normalizeNm2Plan(
    { ...CANDIDATE, fileReference: '_102053_/l2/molecules/groupnope/ml-kpi-card.ts' },
    ctx(),
  );
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.ok(codes.includes('group_unknown'));
});

test('a camelCase folder is rejected by reference_shape', () => {
  const { plan } = normalizeNm2Plan(
    { ...CANDIDATE, fileReference: '_102053_/l2/molecules/groupViewMetric/ml-kpi-card.ts' },
    ctx(),
  );
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.ok(codes.includes('reference_shape'));
});

// Regression, first Studio run 2026-07-30: 'ml-data-grid-33' produced a tag the platform reads as
// project 33, so the custom element was never registered and the page showed raw text.
test("a name ending in '-<number>' is rejected — the platform reads it as the project id", () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, shortName: 'ml-data-grid-33' }, ctx());
  assert.equal(plan.shortName, 'ml-data-grid-33');
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.ok(codes.includes('name_project_suffix'));
});

test('a digit INSIDE the name is fine — only a trailing -<number> collides', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, shortName: 'ml-grid-2fa' }, ctx());
  assert.deepEqual(runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }), []);
});

test('a hand-edited tag that stops matching the path is rejected', () => {
  const { plan } = normalizeNm2Plan(CANDIDATE, ctx());
  const tampered = { ...plan, tag: 'whatever--ml-kpi-card' };
  assert.ok(runNm2PlanGate(tampered, ctx(), { known: KNOWN, collisions: [] }).some(issue => issue.code === 'tag_mismatch'));
});

test('a missing description or requirement blocks the plan', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, description: '', functionalRequirements: [] }, ctx());
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.deepEqual(codes.filter(c => c.startsWith('desc') || c.startsWith('require')).sort(), ['description', 'requirements']);
});

test('requirements phrased as questions are rejected — the .defs.ts would carry the question', () => {
  const { plan } = normalizeNm2Plan(
    { ...CANDIDATE, functionalRequirements: ['Show a label', 'Should it support a loading state?'] },
    ctx(),
  );
  assert.ok(runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).some(issue => issue.code === 'requirement_question'));
});

test('blank requirement entries are dropped, not carried as empty bullets', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, functionalRequirements: ['Show a label', '  ', ''] }, ctx());
  assert.deepEqual(plan.functionalRequirements, ['Show a label']);
});

test('an existing artifact blocks creation — New Molecule never overwrites', () => {
  const { plan } = normalizeNm2Plan(CANDIDATE, ctx());
  const issues = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: ['l2/molecules/groupviewmetric/ml-kpi-card.ts'] });
  assert.ok(issues.some(issue => issue.code === 'collision'));
  assert.ok(issues[0].message.includes('Improve Molecule'));
});

test('an empty proposal fails on the name instead of writing to a broken path', () => {
  const { plan } = normalizeNm2Plan({}, ctx());
  const codes = runNm2PlanGate(plan, ctx(), { known: KNOWN, collisions: [] }).map(issue => issue.code);
  assert.ok(codes.includes('name_missing'));
  assert.ok(codes.includes('reference_shape') || codes.includes('tag_missing'));
});

test('the final prompt falls back to the user prose when the model omits it', () => {
  const { plan } = normalizeNm2Plan({ ...CANDIDATE, prompt: '' }, ctx());
  assert.equal(plan.prompt, 'a KPI card with a label and a big value');
});
