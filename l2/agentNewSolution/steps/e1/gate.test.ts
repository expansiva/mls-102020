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
  clearNs4ModuleCompletedStepsFrom,
  listNs4RebuildDeletionKeys,
  markNs4E2Approved,
  markNs4E10Approved,
  detectNs4RebuildIntentModule,
  formatNs4MissingRebuildModuleMessage,
  ns4RebuildRange,
  parseNs4Invocation,
  resetNs4PipelineForRebuild,
  plainNs4StepTitle,
  resolveNs4DynamicWorker,
  resolveNs4DynamicWorkerRequest,
  resolveNs4ExistingAction,
  resolveNs4ExistingModuleToken,
} from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution/steps/e1/gate.js';
import {
  buildNs4ModuleArtifactFromReview,
  normalizeNs4E1Review,
  validateNs4E1Review,
} from '/_102020_/l2/agentNewSolution/steps/e1/contracts.js';

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

function e1ReviewBodyWithLanguages(productLanguages: string[]) {
  return {
    userLanguage: 'pt-BR', reviewPolicy: { mode: 'smart' },
    module: { moduleName: 'todo', title: 'Tarefas', purpose: 'Gerenciar tarefas da equipe.' },
    strategy: { mode: 'newSolution', rationale: 'Não existe sistema legado.', databaseChangePolicy: 'new' },
    businessScope: {
      mainGoal: 'Gerenciar tarefas da equipe.',
      actors: [{ actorId: 'member', title: 'Membro da equipe', kind: 'internal', expectedOutcome: 'Concluir tarefas.' }],
      expectedOutcomes: [{ outcomeId: 'tasksDone', title: 'Tarefas concluídas', description: 'O quadro reflete o progresso.' }],
      inScope: ['tarefas'], outOfScope: [],
    },
    localization: { productLanguages, defaultLanguage: 'pt-BR' },
    declaredConstraints: { mandatoryIntegrations: [] }, changeSummary: [],
  };
}

test('languages the user never asked for are discarded with a visible warning — run02 102047', () => {
  // The LLM invented en/es for a pt-BR-only request: empty clarification answer, prompt without any
  // language mention. The l4 must carry exactly [userLanguage] and the discard must never be silent.
  const review = normalizeNs4E1Review(e1ReviewBodyWithLanguages(['pt-BR', 'en', 'es']), {
    userLanguage: 'pt-BR', productLanguages: '',
    sourcePrompt: 'Criar um aplicativo de tarefas para minha equipe',
  });
  assert.deepEqual(review.localization.productLanguages, ['pt-BR']);
  assert.equal(review.localization.defaultLanguage, 'pt-BR');
  assert.equal(review.i18nWarnings?.length, 1);
  assert.match(review.i18nWarnings?.[0] || '', /en, es/);
  const gate = validateNs4E1Review(review);
  assert.equal(gate.ok, true);
  assert.equal(gate.issues.some(issue => issue.severity === 'warning' && issue.code === 'NS4_E1_LANGUAGES_PROVENANCE'), true);
  const plan = normalizeNs4RootPlan({
    validPrompt: true, userPrompt: 'Criar um aplicativo de tarefas para minha equipe', userLanguage: 'pt-BR',
    titles: Object.fromEntries([
      'e1-clarification', 'e1-compile', 'e2-journeys', 'e3-access-matrix', 'e4-ontology',
      'e5-rules', 'e6-behaviors', 'e7-realization', 'e8-workspaces', 'e9-navigation-compiler', 'e10-validation',
    ].map(id => [id, id])), clarification,
  }, 'Criar um aplicativo de tarefas para minha equipe');
  const artifact = buildNs4ModuleArtifactFromReview(review, plan.userPrompt, 'auto', plan.presentation);
  assert.deepEqual(artifact.module.languages, ['pt-BR']);
  assert.deepEqual(artifact.localization.productLanguages, ['pt-BR']);
  assert.equal('i18nWarnings' in artifact, false, 'the warning is trace-only, never part of the l4');
});

