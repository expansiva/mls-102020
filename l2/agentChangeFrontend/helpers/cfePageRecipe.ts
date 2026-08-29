/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfePageRecipe.ts" enhancement="_blank"/>

/**
 * Recipe-per-category: which genomes to generate, how their defs look, whether the experience
 * skill is attached, whether to split by organism from the start.
 *
 * Default (no `variants:all`): one genome. contentLanding → page11 (prose + skill). Every other
 * category → page31 / goal-first (measured winner on 102045/clientManagement, 31/jul: page31 >
 * page21 > page11, reduced defs + skill beat a complete defs). `variants:all` restores the three
 * exploration slots. Management slots stay byte-identical to the previous three-slot plan.
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

const MANAGEMENT_SLOTS: PageSlotRecipe[] = [
  { genome: 'page11', defsFormat: 'prose', templateMode: 'pinned', attachExperienceSkill: false, splitByOrganism: false },
  { genome: 'page21', defsFormat: 'object', templateMode: 'goal-first', attachExperienceSkill: true, splitByOrganism: false },
  { genome: 'page31', defsFormat: 'object', templateMode: 'goal-first', attachExperienceSkill: true, splitByOrganism: false },
];

function contentSlot(genome: string): PageSlotRecipe {
  return { genome, defsFormat: 'prose', templateMode: 'pinned', attachExperienceSkill: true, splitByOrganism: true };
}

const CONTENT_SLOTS: PageSlotRecipe[] = ['page11', 'page21', 'page31'].map(contentSlot);

export function isUxVariantsToken(token: string): boolean {
  return /^\/?variants[=:]all$/i.test(String(token || '').trim());
}

export function parseUxVariantsMode(tokens: string[]): UxVariantsMode {
  return tokens.some(isUxVariantsToken) ? 'all' : 'default';
}

export function pageSlotRecipes(categoryRef: string, variants: UxVariantsMode = 'default'): PageSlotRecipe[] {
  const all = categoryRef === CONTENT_LANDING_CATEGORY ? CONTENT_SLOTS : MANAGEMENT_SLOTS;
  if (variants === 'all') return all;
  return categoryRef === CONTENT_LANDING_CATEGORY ? [CONTENT_SLOTS[0]] : [MANAGEMENT_SLOTS[2]];
}

export function pageSlotRecipe(categoryRef: string, genome: string): PageSlotRecipe {
  const all = categoryRef === CONTENT_LANDING_CATEGORY ? CONTENT_SLOTS : MANAGEMENT_SLOTS;
  return all.find(slot => slot.genome === genome) || all[0];
}

/** Unsuffixed route uses page11 when it exists; otherwise the first remaining genome. */
export function primaryGenomeOf(existing: string[]): string {
  if (existing.includes('page11')) return 'page11';
  return existing[0] || 'page11';
}
