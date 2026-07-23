/// <mls fileReference="_102020_/l2/aura/agentImplementGenome/agentGenDefs.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Fase E — assemble the FINAL page defs. DETERMINISTIC, no LLM (like agentRegisterGenome:
// only beforePromptStep → completed). It:
//   1. imports the ORIGIN page11 defs ({ definition, pipeline });
//   2. reads Agent2's per-element variant picks (variantSelections = [{ id, group, tag }]);
//   3. looks each tag up in the catalog and places a single `molecule` on the layout element
//      (field/filter/action/container) — by id. Elements Agent2 rejected (tag: null) carry no
//      molecule; instead they receive `layoutRules` — the configured layout axes the plain
//      control must still implement (task 13, via rulesForPlainElement);
//   4. repoints paths page11 → page{layout}{ds}, overrides the pipeline `skills`
//      ([genome, DS, layout] + one usage skill per used molecule group) and adds the DS tokens
//      module (designSystem.ts) to `dependsFiles`, stamps pageVersion, and writes the defs.
//
// The semantic choice is done upstream (group = Agent1, variant = Agent2); this step only PLACES.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { collabImport } from '/_102027_/l2/collabImport.js';
import { variationFolder, pageRef, originCandidates } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/aura/helpers/dsMatch/dsVersion.js';
import { designSystemTsRef } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';
import { buildMoleculeCatalog } from '/_102020_/l2/aura/helpers/dsMatch/buildMoleculeCatalog.js';
import type { AssignedMolecule } from '/_102020_/l2/aura/helpers/dsMatch/resolveMolecules.js';
import { listLayoutElements, indexById } from '/_102020_/l2/aura/helpers/dsMatch/layoutElements.js';
import { loadVariantSelections, loadElementGroupSelections } from '/_102020_/l2/aura/helpers/dsMatch/agent1.js';
import { resolveRulesForPage } from '/_102020_/l2/aura/helpers/dsMatch/resolveRulesForPage.js';
import { rulesForPlainElement } from '/_102020_/l2/aura/helpers/dsMatch/plainControlRules.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { resolveTagToFile } from '/_102020_/l2/utils.js';
import { parseStepArgs, mkCompleted, mkFail, saveFile, readRawSource } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import { parsePageAdjustments, renderPageAdjustmentsExport } from '/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js';

