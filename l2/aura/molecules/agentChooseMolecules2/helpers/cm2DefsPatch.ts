/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.ts" enhancement="_blank"/>

// Parsing and patching a page .defs.ts, and reading a contract .defs.ts for field types. Pure — no
// I/O; the caller (steps/c3-patch, steps/c1-groups) reads the file text and passes it in.
//
// mls-102020/l2/aura/helpers/moduleLanguages.ts's parseDefsSource/replaceDefsValue is the established
// repo pattern for this (JSON.parse/JSON.stringify + splice the original text, never reserialize the
// whole file), but it assumes exactly ONE exported const. A page .defs.ts has TWO —
// `export const definition = {...};` (no suffix) and `export const pipeline = [...] as const;` — so
// this file applies the same technique twice, at two independent cuts, and the module.defs.ts /
// contract .ts (single-export) files keep using the helper above unchanged.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';

const DEFINITION_MARK = 'export const definition = ';
const PIPELINE_MARK = 'export const pipeline = ';

export interface Cm2ParsedPageDefs {
  definitionJson: Record<string, unknown>;
  pipelineJson: unknown[];
  /** Everything up to and including DEFINITION_MARK — header, mls fileReference, imports. */
  prefix: string;
  /** From the end of the definition value through PIPELINE_MARK, verbatim (';\n\nexport const pipeline = '). */
  betweenDefinitionAndPipeline: string;
  /** From ' as const' to the end of the file, verbatim — nothing after pipeline is ever touched. */
  suffix: string;
}

/**
 * Two structural cuts, JSON.parse'd independently, with the exact text between and around them kept
 * for a byte-perfect splice back (serializePageDefsSource). Returns null when the file does not match
 * this family's fixed shape — the caller reports that instead of guessing.
 */
export function parsePageDefsSource(source: string): Cm2ParsedPageDefs | null {
  const defStart = source.indexOf(DEFINITION_MARK);
  if (defStart < 0) return null;
  const defBodyStart = defStart + DEFINITION_MARK.length;

  const pipeStart = source.indexOf(PIPELINE_MARK, defBodyStart);
  if (pipeStart < 0) return null;
  const pipeBodyStart = pipeStart + PIPELINE_MARK.length;

  // The definition value has no ' as const' suffix — it ends at the last ';' before 'export const
  // pipeline'. Whitespace/newlines are the only thing expected between that ';' and the next marker.
  const defBodyEnd = source.lastIndexOf(';', pipeStart);
  if (defBodyEnd <= defBodyStart) return null;

  const asConstIndex = source.lastIndexOf(' as const');
  if (asConstIndex < pipeBodyStart) return null;

  let definitionJson: unknown;
  let pipelineJson: unknown;
  try {
    definitionJson = JSON.parse(source.slice(defBodyStart, defBodyEnd));
    pipelineJson = JSON.parse(source.slice(pipeBodyStart, asConstIndex));
  } catch {
    return null;
  }
  if (!isRecord(definitionJson) || !Array.isArray(pipelineJson)) return null;

  return {
    definitionJson,
    pipelineJson,
    prefix: source.slice(0, defBodyStart),
    betweenDefinitionAndPipeline: source.slice(defBodyEnd, pipeBodyStart),
    suffix: source.slice(asConstIndex),
  };
}

/** Reassembles the file from the two (possibly patched) JSON values, splicing back into the original text. */
export function serializePageDefsSource(parsed: Cm2ParsedPageDefs, definitionJson: Record<string, unknown>, pipelineJson: unknown[]): string {
  return (
    parsed.prefix
    + JSON.stringify(definitionJson, null, 2)
    + parsed.betweenDefinitionAndPipeline
    + JSON.stringify(pipelineJson, null, 2)
    + parsed.suffix
  );
}

// ---- the sibling contract, read-only: field types for the regions extracted from `definition` ----

export interface Cm2ContractCommand {
  input: Record<string, string>;
  output: Record<string, string>;
}

