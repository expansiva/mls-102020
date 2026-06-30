/// <mls fileReference="_102020_/l2/agentImplementGenome/agentGenDefs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase E — assemble the FINAL page defs. DETERMINISTIC, no LLM (like agentRegisterGenome:
// only beforePromptStep → completed). It:
//   1. imports the ORIGIN page11 defs ({ definition, pipeline });
//   2. reads Agent1's per-element group choices (groupSelections = [{ id, group }]);
//   3. resolves each group to ONE molecule via matchVariant (gated by the DS configuredAxes)
//      and places a single `molecule` on the matching layout element (field/filter/action/
//      container) — by id;
//   4. repoints paths page11 → page{layout}{ds}, overrides pipeline skills + dependsFiles
//      (DS global css + each molecule usage skill), stamps pageVersion, and writes the defs.
//
// The LLM picks the GROUP per element (Agent1); the variant + placement are deterministic
// here (matchVariant is pure → consistency by construction).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { collabImport } from '/_102027_/l2/collabImport.js';
import { buildWorkItem, variationFolder } from '/_102020_/l2/dsMatch/derivePaths.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/dsMatch/dsVersion.js';
import { dsGlobalCssRef } from '/_102020_/l2/dsMatch/buildGlobalCss.js';
import { buildMoleculeCatalog } from '/_102020_/l2/dsMatch/buildMoleculeCatalog.js';
import { matchVariant } from '/_102020_/l2/dsMatch/matchVariant.js';
import { groupHasConfiguredAxis, type AssignedMolecule } from '/_102020_/l2/dsMatch/resolveMolecules.js';
import { resolveRulesForPage } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import { listLayoutElements, indexById } from '/_102020_/l2/dsMatch/layoutElements.js';
import { loadElementGroupSelections } from '/_102020_/l2/dsMatch/agent1.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { resolveTagToFile } from '/_102020_/l2/utils.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile } from '/_102020_/l2/agentImplementGenome/planning.js';

// Fixed base render skill — ALWAYS first in the pipeline. Renders the structure
// (definition.layout) + the molecule assigned to each element + applies the DS tokens.
const GENOME_SKILL = '_102020_/l2/agentImplementGenome/skills/genCfePageGenome.ts';
// Defaults for the VARIABLE slots when the DS/layout entry in project.json declares no `skill`.
const DEFAULT_DS_SKILL = '_102020_/l2/agentImplementGenome/skills/genCfePageDesignSystem.ts';
const DEFAULT_LAYOUT_SKILL = '_102020_/l2/agentImplementGenome/skills/layout/genCfePageLayoutStandard.ts';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenDefs',
    agentProject: 102020,
    agentFolder: 'agentImplementGenome',
    agentDescription: 'Assemble the final page defs deterministically: place resolved molecules per element (Fase E)',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
  args?: string,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const a = parseStepArgs(args ?? step.prompt);
    const project = mls.actualProject || 0;
    const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);
    console.info(`[agentGenDefs] ▶ ${a.page} — montagem determinística (sem LLM)`);

    // 1. ORIGIN page11 defs as real objects (clone — we mutate and re-serialize).
    const origin = await importDefs(item.defsOrigem);
    if (!origin?.definition) throw new Error(`origin defs not loadable: ${item.defsOrigem}`);
    const definition = clone(origin.definition);
    const pipeline = clone(origin.pipeline ?? []);
    console.info(`[agentGenDefs] ${a.page}: page11 importado (origem=${item.defsOrigem})`);

    // 2. Agent1's per-element group choices.
    const assignments = await loadElementGroupSelections(item.defsDestino);

    // 3. Resolve variant per group (deterministic) and place a single `molecule` per element.
    const { rules, configuredAxes } = await resolveRulesForPage(project, a.module, a.page!, a.ds);
    const catalog = await buildMoleculeCatalog();
    const byId = indexById(listLayoutElements(definition.layout));
    console.info(`[agentGenDefs] ${a.page}: ${assignments.length} grupo(s) do Agent1 · ${byId.size} elemento(s) no layout · eixos configurados no DS: [${[...configuredAxes].join(', ') || '—'}] · catálogo: ${catalog.length} molécula(s)`);

    const usagePaths = new Set<string>();
    const assigned: AssignedMolecule[] = [];
    let placed = 0, gated = 0, noMatch = 0, unknownId = 0;
    for (const { id, group } of assignments) {
      const el = byId.get(id);
      if (!el) { console.warn(`[agentGenDefs]   ⚠ ${id}: id não existe no layout (ignorado)`); unknownId++; continue; }
      // Gate: only swap when the DS configured an axis governing this group (else keep default UI).
      if (!groupHasConfiguredAxis(group, catalog, configuredAxes)) {
        console.info(`[agentGenDefs]   – ${id} (${group}): DS não configurou eixo deste grupo → mantém controle padrão`);
        gated++; continue;
      }
      const r = matchVariant(group, rules, catalog);
      if (!r) { console.info(`[agentGenDefs]   – ${id} (${group}): nenhuma variante casa com o DS → mantém controle padrão`); noMatch++; continue; }
      const f = resolveTagToFile(r.entry.tag);
      const molecule: AssignedMolecule = {
        project: r.entry.project,
        group,
        tag: r.entry.tag,
        purpose: r.entry.objective,
        import: f ? `/_${f.project}_/l2/${f.folder}/${f.shortName}.js` : '',
      };
      el.ref.molecule = molecule;            // single molecule per element
      assigned.push(molecule);
      if (r.entry.usagePath) usagePaths.add(r.entry.usagePath);
      console.info(`[agentGenDefs]   ✓ ${id} [${el.kind}/${el.intent}] → ${group} → ${r.entry.tag}`);
      placed++;
    }
    console.info(`[agentGenDefs] ${a.page}: ${placed} molécula(s) colocada(s) · ${gated} sem-opinião · ${noMatch} sem-match · ${unknownId} id-inválido`);

    // 4. Repoint paths, override skills + dependsFiles, stamp, write.
    repointPaths(pipeline, a.layout, a.ds);
    const skills = await resolvePageSkills(project, a.layout, a.ds);
    const cssRef = dsGlobalCssRef(project, a.ds);
    const usageList = [...usagePaths].sort();
    for (const p of pipeline) {
      if (skills.length) p.skills = skills;
      p.dependsFiles = mergeDepends(p.dependsFiles, cssRef, usageList);
    }
    console.info(`[agentGenDefs] ${a.page}: skills=[${skills.join(', ')}] · +css=${cssRef} · +${usageList.length} usage skill(s)`);

    let finalSrc = renderDefs(item.defsDestino, definition, pipeline, dedupeAssigned(assigned));

    if (!context.isTest) {
      const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page!, new Date().toISOString(), finalSrc);
      finalSrc = `${finalSrc.replace(/\s*$/, '')}\n\n${renderDsVersionExport(stamp)}\n`;
      await saveFile(item.defsDestino, finalSrc);
      console.info(`[agentGenDefs] ✓ ${a.page}: defs final gravado em ${item.defsDestino} (pageVersion rulesHash=${stamp.rulesHash})`);
    }

    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    const msg = `[agentGenDefs] ${error instanceof Error ? error.message : String(error)}`;
    console.error('✗', msg);
    return [mkFail(context, parentStep, step, hookSequential, msg)];
  }
}

