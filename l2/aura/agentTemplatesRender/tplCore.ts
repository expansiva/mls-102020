/// <mls fileReference="_102020_/l2/aura/agentTemplatesRender/tplCore.ts" enhancement="_blank"/>

// Shared helpers for the agentTemplatesRender group (TASK-102020-agent-templates-render).
// Template-guided page generation (CollabUX v1): a style model (e.g. salesforceStyle) guides a
// plan → write-template → defs → critique → fix → render → register pipeline.
//
// Pure-ish: path derivation + stor IO + prompt/tool primitives reused by every step agent.
// No LLM logic here (that lives in each agent's before/afterPromptStep).

import { pageRef, variationFolder, DEFAULT_DEVICE } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { saveFile } from '/_102020_/l2/aura/agentImplementGenome/planning.js';
import {
  getContentByMlsPath, saveArtifactTextByMlsPath, extractToolCallArgs,
} from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

// ─── args ────────────────────────────────────────────────────────────────────

/** Args carried in each step's `prompt` (JSON). Superset of the whole-run + per-page fields. */
export interface TplArgs {
  module: string;
  styleModel: string;                  // e.g. 'salesforceStyle'
  layout: number | string;
  ds: number | string;
  device: string;
  genome: string;                      // page{layout}{ds} (derived from layout/ds)
  page?: string;                       // per-page steps
  templateId?: string;                 // per-page steps: which template guides this page
  templateStatus?: 'new' | 'existing'; // per-page steps: whether the template file is being created this run
  pages?: string[];                    // whole-run steps (plan enumerates); write-template: pages of that template
  attempt?: number;                    // render repair round (Option B)
}

export function deriveGenome(layout: number | string, ds: number | string): string {
  return variationFolder(layout, ds);
}

/** Parse + validate a step's `prompt`. Fills device/genome defaults. */
export function parseTplArgs(prompt: string | undefined): TplArgs {
  if (!prompt) throw new Error('[tplCore] empty step prompt');
  const a = JSON.parse(prompt) as TplArgs;
  if (!a.module || !a.styleModel || a.layout == null || a.ds == null) {
    throw new Error(`[tplCore] invalid step args (need module, styleModel, layout, ds): ${prompt}`);
  }
  if (!a.device) a.device = DEFAULT_DEVICE;
  if (!a.genome) a.genome = deriveGenome(a.layout, a.ds);
  return a;
}

// ─── path derivation ───────────────────────────────────────────────────────────

export function workspaceRef(project: number, module: string, page: string): string {
  return `_${project}_/l4/${module}/workspaces/${page}.defs.ts`;
}

export function templateRef(project: number, styleModel: string, templateId: string): string {
  return `_${project}_/l4/templates/${styleModel}/${templateId}.md`;
}

export function sharedRef(project: number, module: string, page: string): string {
  return `_${project}_/l2/${module}/web/shared/${page}.ts`;
}

export function designSystemRef(project: number): string {
  return `_${project}_/l2/designSystem.ts`;
}

export function defsDestRef(a: TplArgs, project: number): string {
  return pageRef(project, a.module, a.layout, a.ds, a.page!, '.defs.ts', a.device);
}

export function tsDestRef(a: TplArgs, project: number): string {
  return pageRef(project, a.module, a.layout, a.ds, a.page!, '.ts', a.device);
}

export function critiqueRef(project: number, module: string, genome: string, page: string): string {
  return `_${project}_/l2/${module}/trace/templatesRender/${genome}/${page}.critique.md`;
}

export function planTraceRef(project: number, module: string, genome: string): string {
  return `_${project}_/l2/${module}/trace/templatesRender/${genome}/plan.md`;
}

// ─── stor listing (needs mls.stor) ─────────────────────────────────────────────

function storFiles(): Record<string, any> {
  const files = (typeof mls !== 'undefined') ? (mls as any)?.stor?.files : undefined;
  return files || {};
}

/** Distinct workspace shortNames present in l4/<module>/workspaces (.defs.ts). */
export function listWorkspaces(project: number, module: string): string[] {
  const folder = `${module}/workspaces`;
  const names = Object.values(storFiles())
    .filter((sf: any) => sf && sf.project === project && sf.level === 4 && sf.folder === folder
      && sf.extension === '.defs.ts' && typeof sf.shortName === 'string' && sf.shortName && sf.status !== 'deleted')
    .map((sf: any) => sf.shortName as string);
  return [...new Set(names)].sort();
}

