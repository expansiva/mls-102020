import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  buildNs4ModuleArtifact,
  createNs4E3GateRepairStep,
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
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';
import {
  buildNs4AccessMatrixArtifact,
  normalizeNs4E3Review,
} from '/_102020_/l2/agentNewSolution/steps/e3/contracts.js';
import { validateNs4E3Review } from '/_102020_/l2/agentNewSolution/steps/e3/gate.js';
import { resolveNs4E3HookArgs } from '/_102020_/l2/agentNewSolution/steps/e3/hookArgs.js';
import {
  ns4E3DuplicateGrantPayload,
  ns4E3PetShopJourneysInput,
  ns4E3RepairedGrantPayload,
} from '/_102020_/l2/agentNewSolution/steps/e3/fixtures/duplicateGrant.fixture.js';

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

const listaAssinaturaE2 = JSON.parse(readFileSync(new URL('../e2/fixtures/listaAssinatura-e2-twins.json', import.meta.url), 'utf8'));
const listaAssinaturaE3 = JSON.parse(readFileSync(new URL('fixtures/listaAssinatura-e3-twins.json', import.meta.url), 'utf8'));
const petShopDistinctActors = JSON.parse(readFileSync(new URL('../e2/fixtures/petShop-distinct-actors.json', import.meta.url), 'utf8'));

