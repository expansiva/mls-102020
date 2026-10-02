/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/page11Gate.ts" enhancement="_blank"/>

import { resolvableFieldPaths } from '/_102035_/l2/solution/ontologyPaths.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2Page11Definition, type D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';

export interface D2Page11Category { categoryId: string; experiences?: { page11?: string; page21?: string } }
export interface D2Page11MenuNode { id: string; kind: string; organisms?: Array<{ kind: string; text: string }>; children?: D2Page11MenuNode[] }
export interface D2Page11Menu { tree: D2Page11MenuNode[]; authorities: Record<string, string[]> }
export interface D2Page11Write { entity: string; operation: string; transitionRef?: string }
export interface D2Page11NeedPage { pageId: string; actors: string[]; writes: D2Page11Write[] }
export interface D2Page11AccessGrant { actorRef: string; entityRefs: string[]; disclosure: { mode: string; allowedFields?: string[]; deniedFields?: string[] } }
export interface D2Page11GateSources {
  pageId: string;
  actor: string;
  menu: D2Page11Menu;
  needsPages: D2Page11NeedPage[];
  entities: Record<string, Ns5OntologyAnyEntity>;
  access: { grants: D2Page11AccessGrant[] };
  categories: D2Page11Category[];
  templatePaths: ReadonlySet<string>;
  moleculeTags: ReadonlySet<string>;
  promptTokens?: number;
}
export interface D2Page11Issue { code: string; path: string; message: string }

export function deriveD2Page11Experience(category: string, categories: readonly D2Page11Category[]): string {
  if (category === 'bespoke') return 'none';
  const entry = categories.find(item => item.categoryId === category);
  if (!entry) throw new Error(`D2_PAGE11_CATEGORY_UNKNOWN: ${category}`);
  return entry.experiences?.page11 ?? entry.experiences?.page21 ?? 'none';
}

export function deriveD2Page11CategoryReference(category: string, categories: readonly D2Page11Category[]): string {
  if (category === 'bespoke') return 'bespoke';
  const entry = categories.find(item => item.categoryId === category);
  if (!entry) throw new Error(`D2_PAGE11_CATEGORY_UNKNOWN: ${category}`);
  const key = entry.experiences?.page11 ? 'page11' : entry.experiences?.page21 ? 'page21' : null;
  if (!key) throw new Error(`D2_PAGE11_CATEGORY_UNPUBLISHED: ${category}`);
  return `_102020_/l4/collabux/templates/${category}/${key}.md`;
}

export function buildD2Page11WithExperience(value: unknown, categories: readonly D2Page11Category[]): D2Page11Definition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_PAGE11_TOOL_OBJECT');
  const root = value as Record<string, unknown>;
  const template = root.template;
  if (!template || typeof template !== 'object' || Array.isArray(template)) throw new Error('D2_PAGE11_TOOL_TEMPLATE');
  const templateRow = template as Record<string, unknown>;
  if (Object.keys(templateRow).join('\0') !== 'category' || typeof templateRow.category !== 'string') throw new Error('D2_PAGE11_TOOL_CATEGORY_ONLY');
  return buildD2Page11Definition({ ...root, template: { category: deriveD2Page11CategoryReference(templateRow.category, categories), experience: deriveD2Page11Experience(templateRow.category, categories) } });
}

