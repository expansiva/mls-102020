/// <mls fileReference="_102020_/l2/agentImplementsDesignSystem2/agentGenDefs2.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Group B executor (Fase E). One per page; waits on its own select step.
// beforePromptStep → prompt (ORIGIN defs page11 + NEW defs with moleculeAssignments).
// afterPromptStep  → write the assembled FINAL defs into page{layout}{ds}/<page>.defs.ts.
//
// The LLM only ASSEMBLES the already-resolved molecules into the loose-JSON definition;
// it must NOT re-pick molecules (consistency is guaranteed by the deterministic resolve).

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { buildWorkItem } from '/_102020_/l2/dsMatch/derivePaths.js';
import { buildPageDsStamp, renderDsVersionExport } from '/_102020_/l2/dsMatch/dsVersion.js';
import { dsGlobalCssRef } from '/_102020_/l2/dsMatch/buildGlobalCss.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { parseStepArgs, readRawSource, saveFile, mkCompleted, mkFail } from '/_102020_/l2/agentImplementsDesignSystem2/planning.js';

// Defaults when the layout/DS entry in project.json declares no `skill`.
const DEFAULT_LAYOUT_SKILL = '_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts';
const DEFAULT_DS_SKILL = '_102020_/l2/agentMaterializeSolution/skills/genPageDS.ts';

export function createAgent(): IAgentAsync {
  return {
    agentName: 'agentGenDefs2',
    agentProject: 102020,
    agentFolder: 'agentImplementsDesignSystem2',
    agentDescription: 'Assemble the final page defs from origin defs + resolved molecules (Fase E)',
    visibility: 'private',
    beforePromptStep,
    afterPromptStep,
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

  const a = parseStepArgs(args ?? step.prompt);
  const project = mls.actualProject || 0;
  const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);

  const origemSource = await readRawSource(item.defsOrigem);
  const novoSource = await readRawSource(item.defsDestino); // moleculeAssignments + usagePaths

  const humanPrompt = [
    `## Original page defs (page11) — mirror this exact structure\n\`\`\`typescript\n${origemSource}\n\`\`\``,
    `## Resolved molecules (ALREADY chosen — do NOT change them; just place them)\n\`\`\`typescript\n${novoSource}\n\`\`\``,
    `## Output path\n${item.defsDestino}`,
  ].join('\n\n');

  const continueParallel: mls.msg.AgentIntentPromptReady = {
    type: 'prompt_ready',
    args: args ?? step.prompt,
    messageId: context.message.orderAt,
    threadId: context.message.threadId,
    taskId: context.task?.PK || '',
    hookSequential,
    parentStepId: parentStep.stepId,
    humanPrompt,
    systemPrompt: system1,
  };

  return [continueParallel];
}

async function afterPromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {

  try {
    const payload = step.interaction?.payload?.[0];
    if (payload?.type !== 'flexible' || !payload.result) throw new Error(`invalid payload: ${JSON.stringify(payload)}`);

    const out = payload.result as Output['result'];
    if (typeof out.srcFile !== 'string' || !out.srcFile) throw new Error('missing srcFile in result');

    const a = parseStepArgs(step.prompt);
    const project = mls.actualProject || 0;
    const item = buildWorkItem(project, a.module, a.layout, a.ds, a.page!, a.device);

    // The LLM returns ONLY the clean merged defs (with molecules already placed per organism
    // inside `definition`). We append the molecule metadata exports here, deterministically,
    // by reading them from the NEW (per-organism) defs BEFORE we overwrite it. The stored
    // `moleculeAssignments` is FLATTENED + de-duplicated (the per-organism placement already
    // lives in `definition`; this tail is just the page's unique used-molecule list).
    let finalSrc = out.srcFile;
    if (!finalSrc.includes('export const moleculeAssignments')) {
      const tail = buildAssignmentsTail(await readRawSource(item.defsDestino));
      if (tail) finalSrc = `${finalSrc.replace(/\s*$/, '')}\n\n${tail}\n`;
    }

    // Deterministically add the project-wide DS stylesheet to the pipeline's dependsFiles
    // (same ref the generator writes to — single source of truth). Not done by the LLM.
    finalSrc = addGlobalCssDependency(finalSrc, dsGlobalCssRef(project));

    // Override the pipeline `skills` with the CURRENT layout + DS skills from project.json
    // (page11 carries the defaults; this page uses the configured layout/DS render skills).
    const skills = await resolvePageSkills(project, a.layout, a.ds);
    finalSrc = setPipelineSkills(finalSrc, skills);

    if (!context.isTest) {
      // Stamp the DS version (effective rules hash + used-molecules hash) this page was
      // generated under, so staleness can be detected when the DS rules or the molecules
      // it uses later change. Built from finalSrc (which already carries moleculeAssignments).
      if (!finalSrc.includes('export const pageVersion')) {
        const stamp = await buildPageDsStamp(project, a.module, a.layout, a.ds, a.page!, new Date().toISOString(), finalSrc);
        finalSrc = `${finalSrc.replace(/\s*$/, '')}\n\n${renderDsVersionExport(stamp)}\n`;
      }
      await saveFile(item.defsDestino, finalSrc);
    }

    return [mkCompleted(context, parentStep, step, hookSequential)];
  } catch (error) {
    return [mkFail(context, parentStep, step, hookSequential, `[agentGenDefs2] ${error instanceof Error ? error.message : String(error)}`)];
  }
}

