import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

import {
  createNs4E2CoverageJudgeStep,
  createNs4E2CoverageRepairStep,
  createNs4E2GateRepairStep,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import {
  applyNs4E2PolicyDecisionImpacts,
  formatNs4E2CoverageRepairFeedback,
  normalizeNs4E2CoverageVerdict,
  resolveNs4E2CoverageFindings,
  resolveNs4E2CoverageJudgeFailure,
  validateNs4E2CoverageVerdict,
} from '/_102020_/l2/agentNewSolution/steps/e2/coverageJudge.js';
import { analyzeNs4E2MechanicalCoverage } from '/_102020_/l2/agentNewSolution/steps/e2/coverageSignals.js';
import { normalizeNs4E2Review } from '/_102020_/l2/agentNewSolution/steps/e2/contracts.js';

test('E2 creates a bounded automated coverage-judge step', () => {
  const step = createNs4E2CoverageJudgeStep('buildFlowFsm', 2, 1, 1, 'Mapear jornadas');
  assert.equal(step.planning?.planId, 'e2-journeys-round-2-coverage-1-judge-1');
  assert.equal(step.stepTitle, '🔎 Mapear jornadas');
  assert.equal(step.status, 'waiting_human_input');
  assert.equal(step.onFailure, 'wait_after_prompt');
  assert.deepEqual(JSON.parse(step.prompt || '{}'), {
    planId: 'e2-journeys', stage: 'coverageJudge', moduleName: 'buildFlowFsm',
    reviewRound: 2, coverageRepairAttempt: 1, judgeAttempt: 1, coverageIssueIds: [],
  });
});

test('E2 coverage schema v4 admits the mechanical S1 category with strict enum types', () => {
  const schema = JSON.parse(readFileSync(
    new URL('../../schemas/e2-coverage-verdict.schema.json', import.meta.url), 'utf8',
  ));
  assert.match(schema.$id, /2026-08-13-v4$/);
  assert.equal(schema.properties.planId.type, 'string');
  assert.equal(schema.properties.issues.items.properties.category.type, 'string');
  assert.ok(schema.properties.issues.items.properties.category.enum.includes('moduleWithoutDecide'));
});

test('E2 gives structural and semantic repairs independent bounded identities', () => {
  const firstGateRepair = createNs4E2GateRepairStep('buildFlowFsm', 1, 1, 0, 'Fix context handoff');
  const firstJudge = createNs4E2CoverageJudgeStep('buildFlowFsm', 1, 0, 1);
  const semanticRepair = createNs4E2CoverageRepairStep('buildFlowFsm', 1, 1, 'Add missing actor journeys');
  const repairedGateRepair = createNs4E2GateRepairStep('buildFlowFsm', 1, 1, 1, 'Fix repaired context handoff');
  const repairedJudge = createNs4E2CoverageJudgeStep('buildFlowFsm', 1, 1, 1);
  assert.doesNotMatch(String(firstGateRepair.stepTitle), /^👤/u);
  assert.doesNotMatch(String(semanticRepair.stepTitle), /^👤/u);

  const planIds = [firstGateRepair, firstJudge, semanticRepair, repairedGateRepair, repairedJudge]
    .map(step => step.planning?.planId);
  assert.equal(new Set(planIds).size, planIds.length);
  assert.deepEqual(JSON.parse(semanticRepair.prompt || '{}'), {
    planId: 'e2-journeys', stage: 'coverageRepair', moduleName: 'buildFlowFsm', reviewRound: 1,
    coverageRepairAttempt: 1, coverageFeedback: 'Add missing actor journeys', coverageIssueIds: [],
  });
  assert.deepEqual(JSON.parse(repairedGateRepair.prompt || '{}'), {
    planId: 'e2-journeys', moduleName: 'buildFlowFsm', reviewRound: 1,
    gateRepairAttempt: 1, coverageRepairAttempt: 1, gateFeedback: 'Fix repaired context handoff',
  });
});

test('E2 carries the previous blocker ids from focused repair to the next judge', () => {
  const issueIds = ['missingBillingPublish'];
  const repair = createNs4E2CoverageRepairStep('buildFlowFsm', 1, 2, 'Publish billing', 'Map journeys', issueIds);
  const gateRepair = createNs4E2GateRepairStep('buildFlowFsm', 1, 1, 2, 'Fix patch structure', 'Map journeys', issueIds);
  const judge = createNs4E2CoverageJudgeStep('buildFlowFsm', 1, 2, 1, 'Map journeys', issueIds);
  assert.deepEqual(JSON.parse(repair.prompt || '{}').coverageIssueIds, issueIds);
  assert.deepEqual(JSON.parse(gateRepair.prompt || '{}').coverageIssueIds, issueIds);
  assert.deepEqual(JSON.parse(judge.prompt || '{}').coverageIssueIds, issueIds);
});

test('E2 coverage judge accepts a complete verdict only without blockers', () => {
  const complete = normalizeNs4E2CoverageVerdict({
    planId: 'e2-coverage-judge', moduleName: 'buildFlowFsm', reviewRound: 1,
    complete: true, summary: 'All explicit outcomes are covered.', issues: [],
  });
  assert.deepEqual(validateNs4E2CoverageVerdict(complete, 'buildFlowFsm', 1), { ok: true, errors: [] });

  const contradictory = normalizeNs4E2CoverageVerdict({
    planId: 'e2-coverage-judge', moduleName: 'buildFlowFsm', reviewRound: 1,
    complete: true, summary: 'Incorrectly marked complete.',
    issues: [{
      issueId: 'clientJourneyMissing', severity: 'blocking', category: 'missingRecipientJourney',
      sourceEvidence: 'E1 promises a client billing summary.',
      finding: 'Only the internal billing handoff exists.',
      repairInstruction: 'Add the client consumption journey.', relatedJourneyIds: ['manageProjectBilling'],
      question: 'Should clients consume billing?', alternatives: ['no, internal only', 'yes, add client journey'], defaultChoice: 'no, internal only',
    }],
  });
  assert.equal(validateNs4E2CoverageVerdict(contradictory, 'buildFlowFsm', 1).ok, false);
});

test('E2 coverage judge rejects fail-open and produces actionable repair feedback', () => {
  const verdict = normalizeNs4E2CoverageVerdict({
    planId: 'e2-coverage-judge', moduleName: 'buildFlowFsm', reviewRound: 1,
    complete: false, summary: 'Client consumption and material selection are incomplete.',
    issues: [
      {
        issueId: 'clientJourneyMissing', severity: 'blocking', category: 'missingRecipientJourney',
        sourceEvidence: 'E1 promises a client billing summary.',
        finding: 'The client cannot consume the published summary.',
        repairInstruction: 'Add a client journey scoped to associated projects.',
        question: 'Should clients consume billing?', alternatives: ['no, internal only', 'yes, add client journey'], defaultChoice: 'no, internal only',
        relatedJourneyIds: ['manageProjectBilling'],
      },
      {
        issueId: 'materialSelectionMissing', severity: 'blocking', category: 'missingContextAcquisition',
        sourceEvidence: 'Material usage is recorded against a catalog material.',
        finding: 'No selectedMaterial context is acquired.',
        repairInstruction: 'Locate a material from the shared catalog before recording usage.',
        question: 'How is material selected?', alternatives: ['use existing implicit selection', 'add catalog lookup'], defaultChoice: 'use existing implicit selection',
        relatedJourneyIds: ['recordDailyFieldProduction'],
      },
    ],
  });
  assert.deepEqual(validateNs4E2CoverageVerdict(verdict, 'buildFlowFsm', 1), { ok: true, errors: [] });
  const feedback = formatNs4E2CoverageRepairFeedback(verdict);
  assert.match(feedback, /1\. clientJourneyMissing \[missingRecipientJourney\]/);
  assert.match(feedback, /2\. materialSelectionMissing \[missingContextAcquisition\]/);
  assert.match(feedback, /Split those outcomes into separate journeys/);
  assert.match(feedback, /each numbered blocker is absent/);

  const failOpen = normalizeNs4E2CoverageVerdict({
    moduleName: 'buildFlowFsm', reviewRound: 1, complete: false,
    summary: 'Incomplete but no actionable blockers.', issues: [],
  });
  assert.equal(validateNs4E2CoverageVerdict(failOpen, 'buildFlowFsm', 1).ok, false);
});

test('run 34 remnant becomes one non-blocking system decision with the generated default', () => {
  const review = normalizeNs4E2Review({
    moduleName: 'buildFlowFsm34', journeys: [], features: [],
  });
  const verdict = normalizeNs4E2CoverageVerdict(JSON.parse(readFileSync(
    new URL('fixtures/run34-coverage-remnant.json', import.meta.url), 'utf8',
  )));
  assert.equal(validateNs4E2CoverageVerdict(verdict, 'buildFlowFsm34', 1).ok, true);
  const resolved = resolveNs4E2CoverageFindings(review, verdict);
  assert.equal(resolved.systemDecisions.length, 1);
  assert.equal(resolved.systemDecisions[0]?.chosen, 'não, apenas no faturamento');
  assert.equal(resolved.systemDecisions[0]?.decidedBy, 'system');
  const widgetSource = readFileSync(new URL('../../widgets/widgetNs4Journeys.ts', import.meta.url), 'utf8');
  assert.match(widgetSource, /Decisões assumidas/);
  assert.match(widgetSource, /this\.value\.systemDecisions\.length/);
});

test('E2 coverage verdict is bound to the current module and review round', () => {
  const verdict = normalizeNs4E2CoverageVerdict({
    moduleName: 'otherModule', reviewRound: 3, complete: true,
    summary: 'Complete.', issues: [],
  });
  const validation = validateNs4E2CoverageVerdict(verdict, 'buildFlowFsm', 2);
  assert.equal(validation.ok, false);
  assert.ok(validation.errors.some(error => error.includes('moduleName')));
  assert.ok(validation.errors.some(error => error.includes('reviewRound')));
});

test('E2 coverage judge is the only stage that adds policy impacts', () => {
  const review = normalizeNs4E2Review({
    moduleName: 'buildFlowFsm', journeys: [{
      journeyId: 'manageChanges', policyDecisions: [{
        decisionId: 'changeDecisionMode', question: 'Como decidir?', chosen: 'Diretamente.', alternatives: ['Com aprovação.'],
      }], business: { actorRef: 'manager', title: 'Mudanças', goal: 'Decidir mudanças.', entry: { mode: 'coldStart' }, steps: [], outcome: { statement: 'Decisão registrada.', evidence: ['Decisão visível.'] }, useRules: [] },
    }], features: [],
  });
  const verdict = normalizeNs4E2CoverageVerdict({
    moduleName: 'buildFlowFsm', reviewRound: 1, complete: true, summary: 'Completo.', issues: [],
    policyDecisionImpacts: [{ decisionId: 'changeDecisionMode', impact: 'Aprovação cria uma jornada adicional.', relatedJourneyIds: ['manageChanges'] }],
  });
  const enriched = applyNs4E2PolicyDecisionImpacts(review, verdict);
  assert.equal(enriched.journeys[0].policyDecisions[0].impact, 'Aprovação cria uma jornada adicional.');
  assert.deepEqual(enriched.journeys[0].policyDecisions[0].relatedJourneyIds, ['manageChanges']);
});

test('S1 requires one business issue and becomes a visible policy choice after the single repair', () => {
  const review = normalizeNs4E2Review({
    moduleName: 'buildFlowFsm38', userLanguage: 'pt-BR', journeys: [{
      journeyId: 'manageProjectChangeOrder', policyDecisions: [],
      business: {
        actorRef: 'manager', title: 'Gerenciar mudança', goal: 'Registrar mudança.', entry: { mode: 'coldStart' },
        steps: [{ stepId: 'recordChangeOrder', kind: 'act', title: 'Registrar mudança.', description: 'Mudança registrada.', featureRefs: [] }],
        outcome: { statement: 'Mudança registrada.', evidence: ['Registro visível.'] }, useRules: [],
      },
    }], features: [],
  });
  const signal = analyzeNs4E2MechanicalCoverage(review);
  const verdict = normalizeNs4E2CoverageVerdict({
    moduleName: 'buildFlowFsm38', reviewRound: 1, complete: false,
    summary: 'A política de aprovação ainda não está explícita.', policyDecisionImpacts: [],
    issues: [{
      issueId: 'moduleWithoutDecide', severity: 'blocking', category: 'moduleWithoutDecide',
      sourceEvidence: 'O módulo inteiro tem decide=0 e contém uma jornada de mudança.',
      finding: 'Mudanças são registradas sem aprovação explícita.',
      repairInstruction: 'Adicionar decisão de aprovação ou sustentar o registro direto.',
      relatedJourneyIds: ['manageProjectChangeOrder'],
      question: 'Ordens de mudança precisam de aprovação antes de afetar custo e faturamento?',
      alternatives: ['Não — registradas diretamente (atual)', 'Sim — aprovação do gestor', 'Sim — aprovação do cliente'],
      defaultChoice: 'Não — registradas diretamente (atual)',
    }],
  });
  assert.deepEqual(validateNs4E2CoverageVerdict(verdict, 'buildFlowFsm38', 1, signal, review), { ok: true, errors: [] });
  const resolved = resolveNs4E2CoverageFindings(review, verdict);
  const decision = resolved.journeys[0].policyDecisions[0];
  assert.equal(decision.decisionId, 'moduleWithoutDecidePolicy');
  assert.equal(decision.chosen, 'Não — registradas diretamente (atual)');
  assert.deepEqual(decision.alternatives, ['Sim — aprovação do gestor', 'Sim — aprovação do cliente']);
  assert.equal(resolved.systemDecisions.length, 0);
});

test('S1 cannot be omitted by the judge or invented for a module that already decides', () => {
  const withoutDecide = normalizeNs4E2Review({ moduleName: 'buildFlowFsm', journeys: [], features: [] });
  const active = analyzeNs4E2MechanicalCoverage(withoutDecide);
  const omitted = normalizeNs4E2CoverageVerdict({
    moduleName: 'buildFlowFsm', reviewRound: 1, complete: true, summary: 'Completo.', issues: [], policyDecisionImpacts: [],
  });
  assert.equal(validateNs4E2CoverageVerdict(omitted, 'buildFlowFsm', 1, active, withoutDecide).ok, false);

  const healthy = normalizeNs4E2Review({
    moduleName: 'buildFlowFsm', journeys: [{ journeyId: 'approveOrder', policyDecisions: [], business: {
      actorRef: 'manager', title: 'Aprovar', goal: 'Decidir.', entry: { mode: 'coldStart' },
      steps: [{ stepId: 'decideOrder', kind: 'decide', title: 'Decidir.', description: 'Decidido.', featureRefs: [] }],
      outcome: { statement: 'Decidido.', evidence: ['Estado visível.'] }, useRules: [],
    } }], features: [],
  });
  const invented = normalizeNs4E2CoverageVerdict({
    moduleName: 'buildFlowFsm', reviewRound: 1, complete: false, summary: 'Incorreto.', policyDecisionImpacts: [],
    issues: [{ issueId: 'moduleWithoutDecide', severity: 'blocking', category: 'moduleWithoutDecide', sourceEvidence: 'x', finding: 'x', repairInstruction: 'x', relatedJourneyIds: ['approveOrder'], question: 'x', alternatives: ['a', 'b'], defaultChoice: 'a' }],
  });
  assert.equal(validateNs4E2CoverageVerdict(invented, 'buildFlowFsm', 1, analyzeNs4E2MechanicalCoverage(healthy), healthy).ok, false);
});

test('judge exhaustion records that decision coverage was not evaluated instead of failing', () => {
  const review = normalizeNs4E2Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', journeys: [], features: [] });
  const resolved = resolveNs4E2CoverageJudgeFailure(review);
  assert.equal(resolved.systemDecisions.length, 1);
  assert.match(resolved.systemDecisions[0].findingRef, /moduleWithoutDecide\.judgeUnavailable/);
  assert.match(resolved.systemDecisions[0].chosen, /Não avaliada/);
});