// Fixed base render skill — ALWAYS first in the pipeline. Renders the structure
// (definition.layout) + the molecule assigned to each element + applies the DS tokens.
const GENOME_SKILL = '_102020_/l2/aura/agentImplementGenome/skills/genCfePageGenome.ts';
// Defaults for the VARIABLE slots when the DS/layout entry in project.json declares no `skill`.
const DEFAULT_DS_SKILL = '_102020_/l2/aura/agentImplementGenome/skills/genCfePageDesignSystem.ts';
const DEFAULT_LAYOUT_SKILL = '_102020_/l2/aura/agentImplementGenome/skills/layout/genCfePageLayoutStandard.ts';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenDefs',
    agentProject: 102020,
    agentFolder: 'aura/agentImplementGenome',
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
    const defsDestino = pageRef(project, a.module, a.layout, a.ds, a.page!, '.defs.ts', a.device);
    console.info(`[agentGenDefs] ▶ ${a.page} — montagem determinística (sem LLM)`);

    // 1. ORIGIN defs as real objects (clone — we mutate and re-serialize). Resolve the origin by
    //    IMPORTING the fallback candidates (page{L}{D} → page{L}1 → page11) and taking the FIRST
    //    with a valid `definition`. A candidate's file merely EXISTING is not enough: when creating
    //    a new variation (e.g. page41), a broken/empty destination stub would otherwise be read as
    //    its OWN origin (page{L}{D} is the first candidate) → "origin defs not loadable". Importing
    //    and requiring a definition skips such stubs (and missing/unparseable files) → page11.
    let origin: any = null;
    let originFolder = variationFolder(1, 1);
    let defsOrigem = '';
    for (const [ol, od] of originCandidates(a.layout, a.ds)) {
      const ref = pageRef(project, a.module, ol, od, a.page!, '.defs.ts', a.device);
      let imported: any = null;
      try { imported = await importDefs(ref); } catch { imported = null; }
      if (imported?.definition) { origin = imported; originFolder = variationFolder(ol, od); defsOrigem = ref; break; }
    }
    if (!origin?.definition) {
      const tried = originCandidates(a.layout, a.ds).map(([l, d]) => variationFolder(l, d)).join(' → ');
      throw new Error(`origin defs not loadable for ${a.page} (tried ${tried})`);
    }
    const definition = clone(origin.definition);
    const pipeline = clone(origin.pipeline ?? []);
    console.info(`[agentGenDefs] ${a.page}: origem importada (${originFolder}, ref=${defsOrigem})`);

    // 2. Per-element picks. With molecules: Agent2's variant picks (tag) — the semantic choice is
    //    already done; we only PLACE the chosen molecule (by id). Without molecules (useMolecules=
    //    false): Agent1's group selections mapped to `tag: null`, so every element goes down the
    //    "no molecule" path below and gets `layoutRules` only (empty molecule catalog).
    const useMolecules = a.useMolecules !== false;
    const selections = useMolecules
      ? await loadVariantSelections(defsDestino)
      : (await loadElementGroupSelections(defsDestino)).map(g => ({ id: g.id, group: g.group, tag: null as string | null }));
    const catalog = useMolecules ? await buildMoleculeCatalog() : [];
    const byTag = new Map(catalog.map(m => [m.tag, m]));
    const byId = indexById(listLayoutElements(definition.layout));
    console.info(`[agentGenDefs] ${a.page}: useMolecules=${useMolecules} · ${selections.length} seleção(ões) · ${byId.size} elemento(s) no layout · catálogo: ${catalog.length}`);

    // 2b. Hygiene — the origin may be an already-generated variation (e.g. page31), whose
    //     elements can already carry molecule/layoutRules. Clear them so placement below is
    //     deterministic regardless of whether the origin is page11 (clean) or a produced
    //     variation. The layout STRUCTURE of the ancestor is preserved; molecules re-derive.
    let cleared = 0;
    for (const el of byId.values()) {
      if (el.ref.molecule || el.ref.layoutRules) {
        delete el.ref.molecule;
        delete el.ref.layoutRules;
        cleared++;
      }
    }
    if (cleared) console.info(`[agentGenDefs] ${a.page}: higienizou molecule/layoutRules de ${cleared} elemento(s) da origem já-gerada`);

    // 3. Place one `molecule` per selected element. `tag: null` = Agent2 rejected/omitted —
    //    no molecule, but the group survives so the plain control can receive `layoutRules`.
    const usagePaths = new Set<string>();
    const assigned: AssignedMolecule[] = [];
    const groupById = new Map<string, string>(); // molecule-less elements with a known group
    let placed = 0, unknownId = 0, unknownTag = 0, rejectedCount = 0;
    for (const { id, group, tag } of selections) {
      const el = byId.get(id);
      if (!el) { console.warn(`[agentGenDefs]   ⚠ ${id}: id não existe no layout (ignorado)`); unknownId++; continue; }
      if (!tag) { groupById.set(id, group); rejectedCount++; continue; }
      const entry = byTag.get(tag);
      if (!entry) { console.warn(`[agentGenDefs]   ⚠ ${id}: tag fora do catálogo: ${tag}`); groupById.set(id, group); unknownTag++; continue; }
      const f = resolveTagToFile(tag);
      const molecule: AssignedMolecule = {
        project: entry.project,
        group,
        tag,
        purpose: entry.objective,
        import: f ? `/_${f.project}_/l2/${f.folder}/${f.shortName}.js` : '',
      };
      el.ref.molecule = molecule;            // single molecule per element
      assigned.push(molecule);
      if (entry.usagePath) usagePaths.add(entry.usagePath);
      console.info(`[agentGenDefs]   ✓ ${id} [${el.kind}/${el.intent}] → ${group} → ${tag}`);
      placed++;
    }
    console.info(`[agentGenDefs] ${a.page}: ${placed} molécula(s) colocada(s) · ${rejectedCount} rejeitada(s) · ${unknownId} id-inválido · ${unknownTag} tag-inválida`);

    // 3b. Task 13 — molecule-less elements still follow the configured layout rules: stamp
    //     `layoutRules` (axes governing the element's group + input transversals; only axes
    //     the layout EXPLICITLY configured). Elements with a molecule get nothing — the
    //     molecule was filtered by those axes and already implements them.
    const { rules, configuredAxes } = await resolveRulesForPage(project, a.module, a.page!, a.layout);
    let ruled = 0;
    for (const el of byId.values()) {
      if (el.ref.molecule) continue;
      const layoutRules = rulesForPlainElement(el.kind, groupById.get(el.id) ?? null, rules, configuredAxes);
      if (!layoutRules) continue;
      el.ref.layoutRules = layoutRules;
      console.info(`[agentGenDefs]   ◦ ${el.id} [${el.kind}] plain → layoutRules ${JSON.stringify(layoutRules)}`);
      ruled++;
    }
    console.info(`[agentGenDefs] ${a.page}: ${ruled} elemento(s) plain com layoutRules`);

    // 4. Repoint paths, override skills + dependsFiles, stamp, write.
    // Usage skills go in the pipeline `skills` array (the materializer feeds `skills` to the LLM
    // as skill sections; a `?key=skill` suffix on dependsFiles is understood by nobody).
    repointPaths(pipeline, originFolder, a.layout, a.ds);
    const baseSkills = await resolvePageSkills(project, a.layout, a.ds);
    const cssRef = designSystemTsRef(project);
    const usageList = [...usagePaths].sort();
    const skills = [...baseSkills, ...usageList];
    for (const p of pipeline) {
      if (skills.length) p.skills = skills;
      p.dependsFiles = mergeDepends(p.dependsFiles, cssRef);
    }
    console.info(`[agentGenDefs] ${a.page}: skills=[${baseSkills.join(', ')}] + ${usageList.length} usage skill(s) · +ds=${cssRef}`);

    // Preserve any user page-edit adjustments already recorded on the destination defs — a genome
    // rewrite must not silently drop them (they replay on every regeneration). See agentManagePage.
    const priorAdjustments = parsePageAdjustments(await readRawSource(defsDestino));
    if (priorAdjustments.length) console.info(`[agentGenDefs] ${a.page}: preservando ${priorAdjustments.length} pageAdjustment(s) do defs anterior`);

    let finalSrc = renderDefs(defsDestino, definition, pipeline, dedupeAssigned(assigned), priorAdjustments);

    if (!context.isTest) {
      const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page!, new Date().toISOString(), finalSrc);
      finalSrc = `${finalSrc.replace(/\s*$/, '')}\n\n${renderDsVersionExport(stamp)}\n`;
      await saveFile(defsDestino, finalSrc);
      console.info(`[agentGenDefs] ✓ ${a.page}: defs final gravado em ${defsDestino} (pageVersion rulesHash=${stamp.rulesHash})`);
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

