/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeProjectTsc.ts" enhancement="_blank"/>

// Pure grouping of `tsc -p tsconfig.frontend.json --noEmit` diagnostics so the CF module gate can
// use the project compiler when Monaco is absent. No fs, no spawn — the I/O lives in
// cfeMaterializeStudio. Browser path never calls this: Monaco stays the in-studio compile.
//
// The CB regex is l1-only. Here the parser accepts every `mls-<id>/l<n>/` path so an out-of-module
// diagnostic (l5/runtimeConfig.ts) still counts in rawDiagnostics; the in-module filter keeps only
// `mls-<project>/l2/<moduleName>/`.

export interface TscDiagnostic {
  project: number;
  level: number;
  folder: string;
  shortName: string;
  code: string;
  message: string;
}

const TSC_ERROR = /(?:^|\s)(?:.*[/\\])?mls-(\d+)[/\\]l(\d+)[/\\](.+?)\.ts\((\d+),(\d+)\):\s*error\s+(TS\d+):\s*(.*)$/u;

export function parseTscDiagnostics(output: string): TscDiagnostic[] {
  const out: TscDiagnostic[] = [];
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.replace(/\u001b\[[0-9;]*m/g, '');
    const match = TSC_ERROR.exec(line);
    if (!match) continue;
    const rest = match[3];
    const slash = rest.lastIndexOf('/');
    out.push({
      project: Number(match[1]),
      level: Number(match[2]),
      folder: slash < 0 ? '' : rest.slice(0, slash),
      shortName: slash < 0 ? rest : rest.slice(slash + 1),
      code: match[6],
      message: match[7].trim(),
    });
  }
  return out;
}

export function mlsBaseFromDiskPath(abs: string): string | null {
  const normalized = abs.replace(/\\/g, '/');
  const match = /^(.*)\/mls-\d+(?:\/|$)/.exec(normalized);
  return match ? match[1] : null;
}

/** Group tsc errors onto `${folder}::${shortName}` for files under `mls-<project>/l2/<moduleName>/`. */
export function groupTscErrorsByFile(
  diagnostics: readonly TscDiagnostic[],
  moduleName: string,
  project: number,
): Map<string, string[]> {
  const prefix = moduleName ? `${moduleName}/` : '';
  const errors = new Map<string, string[]>();
  for (const item of diagnostics) {
    if (item.project !== project) continue;
    if (item.level !== 2) continue;
    const inModule = prefix !== '' && (item.folder === moduleName || item.folder.startsWith(prefix));
    if (!inModule) continue;
    const key = `${item.folder}::${item.shortName}`;
    const list = errors.get(key) ?? [];
    if (list.length < 12) list.push(`${item.code}: ${item.message}`);
    errors.set(key, list);
  }
  return errors;
}

export type CompileGatePath = 'monaco' | 'project-tsc' | 'unavailable';

export interface CompileModuleTrace {
  path: CompileGatePath;
  reason?: string;
  rawDiagnostics: number;
  afterFilter: number;
  files: number;
}

export function countGroupedDiagnostics(grouped: Map<string, string[]>): number {
  let n = 0;
  for (const list of grouped.values()) n += list.length;
  return n;
}

export function formatCompileModuleTrace(trace: CompileModuleTrace): string {
  const reason = trace.reason ? ` reason=${trace.reason}` : '';
  return `[cf-compile] path=${trace.path}${reason} files=${trace.files} raw=${trace.rawDiagnostics} afterFilter=${trace.afterFilter}`;
}

/** `ran` only when project tsc actually ran; omitted on the Monaco path (same optional field as the CB). */
export function tscGateOf(path: CompileGatePath): 'ran' | 'unavailable' | undefined {
  if (path === 'project-tsc') return 'ran';
  if (path === 'unavailable') return 'unavailable';
  return undefined;
}

/** Instrument the project-tsc path: spawn-null vs parsed vs leftover after the in-module filter. */
export function traceProjectTscResult(
  output: string | null,
  moduleName: string,
  project: number,
  files: number,
  reasonIfNull: string,
): { grouped: Map<string, string[]> | null; trace: CompileModuleTrace } {
  if (output === null) {
    return {
      grouped: null,
      trace: { path: 'unavailable', reason: reasonIfNull, rawDiagnostics: 0, afterFilter: 0, files },
    };
  }
  const parsed = parseTscDiagnostics(output);
  const grouped = groupTscErrorsByFile(parsed, moduleName, project);
  return {
    grouped,
    trace: {
      path: 'project-tsc',
      rawDiagnostics: parsed.length,
      afterFilter: countGroupedDiagnostics(grouped),
      files,
    },
  };
}

export function flattenTscErrorsAsRefs(project: number, grouped: Map<string, string[]>): string[] {
  const errors: string[] = [];
  for (const [key, list] of grouped) {
    const sep = key.indexOf('::');
    if (sep <= 0) continue;
    const folder = key.slice(0, sep);
    const shortName = key.slice(sep + 2);
    const ref = `_${project}_/l2/${folder}/${shortName}.ts`;
    for (const error of list) errors.push(`${ref}: ${error}`);
  }
  return errors;
}

export function mergeCompileTargets(
  inScope: Array<{ folder: string; shortName: string; real: string }>,
  compiled: Map<string, string[]>,
): Array<{ folder: string; shortName: string; real: string }> {
  const seen = new Set(inScope.map(item => `${item.folder}::${item.real}`));
  const extra: Array<{ folder: string; shortName: string; real: string }> = [];
  for (const key of compiled.keys()) {
    if (seen.has(key)) continue;
    const sep = key.indexOf('::');
    if (sep <= 0) continue;
    const folder = key.slice(0, sep);
    const real = key.slice(sep + 2);
    if (!real) continue;
    extra.push({ folder, shortName: real.toLowerCase(), real });
  }
  return extra.length ? [...inScope, ...extra] : inScope;
}
