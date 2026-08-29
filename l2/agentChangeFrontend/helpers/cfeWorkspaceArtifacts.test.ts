/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeWorkspaceArtifacts.test.ts" enhancement="_blank"/>

import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const g = globalThis as unknown as Record<string, any>;
const priorMls = g.mls;
after(() => { g.mls = priorMls; });

type ArtifactFileRef = {
  project?: number;
  level?: number;
  folder?: string;
  shortName?: string;
  extension?: string;
  status?: string;
};

async function loadArtifacts(): Promise<typeof import('/_102020_/l2/agentChangeFrontend/helpers/cfeWorkspaceArtifacts.js')> {
  if (!g.mls) g.mls = { actualProject: PROJECT, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  if (!g.mls.stor) g.mls.stor = { files: {} };
  return import('/_102020_/l2/agentChangeFrontend/helpers/cfeWorkspaceArtifacts.js');
}

const PROJECT = 102020;
const MODULE = 'listaModulo';

const LIVE = [
  'exportPetitionSignatures',
  'petitionCampaignHub',
  'petitionSignatureCatalogue',
  'signatoryCatalogue',
  'signatureExportCatalogue',
  'signatureExportItemCatalogue',
  'signPublicPetition',
] as const;

const DEAD = [
  'petitionCatalogue',
  'petitionHub',
  'petitionSignerCatalogue',
  'signPetitionAsMorador',
  'signPetitionAsResponsavelJovem',
  'signPetitionAsVisitante',
] as const;

function artifact(folder: string, shortName: string, extension: string): ArtifactFileRef {
  return { project: PROJECT, level: 2, folder, shortName, extension, status: 'changed' };
}

function artifactsFor(ids: readonly string[]): ArtifactFileRef[] {
  const files: ArtifactFileRef[] = [];
  for (const id of ids) {
    files.push(artifact(`${MODULE}/web/contracts`, id, '.ts'));
    files.push(artifact(`${MODULE}/web/shared`, id, '.ts'));
    files.push(artifact(`${MODULE}/web/shared`, id, '.defs.ts'));
    files.push(artifact(`${MODULE}/web/shared`, id, '.test.ts'));
    files.push(artifact(`${MODULE}/web/shared`, `${id}Dts`, '.txt'));
    files.push(artifact(`${MODULE}/web/desktop/page11`, id, '.ts'));
    files.push(artifact(`${MODULE}/web/desktop/page11`, id, '.defs.ts'));
    files.push(artifact(`${MODULE}/web/desktop/page11`, id, '.test.ts'));
  }
  return files;
}

test('shouldRewriteByContent is byte equality, never mtime', async () => {
  const { shouldRewriteByContent } = await loadArtifacts();
  assert.equal(shouldRewriteByContent(null, 'next'), true);
  assert.equal(shouldRewriteByContent(undefined, 'next'), true);
  assert.equal(shouldRewriteByContent('same', 'same'), false);
  assert.equal(shouldRewriteByContent('QryLocatePetitionInput', 'QryLocatePetitionForAdministrationInput'), true);
});

test('artifactWorkspaceId strips the Dts suffix only on the shared artifact', async () => {
  const { artifactWorkspaceId } = await loadArtifacts();
  assert.equal(artifactWorkspaceId('exportPetitionSignatures', '.ts'), 'exportPetitionSignatures');
  assert.equal(artifactWorkspaceId('exportPetitionSignaturesDts', '.txt'), 'exportPetitionSignatures');
  assert.equal(artifactWorkspaceId('exportPetitionSignaturesDts', '.ts'), 'exportPetitionSignaturesDts');
});

test('orphan sweep: 7 live l4 workspaces, 13 l2 artifacts ⇒ 6 dead removed, 7 kept', async () => {
  const { artifactWorkspaceId, listOrphanFrontendArtifacts } = await loadArtifacts();
  const files = [
    ...artifactsFor(LIVE),
    ...artifactsFor(DEAD),
    { project: PROJECT, level: 2, folder: 'outroModulo/web/contracts', shortName: 'petitionCatalogue', extension: '.ts', status: 'changed' },
    { project: PROJECT, level: 4, folder: `${MODULE}/workspaces`, shortName: 'exportPetitionSignatures', extension: '.defs.ts', status: 'changed' },
  ];
  const orphans = listOrphanFrontendArtifacts(files, { project: PROJECT, moduleName: MODULE, liveWorkspaceIds: new Set(LIVE) });
  const owners = [...new Set(orphans.map(file => artifactWorkspaceId(String(file.shortName), String(file.extension))))].sort();
  assert.deepEqual(owners, [...DEAD].sort());
  assert.equal(orphans.some(file => String(file.folder).startsWith('outroModulo/')), false);
  assert.equal(orphans.length, artifactsFor(DEAD).length);
  const kept = files.filter(file => file.level === 2 && String(file.folder).startsWith(`${MODULE}/web/`) && !orphans.includes(file));
  const keptOwners = [...new Set(kept.map(file => artifactWorkspaceId(String(file.shortName), String(file.extension))))].sort();
  assert.deepEqual(keptOwners, [...LIVE].sort());
});

test('orphan sweep safety: empty or unreadable l4 ⇒ nothing deleted', async () => {
  const { listOrphanFrontendArtifacts } = await loadArtifacts();
  const files = artifactsFor(DEAD);
  assert.deepEqual(listOrphanFrontendArtifacts(files, { project: PROJECT, moduleName: MODULE, liveWorkspaceIds: null }), []);
  assert.deepEqual(listOrphanFrontendArtifacts(files, { project: PROJECT, moduleName: MODULE, liveWorkspaceIds: new Set() }), []);
});

test('orphan sweep non-regression: l4 == l2 ⇒ no deletions', async () => {
  const { listOrphanFrontendArtifacts } = await loadArtifacts();
  const files = artifactsFor(LIVE);
  assert.deepEqual(listOrphanFrontendArtifacts(files, { project: PROJECT, moduleName: MODULE, liveWorkspaceIds: new Set(LIVE) }), []);
});

test('writeIfContentChanged rewrites when the Monaco model is stale even if stor already matches', async () => {
  const { writeIfContentChanged } = await loadArtifacts();
  const fileInfo = { project: PROJECT, level: 2, folder: `${MODULE}/web/contracts`, shortName: 'exportPetitionSignatures', extension: '.ts' };
  const key = `${fileInfo.project}:${fileInfo.level}:${fileInfo.folder}:${fileInfo.shortName}:${fileInfo.extension}`;
  const modelKey = `${fileInfo.project}:${fileInfo.level}:${fileInfo.folder}:${fileInfo.shortName}`;
  const next = 'export interface QryLocatePetitionForAdministrationInput {}\n';
  const old = 'export interface QryLocatePetitionInput {}\n';
  let writes = 0;
  let modelValue = old;
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files: {
        [key]: { ...fileInfo, status: 'changed', content: next, getContent: async () => next },
      },
      getKeyToFile: (info: typeof fileInfo) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async (_file: unknown, payload: { content: string }) => { writes += 1; modelValue = payload.content; } },
    },
    editor: {
      getKeyModel: (project: number, shortName: string, folder: string, level: number) => `${project}:${level}:${folder}:${shortName}`,
      models: { [modelKey]: { getValue: () => modelValue, setValue: (value: string) => { modelValue = value; } } },
    },
  };
  assert.equal(await writeIfContentChanged(fileInfo, next), 'written');
  assert.equal(writes, 1);
  assert.equal(modelValue, next);
  assert.equal(await writeIfContentChanged(fileInfo, next), 'unchanged');
  assert.equal(writes, 1);
});

