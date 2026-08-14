import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNs4ModuleArtifact,
  createNs4Pipeline,
  markNs4E1Approved,
  markNs4E2Approved,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4E3Approved,
  markNs4E3Failed,
  markNs4E3Running,
  markNs4E3WaitingHuman,
  markNs4ModuleE2Approved,
  markNs4ModuleE3Approved,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import {
  buildNs4AccessMatrixArtifact,
  normalizeNs4E3Review,
} from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { validateNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/gate.js';
import { resolveNs4E3HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e3/hookArgs.js';

const journeys = normalizeNs4E2Review({
  planId: 'e2-review', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', title: 'Jornadas', reviewRound: 1,
  journeys: [{
    journeyId: 'manageProjects',
    business: {
      actorRef: 'projectManager', title: 'Gerenciar projetos', goal: 'Acompanhar projetos.', entry: { mode: 'coldStart' },
      steps: [{
        stepId: 'selectProject', kind: 'locate', entity: 'Project', title: 'Selecionar projeto.', description: 'Projeto selecionado.', featureRefs: ['projectManagement'],
      }],
      outcome: { statement: 'Projeto disponível.', evidence: ['Projeto identificado.'] }, useRules: [],
    },
  }],
  features: [{ featureId: 'projectManagement', title: 'Projetos', priority: 'now', journeyStepRefs: ['manageProjects.selectProject'] }],
});

const reviewInput = {
  planId: 'e3-access-review', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', title: 'Matriz de acesso', reviewRound: 1,
  profiles: [
    { profileId: 'projectManager', title: 'Gerente', kind: 'internal', description: 'Responsável por projetos.', actorRefs: ['projectManager'], landingIntent: 'Acompanhar projetos ativos.' },
    { profileId: 'client', title: 'Cliente', kind: 'external', description: 'Cliente relacionado aos projetos.', actorRefs: [], landingIntent: 'Consultar informações publicadas.' },
  ],
  authorities: [
    { authorityRef: 'project:mrk', title: 'Consultar projetos', description: 'Selecionar e acompanhar projetos.', journeyStepRefs: ['manageProjects.selectProject'], informationNeeds: [] },
    { authorityRef: 'billing:mrk', title: 'Consultar orçamento publicado', description: 'Consultar resumo liberado ao cliente.', journeyStepRefs: [], informationNeeds: ['Resumo do orçamento publicado'] },
  ],
  grants: [
    {
      profileRef: 'projectManager', authorityRef: 'project:mrk', reason: 'Gerencia os projetos.',
      dataScope: { mode: 'organization', description: 'Projetos da organização.' },
      disclosure: { mode: 'fullRecord', description: 'Registro operacional do projeto.', allowedInformation: [], deniedInformation: [] }, useRules: [],
    },
    {
      profileRef: 'client', authorityRef: 'billing:mrk', reason: 'Acompanha valores publicados.',
      dataScope: { mode: 'related', description: 'Somente projetos associados ao cliente.' },
      disclosure: { mode: 'summaryOnly', description: 'Resumo sem acesso ao projeto completo.', allowedInformation: ['Nome público', 'Orçamento publicado'], deniedInformation: ['Margem interna'] },
      useRules: ['clientProjectAssociationRequired'],
    },
  ],
  changeSummary: ['Proposta inicial.'],
};

test('E3 preserves hook args byte-for-byte for prompt_ready matching', () => {
  const original = '{"planId":"e3-access-matrix","reviewRound":3}';
  assert.equal(resolveNs4E3HookArgs(undefined, original), original);
  assert.equal(resolveNs4E3HookArgs(original, '{"different":true}'), original);
});

test('E3 accepts a complete matrix with a limited external information view', () => {
  const review = normalizeNs4E3Review(reviewInput);
  assert.deepEqual(validateNs4E3Review(review, journeys), { ok: true, issues: [] });
});

test('E3 rejects authorities outside the collab-auth domain:code convention', () => {
  const broken = structuredClone(reviewInput);
  broken.authorities[0].authorityRef = 'Project.Read';
  broken.grants[0].authorityRef = 'Project.Read';
  const result = validateNs4E3Review(normalizeNs4E3Review(broken), journeys);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E3_AUTHORITY_FORMAT'));
});

test('E3 rejects organization-wide grants for external profiles', () => {
  const broken = structuredClone(reviewInput);
  broken.grants[1].dataScope.mode = 'organization';
  const result = validateNs4E3Review(normalizeNs4E3Review(broken), journeys);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E3_EXTERNAL_ORGANIZATION_SCOPE'));
});

test('E3 limited disclosure must enumerate allowed information', () => {
  const broken = structuredClone(reviewInput);
  broken.grants[1].disclosure.allowedInformation = [];
  const result = validateNs4E3Review(normalizeNs4E3Review(broken), journeys);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E3_LIMITED_DISCLOSURE'));
});

test('E3 protects every step used by a now feature', () => {
  const broken = structuredClone(reviewInput);
  broken.authorities[0].journeyStepRefs = [];
  broken.authorities[0].informationNeeds = ['Generic project information'];
  const result = validateNs4E3Review(normalizeNs4E3Review(broken), journeys);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E3_NOW_STEP_COVERAGE'));
});

test('E3 artifact freezes the approved access contract with a stable hash', async () => {
  const review = normalizeNs4E3Review(reviewInput);
  const first = await buildNs4AccessMatrixArtifact(review, 'human', '2026-08-05T12:00:00.000Z');
  const second = await buildNs4AccessMatrixArtifact(review, 'auto', '2026-08-05T12:01:00.000Z');
  assert.match(first.accessHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(first.accessHash, second.accessHash);
  assert.equal(first.realization.compiledFromAccessHash, first.accessHash);
});

test('E3 lifecycle persists rounds, failures and advances module and pipeline to E4 ontology', () => {
  const clarification = {
    planId: 'e1-clarification', userLanguage: 'pt-BR', title: 'E1', legends: [],
    questions: {
      moduleName: { type: 'open', question: 'Nome?', answer: 'buildFlowFsm' },
      productLanguages: { type: 'open', question: 'Idiomas?', answer: 'pt-BR' },
      mainActors: { type: 'open', question: 'Atores?', answer: 'Gerentes e clientes' },
      mainGoal: { type: 'open', question: 'Objetivo?', answer: 'Gerenciar obras.' },
      boundaries: { type: 'open', question: 'Limites?', answer: 'Sem ERP.' },
    },
  };
  const initialModule = buildNs4ModuleArtifact('buildFlowFsm', clarification, 'human', '2026-08-05T10:00:00.000Z');
  const e2Module = markNs4ModuleE2Approved(initialModule, 'human', '2026-08-05T10:01:00.000Z');
  const e3Module = markNs4ModuleE3Approved(e2Module, 'human', '2026-08-05T10:02:00.000Z');
  assert.equal(e3Module.specStatus.nextStep, 'e4-ontology');
  assert.equal(e3Module.specStatus.completedSteps.at(-1)?.stepId, 'e3-access-matrix');

  const e1 = markNs4E1Approved(createNs4Pipeline('buildFlowFsm', 'prompt'), 'human', 'l4/buildFlowFsm/module.defs.ts');
  const e2 = markNs4E2Approved(markNs4E2WaitingHuman(markNs4E2Running(e1, 1), 1, 'e2.json'), 'human', ['journey.ts']);
  assert.equal(resolveNs4ExistingAction(true, e2, true), 'resume-e3');
  const running = markNs4E3Running(e2, 2);
  const waiting = markNs4E3WaitingHuman(running, 2, 'l4/buildFlowFsm/pipeline/e3-access-matrix.draft.json');
  assert.equal(waiting.steps.e3?.status, 'waitingHuman');
  const failed = markNs4E3Failed(waiting, 'provider timeout', '2026-08-05T10:03:00.000Z');
  assert.equal(failed.steps.e3?.error, 'provider timeout');
  const approved = markNs4E3Approved(waiting, 'human', 'l4/buildFlowFsm/access/access-matrix.defs.ts');
  assert.equal(approved.nextStep, 'e4-ontology');
  assert.equal(approved.steps.e3?.reviewRound, 2);
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e4');
  assert.equal(markNs4E3Running(approved, 3), approved);
  assert.equal(markNs4E3WaitingHuman(approved, 3, 'late-draft.json'), approved);
  assert.equal(markNs4E3Failed(approved, 'late duplicate callback'), approved);
});
