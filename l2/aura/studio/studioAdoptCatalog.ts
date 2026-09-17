/// <mls fileReference="_102020_/l2/aura/studio/studioAdoptCatalog.ts" enhancement="_blank" />
// What the adoption needs from the RUNTIME: which group claims an element, which molecule the design
// system resolves for it, and where that molecule's module lives (TASK-102020-adopt-molecules).
//
// The line with studioAdoptEdit is the usual one of this editor: that module is pure and decides
// about text; this one is the impure half — it reads the stor, imports modules and consults the
// project's design system. Keeping them apart is what lets the conversion tables be tested without a
// browser, and what keeps the catalog's cost (155 `.defs.ts` through collabImport) out of the pure
// path.
//
// WHY THE GROUPS ARE DISCOVERED AND NOT LISTED
// A table of "groups that can be adopted" would be a second place to edit, and the task's whole
// claim is that a new group is ONE new file (`skills/<group>/adopt.ts`). So the files are found the
// same way the molecule catalog finds molecules: in `mls.stor.files`. Nothing to keep in sync.

import { collabImport } from '/_102027_/l2/collabImport.js';
import { buildMoleculeCatalog } from '/_102020_/l2/aura/helpers/dsMatch/buildMoleculeCatalog.js';
import { matchVariant } from '/_102020_/l2/aura/helpers/dsMatch/matchVariant.js';
import type { MoleculeCatalogEntry, ResolvedLayoutRules } from '/_102020_/l2/aura/helpers/dsMatch/types.js';
import type { IAdoptCandidate, IAdoptGroupRules, IElementShape } from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import type { IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

const STUDIO_PROJECT = 102020;
const MOLECULES_PROJECT = 102040;
const SKILLS_FOLDER = 'aura/molecules/skills/';

/** One molecule the user may pick, already resolved to everything the write needs. */
export interface IAdoptOption {
  tag: string;
  variant: string;
  objective: string;
  /** `/_102040_/l2/molecules/<folder>/<name>.js` — built from the catalog's own fields. */
  importPath: string;
  /** True for the one the project's design system resolves (matchVariant). */
  chosen: boolean;
}

/** A group's claim on the selected element, with the molecules it offers. */
export interface IAdoptOffer {
  candidate: IAdoptCandidate;
  rules: IAdoptGroupRules;
  options: IAdoptOption[];
}

/**
 * No offer is FOUR different facts, and they need four different sentences.
 *
 * "No group claims this element" is only one of them, and it is the only one that is about the
 * element. The other three are about the tool — the catalog did not load, no conversion file is
 * reachable, the group that claimed it has no molecule in the catalog — and saying "this element is
 * not one of ours" for those sends the user looking at their markup for a problem that is ours.
 */
export const ADOPT_NO_CATALOG: IMessageRef = { id: 'reason.adoptNoCatalog' };
export const ADOPT_NO_GROUP_FILES: IMessageRef = { id: 'reason.adoptNoGroupFiles' };
export const ADOPT_NO_GROUP_MOLECULE: IMessageRef = { id: 'reason.adoptNoGroupMolecule' };
export const ADOPT_NO_CANDIDATE: IMessageRef = { id: 'panel.adoptNone' };

export type AdoptOfferResult =
  | { ok: true; offer: IAdoptOffer }
  | { ok: false; reason: IMessageRef };

/** Cache of the group rule modules — a module import is idempotent, the failures are not. */
const rulesCache = new Map<string, IAdoptGroupRules | null>();

/**
 * Puts the two projects this tab reads into `mls.stor.files` before anything looks for them.
 *
 * THE REASON THE TAB FOUND NOTHING. The stor carries the projects of the app that is RUNNING, and
 * the client app depends on neither of these: measured over the real pages, not one of them imports
 * a molecule, so the 102040 was never in the client's dependency chain — `buildMoleculeCatalog`
 * filters `mls.stor.files` by project and came back empty, and an empty catalog has no molecule to
 * offer for a group that claimed the element perfectly well. The 102020 is the same story from the
 * other side: its `skills/<group>/adopt.ts` files are what `adoptGroups` looks for.
 *
 * `loadProjectInfoIfNeeded` is the same call `resolveEditTarget` makes for the page's own project —
 * idempotent, and cheap when the project is already there. A failure is not fatal: the lookups below
 * decide, and they now say which of the two came back empty.
 */
async function ensureProjectsLoaded(): Promise<void> {
  for (const project of [MOLECULES_PROJECT, STUDIO_PROJECT]) {
    try {
      await mls.stor.server.loadProjectInfoIfNeeded(project);
    } catch (error) {
      console.warn(`[studioAdopt] could not load the file list of ${project}`, error);
    }
  }
}

/** The molecule's module path, from DATA: project and folder, never a convention. */
export function importPathOf(entry: MoleculeCatalogEntry): string {
  return `/_${entry.project}_/l2/${entry.folder}/${entry.variant}.js`;
}

/**
 * The groups that have a hand-written `adopt.ts`, in stor order.
 *
 * Read from the stor and not from a list: that is what makes "a new group is one new file" literally
 * true. A group with molecules and no `adopt.ts` simply never candidates — which is the honest state
 * for the 31 groups phase 1 does not cover.
 *
 * THE EMPTY ANSWER IS AMBIGUOUS, and the two meanings need opposite reactions: "this project has no
 * conversion file" (nothing candidates, correctly) and "the stor of this app does not carry the
 * studio's own files" (the tab would say nothing claims this element, for every element, forever).
 * `blind` tells them apart by asking whether the stor knows ANY file of the studio project.
 */
export function adoptGroups(): { groups: string[]; blind: boolean } {
  const files = Object.values(mls.stor.files as Record<string, mls.stor.IFileInfo>);
  const groups: string[] = [];
  let seenStudioFile = false;

  for (const file of files) {
    if (!file || file.project !== STUDIO_PROJECT) continue;
    seenStudioFile = true;
    if (file.level !== 2) continue;
    if (typeof file.folder !== 'string' || !file.folder.startsWith(SKILLS_FOLDER)) continue;
    if (file.shortName !== 'adopt' || file.extension !== '.ts') continue;
    const group = file.folder.slice(SKILLS_FOLDER.length);
    if (group && !group.includes('/')) groups.push(group);
  }

  return { groups: groups.sort(), blind: !seenStudioFile };
}

/** One group's rules, imported once. A group whose file does not load simply does not candidate. */
export async function loadAdoptRules(group: string): Promise<IAdoptGroupRules | null> {
  const cached = rulesCache.get(group);
  if (cached !== undefined) return cached;

  let rules: IAdoptGroupRules | null = null;
  try {
    const module = await import(`/_${STUDIO_PROJECT}_/l2/aura/molecules/skills/${group}/adopt.js`) as Partial<IAdoptGroupRules>;
    if (typeof module.candidate === 'function' && typeof module.convert === 'function') {
      rules = { group: module.group ?? group, candidate: module.candidate, convert: module.convert };
    } else {
      console.warn(`[studioAdopt] ${group}/adopt.ts does not export candidate/convert`);
    }
  } catch (error) {
    console.warn(`[studioAdopt] failed to load ${group}/adopt.ts`, error);
  }
  rulesCache.set(group, rules);
  return rules;
}

/**
 * The group that claims this element, with the molecules it offers — or null.
 *
 * The candidacy is the GROUP's (a `<button>` IS "execute an action"); the molecule inside the group
 * is the DESIGN SYSTEM's, resolved by the same pure `matchVariant` the generator uses, so the studio
 * and the generator cannot disagree. When the DS matches nothing, no molecule is marked as chosen and
 * the list is still offered — the user picks, which is better than an arbitrary default.
 */
export async function adoptOffer(
  shape: IElementShape,
  dsRules: ResolvedLayoutRules,
): Promise<AdoptOfferResult> {
  await ensureProjectsLoaded();

  const catalog = await buildMoleculeCatalog();
  if (!catalog.length) {
    console.warn('[studioAdopt] the molecule catalog came back empty');
    return { ok: false, reason: ADOPT_NO_CATALOG };
  }

  const asked = candidateGroups(catalog);
  let loaded = 0;
  for (const group of asked) {
    const rules = await loadAdoptRules(group);
    if (!rules) continue;
    loaded += 1;
    const candidate = rules.candidate(shape);
    if (!candidate) continue;

    const chosen = matchVariant(candidate.group, dsRules, catalog);
    const options = await groupOptions(candidate.group, catalog, chosen?.entry.tag ?? '');
    // The group claimed the element and the catalog has nothing to put in its place: that is a fact
    // about the catalog, not about the element, and the sentence has to say so.
    if (!options.length) {
      console.warn(`[studioAdopt] ${candidate.group} claims <${shape.tag}> but the catalog has no molecule for it`);
      return { ok: false, reason: ADOPT_NO_GROUP_MOLECULE };
    }
    return { ok: true, offer: { candidate, rules, options } };
  }

  // Nothing was reachable to ask: the stor listed no conversion file, or none of them loaded.
  if (!loaded) {
    console.warn(`[studioAdopt] no conversion file loaded (asked: ${asked.join(', ') || 'none'})`);
    return { ok: false, reason: ADOPT_NO_GROUP_FILES };
  }
  console.info(`[studioAdopt] <${shape.tag}>: ${loaded} group(s) asked, none claims it`);
  return { ok: false, reason: ADOPT_NO_CANDIDATE };
}

/**
 * Which groups to ask, with the stor as the source and the CATALOG as the fallback.
 *
 * When the stor does not carry the studio's own files there is no list to read, and the only other
 * place that knows which groups exist is the molecule catalog — which is already loaded. Asking each
 * of them costs one import that mostly 404s, once per session (the result is cached either way), and
 * that is a far better failure than a tab that silently claims nothing ever matches.
 */
function candidateGroups(catalog: MoleculeCatalogEntry[]): string[] {
  const { groups, blind } = adoptGroups();
  if (!blind) return groups;
  console.info('[studioAdopt] the stor carries no file of the studio project: asking every group of the catalog');
  return [...new Set(catalog.map((entry) => entry.group))].sort();
}

/**
 * The group's molecules, ordered the way the group's own page recommends them.
 *
 * `scenarios` in the group's `index.defs.ts` is the editorial "quick reference" — the one ordering a
 * human wrote. It is used as the sort key so the list opens with what the group itself puts first;
 * everything it does not mention keeps catalog order, after it. The DS's choice is marked, never
 * moved: moving it would hide the fact that the list has an order of its own.
 */
async function groupOptions(
  group: string,
  catalog: MoleculeCatalogEntry[],
  chosenTag: string,
): Promise<IAdoptOption[]> {
  const entries = catalog.filter((entry) => entry.group === group);
  const recommended = await scenarioOrder(entries[0]);

  const rank = (tag: string): number => {
    const at = recommended.indexOf(tag);
    return at >= 0 ? at : recommended.length;
  };

  return entries
    .map((entry, index) => ({ entry, index }))
    .sort((a, b) => rank(a.entry.tag) - rank(b.entry.tag) || a.index - b.index)
    .map(({ entry }) => ({
      tag: entry.tag,
      variant: entry.variant,
      objective: entry.objective,
      importPath: importPathOf(entry),
      chosen: entry.tag === chosenTag,
    }));
}

/** Tags in the order the group's `scenarios` mention them, first mention winning. */
async function scenarioOrder(entry: MoleculeCatalogEntry | undefined): Promise<string[]> {
  if (!entry) return [];
  try {
    const module = await collabImport({
      project: entry.project,
      folder: entry.folder,
      shortName: 'index',
      extension: '.defs.ts',
    }) as { scenarios?: { recommended?: string[] }[] };
    const order: string[] = [];
    for (const scenario of module?.scenarios ?? []) {
      for (const tag of scenario.recommended ?? []) if (!order.includes(tag)) order.push(tag);
    }
    return order;
  } catch (error) {
    // The list still works in catalog order — this ordering is editorial, not structural.
    console.warn(`[studioAdopt] could not read scenarios of ${entry.group}`, error);
    return [];
  }
}
