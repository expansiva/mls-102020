/// <mls fileReference="_102020_/l2/aura/helpers/modulesDashboardCore.ts" enhancement="_blank"/>

// Pure core of the modules dashboard (pluginModulesDashboard): where each module of a project is —
// spec, pages, backend, routes and tests — read from the small files the agents already write.
// Proposal: collabMyFiles/DashboardIdea.md. No DOM and no mls calls; the plugin reads the stor.
//
// What lives here:
//   * which files are read (PIPELINE_FILE) and which shapes of them are understood (SCHEMAS); a file
//     of another shape grays its stage out as "unknown format" instead of guessing;
//   * the state of each stage, the percent of a module and of the project, the module status;
//   * the problems, each with where a click takes the person (a file, a config field or an agent).
//
// No rule is repeated: the route and menu problems are the App Config's (validateConfig, passed in),
// and the contract ones are serviceL2Validator's (l2ContractRoutes, passed in). Everything is driven
// by the files: no module, page or project id is named here.

import { clientKey, getAt, isObject, pathKey, type Issue, type Json, type Path } from '/_102020_/l2/aura/helpers/appConfigSections.js';
import type { RouteRow } from '/_102020_/l2/aura/helpers/l2ContractRoutes.js';

// ── files and shapes ──────────────────────────────────────────────────────────

/**
 * The files the overview reads, project-relative. Each is small; together they build the whole screen.
 * Group 1 is the module of l4, 2 of l2 and 3 of l1.
 */
export const PIPELINE_FILE = /^(?:l4\/([^/]+)\/pipeline\/(?:pipeline|finalize-report)|l2\/([^/]+)\/pipeline\/(?:agentDefsL2\/pipeline|agentMaterializeL2\/(?:pipeline|finalize70))|l1\/([^/]+)\/pipeline\/(?:agentDefsL1\/pipeline|agentMaterializeL1\w*\/(?:report|registration)))\.json$/;

/** The module of a pipeline file, or undefined when the path is not one. */
export function pipelineFileModule(path: string): string | undefined {
  const match = PIPELINE_FILE.exec(path);
  return match ? match[1] ?? match[2] ?? match[3] : undefined;
}

/** What a file holds when it is in the stor but did not parse: its stage shows as unknown format. */
export const UNREADABLE = Object.freeze({ dashboardUnreadable: true });

/**
 * The shapes understood, by the end of `schemaVersion` (the date in front changes, the family does
 * not). A newer or older family is not read: its stage shows "unknown format" and the screen stays up.
 */
export const SCHEMAS = {
  spec: /-ns5-pipeline-v1$/,
  specReport: /-ns5-finalize-report-v1$/,
  defsL2: /-agent-defs-l2-pipeline-v2$/,
  materializeL2: /-materialize-l2-v4-pipeline-v1$/,
  finalizeL2: /-materialize-l2-finalize-v1$/,
  defsL1: /-d1-pipeline-v1$/,
  materializeL1: /-m12-report-v1$/,
} as const;

/** The agents behind each flow, for the "what to run" of a stage that has no file yet. */
export const AGENTS = {
  spec: 'agentNewSolution5',
  defsL2: 'agentDefsL2',
  materializeL2: 'agentMaterializeL2',
  defsL1: 'agentDefsL1',
  materializeL1: 'agentMaterializeL1',
} as const;

// ── output ────────────────────────────────────────────────────────────────────

export const STAGE_IDS = ['spec', 'pages', 'backend', 'routes', 'tests'] as const;
export type StageId = typeof STAGE_IDS[number];
export type StageState = 'done' | 'progress' | 'error' | 'none' | 'unknown';
export type ModuleStatus = 'error' | 'progress' | 'new' | 'complete';
export const STATUS_ORDER: ModuleStatus[] = ['error', 'progress', 'new', 'complete'];

export interface StepInfo {
  flow: string;
  id: string;
  status: string;
  updatedAt?: string;
  diagnostic?: string;
}

