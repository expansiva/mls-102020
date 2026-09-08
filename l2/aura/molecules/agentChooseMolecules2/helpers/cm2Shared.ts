/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.ts" enhancement="_blank"/>

// The workspace SHARED defs and the contract it points at — the run's ANALYSIS sources. Pure parsing:
// the caller reads the text and passes it in.
//
// ⚠️ READ-ONLY, WITHOUT EXCEPTION. Nothing in this agent writes to the shared, or to the contract, or
// to anything else these files reference. The one file a run ever writes is the TARGET passed in the
// mention argument, and inside it only the `pipeline` value (steps/c3-patch). This module exists to
// give c1 something honest to decide from; it never earns the shared a write.
//
// ⚠️ WHY IT EXISTS — v3 (2026-09-08), measured on _102047_ controleChamados/page21/ticketCatalogue.
// v2 read only the target's prose `definition` and produced ONE region for that page, so one molecule
// (a groupViewTable lcrud grid) was chosen for a screen that also has 7 typed fields, 4 command
// triggers, 3 listing surfaces and 4 declared success/error messages. The cause was not the model and
// not the catalog — every group needed (groupEnterText, groupSelectOne, groupTriggerAction,
// groupNotifyUser) is published — it was the SOURCE:
//
//   `page11DefinitionProse` (agentChangeFrontend/helpers/cfeCreateShared.ts) is a fixed four-line
//   template — pageName, actor, purpose, categoryRef — plus one boilerplate paragraph, and
//   `defsFormat: 'prose'` is hardcoded for EVERY genome and EVERY category (cfePageRecipe.ts, with a
//   test asserting it). The prose can never name a field, a command or a control, on any page.
//
// The generator says where the facts went, in its own words (cfeCreateShared.pageLayoutDefsExport):
// "definition is intent prose on every genome (no fields, no routines). The structured map lives once
// on the workspace shared defs (dataBindings); gates read it from there." So this agent reads it from
// there too — the same place the platform's own gates look (cfeMaterializeCore.pageDefinitionForChecks).
//
// WHAT IS TAKEN FROM THE SHARED, and nothing else:
//   dataBindings[]         the regions (helpers/cm2Regions) — the same shape v1 walked on the page defs
//   i18n                   the declared column and field LABELS, which is what discriminates siblings
//   destructiveCommandIds  a DECLARED list: which command destroys, so its trigger is judged as one
//   contractRef.tsPath     the contract's own declared path — no `web/contracts/{page}` convention to
//                          re-derive, which is what v1 had to guess
//
// The target's own prose is still read, by steps/c1-groups and steps/c2-molecules, for the page intent
// (`uxExperience`, purpose, actor — helpers/cm2PageContext). The two sources answer different
// questions: the shared says WHAT interactions exist, the prose says WHAT THE PAGE IS FOR.

import { NmFileInfo, isRecord, readStorText } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

const DEFINITION_MARK = 'export const definition = ';
const PIPELINE_MARK = 'export const pipeline = ';

export interface Cm2ContractCommand {
  input: Record<string, string>;
  output: Record<string, string>;
}

export interface Cm2SharedDefinition {
  /** One entry per bffCall: { id, kind, command, description, inputs[] } — the region source. */
  dataBindings: Array<Record<string, unknown>>;
  /** The declared i18n catalogue of the workspace: 'intent.<cmd>.list.column.<field>.label' etc. */
  i18n: Record<string, string>;
  /** DECLARED, never inferred from a command name: which commands destroy. */
  destructiveCommandIds: string[];
  /** `contractRef.tsPath`, as declared. '' when the shared publishes none. */
  contractTsPath: string;
}

/**
 * The workspace shared defs of a page: same project, same module (everything up to and including the
 * 'web' segment), folder 'shared' instead of the device/layout one, same shortName. Generic across
 * page11/page21/page31 and any future genome — none of them touch this rule.
 *
 * The reverse direction is NOT derivable from the shared itself: its `layoutRef.defPath` names ONE
 * genome (page11), so it can never say which target this run was pointed at. Which is fine — the
 * target is the mention argument and is never guessed.
 */
export function cm2SharedFileFromTarget(targetFile: NmFileInfo): NmFileInfo | null {
  const parts = targetFile.folder.split('/');
  const webIndex = parts.indexOf('web');
  if (webIndex < 0) return null;
  const folder = [...parts.slice(0, webIndex + 1), 'shared'].join('/');
  // Already the shared? Then the caller pointed the run at the shared itself, which is not a page.
  if (folder === targetFile.folder) return null;
  return { project: targetFile.project, level: 2, folder, shortName: targetFile.shortName, extension: '.defs.ts' };
}

/**
 * The shared's `export const definition` — an OBJECT here (the page's own is prose). Parsed the same
 * JSON-slice way `helpers/cm2DefsPatch` cuts the target's pipeline: locate the marker, take the text
 * up to the last ';' before the pipeline export, JSON.parse it. Shape is checked and never assumed —
 * this is generated code, and a field that is not there is simply absent from the result.
 */
