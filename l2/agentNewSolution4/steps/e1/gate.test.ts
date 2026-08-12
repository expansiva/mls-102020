import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNs4PlannedSteps,
  buildNs4ModuleArtifact,
  createNs4Pipeline,
  formatNs4VisibleStepTitle,
  isNs4ModuleToken,
  markNs4E1Approved,
  markNs4E1Failed,
  markNs4E2Failed,
  markNs4E2Running,
  normalizeNs4Languages,
  normalizeNs4ModuleName,
  normalizeNs4RootPlan,
  NS4_FLOW_VERSION,
  NS4_PIPELINE_SCHEMA_VERSION,
  Ns4PipelineState,
  parseNs4Invocation,
  plainNs4StepTitle,
  resolveNs4DynamicWorker,
  resolveNs4DynamicWorkerRequest,
  resolveNs4ExistingAction,
  resolveNs4ExistingModuleToken,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution4/steps/e1/gate.js';
import {
  buildNs4ModuleArtifactFromReview,
  normalizeNs4E1Review,
  validateNs4E1Review,
} from '/_102020_/l2/agentNewSolution4/steps/e1/contracts.js';

const clarification = {
  planId: 'e1-clarification',
  userLanguage: 'pt-BR',
  title: 'Esclarecimento inicial',
  legends: [],
  questions: {
    moduleName: { type: 'open', question: 'Nome?', answer: 'petShop' },
    productLanguages: { type: 'open', question: 'Idiomas?', answer: 'pt-br, en, es' },
    mainActors: { type: 'open', question: 'Atores?', answer: 'Clientes e atendentes' },
    mainGoal: { type: 'open', question: 'Objetivo?', answer: 'Gerenciar reservas e vendas do pet shop.' },
    boundaries: { type: 'open', question: 'Limites?', answer: 'Sem prontuário veterinário.' },
  },
};

test('E1 builds a valid partial permanent module contract', () => {
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-04T10:00:00.000Z');
  assert.equal(validateNs4E1Module(artifact).ok, true);
  assert.equal(artifact.module.moduleName, 'petShop');
  assert.deepEqual(artifact.module.languages, ['pt-BR', 'en', 'es']);
  assert.equal(artifact.specStatus.completedSteps[0].status, 'approved');
  assert.equal(artifact.specStatus.nextStep, 'e2-journeys');
  assert.equal(artifact.specStatus.artifactCompleteness, 'partial');
});

test('E1 preserves the rich strategy, scope and localization contract', () => {
  const review = normalizeNs4E1Review({
    userLanguage: 'pt-BR', reviewRound: 2, reviewPolicy: { mode: 'guided' },
    module: { moduleName: 'petShop', title: 'Pet Shop', purpose: 'Gerenciar reservas e vendas.' },
    strategy: { mode: 'newSolution', rationale: 'Não existe sistema legado.', databaseChangePolicy: 'new' },
    businessScope: {
      mainGoal: 'Gerenciar reservas e vendas.',
      actors: [{ actorId: 'customer', title: 'Cliente', kind: 'external', expectedOutcome: 'Agendar um serviço.' }],
      expectedOutcomes: [{ outcomeId: 'serviceBooked', title: 'Serviço agendado', description: 'O cliente recebe confirmação.' }],
      inScope: ['agendamentos'], outOfScope: ['prontuário veterinário'],
    },
    localization: { productLanguages: ['pt-BR', 'en', 'es'], defaultLanguage: 'pt-BR', currency: 'BRL' },
    declaredConstraints: { mandatoryIntegrations: [] }, changeSummary: ['Escopo confirmado.'],
  });
  assert.deepEqual(validateNs4E1Review(review), { ok: true, issues: [] });
  const plan = normalizeNs4RootPlan({
    validPrompt: true, userPrompt: 'Criar pet shop', userLanguage: 'pt-BR',
    titles: Object.fromEntries([
      'e1-clarification', 'e1-compile', 'e2-journeys', 'e3-access-matrix', 'e4-ontology',
      'e5-rules', 'e6-behaviors', 'e7-realization', 'e8-workspaces', 'e9-navigation-compiler', 'e10-validation',
    ].map(id => [id, id])), clarification,
  }, 'Criar pet shop');
  const artifact = buildNs4ModuleArtifactFromReview(review, plan.userPrompt, 'human', plan.presentation);
  assert.equal(artifact.reviewPolicy.mode, 'guided');
  assert.equal(artifact.solutionStrategy.rationale, 'Não existe sistema legado.');
  assert.deepEqual(artifact.localization.productLanguages, ['pt-BR', 'en', 'es']);
  assert.equal(validateNs4E1Module(artifact).ok, true);
});

test('product languages are normalized, ordered and deduplicated independently of widget language', () => {
  assert.deepEqual(normalizeNs4Languages('pt-br, EN; es, pt-BR'), ['pt-BR', 'en', 'es']);
  assert.deepEqual(normalizeNs4Languages('', 'pt-br'), ['pt-BR']);
});