export interface Stage {
  id: StageId;
  state: StageState;
  /** 0..1, what this stage adds to the percent. */
  fraction: number;
  /** The pipeline steps behind it, in order (tooltip). */
  steps: StepInfo[];
  /** Check warnings that do not make a problem (the spec finalize warnings). */
  checkWarnings: number;
}

export type Target =
  | { kind: 'file'; project: number; path: string }
  | { kind: 'config'; path: Path }
  /** What to run, and the record (pipeline or report, project-relative) that tells why. */
  | { kind: 'agent'; agent: string; module: string; stepId?: string; file?: string };

export type ProblemCode =
  | 'step-failed' | 'spec-check' | 'not-materialized' | 'page-not-approved' | 'config-not-written'
  | 'unit-open' | 'not-compiled' | 'missing-unit' | 'def-problem' | 'not-registered'
  | 'controllers-not-in-config' | 'config' | 'pages-without-test'
  | 'route-missing-backend' | 'route-not-called';

export interface Problem {
  severity: 'error' | 'warning';
  stage: StageId;
  code: ProblemCode;
  detail?: string;
  pageId?: string;
  /** For `config`: the App Config issue, so its text is the App Config's. */
  issue?: Issue;
  target?: Target;
}

export interface PageRow {
  pageId: string;
  title?: string;
  route?: string;
  /** Project-relative page file (`l2/<module>/web/desktop/page11/<page>.ts`). */
  source?: string;
  /** In `frontend.pages` of the config (the agent wrote it). */
  materialized: boolean;
  state: 'done' | 'warning' | 'error' | 'none';
  problems: number;
}

export interface ModuleRow {
  moduleId: string;
  basePath?: string;
  status: ModuleStatus;
  /** 0..100, rounded. */
  percent: number;
  stages: Record<StageId, Stage>;
  problems: Problem[];
  pages: PageRow[];
  actors: number;
  controllers: number;
  /** Latest `updatedAt` of any step (ISO), for "how long since it changed". */
  lastUpdated?: string;
  /** `projects.<client>.modules[i]` of the config, when the module is there. */
  configPath?: Path;
  /** Whether the contract check ran for it (heavy, on demand). */
  contractChecked: boolean;
}

export interface Dashboard {
  projectId: number;
  modules: ModuleRow[];
  percent: number;
  counts: Record<ModuleStatus, number>;
  /** Stage states over every module: the four colors of the ring. */
  stageMix: Record<'done' | 'progress' | 'error' | 'none', number>;
  totals: { pages: number; controllers: number; errors: number; warnings: number };
}

export interface DashboardInput {
  projectId: number;
  /** Parsed `l5/config.json`; undefined when it could not be read. */
  config: Json;
  /** `validateConfig` of the App Config over that config. */
  configIssues: Issue[];
  /** The pipeline files present (PIPELINE_FILE), project-relative path → parsed JSON or UNREADABLE. */
  files: Record<string, Json>;
  /** Every project-relative file path of the project (`l1/…`, `l2/…`), for counts and existence. */
  paths: string[];
  /** Contract rows per module, for the modules whose check ran. */
  contracts?: Record<string, RouteRow[]>;
}

// ── reading a flow ────────────────────────────────────────────────────────────

interface Flow {
  flowId: string;
  file: string;
  /** missing: no file; unknown: a shape not understood; ok: read. */
  read: 'missing' | 'unknown' | 'ok';
  status: string;
  steps: StepInfo[];
  data: Record<string, unknown>;
}

const str = (value: unknown): string => typeof value === 'string' ? value : '';
const list = (value: unknown): unknown[] => Array.isArray(value) ? value : [];

/** Order of a step id by its number (`entry10` < `input20` < `bff55`); the file order is not kept by every writer. */
const stepNumber = (id: string): number => Number(/(\d+)$/.exec(id)?.[1] ?? Number.MAX_SAFE_INTEGER);

