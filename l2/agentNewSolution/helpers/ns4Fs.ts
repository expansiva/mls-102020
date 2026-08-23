/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Fs.ts" enhancement="_blank"/>

import { createStorFile } from '/_102027_/l2/libStor.js';
import { extractNs4ClassicJsonObject, ns4ClassicDefsSource } from '/_102020_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import { listNs4RebuildDeletionKeys, normalizeNs4ModuleName } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { readNs4AvailableContent } from '/_102020_/l2/agentNewSolution/helpers/ns4ContentRead.js';
import { renderNs4TypedDefsSource } from '/_102020_/l2/agentNewSolution/helpers/ns4TypedDefs.js';
import type {
  Ns4AccessMatrixArtifact,
  Ns4CompositionArtifact,
  Ns4JourneyArtifact,
  Ns4JourneyIndex,
  Ns4ModuleArtifact,
  Ns4OntologyEntityArtifact,
  Ns4OntologyIndexArtifact,
  Ns4PermanentArtifactByType,
  Ns4PermanentArtifactTypeName,
  Ns4PipelineState,
  Ns4RulesArtifact,
  Ns4UseCaseArtifactV3,
  Ns4UseCaseIndexArtifactV3,
  Ns4WorkflowArtifactV2,
  Ns4WorkflowIndexArtifactV3,
  Ns4E10ValidationReport,
  Ns4L5TodoFrontendArtifact,
  Ns4L5TodoBackendArtifact,
  Ns4L5ProcessArtifact,
} from '/_102020_/l2/agentNewSolution/types.js';

export type Ns4FileInfo = Pick<mls.stor.IFileInfo, 'project' | 'level' | 'folder' | 'shortName' | 'extension'>;

const AGENT_PROJECT = 102020;
const AGENT_FOLDER = 'agentNewSolution';

export function ns4AgentFile(folder: string, shortName: string, extension: string): Ns4FileInfo {
  return { project: AGENT_PROJECT, level: 2, folder: folder ? `${AGENT_FOLDER}/${folder}` : AGENT_FOLDER, shortName, extension };
}

export function ns4ModuleFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeNs4ModuleName(moduleName), shortName: 'module', extension: '.defs.ts' };
}

export function ns4PipelineFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'pipeline', extension: '.json' };
}

export function ns4E2DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e2-journeys-draft', extension: '.json' };
}

export function ns4E2VersionedDraftFile(moduleName: string, reviewRound: number): Ns4FileInfo {
  return {
    project: mls.actualProject || 0,
    level: 4,
    folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`,
    shortName: `e2-journeys-draft-v${Math.max(1, Math.floor(reviewRound))}`,
    extension: '.json',
  };
}

export function ns4E2ImpactReportFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e2-impact-report', extension: '.json' };
}

export function ns4E3DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e3-access-matrix-draft', extension: '.json' };
}

export function ns4AccessMatrixFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/access`, shortName: 'access-matrix', extension: '.defs.ts' };
}

export function ns4E4DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e4-ontology-draft', extension: '.json' };
}

export function ns4E4PlanDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e4-ontology-plan-draft', extension: '.json' };
}

export function ns4E4EntityDraftFile(moduleName: string, entityId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline/e4-entities`, shortName: `${entityId}-draft`, extension: '.json' };
}

export function ns4E4RelationshipBindingsDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e4-relationship-bindings-draft', extension: '.json' };
}

export function ns4OntologyEntityFile(moduleName: string, entityId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/ontology`, shortName: entityId, extension: '.defs.ts' };
}

export function ns4OntologyIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/ontology`, shortName: 'index', extension: '.defs.ts' };
}

export function ns4E5DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-rules-draft', extension: '.json' };
}

export function ns4E5ApprovedFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e5-rules-approved', extension: '.json' };
}

export function ns4RulesFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/rules`, shortName: 'rules', extension: '.defs.ts' };
}

export function ns4E6DraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e6-composition-draft', extension: '.json' };
}

export function ns4E6ApprovedFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e6-composition-approved', extension: '.json' };
}

