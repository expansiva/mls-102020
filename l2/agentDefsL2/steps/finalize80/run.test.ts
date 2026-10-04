/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize80/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import type { D2PipelineState } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2PagesReceipt } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { finalizeD2Pages, type D2PagesFinalizePort } from '/_102020_/l2/agentDefsL2/steps/finalize80/run.js';

void test('finalize compiles page11 only, preserves existing shared/contracts and writes once', async () => {
  const identity = { project: 102047, module: 'controleEstoque' };
  const snapshot = { ...identity, snapshotHash: 'sha256:input', selection: { writePageIds: ['produtos'] } } as D2InputSnapshot;
  const pipeline = { ...identity, steps: { entry10: { status: 'approved' }, input20: { status: 'approved' }, pages50: { status: 'approved', snapshotHash: snapshot.snapshotHash } } } as D2PipelineState;
  const sources = new Map<string, string>();
  for (const device of ['desktop', 'mobile']) sources.set(`l2/controleEstoque/web/${device}/page11/produtos.defs.ts`, `export const definition = { device: '${device}' } as const;`);
  sources.set('l2/controleEstoque/web/shared/produtos.defs.ts', 'shared: unchanged');
  sources.set('l2/controleEstoque/web/contracts/produtos.defs.ts', 'contracts: unchanged');
  const originalShared = sources.get('l2/controleEstoque/web/shared/produtos.defs.ts');
  const originalContract = sources.get('l2/controleEstoque/web/contracts/produtos.defs.ts');
  const receipt = { ...identity, pageId: 'produtos', sourceHashes: {
    desktop: await sha256Text(sources.get('l2/controleEstoque/web/desktop/page11/produtos.defs.ts')!),
    mobile: await sha256Text(sources.get('l2/controleEstoque/web/mobile/page11/produtos.defs.ts')!),
  } } as D2PagesReceipt;
  const docs = new Map<string, unknown>();
  let writes = 0;
  let completed = 0;
  let available = true;
  const port: D2PagesFinalizePort = {
    readInput: async () => snapshot,
    readBundle: async () => ({ artifacts: {} as never, files: [] }),
    assertStable: async () => undefined,
    readPipeline: async () => pipeline,
    reusable: async () => true,
    readReceipt: async () => receipt,
    indexed: () => true,
    readSource: async info => sources.get(displayPath(info)) || '',
    readJson: async <T>(info: Ns5FileInfo) => (docs.get(displayPath(info)) ?? null) as T | null,
    writeJson: async (info, value) => { writes += 1; docs.set(displayPath(info), value); return displayPath(info); },
    compile: async (_identity, files, hashes) => {
      assert.deepEqual(files.map(file => file.path).sort(), [
        'l2/controleEstoque/web/desktop/page11/produtos.defs.ts', 'l2/controleEstoque/web/mobile/page11/produtos.defs.ts',
      ]);
      return files.map(file => ({ path: file.path, sha256: hashes.get(file.path)!, status: available ? 'passed' as const : 'failed' as const, diagnostics: available ? [] : ['Studio unavailable'] }));
    },
    markComplete: async () => { completed += 1; },
    markBlocked: async () => undefined,
  };
  const first = await finalizeD2Pages(identity, port);
  assert.equal(first.report.status, 'complete');
  assert.equal(first.writes, 2);
  const second = await finalizeD2Pages(identity, port);
  assert.equal(second.report.status, 'complete');
  assert.equal(second.writes, 0);
  assert.equal(writes, 2);
  assert.equal(completed, 2);
  assert.equal(sources.get('l2/controleEstoque/web/shared/produtos.defs.ts'), originalShared);
  assert.equal(sources.get('l2/controleEstoque/web/contracts/produtos.defs.ts'), originalContract);
  available = false;
  const blocked = await finalizeD2Pages(identity, port);
  assert.equal(blocked.report.status, 'blocked');
  assert.match(blocked.report.pending.join('; '), /D2_FINALIZE_COMPILE_FAILED/u);
  assert.equal(completed, 2);
});