function readFile(files: Record<string, Json>, file: string, schema: RegExp): { read: Flow['read']; data: Record<string, unknown> } {
  const raw = files[file];
  if (raw === undefined) return { read: 'missing', data: {} };
  if (!isObject(raw) || raw === UNREADABLE || !schema.test(str(raw.schemaVersion))) return { read: 'unknown', data: {} };
  return { read: 'ok', data: raw };
}

function readFlow(files: Record<string, Json>, file: string, schema: RegExp, fallbackFlowId: string): Flow {
  const { read, data } = readFile(files, file, schema);
  const flowId = str(data.flowId) || fallbackFlowId;
  if (read !== 'ok' || !isObject(data.steps)) {
    return { flowId, file, read: read === 'ok' ? 'unknown' : read, status: '', steps: [], data };
  }
  const steps = Object.entries(data.steps)
    .map(([id, step]) => ({
      flow: flowId,
      id,
      status: isObject(step) ? str(step.status) : '',
      updatedAt: isObject(step) ? str(step.updatedAt) || undefined : undefined,
      diagnostic: isObject(step) ? str(step.diagnostic) || undefined : undefined,
    }))
    .sort((a, b) => stepNumber(a.id) - stepNumber(b.id));
  return { flowId, file, read, status: str(data.status), steps, data };
}

const FAILED_STEP = new Set(['failed', 'unavailable', 'rejected']);

function flowState(flow: Flow): StageState {
  if (flow.read === 'missing') return 'none';
  if (flow.read === 'unknown') return 'unknown';
  if (flow.status === 'failed' || flow.steps.some(step => FAILED_STEP.has(step.status))) return 'error';
  if (flow.status === 'complete' && flow.steps.every(step => step.status === 'approved')) return 'done';
  return 'progress';
}

/** A flow not complete never counts whole: its file may list only the steps that started. */
function flowFraction(flow: Flow): number {
  if (flow.read !== 'ok') return 0;
  if (flowState(flow) === 'done') return 1;
  if (!flow.steps.length) return 0;
  return Math.min(0.9, flow.steps.filter(step => step.status === 'approved').length / flow.steps.length);
}

function failedSteps(flow: Flow, stage: StageId, moduleId: string): Problem[] {
  return flow.steps.filter(step => FAILED_STEP.has(step.status)).map(step => ({
    severity: 'error' as const,
    stage,
    code: 'step-failed' as const,
    detail: `${flow.flowId} · ${step.id}${step.diagnostic ? `: ${step.diagnostic}` : ''}`,
    target: { kind: 'agent' as const, agent: flow.flowId, module: moduleId, stepId: step.id, file: flow.file },
  }));
}

/** Two flows behind one stage (defs, then materialize): the worse state wins; done only when both are. */
function combine(first: StageState, second: StageState): StageState {
  if (first === 'error' || second === 'error') return 'error';
  if (first === 'unknown' || second === 'unknown') return 'unknown';
  if (first === 'none' && second === 'none') return 'none';
  if (first === 'done' && second === 'done') return 'done';
  return 'progress';
}

const baseName = (path: string): string => path.slice(path.lastIndexOf('/') + 1).replace(/\..*$/, '');

// ── one module ────────────────────────────────────────────────────────────────

interface ModuleContext {
  moduleId: string;
  projectId: number;
  files: Record<string, Json>;
  paths: string[];
  config: Json;
  /** The module entry of the config and its path, when present. */
  entry?: Record<string, unknown>;
  entryPath?: Path;
  issues: Issue[];
  contracts?: RouteRow[];
}

function stage(id: StageId, state: StageState, fraction: number, steps: StepInfo[] = [], checkWarnings = 0): Stage {
  return { id, state, fraction, steps, checkWarnings };
}

function configPages(entry: Record<string, unknown> | undefined): Array<Record<string, unknown>> {
  return list(getAt(entry, ['frontend', 'pages'])).filter(isObject);
}