export function ns4CompositionFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/composition`, shortName: 'additional-capabilities', extension: '.defs.ts' };
}

export function ns4E7PlanDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e7-realization-plan-draft', extension: '.json' };
}

export function ns4E7UseCaseDraftFile(moduleName: string, useCaseId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline/e7-usecases`, shortName: `${useCaseId}-draft`, extension: '.json' };
}

export function ns4E7ValidationReportFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`,
    shortName: 'e7-validation-report', extension: '.json' };
}

export function ns4UseCaseFile(moduleName: string, useCaseId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/usecases`, shortName: useCaseId, extension: '.defs.ts' };
}

export function ns4UseCaseIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/usecases`, shortName: 'index', extension: '.defs.ts' };
}

export function ns4WorkflowFile(moduleName: string, workflowId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/workflows`, shortName: workflowId, extension: '.defs.ts' };
}

export function ns4WorkflowIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/workflows`, shortName: 'index', extension: '.defs.ts' };
}

export function ns4E8SkeletonDraftFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e8-skeleton-draft', extension: '.json' };
}
export function ns4E8WorkspaceDraftFile(moduleName: string, workspaceId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline/e8-workspaces`, shortName: `${workspaceId}-draft`, extension: '.json' };
}
export function ns4E8ValidationReportFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e8-validation-report', extension: '.json' };
}
export function ns4WorkspaceFile(moduleName: string, workspaceId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/workspaces`, shortName: workspaceId, extension: '.defs.ts' };
}
/**
 * The approved workspace model is a PERMANENT artifact, not a pipeline draft: `pipeline/` is working
 * state for one run and is thrown away afterwards, while E9 and E10 read this model as the contract
 * of record. It sits at the module root, where neither consumer's folder scan picks it up.
 */
export function ns4WorkspaceModelFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeNs4ModuleName(moduleName), shortName: 'workspace-model', extension: '.defs.ts' };
}
export function ns4OperationFile(moduleName: string, operationId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/operations`, shortName: operationId, extension: '.defs.ts' };
}
export function ns4SiteMapFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: normalizeNs4ModuleName(moduleName), shortName: 'siteMap', extension: '.defs.ts' };
}
export function ns4ClassicContractFile(moduleName: string, workspaceId: string, bffId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/contracts`, shortName: `${workspaceId}--${bffId}`, extension: '.defs.ts' };
}
export function ns4E10ValidationReportFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/pipeline`, shortName: 'e10-validation-report', extension: '.json' };
}
export function ns4L5ConfigFile(): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: '', shortName: 'config', extension: '.json' };
}
export function ns4TodoFrontendFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: normalizeNs4ModuleName(moduleName), shortName: 'todoFrontend', extension: '.defs.ts' };
}
export function ns4TodoBackendFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: normalizeNs4ModuleName(moduleName), shortName: 'todoBackend', extension: '.defs.ts' };
}
export function ns4ProcessFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: normalizeNs4ModuleName(moduleName), shortName: 'process', extension: '.defs.ts' };
}

