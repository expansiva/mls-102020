/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/commandKeySource.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { validateNs4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/modelGate.js';
import { NS4_E8_MODEL_VERSION, type Ns4E8Model } from '/_102020_/l2/agentNewSolution/steps/e8/model.js';
import type { Ns4E8Sources } from '/_102020_/l2/agentNewSolution/steps/e8/contracts.js';

const HERE = new URL('.', import.meta.url);

test('fixtures are the real recordInStoreServiceAttendance commands-without-execution-read', () => {
  const workspace = readFileSync(new URL('fixtures/recordInStoreServiceAttendance.workspace.ts', HERE), 'utf8');
  const start = readFileSync(new URL('fixtures/registerServiceStart.operation.ts', HERE), 'utf8');
  const locate = readFileSync(new URL('fixtures/locateConfirmedServiceAppointment.operation.ts', HERE), 'utf8');
  const attach = readFileSync(new URL('fixtures/attachPetServiceImage.workspace.ts', HERE), 'utf8');
  assert.match(workspace, /"workspaceId": "recordInStoreServiceAttendance"/);
  assert.match(workspace, /qryLocateConfirmedServiceAppointment/);
  assert.match(workspace, /cmdRegisterServiceStart/);
  assert.doesNotMatch(workspace, /qryLocateServiceExecution/);
  assert.match(start, /"name": "serviceExecutionId"/);
  assert.match(start, /serviceExecutionServiceExecutionId/);
  assert.match(locate, /"entity": "ServiceAppointment"/);
  assert.doesNotMatch(locate, /serviceExecutionId/);
  assert.match(attach, /"workspaceId": "attachPetServiceImage"/);
  assert.match(attach, /qryLocateServiceExecution/);
});

function incidentSources(): Ns4E8Sources {
  return {
    journeys: { moduleName: 'petShop', journeys: [], features: [] },
    ontology: {
      moduleName: 'petShop',
      entities: [
        {
          entityId: 'ServiceAppointment',
          fields: [{ fieldId: 'serviceAppointmentId', type: 'string', required: true }],
          storage: { target: 'moduleDatabase', idField: 'serviceAppointmentId' },
        },
        {
          entityId: 'ServiceExecution',
          fields: [{ fieldId: 'serviceExecutionId', type: 'string', required: true }],
          storage: { target: 'moduleDatabase', idField: 'serviceExecutionId' },
        },
        {
          entityId: 'ServiceImage',
          fields: [{ fieldId: 'serviceImageId', type: 'string', required: true }],
          storage: { target: 'moduleDatabase', idField: 'serviceImageId' },
        },
      ],
      relationships: [],
    },
    access: { profiles: [{ profileId: 'administradorPetShop', actorRefs: ['administradorPetShop'] }] },
    useCases: [],
    workflows: [],
  } as unknown as Ns4E8Sources;
}

function command(operationId: string, extraInputs: Ns4E8Model['operations'][number]['inputs'] = []): Ns4E8Model['operations'][number] {
  return {
    operationId,
    title: operationId,
    kind: 'command',
    entityRef: 'ServiceExecution',
    entityRefs: ['ServiceExecution'],
    accessPattern: { kind: 'commandInput' },
    inputs: [
      {
        inputId: 'serviceAppointmentServiceAppointmentId',
        fieldRef: { entityId: 'ServiceAppointment', fieldId: 'serviceAppointmentId' },
        source: 'selectedEntity',
        required: true,
        description: 'Agendamento',
      },
      {
        inputId: 'serviceExecutionServiceExecutionId',
        fieldRef: { entityId: 'ServiceExecution', fieldId: 'serviceExecutionId' },
        source: 'selectedEntity',
        required: true,
        description: 'Execução',
      },
      ...extraInputs,
    ],
    outputRefs: ['ServiceExecution.serviceExecutionId'],
    useRules: [],
    transitionRefs: [],
    story: [operationId],
  };
}

function incidentModel(over: Partial<Ns4E8Model> = {}): Ns4E8Model {
  const commands = [
    'registerServiceStart',
    'registerServiceCompletion',
    'registerInStorePayment',
    'registerPetPickup',
    'handoffCompletedService',
  ];
  return {
    planId: 'e8-workspace-model',
    schemaVersion: NS4_E8_MODEL_VERSION,
    moduleName: 'petShop',
    userLanguage: 'pt',
    title: 'petShop',
    reviewRound: 1,
    hubEntity: 'Pet',
    workspaces: [{
      workspaceId: 'recordInStoreServiceAttendance',
      tier: 'journey',
      title: 'Registrar atendimento presencial do pet',
      purpose: 'Registrar o ciclo presencial.',
      kind: 'workflow',
      entity: 'ServiceExecution',
      actors: ['administradorPetShop'],
      profileRefs: ['administradorPetShop'],
      featureRefs: [],
      hostedStepRefs: [],
      categoryRef: 'processWizard',
      bffCalls: [
        {
          bffId: 'qryLocateConfirmedServiceAppointment',
          kind: 'query',
          operationId: 'locateConfirmedServiceAppointment',
          outputKind: 'list',
          entityRef: 'ServiceAppointment',
        },
        ...commands.map(id => ({
          bffId: `cmd${id.charAt(0).toUpperCase()}${id.slice(1)}` as string,
          kind: 'command' as const,
          operationId: id,
          outputKind: 'object' as const,
          entityRef: 'ServiceExecution',
        })),
      ],
      sections: [{
        sectionId: 'attendance',
        intent: 'Atender.',
        organisms: [{ role: 'primarySurface', dataSource: 'qryLocateConfirmedServiceAppointment' }],
      }],
    }],
    operations: [
      {
        operationId: 'locateConfirmedServiceAppointment',
        title: 'Localizar agendamento confirmado',
        kind: 'query',
        entityRef: 'ServiceAppointment',
        entityRefs: ['ServiceAppointment'],
        accessPattern: { kind: 'list' },
        inputs: [],
        outputRefs: [
          'ServiceAppointment.serviceAppointmentId',
          'ServiceAppointment.status',
          'ServiceAppointment.petId',
        ],
        useRules: [],
        transitionRefs: [],
        story: ['Localizar'],
      },
      ...commands.map(id => command(id)),
    ],
    menu: [],
    landings: [],
    systemDecisions: [],
    ...over,
  };
}

test('incident workspace: commands require ServiceExecution key and no page read provides it', () => {
  const gate = validateNs4E8Model(incidentModel(), incidentSources());
  const hit = gate.issues.filter(issue => issue.code === 'NS4_E8_COMMAND_KEY_WITHOUT_SOURCE');
  assert.equal(hit.length, 5, gate.issues.map(issue => `${issue.code}:${issue.path}`).join(' | '));
  assert.ok(hit.every(issue => issue.severity === 'warning'));
  assert.ok(hit.every(issue => /serviceExecutionId/.test(issue.message)));
  assert.ok(hit.some(issue => /cmdRegisterServiceStart/.test(issue.path)));
});

test('attachPetServiceImage is quiet because it already reads ServiceExecution', () => {
  const model = incidentModel();
  model.workspaces = [{
    workspaceId: 'attachPetServiceImage',
    tier: 'journey',
    title: 'Anexar imagem',
    purpose: 'Anexar imagem do atendimento.',
    kind: 'operation',
    entity: 'ServiceImage',
    actors: ['administradorPetShop'],
    profileRefs: ['administradorPetShop'],
    featureRefs: [],
    hostedStepRefs: [],
    categoryRef: 'processWizard',
    bffCalls: [
      {
        bffId: 'qryLocateServiceExecution',
        kind: 'query',
        operationId: 'locateServiceExecution',
        outputKind: 'list',
        entityRef: 'ServiceExecution',
      },
      {
        bffId: 'cmdDecideImageMoment',
        kind: 'command',
        operationId: 'decideImageMoment',
        outputKind: 'object',
        entityRef: 'ServiceImage',
      },
    ],
    sections: [{
      sectionId: 'attach',
      intent: 'Anexar.',
      organisms: [{ role: 'primarySurface', dataSource: 'qryLocateServiceExecution' }],
    }],
  }];
  model.operations = [
    {
      operationId: 'locateServiceExecution',
      title: 'Localizar execução',
      kind: 'query',
      entityRef: 'ServiceExecution',
      entityRefs: ['ServiceExecution'],
      accessPattern: { kind: 'list' },
      inputs: [],
      outputRefs: ['ServiceExecution.serviceExecutionId'],
      useRules: [],
      transitionRefs: [],
      story: ['Localizar'],
    },
    {
      operationId: 'decideImageMoment',
      title: 'Decidir momento',
      kind: 'command',
      entityRef: 'ServiceImage',
      entityRefs: ['ServiceImage', 'ServiceExecution'],
      accessPattern: { kind: 'commandInput' },
      inputs: [{
        inputId: 'serviceExecutionServiceExecutionId',
        fieldRef: { entityId: 'ServiceExecution', fieldId: 'serviceExecutionId' },
        source: 'selectedEntity',
        required: true,
        description: 'Execução',
      }],
      outputRefs: ['ServiceImage.serviceImageId'],
      useRules: [],
      transitionRefs: [],
      story: ['Decidir'],
    },
  ];
  const gate = validateNs4E8Model(model, incidentSources());
  assert.equal(
    gate.issues.some(issue => issue.code === 'NS4_E8_COMMAND_KEY_WITHOUT_SOURCE'),
    false,
    gate.issues.map(issue => `${issue.code}:${issue.message}`).join(' | '),
  );
});

test('inputSources from a command that produces the key is recorded, not a missing-source finding', () => {
  const model = incidentModel();
  const start = model.workspaces[0].bffCalls.find(call => call.bffId === 'cmdRegisterServiceStart');
  assert.ok(start);
  start!.inputSources = [{ inputId: 'serviceExecutionServiceExecutionId', bffId: 'cmdRegisterPetArrival' }];
  model.workspaces[0].bffCalls.push({
    bffId: 'cmdRegisterPetArrival',
    kind: 'command',
    operationId: 'registerPetArrival',
    outputKind: 'object',
    entityRef: 'ServiceExecution',
  });
  model.operations.push({
    operationId: 'registerPetArrival',
    title: 'Chegada',
    kind: 'command',
    entityRef: 'ServiceExecution',
    entityRefs: ['ServiceExecution'],
    accessPattern: { kind: 'commandInput' },
    inputs: [{
      inputId: 'serviceAppointmentServiceAppointmentId',
      fieldRef: { entityId: 'ServiceAppointment', fieldId: 'serviceAppointmentId' },
      source: 'selectedEntity',
      required: true,
      description: 'Agendamento',
    }],
    outputRefs: ['ServiceExecution.serviceExecutionId'],
    useRules: [],
    transitionRefs: [],
    story: ['Chegada'],
  });
  const gate = validateNs4E8Model(model, incidentSources());
  const startMissing = gate.issues.filter(issue =>
    issue.code === 'NS4_E8_COMMAND_KEY_WITHOUT_SOURCE' && issue.path.includes('cmdRegisterServiceStart'));
  assert.equal(startMissing.length, 0, startMissing.map(issue => issue.message).join(' | '));
  const after = gate.issues.filter(issue =>
    issue.code === 'NS4_E8_COMMAND_KEY_AFTER_COMMAND' && issue.path.includes('cmdRegisterServiceStart'));
  assert.equal(after.length, 1);
  assert.equal(after[0].severity, 'warning');
  assert.match(after[0].message, /cmdRegisterPetArrival/);
});
