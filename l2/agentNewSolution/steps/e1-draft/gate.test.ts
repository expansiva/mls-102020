/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e1-draft/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { runNsGate } from '/_102020_/l2/agentNewSolution/helpers/nsGate.js';
import {
  NsE1DraftArtifact,
  prepareE1DraftArtifact,
  validateE1DraftInvariants,
} from '/_102020_/l2/agentNewSolution/steps/e1-draft/gate.js';

const here = dirname(fileURLToPath(import.meta.url));
const schema = JSON.parse(readFileSync(resolve(here, '../../schemas/e1-draft.schema.json'), 'utf8')) as Record<string, unknown>;

function validArtifact(): NsE1DraftArtifact {
  return prepareE1DraftArtifact({
    moduleName: 'cafeFlow',
    moduleTitle: 'Cafe Flow',
    userLanguage: 'en',
    sourcePrompt: 'Create a module for cafe orders.',
    problem: 'The cafe needs to organize orders, preparation, and pickup without losing priorities.',
    actors: [{ actorId: 'attendant', name: 'Attendant', assumption: 'Registers counter orders.' }],
    scope: { in: ['Register orders'], out: ['Fiscal control'] },
    openQuestions: [{ questionId: 'paymentMethods', question: 'Which payment methods are accepted?', classification: 'assumed', defaultAnswer: 'Cash and card', impact: 'Affects the feature catalog.' }],
    assumptions: ['The kitchen receives orders in order.'],
    createdAt: '2026-07-05T00:00:00.000Z',
  });
}

test('E1 gate accepts a valid draft', async () => {
  const artifact = validArtifact();
  const result = await runNsGate({
    stepId: 'e1-draft',
    schema,
    artifact,
    validate: item => validateE1DraftInvariants(item),
  });
  assert.equal(result.ok, true);
});

test('E1 gate rejects module collision', async () => {
  const artifact = validArtifact();
  const result = await runNsGate({
    stepId: 'e1-draft',
    schema,
    artifact,
    validate: item => validateE1DraftInvariants(item, { existingModules: ['cafeFlow'] }),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'module_name_collision'), true);
});

test('E1 gate blocks when an open question is blocking', async () => {
  const artifact = validArtifact();
  artifact.openQuestions = [{ questionId: 'initialMenu', question: 'What is the initial menu?', classification: 'blocking', impact: 'Defines scope.' }];
  const result = await runNsGate({
    stepId: 'e1-draft',
    schema,
    artifact,
    validate: item => validateE1DraftInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.needsHumanInput, true);
});

test('E1 gate requires defaultAnswer for assumed questions', async () => {
  const artifact = validArtifact();
  artifact.openQuestions = [{ questionId: 'payment', question: 'Payment method?', classification: 'assumed', impact: 'Affects flow.' }];
  const result = await runNsGate({
    stepId: 'e1-draft',
    schema,
    artifact,
    validate: item => validateE1DraftInvariants(item),
  });
  assert.equal(result.ok, false);
  assert.equal(result.errors.some(issue => issue.code === 'assumed_question_without_default'), true);
});
