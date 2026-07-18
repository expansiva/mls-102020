/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  NsE2JourneysArtifact,
  prepareE2JourneysArtifact,
  renderE2JourneysMarkdown,
  validateE2JourneysInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '../../schemas/e2-journeys.schema.json'), 'utf8')) as Record<string, unknown>;

function validArtifact(): NsE2JourneysArtifact {
  return prepareE2JourneysArtifact({
    moduleName: 'cafeFlow',
    moduleTitle: 'Cafe Flow',
    userLanguage: 'en',
    version: 1,
    actors: [
      { actorId: 'attendant', name: 'Attendant' },
      { actorId: 'cook', name: 'Cook' },
    ],
    journeys: [
      {
        journeyId: 'takeoutOrder',
        actorId: 'attendant',
        title: 'Takeout order',
        goal: 'register a takeout order',
        steps: [
          { stepId: 'createOrder', title: 'Create order', intent: 'open a new takeout order', featureRefs: ['orderPos'] },
          { stepId: 'sendKitchen', title: 'Send to kitchen', intent: 'push the order to the kitchen queue', featureRefs: ['kitchenQueue'] },
        ],
        outcome: 'order registered and sent to the kitchen',
        businessRules: ['An order needs at least one item before it is sent.'],
        notes: '',
      },
      {
        journeyId: 'prepareOrder',
        actorId: 'cook',
        title: 'Prepare order',
        goal: 'prepare queued items',
        steps: [
          { stepId: 'viewQueue', title: 'View queue', intent: 'see pending items', featureRefs: ['kitchenQueue'] },
        ],
        outcome: 'items prepared',
        businessRules: [],
        notes: '',
      },
    ],
    features: [
      { featureId: 'orderPos', title: 'POS order entry', priority: 'now', actorIds: ['attendant'] },
      { featureId: 'kitchenQueue', title: 'Kitchen queue', priority: 'now', actorIds: ['cook', 'attendant'] },
    ],
    decisions: [],
    createdAt: '2026-07-06T00:00:00.000Z',
  });
}

test('E2 gate accepts a valid artifact', async () => {
  const artifact = validArtifact();
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item, { e1ActorIds: ['attendant', 'cook'] }),
  });
  assert.equal(result.ok, true);
});

test('E2 gate rejects a dangling feature reference', async () => {
  const artifact = validArtifact();
  artifact.journeys[0].steps[0].featureRefs = ['ghostFeature'];
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'dangling_feature_ref'), true);
});

test('E2 gate rejects an unreferenced feature', async () => {
  const artifact = validArtifact();
  artifact.features.push({ featureId: 'orphan', title: 'Orphan feature', priority: 'soon', actorIds: ['attendant'] });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'unreferenced_feature'), true);
});

test('E2 gate rejects an actor without a journey', async () => {
  const artifact = validArtifact();
  artifact.actors.push({ actorId: 'manager', name: 'Manager' });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'actor_without_journey'), true);
});

test('E2 gate rejects a missing E1 actor', async () => {
  const artifact = validArtifact();
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item, { e1ActorIds: ['attendant', 'cook', 'manager'] }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'missing_e1_actor'), true);
});

test('E2 gate accepts a removed E1 actor when a decision records it', async () => {
  const artifact = validArtifact();
  artifact.decisions.push({ decisionId: 'dropManager', kind: 'actorRemoved', summary: 'Manager is out of the first release.', target: 'manager' });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item, { e1ActorIds: ['attendant', 'cook', 'manager'] }),
  });
  assert.equal(result.ok, true);
});

test('E2 markdown is an audit summary instead of a full catalog copy', () => {
  const artifact = validArtifact();
  const markdown = renderE2JourneysMarkdown(artifact, { generatedAt: '2026-07-06T00:00:00.000Z' });
  assert.match(markdown, /E2 Journey Audit/);
  assert.match(markdown, /Source of Truth/);
  assert.match(markdown, /Initial E2 version created/);
  assert.doesNotMatch(markdown, /## Journeys by Actor/);
  assert.doesNotMatch(markdown, /## Feature Catalog/);
});

test('E2 markdown records deltas against the previous version', () => {
  const previous = validArtifact();
  const next = validArtifact();
  next.features[0].priority = 'soon';
  const markdown = renderE2JourneysMarkdown(next, {
    previous,
    adjustment: 'Move POS order entry to soon.',
    generatedAt: '2026-07-06T00:00:00.000Z',
  });
  assert.match(markdown, /Adjustment request: Move POS order entry to soon\./);
  assert.match(markdown, /Feature priority changed: POS order entry \(now -> soon\)\./);
});
