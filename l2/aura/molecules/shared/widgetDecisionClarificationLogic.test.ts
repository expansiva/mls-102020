/// <mls fileReference="_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  allDecisionAnswered,
  buildDecisionResult,
  initialDecisionAnswers,
  isDecisionAnswered,
  type DecisionQuestion,
} from '/_102020_/l2/aura/molecules/shared/widgetDecisionClarificationLogic.js';

const QUESTIONS: DecisionQuestion[] = [
  {
    id: 'background.kind',
    question: 'Page background?',
    options: [
      { id: 'light', label: 'Light' },
      { id: 'dark', label: 'Dark', recommended: true },
    ],
  },
  {
    id: 'primary',
    question: 'Primary color?',
    allowNotes: true,
    options: [{ id: 'indigo', label: 'Indigo' }],
  },
];

test('initial answers pre-select the recommended option (or the first)', () => {
  const init = initialDecisionAnswers(QUESTIONS);
  assert.equal(init['background.kind'].optionId, 'dark');   // recommended
  assert.equal(init['primary'].optionId, 'indigo');          // first (no recommended)
  assert.equal(init['background.kind'].notes, '');
});

test('buildDecisionResult resolves the label and keeps notes only when allowed + present', () => {
  const local = {
    'background.kind': { optionId: 'light', notes: 'ignored (notes not allowed here)' },
    'primary': { optionId: 'indigo', notes: '  #6C5CE7  ' },
  };
  const result = buildDecisionResult(QUESTIONS, local);
  assert.deepEqual(result[0], { id: 'background.kind', optionId: 'light', label: 'Light' });
  assert.deepEqual(result[1], { id: 'primary', optionId: 'indigo', label: 'Indigo', notes: '#6C5CE7' });
});

test('isDecisionAnswered: option chosen OR (notes allowed + provided)', () => {
  assert.ok(isDecisionAnswered(QUESTIONS[0], { optionId: 'dark', notes: '' }));
  assert.ok(!isDecisionAnswered(QUESTIONS[0], { optionId: '', notes: 'x' })); // notes not allowed here
  assert.ok(isDecisionAnswered(QUESTIONS[1], { optionId: '', notes: 'custom' })); // notes allowed
  assert.ok(!isDecisionAnswered(QUESTIONS[1], { optionId: '', notes: '   ' }));
});

test('allDecisionAnswered is true once every question resolves', () => {
  assert.ok(allDecisionAnswered(QUESTIONS, initialDecisionAnswers(QUESTIONS)));
  assert.ok(!allDecisionAnswered(QUESTIONS, { 'background.kind': { optionId: '', notes: '' }, 'primary': { optionId: 'indigo', notes: '' } }));
});