/**
 * `web/contracts/{page}.defs.ts` — same two-export shape, but `definition` here is an ARRAY of bffCall
 * commands (agentChangeFrontend/spec.md "1. Contract"), not an object. Reuses the same first-cut
 * technique as parsePageDefsSource for the definition value alone; the pipeline half is irrelevant here
 * and is not parsed.
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
  return Array.isArray(parsed) ? commandsFromDefsArray(parsed) : null;
}

function commandsFromDefsArray(commands: unknown[]): Record<string, Cm2ContractCommand> {
  const out: Record<string, Cm2ContractCommand> = {};
  for (const item of commands) {
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
 * Fallback when the contract's `.defs.ts` is not on disk (only its materialized `.ts` is — confirmed
 * on a real client project, mls-102046) — GENERATED from l4, so the shape is fixed:
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

// ---- applying the chosen molecules back into `definition` and `pipeline` ----

export interface Cm2MoleculeChoice {
  group: string;
  tag: string;
}

/**
 * Sets or removes `molecule: { group, tag }` on exactly the dataBindings/inputs that were extracted as
 * regions this run (helpers/cm2Regions.ts) — never touches a `selection`/`route` input, which was
 * never a region and never entered `choices`. A region present in `choices` with a `null` value means
 * the gate/LLM found nothing — the field is removed (reconciliation), never written as `molecule: null`.
 */
export function applyMoleculeChoices(
  definitionJson: Record<string, unknown>,
  regionIds: string[],
  choices: ReadonlyMap<string, Cm2MoleculeChoice | null>,
): Record<string, unknown> {
  const cloned = JSON.parse(JSON.stringify(definitionJson)) as Record<string, unknown>;
  const bindings = Array.isArray(cloned.dataBindings) ? cloned.dataBindings : [];

  for (const regionId of regionIds) {
    if (!choices.has(regionId)) continue;
    const choice = choices.get(regionId) ?? null;
    const separator = regionId.indexOf('::');
    const bindingId = separator < 0 ? regionId : regionId.slice(0, separator);
    const inputName = separator < 0 ? '' : regionId.slice(separator + 2);

    const binding = bindings.find((item: unknown) => isRecord(item) && item.id === bindingId);
    if (!isRecord(binding)) continue;
    const target = inputName
      ? (Array.isArray(binding.inputs) ? binding.inputs.find((item: unknown) => isRecord(item) && item.name === inputName) : null)
      : binding;
    if (!isRecord(target)) continue;

    if (choice) target.molecule = { group: choice.group, tag: choice.tag };
    else delete target.molecule;
  }
  return cloned;
}

export interface Cm2PipelineAddition {
  /** Import reference to the group's usage.ts (level 3), or '' when the catalog publishes none. */
  usageRef: string;
  /** Import references to the chosen molecules' own component files. */
  componentFiles: string[];
}

/** Appends (deduplicated, order-stable) to `pipeline[0].skills`/`dependsFiles` — every other entry is untouched. */
export function applyPipelineSkills(pipelineJson: unknown[], additions: Cm2PipelineAddition[]): unknown[] {
  if (!additions.length) return pipelineJson;
  return pipelineJson.map((entry, index) => {
    if (index !== 0 || !isRecord(entry)) return entry;
    const patched = { ...entry };
    const skills = new Set(Array.isArray(patched.skills) ? patched.skills.filter((item): item is string => typeof item === 'string') : []);
    const dependsFiles = new Set(Array.isArray(patched.dependsFiles) ? patched.dependsFiles.filter((item): item is string => typeof item === 'string') : []);
    for (const addition of additions) {
      if (addition.usageRef) skills.add(addition.usageRef);
      for (const file of addition.componentFiles) dependsFiles.add(file);
    }
    patched.skills = [...skills];
    patched.dependsFiles = [...dependsFiles];
    return patched;
  });
}
