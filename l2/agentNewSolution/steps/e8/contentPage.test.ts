/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/contentPage.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import { deriveNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/tiers.js';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { ns4E8CompositionProfile } from '/_102020_/l2/agentNewSolution/steps/e8/compositionProfiles.js';

const lista = JSON.parse(readFileSync(new URL('fixtures/listaAssinatura-e8-sources.json', import.meta.url), 'utf8'));
const todo = JSON.parse(readFileSync(new URL('fixtures/todo-e8-sources.json', import.meta.url), 'utf8'));
const run44 = JSON.parse(readFileSync(new URL('fixtures/run44-tier-model.json', import.meta.url), 'utf8'));

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

test('composition profiles are data: contentLanding hosts content+commands+tiles and forbids CRUD', () => {
  const landing = ns4E8CompositionProfile('contentLanding');
  const fallback = ns4E8CompositionProfile('entityRecordManagement');
  assert.equal(landing.contentOrganisms, true);
  assert.equal(landing.hostedCommands, true);
  assert.equal(landing.tiles, true);
  assert.equal(landing.crud, false);
  assert.equal(fallback.profileId, 'default');
  assert.equal(fallback.crud, true);
  assert.equal(fallback.contentOrganisms, false);
});

test('listaAssinatura: one public contentPage hosts the sign form and the counter; no petition CRUD, no hub', () => {
  const sources = listaSources();
  const model = deriveNs4E8Model(sources);
  const byTier: Record<string, number> = {};
  model.workspaces.forEach(workspace => { byTier[workspace.tier] = (byTier[workspace.tier] || 0) + 1; });

  const landing = model.workspaces.find(workspace => workspace.tier === 'contentPage');
  assert.ok(landing, `tiers=${JSON.stringify(byTier)} ids=${model.workspaces.map(item => item.workspaceId)}`);
  assert.equal(byTier.contentPage, 1);
  assert.equal(landing!.workspaceId, 'petitionLanding');
  assert.equal(landing!.categoryRef, 'contentLanding');
  assert.equal(landing!.kind, 'landing');
  assert.ok(model.menu.some(entry => entry.workspaceId === landing!.workspaceId));

  const content = landing!.sections.flatMap(section => section.organisms)
    .filter(organism => organism.type === 'content');
  assert.ok(content.some(organism => organism.role === 'hero'));
  assert.ok(content.some(organism => organism.role === 'richText'));
  assert.ok(content.some(organism => organism.role === 'imageSet'));
  assert.equal(content.every(organism => organism.role === 'hero' || organism.role === 'richText'
    || organism.role === 'imageSet' || organism.role === 'ctaLink'), true);
  assert.equal(landing!.sections.find(section => section.sectionId === 'hero')!.intent, sources.module.title);
  assert.equal(landing!.sections.find(section => section.sectionId === 'purpose')!.intent, sources.module.purpose);

  const hosted = new Set(landing!.hostedStepRefs);
  assert.equal(hosted.has('signPetitionAsMorador.registerPetitionSignature'), true);
  assert.equal(hosted.has('signPetitionAsVisitante.registerPetitionSignature'), true);
  assert.equal(hosted.has('signPetitionAsResponsavelJovem.registerPetitionSignature'), true);
  assert.equal(landing!.bffCalls.some(call => call.operationId === 'registerPetitionSignature' && call.kind === 'command'), true);

  const counter = landing!.sections.find(section => section.sectionId === 'counter');
  assert.ok(counter, 'the public count is a tile on the same page');
  assert.equal(counter!.organisms[0].usage, 'summary');
  assert.equal(landing!.bffCalls.some(call => call.entityRef === 'PetitionSignatureCount'), true);

  assert.equal(model.workspaces.some(workspace => workspace.workspaceId === 'petitionCatalogue'), false);
  assert.equal(model.workspaces.some(workspace => workspace.tier === 'hub'), false);
  assert.ok(model.workspaces.some(workspace => workspace.workspaceId === 'exportPetitionSignatures' && workspace.tier === 'journey'));

  const gate = validateNs4E8Model(model, sources);
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_STEP_UNHOSTED'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_REDUNDANT_WORKSPACE'), false, gate.issues.map(issue => issue.message).join('; '));
  assert.equal(gate.issues.filter(issue => issue.severity !== 'warning').length, 0, gate.issues.map(issue => `${issue.code}:${issue.message}`).join('; '));
  assert.equal(gate.ok, true);
});

test('organism type content is rejected outside a contentPage', () => {
  const sources = listaSources();
  const model = deriveNs4E8Model(sources);
  const catalogue = model.workspaces.find(workspace => workspace.tier === 'recordCatalogue');
  assert.ok(catalogue, 'a non-singleton catalogue still exists to host the smuggled organism');
  const smuggled = {
    ...model,
    workspaces: model.workspaces.map(workspace => workspace.workspaceId !== catalogue!.workspaceId ? workspace : {
      ...workspace,
      sections: [
        ...workspace.sections,
        { sectionId: 'hero', intent: 'Invented.', organisms: [{ role: 'hero' as const, type: 'content' as const }] },
      ],
    }),
  };
  const gate = validateNs4E8Model(smuggled, sources);
  assert.ok(gate.issues.some(issue => issue.code === 'NS4_E8_CONTENT_ORGANISM'));
  assert.equal(gate.ok, false);
  assert.equal(validateNs4E8Model(model, sources).issues.some(issue => issue.code === 'NS4_E8_CONTENT_ORGANISM'), false);
});

test('todo fixture without a content signal stays a single catalogue place', () => {
  const sources = todoSources();
  const model = deriveNs4E8Model(sources);
  assert.deepEqual(model.workspaces.map(workspace => workspace.workspaceId), ['taskCatalogue']);
  assert.equal(model.workspaces.some(workspace => workspace.tier === 'contentPage'), false);
  assert.equal(model.workspaces.flatMap(workspace => workspace.sections)
    .flatMap(section => section.organisms)
    .some(organism => organism.type === 'content'), false);
});

test('run44 management module does not gain a contentPage', () => {
  const input = run44Sources();
  const model = deriveNs4E8Model(input);
  const byTier: Record<string, number> = {};
  model.workspaces.forEach(workspace => { byTier[workspace.tier] = (byTier[workspace.tier] || 0) + 1; });
  assert.equal(model.workspaces.length, run44.expected.workspaces);
  assert.deepEqual(byTier, run44.expected.byTier);
  assert.equal(byTier.contentPage || 0, 0);
});

test('without the E1 content phrase the compiler does not invent a contentPage', () => {
  const sources = listaSources();
  sources.module.boundaries = 'in: Cadastro de petições; out: Nada.';
  sources.module.purpose = 'Manter o cadastro de petições.';
  sources.module.mainGoal = 'Cadastrar petições.';
  sources.module.expectedOutcomes = [{ outcomeId: 'cadastro', title: 'Cadastro', description: 'Lista e edita petições.' }];
  sources.module.inScope = ['Cadastro de petições'];
  const model = deriveNs4E8Model(sources);
  assert.equal(model.workspaces.some(workspace => workspace.tier === 'contentPage'), false);
});