function specStage(ctx: ModuleContext, problems: Problem[]): Stage {
  const { moduleId, files } = ctx;
  const flow = readFlow(files, `l4/${moduleId}/pipeline/pipeline.json`, SCHEMAS.spec, AGENTS.spec);
  const report = readFile(files, `l4/${moduleId}/pipeline/finalize-report.json`, SCHEMAS.specReport);
  let state = flowState(flow);
  problems.push(...failedSteps(flow, 'spec', moduleId));
  let checkWarnings = 0;
  if (report.read === 'ok') {
    for (const error of list(report.data.errors).filter(isObject)) {
      problems.push({
        severity: 'error', stage: 'spec', code: 'spec-check',
        detail: [str(error.code), str(error.path), str(error.message)].filter(Boolean).join(' · '),
        target: { kind: 'agent', agent: flow.flowId, module: moduleId, stepId: 'finalize80', file: `l4/${moduleId}/pipeline/finalize-report.json` },
      });
    }
    checkWarnings = list(report.data.warnings).length;
    if (report.data.finalStatus === 'failed' && state !== 'unknown') state = 'error';
  }
  return stage('spec', state, flowFraction(flow), flow.steps, checkWarnings);
}

/** The pages the defs planned: the artifacts of their `pages…` step (`…/pages50/<pageId>.json`). */
function plannedPages(flow: Flow): string[] {
  const step = isObject(flow.data.steps) ? Object.entries(flow.data.steps).find(([id]) => /^pages\d+$/.test(id))?.[1] : undefined;
  return isObject(step) ? list(step.artifactPaths).map(String).filter(path => path.endsWith('.json')).map(baseName) : [];
}

function pagesStage(ctx: ModuleContext, problems: Problem[]): { stage: Stage; planned: string[] } {
  const { moduleId, files } = ctx;
  const defs = readFlow(files, `l2/${moduleId}/pipeline/agentDefsL2/pipeline.json`, SCHEMAS.defsL2, AGENTS.defsL2);
  const materialize = readFlow(files, `l2/${moduleId}/pipeline/agentMaterializeL2/pipeline.json`, SCHEMAS.materializeL2, AGENTS.materializeL2);
  const finalize = readFile(files, `l2/${moduleId}/pipeline/agentMaterializeL2/finalize70.json`, SCHEMAS.finalizeL2);
  const routed = configPages(ctx.entry).length;
  const steps = [...defs.steps, ...materialize.steps];
  const planned = plannedPages(defs);
  problems.push(...failedSteps(defs, 'pages', moduleId), ...failedSteps(materialize, 'pages', moduleId));

  // Pages made before these flows wrote files: what the config routes is what exists.
  if (defs.read === 'missing' && materialize.read === 'missing') {
    return { stage: stage('pages', routed ? 'done' : 'none', routed ? 1 : 0), planned };
  }
  let state = combine(flowState(defs), flowState(materialize));
  if (flowState(defs) === 'done' && materialize.read === 'missing') {
    state = 'progress';
    problems.push({
      severity: 'warning', stage: 'pages', code: 'not-materialized', detail: planned.join(', ') || undefined,
      target: { kind: 'agent', agent: AGENTS.materializeL2, module: moduleId, file: defs.file },
    });
  }
  if (finalize.read === 'ok') {
    const file = `l2/${moduleId}/pipeline/agentMaterializeL2/finalize70.json`;
    for (const pageId of list(finalize.data.notApproved).map(String)) {
      problems.push({ severity: 'warning', stage: 'pages', code: 'page-not-approved', pageId, detail: pageId, target: { kind: 'agent', agent: AGENTS.materializeL2, module: moduleId, file } });
    }
    if (finalize.data.written !== true) {
      problems.push({ severity: 'warning', stage: 'pages', code: 'config-not-written', target: { kind: 'agent', agent: AGENTS.materializeL2, module: moduleId, stepId: 'finalize70', file } });
    }
  } else if (state === 'done' && !routed) {
    // Materialized but the config does not route a single page: not there for the person yet.
    state = 'progress';
  }
  const fraction = state === 'done' ? 1 : 0.5 * flowFraction(defs) + 0.5 * flowFraction(materialize);
  return { stage: stage('pages', state, fraction, steps), planned };
}

