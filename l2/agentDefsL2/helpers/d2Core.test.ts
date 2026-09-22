/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2Core.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  D2_FLOW_STEP_IDS,
  D2_STEP_DEPENDS_ON,
  buildD2PlannedSteps,
  d2PipelineFile,
  moduleTokenOk,
  parseD2MessageInvocation,
  parseD2StepInvocation,
} from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';

void test('message entry requires one explicit safe module and rejects every flag', () => {
  assert.deepEqual(parseD2MessageInvocation('@@agentDefsL2 agendaClinica', 102047), {
    kind: 'run', project: 102047, module: 'agendaClinica',
  });
  assert.deepEqual(parseD2MessageInvocation('@@_102020_/l2/agentDefsL2 /help', 102047), { kind: 'help' });
  assert.match(refusal(parseD2MessageInvocation('', 102047)), /exactly one explicit module/);
  assert.match(refusal(parseD2MessageInvocation('agendaClinica extra', 102047)), /exactly one explicit module/);
  assert.match(refusal(parseD2MessageInvocation('agendaClinica /candidate', 102047)), /not supported/);
  assert.match(refusal(parseD2MessageInvocation('agendaClinica /rebuild', 102047)), /Unknown flag/);
  assert.match(refusal(parseD2MessageInvocation('../agendaClinica', 102047)), /must not contain a path/);
  assert.match(refusal(parseD2MessageInvocation('agenda/clinica', 102047)), /must not contain a path/);
  assert.equal(moduleTokenOk('agendaClinica'), true);
  assert.equal(moduleTokenOk('AgendaClinica'), false);
});

void test('task-step entry requires exact project/module and refuses context drift', () => {
  assert.deepEqual(parseD2StepInvocation('{"project":102047,"module":"agendaClinica"}', 102047), {
    kind: 'run', project: 102047, module: 'agendaClinica',
  });
  assert.match(refusal(parseD2StepInvocation('{"module":"agendaClinica"}', 102047)), /positive integer project/);
  assert.match(refusal(parseD2StepInvocation('{"project":102048,"module":"agendaClinica"}', 102047)), /does not match/);
  assert.match(refusal(parseD2StepInvocation('{"project":102047,"module":"agendaClinica","candidate":true}', 102047)), /Unknown step arg/);
  assert.match(refusal(parseD2StepInvocation('{"project":102047,"module":"../agendaClinica"}', 102047)), /must not contain a path/);
});

void test('declared plan is ordered, acyclic and carries project/module on every step', () => {
  const identities = [
    { project: 102047, module: 'sharedName' },
    { project: 102048, module: 'sharedName' },
  ];
  for (const identity of identities) {
    const steps = buildD2PlannedSteps(identity);
    assert.deepEqual(steps.map(step => step.planning?.planId), [...D2_FLOW_STEP_IDS]);
    const seen = new Set<string>();
    for (const step of steps) {
      const id = String(step.planning?.planId || '') as keyof typeof D2_STEP_DEPENDS_ON;
      for (const dependency of step.planning?.dependsOn || []) {
        assert.ok(seen.has(dependency.replace(/-done$/, '')), `${id} depends on a later or missing step`);
      }
      assert.deepEqual(JSON.parse(step.prompt || '{}'), identity);
      seen.add(id);
    }
    assert.deepEqual(d2PipelineFile(identity), {
      project: identity.project,
      level: 2,
      folder: 'sharedName/pipeline/agentDefsL2',
      shortName: 'pipeline',
      extension: '.json',
    });
  }
});

function refusal(value: ReturnType<typeof parseD2MessageInvocation> | ReturnType<typeof parseD2StepInvocation>): string {
  return value.kind === 'refusal' ? value.diagnostic : '';
}
