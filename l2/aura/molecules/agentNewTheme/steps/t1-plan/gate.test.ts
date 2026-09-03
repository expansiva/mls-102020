/// <mls fileReference="_102020_/l2/aura/molecules/agentNewTheme/steps/t1-plan/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { NT_MAX_QUESTIONS, normalizeNtPlan, runPlanGate } from '/_102020_/l2/aura/molecules/agentNewTheme/steps/t1-plan/gate.js';

const cornersQuestion = {
  field: 'corners',
  question: 'Cantos?',
  allowNotes: false,
  options: [
    { id: 'sharp', label: 'Retos', recommended: true },
    { id: 'rounded', label: 'Arredondados' },
  ],
};

function planPayload(overrides: Record<string, unknown> = {}): unknown {
  return {
    type: 'flexible',
    result: {
      validInput: true,
      userLanguage: 'pt',
      title: 'Novo tema',
      known: { name: 'neo', background: { kind: 'light' } },
      questions: [cornersQuestion],
      ...overrides,
    },
  };
}

test('normalizeNtPlan unwraps the flexible envelope', () => {
  const plan = normalizeNtPlan(planPayload());
  assert.equal(plan.validInput, true);
  assert.equal(plan.userLanguage, 'pt');
  assert.equal(plan.known.name, 'neo');
  assert.equal(plan.known.background?.kind, 'light');
  assert.equal(plan.questions.length, 1);
  assert.equal(plan.questions[0].options[0].recommended, true);
  assert.deepEqual(runPlanGate(plan), []);
});

test('normalizeNtPlan accepts a raw JSON string and applies defaults', () => {
  const plan = normalizeNtPlan(JSON.stringify({ result: { title: '', questions: [] } }));
  assert.equal(plan.userLanguage, 'pt');
  assert.equal(plan.title, 'New theme');
  assert.deepEqual(plan.questions, []);
  assert.deepEqual(runPlanGate(plan), []);
});

test('normalizeNtPlan drops malformed questions and caps the list', () => {
  const many = Array.from({ length: NT_MAX_QUESTIONS + 3 }, (_, index) => ({ ...cornersQuestion, field: `corners${index}` }));
  const plan = normalizeNtPlan(planPayload({ questions: [...many, { question: 'no field' }, 'nope'] }));
  assert.equal(plan.questions.length, NT_MAX_QUESTIONS);
});

test('an invalid input short-circuits with its reason', () => {
  const plan = normalizeNtPlan(planPayload({ validInput: false, invalidReason: 'not a style' }));
  const issues = runPlanGate(plan);
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'invalid_input');
  assert.match(issues[0].message, /not a style/);
});

test('questions must target canonical fields', () => {
  const plan = normalizeNtPlan(planPayload({ questions: [{ ...cornersQuestion, field: 'mood' }] }));
  const issues = runPlanGate(plan);
  assert.deepEqual(issues.map(issue => issue.code), ['question_field']);
});

test('OPEN fields may come with no options when the human can type (run 1 regression)', () => {
  // First Studio run failed here: t1 correctly emitted free-text questions for name /
  // primary / border.color and the gate demanded 2+ options from all of them.
  const open = ['name', 'primary', 'border.color', 'background.css'].map(field => ({
    field,
    question: `Qual ${field}?`,
    allowNotes: true,
    options: [],
  }));
  const plan = normalizeNtPlan(planPayload({ known: {}, questions: open }));
  assert.equal(plan.questions.length, 4);
  assert.deepEqual(runPlanGate(plan), []);

  // A single suggested option alongside the free-text field is fine too.
  const suggested = normalizeNtPlan(planPayload({
    known: {},
    questions: [{ field: 'primary', question: 'Cor?', allowNotes: true, options: [{ id: '#6c5ce7', label: 'Roxo' }] }],
  }));
  assert.deepEqual(runPlanGate(suggested), []);
});

test('an open question with neither options nor free text is unanswerable', () => {
  const plan = normalizeNtPlan(planPayload({
    known: {},
    questions: [{ field: 'primary', question: 'Cor?', allowNotes: false, options: [] }],
  }));
  assert.deepEqual(runPlanGate(plan).map(issue => issue.code), ['question_unanswerable']);
});

test('the boolean field is treated as a closed set', () => {
  const bad = normalizeNtPlan(planPayload({
    known: {},
    questions: [{ field: 'typography.uppercaseLabels', question: 'Maiúsculas?', allowNotes: false, options: [{ id: 'sim', label: 'Sim' }, { id: 'nao', label: 'Não' }] }],
  }));
  assert.deepEqual(runPlanGate(bad).map(issue => issue.code), ['option_enum']);

  const good = normalizeNtPlan(planPayload({
    known: {},
    questions: [{ field: 'typography.uppercaseLabels', question: 'Maiúsculas?', allowNotes: false, options: [{ id: 'true', label: 'Sim', recommended: true }, { id: 'false', label: 'Não' }] }],
  }));
  assert.deepEqual(runPlanGate(good), []);
});