export function gateD2Page11(value: unknown, draftValue: unknown, sources: D2Page11GateSources): D2Page11Issue[] {
  const issues: D2Page11Issue[] = [];
  let definition: D2Page11Definition;
  let draft: D2Page11Needs;
  try { definition = buildD2Page11Definition(value); } catch (error) { return [{ code: 'D2_PAGE11_FORMAT', path: 'definition', message: String(error) }]; }
  try { draft = buildD2Page11Needs(draftValue); } catch (error) { return [{ code: 'D2_PAGE11_NEEDS_FORMAT', path: 'page11Needs', message: String(error) }]; }
  const add = (code: string, path: string, message: string): void => { issues.push({ code, path, message }); };
  const sourcePage = findPage(sources.menu.tree, sources.pageId);
  if (!sourcePage) add('D2_PAGE11_PAGE_MISSING', 'menu', `Page ${sources.pageId} is absent from the menu.`);
  if (sourcePage && !actorsFor(sources.menu, sourcePage.path).has(sources.actor)) add('D2_PAGE11_ACTOR_DENIED', 'menu.authorities', `Actor ${sources.actor} cannot access page ${sources.pageId}.`);
  const expectedKinds = (sourcePage?.node.organisms ?? []).map(item => item.kind).sort();
  const actualKinds = Object.values(definition.organisms).map(item => item.kind).sort();
  if (expectedKinds.join('\0') !== actualKinds.join('\0')) add('D2_PAGE11_ORGANISMS_MENU', 'organisms', `Organism kinds/count differ from menu page ${sources.pageId}: expected ${expectedKinds.join(', ')}; got ${actualKinds.join(', ')}.`);
  const ids = Object.keys(definition.organisms);
  const placements = new Map<string, number>();
  const sectionIds = new Set<string>();
  for (const section of definition.sections) {
    if (sectionIds.has(section.id)) add('D2_PAGE11_SECTION_DUPLICATE', `sections.${section.id}`, `Section ${section.id} appears more than once.`);
    sectionIds.add(section.id);
    for (const id of section.organisms) {
      placements.set(id, (placements.get(id) ?? 0) + 1);
      if (!definition.organisms[id]) add('D2_PAGE11_SECTION_UNKNOWN', `sections.${section.id}`, `Section ${section.id} names unknown organism ${id}.`);
    }
  }
  for (const id of ids) if (placements.get(id) !== 1) add('D2_PAGE11_SECTION_COVERAGE', `organisms.${id}`, `Organism ${id} must occur in exactly one section; got ${placements.get(id) ?? 0}.`);
  for (const id of Object.keys(draft.organisms)) if (!definition.organisms[id]) add('D2_PAGE11_NEEDS_EXTRA', `page11Needs.organisms.${id}`, `Draft contains unknown organism ${id}.`);
  for (const id of ids) if (!draft.organisms[id]) add('D2_PAGE11_NEEDS_MISSING', `page11Needs.organisms.${id}`, `Draft is missing organism ${id}.`);
  const category = definition.template.category;
  const entry = sources.categories.find(item => (item.experiences?.page11 || item.experiences?.page21)
    && deriveD2Page11CategoryReference(item.categoryId, sources.categories) === category);
  if (category !== 'bespoke' && !entry) {
    add('D2_PAGE11_CATEGORY_UNKNOWN', 'template.category', `Category reference ${category} is absent from categoryList.json.`);
  } else {
    const expected = deriveD2Page11Experience(entry?.categoryId ?? 'bespoke', sources.categories);
    if (definition.template.experience !== expected) add('D2_PAGE11_EXPERIENCE_DERIVATION', 'template.experience', `Experience must be ${expected} for category ${category}.`);
    if (expected !== 'none') {
      const key = entry?.experiences?.page11 ? 'page11' : 'page21';
      const path = `templates/${entry!.categoryId}/${key}.md`;
      if (!sources.templatePaths.has(path)) add('D2_PAGE11_TEMPLATE_MISSING', 'template', `Selected template ${path} is absent.`);
    }
  }
  const currentNeeds = sources.needsPages.find(item => item.pageId === sources.pageId);
  if (!currentNeeds) add('D2_PAGE11_NEEDS_PAGE_MISSING', 'page11Needs', `Page ${sources.pageId} has no needs.json entry.`);
  else if (!currentNeeds.actors.includes(sources.actor)) add('D2_PAGE11_NEEDS_ACTOR', 'page11Needs', `Actor ${sources.actor} is absent from needs.json page ${sources.pageId}.`);
  const pageWrites = new Set((currentNeeds?.writes ?? []).map(writeKey));
  const coveredWrites = new Set<string>();
  const intentIds = new Set<string>();
  for (const [id, organism] of Object.entries(definition.organisms)) {
    const unit = draft.organisms[id];
    if (!unit) continue;
    if (unit.selects && !definition.organisms[unit.selects]) add('D2_PAGE11_SELECT_TARGET', `page11Needs.organisms.${id}.selects`, `Selection target ${unit.selects} is absent.`);
    const submitBindings = new Map<string, string>();
    for (const binding of unit.submits) {
      if (submitBindings.has(binding.intentId)) add('D2_PAGE11_SUBMIT_DUPLICATE', `page11Needs.organisms.${id}.submits`, `Submit ${binding.intentId} has duplicate bindings.`);
      submitBindings.set(binding.intentId, binding.write);
    }
    for (const intent of organism.intents) {
      if (intentIds.has(intent.id)) add('D2_PAGE11_INTENT_DUPLICATE', `organisms.${id}.intents`, `Intent ${intent.id} is duplicated.`);
      intentIds.add(intent.id);
      if (intent.kind === 'submit') {
        const write = submitBindings.get(intent.id);
        if (!write || !pageWrites.has(write)) add('D2_PAGE11_SUBMIT_WRITE', `organisms.${id}.intents.${intent.id}`, `Submit ${intent.id} has no matching page write in needs.json.`);
        else coveredWrites.add(write);
      } else {
        const target = findPage(sources.menu.tree, intent.to ?? '');
        if (!target) add('D2_PAGE11_NAVIGATE_PAGE', `organisms.${id}.intents.${intent.id}`, `Navigate target ${intent.to} is absent from the menu.`);
        else if (!actorsFor(sources.menu, target.path).has(sources.actor)) add('D2_PAGE11_NAVIGATE_ACTOR', `organisms.${id}.intents.${intent.id}`, `Actor ${sources.actor} cannot access target ${intent.to}.`);
        else {
          const targetWrites = new Set((sources.needsPages.find(item => item.pageId === intent.to)?.writes ?? []).map(writeKey));
          const delegated = [...pageWrites].filter(write => targetWrites.has(write));
          for (const write of delegated) coveredWrites.add(write);
        }
      }
    }
    for (const binding of unit.submits) if (!organism.intents.some(intent => intent.kind === 'submit' && intent.id === binding.intentId)) add('D2_PAGE11_SUBMIT_INVENTED', `page11Needs.organisms.${id}.submits`, `Binding ${binding.intentId} has no submit intent.`);
    for (const path of [...unit.reads, ...unit.edits]) {
      const entityId = path.split('.')[0];
      const entity = sources.entities[entityId];
      if (!entity || !resolvableFieldPaths(entity).includes(path)) add('D2_PAGE11_FIELD_UNKNOWN', `page11Needs.organisms.${id}`, `Path ${path} is absent from ontology entity ${entityId}.`);
      else if (!granted(path, sources.actor, sources.access.grants)) add('D2_PAGE11_FIELD_GRANT', `page11Needs.organisms.${id}`, `Actor ${sources.actor} has no disclosure grant for ${path}.`);
    }
  }
  issues.push(...d2Page11WriteDuplicates(draft));
  for (const write of pageWrites) if (!coveredWrites.has(write)) add('D2_PAGE11_WRITE_UNCOVERED', 'page11Needs.writes', `Write ${write} needs a submit or accessible navigate target declaring the write.`);
  for (const [id, choices] of Object.entries(definition.molecules)) {
    if (!definition.organisms[id]) add('D2_PAGE11_MOLECULE_ORGANISM', `molecules.${id}`, `Molecule target ${id} is absent.`);
    for (const choice of choices) for (const tag of [choice.preferred, choice.alternative].filter((item): item is string => !!item)) {
      if (!sources.moleculeTags.has(tag)) add('D2_PAGE11_MOLECULE_UNKNOWN', `molecules.${id}`, `Tag ${tag} is absent from the selected molecule index.`);
    }
  }
  if (sources.promptTokens !== undefined && (!Number.isSafeInteger(sources.promptTokens) || sources.promptTokens > 160000)) add('D2_PAGE11_PROMPT_LIMIT', 'promptTokens', `Decision prompt uses ${sources.promptTokens} tokens; maximum is 160000.`);
  return issues;
}