// ─── helpers ──────────────────────────────────────────────────────────────

/** Import a defs file's exports ({ definition, pipeline }) as real objects. */
async function importDefs(ref: string): Promise<any> {
  const norm = ref.startsWith('/') ? ref.slice(1) : ref;
  const f = mls.stor.convertFileReferenceToFile(norm);
  if (!f) return null;
  return collabImport({ project: f.project, folder: f.folder, shortName: f.shortName, extension: '.defs.ts' });
}

/** Deep clone of a JSON-serializable defs object. */
function clone<T>(o: T): T { return JSON.parse(JSON.stringify(o)); }

/** Repoint each pipeline entry's outputPath/defPath from page11 → page{layout}{ds}. */
function repointPaths(pipeline: any[], layout: number | string, ds: number | string): void {
  const to = `/${variationFolder(layout, ds)}/`;
  for (const p of pipeline ?? []) {
    if (typeof p.outputPath === 'string') p.outputPath = p.outputPath.replace('/page11/', to);
    if (typeof p.defPath === 'string') p.defPath = p.defPath.replace('/page11/', to);
  }
}

/**
 * Resolve the render skills for this page, in pipeline order:
 *   [ genome (fixed), DS skill (per-DS), layout skill (per-layout) ].
 * The DS/layout skills come from project.json (designSystems[ds].skill / layouts[layout].skill),
 * falling back to the defaults above.
 */
async function resolvePageSkills(project: number, layout: number | string, ds: number | string): Promise<string[]> {
  const config: any = await getConfigProject(project);
  const dsSkill = config?.designSystems?.[String(ds)]?.skill || DEFAULT_DS_SKILL;
  const layoutSkill = config?.layouts?.[String(layout)]?.skill || DEFAULT_LAYOUT_SKILL;
  return [GENOME_SKILL, dsSkill, layoutSkill].filter(Boolean);
}

/** Merge the DS global css (plain) + molecule usage skills (?key=skill) into dependsFiles. */
function mergeDepends(existing: unknown, cssRef: string, usagePaths: string[]): string[] {
  const out: string[] = Array.isArray(existing) ? existing.filter((x): x is string => typeof x === 'string') : [];
  const has = (v: string) => out.includes(v);
  if (!has(cssRef)) out.push(cssRef);
  for (const u of usagePaths) {
    const ref = `${u}?key=skill`;
    if (!has(ref)) out.push(ref);
  }
  return out;
}

/** Unique molecules by project|tag (for the flat moleculeAssignments tail / dsVersion stamp). */
function dedupeAssigned(molecules: AssignedMolecule[]): AssignedMolecule[] {
  const seen = new Set<string>();
  const out: AssignedMolecule[] = [];
  for (const m of molecules) {
    const key = `${m.project}|${m.tag}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out;
}

/** Serialize the final defs: header + definition (with molecules) + pipeline + flat moleculeAssignments. */
function renderDefs(defsRef: string, definition: any, pipeline: any, assigned: AssignedMolecule[]): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  return [
    `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`,
    '',
    `export const definition = ${JSON.stringify(definition, null, 2)};`,
    '',
    `export const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;`,
    '',
    // Flat, unique used-molecule list. Source of truth for the dsVersion staleness stamp.
    `export const moleculeAssignments = ${JSON.stringify(assigned, null, 2)} as const;`,
    '',
  ].join('\n');
}
