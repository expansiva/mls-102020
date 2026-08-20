/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chExtract.ts" enhancement="_blank"/>

// Reading a catalog level from its SOURCE TEXT. Pure, so it is unit-testable against the real shape.
//
// ⚠️ WHY THIS EXISTS, measured on the first Studio run (2026-08-19). The read used to be
// `await import(reference)` — the gesture of imResolve.readGroupSkill, which the pilot plan asked for.
// That import is served by the PUBLISHED project, so every group catalog that existed only in the editor
// failed with 'Failed to fetch dynamically imported module'. And the rest of this family does not read by
// import at all: nmFs reads the stor everywhere, which is how agentNewMolecule2 writes a molecule and
// reads it back in the same run without publishing. readGroupSkill is the exception, and it is one
// because it reads 102020's own published skills.
//
// So the stor is now the first rung and this is what turns its text into the values the gates need. An
// import needs no parser, and that is a real advantage it keeps — the trade accepted here is a narrow
// parser against a file THIS PLATFORM generates in a fixed shape, in exchange for reading what the editor
// actually holds (including edits that were never published).
//
// It parses only what is needed and never evaluates anything: tags, the no-defs mark, scenario labels, the
// group's own name, the usage contract reference, and the `skill` markdown. Anything it cannot find is
// reported, and the caller falls back to the published module.

/** The exports of a catalog level, in the shape the module itself would expose. */
export interface ChExtractedModule {
  groups?: Array<{ name: string; molecules: number; indexDefs: string }>;
  molecules?: Array<{ tag: string; defs: string | null }>;
  scenarios?: Array<{ scenario: string; recommended: string[] }>;
  group?: string;
  usageContract?: string;
  theme?: string | null;
  skill?: string;
}

export interface ChExtractResult {
  module: ChExtractedModule | null;
  error: string;
}

export function chExtractCatalogModule(source: string): ChExtractResult {
  const text = source || '';
  if (!text.trim()) return { module: null, error: 'the file is empty' };

  const module: ChExtractedModule = {};

  const skill = extractTemplate(text, 'skill');
  if (skill) module.skill = skill;

  const groups = extractGroups(text);
  if (groups.length) module.groups = groups;

  const molecules = extractMolecules(text);
  if (molecules.length) module.molecules = molecules;

  const scenarios = extractScenarios(text);
  if (scenarios.length) module.scenarios = scenarios;

  const group = extractString(text, 'group');
  if (group) module.group = group;

  const usageContract = extractString(text, 'usageContract');
  if (usageContract) module.usageContract = usageContract;

  if (/export const theme\s*=\s*null/.test(text)) module.theme = null;
  else {
    const theme = extractString(text, 'theme');
    if (theme) module.theme = theme;
  }

  // A one-line stub (the 26 groups outside the pilot are exactly that) parses to nothing, and saying
  // "nothing to read" is the honest answer — the caller turns it into "this group has no catalog yet".
  if (!module.skill && !module.groups && !module.molecules) {
    return { module: null, error: 'no catalog export found in the source (no skill, no groups, no molecules)' };
  }
  return { module, error: '' };
}

// ---- one export at a time ----

/** `export const skill = ` + a template literal. The generated files put it last and use no inner backtick. */
function extractTemplate(text: string, name: string): string {
  const marker = `export const ${name} = \``;
  const start = text.indexOf(marker);
  if (start < 0) return '';
  const from = start + marker.length;
  // lastIndexOf, not indexOf: it survives a backtick inside the markdown, which the generated files do
  // not have today and a hand edit could introduce.
  const end = text.lastIndexOf('`');
  return end > from ? text.slice(from, end) : '';
}

function extractString(text: string, name: string): string {
  const match = new RegExp(`export const ${name}\\s*=\\s*(['"\`])([^'"\`]*)\\1`).exec(text);
  return match ? match[2] : '';
}

/** The lines of `export const <name> = [ ... ];`. Comment lines come back too and simply match nothing. */
function extractArrayLines(text: string, name: string): string[] {
  const marker = `export const ${name} = [`;
  const start = text.indexOf(marker);
  if (start < 0) return [];
  const from = start + marker.length;
  const end = text.indexOf('];', from);
  if (end < 0) return [];
  return text.slice(from, end).split('\n');
}

function extractGroups(text: string): Array<{ name: string; molecules: number; indexDefs: string }> {
  const out: Array<{ name: string; molecules: number; indexDefs: string }> = [];
  for (const line of extractArrayLines(text, 'groups')) {
    const name = quoted(line, 'name');
    const indexDefs = quoted(line, 'indexDefs');
    if (!name || !indexDefs) continue;
    const count = /molecules:\s*(\d+)/.exec(line);
    out.push({ name, molecules: count ? Number(count[1]) : 0, indexDefs });
  }
  return out;
}

function extractMolecules(text: string): Array<{ tag: string; defs: string | null }> {
  const out: Array<{ tag: string; defs: string | null }> = [];
  for (const line of extractArrayLines(text, 'molecules')) {
    const tag = quoted(line, 'tag');
    if (!tag) continue;
    // `defs: null` is the mark of a molecule with no contract — the ml-table-multi-select case. It has to
    // survive the read, because the prompt asks the model to repeat that limitation.
    const defs = /defs:\s*null/.test(line) ? null : quoted(line, 'defs') || null;
    out.push({ tag, defs });
  }
  return out;
}

function extractScenarios(text: string): Array<{ scenario: string; recommended: string[] }> {
  const out: Array<{ scenario: string; recommended: string[] }> = [];
  for (const line of extractArrayLines(text, 'scenarios')) {
    const scenario = quoted(line, 'scenario');
    if (!scenario) continue;
    const list = /recommended:\s*\[([^\]]*)\]/.exec(line);
    const recommended = list
      ? [...list[1].matchAll(/['"]([^'"]+)['"]/g)].map(match => match[1])
      : [];
    out.push({ scenario, recommended });
  }
  return out;
}

/** `key: 'value'` on one line, in either quote style. */
function quoted(line: string, key: string): string {
  const match = new RegExp(`${key}:\\s*(['"])(.*?)\\1`).exec(line);
  return match ? match[2] : '';
}
