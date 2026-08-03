/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  describeNsE2Prerequisites,
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

test('E2 gate rejects an unreferenced now feature', async () => {
  const artifact = validArtifact();
  artifact.features.push({ featureId: 'orphan', title: 'Orphan feature', priority: 'now', actorIds: ['attendant'] });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'unreferenced_feature'), true);
});

test('E2 gate parks an unreferenced soon/later feature as a decision (warning, not error)', async () => {
  // run04: richGanttScheduling ("later", unreferenced) failed the gate and burned an LLM retry
  // round that merely moved it to decisions[] — the gate now does that deterministically.
  const artifact = validArtifact();
  artifact.features.push({ featureId: 'richGanttScheduling', title: 'Full rich Gantt', priority: 'later', actorIds: ['attendant'] });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, true);
  assert.equal(result.warnings.some(issue => issue.code === 'unreferenced_feature_downgraded'), true);
  assert.equal(result.artifact.features.some(feature => feature.featureId === 'richGanttScheduling'), false);
  const decision = result.artifact.decisions.find(item => item.target === 'richGanttScheduling');
  assert.equal(decision?.kind, 'featurePriority');
  assert.match(decision?.summary || '', /roadmap \(later\)/);
});

test('E2 gate accepts an unreferenced feature parked as never', async () => {
  const artifact = validArtifact();
  artifact.features.push({ featureId: 'fullWarehouseInventory', title: 'Full warehouse inventory', priority: 'never', actorIds: ['attendant'] });
  const result = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact,
    validate: item => validateE2JourneysInvariants(item),
  });
  assert.equal(result.ok, true);
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

// --- T3 (improveJourneys): prerequisite — where the actor comes from ---------------------------

function withPrerequisites(prepare: Record<string, unknown>, cook: Record<string, unknown> | null = null): NsE2JourneysArtifact {
  const artifact = validArtifact();
  artifact.journeys[0].prerequisite = prepare as never;
  if (cook) artifact.journeys[1].prerequisite = cook as never;
  return artifact;
}

const prerequisiteCodes = (artifact: NsE2JourneysArtifact): string[] =>
  validateE2JourneysInvariants(artifact).issues.filter(issue => issue.code.startsWith('prerequisite_')).map(issue => issue.code);

void test('E2 T3: a journey with no prerequisite is an ENTRY journey, not a defect', () => {
  assert.deepEqual(prerequisiteCodes(validArtifact()), []);
  assert.deepEqual(describeNsE2Prerequisites(validArtifact().journeys).map(edge => edge.kind), ['entry', 'entry']);
});

void test('E2 T3: kind "journey" must name a journey that exists and say what it carries', () => {
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'journey', carries: ['order'] })), ['prerequisite_journey_missing']);
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'journey', journeyId: 'ghostJourney', carries: ['order'] })), ['prerequisite_unknown_journey']);
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'journey', journeyId: 'takeoutOrder', carries: ['order'] })), ['prerequisite_self_reference']);
  // The carry is the whole point: without it the journey claims context it cannot name.
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'journey', journeyId: 'prepareOrder' })), ['prerequisite_carries_empty']);
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'journey', journeyId: 'prepareOrder', carries: ['order'] })), []);
});

void test('E2 T3: external/schedule need no journey and must not reference one', () => {
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'external', description: 'a customer walks in' })), []);
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'schedule', description: 'end of shift' })), []);
  assert.deepEqual(prerequisiteCodes(withPrerequisites({ kind: 'external', journeyId: 'prepareOrder' })), ['prerequisite_journey_ref_unexpected']);
});

void test('E2 T3: the "comes from" chain must terminate', () => {
  const artifact = withPrerequisites(
    { kind: 'journey', journeyId: 'prepareOrder', carries: ['order'] },
    { kind: 'journey', journeyId: 'takeoutOrder', carries: ['order'] },
  );
  const codes = prerequisiteCodes(artifact);
  assert.deepEqual(codes, ['prerequisite_cycle', 'prerequisite_cycle']); // both journeys sit on it
});

void test('E2 T3: a prerequisite from ANOTHER actor is a handoff — reported as a fact, never a warning', () => {
  const artifact = withPrerequisites({ kind: 'journey', journeyId: 'prepareOrder', carries: ['order'] });
  const edge = describeNsE2Prerequisites(artifact.journeys).find(item => item.journeyId === 'takeoutOrder')!;
  assert.equal(edge.handoff, true); // takeoutOrder is the attendant's, prepareOrder the cook's
  assert.equal(edge.fromTitle, 'Prepare order');
  assert.deepEqual(edge.carries, ['order']);
  // A handoff is legitimate: it must not add a single gate issue the human would dismiss every run.
  assert.deepEqual(validateE2JourneysInvariants(artifact).issues.filter(issue => issue.code.includes('handoff')), []);
});

