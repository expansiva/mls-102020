/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.ts" enhancement="_blank"/>

import type {
  ChCatalogGroup,
  ChDiscovery,
  ChGroupCatalog,
  ChLevel1,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import { chFileRefFromImport, type ChCatalogVia } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chTypes.js';

export interface D2MoleculeRead {
  role: 'inventory' | 'group-index' | 'usage-contract';
  reference: string;
  via: ChCatalogVia;
}

export interface D2MoleculeInventoryEntry {
  groupId: string;
  purpose: string;
  moleculeCount: number;
  indexReference: string;
}

export interface D2MoleculeInventory {
  catalogProject: number | null;
  selectedBy: string | null;
  reason: string | null;
  groups: D2MoleculeInventoryEntry[];
  context: string;
  metrics: {
    inventoryBytes: number;
    totalBytes: number;
    reads: D2MoleculeRead[];
  };
}

export interface D2ResolvedMoleculeGroup {
  groupId: string;
  indexReference: string;
  indexPipelineReference: string;
  indexVia: ChCatalogVia;
  usageContractReference: string;
  usageContractPipelineReference: string;
  usageContractVia: ChCatalogVia;
  molecules: ChGroupCatalog['molecules'];
  scenarios: ChGroupCatalog['scenarios'];
  groupSkill: string;
  usageSkill: string;
}

export interface D2MoleculeSelection {
  groups: D2ResolvedMoleculeGroup[];
  pipelineSkills: string[];
  context: string;
  metrics: D2MoleculeInventory['metrics'] & { selectedBytes: number };
}

export interface D2MoleculeCandidateContext {
  groups: Array<{ groupId: string; scenarios: Array<{ scenario: string; candidates: string[] }> }>;
  context: string;
}

export interface D2UsageContractRead {
  reference: string;
  via: ChCatalogVia;
  skill: string;
}

export interface D2MoleculeCatalogPort {
  discover(explicitCatalogProject: number | null): Promise<ChDiscovery>;
  readLevel1(project: number): Promise<{ level1: ChLevel1 | null; error: string }>;
  readGroup(reference: string): Promise<{ catalog: ChGroupCatalog | null; error: string }>;
  readUsageContract(reference: string): Promise<{ contract: D2UsageContractRead | null; error: string }>;
}

export class D2MoleculeContextError extends Error {
  constructor(readonly code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = 'D2MoleculeContextError';
  }
}

export async function buildD2MoleculeInventory(
  port: D2MoleculeCatalogPort,
  explicitCatalogProject: number | null = null,
): Promise<D2MoleculeInventory> {
  const discovery = await port.discover(explicitCatalogProject);
  if (discovery.error) {
    if (/more than one catalog/iu.test(discovery.error)) {
      throw new D2MoleculeContextError('D2_MOLECULE_CATALOG_AMBIGUOUS', discovery.error);
    }
    return emptyInventory(discovery.selectedBy, discovery.error);
  }
  if (discovery.project === null) return emptyInventory(discovery.selectedBy, 'No molecule catalog is available to this project.');

  const loaded = await port.readLevel1(discovery.project);
  if (!loaded.level1) throw new D2MoleculeContextError('D2_MOLECULE_CATALOG_UNREADABLE', loaded.error);
  const groups = inventoryGroups(loaded.level1.groups, loaded.level1.skill);
  const context = renderInventoryContext(loaded.level1.project, groups);
  const read: D2MoleculeRead = { role: 'inventory', reference: loaded.level1.reference, via: loaded.level1.via };
  const inventoryBytes = utf8Bytes(context);
  return {
    catalogProject: loaded.level1.project,
    selectedBy: discovery.selectedBy,
    reason: groups.length ? null : 'The selected catalog publishes no usable molecule group.',
    groups,
    context,
    metrics: { inventoryBytes, totalBytes: inventoryBytes, reads: [read] },
  };
}

export async function resolveD2MoleculeSelection(
  port: D2MoleculeCatalogPort,
  inventory: D2MoleculeInventory,
  selectedGroupIds: string[],
): Promise<D2MoleculeSelection> {
  const selected = canonicalSelection(inventory.groups, selectedGroupIds);
  const groups: D2ResolvedMoleculeGroup[] = [];
  const reads = [...inventory.metrics.reads];

  for (const entry of selected) {
    const indexPipelineReference = normalizeD2MlsReference(entry.indexReference);
    const loaded = await port.readGroup(entry.indexReference);
    if (!loaded.catalog) throw new D2MoleculeContextError('D2_MOLECULE_INDEX_UNREADABLE', `${entry.groupId}: ${loaded.error}`);
    if (loaded.catalog.group !== entry.groupId) {
      throw new D2MoleculeContextError('D2_MOLECULE_GROUP_MISMATCH', `${entry.indexReference} exports '${loaded.catalog.group}', expected '${entry.groupId}'`);
    }
    reads.push({ role: 'group-index', reference: entry.indexReference, via: loaded.catalog.via });

    const usageLiteral = loaded.catalog.usageContract;
    if (!usageLiteral) throw new D2MoleculeContextError('D2_MOLECULE_USAGE_MISSING', `${entry.indexReference} exports no usageContract reference`);
    const usageContractPipelineReference = normalizeD2MlsReference(usageLiteral);
    const usage = await port.readUsageContract(usageLiteral);
    if (!usage.contract?.skill.trim()) {
      throw new D2MoleculeContextError('D2_MOLECULE_USAGE_UNREADABLE', `${entry.groupId}: ${usage.error || usageLiteral}`);
    }
    reads.push({ role: 'usage-contract', reference: usageLiteral, via: usage.contract.via });
    groups.push({
      groupId: entry.groupId,
      indexReference: entry.indexReference,
      indexPipelineReference,
      indexVia: loaded.catalog.via,
      usageContractReference: usageLiteral,
      usageContractPipelineReference,
      usageContractVia: usage.contract.via,
      molecules: loaded.catalog.molecules,
      scenarios: loaded.catalog.scenarios,
      groupSkill: loaded.catalog.skill,
      usageSkill: usage.contract.skill,
    });
  }

  const context = JSON.stringify({ moleculeGroups: groups }, null, 2);
  const selectedBytes = utf8Bytes(context);
  return {
    groups,
    pipelineSkills: dedupe(groups.flatMap(group => [group.indexPipelineReference, group.usageContractPipelineReference])),
    context,
    metrics: {
      inventoryBytes: inventory.metrics.inventoryBytes,
      selectedBytes,
      totalBytes: inventory.metrics.inventoryBytes + selectedBytes,
      reads,
    },
  };
}

export async function buildD2MoleculeCandidateContext(port: D2MoleculeCatalogPort, inventory: D2MoleculeInventory): Promise<D2MoleculeCandidateContext> {
  const groups: D2MoleculeCandidateContext['groups'] = [];
  for (const entry of inventory.groups) {
    const loaded = await port.readGroup(entry.indexReference);
    if (!loaded.catalog) throw new D2MoleculeContextError('D2_MOLECULE_INDEX_UNREADABLE', `${entry.groupId}: ${loaded.error}`);
    if (loaded.catalog.group !== entry.groupId) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_MISMATCH', `${entry.indexReference} exports '${loaded.catalog.group}', expected '${entry.groupId}'`);
    const tags = new Set(loaded.catalog.molecules.map(item => item.tag));
    const scenarios = loaded.catalog.scenarios.map(item => {
      const candidates = dedupe(item.recommended);
      for (const candidate of candidates) if (!tags.has(candidate)) throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_UNKNOWN', `${entry.groupId}: ${candidate}`);
      return { scenario: item.scenario, candidates };
    });
    groups.push({ groupId: entry.groupId, scenarios });
  }
  const context = JSON.stringify({ moleculeCandidates: { instruction: 'Recommend only listed exact candidate tags when useful; no recommendation is valid when there is no useful match.', groups } }, null, 2);
  return { groups, context };
}

export function assertD2MoleculeCandidates(selection: D2MoleculeSelection, recommendations: Array<{ groupId: string; candidates: string[] }>): void {
  const byGroup = new Map(selection.groups.map(group => [group.groupId, new Set(group.molecules.map(item => item.tag))]));
  for (const recommendation of recommendations) {
    const candidates = byGroup.get(recommendation.groupId);
    if (!candidates) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_UNKNOWN', `recommendation uses unselected group '${recommendation.groupId}'`);
    for (const candidate of recommendation.candidates) if (!candidates.has(candidate)) throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_UNKNOWN', `${recommendation.groupId}: ${candidate}`);
  }
}

export function normalizeD2MlsReference(reference: string): string {
  const parsed = chFileRefFromImport(reference);
  const unsafeFolder = parsed?.folder.split('/').some(part => !part || part === '.' || part === '..');
  if (!parsed || !parsed.folder || parsed.level !== 2 || unsafeFolder) {
    throw new D2MoleculeContextError('D2_MOLECULE_REF_INVALID', `invalid level-2 MLS reference '${reference}'`);
  }
  return `_${parsed.project}_/l${parsed.level}/${parsed.folder}/${parsed.shortName}${parsed.extension}`;
}

export function inventoryGroups(groups: ChCatalogGroup[], skill: string): D2MoleculeInventoryEntry[] {
  const purposes = purposeByGroup(skill);
  return groups.map(group => {
    const purpose = purposes.get(group.name);
    if (!purpose) throw new D2MoleculeContextError('D2_MOLECULE_PURPOSE_MISSING', `catalog documents no purpose for '${group.name}'`);
    return { groupId: group.name, purpose, moleculeCount: group.molecules, indexReference: group.indexDefs };
  });
}

function canonicalSelection(groups: D2MoleculeInventoryEntry[], requested: string[]): D2MoleculeInventoryEntry[] {
  const byFolded = new Map<string, D2MoleculeInventoryEntry[]>();
  for (const group of groups) {
    const key = group.groupId.trim().toLowerCase();
    byFolded.set(key, [...(byFolded.get(key) ?? []), group]);
  }
  const chosen: D2MoleculeInventoryEntry[] = [];
  const seen = new Set<string>();
  for (const raw of requested) {
    const matches = byFolded.get(raw.trim().toLowerCase()) ?? [];
    if (!matches.length) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_UNKNOWN', `selected group '${raw}' is not in the compact inventory`);
    if (matches.length > 1) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_AMBIGUOUS', `selected group '${raw}' matches ${matches.map(item => item.groupId).join(', ')}`);
    if (!seen.has(matches[0].groupId)) { seen.add(matches[0].groupId); chosen.push(matches[0]); }
  }
  return chosen;
}

function purposeByGroup(skill: string): Map<string, string> {
  const out = new Map<string, string>();
  const pattern = /^###\s+(\S+)\s+\(\d+ molecules\)\s*\n+([^\n]+)/gmu;
  for (const match of skill.matchAll(pattern)) out.set(match[1], match[2].trim());
  return out;
}

function renderInventoryContext(project: number, groups: D2MoleculeInventoryEntry[]): string {
  return JSON.stringify({
    moleculeCatalog: {
      project,
      instruction: 'Select zero or more useful groupId values. Do not select a visual variant here.',
      groups,
    },
  }, null, 2);
}

function emptyInventory(selectedBy: string | null, reason: string): D2MoleculeInventory {
  const context = JSON.stringify({ moleculeCatalog: { groups: [], reason } }, null, 2);
  const inventoryBytes = utf8Bytes(context);
  return { catalogProject: null, selectedBy, reason, groups: [], context, metrics: { inventoryBytes, totalBytes: inventoryBytes, reads: [] } };
}

function dedupe(values: string[]): string[] { return [...new Set(values)]; }
function utf8Bytes(value: string): number { return new TextEncoder().encode(value).byteLength; }
