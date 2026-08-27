/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4ReviewPolicy.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import {
  decideNs4LaterCheckpoint,
  isNs4AutomaticCheckpoint,
  ns4E2SmartSignal,
  ns4E4SmartSignal,
  NS4_SMART_SKIP_REASON,
  NS4_UNAVAILABLE_SMART_SIGNAL,
} from '/_102020_/l2/agentNewSolution/helpers/ns4ReviewPolicy.js';
import {
  createNs4Pipeline,
  markNs4E4Approved,
  markNs4ModuleE4Approved,
  buildNs4ModuleArtifact,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';

function ctx(fastMode?: string) {
  return { task: { iaCompressed: { longMemory: fastMode === undefined ? {} : { fastMode } } } };
}

test('/fast still auto-approves later checkpoints by itself', () => {
  assert.equal(isNs4AutomaticCheckpoint(ctx('true')), true);
  assert.equal(isNs4AutomaticCheckpoint(ctx('true'), { reviewPolicy: { mode: 'guided' } }), true);
  assert.deepEqual(decideNs4LaterCheckpoint(ctx('true'), { reviewPolicy: { mode: 'guided' } }), { open: false });
});

test('E1 Automatic execution auto-approves later checkpoints without /fast', () => {
  assert.equal(isNs4AutomaticCheckpoint(ctx(), { reviewPolicy: { mode: 'automatic' } }), true);
  assert.deepEqual(decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'automatic' } }), { open: false });
});

test('guided, missing policy and missing module stay interactive', () => {
  assert.equal(isNs4AutomaticCheckpoint(ctx()), false);
  assert.equal(isNs4AutomaticCheckpoint(ctx(), null), false);
  assert.equal(isNs4AutomaticCheckpoint(ctx(), {}), false);
  assert.equal(isNs4AutomaticCheckpoint(ctx(), { reviewPolicy: { mode: 'guided' } }), false);
  assert.deepEqual(decideNs4LaterCheckpoint(ctx()), { open: true });
  assert.deepEqual(decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'guided' } }, ns4E4SmartSignal()), { open: true });
});

test('automatic wins even when fastMode is present but not true', () => {
  assert.equal(isNs4AutomaticCheckpoint(ctx('false'), { reviewPolicy: { mode: 'automatic' } }), true);
});

test('smart + finding A opens the checkpoint', () => {
  assert.deepEqual(
    decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'smart' } }, { available: true, classA: true, classB: false }),
    { open: true },
  );
});

test('smart + Type B / relevant decision opens the checkpoint', () => {
  const review = {
    systemDecisions: [{ decisionId: 'coverageGap' }],
    journeys: [{ policyDecisions: [] }],
  };
  assert.deepEqual(ns4E2SmartSignal(review), { available: true, classA: false, classB: true });
  assert.deepEqual(
    decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'smart' } }, ns4E2SmartSignal(review)),
    { open: true },
  );
  assert.deepEqual(
    ns4E2SmartSignal({ systemDecisions: [], journeys: [{ policyDecisions: [{ decisionId: 'keepCatalogue' }] }] }),
    { available: true, classA: false, classB: true },
  );
});

// E4 nao tem vocabulario A/B — so Type C. Isso e AUSENCIA DE SINAL, nao prova de que a ontologia
// esta tranquila; e como `smart` e o DEFAULT, cravar classA/B=false tirava a revisao de entidades e
// enums de TODO run, em silencio. (review 26/08)
test('smart + E4 (sem vocabulario A/B) ABRE o checkpoint', () => {
  assert.deepEqual(ns4E4SmartSignal({ systemDecisions: [{ decisionId: 'labelBackfill' }] }), NS4_UNAVAILABLE_SMART_SIGNAL);
  assert.deepEqual(
    decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'smart' } }, ns4E4SmartSignal()),
    { open: true },
  );
});

test('smart + sinal classificado e vazio pula e registra o motivo', () => {
  assert.deepEqual(
    decideNs4LaterCheckpoint(
      ctx(),
      { reviewPolicy: { mode: 'smart' } },
      ns4E2SmartSignal({ systemDecisions: [], journeys: [{ policyDecisions: [] }] }),
    ),
    { open: false, autoReason: NS4_SMART_SKIP_REASON },
  );
});

test('smart + no classified signal (E3/E5/E6) opens the checkpoint', () => {
  assert.deepEqual(
    decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'smart' } }, NS4_UNAVAILABLE_SMART_SIGNAL),
    { open: true },
  );
  assert.deepEqual(
    decideNs4LaterCheckpoint(ctx(), { reviewPolicy: { mode: 'smart' } }),
    { open: true },
  );
});

test('smart skip writes autoReason next to approvedBy=auto', () => {
  const now = '2026-08-26T12:00:00.000Z';
  const clarification = {
    planId: 'e1-clarification', userLanguage: 'en', title: 'Intake', legends: [],
    questions: {
      moduleName: { type: 'open', question: 'Name?', answer: 'newModule' },
      productLanguages: { type: 'open', question: 'Languages?', answer: 'en' },
      mainActors: { type: 'open', question: 'Actors?', answer: 'Owner' },
      mainGoal: { type: 'open', question: 'Goal?', answer: 'Ship the module.' },
      boundaries: { type: 'open', question: 'Limits?', answer: 'None.' },
    },
  };
  const module = markNs4ModuleE4Approved(
    buildNs4ModuleArtifact('newModule', clarification, 'human', now),
    'auto',
    now,
    NS4_SMART_SKIP_REASON,
  );
  const e4Step = module.specStatus.completedSteps.find(step => step.stepId === 'e4-ontology');
  assert.equal(e4Step?.approvedBy, 'auto');
  assert.equal(e4Step?.autoReason, NS4_SMART_SKIP_REASON);

  const pipeline = markNs4E4Approved(createNs4Pipeline('newModule', 'prompt'), 'auto', ['index.defs.ts'], now, 1, NS4_SMART_SKIP_REASON);
  assert.equal(pipeline.steps.e4?.approvedBy, 'auto');
  assert.equal(pipeline.steps.e4?.autoReason, NS4_SMART_SKIP_REASON);
});
