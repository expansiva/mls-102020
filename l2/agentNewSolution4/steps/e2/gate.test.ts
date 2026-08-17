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
  buildNs4E2ImpactReport,
  buildNs4PolicyDecisionSelections,
  normalizeNs4E2Review,
  sha256Ns4,
} from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { collectNs4DemotedJourneyIds } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { analyzeNs4E2MechanicalCoverage } from '/_102020_/l2/agentNewSolution4/steps/e2/coverageSignals.js';
import { validateNs4E2PolicySelections, validateNs4E2Review } from '/_102020_/l2/agentNewSolution4/steps/e2/gate.js';
import { resolveNs4E2HookArgs } from '/_102020_/l2/agentNewSolution4/steps/e2/hookArgs.js';

const reviewInput = {
  planId: 'e2-review', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', title: 'Revisar jornadas', reviewRound: 1,
  journeys: [
    {
      journeyId: 'manageProjects',
      business: {
        actorRef: 'projectManager', title: 'Gerenciar projetos', goal: 'Localizar e acompanhar projetos.',
        entry: { mode: 'coldStart' },
        steps: [{
          stepId: 'selectProject', kind: 'locate', entity: 'Project',
          title: 'Localizar um projeto pelo nome ou endereço.',
          description: 'Um projeto está selecionado.', featureRefs: ['projectManagement'],
        }],
        outcome: { statement: 'O projeto correto fica disponível para trabalho.', evidence: ['O projeto é mostrado pelo nome e endereço.'] },
        useRules: [], policyDecisions: [],
      },
    },
    {
      journeyId: 'manageProjectChangeOrder',
      business: {
        actorRef: 'projectManager', title: 'Criar ordem de mudança', goal: 'Registrar uma mudança no projeto.',
        entry: { mode: 'contextOrLookup', preferredFromJourneyRef: 'manageProjects' },
        steps: [
          {
            stepId: 'locateProject', kind: 'locate', entity: 'Project',
            title: 'Manter ou localizar o projeto ativo.',
            description: 'Um projeto ativo está selecionado.', featureRefs: ['changeOrderManagement'],
          },
          {
            stepId: 'captureChangeOrder', kind: 'act', entity: 'ChangeOrder',
            title: 'Informar a mudança.',
            description: 'A ordem fica vinculada ao projeto.', featureRefs: ['changeOrderManagement'],
          },
        ],
        outcome: { statement: 'A mudança fica registrada no projeto correto.', evidence: ['A ordem exibe o projeto selecionado.'] },
        useRules: ['projectMustBeActive'], policyDecisions: [],
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
  assert.doesNotMatch(String(step.stepTitle), /^👤/u);
  assert.deepEqual(JSON.parse(step.prompt || '{}'), {
    planId: 'e2-journeys', moduleName: 'buildFlowFsm', reviewRound: 2,
    gateRepairAttempt: 1, coverageRepairAttempt: 0,
    gateFeedback: 'NS4_E2_STEP_KIND journeys[0]',
  });
});

test('E2 preserves policy selections when the honor gate requests its bounded repair', () => {
  const selections = [{ decisionId: 'changeOrderDecisionMode', selectedChoice: 'Proposal with approval or rejection.' }];
  const step = createNs4E2GateRepairStep('buildFlowFsm', 2, 1, 0, 'Honor the human policy choice.', undefined, [], selections);
  assert.deepEqual(JSON.parse(step.prompt || '{}').policyDecisionSelections, selections);
});

test('E2 rejects business text that asks for a raw technical id', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[1].business.steps[1].title = 'Pedir o project id e registrar a mudança.';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_RAW_TECHNICAL_ID'));
});

test('E2 requires a stable PascalCase entity on every step', () => {
  const missing = structuredClone(reviewInput);
  (missing.journeys[0].business.steps[0] as { entity: string }).entity = '';
  assert.ok(validateNs4E2Review(normalizeNs4E2Review(missing)).issues.some(issue => issue.code === 'NS4_E2_STEP_ENTITY'));

  const label = structuredClone(reviewInput);
  label.journeys[0].business.steps[0].entity = 'projeto ativo';
  const normalized = normalizeNs4E2Review(label);
  assert.equal(normalized.journeys[0].business.steps[0].entity, 'ProjetoAtivo');
});

test('E2 contextOrLookup requires an explicit locate fallback step', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[1].business.steps[0].kind = 'inspect';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_LOOKUP_FALLBACK'));
});

