/// <mls fileReference="_102020_/l2/aura/helpers/modulesDashboardCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  buildDashboard,
  contractProblems,
  moduleIds,
  pipelineFileModule,
  UNREADABLE,
  type DashboardInput,
} from '/_102020_/l2/aura/helpers/modulesDashboardCore.js';
import { validateConfig } from '/_102020_/l2/aura/helpers/appConfigSections.js';
import type { RouteRow } from '/_102020_/l2/aura/helpers/l2ContractRoutes.js';

// Shapes cut from mls-102047 (12/11/2026): module `tarefas` complete up to the L1 materialize.

const at = '2026-10-23T01:00:00.000Z';
const approved = (ids: string[]) => Object.fromEntries(ids.map(id => [id, { status: 'approved', updatedAt: at }]));

function specPipeline(steps = approved(['module10', 'journeys20', 'ontology30', 'finalize80'])) {
  return {
    schemaVersion: '2026-09-10-ns5-pipeline-v1', flowId: 'agentNewSolution5', moduleName: 'tarefas', status: 'complete',
    steps: { ...steps, module10: { ...steps.module10, actors: [{ actorId: 'membro' }, { actorId: 'gestor' }] } },
  };
}
const defsL2 = (pages = ['inicio', 'painel']) => ({
  schemaVersion: '2026-09-30-agent-defs-l2-pipeline-v2', flowId: 'agentDefsL2', module: 'tarefas', status: 'complete',
  steps: { ...approved(['entry10', 'input20', 'bff55', 'finalize80']), pages50: { status: 'approved', updatedAt: at, artifactPaths: pages.map(page => `l2/tarefas/pipeline/agentDefsL2/pages50/${page}.json`) } },
});
const materializeL2 = () => ({
  schemaVersion: '2026-10-05-materialize-l2-v4-pipeline-v1', flowId: 'agentMaterializeL2', module: 'tarefas', status: 'complete',
  steps: approved(['entry10', 'input20', 'shared40', 'pages50', 'finalize70']),
});
const finalizeL2 = (notApproved: string[] = []) => ({
  schemaVersion: '2026-10-16-materialize-l2-finalize-v1', pages: ['inicio', 'painel'], notApproved, written: true, sourcesHash: 'sha256:x',
});
const defsL1 = () => ({
  schemaVersion: '2026-09-21-d1-pipeline-v1', flowId: 'agentDefsL1', status: 'complete',
  steps: approved(['entry10', 'input20', 'domain30', 'controllers60', 'finalize80']),
});
const reportL1 = (extra: Record<string, unknown> = {}) => ({
  schemaVersion: '2026-10-05-m12-report-v1', moduleName: 'tarefas', status: 'complete',
  counts: { done: 2, reused: 0, blocked: 0, gap: 0, failed: 0, skipped: 0 },
  open: [], notCompiled: [], missing: [], defProblems: [], createdAt: '2026-10-23T02:00:00.000Z', ...extra,
});

function moduleEntry(extra: Record<string, unknown> = {}) {
  return {
    moduleId: 'tarefas', shellMode: 'spa', basePath: '/tarefas', userLanguage: 'pt-BR',
    backendControllers: './_102047_/l1/tarefas/layer_1_external/adapters/http/controllers',
    navigation: [
      { id: 'inicio', label: 'Início', href: '/tarefas/inicio', description: '', actors: ['membro'], landing: true },
      { id: 'painel', label: 'Painel', href: '/tarefas/painel', description: '', actors: ['gestor'] },
    ],
    landings: [{ actorId: 'membro', pageId: 'inicio', route: '/tarefas/inicio' }],
    headerLinks: [],
    frontend: {
      layer: 'l2',
      pageTests: ['_102047_/l2/tarefas/web/desktop/page11/inicio.test.js', '_102047_/l2/tarefas/web/desktop/page11/painel.test.js'],
      pages: [
        { pageId: 'inicio', route: '/tarefas/inicio', source: 'l2/tarefas/web/desktop/page11/inicio.ts', componentTag: 'a-102047', title: 'Início', actors: ['membro'] },
        { pageId: 'painel', route: '/tarefas/painel', source: 'l2/tarefas/web/desktop/page11/painel.ts', componentTag: 'b-102047', title: 'Painel', actors: ['gestor'] },
      ],
    },
    ...extra,
  };
}

function config(modules: unknown[] = [moduleEntry()]) {
  return {
    projectSettings: { driver: 'vm', url: 'local/local/local/mls-102047' },
    workspaceDependencies: ['102020'],
    projects: { 102047: { root: '../mls-102047', type: 'client', modules } },
    defaultProjectId: '102047',
    clientShell: { mode: 'spa' },
  };
}

