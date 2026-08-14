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
import {
  buildNs4E7Plan, buildNs4RealizedAccessArtifact, buildNs4RealizedJourneyArtifact,
  buildNs4UseCaseArtifacts, buildNs4WorkflowArtifacts, normalizeNs4UseCaseDraft,
} from '/_102020_/l2/agentNewSolution4/steps/e7/contracts.js';
import { deriveNs4Contexts } from '/_102020_/l2/agentNewSolution4/helpers/ns4Context.js';
import { createNs4E7LifecycleResolutionReview } from '/_102020_/l2/agentNewSolution4/steps/e7/lifecycleResolution.js';
import { validateNs4E7Plan, validateNs4UseCaseDraft, validateNs4Workflows } from '/_102020_/l2/agentNewSolution4/steps/e7/gate.js';
import { shrinkNs4WorkflowToReachable } from '/_102020_/l2/agentNewSolution4/steps/e7/reachability.js';
import {
  isNs4E7ValidationReport, mergeNs4E7ValidationAttempts, NS4_E7_VALIDATION_REPORT_VERSION,
} from '/_102020_/l2/agentNewSolution4/steps/e7/validationReport.js';

const lifecycleFixture = JSON.parse(readFileSync(new URL('fixtures/a2_1-lifecycle-gate.json', import.meta.url), 'utf8')) as {
  binaryFlag: { states: string[]; initialState: string; terminalStates: string[]; predicateState: string };
  expectedMissing: string[];
  expectedSystemDecisions: string[];
  fixedPoint: { entityId: string; states: string[]; initialState: string; terminalStates: string[]; transitions: any[]; expectedRemovedStates: string[] };
  run36: { entityId: string; states: string[]; initialState: string; terminalStates: string[]; predicate: { predicateId: string; stateIds: string[] }; transition: any };
};
const run38ValidationFixture = JSON.parse(readFileSync(new URL('fixtures/run38-validation-report-rounds.json', import.meta.url), 'utf8')) as {
  previous: { schemaVersion: string; moduleName: string; attempts: Array<{ round: number; invalid: number }> };
  nextAttempt: { round: number; invalid: number };
};