/** The newest L1 materialize report: the folder was renamed over time (agentMaterializeL1, …L12). */
function latestL1Report(files: Record<string, Json>, moduleId: string): { read: Flow['read']; data: Record<string, unknown>; folder: string } {
  const prefix = `l1/${moduleId}/pipeline/`;
  const candidates = Object.keys(files)
    .filter(path => path.startsWith(prefix) && /\/agentMaterializeL1\w*\/report\.json$/.test(path))
    .map(path => ({ path, ...readFile(files, path, SCHEMAS.materializeL1) }))
    .sort((a, b) => str(b.data.createdAt).localeCompare(str(a.data.createdAt)));
  const chosen = candidates.find(candidate => candidate.read === 'ok') ?? candidates[0];
  if (!chosen) return { read: 'missing', data: {}, folder: '' };
  return { read: chosen.read, data: chosen.data, folder: chosen.path.slice(0, chosen.path.lastIndexOf('/')) };
}

function backendStage(ctx: ModuleContext, problems: Problem[]): Stage {
  const { moduleId, files } = ctx;
  const defs = readFlow(files, `l1/${moduleId}/pipeline/agentDefsL1/pipeline.json`, SCHEMAS.defsL1, AGENTS.defsL1);
  const report = latestL1Report(files, moduleId);
  const registration = report.folder ? files[`${report.folder}/registration.json`] : undefined;
  const controllers = typeof ctx.entry?.backendControllers === 'string' && ctx.entry.backendControllers !== '';
  const agent = (file: string, stepId?: string): Target => ({ kind: 'agent', agent: AGENTS.materializeL1, module: moduleId, ...(stepId ? { stepId } : {}), file });
  const reportFile = `${report.folder}/report.json`;
  problems.push(...failedSteps(defs, 'backend', moduleId));

  if (defs.read === 'missing' && report.read === 'missing') {
    return stage('backend', controllers ? 'done' : 'none', controllers ? 1 : 0);
  }
  let materialized: StageState = 'none';
  if (report.read === 'unknown') materialized = 'unknown';
  else if (report.read === 'ok') {
    const data = report.data;
    const counts = isObject(data.counts) ? data.counts : {};
    for (const item of list(data.open).filter(isObject)) {
      const status = str(item.status);
      problems.push({
        severity: status === 'gap' ? 'warning' : 'error', stage: 'backend', code: 'unit-open',
        detail: [`${str(item.layer)}/${str(item.unitId)}`, str(item.code), str(item.diagnostic)].filter(Boolean).join(' · '),
        target: agent(reportFile),
      });
    }
    for (const unit of list(data.notCompiled).map(String)) problems.push({ severity: 'warning', stage: 'backend', code: 'not-compiled', detail: unit, target: agent(reportFile) });
    for (const unit of list(data.missing).map(String)) problems.push({ severity: 'error', stage: 'backend', code: 'missing-unit', detail: unit, target: agent(reportFile) });
    for (const item of list(data.defProblems).filter(isObject)) {
      problems.push({ severity: 'warning', stage: 'backend', code: 'def-problem', detail: [str(item.defRef), str(item.code), str(item.detail)].filter(Boolean).join(' · '), target: agent(reportFile) });
    }
    const broken = Number(counts.failed ?? 0) + Number(counts.blocked ?? 0) > 0 || data.status === 'failed';
    materialized = broken ? 'error' : data.status === 'complete' ? 'done' : 'progress';
  }
  if (isObject(registration) && registration.action === 'pending') {
    problems.push({ severity: 'warning', stage: 'backend', code: 'not-registered', detail: str(registration.detail) || undefined, target: agent(`${report.folder}/registration.json`, 'register70') });
    if (materialized === 'done') materialized = 'progress';
  }
  if (flowState(defs) === 'done' && report.read === 'missing') {
    problems.push({ severity: 'warning', stage: 'backend', code: 'not-materialized', target: agent(defs.file) });
  }
  if (materialized === 'done' && !controllers && ctx.entryPath) {
    problems.push({ severity: 'warning', stage: 'backend', code: 'controllers-not-in-config', target: { kind: 'config', path: ctx.entryPath } });
  }
  const state = combine(flowState(defs), materialized);
  const materializedFraction = materialized === 'done' ? 1 : materialized === 'none' || materialized === 'unknown' ? 0 : 0.5;
  const fraction = state === 'done' ? 1 : Math.min(0.95, 0.5 * flowFraction(defs) + 0.5 * materializedFraction);
  return stage('backend', state, fraction, defs.steps);
}