function completeFiles(): Record<string, unknown> {
  return {
    'l4/tarefas/pipeline/pipeline.json': specPipeline(),
    'l2/tarefas/pipeline/agentDefsL2/pipeline.json': defsL2(),
    'l2/tarefas/pipeline/agentMaterializeL2/pipeline.json': materializeL2(),
    'l2/tarefas/pipeline/agentMaterializeL2/finalize70.json': finalizeL2(),
    'l1/tarefas/pipeline/agentDefsL1/pipeline.json': defsL1(),
    'l1/tarefas/pipeline/agentMaterializeL1/report.json': reportL1(),
    'l1/tarefas/pipeline/agentMaterializeL1/registration.json': { action: 'patch' },
  };
}

const PATHS = [
  'l1/tarefas/layer_1_external/adapters/http/controllers/inicio.ts',
  'l1/tarefas/layer_1_external/adapters/http/controllers/inicio.defs.ts',
  'l1/tarefas/layer_1_external/adapters/http/controllers/painel.ts',
  'l2/tarefas/web/desktop/page11/inicio.ts',
  'l2/tarefas/web/desktop/page11/painel.ts',
];

function input(overrides: Partial<DashboardInput> = {}): DashboardInput {
  const cfg = overrides.config ?? config();
  return {
    projectId: 102047,
    config: cfg,
    configIssues: validateConfig(cfg, 102047, {}),
    files: completeFiles(),
    paths: PATHS,
    ...overrides,
  };
}

test('pipelineFileModule: the files the overview reads, and only those', () => {
  assert.equal(pipelineFileModule('l4/tarefas/pipeline/pipeline.json'), 'tarefas');
  assert.equal(pipelineFileModule('l4/tarefas/pipeline/finalize-report.json'), 'tarefas');
  assert.equal(pipelineFileModule('l2/compras/pipeline/agentDefsL2/pipeline.json'), 'compras');
  assert.equal(pipelineFileModule('l2/compras/pipeline/agentMaterializeL2/finalize70.json'), 'compras');
  assert.equal(pipelineFileModule('l1/agenda/pipeline/agentMaterializeL12/report.json'), 'agenda');
  assert.equal(pipelineFileModule('l1/agenda/pipeline/agentMaterializeL1/registration.json'), 'agenda');
  assert.equal(pipelineFileModule('l2/compras/pipeline/agentDefsL2/pages50/inicio.json'), undefined);
  assert.equal(pipelineFileModule('l4/tarefas/pool/l2/pipeline.json'), undefined);
});

test('a complete module: every stage green, 100%, counted', () => {
  const dashboard = buildDashboard(input());
  const [module] = dashboard.modules;
  assert.equal(module.moduleId, 'tarefas');
  assert.deepEqual(Object.values(module.stages).map(stage => stage.state), ['done', 'done', 'done', 'done', 'done']);
  assert.equal(module.status, 'complete');
  assert.equal(module.percent, 100);
  assert.deepEqual(module.problems, []);
  assert.equal(module.actors, 2);
  assert.equal(module.controllers, 2, 'the .defs.ts of a controller is not a controller');
  assert.equal(module.basePath, '/tarefas');
  assert.deepEqual(module.configPath, ['projects', '102047', 'modules', 0]);
  assert.deepEqual(dashboard.counts, { error: 0, progress: 0, new: 0, complete: 1 });
  assert.equal(dashboard.percent, 100);
  assert.deepEqual(dashboard.totals, { pages: 2, controllers: 2, errors: 0, warnings: 0 });
  assert.deepEqual(module.stages.spec.steps.map(step => step.id), ['module10', 'journeys20', 'ontology30', 'finalize80']);
});

test('no L1 yet: backend gray, module in progress, nothing called an error', () => {
  const files = completeFiles();
  delete files['l1/tarefas/pipeline/agentDefsL1/pipeline.json'];
  delete files['l1/tarefas/pipeline/agentMaterializeL1/report.json'];
  delete files['l1/tarefas/pipeline/agentMaterializeL1/registration.json'];
  const cfg = config([moduleEntry({ backendControllers: undefined })]);
  const [module] = buildDashboard(input({ files, config: cfg, configIssues: validateConfig(cfg, 102047, {}), paths: [] })).modules;
  assert.equal(module.stages.backend.state, 'none');
  assert.equal(module.status, 'progress');
  assert.equal(module.percent, 80);
  assert.equal(module.problems.filter(problem => problem.severity === 'error').length, 0);
});

