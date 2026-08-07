import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNs4ModuleArtifact,
  createNs4E2GateRepairStep,
  createNs4Pipeline,
  markNs4E1Approved,
  markNs4E2Approved,
  markNs4E2Failed,
  markNs4E2Running,
  markNs4E2WaitingHuman,
  markNs4ModuleE2Approved,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import {
  buildNs4JourneyArtifacts,
  normalizeNs4E2Review,
  sha256Ns4,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';
import { resolveNs4E2HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e2/hookArgs.js';

const reviewInput = {
  planId: 'e2-review', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', title: 'Revisar jornadas', reviewRound: 1,
  journeys: [
    {
      journeyId: 'manageProjects',
      business: {
        actorRef: 'projectManager', title: 'Gerenciar projetos', goal: 'Localizar e acompanhar projetos.', prerequisites: [],
        entry: { mode: 'coldStart', carries: [] },
        steps: [{
          stepId: 'selectProject', kind: 'locate', intent: 'Localizar um projeto pelo nome ou endereço.', requiresContext: [],
          providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto selecionado.' }],
          result: 'Um projeto está selecionado.', featureRefs: ['projectManagement'],
        }],
        outcome: { statement: 'O projeto correto fica disponível para trabalho.', evidence: ['O projeto é mostrado pelo nome e endereço.'] },
        businessRules: [],
      },
    },
    {
      journeyId: 'manageProjectChangeOrder',
      business: {
        actorRef: 'projectManager', title: 'Criar ordem de mudança', goal: 'Registrar uma mudança no projeto.',
        prerequisites: [{ journeyRef: 'manageProjects', reason: 'A ordem pertence a um projeto.', required: false, providesContext: ['selectedProject'] }],
        entry: {
          mode: 'contextOrLookup', preferredFromJourneyRef: 'manageProjects',
          carries: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto da mudança.', stateRequirement: 'active' }],
        },
        steps: [
          {
            stepId: 'locateProject', kind: 'locate', intent: 'Manter ou localizar o projeto ativo.', requiresContext: [],
            providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto recebido ou localizado.' }],
            result: 'Um projeto ativo está selecionado.', featureRefs: ['changeOrderManagement'],
          },
          {
            stepId: 'captureChangeOrder', kind: 'act', intent: 'Informar a mudança.', requiresContext: ['selectedProject'],
            providesContext: [{ contextId: 'createdChangeOrder', businessObject: 'ChangeOrder', cardinality: 'one', required: true, description: 'Ordem criada.' }],
            result: 'A ordem fica vinculada ao projeto.', featureRefs: ['changeOrderManagement'],
          },
        ],
        outcome: { statement: 'A mudança fica registrada no projeto correto.', evidence: ['A ordem exibe o projeto selecionado.'] },
        businessRules: [{ journeyRuleId: 'jrProjectMustBeActive', statement: 'A ordem só pode ser criada para projeto ativo.' }],
      },
    },
  ],
  features: [
    { featureId: 'projectManagement', title: 'Projetos', priority: 'now', journeyStepRefs: ['manageProjects.selectProject'] },
    { featureId: 'changeOrderManagement', title: 'Ordens de mudança', priority: 'now', journeyStepRefs: ['manageProjectChangeOrder.captureChangeOrder'] },
  ],
};

test('E2 preserves the exact hook args used to match prompt_ready', () => {
  const original = '{"planId":"e2-journeys","reviewRound":1}';
  assert.equal(resolveNs4E2HookArgs(undefined, original), original);
  assert.equal(resolveNs4E2HookArgs(original, '{"different":true}'), original);
});

test('E2 accepts connected contextOrLookup journeys', () => {
  const review = normalizeNs4E2Review(reviewInput);
  assert.deepEqual(validateNs4E2Review(review), { ok: true, issues: [] });
});

test('E2 rejects a context consumed before it is carried or produced', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[1].business.steps[1].requiresContext = ['missingProject'];
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_CONTEXT_ORDER'));
});

test('E2 rejects invented step kinds instead of silently normalizing them', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[0].business.steps[0].kind = 'review';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_STEP_KIND'));
});

