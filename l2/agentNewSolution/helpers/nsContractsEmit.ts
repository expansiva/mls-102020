/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsContractsEmit.ts" enhancement="_blank"/>

import { isRecord, writeStorTextAtomic } from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { buildNsBffContractSet, NsBffContractEntry, NsBffOperationView } from '/_102020_/l2/agentNewSolution/helpers/nsContracts.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

// D3 + newSolution_10 N4: emit the mechanical l4 contracts, one file per bffCall (the wire view), from
// the FINAL workspaces + operations. Called at the very END of the flow (e7 — after e6 settled the
// workspaces and their projections) to avoid the run-9 staleness. ONE location only in this phase:
//   l4/<module>/contracts/<workspaceId>.<bffId>.ts (+ .d.ts twin)
// The l1/l2 mirrors are GONE (the agent now writes only l4/l5); the masters resolve l4 directly.

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

export async function emitNsBffContracts(moduleName: string, workspaces: unknown[], operations: unknown[]): Promise<string[]> {
  const module = normalizeModuleFolderName(moduleName);
  const project = mls.actualProject || 0;

  // Index the operation defs the bffCalls compose (inputs + outputShape + accessPattern).
  const operationsById: Record<string, NsBffOperationView> = {};
  for (const raw of operations) {
    if (!isRecord(raw)) continue;
    const operationId = readString(raw.operationId);
    if (!operationId) continue;
    operationsById[operationId] = { inputs: raw.inputs, outputShape: raw.outputShape, accessPattern: raw.accessPattern };
  }

  const entries: NsBffContractEntry[] = [];
  for (const raw of workspaces) {
    if (!isRecord(raw)) continue;
    const workspaceId = readString(raw.workspaceId);
    const bffCalls = Array.isArray(raw.bffCalls) ? raw.bffCalls.filter(isRecord) : [];
    for (const call of bffCalls) {
      const bffId = readString(call.bffId);
      if (!workspaceId || !bffId) continue;
      const uses = (Array.isArray(call.uses) ? call.uses.filter(isRecord) : [])
        .map(use => ({ operationId: readString(use.operationId) }))
        .filter(use => use.operationId);
      const route = readString(call.route) || `${module}.${workspaceId}.${bffId}`;
      entries.push({
        workspaceId,
        bffId,
        route,
        kind: call.kind === 'command' ? 'command' : 'query',
        input: call.input,
        output: call.output,
        uses,
        operations: operationsById,
        fileRef: `_${project}_/l4/${module}/contracts/${workspaceId}.${bffId}.ts`,
        sourceRef: `_${project}_/l4/${module}/workspaces/${workspaceId}.defs.ts`,
      });
    }
  }

  const results = buildNsBffContractSet(entries); // throws (A4.7) if any projected Output is empty
  const written: string[] = [];
  for (let i = 0; i < results.length; i++) {
    const result = results[i];
    const shortName = `${entries[i].workspaceId}.${result.bffId}`;
    await writeStorTextAtomic({ project, level: 4, folder: `${module}/contracts`, shortName, extension: '.ts' }, result.tsSource);
    await writeStorTextAtomic({ project, level: 4, folder: `${module}/contracts`, shortName, extension: '.d.ts' }, result.dtsSource);
    written.push(`l4/${module}/contracts/${shortName}.ts`);
  }
  return written;
}