test('a failed step: the stage turns red, the module goes first, the problem points at the agent step', () => {
  const files = completeFiles();
  files['l2/compras/pipeline/agentDefsL2/pipeline.json'] = {
    ...defsL2(), module: 'compras', status: 'inProgress',
    steps: { ...approved(['entry10', 'input20']), pages50: { status: 'failed', diagnostic: 'model refused', updatedAt: at } },
  };
  const dashboard = buildDashboard(input({ files }));
  assert.deepEqual(dashboard.modules.map(module => module.moduleId), ['compras', 'tarefas']);
  const [compras] = dashboard.modules;
  assert.equal(compras.status, 'error');
  assert.equal(compras.stages.pages.state, 'error');
  assert.equal(compras.stages.spec.state, 'none', 'compras has no L4 here');
  assert.equal(compras.basePath, undefined, 'not in the config');
  assert.deepEqual(compras.problems[0], {
    severity: 'error', stage: 'pages', code: 'step-failed', detail: 'agentDefsL2 · pages50: model refused',
    target: { kind: 'agent', agent: 'agentDefsL2', module: 'compras', stepId: 'pages50', file: 'l2/compras/pipeline/agentDefsL2/pipeline.json' },
  });
});

test('defs done, materialize missing: amber with the planned pages, not materialized rows', () => {
  const files = completeFiles();
  files['l2/compras/pipeline/agentDefsL2/pipeline.json'] = { ...defsL2(['produtos', 'pedidos']), module: 'compras' };
  const compras = buildDashboard(input({ files })).modules.find(module => module.moduleId === 'compras')!;
  assert.equal(compras.stages.pages.state, 'progress');
  assert.equal(compras.stages.pages.fraction, 0.5);
  assert.equal(compras.problems[0].code, 'not-materialized');
  assert.deepEqual(compras.problems[0].target, { kind: 'agent', agent: 'agentMaterializeL2', module: 'compras', file: 'l2/compras/pipeline/agentDefsL2/pipeline.json' });
  assert.deepEqual(compras.pages.map(page => [page.pageId, page.materialized, page.state]), [['produtos', false, 'none'], ['pedidos', false, 'none']]);
});

test('unknown format: a new schemaVersion or a file that did not parse grays the stage, the screen holds', () => {
  const files = completeFiles();
  files['l4/tarefas/pipeline/pipeline.json'] = { ...specPipeline(), schemaVersion: '2027-01-01-ns5-pipeline-v2' };
  files['l2/tarefas/pipeline/agentMaterializeL2/pipeline.json'] = UNREADABLE;
  const [module] = buildDashboard(input({ files })).modules;
  assert.equal(module.stages.spec.state, 'unknown');
  assert.equal(module.stages.spec.fraction, 0);
  assert.equal(module.stages.pages.state, 'unknown');
  assert.equal(module.status, 'progress');
});

test('pages not approved by the materializer: warning on the page, stage amber', () => {
  const files = completeFiles();
  files['l2/tarefas/pipeline/agentMaterializeL2/finalize70.json'] = finalizeL2(['painel']);
  const [module] = buildDashboard(input({ files })).modules;
  assert.equal(module.stages.pages.state, 'progress');
  assert.deepEqual(module.pages.map(page => [page.pageId, page.state, page.problems]), [['inicio', 'done', 0], ['painel', 'warning', 1]]);
});

test('L1 report: failed unit is an error, gap a warning, pending registration a warning', () => {
  const files = completeFiles();
  files['l1/tarefas/pipeline/agentMaterializeL1/report.json'] = reportL1({
    status: 'partial',
    counts: { done: 1, failed: 1, gap: 1 },
    open: [
      { layer: 'tests', unitId: 'painel', status: 'failed', code: 'PROMPT_FAILED', diagnostic: 'limit' },
      { layer: 'persistence', unitId: 'outbound', status: 'gap', code: 'MECHANISM_UNBOUND' },
    ],
  });
  files['l1/tarefas/pipeline/agentMaterializeL1/registration.json'] = { action: 'pending', detail: 'not registered' };
  const [module] = buildDashboard(input({ files })).modules;
  assert.equal(module.stages.backend.state, 'error');
  assert.equal(module.status, 'error');
  assert.deepEqual(module.problems.map(problem => [problem.severity, problem.code]), [['error', 'unit-open'], ['warning', 'unit-open'], ['warning', 'not-registered']]);
  assert.equal(module.problems[0].detail, 'tests/painel · PROMPT_FAILED · limit');
  assert.deepEqual(module.problems[0].target, { kind: 'agent', agent: 'agentMaterializeL1', module: 'tarefas', file: 'l1/tarefas/pipeline/agentMaterializeL1/report.json' });
  assert.deepEqual(module.problems[2].target, { kind: 'agent', agent: 'agentMaterializeL1', module: 'tarefas', stepId: 'register70', file: 'l1/tarefas/pipeline/agentMaterializeL1/registration.json' });
});

test('the newest L1 report wins when the folder was renamed', () => {
  const files = completeFiles();
  files['l1/tarefas/pipeline/agentMaterializeL12/report.json'] = reportL1({ status: 'partial', counts: { failed: 1 }, createdAt: '2026-10-01T00:00:00.000Z' });
  const [module] = buildDashboard(input({ files })).modules;
  assert.equal(module.stages.backend.state, 'done');
});

