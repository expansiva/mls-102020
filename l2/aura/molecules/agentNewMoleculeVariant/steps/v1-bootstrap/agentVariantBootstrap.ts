/// <mls fileReference="_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/agentVariantBootstrap.ts" enhancement="_102027_/l2/enhancementAgent"/>

// v1-bootstrap (NO LLM): admission + context assembly. See flow.json.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { appendLongTermMemory } from '/_102027_/l2/aiAgentHelper.js';
import { skills as skillList } from '/_102020_/l2/aura/molecules/skills/index';
import {
  V_AGENT_FOLDER,
  readStorText,
  toDisplayPath,
  vContextFileInfo,
  vDestProject,
  vFileExists,
  vMoleculeFile,
  vTraceFileInfo,
  writeJsonArtifact,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vFs.js';
import { loadVTheme, pascalCaseThemeName } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vTheme.js';
import {
  detectPortal,
  extractMlInventory,
  extractOriginClassName,
  parseOriginRef,
} from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vOrigin.js';
import { VariantContext, variantContextSummary } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vContext.js';
import { vDoneAnchor, vResultStepIntent, vUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/helpers/vSteps.js';
import { VBootstrapInputs, runBootstrapGate } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/steps/v1-bootstrap/gate.js';
import { getVInput, getVRootPlan } from '/_102020_/l2/aura/molecules/agentNewMoleculeVariant/agentNewMoleculeVariant.js';

const AGENT_NAME = 'agentVariantBootstrap';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: `${V_AGENT_FOLDER}/steps/v1-bootstrap`,
    agentDescription: 'v1-bootstrap — deterministic admission + context assembly for the variant pipeline',
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

  const input = getVInput(context);
  const rootPlan = getVRootPlan(context);
  const destProject = vDestProject();

  const { theme, errors: themeErrors } = await loadVTheme(destProject);
  const { ref, error: originRefError } = parseOriginRef(input.page);

  let originTs = '';
  let originLess = '';
  if (ref) {
    originTs = await readStorText({ project: ref.project, level: 2, folder: `molecules/${ref.group}`, shortName: ref.shortName, extension: '.ts' }, false);
    originLess = await readStorText({ project: ref.project, level: 2, folder: `molecules/${ref.group}`, shortName: ref.shortName, extension: '.less' }, false);
  }

  let ctx: VariantContext | null = null;
  const collisions: string[] = [];
  if (theme && ref && originTs) {
    const suffix = theme.themeInfo.suffix;
    const variantShortName = `${ref.shortName}${suffix}`;
    const portal = detectPortal(originTs);
    const canonical = skillList.find(item => item.name.toLowerCase() === ref.group)?.name || ref.group;
    const files = {
      ts: toDisplayPath(vMoleculeFile(ref.group, variantShortName, '.ts')),
      defs: toDisplayPath(vMoleculeFile(ref.group, variantShortName, '.defs.ts')),
      less: toDisplayPath(vMoleculeFile(ref.group, variantShortName, '.less')),
      html: toDisplayPath(vMoleculeFile(ref.group, variantShortName, '.html')),
    };
    for (const extension of ['.ts', '.less', '.html'] as const) {
      const fileInfo = vMoleculeFile(ref.group, variantShortName, extension);
      if (vFileExists(fileInfo)) collisions.push(toDisplayPath(fileInfo));
    }
    const pattern: 'simple' | 'portal' = portal ? 'portal' : 'simple';
    const example = theme.examples.find(item => item.pattern === pattern) || null;
    let exampleReadable = false;
    if (example) {
      const parsedExample = parseOriginRef(example.ref);
      if (parsedExample.ref) {
        const exampleLess = await readStorText({ project: parsedExample.ref.project, level: 2, folder: `molecules/${parsedExample.ref.group}`, shortName: parsedExample.ref.shortName, extension: '.less' }, false);
        exampleReadable = !!exampleLess.trim();
      }
    }
    ctx = {
      schemaVersion: 1,
      createdAt: new Date().toISOString(),
      userNotes: input.notes,
      origin: {
        ref: input.page,
        project: ref.project,
        group: ref.group,
        groupCanonical: canonical,
        shortName: ref.shortName,
        tag: ref.tag,
        className: extractOriginClassName(originTs) || '',
        importPath: ref.importPath,
        portal,
        mlClassInventory: extractMlInventory(originTs, originLess),
      },
      theme: {
        project: destProject,
        ref: `_${destProject}_/l2/skills/theme`,
        info: theme.themeInfo,
      },
      variant: {
        shortName: variantShortName,
        tag: `${ref.tag}${suffix}`,
        className: `${extractOriginClassName(originTs) || 'Molecule'}${pascalCaseThemeName(theme.themeInfo.name)}`,
        group: ref.group,
        files,
      },
      example: {
        pattern,
        ref: example && exampleReadable ? example.ref : null,
        coldStart: !example || !exampleReadable,
      },
      userLanguage: rootPlan.userLanguage,
    };
  }

  const gateInputs: VBootstrapInputs = {
    themeErrors,
    originRefError,
    originTsFound: !!originTs.trim(),
    originLessFound: !!originLess.trim(),
    collisions,
    context: ctx,
  };
  const issues = runBootstrapGate(gateInputs);

  if (issues.length || !ctx) {
    const message = issues.map(issue => `${issue.code}: ${issue.message}`).join('\n') || 'bootstrap failed';
    return [vUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }

  await writeJsonArtifact(vContextFileInfo(ctx.variant.shortName), ctx);
  await appendLongTermMemory(context, { variantShortName: ctx.variant.shortName });
  await writeJsonArtifact(vTraceFileInfo(ctx.variant.shortName, 'v1-bootstrap', 1), {
    savedAt: new Date().toISOString(),
    planId: 'v1-bootstrap',
    summary: variantContextSummary(ctx),
    inventorySize: ctx.origin.mlClassInventory.length,
  });

  return [
    vResultStepIntent(context, parentStep, {
      planId: vDoneAnchor('v1-bootstrap'),
      dependsOn: [],
      stepTitle: variantContextSummary(ctx),
      result: { contextFile: toDisplayPath(vContextFileInfo(ctx.variant.shortName)), variantShortName: ctx.variant.shortName },
    }),
    vUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', variantContextSummary(ctx), 'input_output'),
  ];
}
