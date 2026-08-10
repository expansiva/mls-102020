import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';

import {
  createNs4E7Step, createNs4Pipeline, markNs4E6Approved, markNs4E7Approved,
  NS4_E7_MAX_PARALLEL, resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { normalizeNs4E2Review, buildNs4JourneyArtifacts, buildNs4JourneyIndex } from '/_102020_/l2/agentNewSolution4/steps/e2/contracts.js';
import { buildNs4AccessMatrixArtifact, normalizeNs4E3Review } from '/_102020_/l2/agentNewSolution4/steps/e3/contracts.js';
import { normalizeNs4E4Review } from '/_102020_/l2/agentNewSolution4/steps/e4/contracts.js';
import type { Ns4RulesArtifact } from '/_102020_/l2/agentNewSolution4/steps/e5/contracts.js';
import type { Ns4CompositionArtifact } from '/_102020_/l2/agentNewSolution4/steps/e6/contracts.js';
import {
  buildNs4E7Plan, buildNs4RealizedAccessArtifact, buildNs4RealizedJourneyArtifact,
  buildNs4UseCaseArtifacts, buildNs4WorkflowArtifacts, normalizeNs4UseCaseDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import {
  reconcileNs4UseCaseDraft, validateNs4E7Plan, validateNs4UseCaseDraft, validateNs4Workflows,
} from '/_102020_/l2/agentNewSolution4/steps/e7/gate.js';

const journeys = normalizeNs4E2Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', reviewRound: 1,
  journeys: [
    { journeyId: 'manageProjects', business: { actorRef: 'projectManager', title: 'Projetos', goal: 'Selecionar projeto.', prerequisites: [],
      entry: { mode: 'coldStart', carries: [] }, useRules: [],
      steps: [{ stepId: 'locateProject', kind: 'locate', intent: 'Localizar projeto.', requiresContext: [],
        providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto selecionado.' }],
        result: 'Projeto selecionado.', featureRefs: ['projects'] }], outcome: { statement: 'Projeto selecionado.', evidence: [] } } },
    { journeyId: 'createTask', business: { actorRef: 'projectManager', title: 'Tarefa', goal: 'Criar tarefa.', prerequisites: [],
      entry: { mode: 'contextOrLookup', carries: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto selecionado.' }] }, useRules: [],
      steps: [
        { stepId: 'locateProject', kind: 'locate', intent: 'Manter ou localizar projeto.', requiresContext: [],
          providesContext: [{ contextId: 'selectedProject', businessObject: 'Project', cardinality: 'one', required: true, description: 'Projeto selecionado.' }], result: 'Projeto selecionado.', featureRefs: ['projects'] },
        { stepId: 'createWorkTask', kind: 'act', intent: 'Criar tarefa.', requiresContext: ['selectedProject'],
          providesContext: [{ contextId: 'createdTask', businessObject: 'WorkTask', cardinality: 'one', required: true, description: 'Tarefa criada.' }], result: 'Tarefa criada.', featureRefs: ['tasks'] },
      ], outcome: { statement: 'Tarefa criada.', evidence: [] } } },
  ], features: [
    { featureId: 'projects', title: 'Projetos', priority: 'now', journeyStepRefs: ['manageProjects.locateProject', 'createTask.locateProject'] },
    { featureId: 'tasks', title: 'Tarefas', priority: 'now', journeyStepRefs: ['createTask.createWorkTask'] },
  ] });

const access = normalizeNs4E3Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', reviewRound: 1,
  profiles: [{ profileId: 'projectManager', title: 'Gerente', kind: 'internal', description: 'Gerencia projetos.', actorRefs: ['projectManager'], landingIntent: 'Projetos.' }],
  authorities: [
    { authorityRef: 'buildflow:projectread', title: 'Projetos', description: 'Ler projetos.', journeyStepRefs: ['manageProjects.locateProject', 'createTask.locateProject'], informationNeeds: [] },
    { authorityRef: 'buildflow:taskwrite', title: 'Tarefas', description: 'Criar tarefas.', journeyStepRefs: ['createTask.createWorkTask'], informationNeeds: [] },
  ], grants: [
    { profileRef: 'projectManager', authorityRef: 'buildflow:projectread', reason: 'Selecionar projeto.', dataScope: { mode: 'assigned', description: 'Projetos atribuídos.' }, disclosure: { mode: 'fullRecord', description: 'Registro completo.', allowedInformation: [], deniedInformation: [] }, useRules: [] },
    { profileRef: 'projectManager', authorityRef: 'buildflow:taskwrite', reason: 'Criar tarefa.', dataScope: { mode: 'assigned', description: 'Projetos atribuídos.' }, disclosure: { mode: 'fullRecord', description: 'Registro completo.', allowedInformation: [], deniedInformation: [] }, useRules: [] },
  ] });

