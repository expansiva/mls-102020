/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { extractSkillLiteral, runNm2DefsGate } from '/_102020_/l2/aura/molecules/agentNewMolecule2/steps/n3-defs/gate.js';
import { nmDefsHeader, nmIdentityFromPlan, renderDefsTs } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTemplates.js';
import { MoleculePlan } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmTypes.js';

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

const ID = nmIdentityFromPlan(PLAN);
const HEADER = nmDefsHeader(ID);

const GOOD_SKILL = `# Metadata
- TagName: ${PLAN.tag}

# Objective
Present a metric card with a label, a primary value and a trend indicator.

# Responsibilities
- Display a label as the metric title.
- Display a primary value with the highest visual prominence.

# Constraints
- Must not emit events.

# Notes
- Purely presentational.`;

function render(skill: string): string {
  return renderDefsTs(ID, skill, PLAN.layoutConfig);
}

test('a well-formed contract passes', () => {
  assert.deepEqual(runNm2DefsGate(render(GOOD_SKILL), PLAN, HEADER), []);
});

test('an empty file fails fast', () => {
  assert.deepEqual(runNm2DefsGate('   ', PLAN, HEADER).map(issue => issue.code), ['empty']);
});

test('a wrong header fails — the file identity is the orchestrator\'s', () => {
  const tampered = render(GOOD_SKILL).replace(HEADER, '/// <mls fileReference="_999_/l2/x.defs.ts" enhancement="_blank" />');
  assert.ok(runNm2DefsGate(tampered, PLAN, HEADER).some(issue => issue.code === 'header'));
});

test('the canonical group must be exported exactly', () => {
  const tampered = render(GOOD_SKILL).replace("export const group = 'groupViewMetric';", "export const group = 'groupviewmetric';");
  assert.ok(runNm2DefsGate(tampered, PLAN, HEADER).some(issue => issue.code === 'group'));
});

// D7 (replaces Q7b): the file must carry exactly the axes confirmed at the checkpoint.
test('layoutConfig must be present and match the confirmed plan', () => {
  const missing = render(GOOD_SKILL).replace(/export const layoutConfig = \{[\s\S]*?\};\n/, '');
  assert.ok(runNm2DefsGate(missing, PLAN, HEADER).some(issue => issue.code === 'layout_config'));

  const other = render(GOOD_SKILL).replace('metric: "big-number"', 'metric: "gauge"');
  const issues = runNm2DefsGate(other, PLAN, HEADER);
  assert.ok(issues.some(issue => issue.code === 'layout_config'));
  assert.ok(issues.find(issue => issue.code === 'layout_config')?.message.includes('big-number'));
});

test('the vocabulary is re-checked on the emitted file, not just on the plan', () => {
  // A hand-edited plan.json could carry an axis the DS catalog would silently drop.
  const tamperedPlan: MoleculePlan = { ...PLAN, layoutConfig: { metricc: 'gauge' } };
  const source = renderDefsTs(ID, GOOD_SKILL, tamperedPlan.layoutConfig);
  assert.ok(runNm2DefsGate(source, tamperedPlan, HEADER).some(issue => issue.code === 'axis_unknown'));
});

test('an axis-less group legitimately emits an empty layoutConfig', () => {
  const chartPlan: MoleculePlan = { ...PLAN, groupCanonical: 'groupViewChart', group: 'groupviewchart', layoutConfig: {} };
  const chartId = nmIdentityFromPlan(chartPlan);
  const source = renderDefsTs(chartId, GOOD_SKILL.replace(PLAN.tag, chartPlan.tag), {});
  const issues = runNm2DefsGate(source, chartPlan, nmDefsHeader(chartId));
  assert.ok(!issues.some(issue => issue.code === 'layout_config'));
  assert.ok(!issues.some(issue => issue.code.startsWith('axis_')));
});

