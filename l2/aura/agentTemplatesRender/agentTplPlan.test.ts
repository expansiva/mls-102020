/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/agentTplPlan.test.ts" enhancement="_blank" />

// Tests for the planner fan-out: the tree the plan step creates with and without useMolecules.
// The molecule cascade must be strictly additive — without the flag the tree is exactly the v1 one.

import test from 'node:test';
import assert from 'node:assert/strict';
import { createAgent } from '/_102020_/l2/aura/agentTemplatesRender/agentTplPlan.js';

interface PlannedStep { planId: string; agentName: string; dependsOn: string[]; status: string; args: any }

const templates = {
  oneNew: [{ templateId: 'recordCatalog', status: 'new', layout: 'listViewWithRecordPanel', pages: ['stockManagement', 'orders'] }],
  oneExisting: [{ templateId: 'recordCatalog', status: 'existing', layout: 'listViewWithRecordPanel', pages: ['stockManagement'] }],
};

async function planTree(useMolecules: boolean, plan: unknown, pages: string[]): Promise<PlannedStep[]> {
  const agent = createAgent();
  const args = {
    module: 'cafeFlow', styleModel: 'oracleStyle', layout: 4, ds: 1, device: 'desktop', genome: 'page41',
    pages, useMolecules,
  };
  const step: any = {
    stepId: 7,
    prompt: JSON.stringify(args),
    interaction: { payload: [{ type: 'flexible', result: { templates: plan } }] },
  };
  const parentStep: any = { stepId: 1 };
  const context: any = { isTest: true, message: { orderAt: 1, threadId: 't' }, task: { PK: 'task#1' } };

  const intents = await agent.afterPromptStep!(
    { agentName: 'agentTplPlan' } as any, context, parentStep, step, 0,
  );
  return intents.map((i: any) => ({
    planId: i.step?.planning?.planId,
    agentName: i.step?.agentName,
    dependsOn: i.step?.planning?.dependsOn ?? [],
    status: i.step?.status,
    args: JSON.parse(i.step?.prompt || '{}'),
  }));
}

test('planner: without useMolecules the tree is the v1 one (no molecule steps)', async () => {
  const steps = await planTree(false, templates.oneNew, ['stockManagement', 'orders']);

  assert.deepEqual(steps.map(s => s.planId), [
    'tpl:recordCatalog',
    'defs:stockManagement', 'critique:stockManagement', 'fix:stockManagement', 'render:stockManagement',
    'defs:orders', 'critique:orders', 'fix:orders', 'render:orders',
    'register',
  ]);
  assert.equal(steps.some(s => s.agentName === 'agentTplGroups' || s.agentName === 'agentTplSelectMolecules'), false);

  const tpl = steps.find(s => s.planId === 'tpl:recordCatalog')!;
  assert.deepEqual(tpl.dependsOn, []);
  assert.equal(tpl.status, 'waiting_human_input');
  assert.equal(steps.every(s => s.args.useMolecules === false), true);
});

test('planner: useMolecules inserts groups → mols before each NEW template', async () => {
  const steps = await planTree(true, templates.oneNew, ['stockManagement', 'orders']);

  assert.deepEqual(steps.map(s => s.planId), [
    'groups:recordCatalog', 'mols:recordCatalog', 'tpl:recordCatalog',
    'defs:stockManagement', 'critique:stockManagement', 'fix:stockManagement', 'render:stockManagement',
    'defs:orders', 'critique:orders', 'fix:orders', 'render:orders',
    'register',
  ]);

  const by = (id: string) => steps.find(s => s.planId === id)!;
  assert.equal(by('groups:recordCatalog').agentName, 'agentTplGroups');
  assert.deepEqual(by('groups:recordCatalog').dependsOn, []);
  assert.equal(by('groups:recordCatalog').status, 'waiting_human_input');

  assert.equal(by('mols:recordCatalog').agentName, 'agentTplSelectMolecules');
  assert.deepEqual(by('mols:recordCatalog').dependsOn, ['groups:recordCatalog']);

  // The guide is written only after the cascade, so it can embed the chosen molecules.
  assert.deepEqual(by('tpl:recordCatalog').dependsOn, ['mols:recordCatalog']);
  assert.equal(by('tpl:recordCatalog').status, 'waiting_dependency');

  // The per-page chain is untouched and still gated on the template.
  assert.deepEqual(by('defs:stockManagement').dependsOn, ['tpl:recordCatalog']);
  assert.deepEqual(by('render:orders').dependsOn, ['fix:orders']);
  assert.deepEqual(by('register').dependsOn, ['render:stockManagement', 'render:orders']);
  assert.equal(steps.every(s => s.args.useMolecules === true), true);
  // Both cascade steps carry the template's pages (their workspace evidence).
  assert.deepEqual(by('groups:recordCatalog').args.pages, ['stockManagement', 'orders']);
  assert.equal(by('mols:recordCatalog').args.templateId, 'recordCatalog');
});

test('planner: an EXISTING template never gains molecules retroactively', async () => {
  const steps = await planTree(true, templates.oneExisting, ['stockManagement']);

  assert.deepEqual(steps.map(s => s.planId), [
    'defs:stockManagement', 'critique:stockManagement', 'fix:stockManagement', 'render:stockManagement',
    'register',
  ]);
  assert.deepEqual(steps.find(s => s.planId === 'defs:stockManagement')!.dependsOn, []);
});

test('planner: mixed new + existing templates only cascade the new one', async () => {
  const steps = await planTree(true, [
    { templateId: 'recordCatalog', status: 'existing', layout: 'listViewWithRecordPanel', pages: ['orders'] },
    { templateId: 'insightBoard', status: 'new', layout: 'dashboard', pages: ['salesSummary'] },
  ], ['orders', 'salesSummary']);

  const cascade = steps.filter(s => s.planId.startsWith('groups:') || s.planId.startsWith('mols:'));
  assert.deepEqual(cascade.map(s => s.planId), ['groups:insightBoard', 'mols:insightBoard']);
  assert.deepEqual(steps.find(s => s.planId === 'defs:orders')!.dependsOn, []);
  assert.deepEqual(steps.find(s => s.planId === 'defs:salesSummary')!.dependsOn, ['tpl:insightBoard']);
});
