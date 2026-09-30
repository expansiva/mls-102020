/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/page11.ts" enhancement="_blank"/>

/** Public page11 v2 contains only rendering decisions. Identity comes from its path. */
export type D2Page11Device = 'desktop' | 'mobile';
export type D2Page11Priority = 'primary' | 'main' | 'secondary';
export interface D2Page11Intent { id: string; kind: 'submit' | 'navigate'; to?: string }
export interface D2Page11Organism { kind: string; text: string; intents: D2Page11Intent[] }
export interface D2Page11Molecule { role: string; preferred: string; alternative?: string }
export interface D2Page11Definition {
  template: { category: string; experience: string };
  intent: string;
  sections: Array<{ id: string; priority: D2Page11Priority; purpose: string; organisms: string[] }>;
  organisms: Record<string, D2Page11Organism>;
  molecules: Record<string, D2Page11Molecule[]>;
}
export interface D2Page11Location { project: number; module: string; pageId: string; device: D2Page11Device }

const ID = /^[a-z][A-Za-z0-9]*$/u;
const PAGE_ID = /^[a-z][A-Za-z0-9_]*$/u;
const TAG = /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*--[a-z][a-z0-9-]*$/u;

export function buildD2Page11Definition(value: unknown): D2Page11Definition {
  const root = exactObject(value, ['template', 'intent', 'sections', 'organisms', 'molecules'], 'D2_PAGE11_KEYS');
  const template = exactObject(root.template, ['category', 'experience'], 'D2_PAGE11_TEMPLATE_KEYS');
  const category = requiredText(template.category, 'D2_PAGE11_CATEGORY');
  const experience = requiredText(template.experience, 'D2_PAGE11_EXPERIENCE');
  const intent = requiredText(root.intent, 'D2_PAGE11_INTENT');
  if (!Array.isArray(root.sections) || !root.sections.length) throw new Error('D2_PAGE11_SECTIONS');
  const sections: D2Page11Definition['sections'] = root.sections.map((raw, index) => {
    const row = exactObject(raw, ['id', 'priority', 'purpose', 'organisms'], `D2_PAGE11_SECTION_KEYS: ${index}`);
    const id = requiredId(row.id, 'D2_PAGE11_SECTION_ID');
    if (row.priority !== 'primary' && row.priority !== 'main' && row.priority !== 'secondary') throw new Error(`D2_PAGE11_SECTION_PRIORITY: ${id}`);
    if (!Array.isArray(row.organisms) || !row.organisms.length) throw new Error(`D2_PAGE11_SECTION_EMPTY: ${id}`);
    const organisms = row.organisms.map(item => requiredId(item, 'D2_PAGE11_SECTION_ORGANISM_ID'));
    return { id, priority: row.priority as D2Page11Priority, purpose: requiredText(row.purpose, 'D2_PAGE11_SECTION_PURPOSE'), organisms };
  });
  const rawOrganisms = object(root.organisms, 'D2_PAGE11_ORGANISMS');
  if (!Object.keys(rawOrganisms).length) throw new Error('D2_PAGE11_ORGANISMS_EMPTY');
  const organisms: D2Page11Definition['organisms'] = {};
  for (const [id, raw] of Object.entries(rawOrganisms)) {
    requiredId(id, 'D2_PAGE11_ORGANISM_ID');
    const row = exactObject(raw, ['kind', 'text', 'intents'], `D2_PAGE11_ORGANISM_KEYS: ${id}`);
    if (!Array.isArray(row.intents)) throw new Error(`D2_PAGE11_INTENTS: ${id}`);
    const intents: D2Page11Intent[] = row.intents.map((rawIntent, index) => {
      const intentRow = exactObject(rawIntent, ['id', 'kind', 'to'], `D2_PAGE11_INTENT_KEYS: ${id}/${index}`);
      const intentId = requiredId(intentRow.id, 'D2_PAGE11_INTENT_ID');
      if (intentRow.kind !== 'submit' && intentRow.kind !== 'navigate') throw new Error(`D2_PAGE11_INTENT_KIND: ${intentId}`);
      const to = intentRow.to === undefined ? '' : text(intentRow.to, 'D2_PAGE11_INTENT_TO');
      if (intentRow.kind === 'submit' && to) throw new Error(`D2_PAGE11_SUBMIT_TO: ${intentId}`);
      if (intentRow.kind === 'navigate' && !PAGE_ID.test(to)) throw new Error(`D2_PAGE11_NAVIGATE_TO: ${intentId}`);
      return { id: intentId, kind: intentRow.kind as D2Page11Intent['kind'], ...(to ? { to } : {}) };
    });
    organisms[id] = { kind: requiredText(row.kind, 'D2_PAGE11_ORGANISM_KIND'), text: requiredText(row.text, 'D2_PAGE11_ORGANISM_TEXT'), intents };
  }
  const rawMolecules = object(root.molecules, 'D2_PAGE11_MOLECULES');
  const molecules: D2Page11Definition['molecules'] = {};
  for (const [id, raw] of Object.entries(rawMolecules)) {
    requiredId(id, 'D2_PAGE11_MOLECULE_ORGANISM_ID');
    if (!Array.isArray(raw) || !raw.length) throw new Error(`D2_PAGE11_MOLECULE_LIST: ${id}`);
    molecules[id] = raw.map((item, index) => {
      const row = exactObject(item, ['role', 'preferred', 'alternative'], `D2_PAGE11_MOLECULE_KEYS: ${id}/${index}`);
      const preferred = requiredText(row.preferred, 'D2_PAGE11_MOLECULE_PREFERRED');
      const alternative = row.alternative === undefined ? '' : text(row.alternative, 'D2_PAGE11_MOLECULE_ALTERNATIVE');
      if (!TAG.test(preferred) || (alternative && !TAG.test(alternative))) throw new Error(`D2_PAGE11_MOLECULE_TAG: ${id}/${index}`);
      return { role: requiredText(row.role, 'D2_PAGE11_MOLECULE_ROLE'), preferred, ...(alternative ? { alternative } : {}) };
    });
  }
  return { template: { category, experience }, intent, sections, organisms, molecules };
}

