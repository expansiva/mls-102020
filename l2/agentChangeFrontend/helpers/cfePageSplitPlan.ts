/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageSplitPlan.ts" enhancement="_blank"/>

/**
 * Split plan of a page: which organisms it has, and which bindings each one owns
 *
 * There is NO judgement here, and that is the point. The l4 v2 workspace already declares the page's
 * sections and, inside each, the organisms with the `dataSource`/`action`/`attachTo` that tie them to a
 * bffCall. So "how do I split this page" is a question the ontology already answered — the plan is a
 * projection of it, not a decision. An earlier draft of this doc proposed grouping by name radical, or
 * asking a model; both were guesses at something already written down.
 *
 * ONE SECTION = ONE ORGANISM, literally. Sections that reference the same binding produce organisms that
 * both render it: duplicated work in exchange for a rule with no exceptions. The l4 usually means two
 * presentations of the same data anyway.
 *
 * PURE — no `mls.*`, no filesystem, so both materialize paths use it and it is unit-tested with
 * `node --test`.
 */

export interface SplitPlanOrganism {
  n: number;
  organism: string;
  bindings: string[];
}

export interface SplitPlan {
  pageId: string;
  genome: string;
  reason: string;
  organisms: SplitPlanOrganism[];
}

/** Section of an l4 v2 workspace, in the shape cfeCreateShared already reads. */
export interface SplitPlanSection {
  sectionId: string;
  organisms: { role?: string; dataSource?: string; action?: string; attachTo?: string }[];
}

/**
 * @param bindings the page's dataBindings commands — a section referencing something outside this page
 *        (another workspace's bffCall) contributes nothing.
 * @returns null when the l4 gives nothing to split by; the caller must then report instead of guessing.
 */
export function buildSplitPlan(
  pageId: string,
  genome: string,
  sections: SplitPlanSection[],
  bindings: string[],
  reason: string,
): SplitPlan | null {
  const known = new Set(bindings);
  const organisms: SplitPlanOrganism[] = [];
  for (const section of sections) {
    const owned: string[] = [];
    for (const organism of section.organisms ?? []) {
      for (const ref of [organism.dataSource, organism.action, organism.attachTo]) {
        if (ref && known.has(ref) && !owned.includes(ref)) owned.push(ref);
      }
    }
    // A section with no binding of this page renders nothing data-driven — it would be an empty file.
    if (owned.length === 0) continue;
    organisms.push({ n: organisms.length + 1, organism: organismNameOf(section.sectionId), bindings: owned });
  }

  // One organism means the split changes nothing: the page would still be one big file plus a wrapper.
  if (organisms.length < 2) return null;

  const covered = new Set(organisms.flatMap(item => item.bindings));
  const orphans = bindings.filter(binding => !covered.has(binding));
  if (orphans.length > 0) {
    // Never silently drop a binding: the page keeps rendering what no section claimed.
    organisms.push({ n: organisms.length + 1, organism: 'other', bindings: orphans });
  }
  return { pageId, genome, reason, organisms };
}

/**
 * contentLanding: one pipeline item per organism (hero, richText, imageSet, form, counter…),
 * including organisms with no binding of this page. The section-level split above would skip
 * those and wait for an output-cap failure; this recipe materializes piece by piece from the start.
 */
export function buildOrganismSplitPlan(
  pageId: string,
  genome: string,
  sections: SplitPlanSection[],
  bindings: string[],
  reason: string,
): SplitPlan | null {
  const known = new Set(bindings);
  const usedNames = new Set<string>();
  const organisms: SplitPlanOrganism[] = [];
  for (const section of sections) {
    for (const organism of section.organisms ?? []) {
      const owned: string[] = [];
      for (const ref of [organism.dataSource, organism.action, organism.attachTo]) {
        if (ref && known.has(ref) && !owned.includes(ref)) owned.push(ref);
      }
      const base = organismNameOf(organism.role || section.sectionId);
      organisms.push({ n: organisms.length + 1, organism: uniqueOrganismName(base, usedNames), bindings: owned });
    }
  }
  if (organisms.length < 2) return null;

  const covered = new Set(organisms.flatMap(item => item.bindings));
  const orphans = bindings.filter(binding => !covered.has(binding));
  if (orphans.length > 0) {
    organisms.push({ n: organisms.length + 1, organism: uniqueOrganismName('other', usedNames), bindings: orphans });
  }
  return { pageId, genome, reason, organisms };
}

function uniqueOrganismName(base: string, used: Set<string>): string {
  if (!used.has(base)) {
    used.add(base);
    return base;
  }
  let n = 2;
  while (used.has(`${base}${n}`)) n += 1;
  const name = `${base}${n}`;
  used.add(name);
  return name;
}

/** `sec-delay-risk-insights` / `delayRiskInsights` -> `delayRiskInsights` (a valid identifier fragment). */
export function organismNameOf(sectionId: string): string {
  const withoutPrefix = sectionId.replace(/^sec[-_]/u, '');
  const parts = withoutPrefix.split(/[^A-Za-z0-9]+/u).filter(Boolean);
  if (parts.length === 0) return 'section';
  const [first, ...rest] = parts;
  const head = /^[A-Z]/u.test(first) ? first.charAt(0).toLowerCase() + first.slice(1) : first;
  return head + rest.map(part => part.charAt(0).toUpperCase() + part.slice(1)).join('');
}
