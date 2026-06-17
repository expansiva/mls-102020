/// <mls fileReference="_102020_/l2/dsMatch/simulateFaseA.ts" enhancement="_blank" />

// Fase A simulation — validates A1 (readDsRules) and A2 (buildMoleculeCatalog)
// against a REAL project, and exercises A3 (matchVariant) across every group.
//
// Must run inside the app runtime (it needs `mls.stor` loaded). Invoke from a
// playground/console:
//
//   import { simulateFaseA } from '/_102020_/l2/dsMatch/simulateFaseA.js';
//   await simulateFaseA(102043, 2);
//
// It logs a readable report and returns it. `checks[].ok === false` flags a problem.

import { dsAxisKeys } from '/_102020_/l2/designSystemAuraBase.js';
import { readDsRules } from '/_102020_/l2/dsMatch/readDsRules.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { matchVariant } from '/_102020_/l2/dsMatch/matchVariant.js';
import { runMatchVariantTests } from '/_102020_/l2/dsMatch/matchVariant.test.js';
import type { ResolvedDs } from '/_102020_/l2/dsMatch/types.js';

export interface FaseACheck { name: string; ok: boolean; detail?: string; }

export interface FaseASelection {
    group: string;
    tag: string;
    variant: string;
    matched: boolean;
    specificity: number;
}

export interface FaseAReport {
    project: number;
    dsIndex: string;
    resolvedDs: ResolvedDs;
    catalogTotal: number;
    groupCount: number;
    groupNames: string[];
    selections: FaseASelection[];
    checks: FaseACheck[];
    allOk: boolean;
}

export async function simulateFaseA(project = 102043, dsIndex: number | string = 2): Promise<FaseAReport> {
    const checks: FaseACheck[] = [];
    const check = (name: string, ok: boolean, detail?: string) => checks.push({ name, ok, detail });

    // ── A3 pure tests first (no runtime needed) ──────────────────────────────
    try {
        const { passed } = runMatchVariantTests();
        check('matchVariant pure tests', true, `${passed} cases passed`);
    } catch (err: any) {
        check('matchVariant pure tests', false, String(err?.message ?? err));
    }

    // ── A1: readDsRules ──────────────────────────────────────────────────────
    const resolvedDs = await readDsRules(project, dsIndex);
    const resolvedKeys = Object.keys(resolvedDs);
    check(
        'A1: every axis resolved',
        resolvedKeys.length === dsAxisKeys.length,
        `${resolvedKeys.length}/${dsAxisKeys.length} axes`,
    );
    // Sanity for mls-102043 DS 2 ("ERP Compact"): these rules exist in project.json.
    if (project === 102043 && String(dsIndex) === '2') {
        check('A1: ds2 density=compact', resolvedDs.density === 'compact', resolvedDs.density);
        check('A1: ds2 labelPlacement=floating', resolvedDs.labelPlacement === 'floating', resolvedDs.labelPlacement);
        check('A1: ds2 feedback=toast', resolvedDs.feedback === 'toast', resolvedDs.feedback);
    }

    // ── A2: buildMoleculeCatalog ──────────────────────────────────────────────
    const catalog = await buildMoleculeCatalog(true);
    const groupNames = [...new Set(catalog.map(m => m.group))].sort();

    check('A2: catalog not empty', catalog.length > 0, `${catalog.length} molecules`);
    check('A2: covers >= 30 groups', groupNames.length >= 30, `${groupNames.length} groups`);
    check('A2: every entry has tag + group', catalog.every(m => !!m.tag && !!m.group));

    // Order must be reproducible (the tie-break depends on it).
    const catalog2 = await buildMoleculeCatalog(true);
    const sameOrder =
        catalog.length === catalog2.length &&
        catalog.every((m, i) => m.tag === catalog2[i].tag);
    check('A2: catalog order is deterministic', sameOrder);

    // ── A3 over real data: one selection per group ────────────────────────────
    const selections: FaseASelection[] = [];
    for (const group of groupNames) {
        const r = matchVariant(group, resolvedDs, catalog);
        if (!r) { check(`A3: ${group} resolves`, false, 'returned null'); continue; }
        selections.push({
            group,
            tag: r.entry.tag,
            variant: r.entry.variant,
            matched: r.matched,
            specificity: r.specificity,
        });
    }
    check('A3: every group resolves a molecule', selections.length === groupNames.length);

    const allOk = checks.every(c => c.ok);
    const report: FaseAReport = {
        project,
        dsIndex: String(dsIndex),
        resolvedDs,
        catalogTotal: catalog.length,
        groupCount: groupNames.length,
        groupNames,
        selections,
        checks,
        allOk,
    };

    logReport(report);
    return report;
}

function logReport(r: FaseAReport): void {
    console.log(`\n=== Fase A simulation — project ${r.project}, ds ${r.dsIndex} ===`);
    console.log(`Resolved DS:`, r.resolvedDs);
    console.log(`Catalog: ${r.catalogTotal} molecules across ${r.groupCount} groups`);
    console.table(r.selections.map(s => ({
        group: s.group,
        molecule: s.variant,
        matched: s.matched,
        spec: s.specificity,
    })));
    for (const c of r.checks) {
        console.log(`${c.ok ? 'PASS' : 'FAIL'}  ${c.name}${c.detail ? ` — ${c.detail}` : ''}`);
    }
    console.log(r.allOk ? '\nAll checks passed.' : '\nSome checks FAILED — see above.');
}