test('removeOrphanFrontendArtifacts: unreadable l4 workspace defs delete nothing', async () => {
  const { removeOrphanFrontendArtifacts } = await loadArtifacts();
  const contract = artifact(`${MODULE}/web/contracts`, 'petitionCatalogue', '.ts');
  const files: Record<string, any> = {
    l4ws: {
      project: PROJECT, level: 4, folder: `${MODULE}/workspaces`, shortName: 'broken', extension: '.defs.ts', status: 'changed',
      getContent: async () => 'not a defs file',
    },
    l2c: { ...contract, getContent: async () => 'old' },
  };
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: ArtifactFileRef) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: { getKeyModel: () => 'k', models: {} },
  };
  const result = await removeOrphanFrontendArtifacts(PROJECT, MODULE);
  assert.equal(result.skipped, 'unreadable');
  assert.deepEqual(result.removed, []);
  assert.equal(files.l2c.status, 'changed');
});

test('removeOrphanFrontendArtifacts: empty l4 workspaces delete nothing', async () => {
  const { removeOrphanFrontendArtifacts } = await loadArtifacts();
  const contract = artifact(`${MODULE}/web/contracts`, 'petitionCatalogue', '.ts');
  const files: Record<string, any> = {
    l2c: { ...contract, getContent: async () => 'old' },
  };
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: ArtifactFileRef) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: { getKeyModel: () => 'k', models: {} },
  };
  const result = await removeOrphanFrontendArtifacts(PROJECT, MODULE);
  assert.equal(result.skipped, 'empty');
  assert.deepEqual(result.removed, []);
  assert.equal(files.l2c.status, 'changed');
});

