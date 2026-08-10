import assert from 'node:assert/strict';
import { dirname, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

import { buildNs4ModuleArtifact } from '/_102020_/l2/agentNewSolution4/helpers/ns4Core.js';
import { renderNs4TypedDefsSource } from '/_102020_/l2/agentNewSolution4/helpers/ns4TypedDefs.js';
import { NS4_PERMANENT_ARTIFACT_TYPE_NAMES } from '/_102020_/l2/agentNewSolution4/types.js';

const clarification = {
  planId: 'e1-clarification', userLanguage: 'en', title: 'Initial clarification', legends: [],
  questions: {
    moduleName: { type: 'open', question: 'Module?', answer: 'petShop' },
    productLanguages: { type: 'open', question: 'Languages?', answer: 'en, pt-BR' },
    mainActors: { type: 'open', question: 'Actors?', answer: 'Customer and attendant' },
    mainGoal: { type: 'open', question: 'Goal?', answer: 'Manage pet shop appointments.' },
    boundaries: { type: 'open', question: 'Boundaries?', answer: 'No veterinary records.' },
  },
};

test('permanent artifact registry covers every implemented E1-E7 defs contract', () => {
  assert.deepEqual(NS4_PERMANENT_ARTIFACT_TYPE_NAMES, [
    'Ns4ModuleArtifact',
    'Ns4JourneyArtifact',
    'Ns4JourneyIndex',
    'Ns4AccessMatrixArtifact',
    'Ns4OntologyEntityArtifact',
    'Ns4OntologyIndexArtifact',
    'Ns4RulesArtifact',
    'Ns4CompositionArtifact',
    'Ns4UseCaseArtifact',
    'Ns4UseCaseIndexArtifact',
    'Ns4WorkflowArtifact',
    'Ns4WorkflowIndexArtifact',
  ]);
});

test('permanent defs emitter imports the canonical type and uses as const satisfies', () => {
  const artifact = buildNs4ModuleArtifact(
    'Create a pet shop app', clarification, 'human', '2026-08-08T22:00:00.000Z',
  );
  const source = renderNs4TypedDefsSource(
    { project: 102046, level: 4, folder: 'petShop', shortName: 'module', extension: '.defs.ts' },
    'petShopModule', artifact, 'Ns4ModuleArtifact',
  );
  assert.match(source, /import type \{ Ns4ModuleArtifact \} from '\/_102020_\/l2\/agentNewSolution4\/types\.js';/);
  assert.match(source, /export const petShopModule = \{[\s\S]*\} as const satisfies Ns4ModuleArtifact;/);
  assert.match(source, /export type PetShopModuleType = typeof petShopModule;/);
  assert.match(source, /export default petShopModule;/);
  assert.doesNotMatch(source, /\} as const;\s*\n/);
});

test('tsc accepts a valid emitted artifact and rejects an invalid schema enum', () => {
  const artifact = buildNs4ModuleArtifact(
    'Create a pet shop app', clarification, 'human', '2026-08-08T22:00:00.000Z',
  );
  const source = renderNs4TypedDefsSource(
    { project: 102046, level: 4, folder: 'petShop', shortName: 'module', extension: '.defs.ts' },
    'petShopModule', artifact, 'Ns4ModuleArtifact',
  );
  assert.deepEqual(artifactDiagnostics(source), []);

  const invalid = source.replace(/("schemaVersion":\s*)"[^"]+"/, '$1"invalid-module-schema"');
  const diagnostics = artifactDiagnostics(invalid);
  assert.ok(diagnostics.some(message => message.includes('NS4_MODULE_SCHEMA_VERSION')
    || message.includes('not assignable')));
});

function artifactDiagnostics(source: string): string[] {
  const baseRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../../../../');
  const virtualFile = resolve(baseRoot, 'mls-102046/l4/petShop/module.defs.ts');
  const options: ts.CompilerOptions = {
    noEmit: true,
    strict: true,
    skipLibCheck: true,
    target: ts.ScriptTarget.ES2022,
    module: ts.ModuleKind.ESNext,
    moduleResolution: ts.ModuleResolutionKind.Bundler,
    baseUrl: baseRoot,
    paths: { '/_102020_/*': ['./mls-102020/*'] },
    lib: ['lib.es2022.d.ts', 'lib.dom.d.ts', 'lib.dom.iterable.d.ts'],
    types: [],
  };
  const host = ts.createCompilerHost(options);
  const originalGetSourceFile = host.getSourceFile.bind(host);
  host.getSourceFile = (fileName, languageVersion, onError, shouldCreateNewSourceFile) =>
    fileName === virtualFile
      ? ts.createSourceFile(fileName, source, languageVersion, true, ts.ScriptKind.TS)
      : originalGetSourceFile(fileName, languageVersion, onError, shouldCreateNewSourceFile);
  const program = ts.createProgram({
    rootNames: [virtualFile, resolve(baseRoot, 'types/mls.d.ts')],
    options,
    host,
  });
  return ts.getPreEmitDiagnostics(program)
    .filter(diagnostic => diagnostic.file?.fileName === virtualFile)
    .map(diagnostic => ts.flattenDiagnosticMessageText(diagnostic.messageText, '\n'));
}