export function ns4JourneyFile(moduleName: string, journeyId: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/journeys`, shortName: journeyId, extension: '.defs.ts' };
}

export function ns4JourneyIndexFile(moduleName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 4, folder: `${normalizeNs4ModuleName(moduleName)}/journeys`, shortName: 'index', extension: '.defs.ts' };
}

export async function readNs4AgentText(folder: string, shortName: string): Promise<string> {
  return readNs4Text(ns4AgentFile(folder, shortName, '.md'), true);
}

export async function readNs4Pipeline(moduleName: string): Promise<Ns4PipelineState | null> {
  const raw = await readNs4Text(ns4PipelineFile(moduleName), false);
  if (!raw.trim()) return null;
  try {
    return JSON.parse(raw) as Ns4PipelineState;
  } catch {
    return null;
  }
}

export async function readNs4Module(moduleName: string): Promise<Ns4ModuleArtifact | null> {
  const raw = await readNs4Text(ns4ModuleFile(moduleName), false);
  const json = extractNs4ClassicJsonObject(raw);
  if (!json) return null;
  try {
    return JSON.parse(json) as Ns4ModuleArtifact;
  } catch {
    return null;
  }
}

export async function writeNs4Pipeline(state: Ns4PipelineState): Promise<string> {
  const fileInfo = ns4PipelineFile(state.moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(state, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4Module(moduleName: string, artifact: Ns4ModuleArtifact): Promise<string> {
  const fileInfo = ns4ModuleFile(moduleName);
  const exportName = `${normalizeNs4ModuleName(moduleName)}Module`;
  await writeNs4Defs(fileInfo, exportName, artifact, 'Ns4ModuleArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4E2Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E2DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E2VersionedDraft(moduleName: string, reviewRound: number, draft: unknown): Promise<string> {
  const fileInfo = ns4E2VersionedDraftFile(moduleName, reviewRound);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E2ImpactReport(moduleName: string, report: unknown): Promise<string> {
  const fileInfo = ns4E2ImpactReportFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(report, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E3Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E3DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4PlanDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4PlanDraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4EntityDraft(moduleName: string, entityId: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4EntityDraftFile(moduleName, entityId);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E4RelationshipBindingsDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E4RelationshipBindingsDraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E5DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E5Approved(moduleName: string, review: unknown): Promise<string> {
  const fileInfo = ns4E5ApprovedFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(review, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E6Draft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E6DraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E6Approved(moduleName: string, review: unknown): Promise<string> {
  const fileInfo = ns4E6ApprovedFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(review, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E7PlanDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E7PlanDraftFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E7UseCaseDraft(moduleName: string, useCaseId: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E7UseCaseDraftFile(moduleName, useCaseId);
  await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`);
  return displayPath(fileInfo);
}

export async function writeNs4E7ValidationReport(moduleName: string, report: unknown): Promise<string> {
  const fileInfo = ns4E7ValidationReportFile(moduleName);
  await writeNs4Text(fileInfo, `${JSON.stringify(report, null, 2)}\n`);
  return displayPath(fileInfo);
}
export async function writeNs4E8SkeletonDraft(moduleName: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E8SkeletonDraftFile(moduleName); await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`); return displayPath(fileInfo);
}
export async function writeNs4E8WorkspaceDraft(moduleName: string, workspaceId: string, draft: unknown): Promise<string> {
  const fileInfo = ns4E8WorkspaceDraftFile(moduleName, workspaceId); await writeNs4Text(fileInfo, `${JSON.stringify(draft, null, 2)}\n`); return displayPath(fileInfo);
}
export async function writeNs4E8ValidationReport(moduleName: string, report: unknown): Promise<string> {
  const fileInfo = ns4E8ValidationReportFile(moduleName); await writeNs4Text(fileInfo, `${JSON.stringify(report, null, 2)}\n`); return displayPath(fileInfo);
}

export async function writeNs4AccessMatrix(moduleName: string, artifact: Ns4AccessMatrixArtifact): Promise<string> {
  const fileInfo = ns4AccessMatrixFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}AccessMatrix`, artifact, 'Ns4AccessMatrixArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4OntologyEntity(moduleName: string, entityId: string, artifact: Ns4OntologyEntityArtifact): Promise<string> {
  const fileInfo = ns4OntologyEntityFile(moduleName, entityId);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}Entity${entityId}`, artifact, 'Ns4OntologyEntityArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4OntologyIndex(moduleName: string, artifact: Ns4OntologyIndexArtifact): Promise<string> {
  const fileInfo = ns4OntologyIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}OntologyIndex`, artifact, 'Ns4OntologyIndexArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4Rules(moduleName: string, artifact: Ns4RulesArtifact): Promise<string> {
  const fileInfo = ns4RulesFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}Rules`, artifact, 'Ns4RulesArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4Composition(moduleName: string, artifact: Ns4CompositionArtifact): Promise<string> {
  const fileInfo = ns4CompositionFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}AdditionalCapabilities`, artifact, 'Ns4CompositionArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4UseCase(moduleName: string, useCaseId: string, artifact: Ns4UseCaseArtifactV3): Promise<string> {
  const fileInfo = ns4UseCaseFile(moduleName, useCaseId);
  await writeNs4Defs(fileInfo, `${useCaseId}UseCase`, artifact, 'Ns4UseCaseArtifactV3');
  return displayPath(fileInfo);
}