test('E2 accepts a handoff that names its receiving profile and rejects it elsewhere', () => {
  const handoff: any = structuredClone(reviewInput);
  handoff.journeys[1].business.steps[1] = {
    stepId: 'notifyClient', kind: 'handoff', entity: 'ChangeOrder', targetProfile: 'clientPortal',
    title: 'Avisar o cliente sobre a mudança.', description: 'O cliente recebe o aviso da mudança.',
    featureRefs: ['changeOrderManagement'],
  };
  handoff.features[1].journeyStepRefs = ['manageProjectChangeOrder.notifyClient'];
  assert.deepEqual(validateNs4E2Review(normalizeNs4E2Review(handoff)), { ok: true, issues: [] });

  handoff.journeys[1].business.steps[1].kind = 'act';
  assert.ok(validateNs4E2Review(normalizeNs4E2Review(handoff)).issues
    .some(issue => issue.code === 'NS4_E2_STEP_TARGET_PROFILE'));
});

test('E2 keeps a preferred origin journey earlier than the journey that names it', () => {
  const broken = structuredClone(reviewInput);
  broken.journeys[0].business.entry.preferredFromJourneyRef = 'manageProjectChangeOrder';
  const result = validateNs4E2Review(normalizeNs4E2Review(broken));
  assert.equal(result.ok, false);
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E2_PREFERRED_ORDER'));
});

test('business hash is stable across object key order', async () => {
  assert.equal(await sha256Ns4({ b: 2, a: 1 }), await sha256Ns4({ a: 1, b: 2 }));
  const artifacts = await buildNs4JourneyArtifacts(normalizeNs4E2Review(reviewInput));
  assert.equal(artifacts.length, 2);
  assert.match(artifacts[0].businessHash, /^sha256:[a-f0-9]{64}$/);
  assert.equal(artifacts[0].realization.compiledFromBusinessHash, artifacts[0].businessHash);
});

test('E2 policy selections are valid alternatives and a rewritten draft must honor them', () => {
  const input: any = structuredClone(reviewInput);
  input.journeys[1].policyDecisions = [{
    decisionId: 'changeOrderDecisionMode',
    question: 'Como a mudança é decidida?',
    chosen: 'Decisão direta pelo gerente.',
    alternatives: ['Proposta com aprovação ou recusa.'],
  }];
  const review = normalizeNs4E2Review(input);
  const selection = [{ decisionId: 'changeOrderDecisionMode', selectedChoice: 'Proposta com aprovação ou recusa.' }];
  assert.equal(validateNs4E2PolicySelections(review, selection).ok, true);
  assert.ok(validateNs4E2PolicySelections(review, selection, true).issues.some(issue => issue.code === 'NS4_E2_POLICY_SELECTION_NOT_HONORED'));

  review.journeys[1].policyDecisions[0].chosen = 'Proposta com aprovação ou recusa.';
  assert.equal(validateNs4E2PolicySelections(review, selection, true).ok, true);
  const persisted = buildNs4PolicyDecisionSelections(review, selection, 'human', '2026-08-10T12:00:00.000Z');
  assert.deepEqual(persisted, [{
    decisionId: 'changeOrderDecisionMode',
    generatedChoice: 'Proposta com aprovação ou recusa.',
    selectedChoice: 'Proposta com aprovação ou recusa.',
    selectedBy: 'human', selectedAt: '2026-08-10T12:00:00.000Z',
  }]);
});

