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