export async function writeNs4UseCaseIndex(moduleName: string, artifact: Ns4UseCaseIndexArtifactV3): Promise<string> {
  const fileInfo = ns4UseCaseIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}UseCaseIndex`, artifact, 'Ns4UseCaseIndexArtifactV3');
  return displayPath(fileInfo);
}

export async function writeNs4Workflow(moduleName: string, workflowId: string, artifact: Ns4WorkflowArtifactV2): Promise<string> {
  const fileInfo = ns4WorkflowFile(moduleName, workflowId);
  await writeNs4Defs(fileInfo, `${workflowId}Workflow`, artifact, 'Ns4WorkflowArtifactV2');
  return displayPath(fileInfo);
}

export async function writeNs4WorkflowIndex(moduleName: string, artifact: Ns4WorkflowIndexArtifactV3): Promise<string> {
  const fileInfo = ns4WorkflowIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}WorkflowIndex`, artifact, 'Ns4WorkflowIndexArtifactV3');
  return displayPath(fileInfo);
}
export async function writeNs4E10ValidationReport(moduleName: string, report: Ns4E10ValidationReport): Promise<string> {
  const fileInfo = ns4E10ValidationReportFile(moduleName); await writeNs4Text(fileInfo, `${JSON.stringify(report, null, 2)}\n`); return displayPath(fileInfo);
}
export function ns4L5ProjectFile(projectId?: number): Ns4FileInfo {
  return { project: projectId ?? (mls.actualProject || 0), level: 5, folder: '', shortName: 'project', extension: '.json' };
}

export function ns4L5PublishConfFile(shortName: string): Ns4FileInfo {
  return { project: mls.actualProject || 0, level: 5, folder: '', shortName, extension: '.example' };
}

/** l5/project.json — organization-level, owned by the studio. E10 reads it and only ADDS what is absent. */
export async function readNs4L5Project(projectId?: number): Promise<Record<string, unknown> | null> {
  const raw = await readNs4Text(ns4L5ProjectFile(projectId), false); if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object');
    return value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`[agentNewSolution] existing l5/project.json is invalid and was preserved: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export async function writeNs4L5Project(projectJson: Record<string, unknown>): Promise<string> {
  const fileInfo = ns4L5ProjectFile(); await writeNs4Text(fileInfo, `${JSON.stringify(projectJson, null, 2)}\n`); return displayPath(fileInfo);
}

export async function writeNs4L5PublishExample(shortName: string, content: string): Promise<string> {
  const fileInfo = ns4L5PublishConfFile(shortName); await writeNs4Text(fileInfo, content); return displayPath(fileInfo);
}

export async function readNs4L5Config(): Promise<Record<string, unknown> | null> {
  const raw = await readNs4Text(ns4L5ConfigFile(), false); if (!raw.trim()) return null;
  try {
    const value = JSON.parse(raw);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('root must be an object');
    return value as Record<string, unknown>;
  } catch (error) {
    throw new Error(`[agentNewSolution] existing l5/config.json is invalid and was preserved: ${error instanceof Error ? error.message : String(error)}`);
  }
}
export async function writeNs4L5Config(config: Record<string, unknown>): Promise<string> {
  const fileInfo = ns4L5ConfigFile(); await writeNs4Text(fileInfo, `${JSON.stringify(config, null, 2)}\n`); return displayPath(fileInfo);
}
export async function writeNs4TodoFrontend(moduleName: string, artifact: Ns4L5TodoFrontendArtifact): Promise<string> {
  const fileInfo = ns4TodoFrontendFile(moduleName); await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}TodoFrontend`, artifact, 'Ns4L5TodoFrontendArtifact'); return displayPath(fileInfo);
}
export async function writeNs4TodoBackend(moduleName: string, artifact: Ns4L5TodoBackendArtifact): Promise<string> {
  const fileInfo = ns4TodoBackendFile(moduleName); await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}TodoBackend`, artifact, 'Ns4L5TodoBackendArtifact'); return displayPath(fileInfo);
}
export async function writeNs4Process(moduleName: string, artifact: Ns4L5ProcessArtifact): Promise<string> {
  const fileInfo = ns4ProcessFile(moduleName); await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}Process`, artifact, 'Ns4L5ProcessArtifact'); return displayPath(fileInfo);
}

