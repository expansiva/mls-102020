/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared40/agentD2SharedPage.test.ts" enhancement="_blank"/>
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { afterPromptStep } from '/_102020_/l2/agentDefsL2/steps/shared40/agentD2SharedPage.js';

void test('deterministic host schedules the sole repair for a truncated payload', async () => {
  (globalThis as unknown as { mls: unknown }).mls = { actualProject: 102047 };
  const context = { message: { orderAt: 'm1', threadId: 't1' }, task: { PK: 'task' } } as unknown as mls.msg.ExecutionContext;
  const parent = { stepId: 10 } as mls.msg.AIAgentStep;
  const first = step(11, 1);
  const repair = await afterPromptStep({} as never, context, parent, first, 1);
  assert.equal(repair.filter(intent => intent.type === 'add-step').length, 1);
  const added = repair.find(intent => intent.type === 'add-step') as mls.msg.AgentIntentAddStep;
  assert.equal((added.step as mls.msg.AIAgentStep).planning?.planId, 'shared40-repair-page-a2');
  const source = readFileSync(fileURLToPath(new URL('./agentD2SharedPage.ts', import.meta.url)), 'utf8');
  assert.match(source, /parsed\.attempt < 2/);
  assert.doesNotMatch(source, /parsed\.attempt < 3/);
});
function step(stepId: number, attempt: number): mls.msg.AIAgentStep { return { type: 'agent', stepId, status: 'waiting_human_input', interaction: { payload: ['{"schemaVersion":'] } as never, nextSteps: [], stepTitle: 'shared', agentName: 'agentD2SharedPage', prompt: JSON.stringify({ project: 102047, module: 'fixture', pageId: 'page', attempt }), rags: [], planning: { planId: 'x', dependsOn: [], executionMode: 'sequential', executionHost: 'client' } }; }