test('E2 impact report records changed, new and removed journeys', () => {
  const previous = {
    schemaVersion: '2026-08-10-ns4-journey-index-v4' as const, moduleName: 'buildFlowFsm', approvedAt: '2026-08-10T00:00:00.000Z', approvedBy: 'human' as const,
    journeys: [
      { journeyId: 'removedJourney', actorRef: 'manager', title: 'Removed', goal: 'Removed', entryMode: 'coldStart' as const, businessHash: 'sha256:removed', artifactPath: 'removed' },
      { journeyId: 'changedJourney', actorRef: 'manager', title: 'Changed', goal: 'Changed', entryMode: 'coldStart' as const, businessHash: 'sha256:before', artifactPath: 'changed' },
    ], features: [], policyDecisionSelections: [],
  };
  const report = buildNs4E2ImpactReport('buildFlowFsm', previous, [
    { journeyId: 'changedJourney', businessHash: 'sha256:after' },
    { journeyId: 'newJourney', businessHash: 'sha256:new' },
  ], '2026-08-11T00:00:00.000Z', normalizeNs4E2Review({
    moduleName: 'buildFlowFsm', journeys: [{ journeyId: 'changedJourney', business: {
      steps: [{ kind: 'locate' }, { kind: 'decide' }],
    } }],
  }));
  assert.equal(report.schemaVersion, '2026-08-13-ns4-e2-impact-report-v2');
  assert.deepEqual(report.changes, [
    { journeyId: 'changedJourney', reason: 'hashDivergent' },
    { journeyId: 'newJourney', reason: 'journeyNew' },
    { journeyId: 'removedJourney', reason: 'journeyRemoved' },
  ]);
  assert.deepEqual(report.affectedSteps, ['e3-access-matrix', 'e4-ontology', 'e5-rules', 'e7-realization']);
  assert.deepEqual(report.stepKindHistogram, { locate: 1, inspect: 0, act: 0, decide: 1, handoff: 0 });
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

test('a journey with no decision, no handoff and one entity is recorded as a demotion choice', () => {
  const captureOnly: any = structuredClone(reviewInput);
  captureOnly.journeys = [captureOnly.journeys[0]];
  captureOnly.features = [captureOnly.features[0]];
  const review = normalizeNs4E2Review(captureOnly);

  assert.deepEqual(analyzeNs4E2MechanicalCoverage(review).captureOnlyJourneys, []);

  captureOnly.journeys[0].business.steps.push({
    stepId: 'captureProject', kind: 'act', entity: 'Project',
    title: 'Registrar um projeto.', description: 'O projeto fica cadastrado.', featureRefs: ['projectManagement'],
  });
  const demoted = normalizeNs4E2Review(captureOnly);
  assert.deepEqual(analyzeNs4E2MechanicalCoverage(demoted).captureOnlyJourneys, [{ journeyId: 'manageProjects', entity: 'Project' }]);

  const decision = demoted.journeys[0].policyDecisions.find(item => item.decisionId === 'demoteManageProjectsToRecordCatalogue')!;
  assert.ok(decision, 'the demotion decision is appended deterministically');
  assert.equal(decision.alternatives.length, 2);
  assert.ok(decision.alternatives.includes(decision.chosen));
  assert.deepEqual(validateNs4E2Review(demoted), { ok: true, issues: [] });
  assert.deepEqual(collectNs4DemotedJourneyIds(demoted), ['manageProjects']);

  // Keeping the journey is the declared alternative, and E8 reads that selection to assign the tier.
  const kept = [{ decisionId: decision.decisionId, selectedChoice: decision.alternatives[1] }];
  assert.deepEqual(collectNs4DemotedJourneyIds(demoted, kept), []);
  // The honor gate never asks the generator to rewrite a decision the code owns.
  assert.equal(validateNs4E2PolicySelections(demoted, kept, true).ok, true);
});

test('a journey with a decide step is never demoted', () => {
  const withDecision: any = structuredClone(reviewInput);
  withDecision.journeys[1].business.steps.push({
    stepId: 'decideChangeOrder', kind: 'decide', entity: 'ChangeOrder',
    title: 'Decidir a ordem.', description: 'A ordem fica decidida.', featureRefs: ['changeOrderManagement'],
  });
  const review = normalizeNs4E2Review(withDecision);
  assert.deepEqual(collectNs4DemotedJourneyIds(review), []);
});
