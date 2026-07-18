/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/rebuild-defs-cleanup/agentCfeRebuildDefsCleanup.ts" enhancement="_102027_/l2/enhancementAgent"/>

// Terminal step for the `/rebuild defs` CLI command only (no LLM). After the create phases have
// regenerated every .defs.ts, this soft-deletes the DERIVED frontend artifacts (materialized .ts
// render/shared/contract outputs AND their .test.ts) so the module's l2 web tree keeps ONLY the
// .defs.ts source of truth. A later `/run` re-materializes the .ts from the fresh defs.
//
// Runs after `verify-create-layouts` (dependsOn) so it never races the defs regeneration. Deletion
// is a soft-delete (deleteFile -> status='deleted', recoverable from the collab-fs trash), scoped to
// the create run's modules and to the generated frontend folders (web/contracts, web/shared,
// web/desktop/pageN, web/mobile/pageN). .defs.ts is preserved (distinct extension); non-frontend l2
// files such as designSystem.ts / project.ts live at the l2 root folder and never match.

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { deleteFile } from '/_102027_/l2/libStor.js';
import { createUpdateStatusIntent } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';

interface CleanupArgs {
  modules: string[];
}

const AGENT_NAME = 'agentCfeRebuildDefsCleanup';
const MAX_TRACE_PATHS = 60;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/rebuild-defs-cleanup',
    agentDescription: 'Soft-delete derived frontend .ts/.test.ts after a /rebuild defs, keeping only .defs.ts',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const { modules } = parseArgs(step.prompt);
    const project = mls.actualProject || 0;
    const deleted: string[] = [];

    for (const file of Object.values(mls.stor.files) as any[]) {
      if (!file || file.project !== project || file.level !== 2 || file.status === 'deleted') continue;
      if (file.extension !== '.ts' && file.extension !== '.test.ts') continue;
      const folder = String(file.folder || '');
      if (!isGeneratedFrontendFolder(folder, modules)) continue;
      await deleteFile(file);
      deleted.push(`_${project}_/l2/${folder}/${file.shortName}${file.extension}`);
    }

    const trace = deleted.length === 0
      ? 'rebuild-defs cleanup: no derived .ts/.test.ts to remove'
      : `rebuild-defs cleanup: soft-deleted ${deleted.length} derived file(s), kept .defs.ts:\n${summarize(deleted)}`;
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', trace)];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    // Best-effort cleanup: a failure here must not fail the whole rebuild-defs tree — the defs are
    // already regenerated and the stale .ts are recoverable and re-materializable.
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `REBUILD-DEFS-CLEANUP-SKIPPED: ${message}`)];
  }
}

// Generated frontend TS live under <module>/web/{contracts|shared|desktop/pageN|mobile/pageN}. Scope
// the sweep to the create run's modules so a rebuild-defs of one module never touches another.
function isGeneratedFrontendFolder(folder: string, modules: string[]): boolean {
  if (!modules.some(module => module && folder.startsWith(`${module}/web/`))) return false;
  return /\/web\/contracts$/.test(folder)
    || /\/web\/shared$/.test(folder)
    || /\/web\/desktop\/page\d+$/.test(folder)
    || /\/web\/mobile\/page\d+$/.test(folder);
}

function summarize(paths: string[]): string {
  if (paths.length <= MAX_TRACE_PATHS) return paths.join('\n');
  return `${paths.slice(0, MAX_TRACE_PATHS).join('\n')}\n…(+${paths.length - MAX_TRACE_PATHS} more)`;
}

function parseArgs(prompt: string | undefined): CleanupArgs {
  const parsed = prompt ? JSON.parse(prompt) as Record<string, unknown> : {};
  const modules = Array.isArray(parsed.modules)
    ? parsed.modules.filter((value): value is string => typeof value === 'string' && value.length > 0)
    : [];
  return { modules };
}