const journeys = normalizeNs4E2Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', reviewRound: 1,
  journeys: [
    { journeyId: 'manageProjects', business: { actorRef: 'projectManager', title: 'Projetos', goal: 'Selecionar projeto.', entry: { mode: 'coldStart' }, useRules: [],
      steps: [{ stepId: 'locateProject', kind: 'locate', entity: 'Project', title: 'Localizar projeto.', description: 'Projeto selecionado.', featureRefs: ['projects'] }], outcome: { statement: 'Projeto selecionado.', evidence: [] } } },
    { journeyId: 'createTask', business: { actorRef: 'projectManager', title: 'Tarefa', goal: 'Criar tarefa.', entry: { mode: 'contextOrLookup' }, useRules: [],
      steps: [
        { stepId: 'locateProject', kind: 'locate', entity: 'Project', title: 'Manter ou localizar projeto.', description: 'Projeto selecionado.', featureRefs: ['projects'] },
        { stepId: 'createWorkTask', kind: 'act', entity: 'WorkTask', title: 'Criar tarefa.', description: 'Tarefa criada.', featureRefs: ['tasks'] },
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
      fields: [{ fieldId: 'projectId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] }, { fieldId: 'name', title: 'Nome', type: 'string', required: true, description: 'Nome.', constraints: [] }], lifecycleStates: [], lifecyclePredicates: [], useRules: ['projectCandidateRule'], storage: { target: 'mdm', scope: 'organization', idField: 'projectId', mdmType: 'buildFlowFsm.Project', notes: 'Cadastro base.' } },
    { entityId: 'WorkTask', title: 'Tarefa', description: 'Tarefa.', kind: 'core', ownership: 'moduleOwned', sourceRefs: { journeyIds: ['createTask'], featureIds: ['tasks'], authorityRefs: ['buildflow:taskwrite'] },
      fields: [{ fieldId: 'workTaskId', title: 'Id', type: 'uuid', required: true, description: 'Id.', constraints: [] }, { fieldId: 'projectId', title: 'Projeto', type: 'uuid', required: true, description: 'Projeto.', constraints: [] }], lifecycleStates: ['open', 'done'], initialState: 'open', terminalStates: ['done'], lifecyclePredicates: [], useRules: [], storage: { target: 'moduleDatabase', scope: 'module', idField: 'workTaskId', notes: 'Operacional.' } },
  ], relationships: [{ relationshipId: 'taskBelongsToProject', fromEntity: 'WorkTask', toEntity: 'Project', type: 'manyToOne', required: true, description: 'Tarefa pertence ao projeto.', persistence: { mode: 'crossStoreReference' }, realization: { kind: 'fieldReference', ownerEntity: 'WorkTask', from: { entityId: 'WorkTask', fieldIds: ['projectId'] }, to: { entityId: 'Project', fieldIds: ['projectId'] }, description: 'Referência ao projeto.' } }], changeSummary: [] });

const rules: Ns4RulesArtifact = { schemaVersion: '2026-08-09-ns4-rules-v2', moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', rules: [{ id: 'projectCandidateRule', description: 'Regra candidata aplicada somente quando o comportamento exigir.' }], rulesHash: 'sha256:rules', approvedBy: 'auto', approvedAt: '2026-08-10T00:00:00.000Z', realization: { status: 'pending', compiledFromRulesHash: 'sha256:rules' } };
const sourceHashes = { journeys: journeys.journeys.map(journey => ({ journeyId: journey.journeyId, businessHash: `sha256:${journey.journeyId}` })), ontologyHash: 'sha256:ontology', rulesHash: rules.rulesHash };
const sources = { journeys, access, ontology, rules };
const derivedContexts = deriveNs4Contexts(sources);

test('E7 mechanically deduplicates repeated journey step ids and covers every source step', () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes, derivedContexts);
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
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e8');
});

test('E7 validates a minimal behavior contract without backend field instructions', () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes, derivedContexts);
  const draft = normalizeNs4UseCaseDraft({ title: 'Localizar projeto', description: 'Localiza projetos.',
    contexts: { requires: [], provides: ['selectedProject'] }, entityRefs: ['Project'],
    useRules: [], transitions: [] }, plan, 'locateProject');
  assert.deepEqual(validateNs4UseCaseDraft(plan, draft, sources), { ok: true, issues: [] });
  assert.equal('actorRefs' in draft, false);
  assert.equal('authorityRefs' in draft, false);
  assert.equal('dataScopes' in draft, false);
  assert.equal('ports' in draft, false);
  assert.equal('query' in draft, false);
  assert.equal('inputs' in draft, false);
  assert.equal('outputs' in draft, false);
  assert.equal('reads' in draft, false);
  assert.equal('writes' in draft, false);
  assert.equal('errors' in draft, false);
});

test('E7 warns when an inspection ignores lifecycle eligibility rules of its principal entity', () => {
  const inspectionJourneys = normalizeNs4E2Review({ moduleName: 'buildFlowFsm', userLanguage: 'pt-BR', reviewRound: 1,
    journeys: [{ journeyId: 'inspectProjects', business: { actorRef: 'projectManager', title: 'Projetos', goal: 'Inspecionar projeto.', entry: { mode: 'coldStart' }, useRules: [],
      steps: [{ stepId: 'inspectProject', kind: 'inspect', title: 'Inspecionar projeto.', description: 'Projeto inspecionado.', featureRefs: ['projects'] }],
      outcome: { statement: 'Projeto inspecionado.', evidence: [] } } }],
    features: [{ featureId: 'projects', title: 'Projetos', priority: 'now', journeyStepRefs: ['inspectProjects.inspectProject'] }],
  });
  const inspectionOntology = normalizeNs4E4Review({ ...ontology, entities: ontology.entities.map(entity => entity.entityId === 'Project'
    ? { ...entity, lifecyclePredicates: ['projectMustBeActive'] }
    : entity) });
  const inspectionSources = { ...sources, journeys: inspectionJourneys, ontology: inspectionOntology };
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', inspectionJourneys, { journeys: [], ontologyHash: 'sha256:ontology', rulesHash: rules.rulesHash }, deriveNs4Contexts(inspectionSources));
  const draft = normalizeNs4UseCaseDraft({ title: 'Inspecionar projeto', description: 'Consulta projeto elegível.', contexts: { requires: [], provides: [] },
    entityRefs: ['Project'], useRules: [], transitions: [] }, plan, 'inspectProject');

  const result = validateNs4UseCaseDraft(plan, draft, inspectionSources);

  assert.equal(result.ok, true, JSON.stringify(result.issues));
  assert.ok(result.issues.some(issue => issue.code === 'NS4_E7_INSPECTION_ELIGIBILITY_RULES' && issue.severity === 'warning'));
});