void test('E2 T3: prepare keeps the v1 trigger readable but the artifact is written at v2', () => {
  const artifact = prepareE2JourneysArtifact({
    ...JSON.parse(JSON.stringify(validArtifact())),
    schemaVersion: '2026-07-06-ns-e2-v1',
    journeys: [{ ...JSON.parse(JSON.stringify(validArtifact().journeys[0])), trigger: 'a customer orders at the counter' }],
  });
  assert.equal(artifact.schemaVersion, '2026-08-02-ns-e2-v2');
  assert.equal(artifact.journeys[0].trigger, 'a customer orders at the counter');
  assert.equal(artifact.journeys[0].prerequisite, undefined);
});

void test('E2 T3: the checkpoint markdown states every entry point, including the handoffs', () => {
  const artifact = withPrerequisites({ kind: 'journey', journeyId: 'prepareOrder', carries: ['order'] });
  const markdown = renderE2JourneysMarkdown(artifact);
  assert.match(markdown, /## Journey Entry Points/);
  assert.match(markdown, /`takeoutOrder`: after `prepareOrder` \(Prepare order\) carrying order — HANDOFF/);
  assert.match(markdown, /`prepareOrder`: starts from the actor's landing/);
});

void test('E2 T3: the cafeFlow fixture is valid under the bumped schema and exercises the new field', async () => {
  const fixture = JSON.parse(readFileSync(resolve(here, 'fixture/cafeFlow/e2-journeys.json'), 'utf8')) as Record<string, unknown>;
  const gate = await runNsGate({
    stepId: 'e2-journeys',
    schema,
    artifact: prepareE2JourneysArtifact(fixture),
    validate: artifact => validateE2JourneysInvariants(artifact),
  });
  assert.equal(gate.ok, true, gate.errors.map(issue => `${issue.code}: ${issue.message}`).join('; '));
  const edges = describeNsE2Prerequisites(prepareE2JourneysArtifact(fixture).journeys);
  assert.equal(edges.filter(edge => edge.kind === 'journey').length, 2);
  assert.equal(edges.filter(edge => edge.handoff).length, 1); // atendente -> cozinha
});

void test('E2 T3: an invented kind is normalized by SHAPE so the error names the real mistake', () => {
  // The model writing kind "navigation" with a journeyId meant "journey". Coercing to "external"
  // would produce prerequisite_journey_ref_unexpected — a retry pointed at the wrong fix.
  const artifact = prepareE2JourneysArtifact({
    ...JSON.parse(JSON.stringify(validArtifact())),
    journeys: JSON.parse(JSON.stringify(validArtifact().journeys)).map((journey: Record<string, unknown>, index: number) =>
      index === 0 ? { ...journey, prerequisite: { kind: 'navigation', journeyId: 'prepareOrder', carries: ['order'] } } : journey),
  });
  assert.deepEqual(artifact.journeys[0].prerequisite, { kind: 'journey', journeyId: 'prepareOrder', carries: ['order'] });
  assert.deepEqual(prerequisiteCodes(artifact), []);
  // With no journey named, "outside the system" is the honest reading of an unknown kind.
  const loose = prepareE2JourneysArtifact({
    ...JSON.parse(JSON.stringify(validArtifact())),
    journeys: JSON.parse(JSON.stringify(validArtifact().journeys)).map((journey: Record<string, unknown>, index: number) =>
      index === 0 ? { ...journey, prerequisite: { kind: 'whenever', description: 'a customer walks in' } } : journey),
  });
  assert.equal(loose.journeys[0].prerequisite?.kind, 'external');
  assert.deepEqual(prerequisiteCodes(loose), []);
});

void test('E2 T3: a prerequisite reference is normalized by shape once every journey id is known', () => {
  // Observed live: kind "external" carrying a journeyId that names the external event, not a journey.
  const withLabel = prepareE2JourneysArtifact({
    ...JSON.parse(JSON.stringify(validArtifact())),
    journeys: JSON.parse(JSON.stringify(validArtifact().journeys)).map((journey: Record<string, unknown>, index: number) =>
      index === 0 ? { ...journey, prerequisite: { kind: 'external', journeyId: 'aCustomerWalksIn', description: 'a customer walks in' } } : journey),
  });
  assert.deepEqual(withLabel.journeys[0].prerequisite, { kind: 'external', description: 'a customer walks in' });
  assert.deepEqual(prerequisiteCodes(withLabel), []);
  // But a reference to a journey that DOES exist is a real reference: the kind was the mistake.
  const withReference = prepareE2JourneysArtifact({
    ...JSON.parse(JSON.stringify(validArtifact())),
    journeys: JSON.parse(JSON.stringify(validArtifact().journeys)).map((journey: Record<string, unknown>, index: number) =>
      index === 0 ? { ...journey, prerequisite: { kind: 'external', journeyId: 'prepareOrder', carries: ['order'] } } : journey),
  });
  assert.equal(withReference.journeys[0].prerequisite?.kind, 'journey');
  assert.deepEqual(prerequisiteCodes(withReference), []);
});
