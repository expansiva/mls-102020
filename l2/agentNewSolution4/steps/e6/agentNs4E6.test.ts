import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildNs4ModuleArtifact, createNs4Pipeline, markNs4E5Approved, markNs4E6Approved,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  buildNs4CompositionArtifact, normalizeNs4E6Review,
} from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';
import { validateNs4E6Review } from '/_102020_/l2/agentNewSolution4/steps/e6/gate.js';

const clarification = {
  planId: 'e1-clarification', userLanguage: 'pt-BR', title: 'Inicial', legends: [], questions: {
    moduleName: { type: 'open', question: 'Módulo?', answer: 'buildFlowFsm' },
    productLanguages: { type: 'open', question: 'Idiomas?', answer: 'pt-BR' },
    mainActors: { type: 'open', question: 'Atores?', answer: 'Gerente' },
    mainGoal: { type: 'open', question: 'Objetivo?', answer: 'Gerenciar projetos' },
    boundaries: { type: 'open', question: 'Limites?', answer: 'Sem contabilidade' },
  },
};
const module = buildNs4ModuleArtifact('Gerenciar projetos', clarification, 'auto', '2026-08-09T00:00:00.000Z');

test('E6 accepts a concise empty composition proposal', async () => {
  const review = normalizeNs4E6Review({
    planId: 'e6-composition-review', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR',
    title: 'Módulos adicionais e plugins', reviewRound: 1,
    analysisSummary: 'O módulo pode seguir sem componentes adicionais.', recommendations: [], changeSummary: ['Análise inicial.'],
  });
  assert.deepEqual(validateNs4E6Review(review, module), { ok: true, issues: [] });
  const artifact = await buildNs4CompositionArtifact(review, 'human', '2026-08-09T01:00:00.000Z');
  assert.deepEqual(artifact.recommendations, []);
  assert.equal(artifact.realization.status, 'pending');
});

test('E6 validates recommendation identity, kind and decision mechanically', () => {
  const review = normalizeNs4E6Review({ moduleName: 'buildFlowFsm', analysisSummary: 'Review.', recommendations: [{
    id: 'Payment Module', kind: 'service', title: '', purpose: '', decision: 'maybe',
  }] });
  const result = validateNs4E6Review(review, module);
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E6_ID'));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E6_KIND'));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E6_DECISION'));
});

test('current-flow E5 modules resume E6 and approved E6 modules resume E7', () => {
  const e1 = createNs4Pipeline('buildFlowFsm', 'Gerenciar projetos', '2026-08-09T00:00:00.000Z');
  const e5 = markNs4E5Approved(e1, 'human', ['l4/buildFlowFsm/rules/rules.defs.ts']);
  assert.equal(resolveNs4ExistingAction(true, e5, true), 'resume-e6');
  const e6 = markNs4E6Approved(e5, 'human', ['l4/buildFlowFsm/composition/additional-capabilities.defs.ts']);
  assert.equal(e6.nextStep, 'e7-realization');
  assert.equal(resolveNs4ExistingAction(true, e6, true), 'resume-e7');
});
