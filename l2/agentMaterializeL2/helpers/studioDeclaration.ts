/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/studioDeclaration.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/studioDeclaration.ts, 05/10/2026; that original was removed with agentMaterializeL2v2 on 08/10/2026).

// Compile one stor .ts through the Studio compiler and return its diagnostics and its declaration
// (`compilerResults.prodDTS`, the .d.ts the Studio emits in the browser). Generic: no agent policy.
// An unavailable compiler, a missing model or an unloaded import is a diagnostic, never a clean compile.

import {
  compileStudioFile, enterStudioCompile, getStudioModel, leaveStudioCompile, preloadStudioImports,
  releaseBorrowedModelScope, studioCompileAvailable, type StudioFileInfo,
} from '/_102035_/l2/solution/studioCompile.js';

export interface StudioDeclarationResult {
  /** Empty only when the Studio compiled the exact source with no error. */
  errors: string[];
  /** The emitted .d.ts; null when compilation failed or emitted nothing. */
  declaration: string | null;
}

export async function compileWithDeclaration(info: StudioFileInfo, expectedSource: string, requireDeclaration = true): Promise<StudioDeclarationResult> {
  if (typeof mls === 'undefined' || !studioCompileAvailable()) return { errors: ['Studio TypeScript compiler is unavailable'], declaration: null };
  enterStudioCompile();
  try {
    const model = await getStudioModel(info.project, info.level, info.folder, info.shortName, info.extension);
    if (!model?.model || model.model.getValue() !== expectedSource) return { errors: ['Studio model is unavailable or differs from the written source'], declaration: null };
    const missing = await preloadStudioImports(info);
    if (missing.length) return { errors: [`Studio imports unavailable: ${missing.join(', ')}`], declaration: null };
    const compiled = await compileStudioFile(info);
    if (!compiled) return { errors: ['Studio compiler returned no result'], declaration: null };
    const after = await getStudioModel(info.project, info.level, info.folder, info.shortName, info.extension);
    if (compiled.errors.length) {
      const raw: unknown[] = Array.isArray(after?.compilerResults?.errors) ? after.compilerResults.errors : [];
      const located = raw.length === compiled.errors.length ? raw.map((item, index) => locateDiagnostic(item, compiled.errors[index], expectedSource)) : compiled.errors;
      return { errors: compactDiagnostics(located), declaration: null };
    }
    const declaration = after?.compilerResults?.prodDTS;
    if (typeof declaration !== 'string' || !declaration.trim()) return requireDeclaration ? { errors: ['Studio compiler emitted no declaration'], declaration: null } : { errors: [], declaration: null };
    return { errors: [], declaration };
  } catch (error) {
    return { errors: [`Studio compile failed: ${error instanceof Error ? error.message : String(error)}`], declaration: null };
  } finally {
    leaveStudioCompile();
    releaseBorrowedModelScope();
  }
}

/**
 * The Studio-emitted declaration of each `/_<project>_/l<level>/….js` module, compiled on demand (the idea
 * of agentFix getDefinitonsByImports, 100554): the LLM sees the real types it codes against instead of a
 * prose description. `.defs.js` imports and modules without a model are skipped (their source is sent
 * elsewhere, or there is nothing to declare). Never throws: a missing declaration is just left out.
 */
export async function declarationsOf(refs: string[]): Promise<Array<{ ref: string; declaration: string }>> {
  const out: Array<{ ref: string; declaration: string }> = [];
  if (typeof mls === 'undefined' || !studioCompileAvailable()) return out;
  enterStudioCompile();
  try {
    for (const ref of [...new Set(refs)]) {
      const match = /^\/_(\d+)_\/l(\d)\/(.+)\.js$/u.exec(ref);
      if (!match || match[3].endsWith('.defs')) continue;
      const rest = match[3];
      const at = rest.lastIndexOf('/');
      try {
        const model = await getStudioModel(Number(match[1]), Number(match[2]), at < 0 ? '' : rest.slice(0, at), at < 0 ? rest : rest.slice(at + 1), '.ts');
        if (!model?.model) continue;
        if (!model.compilerResults?.prodDTS) {
          if (model.compilerResults) model.compilerResults.modelNeedCompile = true;
          await mls.l2.typescript.compile(model);
        }
        const declaration = model.compilerResults?.prodDTS;
        if (typeof declaration === 'string' && declaration.trim()) out.push({ ref, declaration });
      } catch { /* left out */ }
    }
    return out;
  } finally {
    leaveStudioCompile();
    releaseBorrowedModelScope();
  }
}

/** The `/_<project>_/…js` import specifiers of a source. */
export function mlsImportsOf(source: string): string[] {
  return [...new Set([...source.matchAll(/\bfrom\s+['"](\/_\d+_\/l\d\/[^'"]+\.js)['"]/gu)].map(match => match[1]))];
}

/**
 * One entry per position and code: the Studio repeats a diagnostic once per member it touches (01/10/2026:
 * `this[member] = value` gave 68 × TS2540 on one line, one per read-only HTMLElement property). Keeps the
 * first message with a count, then caps the list, so a repair prompt stays readable.
 */
export function compactDiagnostics(errors: string[], max = 30): string[] {
  const groups = new Map<string, { first: string; count: number }>();
  for (const error of errors) {
    const key = /^(line \d+:\d+ - TS\d+)/u.exec(error)?.[1] ?? error;
    const group = groups.get(key);
    if (group) group.count += 1;
    else groups.set(key, { first: error, count: 1 });
  }
  const lines = [...groups.values()].map(group => group.count > 1
    ? group.first.replace(/^(line \d+:\d+ - TS\d+ - [^\n]*)/u, `$1 (and ${group.count - 1} more of the same error at this position)`)
    : group.first);
  return lines.length > max ? [...lines.slice(0, max), `… and ${lines.length - max} more distinct errors`] : lines;
}

/**
 * The Studio diagnostic text often has no position (its `file` is not a TS SourceFile). When the raw
 * diagnostic carries `start`, add `line N:col` and the source line, so a repair prompt can locate it.
 */
export function locateDiagnostic(raw: unknown, formatted: string, source: string): string {
  const start = raw && typeof raw === 'object' ? (raw as { start?: unknown }).start : undefined;
  if (typeof start !== 'number' || start < 0 || start > source.length || /:\d+:\d+ - /u.test(formatted)) return formatted;
  const before = source.slice(0, start);
  const line = before.split('\n').length;
  const column = start - before.lastIndexOf('\n');
  const text = source.split('\n')[line - 1]?.trim() ?? '';
  const message = formatted.replace(/^file:\/\/\S+ - /u, '');
  return `line ${line}:${column} - ${message}\n    > ${text}`;
}
