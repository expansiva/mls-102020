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
  buildHumanPrompt,
  buildMaterializeTypecheckTest,
  buildMissingCodeRepairHint,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  expandContextRef,
  isStale,
  layerRank,
  MATERIALIZE_REPAIR_ATTEMPTS,
  orderItems,
  parseDefs,
  testPathForOutputPath,
  type PipelineItem,
  type PlannedItem,
} from './helpers/cfeMaterializeCore.js';
import { callCollabLlm, parseGenResult, type LlmConfig, type LlmResult } from './helpers/nodejsMaterializeLlmClient.js';

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
    out.push({ defRef, defAbs, item: parsed.item, data: parsed.data });
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
      const r = readContext(ref);
      depReport.push(`${r.found ? 'OK ' : 'MISS'} ${ref === d ? d : `${d} -> ${ref}`}`);
      if (r.found) contextSections.push(`### ${r.ref}\n\`\`\`ts\n${r.content}\n\`\`\``);
    }
  }

  return {
    system: buildSystemPrompt(skillSections, item.outputPath, modelType),
    human: buildHumanPrompt(data, contextSections, item.outputPath),
    skillReport,
    depReport,
  };
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
  const a: Args = { dryRun: false, force: false, check: false, selfTest: false };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--') continue;
    else if (t === '--dry-run') a.dryRun = true;
    else if (t === '--force') a.force = true;
    else if (t === '--self-test') a.selfTest = true;
    else if (t === '--check') a.check = true;
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
    console.error('usage: nodejsMaterializeL2 <project> <module> [--dry-run] [--force] [--only <substr>] [--config <path>] [--out <dir>] [--check]');
    process.exit(1);
  }

  const scanned = scanModule(args.project, args.moduleName);
  if (!scanned.length) { console.error(`no L2 .defs.ts pipeline found for ${args.project}/${args.moduleName}`); process.exit(1); }

  let planned = plan(scanned, args.force);
  if (args.only) planned = planned.filter((p) => p.item.id.includes(args.only!) || p.item.type.includes(args.only!) || p.item.outputPath.includes(args.only!));
  const dataByOut = new Map(scanned.map((s) => [s.item.outputPath, s.data]));

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
  const tracePath = !args.dryRun && cfg ? nextTracePath(args.project) : null;

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
  return result.httpStatus !== 0;
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

function nextTracePath(project: number): string {
  const dir = path.join(ROOT, `mls-${project}`, 'l2', 'trace');
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