export async function writeNs4Journey(moduleName: string, journeyId: string, artifact: Ns4JourneyArtifact): Promise<string> {
  const fileInfo = ns4JourneyFile(moduleName, journeyId);
  await writeNs4Defs(fileInfo, `${journeyId}Journey`, artifact, 'Ns4JourneyArtifact');
  return displayPath(fileInfo);
}

export async function writeNs4JourneyIndex(moduleName: string, index: Ns4JourneyIndex): Promise<string> {
  const fileInfo = ns4JourneyIndexFile(moduleName);
  await writeNs4Defs(fileInfo, `${normalizeNs4ModuleName(moduleName)}JourneyIndex`, index, 'Ns4JourneyIndex');
  return displayPath(fileInfo);
}

export function ns4FileExists(fileInfo: Ns4FileInfo): boolean {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  return !!file && file.status !== 'deleted';
}

export function listNs4ModuleFolders(): Set<string> {
  const project = mls.actualProject || 0;
  const modules = new Set<string>();
  for (const file of Object.values(mls.stor.files)) {
    if (!file || file.project !== project || file.status === 'deleted' || !file.folder) continue;
    if (![1, 2, 4, 5].includes(file.level)) continue;
    const first = file.folder.split('/')[0];
    if (!first || isGlobalFolder(file.level, first)) continue;
    modules.add(normalizeNs4ModuleName(first));
  }
  return modules;
}

export async function readNs4Text(fileInfo: Ns4FileInfo, required: boolean): Promise<string> {
  const file = mls.stor.files[mls.stor.getKeyToFile(fileInfo)];
  if (!file || file.status === 'deleted') {
    if (required) throw new Error(`[agentNewSolution] file not found: ${displayPath(fileInfo)}`);
    return '';
  }
  // Files created during the current task have versionRef="0" until Studio persists them remotely.
  // Reading that sentinel through the GitHub driver requests /git/blobs/0. Prefer the authoritative
  // local value and fail locally if it is temporarily unavailable; never issue an invalid network read.
  const content = await readNs4AvailableContent(file, fileInfo.extension);
  if (content.unavailableNewFile) {
    if (required) throw new Error(`[agentNewSolution] local content unavailable for new file: ${displayPath(fileInfo)}`);
    return '';
  }
  if (content.text !== null) return content.text;
  if (required) throw new Error(`[agentNewSolution] invalid text file: ${displayPath(fileInfo)}`);
  return '';
}

export async function readNs4DefsJson<T>(fileInfo: Ns4FileInfo, required = false): Promise<T | null> {
  const source = await readNs4Text(fileInfo, required);
  const json = extractNs4ClassicJsonObject(source);
  if (!json) return null;
  try { return JSON.parse(json) as T; }
  catch {
    if (required) throw new Error(`[agentNewSolution] invalid defs JSON: ${displayPath(fileInfo)}`);
    return null;
  }
}

/**
 * The classic L4 emission of E9. These artifacts are plain data the consumers parse, so they are
 * written as untyped defs: the ns4 artifact interfaces describe the ns4 model, not the classic wire.
 */
