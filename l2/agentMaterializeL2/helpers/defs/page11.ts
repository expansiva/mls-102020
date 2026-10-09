/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/defs/page11.ts" enhancement="_blank"/>

// Copy, private to agentMaterializeL2 (from l2/helpers/defsL2v2, 05/10/2026; that original was removed with agentMaterializeL2v2 on 08/10/2026).
// Reader of the public page11 v2 defs (web/<device>/page11/<pageId>.defs.ts). It knows the file grammar
// only, never a producer's or consumer's policy.
// The grammar is the one agentDefsL2 renders (helpers/page11.ts there, 30/09/2026).

export type L2Page11Device = 'desktop' | 'mobile';
export type L2Page11Priority = 'primary' | 'main' | 'secondary';
export interface L2Page11Intent { id: string; kind: 'submit' | 'navigate'; to?: string }
export interface L2Page11Organism { kind: string; text: string; intents: L2Page11Intent[] }
export interface L2Page11Molecule { role: string; preferred: string; alternative?: string }
export interface L2Page11Definition {
  template: { category: string; experience: string };
  intent: string;
  sections: Array<{ id: string; priority: L2Page11Priority; purpose: string; organisms: string[] }>;
  organisms: Record<string, L2Page11Organism>;
  molecules: Record<string, L2Page11Molecule[]>;
}
export interface L2PageLocation { project: number; module: string; pageId: string }
export interface L2Page11Location extends L2PageLocation { device: L2Page11Device }

const ID = /^[a-z][A-Za-z0-9]*$/u;
const PAGE_ID = /^[a-z][A-Za-z0-9_]*$/u;
const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*--[a-z][a-z0-9-]*$/u;

/** Parses the exact renderer grammar as JSON, with no eval, import or code execution. */
export function parseL2Page11(source: string): { location: L2Page11Location; definition: L2Page11Definition } {
  const match = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/(desktop|mobile)\/page11\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\r?\n\r?\nexport const definition = ([\s\S]+) as const;\r?\n?$/u.exec(source);
  if (!match) throw new Error('L2_PAGE11_SOURCE_SHAPE');
  let parsed: unknown;
  try { parsed = JSON.parse(match[5]); } catch { throw new Error('L2_PAGE11_SOURCE_JSON'); }
  const location: L2Page11Location = { project: Number(match[1]), module: match[2], device: match[3] as L2Page11Device, pageId: match[4] };
  return { location, definition: buildL2Page11(parsed) };
}

