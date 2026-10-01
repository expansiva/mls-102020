/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/input20/run.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { executeM3Input, type M3Input, type M3InputPort } from '/_102020_/l2/agentMaterializeL2v3/steps/input20/run.js';
import { CONTROLE_ESTOQUE_DEFS, CONTROLE_ESTOQUE_OWNERSHIP, CONTROLE_ESTOQUE_REPORT } from '/_102020_/l2/agentMaterializeL2v3/steps/input20/fixtures/controleEstoqueFixture.js';

const MODULE = 'controleEstoque';
const BASE = `l2/${MODULE}/pipeline/agentDefsL2/finalize80`;
const identity = (pages: string[] | null = null) => ({ project: 102047, module: MODULE, pages, devices: ['desktop' as const, 'mobile' as const], runDir: 'run_20261001143205' });

function makePort(over: { files?: Record<string, string>; report?: string } = {}) {
  const files: Record<string, string> = { ...CONTROLE_ESTOQUE_DEFS, ...(over.files ?? {}) };
  files[`${BASE}/report.json`] = over.report ?? CONTROLE_ESTOQUE_REPORT;
  files[`${BASE}/ownership.json`] = CONTROLE_ESTOQUE_OWNERSHIP;
  const writes: Array<{ info: any; value: any }> = [];
  const failures: string[] = [];
  const port: M3InputPort = {
    readText: async path => files[path] ?? null,
    readJson: async <T>(path: string) => { try { return JSON.parse(files[path]) as T; } catch { return null; } },
    writeJson: async (info, value) => { writes.push({ info, value }); },
    failure: {
      recordDegradation: async kind => { failures.push(`record:${kind}`); },
      saveSummary: async summary => { failures.push(`summary:${summary.verdict}`); return null; },
      readRun: async () => null,
      now: () => new Date(),
    },
  };
  return { port, writes, failures };
}

async function failedWith(port: M3InputPort, pattern: RegExp, pages: string[] | null = null) {
  const result = await executeM3Input(port, identity(pages));
  assert.equal(result.status, 'failed');
  assert.match((result as { reason: string }).reason, pattern);
}

test('the real controleEstoque fixture passes with 2 pages and the contract order', async () => {
  const { port, writes, failures } = makePort();
  const result = await executeM3Input(port, identity());
  assert.equal(result.status, 'completed');
  const input = (result as { input: M3Input }).input;
  assert.equal(input.schemaVersion, '2026-10-01-m3-input-v1');
  assert.equal(input.defsSnapshotHash, 'sha256:7683c4a6bb31614607945bd1d0cdcd00963fedca2b9bdb0abaea33711f1a9a14');
  assert.deepEqual(input.pages.map(page => page.pageId), ['movimentacoes', 'produtos']);
  const produtos = input.pages.find(page => page.pageId === 'produtos')!;
  assert.deepEqual(produtos.requests.map(item => item.requestId), ['load', 'cadastrarProduto']);
  assert.equal(produtos.requests[1].route, 'controleEstoque.produtos.cadastrarProduto');
  assert.deepEqual(input.pages.find(page => page.pageId === 'movimentacoes')!.requests.map(item => item.requestId), ['load', 'registrarMovimentacao']);
  assert.equal(produtos.defs.contract.path, 'l2/controleEstoque/web/contracts/produtos.defs.ts');
  assert.deepEqual(Object.keys(produtos.defs), ['contract', 'shared', 'desktopPage', 'mobilePage']);
  assert.equal(writes.length, 1);
  assert.equal(writes[0].info.shortName, 'input');
  assert.equal(writes[0].info.folder, 'controleEstoque/pipeline/trace/agentMaterializeL2v3/run_20261001143205');
  assert.deepEqual(failures, []);
});

test('/pages produtos selects only produtos', async () => {
  const result = await executeM3Input(makePort().port, identity(['produtos']));
  assert.equal(result.status, 'completed');
  assert.deepEqual((result as { input: M3Input }).input.pages.map(page => page.pageId), ['produtos']);
});

test('a report that is not complete fails and leaves the failure records', async () => {
  const { port, writes, failures } = makePort({ report: CONTROLE_ESTOQUE_REPORT.replace('"status": "complete"', '"status": "inProgress"') });
  await failedWith(port, /^M3_DEFS_NOT_FINAL: report status is inProgress/u);
  assert.equal(writes.length, 0);
  assert.deepEqual(failures, ['record:M3_DEFS_NOT_FINAL', 'summary:failed']);
});

test('scope, pending and compilation violations have their own codes', async () => {
  await failedWith(makePort({ report: CONTROLE_ESTOQUE_REPORT.replace('"scope": "all"', '"scope": "pages"') }).port, /^M3_DEFS_SCOPE/u);
  await failedWith(makePort({ report: CONTROLE_ESTOQUE_REPORT.replace('"pending": []', '"pending": ["x"]') }).port, /^M3_DEFS_PENDING/u);
  await failedWith(makePort({ report: CONTROLE_ESTOQUE_REPORT.replace('"status": "passed"', '"status": "failed"') }).port, /^M3_DEFS_NOT_COMPILED/u);
});

test('one extra byte in a defs file is M3_DEFS_DRIFT', async () => {
  const path = 'l2/controleEstoque/web/shared/produtos.defs.ts';
  await failedWith(makePort({ files: { [path]: `${CONTROLE_ESTOQUE_DEFS[path]} ` } }).port, /^M3_DEFS_DRIFT: l2\/controleEstoque\/web\/shared\/produtos\.defs\.ts expected sha256:[0-9a-f]{64} got sha256:[0-9a-f]{64}/u);
});

test('an extra route in the contract is M3_ROUTES_NOT_REQUESTS', async () => {
  // Re-own the changed bytes so that the drift check passes and the route check is what fails.
  const path = 'l2/controleEstoque/web/contracts/produtos.defs.ts';
  const changed = CONTROLE_ESTOQUE_DEFS[path].replace("  'controleEstoque.produtos.load': {", "  'controleEstoque.produtos.extra': {\n    input: {};\n    output: {};\n  };\n  'controleEstoque.produtos.load': {");
  assert.notEqual(changed, CONTROLE_ESTOQUE_DEFS[path]);
  const { port } = makePort({ files: { [path]: changed } });
  const ownership = JSON.parse(CONTROLE_ESTOQUE_OWNERSHIP);
  const { sha256Text } = await import('/_102020_/l2/helpers/hash.js');
  ownership.artifacts.find((item: any) => item.path === path).sha256 = await sha256Text(changed);
  const original = port.readJson;
  port.readJson = (async (p: string) => (p.endsWith('ownership.json') ? ownership : original(p))) as M3InputPort['readJson'];
  await failedWith(port, /^M3_ROUTES_NOT_REQUESTS: produtos only-contract=\[extra\] only-shared=\[\]/u, ['produtos']);
});

test('a page outside the ownership is M3_PAGE_NOT_OWNED', async () => {
  await failedWith(makePort().port, /^M3_PAGE_NOT_OWNED: relatorios/u, ['relatorios']);
});
