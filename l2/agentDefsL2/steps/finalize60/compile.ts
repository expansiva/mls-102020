/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/compile.ts" enhancement="_blank"/>

import {
  studioCompileAvailable, getStudioModel, preloadStudioImports, compileStudioFile,
  enterStudioCompile, leaveStudioCompile, releaseBorrowedModelScope,
  type StudioFileInfo,
} from '/_102035_/l2/solution/studioCompile.js';
import { readSourceText } from '/_102035_/l2/solution/fs.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2CompileProof } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';
import { d2InfoForPath } from '/_102020_/l2/agentDefsL2/steps/finalize60/io.js';

// 2026-09-30: frozen contracts30 still imports this compiler until L1 drops the legacy generator.
export interface D2FinalSource { pageId: string; kind: 'contract' | 'shared' | 'desktopPage' | 'mobilePage'; path: string; source: string }
const ORDER: Record<D2FinalSource['kind'], number> = { contract: 0, shared: 1, desktopPage: 2, mobilePage: 2 };

export interface D2CompilerModel {
  model: { getValue(): string };
  compilerResults?: { errors: unknown[] };
}
export interface D2StudioCompiler {
  available(): boolean;
  readStor(info: StudioFileInfo): Promise<string | null>;
  getModel(info: StudioFileInfo): Promise<D2CompilerModel | null>;
  preload(info: StudioFileInfo): Promise<string[]>;
  compile(info: StudioFileInfo): Promise<{ errors: string[] } | null>;
  enter?(): void;
  leave?(): void;
  release(): void;
}

const STUDIO: D2StudioCompiler = {
  available: studioCompileAvailable,
  readStor: async info => { try { return await readSourceText(info); } catch { return null; } },
  getModel: info => getStudioModel(info.project, info.level, info.folder, info.shortName, info.extension),
  preload: preloadStudioImports,
  compile: compileStudioFile,
  enter: enterStudioCompile,
  leave: leaveStudioCompile,
  release: () => { releaseBorrowedModelScope(); },
};

export async function assertD2CompiledSources(identity: D2RunIdentity, sources: D2FinalSource[]): Promise<void> {
  const hashes = new Map<string, string>();
  for (const file of sources) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(file.source));
    hashes.set(file.path, `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`);
  }
  const results = await compileD2FinalSources(identity, sources, hashes);
  const failed = results.filter(item => item.status !== 'passed' || item.sha256 !== hashes.get(item.path));
  if (results.length !== sources.length || failed.length) throw new Error(`D2_TYPESCRIPT_COMPILE_FAILED: ${failed.map(item => `${item.path}: ${item.diagnostics.join('; ')}`).join(' | ') || 'missing compilation result'}`);
}

export async function compileD2FinalSources(identity: D2RunIdentity, sources: D2FinalSource[], hashes: Map<string, string>, suppliedStudio?: D2StudioCompiler): Promise<D2CompileProof[]> {
  const ordered = [...sources].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.path.localeCompare(b.path));
  const proof = (file: D2FinalSource, diagnostics: string[]): D2CompileProof => ({ path: file.path, sha256: hashes.get(file.path) || '', status: diagnostics.length ? 'failed' : 'passed', diagnostics });
  const studio = suppliedStudio ?? STUDIO;
  const results: D2CompileProof[] = [];
  let entered = false;
  try {
    if (!suppliedStudio && typeof mls === 'undefined') return ordered.map(file => proof(file, ['Studio TypeScript compiler is unavailable']));
    if (!studio.available()) return ordered.map(file => proof(file, ['Studio TypeScript compiler is unavailable']));
    studio.enter?.(); entered = true;
    for (const file of ordered) {
      try {
        const info = d2InfoForPath(identity, file.path);
        if (await studio.readStor(info) !== file.source) throw new Error('Studio storage differs from approved source bytes');
        const model = await studio.getModel(info);
        if (!model?.model || model.model.getValue() !== file.source) throw new Error('Studio model is unavailable or differs from approved source bytes');
        const missing = await studio.preload(info);
        if (!Array.isArray(missing)) throw new Error('Studio import preload returned no result');
        if (missing.length) throw new Error(`Studio imports unavailable: ${missing.join(', ')}`);
        if (model.model.getValue() !== file.source) throw new Error('Studio model differs from approved source bytes after import preload');
        const compiled = await studio.compile(info);
        if (!compiled || !Array.isArray(compiled.errors)) throw new Error('Studio compiler returned no diagnostics result');
        const after = await studio.getModel(info);
        if (!after?.model || after.model.getValue() !== file.source) throw new Error('Studio model differs from approved source bytes after compilation');
        if (!Array.isArray(after.compilerResults?.errors)) throw new Error('Studio compiler produced no model result');
        results.push(proof(file, compiled.errors));
      } catch (error) {
        results.push(proof(file, [error instanceof Error ? error.message : String(error)]));
      }
    }
    return results;
  } catch (error) {
    const diagnostic = error instanceof Error ? error.message : String(error);
    return ordered.map(file => proof(file, [`Studio TypeScript compiler is unavailable: ${diagnostic}`]));
  } finally {
    if (entered) studio.leave?.();
    studio.release();
  }
}