export function parseSharedDefinition(source: string): Cm2SharedDefinition | null {
  const defStart = source.indexOf(DEFINITION_MARK);
  if (defStart < 0) return null;
  const defBodyStart = defStart + DEFINITION_MARK.length;
  const pipeStart = source.indexOf(PIPELINE_MARK, defBodyStart);
  const searchEnd = pipeStart >= 0 ? pipeStart : source.length;
  const defBodyEnd = source.lastIndexOf(';', searchEnd);
  if (defBodyEnd <= defBodyStart) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(source.slice(defBodyStart, defBodyEnd));
  } catch {
    return null;
  }
  if (!isRecord(parsed)) return null;

  const contractRef = isRecord(parsed.contractRef) ? parsed.contractRef : {};
  return {
    dataBindings: Array.isArray(parsed.dataBindings) ? parsed.dataBindings.filter(isRecord) : [],
    i18n: isRecord(parsed.i18n) ? readStringMap(parsed.i18n) : {},
    destructiveCommandIds: Array.isArray(parsed.destructiveCommandIds)
      ? parsed.destructiveCommandIds.filter((item): item is string => typeof item === 'string')
      : [],
    contractTsPath: typeof contractRef.tsPath === 'string' ? contractRef.tsPath : '',
  };
}

function readStringMap(value: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, item] of Object.entries(value)) {
    if (typeof item === 'string') out[key] = item;
  }
  return out;
}

// ---- the contract, read-only: the declared TYPE of each field a region will ask about ----

/**
 * Field types from the contract the SHARED declares (`contractRef.tsPath`) — no convention to
 * re-derive, which is what v1 had to do. The `.defs.ts` beside it is preferred when present (it is
 * the source of truth); the materialized `.ts` is the fallback and, in practice, the only one on disk
 * in a client project (confirmed on both mls-102046 and mls-102047: `web/contracts/` holds `.ts` only).
 *
 * Best-effort by design: a command whose types cannot be resolved is not a failure — the region's need
 * line then says 'unknown', which is honest, instead of a type guessed from the field name.
 */
export async function readCm2ContractTypes(shared: Cm2SharedDefinition): Promise<Record<string, Cm2ContractCommand>> {
  const declared = shared.contractTsPath ? chFileRefFromImport(shared.contractTsPath) : null;
  if (!declared) return {};

  const defsSource = await readStorText({ ...declared, extension: '.defs.ts' }, false);
  const fromDefs = defsSource ? parseContractTypesFromDefsSource(defsSource) : null;
  if (fromDefs) return fromDefs;

  const tsSource = await readStorText({ ...declared, extension: '.ts' }, false);
  return tsSource ? parseContractTypesFromCompiledTs(tsSource) : {};
}

/**
 * `web/contracts/{page}.defs.ts` — the same two-export shape, but its `definition` is an ARRAY of
 * bffCall commands (`{ commandName, input: [{name,type}], output: [...] }`, per agentChangeFrontend
 * /spec.md "1. Contract"), not an object.
 */
export function parseContractTypesFromDefsSource(source: string): Record<string, Cm2ContractCommand> | null {
  const defStart = source.indexOf(DEFINITION_MARK);
  if (defStart < 0) return null;
  const defBodyStart = defStart + DEFINITION_MARK.length;
  const pipeStart = source.indexOf(PIPELINE_MARK, defBodyStart);
  const searchEnd = pipeStart >= 0 ? pipeStart : source.length;
  const defBodyEnd = source.lastIndexOf(';', searchEnd);
  if (defBodyEnd <= defBodyStart) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(source.slice(defBodyStart, defBodyEnd));
  } catch {
    return null;
  }
  if (!Array.isArray(parsed)) return null;

  const out: Record<string, Cm2ContractCommand> = {};
  for (const item of parsed) {
    if (!isRecord(item) || typeof item.commandName !== 'string' || !item.commandName) continue;
    out[item.commandName] = { input: fieldTypesFromDefsFields(item.input), output: fieldTypesFromDefsFields(item.output) };
  }
  return out;
}

function fieldTypesFromDefsFields(value: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!Array.isArray(value)) return out;
  for (const field of value) {
    if (isRecord(field) && typeof field.name === 'string' && field.name && typeof field.type === 'string') out[field.name] = field.type;
  }
  return out;
}

/**
 * The materialized contract `.ts` — GENERATED from l4, so the shape is fixed:
 * `export interface <PascalName>Input { field: type; ... }` / `...Output { ... }` per bffCall, the
 * PascalName being the commandName with its first letter capitalized. Best-effort: a field this regex
 * cannot parse is simply absent from the map, never invented.
 */
export function parseContractTypesFromCompiledTs(source: string): Record<string, Cm2ContractCommand> {
  const out: Record<string, Cm2ContractCommand> = {};
  const interfaceRe = /export interface (\w+)(Input|Output)\s*\{([^}]*)\}/g;
  let match: RegExpExecArray | null;
  while ((match = interfaceRe.exec(source))) {
    const [, pascalName, side, body] = match;
    const commandName = pascalName.charAt(0).toLowerCase() + pascalName.slice(1);
    const fields: Record<string, string> = {};
    for (const line of body.split('\n')) {
      const fieldMatch = /^\s*([A-Za-z_$][\w$]*)\??:\s*([^;]+);?\s*$/.exec(line);
      if (fieldMatch) fields[fieldMatch[1]] = fieldMatch[2].trim();
    }
    out[commandName] = out[commandName] || { input: {}, output: {} };
    if (side === 'Input') out[commandName].input = fields;
    else out[commandName].output = fields;
  }
  return out;
}
