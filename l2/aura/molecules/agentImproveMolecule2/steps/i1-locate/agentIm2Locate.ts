/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/agentIm2Locate.ts" enhancement="_102027_/l2/enhancementAgent"/>

// i1-locate (NO LLM): resolves the target molecule in the CURRENT project, reads the four
// artifacts as they are RIGHT NOW plus the group index, detects whether it is a shell, and writes
// context.json once. See flow.json.
//
// It is deterministic on purpose: which file, which group, which tag, what exists and what the
// parent is are all DERIVABLE. The first LLM call of this flow is i2-triage, which decides the
// route — and it decides it reading this context, not the disk.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
// Plumbing is IMPORTED from agentNewMolecule2, never reimplemented (flow.json.principles #1).
// nmResultStepIntent/nmUpdateStatusIntent take a plain `planId: string`, so they serve both flows;
// only nmDoneAnchor is typed to the NM2 plan ids, which is why imTypes ships imDoneAnchor.
import { nmDestProject, toDisplayPath, writeJsonArtifact } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  IM_AGENT_FOLDER,
  ImArtifact,
  ImContext,
  ImInheritance,
  imDoneAnchor,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imTypes.js';
import {
  ImNotFoundError,
  ImTargetRef,
  deriveTag,
  imContextFileInfo,
  imTraceFileInfo,
  readArtifacts,
  readInheritance,
  resolveTarget,
  sourceOf,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imResolve.js';
import { getImInput, getImRootPlan, getImRunKey } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imRootPlan.js';
import { ImLocateInputs, runImLocateGate } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i1-locate/gate.js';

const AGENT_NAME = 'agentIm2Locate';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${IM_AGENT_FOLDER}/steps/i1-locate`,
    agentDescription: 'i1-locate — deterministic resolution of the target molecule for the Improve Molecule 2 pipeline',
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
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);

  const parsedArgs = nmParseStepArgs(step.prompt);
  const runKey = getImRunKey(context, parsedArgs.runKey);
  const rootPlan = getImRootPlan(context);
  const { prompt } = getImInput(context);
  const destProject = nmDestProject();

  // resolveTarget searches every group when the prose named no group, and throws when nothing
  // matches. The throw is the INVERTED PRECONDITION and it is turned into a gate issue, never
  // rethrown: the user must get one readable line, not a stack.
  let target: ImTargetRef | null = null;
  let notFound: string | null = null;
  try {
    target = resolveTarget(rootPlan.target, skillList.map(item => item.name));
  } catch (error) {
    if (!(error instanceof ImNotFoundError)) throw error;
    notFound = error.message;
  }

  const artifacts: ImArtifact[] = target ? await readArtifacts(target) : [];
  const inheritance: ImInheritance = target
    ? await readInheritance(sourceOf(artifacts, 'ts'))
    : { isShell: false, parentReference: null, parentProject: null, parentClassName: null, ownMembers: [], overridableMembers: [] };

  const groupEntry = target
    ? skillList.find(item => item.name.toLowerCase() === target.groupFolder.toLowerCase())
    : undefined;

  // The creation skill is only REFERENCED here, never inlined: each later step imports it from
  // this reference, so context.json stays small (same decision as n1-bootstrap).
  const ctx: ImContext | null = target
    ? {
        schemaVersion: 1,
        createdAt: new Date().toISOString(),
        runKey,
        userPrompt: prompt,
        userLanguage: rootPlan.userLanguage,
        target: {
          project: target.project,
          groupFolder: target.groupFolder,
          groupCanonical: groupEntry?.name || target.groupFolder,
          shortName: target.shortName,
          fileReference: target.fileReference,
          tag: deriveTag(target.groupFolder, target.shortName),
        },
        groupSkill: {
          description: groupEntry?.description || '',
          reference: groupEntry?.skillReference || '',
          usageReference: groupEntry?.skillUsageReference || '',
        },
        artifacts,
        inheritance,
      }
    : null;

  const gateInputs: ImLocateInputs = {
    targetRaw: rootPlan.target,
    notFound,
    groupFolder: target?.groupFolder || '',
    knownGroups: skillList,
    artifacts,
    inheritance,
    destProject,
    context: ctx,
  };
  const gate = runImLocateGate(gateInputs);
  if (!gate.ok || !ctx) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', gate.errors.join('\n'))];
  }

  await writeJsonArtifact(imContextFileInfo(runKey), ctx);
  await appendLongTermMemory(context, { runKey });
  await writeJsonArtifact(imTraceFileInfo(runKey, 'i1-locate', 1), {
    savedAt: ctx.createdAt,
    planId: 'i1-locate',
    summary: imContextSummary(ctx),
    isShell: inheritance.isShell,
  });

  const summary = imContextSummary(ctx);
  return [
    nmResultStepIntent(context, parentStep, {
      planId: imDoneAnchor('i1-locate'),
      dependsOn: [],
      stepTitle: summary,
      result: {
        contextFile: toDisplayPath(imContextFileInfo(runKey)),
        runKey,
        fileReference: ctx.target.fileReference,
        group: ctx.target.groupCanonical,
        tag: ctx.target.tag,
        isShell: inheritance.isShell,
        parentRef: inheritance.parentReference,
        artifactsPresent: artifacts.filter(a => a.present).map(a => a.kind),
      },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', summary, 'input_output'),
  ];
}

// One line, because it becomes the step title the user reads in the task tree.
function imContextSummary(ctx: ImContext): string {
  const present = ctx.artifacts.filter(a => a.present).map(a => a.kind).join(', ');
  const shell = ctx.inheritance.isShell ? ` · shell of ${ctx.inheritance.parentClassName}` : '';
  return `${ctx.target.tag} (${present})${shell}`;
}
