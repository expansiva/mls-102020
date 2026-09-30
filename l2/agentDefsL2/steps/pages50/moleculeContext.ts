/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/helpers/hash.js';

export interface D2MoleculeGroupSummary { groupId: string; purpose: string; indexReference: string; count: number }
export interface D2MoleculeGroup {
  groupId: string;
  purpose: string;
  indexReference: string;
  usageReference: string;
  tags: string[];
  scenarios: Array<{ scenario: string; recommended: string[] }>;
  indexSource: string;
  indexText: string;
  usageSource: string;
  usageText: string;
}
export interface D2MoleculeCatalogPort {
  discover(project: number): Promise<{ catalogProject: number | null; selectedBy: 'local' | 'dependency' | null; directDependencies: number[]; groups: D2MoleculeGroupSummary[]; source: string }>;
  readGroup(summary: D2MoleculeGroupSummary): Promise<D2MoleculeGroup>;
}
export interface D2MoleculeInventory {
  catalogProject: number | null;
  selectedBy: 'local' | 'dependency' | null;
  directDependencies: number[];
  groups: D2MoleculeGroupSummary[];
  sourceHash: string;
}

/** Phase one sends group purposes only. No group index or usage text enters this prompt. */
export async function buildD2MoleculeInventory(port: D2MoleculeCatalogPort, project: number): Promise<D2MoleculeInventory> {
  const found = await port.discover(project);
  if (new Set(found.groups.map(group => group.groupId)).size !== found.groups.length) throw new Error('D2_MOLECULE_GROUP_DUPLICATE');
  return { catalogProject: found.catalogProject, selectedBy: found.selectedBy, directDependencies: found.directDependencies,
    groups: found.groups, sourceHash: await sha256Text(found.source) };
}

export function moleculeGroupPrompt(inventory: D2MoleculeInventory, organisms: Array<{ id: string; kind: string; text: string }>): string {
  return JSON.stringify({ organisms, groups: inventory.groups, instruction: 'For each organism, assess every group by its published purpose. Return groupId, relevant and a specific reason for relevant and discarded groups. Do not infer from group name. No match is valid.' });
}

/** Phase two reads only selected indexes and usage contracts. */
export async function readD2MoleculeShortlist(port: D2MoleculeCatalogPort, inventory: D2MoleculeInventory, selected: Record<string, string[]>): Promise<{ groups: D2MoleculeGroup[]; tags: Set<string>; hashes: Record<string, string> }> {
  const known = new Map(inventory.groups.map(group => [group.groupId, group]));
  const ids = new Set(Object.values(selected).flat());
  for (const id of ids) if (!known.has(id)) throw new Error(`D2_MOLECULE_GROUP_UNKNOWN: ${id}`);
  const groups: D2MoleculeGroup[] = [];
  const hashes: Record<string, string> = {};
  for (const id of ids) {
    const summary = known.get(id)!;
    const group = await port.readGroup(summary);
    if (group.groupId !== id || group.indexReference !== summary.indexReference || !group.usageText.trim()) throw new Error(`D2_MOLECULE_GROUP_UNREADABLE: ${id}`);
    if (new Set(group.tags).size !== group.tags.length) throw new Error(`D2_MOLECULE_TAG_DUPLICATE: ${id}`);
    hashes[group.indexReference] = await sha256Text(group.indexSource);
    hashes[group.usageReference] = await sha256Text(group.usageSource);
    groups.push(group);
  }
  return { groups, tags: new Set(groups.flatMap(group => group.tags)), hashes };
}