test('a missing section is reported by name', () => {
  const withoutNotes = GOOD_SKILL.replace(/# Notes[\s\S]*$/, '');
  const issues = runNm2DefsGate(render(withoutNotes), PLAN, HEADER);
  assert.ok(issues.some(issue => issue.code === 'section_missing' && issue.message.includes('# Notes')));
});

test('sections out of order are rejected', () => {
  const swapped = `# Metadata
- TagName: ${PLAN.tag}

# Responsibilities
- Display a label.

# Objective
Present a metric card.

# Constraints
- Must not emit events.

# Notes
- Presentational.`;
  assert.ok(runNm2DefsGate(render(swapped), PLAN, HEADER).some(issue => issue.code === 'section_order'));
});

test('an empty section is rejected', () => {
  const emptyConstraints = GOOD_SKILL.replace('- Must not emit events.', '');
  assert.ok(runNm2DefsGate(render(emptyConstraints), PLAN, HEADER).some(issue => issue.code === 'section_empty'));
});

test('the TagName must be the derived tag', () => {
  // renderDefsTs swaps the line, so the tampering has to happen after rendering.
  const tampered = render(GOOD_SKILL).replace(`- TagName: ${PLAN.tag}`, '- TagName: groupviewmetric--ml-other');
  const issues = runNm2DefsGate(tampered, PLAN, HEADER);
  assert.ok(issues.some(issue => issue.code === 'tagname'));
});

test('the template swaps a wrong TagName before the gate ever sees it', () => {
  const wrong = GOOD_SKILL.replace(`- TagName: ${PLAN.tag}`, '- TagName: whatever--ml-x');
  assert.deepEqual(runNm2DefsGate(render(wrong), PLAN, HEADER), []);
});

test('implementation detail in the body is rejected', () => {
  for (const leak of [
    '```typescript\nconst x = 1;\n```',
    'import { html } from \'lit\';',
    'Uses @customElement to register.',
    'The class extends MoleculeAuraElement.',
    'Reads var(--ml-surface) for the background.',
    'Renders with class="ml-surface-bg".',
  ]) {
    const skill = GOOD_SKILL.replace('- Purely presentational.', `- ${leak}`);
    const issues = runNm2DefsGate(render(skill), PLAN, HEADER);
    assert.ok(issues.some(issue => issue.code === 'implementation_detail'), `should reject: ${leak}`);
  }
});

// The detector matches statement SHAPES, not the bare words: these are legitimate contract prose
// and a word-level check would reject them.
test('prose that merely contains code-ish words is accepted', () => {
  for (const legit of [
    'Must not export events to the parent.',
    'Content is imported from the slot tags.',
    'The value class is the primary information.',
  ]) {
    const skill = GOOD_SKILL.replace('- Must not emit events.', `- ${legit}`);
    assert.deepEqual(runNm2DefsGate(render(skill), PLAN, HEADER), [], `should accept: ${legit}`);
  }
});

test('the TagName line itself does not trip the code detector', () => {
  // The tag contains '--ml-', which a naive CSS-token check would flag.
  assert.deepEqual(runNm2DefsGate(render(GOOD_SKILL), PLAN, HEADER), []);
});

test('a contract phrased as a question is rejected', () => {
  const skill = GOOD_SKILL.replace('- Must not emit events.', '- Should it emit events?');
  assert.ok(runNm2DefsGate(render(skill), PLAN, HEADER).some(issue => issue.code === 'requirement_question'));
});

test('unescaped template characters are caught — the file would not compile', () => {
  // Simulates a template that forgot to escape (renderDefsTs escapes, so build the file by hand).
  const broken = `${HEADER}

// Do not change – automatically generated code.

export const group = 'groupViewMetric';
// Design-system axes this molecule candidates for (matched by the DS agent).
export const layoutConfig = {
  metric: "big-number"
};

export const skill = \`${GOOD_SKILL}
- uses \`cn()\` helper\`;
`;
  assert.ok(runNm2DefsGate(broken, PLAN, HEADER).some(issue => issue.code === 'skill_escaping'));
});

test('a file with no skill literal fails on skill_literal', () => {
  const noSkill = `${HEADER}\n\nexport const group = 'groupViewMetric';\nexport const layoutConfig = {\n  metric: "big-number"\n};\n`;
  assert.ok(runNm2DefsGate(noSkill, PLAN, HEADER).some(issue => issue.code === 'skill_literal'));
});

test('extractSkillLiteral returns the markdown between the backticks', () => {
  const literal = extractSkillLiteral(render(GOOD_SKILL));
  assert.ok(literal && literal.startsWith('# Metadata'));
  assert.ok(literal && literal.includes('# Notes'));
  assert.equal(extractSkillLiteral('export const group = \'x\';'), null);
});
