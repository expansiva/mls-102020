/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/templateContext.ts" enhancement="_102020_/l2/enhancementAura"/>

import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';

export type D2TemplatePage = 'page11' | 'page21' | 'page31';
export type D2TemplateRole = 'category' | 'style-global' | 'style-category' | 'layout';

export interface D2TemplateFile {
  reference: string;
  role: D2TemplateRole;
  categoryRef?: string;
  styleId?: string;
  layoutId?: string;
}

export interface D2TemplateDiscovery {
  categoryCatalog: string | null;
  files: D2TemplateFile[];
}

export interface D2TemplatePort {
  discover(explicitCatalogProject?: number | null): Promise<D2TemplateDiscovery>;
  readText(reference: string): Promise<string | null>;
}

export interface D2TemplateCapabilities {
  dataDeclared: boolean;
  measureDeclared: boolean;
  sectionSaveCommandDeclared: boolean;
}

export interface D2TemplateSelectionRequest {
  catalogProject?: number | null;
  categoryRef: string;
  orientationPage: Exclude<D2TemplatePage, 'page11'>;
  targetPage: D2TemplatePage;
  preference?: string | null;
  layoutPreference?: string | null;
  capabilities: D2TemplateCapabilities;
  requirements?: Partial<D2TemplateCapabilities>;
}

export interface D2TemplateSource {
  role: D2TemplateRole | 'category-catalog-entry';
  reference: string;
  sha256: string;
  content: string;
}

export interface D2TemplateSelection {
  categoryRef: string;
  experiencePage: D2TemplatePage | null;
  experienceId: string | null;
  styleId: string | null;
  layoutId: string | null;
  targetPage: D2TemplatePage;
  reason: string;
  requirementsMet: string[];
  sources: D2TemplateSource[];
  context: string;
  digest: string;
}

export async function selectD2Template(
  port: D2TemplatePort,
  request: D2TemplateSelectionRequest,
): Promise<D2TemplateSelection> {
  const discovery = await port.discover(request.catalogProject);
  if (!discovery.categoryCatalog) throw new Error('D2_TEMPLATE_CATEGORY_CATALOG_MISSING');
  const rawCatalog = await port.readText(discovery.categoryCatalog);
  if (!rawCatalog) throw new Error(`D2_TEMPLATE_CATEGORY_CATALOG_UNREADABLE: ${discovery.categoryCatalog}`);
  const catalog = parseCatalog(rawCatalog);
  const category = catalog.categories.find(item => item.categoryId === request.categoryRef);
  if (!category) throw new Error(`D2_TEMPLATE_CATEGORY_UNKNOWN: ${request.categoryRef}`);
  const experiencePage: D2TemplatePage = request.targetPage === 'page11' && category.experiences?.page11 ? 'page11' : request.orientationPage;
  const experienceId = category.experiences?.[experiencePage] ?? null;
  const categoryFile = experienceId ? discovery.files.find(file => file.role === 'category' && file.categoryRef === request.categoryRef && file.reference.endsWith(`/${experiencePage}.md`)) : undefined;
  const categoryCompatible = compatible(category, experienceId, request.capabilities, request.requirements);
  const useCategory = Boolean(categoryFile && categoryCompatible);
  let styleId = request.preference?.trim() || null;
  let styleCandidates = styleId ? discovery.files.filter(file => file.styleId === styleId && (file.role === 'style-global' || (file.role === 'style-category' && file.categoryRef === request.categoryRef))) : [];
  if (!styleId && request.layoutPreference?.trim()) {
    const layoutStyles = [...new Set(discovery.files.filter(file => file.role === 'layout' && file.categoryRef === request.categoryRef && file.layoutId === request.layoutPreference?.trim()).map(file => file.styleId).filter((value): value is string => Boolean(value)))];
    if (layoutStyles.length > 1) throw new Error(`D2_TEMPLATE_LAYOUT_AMBIGUOUS: ${request.layoutPreference} (${layoutStyles.join(', ')})`);
    styleId = layoutStyles[0] ?? null;
    styleCandidates = styleId ? discovery.files.filter(file => file.styleId === styleId && (file.role === 'style-global' || (file.role === 'style-category' && file.categoryRef === request.categoryRef))) : [];
  }
  const styleProviders = [...new Set(styleCandidates.filter(file => file.role === 'style-category').map(file => projectFromReference(file.reference)).filter((project): project is number => project !== null))];
  if (styleProviders.length > 1) throw new Error(`D2_TEMPLATE_STYLE_AMBIGUOUS: ${styleId} (${styleProviders.join(', ')})`);
  const styleFiles = styleProviders.length ? styleCandidates.filter(file => projectFromReference(file.reference) === styleProviders[0]) : [];
  const styleCompatible = styleId !== null && styleFiles.some(file => file.role === 'style-category') && categoryCompatible;
  const layoutPreference = request.layoutPreference?.trim() || null;
  const chosenLayout = layoutPreference && styleProviders.length ? discovery.files.find(file => file.role === 'layout' && file.styleId === styleId && projectFromReference(file.reference) === styleProviders[0] && file.categoryRef === request.categoryRef && file.layoutId === layoutPreference) : undefined;
  const styleRequested = styleCompatible && (!layoutPreference || Boolean(chosenLayout));
  const selectedFiles = [
    ...(useCategory && categoryFile ? [categoryFile] : []),
    ...(styleRequested ? styleFiles.filter(file => file.role === 'style-global' || file.role === 'style-category') : []),
    ...(styleRequested && chosenLayout ? [chosenLayout] : []),
  ];
  const categoryEntry = JSON.stringify(category, null, 2);
  const loadedSources: D2TemplateSource[] = [];
  for (const file of selectedFiles) {
    const content = await port.readText(file.reference);
    if (!content?.trim()) continue;
    loadedSources.push({ role: file.role, reference: file.reference, sha256: await sha256Text(content), content });
  }
  const useStyle = styleRequested && loadedSources.some(source => source.role === 'style-category') && (!layoutPreference || loadedSources.some(source => source.role === 'layout'));
  const sources: D2TemplateSource[] = [
    { role: 'category-catalog-entry', reference: discovery.categoryCatalog, sha256: await sha256Text(categoryEntry), content: categoryEntry },
    ...loadedSources.filter(source => source.role === 'category' || useStyle),
  ];
  if (useCategory && !sources.some(source => source.role === 'category')) throw new Error(`D2_TEMPLATE_CATEGORY_MISSING: ${request.categoryRef}/${request.orientationPage}`);
  const requirementsMet = requirements(category, experienceId, request.capabilities, request.requirements);
  const usedExperienceId = sources.some(source => source.role === 'category') ? experienceId : null;
  const layoutId = useStyle && chosenLayout ? chosenLayout.layoutId ?? null : null;
  const preferenceReason = styleId
    ? useStyle ? `Explicit style preference '${styleId}'${layoutPreference ? ` and layout preference '${layoutPreference}'` : ''} have concrete compatible templates.` : `Explicit style/layout preference '${styleId}'${layoutPreference ? ` / '${layoutPreference}'` : ''} has no compatible concrete template; used the category guidance.`
    : 'No explicit style preference; used the category guidance.';
  const reason = `${preferenceReason} Selected ${usedExperienceId ? `${experiencePage} experience '${usedExperienceId}'` : 'category guidance'} for ${request.targetPage}.`;
  const context = JSON.stringify({ selectedPageTemplate: {
    categoryRef: request.categoryRef,
    targetPage: request.targetPage,
    experiencePage: usedExperienceId ? experiencePage : null,
    experienceId: usedExperienceId,
    styleId: useStyle ? styleId : null,
    layoutId,
    reason,
    requirementsMet,
    sources: sources.map(({ role, reference, sha256, content }) => ({ role, reference, sha256, content })),
  } }, null, 2);
  return {
    categoryRef: request.categoryRef,
    experiencePage: usedExperienceId ? experiencePage : null,
    experienceId: usedExperienceId,
    styleId: useStyle ? styleId : null,
    layoutId,
    targetPage: request.targetPage,
    reason,
    requirementsMet,
    sources,
    context,
    digest: await sha256Text(JSON.stringify({ categoryEntry: await sha256Text(categoryEntry), sources: sources.filter(source => source.role !== 'category-catalog-entry').map(({ reference, sha256 }) => ({ reference, sha256 })) })),
  };
}

