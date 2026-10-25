/// <mls fileReference="_102020_/l2/agentNewReleaseL2/helpers/steps.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { planNewReleaseL2 } from '/_102020_/l2/agentNewReleaseL2/helpers/plan.js';
import {
  NR_AGENT_NAME,
  NR_CHECK_PLAN,
  NR_CLOSE_PLAN,
  NR_DEFS_AGENT,
  NR_DEFS_PLAN,
  NR_DEFS_SCOPE,
  NR_HELP,
  NR_MARKS_DIFFER,
  NR_MATERIALIZE_AGENT,
  NR_MATERIALIZE_PLAN,
  buildApplySteps,
  buildRegenerateSteps,
  currentProjectNumber,
  markedPageIds,
  marksDifferMessage,
  materializerOutcome,
  NR_NOTHING_TO_APPLY,
  parseNrInvocation,
  reviewDefsRun,
  statusIntents,
} from '/_102020_/l2/agentNewReleaseL2/helpers/steps.js';

function fixture(name: string): { masters: Array<{ project: string }> } {
  return JSON.parse(readFileSync(new URL(`./fixtures/${name}.json`, import.meta.url), 'utf8'));
}

test('each status exit returns the message and a terminal result step with the motive', () => {
  const cases: Array<{ message: string; status: 'completed' | 'failed' }> = [
    { message: NR_HELP, status: 'completed' },
    { message: 'The current project is unavailable.', status: 'failed' },
    { message: 'changeEffort.json is missing at l2/alpha/pool/l4/changeEffort.json', status: 'failed' },
    { message: 'changeEffort.json at l2/alpha/pool/l4/changeEffort.json is not valid JSON', status: 'failed' },
    { message: 'changeEffort rejected by gate: schema:perItem', status: 'failed' },
    { message: 'not in this release step: item remove', status: 'failed' },
    { message: NR_NOTHING_TO_APPLY, status: 'completed' },
    { message: `${NR_MARKS_DIFFER}: marked [beta]; planned [beta, delta]`, status: 'failed' },
  ];
  for (const item of cases) {
    const intents = statusIntents(NR_AGENT_NAME, 'thread-1', '@@agentNewReleaseL2 alpha', item.message);
    const message = intents.find(intent => intent.type === 'add-message-ai');
    const step = intents.find(intent => intent.type === 'add-step');
    assert.equal(intents.length, 2);
    assert.equal(message?.type, 'add-message-ai');
    if (message?.type !== 'add-message-ai' || step?.type !== 'add-step' || step.step.type !== 'result') {
      assert.fail('status exit is missing the message or the result step');
    }
    assert.equal(message.request.inputAI[0]?.content, item.message);
    assert.equal(message.request.taskTitle, NR_AGENT_NAME);
    assert.equal(step.step.status, item.status);
    assert.equal(step.step.result, item.message);
    assert.ok(step.step.stepTitle.length <= 72);
    assert.ok(item.message.startsWith(step.step.stepTitle.replace(/\.\.\.$/u, '')));
  }
});

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

test('regenerate adds the defs generator with scope all, and the check waits on it', () => {
  const project = currentProjectNumber();
  const [defs, check] = buildRegenerateSteps(project, 'alpha');
  assert.equal(defs.agentName, NR_DEFS_AGENT);
  assert.equal(defs.planning?.planId, NR_DEFS_PLAN);
  assert.deepEqual(JSON.parse(defs.prompt || ''), { project, module: 'alpha', scope: NR_DEFS_SCOPE });
  assert.equal(check.agentName, NR_AGENT_NAME);
  assert.equal(check.planning?.planId, NR_CHECK_PLAN);
  assert.deepEqual(check.planning?.dependsOn, [NR_DEFS_PLAN]);
});

test('a clean regenerate materializes the rebuilt pages and the materialize-only pages', () => {
  const project = currentProjectNumber();
  const [materialize] = buildApplySteps(project, 'alpha', ['beta'], ['gamma']);
  assert.deepEqual(JSON.parse(materialize.prompt || ''), {
    project,
    module: 'alpha',
    scope: { pages: ['beta', 'gamma'] },
  });
});

test('pool marks must be the same set as the planned pages', () => {
  const effort = { screens: [
    { pageId: 'beta', status: 'toUpdate' },
    { pageId: 'gamma', status: 'done' },
    { pageId: 'delta', status: 'toCreate' },
  ] };
  assert.deepEqual(markedPageIds(effort), ['beta', 'delta']);
  assert.equal(marksDifferMessage(['delta', 'beta'], ['beta', 'delta']), null);
  const message = marksDifferMessage(['beta'], ['beta', 'delta']);
  assert.equal(message, `${NR_MARKS_DIFFER}: marked [beta]; planned [beta, delta]`);
});

test('an outside path fails the check and does not add the materializer', () => {
  const outside = reviewDefsRun(
    { status: 'completed', message: 'defs written' },
    { created: [], changed: ['l2/alpha/web/shared/other.defs.ts'], deleted: [], outside: ['l2/alpha/web/shared/other.defs.ts'] },
  );
  assert.equal(outside.addMaterialize, false);
  assert.equal(outside.status, 'failed');
  assert.match(outside.message, /outside: l2\/alpha\/web\/shared\/other\.defs\.ts/u);
  const failedDefs = reviewDefsRun({ status: 'failed', message: 'generator stopped' }, {
    created: [], changed: [], deleted: [], outside: [],
  });
  assert.deepEqual(failedDefs, { status: 'failed', message: 'generator stopped', addMaterialize: false });
  const clean = reviewDefsRun({ status: 'completed', message: 'defs written' }, {
    created: [], changed: [], deleted: [], outside: [],
  });
  assert.equal(clean.addMaterialize, true);
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
