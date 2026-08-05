import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNs4ModuleArtifact,
  createNs4ClarificationSubmitGuard,
  createNs4Pipeline,
  markNs4E1Approved,
  normalizeNs4Languages,
  normalizeNs4ModuleName,
  parseNs4Invocation,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution4/steps/e1/gate.js';

const clarification = {
  planId: 'e1-clarification',
  userLanguage: 'pt-BR',
  title: 'Esclarecimento inicial',
  legends: [],
  questions: {
    moduleName: { type: 'open', question: 'Nome?', answer: 'petShop' },
    productLanguages: { type: 'open', question: 'Idiomas?', answer: 'pt-br, en, es' },
    mainActors: { type: 'open', question: 'Atores?', answer: 'Clientes e atendentes' },
    mainGoal: { type: 'open', question: 'Objetivo?', answer: 'Gerenciar reservas e vendas do pet shop.' },
    boundaries: { type: 'open', question: 'Limites?', answer: 'Sem prontuário veterinário.' },
  },
};

test('E1 builds a valid partial permanent module contract', () => {
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-04T10:00:00.000Z');
  assert.equal(validateNs4E1Module(artifact).ok, true);
  assert.equal(artifact.module.moduleName, 'petShop');
  assert.deepEqual(artifact.module.languages, ['pt-BR', 'en', 'es']);
  assert.equal(artifact.specStatus.completedSteps[0].status, 'approved');
  assert.equal(artifact.specStatus.nextStep, 'e2-journeys');
  assert.equal(artifact.specStatus.artifactCompleteness, 'partial');
});

test('product languages are normalized, ordered and deduplicated independently of widget language', () => {
  assert.deepEqual(normalizeNs4Languages('pt-br, EN; es, pt-BR'), ['pt-BR', 'en', 'es']);
  assert.deepEqual(normalizeNs4Languages('', 'pt-br'), ['pt-BR']);
});

test('/fast is a standalone flag and is removed from the business prompt', () => {
  assert.deepEqual(parseNs4Invocation('petShop /fast'), { fast: true, prompt: 'petShop' });
  assert.deepEqual(parseNs4Invocation('/fastlane petShop'), { fast: false, prompt: '/fastlane petShop' });
});

test('interactive clarification accepts only its first submit', () => {
  const acceptSubmit = createNs4ClarificationSubmitGuard();
  assert.equal(acceptSubmit(), true);
  assert.equal(acceptSubmit(), false);
  assert.equal(acceptSubmit(), false);
});

test('module names normalize deterministically', () => {
  assert.equal(normalizeNs4ModuleName('Pet Shop Brasil'), 'petShopBrasil');
  assert.equal(normalizeNs4ModuleName('gestão-de-obras'), 'gestaoDeObras');
});

test('resume is allowed only for a pipeline owned by agentNewSolution4', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z');
  const approved = markNs4E1Approved(running, 'auto', 'l4/petShop/module.defs.ts', '2026-08-04T10:01:00.000Z');
  assert.equal(resolveNs4ExistingAction(false, null, false), 'new');
  assert.equal(resolveNs4ExistingAction(true, null, false), 'collision');
  assert.equal(resolveNs4ExistingAction(true, { flowId: 'agentNewSolution' }, true), 'collision');
  assert.equal(resolveNs4ExistingAction(true, running, false), 'resume-e1');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-next');
  assert.equal(resolveNs4ExistingAction(true, approved, false), 'resume-e1');
});
