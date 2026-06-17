/// <mls fileReference="_102020_/l2/agentMaterializeSolution/contextMaterialize.ts" enhancement="_blank"/>

import { collabImport } from '/_102027_/l2/collabImport.js';
import {
  getContentByMlsPath,
  parseDefinitionFromContent,
  parsePipelineFromContent,
  parseMlsPath,
  readProjectJson,
  toMlsPath,
  loadModuleByBuild,
  loadRulesForIds,
  getDtsForFile,
  getFileImports,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializeArtifacts.js';
import type {
  PipelineItem,
  L1FileType,
  L2FileType,
  ProjectJson,
  VisualStyle,
} from '/_102020_/l2/agentMaterializeSolution/agentMaterializePlan.js';

declare const mls: any;

// ─── Public types ─────────────────────────────────────────────────────────────

export interface GenContext {
  pipelineItem: PipelineItem;
  fileType: L1FileType | L2FileType;
  definition: string;
  skillSections: string[];    // content blocks for the system prompt
  contextSections: string[];  // def-context + dep blocks for the human prompt
  resolvedRules: Record<string, unknown>[];
  visualStyle?: VisualStyle;
}

// ─── Entry point ─────────────────────────────────────────────────────────────

export async function buildGenContext(defPath: string): Promise<GenContext> {
  const parsed = parseMlsPath(defPath);
  if (!parsed) throw new Error(`[contextMaterialize] invalid defPath: ${defPath}`);
  const { project, folder } = parsed;
  const moduleName = folder.split('/')[0];

  // Read .defs.ts
  const defsContent = await getContentByMlsPath(defPath);
  if (!defsContent) throw new Error(`[contextMaterialize] .defs.ts not found: ${defPath}`);

  const definition = parseDefinitionFromContent(defsContent);
  const pipeline = parsePipelineFromContent(defsContent);
  if (!pipeline?.length) throw new Error(`[contextMaterialize] no pipeline in: ${defPath}`);
  const pipelineItem = pipeline[0];
  const fileType = resolveFileType(pipelineItem.type);

  // Project data
  const projectJson = await readProjectJson();
  const moduleExports = await loadModuleExports(project, moduleName);

  // Skills
  const skillPaths = resolveSkillPaths(fileType, moduleExports, projectJson);
  const skillSections: string[] = [];
  const defContextSections: string[] = [];
  for (const sp of skillPaths) {
    const clean = sp.startsWith('/') ? sp.slice(1) : sp;
    if (/^_\d+_$/.test(clean)) {
      const content = await loadProjectDefinition(clean);
      if (content) defContextSections.push(`### Project Definition (${clean})\n\`\`\`typescript\n${content}\n\`\`\``);
    } else {
      const content = await loadSkillContent(sp);
      if (content) skillSections.push(`<!-- skill: ${sp} -->\n${content}`);
    }
  }

  // Visual style (page only)
  const visualStyle = fileType === 'page' && projectJson
    ? projectJson.modules.find(m => m.moduleName === moduleName)?.module?.visualStyle
    : undefined;

  // Business rules
  let resolvedRules: Record<string, unknown>[] = [];
  if (pipelineItem.rulesApplied?.length) {
    resolvedRules = await loadRulesForIds(project, moduleName, pipelineItem.rulesApplied);
  }

  // dependsFiles — prefer .d.ts; include first-level same-project imports; deduplicate
  const seen = new Set<string>();
  const depSections: string[] = [];

  async function addDep(path: string): Promise<void> {
    if (seen.has(path)) return;
    seen.add(path);
    const p = parseMlsPath(path);
    const content = p
      ? await getDtsForFile(p.project, p.level, p.folder, p.shortName)
      : await getContentByMlsPath(path) ?? '';
    if (content) depSections.push(`### ${path}\n\`\`\`typescript\n${content}\n\`\`\``);
  }

  for (const dep of pipelineItem.dependsFiles) {
    await addDep(dep);
    const p = parseMlsPath(dep);
    if (p) {
      for (const imp of getFileImports(p.project, p.level, p.folder, p.shortName)) {
        await addDep(imp);
      }
    }
  }

  return {
    pipelineItem,
    fileType,
    definition,
    skillSections,
    contextSections: [...defContextSections, ...depSections],
    resolvedRules,
    visualStyle,
  };
}

// ─── File type resolver ───────────────────────────────────────────────────────

export function resolveFileType(itemType: string): L1FileType | L2FileType {
  const map: Record<string, L1FileType | L2FileType> = {
    layer_1_external:    'layer1',
    layer_4_entities:    'layer4',
    layer_3_usecases:    'layer3',
    layer_2_controllers: 'layer2',
    l2_contract:         'contract',
    l2_shared:           'shared',
    l2_page:             'page',
  };
  return (map[itemType] ?? 'layer1') as L1FileType | L2FileType;
}

// ─── Skill resolution ─────────────────────────────────────────────────────────

const NEEDS_DEFINITION: string[] = ['layer1', 'layer4'];

function resolveSkillPaths(
  fileType: L1FileType | L2FileType,
  moduleExports: any,
  projectJson: ProjectJson | null,
): string[] {
  if (!moduleExports) return [];

  if (fileType === 'contract') return moduleExports.skills?.contract?.skillPath ?? [];

  if (fileType === 'shared') {
    const p = moduleExports.shared?.web?.sharedSkill as string | undefined;
    return p ? [p] : [];
  }

  if (fileType === 'page') {
    const genome = moduleExports.moduleGenome?.['web/desktop/page11'];
    if (!genome) return [];
    const paths: string[] = [];
    if (genome.layout && projectJson) {
      const entry = Object.values(projectJson.layouts ?? {}).find(l => l.name === genome.layout);
      if (entry?.skill) paths.push(entry.skill);
    }
    if (genome.designSystem && projectJson) {
      const entry = Object.values(projectJson.designSystems ?? {}).find(d => d.name === genome.designSystem);
      if (entry?.skill) paths.push(entry.skill);
    }
    return paths;
  }

  // L1 types: layer1, layer2, layer3, layer4
  const paths: string[] = [...(moduleExports.skills?.[fileType]?.skillPath ?? [])];
  if (NEEDS_DEFINITION.includes(fileType)) {
    const defPaths: string[] = moduleExports.skills?.definition?.skillPath ?? [];
    paths.push(...defPaths);
  }
  return paths;
}

// ─── Module loader ────────────────────────────────────────────────────────────

async function loadModuleExports(project: number, moduleName: string): Promise<any> {
  const path = toMlsPath(project, 2, moduleName, 'module', '.ts');
  const f = mls.stor.convertFileReferenceToFile(path);
  if (!f) return null;
  try {
    return await collabImport(f);
  } catch {
    return await loadModuleByBuild(path);
  }
}

// ─── Skill content loaders ────────────────────────────────────────────────────

async function loadProjectDefinition(projectRef: string): Promise<string> {
  const models = (mls as any).editor?.models;
  if (!models?.[projectRef]?.ts) return '';
  return models[projectRef].ts.model?.getValue?.() ?? '';
}

async function loadSkillContent(skillPath: string): Promise<string> {
  const clean = skillPath.startsWith('/') ? skillPath.slice(1) : skillPath;

  if (clean.endsWith('.md')) return await getContentByMlsPath(clean) ?? '';

  const f = mls.stor.convertFileReferenceToFile(clean);
  if (!f) return '';

  let mod: any;
  try {
    mod = await collabImport(f);
  } catch {
    mod = await loadModuleByBuild(clean);
  }

  if (typeof mod?.skill === 'string') return mod.skill;
  return await getContentByMlsPath(clean) ?? '';
}