test('E3 flags listaAssinatura twin sign journeys that grant the same access to different personas', () => {
  const result = validateNs4E3Review(normalizeNs4E3Review(listaAssinaturaE3), normalizeNs4E2Review(listaAssinaturaE2));
  const twins = result.issues.filter(issue => issue.code === 'NS4_E3_TWIN_JOURNEYS');
  assert.ok(twins.length >= 1, result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
  const message = twins.map(issue => issue.message).join(' ');
  assert.match(message, /signPetitionAsMorador/);
  assert.match(message, /signPetitionAsResponsavelJovem/);
  assert.doesNotMatch(message, /exportPetitionSignatures/);
  assert.doesNotMatch(message, /administradorCondominio/);
});

test('E3 keeps petShop admin and cliente — distinct operations and distinct access', () => {
  const matrix = {
    planId: 'e3-access-review',
    moduleName: 'petShop',
    userLanguage: 'pt-BR',
    title: 'Matriz',
    reviewRound: 1,
    profiles: [
      { profileId: 'admin', title: 'Admin', kind: 'internal', description: 'Loja.', actorRefs: ['admin'], landingIntent: 'Operar.' },
      { profileId: 'cliente', title: 'Cliente', kind: 'external', description: 'Dono do pet.', actorRefs: ['cliente'], landingIntent: 'Agendar.' },
    ],
    authorities: [
      { authorityRef: 'petshop:admin', title: 'Operar', description: 'Agenda da loja.', journeyStepRefs: ['approveServiceAppointment.locatePendingServiceAppointment', 'approveServiceAppointment.approveServiceAppointment'], informationNeeds: [] },
      { authorityRef: 'petshop:cliente', title: 'Agendar', description: 'Pedido do cliente.', journeyStepRefs: ['requestServiceAppointment.locatePet', 'requestServiceAppointment.createServiceAppointment'], informationNeeds: [] },
    ],
    grants: [
      {
        profileRef: 'admin', authorityRef: 'petshop:admin', reason: 'Opera a loja.',
        dataScope: { mode: 'organization', description: 'Toda a agenda.' },
        disclosure: { mode: 'fullRecord', description: 'Registro operacional.', allowedInformation: [], deniedInformation: [] }, useRules: [],
      },
      {
        profileRef: 'cliente', authorityRef: 'petshop:cliente', reason: 'Pede horário.',
        dataScope: { mode: 'own', description: 'Somente os próprios pets.' },
        disclosure: { mode: 'fullRecord', description: 'Registros do cliente.', allowedInformation: [], deniedInformation: [] }, useRules: [],
      },
    ],
    changeSummary: ['Inicial.'],
  };
  const result = validateNs4E3Review(normalizeNs4E3Review(matrix), normalizeNs4E2Review(petShopDistinctActors));
  assert.equal(result.ok, true, result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
});

test('E3 does not collapse actors whose grants differ in data scope on the same operations', () => {
  const twinOps = structuredClone(listaAssinaturaE2);
  twinOps.journeys = twinOps.journeys.filter((journey: { journeyId: string }) => journey.journeyId !== 'exportPetitionSignatures');
  twinOps.journeys[0].business.actorRef = 'owner';
  twinOps.journeys[1].business.actorRef = 'manager';
  twinOps.journeys = twinOps.journeys.slice(0, 2);
  const matrix = {
    planId: 'e3-access-review',
    moduleName: 'listaAssinatura',
    userLanguage: 'pt-BR',
    title: 'Matriz',
    reviewRound: 1,
    profiles: [
      { profileId: 'owner', title: 'Dono', kind: 'internal', description: 'Vê os seus.', actorRefs: ['owner'], landingIntent: 'Assinar a própria.' },
      { profileId: 'manager', title: 'Gestor', kind: 'internal', description: 'Vê todas.', actorRefs: ['manager'], landingIntent: 'Acompanhar todas.' },
    ],
    authorities: [
      { authorityRef: 'listaassinatura:assinar-peticao', title: 'Assinar', description: 'Registrar assinatura.', journeyStepRefs: ['signPetitionAsMorador.registerPetitionSignature', 'signPetitionAsResponsavelJovem.registerPetitionSignature'], informationNeeds: [] },
    ],
    grants: [
      {
        profileRef: 'owner', authorityRef: 'listaassinatura:assinar-peticao', reason: 'Assina a própria.',
        dataScope: { mode: 'own', description: 'Somente a própria assinatura.' },
        disclosure: { mode: 'fieldsOnly', description: 'Dados da própria assinatura.', allowedInformation: ['CPF'], deniedInformation: [] }, useRules: [],
      },
      {
        profileRef: 'manager', authorityRef: 'listaassinatura:assinar-peticao', reason: 'Vê todas as assinaturas.',
        dataScope: { mode: 'organization', description: 'Todas as assinaturas.' },
        disclosure: { mode: 'fieldsOnly', description: 'Relação completa.', allowedInformation: ['CPF', 'Nome'], deniedInformation: [] }, useRules: [],
      },
    ],
    changeSummary: ['Escopos distintos.'],
  };
  const result = validateNs4E3Review(normalizeNs4E3Review(matrix), normalizeNs4E2Review(twinOps));
  assert.equal(result.issues.some(issue => issue.code === 'NS4_E3_TWIN_JOURNEYS'), false, result.issues.map(issue => `${issue.code}: ${issue.message}`).join('\n'));
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
  const waiting = markNs4E3WaitingHuman(running, 2, 'l4/buildFlowFsm/pipeline/e3-access-matrix-draft.json');
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

const petShopJourneys = normalizeNs4E2Review(ns4E3PetShopJourneysInput);

// ── Regression: petShop run of 2026-08-21 ────────────────────────────────────
// The model split ONE profile x authority pair into three grants, one per access
// facet. The gate was right; what was missing was a repair round.

test('E3 rejects the real petShop matrix that split one pair into three grants', () => {
  const review = normalizeNs4E3Review(ns4E3DuplicateGrantPayload, 'petShop');
  const result = validateNs4E3Review(review, petShopJourneys);
  assert.equal(result.ok, false);
  const duplicates = result.issues.filter(issue => issue.code === 'NS4_E3_DUPLICATE_GRANT');
  assert.equal(duplicates.length, 2, 'the second and third grant of the pair are both reported');
  assert.deepEqual(duplicates.map(issue => issue.path), ['grants[2]', 'grants[3]']);
  duplicates.forEach(issue => assert.match(issue.message, /cliente and petshop:cliente/));
});

test('E3 accepts the repaired matrix that keeps one grant per pair', () => {
  const review = normalizeNs4E3Review(ns4E3RepairedGrantPayload, 'petShop');
  const result = validateNs4E3Review(review, petShopJourneys);
  assert.equal(result.ok, true, result.issues.map(issue => `${issue.code} ${issue.path}: ${issue.message}`).join('\n'));
  const pairs = review.grants.map(grant => `${grant.profileRef}/${grant.authorityRef}`);
  assert.equal(new Set(pairs).size, pairs.length, 'every pair appears at most once');
  // The facets survived the fold: they became disclosure limits, not deletions.
  const cliente = review.grants.find(grant => grant.profileRef === 'cliente');
  assert.ok((cliente?.disclosure.allowedInformation.length || 0) >= 3);
});

test('E3 creates one open gate repair step carrying the numbered findings', () => {
  const step = createNs4E3GateRepairStep('petShop', 1, 1, 'NS4_E3_DUPLICATE_GRANT grants[2]: Duplicate grant.');
  assert.equal(step.planning?.planId, 'e3-access-matrix-round-1-gate-repair-1');
  assert.equal(step.status, 'waiting_human_input');
  assert.equal(step.onFailure, 'wait_after_prompt');
  assert.doesNotMatch(String(step.stepTitle), /^👤/u);
  // The args must round-trip both fields: without gateFeedback the repair prompt
  // is a plain retry, and without gateRepairAttempt the bounded round never ends.
  assert.deepEqual(JSON.parse(step.prompt || '{}'), {
    planId: 'e3-access-matrix', moduleName: 'petShop', reviewRound: 1,
    gateRepairAttempt: 1, gateFeedback: 'NS4_E3_DUPLICATE_GRANT grants[2]: Duplicate grant.',
  });
  assert.equal(resolveNs4E3HookArgs(undefined, step.prompt), step.prompt);
});
