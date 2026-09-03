/// <mls fileReference="_102020_/l2/aura/molecules/shared/indexReferenceTable.ts" enhancement="_102020_/l2/enhancementAura"/>

// The "Quick reference" scenario table every group's index.ts showcase page renders — ONE
// implementation, imported by all 30 (and counting) migrated pages instead of ~40-90 hand-written lines
// each. Written for agentSyncMoleculeCatalog's s3-indexts step (E8a — see that agent's flow.json,
// decisions.s3Migration), but this file itself carries no agent-specific logic or `mls.*` access — it is
// a plain Lit render function any group's index.ts can import directly.
//
// ⚠️ LIVES IN mls-102020, IMPORTED FROM mls-102040. There is no existing precedent for that direction
// (only the reverse — 102020 depending on 102040 — and the `enhancement=` triple-slash metadata
// directive, which is a different mechanism) — a deliberate call made with the risk named, not a
// discovered pattern. If this import does not resolve at runtime, every migrated page's reference table
// breaks the same way, all at once, which is exactly what makes it easy to notice and easy to revert.
//
// All the DECISIONS this table makes (column order, color, which rows survive D-E3) live in
// ./indexReferenceTableData.ts, which imports nothing from 'lit' and is unit-tested directly. This file
// is a thin, mechanical map from that data into markup — see that file for why the split exists.

import { html, TemplateResult } from 'lit';
import {
  buildReferenceTableData,
  IndexReferenceTableMolecule,
  IndexReferenceTableScenario,
} from '/_102020_/l2/aura/molecules/shared/indexReferenceTableData.js';

export function renderCatalogReferenceTable(
  molecules: IndexReferenceTableMolecule[],
  scenarios: IndexReferenceTableScenario[],
): TemplateResult {
  const { headers, rows } = buildReferenceTableData(molecules, scenarios);

  return html`
    <section class="bg-slate-100 dark:bg-slate-950 px-8 py-20 border-t border-slate-200 dark:border-slate-700">
      <div class="max-w-5xl mx-auto">
        <h2 class="text-2xl font-bold text-slate-900 dark:text-slate-50 mb-2">Quick reference</h2>
        <p class="text-sm text-slate-500 dark:text-slate-400 mb-8">
          Choose the most appropriate component based on the scenario below.
        </p>
        <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
          <table class="w-full text-sm">
            <thead>
              <tr class="bg-slate-50 dark:bg-slate-900 border-b border-slate-200 dark:border-slate-700">
                <th class="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide w-3/4">Scenario</th>
                ${headers.map(header => html`
                  <th class="px-4 py-3.5 text-xs font-semibold uppercase tracking-wide ${header.cls}">${header.label}</th>
                `)}
              </tr>
            </thead>
            <tbody>
              ${rows.map((row, index) => html`
                <tr class="${index % 2 !== 0 ? 'bg-slate-50/60 dark:bg-slate-900/40' : ''} border-b border-slate-100 dark:border-slate-700/60 last:border-0">
                  <td class="px-5 py-3.5 text-slate-700 dark:text-slate-300">${row.scenario}</td>
                  ${row.cells.map(ok => html`
                    <td class="px-4 py-3.5 text-center">
                      ${ok
                        ? html`<span class="inline-flex items-center justify-center w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-400 text-xs font-bold">✓</span>`
                        : html`<span class="text-slate-200 dark:text-slate-700 text-sm">—</span>`}
                    </td>
                  `)}
                </tr>
              `)}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  `;
}
