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
  assert.equal(FLOW.steps[1].availability, 'available');
  assert.equal(FLOW.steps[2].availability, 'available');
  assert.equal(FLOW.steps[3].availability, 'available');
  assert.equal(FLOW.steps[4].availability, 'available');
  assert.equal(FLOW.steps[5].availability, 'unavailable');
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
    { name: 'agentD2Contracts', visibility: 'private', role: 'contracts30 deterministic per-page derivation, gate, persistence and hash barrier' },
    { name: 'agentD2Entry', visibility: 'private', role: 'entry10 deterministic worker' },
    { name: 'agentD2Input', visibility: 'private', role: 'input20 deterministic validation and snapshot worker' },
    { name: 'agentD2Shared', visibility: 'private', role: 'shared40 deterministic coordinator and page fan-out' },
    { name: 'agentD2SharedPage', visibility: 'private', role: 'isolated shared40 LLM page worker with one repair' },
    { name: 'agentD2Pages', visibility: 'private', role: 'pages50 deterministic coordinator and page fan-out' },
    { name: 'agentD2PagesPage', visibility: 'private', role: 'isolated pages50 LLM page worker producing both devices with one repair' },
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

void test('completed coordinator reuse re-emits the anchor that releases the next phase', () => {
  for (const expected of [
    { step: 'shared40', next: 'pages50', coordinator: 'shared40/agentD2Shared.ts', closer: 'shared-page/agentD2SharedPage.ts' },
    { step: 'pages50', next: 'finalize60', coordinator: 'pages50/agentD2Pages.ts', closer: 'pages-page/agentD2PagesPage.ts' },
  ]) {
    const anchor = `${expected.step}-done`;
    assert.deepEqual(D2_STEP_DEPENDS_ON[expected.next as keyof typeof D2_STEP_DEPENDS_ON], [anchor]);
    const coordinator = readFileSync(path.join(HERE, 'steps', expected.coordinator), 'utf8');
    const reuse = coordinator.match(/if \(complete\) return \[([\s\S]*?)\n    \];/)?.[1] || '';
    assert.match(reuse, new RegExp(`d2Result\\([\\s\\S]*?'${anchor}'\\)`), `${expected.step} reuse must emit ${anchor}`);
    const closer = readFileSync(path.join(HERE, 'steps', expected.closer), 'utf8');
    assert.match(closer, new RegExp(`d2Result\\([\\s\\S]*?'${anchor}'\\)`), `${expected.step} normal close must emit ${anchor}`);
  }
});

void test('all referenced JSON schemas are versioned and strict', () => {
  for (const name of ['invocationV1.json', 'pipelineV1.json', 'inputV1.json', 'inputReportV1.json', 'sharedJudgmentV1.json', 'pagesJudgmentV1.json', 'pagesJudgmentV2.json', 'pagesJudgmentV3.json']) {
    const schema = JSON.parse(readFileSync(path.join(HERE, 'schemas', name), 'utf8')) as Record<string, unknown>;
    assert.match(String(schema.$id), /^https:\/\//);
    assert.equal(schema.additionalProperties, false);
  }
});