void test('missing shared and contract files are named pending, not a raw read error', async () => {
  const identity = { project: 102047, module: 'sampleModule', scope: 'all' as const };
  const snapshot = { project: identity.project, module: identity.module, snapshotHash: 'sha256:input', selection: { writePageIds: ['leftPage'] } } as D2InputSnapshot;
  const pipeline = { project: identity.project, module: identity.module, steps: {
    entry10: { status: 'approved' }, input20: { status: 'approved' },
    pages50: { status: 'approved', snapshotHash: snapshot.snapshotHash },
    shared60: { status: 'approved', snapshotHash: snapshot.snapshotHash },
    contracts70: { status: 'approved', snapshotHash: snapshot.snapshotHash },
  } } as D2PipelineState;
  const desktop = 'export const desktop = "left" as const;\n';
  const mobile = 'export const mobile = "left" as const;\n';
  const sources = new Map<string, string>([
    ['l2/sampleModule/web/desktop/page11/leftPage.defs.ts', desktop],
    ['l2/sampleModule/web/mobile/page11/leftPage.defs.ts', mobile],
  ]);
  const receipt = { project: identity.project, module: identity.module, pageId: 'leftPage', sourceHashes: { desktop: await sha256Text(desktop), mobile: await sha256Text(mobile) } } as D2PagesReceipt;
  const report = await finalizeD2Pages(identity, {
    readInput: async () => snapshot,
    readBundle: async () => ({ artifacts: {} as never, files: [] }),
    assertStable: async () => undefined,
    readPipeline: async () => pipeline,
    reusable: async () => true,
    readReceipt: async () => receipt,
    indexed: () => true,
    readSource: async info => {
      const path = displayPath(info);
      if (path.includes('/shared/') || path.includes('/contracts/')) throw new Error(`[agentNewSolution5] file not found: ${path}`);
      return sources.get(path) || '';
    },
    readJson: async () => null,
    readDraftText: async () => '',
    readSharedReceipt: async () => ({ page11Hashes: { desktop: await sha256Text(desktop), mobile: await sha256Text(mobile) }, draftHashes: { desktop: await sha256Text(''), mobile: await sha256Text('') } }) as never,
    readContractReceipt: async () => null,
    writeJson: async () => '',
    compile: async () => [],
    markBlocked: async () => undefined,
  });
  const pending = report.report.pending.join('; ');
  assert.match(pending, /D2_FINALIZE_SHARED_MISSING: l2\/sampleModule\/web\/shared\/leftPage\.defs\.ts/u);
  assert.match(pending, /D2_FINALIZE_CONTRACT_MISSING: l2\/sampleModule\/web\/contracts\/leftPage\.defs\.ts/u);
  assert.equal(pending.includes('file not found'), false);
});

