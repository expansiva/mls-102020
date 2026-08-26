/// <mls fileReference="_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/steps/s1-group/agentSyGroup.ts" enhancement="_102027_/l2/enhancementAgent"/>

// s1-group (NO LLM): for ONE group, writes index.defs.ts (level 2) and index.html — 100% derived from
// the group's own molecule files. See readme.md for the field-by-field derivation rules and
// CHANGELOG.md for why each one exists.
//
// Deterministic on purpose (todo §3 / analysis §8): this is the part of the catalog the piloted
// agentChooseMolecules proved an LLM can choose from without inventing a tag, and it must never be
// refém of the authored index.ts (s3) — if s3 fails, the catalog this step wrote is already there.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { compileStorTs, nmFileExists, nmDestProject, readStorText, writeJsonArtifact, writeStorTextAtomic } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmFs.js';
import { nmParseStepArgs, nmResultStepIntent, nmUpdateStatusIntent } from '/_102020_/l2/aura/molecules/agentNewMolecule2/helpers/nmSteps.js';
import {
  SY_AGENT_PROJECT,
  SyGroupArtifact,
  SyMoleculeEntry,
  SyScenario,
  syGroupDoneAnchor,
  syGroupFolder,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syTypes.js';
import {
  syExtractExistingScenarios,
  syExtractMoleculeDefs,
  syExtractTag,
  syHarvestScenarios,
  syPublishedLayout,
  syVaryingAxes,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syExtract.js';
import { syRenderIndexDefs, syRenderIndexHtml } from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syRenderDefs.js';
import {
  nmDefsFile,
  nmGroupDefsFile,
  nmGroupIndexFile,
  nmTsFile,
  syGroupArtifactFileInfo,
  syScanGroupMoleculeShortNames,
} from '/_102020_/l2/aura/molecules/agentSyncMoleculeCatalog/helpers/syFs.js';

const AGENT_NAME = 'agentSyGroup';

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: SY_AGENT_PROJECT,
    agentFolder: 'aura/molecules/agentSyncMoleculeCatalog/steps/s1-group',
    agentDescription: "s1-group — writes one group's index.defs.ts and index.html, derived from its molecule files. No LLM.",
    visibility: 'private',
    beforePromptStep,
  };
}

/** What the root plants in this step's prompt — everything s1 needs, so it never re-derives level 1. */
interface SyGroupStepArgs {
  group: string;
  purpose: string;
  usageContract: string;
}

function parseGroupStepArgs(prompt: unknown): SyGroupStepArgs | null {
  const raw = typeof prompt === 'string' ? prompt : '';
  if (!raw.trim().startsWith('{')) return null;
  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const group = typeof parsed.group === 'string' ? parsed.group.trim() : '';
    if (!group) return null;
    return {
      group,
      purpose: typeof parsed.purpose === 'string' ? parsed.purpose : '',
      usageContract: typeof parsed.usageContract === 'string' ? parsed.usageContract : '',
    };
  } catch {
    return null;
  }
}

