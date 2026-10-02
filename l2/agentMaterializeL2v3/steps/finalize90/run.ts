/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/finalize90/run.ts" enhancement="_blank"/>

import { readJson } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { compileM3FinalSources, type M3CompileProof, type M3FinalSource } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3CompileProof.js';
import type { M3RunIdentity } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { m3ReceiptFresh, type M3Reader } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Receipt.js';
import { failM3Step, m3ErrorMessage, productionFailurePort, type M3FailurePort } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.js';
import { getContentByMlsPath } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Studio.js';
import { M3_AGENT_FOLDER, m3TraceFileInfo, saveM3RunSummary, takeM3Degradations, type M3RunDegradation, type M3RunSummary } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';
import type { M3ContractPageTrace } from '/_102020_/l2/agentMaterializeL2v3/steps/contracts30/run.js';
import type { M3StepResult } from '/_102020_/l2/agentMaterializeL2v3/steps/entry10/run.js';
import type { M3Input } from '/_102020_/l2/agentMaterializeL2v3/steps/input20/run.js';

const STEPS_PLANNED = ['entry10', 'input20', 'contracts30', 'finalize90'];
const UNAVAILABLE = 'Studio TypeScript compiler is unavailable';

export interface M3FinalizePort {
  readInput(): Promise<M3Input | null>;
  readContracts(): Promise<{ pages: M3ContractPageTrace[] } | null>;
  readRun(): Promise<{ startedAt?: string; command?: string } | null>;
  read: M3Reader;
  compile(sources: M3FinalSource[], hashes: Map<string, string>): Promise<M3CompileProof[]>;
  takeDegradations(): Promise<M3RunDegradation[]>;
  saveSummary(summary: M3RunSummary): Promise<string | null>;
  now(): Date;
  failure: M3FailurePort;
}

export function productionFinalizePort(identity: { project: number; module: string; runDir: string }): M3FinalizePort {
  const trace = (shortName: string) => m3TraceFileInfo(identity.project, identity.module, identity.runDir, shortName);
  return {
    readInput: () => readJson<M3Input>(trace('input')),
    readContracts: () => readJson<{ pages: M3ContractPageTrace[] }>(trace('contracts30')),
    readRun: () => readJson<{ startedAt?: string; command?: string }>(trace('run')),
    read: getContentByMlsPath,
    compile: (sources, hashes) => compileM3FinalSources(identity.project, sources, hashes),
    takeDegradations: () => takeM3Degradations(identity.project, identity.module, identity.runDir),
    saveSummary: summary => saveM3RunSummary(identity.project, summary),
    now: () => new Date(),
    failure: productionFailurePort(identity.project, identity.module, identity.runDir),
  };
}

export async function executeM3Finalize(port: M3FinalizePort, identity: M3RunIdentity & { runDir: string }): Promise<M3StepResult> {
  const { project, module, runDir } = identity;
  try {
    const input = await port.readInput();
    if (!input) throw new Error(`M3_INPUT_MISSING: input.json of ${runDir}`);
    const contracts = await port.readContracts();
    if (!contracts) throw new Error(`M3_CONTRACTS_TRACE_MISSING: contracts30.json of ${runDir}`);

    const failed = new Map<string, string>();
    const stale: string[] = [];
    const sources: M3FinalSource[] = [];
    const hashes = new Map<string, string>();
    for (const page of input.pages) {
      const traced = contracts.pages.find(item => item.pageId === page.pageId);
      if (!traced) failed.set(page.pageId, 'no contracts30 trace');
      else if (traced.status === 'failed') failed.set(page.pageId, traced.reason || 'failed in contracts30');
      const outputPath = `_${project}_/l2/${module}/web/contracts/${page.pageId}.ts`;
      const defPath = `_${project}_/${page.defs.contract.path}`;
      const source = await port.read(outputPath);
      if (source === null) {
        if (!failed.has(page.pageId)) failed.set(page.pageId, `${outputPath} is missing`);
        continue;
      }
      const path = `l2/${module}/web/contracts/${page.pageId}.ts`;
      sources.push({ pageId: page.pageId, kind: 'contract', path, source });
      hashes.set(path, await sha256Text(source));
      if (!await m3ReceiptFresh({ defPath, outputPath, sourceRefs: [defPath, `_${project}_/${page.defs.shared.path}`], project, read: port.read })) stale.push(page.pageId);
    }
    const proofs = sources.length ? await port.compile(sources, hashes) : [];
    let unavailable = false;
    for (const proof of proofs) {
      if (proof.status === 'passed') continue;
      const pageId = sources.find(item => item.path === proof.path)?.pageId ?? proof.path;
      if (proof.diagnostics.some(item => item.startsWith(UNAVAILABLE))) unavailable = true;
      if (!failed.has(pageId)) failed.set(pageId, `compile failed: ${proof.diagnostics.join('; ')}`);
    }

    const degradations = await port.takeDegradations();
    const verdict: M3RunSummary['verdict'] = failed.size || unavailable ? 'failed' : stale.length || degradations.length ? 'degraded' : 'completed';
    const reasons = [
      ...[...failed].map(([pageId, why]) => `${pageId}: ${why}`),
      ...(unavailable ? [UNAVAILABLE] : []),
      ...stale.map(pageId => `${pageId}: receipt is not fresh`),
      ...degradations.map(item => `${item.kind}: ${item.reason}`),
    ];
    const count = (status: M3ContractPageTrace['status']) => contracts.pages.filter(item => item.status === status).length;
    const reason = verdict === 'completed'
      ? `${input.pages.length} page(s) compiled with fresh receipts (written ${count('written')}, unchanged ${count('unchanged')}, reused ${count('reused')})`
      : reasons.join(' | ');
    const run = await port.readRun();
    const saved = await port.saveSummary({
      moduleName: module, agent: M3_AGENT_FOLDER, runDir, command: run?.command ?? '', startedAt: run?.startedAt ?? null,
      finishedAt: port.now().toISOString(), verdict, reason,
      counts: {
        pages: input.pages.length,
        written: count('written'),
        unchanged: count('unchanged'),
        reused: count('reused'),
        failed: failed.size,
        stepsPlanned: STEPS_PLANNED,
      },
      degradations,
      tscGate: unavailable ? 'unavailable' : 'ran',
    });
    if (!saved) throw new Error('M3_SUMMARY_NOT_SAVED: summary.json could not be written');
    return verdict === 'completed' ? { status: 'completed', summary: `finalize90 ${reason}` } : { status: 'failed', reason: `${verdict}: ${reason}` };
  } catch (error) {
    return { status: 'failed', reason: await failM3Step(port.failure, { module, runDir, stepId: 'finalize90' }, m3ErrorMessage(error)) };
  }
}
