/// <mls fileReference="_102020_/l2/agentChangeFrontend/nodejsMaterializeL2.ts" enhancement="_blank"/>

// Node runner for agentChangeFrontend materialization (.defs.ts -> .ts). The pure behavior lives in
// cfeMaterializeCore.ts; this file only adapts filesystem, collab-llm HTTP and CLI concerns.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  applyHeader,
  buildCompileRepairHint,
  buildContextSection,
  buildHumanPrompt,
  buildMaterializeTypecheckTest,
  buildMissingCodeRepairHint,
  collectChartEventIssues,
  collectPageTemplateHygieneIssues,
  buildSharedDtsSection,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  expandContextRef,
  isSharedRuntimeTsRef,
  isMaxTokensFailure,
  isSplitWorthyFailure,
  isTimeoutFailure,
  isStale,
  layerRank,
  MATERIALIZE_REPAIR_ATTEMPTS,
  orderItems,
  parseDefs,
  sharedDtsArtifactRef,
  testPathForOutputPath,
  trimDefinitionForPrompt,
  trimSharedI18nForPageContext,
  type PipelineItem,
  type PlannedItem,
} from './helpers/cfeMaterializeCore.js';
import { callCollabLlm, parseGenResult, type LlmConfig, type LlmResult } from './helpers/nodejsMaterializeLlmClient.js';
import { generateSharedScaffold } from './helpers/cfeSharedScaffold.js';
import { buildPageSkeleton, organismShortName, type PageOrganism } from './helpers/cfePageSkeleton.js';
import { buildSplitPlan, type SplitPlanSection } from './helpers/cfePageSplitPlan.js';

const HERE = path.dirname(process.argv[1] ? path.resolve(process.argv[1]) : process.cwd());
let ROOT = process.env.MATERIALIZE_L2_ROOT ? path.resolve(process.env.MATERIALIZE_L2_ROOT) : path.resolve(HERE, '../../../');