test('enum questions must offer the enum ids, 2+ options and a single recommendation', () => {
  const plan = normalizeNtPlan(planPayload({
    questions: [{
      ...cornersQuestion,
      options: [
        { id: 'squared', label: 'Retos', recommended: true },
        { id: 'rounded', label: 'Arredondados', recommended: true },
      ],
    }],
  }));
  const codes = runPlanGate(plan).map(issue => issue.code);
  assert.ok(codes.includes('option_enum'));
  assert.ok(codes.includes('option_recommended'));

  const single = normalizeNtPlan(planPayload({ questions: [{ ...cornersQuestion, options: [{ id: 'sharp', label: 'Retos' }] }] }));
  assert.deepEqual(runPlanGate(single).map(issue => issue.code), ['question_options']);
});

test('a decided field MAY be asked, but only pre-selected (item 2: confirm the inference)', () => {
  // cornersQuestion already marks 'sharp' as recommended -> confirming it is one click
  const preselected = normalizeNtPlan(planPayload({
    known: { corners: 'sharp' },
    questions: [cornersQuestion],
  }));
  assert.deepEqual(runPlanGate(preselected), []);

  // asking without pre-selecting would make the human retype a decision already made
  const unselected = normalizeNtPlan(planPayload({
    known: { corners: 'sharp' },
    questions: [{
      ...cornersQuestion,
      options: [
        { id: 'sharp', label: 'Retos' },
        { id: 'rounded', label: 'Arredondados', recommended: true },
      ],
    }],
  }));
  assert.deepEqual(runPlanGate(unselected).map(issue => issue.code), ['question_not_preselected']);
});

test('an inferred NAME comes back as a one-option question so it can be corrected', () => {
  // the real regression: the plan inferred 'brutalismo' from "tema brutalismo" and the
  // checkpoint was forbidden from showing it, so the suffix shipped as '-brutalismo'
  const plan = normalizeNtPlan(planPayload({
    known: { name: 'brutal' },
    questions: [{
      field: 'name',
      question: 'Nome curto do tema (vira o sufixo das moléculas)',
      allowNotes: true,
      options: [{ id: 'brutal', label: 'brutal', recommended: true }],
    }],
  }));
  assert.deepEqual(runPlanGate(plan), []);
});

test('a decided boolean is compared as its option id', () => {
  const question = {
    field: 'typography.uppercaseLabels',
    question: 'Maiúsculas?',
    allowNotes: false,
    options: [{ id: 'true', label: 'Sim', recommended: true }, { id: 'false', label: 'Não' }],
  };
  const ok = normalizeNtPlan(planPayload({ known: { typography: { uppercaseLabels: true } }, questions: [question] }));
  assert.deepEqual(runPlanGate(ok), []);

  const wrong = normalizeNtPlan(planPayload({ known: { typography: { uppercaseLabels: false } }, questions: [question] }));
  assert.deepEqual(runPlanGate(wrong).map(issue => issue.code), ['question_not_preselected']);
});

test('the same field cannot be asked twice', () => {
  const plan = normalizeNtPlan(planPayload({ known: {}, questions: [cornersQuestion, cornersQuestion] }));
  assert.deepEqual(runPlanGate(plan).map(issue => issue.code), ['question_duplicate']);
});

test('known enum values are validated', () => {
  const plan = normalizeNtPlan(planPayload({ known: { motion: 'bouncy' }, questions: [] }));
  assert.deepEqual(runPlanGate(plan).map(issue => issue.code), ['known_enum']);
});

test('the free-text slot and displayName are valid open questions', () => {
  const plan = normalizeNtPlan(planPayload({
    known: {},
    questions: [
      cornersQuestion,
      { field: 'displayName', question: 'Nome de exibição?', allowNotes: true, options: [] },
      { field: 'extra', question: 'Mais algum detalhe? (valores exatos, interações, o que evitar)', allowNotes: true, options: [] },
    ],
  }));
  assert.equal(plan.questions.length, 3);
  assert.deepEqual(runPlanGate(plan), []);
});

test('the free-text slot still needs a way to be answered', () => {
  const plan = normalizeNtPlan(planPayload({
    known: {},
    questions: [{ field: 'extra', question: 'Mais algo?', allowNotes: false, options: [] }],
  }));
  assert.deepEqual(runPlanGate(plan).map(issue => issue.code), ['question_unanswerable']);
});

test('a decided displayName asked with an EMPTY option list is rejected', () => {
  // identity is always asked, so the proposal has to come pre-selected
  const plan = normalizeNtPlan(planPayload({
    known: { displayName: 'Brutalismo' },
    questions: [{ field: 'displayName', question: 'Nome de exibição?', allowNotes: true, options: [] }],
  }));
  assert.deepEqual(runPlanGate(plan).map(issue => issue.code), ['question_not_preselected']);

  const preselected = normalizeNtPlan(planPayload({
    known: { displayName: 'Brutalismo' },
    questions: [{
      field: 'displayName',
      question: 'Nome de exibição?',
      allowNotes: true,
      options: [{ id: 'Brutalismo', label: 'Brutalismo', recommended: true }],
    }],
  }));
  assert.deepEqual(runPlanGate(preselected), []);
});
