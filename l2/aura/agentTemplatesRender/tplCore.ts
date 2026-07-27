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
import { skills as moleculeSkills } from '/_102020_/l2/aura/molecules/skills/index.js';

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
  useMolecules?: boolean;              // v2 opt-in: fit 102040 molecules into NEW templates (default false)
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
  a.useMolecules = a.useMolecules === true;
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

/** Trace of the intent GROUPS chosen for a template (agentTplGroups → agentTplSelectMolecules). */
export function groupsTraceRef(project: number, module: string, genome: string, templateId: string): string {
  return `_${project}_/l2/${module}/trace/templatesRender/${genome}/${templateId}.groups.md`;
}

/** The molecule PLAN for a template (agentTplSelectMolecules → agentTplWriteTemplate). */
export function moleculesPlanRef(project: number, module: string, genome: string, templateId: string): string {
  return `_${project}_/l2/${module}/trace/templatesRender/${genome}/${templateId}.molecules.md`;
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

// ─── molecules (v2, useMolecules) ──────────────────────────────────────────────

/** Project that hosts the molecule library (custom elements consumed by the rendered pages). */
export const MOLECULES_PROJECT = 102040;

/**
 * A template drives molecule mode only if its guide actually carries the "## Molecules" section — the
 * marker the write-template step emits. An existing v1 guide has none, so its pages stay hand-drawn.
 */
export function hasMoleculesSection(templateMd: string | undefined | null): boolean {
  if (!templateMd) return false;
  return /^\s{0,3}#{2,3}\s+Molecules\b/mi.test(templateMd);
}

/** Index group name (camelCase, e.g. groupSelectOne) → 102040 folder (lowercase, groupselectone). */
export function moleculeGroupFolder(groupName: string): string {
  return `molecules/${groupName.trim().toLowerCase()}`;
}

/** `.defs.ts` refs of the molecules of one intent group (ml-*.defs.ts; the group index is skipped). */
export function listMoleculeDefsRefs(groupName: string): string[] {
  const folder = moleculeGroupFolder(groupName);
  const refs = Object.values(storFiles())
    .filter((sf: any) => sf && sf.project === MOLECULES_PROJECT && sf.level === 2 && sf.folder === folder
      && sf.extension === '.defs.ts' && typeof sf.shortName === 'string' && sf.shortName.startsWith('ml-')
      && sf.status !== 'deleted')
    .map((sf: any) => `_${MOLECULES_PROJECT}_/l2/${folder}/${sf.shortName}.defs.ts`);
  return [...new Set(refs)].sort();
}

/**
 * Condense a molecule `.defs.ts` for the selection prompt: layoutConfig + TagName + Objective are what
 * decides the fit. Responsibilities/Constraints are dropped here (they are ~5x the bulk and only matter
 * to the render, which reads the full defs of the FEW chosen molecules).
 */
export function summarizeMoleculeDefs(ref: string, src: string): string {
  const layout = /export\s+const\s+layoutConfig\s*=\s*(\{[\s\S]*?\});/.exec(src)?.[1]?.replace(/\s+/g, ' ').trim();
  const tag = /TagName:\s*([^\s`\n]+)/.exec(src)?.[1]?.trim();
  const objective = /#\s*Objective\s*\n([\s\S]*?)(?:\n#\s|\n?`;\s*$)/.exec(src)?.[1]?.trim();
  const lines = [`- ref: ${ref}`];
  if (tag) lines.push(`  TagName: ${tag}`);
  if (layout) lines.push(`  layoutConfig: ${layout}`);
  if (objective) lines.push(`  Objective: ${objective.replace(/\s+/g, ' ')}`);
  if (!tag && !objective) lines.push(`  (unparsed defs)\n${src.slice(0, 800)}`);
  return lines.join('\n');
}

/**
 * Unwrap a skill module (`export const skill = \`...\``) into its markdown. Skill files are read as TEXT
 * from stor (they live in other folders/projects and cannot be imported dynamically at runtime).
 */
export function unwrapSkillSource(src: string): string {
  const m = /export\s+const\s+skill\s*=\s*`([\s\S]*)`\s*;?\s*$/.exec(src.trim());
  const body = m ? m[1] : src.replace(/^\/\/\/\s*<mls\b[^>]*\/>\s*/, '');
  return body.replace(/\\`/g, '`').replace(/\\\$\{/g, '${').trim();
}

/**
 * Read back the two machine-read lists of a molecule plan (`## Groups` / `## TagNames`). Both are written
 * by an LLM, so they are harvested by token shape rather than by exact list formatting, and each falls
 * back to the whole document (the plan table carries the same names) when its section yields nothing.
 */
export function parseMoleculePlan(planMd: string | undefined | null): { groups: string[]; tags: string[] } {
  const doc = planMd || '';
  const section = (heading: string): string =>
    new RegExp(`^#{2,3}\\s+${heading}\\s*$([\\s\\S]*?)(?=^#{1,3}\\s|$(?![\\s\\S]))`, 'mi').exec(doc)?.[1] ?? '';
  const harvestTags = (text: string) => [...new Set(text.match(/\b[a-z0-9]+--ml-[a-z0-9-]+\b/g) ?? [])];
  const harvestGroups = (text: string) => {
    const found: string[] = [];
    for (const g of moleculeGroupIndex()) {
      if (new RegExp(`\\b${g.name}\\b`, 'i').test(text) && !found.includes(g.name)) found.push(g.name);
    }
    return found;
  };

  const tagsSection = section('TagNames');
  const tags = harvestTags(tagsSection).length ? harvestTags(tagsSection) : harvestTags(doc);

  const groupsSection = section('Groups');
  let groups = harvestGroups(groupsSection);
  if (!groups.length) {
    // No usable Groups list: derive from the tags' own prefixes, then from the document as a last resort.
    for (const tag of tags) {
      const g = moleculeGroupIndex().find(x => x.name.toLowerCase() === tag.split('--')[0]);
      if (g && !groups.includes(g.name)) groups.push(g.name);
    }
    if (!groups.length) groups = harvestGroups(doc);
  }
  return { groups, tags };
}

/**
 * The molecules a TEMPLATE guide prescribes. The guide carries them as a table (not as the plan's lists),
 * so they are harvested by TagName shape from the "## Molecules" section; the group comes from the tag's
 * own prefix, which is what the library folders are named after.
 */
export function extractTemplateMolecules(templateMd: string | undefined | null): { groups: string[]; tags: string[] } {
  const section = /^#{2,3}\s+Molecules\s*$([\s\S]*?)(?=^#{1,3}\s|$(?![\s\S]))/mi.exec(templateMd || '')?.[1] ?? '';
  const tags = [...new Set(section.match(/\b[a-z0-9]+--ml-[a-z0-9-]+\b/g) ?? [])];
  const groups: string[] = [];
  for (const tag of tags) {
    const prefix = tag.split('--')[0];
    const g = moleculeGroupIndex().find(x => x.name.toLowerCase() === prefix);
    if (g && !groups.includes(g.name)) groups.push(g.name);
  }
  return { groups, tags };
}

/** Resolve a molecule TagName (`grouplowercase--ml-name`) to its defs/module refs in the library. */
export function moleculeRefsFromTag(tag: string): { defs: string; module: string } | null {
  const m = /^([a-z0-9]+)--(ml-[a-z0-9-]+)$/.exec(tag.trim());
  if (!m) return null;
  const folder = `molecules/${m[1]}`;
  return {
    defs: `_${MOLECULES_PROJECT}_/l2/${folder}/${m[2]}.defs.ts`,
    module: `/_${MOLECULES_PROJECT}_/l2/${folder}/${m[2]}.js`,
  };
}

/** One intent group of the molecule library (as declared in the molecules skills index). */
export interface MoleculeGroup {
  name: string;
  description: string;
  skillReference?: string;
  skillUsageReference?: string;
}

/** The intent-group catalog (static import — same project, cheap: names + descriptions only). */
export function moleculeGroupIndex(): MoleculeGroup[] {
  return (moleculeSkills as MoleculeGroup[]).filter(g => g && typeof g.name === 'string' && g.name);
}

export function findMoleculeGroup(name: string): MoleculeGroup | undefined {
  const wanted = name.trim().toLowerCase();
  return moleculeGroupIndex().find(g => g.name.toLowerCase() === wanted);
}

/** The group catalog as prompt context: one line per group (name + intent description). */
export function renderGroupCatalog(): string {
  return moleculeGroupIndex().map(g => `- **${g.name}** — ${g.description}`).join('\n');
}

/**
 * The `usage` skill of a group (how a PAGE consumes its molecules: props, events, slot tags, tokens).
 * The path comes from the index (`skillUsageReference`), whose folder casing can differ from `name`.
 */
export async function readUsageSkill(groupName: string): Promise<{ ref: string; body: string } | null> {
  const g = findMoleculeGroup(groupName);
  if (!g?.skillUsageReference) return null;
  const ref = `${g.skillUsageReference.replace(/^\//, '')}.ts`;
  const raw = await readFile(ref);
  if (!raw) return null;
  return { ref, body: unwrapSkillSource(raw) };
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