test('config problems are the App Config ones, on the module and stage they belong to', () => {
  const entry = moduleEntry();
  entry.frontend.pages[1].route = '/tarefas/inicio';
  const cfg = config([entry]);
  const issues = validateConfig(cfg, 102047, { pageFiles: ['l2/tarefas/web/desktop/page11/sobra.ts', 'l2/outro/web/desktop/page11/x.ts'] });
  const [module] = buildDashboard(input({ config: cfg, configIssues: issues })).modules;
  const duplicate = module.problems.find(problem => problem.issue?.code === 'duplicate-route')!;
  assert.equal(duplicate.severity, 'error');
  assert.equal(duplicate.stage, 'routes');
  assert.equal(duplicate.pageId, 'painel');
  assert.deepEqual(duplicate.target, { kind: 'config', path: ['projects', '102047', 'modules', 0, 'frontend', 'pages', 1, 'route'] });
  const orphans = module.problems.filter(problem => problem.issue?.code === 'orphan-page');
  assert.deepEqual(orphans.map(problem => problem.target), [{ kind: 'file', project: 102047, path: 'l2/tarefas/web/desktop/page11/sobra.ts' }], 'the other module\'s orphan is not this one\'s');
  assert.equal(module.stages.routes.state, 'error');
  assert.equal(module.pages.find(page => page.pageId === 'painel')!.state, 'error');
});

test('tests: a page without its test file makes the stage amber and says which', () => {
  const entry = moduleEntry();
  entry.frontend.pageTests = ['_102047_/l2/tarefas/web/desktop/page11/inicio.test.js'];
  const cfg = config([entry]);
  const [module] = buildDashboard(input({ config: cfg, configIssues: validateConfig(cfg, 102047, {}) })).modules;
  assert.equal(module.stages.tests.state, 'progress');
  assert.equal(module.stages.tests.fraction, 0.5);
  const problem = module.problems.find(item => item.code === 'pages-without-test')!;
  assert.equal(problem.detail, 'painel');
  assert.deepEqual(problem.target, { kind: 'config', path: ['projects', '102047', 'modules', 0, 'frontend', 'pageTests'] });
});

test('contract rows: a route missing in the backend is an error only once a backend exists', () => {
  const row = (extra: Partial<RouteRow>): RouteRow => ({
    key: 'inicio:load', page: 'inicio', routeName: 'load', route: 'tarefas.inicio.load',
    contractPath: 'tarefas/web/contracts/inicio.defs.ts', sharedPath: 'tarefas/web/shared/inicio.ts',
    backendPath: null, backendProject: null, calledInFrontend: true, existsInBackend: false, hasIssue: true, ...extra,
  });
  assert.deepEqual(contractProblems([row({})], 102047, false), []);
  const [missing] = contractProblems([row({})], 102047, true);
  assert.equal(missing.code, 'route-missing-backend');
  assert.deepEqual(missing.target, { kind: 'file', project: 102047, path: 'l2/tarefas/web/contracts/inicio.defs.ts' });
  const [notCalled] = contractProblems([row({ calledInFrontend: false, existsInBackend: true, hasIssue: true })], 102047, true);
  assert.equal(notCalled.code, 'route-not-called');
  assert.equal(notCalled.severity, 'warning');

  const [module] = buildDashboard(input({ contracts: { tarefas: [row({})] } })).modules;
  assert.equal(module.contractChecked, true);
  assert.equal(module.stages.backend.state, 'error');
  assert.equal(module.pages.find(page => page.pageId === 'inicio')!.state, 'error');
});

test('modules: the config ones in order, then the ones with a pipeline; a plain folder is not one', () => {
  const files = { 'l4/zeta/pipeline/pipeline.json': specPipeline(), 'l2/alfa/pipeline/agentDefsL2/pipeline.json': defsL2() };
  assert.deepEqual(moduleIds(config(), 102047, files), ['tarefas', 'alfa', 'zeta']);
  assert.deepEqual(moduleIds(undefined, 102047, {}), []);
});

test('a module only in the config is new; an empty project has no modules', () => {
  const cfg = config([{ moduleId: 'organization', basePath: '/organization', navigation: [], headerLinks: [] }]);
  const dashboard = buildDashboard(input({ config: cfg, configIssues: validateConfig(cfg, 102047, {}), files: {} }));
  assert.equal(dashboard.modules[0].status, 'new');
  assert.equal(dashboard.modules[0].percent, 0);
  const empty = buildDashboard(input({ config: undefined, configIssues: [], files: {} }));
  assert.deepEqual(empty.modules, []);
  assert.equal(empty.percent, 0);
});
