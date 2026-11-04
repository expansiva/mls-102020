/// <mls fileReference="_102020_/l2/aura/molecules/shared/configuration.ts" enhancement="_blank"/>

// Typed configuration for each molecule group — the properties that are decided when designing the
// page and written as literal attributes (size="sm", data-variant="ghost").
//
// WHY THIS FILE EXISTS
// The group contracts carry a "Configuration" table in Markdown that the LLM reads when generating
// molecules. That text is authoritative for generation but cannot support reliable extraction: open
// lists are read as closed, page-state props mix with visual ones, attribute names may differ from
// property names. Rather than parsing the table at runtime, each group ships a hand-written
// `configuration.ts` next to `creation.ts`, and this file holds the shared type and two helpers.
//
// The Markdown table in the contract continues unchanged — it is what the LLM reads. A test in
// `configuration.test.ts` keeps the two in sync.

export interface IMoleculeConfigProp {
  /** Lit property name, or the attribute itself when it is not a Lit property (`data-variant`). */
  property: string;
  /** Only when the HTML attribute name differs from the Lit property name: `icon-position`, `data-variant`. */
  attribute?: string;
  type: 'enum' | 'boolean' | 'number' | 'text';
  /** `enum` only: the CLOSED list. A value outside it the molecule does not understand. */
  values?: readonly string[];
  /** What the molecule uses when the attribute is absent. `null` = no default. */
  default: string | number | boolean | null;
  /**
   * The default of a molecule that differs from the group's, by tag: `ml-enter-money-br` uses `BRL`
   * where its group uses `USD`. Absent = every tag uses `default`. Guarded against each molecule's
   * own declaration in `configuration.test.ts`.
   */
  defaults?: Readonly<Record<string, string | number | boolean | null>>;
  /** `text` only: suggestions for the editor field — NOT a restriction (`autocomplete`, `mask`). */
  examples?: readonly string[];
  /** `number` only. */
  min?: number;
  max?: number;
  /** Only these tags within the group read this property. Absent = all tags. */
  only?: readonly string[];
}

/**
 * Returns the configuration for a group, loaded on-demand from the group's own `configuration.ts`.
 * Returns an empty list when the group has no file — no error, no throw.
 */
export async function loadGroupConfiguration(group: string): Promise<readonly IMoleculeConfigProp[]> {
  try {
    const mod = await import(`/_102020_/l2/aura/molecules/skills/${group}/configuration.js`);
    return Array.isArray(mod.configuration) ? mod.configuration : [];
  } catch {
    return [];
  }
}

/**
 * Filters a configuration list to only the entries visible from a given molecule tag, each with the
 * default THAT tag uses (`defaults[tag]` when declared). An entry with no `only` constraint is always
 * included.
 */
export function configurationFor(
  tag: string,
  list: readonly IMoleculeConfigProp[],
): readonly IMoleculeConfigProp[] {
  return list
    .filter((prop) => !prop.only || prop.only.includes(tag))
    .map((prop) => (prop.defaults && tag in prop.defaults ? { ...prop, default: prop.defaults[tag] } : prop));
}

/** The default a given tag uses for a property: its own when declared, the group's otherwise. */
export function defaultFor(prop: IMoleculeConfigProp, tag: string): IMoleculeConfigProp['default'] {
  return prop.defaults && tag in prop.defaults ? prop.defaults[tag] : prop.default;
}

// ─── Slot order ──────────────────────────────────────────────────────────────
//
// Which slots of a group can be REORDERED in the Studio, and which ones move together. Declared here,
// per group, because it is a design decision of the molecule the Studio cannot guess: a table pairs its
// header with the cell at the same position in every row (`TableHead` 2 is the column of the 2nd
// `TableCell`), so moving only the header would swap the title and leave the content behind.
//
// Opt-in: a slot that is not listed is never offered a move. A group without `slotOrder` has none.

export interface IMoleculeSlotOrder {
  /** A slot whose order among its same-name siblings is what the molecule shows (a column, a tab, a step). */
  slot: string;
  /**
   * Slots matched to it BY POSITION, moved with it: the one at the same index among its same-name
   * siblings inside each `within` element (each `TableRow` that holds `TableCell`s).
   */
  pairs?: readonly { slot: string; within: string }[];
  /** Only these tags of the group. Absent = all tags. */
  only?: readonly string[];
}

/**
 * The slot order of a group, loaded on demand from its `configuration.ts` (`export const slotOrder`).
 * A group without the file or without the export answers an empty list — no error, no throw.
 */
export async function loadGroupSlotOrder(group: string): Promise<readonly IMoleculeSlotOrder[]> {
  try {
    const mod = await import(`/_102020_/l2/aura/molecules/skills/${group}/configuration.js`);
    return Array.isArray(mod.slotOrder) ? mod.slotOrder : [];
  } catch {
    return [];
  }
}

/** The entries a given molecule tag reads: the ones with no `only`, and the ones that name it. */
export function slotOrderFor(tag: string, list: readonly IMoleculeSlotOrder[]): readonly IMoleculeSlotOrder[] {
  return list.filter((entry) => !entry.only || entry.only.includes(tag));
}