/** Which stage a config issue belongs to, by where it is in the module entry. */
function issueStage(issue: Issue): StageId {
  const parts = issue.path.map(String);
  if (parts.includes('pageTests')) return 'tests';
  if (parts.some(part => part === 'backendControllers' || part === 'backendRouter' || part === 'backend')) return 'backend';
  return 'routes';
}

function configProblems(ctx: ModuleContext, problems: Problem[]): void {
  const { entry, entryPath, moduleId, issues } = ctx;
  const pages = configPages(entry);
  const entryKey = entryPath ? pathKey(entryPath) : undefined;
  for (const issue of issues) {
    const key = pathKey(issue.path);
    let target: Target = { kind: 'config', path: issue.path };
    let pageId: string | undefined;
    if (issue.code === 'orphan-page') {
      // One list for the whole project: the file says whose it is.
      if (!issue.detail?.startsWith(`l2/${moduleId}/`)) continue;
      target = { kind: 'file', project: ctx.projectId, path: issue.detail };
      pageId = baseName(issue.detail);
    } else {
      if (!entryKey || (key !== entryKey && !key.startsWith(`${entryKey}.`) && !key.startsWith(`${entryKey}[`))) continue;
      const pageIndex = entryPath ? issue.path[entryPath.length + 2] : undefined;
      if (issue.path[entryPath!.length] === 'frontend' && issue.path[entryPath!.length + 1] === 'pages' && typeof pageIndex === 'number') {
        pageId = str(pages[pageIndex]?.pageId) || undefined;
      }
      if (issue.menuIssue) pageId = issue.menuIssue.pageId;
    }
    problems.push({ severity: issue.severity, stage: issueStage(issue), code: 'config', detail: issue.detail, issue, pageId, target });
  }
}

function routesStage(ctx: ModuleContext): Stage {
  const pages = configPages(ctx.entry).length;
  if (!ctx.entry || !pages) return stage('routes', 'none', 0);
  return stage('routes', 'done', 1);
}

/** The test files of the module (front and back), as page ids: `…/<pageId>.test.js`. */
function testedPages(entry: Record<string, unknown> | undefined): Set<string> {
  const tests = [...list(getAt(entry, ['frontend', 'pageTests'])), ...list(getAt(entry, ['backend', 'pageTests']))].map(String);
  return new Set(tests.map(baseName));
}

function testsStage(ctx: ModuleContext, problems: Problem[]): Stage {
  const pages = configPages(ctx.entry).map(page => str(page.pageId)).filter(Boolean);
  const tested = testedPages(ctx.entry);
  if (!pages.length || !tested.size) return stage('tests', 'none', 0);
  const missing = pages.filter(pageId => !tested.has(pageId));
  if (missing.length) {
    problems.push({
      severity: 'warning', stage: 'tests', code: 'pages-without-test', detail: missing.join(', '),
      target: { kind: 'config', path: [...ctx.entryPath!, 'frontend', 'pageTests'] },
    });
  }
  return stage('tests', missing.length ? 'progress' : 'done', (pages.length - missing.length) / pages.length);
}

/**
 * The contract rows of the module as problems: a route the page calls and the backend does not have
 * is an error (when there is a backend at all: before it, every route is missing and that is the
 * backend stage's news); a declared route the shared never calls is a warning.
 */