export async function writeNs4ClassicWorkspace(moduleName: string, workspaceId: string, value: unknown): Promise<string> {
  const fileInfo = ns4WorkspaceFile(moduleName, workspaceId);
  await writeNs4Text(fileInfo, ns4ClassicDefsSource(fileInfo, `${workspaceId}Workspace`, value));
  return displayPath(fileInfo);
}
export async function writeNs4Operation(moduleName: string, operationId: string, value: unknown): Promise<string> {
  const fileInfo = ns4OperationFile(moduleName, operationId);
  await writeNs4Text(fileInfo, ns4ClassicDefsSource(fileInfo, `operation${operationId.slice(0, 1).toUpperCase()}${operationId.slice(1)}`, value));
  return displayPath(fileInfo);
}
export async function writeNs4SiteMap(moduleName: string, value: unknown): Promise<string> {
  const fileInfo = ns4SiteMapFile(moduleName);
  await writeNs4Text(fileInfo, ns4ClassicDefsSource(fileInfo, `${normalizeNs4ModuleName(moduleName)}SiteMap`, value));
  return displayPath(fileInfo);
}
/** A bffCall contract is already TypeScript source; E9 hands it over verbatim. */
export async function writeNs4ClassicContract(moduleName: string, workspaceId: string, bffId: string, source: string): Promise<string> {
  const fileInfo = ns4ClassicContractFile(moduleName, workspaceId, bffId);
  await writeNs4Text(fileInfo, source);
  return displayPath(fileInfo);
}
export async function writeNs4WorkspaceModel(moduleName: string, model: unknown): Promise<string> {
  const fileInfo = ns4WorkspaceModelFile(moduleName);
  await writeNs4Text(fileInfo, ns4ClassicDefsSource(fileInfo, `${normalizeNs4ModuleName(moduleName)}WorkspaceModel`, model));
  return displayPath(fileInfo);
}


export function assertNs4ShortName(shortName: string): void {
  if (shortName.includes('.')) {
    throw new Error(`[agentNewSolution] filename out of standard: '${shortName}' — shortName must not contain dots`);
  }
}

async function writeNs4Text(fileInfo: Ns4FileInfo, content: string): Promise<void> {
  assertNs4ShortName(fileInfo.shortName);
  const key = mls.stor.getKeyToFile(fileInfo);
  let file = mls.stor.files[key];
  if (!file) {
    file = await createStorFile({ ...fileInfo, source: content }, false, false, false);
  } else if (file.status === 'deleted') {
    file.status = 'changed';
    file.updatedAt = new Date().toISOString();
  }
  await mls.stor.localStor.setContent(file, { contentType: 'string', content });
}

async function writeNs4Defs<T extends Ns4PermanentArtifactTypeName>(
  fileInfo: Ns4FileInfo,
  exportName: string,
  value: NoInfer<Ns4PermanentArtifactByType[T]>,
  artifactType: T,
): Promise<void> {
  await writeNs4Text(fileInfo, renderNs4TypedDefsSource(fileInfo, exportName, value, artifactType));
}


function displayPath(fileInfo: Ns4FileInfo): string {
  return `l${fileInfo.level}/${fileInfo.folder ? `${fileInfo.folder}/` : ''}${fileInfo.shortName}${fileInfo.extension}`;
}

function isGlobalFolder(level: number, folder: string): boolean {
  return level === 4 && ['actors', 'operations', 'rules', 'trace', 'workflows'].includes(folder);
}

/**
 * Archives the module's whole l4/l5 through the platform channel (`libStor.deleteFile`): a persisted file
 * becomes `status: 'deleted'` and a never-saved one is removed. Nothing is unlinked outside that channel.
 */
export async function archiveNs4ModuleForRebuild(moduleName: string): Promise<string[]> {
  const project = mls.actualProject || 0;
  // Snapshot first: deleteFile mutates mls.stor.files while we iterate.
  const keys = listNs4RebuildDeletionKeys(mls.stor.files, project, moduleName);
  const archived: string[] = [];
  // Imported lazily: libStor touches the editor at module load, and ns4Fs must stay importable by the
  // node tests that exercise the pure selection.
  const { deleteFile } = await import('/_102027_/l2/libStor.js');
  for (const key of keys) {
    const file = mls.stor.files[key];
    if (!file) continue;
    await deleteFile(file);
    archived.push(key);
  }
  return archived;
}
