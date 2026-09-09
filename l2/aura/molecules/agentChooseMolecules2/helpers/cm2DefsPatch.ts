/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.ts" enhancement="_blank"/>

// Reading a page .defs.ts and patching its PIPELINE. Pure — no I/O; the caller (steps/c3-patch,
// steps/c1-groups, steps/c2-molecules) reads the file text and passes it in.
//
// ⚠️ THE FILE SHAPE CHANGED — THIS IS v2 (2026-09-08, measured on _102047_/l2/controleChamados, all
// three genomes). `export const definition` of a page is no longer a JSON object carrying
// dataBindings[]/inputs[]; it is a TEMPLATE LITERAL of prose:
//
//   export const definition = `page: Registrar comentário em chamado aberto
//   actor: atendente
//   purpose: Documentar o andamento do atendimento em um chamado aberto.
//   uxExperience: processWizard
//   The page extends the shared base class of this workspace: ... do not list routines.`;
//
// Two consequences, and together they are the whole redesign (flow.json.decisions.definitionFormat):
//
// 1. THERE IS NO NODE LEFT TO ANNOTATE. `molecule: { group, tag }` needed a dataBinding or an input to
//    live on, so applyMoleculeChoices, writePageMolecule and the root `pageMolecules[]` array are gone
//    with the object they addressed. The run's only output is pipeline[0].dependsFiles/skills — which
//    is also the only channel that reaches the render model at all: agentCfeMaterializeGen's
//    readContextSections turns dependsFiles into '## Context files' sections and readSections
//    concatenates skills into its system prompt. A new pipeline KEY would not work: PipelineItem
//    (cfeMaterializeCore.ts) is a closed interface and materialize reads exactly those two fields.
//
// 2. THE DEFINITION IS NEVER REWRITTEN. It is read as TEXT — the description c1 reasons over — and
//    travels back byte for byte inside `prefix`. The only cut this file makes is around the `pipeline`
//    value, so no run can change what the page says it is.
//
// mls-102020/l2/aura/helpers/moduleLanguages.ts's parseDefsSource/replaceDefsValue is the established
// repo pattern for this kind of surgery (JSON.parse/JSON.stringify + splice the original text, never
// reserialize the whole file) and v2 is now a plain instance of it: ONE cut, at one exported const.

import { isRecord } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';

const DEFINITION_MARK = 'export const definition = ';
const PIPELINE_MARK = 'export const pipeline = ';

export interface Cm2ParsedPageDefs {
  /**
   * The prose of `export const definition`, verbatim between its backticks. READ-ONLY: it is the
   * description the choice reasons over, and it is never part of what gets written back.
   */
  definitionText: string;
  pipelineJson: unknown[];
  /** Everything up to and including PIPELINE_MARK — the header, the whole definition, verbatim. */
  prefix: string;
  /** From ' as const' to the end of the file, verbatim — nothing after the pipeline value is touched. */
  suffix: string;
}

/**
 * Which form the target's definition is in. Exported so the caller can name the v1 object shape in its
 * error instead of reporting a generic parse failure — the two are different problems for whoever is
 * pointing this agent at a file.
 */
export function cm2DefinitionKind(source: string): 'prose' | 'object' | 'none' {
  const start = source.indexOf(DEFINITION_MARK);
  if (start < 0) return 'none';
  const first = source.slice(start + DEFINITION_MARK.length).trimStart().charAt(0);
  if (first === '`') return 'prose';
  return first === '{' || first === '[' ? 'object' : 'none';
}

/**
 * The prose definition and the pipeline value, with the exact text around the pipeline kept for a
 * byte-perfect splice back (serializePageDefsSource). Returns null when the file does not match this
 * family's shape — the caller reports that (with cm2DefinitionKind) instead of guessing.
 */
export function parsePageDefsSource(source: string): Cm2ParsedPageDefs | null {
  if (cm2DefinitionKind(source) !== 'prose') return null;

  const defBodyStart = source.indexOf(DEFINITION_MARK) + DEFINITION_MARK.length;
  const openQuote = source.indexOf('`', defBodyStart);
  if (openQuote < 0) return null;
  const closeQuote = closingBacktick(source, openQuote + 1);
  if (closeQuote < 0) return null;

  const pipeStart = source.indexOf(PIPELINE_MARK, closeQuote);
  if (pipeStart < 0) return null;
  const pipeBodyStart = pipeStart + PIPELINE_MARK.length;

  const asConstIndex = source.lastIndexOf(' as const');
  if (asConstIndex < pipeBodyStart) return null;

  let pipelineJson: unknown;
  try {
    pipelineJson = JSON.parse(source.slice(pipeBodyStart, asConstIndex));
  } catch {
    return null;
  }
  if (!Array.isArray(pipelineJson)) return null;

  return {
    definitionText: source.slice(openQuote + 1, closeQuote),
    pipelineJson,
    prefix: source.slice(0, pipeBodyStart),
    suffix: source.slice(asConstIndex),
  };
}

