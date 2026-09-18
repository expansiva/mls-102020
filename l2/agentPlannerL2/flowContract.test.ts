/// <mls fileReference="_102020_/l2/agentPlannerL2/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { P2_STEP_HOOKS } from '/_102020_/l2/agentPlannerL2/helpers/p2Dispatch.js';
import {
  P2_FLOW_ID,
  P2_FLOW_VERSION,
  P2_STEP_DEPENDS_ON,
  P2_STEP_IDS,
} from '/_102020_/l2/agentPlannerL2/helpers/p2Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLOW_PATH = path.join(HERE, 'docs/flow.json');
const STEPS_ROOT = path.join(HERE, 'steps');

interface FlowStep {
  id: string;
  kind: string;
  status?: string;
  dependsOn: string[];
  doneAnchor: string;
  modelAlias?: string;
  artifact: string;
}

interface FlowDoc {
  flowId: string;
  schemaVersion: string;
  artifacts: Record<string, string>;
  steps: FlowStep[];
}

const EXPECTED_ARTIFACTS: Record<string, string> = {
  pipeline: 'l2/{module}/pipeline/pipeline.json',
  contracts: 'l2/{module}/web/contracts/{workspace}.defs.ts',
  shared: 'l2/{module}/web/shared/{workspace}.defs.ts',
  poolL1: 'l4/{module}/pool/l1/{stamp}_{thread}_{round}.json',
};

const WAITING_STEPS: readonly string[] = [];

function loadFlow(): FlowDoc {
  return JSON.parse(readFileSync(FLOW_PATH, 'utf8')) as FlowDoc;
}

void test('flow has exactly five steps in declared order with declared dependencies', () => {
  const flow = loadFlow();
  assert.equal(flow.flowId, P2_FLOW_ID);
  assert.equal(flow.schemaVersion, P2_FLOW_VERSION);
  assert.equal(flow.steps.length, 5);
  assert.deepEqual(flow.steps.map(step => step.id), [...P2_STEP_IDS]);

  for (const step of flow.steps) {
    assert.deepEqual(step.dependsOn, [...P2_STEP_DEPENDS_ON[step.id as keyof typeof P2_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.ok(step.artifact, `${step.id} missing artifact`);
  }

  const entry = flow.steps.find(step => step.id === 'entry10');
  assert.equal(entry?.kind, 'deterministic');
  assert.equal(entry?.modelAlias, undefined);
  assert.equal(entry?.status, undefined);

  const workspaces = flow.steps.find(step => step.id === 'workspaces20');
  assert.equal(workspaces?.kind, 'agent-checkpoint');
  assert.equal(workspaces?.modelAlias, 'reasoning');
  assert.equal(workspaces?.status, undefined);
  assert.equal(workspaces?.artifact, 'l2/{module}/pipeline/workspaces20-draft.json');

  const contracts = flow.steps.find(step => step.id === 'contracts30');
  assert.equal(contracts?.kind, 'agent-checkpoint');
  assert.equal(contracts?.modelAlias, 'reasoning');
  assert.equal(contracts?.status, undefined);
  assert.equal(contracts?.artifact, 'l2/{module}/web/contracts/{workspace}.defs.ts');

  const shared = flow.steps.find(step => step.id === 'shared40');
  assert.equal(shared?.kind, 'agent-checkpoint');
  assert.equal(shared?.modelAlias, 'reasoning');
  assert.equal(shared?.status, undefined);
  assert.equal(shared?.artifact, 'l2/{module}/web/shared/{workspace}.defs.ts');

  const requests = flow.steps.find(step => step.id === 'requests50');
  assert.equal(requests?.kind, 'deterministic');
  assert.equal(requests?.modelAlias, undefined);
  assert.equal(requests?.status, undefined);
  assert.equal(requests?.artifact, 'l4/{module}/pool/l1/{stamp}_{thread}_{round}.json');

  for (const id of WAITING_STEPS) {
    const step = flow.steps.find(item => item.id === id);
    assert.equal(step?.status, 'waiting', `${id} must stay declared as waiting until its spec lands`);
  }
});

void test('flow artifacts match the l2 table', () => {
  const flow = loadFlow();
  assert.deepEqual(flow.artifacts, EXPECTED_ARTIFACTS);
});

void test('each step folder that exists implements beforePromptStep and is on the dispatch table', async () => {
  if (!existsSync(STEPS_ROOT)) return;
  for (const stepId of P2_STEP_IDS) {
    const folder = path.join(STEPS_ROOT, stepId);
    if (!existsSync(folder)) continue;
    const agentFiles = readdirSync(folder).filter(name => /^agentP2\w+\.ts$/.test(name) && !name.endsWith('.test.ts'));
    assert.ok(agentFiles.length > 0, `${stepId} has a folder but no agentP2*.ts`);
    const source = readFileSync(path.join(folder, agentFiles[0]), 'utf8');
    assert.match(source, /export async function beforeP2\w+PromptStep/, `${agentFiles[0]} must export beforePromptStep`);
    await import(`/_102020_/l2/agentPlannerL2/steps/${stepId}/${agentFiles[0].replace(/\.ts$/, '.js')}`);
    assert.equal(typeof P2_STEP_HOOKS[stepId]?.beforePromptStep, 'function', `${stepId} folder exists but is missing from P2_STEP_HOOKS`);
  }
});

void test('waiting steps have no folder yet', () => {
  for (const id of WAITING_STEPS) {
    assert.equal(existsSync(path.join(STEPS_ROOT, id)), false, `${id} folder must wait for its spec`);
  }
});
