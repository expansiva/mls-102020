/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/finalize90/run.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import type { M3ContractsPort } from '/_102020_/l2/agentMaterializeL2v3/steps/contracts30/run.js';
import { executeM3Contracts } from '/_102020_/l2/agentMaterializeL2v3/steps/contracts30/run.js';
import { executeM3Finalize, type M3FinalizePort } from '/_102020_/l2/agentMaterializeL2v3/steps/finalize90/run.js';
import { executeM3Input, type M3Input, type M3InputPort } from '/_102020_/l2/agentMaterializeL2v3/steps/input20/run.js';
import { CONTROLE_ESTOQUE_DEFS, CONTROLE_ESTOQUE_OWNERSHIP, CONTROLE_ESTOQUE_REPORT } from '/_102020_/l2/agentMaterializeL2v3/steps/input20/fixtures/controleEstoqueFixture.js';
import type { M3CompileProof } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.js';
import type { M3RunDegradation, M3RunSummary } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';

const PROJECT = 102047;
const MODULE = 'controleEstoque';
const identity = { project: PROJECT, module: MODULE, pages: null, devices: ['desktop' as const, 'mobile' as const], runDir: 'run_20261001143205' };
const mls = (path: string) => `_${PROJECT}_/${path}`;

type Compile = (sources: any[]) => M3CompileProof[];
const passing: Compile = sources => sources.map(s => ({ path: s.path, sha256: 'sha256:x', status: 'passed' as const, diagnostics: [] }));

/** Runs the real input20 and contracts30 on the real fixture, then hands their stor and traces to finalize90. */
async function scenario(options: { compile?: Compile; degradations?: M3RunDegradation[]; dropReceipt?: boolean } = {}) {
  const files: Record<string, string> = {
    ...CONTROLE_ESTOQUE_DEFS,
    [`l2/${MODULE}/pipeline/agentDefsL2/finalize80/report.json`]: CONTROLE_ESTOQUE_REPORT,
    [`l2/${MODULE}/pipeline/agentDefsL2/finalize80/ownership.json`]: CONTROLE_ESTOQUE_OWNERSHIP,
  };
  let input: M3Input | undefined;
  const inputPort: M3InputPort = {
    readText: async path => files[path] ?? null,
    readJson: async <T>(path: string) => JSON.parse(files[path]) as T,
    writeJson: async () => undefined,
    failure: { recordDegradation: async () => undefined, saveSummary: async () => null, readRun: async () => null, now: () => new Date() },
  };
  input = (await executeM3Input(inputPort, identity) as { input: M3Input }).input;
  const stor: Record<string, string> = { '_102029_/l2/bffClient.ts': 'export const execBff = 1;\n' };
  for (const [path, content] of Object.entries(CONTROLE_ESTOQUE_DEFS)) stor[mls(path)] = content;
  let contractsTrace: any = null;
  const contractsPort: M3ContractsPort = {
    readInput: async () => input!,
    read: async path => stor[path] ?? null,
    writeTs: async (path, source) => { stor[path] = source; return true; },
    writeText: async (path, content) => { stor[path] = content; return true; },
    compile: async (sources, hashes) => passing(sources).map(p => ({ ...p, sha256: hashes.get(p.path)! })),
    writeJson: async (_info, value) => { contractsTrace = value; },
    failure: { recordDegradation: async () => undefined, saveSummary: async () => null, readRun: async () => null, now: () => new Date() },
  };
  await executeM3Contracts(contractsPort, identity);
  if (options.dropReceipt) delete stor[mls(`l2/${MODULE}/web/contracts/produtosReceipt.json`)];
  const summaries: M3RunSummary[] = [];
  const failures: string[] = [];
  const port: M3FinalizePort = {
    readInput: async () => input!,
    readContracts: async () => contractsTrace,
    readRun: async () => ({ startedAt: '2026-10-01T14:32:06.000Z', command: '@@agentMaterializeL2v3 controleEstoque' }),
    read: async path => stor[path] ?? null,
    compile: async (sources, hashes) => (options.compile ?? passing)(sources).map(p => ({ ...p, sha256: hashes.get(p.path)! })),
    takeDegradations: async () => options.degradations ?? [],
    saveSummary: async summary => { summaries.push(summary); return 'saved'; },
    now: () => new Date(Date.UTC(2026, 9, 1, 14, 40, 0)),
    failure: { recordDegradation: async kind => { failures.push(`record:${kind}`); }, saveSummary: async summary => { failures.push(`summary:${summary.verdict}`); return null; }, readRun: async () => null, now: () => new Date() },
  };
  return { port, summaries, failures };
}

