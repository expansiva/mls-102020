/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/categoryContext.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

export const D2_PAGE_TECHNICAL_SKILL = '_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts';
export const D2_PAGE_CATEGORY_SKILL_FOLDER = '_102020_/l2/agentDefsL2/skills/pageCategories';
export const D2_PAGE_CATEGORY_CATALOG = '_102020_/l4/collabux/templates/categoryList.json';

export interface D2PageSkillPort { readText(reference: string): Promise<string | null>; }
export interface D2PageCategoryEntry { categoryRef: string; name: string; meaning: string; skillReference: string; }
export interface D2PageSkillsContext {
  categories: D2PageCategoryEntry[];
  context: string;
  catalogHash: string;
  skillHashes: Record<string, string>;
  contextHash: string;
}

export async function buildD2PageSkillsContext(port: D2PageSkillPort): Promise<D2PageSkillsContext> {
  const raw = await port.readText(D2_PAGE_CATEGORY_CATALOG);
  if (!raw) throw new Error(`D2_PAGE_CATEGORY_CATALOG_MISSING: ${D2_PAGE_CATEGORY_CATALOG}`);
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error(`D2_PAGE_CATEGORY_CATALOG_INVALID: ${D2_PAGE_CATEGORY_CATALOG}`); }
  const rows = record(parsed).categories;
  if (!Array.isArray(rows)) throw new Error('D2_PAGE_CATEGORY_CATALOG_INVALID: categories');
  const categories = rows.map(rawCategory => {
    const item = record(rawCategory); const categoryRef = text(item.categoryId);
    if (!categoryRef || !text(item.name) || !text(item.description)) throw new Error('D2_PAGE_CATEGORY_CATALOG_INVALID: category fields');
    return { categoryRef, name: text(item.name), meaning: text(item.description), skillReference: categorySkillReference(categoryRef) };
  });
  if (categories.length !== 33) throw new Error(`D2_PAGE_CATEGORY_COUNT: ${categories.length}`);
  assertUnique(categories.map(item => item.categoryRef), 'D2_PAGE_CATEGORY_DUPLICATE');
  categories.push({ categoryRef: 'bespoke', name: 'Bespoke', meaning: 'No published category fits the page capabilities; the judgment must explain why.', skillReference: categorySkillReference('bespoke') });
  const references = [D2_PAGE_TECHNICAL_SKILL, ...categories.map(item => item.skillReference)];
  assertUnique(references, 'D2_PAGE_SKILL_DUPLICATE');
  const skillHashes: Record<string, string> = {};
  for (const reference of references) {
    const content = await port.readText(reference);
    if (!content?.trim()) throw new Error(`D2_PAGE_SKILL_MISSING: ${reference}`);
    skillHashes[reference] = await sha256Text(content);
  }
  const catalogHash = await sha256Text(raw);
  const context = JSON.stringify({ pageCategories: { instruction: 'Choose exactly one categoryRef for the page, or bespoke with an explicit reason.', categories: categories.map(({ categoryRef, name, meaning }) => ({ categoryRef, name, meaning })) } }, null, 2);
  const contextHash = await sha256Text(JSON.stringify({ catalogHash, skillHashes }));
  return { categories, context, catalogHash, skillHashes, contextHash };
}

export function categorySkillReference(categoryRef: string): string {
  if (!/^[a-z][A-Za-z0-9]*$/.test(categoryRef)) throw new Error(`D2_PAGE_CATEGORY_ID_INVALID: ${categoryRef}`);
  return `${D2_PAGE_CATEGORY_SKILL_FOLDER}/${categoryRef}.md`;
}

export function resolveD2PageCategory(context: D2PageSkillsContext, categoryRef: string): D2PageCategoryEntry {
  const found = context.categories.find(item => item.categoryRef === categoryRef);
  if (!found) throw new Error(`D2_PAGE_CATEGORY_UNKNOWN: ${categoryRef}`);
  return found;
}

export async function d2PageUnitContextHash(context: D2PageSkillsContext, categoryRef: string): Promise<string> {
  const category = resolveD2PageCategory(context, categoryRef);
  return sha256Text(JSON.stringify({ catalogHash: context.catalogHash, technicalSkillHash: context.skillHashes[D2_PAGE_TECHNICAL_SKILL], categorySkillHash: context.skillHashes[category.skillReference] }));
}

function assertUnique(values: string[], code: string): void { const seen = new Set<string>(); for (const value of values) { if (seen.has(value)) throw new Error(`${code}: ${value}`); seen.add(value); } }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function text(value: unknown): string { return typeof value === 'string' ? value.trim() : ''; }