/** One write, one submit: the form that edits the entity owns it; an actions organism does not repeat it. */
export function d2Page11WriteDuplicates(draft: D2Page11Needs): D2Page11Issue[] {
  const byWrite = new Map<string, string[]>();
  for (const [id, unit] of Object.entries(draft.organisms)) {
    for (const binding of unit.submits) byWrite.set(binding.write, [...(byWrite.get(binding.write) ?? []), id]);
  }
  const issues: D2Page11Issue[] = [];
  for (const [write, owners] of byWrite) {
    if (owners.length < 2) continue;
    const entity = write.split('.')[0];
    const form = owners.find(id => draft.organisms[id].edits.some(path => path.split('.')[0] === entity));
    issues.push({ code: 'D2_PAGE11_WRITE_DUPLICATE', path: `page11Needs.organisms.${owners.join(',')}`,
      message: `Write ${write} has a submit in ${owners.join(' and ')}. Keep one submit, in the organism that edits ${entity}${form ? ` (${form})` : ''}; the actions organism does not repeat it.` });
  }
  return issues;
}

export function gateD2Page11Pair(desktop: unknown, mobile: unknown): D2Page11Issue[] {
  let left: D2Page11Definition;
  let right: D2Page11Definition;
  try { left = buildD2Page11Definition(desktop); right = buildD2Page11Definition(mobile); } catch (error) { return [{ code: 'D2_PAGE11_FORMAT', path: 'pair', message: String(error) }]; }
  const issues: D2Page11Issue[] = [];
  if (Object.keys(left.organisms).sort().join('\0') !== Object.keys(right.organisms).sort().join('\0')) issues.push({ code: 'D2_PAGE11_DEVICE_ORGANISMS', path: 'organisms', message: 'Desktop and mobile must declare identical organism ids.' });
  if (left.template.category !== right.template.category || left.template.experience !== right.template.experience) issues.push({ code: 'D2_PAGE11_DEVICE_TEMPLATE', path: 'template', message: 'Desktop and mobile must use the same category and derived experience.' });
  return issues;
}

