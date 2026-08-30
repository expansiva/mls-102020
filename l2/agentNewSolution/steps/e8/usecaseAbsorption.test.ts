/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/usecaseAbsorption.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';

const lista = JSON.parse(readFileSync(new URL('fixtures/listaAssinatura-e8-sources.json', import.meta.url), 'utf8'));
const todo = JSON.parse(readFileSync(new URL('fixtures/todo-e8-sources.json', import.meta.url), 'utf8'));
const run44 = JSON.parse(readFileSync(new URL('fixtures/run44-tier-model.json', import.meta.url), 'utf8'));

function todoSources() {
  return {
    journeys: todo.journeys,
    access: todo.access,
    ontology: todo.ontology,
    useCases: todo.useCases,
    workflows: todo.workflows,
    policyDecisionSelections: todo.policyDecisionSelections,
  } as any;
}

function run44Sources() {
  return structuredClone({
    journeys: run44.journeys, access: run44.access, ontology: run44.ontology,
    useCases: run44.useCases, workflows: run44.workflows,
  });
}

function listaSources() {
  return structuredClone({
    journeys: lista.journeys,
    access: lista.access,
    ontology: lista.ontology,
    useCases: lista.useCases,
    workflows: lista.workflows,
    policyDecisionSelections: lista.policyDecisionSelections,
    module: lista.module,
  });
}

/** Live 30/08 shape: exclusive admin command is on Petition, so R1/D1 absorbs the journey. */
function liveListaSources() {
  const sources = listaSources();
  const exportJourney = sources.journeys.journeys.find((item: any) => item.journeyId === 'exportPetitionSignatures');
  const act = exportJourney.business.steps.find((step: any) => step.kind === 'act');
  const previousRef = `${exportJourney.journeyId}.${act.stepId}`;
  act.stepId = 'exportSignatures';
  act.entity = 'Petition';
  const nextRef = 'exportPetitionSignatures.exportSignatures';
  const rewrite = (refs: string[]) => refs.map(ref => ref === previousRef ? nextRef : ref);
  for (const feature of sources.journeys.features) feature.journeyStepRefs = rewrite(feature.journeyStepRefs);
  for (const authority of sources.access.authorities) authority.journeyStepRefs = rewrite(authority.journeyStepRefs);
  sources.useCases = sources.useCases.map((useCase: any) => useCase.useCaseId === 'generateSignatureExport' ? {
    ...useCase,
    useCaseId: 'exportSignatures',
    compiledFrom: [nextRef],
  } : useCase);
  return sources;
}

test('absorbed admin journey hosts exclusive exportSignatures on petitionLanding', () => {
  const sources = liveListaSources();
  const model = deriveNs4E8Model(sources);
  assert.equal(model.workspaces.some(workspace => workspace.workspaceId === 'exportPetitionSignatures'), false);
  const landing = model.workspaces.find(workspace => workspace.workspaceId === 'petitionLanding');
  assert.ok(landing, `ids=${model.workspaces.map(item => item.workspaceId)}`);
  assert.equal(landing!.hostedStepRefs.includes('exportPetitionSignatures.exportSignatures'), true);
  assert.equal(landing!.bffCalls.some(call => call.operationId === 'exportSignatures' && call.kind === 'command'), true);
  assert.ok(landing!.sections.some(section =>
    section.organisms.some(organism => organism.action
      && landing!.bffCalls.some(call => call.bffId === organism.action && call.operationId === 'exportSignatures'))));
  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_USECASE_UNHOSTED'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_STEP_UNHOSTED'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, 0, gate.issues.map(issue => `${issue.code}:${issue.message}`).join('; '));
  assert.equal(gate.ok, true);
});

test('NS4_E8_USECASE_UNHOSTED names the exclusive use case when its bffCall is stripped', () => {
  const sources = liveListaSources();
  const model = deriveNs4E8Model(sources);
  const stripped = {
    ...model,
    workspaces: model.workspaces.map(workspace => ({
      ...workspace,
      bffCalls: workspace.bffCalls.filter(call => call.operationId !== 'exportSignatures'),
    })),
  };
  const gate = validateNs4E8Model(stripped, sources);
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_USECASE_UNHOSTED');
  assert.equal(hit.length, 1, gate.issues.map(issue => `${issue.code}:${issue.message}`).join('; '));
  assert.match(hit[0].message, /exportSignatures/);
  assert.match(hit[0].message, /exportPetitionSignatures/);
  assert.notEqual(hit[0].severity, 'warning');
  assert.equal(gate.ok, false);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_STEP_UNHOSTED'), false);
});

test('todo contra-loop: same place, no new gate finding', () => {
  const sources = todoSources();
  const model = deriveNs4E8Model(sources);
  assert.deepEqual(model.workspaces.map(workspace => workspace.workspaceId), ['taskCatalogue']);
  assert.deepEqual(
    model.workspaces[0].bffCalls.map(call => call.operationId).sort(),
    ['createTask', 'decideTaskStatus', 'deleteTask', 'getTask', 'inspectTask', 'inspectTaskSummary', 'listTask', 'locateTask', 'updateTask'].sort(),
  );
  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_USECASE_UNHOSTED'), false);
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, 0);
  assert.equal(gate.ok, true);
});

test('run44 contra-loop: same workspaces, no new gate finding', () => {
  const sources = run44Sources();
  const model = deriveNs4E8Model(sources);
  const byTier: Record<string, number> = {};
  model.workspaces.forEach(workspace => { byTier[workspace.tier] = (byTier[workspace.tier] || 0) + 1; });
  assert.equal(model.workspaces.length, run44.expected.workspaces);
  assert.deepEqual(byTier, run44.expected.byTier);
  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_USECASE_UNHOSTED'), false);
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, run44.expected.blockingIssues);
  assert.equal(gate.ok, true);
});
