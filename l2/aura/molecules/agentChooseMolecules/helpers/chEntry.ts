/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chEntry.ts" enhancement="_blank"/>

// What the mention asked for, and which catalog answers it. Pure — both halves are decisions over data,
// so both are unit-tested; the I/O that feeds them lives in chCatalog.
//
// ⚠️ WHY THE PROJECT CAN BE NAMED AT THE ENTRY (decision of 2026-08-20). The probe is run from the CLIENT
// project — 102053 and the like — while the catalog lives in a dependency. Three projects can carry
// molecules (the base 102040 and the theme projects), and mixing two themes in one page makes no sense, so
// exactly ONE catalog answers a run. The default finds it; the argument overrides the default, which is
// what makes it possible to probe a theme's catalog from outside it.
//
// ⚠️ AND THE SEARCH IS OVER DIRECT DEPENDENCIES ONLY. A client that depends on a theme must not be offered
// the base library's molecules through it: the theme's own molecules are the ones its pages import. The
// transitive list would offer both.

export type ChCatalogSelectedBy = 'arg' | 'local' | 'dependency';

// ---- the mention ----

export interface ChEntry {
  /** The project named at the entry, or null when the mention carried only prose. */
  catalogProject: number | null;
  /** The definition of the page or region — everything that is not the argument. */
  definition: string;
  error: string;
}

const ENTRY_KEY = 'catalogProject';

/**
 * `{ catalogProject: 102040 } Cadastro de cliente: nome completo, CPF...` — an optional object literal
 * followed by the prose.
 *
 * mls.common.safeParseArgs is not used and must not be: it THROWS on anything that is not an object
 * literal, and here the object is optional and never alone (the prose follows it). The braces are matched
 * by depth rather than by regex so a brace inside the definition cannot end the argument early.
 */
export function chParseEntry(raw: string): ChEntry {
  const text = (raw || '').trim();
  if (!text.startsWith('{')) return { catalogProject: null, definition: text, error: '' };

  const close = matchingBrace(text);
  if (close < 0) {
    return { catalogProject: null, definition: '', error: `the argument opens with '{' and never closes — write it as '{ ${ENTRY_KEY}: 102040 }' followed by the definition` };
  }

  const argument = text.slice(0, close + 1);
  const definition = text.slice(close + 1).trim();
  const found = new RegExp(`['"]?${ENTRY_KEY}['"]?\\s*:\\s*['"]?(\\d+)`).exec(argument);
  if (!found) {
    return { catalogProject: null, definition, error: `the only argument this agent takes is '${ENTRY_KEY}' — write '{ ${ENTRY_KEY}: 102040 }' followed by the definition, or nothing at all and the catalog is looked up` };
  }
  return { catalogProject: Number(found[1]), definition, error: '' };
}

function matchingBrace(text: string): number {
  let depth = 0;
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '{') depth += 1;
    else if (text[index] === '}') {
      depth -= 1;
      if (!depth) return index;
    }
  }
  return -1;
}

// ---- which catalog answers the run ----

export interface ChCatalogChoice {
  project: number | null;
  selectedBy: ChCatalogSelectedBy | null;
  /** Empty when a catalog was chosen. Otherwise the whole answer the user gets. */
  error: string;
  /** Chosen, but with something the run should say out loud. */
  warnings: string[];
}

export interface ChCatalogChoiceInputs {
  activeProject: number;
  /** From the mention, or null. */
  argProject: number | null;
  /** Projects that HAVE l2/molecules/skill.ts, in search order: the active project, then its direct deps. */
  candidates: number[];
  /** The DIRECT dependencies of the active project — what its pages may import from. */
  directDeps: number[];
}

/**
 * EXACTLY ONE catalog answers a run.
 *
 * With no argument the rule is: one candidate, use it; none, say where it looked; more than one, refuse and
 * name them. Refusing is deliberate — picking a theme in silence would answer with the wrong aesthetic and
 * the run would look correct. The message carries the argument that resolves it, so the refusal is a
 * question with the answer attached.
 */
export function chChooseCatalog(inputs: ChCatalogChoiceInputs): ChCatalogChoice {
  const { activeProject, argProject, candidates, directDeps } = inputs;

  if (argProject) {
    if (!candidates.includes(argProject)) {
      return {
        project: null,
        selectedBy: null,
        error: `project ${argProject} has no molecule catalog (l2/molecules/skill.ts)${candidates.length ? `. Projects that do: ${candidates.join(', ')}` : ' — and neither has any project reachable from here'}`,
        warnings: [],
      };
    }
    const warnings: string[] = [];
    // Allowed on purpose: probing a theme's catalog from outside it is a legitimate test. But a page in
    // this project could not import what it chose, so the run has to say so.
    if (argProject !== activeProject && !directDeps.includes(argProject)) {
      warnings.push(`${argProject} is not a direct dependency of ${activeProject}: a page in ${activeProject} cannot import the molecules that were chosen`);
    }
    return { project: argProject, selectedBy: 'arg', error: '', warnings };
  }

  if (!candidates.length) {
    return {
      project: null,
      selectedBy: null,
      error: `no molecule catalog found. Looked for l2/molecules/skill.ts in ${activeProject}${directDeps.length ? ` and in its direct dependencies (${directDeps.join(', ')})` : ' (it declares no dependency)'}`,
      warnings: [],
    };
  }

  if (candidates.length > 1) {
    return {
      project: null,
      selectedBy: null,
      error: `more than one catalog is reachable: ${candidates.join(', ')}. Say which one to use — '@@agentChooseMolecules { ${ENTRY_KEY}: ${candidates[0]} } <the definition>' — because molecules of two different themes do not belong in the same page`,
      warnings: [],
    };
  }

  const project = candidates[0];
  return { project, selectedBy: project === activeProject ? 'local' : 'dependency', error: '', warnings: [] };
}