export function contractProblems(rows: RouteRow[], projectId: number, backendStarted: boolean): Problem[] {
  const problems: Problem[] = [];
  for (const row of rows) {
    if (!row.existsInBackend && backendStarted) {
      problems.push({ severity: 'error', stage: 'backend', code: 'route-missing-backend', pageId: row.page, detail: row.route, target: { kind: 'file', project: projectId, path: `l2/${row.contractPath}` } });
    }
    if (!row.calledInFrontend) {
      const path = row.sharedPath ?? row.contractPath;
      problems.push({ severity: 'warning', stage: 'routes', code: 'route-not-called', pageId: row.page, detail: row.route, target: { kind: 'file', project: projectId, path: `l2/${path}` } });
    }
  }
  return problems;
}

/** A stage's own state, then darkened by its problems: an error makes it red, a warning amber. */
function settle(stageInfo: Stage, problems: Problem[]): Stage {
  if (stageInfo.state === 'unknown') return stageInfo;
  const own = problems.filter(problem => problem.stage === stageInfo.id);
  if (own.some(problem => problem.severity === 'error')) return { ...stageInfo, state: 'error' };
  if (stageInfo.state === 'done' && own.length) return { ...stageInfo, state: 'progress' };
  return stageInfo;
}

function moduleStatus(stages: Stage[]): ModuleStatus {
  if (stages.every(item => item.state === 'none' || item.state === 'unknown')) return 'new';
  if (stages.some(item => item.state === 'error')) return 'error';
  if (stages.every(item => item.state === 'done')) return 'complete';
  return 'progress';
}