export function buildL2Page11(value: unknown): L2Page11Definition {
  const root = exactObject(value, ['template', 'intent', 'sections', 'organisms'], ['molecules'], 'L2_PAGE11_KEYS');
  const template = exactObject(root.template, ['category', 'experience'], [], 'L2_PAGE11_TEMPLATE_KEYS');
  const intent = requiredText(root.intent, 'L2_PAGE11_INTENT');
  if (!Array.isArray(root.sections) || !root.sections.length) throw new Error('L2_PAGE11_SECTIONS');
  const sections = root.sections.map((raw, index) => {
    const row = exactObject(raw, ['id', 'priority', 'purpose', 'organisms'], [], `L2_PAGE11_SECTION_KEYS: ${index}`);
    const id = requiredId(row.id, 'L2_PAGE11_SECTION_ID');
    if (row.priority !== 'primary' && row.priority !== 'main' && row.priority !== 'secondary') throw new Error(`L2_PAGE11_SECTION_PRIORITY: ${id}`);
    if (!Array.isArray(row.organisms) || !row.organisms.length) throw new Error(`L2_PAGE11_SECTION_EMPTY: ${id}`);
    return { id, priority: row.priority as L2Page11Priority, purpose: requiredText(row.purpose, 'L2_PAGE11_SECTION_PURPOSE'), organisms: row.organisms.map(item => requiredId(item, 'L2_PAGE11_SECTION_ORGANISM_ID')) };
  });
  const organisms: L2Page11Definition['organisms'] = {};
  for (const [id, raw] of Object.entries(object(root.organisms, 'L2_PAGE11_ORGANISMS'))) {
    requiredId(id, 'L2_PAGE11_ORGANISM_ID');
    const row = exactObject(raw, ['kind', 'text', 'intents'], [], `L2_PAGE11_ORGANISM_KEYS: ${id}`);
    if (!Array.isArray(row.intents)) throw new Error(`L2_PAGE11_INTENTS: ${id}`);
    const intents = row.intents.map((rawIntent, index) => {
      const intentRow = exactObject(rawIntent, ['id', 'kind'], ['to'], `L2_PAGE11_INTENT_KEYS: ${id}/${index}`);
      const intentId = requiredId(intentRow.id, 'L2_PAGE11_INTENT_ID');
      if (intentRow.kind !== 'submit' && intentRow.kind !== 'navigate') throw new Error(`L2_PAGE11_INTENT_KIND: ${intentId}`);
      const to = intentRow.to === undefined ? '' : text(intentRow.to, 'L2_PAGE11_INTENT_TO');
      if (intentRow.kind === 'navigate' && !PAGE_ID.test(to)) throw new Error(`L2_PAGE11_NAVIGATE_TO: ${intentId}`);
      return { id: intentId, kind: intentRow.kind as L2Page11Intent['kind'], ...(to ? { to } : {}) };
    });
    organisms[id] = { kind: requiredText(row.kind, 'L2_PAGE11_ORGANISM_KIND'), text: requiredText(row.text, 'L2_PAGE11_ORGANISM_TEXT'), intents };
  }
  if (!Object.keys(organisms).length) throw new Error('L2_PAGE11_ORGANISMS_EMPTY');
  const molecules: L2Page11Definition['molecules'] = {};
  // Optional: without a recommendation the page is built with no molecules (controleEstoque test, 02/10/2026).
  for (const [id, raw] of Object.entries(root.molecules === undefined ? {} : object(root.molecules, 'L2_PAGE11_MOLECULES'))) {
    if (!Array.isArray(raw) || !raw.length) throw new Error(`L2_PAGE11_MOLECULE_LIST: ${id}`);
    molecules[id] = raw.map((item, index) => {
      const row = exactObject(item, ['role', 'preferred'], ['alternative'], `L2_PAGE11_MOLECULE_KEYS: ${id}/${index}`);
      const preferred = requiredText(row.preferred, 'L2_PAGE11_MOLECULE_PREFERRED');
      const alternative = row.alternative === undefined ? '' : text(row.alternative, 'L2_PAGE11_MOLECULE_ALTERNATIVE');
      if (!TAG.test(preferred) || (alternative && !TAG.test(alternative))) throw new Error(`L2_PAGE11_MOLECULE_TAG: ${id}/${index}`);
      return { role: requiredText(row.role, 'L2_PAGE11_MOLECULE_ROLE'), preferred, ...(alternative ? { alternative } : {}) };
    });
  }
  return {
    template: { category: requiredText(template.category, 'L2_PAGE11_CATEGORY'), experience: requiredText(template.experience, 'L2_PAGE11_EXPERIENCE') },
    intent, sections, organisms, molecules,
  };
}

/** `groupviewtable--ml-data-table` → `groupviewtable`, the folder of the molecule index in _102040_. */
export function moleculeGroupFolder(tag: string): string {
  return tag.slice(0, tag.indexOf('--'));
}

function exactObject(value: unknown, required: readonly string[], optional: readonly string[], code: string): Record<string, unknown> {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!required.includes(key) && !optional.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of required) if (!(key in row)) throw new Error(`${code}: missing field ${key}`);
  return row;
}
function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
function text(value: unknown, code: string): string { if (typeof value !== 'string') throw new Error(code); return value; }
function requiredText(value: unknown, code: string): string { const result = text(value, code); if (!result.trim()) throw new Error(code); return result; }
function requiredId(value: unknown, code: string): string { const result = requiredText(value, code); if (!ID.test(result)) throw new Error(`${code}: ${result}`); return result; }
