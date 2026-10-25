/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/steps.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CLOSE_PLAN,
  NR_HELP,
  NR_MATERIALIZE_AGENT,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  currentProjectNumber,
  materializerOutcome,
  parseNrInvocation,
} from '/_102020_/l2/agentNewReleaseL2/helpers/steps.js';

function fixture(name: string): { masters: Array<{ project: string }> } {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

test('invocation accepts one module and refuses a missing or extra argument', () => {
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2 alpha'), { ok: true, module: 'alpha' });
  assert.deepEqual(parseNrInvocation('alpha'), { ok: true, module: 'alpha' });
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2'), { ok: false, help: NR_HELP });
  assert.deepEqual(parseNrInvocation(''), { ok: false, help: NR_HELP });
  assert.deepEqual(parseNrInvocation('@@agentNewReleaseL2 alpha extra'), { ok: false, help: NR_HELP });
});

test('the materializer step carries the R1 pages and the current project, and close depends on it', () => {
  const effort = fixture('r1');
  const plan = planNewReleaseL2(effort, effort.masters[0].project);
  assert.equal(plan.ok, true);
  if (!plan.ok) return;
  const project = currentProjectNumber();
  const [materialize, close] = buildApplySteps(project, 'alpha', plan.pages);
  assert.equal(materialize.agentName, NR_MATERIALIZE_AGENT);
  assert.equal(materialize.planning?.planId, NR_MATERIALIZE_PLAN);
  assert.deepEqual(JSON.parse(materialize.prompt || ''), {
    project,
    module: 'alpha',
    scope: { pages: plan.pages },
  });
  assert.equal(close.agentName, NR_AGENT_NAME);
  assert.equal(close.planning?.planId, NR_CLOSE_PLAN);
  assert.deepEqual(close.planning?.dependsOn, [NR_MATERIALIZE_PLAN]);
});

test('close copies the materializer status and its message', () => {
  const completed = {
    type: 'agent',
    status: 'completed',
    interaction: { input: [], cost: 0, trace: ['pages written'], payload: null },
    nextSteps: [],
  } as mls.msg.AIAgentStep;
  assert.deepEqual(materializerOutcome(completed), { status: 'completed', message: 'pages written' });
  const failed = {
    type: 'result',
    status: 'failed',
    interaction: null,
    nextSteps: [],
    result: 'page id missing',
  } as mls.msg.AIResultStep;
  assert.deepEqual(materializerOutcome(failed), { status: 'failed', message: 'agentMaterializeL2 failed' });
  const nested = {
    ...completed,
    status: 'failed' as const,
    interaction: null,
    nextSteps: [{ type: 'result', status: 'failed', interaction: null, nextSteps: [], stepId: 0, stepTitle: 'Done', result: 'page id missing' } as mls.msg.AIResultStep],
  };
  assert.deepEqual(materializerOutcome(nested), { status: 'failed', message: 'page id missing' });
});