test('E7 emits typed use cases, workflows and realization metadata without changing business hashes', async () => {
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', journeys, sourceHashes, derivedContexts);
  const drafts = plan.useCases.map(target => normalizeNs4UseCaseDraft(target.kind === 'query' ? {
    title: target.title, description: 'Localiza projetos.', contexts: { requires: [], provides: ['selectedProject'] },
    entityRefs: ['Project'], useRules: [], transitions: [] } : {
    title: target.title, description: 'Cria tarefa.', contexts: { requires: ['selectedProject'], provides: ['createdTask'] },
    entityRefs: ['Project', 'WorkTask'], useRules: [], transitions: [{ transitionId: 'completeTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [] }] }, plan, target.useCaseId));
  drafts.forEach(draft => assert.equal(validateNs4UseCaseDraft(plan, draft, sources).ok, true));
  const generatedAt = '2026-08-10T01:00:00.000Z';
  const built = await buildNs4UseCaseArtifacts(plan, drafts, generatedAt);
  const workflows = await buildNs4WorkflowArtifacts(plan, drafts, new Map(ontology.entities.map(entity => [entity.entityId, {
    states: entity.lifecycleStates, initialState: entity.initialState, terminalStates: entity.terminalStates,
  }])), generatedAt);
  assert.equal(validateNs4Workflows(workflows.artifacts, sources, built.artifacts.map(artifact => artifact.useCaseId)).ok, true);
  assert.equal('sourceHashes' in built.artifacts[0], false);
  assert.equal('userLanguage' in built.artifacts[0], false);
  assert.equal('generatedAt' in built.artifacts[0], false);
  const createTask = built.artifacts.find(artifact => artifact.useCaseId === 'createWorkTask');
  assert.ok(createTask);
  assert.equal('transitions' in createTask, false);
  assert.deepEqual(createTask.transitionRefs, ['completeTask']);
  const sourceJourneys = await buildNs4JourneyArtifacts(journeys);
  const realized = await buildNs4RealizedJourneyArtifact(sourceJourneys[1], built.artifacts, derivedContexts);
  assert.equal(realized.businessHash, sourceJourneys[1].businessHash);
  assert.equal(realized.realization.status, 'compiled');
  const accessArtifact = await buildNs4AccessMatrixArtifact(access, 'auto', generatedAt);
  const realizedAccess = await buildNs4RealizedAccessArtifact(accessArtifact, built.artifacts);
  assert.equal(realizedAccess.realization.status, 'useCasesCompiled');
  assert.ok(realizedAccess.realization.useCaseAuthorityRefs.length >= 2);
  assert.equal(buildNs4JourneyIndex('buildFlowFsm', journeys, sourceJourneys, sourceJourneys.map(item => `l4/buildFlowFsm/journeys/${item.journeyId}.defs.ts`), 'auto', generatedAt).journeys.length, 2);
});

test('E7 rejects a declared lifecycle state without an incoming transition', () => {
  const unreachableWorkflow = {
    schemaVersion: '2026-08-11-ns4-workflow-v4', moduleName: 'buildFlowFsm', workflowId: 'workTaskLifecycle',
    entityRef: 'WorkTask', initialState: 'open', terminalStates: ['done'],
    states: ['open', 'done', 'withdrawn'],
    transitions: [{ transitionId: 'completeTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [], useCaseId: 'createWorkTask' }],
    workflowHash: 'sha256:test',
  } as any;
  const result = validateNs4Workflows([unreachableWorkflow], sources, ['createWorkTask']);
  const finding = result.issues.find(issue => issue.code === 'workflow.state.unreachable' && /withdrawn/.test(issue.message));
  assert.ok(finding);
  assert.deepEqual(finding.repairOptions?.map(option => [option.action, option.owner]), [
    ['operateState', 'e2'], ['shrinkLifecycle', 'e4'],
  ]);

  const shrunkLifecycle = { ...unreachableWorkflow, states: ['open', 'done'] };
  assert.equal(validateNs4Workflows([shrunkLifecycle], sources, ['createWorkTask']).ok, true);
});

test('E7 accepts an E2-derived operation that makes a lifecycle state reachable', () => {
  const operatedOntology = normalizeNs4E4Review({ ...ontology, entities: ontology.entities.map(entity => entity.entityId === 'WorkTask'
    ? { ...entity, lifecycleStates: ['open', 'done', 'withdrawn'], initialState: 'open', terminalStates: ['done', 'withdrawn'] }
    : entity) });
  const operatedSources = { ...sources, ontology: operatedOntology };
  const operatedWorkflow = {
    schemaVersion: '2026-08-11-ns4-workflow-v4', moduleName: 'buildFlowFsm', workflowId: 'workTaskLifecycle',
    entityRef: 'WorkTask', initialState: 'open', terminalStates: ['done', 'withdrawn'], states: ['open', 'done', 'withdrawn'],
    transitions: [
      { transitionId: 'completeTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [], useCaseId: 'createWorkTask' },
      { transitionId: 'withdrawTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'withdrawn', useRules: [], useCaseId: 'withdrawWorkTask' },
    ],
    workflowHash: 'sha256:test',
  } as any;

  assert.equal(validateNs4Workflows([operatedWorkflow], operatedSources, ['createWorkTask', 'withdrawWorkTask']).ok, true);
});

test('E7 accepts a system transition and rejects an unknown or ambiguous transition operator', () => {
  const systemWorkflow = {
    schemaVersion: '2026-08-11-ns4-workflow-v4', moduleName: 'buildFlowFsm', workflowId: 'workTaskLifecycle',
    entityRef: 'WorkTask', initialState: 'open', terminalStates: ['done'], states: ['open', 'done'],
    transitions: [{ transitionId: 'expireTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [], trigger: 'system' }],
    workflowHash: 'sha256:test',
  } as any;
  assert.equal(validateNs4Workflows([systemWorkflow], sources, []).ok, true);

  systemWorkflow.transitions[0].useCaseId = 'missingUseCase';
  const ambiguous = validateNs4Workflows([systemWorkflow], sources, []);
  assert.ok(ambiguous.issues.some(issue => issue.code === 'workflow.transition.operation'));
});

test('E7 suppresses predicate cascade when an intermediate lifecycle has no workflow', () => {
  const lifecycleOntology = normalizeNs4E4Review({ ...ontology, entities: ontology.entities.map(entity => entity.entityId === 'WorkTask'
    ? { ...entity, lifecycleStates: ['open', 'billable', 'done'], initialState: 'open', terminalStates: ['done'],
      lifecyclePredicates: [{ predicateId: 'billable', description: 'Ready for billing.', stateIds: ['billable'], source: 'journey' }] }
    : entity) });
  const lifecycleSources = { ...sources, ontology: lifecycleOntology };
  const workflow = {
    schemaVersion: '2026-08-11-ns4-workflow-v4', moduleName: 'buildFlowFsm', workflowId: 'workTaskLifecycle',
    entityRef: 'WorkTask', initialState: 'open', terminalStates: ['done'], states: ['open', 'billable', 'done'],
    transitions: [{ transitionId: 'completeTask', entityRef: 'WorkTask', fromStates: ['open'], toState: 'done', useRules: [], useCaseId: 'createWorkTask' }],
    workflowHash: 'sha256:test',
  } as any;
  const deadPredicate = validateNs4Workflows([workflow], lifecycleSources, ['createWorkTask']);
  assert.ok(deadPredicate.issues.some(issue => issue.code === 'workflow.predicate.dead' && /billable/.test(issue.message)));

  const missingWorkflow = validateNs4Workflows([], lifecycleSources, []);
  assert.deepEqual(missingWorkflow.issues.map(issue => issue.code), ['workflow.missing']);
  const resolution = createNs4E7LifecycleResolutionReview('buildFlowFsm', missingWorkflow.issues);
  assert.deepEqual(resolution.findings[0]?.repairOptions?.map(option => option.action), ['operateState', 'shrinkLifecycle']);
});

test('E7 exempts binary lifecycle flags and treats the initial state as predicate-reachable', () => {
  const binarySources = {
    ...sources,
    ontology: normalizeNs4E4Review({ ...ontology, entities: ontology.entities.map(entity => entity.entityId === 'WorkTask'
      ? { ...entity, lifecycleStates: lifecycleFixture.binaryFlag.states, initialState: lifecycleFixture.binaryFlag.initialState, terminalStates: lifecycleFixture.binaryFlag.terminalStates,
        lifecyclePredicates: [{ predicateId: 'isActive', description: 'Active records only.', stateIds: [lifecycleFixture.binaryFlag.predicateState], source: 'journey' }] }
      : entity) }),
  };
  assert.deepEqual(validateNs4Workflows([], binarySources, []), { ok: true, issues: [] });
});

test('run 32 omits transitionless workflows and records every fixed-point lifecycle resolution', async () => {
  const run32Sources = {
    ...sources,
    ontology: normalizeNs4E4Review({ ...ontology, entities: [
      { ...ontology.entities[0], lifecycleStates: ['planned', 'active', 'archived'], initialState: 'planned', terminalStates: ['archived'], lifecyclePredicates: [{ predicateId: 'isActive', description: 'Project can be used.', stateIds: ['active'], source: 'journey' }] },
      { ...ontology.entities[1], lifecycleStates: ['notStarted', 'inProgress', 'completed'], initialState: 'notStarted', terminalStates: ['completed'], lifecyclePredicates: [] },
      { ...ontology.entities[1], entityId: 'Invoice', lifecycleStates: ['prepared', 'issued', 'paid', 'voided'], initialState: 'prepared', terminalStates: ['paid', 'voided'], lifecyclePredicates: [] },
    ] }),
  };
  const plan = buildNs4E7Plan('buildFlowFsm', 'pt-BR', normalizeNs4E2Review({ moduleName: 'buildFlowFsm', journeys: [], features: [] }), {
    journeys: [], ontologyHash: 'sha256:ontology', rulesHash: 'sha256:rules',
  }, deriveNs4Contexts({ journeys: { journeys: [] }, ontology: { entities: [], relationships: [] } }));
  const built = await buildNs4WorkflowArtifacts(plan, [], new Map(run32Sources.ontology.entities.map(entity => [entity.entityId, {
    states: entity.lifecycleStates, initialState: entity.initialState, terminalStates: entity.terminalStates,
    lifecyclePredicates: entity.lifecyclePredicates.map(predicate => ({ predicateId: predicate.predicateId, stateIds: predicate.stateIds })),
  }])), '2026-08-12T12:00:00.000Z');
  assert.equal(built.artifacts.length, 0);
  assert.deepEqual(built.index.systemDecisions.map(decision => decision.decisionId), lifecycleFixture.expectedSystemDecisions);
  assert.ok(built.index.systemDecisions.every(decision => decision.alternatives.includes('operateState')));
  assert.equal(validateNs4Workflows(built.artifacts, run32Sources, [], built.index.systemDecisions).ok, true);
  assert.equal(validateNs4Workflows(built.artifacts, run32Sources, []).ok, false);
});

test('E7 reachability reaches a fixed point when removing b makes c unreachable', () => {
  const fixture = lifecycleFixture.fixedPoint;
  const result = shrinkNs4WorkflowToReachable(fixture.initialState, fixture.states, fixture.transitions);
  assert.deepEqual(result.removedStates, fixture.expectedRemovedStates);
  assert.deepEqual(result.states, [fixture.initialState]);
  assert.deepEqual(result.transitions, []);
});

test('run 36 shrinks source-only reviewed, cascades shared, records the dormant predicate and passes the invariant gate', async () => {
  const fixture = lifecycleFixture.run36;
  const plan = buildNs4E7Plan('buildFlowFsm36', 'en', normalizeNs4E2Review({ moduleName: 'buildFlowFsm36', journeys: [], features: [] }), {
    journeys: [], ontologyHash: 'sha256:ontology', rulesHash: 'sha256:rules',
  }, deriveNs4Contexts({ journeys: { journeys: [] }, ontology: { entities: [], relationships: [] } }));
  const draft = normalizeNs4UseCaseDraft({ moduleName: 'buildFlowFsm36', useCaseId: 'shareStatusReport', description: 'Share report.', entityRefs: [fixture.entityId], useRules: [], transitions: [fixture.transition] },
    { ...plan, useCases: [{ useCaseId: 'shareStatusReport', title: 'Share report', kind: 'command', compiledFrom: ['shareProjectStatusReport.shareStatusReport'], contexts: { requires: [], provides: [] } }] }, 'shareStatusReport');
  const built = await buildNs4WorkflowArtifacts(plan, [draft], new Map([[fixture.entityId, {
    states: fixture.states, initialState: fixture.initialState, terminalStates: fixture.terminalStates, lifecyclePredicates: [fixture.predicate],
  }]]), '2026-08-12T23:00:00.000Z');
  assert.equal(built.artifacts.length, 0);
  assert.deepEqual(built.index.systemDecisions.filter(decision => decision.chosen === 'shrinkLifecycle').map(decision => decision.findingRef), [
    'workflow.state.unreachable:ProjectStatusReport.reviewed',
    'workflow.state.unreachable:ProjectStatusReport.shared',
  ]);
  assert.ok(built.index.systemDecisions.some(decision => decision.findingRef === 'workflow.predicate.dead:ProjectStatusReport.reviewedStatusReport'
    && decision.chosen === 'leavePredicateDormant'));
  const run36Ontology = normalizeNs4E4Review({ ...ontology, moduleName: 'buildFlowFsm36', entities: [{ ...ontology.entities[1], entityId: fixture.entityId,
    lifecycleStates: fixture.states, initialState: fixture.initialState, terminalStates: fixture.terminalStates,
    lifecyclePredicates: [{ ...fixture.predicate, description: 'Reviewed before sharing.', source: 'journey' }] }] });
  assert.equal(validateNs4Workflows(built.artifacts, { ...sources, ontology: run36Ontology }, ['shareStatusReport'], built.index.systemDecisions).ok, true);
});

test('E7 accepts an ontology with no lifecycle workflows', () => {
  const noLifecycleSources = {
    ...sources,
    ontology: normalizeNs4E4Review({ ...ontology, entities: ontology.entities.map(entity => ({
      ...entity, lifecycleStates: [], lifecyclePredicates: [],
      initialState: undefined, terminalStates: undefined,
    })) }),
  };
  assert.deepEqual(validateNs4Workflows([], noLifecycleSources, []), { ok: true, issues: [] });
});

test('E7 reasoning prompt keeps use cases channel-neutral', () => {
  const prompt = readFileSync(new URL('promptUseCase.md', import.meta.url), 'utf8');
  assert.match(prompt, /neutral to channel, caller and software\s+architecture/i);
  assert.match(prompt, /Never include actors, profiles, authorities or data scopes/i);
  assert.match(prompt, /Never include repositories, ports, adapters, MDM routing/i);
  assert.match(prompt, /<!--\s*modelType:\s*reasoning\s*-->/);
});

test('run 38 preserves the initial E7 finding when the repair round passes', () => {
  assert.equal(run38ValidationFixture.previous.schemaVersion, NS4_E7_VALIDATION_REPORT_VERSION);
  assert.equal(isNs4E7ValidationReport(run38ValidationFixture.previous, 'buildFlowFsm38'), true);
  const attempts = mergeNs4E7ValidationAttempts(run38ValidationFixture.previous.attempts, run38ValidationFixture.nextAttempt);
  assert.deepEqual(attempts.map(attempt => attempt.round), [0, 1]);
  assert.equal(attempts[0].invalid, 1);
  assert.equal(attempts[1].invalid, 0);
});

test('E7 validation report replay replaces only the matching round', () => {
  const attempts = mergeNs4E7ValidationAttempts(
    [...run38ValidationFixture.previous.attempts, run38ValidationFixture.nextAttempt],
    { ...run38ValidationFixture.nextAttempt, invalid: 1 },
  );
  assert.deepEqual(attempts.map(attempt => attempt.round), [0, 1]);
  assert.equal(attempts[1].invalid, 1);
});
