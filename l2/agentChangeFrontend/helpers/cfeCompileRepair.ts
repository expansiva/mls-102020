/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeCompileRepair.ts" enhancement="_blank"/>

/**
 * Turning MODULE-COMPILE-FAILED from a dead end into a repair round.
 *
 * The whole-module compile in `create-finalize` is the only place a `.ts` that is broken but NOT stale
 * gets checked, so the gate has to exist. What it lacked was the legitimate path: run fe2 of the petShop
 * (22/08) died with 15 errors in 5 files after generating 19 pages and 102 owners, and the only recourse
 * was to run the whole thing again. Doctrine: a deterministic gate never loosens — it gets a repair with
 * a budget.
 *
 * Pure on purpose: the grouping and the slot planning are what decides how much LLM money the round
 * spends, so they are unit-tested without a Studio.
 */

/** Two rounds, like the materialize component repair. Past that, the gate fails as it always did. */
export const MAX_MODULE_COMPILE_REPAIRS = 2;

export interface CfeCompileRepairSlot {
  /** mls ref of the generated `.ts` to regenerate. */
  ref: string;
  /** mls ref of the defs that OWNS it — the slot arg `agentCfeMaterializeGen` needs. */
  defPath: string;
  /** Set for an organism of a split page: which pipeline item of that defs to rebuild. */
  itemId?: string;
  /** The file's own tsc errors, verbatim and in order. */
  errors: string[];
}

export interface CfeCompileRepairPlan {
  slots: CfeCompileRepairSlot[];
  /** Files with errors that NO defs owns — nothing can regenerate them, so they still fail the gate. */
  unowned: Array<{ ref: string; errors: string[] }>;
}

/**
 * `compileModuleClosure` prefixes every diagnostic with `${ref}: `, so the ref is the grouping key. An
 * error that does not carry a ref is kept under '' and treated as unowned: it is real and must not
 * disappear, but there is no file to hand a slot.
 */
/**
 * `.test.ts` findings are declared, never blocking: the file does not ship. Detectors still run
 * (the diagnostic is named in the trace); only the aftermath changes.
 */
export function partitionModuleCompileErrors(errors: readonly string[]): { blocking: string[]; declared: string[] } {
  const blocking: string[] = [];
  const declared: string[] = [];
  for (const error of errors) {
    if (compileErrorRef(error).endsWith('.test.ts')) declared.push(error);
    else blocking.push(error);
  }
  return { blocking, declared };
}

/**
 * The mls ref an error points at, across the TWO diagnostic shapes the pipeline produces:
 * `compileModuleClosure` writes `_102047_/l2/…/x.ts: message`, while the per-item verify writes
 * `file://server/_102047_/l2/…/x.test.ts - TS2344 - message`. Reading only the first shape sent every
 * verify diagnostic to the same bucket — including a shipped .ts that does not compile, which must
 * block. The ref always opens the message, so the first occurrence is the owner.
 */
export function compileErrorRef(error: string): string {
  return /(_\d+_\/l\d+\/[^\s:]+?\.ts)/su.exec(error)?.[1] ?? '';
}

export function groupModuleCompileErrors(errors: readonly string[]): Map<string, string[]> {
  const byRef = new Map<string, string[]>();
  for (const error of errors) {
    const match = /^(_\d+_\/l\d+\/[^\s:]+?\.ts):\s*(.*)$/su.exec(error);
    const ref = match ? match[1] : '';
    const rest = match ? match[2] : error;
    byRef.set(ref, [...(byRef.get(ref) ?? []), rest]);
  }
  return byRef;
}

/**
 * The defs that owns a generated page `.ts`. An organism (`x_O2.ts`) is a pipeline ITEM of its page's
 * defs, not a defs of its own — that is why the slot needs `itemId` (a repair slot without it rewrote
 * the FIRST organism's file instead of the broken one).
 */
export function defsRefForGeneratedTs(ref: string): { defPath: string; itemId?: string } | null {
  const organism = /^(.*?)_O(\d+)\.ts$/su.exec(ref);
  if (organism) return { defPath: `${organism[1]}.defs.ts`, itemId: `O${organism[2]}` };
  if (!ref.endsWith('.ts') || ref.endsWith('.defs.ts') || ref.endsWith('.test.ts')) return null;
  return { defPath: ref.replace(/\.ts$/u, '.defs.ts') };
}

/**
 * One slot per FILE, and only for files this module can actually regenerate.
 *
 * The gate compiles every generated `.ts` of the module, including files this run never touched — its own
 * message says so. A file with no defs on disk has no pipeline item to hand a slot to, so fanning one out
 * for it would burn a call that cannot converge; it goes to `unowned` and keeps failing the gate, named.
 *
 * @param defsExists asks whether a defs ref is on disk. Injected so this stays pure.
 */
export function planModuleCompileRepair(
  errors: readonly string[],
  defsExists: (defPath: string) => boolean,
): CfeCompileRepairPlan {
  const slots: CfeCompileRepairSlot[] = [];
  const unowned: Array<{ ref: string; errors: string[] }> = [];
  for (const [ref, fileErrors] of groupModuleCompileErrors(errors)) {
    const owner = ref ? defsRefForGeneratedTs(ref) : null;
    if (!owner || !defsExists(owner.defPath)) {
      unowned.push({ ref: ref || '(no file)', errors: fileErrors });
      continue;
    }
    slots.push({ ref, defPath: owner.defPath, ...(owner.itemId ? { itemId: owner.itemId } : {}), errors: fileErrors });
  }
  // Deterministic order so a re-run of the same failure plans the same round.
  slots.sort((a, b) => a.ref.localeCompare(b.ref));
  unowned.sort((a, b) => a.ref.localeCompare(b.ref));
  return { slots, unowned };
}

/**
 * The args of one repair slot. Compact BY CONTRACT: `agentCfeMaterializeGen` recomputes the compiler
 * errors from disk when `attempt >= 2`, so the errors never travel in a step prompt (the 400KB lesson of
 * 16/jul — repair goes in fan-out, raw data never in the parent's prompt).
 */
export function compileRepairSlotArgs(slot: CfeCompileRepairSlot, planId: string, attempt: number): string {
  return JSON.stringify({
    planId,
    defPath: slot.defPath,
    ...(slot.itemId ? { itemId: slot.itemId } : {}),
    attempt,
  });
}

/** What the trace says about a round, whether it converged or not. */
export function describeCompileRepairPlan(plan: CfeCompileRepairPlan, attempt: number): string {
  const parts = [`repair round ${attempt}: ${plan.slots.length} file(s) queued`];
  if (plan.unowned.length > 0) {
    const names = plan.unowned.map(entry => entry.ref).slice(0, 8).join(', ');
    const more = plan.unowned.length > 8 ? ` (+${plan.unowned.length - 8} more)` : '';
    parts.push(`${plan.unowned.length} file(s) NOT repairable (no defs on disk — not produced by this pipeline): ${names}${more}`);
  }
  return parts.join('; ');
}