test('languages with user provenance pass untouched, by prompt mention or clarification answer', () => {
  // Cited by NAME in the prompt ("em português e inglês") — no clarification answer.
  const promptReview = normalizeNs4E1Review(e1ReviewBodyWithLanguages(['pt-BR', 'en']), {
    userLanguage: 'pt-BR', productLanguages: '',
    sourcePrompt: 'Criar um pet shop em português e inglês',
  });
  assert.deepEqual(promptReview.localization.productLanguages, ['pt-BR', 'en']);
  assert.equal(promptReview.i18nWarnings, undefined);
  assert.equal(validateNs4E1Review(promptReview).ok, true);
  // Cited by TAG in the clarification answer.
  const answerReview = normalizeNs4E1Review(e1ReviewBodyWithLanguages(['pt-BR', 'en', 'es']), {
    userLanguage: 'pt-BR', productLanguages: 'pt-br, en, es',
    sourcePrompt: 'Criar um pet shop',
  });
  assert.deepEqual(answerReview.localization.productLanguages, ['pt-BR', 'en', 'es']);
  assert.equal(answerReview.i18nWarnings, undefined);
});

test('product languages are normalized, ordered and deduplicated independently of widget language', () => {
  assert.deepEqual(normalizeNs4Languages('pt-br, EN; es, pt-BR'), ['pt-BR', 'en', 'es']);
  assert.deepEqual(normalizeNs4Languages('', 'pt-br'), ['pt-BR']);
});

test('/fast is a standalone flag and is removed from the business prompt', () => {
  assert.deepEqual(parseNs4Invocation('petShop /fast'), { fast: true, rebuild: false, rebuildFrom: '', prompt: 'petShop' });
  assert.deepEqual(parseNs4Invocation('/fastlane petShop'), { fast: false, rebuild: false, rebuildFrom: '', prompt: '/fastlane petShop' });
});

test('/rebuild is an explicit flag, and its step argument leaves the prompt with it', () => {
  assert.deepEqual(parseNs4Invocation('petShop /rebuild'), { fast: false, rebuild: true, rebuildFrom: '', prompt: 'petShop' });
  // The argument must not survive in the prompt: the planner would read `e10` as business description.
  assert.deepEqual(parseNs4Invocation('petShop /rebuild e10'), { fast: false, rebuild: true, rebuildFrom: 'e10', prompt: 'petShop' });
  assert.deepEqual(parseNs4Invocation('petShop /rebuild e2 /fast'), { fast: true, rebuild: true, rebuildFrom: 'e2', prompt: 'petShop' });
  // e1 is not a partial target: restarting at e1 IS a total rebuild, so the token stays in the prompt.
  assert.deepEqual(parseNs4Invocation('petShop /rebuild e1'), { fast: false, rebuild: true, rebuildFrom: '', prompt: 'petShop e1' });
  assert.deepEqual(parseNs4Invocation('/rebuilder petShop'), { fast: false, rebuild: false, rebuildFrom: '', prompt: '/rebuilder petShop' });
  assert.deepEqual(parseNs4Invocation('petShop /rebuild all'), { fast: false, rebuild: true, rebuildFrom: 'all', prompt: 'petShop' });
});

test('a prose rebuild naming an existing module is recognized — the msgtask3 incident', () => {
  const modules = new Set(['petShop', 'buildFlowFsm']);
  // The real prompt of the failed run. The module name sits MID-SENTENCE, so the token resolver reads it
  // as a new module, E1 runs, and the existence backstop kills the task.
  const incident = 'rebuild all criar um site chamado petShop , em portugues';
  assert.equal(resolveNs4ExistingModuleToken(incident, modules), '', 'the token resolver cannot see it');
  assert.equal(detectNs4RebuildIntentModule(incident, modules), 'petShop');

  // BOTH signals are required: an ordinary creation prompt that merely mentions an existing module is
  // NOT hijacked into a rebuild.
  assert.equal(detectNs4RebuildIntentModule('quero um modulo de agenda para o petShop', modules), '');
  // And a rebuild word naming nothing that exists stays empty.
  assert.equal(detectNs4RebuildIntentModule('rebuild all do modulo agenda', modules), '');
  assert.equal(detectNs4RebuildIntentModule('regenerar o buildFlowFsm inteiro', modules), 'buildFlowFsm');
});