function pageRows(ctx: ModuleContext, planned: string[], problems: Problem[]): PageRow[] {
  const rows: PageRow[] = configPages(ctx.entry).map(page => ({
    pageId: str(page.pageId),
    title: str(page.title) || undefined,
    route: str(page.route) || undefined,
    source: str(page.source).replace(/^\.?\//, '') || undefined,
    materialized: true,
    state: 'done' as PageRow['state'],
    problems: 0,
  }));
  const known = new Set(rows.map(row => row.pageId));
  for (const pageId of planned) {
    if (!known.has(pageId)) rows.push({ pageId, materialized: false, state: 'none', problems: 0 });
  }
  for (const row of rows) {
    const own = problems.filter(problem => problem.pageId === row.pageId);
    row.problems = own.length;
    if (own.some(problem => problem.severity === 'error')) row.state = 'error';
    else if (own.length && row.materialized) row.state = 'warning';
  }
  return rows;
}

function lastUpdated(stages: Stage[], files: Record<string, Json>, moduleId: string): string | undefined {
  const dates = stages.flatMap(item => item.steps.map(step => step.updatedAt ?? ''));
  for (const [path, data] of Object.entries(files)) {
    if (pipelineFileModule(path) === moduleId && isObject(data)) dates.push(str(data.updatedAt), str(data.createdAt));
  }
  const latest = dates.filter(Boolean).sort().pop();
  return latest || undefined;
}

function actorCount(files: Record<string, Json>, moduleId: string, entry: Record<string, unknown> | undefined): number {
  const spec = files[`l4/${moduleId}/pipeline/pipeline.json`];
  if (isObject(spec) && isObject(spec.steps)) {
    for (const step of Object.values(spec.steps)) {
      if (isObject(step) && Array.isArray(step.actors)) return step.actors.length;
    }
  }
  return new Set(configPages(entry).flatMap(page => list(page.actors).map(String))).size;
}

function buildModule(ctx: ModuleContext): ModuleRow {
  const problems: Problem[] = [];
  const spec = specStage(ctx, problems);
  const { stage: pages, planned } = pagesStage(ctx, problems);
  const backend = backendStage(ctx, problems);
  configProblems(ctx, problems);
  const routes = routesStage(ctx);
  const tests = testsStage(ctx, problems);
  const contractChecked = ctx.contracts !== undefined;
  if (ctx.contracts) problems.push(...contractProblems(ctx.contracts, ctx.projectId, backend.state !== 'none'));
  problems.sort((a, b) => (a.severity === b.severity ? 0 : a.severity === 'error' ? -1 : 1) || STAGE_IDS.indexOf(a.stage) - STAGE_IDS.indexOf(b.stage));

  const settled = [spec, pages, backend, routes, tests].map(item => settle(item, problems));
  const stages = Object.fromEntries(settled.map(item => [item.id, item])) as Record<StageId, Stage>;
  const percent = Math.round(100 * settled.reduce((sum, item) => sum + item.fraction, 0) / settled.length);
  const controllerDir = `l1/${ctx.moduleId}/layer_1_external/adapters/http/controllers/`;
  return {
    moduleId: ctx.moduleId,
    basePath: str(ctx.entry?.basePath) || undefined,
    status: moduleStatus(settled),
    percent,
    stages,
    problems,
    pages: pageRows(ctx, planned, problems),
    actors: actorCount(ctx.files, ctx.moduleId, ctx.entry),
    controllers: ctx.paths.filter(path => path.startsWith(controllerDir) && !path.slice(controllerDir.length).includes('/') && /^[^.]+\.ts$/.test(path.slice(controllerDir.length))).length,
    lastUpdated: lastUpdated(settled, ctx.files, ctx.moduleId),
    configPath: ctx.entryPath,
    contractChecked,
  };
}

// ── the project ───────────────────────────────────────────────────────────────

/**
 * The modules of the project: the ones the config declares (in its order) and the ones some agent
 * already wrote a pipeline for. A folder with neither (a layout, a registry) is not a module.
 */
export function moduleIds(config: Json, projectId: number, files: Record<string, Json>): string[] {
  const client = clientKey(config, projectId);
  const declared = list(getAt(config, ['projects', client, 'modules'])).filter(isObject).map(entry => str(entry.moduleId)).filter(Boolean);
  const fromFiles = Object.keys(files).map(pipelineFileModule).filter((id): id is string => Boolean(id)).sort((a, b) => a.localeCompare(b));
  return [...new Set([...declared, ...fromFiles])];
}

export function buildDashboard(input: DashboardInput): Dashboard {
  const { projectId, config, files, paths } = input;
  const client = clientKey(config, projectId);
  const entries = list(getAt(config, ['projects', client, 'modules']));
  const modules = moduleIds(config, projectId, files).map(moduleId => {
    const index = entries.findIndex(entry => isObject(entry) && entry.moduleId === moduleId);
    return buildModule({
      moduleId, projectId, files, paths, config,
      entry: index >= 0 ? entries[index] as Record<string, unknown> : undefined,
      entryPath: index >= 0 ? ['projects', client, 'modules', index] : undefined,
      issues: input.configIssues,
      contracts: input.contracts?.[moduleId],
    });
  });
  modules.sort((a, b) => STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status) || a.moduleId.localeCompare(b.moduleId));

  const counts: Record<ModuleStatus, number> = { error: 0, progress: 0, new: 0, complete: 0 };
  const stageMix = { done: 0, progress: 0, error: 0, none: 0 };
  const totals = { pages: 0, controllers: 0, errors: 0, warnings: 0 };
  for (const module of modules) {
    counts[module.status]++;
    for (const id of STAGE_IDS) {
      const state = module.stages[id].state;
      stageMix[state === 'unknown' ? 'none' : state]++;
    }
    totals.pages += module.pages.filter(page => page.materialized).length;
    totals.controllers += module.controllers;
    totals.errors += module.problems.filter(problem => problem.severity === 'error').length;
    totals.warnings += module.problems.filter(problem => problem.severity === 'warning').length;
  }
  const percent = modules.length ? Math.round(modules.reduce((sum, module) => sum + module.percent, 0) / modules.length) : 0;
  return { projectId, modules, percent, counts, stageMix, totals };
}

/** A module whose files changed since its contract check: the cached rows no longer hold. */
export function contractSignature(entries: Array<{ path: string; version: string }>): string {
  return entries.map(entry => `${entry.path}@${entry.version}`).sort().join('|');
}
