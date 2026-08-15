/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e10/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/tiers.js';
import { compileNs4ClassicL4 } from '/_102020_/l2/agentNewSolution4/steps/e9/classic.js';
import { validateNs4E10 } from '/_102020_/l2/agentNewSolution4/steps/e10/gate.js';
import type { Ns4E10Sources } from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';
import { buildNs4JourneyIndex, NS4_JOURNEY_INDEX_SCHEMA_VERSION } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { buildNs4RealizedJourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';

const run44 = JSON.parse(readFileSync(new URL('../e8/fixtures/run44-tier-model.json', import.meta.url), 'utf8')) as any;

async function sources(): Promise<Ns4E10Sources> {
  const input: any = structuredClone({
    journeys: run44.journeys, access: run44.access, ontology: run44.ontology,
    useCases: run44.useCases, workflows: run44.workflows,
  });
  const model = deriveNs4E8Model(input);
  const saved = await compileNs4ClassicL4(model, input.ontology);
  const journeyIndex: any = {
    schemaVersion: NS4_JOURNEY_INDEX_SCHEMA_VERSION, moduleName: model.moduleName,
    approvedAt: '2026-08-14T00:00:00.000Z', approvedBy: 'auto',
    journeys: input.journeys.journeys.map((journey: any) => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef, title: journey.business.title,
      goal: journey.business.goal, entryMode: journey.business.entry.mode,
      businessHash: `sha256:${journey.journeyId}`, artifactPath: `l4/${model.moduleName}/journeys/${journey.journeyId}.defs.ts`,
    })),
    features: input.journeys.features,
    // Decisions and selections live in the SAME permanent artifact; E10 compares index against index.
    policyDecisions: input.journeys.journeys.flatMap((journey: any) => journey.policyDecisions
      .map((decision: any) => ({ ...decision, journeyRef: journey.journeyId }))),
    // Every approved decision carries its persisted selection; E10 checks exactly that.
    policyDecisionSelections: input.journeys.journeys.flatMap((journey: any) => journey.policyDecisions.map((decision: any) => ({
      decisionId: decision.decisionId, generatedChoice: decision.chosen, selectedChoice: decision.chosen,
      selectedBy: 'auto', selectedAt: '2026-08-14T00:00:00.000Z',
    }))),
    systemDecisions: [],
  };
  return {
    moduleName: model.moduleName, userLanguage: model.userLanguage,
    journeys: input.journeys, journeyIndex, ontology: input.ontology,
    ontologyIndex: { ontologyHash: 'sha256:ontology' } as any,
    rules: { rulesHash: 'sha256:rules' } as any,
    access: { ...input.access, userLanguage: 'en', title: 'Access', accessHash: 'sha256:access' } as any,
    useCases: input.useCases.map((useCase: any) => ({ ...useCase, useCaseHash: `sha256:${useCase.useCaseId}` })),
    useCaseIndex: {
      sourceHashes: { journeys: journeyIndex.journeys.map((entry: any) => ({ journeyId: entry.journeyId, businessHash: entry.businessHash })), ontologyHash: 'sha256:ontology', rulesHash: 'sha256:rules' },
      useCases: input.useCases.map((useCase: any) => ({ useCaseId: useCase.useCaseId, useCaseHash: `sha256:${useCase.useCaseId}` })),
    } as any,
    workflows: [], workflowIndex: { workflows: [] } as any,
    model, saved,
  };
}

test('E10 passes over a module E8 approved and E9 emitted, and previews the menu the frontend will build', async () => {
  const report = await validateNs4E10(await sources());
  assert.deepEqual(report.errors, []);
  assert.equal(report.finalStatus, 'passed');
  // The preview lists exactly the places the model put in the menu — no journey, nothing invented.
  const input = await sources();
  assert.equal(report.menuPreview.navigation.length, input.model.menu.length);
  assert.ok(report.menuPreview.navigation.length);
  assert.equal(report.menuPreview.navigation.every(item => item.href === `/${report.moduleName}/${item.workspaceId}`), true);
  assert.equal(report.checks.find(check => check.checkId === 'A6-staleness')?.status, 'passed');
});

test('a saved artifact that drifted from the approved model is stale, and E10 names E9 as the repair', async () => {
  const input = await sources();
  input.saved.workspaces[0] = { ...input.saved.workspaces[0], title: 'Editado à mão' };
  const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'failed');
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_WORKSPACE_STALE'));
  assert.equal(report.repairStep, 'e9-navigation-compiler');
  assert.equal(report.checks.find(check => check.checkId === 'A6-staleness')?.errorCount, 1);
});

test('an artifact E9 never wrote is missing, not merely different', async () => {
  const input = await sources();
  const dropped = input.saved.operations.pop()!;
  const report = await validateNs4E10(input);
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_OPERATION_STALE' && issue.path.includes(dropped.operationId)));
});

test('a journey decision without its persisted selection sends the repair back to E2', async () => {
  const input = await sources();
  input.journeyIndex.policyDecisionSelections = [];
  const report = await validateNs4E10(input);
  assert.ok(report.errors.some(issue => issue.code === 'NS4_E10_POLICY_SELECTION_MISSING'));
  assert.equal(report.repairStep, 'e2-journeys');
});