function writeKey(write: D2Page11Write): string { return `${write.entity}.${write.operation === 'transition' && write.transitionRef ? write.transitionRef : write.operation}`; }
function findPage(nodes: D2Page11MenuNode[], id: string, ancestors: string[] = []): { node: D2Page11MenuNode; path: string[] } | null {
  for (const node of nodes) {
    const path = [...ancestors, node.id];
    if (node.id === id && node.kind === 'page') return { node, path };
    const child = findPage(node.children ?? [], id, path);
    if (child) return child;
  }
  return null;
}
function actorsFor(menu: D2Page11Menu, path: string[]): Set<string> {
  return new Set(Object.entries(menu.authorities).filter(([, refs]) => refs.some(ref => path.includes(ref))).map(([actor]) => actor.replace(/^actor:/u, '')));
}
function granted(path: string, actor: string, grants: D2Page11AccessGrant[]): boolean {
  const entity = path.split('.')[0];
  return grants.some(grant => {
    if (grant.actorRef !== actor || !grant.entityRefs.includes(entity)) return false;
    const disclosure = grant.disclosure;
    if ((disclosure.deniedFields ?? []).some(ref => path === ref || path.startsWith(`${ref}.`))) return false;
    if (disclosure.mode === 'fullRecord') return true;
    if (disclosure.mode === 'fieldsOnly') return (disclosure.allowedFields ?? []).some(ref => path === ref || path.startsWith(`${ref}.`));
    return false;
  });
}
