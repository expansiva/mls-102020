/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e5-behavior/contractsEmit.ts" enhancement="_blank"/>

import { writeStorTextAtomic } from '/_102020_/l2/agentNewSolution/helpers/nsFs.js';
import { buildNsContractSet, NsContractEntry } from '/_102020_/l2/agentNewSolution/helpers/nsContracts.js';
import { normalizeModuleFolderName } from '/_102020_/l2/agentNewSolution/helpers/nsIds.js';

// D3: emit the mechanical l4 contracts for every operation of the module, from the FINAL operation
// defs (called at the end of e5-finalize, after the demotion reconciliation rewrites outputShapes —
// contracts derive from outputShape, so they must be emitted only once those settle).
//
// Three locations with IDENTICAL bodies; only the fileReference header differs (location-specific,
// matching the platform's existing l2/web/contracts convention):
//   l4/<module>/contracts/<op>.ts        — reference / audit (contract of record)
//   l1/<module>/contracts/<op>.ts        — mirror the platform resolves for l1 usecases
//   l2/<module>/web/contracts/<op>.ts    — mirror the platform resolves for l2 web
// The .d.ts twin carries no fileReference, so it is byte-identical across all three.

interface NsContractLocation {
  level: 1 | 2 | 4;
  folder: (moduleName: string) => string;
  fileRef: (moduleName: string, project: number, op: string) => string;
}

const NS_CONTRACT_LOCATIONS: NsContractLocation[] = [
  { level: 4, folder: m => `${m}/contracts`, fileRef: (m, p, op) => `_${p}_/l4/${m}/contracts/${op}.ts` },
  { level: 1, folder: m => `${m}/contracts`, fileRef: (m, p, op) => `_${p}_/l1/${m}/contracts/${op}.ts` },
  { level: 2, folder: m => `${m}/web/contracts`, fileRef: (m, p, op) => `_${p}_/l2/${m}/web/contracts/${op}.ts` },
];

export async function emitNsContracts(moduleName: string, operations: unknown[]): Promise<string[]> {
  const module = normalizeModuleFolderName(moduleName);
  const project = mls.actualProject || 0;
  const written: string[] = [];
  for (const location of NS_CONTRACT_LOCATIONS) {
    const entries: NsContractEntry[] = operations.map(op => {
      const data = op as Record<string, unknown>;
      const operationId = String(data.operationId);
      return {
        data,
        fileRef: location.fileRef(module, project, operationId),
        // note always points at the operation def (the single source), regardless of mirror location
        sourceRef: `_${project}_/l4/${module}/operations/${operationId}.defs.ts`,
      };
    });
    const results = buildNsContractSet(entries);
    for (const result of results) {
      const folder = location.folder(module);
      await writeStorTextAtomic({ project, level: location.level, folder, shortName: result.operationId, extension: '.ts' }, result.tsSource);
      await writeStorTextAtomic({ project, level: location.level, folder, shortName: result.operationId, extension: '.d.ts' }, result.dtsSource);
      written.push(`l${location.level}/${folder}/${result.operationId}.ts`);
    }
  }
  return written;
}