/** Repoint each pipeline entry's outputPath/defPath from the resolved origin folder → page{layout}{ds}.
 *  When origin === destination the replace is a no-op (early return). */
function repointPaths(pipeline: any[], fromFolder: string, layout: number | string, ds: number | string): void {
  const from = `/${fromFolder}/`;
  const to = `/${variationFolder(layout, ds)}/`;
  if (from === to) return;
  for (const p of pipeline ?? []) {
    if (typeof p.outputPath === 'string') p.outputPath = p.outputPath.split(from).join(to);
    if (typeof p.defPath === 'string') p.defPath = p.defPath.split(from).join(to);
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

/** Merge the DS tokens module (designSystem.ts) into dependsFiles (plain path — no query suffixes). */
function mergeDepends(existing: unknown, cssRef: string): string[] {
  const out: string[] = Array.isArray(existing) ? existing.filter((x): x is string => typeof x === 'string') : [];
  if (!out.includes(cssRef)) out.push(cssRef);
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

/** Serialize the final defs: header + definition (with molecules) + pipeline + flat
 *  moleculeAssignments (+ preserved pageAdjustments, when the previous defs had user edits). */
function renderDefs(defsRef: string, definition: any, pipeline: any, assigned: AssignedMolecule[], priorAdjustments: import('/_102020_/l2/aura/helpers/dsMatch/pageAdjustments.js').PageAdjustment[] = []): string {
  const cleanRef = defsRef.startsWith('/') ? defsRef.slice(1) : defsRef;
  const lines = [
    `/// <mls fileReference="${cleanRef}" enhancement="_blank"/>`,
    '',
    `export const definition = ${JSON.stringify(definition, null, 2)};`,
    '',
    `export const pipeline = ${JSON.stringify(pipeline, null, 2)} as const;`,
    '',
    // Flat, unique used-molecule list. Source of truth for the dsVersion staleness stamp.
    `export const moleculeAssignments = ${JSON.stringify(assigned, null, 2)} as const;`,
    '',
  ];
  if (priorAdjustments.length) {
    lines.push(renderPageAdjustmentsExport(priorAdjustments), '');
  }
  return lines.join('\n');
}