const ontology = normalizeNs4E4Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', title: 'Ontologia', reviewRound: 1, solutionMode: 'new', businessDomain: 'Projetos',
  entities: [
    { entityId: 'Project', title: 'Projeto', description: 'Projeto.', kind: 'mdm', ownership: 'moduleOwned', sourceRefs: { journeyIds: ['manageProjects', 'createTask'], featureIds: ['projects'], authorityRefs: ['buildflow:projectread'] },
      fields: [{ fieldId: 'projectId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] }, { fieldId: 'name', title: 'Nome', type: 'string', required: true, description: 'Nome.', constraints: [] }], lifecycleStates: ['active', 'completed'], lifecyclePredicates: [], useRules: ['projectCandidateRule'], storage: { target: 'mdm', scope: 'organization', idField: 'projectId', mdmType: 'buildFlowFsm.Project', notes: 'Cadastro base.' } },
    { entityId: 'WorkTask', title: 'Tarefa', description: 'Tarefa.', kind: 'core', ownership: 'moduleOwned', sourceRefs: { journeyIds: ['createTask'], featureIds: ['tasks'], authorityRefs: ['buildflow:taskwrite'] },
      fields: [{ fieldId: 'workTaskId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] }, { fieldId: 'projectId', title: 'Projeto', type: 'uuid', required: true, description: 'Projeto.', constraints: [] }], lifecycleStates: ['open', 'done'], lifecyclePredicates: [], useRules: [], storage: { target: 'moduleDatabase', scope: 'module', idField: 'workTaskId', notes: 'Operacional.' } },
  ], relationships: [{ relationshipId: 'taskBelongsToProject', fromEntity: 'WorkTask', toEntity: 'Project', type: 'manyToOne', required: true, description: 'Tarefa pertence ao projeto.', persistence: { mode: 'crossStoreReference' }, realization: { kind: 'fieldReference', ownerEntity: 'WorkTask', from: { entityId: 'WorkTask', fieldIds: ['projectId'] }, to: { entityId: 'Project', fieldIds: ['projectId'] }, description: 'Referência ao projeto.' } }], changeSummary: [] });

const rules: Ns4RulesArtifact = { schemaVersion: '2026-08-09-ns4-rules-v2', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', rules: [{ id: 'projectCandidateRule', description: 'Regra candidata aplicada somente quando o comportamento exigir.' }], rulesHash: 'sha256:rules', approvedBy: 'auto', approvedAt: '2026-08-10T00:00:00.000Z', realization: { status: 'pending', compiledFromRulesHash: 'sha256:rules' } };
const composition: Ns4CompositionArtifact = { schemaVersion: '2026-08-09-ns4-composition-v1', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', analysisSummary: 'Sem adicionais.', recommendations: [], compositionHash: 'sha256:composition', approvedBy: 'auto', approvedAt: '2026-08-10T00:00:00.000Z', realization: { status: 'pending', compiledFromCompositionHash: 'sha256:composition' } };
const sourceHashes = { journeys: journeys.journeys.map(journey => ({ journeyId: journey.journeyId, businessHash: `sha256:${journey.journeyId}` })), accessHash: 'sha256:access', ontologyHash: 'sha256:ontology', rulesHash: rules.rulesHash, compositionHash: composition.compositionHash };
const sources = { journeys, access, ontology, rules, composition };

test('E7 mechanically deduplicates repeated journey step ids and covers every source step', () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes);
  assert.equal(plan.useCases.length, 2);
  assert.deepEqual(plan.useCases.find(item => item.useCaseId === 'locateProject')?.compiledFrom,
    ['createTask.locateProject', 'manageProjects.locateProject']);
  assert.deepEqual(validateNs4E7Plan(plan, sources), { ok: true, issues: [] });
  assert.equal(NS4_E7_MAX_PARALLEL, 20);
});

test('E7 is dependency-bound after E6 and advances a resumed module to E8', () => {
  const step = createNs4E7Step('buildFlowFsm', ['e6-result'], 'Conectar jornadas');
  assert.equal(step.status, 'waiting_dependency');
  assert.deepEqual(step.planning?.dependsOn, ['e6-result']);
  const pipeline = markNs4E6Approved(createNs4Pipeline('buildFlowFsm', 'Projetos'), 'auto', []);
  assert.equal(resolveNs4ExistingAction(true, pipeline, true), 'resume-e7');
  const approved = markNs4E7Approved(pipeline, ['l4/buildFlowFsm/usecases/index.defs.ts']);
  assert.equal(approved.nextStep, 'e8-workspaces');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-next');
});

test('E7 validates query context, authorities, scopes and exact ontology fields', () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes);
  const draft = normalizeNs4UseCaseDraft({ title: 'Localizar projeto', description: 'Localiza projetos visíveis.',
    actorRefs: ['projectManager'], authorityRefs: ['buildflow:projectread'],
    contexts: { requires: [], provides: [{ contextId: 'selectedProject', businessObject: 'Project', required: true, source: 'lookup', sourceRefs: ['createTask.locateProject', 'manageProjects.locateProject'] }] },
    inputs: [], outputs: [{ outputId: 'projectId', type: 'uuid', required: true, contextId: 'selectedProject', fieldRef: { entityId: 'Project', fieldId: 'projectId' }, description: 'Projeto selecionado.' }],
    reads: [{ entityId: 'Project', fieldRefs: ['projectId', 'name'], purpose: 'Localizar projetos.' }], writes: [], useRules: [],
    dataScopes: [{ profileRef: 'projectManager', authorityRef: 'buildflow:projectread', mode: 'assigned', description: 'Projetos atribuídos.' }],
    query: { filters: [], pagination: 'cursor', selection: 'single', orderBy: [{ entityId: 'Project', fieldId: 'name' }], projection: [{ entityId: 'Project', fieldId: 'projectId' }, { entityId: 'Project', fieldId: 'name' }] },
    errors: [], ports: [{ portId: 'projectReader', kind: 'mdm', purpose: 'Ler projetos.', entityRef: 'Project' }] }, plan, 'locateProject');
  assert.deepEqual(validateNs4UseCaseDraft(plan, draft, sources), { ok: true, issues: [] });
});

test('E7 mechanically fixes journey context lineage and preserves legitimate actor-session context', () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes);
  const draft = normalizeNs4UseCaseDraft({ title: 'Criar tarefa', description: 'Cria uma tarefa no projeto.',
    actorRefs: ['projectManager'], authorityRefs: ['buildflow:taskwrite'],
    contexts: { requires: [
      { contextId: 'selectedProject', businessObject: 'Project', required: true, source: 'entry', sourceRefs: ['manageProjects'] },
      { contextId: 'unplannedContext', businessObject: 'Project', required: true, source: 'entry', sourceRefs: ['manageProjects'] },
      { contextId: 'authenticatedProjectManager', businessObject: 'Project', required: true, source: 'actorSession', sourceRefs: ['projectManager'] },
    ], provides: [{ contextId: 'createdTask', businessObject: 'WorkTask', required: true, source: 'event', sourceRefs: ['wrong'] }] },
    inputs: [], outputs: [], reads: [], writes: [], useRules: [], dataScopes: [], command: { transaction: 'required', idempotency: 'recommended', transitions: [], emits: [] }, errors: [], ports: [] },
  plan, 'createWorkTask');
  const reconciled = reconcileNs4UseCaseDraft(plan, draft, sources);
  assert.deepEqual(reconciled.contexts.requires.map(context => [context.contextId, context.sourceRefs]), [
    ['selectedProject', ['createTask.locateProject']],
    ['authenticatedProjectManager', ['projectManager']],
  ]);
  assert.deepEqual(reconciled.contexts.provides.map(context => [context.contextId, context.sourceRefs]), [
    ['createdTask', ['createTask.createWorkTask']],
  ]);
});

