/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/landingRequiredInput.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution/steps/e8/contracts.js';

const HERE = new URL('.', import.meta.url);

test('fixtures are the real consultInstitutionalHome inspect-with-required-id landing', () => {
  const workspace = readFileSync(new URL('fixtures/consultInstitutionalHome.workspace.ts', HERE), 'utf8');
  const operation = readFileSync(new URL('fixtures/inspectInstitutionalPresentation.operation.ts', HERE), 'utf8');
  assert.match(workspace, /"workspaceId": "consultInstitutionalHome"/);
  assert.match(workspace, /qryInspectInstitutionalPresentation/);
  assert.match(workspace, /"source": "selectedEntity"/);
  assert.match(workspace, /"required": true/);
  assert.match(operation, /"accessPattern": \{\s*"kind": "getById"/);
  assert.match(operation, /institutionalPresentationInstitutionalPresentationId/);
});

function incidentSources(): Ns4E8Sources {
  return {
    journeys: {
      moduleName: 'petShop',
      journeys: [{
        journeyId: 'consultInstitutionalHome',
        business: {
          entry: { mode: 'coldStart' },
          steps: [{ stepId: 'inspectInstitutionalPresentation', kind: 'inspect', entity: 'InstitutionalPresentation' }],
        },
      }],
      features: [],
    },
    ontology: {
      moduleName: 'petShop',
      entities: [{
        entityId: 'InstitutionalPresentation',
        fields: [{ fieldId: 'institutionalPresentationId', type: 'string', required: true }],
        storage: { target: 'moduleDatabase', idField: 'institutionalPresentationId' },
      }],
      relationships: [],
    },
    access: { profiles: [{ profileId: 'clienteResponsavel', actorRefs: ['clienteResponsavel'] }] },
    useCases: [],
    workflows: [],
  } as unknown as Ns4E8Sources;
}

function incidentModel(over: Partial<Ns4E8Model> = {}): Ns4E8Model {
  return {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'petShop',
    userLanguage: 'pt',
    title: 'petShop',
    reviewRound: 1,
    hubEntity: 'Pet',
    workspaces: [{
      workspaceId: 'consultInstitutionalHome',
      tier: 'journey',
      title: 'Conhecer o pet shop',
      purpose: 'Consultar a apresentação institucional.',
      kind: 'operation',
      entity: 'InstitutionalPresentation',
      actors: ['clienteResponsavel'],
      profileRefs: ['clienteResponsavel'],
      featureRefs: ['institutionalHome'],
      hostedStepRefs: ['consultInstitutionalHome.inspectInstitutionalPresentation'],
      journeyRef: 'consultInstitutionalHome',
      categoryRef: 'processWizard',
      bffCalls: [{
        bffId: 'qryInspectInstitutionalPresentation',
        kind: 'query',
        operationId: 'inspectInstitutionalPresentation',
        outputKind: 'object',
        entityRef: 'InstitutionalPresentation',
      }],
      sections: [{
        sectionId: 'inspectInstitutionalPresentation',
        intent: 'Ver a apresentação.',
        organisms: [{ role: 'detailPanel', dataSource: 'qryInspectInstitutionalPresentation' }],
      }],
    }],
    operations: [{
      operationId: 'inspectInstitutionalPresentation',
      title: 'Conhecer o pet shop',
      kind: 'query',
      entityRef: 'InstitutionalPresentation',
      entityRefs: ['InstitutionalPresentation'],
      accessPattern: { kind: 'getById' },
      inputs: [{
        inputId: 'institutionalPresentationInstitutionalPresentationId',
        fieldRef: { entityId: 'InstitutionalPresentation', fieldId: 'institutionalPresentationId' },
        source: 'selectedEntity',
        required: true,
        description: 'Apresentação institucional',
      }],
      outputRefs: [],
      useRules: [],
      transitionRefs: [],
      story: ['Conhecer o pet shop'],
    }],
    menu: [],
    landings: [],
    systemDecisions: [],
    ...over,
  };
}

test('coldStart landing whose only read is inspect/getById with required id is a finding', () => {
  const gate = validateNs4E8Model(incidentModel(), incidentSources());
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_LANDING_REQUIRED_INPUT');
  assert.equal(hit.length, 1, gate.issues.map(issue => issue.code).join(', '));
  assert.match(hit[0].message, /consultInstitutionalHome/);
  assert.equal(hit[0].severity, 'warning');
});

test('the same inspect is allowed when the workspace already has a list query (locate then inspect)', () => {
  const model = incidentModel();
  model.operations.push({
    operationId: 'listInstitutionalPresentation',
    title: 'Listar',
    kind: 'query',
    entityRef: 'InstitutionalPresentation',
    entityRefs: ['InstitutionalPresentation'],
    accessPattern: { kind: 'list' },
    inputs: [],
    outputRefs: [],
    useRules: [],
    transitionRefs: [],
    story: ['Listar'],
  });
  model.workspaces[0].bffCalls.unshift({
    bffId: 'qryListInstitutionalPresentation',
    kind: 'query',
    operationId: 'listInstitutionalPresentation',
    outputKind: 'list',
    entityRef: 'InstitutionalPresentation',
  });
  const gate = validateNs4E8Model(model, incidentSources());
  assert.equal(gate.issues.some(issue => issue.code === 'NS4_E8_LANDING_REQUIRED_INPUT'), false, gate.issues.map(issue => issue.message).join(' | '));
});