test('/fast is a standalone flag and is removed from the business prompt', () => {
  assert.deepEqual(parseNs4Invocation('petShop /fast'), { fast: true, prompt: 'petShop' });
  assert.deepEqual(parseNs4Invocation('/fastlane petShop'), { fast: false, prompt: '/fastlane petShop' });
});

test('root plan localizes and creates the complete visible roadmap before E1 starts', () => {
  const titles = {
    'e1-clarification': 'Confirmar contrato do módulo',
    'e1-compile': 'Compilar contrato inicial',
    'e2-journeys': 'Definir jornadas de negócio',
    'e3-access-matrix': 'Revisar acessos',
    'e4-ontology': 'Definir ontologia',
    'e5-rules': 'Organizar regras',
    'e6-behaviors': 'Definir comportamentos',
    'e7-realization': 'Conectar jornadas',
    'e8-workspaces': 'Desenhar áreas de trabalho',
    'e9-navigation-compiler': 'Compilar navegação',
    'e10-validation': 'Validar especificação',
  };
  const plan = normalizeNs4RootPlan({
    type: 'flexible',
    result: { validPrompt: true, userPrompt: 'Criar pet shop', userLanguage: 'pt-BR', titles, clarification },
  }, 'Criar pet shop');
  const steps = buildNs4PlannedSteps(plan);
  assert.equal(steps.length, 11);
  assert.equal(steps[0].stepTitle, `👤 ${titles['e1-clarification']}`);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.equal(steps[0].onFailure, 'wait_after_prompt');
  assert.deepEqual(steps[1].planning?.dependsOn, ['e1-clarification-answer']);
  assert.deepEqual(steps[2].planning?.dependsOn, ['e1-result']);
  assert.equal(steps[2].onFailure, 'wait_after_prompt');
  assert.equal(steps[2].stepTitle, `👤 ${titles['e2-journeys']}`);
  assert.deepEqual(steps[3].planning?.dependsOn, ['e2-result']);
  assert.equal(steps[3].onFailure, 'wait_after_prompt');
  assert.equal(steps[3].stepTitle, `👤 ${titles['e3-access-matrix']}`);
  assert.equal(steps[4].planning?.executionMode, 'sequential');
  assert.equal(steps[4].onFailure, 'wait_after_prompt');
  assert.equal(steps[4].stepTitle, `👤 ${titles['e4-ontology']}`);
  assert.equal(steps[5].planning?.executionMode, 'sequential');
  assert.equal(steps[5].onFailure, 'wait_after_prompt');
  assert.equal(steps[5].stepTitle, `👤 ${titles['e5-rules']}`);
  assert.equal(steps[6].planning?.executionMode, 'sequential');
  assert.equal(steps[6].onFailure, 'wait_after_prompt');
  assert.equal(steps[6].stepTitle, `👤 ${titles['e6-behaviors']}`);
  assert.equal(steps.filter(step => String(step.stepTitle || '').startsWith('👤 ')).length, 7);
  const artifact = buildNs4ModuleArtifact(plan.userPrompt, clarification, 'human', '2026-08-05T10:00:00.000Z', plan.presentation);
  const pipeline = createNs4Pipeline('petShop', plan.userPrompt, '2026-08-05T10:00:00.000Z', plan.presentation);
  assert.equal(artifact.presentation.userLanguage, 'pt-BR');
  assert.equal(artifact.presentation.stepTitles['e10-validation'], titles['e10-validation']);
  assert.deepEqual(pipeline.presentation, artifact.presentation);
});

test('human checkpoint icon is deterministic and never duplicated', () => {
  assert.equal(formatNs4VisibleStepTitle('e2-journeys', 'Revisar jornadas'), '👤 Revisar jornadas');
  assert.equal(formatNs4VisibleStepTitle('e2-journeys', '👤 Revisar jornadas'), '👤 Revisar jornadas');
  assert.equal(formatNs4VisibleStepTitle('e6-behaviors', 'Definir comportamentos'), '👤 Definir comportamentos');
  assert.equal(formatNs4VisibleStepTitle('e8-workspaces', 'Desenhar áreas'), '👤 Desenhar áreas');
  assert.equal(formatNs4VisibleStepTitle('e1-compile', 'Compilar contrato'), 'Compilar contrato');
  assert.equal(plainNs4StepTitle('👤 Revisar jornadas · G1'), 'Revisar jornadas · G1');
});

test('dynamic workers are dispatched by hook args when planning metadata is absent', () => {
  assert.equal(resolveNs4DynamicWorker('entity:PublishedClientStatus'), 'e4');
  assert.equal(resolveNs4DynamicWorker('rule:restrictProjectUpdate'), '');
  assert.equal(resolveNs4DynamicWorker('{"planId":"e4-ontology"}'), '');
  assert.equal(resolveNs4DynamicWorker('entity:invalid-id'), '');
  assert.equal(resolveNs4DynamicWorker('workspace:projectWorkspace'), 'e8');
});