test('E2 creates one open repair step with deterministic gate feedback', () => {
  const step = createNs4E2GateRepairStep('buildFlowFsm', 2, 1, 0, 'NS4_E2_STEP_KIND journeys[0]');
  assert.equal(step.planning?.planId, 'e2-journeys-round-2-coverage-0-gate-repair-1');
  assert.equal(step.status, 'waiting_human_input');
  assert.equal(step.onFailure, 'wait_after_prompt');
  assert.deepEqual(JSON.parse(step.prompt || '{}'), {
    planId: 'e2-journeys', moduleName: 'buildFlowFsm', reviewRound: 2,
    gateRepairAttempt: 1, coverageRepairAttempt: 0,
    gateFeedback: 'NS4_E2_STEP_KIND journeys[0]',
  });
});

test('E2 rejects business text that asks for a raw technical id', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[1].business.steps[1].intent = 'Pedir o project id e registrar a mudança.';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_RAW_TECHNICAL_ID'));
});

test('E2 rejects a prerequisite that renames context across the journey handoff', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[0].business.steps[0].providesContext[0].contextId = 'createdProject';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_PREREQUISITE_HANDOFF'));
});

test('E2 contextOrLookup requires an explicit fallback locate output', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[1].business.steps[0].providesContext = [];
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_LOOKUP_FALLBACK'));
});

test('E2 allows a stable context to be refreshed but rejects a different business object', () => {
  const refreshed = structuredClone(reviewInput);
  refreshed.journeys[1].business.steps[1].providesContext.push({
    contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one' as const,
    required: true, description: 'Projeto mantido após registrar a ordem.',
  });
  assert.equal(validateNs4E2Review(normalizeNs4E2Review(refreshed)).ok, true);

  refreshed.journeys[1].business.steps[1].providesContext[1].businessObject = 'Client';
  const result = validateNs4E2Review(normalizeNs4E2Review(refreshed));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_CONTEXT_OBJECT_CONFLICT'));
});

test('business hash is stable across object key order', async () => {
  assert.equal(await sha256Ns4({ b: 2, a: 1 }), await sha256Ns4({ a: 1, b: 2 }));
  const artifacts = await buildNs4JourneyArtifacts(normalizeNs4E2Review(reviewInput));
  assert.equal(artifacts.length, 2);
  assert.match(artifacts[0].businessHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(artifacts[0].realization.compiledFromBusinessHash, artifacts[0].businessHash);
});

test('E2 approval advances both pipeline and module to the E3 access matrix', () => {
  const e1Clarification = {
    planId: 'e1-clarification', userLanguage: 'pt-BR', title: 'E1', legends: [],
    questions: {
      moduleName: { type: 'open', question: 'Nome?', answer: 'buildFlowFsm' },
      mainActors: { type: 'open', question: 'Atores?', answer: 'Gerentes' },
      mainGoal: { type: 'open', question: 'Objetivo?', answer: 'Gerenciar obras.' },
      boundaries: { type: 'open', question: 'Limites?', answer: 'Sem ERP.' },
    },
  };
  const moduleArtifact = buildNs4ModuleArtifact('buildFlowFsm', e1Clarification, 'human', '2026-08-04T10:00:00.000Z');
  const e2Module = markNs4ModuleE2Approved(moduleArtifact, 'human', '2026-08-04T10:05:00.000Z');
  assert.equal(e2Module.specStatus.nextStep, 'e3-access-matrix');
  assert.equal(e2Module.specStatus.completedSteps[1].stepId, 'e2-journeys');

  const e1Pipeline = markNs4E1Approved(createNs4Pipeline('buildFlowFsm', 'prompt'), 'human', 'l4/buildFlowFsm/module.defs.ts');
  const running = markNs4E2Running(e1Pipeline, 1);
  const waiting = markNs4E2WaitingHuman(running, 1, 'l4/buildFlowFsm/pipeline/e2-journeys.draft.json');
  const approved = markNs4E2Approved(waiting, 'human', ['l4/buildFlowFsm/journeys/manageProjects.defs.ts']);
  assert.equal(approved.steps.e2?.status, 'approved');
  assert.equal(approved.nextStep, 'e3-access-matrix');
  assert.equal(markNs4E2Running(approved, 2), approved);
  assert.equal(markNs4E2WaitingHuman(approved, 2, 'late-draft.json'), approved);
  assert.equal(markNs4E2Failed(approved, 'late duplicate callback'), approved);
});
