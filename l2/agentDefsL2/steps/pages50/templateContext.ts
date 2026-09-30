/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/templateContext.ts" enhancement="_blank"/>

import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import { deriveD2Page11Experience, type D2Page11Category } from '/_102020_/l2/agentDefsL2/helpers/page11Gate.js';

export interface D2PageTemplateContext {
  categories: D2Page11Category[];
  catalog: string;
  catalogHash: string;
  templatePaths: Set<string>;
  select(category: string): Promise<{ experience: string; reason: string; reference: string | null; content: string; hash: string }>;
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
  return {
    categories, catalog, catalogHash: await sha256Text(catalog), templatePaths,
    async select(category) {
      const experience = deriveD2Page11Experience(category, categories);
      if (experience === 'none') return { experience, reason: 'No published page11 or page21 experience applies.', reference: null, content: '', hash: await sha256Text('none') };
      const key = categories.find(item => item.categoryId === category)?.experiences?.page11 ? 'page11' : 'page21';
      const reference = `_102020_/l4/collabux/templates/${category}/${key}.md`;
      let content: string;
      try { content = await readSourceText({ project: 102020, level: 4, folder: `collabux/templates/${category}`, shortName: key, extension: '.md' }); }
      catch { throw new Error(`D2_PAGE11_TEMPLATE_MISSING: ${reference}`); }
      if (!content.trim()) throw new Error(`D2_PAGE11_TEMPLATE_MISSING: ${reference}`);
      return { experience, reason: `Derived ${experience} from ${category}.${key}.`, reference, content, hash: await sha256Text(content) };
    },
  };
}