test('E7 emits typed use cases, workflows and realization metadata without changing business hashes', async () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes);
  const drafts = plan.useCases.map(target => normalizeNs4UseCaseDraft(target.kind === 'query' ? {
    title: target.title, description: 'Localiza projetos.', actorRefs: ['projectManager'], authorityRefs: ['buildflow:projectread'], contexts: { requires: [], provides: [{ contextId: 'selectedProject', businessObject: 'Project', required: true, source: 'lookup', sourceRefs: target.compiledFrom }] }, inputs: [], outputs: [{ outputId: 'projectId', type: 'uuid', required: true, contextId: 'selectedProject', fieldRef: { entityId: 'Project', fieldId: 'projectId' }, description: 'Projeto selecionado.' }], reads: [{ entityId: 'Project', fieldRefs: ['projectId'], purpose: 'Ler projeto.' }], writes: [], useRules: [], dataScopes: [{ profileRef: 'projectManager', authorityRef: 'buildflow:projectread', mode: 'assigned', description: 'Projetos atribuídos.' }], query: { filters: [], pagination: 'cursor', selection: 'single', orderBy: [], projection: [{ entityId: 'Project', fieldId: 'projectId' }] }, errors: [], ports: [{ portId: 'projectReader', kind: 'mdm', purpose: 'Ler projeto.', entityRef: 'Project' }] } : {
    title: target.title, description: 'Cria tarefa.', actorRefs: ['projectManager'], authorityRefs: ['buildflow:taskwrite'], contexts: { requires: [{ contextId: 'selectedProject', businessObject: 'Project', required: true, source: 'entry', sourceRefs: ['createTask.entry'] }], provides: [{ contextId: 'createdTask', businessObject: 'WorkTask', required: true, source: 'previousStep', sourceRefs: ['createTask.createWorkTask'] }] }, inputs: [], outputs: [{ outputId: 'workTaskId', type: 'uuid', required: true, contextId: 'createdTask', fieldRef: { entityId: 'WorkTask', fieldId: 'workTaskId' }, description: 'Tarefa criada.' }], reads: [{ entityId: 'Project', fieldRefs: ['projectId'], purpose: 'Validar projeto.' }], writes: [{ entityId: 'WorkTask', fieldRefs: ['workTaskId', 'projectId'], purpose: 'Criar tarefa.' }], useRules: [], dataScopes: [{ profileRef: 'projectManager', authorityRef: 'buildflow:taskwrite', mode: 'assigned', description: 'Projetos atribuídos.' }], command: { transaction: 'required', idempotency: 'recommended', transitions: [{ transitionId: 'completeTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [] }], emits: [] }, errors: [], ports: [{ portId: 'workTaskRepository', kind: 'repository', purpose: 'Persistir tarefa.', entityRef: 'WorkTask' }] }, plan, target.useCaseId));
  drafts.forEach(draft => assert.equal(validateNs4UseCaseDraft(plan, draft, sources).ok, true));
  const generatedAt = '2026-08-10T01:00:00.000Z';
  const built = await buildNs4UseCaseArtifacts(plan, drafts, generatedAt);
  const workflows = await buildNs4WorkflowArtifacts(plan, built.artifacts, new Map(ontology.entities.map(entity => [entity.entityId, entity.lifecycleStates])), generatedAt);
  assert.equal(validateNs4Workflows(workflows.artifacts, sources).ok, true);
  const sourceJourneys = await buildNs4JourneyArtifacts(journeys);
  const realized = await buildNs4RealizedJourneyArtifact(sourceJourneys[1], built.artifacts);
  assert.equal(realized.businessHash, sourceJourneys[1].businessHash);
  assert.equal(realized.realization.status, 'compiled');
  const accessArtifact = await buildNs4AccessMatrixArtifact(access, 'auto', generatedAt);
  const realizedAccess = await buildNs4RealizedAccessArtifact(accessArtifact, built.artifacts);
  assert.equal(realizedAccess.realization.status, 'useCasesCompiled');
  assert.ok(realizedAccess.realization.useCaseAuthorityRefs.length >= 2);
  assert.equal(buildNs4JourneyIndex('buildFlowFsm', journeys, sourceJourneys, sourceJourneys.map(item => `l4/buildFlowFsm/journeys/${item.journeyId}.defs.ts`), 'auto', generatedAt).journeys.length, 2);
});

test('E7 reasoning prompt keeps use cases channel-neutral', () => {
  const prompt = readFileSync(new URL('promptUseCase.md', import.meta.url), 'utf8');
  assert.match(prompt, /never knows pages, routes, widgets, HTTP, BFF slices or navigation/i);
  assert.match(prompt, /<!--\s*modelType:\s*reasoning\s*-->/);
});