test('dynamic fan-out callback falls back to step.prompt when after-prompt hook args are absent', () => {
  assert.deepEqual(resolveNs4DynamicWorkerRequest(undefined, 'entity:Project'), {
    worker: 'e4', args: 'entity:Project',
  });
  assert.deepEqual(resolveNs4DynamicWorkerRequest(undefined, 'workspace:projectWorkspace'), {
    worker: 'e8', args: 'workspace:projectWorkspace',
  });
  assert.deepEqual(resolveNs4DynamicWorkerRequest(undefined, 'rule:restrictProjectUpdate'), { worker: '', args: '' });
  assert.deepEqual(resolveNs4DynamicWorkerRequest('entity:Client', 'entity:Project'), {
    worker: 'e4', args: 'entity:Client',
  });
  assert.deepEqual(resolveNs4DynamicWorkerRequest(undefined, '{"planId":"e4-ontology"}'), {
    worker: '', args: '',
  });
});

test('root plan rejects an incomplete localized-title contract instead of silently mixing languages', () => {
  const plan = normalizeNs4RootPlan({
    type: 'flexible',
    result: {
      validPrompt: true,
      userPrompt: 'Criar pet shop',
      userLanguage: 'pt-BR',
      titles: { 'e1-clarification': 'Confirmar contrato' },
      clarification,
    },
  }, 'Criar pet shop');
  assert.equal(plan.validPrompt, false);
  assert.match(plan.invalidReason || '', /missing titles/);
});

test('new artifacts expose the current E1-to-E6 lifecycle flow version', () => {
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-05T10:00:00.000Z');
  const pipeline = createNs4Pipeline('petShop', 'petShop', '2026-08-05T10:00:00.000Z');
  assert.equal(NS4_FLOW_VERSION, '2026-08-11-ns4-flow-v25');
  assert.equal(artifact.specStatus.flowVersion, NS4_FLOW_VERSION);
  assert.equal(NS4_PIPELINE_SCHEMA_VERSION, '2026-08-06-ns4-pipeline-v5');
  assert.equal(pipeline.schemaVersion, NS4_PIPELINE_SCHEMA_VERSION);
});

test('continuing an earlier execution does not migrate its flow version', () => {
  const legacy = {
    ...createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z'),
    flowVersion: '2026-08-04-ns4-flow-v1',
  } as unknown as Ns4PipelineState;
  assert.equal(markNs4E2Running(legacy, 1).flowVersion, '2026-08-04-ns4-flow-v1');
  assert.equal(resolveNs4ExistingAction(true, legacy, true), 'collision');
});

test('terminal E1 and E2 failures are durable in the pipeline', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-05T10:00:00.000Z');
  const e1Failed = markNs4E1Failed(running, new Error('storage unavailable'), '2026-08-05T10:01:00.000Z');
  assert.equal(e1Failed.status, 'failed');
  assert.equal(e1Failed.steps.e1.status, 'failed');
  assert.equal(e1Failed.steps.e1.error, 'storage unavailable');
  assert.equal(e1Failed.steps.e1.failedAt, '2026-08-05T10:01:00.000Z');

  const approved = markNs4E1Approved(running, 'human', 'l4/petShop/module.defs.ts', '2026-08-05T10:02:00.000Z');
  const e2Failed = markNs4E2Failed(approved, 'LLM provider timeout', '2026-08-05T10:03:00.000Z');
  assert.equal(e2Failed.status, 'failed');
  assert.equal(e2Failed.steps.e2?.status, 'failed');
  assert.equal(e2Failed.steps.e2?.error, 'LLM provider timeout');
  assert.equal(e2Failed.steps.e2?.failedAt, '2026-08-05T10:03:00.000Z');
});

test('module names normalize deterministically', () => {
  assert.equal(normalizeNs4ModuleName('Pet Shop Brasil'), 'petShopBrasil');
  assert.equal(normalizeNs4ModuleName('gestão-de-obras'), 'gestaoDeObras');
});

test('resume module lookup canonicalizes a module token before the root planner', () => {
  const modules = new Set(['buildFlowFsm23', 'petShop']);
  assert.equal(isNs4ModuleToken('BuildFlowFsm23'), true);
  assert.equal(resolveNs4ExistingModuleToken('BuildFlowFsm23', modules), 'buildFlowFsm23');
  assert.equal(resolveNs4ExistingModuleToken('buildFlowFsm23', modules), 'buildFlowFsm23');
  assert.equal(resolveNs4ExistingModuleToken('Build Flow FSM 23', modules), '');
  assert.equal(resolveNs4ExistingModuleToken('unknownModule', modules), '');
});

test('resume is allowed only for a pipeline owned by agentNewSolution4', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z');
  const approved = markNs4E1Approved(running, 'auto', 'l4/petShop/module.defs.ts', '2026-08-04T10:01:00.000Z');
  assert.equal(resolveNs4ExistingAction(false, null, false), 'new');
  assert.equal(resolveNs4ExistingAction(true, null, false), 'collision');
  assert.equal(resolveNs4ExistingAction(true, { flowId: 'agentNewSolution' }, true), 'collision');
  assert.equal(resolveNs4ExistingAction(true, running, false), 'resume-e1');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e2');
  assert.equal(resolveNs4ExistingAction(true, approved, false), 'resume-e1');
});
