/// <mls fileReference="_102020_/l2/agentDefsL2/flowContract.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  D2_FLOW_ID,
  D2_FLOW_STEP_IDS,
  D2_FLOW_VERSION,
  D2_STEP_DEPENDS_ON,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FLOW = JSON.parse(readFileSync(path.join(HERE, 'docs/flow.json'), 'utf8')) as {
  flowId: string;
  schemaVersion: string;
  limits: Record<string, unknown>;
  dynamicPlanIds: Record<string, string>;
  progressTitles: Record<string, string>;
  agents: Array<{ name: string; visibility: string }>;
  hookImports: string[];
  steps: Array<{
    id: string; agent: string; availability: string; dependsOn: string[]; doneAnchor: string;
    inputs: string[]; outputs: string[];
  }>;
};

void test('flow declares the six acyclic phases with inputs, outputs and honest availability', () => {
  assert.equal(FLOW.flowId, D2_FLOW_ID);
  assert.equal(FLOW.schemaVersion, D2_FLOW_VERSION);
  assert.deepEqual(FLOW.steps.map(step => step.id), [...D2_FLOW_STEP_IDS]);
  const seen = new Set<string>();
  for (const step of FLOW.steps) {
    assert.deepEqual(step.dependsOn, [...D2_STEP_DEPENDS_ON[step.id as keyof typeof D2_STEP_DEPENDS_ON]]);
    assert.equal(step.doneAnchor, `${step.id}-done`);
    assert.ok(step.inputs.length > 0, `${step.id} inputs missing`);
    assert.ok(step.outputs.length > 0, `${step.id} outputs missing`);
    for (const dependency of step.dependsOn) assert.ok(seen.has(dependency.replace(/-done$/, '')));
    seen.add(step.id);
  }
  assert.equal(FLOW.steps[0].availability, 'available');
  for (const step of FLOW.steps.slice(1)) assert.equal(step.availability, 'unavailable');
});

void test('flow references only existing agents and each step has its own maintenance folder', () => {
  const knownAgents = new Set(FLOW.agents.map(agent => agent.name));
  for (const step of FLOW.steps) {
    assert.ok(knownAgents.has(step.agent), `unknown agent ${step.agent}`);
    assert.equal(existsSync(path.join(HERE, 'steps', step.id, 'readme.md')), true, `${step.id} readme missing`);
    assert.equal(existsSync(path.join(HERE, 'steps', step.id, 'CHANGELOG.md')), true, `${step.id} changelog missing`);
  }
  assert.deepEqual(FLOW.agents, [
    { name: 'agentDefsL2', visibility: 'public', role: 'message entry, task-step entry and unavailable-step diagnostics' },
    { name: 'agentD2Entry', visibility: 'private', role: 'entry10 deterministic worker' },
  ]);
  for (const imported of FLOW.hookImports) {
    assert.equal(existsSync(path.resolve(HERE, '..', imported.replace(/^l2\//, ''))), true, `missing hook import ${imported}`);
  }
});

void test('flow declares bounded workers, repairs, limits and progress counters', () => {
  assert.equal(FLOW.limits.defaultMaxParallel, 5);
  assert.equal(FLOW.limits.llmAttemptsPerItemPerPhase, 2);
  assert.equal(FLOW.limits.repairRoundsPerFailedItem, 1);
  assert.match(String(FLOW.limits.liveFinancialLimit), /supervisor/);
  assert.deepEqual(Object.keys(FLOW.dynamicPlanIds).sort(), [
    'contractsRepair', 'contractsWorker', 'pagesRepair', 'pagesWorker', 'sharedRepair', 'sharedWorker',
  ]);
  for (const title of Object.values(FLOW.progressTitles)) {
    assert.match(title, /\{\{completed\}\}/);
    assert.match(title, /\{\{total\}\}/);
    assert.match(title, /\{\{failed\}\}/);
  }
});

void test('all referenced JSON schemas are versioned and strict', () => {
  for (const name of ['invocationV1.json', 'pipelineV1.json']) {
    const schema = JSON.parse(readFileSync(path.join(HERE, 'schemas', name), 'utf8')) as Record<string, unknown>;
    assert.match(String(schema.$id), /^https:\/\//);
    assert.equal(schema.additionalProperties, false);
  }
});
