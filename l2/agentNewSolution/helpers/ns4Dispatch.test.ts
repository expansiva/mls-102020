/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Dispatch.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  NS4_FLOW_VERSION,
  createNs4E10Step, createNs4E1Step, createNs4E2CoverageJudgeStep, createNs4E2CoverageRepairStep,
  createNs4E2GateRepairStep, createNs4E2Step, createNs4E3Step, createNs4E4FinalizeStep,
  createNs4E4RelationshipBindingStep, createNs4E4RepairStep, createNs4E4Step, createNs4E5Step,
  createNs4E6Step, createNs4E7Step, createNs4E8HubCompositionRepairStep, createNs4E8Step,
  createNs4E9Step, resolveNs4StepOwner, type Ns4StepOwner,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

/**
 * The class of defect this file exists for: a factory and the router drifting apart. Every unit test
 * called an agent directly, so a step whose plan id no router branch matched died before reaching
 * any agent — no interaction, no trace, no test red. This walks every real factory through the real
 * dispatch table.
 */
const STEPS: Array<{ owner: Ns4StepOwner; step: mls.msg.AIAgentStep; label: string }> = [
  { owner: 'e1', step: createNs4E1Step(1), label: 'E1' },
  { owner: 'e2', step: createNs4E2Step('buildFlowFsm45', 1), label: 'E2' },
  { owner: 'e2', step: createNs4E2GateRepairStep('buildFlowFsm45', 1, 1, 0, 'feedback'), label: 'E2 gate repair' },
  { owner: 'e2', step: createNs4E2CoverageRepairStep('buildFlowFsm45', 1, 1, 'feedback'), label: 'E2 coverage repair' },
  { owner: 'e2', step: createNs4E2CoverageJudgeStep('buildFlowFsm45', 1, 0, 1), label: 'E2 coverage judge' },
  { owner: 'e3', step: createNs4E3Step('buildFlowFsm45', 1), label: 'E3' },
  { owner: 'e4', step: createNs4E4Step('buildFlowFsm45', 1), label: 'E4' },
  { owner: 'e4', step: createNs4E4RepairStep('buildFlowFsm45', 1, 1, 'feedback'), label: 'E4 repair' },
  { owner: 'e4', step: createNs4E4FinalizeStep('buildFlowFsm45', 1, []), label: 'E4 finalize' },
  { owner: 'e4', step: createNs4E4RelationshipBindingStep('buildFlowFsm45', 1), label: 'E4 bindings' },
  { owner: 'e5', step: createNs4E5Step('buildFlowFsm45', 1), label: 'E5' },
  { owner: 'e6', step: createNs4E6Step('buildFlowFsm45', 1), label: 'E6' },
  { owner: 'e7', step: createNs4E7Step('buildFlowFsm45'), label: 'E7' },
  { owner: 'e8', step: createNs4E8Step('buildFlowFsm45', 1), label: 'E8' },
  { owner: 'e8', step: createNs4E8HubCompositionRepairStep('buildFlowFsm45', 1, 1, 'feedback'), label: 'E8 hub repair' },
  { owner: 'e9', step: createNs4E9Step('buildFlowFsm45'), label: 'E9' },
  { owner: 'e10', step: createNs4E10Step('buildFlowFsm45'), label: 'E10' },
];

test('every step a factory mints is routed to the step that owns it', () => {
  for (const { owner, step, label } of STEPS) {
    const planId = step.planning?.planId || '';
    assert.ok(planId, `${label} minted a step with no plan id`);
    assert.equal(resolveNs4StepOwner(planId), owner, `${label} (${planId}) does not reach ${owner}`);
  }
  // The run 45 regression, named: the E8 step is round-scoped and must still reach E8.
  assert.equal(resolveNs4StepOwner('e8-workspaces-round-1'), 'e8');
  assert.equal(resolveNs4StepOwner('e8-workspaces-round-12'), 'e8');
  // And an unknown plan id resolves to nothing, so the router can say so instead of dying mute.
  assert.equal(resolveNs4StepOwner('e8-workspaces'), '');
  assert.equal(resolveNs4StepOwner(''), '');
});

test('no factory carries a stage or a plan id the current model does not own', () => {
  for (const { step, label } of STEPS) {
    const prompt = JSON.parse(String(step.prompt || '{}')) as Record<string, unknown>;
    if (label.startsWith('E8')) {
      assert.equal('stage' in prompt, false, `${label} still declares a stage of the previous E8 model`);
    }
    assert.equal(typeof prompt.planId, 'string');
  }
});

test('the flow version has one source: the constant and the flow document agree', () => {
  const flow = JSON.parse(readFileSync(new URL('../docs/flow.json', import.meta.url), 'utf8')) as { schemaVersion: string };
  assert.equal(NS4_FLOW_VERSION, flow.schemaVersion,
    'docs/flow.json and NS4_FLOW_VERSION drifted; bump both or the artifacts record a version nobody shipped');
});
