/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageRecipe.ts" enhancement="_blank"/>

/**
 * Category chooses the template of page21/page31 (`templateMode` / experience skill).
 * It does not choose genome and does not reduce the set of screens: the three genomes are always
 * three full-app proposals.
 */

export type UxVariantsMode = 'default' | 'all';
export type PageDefsFormat = 'prose' | 'object';
export type PageTemplateMode = 'pinned' | 'goal-first';

export const CONTENT_LANDING_CATEGORY = 'contentLanding';

export interface PageSlotRecipe {
  genome: string;
  defsFormat: PageDefsFormat;
  templateMode: PageTemplateMode;
  attachExperienceSkill: boolean;
  splitByOrganism: boolean;
}

const GENOMES = ['page11', 'page21', 'page31'] as const;

function slot(genome: (typeof GENOMES)[number], categoryRef: string): PageSlotRecipe {
  const content = categoryRef === CONTENT_LANDING_CATEGORY;
  const page11 = genome === 'page11';
  return {
    genome,
    defsFormat: 'prose',
    templateMode: content || page11 ? 'pinned' : 'goal-first',
    attachExperienceSkill: content || !page11,
    splitByOrganism: false,
  };
}

export function isUxVariantsToken(token: string): boolean {
  return /^\/?variants[=:]all$/i.test(String(token || '').trim());
}

export function parseUxVariantsMode(tokens: string[]): UxVariantsMode {
  return tokens.some(isUxVariantsToken) ? 'all' : 'default';
}

/** Always the three genomes. `variants` is accepted and ignored — the CLI still parses `variants:all`. */
export function pageSlotRecipes(categoryRef: string, _variants: UxVariantsMode = 'default'): PageSlotRecipe[] {
  return GENOMES.map(genome => slot(genome, categoryRef));
}

export function pageSlotRecipe(categoryRef: string, genome: string): PageSlotRecipe {
  const all = pageSlotRecipes(categoryRef);
  return all.find(slot => slot.genome === genome) || all[0];
}

/** Unsuffixed route uses page11 when it exists; otherwise the first remaining genome. */
export function primaryGenomeOf(existing: string[]): string {
  if (existing.includes('page11')) return 'page11';
  return existing[0] || 'page11';
}