/**
 * Build the metadata tail for the FINAL defs from the NEW (per-organism) defs:
 * `moleculeAssignments` flattened to a unique molecule list (no organismName, no repeats),
 * plus the `usagePaths` export verbatim.
 */
function buildAssignmentsTail(novoSource: string): string {
  const ma = novoSource.match(/export\s+const\s+moleculeAssignments\s*=\s*(\[[\s\S]*?\])\s+as\s+const\s*;/);
  if (!ma) return '';
  let organisms: Array<{ molecules?: Array<Record<string, unknown>> }>;
  try { organisms = JSON.parse(ma[1]); } catch { return ''; }

  const seen = new Set<string>();
  const molecules: Array<Record<string, unknown>> = [];
  for (const org of organisms ?? []) {
    for (const m of org?.molecules ?? []) {
      const tag = m?.tag;
      if (typeof tag !== 'string' || !tag) continue;
      const key = `${(m as { project?: number }).project ?? 0}|${tag}`;
      if (seen.has(key)) continue;
      seen.add(key);
      molecules.push(m);
    }
  }

  const lines = [`export const moleculeAssignments = ${JSON.stringify(molecules, null, 2)} as const;`];
  const up = novoSource.match(/export\s+const\s+usagePaths\s*=\s*(\[[\s\S]*?\])\s+as\s+const\s*;/);
  if (up) lines.push('', `export const usagePaths = ${up[1]} as const;`);
  return lines.join('\n');
}

/** Resolve the render skills for this page: [layout skill, DS skill] from project.json. */
async function resolvePageSkills(project: number, layout: number | string, ds: number | string): Promise<string[]> {
  const config: any = await getConfigProject(project);
  const layoutSkill = config?.layouts?.[String(layout)]?.skill || DEFAULT_LAYOUT_SKILL;
  const dsSkill = config?.designSystems?.[String(ds)]?.skill || DEFAULT_DS_SKILL;
  return [layoutSkill, dsSkill];
}

/** Replace EVERY pipeline `skills` array with the given list (full override). */
function setPipelineSkills(src: string, skills: string[]): string {
  const arr = skills.filter(Boolean);
  if (!arr.length) return src;
  const body = arr.map(s => `    "${s}"`).join(',\n');
  return src.replace(/("skills"\s*:\s*\[)[\s\S]*?(\])/g, `$1\n${body}\n  $2`);
}

/**
 * Append the project-wide DS stylesheet ref to EVERY pipeline `dependsFiles` array
 * that does not already contain it. Plain style dependency (no `?key=skill` suffix).
 * Tolerant of empty and non-empty arrays; preserves existing entries.
 */
function addGlobalCssDependency(src: string, ref: string): string {
  if (src.includes(ref)) return src;
  return src.replace(/("dependsFiles"\s*:\s*\[)([\s\S]*?)(\])/g, (_full, open: string, body: string, close: string) => {
    const trimmed = body.replace(/\s+$/, '');
    if (trimmed.trim() === '') return `${open}\n    "${ref}"\n  ${close}`;
    const needsComma = !/,\s*$/.test(trimmed);
    return `${open}${trimmed}${needsComma ? ',' : ''}\n    "${ref}"\n  ${close}`;
  });
}

const system1 = `
<!-- modelType: codereasoning -->

You must return ONLY a valid JSON object. No preamble, no markdown fences.
srcFile MUST be a single JSON string: escape newlines as \\n, tabs as \\t, double quotes
as \\", backslashes as \\\\. Never embed raw multiline code in the JSON value.

## Task
Produce the FINAL page defs for the new design system, given the ORIGINAL page defs
(page11) and the RESOLVED molecule assignments.

## Rules
- Mirror the ORIGINAL defs structure exactly (same exports, sections, organisms, fields).
- For each organism, inject a "molecules" array from moleculeAssignments (match by
  organismName): each entry { "group", "tag", "purpose", "import" } — copy ALL four
  fields exactly, including "import", from the matching moleculeAssignments molecule.
  Organisms with no assigned molecules stay unchanged.
- NEVER change/add/remove molecule choices — use EXACTLY the tags given. You only PLACE them.
- Do NOT add a "moleculesPaths" key. Instead, for EACH path in the input "usagePaths",
  append an entry to the pipeline's EXISTING "dependsFiles" array, in the form
  "<path>?key=skill" (e.g. "_102020_/l2/skills/molecules/groupViewData/usage.ts?key=skill").
  Keep ALL existing dependsFiles entries; do not duplicate; do not add the bare path
  without the "?key=skill" suffix.
- Repoint the first line /// <mls fileReference=...> and any outputPath/defPath from
  page11 to the Output path's folder (page{layout}{ds}); keep the page name the same.
- Keep the loose JSON-ish formatting of the original definition.
- Output ONLY the merged defs (header + definition + pipeline). Do NOT re-emit the
  resolved-molecules input, its header, or its moleculeAssignments/usagePaths/pageVersion
  exports — those are appended later by code.

## Output format
[[OutputSection]]
`;

//#region OutputSection
export type Output = {
  type: 'flexible';
  result: { srcFile: string };
};
//#endregion
