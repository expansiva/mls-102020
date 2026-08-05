import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildNs4PlannedSteps,
  buildNs4ModuleArtifact,
  createNs4Pipeline,
  markNs4E1Approved,
  markNs4E2Running,
  normalizeNs4Languages,
  normalizeNs4ModuleName,
  normalizeNs4RootPlan,
  NS4_FLOW_VERSION,
  Ns4PipelineState,
  parseNs4Invocation,
  resolveNs4ExistingAction,
} from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { validateNs4E1Module } from '/_102020_/l2/agentNewSolution4/steps/e1/gate.js';

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
    'e3-ontology': 'Definir ontologia',
    'e4-rules': 'Organizar regras',
    'e5-behaviors': 'Definir comportamentos',
    'e6-realization': 'Conectar jornadas',
    'e7-workspaces': 'Desenhar áreas de trabalho',
    'e8-navigation-compiler': 'Compilar navegação',
    'e9-validation': 'Validar especificação',
  };
  const plan = normalizeNs4RootPlan({
    type: 'flexible',
    result: { validPrompt: true, userPrompt: 'Criar pet shop', userLanguage: 'pt-BR', titles, clarification },
  }, 'Criar pet shop');
  const steps = buildNs4PlannedSteps(plan);
  assert.equal(steps.length, 10);
  assert.equal(steps[0].stepTitle, titles['e1-clarification']);
  assert.equal(steps[0].status, 'waiting_human_input');
  assert.deepEqual(steps[1].planning?.dependsOn, ['e1-clarification-answer']);
  assert.deepEqual(steps[2].planning?.dependsOn, ['e1-result']);
  assert.equal(steps[3].planning?.executionMode, 'manual_later');
  const artifact = buildNs4ModuleArtifact(plan.userPrompt, clarification, 'human', '2026-08-05T10:00:00.000Z', plan.presentation);
  const pipeline = createNs4Pipeline('petShop', plan.userPrompt, '2026-08-05T10:00:00.000Z', plan.presentation);
  assert.equal(artifact.presentation.userLanguage, 'pt-BR');
  assert.equal(artifact.presentation.stepTitles['e9-validation'], titles['e9-validation']);
  assert.deepEqual(pipeline.presentation, artifact.presentation);
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

test('new artifacts expose the E1-to-E2 lifecycle flow version', () => {
  const artifact = buildNs4ModuleArtifact('petShop', clarification, 'human', '2026-08-05T10:00:00.000Z');
  assert.equal(NS4_FLOW_VERSION, '2026-08-05-ns4-flow-v3');
  assert.equal(artifact.specStatus.flowVersion, NS4_FLOW_VERSION);
});

test('continuing an earlier execution does not migrate its flow version', () => {
  const legacy = {
    ...createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z'),
    flowVersion: '2026-08-04-ns4-flow-v1',
  } as unknown as Ns4PipelineState;
  assert.equal(markNs4E2Running(legacy, 1).flowVersion, '2026-08-04-ns4-flow-v1');
});

test('module names normalize deterministically', () => {
  assert.equal(normalizeNs4ModuleName('Pet Shop Brasil'), 'petShopBrasil');
  assert.equal(normalizeNs4ModuleName('gestão-de-obras'), 'gestaoDeObras');
});

test('resume is allowed only for a pipeline owned by agentNewSolution4', () => {
  const running = createNs4Pipeline('petShop', 'petShop', '2026-08-04T10:00:00.000Z');
  const approved = markNs4E1Approved(running, 'auto', 'l4/petShop/module.defs.ts', '2026-08-04T10:01:00.000Z');
  assert.equal(resolveNs4ExistingAction(false, null, false), 'new');
  assert.equal(resolveNs4ExistingAction(true, null, false), 'collision');
  assert.equal(resolveNs4ExistingAction(true, { flowId: 'agentNewSolution' }, true), 'collision');
  assert.equal(resolveNs4ExistingAction(true, running, false), 'resume-e1');
  assert.equal(resolveNs4ExistingAction(true, approved, true), 'resume-next');
  assert.equal(resolveNs4ExistingAction(true, approved, false), 'resume-e1');
});