async function beforePromptStep(
  agent: IAgentMeta,
  context: mls.msg.ExecutionContext,
  parentStep: mls.msg.AIAgentStep,
  step: mls.msg.AIAgentStep,
  hookSequential: number,
): Promise<mls.msg.AgentIntent[]> {
  if (!context.task) throw new Error(`[${AGENT_NAME}] task invalid`);
  const stepArgs = nmParseStepArgs(step.prompt);
  const groupArgs = parseGroupStepArgs(step.prompt);
  if (!stepArgs.runKey || !groupArgs) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] step args missing runKey/group/purpose/usageContract`)];
  }
  const runKey = stepArgs.runKey;
  const { group: canonical, purpose, usageContract } = groupArgs;
  const folder = syGroupFolder(canonical);
  const project = nmDestProject();

  const shortNames = syScanGroupMoleculeShortNames(folder);
  if (!shortNames.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] no molecule files found under molecules/${folder}`)];
  }

  const warnings: string[] = [];
  const extracted: Array<{ tag: string; shortName: string; layoutConfig: Record<string, string>; objective: string | null; defsRef: string | null }> = [];
  for (const shortName of shortNames) {
    const tsSource = await readStorText(nmTsFile(folder, shortName), false);
    const tag = syExtractTag(tsSource);
    if (!tag) {
      warnings.push(`${shortName}.ts: nenhum @customElement encontrado — molécula ignorada`);
      continue;
    }
    const defsInfo = nmDefsFile(folder, shortName);
    const hasDefs = nmFileExists(defsInfo);
    const defsExtracted = hasDefs ? syExtractMoleculeDefs(await readStorText(defsInfo, false)) : null;
    if (hasDefs && !defsExtracted) warnings.push(`${shortName}.defs.ts: sem '# Objective' legível — tratada como sem contrato`);
    extracted.push({
      tag,
      shortName,
      layoutConfig: defsExtracted?.layoutConfig || {},
      objective: defsExtracted?.objective || null,
      defsRef: defsExtracted ? `/_${project}_/l2/molecules/${folder}/${shortName}.defs` : null,
    });
  }

  if (!extracted.length) {
    return [nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', `[${AGENT_NAME}] every molecule of ${folder} was unreadable: ${warnings.join('; ')}`)];
  }

  const varyingAxes = syVaryingAxes(extracted.filter(m => m.defsRef).map(m => m.layoutConfig));
  const molecules: SyMoleculeEntry[] = extracted
    .slice()
    .sort((a, b) => a.tag.localeCompare(b.tag))
    .map(m => ({
      tag: m.tag,
      shortName: m.shortName,
      layout: syPublishedLayout(m.layoutConfig, varyingAxes),
      defsRef: m.defsRef,
      objective: m.objective,
    }));

  const { scenarios, scenariosSource } = await resolveScenarios(folder, extracted.map(m => ({ tag: m.tag })));

  const generatedAt = new Date().toISOString();
  const indexDefsText = syRenderIndexDefs({ project, groupCanonical: canonical, groupFolder: folder, usageContract, purpose, molecules, scenarios, generatedAt });
  const indexHtmlText = syRenderIndexHtml(folder, project);

  // ⚠️ THE THIRD ARGUMENT IS NOT OPTIONAL IN PRACTICE. `needCreateModel: true` also pushes the text
  // into the file's editor MODEL. Without it, writeStorTextAtomic only calls setContent — and for a
  // file the Studio has a model open for, the model still holds the OLD text and is what gets persisted,
  // so the write is silently lost. Measured on a real Studio run 2026-08-26: index.defs.ts (no model
  // open) landed, while skill.ts and index.ts (models open) did not — the steps reported success either
  // way. Every source-writing step in this family passes true (n3-defs, n4-render, n7-index, v2-shell,
  // v4-index, t3-generate); only the l4 JSON artifacts may leave it false.
  await writeStorTextAtomic(nmGroupDefsFile(folder), indexDefsText, true);
  await writeStorTextAtomic(nmGroupIndexFile(folder, '.html'), indexHtmlText, true);

  // ⚠️ WRITING IS NOT ENOUGH TO MAKE A MODULE LOADABLE. The preview bundles a page by FETCHING each
  // import, and a source that was only written to the stor is not served yet — the group page failed
  // with `Error get /_102053_/l2/molecules/groupenterdate/index.defs` while the file sat right there in
  // the editor (measured 2026-08-26). Compiling is the step that publishes the module into the cache
  // the bundler reads; it is what the Studio itself does when a human saves the file, and what every
  // source-writing step in this family already does (n3-defs, n4-render, i3-edit, …).
  //
  // Second reason, free: this is also the only COMPILE GATE this deterministic agent has. The backtick
  // defect of 2026-08-26 — a molecule Objective containing `code` closed the generated template literal
  // and silently invalidated the file — would have been caught here instead of in the editor.
  const defsCompile = await compileStorTs(nmGroupDefsFile(folder), indexDefsText);
  if (defsCompile.errors.length) {
    warnings.push(`index.defs.ts não compila: ${defsCompile.errors.slice(0, 3).join(' | ')}`);
  }

  const artifact: SyGroupArtifact = {
    schemaVersion: 1,
    savedAt: generatedAt,
    runKey,
    folder,
    canonical,
    purpose,
    usageContract,
    // Derived from the TAG, not the filename-based shortName: the tag is the authoritative source
    // (§4.4), and this is exactly the "Moléculas: ml-x, ml-y" line skill.ts (level 1) needs.
    moleculeShortTags: molecules.map(m => (m.tag.includes('--') ? m.tag.slice(m.tag.indexOf('--') + 2) : m.tag)),
    moleculesWithoutDefs: molecules.filter(m => !m.defsRef).map(m => m.tag),
    scenarioCount: scenarios.length,
    scenariosSource,
    indexDefsFile: `l2/molecules/${folder}/index.defs.ts`,
    indexHtmlFile: `l2/molecules/${folder}/index.html`,
  };
  await writeJsonArtifact(syGroupArtifactFileInfo(runKey, folder), artifact);

  const note = `${folder}: ${molecules.length} molécula(s), ${scenarios.length} cenário(s) (${scenariosSource})${warnings.length ? ` — ${warnings.length} aviso(s)` : ''}`;
  return [
    nmResultStepIntent(context, parentStep, {
      planId: syGroupDoneAnchor(canonical),
      dependsOn: [],
      stepTitle: note,
      result: { ...artifact, warnings },
    }),
    nmUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', note, 'input_output'),
  ];
}

/**
 * Scenarios come from ONE of three places, in this order (todo §4.4 / §6.1):
 * 1. Already in this group's index.defs.ts from a PREVIOUS sync — editorial content is preserved, never
 *    re-derived (the one field in the catalog that is not derived).
 * 2. Harvested from the group's CURRENT index.ts, mechanically — the first sync of a group that already
 *    has an authored showcase page with a hand-written `renderReferenceTable()`.
 * 3. Empty — a brand-new group with no index.ts yet (G1), or a page whose table could not be parsed.
 */
async function resolveScenarios(folder: string, molecules: Array<{ tag: string }>): Promise<{ scenarios: SyScenario[]; scenariosSource: SyGroupArtifact['scenariosSource'] }> {
  const existingDefsText = await readStorText(nmGroupDefsFile(folder), false);
  const existing = syExtractExistingScenarios(existingDefsText);
  if (existing && existing.length) return { scenarios: existing, scenariosSource: 'preserved-existing' };

  const indexTsExists = nmFileExists(nmGroupIndexFile(folder, '.ts'));
  const indexTsText = indexTsExists ? await readStorText(nmGroupIndexFile(folder, '.ts'), false) : '';
  const harvested = syHarvestScenarios(indexTsText, molecules);
  if (harvested) return { scenarios: harvested, scenariosSource: 'harvested' };

  return { scenarios: [], scenariosSource: 'empty-no-source' };
}
