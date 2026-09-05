/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/steps/c3-patch/agentCm2Patch.ts" enhancement="_102027_/l2/enhancementAgent"/>

// c3-patch — deterministic, no LLM. Joins c1's regions with every c2 group's accepted choices (both
// read from the TASK TREE, never a file) and rewrites the target .defs.ts. This is the only write of
// the whole run, and the only stor file this agent ever touches — see agentChooseMolecules2.ts's
// header for the "zero artifact" rule this step exists to close: no report, no trace, no l4 folder.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { readStorText, writeStorTextAtomic } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import { chFileRefFromImport } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';
import { Cm2MoleculeChoice, Cm2PipelineAddition, applyMoleculeChoices, applyPipelineSkills, parsePageDefsSource, serializePageDefsSource } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';
import { CM2_AGENT_FOLDER, cm2ComponentReference, cm2GroupDoneAnchor, cm2ParseStepArgs, cm2PipelineRef, cm2ReadC1Result, cm2ReadGroupResult } from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Types.js';

const AGENT_NAME = 'agentCm2Patch';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${CM2_AGENT_FOLDER}/steps/c3-patch`,
    agentDescription: 'c3-patch — rewrites the target .defs.ts with the chosen molecules; the only write of the run',
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

  if (!c1.regions.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no region found in the target — nothing to patch, no file touched', 'input_output')];
  }

  const choices = new Map<string, Cm2MoleculeChoice | null>();
  const additionsByGroup = new Map<string, Cm2PipelineAddition>();

  for (const group of c1.groups) {
    const groupResult = cm2ReadGroupResult(context, group);
    if (!groupResult) {
      return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] '${cm2GroupDoneAnchor(group)}' result could not be read from the task tree`)];
    }
    // A group whose gate never accepted an answer (ok:false) has an empty choices array — its regions
    // simply get no entry below and stay untouched, never a false 'no molecule' write.
    for (const choice of groupResult.choices) {
      if (!choice.tag) {
        choices.set(choice.region, null);
        continue;
      }
      choices.set(choice.region, { group, tag: choice.tag });
      // The catalog publishes usageContract in IMPORT form ('/_102020_/.../usage'); a pipeline array
      // needs PIPELINE form ('_102020_/.../usage.ts') or materialize drops it — see cm2PipelineRef.
      const addition = additionsByGroup.get(group) || { usageRef: cm2PipelineRef(groupResult.usageContract), componentFiles: [] };
      addition.componentFiles.push(cm2ComponentReference(catalogProject, choice.tag));
      additionsByGroup.set(group, addition);
    }
  }

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
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] '${target}' does not match the expected { definition, pipeline } shape`)];
  }

  const regionIds = c1.regions.map(region => region.region);
  const newDefinition = applyMoleculeChoices(parsedDefs.definitionJson, regionIds, choices);
  const newPipeline = applyPipelineSkills(parsedDefs.pipelineJson, [...additionsByGroup.values()]);
  const rewritten = serializePageDefsSource(parsedDefs, newDefinition, newPipeline);

  // Idempotent: a rerun that changes nothing must not touch the file at all — see the run's "zero
  // artifact" rule (agentChooseMolecules2.ts). String equality is enough because both sides come from
  // the exact same JSON.stringify(..., null, 2) formatting.
  if (rewritten === source) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', 'no molecule choice changed anything — target left untouched', 'input_output')];
  }

  await writeStorTextAtomic(targetFile, rewritten, true);

  const assignedCount = [...choices.values()].filter(Boolean).length;
  const summary = `${target}: ${assignedCount} region(s) got a molecule, ${choices.size - assignedCount} answered 'none'`;
  return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output')];
}
