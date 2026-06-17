/// <mls fileReference="_102020_/l2/dsMatch/simulateFaseC.ts" enhancement="_blank" />

// Fase C simulation. Against a REAL project + DS: read the DS rules, build the
// catalog, resolve the per-DS molecule table, and (optionally) persist it into
// designSystems[dsIndex].resolvedMolecules.
//
// Run inside the app runtime (needs `mls.stor`):
//   import { simulateFaseC } from '/_102020_/l2/dsMatch/simulateFaseC.js';
//   await simulateFaseC(102043, 2);              // dry-run: prints the table
//   await simulateFaseC(102043, 2, { persist: true });  // also writes project.json

import { readDsRules } from '/_102020_/l2/dsMatch/readDsRules.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { resolveMolecules, persistResolvedMolecules, type ResolvedMolecules } from '/_102020_/l2/dsMatch/resolveMolecules.js';
import { runResolveMoleculesTests } from '/_102020_/l2/dsMatch/resolveMolecules.test.js';

export interface FaseCReport {
    project: number;
    dsIndex: string;
    groupCount: number;
    matchedCount: number;
    fallbackCount: number;
    persisted: boolean;
    resolved: ResolvedMolecules;
}

export async function simulateFaseC(
    project = 102043,
    dsIndex: number | string = 2,
    opts: { persist?: boolean } = {},
): Promise<FaseCReport> {

    // Pure tests first.
    try {
        const { passed } = runResolveMoleculesTests();
        console.log(`PASS  resolveMolecules pure tests — ${passed} cases`);
    } catch (err: any) {
        console.log(`FAIL  resolveMolecules pure tests — ${String(err?.message ?? err)}`);
    }

    const dsRules = await readDsRules(project, dsIndex);
    const catalog = await buildMoleculeCatalog();
    const resolved = resolveMolecules(dsRules, catalog); // full table for this DS

    const entries = Object.values(resolved);
    const matchedCount = entries.filter(e => e.matched).length;
    const fallbackCount = entries.length - matchedCount;

    console.log(`\n=== Fase C simulation — project ${project}, ds ${dsIndex} ===`);
    console.log(`Resolved ${entries.length} groups — ${matchedCount} matched, ${fallbackCount} fallback`);
    console.table(entries.map(e => ({ group: e.group, molecule: e.variant, matched: e.matched, spec: e.specificity })));

    let persisted = false;
    if (opts.persist) {
        await persistResolvedMolecules(project, dsIndex, resolved);
        persisted = true;
        console.log(`Persisted resolvedMolecules into designSystems[${dsIndex}].`);
    } else {
        console.log(`(dry-run — pass { persist: true } to write designSystems[${dsIndex}].resolvedMolecules)`);
    }

    return { project, dsIndex: String(dsIndex), groupCount: entries.length, matchedCount, fallbackCount, persisted, resolved };
}
