/// <mls fileReference="_102020_/l2/agentChangeFrontend/nodejsMaterializeL2.ts" enhancement="_blank"/>

// Node runner for agentChangeFrontend materialization (.defs.ts -> .ts). The pure behavior lives in
// cfeMaterializeCore.ts; this file only adapts filesystem, collab-llm HTTP and CLI concerns.

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import {
  applyHeader,
  buildHumanPrompt,
  buildSystemPrompt,
  DEFAULT_MODEL_TYPE,
  isStale,
  layerRank,
  orderItems,
  parseDefs,
  type PipelineItem,
  type PlannedItem,
} from './cfeMaterializeCore.js';
import { callCollabLlm, parseGenResult, type LlmConfig } from './cfeMaterializeLlmClient.js';

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

function mtimeMs(abs: string): number | null {
  try { return fs.statSync(abs).mtimeMs; } catch { return null; }
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
    const ms = mtimeMs(mlsToFs(dep));
    if (ms != null && (newest == null || ms > newest)) newest = ms;
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
    const depMs = newestDependencyMs(item);
    const scheduledDep = (item.dependsFiles ?? []).some((dep) => scheduledOutputs.has(dep));
    const stale = force || scheduledDep || isStale(defsMs, tsMs, depMs);
    const reason = force
      ? 'forced'
      : tsMs == null
        ? 'output missing'
        : scheduledDep
          ? 'dependency scheduled'
          : defsMs != null && defsMs > tsMs
            ? 'defs newer than ts'
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
    const r = readContext(d);
    depReport.push(`${r.found ? 'OK ' : 'MISS'} ${d}`);
    if (r.found) contextSections.push(`### ${r.ref}\n\`\`\`ts\n${r.content}\n\`\`\``);
  }

  return {
    system: buildSystemPrompt(skillSections, item.outputPath, modelType),
    human: buildHumanPrompt(data, contextSections, item.outputPath),
    skillReport,
    depReport,
  };
}

function loadConfig(explicitPath: string | undefined): LlmConfig {
  const p = explicitPath || process.env.MATERIALIZE_L2_CONFIG || path.join(HERE, 'materializeL2.config.json');
  const raw = readIfExists(p);
  if (raw == null) throw new Error(`config not found: ${p} (copy materializeL2.config.sample.json and fill baseUrl + token)`);
  let cfg: LlmConfig;
  try { cfg = JSON.parse(raw); } catch { throw new Error(`config is not valid JSON: ${p}`); }
  if (!cfg.baseUrl || !cfg.token) throw new Error(`config must set baseUrl and token: ${p}`);
  return cfg;
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
    if (args.check) runCheck();
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
      console.log(`[${n}] ${base}  -> prompt (${p.reason})${miss.length ? `  ctx MISS: ${miss.length}` : ''}`);
      continue;
    }

    process.stdout.write(`[${n}] ${base} ... `);
    const r = await callCollabLlm(cfg, { model: modelType, system, human });
    const code = r.ok && r.code ? applyHeader(p.item.outputPath, r.code) : '';

    if (tracePath) {
      const sec = [
        `=== ${new Date().toISOString()} | ${p.item.id} (${p.item.type}) ===`,
        `output: ${p.item.outputPath}`,
        `model:  ${modelType}    status: ${r.ok ? 'ok' : `error(${r.httpStatus})`}`,
        r.ok ? `bytes:  ${code.length}` : `error: ${r.error ?? 'unknown'}`,
        `skills: ${skillReport.join(' | ') || '(none)'}`,
        `deps:   ${depReport.join(' | ') || '(none)'}`,
        `usage:  ${r.usage ? JSON.stringify(r.usage) : '(none)'}`,
      ];
      if (!r.ok) sec.push('--- raw (capped) ---', r.raw.slice(0, TRACE_RAW_CAP));
      sec.push('', '');
      fs.appendFileSync(tracePath, sec.join('\n'));
    }

    if (!r.ok || !code) {
      console.log(`FAIL: ${r.error ?? 'no code'}`);
      failures.push(p.item.id);
      continue;
    }

    const outAbs = mlsToFs(p.item.outputPath);
    fs.mkdirSync(path.dirname(outAbs), { recursive: true });
    fs.writeFileSync(outAbs, code);
    const htmlRef = writePagePreviewHtml(p.item);
    console.log(`ok ${code.length}b${htmlRef ? ' + html' : ''}${miss.length ? `  (ctx MISS: ${miss.length})` : ''}`);
  }

  const okCount = todo.length - failures.length;
  console.log(`\ndone: ${okCount}/${todo.length} file(s) ${args.dryRun ? 'prepared' : 'generated'}.`);
  if (tracePath) console.log(`trace: ${tracePath}`);
  if (failures.length) { console.log(`FAILURES (${failures.length}): ${failures.join(', ')}`); process.exitCode = 1; }
  if (args.check && !runCheck()) process.exitCode = 2;
}

const TRACE_RAW_CAP = 40000;

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

function runCheck(): boolean {
  const localTsc = path.join(ROOT, 'node_modules', '.bin', 'tsc');
  const bin = fs.existsSync(localTsc) ? localTsc : 'npx';
  const binArgs = bin === 'npx' ? ['tsc', '--noEmit', '--pretty', 'false'] : ['--noEmit', '--pretty', 'false'];
  console.log('\nchecking mls-base with tsc...');
  try {
    execFileSync(bin, binArgs, { cwd: ROOT, stdio: 'inherit' });
    console.log('tsc: OK');
    return true;
  } catch {
    console.log('tsc: errors (see above)');
    return false;
  }
}

function parseModelTypeFromConfig(cfg: LlmConfig | null): string | null {
  const v = cfg?.modelTypeOverride;
  return v && v.trim() ? v.trim() : null;
}

main().catch((e) => { console.error(e instanceof Error ? e.stack || e.message : String(e)); process.exit(1); });
