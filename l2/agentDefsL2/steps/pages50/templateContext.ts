/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/templateContext.ts" enhancement="_blank"/>

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { deriveD2Page11CategoryReference, deriveD2Page11Experience, d2Page11TemplateOptions, type D2Page11Category, type D2Page11TemplateOption } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';

export interface D2PageSelectedTemplate { experience: string; reason: string; reference: string | null; content: string; hash: string }
export interface D2PageTemplateContext {
  categories: D2Page11Category[];
  catalog: string;
  catalogHash: string;
  templatePaths: Set<string>;
  /** Per category, the templates a page11 may use: the default first, then the experienceIndex.json alternatives. */
  templateOptions?: ReadonlyMap<string, readonly D2Page11TemplateOption[]>;
  /** The category default, or `reference` when it is an allowed template of that category (a kept user choice). */
  select(category: string, reference?: string | null): Promise<D2PageSelectedTemplate>;
}

export async function loadD2PageTemplateContext(): Promise<D2PageTemplateContext> {
  const catalog = await readSourceText({ project: 102020, level: 4, folder: 'collabux/templates', shortName: 'categoryList', extension: '.json' });
  const parsed = JSON.parse(catalog) as { categories?: D2Page11Category[] };
  if (!Array.isArray(parsed.categories)) throw new Error('D2_PAGE11_CATEGORY_CATALOG_INVALID');
  const categories = parsed.categories;
  const templatePaths = new Set<string>();
  for (const item of categories) {
    const key = item.experiences?.page11 ? 'page11' : item.experiences?.page21 ? 'page21' : '';
    if (key) templatePaths.add(`templates/${item.categoryId}/${key}.md`);
  }
  // The experience index lists the alternatives a user may pick; without it only the defaults are allowed.
  let index: unknown = null;
  try { index = JSON.parse(await readSourceText({ project: 102020, level: 4, folder: 'collabux/templates', shortName: 'experienceIndex', extension: '.json' })); }
  catch { index = null; }
  const templateOptions = d2Page11TemplateOptions(categories, index);
  return {
    categories, catalog, catalogHash: await sha256Text(catalog), templatePaths, templateOptions,
    async select(category, reference) {
      const experience = deriveD2Page11Experience(category, categories);
      if (category === 'bespoke') return { experience, reason: 'No published page11 or page21 experience applies.', reference: null, content: '', hash: await sha256Text('none') };
      const kept = reference ? templateOptions.get(category)?.find(option => !option.isDefault && option.reference === reference) : undefined;
      if (kept) {
        const content = await readTemplate(category, kept.shortName, kept.reference);
        return { experience: kept.experience, reason: `Kept the approved ${kept.experience} (${category}/${kept.shortName}.md).`, reference: kept.reference, content, hash: await sha256Text(content) };
      }
      const key = categories.find(item => item.categoryId === category)?.experiences?.page11 ? 'page11' : 'page21';
      const defaultReference = deriveD2Page11CategoryReference(category, categories);
      const content = await readTemplate(category, key, defaultReference);
      return { experience, reason: `Derived ${experience} from ${category}.${key}.`, reference: defaultReference, content, hash: await sha256Text(content) };
    },
  };
}

async function readTemplate(category: string, shortName: string, reference: string): Promise<string> {
  let content: string;
  try { content = await readSourceText({ project: 102020, level: 4, folder: `collabux/templates/${category}`, shortName, extension: '.md' }); }
  catch { throw new Error(`D2_PAGE11_TEMPLATE_MISSING: ${reference}`); }
  if (!content.trim()) throw new Error(`D2_PAGE11_TEMPLATE_MISSING: ${reference}`);
  return content;
}
