import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { D2InputSnapshot, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { buildD2SharedPipeline } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { buildD2PagePipeline } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { renderD2Shared } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { changedOutsideD2Scope, gateD2FinalSources, type D2FinalSource } from '/_102020_/l2/agentDefsL2/steps/finalize60/gate.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import { revalidateD2RemovalSet, validateD2SelectionCounts } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';

const moduleName = 'agendaClinica';
const ids = ['agenda', 'cadastro', 'dashboard', 'prontuario', 'recepcao'];
const snapshot = {
  module: moduleName,
  selection: {
    writePageIds: ids,
    preservePageIds: [],
    remove: [],
    pages: ids.map(page),
  },
} as unknown as D2InputSnapshot;

test('finalize60 gates the exact 20 defs and 15-item acyclic graph, including a page without molecule suggestions', () => {
  const sources = ids.flatMap(pageId => files(pageId, pageId === 'agenda'));
  assert.equal(sources.length, 20);
  assert.doesNotThrow(() => gateD2FinalSources(snapshot, sources));
});

test('finalize60 refuses a missing def, duplicate id, cycle and invalid reference', () => {
  const complete = ids.flatMap(pageId => files(pageId));
  assert.throws(() => gateD2FinalSources(snapshot, complete.slice(1)), /OUTPUT_SET_MISMATCH/);
  const duplicate = replacePipeline(complete, 'cadastro', 'desktopPage', { id: 'agenda__desktop__page11' });
  assert.throws(() => gateD2FinalSources(snapshot, duplicate), /PIPELINE_ID_SET_INVALID/);
  const cycle = replacePipeline(complete, 'agenda', 'shared', { dependsOn: ['agenda__desktop__page11'] });
  assert.throws(() => gateD2FinalSources(snapshot, cycle), /SHARED_REF_INVALID|PIPELINE_CYCLE/);
  const invalid = replacePipeline(complete, 'agenda', 'mobilePage', { dependsFiles: ['l2/wrong/web/shared/agenda.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, invalid), /PAGE_REF_INVALID/);
  const invalidUsage = replacePipeline(complete, 'agenda', 'mobilePage', { skills: ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.defs.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, invalidUsage), /PAGE_REF_INVALID/);
  const incompletePair = replacePipeline(complete, 'agenda', 'desktopPage', { skills: ['_102040_/l2/molecules/groupenterdate/index.defs.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, incompletePair), /PAGE_REF_INVALID/);
  const arbitraryPath = replacePipeline(complete, 'agenda', 'desktopPage', { skills: ['_102040_/l2/other/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts'] });
  assert.throws(() => gateD2FinalSources(snapshot, arbitraryPath), /PAGE_REF_INVALID/);
});

test('scope fingerprint catches a positive control and protects another module with the same page id', () => {
  const allowed = ids.flatMap(pageId => page(pageId).destinations.map(item => item.path));
  const outside = 'l2/otherModule/web/shared/agenda.defs.ts';
  const before = { [allowed[0]]: 'old', [outside]: 'same' };
  assert.deepEqual(changedOutsideD2Scope(before, { [allowed[0]]: 'new', [outside]: 'changed' }, allowed), [outside]);
  assert.deepEqual(changedOutsideD2Scope(before, { [allowed[0]]: 'new', [outside]: 'same' }, allowed), []);
});

test('remove preflight catches an edit and a new snapshot between scan and delete', async () => {
  const path = `l2/${moduleName}/web/contracts/obsolete.defs.ts`;
  const info = { project: 102047, level: 2, folder: `${moduleName}/web/contracts`, shortName: 'obsolete', extension: '.defs.ts' };
  const owned = 'export interface Old {}\n';
  const ownership = new Map([[path, { pageId: 'obsolete', kind: 'contract' as const, path, sha256: await sha256Text(owned) }]]);
  let live = owned; let snapshotHash = 'old'; let deletes = 0;
  const verify = async () => { if (snapshotHash !== 'old') throw new Error('D2_FINALIZE_STALE_RUN'); };
  const edited = await revalidateD2RemovalSet([{ path, info }], ownership, async () => live, verify, async () => { live = 'manual edit'; });
  if (!edited.length) deletes += 1;
  assert.deepEqual(edited, [`remove target changed after scan: ${path}`]);
  assert.equal(deletes, 0);

  live = owned; snapshotHash = 'old';
  await assert.rejects(() => revalidateD2RemovalSet([{ path, info }], ownership, async () => live, verify, async () => { snapshotHash = 'new'; }), /STALE_RUN/);
  assert.equal(deletes, 0);
});

test('agendaClinica snapshot counts unique routes and usecaseIds and rejects illegible identities', () => {
  const fixture = JSON.parse(readFileSync(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../input20/fixtures/current/backend.json'), 'utf8')) as {
    endpoints: Array<Record<string, unknown>>;
    usecases: Array<Record<string, unknown>>;
  };
  const usecases = new Map(fixture.usecases.map(usecase => [String(usecase.usecaseId), usecase]));
  const pageIds = [...new Set(fixture.endpoints.map(endpoint => String(endpoint.page)))].sort();
  const pages = pageIds.map(pageId => {
    const endpoints = fixture.endpoints.filter(endpoint => endpoint.page === pageId);
    const refs = new Set(endpoints.map(endpoint => String(endpoint.usecaseRef)));
    return { ...page(pageId), endpoints, usecases: [...refs].map(ref => usecases.get(ref)!) };
  });
  const agendaSnapshot = { ...snapshot, selection: { ...snapshot.selection, pages, writePageIds: pageIds,
    counts: { pages: 5, endpoints: 19, usecases: 13, destinations: 20, materializationItems: 15 } } } as D2InputSnapshot;
  assert.equal(pages.reduce((sum, item) => sum + item.usecases.length, 0), 19, 'page occurrences intentionally repeat usecases');
  assert.deepEqual(validateD2SelectionCounts(agendaSnapshot), []);

  const adulterated = structuredClone(agendaSnapshot);
  adulterated.selection.pages[0].usecases[0].usecaseId = '';
  adulterated.selection.pages[1].endpoints[0].route = String(adulterated.selection.pages[0].endpoints[0].route);
  const problems = validateD2SelectionCounts(adulterated).join('; ');
  assert.match(problems, /usecaseId missing/);
  assert.match(problems, /endpoint route duplicated/);
});

function page(pageId: string): D2SelectedPage {
  const base = `l2/${moduleName}/web`;
  return { pageId, status: 'toCreate', label: pageId, actors: [], authorityRefs: [], ancestors: [], journeyRefs: [], organisms: [], reads: [], writes: [], endpoints: [], usecases: [], destinations: [
    { kind: 'contract', path: `${base}/contracts/${pageId}.defs.ts`, artifactId: `${pageId}:contract` },
    { kind: 'shared', path: `${base}/shared/${pageId}.defs.ts`, artifactId: `${pageId}:shared` },
    { kind: 'desktopPage', path: `${base}/desktop/page11/${pageId}.defs.ts`, artifactId: `${pageId}:desktop` },
    { kind: 'mobilePage', path: `${base}/mobile/page11/${pageId}.defs.ts`, artifactId: `${pageId}:mobile` },
  ] };
}
function files(pageId: string, withoutSkills = false): D2FinalSource[] {
  const p = page(pageId); const skill = withoutSkills ? [] : ['_102040_/l2/molecules/groupenterdate/index.defs.ts', '_102020_/l2/aura/molecules/skills/groupEnterDate/usage.ts'];
  return [
    { pageId, kind: 'contract', path: p.destinations[0].path, source: 'export interface Input { "id": string; }\n' },
    { pageId, kind: 'shared', path: p.destinations[1].path, source: renderD2Shared({} as never, buildD2SharedPipeline(moduleName, pageId)) },
    { pageId, kind: 'desktopPage', path: p.destinations[2].path, source: renderD2Page({ device: 'desktop', descriptions: ['desktop'], pipeline: [buildD2PagePipeline(moduleName, pageId, 'desktop', skill)] }) },
    { pageId, kind: 'mobilePage', path: p.destinations[3].path, source: renderD2Page({ device: 'mobile', descriptions: ['mobile'], pipeline: [buildD2PagePipeline(moduleName, pageId, 'mobile', skill)] }) },
  ];
}
function replacePipeline(all: D2FinalSource[], pageId: string, kind: D2FinalSource['kind'], patch: Record<string, unknown>): D2FinalSource[] {
  return all.map(file => {
    if (file.pageId !== pageId || file.kind !== kind) return file;
    const match = /export const pipeline = ([\s\S]*?) as const;/.exec(file.source)!;
    const raw = JSON.parse(match[1]); const item = Array.isArray(raw) ? raw[0] : raw;
    const changed = Array.isArray(raw) ? [{ ...item, ...patch }] : { ...item, ...patch };
    return { ...file, source: file.source.replace(match[1], JSON.stringify(changed, null, 2)) };
  });
}