test('a partial rebuild resets the interval EXPLICITLY, in the pipeline and in the artifact', () => {
  let pipeline = createNs4Pipeline('petShop', 'petShop', '2026-08-20T10:00:00.000Z');
  pipeline = markNs4E1Approved(pipeline, 'human', 'l4/petShop/module.defs.ts', '2026-08-20T10:01:00.000Z');
  pipeline = markNs4E2Approved(pipeline, 'human', ['l4/petShop/journeys/index.defs.ts'], '2026-08-20T10:02:00.000Z');
  pipeline = markNs4E10Approved(pipeline, 'human', '2026-08-20T10:03:00.000Z');
  assert.equal(pipeline.status, 'complete');

  const reset = resetNs4PipelineForRebuild(pipeline, 'e10', '2026-08-21T09:00:00.000Z');
  // e1..e9 keep their approval, timestamps included: a partial rebuild is not a new module.
  assert.equal(reset.steps.e1.status, 'approved');
  assert.equal(reset.steps.e1.approvedAt, '2026-08-20T10:01:00.000Z');
  assert.equal(reset.steps.e2?.status, 'approved');
  assert.equal(reset.steps.e2?.approvedAt, '2026-08-20T10:02:00.000Z');
  // And the rebuilt interval is gone, audited, never silently regressed (rule 11).
  assert.equal(reset.steps.e10, undefined);
  assert.equal(reset.status, 'inProgress');
  assert.equal(reset.rebuiltFrom, 'e10');
  assert.equal(reset.rebuiltAt, '2026-08-21T09:00:00.000Z');
  assert.deepEqual(ns4RebuildRange('e8'), ['e8', 'e9', 'e10']);

  // The artifact has to be cleared too: the invocation re-marks a pipeline step approved from
  // completedSteps whenever the file still exists, so leaving them would undo this reset on the next run.
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-20T10:01:00.000Z');
  const withE10 = {
    ...artifact,
    specStatus: {
      ...artifact.specStatus,
      state: 'complete' as const,
      completedSteps: [
        ...artifact.specStatus.completedSteps,
        { stepId: 'e9-navigation-compiler' as const, status: 'approved' as const, approvedBy: 'human' as const, approvedAt: '2026-08-20T10:02:00.000Z' },
        { stepId: 'e10-validation' as const, status: 'approved' as const, approvedBy: 'human' as const, approvedAt: '2026-08-20T10:03:00.000Z' },
      ],
    },
  };
  const cleared = clearNs4ModuleCompletedStepsFrom(withE10, 'e10');
  assert.deepEqual(cleared.specStatus.completedSteps.map(item => item.stepId), ['e1', 'e9-navigation-compiler']);
  assert.equal(cleared.specStatus.state, 'inProgress');
  assert.equal(cleared.specStatus.nextStep, 'e10-validation');
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
  assert.equal(steps[7].stepTitle, titles['e7-realization']);
  assert.equal(steps[8].stepTitle, titles['e8-workspaces']);
  assert.equal(steps[9].stepTitle, titles['e9-navigation-compiler']);
  assert.equal(steps[10].stepTitle, titles['e10-validation']);
  assert.equal(steps.filter(step => String(step.stepTitle || '').startsWith('👤 ')).length, 6);
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
  assert.equal(formatNs4VisibleStepTitle('e8-workspaces', 'Desenhar áreas'), 'Desenhar áreas');
  assert.equal(formatNs4VisibleStepTitle('e10-validation', 'Validar especificação'), 'Validar especificação');
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

test('new artifacts expose the current E1-to-E10 lifecycle flow version', () => {
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-05T10:00:00.000Z');
  const pipeline = createNs4Pipeline('petShop', 'petShop', '2026-08-05T10:00:00.000Z');
  // The version literal is NOT repeated here: helpers/ns4Dispatch.test.ts owns the single-source
  // check (constant == docs/flow.json). What matters here is that an artifact carries the current one.
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

test('rebuild module lookup is case-insensitive and returns the disk spelling', () => {
  const modules = new Set(['listaAssinatura2', 'todo']);
  assert.equal(resolveNs4ExistingModuleToken('listaassinatura2', modules), 'listaAssinatura2');
  assert.equal(resolveNs4ExistingModuleToken('LISTAASSINATURA2', modules), 'listaAssinatura2');
  assert.equal(resolveNs4ExistingModuleToken('listaAssinatura2', modules), 'listaAssinatura2');
  const parsed = parseNs4Invocation('listaassinatura2 /rebuild all');
  assert.equal(parsed.rebuild, true);
  assert.equal(parsed.rebuildFrom, 'all');
  assert.equal(resolveNs4ExistingModuleToken(parsed.prompt, modules), 'listaAssinatura2');
  assert.equal(resolveNs4ExistingModuleToken('missingModule', modules), '');
});

test('missing rebuild module message lists existing modules, capped', () => {
  const modules = new Set(['todo', 'listaAssinatura2', 'listaAssinatura']);
  const message = formatNs4MissingRebuildModuleMessage(modules);
  assert.match(message, /Não existe módulo com esse nome para regenerar/);
  assert.match(message, /Módulos existentes: listaAssinatura, listaAssinatura2, todo/);
  const many = new Set(Array.from({ length: 13 }, (_, i) => `mod${String(i + 1).padStart(2, '0')}`));
  const capped = formatNs4MissingRebuildModuleMessage(many);
  assert.match(capped, /mod01, mod02/);
  assert.match(capped, /…/);
  assert.doesNotMatch(capped, /mod13/);
});

test('canonical /rebuild with a mis-cased module name suggests the disk module', () => {
  const modules = new Set(['listaAssinatura2', 'todo']);
  assert.equal(detectNs4RebuildIntentModule('listaassinatura2 /rebuild all', modules), 'listaAssinatura2');
  assert.equal(detectNs4RebuildIntentModule('/rebuild all LISTAASSINATURA2', modules), 'listaAssinatura2');
  assert.equal(detectNs4RebuildIntentModule('listaassinatura2 /regenerar', modules), 'listaAssinatura2');
});

test('/fast E1 approval records autoReason and skippedDefaults on the pipeline', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-29T10:00:00.000Z');
  const approved = markNs4E1Approved(
    running,
    'auto',
    'l4/petShop/module.defs.ts',
    '2026-08-29T10:01:00.000Z',
    'fast skipped clarification',
    { productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR', moduleName: 'petShop' },
  );
  assert.equal(approved.steps.e1.approvedBy, 'auto');
  assert.equal(approved.steps.e1.autoReason, 'fast skipped clarification');
  assert.deepEqual(approved.steps.e1.skippedDefaults, {
    productLanguages: ['pt-BR'], defaultLanguage: 'pt-BR', moduleName: 'petShop',
  });
});

test('resume is allowed only for a pipeline owned by agentNewSolution', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z');
  const approved = markNs4E1Approved(running, 'auto', 'l4/petShop/module.defs.ts', '2026-08-04T10:01:00.000Z');
  assert.equal(resolveNs4ExistingAction(false, null, false), 'new');
  assert.equal(resolveNs4ExistingAction(true, null, false), 'collision');
  assert.equal(resolveNs4ExistingAction(true, { flowId: 'agentNewSolution' }, true), 'collision');
  assert.equal(resolveNs4ExistingAction(true, running, false), 'resume-e1');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-e2');
  assert.equal(resolveNs4ExistingAction(true, approved, false), 'resume-e1');
});

test('a total rebuild archives the module whole l4 and l5, and nothing else', () => {
  // The whole folder, not a list of known artifacts: a previous run leaves drafts, pipeline traces and
  // per-entity defs named after ITS ontology, and a selective delete would mix two generations.
  const files: Record<string, { project?: number; level?: number; folder?: string; status?: string }> = {
    'a': { project: 102047, level: 4, folder: 'petShop' },
    'b': { project: 102047, level: 4, folder: 'petShop/pipeline' },
    'c': { project: 102047, level: 4, folder: 'petShop/ontology' },
    'd': { project: 102047, level: 4, folder: 'petShop/pipeline/e4-entities' },
    'e': { project: 102047, level: 5, folder: 'petShop' },
    // l2 is agentChangeFrontend's output and has its own rebuild: never nuked from here.
    'f': { project: 102047, level: 2, folder: 'petShop/web/shared' },
    // Another module, another project, and an already archived file stay untouched.
    'g': { project: 102047, level: 4, folder: 'otherModule' },
    'h': { project: 102046, level: 4, folder: 'petShop' },
    'i': { project: 102047, level: 4, folder: 'petShop/rules', status: 'deleted' },
    // A project-level file has no module segment: l5/config.json must survive a module rebuild.
    'j': { project: 102047, level: 5, folder: 'config' },
  };
  assert.deepEqual(listNs4RebuildDeletionKeys(files, 102047, 'petShop').sort(), ['a', 'b', 'c', 'd', 'e']);
  // The module name is canonicalized the same way everywhere else it is read.
  assert.deepEqual(listNs4RebuildDeletionKeys(files, 102047, 'PetShop').sort(), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(listNs4RebuildDeletionKeys(files, 102047, 'unknownModule'), []);
});