test('everything passes: completed, with counts and the planned steps', async () => {
  const { port, summaries } = await scenario();
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'completed');
  assert.equal(summaries[0].verdict, 'completed');
  assert.deepEqual(summaries[0].counts, { pages: 2, written: 2, unchanged: 0, reused: 0, failed: 0, stepsPlanned: ['entry10', 'input20', 'contracts30', 'finalize90'] });
  assert.equal(summaries[0].startedAt, '2026-10-01T14:32:06.000Z');
  assert.equal(summaries[0].tscGate, 'ran');
});

test('a compilation that fails is failed and the reason names the page', async () => {
  const { port, summaries } = await scenario({ compile: sources => sources.map(s => ({ path: s.path, sha256: '', status: s.pageId === 'produtos' ? 'failed' as const : 'passed' as const, diagnostics: s.pageId === 'produtos' ? ['TS2322: bad'] : [] })) });
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'failed');
  assert.equal(summaries[0].verdict, 'failed');
  assert.match(summaries[0].reason, /produtos: compile failed: TS2322: bad/u);
  assert.equal((summaries[0].counts as { failed: number }).failed, 1);
});

test('an unavailable compiler is failed', async () => {
  const { port, summaries } = await scenario({ compile: sources => sources.map(s => ({ path: s.path, sha256: '', status: 'failed' as const, diagnostics: ['Studio TypeScript compiler is unavailable'] })) });
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'failed');
  assert.equal(summaries[0].verdict, 'failed');
  assert.equal(summaries[0].tscGate, 'unavailable');
});

test('a recorded degradation makes the run degraded and the step not completed', async () => {
  const { port, summaries } = await scenario({ degradations: [{ at: '2026-10-01T14:35:00.000Z', kind: 'x', reason: 'something' }] });
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'failed');
  assert.equal(summaries[0].verdict, 'degraded');
  assert.equal(summaries[0].degradations.length, 1);
});

test('a stale receipt makes the run degraded', async () => {
  const { port, summaries } = await scenario({ dropReceipt: true });
  await executeM3Finalize(port, identity);
  assert.equal(summaries[0].verdict, 'degraded');
  assert.match(summaries[0].reason, /produtos: receipt is not fresh/u);
});

test('a missing input.json leaves the failure records', async () => {
  const { port, failures, summaries } = await scenario();
  port.readInput = async () => null;
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'failed');
  assert.deepEqual(failures, ['record:M3_INPUT_MISSING', 'summary:failed']);
  assert.equal(summaries.length, 0);
});

test('counts and reason separate written, unchanged and reused', async () => {
  const { port, summaries } = await scenario();
  const base = await port.readContracts();
  port.readContracts = async () => ({ pages: [
    { ...base!.pages[0], status: 'written' as const },
    { ...base!.pages[1], status: 'unchanged' as const },
    { ...base!.pages[1], pageId: 'extra', status: 'reused' as const },
  ] });
  const result = await executeM3Finalize(port, identity);
  assert.equal(result.status, 'completed');
  const counts = summaries[0].counts as { written: number; unchanged: number; reused: number };
  assert.deepEqual([counts.written, counts.unchanged, counts.reused], [1, 1, 1]);
  assert.equal(summaries[0].reason, '2 page(s) compiled with fresh receipts (written 1, unchanged 1, reused 1)');
});
