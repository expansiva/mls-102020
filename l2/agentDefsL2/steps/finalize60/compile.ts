/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/compile.ts" enhancement="_blank"/>

import { formatCompileDiagnostics, type NmDiagnosticLike } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmDiagnostics.js';
import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2CompileProof } from '/_102020_/l2/agentDefsL2/steps/finalize60/contracts.js';
import type { D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';
import { d2InfoForPath } from '/_102020_/l2/agentDefsL2/steps/finalize60/io.js';

const ORDER: Record<D2FinalSource['kind'], number> = { contract: 0, shared: 1, desktopPage: 2, mobilePage: 2 };

export interface D2CompilerModel {
  model: { getValue(): string };
  compilerResults?: { modelNeedCompile: boolean; errors: NmDiagnosticLike[] };
}
export interface D2StudioCompiler {
  loadContext(project: number): Promise<void>;
  createModel(path: string): Promise<D2CompilerModel | undefined>;
  compile(model: D2CompilerModel): Promise<boolean>;
}

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
  if (!suppliedStudio && (typeof mls === 'undefined' || typeof mls.l2?.typescript?.compileAndPostProcess !== 'function')) {
    return ordered.map(file => proof(file, ['Studio TypeScript compiler is unavailable']));
  }
  let studio: D2StudioCompiler;
  try {
    studio = suppliedStudio ?? await studioCompiler(identity);
    await studio.loadContext(identity.project);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return ordered.map(file => proof(file, [`Studio TypeScript project context could not be loaded: ${message}`]));
  }

  const models = new Map<string, D2CompilerModel>();
  const setupErrors = new Map<string, string>();
  for (const file of ordered) {
    try {
      const model = await studio.createModel(file.path);
      if (!model?.model || model.model.getValue() !== file.source) throw new Error('Studio model is unavailable or differs from approved source bytes');
      models.set(file.path, model);
    } catch (error) {
      setupErrors.set(file.path, error instanceof Error ? error.message : String(error));
    }
  }

  const results: D2CompileProof[] = [];
  for (const file of ordered) {
    const setupError = setupErrors.get(file.path);
    if (setupError) { results.push(proof(file, [setupError])); continue; }
    const model = models.get(file.path)!;
    try {
      if (model.compilerResults) model.compilerResults.modelNeedCompile = true;
      const ok = await studio.compile(model);
      const raw = model.compilerResults?.errors;
      const diagnostics = Array.isArray(raw) ? formatCompileDiagnostics(raw as NmDiagnosticLike[], file.source) : ['Studio compiler returned no diagnostics result'];
      if (ok !== true && !diagnostics.length) diagnostics.push('Studio compiler did not confirm successful compilation');
      results.push(proof(file, diagnostics));
    } catch (error) {
      results.push(proof(file, [error instanceof Error ? error.message : String(error)]));
    }
  }
  return results;
}

async function studioCompiler(identity: D2RunIdentity): Promise<D2StudioCompiler> {
  const studio = await import('/_102027_/l2/libModel.js');
  return {
    loadContext: project => studio.readProjectTypescriptAndCompile(project, '', false),
    createModel: async path => {
      const info = d2InfoForPath(identity, path);
      const storFile = mls.stor.files[mls.stor.getKeyToFile(info)];
      if (!storFile) throw new Error('Studio storage file is unavailable');
      return studio.createModel(storFile, false, false) as Promise<D2CompilerModel | undefined>;
    },
    compile: model => mls.l2.typescript.compileAndPostProcess(model as mls.editor.IModelTS, false, true),
  };
}
