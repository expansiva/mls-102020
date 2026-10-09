/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { chainPageIntents, chainPageStep, parseChainPageArgs } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4ChainPage.js';
import { sharedWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/shared40/agentM4Shared.js';
import { pageWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/pages50/agentM4Pages.js';
import { reviewWorkerStep } from '/_102020_/l2/agentMaterializeL2/steps/review55/agentM4Review.js';

const identity = { project: 102047, module: 'agendaClinica' };
const context = { message: { orderAt: 'm1', threadId: 't1' }, task: { PK: 'task1' } } as unknown as mls.msg.ExecutionContext;
const root = { stepId: 1 } as mls.msg.AIAgentStep;

// Guilherme, 09/10/2026: the run was one flat list of the shareds, pages, repairs and reviews of every page.
test('the group of a page is titled by the page and carries its first units', () => {
  const units = [sharedWorkerStep({ ...identity, pageId: 'consultas', attempt: 1 })];
  const step = chainPageStep({ ...identity, pageId: 'consultas', units });
  assert.equal(step.stepTitle, 'consultas');
  assert.equal(step.planning?.planId, 'chain40-consultas');
  assert.deepEqual(parseChainPageArgs(step.prompt ?? '').units.map(unit => unit.stepTitle), ['Shared']);
  assert.throws(() => parseChainPageArgs('{"project":1,"module":"x","pageId":"Bad"}'), /M4_CHAIN_ARGS_INVALID/u);
});

test('the group adds its units under itself, then stays in_progress: the engine completes it after the last child', () => {
  const units = [pageWorkerStep({ ...identity, pageId: 'consultas', device: 'desktop', attempt: 1, chain: true }), pageWorkerStep({ ...identity, pageId: 'consultas', device: 'mobile', attempt: 1, chain: true })];
  const group = { ...chainPageStep({ ...identity, pageId: 'consultas', units }), stepId: 7 } as mls.msg.AIAgentStep;
  const intents = chainPageIntents(context, root, group, 3, parseChainPageArgs(group.prompt ?? '')) as Array<Record<string, unknown>>;
  assert.deepEqual(intents.map(intent => intent.type), ['add-step', 'add-step', 'update-status'], 'children first, so the group never has zero open children');
  assert.deepEqual(intents.slice(0, 2).map(intent => intent.parentStepId), [7, 7], 'the units are children of the group, not of the root');
  assert.deepEqual(intents.slice(0, 2).map(intent => (intent.step as mls.msg.AIAgentStep).stepTitle), ['Page desktop', 'Page mobile']);
  assert.equal(intents[2].status, 'in_progress');
  assert.equal(intents[2].stepId, 7);
});

test('a group with nothing pending completes at once', () => {
  const group = { ...chainPageStep({ ...identity, pageId: 'consultas', units: [] }), stepId: 7 } as mls.msg.AIAgentStep;
  const intents = chainPageIntents(context, root, group, 3, parseChainPageArgs(group.prompt ?? '')) as Array<Record<string, unknown>>;
  assert.deepEqual(intents.map(intent => [intent.type, intent.status]), [['update-status', 'completed']]);
});

test('inside a group a unit names only what it is; the sweepers outside the groups keep the page in the title', () => {
  assert.equal(sharedWorkerStep({ ...identity, pageId: 'consultas', attempt: 2 }).stepTitle, 'Shared (repair 1)');
  assert.equal(pageWorkerStep({ ...identity, pageId: 'consultas', device: 'mobile', attempt: 3, chain: true }).stepTitle, 'Page mobile (repair 2)');
  assert.equal(reviewWorkerStep({ ...identity, pageId: 'consultas', device: 'desktop', chain: true }).stepTitle, 'Review desktop');
  assert.equal(pageWorkerStep({ ...identity, pageId: 'consultas', device: 'mobile', attempt: 1 }).stepTitle, 'Page consultas mobile');
  assert.equal(reviewWorkerStep({ ...identity, pageId: 'consultas', device: 'desktop' }).stepTitle, 'Review consultas desktop');
});
