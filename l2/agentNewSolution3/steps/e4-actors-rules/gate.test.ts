/// <mls fileReference="_102020_/l2/agentNewSolution3/steps/e4-actors-rules/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNs3Gate } from '/_102020_/l2/agentNewSolution3/helpers/ns3Gate.js';
import {
  E4GateContext,
  Ns3E4Artifact,
  prepareE4Artifact,
  validateE4Invariants,
} from '/_102020_/l2/agentNewSolution3/steps/e4-actors-rules/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const e4Schema = JSON.parse(readFileSync(resolve(here, '../../schemas/e4-actors-rules.schema.json'), 'utf8')) as Record<string, unknown>;

const RULE_CLOSE = 'An order can only be closed after its payment is registered.';
const RULE_KITCHEN = 'Items cannot be edited after the order is sent to the kitchen.';

const gateContext: E4GateContext = {
  moduleName: 'cafeFlow',
  e2Actors: ['attendant', 'manager'],
  e2BusinessRules: [RULE_CLOSE, RULE_KITCHEN],
  entityIds: ['Order', 'MenuItem'],
};

function validArtifact(): Ns3E4Artifact {
  return prepareE4Artifact({
    moduleName: 'cafeFlow',
    userLanguage: 'en',
    actors: [
      { actorId: 'attendant', title: 'Attendant', description: 'Registers and closes orders at the counter.' },
      { actorId: 'manager', title: 'Manager', description: 'Oversees daily operation and reviews closed orders.' },
    ],
    rules: [
      {
        ruleId: 'orderCloseRequiresPayment',
        title: 'Order close requires payment',
        description: 'An order may only transition to closed after a payment has been registered for it.',
        appliesTo: ['Order'],
        layer: 'domain',
        sourceJourneyRules: [RULE_CLOSE],
      },
      {
        ruleId: 'kitchenItemsLocked',
        title: 'Items locked after kitchen dispatch',
        description: 'Order items become read-only once the order has been sent to the kitchen.',
        appliesTo: ['Order', 'MenuItem'],
        layer: 'application',
        sourceJourneyRules: [RULE_KITCHEN],
      },
    ],
    externalRefs: {
      mdm: [{ title: 'Product catalog', reason: 'Menu items are registry-like data the platform MDM could own.' }],
      horizontals: [{ title: 'Payments', reason: 'Order closing depends on a registered payment.' }],
      plugins: [],
      agents: [],
    },
  }, { moduleName: 'cafeFlow', userLanguage: 'en' });
}

void test('e4 gate passes on a valid artifact and attaches roleScope deterministically', async () => {
  const artifact = validArtifact();
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.equal(artifact.actors[0].roleScope, 'cafeFlow:attendant');
  assert.equal(gate.warnings.length, 0);
});

void test('e4 gate blocks when an E2 actor is missing from the roster', async () => {
  const artifact = validArtifact();
  artifact.actors = artifact.actors.filter(actor => actor.actorId !== 'manager');
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'actor.missing'));
});

void test('e4 gate blocks appliesTo entities outside the E3 model', async () => {
  const artifact = validArtifact();
  artifact.rules[0].appliesTo = ['Ghost'];
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'rule.appliesTo.unknown'));
});

void test('e4 gate warns when an E2 journey rule is not absorbed by any rule', async () => {
  const artifact = validArtifact();
  artifact.rules = artifact.rules.filter(rule => rule.ruleId !== 'kitchenItemsLocked');
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => issue.message).join('; '));
  assert.ok(gate.warnings.some(issue => issue.code === 'journeyRule.unmapped'));
});

void test('e4 gate blocks duplicated ruleIds', async () => {
  const artifact = validArtifact();
  artifact.rules.push({ ...artifact.rules[0] });
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'rule.id.duplicate'));
});

void test('e4 gate blocks unknown sourceJourneyRules strings', async () => {
  const artifact = validArtifact();
  artifact.rules[0].sourceJourneyRules = ['A rephrased rule that does not exist in E2.'];
  const gate = await runNs3Gate({
    stepId: 'e4-actors-rules-refs',
    schema: e4Schema,
    artifact,
    validate: item => validateE4Invariants(item, gateContext),
  });
  assert.equal(gate.ok, false);
  assert.ok(gate.errors.some(issue => issue.code === 'rule.sourceRule.unknown'));
});