void test('full finalize compiles four artifacts per page and names a hand-edited contract as drift', async () => {
  const identity = { project: 102047, module: 'sampleModule', scope: 'all' as const };
  const snapshot = { project: identity.project, module: identity.module, snapshotHash: 'sha256:input', selection: { writePageIds: ['leftPage', 'rightPage'] } } as D2InputSnapshot;
  const pipeline = { project: identity.project, module: identity.module, steps: {
    entry10: { status: 'approved' }, input20: { status: 'approved' },
    pages50: { status: 'approved', snapshotHash: snapshot.snapshotHash },
    bff55: { status: 'approved', snapshotHash: snapshot.snapshotHash },
    shared60: { status: 'approved', snapshotHash: snapshot.snapshotHash },
    contracts70: { status: 'approved', snapshotHash: snapshot.snapshotHash },
  } } as D2PipelineState;
  const sources = new Map<string, string>();
  for (const pageId of snapshot.selection.writePageIds) {
    sources.set(`l2/sampleModule/web/desktop/page11/${pageId}.defs.ts`, `export const desktop = '${pageId}' as const;`);
    sources.set(`l2/sampleModule/web/mobile/page11/${pageId}.defs.ts`, `export const mobile = '${pageId}' as const;`);
    sources.set(`l2/sampleModule/web/shared/${pageId}.defs.ts`, `export const shared = '${pageId}' as const;`);
    sources.set(`l2/sampleModule/web/contracts/${pageId}.defs.ts`, `export const contract = '${pageId}' as const;`);
  }
  const hashes = new Map<string, string>();
  for (const [path, source] of sources) hashes.set(path, await sha256Text(source));
  const emptyDraft = await sha256Text('');
  const pageReceipt = async (pageId: string) => ({ sourceHashes: {
    desktop: hashes.get(`l2/sampleModule/web/desktop/page11/${pageId}.defs.ts`),
    mobile: hashes.get(`l2/sampleModule/web/mobile/page11/${pageId}.defs.ts`),
  } }) as D2PagesReceipt;
  const sharedReceipt = (pageId: string) => ({
    sourceHash: hashes.get(`l2/sampleModule/web/shared/${pageId}.defs.ts`)!,
    page11Hashes: {
      desktop: hashes.get(`l2/sampleModule/web/desktop/page11/${pageId}.defs.ts`)!,
      mobile: hashes.get(`l2/sampleModule/web/mobile/page11/${pageId}.defs.ts`)!,
    },
    draftHashes: { desktop: emptyDraft, mobile: emptyDraft },
  });
  let completed = 0;
  const port: D2PagesFinalizePort = {
    readInput: async () => snapshot,
    readBundle: async () => ({ artifacts: {} as never, files: [] }),
    assertStable: async () => undefined,
    readPipeline: async () => pipeline,
    reusable: async () => true,
    readReceipt: async (_id, pageId) => pageReceipt(pageId),
    readSharedReceipt: async (_id, pageId) => sharedReceipt(pageId) as never,
    readContractReceipt: async (_id, pageId) => ({
      sourceHash: hashes.get(`l2/sampleModule/web/contracts/${pageId}.defs.ts`)!,
      sharedHash: hashes.get(`l2/sampleModule/web/shared/${pageId}.defs.ts`)!,
    }) as never,
    readDraftText: async () => '',
    indexed: () => true,
    readSource: async info => sources.get(displayPath(info)) || '',
    readJson: async () => null,
    writeJson: async () => '',
    compile: async (_identity, files) => files.map(file => ({ path: file.path, sha256: hashes.get(file.path)!, status: 'passed' as const, diagnostics: [] })),
    markComplete: async () => { completed += 1; },
    markBlocked: async () => undefined,
  };
  const ready = await finalizeD2Pages(identity, port);
  assert.equal(ready.report.status, 'complete');
  assert.equal(ready.report.artifactPaths.length, 8);
  assert.equal(completed, 1);
  sources.set('l2/sampleModule/web/contracts/leftPage.defs.ts', 'export const contract = \'edited\' as const;');
  const drifted = await finalizeD2Pages(identity, port);
  assert.equal(drifted.report.status, 'blocked');
  assert.match(drifted.report.pending.join('; '), /D2_FINALIZE_DRIFT: l2\/sampleModule\/web\/contracts\/leftPage\.defs\.ts/u);
  assert.equal(drifted.report.pending.some(item => item.includes('rightPage')), false);
  assert.equal(completed, 1);
  const previousPage = { ...sharedReceipt('leftPage'), page11Hashes: { desktop: await sha256Text('previous-page11'), mobile: sharedReceipt('leftPage').page11Hashes.mobile } };
  const staleShared = await finalizeD2Pages(identity, { ...port, readSharedReceipt: async (_id, pageId) => (pageId === 'leftPage' ? previousPage : sharedReceipt(pageId)) as never });
  assert.equal(staleShared.report.status, 'blocked');
  assert.match(staleShared.report.pending.join('; '), /D2_FINALIZE_SHARED_STALE: l2\/sampleModule\/web\/shared\/leftPage\.defs\.ts/u);
  assert.equal(staleShared.report.pending.some(item => item.includes('rightPage')), false);
  sources.set('l2/sampleModule/web/contracts/leftPage.defs.ts', `export const contract = 'leftPage' as const;`);
  const previousShared = await sha256Text('previous-shared');
  const staleContract = await finalizeD2Pages(identity, {
    ...port,
    readContractReceipt: async (_id, pageId) => ({
      sourceHash: hashes.get(`l2/sampleModule/web/contracts/${pageId}.defs.ts`)!,
      sharedHash: pageId === 'leftPage' ? previousShared : hashes.get(`l2/sampleModule/web/shared/${pageId}.defs.ts`)!,
    }) as never,
  });
  assert.equal(staleContract.report.status, 'blocked');
  assert.match(staleContract.report.pending.join('; '), /D2_FINALIZE_CONTRACT_STALE: l2\/sampleModule\/web\/contracts\/leftPage\.defs\.ts/u);
  assert.equal(staleContract.report.pending.some(item => item.includes('rightPage')), false);
  assert.equal(completed, 1);
});