function compatible(category: Category, experienceId: string | null, capabilities: D2TemplateCapabilities, required: Partial<D2TemplateCapabilities> = {}): boolean {
  const requirements = category.minimumRequired;
  if (typeof requirements?.query?.minCount === 'number' && requirements.query.minCount > 0 && !capabilities.dataDeclared) return false;
  if (requirements?.itemFields?.measure === 'number' && !capabilities.measureDeclared) return false;
  if (experienceId === 'recordPageTabs' && !capabilities.sectionSaveCommandDeclared) return false;
  if (required.dataDeclared && !capabilities.dataDeclared) return false;
  if (required.measureDeclared && !capabilities.measureDeclared) return false;
  if (required.sectionSaveCommandDeclared && !capabilities.sectionSaveCommandDeclared) return false;
  return true;
}

function requirements(category: Category, experienceId: string | null, capabilities: D2TemplateCapabilities, required: Partial<D2TemplateCapabilities> = {}): string[] {
  const met: string[] = [];
  const minimum = category.minimumRequired;
  if (typeof minimum?.query?.minCount === 'number' && (capabilities.dataDeclared || minimum.query.minCount === 0)) met.push(`declared query count meets ${minimum.query.minCount}`);
  if (minimum?.itemFields?.measure === 'number' && capabilities.measureDeclared) met.push('declared item measure');
  if (experienceId === 'recordPageTabs' && capabilities.sectionSaveCommandDeclared) met.push('section save command declared');
  if (required.dataDeclared && capabilities.dataDeclared) met.push('page data declared');
  if (required.measureDeclared && capabilities.measureDeclared) met.push('page measure declared');
  if (required.sectionSaveCommandDeclared && capabilities.sectionSaveCommandDeclared) met.push('section save command declared');
  return [...new Set(met)];
}

interface Category {
  categoryId: string;
  name?: string;
  description?: string;
  experiences?: Partial<Record<D2TemplatePage, string>>;
  skillReference?: string;
  minimumRequired?: {
    query?: { minCount?: number };
    itemFields?: { measure?: unknown };
  };
}

function parseCatalog(raw: string): { categories: Category[] } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { throw new Error('D2_TEMPLATE_CATEGORY_CATALOG_INVALID'); }
  if (!parsed || typeof parsed !== 'object' || !Array.isArray((parsed as { categories?: unknown }).categories)) throw new Error('D2_TEMPLATE_CATEGORY_CATALOG_INVALID');
  return parsed as { categories: Category[] };
}

function projectFromReference(reference: string): number | null {
  const match = /^_(\d+)_\//.exec(reference);
  return match ? Number(match[1]) : null;
}