/** Existing template ids for a style model (l4/templates/<style>/*.md). */
export function listExistingTemplates(project: number, styleModel: string): string[] {
  const folder = `templates/${styleModel}`;
  const names = Object.values(storFiles())
    .filter((sf: any) => sf && sf.project === project && sf.level === 4 && sf.folder === folder
      && sf.extension === '.md' && typeof sf.shortName === 'string' && sf.shortName && sf.status !== 'deleted')
    .map((sf: any) => sf.shortName as string);
  return [...new Set(names)].sort();
}

/** Contract .ts refs for a page (web/contracts/<page>.<bffId>.ts). */
export function listContractRefs(project: number, module: string, page: string, device = DEFAULT_DEVICE): string[] {
  void device;
  const folder = `${module}/web/contracts`;
  const prefix = `${page}.`;
  const refs = Object.values(storFiles())
    .filter((sf: any) => sf && sf.project === project && sf.level === 2 && sf.folder === folder
      && sf.extension === '.ts' && typeof sf.shortName === 'string' && sf.shortName.startsWith(prefix) && sf.status !== 'deleted')
    .map((sf: any) => `_${project}_/l2/${folder}/${sf.shortName}.ts`);
  return [...new Set(refs)].sort();
}

// ─── IO ─────────────────────────────────────────────────────────────────────

export async function readFile(ref: string): Promise<string> {
  return (await getContentByMlsPath(ref)) ?? '';
}

/** Write an editor file (.ts/.defs.ts): creates the editor model + persists to local stor. */
export async function saveEditorFile(ref: string, src: string): Promise<void> {
  await saveFile(ref, src);
}

/** Write a non-editor text artifact (.md): localStor.setContent, no compile/model. */
export async function saveTextArtifact(ref: string, src: string): Promise<boolean> {
  return saveArtifactTextByMlsPath(ref, src);
}

// ─── LLM prompt/tool primitives ────────────────────────────────────────────────

/** Tool the file-producing steps call with the complete file body (defs/template/critique). */
export const TPL_FILE_TOOL_NAME = 'submitFileContent';

export const TPL_FILE_TOOL = {
  type: 'function',
  function: {
    name: TPL_FILE_TOOL_NAME,
    description: 'Submit the complete generated file content (the entire file body, nothing else).',
    parameters: {
      type: 'object',
      additionalProperties: false,
      required: ['content'],
      properties: {
        content: { type: 'string', description: 'Complete file content.' },
      },
    },
  },
} as const;

export function extractFileContent(payload: unknown): string | null {
  const out = extractToolCallArgs<{ content?: string }>(payload, TPL_FILE_TOOL_NAME);
  return out?.content && typeof out.content === 'string' ? out.content : null;
}

/** System prompt for a file-producing step: skill instructions + strict output-tool contract. */
export function buildFileSystemPrompt(skillText: string, modelType: string, outputPath: string): string {
  return `<!-- modelType: ${modelType} -->
<!-- x-tool-strict: true -->

You produce ONE file: ${outputPath}
Follow the skill instructions EXACTLY. Use the provided context files as the source of truth —
never invent fields, states, actions, routes or BFF names that are not present in them.
Return ONLY the file through the ${TPL_FILE_TOOL_NAME} tool (no prose, no markdown fences around the call).

---

${skillText}`;
}

/** Human prompt from labelled context sections. */
export function buildLabelledHuman(sections: Array<{ title: string; body: string; lang?: string }>, outputPath: string): string {
  const lines: string[] = [];
  for (const s of sections) {
    lines.push(`## ${s.title}`, '');
    if (s.lang) lines.push('```' + s.lang, s.body, '```', '');
    else lines.push(s.body, '');
  }
  lines.push('## Output', '', `Produce ONLY the complete content for: ${outputPath}`, `Call ${TPL_FILE_TOOL_NAME} with the full file.`);
  return lines.join('\n');
}

/** Read a set of refs into labelled context sections (skips missing). */
export async function readContextSections(refs: Array<{ ref: string; lang?: string }>): Promise<Array<{ title: string; body: string; lang?: string }>> {
  const out: Array<{ title: string; body: string; lang?: string }> = [];
  for (const { ref, lang } of refs) {
    const body = await readFile(ref);
    if (!body) continue;
    out.push({ title: ref, body, lang });
  }
  return out;
}
