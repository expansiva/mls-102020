/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.ts" enhancement="_blank"/>

// copied from mls-102020/l2/agentDefsL2/steps/finalize60/compile.ts (compileD2FinalSources) @ 301a76dc; types renamed, logic unchanged
import {
  studioCompileAvailable, getStudioModel, preloadStudioImports, compileStudioFile,
  enterStudioCompile, leaveStudioCompile, releaseBorrowedModelScope,
  type StudioFileInfo,
} from '/_102035_/l2/solution/studioCompile.js';
import { readSourceText } from '/_102035_/l2/solution/fs.js';

export interface M3FinalSource { pageId: string; kind: 'contract' | 'shared' | 'desktopPage' | 'mobilePage'; path: string; source: string }
export interface M3CompileProof { path: string; sha256: string; status: 'passed' | 'failed'; diagnostics: string[] }
const ORDER: Record<M3FinalSource['kind'], number> = { contract: 0, shared: 1, desktopPage: 2, mobilePage: 2 };

export interface M3CompilerModel {
  model: { getValue(): string };
  compilerResults?: { errors: unknown[] };
}
export interface M3StudioCompiler {
  available(): boolean;
  readStor(info: StudioFileInfo): Promise<string | null>;
  getModel(info: StudioFileInfo): Promise<M3CompilerModel | null>;
  preload(info: StudioFileInfo): Promise<string[]>;
  compile(info: StudioFileInfo): Promise<{ errors: string[] } | null>;
  enter?(): void;
  leave?(): void;
  release(): void;
}

/**
 * D-012: a NEW file (versionRef "0") whose borrowed model was released has getValueInfo() = { content: null },
 * so readSourceText throws "local content unavailable"; getContent() still holds the bytes the Studio saves
 * and the model is built from (libModel.createModel). Measured in Studio on 01/10/2026.
 */
export async function m3ReadStor(info: StudioFileInfo): Promise<string | null> {
  try { return await readSourceText(info); } catch { /* fall back below */ }
  try {
    const file = (mls.stor.files as Record<string, any>)[mls.stor.getKeyToFile(info)];
    if (!file || file.status === 'deleted') return null;
    const content = await file.getContent();
    return typeof content === 'string' ? content : null;
  } catch {
    return null;
  }
}

const STUDIO: M3StudioCompiler = {
  available: studioCompileAvailable,
  readStor: m3ReadStor,
  getModel: info => getStudioModel(info.project, info.level, info.folder, info.shortName, info.extension),
  preload: preloadStudioImports,
  compile: compileStudioFile,
  enter: enterStudioCompile,
  leave: leaveStudioCompile,
  release: () => { releaseBorrowedModelScope(); },
};

/** `l2/<module>/<folder>/<shortName><ext>` -> the stor file info. shortName never has a dot; `.defs.ts` and `.test.ts` are extensions. */
export function m3InfoForPath(project: number, path: string): StudioFileInfo {
  const match = /^l2\/([^/]+)\/(.+)\/([^/.]+)(\.defs\.ts|\.test\.ts|\.[A-Za-z0-9]+)$/u.exec(path);
  if (!match) throw new Error(`M3_PATH_UNSUPPORTED: ${path}`);
  return { project, level: 2, folder: `${match[1]}/${match[2]}`, shortName: match[3], extension: match[4] };
}

export async function compileM3FinalSources(project: number, sources: M3FinalSource[], hashes: Map<string, string>, suppliedStudio?: M3StudioCompiler): Promise<M3CompileProof[]> {
  const ordered = [...sources].sort((a, b) => ORDER[a.kind] - ORDER[b.kind] || a.path.localeCompare(b.path));
  const proof = (file: M3FinalSource, diagnostics: string[]): M3CompileProof => ({ path: file.path, sha256: hashes.get(file.path) || '', status: diagnostics.length ? 'failed' : 'passed', diagnostics });
  const studio = suppliedStudio ?? STUDIO;
  const results: M3CompileProof[] = [];
  let entered = false;
  try {
    if (!suppliedStudio && typeof mls === 'undefined') return ordered.map(file => proof(file, ['Studio TypeScript compiler is unavailable']));
    if (!studio.available()) return ordered.map(file => proof(file, ['Studio TypeScript compiler is unavailable']));
    studio.enter?.(); entered = true;
    for (const file of ordered) {
      try {
        const info = m3InfoForPath(project, file.path);
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
