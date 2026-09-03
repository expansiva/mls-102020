/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syCreateIndexTs.ts" enhancement="_blank"/>

// E8b (creation mode of s3-indexts): pure helpers around the LLM's structured output for a G1 group's
// brand-new index.ts. No I/O, no mls.* access — the step reads/writes files and calls this to decide
// what belongs in index.defs.ts.
//
// ⚠️ THE MODEL NEVER WRITES A TAG. It writes SHORT molecule names (the same 'Available molecules' list
// the prompt shows it), and this module resolves each one against the group's OWN just-derived molecule
// list — the same anti-invention discipline as the rest of this agent (helpers/syExtract's tag
// extraction, D-E3's dropped foreign columns). A name matching nothing is DROPPED, never guessed, and
// reported so the run stays honest about it (flow.json decisions.e8bCreation_tagAntiInvention).

import { SyScenario } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';

export interface SyRawCreationScenario {
  scenario?: unknown;
  recommended?: unknown;
}

export interface SyResolvedCreationScenarios {
  scenarios: SyScenario[];
  /** Short names the model returned that matched no molecule of this group — dropped, not written. */
  droppedNames: string[];
}

/**
 * `molecules` is the group's own list — `{ shortName, tag }` pairs, the same shape s1 derives before
 * rendering index.defs.ts. Blank scenario text is dropped (nothing readable to show); a scenario left
 * with zero resolved tags after dropping invented names is KEPT (not silently erased) — same as any
 * human-authored scenario with no recommendation — the empty state is legitimate, only the name was not.
 */
export function syResolveCreationScenarios(
  raw: SyRawCreationScenario[] | null | undefined,
  molecules: Array<{ shortName: string; tag: string }>,
): SyResolvedCreationScenarios {
  const byShortName = new Map(molecules.map(molecule => [molecule.shortName, molecule.tag]));
  const droppedNames: string[] = [];

  const scenarios: SyScenario[] = (Array.isArray(raw) ? raw : [])
    .map((entry): SyScenario | null => {
      const scenario = typeof entry?.scenario === 'string' ? entry.scenario.trim() : '';
      if (!scenario) return null;
      const names = Array.isArray(entry?.recommended) ? entry.recommended : [];
      const recommended: string[] = [];
      for (const name of names) {
        if (typeof name !== 'string') continue;
        const tag = byShortName.get(name.trim());
        if (tag) recommended.push(tag);
        else droppedNames.push(name);
      }
      return { scenario, recommended };
    })
    .filter((entry): entry is SyScenario => entry !== null);

  return { scenarios, droppedNames };
}
