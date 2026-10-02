/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3WriteIfChanged.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

async function loadArtifacts(): Promise<typeof import('/_102020_/l2/agentMaterializeL2v3/helpers/m3WriteIfChanged.js')> {
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  return import('/_102020_/l2/agentMaterializeL2v3/helpers/m3WriteIfChanged.js');
}

const PROJECT = 102020;
const MODULE = 'listaModulo';

test('shouldRewriteByContent is byte equality, never mtime', async () => {
  const { shouldRewriteByContent } = await loadArtifacts();
  assert.equal(shouldRewriteByContent(null, 'next'), true);
  assert.equal(shouldRewriteByContent(undefined, 'next'), true);
  assert.equal(shouldRewriteByContent('same', 'same'), false);
  assert.equal(shouldRewriteByContent('QryLocatePetitionInput', 'QryLocatePetitionForAdministrationInput'), true);
});

test('writeIfContentChanged compares stor content, not a Monaco model', async () => {
  const { writeIfContentChanged } = await loadArtifacts();
  const fileInfo = { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'exportPetitionSignatures', extension: '.ts' };
  const key = `${fileInfo.project}:${fileInfo.level}:${fileInfo.folder}:${fileInfo.shortName}:${fileInfo.extension}`;
  const next = 'export interface QryLocatePetitionForAdministrationInput {}\n';
  const old = 'export interface QryLocatePetitionInput {}\n';
  let writes = 0;
  let stored = old;
  const file = { ...fileInfo, status: 'changed', content: old, getContent: async () => stored };
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files: { [key]: file },
      getKeyToFile: (info: typeof fileInfo) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: {
        setContent: async (_file: unknown, payload: { content: string }) => {
          writes += 1;
          stored = payload.content;
          file.content = payload.content;
        },
      },
    },
  };
  assert.equal(await writeIfContentChanged(fileInfo, next), 'written');
  assert.equal(writes, 1);
  assert.equal(stored, next);
  assert.equal(await writeIfContentChanged(fileInfo, next), 'unchanged');
  assert.equal(writes, 1);
});