/** The index of the backtick that closes the literal opened before `from`, skipping escapes. */
function closingBacktick(source: string, from: number): number {
  for (let index = from; index < source.length; index++) {
    if (source[index] === '\\') { index++; continue; }
    if (source[index] === '`') return index;
  }
  return -1;
}

/**
 * Reassembles the file from the (possibly patched) pipeline value alone. The definition is not a
 * parameter here on purpose: it travels inside `parsed.prefix` and cannot be altered by this agent.
 */
export function serializePageDefsSource(parsed: Cm2ParsedPageDefs, pipelineJson: unknown[]): string {
  return parsed.prefix + JSON.stringify(pipelineJson, null, 2) + parsed.suffix;
}

// ---- equipping the pipeline with the chosen molecules ----

export interface Cm2PipelineAddition {
  /** PIPELINE-form reference to the group's usage.ts (level 3), or '' when the catalog publishes none. */
  usageRef: string;
  /** PIPELINE-form references to the chosen molecules' own component files. */
  componentFiles: string[];
}

/**
 * Is this dependsFiles entry one THIS AGENT put there? A molecule component always lives at
 * `l2/molecules/<groupFolder>/<shortName>.ts` of the catalog project (cm2Types.cm2ComponentReference),
 * and nothing else a page depends on has that shape: the generator's own entries are
 * `web/shared/<page>Dts.txt` and `l2/designSystem.ts`.
 */
export function isCm2MoleculeDependsFile(reference: string): boolean {
  return /(?:^|\/)l2\/molecules\/[^/]+\/[^/]+\.ts$/u.test(reference);
}

/**
 * Is this skills entry one THIS AGENT put there? A group usage contract always lives at
 * `l2/aura/molecules/skills/<group>/usage.ts` (what the catalog publishes as `usageContract`); the
 * generator's own skills are `l2/agentChangeFrontend/skills/*.ts` and `l4/collabux/templates/*.md`.
 */
export function isCm2UsageSkill(reference: string): boolean {
  return /(?:^|\/)l2\/aura\/molecules\/skills\/[^/]+\/usage\.ts$/u.test(reference);
}

/**
 * Rewrites `pipeline[0].skills`/`dependsFiles` with the molecules chosen THIS RUN — every other entry
 * of every other item is untouched.
 *
 * ⚠️ IT PRUNES BEFORE IT ADDS (flow.json.decisions.pipelineReconciliation). Appending was enough while
 * the annotation lived on the bindings and the pipeline was a secondary index of it; now the pipeline
 * is the whole output, so a rerun whose choice CHANGED would otherwise leave the previous molecule in
 * dependsFiles forever and hand the render model two components for one region. Only this agent's own
 * entries are dropped, recognized by shape (isCm2MoleculeDependsFile / isCm2UsageSkill) — never by
 * position, and never anything the generator wrote.
 *
 * ⚠️ AND IT SORTS what it adds, so a rerun that chose the same set writes nothing even when c1 returned
 * the groups in another order. Without that the byte-equality check in c3-patch would fire on ordering
 * alone and the run would report a change it did not make.
 */
export function applyPipelineMolecules(pipelineJson: unknown[], additions: Cm2PipelineAddition[]): unknown[] {
  const usageRefs = new Set<string>();
  const componentFiles = new Set<string>();
  for (const addition of additions) {
    if (addition.usageRef) usageRefs.add(addition.usageRef);
    for (const file of addition.componentFiles) componentFiles.add(file);
  }

  return pipelineJson.map((entry, index) => {
    if (index !== 0 || !isRecord(entry)) return entry;
    const patched = { ...entry };
    patched.skills = reconcile(patched.skills, isCm2UsageSkill, usageRefs);
    patched.dependsFiles = reconcile(patched.dependsFiles, isCm2MoleculeDependsFile, componentFiles);
    return patched;
  });
}

/** Foreign entries first, in their original order; then this run's own, sorted and deduplicated. */
function reconcile(current: unknown, isOurs: (reference: string) => boolean, ours: ReadonlySet<string>): string[] {
  const existing = Array.isArray(current) ? current.filter((item): item is string => typeof item === 'string') : [];
  const kept = existing.filter(reference => !isOurs(reference));
  return [...kept, ...[...ours].sort()];
}
