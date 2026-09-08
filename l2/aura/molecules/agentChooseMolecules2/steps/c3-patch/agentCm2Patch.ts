/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c3-patch/agentCm2Patch.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c3-patch — deterministic, no LLM. Joins c1's regions with every c2 group's accepted choices (both
// read from the TASK TREE, never a file) and rewrites the target's PIPELINE. This is the only write of
// the whole run, and the only stor file this agent ever touches — see agentChooseMolecules2.ts's
// header for the "zero artifact" rule this step exists to close: no report, no trace, no l4 folder.
//
// ⚠️ v2 (2026-09-08): WHAT IT WRITES IS THE PIPELINE, AND ONLY THE PIPELINE. With a prose definition
// there is no dataBinding or input node left to carry `molecule: { group, tag }`, so the annotation
// path is gone; `export const definition` is not even a parameter of the serializer, it travels back
// verbatim inside the parsed prefix. The two arrays this step fills are the two materialize actually
// reads (agentCfeMaterializeGen): dependsFiles becomes '## Context files' sections of the render
// prompt, skills is concatenated into its system prompt.
//
// The region→molecule MAPPING is therefore not persisted anywhere (flow.json.knownGaps
// .mappingNotPersisted): the render model receives the chosen components and their groups' usage
// contracts, and composes the page from them.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readStorText, writeStorTextAtomic } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { Cm2PipelineAddition, applyPipelineMolecules, cm2DefinitionKind, parsePageDefsSource, serializePageDefsSource } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';
import { CM2_AGENT_FOLDER, cm2ComponentReference, cm2GroupDoneAnchor, cm2ParseStepArgs, cm2PipelineRef, cm2ReadC1Result, cm2ReadGroupResult } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const AGENT_NAME = 'agentCm2Patch';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CM2_AGENT_FOLDER}/steps/c3-patch`,
    agentDescription: 'c3-patch — equips the target .defs.ts pipeline with the chosen molecules; the only write of the run',
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
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const parsed = cm2ParseStepArgs(args ?? step.prompt);
  const catalogProject = parsed.catalogProject;
  const target = parsed.target;
  if (!catalogProject || !target) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] missing catalogProject/target in step args`)];
  }

  const c1 = cm2ReadC1Result(context);
  if (!c1) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] c1-groups' result could not be read from the task tree`)];
  }

  const additionsByGroup = new Map<string, Cm2PipelineAddition>();
  let chosen = 0;
  let answeredNone = 0;

  for (const group of c1.groups) {
    const groupResult = cm2ReadGroupResult(context, group);
    if (!groupResult) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] '${cm2GroupDoneAnchor(group)}' result could not be read from the task tree`)];
    }
    // A group whose gate never accepted an answer (ok:false) has an empty choices array — it simply
    // contributes nothing below, never a wrong component.
    for (const choice of groupResult.choices) {
      if (!choice.tag) {
        answeredNone += 1;
        continue;
      }
      chosen += 1;
      // The catalog publishes usageContract in IMPORT form ('/_102020_/.../usage'); a pipeline array
      // needs PIPELINE form ('_102020_/.../usage.ts') or materialize drops it — see cm2PipelineRef.
      const addition = additionsByGroup.get(group) || { usageRef: cm2PipelineRef(groupResult.usageContract), componentFiles: [] };
      addition.componentFiles.push(cm2ComponentReference(catalogProject, choice.tag));
      additionsByGroup.set(group, addition);
    }
  }

  // Regions c1 itself answered 'none' for never reached a c2, so they are counted here rather than
  // silently dropped from the summary — the reader is told about every region c1 named.
  const grouplessRegions = c1.regions.filter(region => !region.group).length;

  const targetFile = chFileRefFromImport(target);
  if (!targetFile) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] '${target}' is not a recognizable project reference`)];
  }
  // Read fresh right before writing — the smallest possible window between what c1 decided from and
  // what actually gets patched.
  const source = await readStorText(targetFile, false);
  if (!source) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] target file not found: ${target}`)];
  }
  const parsedDefs = parsePageDefsSource(source);
  if (!parsedDefs) {
    const kind = cm2DefinitionKind(source);
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', kind === 'object'
      ? `[${AGENT_NAME}] '${target}' still carries the v1 OBJECT definition — this agent equips the pipeline of a prose definition (flow.json.decisions.definitionFormat)`
      : `[${AGENT_NAME}] '${target}' does not match the expected { definition (prose), pipeline } shape`)];
  }

  // Prunes this agent's own previous entries before adding this run's, and sorts what it adds — see
  // helpers/cm2DefsPatch.applyPipelineMolecules. Called even with nothing chosen, on purpose: that is
  // what CLEARS a stale molecule a previous run had put there.
  const newPipeline = applyPipelineMolecules(parsedDefs.pipelineJson, [...additionsByGroup.values()]);
  const rewritten = serializePageDefsSource(parsedDefs, newPipeline);

  const tally = `${chosen} molecule(s) for ${c1.regions.length} region(s) — ${answeredNone} answered 'none' by a group, ${grouplessRegions} covered by no group`;

  // Idempotent: a rerun that changes nothing must not touch the file at all — see the run's "zero
  // artifact" rule (agentChooseMolecules2.ts). String equality is enough because both sides come from
  // the exact same JSON.stringify(..., null, 2) formatting, and the definition half is byte-identical
  // by construction (it is never reserialized).
  if (rewritten === source) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `pipeline already carried exactly this — target left untouched (${tally})`, 'input_output')];
  }

  await writeStorTextAtomic(targetFile, rewritten, true);

  return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${target}: pipeline equipped — ${tally}`, 'input_output')];
}