export function d2Page11Path(location: D2Page11Location): string {
  if (!Number.isSafeInteger(location.project) || location.project <= 0 || !ID.test(location.module) || !PAGE_ID.test(location.pageId)) throw new Error('D2_PAGE11_PATH_ID');
  if (location.device !== 'desktop' && location.device !== 'mobile') throw new Error('D2_PAGE11_PATH_DEVICE');
  return `_${location.project}_/l2/${location.module}/web/${location.device}/page11/${location.pageId}.defs.ts`;
}

export function renderD2Page11Definition(location: D2Page11Location, value: unknown): string {
  const definition = buildD2Page11Definition(value);
  return `/// <mls fileReference="${d2Page11Path(location)}" enhancement="_blank"/>\n\nexport const definition = ${JSON.stringify(definition, null, 2)} as const;\n`;
}

/** Parses the exact renderer grammar as JSON, with no eval, import or code execution. */
export function parseD2Page11Definition(source: string): { location: D2Page11Location; definition: D2Page11Definition } {
  const match = /^\/\/\/ <mls fileReference="_(\d+)_\/l2\/([a-z][A-Za-z0-9]*)\/web\/(desktop|mobile)\/page11\/([a-z][A-Za-z0-9_]*)\.defs\.ts" enhancement="_blank"\/>\n\nexport const definition = ([\s\S]+) as const;\n$/u.exec(source);
  if (!match) throw new Error('D2_PAGE11_SOURCE_SHAPE');
  let parsed: unknown;
  try { parsed = JSON.parse(match[5]); } catch { throw new Error('D2_PAGE11_SOURCE_JSON'); }
  const location: D2Page11Location = { project: Number(match[1]), module: match[2], device: match[3] as D2Page11Device, pageId: match[4] };
  d2Page11Path(location);
  return { location, definition: buildD2Page11Definition(parsed) };
}

function exactObject(value: unknown, allowed: readonly string[], code: string): Record<string, unknown> {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!allowed.includes(key)) throw new Error(`${code}: forbidden field ${key}`);
  for (const key of allowed) if (key !== 'to' && key !== 'alternative' && !(key in row)) throw new Error(`${code}: missing field ${key}`);
  return row;
}
function object(value: unknown, code: string): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error(code);
  return value as Record<string, unknown>;
}
function text(value: unknown, code: string): string { if (typeof value !== 'string') throw new Error(code); return value; }
function requiredText(value: unknown, code: string): string { const result = text(value, code); if (!result.trim()) throw new Error(code); return result; }
function requiredId(value: unknown, code: string): string { const result = requiredText(value, code); if (!ID.test(result)) throw new Error(`${code}: ${result}`); return result; }
