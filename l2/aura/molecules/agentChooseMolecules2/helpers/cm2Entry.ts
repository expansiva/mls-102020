/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Entry.ts" enhancement="_blank"/>

// Parsing the mention argument. Pure — no I/O, no mls.* access.
//
// Unlike agentChooseMolecules's chParseEntry, the argument here is never optional-prefix-plus-prose:
// the WHOLE mention is one JSON object, `{"catalogProject": 102040, "target": "..."}`, so a plain
// JSON.parse is the right tool (same choice agentChangeFrontend's `only-materialize` command already
// made for its own single-object argument) — no brace-matching by hand, no
// mls.common.safeParseArgs (which is for a looser JS-object-literal shape this mention never uses).
//
// Both keys are required: 'catalogProject' says which project's molecule catalog answers this run —
// no search, no dependency discovery, no "more than one catalog reachable" ambiguity, all of which
// existed only because the probe never received the project explicitly. 'target' is the import-style
// reference of the page .defs.ts to read and rewrite, e.g.
// '_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs'.

import { NmFileInfo, isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { CM2_AGENT_NAME } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

export interface Cm2Entry {
  catalogProject: number;
  target: string;
  targetFile: NmFileInfo | null;
  error: string;
}

const USAGE_HINT = `'@@${CM2_AGENT_NAME} {"catalogProject": 102040, "target": "_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs"}'`;

export function cm2StripMention(raw: string): string {
  return String(raw || '')
    .trim()
    .replace(new RegExp(`^@@${CM2_AGENT_NAME}(?:\\s+|$)`, 'i'), '')
    .trim();
}

export function cm2ParseEntry(raw: string): Cm2Entry {
  const fail = (error: string): Cm2Entry => ({ catalogProject: 0, target: '', targetFile: null, error });
  const text = cm2StripMention(raw);
  if (!text.startsWith('{')) {
    return fail(`the argument must be a JSON object with 'catalogProject' and 'target' — write it as ${USAGE_HINT}`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (thrown) {
    return fail(`the argument is not valid JSON (${thrown instanceof Error ? thrown.message : String(thrown)}) — both keys need double quotes, e.g. ${USAGE_HINT}`);
  }
  if (!isRecord(parsed)) return fail(`the argument must be a JSON object, not ${Array.isArray(parsed) ? 'an array' : typeof parsed}`);

  const catalogProject = typeof parsed.catalogProject === 'number' ? parsed.catalogProject : Number(parsed.catalogProject);
  if (!catalogProject || Number.isNaN(catalogProject)) {
    return fail(`'catalogProject' is required and must be the number of the project whose molecule catalog answers this run`);
  }

  const target = typeof parsed.target === 'string' ? parsed.target.trim() : '';
  if (!target) {
    return fail(`'target' is required — the import-style reference of the page .defs.ts to read and rewrite, e.g. '_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs'`);
  }

  const targetFile = chFileRefFromImport(target);
  if (!targetFile) return fail(`'target' is not a recognizable project reference: '${target}'`);
  if (targetFile.extension !== '.defs.ts') {
    return fail(`'target' must point at a .defs.ts (got '${targetFile.extension}') — pass the page's defs reference, not its materialized .ts`);
  }

  return { catalogProject, target, targetFile, error: '' };
}

/**
 * The contract file's location, derived from the page's own: same project, same module (everything
 * up to and including the 'web' segment), folder 'contracts' instead of the device/layout, same
 * shortName (pageId). Generic across page11/page21/page31/future genomes — none of them touch this.
 */
export function cm2ContractFileFromTarget(targetFile: NmFileInfo): NmFileInfo | null {
  const parts = targetFile.folder.split('/');
  const webIndex = parts.indexOf('web');
  if (webIndex < 0) return null;
  const folder = [...parts.slice(0, webIndex + 1), 'contracts'].join('/');
  return { project: targetFile.project, level: targetFile.level, folder, shortName: targetFile.shortName, extension: targetFile.extension };
}