test('removeOrphanFrontendArtifacts deletes only dead-workspace artifacts of the run module', async () => {
  const { removeOrphanFrontendArtifacts } = await loadArtifacts();
  const liveDefs = `export const ws = ${JSON.stringify({ workspaceId: 'exportPetitionSignatures' })} as const;`;
  const liveContract = artifact(`${MODULE}/web/contracts`, 'exportPetitionSignatures', '.ts');
  const deadContract = artifact(`${MODULE}/web/contracts`, 'petitionCatalogue', '.ts');
  const otherModule = artifact('outroModulo/web/contracts', 'petitionCatalogue', '.ts');
  const files: Record<string, any> = {
    l4ws: {
      project: PROJECT, level: 4, folder: `${MODULE}/workspaces`, shortName: 'exportPetitionSignatures', extension: '.defs.ts', status: 'changed',
      getContent: async () => liveDefs,
    },
    live: { ...liveContract },
    dead: { ...deadContract },
    other: { ...otherModule },
  };
  g.mls = {
    actualProject: PROJECT,
    stor: {
      files,
      getKeyToFile: (info: ArtifactFileRef) => `${info.project}:${info.level}:${info.folder}:${info.shortName}:${info.extension}`,
      localStor: { setContent: async () => undefined },
    },
    editor: { getKeyModel: () => 'k', models: {} },
  };
  const result = await removeOrphanFrontendArtifacts(PROJECT, MODULE);
  assert.equal(result.skipped, null);
  assert.deepEqual(result.removed, [`_${PROJECT}_/l2/${MODULE}/web/contracts/petitionCatalogue.ts`]);
  assert.equal(files.dead.status, 'deleted');
  assert.equal(files.live.status, 'changed');
  assert.equal(files.other.status, 'changed');
});

test('scan enumerates owners then sweeps orphans; create-contract-shared writes via content compare', () => {
  const scan = readFileSync(new URL('../steps/scan/agentCfeCreateScanL4.ts', import.meta.url), 'utf8');
  assert.match(scan, /removeOrphanFrontendArtifacts/);
  const shared = readFileSync(new URL('./cfeCreateShared.ts', import.meta.url), 'utf8');
  assert.match(shared, /writeIfContentChanged\(copy\.fileInfo, copy\.source\)/);
});
