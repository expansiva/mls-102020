/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  prepareE2JourneysArtifact,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import type { NsE2JourneysArtifact } from '/_102020_/l2/agentNewSolution/steps/e2-journeys/gate.js';
import {
  applyNsJourneysWidgetEdits,
  buildNsJourneysReviewPayload,
  emptyNsJourneysWidgetEdits,
} from '/_102020_/l2/agentNewSolution/steps/e2-journeys/widgetNsJourneysLogic.js';

function validArtifact(): NsE2JourneysArtifact {
  return prepareE2JourneysArtifact({
    moduleName: 'cafeFlow',
    moduleTitle: 'Cafe Flow',
    userLanguage: 'en',
    version: 2,
    actors: [{ actorId: 'attendant', name: 'Attendant' }],
    journeys: [{
      journeyId: 'takeOrder',
      actorId: 'attendant',
      title: 'Take order',
      goal: 'register a customer order',
      steps: [{ stepId: 'selectItems', title: 'Select items', intent: 'choose menu items', featureRefs: ['posOrder'] }],
      outcome: 'order registered',
      businessRules: ['Order needs at least one item.'],
      notes: '',
    }],
    features: [{ featureId: 'posOrder', title: 'POS order', priority: 'now', actorIds: ['attendant'] }],
    decisions: [],
    createdAt: '2026-07-06T00:00:00.000Z',
  });
}

test('journey widget edits build a proposed artifact without mutating the source', () => {
  const artifact = validArtifact();
  const edits = emptyNsJourneysWidgetEdits();
  edits.featurePriorities.posOrder = 'soon';
  edits.journeyBusinessRules.takeOrder = ['Order needs at least one item.', 'Customer origin is required.'];
  edits.journeyNotes.takeOrder = 'Keep the first version small.';

  const proposed = applyNsJourneysWidgetEdits(artifact, edits);

  assert.equal(artifact.features[0].priority, 'now');
  assert.deepEqual(artifact.journeys[0].businessRules, ['Order needs at least one item.']);
  assert.equal(artifact.journeys[0].notes, '');
  assert.equal(proposed.features[0].priority, 'soon');
  assert.deepEqual(proposed.journeys[0].businessRules, ['Order needs at least one item.', 'Customer origin is required.']);
  assert.equal(proposed.journeys[0].notes, 'Keep the first version small.');
});

test('journey review payload follows the checkpoint contract', () => {
  const artifact = validArtifact();
  const edits = emptyNsJourneysWidgetEdits();
  edits.featurePriorities.posOrder = 'later';

  const payload = buildNsJourneysReviewPayload({
    artifact,
    action: 'adjust',
    adjustment: '  Move POS order to later.  ',
    edits,
    changes: [{
      id: 'change1',
      at: '2026-07-06T00:01:00.000Z',
      kind: 'featurePriorityChanged',
      targetId: 'posOrder',
      summary: 'POS order: Now -> Later',
      before: 'now',
      after: 'later',
    }],
  });

  assert.equal(payload.type, 'checkpoint-journeys-answer');
  assert.equal(payload.action, 'adjust');
  assert.equal(payload.approved, false);
  assert.equal(payload.adjustment, 'Move POS order to later.');
  assert.equal(payload.moduleName, 'cafeFlow');
  assert.equal(payload.version, 2);
  assert.equal(payload.proposedArtifact.features[0].priority, 'later');
  assert.equal(payload.changes.length, 1);
});
