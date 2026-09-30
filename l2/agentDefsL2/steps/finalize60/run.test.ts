/// <mls fileReference="_102020_/l2/agentDefsL2/steps/finalize60/run.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2InputSnapshot } from '/_102020_/l2/helpers/defsInput/contracts.js';
import type { D2PipelineState } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import type { D2PagesReceipt } from '/_102020_/l2/agentDefsL2/steps/pages50/run.js';
import { finalizeD2Pages, type D2PagesFinalizePort } from '/_102020_/l2/agentDefsL2/steps/finalize60/run.js';

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