test('a command whose transitions no longer exist stays visible as a registrar, never a failure', async () => {
  const input = await sources();
  const decide = input.model.operations.find(operation => operation.accessPattern.kind === 'transition')!;
  decide.transitionRefs = ['approveChangeOrderTransition'];
  const report = await validateNs4E10(input);
  assert.equal(report.finalStatus, 'passed');
  assert.ok(report.registrars.some(issue => issue.code === 'NS4_E10_DORMANT_COMMAND'));
  assert.ok(report.systemDecisions.some(decision => decision.chosen === 'keepDormantCommand'));
  assert.equal(report.checks.find(check => check.checkId === 'A8-dormant-commands')?.status, 'reported');
});

test('the journey index is the durable home of the decisions the selections answer', async () => {
  const review: any = structuredClone(run44.journeys);
  const artifacts = review.journeys.map((journey: any) => ({
    journeyId: journey.journeyId, business: journey.business, businessHash: `sha256:${journey.journeyId}`,
  }));
  const index = buildNs4JourneyIndex(review.moduleName, review, artifacts as any,
    artifacts.map((artifact: any) => `l4/${review.moduleName}/journeys/${artifact.journeyId}.defs.ts`),
    'human', '2026-08-15T00:00:00.000Z',
    review.journeys.flatMap((journey: any) => journey.policyDecisions.map((decision: any) => ({
      decisionId: decision.decisionId, generatedChoice: decision.chosen, selectedChoice: decision.chosen,
      selectedBy: 'human', selectedAt: '2026-08-15T00:00:00.000Z',
    }))));
  // Every selection has a body, and every body names the journey that owns it — E7 rewrites the
  // journey artifacts as realized-v5 without policyDecisions, so the index is the only home left.
  const bodies = new Map((index.policyDecisions || []).map(decision => [decision.decisionId, decision]));
  assert.ok(bodies.size);
  for (const selection of index.policyDecisionSelections || []) {
    const body = bodies.get(selection.decisionId);
    assert.ok(body, `selection ${selection.decisionId} has no decision body`);
    assert.equal(review.journeys.some((journey: any) => journey.journeyId === body!.journeyRef), true);
  }
});

test('E7 rewrites the index and the decision bodies survive it', async () => {
  // The bug lived exactly here: E7 rewrites every journey as realized-v5, which has no
  // policyDecisions. The index is rewritten too, and this is the seam where the bodies must not fall.
  const input = await sources();
  const before = input.journeyIndex.policyDecisions || [];
  assert.ok(before.length, 'the index under test carries decision bodies');
  const realized = await buildNs4RealizedJourneyIndex(input.journeyIndex, input.journeyIndex.journeys.map(entry => ({
    journeyId: entry.journeyId, realization: { realizationHash: `sha256:${entry.journeyId}`, steps: [] },
  })) as any);
  assert.deepEqual(realized.policyDecisions, before);
  assert.deepEqual(realized.policyDecisionSelections, input.journeyIndex.policyDecisionSelections);

  const report = await validateNs4E10({ ...input, journeyIndex: realized });
  assert.equal(report.pipelineDefect, undefined);
  assert.equal(report.errors.some(issue => issue.code.startsWith('NS4_E10_POLICY')), false);
});

test('a selection without its decision body is our defect: no repair step, nothing stale', async () => {
  const input = await sources();
  const broken = { ...input, journeyIndex: { ...input.journeyIndex, policyDecisions: [] } };
  const report = await validateNs4E10(broken);
  assert.equal(report.finalStatus, 'failed');
  assert.equal(report.pipelineDefect, true);
  // The run 46 failure mode: 15 UNKNOWNs sending the module back to E2 and staling E2-E9.
  assert.equal(report.errors.some(issue => issue.code === 'NS4_E10_POLICY_SELECTION_UNKNOWN'), false);
  assert.deepEqual(report.errors.filter(issue => issue.code === 'NS4_E10_POLICY_DECISIONS_ABSENT').length, 1);
  assert.equal(report.repairStep, undefined);
});

test('an incoherent decision is the product problem and still goes back to E2', async () => {
  const input = await sources();
  const decisions = input.journeyIndex.policyDecisions || [];
  assert.ok(decisions.length, 'the fixture carries decision bodies');

  const missing = await validateNs4E10({ ...input,
    journeyIndex: { ...input.journeyIndex, policyDecisionSelections: (input.journeyIndex.policyDecisionSelections || []).slice(1) } });
  assert.equal(missing.errors.some(issue => issue.code === 'NS4_E10_POLICY_SELECTION_MISSING'), true);
  assert.equal(missing.repairStep, 'e2-journeys');
  assert.equal(missing.pipelineDefect, undefined);

  const wrong = await validateNs4E10({ ...input,
    journeyIndex: { ...input.journeyIndex,
      policyDecisionSelections: (input.journeyIndex.policyDecisionSelections || [])
        .map((selection, index) => index ? selection : { ...selection, selectedChoice: 'a choice nobody offered' }) } });
  assert.equal(wrong.errors.some(issue => issue.code === 'NS4_E10_POLICY_SELECTION_VALUE'), true);
  assert.equal(wrong.repairStep, 'e2-journeys');

  const unknown = await validateNs4E10({ ...input,
    journeyIndex: { ...input.journeyIndex,
      policyDecisionSelections: [...(input.journeyIndex.policyDecisionSelections || []),
        { decisionId: 'decisionNobodyGenerated', generatedChoice: 'x', selectedChoice: 'x', selectedBy: 'human', selectedAt: '2026-08-15T00:00:00.000Z' }] } });
  assert.equal(unknown.errors.some(issue => issue.code === 'NS4_E10_POLICY_SELECTION_UNKNOWN'), true);
  assert.equal(unknown.repairStep, 'e2-journeys');
});