function mlsToFs(ref: string): string {
  if (/^_(\d+)_\.d\.ts$/.test(ref)) return path.join(ROOT, ref.replace(/^_(\d+)_\.d\.ts$/, 'mls-$1.d.ts'));
  return path.join(ROOT, ref.replace(/^_(\d+)_\//, 'mls-$1/'));
}

function parseMlsTsPath(ref: string): { project: number; folder: string; shortName: string } | null {
  const m = /^_(\d+)_\/l2\/(.+)\/([^/]+)\.ts$/.exec(ref);
  return m ? { project: Number(m[1]), folder: m[2], shortName: m[3] } : null;
}

function convertFileToTag(info: { shortName: string; project: number; folder?: string }): string {
  if (info.shortName.includes('-')) return fileToTagNew(info);
  const kebabName = toKebab(info.shortName);
  const baseName = `${kebabName}-${info.project}`;
  const folderPrefix = info.folder ? `${toKebab(info.folder).replace(/\//g, '--')}--` : '';
  return `${folderPrefix}${baseName}`;
}

function fileToTagNew(info: { shortName: string; folder?: string }): string {
  const kebabName = toKebab(info.shortName);
  if (!info.folder) return kebabName;
  const parts = info.folder.split('/');
  return `${toKebab(parts[parts.length - 1] || '')}--${kebabName}`;
}

function toKebab(str: string): string {
  return str.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
}

/** Preview html for a PAGE. An organism is not a page and never gets one (paginaDividida.md decision 7). */
function writePagePreviewHtml(item: PipelineItem): string | null {
  if (item.type !== 'l2_page') return null;
  const parsed = parseMlsTsPath(item.outputPath);
  if (!parsed) return null;
  const tag = convertFileToTag(parsed);
  const htmlRef = item.outputPath.replace(/\.ts$/, '.html');
  const htmlAbs = mlsToFs(htmlRef);
  fs.mkdirSync(path.dirname(htmlAbs), { recursive: true });
  fs.writeFileSync(htmlAbs, `<${tag}></${tag}>`);
  return htmlRef;
}

/**
 * Split plan of a page, read from trace/frontend-page-split/<genome>/<page>.json
 * (todo/changeFrontend/paginaDividida.md §5).
 *
 * It lives OUTSIDE the defs on purpose: `savePageLayoutDefs` rebuilds the pipeline from scratch on every
 * create run, so a split recorded in the defs would be wiped by the next @@changeFrontend — exactly the
 * opposite of "reprocessar a página já encontra a definição".
 */
interface PageSplit { organisms: PageOrganism[] }

const SPLIT_BY_OUTPUT = new Map<string, { organisms: PageOrganism[]; current?: number }>();

function readPageSplit(pageOutputPath: string): PageSplit | null {
  const parsed = parseMlsTsPath(pageOutputPath);
  if (!parsed) return null;
  const moduleName = parsed.folder.split('/')[0];
  const genome = parsed.folder.split('/').pop() || '';
  const ref = `_${parsed.project}_/l2/${moduleName}/trace/frontend-page-split/${genome}/${parsed.shortName}.json`;
  const raw = readIfExists(mlsToFs(ref));
  if (raw == null) return null;
  try {
    const plan = JSON.parse(raw) as PageSplit;
    return Array.isArray(plan.organisms) && plan.organisms.length ? plan : null;
  } catch {
    console.warn(`  split plan is not valid JSON, ignored: ${ref}`);
    return null;
  }
}

/**
 * One pipeline item per organism plus the page that composes them. The organisms depend only on the shared
 * — they are independent of each other, so they generate in parallel; the page depends on all of them
 * because it imports their functions. `l2_page_organism` keeps them out of everything that treats a file
 * as a page (the .html preview, the page gates).
 */
function expandSplitPage(base: ScannedDefs, plan: PageSplit): ScannedDefs[] {
  const parsed = parseMlsTsPath(base.item.outputPath);
  if (!parsed) return [base];
  const out: ScannedDefs[] = [];
  const organismIds: string[] = [];
  for (const organism of plan.organisms) {
    const id = `${base.item.id}__O${organism.n}`;
    const outputPath = `_${parsed.project}_/l2/${parsed.folder}/${organismShortName(parsed.shortName, organism.n)}.ts`;
    SPLIT_BY_OUTPUT.set(outputPath, { organisms: plan.organisms, current: organism.n });
    organismIds.push(id);
    out.push({
      ...base,
      item: {
        ...base.item,
        id,
        type: 'l2_page_organism',
        outputPath,
        organism: organism.organism,
        bindings: organism.bindings,
      } as PipelineItem,
    });
  }
  SPLIT_BY_OUTPUT.set(base.item.outputPath, { organisms: plan.organisms });
  out.push({ ...base, item: { ...base.item, dependsOn: [...(base.item.dependsOn ?? []), ...organismIds] } });
  return out;
}

/**
 * Write the split plan for a page that blew the output cap, from the l4 workspace sections.
 *
 * Deterministic: the l4 already declares the page's sections and the bffCall each organism binds to, so
 * this projects that, it does not decide anything (cfePageSplitPlan). Returns the plan when written.
 */
function writeSplitPlanFromL4(item: PipelineItem, data: unknown, reason: string): PageSplit | null {
  const parsed = parseMlsTsPath(item.outputPath);
  if (!parsed) return null;
  const moduleName = parsed.folder.split('/')[0];
  const genome = parsed.folder.split('/').pop() || '';

  const wsAbs = mlsToFs(`_${parsed.project}_/l4/${moduleName}/workspaces/${parsed.shortName}.defs.ts`);
  const wsSource = readIfExists(wsAbs);
  if (wsSource == null) { console.log(`  no l4 workspace at ${wsAbs} — cannot plan a split`); return null; }
  const workspace = extractFirstExportedObject(wsSource);
  const sections = (isPlainRecord(workspace) && Array.isArray(workspace.sections) ? workspace.sections : [])
    .filter(isPlainRecord)
    .map(section => ({
      sectionId: String(section.sectionId ?? ''),
      organisms: (Array.isArray(section.organisms) ? section.organisms : []).filter(isPlainRecord) as SplitPlanSection['organisms'],
    }))
    .filter(section => section.sectionId);

  const bindings = (isPlainRecord(data) && Array.isArray(data.dataBindings) ? data.dataBindings : [])
    .filter(isPlainRecord).map(binding => String(binding.command ?? '')).filter(Boolean);

  const plan = buildSplitPlan(parsed.shortName, genome, sections, bindings, reason);
  if (!plan) { console.log(`  l4 gives ${sections.length} usable section(s) — not enough to split`); return null; }

  const planAbs = mlsToFs(`_${parsed.project}_/l2/${moduleName}/trace/frontend-page-split/${genome}/${parsed.shortName}.json`);
  fs.mkdirSync(path.dirname(planAbs), { recursive: true });
  fs.writeFileSync(planAbs, `${JSON.stringify(plan, null, 2)}\n`);
  console.log(`  split plan written: ${plan.organisms.length} organism(s) -> ${planAbs}`);
  return { organisms: plan.organisms };
}

/** First `export const X = { … }` of a defs, balanced-brace then JSON (the file is JSON.stringify output). */
function extractFirstExportedObject(source: string): unknown {
  const at = source.search(/export const [A-Za-z0-9_]+ = \{/u);
  if (at < 0) return null;
  const start = source.indexOf('{', at);
  let depth = 0;
  for (let i = start; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}' && --depth === 0) {
      try { return JSON.parse(source.slice(start, i + 1)); } catch { return null; }
    }
  }
  return null;
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readIfExists(abs: string): string | null {
  try { return fs.readFileSync(abs, 'utf8'); } catch { return null; }
}

type EnvMap = Record<string, string>;

function mtimeMs(abs: string): number | null {
  try { return fs.statSync(abs).mtimeMs; } catch { return null; }
}

function refMtimeMs(ref: string): number | null {
  const direct = mtimeMs(mlsToFs(ref));
  if (direct != null) return direct;
  return ref.endsWith('.d.ts') ? mtimeMs(mlsToFs(ref.replace(/\.d\.ts$/, '.ts'))) : null;
}

function readContext(ref: string): { ref: string; found: boolean; content: string } {
  const direct = readIfExists(mlsToFs(ref));
  if (direct != null) return { ref, found: true, content: direct };
  if (ref.endsWith('.d.ts')) {
    const tsRef = ref.replace(/\.d\.ts$/, '.ts');
    const ts = readIfExists(mlsToFs(tsRef));
    if (ts != null) return { ref: tsRef, found: true, content: ts };
  }
  return { ref, found: false, content: '' };
}

interface ScannedDefs { defRef: string; defAbs: string; item: PipelineItem; data: unknown; }

function scanModule(project: number, moduleName: string): ScannedDefs[] {
  const moduleDir = path.join(ROOT, `mls-${project}`, 'l2', moduleName);
  let files: string[] = [];
  try { files = fs.readdirSync(moduleDir, { recursive: true }) as string[]; } catch {
    throw new Error(`module dir not found: ${moduleDir}`);
  }

  const out: ScannedDefs[] = [];
  for (const rel of files) {
    if (!rel.endsWith('.defs.ts')) continue;
    const defAbs = path.join(moduleDir, rel);
    const src = readIfExists(defAbs);
    if (src == null) continue;
    const parsed = parseDefs(src);
    if (!parsed.item) continue;
    if (!parsed.item.type.startsWith('l2_')) continue;
    const defRef = `_${project}_/l2/${moduleName}/${rel.split(path.sep).join('/')}`;
    const scanned: ScannedDefs = { defRef, defAbs, item: parsed.item, data: parsed.data };
    const split = parsed.item.type === 'l2_page' ? readPageSplit(parsed.item.outputPath) : null;
    if (split) out.push(...expandSplitPage(scanned, split));
    else out.push(scanned);
  }
  return out;
}

function newestDependencyMs(item: PipelineItem): number | null {
  const deps = item.dependsFiles ?? [];
  let newest: number | null = null;
  for (const dep of deps) {
    for (const ref of expandContextRef(dep)) {
      const ms = refMtimeMs(ref);
      if (ms != null && (newest == null || ms > newest)) newest = ms;
    }
  }
  return newest;
}

function plan(scanned: ScannedDefs[], force: boolean): PlannedItem[] {
  const ordered = orderItems(scanned.map((s) => s.item));
  const byOut = new Map(scanned.map((s) => [s.item.outputPath, s]));
  const scheduledOutputs = new Set<string>();
  const planned: PlannedItem[] = [];

  for (const item of ordered) {
    const s = byOut.get(item.outputPath)!;
    const defsMs = mtimeMs(s.defAbs);
    const tsMs = mtimeMs(mlsToFs(item.outputPath));
    const typecheckCode = buildMaterializeTypecheckTest(item, s.data);
    const testRef = typecheckCode ? testPathForOutputPath(item.outputPath) : null;
    const testMs = testRef ? mtimeMs(mlsToFs(testRef)) : null;
    const depMs = newestDependencyMs(item);
    const scheduledDep = (item.dependsFiles ?? []).some((dep) => expandContextRef(dep).some((ref) => scheduledOutputs.has(ref)));
    const stale = force || scheduledDep || isStale(defsMs, tsMs, depMs) || (testRef != null && (testMs == null || (defsMs != null && defsMs > testMs)));
    const reason = force
      ? 'forced'
      : tsMs == null
        ? 'output missing'
        : testRef != null && testMs == null
          ? 'typecheck missing'
          : scheduledDep
            ? 'dependency scheduled'
            : defsMs != null && defsMs > tsMs
              ? 'defs newer than ts'
              : testRef != null && defsMs != null && testMs != null && defsMs > testMs
                ? 'defs newer than typecheck'
                : depMs != null && depMs > tsMs
                  ? 'dependency newer than ts'
                  : 'up to date';
    if (stale) scheduledOutputs.add(item.outputPath);
    planned.push({ item, rank: layerRank(item.type), stale, reason });
  }

  return planned;
}

function assemble(item: PipelineItem, data: unknown, modelType: string): { system: string; human: string; skillReport: string[]; depReport: string[] } {
  const skillSections: string[] = [];
  const skillReport: string[] = [];
  for (const s of item.skills ?? []) {
    const r = readContext(s);
    skillReport.push(`${r.found ? 'OK ' : 'MISS'} ${s}`);
    if (r.found) skillSections.push(`<!-- skill: ${s} -->\n${r.content}`);
  }

  const contextSections: string[] = [];
  const depReport: string[] = [];
  for (const d of item.dependsFiles ?? []) {
    for (const ref of expandContextRef(d)) {
      // Context diet (flow.json materializationContextPolicy): for page items the shared base
      // class is sent as its persisted compiled .d.ts (trace/frontend-shared-dts, written by the
      // Studio materializer) when it is at least as fresh as the shared .ts; otherwise the raw
      // source is the fallback (this runner has no compiler).
      if (item.type === 'l2_page' && isSharedRuntimeTsRef(ref)) {
        const dts = readFreshSharedDts(ref);
        if (dts != null) {
          depReport.push(`OK  ${ref} -> ${sharedDtsArtifactRef(ref)}`);
          contextSections.push(buildSharedDtsSection(ref, dts));
          continue;
        }
      }
      const r = readContext(ref);
      depReport.push(`${r.found ? 'OK ' : 'MISS'} ${ref === d ? d : `${d} -> ${ref}`}`);
      // A page gets the shared with only the default locale catalog: it needs the key NAMES, not three
      // translations of every string (see trimSharedI18nForPageContext).
      const content = item.type === 'l2_page' && isSharedRuntimeTsRef(r.ref) ? trimSharedI18nForPageContext(r.content) : r.content;
      if (r.found) contextSections.push(buildContextSection(r.ref, content));
    }
  }

  return {
    system: buildSystemPrompt(skillSections, item.outputPath, modelType),
    human: buildHumanPrompt(trimDefinitionForPrompt(item.type, data), contextSections, item.outputPath, undefined, pageSkeletonFor(item, data)),
    skillReport,
    depReport,
  };
}

/**
 * The deterministic skeleton for a page item (i18n.md §4), or undefined when it cannot be built — then the
 * model writes the file from scratch exactly as before, so a shared this scaffold does not model never
 * blocks the run.
 *
 * Always reads the RAW shared .ts, never the compiled .d.ts the context may carry: the locale list lives in
 * the `message_<locale>` consts, which the .d.ts does not have.
 */
function pageSkeletonFor(item: PipelineItem, data: unknown): string | undefined {
  if (item.type !== 'l2_page' && item.type !== 'l2_page_organism') return undefined;
  const sharedRef = (item.dependsFiles ?? []).find(ref => isSharedRuntimeTsRef(ref));
  if (!sharedRef) return undefined;
  const shared = readIfExists(mlsToFs(sharedRef));
  if (shared == null) return undefined;
  // A split page passes its organisms: the page then imports and composes their exported render
  // functions, and an organism builds only its own file (paginaDividida.md §3).
  const split = SPLIT_BY_OUTPUT.get(item.outputPath);
  const pagePath = split?.current ? item.outputPath.replace(/_O\d+\.ts$/u, '.ts') : item.outputPath;
  const built = buildPageSkeleton({
    outputPath: pagePath, data, sharedTsRef: sharedRef, sharedSource: shared,
    organisms: split?.organisms, current: split?.current,
  });
  if (!built.code) console.warn(`  skeleton skipped for ${item.outputPath}: ${built.reason}`);
  return built.code ?? undefined;
}

function readFreshSharedDts(sharedTsRef: string): string | null {
  const artifactRef = sharedDtsArtifactRef(sharedTsRef);
  if (!artifactRef) return null;
  const artifactMs = refMtimeMs(artifactRef);
  const sharedMs = refMtimeMs(sharedTsRef);
  if (artifactMs == null || (sharedMs != null && artifactMs < sharedMs)) return null;
  const artifact = readContext(artifactRef);
  return artifact.found && artifact.content.trim() ? artifact.content : null;
}

function loadConfig(explicitPath: string | undefined): LlmConfig {
  const legacyPath = explicitPath || process.env.MATERIALIZE_L2_CONFIG;
  const cfg = legacyPath ? loadJsonConfig(legacyPath) : configFromEnv('L2', 'agentChangeFrontend');
  if (!cfg.baseUrl || !cfg.token) throw new Error('config must set baseUrl and token');
  return cfg;
}

function loadJsonConfig(configPath: string): LlmConfig {
  const raw = readIfExists(configPath);
  if (raw == null) throw new Error(`config not found: ${configPath}`);
  try {
    return JSON.parse(raw) as LlmConfig;
  } catch {
    throw new Error(`config is not valid JSON: ${configPath}`);
  }
}

function configFromEnv(prefix: 'L1' | 'L2', defaultAgentName: string): LlmConfig {
  const envPath = process.env.MLS_BASE_ENV ? path.resolve(process.env.MLS_BASE_ENV) : path.join(ROOT, '.env');
  const fileEnv = readEnvFile(envPath);
  const env: EnvMap = { ...fileEnv, ...process.env as EnvMap };
  const cfg: LlmConfig = {
    baseUrl: envValue(env, `${prefix}_COLLAB_LLM_BASE_URL`, 'COLLAB_LLM_BASE_URL', 'MATERIALIZE_LLM_BASE_URL', 'baseUrl'),
    token: envValue(env, `${prefix}_COLLAB_LLM_TOKEN`, 'COLLAB_LLM_TOKEN', 'MATERIALIZE_LLM_TOKEN', 'token'),
    orgId: envValue(env, `${prefix}_COLLAB_LLM_ORG_ID`, 'COLLAB_LLM_ORG_ID', 'MATERIALIZE_LLM_ORG_ID', 'orgId'),
    userId: envValue(env, `${prefix}_COLLAB_LLM_USER_ID`, 'COLLAB_LLM_USER_ID', 'MATERIALIZE_LLM_USER_ID', 'userId') || defaultAgentName,
    agentName: envValue(env, `${prefix}_COLLAB_LLM_AGENT_NAME`, 'COLLAB_LLM_AGENT_NAME', 'MATERIALIZE_LLM_AGENT_NAME', 'agentName') || defaultAgentName,
    toolStrict: envBool(env, `${prefix}_COLLAB_LLM_TOOL_STRICT`, 'COLLAB_LLM_TOOL_STRICT', 'MATERIALIZE_LLM_TOOL_STRICT', 'toolStrict') ?? true,
    timeoutMs: envNumber(env, `${prefix}_COLLAB_LLM_TIMEOUT_MS`, 'COLLAB_LLM_TIMEOUT_MS', 'MATERIALIZE_LLM_TIMEOUT_MS', 'timeoutMs'),
    temperature: envNumber(env, `${prefix}_COLLAB_LLM_TEMPERATURE`, 'COLLAB_LLM_TEMPERATURE', 'MATERIALIZE_LLM_TEMPERATURE', 'temperature'),
    maxTokens: envNumber(env, `${prefix}_COLLAB_LLM_MAX_TOKENS`, 'COLLAB_LLM_MAX_TOKENS', 'MATERIALIZE_LLM_MAX_TOKENS', 'maxTokens'),
  };
  const modelTypeOverride = envValue(env, `MATERIALIZE_${prefix}_MODEL_TYPE`, `${prefix}_COLLAB_LLM_MODEL_TYPE`, 'COLLAB_LLM_MODEL_TYPE', 'MATERIALIZE_LLM_MODEL_TYPE', 'modelTypeOverride');
  if (modelTypeOverride) cfg.modelTypeOverride = modelTypeOverride;
  if (!cfg.baseUrl || !cfg.token) {
    throw new Error(`LLM config not found. Set COLLAB_LLM_BASE_URL and COLLAB_LLM_TOKEN in ${envPath} (or pass --config for a legacy JSON config).`);
  }
  return cfg;
}

function readEnvFile(envPath: string): EnvMap {
  const raw = readIfExists(envPath);
  if (!raw) return {};
  const trimmed = raw.trim();
  if (trimmed.startsWith('{')) {
    const parsed = JSON.parse(trimmed) as Record<string, unknown>;
    return Object.fromEntries(Object.entries(parsed).map(([key, value]) => [key, String(value)]));
  }
  const env: EnvMap = {};
  for (const line of raw.split(/\r?\n/)) {
    const m = /^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
    if (!m) continue;
    env[m[1]] = unquoteEnvValue(m[2]);
  }
  return env;
}

function unquoteEnvValue(value: string): string {
  const trimmed = value.trim();
  const commentIndex = trimmed.indexOf(' #');
  const raw = commentIndex >= 0 ? trimmed.slice(0, commentIndex).trim() : trimmed;
  if ((raw.startsWith('"') && raw.endsWith('"')) || (raw.startsWith("'") && raw.endsWith("'"))) return raw.slice(1, -1);
  return raw;
}

function envValue(env: EnvMap, ...keys: string[]): string {
  for (const key of keys) {
    const value = env[key];
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return '';
}

function envNumber(env: EnvMap, ...keys: string[]): number | undefined {
  const value = envValue(env, ...keys);
  if (!value) return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

function envBool(env: EnvMap, ...keys: string[]): boolean | undefined {
  const value = envValue(env, ...keys).toLowerCase();
  if (!value) return undefined;
  if (['1', 'true', 'yes', 'on'].includes(value)) return true;
  if (['0', 'false', 'no', 'off'].includes(value)) return false;
  return undefined;
}

interface Args {
  project?: number;
  moduleName?: string;
  dryRun: boolean;
  force: boolean;
  only?: string;
  config?: string;
  out?: string;
  root?: string;
  check: boolean;
  selfTest: boolean;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { dryRun: false, force: false, check: true, selfTest: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--') continue;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--force') a.force = true;
    else if (t === '--self-test') a.selfTest = true;
    else if (t === '--check') a.check = true;
    // Compile + repair are the point of the gate, so they are ON by default. They used to require an
    // explicit --check that package.json never passed, so `pnpm materializeL2` saved uncompiled code and
    // printed 'ok' — which is how 102045 shipped 346 type errors on a green run.
    else if (t === '--no-check') a.check = false;
    else if (t === '--only') a.only = argv[++i];
    else if (t === '--config') a.config = argv[++i];
    else if (t === '--out') a.out = argv[++i];
    else if (t === '--root') a.root = argv[++i];
    else positional.push(t);
  }
  if (positional[0]) a.project = Number(positional[0]);
  if (positional[1]) a.moduleName = positional[1];
  return a;
}

function selfTest(): void {
  const canned = JSON.stringify({
    id: 'chatcmpl-x',
    object: 'chat.completion',
    choices: [{ index: 0, finish_reason: 'tool_calls', message: { role: 'assistant', content: null, tool_calls: [
      { id: 'call_1', type: 'function', function: { name: 'submitGeneratedTs', arguments: JSON.stringify({ code: 'export const ok = 1;' }) } },
    ] } }],
    usage: { prompt_tokens: 1, completion_tokens: 1 },
  });
  const r = parseGenResult(canned);
  if (r.code !== 'export const ok = 1;') throw new Error('self-test FAILED: code mismatch');
  const withHeader = applyHeader('_102050_/l2/x/y.ts', r.code);
  if (!withHeader.startsWith('/// <mls')) throw new Error('self-test FAILED: header not applied');
  const auraHeader = applyHeader('_102050_/l2/cafeFlow/web/shared/aiSalesSummary.ts', '/// <mls fileReference="_102050_/l2/x/y.ts" enhancement="_blank"/>\nexport const ok = 1;');
  if (!auraHeader.startsWith('/// <mls fileReference="_102050_/l2/cafeFlow/web/shared/aiSalesSummary.ts" enhancement="_102020_/l2/enhancementAura"/>')) {
    throw new Error('self-test FAILED: Aura header not normalized');
  }
  const tag = convertFileToTag({ shortName: 'aiSalesSummary', project: 102050, folder: 'cafeFlow/web/desktop/page11' });
  if (tag !== 'cafe-flow--web--desktop--page11--ai-sales-summary-102050') throw new Error(`self-test FAILED: tag mismatch ${tag}`);
  console.log('self-test OK: parseGenResult + applyHeader + tag');
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  if (args.selfTest) { selfTest(); return; }
  if (args.root) ROOT = path.resolve(args.root);
  if (!args.project || !args.moduleName) {
    console.error('usage: nodejsMaterializeL2 <project> <module> [--dry-run] [--force] [--only <substr>] [--config <path>] [--out <dir>] [--no-check]');
    process.exit(1);
  }

  const scanned = scanModule(args.project, args.moduleName);
  if (!scanned.length) { console.error(`no L2 .defs.ts pipeline found for ${args.project}/${args.moduleName}`); process.exit(1); }

  let planned = plan(scanned, args.force);
  if (args.only) planned = planned.filter((p) => p.item.id.includes(args.only!) || p.item.type.includes(args.only!) || p.item.outputPath.includes(args.only!));
  const dataByOut = new Map(scanned.map((s) => [s.item.outputPath, s.data]));
  // The failed item's ScannedDefs, so a split can be expanded from it without re-scanning the module.
  const byDefPath = new Map(scanned.map((s) => [s.defRef, s]));
  // A page is split AT MOST ONCE per run. Without this, a page whose organisms also blow the cap would
  // plan, re-queue, blow the cap again and plan again — an unbounded loop spending an LLM call each time.
  const alreadySplit = new Set<string>();

  const todo = planned.filter((p) => p.stale);
  console.log(`module ${args.project}/${args.moduleName} | ${planned.length} items | mode ${args.dryRun ? 'dry-run' : 'call'}${args.force ? ' (force)' : ''}`);
  console.log(`to generate: ${todo.length}  (skip ${planned.length - todo.length})`);

  if (!todo.length) {
    console.log('nothing to generate (all up to date).');
    if (args.check && !runGeneratedCheck(planned, dataByOut)) process.exitCode = 2;
    return;
  }

  const cfg = args.dryRun ? null : loadConfig(args.config);
  const outDir = args.out || path.join(os.tmpdir(), 'materializeL2-prompts');
  const modelType = parseModelTypeFromConfig(cfg) || DEFAULT_MODEL_TYPE;
  const tracePath = !args.dryRun && cfg ? nextTracePath(args.project, args.moduleName) : null;

  if (tracePath) {
    fs.writeFileSync(tracePath, [
      '# materializeL2 run',
      `time:   ${new Date().toISOString()}`,
      `module: ${args.project}/${args.moduleName}`,
      `only:   ${args.only ?? '(all)'}    force: ${args.force}`,
      `model:  ${modelType}`,
      `items:  ${todo.length}`,
      '', '',
    ].join('\n'));
    console.log(`trace -> ${tracePath}`);
  }

  const failures: string[] = [];
  for (let i = 0; i < todo.length; i++) {
    const p = todo[i];
    const n = `${i + 1}/${todo.length}`;
    const base = p.item.outputPath;
    const data = dataByOut.get(p.item.outputPath);
    const { system, human, skillReport, depReport } = assemble(p.item, data, modelType);
    const miss = [...skillReport, ...depReport].filter((s) => s.startsWith('MISS'));

    if (args.dryRun || !cfg) {
      const dir = path.join(outDir, p.item.id.replace(/\W+/g, '_'));
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, 'system.md'), system);
      fs.writeFileSync(path.join(dir, 'human.md'), human);
      const typecheckCode = buildMaterializeTypecheckTest(p.item, data);
      if (typecheckCode) fs.writeFileSync(path.join(dir, 'typecheck.test.ts'), typecheckCode);
      console.log(`[${n}] ${base}  -> prompt (${p.reason})${miss.length ? `  ctx MISS: ${miss.length}` : ''}`);
      continue;
    }

    const result = await materializeOne(p, modelType, cfg, data, tracePath, `[${n}]`, skillReport, depReport);
    if (!result.ok && isSplitWorthyFailure(result.error ?? '')) {
      // Retried already if it was a timeout, so the page really does not fit in one call. Not repairable,
      // but plannable: project the l4 sections into a split plan
      // and APPEND the resulting items to this same work list — `todo.length` is re-read every iteration,
      // so they run right after, in order, without a second invocation. The page comes last (it imports
      // the organisms' render functions), which is exactly the order expandSplitPage emits.
      const plan = alreadySplit.has(p.item.outputPath) ? null : writeSplitPlanFromL4(p.item, data, result.error ?? '');
      const scanned = plan ? byDefPath.get(p.item.defPath ?? '') : undefined;
      if (plan && scanned) {
        alreadySplit.add(p.item.outputPath);
        const expanded = expandSplitPage(scanned, plan);
        for (const entry of expanded) {
          dataByOut.set(entry.item.outputPath, entry.data);
          todo.push({ item: entry.item, rank: layerRank(entry.item.type), stale: true, reason: 'split after output cap' });
        }
        console.log(`  queued ${expanded.length} item(s) from the split plan`);
        continue;
      }
      console.log(alreadySplit.has(p.item.outputPath)
        ? '  already split in this run and STILL over the cap — the organisms are too big; split the l4 sections further.'
        : splitHint(p.item, result.error ?? ''));
    }
    if (!result.ok) {
      failures.push(p.item.id);
      continue;
    }
  }

  const okCount = todo.length - failures.length;
  console.log(`\ndone: ${okCount}/${todo.length} file(s) ${args.dryRun ? 'prepared' : 'generated'}.`);
  if (tracePath) console.log(`trace: ${tracePath}`);
  if (!args.dryRun && cfg && args.check) {
    let check = runGeneratedCheckCapture(planned, dataByOut);
    for (let round = 1; round <= MATERIALIZE_REPAIR_ATTEMPTS && !check.ok; round++) {
      const errorsByFile = parseTscErrorsByFile(check.output);
      const targets = planned.filter(p => itemHasTscErrors(p.item, errorsByFile) || failures.includes(p.item.id));
      if (!targets.length) {
        console.log('\nrepair: no regenerable file matches the tsc errors; stopping.');
        break;
      }

      console.log(`\nrepair round ${round}/${MATERIALIZE_REPAIR_ATTEMPTS}: ${targets.length} file(s)`);
      for (const p of targets) {
        const repairErrors = itemTscErrors(p.item, errorsByFile);
        const repairHint = repairErrors.length
          ? buildCompileRepairHint(p.item.outputPath, repairErrors)
          : buildMissingCodeRepairHint(p.item.outputPath, 'previous attempt failed before a valid file was generated');
        const data = dataByOut.get(p.item.outputPath);
        const { skillReport, depReport } = assemble(p.item, data, modelType);
        const result = await materializeOne(p, modelType, cfg, data, tracePath, '[repair]', skillReport, depReport, repairHint);
        const failedIndex = failures.indexOf(p.item.id);
        if (result.ok && failedIndex >= 0) failures.splice(failedIndex, 1);
        if (!result.ok && failedIndex < 0) failures.push(p.item.id);
      }
      check = runGeneratedCheckCapture(planned, dataByOut);
    }

    if (check.ok) {
      console.log('\ngenerated strict tsc: OK');
    } else {
      console.log('\ngenerated strict tsc: errors remain after repair (see below)');
      console.log(check.output.trim());
      process.exitCode = 2;
    }
  } else if (args.check && !runGeneratedCheck(planned, dataByOut)) {
    process.exitCode = 2;
  }
  if (failures.length) {
    console.log(`FAILURES (${failures.length}): ${failures.join(', ')}`);
    process.exitCode = process.exitCode || 1;
  }
}

const TRACE_RAW_CAP = 40000;

function formatMaterializeError(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function failedLlmResult(error: unknown): LlmResult {
  return { ok: false, raw: '', usage: undefined, httpStatus: 0, error: formatMaterializeError(error) };
}

function canRetryMaterializeFailure(result: LlmResult, attempt: number): boolean {
  if (attempt >= MATERIALIZE_REPAIR_ATTEMPTS) return false;
  // The output cap is TERMINAL: the retry sends the same prompt and hits the same ceiling. What this needs
  // is a split plan (paginaDividida.md), which is a change to the plan, not another attempt.
  if (isMaxTokensFailure(result.error ?? '')) return false;
  // A timeout is ambiguous — network, provider queue, or a page that really is too big. It gets exactly
  // one retry (the loop budget caps it), and only then is believed. Without this it never retried at all:
  // a timeout carries httpStatus 0, which the line below treats as fatal.
  if (isTimeoutFailure(result.error ?? '')) return true;
  return result.httpStatus !== 0;
}

/** Tells the operator what to DO, since a retry cannot help (paginaDividida.md §4.1). */
function splitHint(item: PipelineItem, detail: string): string {
  if (!isSplitWorthyFailure(detail)) return '';
  const parsed = parseMlsTsPath(item.outputPath);
  if (!parsed) return '';
  const genome = parsed.folder.split('/').pop() || '';
  const moduleName = parsed.folder.split('/')[0];
  return `\n  -> ${isMaxTokensFailure(detail) ? 'output cap hit' : 'timed out twice'}; the page does not fit in one call. SPLIT it: write`
    + ` mls-${parsed.project}/l2/${moduleName}/trace/frontend-page-split/${genome}/${parsed.shortName}.json`
    + ` with { "organisms": [ { "n": 1, "organism": "<name>", "bindings": [...] }, … ] }`
    + ` — group by cohesion (a command with the list it acts on), not by count.`;
}

async function materializeOne(
  p: PlannedItem,
  modelType: string,
  cfg: LlmConfig,
  data: unknown,
  tracePath: string | null,
  label: string,
  skillReport: string[],
  depReport: string[],
  repairHint?: string,
): Promise<{ ok: boolean; error?: string }> {
  // l2_shared is a mechanical projection of defs + contract: render it deterministically (no LLM,
  // no output-token ceiling — run03: projectDetail's ~55k-token output exceeded every provider).
  // A bail (defs shape the scaffold does not model) falls through to the regular LLM path.
  if (p.item.type === 'l2_shared') {
    const det = materializeSharedDeterministic(p.item, data, tracePath, label, skillReport, depReport);
    if (det) return det;
  }

  const { system, human } = assemble(p.item, data, modelType);
  let nextRepairHint = repairHint;

  for (let attempt = 0; attempt <= MATERIALIZE_REPAIR_ATTEMPTS; attempt++) {
    const isRepair = !!nextRepairHint;
    const humanFull = nextRepairHint ? `${human}\n\n${nextRepairHint}` : human;
    process.stdout.write(`${label} ${p.item.outputPath}${isRepair ? ' (repair)' : ''} ... `);

    let r: LlmResult;
    let code = '';
    try {
      r = await callCollabLlm(cfg, { model: modelType, system, human: humanFull });
      code = r.ok && r.code ? applyHeader(p.item.outputPath, r.code) : '';
    } catch (error) {
      r = failedLlmResult(error);
    }

    appendTrace(tracePath, p.item, modelType, r, code, skillReport, depReport, isRepair);

    // bugpage21: reject a page that renders an invented module-level helper by NAME (`: nothing` plus
    // `function nothing()`), which paints the function's own source on screen. It compiles, so the final
    // `tsc` this CLI relies on cannot catch it — check BEFORE writing and retry with the findings as the
    // repair hint (same mechanism as a missing-code retry). Studio has the equivalent gate in
    // agentCfeMaterializePhase; both share collectPageTemplateHygieneIssues so they cannot drift.
    const hygiene = r.ok && code && (p.item.type === 'l2_page' || p.item.type === 'l2_page_organism') ? [...collectPageTemplateHygieneIssues(code), ...collectChartEventIssues(code)] : [];
    if (hygiene.length) {
      const detail = `template hygiene: ${hygiene.join('; ')}`;
      appendTrace(tracePath, p.item, modelType, failedLlmResult(detail), '', skillReport, depReport, isRepair);
      if (attempt >= MATERIALIZE_REPAIR_ATTEMPTS) {
        console.log(`FAIL: ${detail}`);
        return { ok: false, error: detail };
      }
      console.log(`retry: ${detail}`);
      nextRepairHint = buildMissingCodeRepairHint(p.item.outputPath, detail);
      continue;
    }

    if (r.ok && code) {
      try {
        const artifacts = writeGeneratedArtifacts(p.item, data, code);
        console.log(`ok ${code.length}b${artifacts.typecheckRef ? ' + test' : ''}${artifacts.htmlRef ? ' + html' : ''}`);
        return { ok: true };
      } catch (error) {
        const detail = `save generated artifacts failed: ${formatMaterializeError(error)}`;
        const failed = failedLlmResult(detail);
        appendTrace(tracePath, p.item, modelType, failed, '', skillReport, depReport, isRepair);
        if (!canRetryMaterializeFailure(failed, attempt)) {
          console.log(`FAIL: ${detail}`);
          return { ok: false, error: detail };
        }

        console.log(`retry: ${detail}`);
        nextRepairHint = buildMissingCodeRepairHint(p.item.outputPath, detail);
        continue;
      }
    }

    const detail = r.error ?? 'no code';
    if (!canRetryMaterializeFailure(r, attempt)) {
      console.log(`FAIL: ${detail}`);
      return { ok: false, error: detail };
    }

    console.log(`retry: ${detail}`);
    nextRepairHint = buildMissingCodeRepairHint(p.item.outputPath, detail);
  }

  return { ok: false, error: 'retry loop exhausted' };
}

/**
 * Deterministic path for l2_shared: returns the step result, or null to fall back to the LLM
 * (contract missing or scaffold bail). Failures WRITING an already-rendered scaffold do not fall
 * back — the LLM would hit the same filesystem problem.
 */
function materializeSharedDeterministic(
  item: PipelineItem,
  data: unknown,
  tracePath: string | null,
  label: string,
  skillReport: string[],
  depReport: string[],
): { ok: boolean; error?: string } | null {
  const contractTsPath = isRecord(data) && isRecord(data.contractRef) && typeof data.contractRef.tsPath === 'string'
    ? data.contractRef.tsPath
    : null;
  const contractSource = contractTsPath ? readIfExists(mlsToFs(contractTsPath)) : null;
  if (!contractSource) {
    console.log(`${label} ${item.outputPath} scaffold skipped (contract not readable: ${contractTsPath ?? 'missing contractRef.tsPath'}) -> LLM`);
    return null;
  }

  // The .ts being overwritten is passed so the scaffold carries existing translations forward: it emits
  // every declared locale, and regenerating used to reset them all to the default language (i18n.md item 4).
  const result = generateSharedScaffold(item.outputPath, data, contractSource, readIfExists(mlsToFs(item.outputPath)) ?? undefined);
  if (!result.code) {
    console.log(`${label} ${item.outputPath} scaffold bail (${result.reason}) -> LLM`);
    appendTrace(tracePath, item, 'deterministic', { ok: false, raw: '', usage: undefined, httpStatus: 0, error: `scaffold bail: ${result.reason}` }, '', skillReport, depReport, false);
    return null;
  }

  process.stdout.write(`${label} ${item.outputPath} (deterministic) ... `);
  try {
    const artifacts = writeGeneratedArtifacts(item, data, result.code);
    appendTrace(tracePath, item, 'deterministic', { ok: true, raw: '', usage: undefined, httpStatus: 0 }, result.code, skillReport, depReport, false);
    console.log(`ok ${result.code.length}b${artifacts.typecheckRef ? ' + test' : ''}`);
    return { ok: true };
  } catch (error) {
    const detail = `save generated artifacts failed: ${formatMaterializeError(error)}`;
    appendTrace(tracePath, item, 'deterministic', failedLlmResult(detail), '', skillReport, depReport, false);
    console.log(`FAIL: ${detail}`);
    return { ok: false, error: detail };
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function appendTrace(
  tracePath: string | null,
  item: PipelineItem,
  modelType: string,
  result: Awaited<ReturnType<typeof callCollabLlm>>,
  code: string,
  skillReport: string[],
  depReport: string[],
  isRepair: boolean,
): void {
  if (!tracePath) return;
  const sec = [
    `=== ${new Date().toISOString()} | ${item.id} (${item.type})${isRepair ? ' [repair]' : ''} ===`,
    `output: ${item.outputPath}`,
    `model:  ${modelType}    status: ${result.ok ? 'ok' : `error(${result.httpStatus})`}`,
    result.ok ? `bytes:  ${code.length}` : `error: ${result.error ?? 'unknown'}`,
    `skills: ${skillReport.join(' | ') || '(none)'}`,
    `deps:   ${depReport.join(' | ') || '(none)'}`,
    `usage:  ${result.usage ? JSON.stringify(result.usage) : '(none)'}`,
  ];
  if (!result.ok) sec.push('--- raw (capped) ---', result.raw.slice(0, TRACE_RAW_CAP));
  sec.push('', '');
  fs.appendFileSync(tracePath, sec.join('\n'));
}

function writeGeneratedArtifacts(item: PipelineItem, data: unknown, code: string): { typecheckRef: string | null; htmlRef: string | null } {
  const outAbs = mlsToFs(item.outputPath);
  fs.mkdirSync(path.dirname(outAbs), { recursive: true });
  fs.writeFileSync(outAbs, code);

  const typecheckCode = buildMaterializeTypecheckTest(item, data);
  const typecheckRef = typecheckCode ? testPathForOutputPath(item.outputPath) : null;
  if (typecheckCode && typecheckRef) {
    const typecheckAbs = mlsToFs(typecheckRef);
    fs.mkdirSync(path.dirname(typecheckAbs), { recursive: true });
    fs.writeFileSync(typecheckAbs, typecheckCode);
  }

  return { typecheckRef, htmlRef: writePagePreviewHtml(item) };
}

// Inside the MODULE folder, next to every other trace the pipeline writes (trace/frontend-*). It used to
// land in mls-<project>/l2/trace/, outside the module — the same defect reported for the Studio path in
// run18, fixed there and not here.
function nextTracePath(project: number, moduleName: string): string {
  const dir = path.join(ROOT, `mls-${project}`, 'l2', moduleName, 'trace', 'materialize-cli');
  fs.mkdirSync(dir, { recursive: true });
  let n = 1;
  try {
    const used = fs.readdirSync(dir)
      .map((f) => /^run(\d+)\.txt$/.exec(f))
      .filter((m): m is RegExpExecArray => m != null)
      .map((m) => Number(m[1]));
    if (used.length) n = Math.max(...used) + 1;
  } catch { /* ignore */ }
  return path.join(dir, `run${String(n).padStart(2, '0')}.txt`);
}

function runGeneratedCheck(items: PlannedItem[], dataByOut: Map<string, unknown>): boolean {
  const result = runGeneratedCheckCapture(items, dataByOut, true);
  if (result.ok) {
    console.log('generated strict tsc: OK');
    return true;
  }
  console.log('generated strict tsc: errors (see above)');
  return false;
}

function runGeneratedCheckCapture(items: PlannedItem[], dataByOut: Map<string, unknown>, inherit = false): { ok: boolean; output: string } {
  const files = generatedCheckFiles(items, dataByOut);
  if (!files.length) return { ok: true, output: '' };

  const configPath = path.join(os.tmpdir(), `materializeL2-strict-${process.pid}-${Date.now()}.json`);
  const config = {
    extends: path.join(ROOT, 'tsconfig.json'),
    compilerOptions: {
      noEmit: true,
      pretty: false,
      noImplicitAny: true,
      strictNullChecks: true,
    },
    include: [],
    files,
  };
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  const localTsc = path.join(ROOT, 'node_modules', '.bin', 'tsc');
  const bin = fs.existsSync(localTsc) ? localTsc : 'npx';
  const binArgs = bin === 'npx' ? ['tsc', '--project', configPath] : ['--project', configPath];
  console.log(`\nchecking ${files.length} generated file(s) with strict tsc...`);
  try {
    const output = execFileSync(bin, binArgs, { cwd: ROOT, encoding: 'utf8', stdio: inherit ? 'inherit' : 'pipe' });
    return { ok: true, output: typeof output === 'string' ? output : '' };
  } catch (error) {
    const err = error as { stdout?: Buffer | string; stderr?: Buffer | string };
    const output = `${err.stdout ?? ''}${err.stderr ?? ''}`;
    if (inherit && output.trim()) console.log(output.trim());
    return { ok: false, output };
  } finally {
    try { fs.rmSync(configPath, { force: true }); } catch { /* ignore */ }
  }
}

function generatedCheckFiles(items: PlannedItem[], dataByOut: Map<string, unknown>): string[] {
  const files = new Set<string>();
  for (const p of items) {
    const outAbs = mlsToFs(p.item.outputPath);
    if (fs.existsSync(outAbs)) files.add(outAbs);

    const typecheckCode = buildMaterializeTypecheckTest(p.item, dataByOut.get(p.item.outputPath));
    const typecheckAbs = typecheckCode ? mlsToFs(testPathForOutputPath(p.item.outputPath)) : null;
    if (typecheckAbs && fs.existsSync(typecheckAbs)) files.add(typecheckAbs);
  }
  return [...files].sort();
}

function itemHasTscErrors(item: PipelineItem, errorsByFile: Map<string, string[]>): boolean {
  return itemTscErrors(item, errorsByFile).length > 0;
}

function itemTscErrors(item: PipelineItem, errorsByFile: Map<string, string[]>): string[] {
  const refs = [item.outputPath];
  if (item.type === 'l2_contract' || item.type === 'l2_shared') refs.push(testPathForOutputPath(item.outputPath));
  return refs.flatMap(ref => errorsByFile.get(normalizeFsPath(mlsToFs(ref))) ?? []);
}

function parseTscErrorsByFile(output: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    const file = parseTscErrorFile(line);
    if (!file) continue;
    const key = normalizeFsPath(path.isAbsolute(file) ? file : path.join(ROOT, file));
    const existing = map.get(key);
    if (existing) existing.push(line); else map.set(key, [line]);
  }
  return map;
}

function parseTscErrorFile(line: string): string | null {
  const compact = /^(.+?\.ts)\(\d+,\d+\):\s*error\s+TS\d+/.exec(line);
  if (compact) return compact[1];
  const pretty = /^(.+?\.ts):\d+:\d+\s+-\s+error\s+TS\d+/.exec(line);
  return pretty ? pretty[1] : null;
}

function normalizeFsPath(value: string): string {
  return path.resolve(value).replace(/\\/g, '/');
}

function parseModelTypeFromConfig(cfg: LlmConfig | null): string | null {
  const v = cfg?.modelTypeOverride;
  return v && v.trim() ? v.trim() : null;
}

main().catch((e) => { console.error(e instanceof Error ? e.stack || e.message : String(e)); process.exit(1); });
