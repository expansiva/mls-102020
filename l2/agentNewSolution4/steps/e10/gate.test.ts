/// <mls fileReference="_102020_/l2/agentNewSolution4/steps/e10/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution4/steps/e8/tiers.js';
import { compileNs4ClassicL4 } from '/_102020_/l2/agentNewSolution4/steps/e9/classic.js';
import { validateNs4E10 } from '/_102020_/l2/agentNewSolution4/steps/e10/gate.js';
import type { Ns4E10Sources } from '/_102020_/l2/agentNewSolution4/steps/e10/contracts.js';

const run44 = JSON.parse(readFileSync(new URL('../e8/fixtures/run44-tier-model.json', import.meta.url), 'utf8')) as any;

async function sources(): Promise<Ns4E10Sources> {
  const input: any = structuredClone({
    journeys: run44.journeys, access: run44.access, ontology: run44.ontology,
    useCases: run44.useCases, workflows: run44.workflows,
  });
  const model = deriveNs4E8Model(input);
  const saved = await compileNs4ClassicL4(model, input.ontology);
  const journeyIndex: any = {
    schemaVersion: '2026-08-14-ns4-journey-index-v6', moduleName: model.moduleName,
    approvedAt: '2026-08-14T00:00:00.000Z', approvedBy: 'auto',
    journeys: input.journeys.journeys.map((journey: any) => ({
      journeyId: journey.journeyId, actorRef: journey.business.actorRef, title: journey.business.title,
      goal: journey.business.goal, entryMode: journey.business.entry.mode,
      businessHash: `sha256:${journey.journeyId}`, artifactPath: `l4/${model.moduleName}/journeys/${journey.journeyId}.defs.ts`,
    })),
    features: input.journeys.features,
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
