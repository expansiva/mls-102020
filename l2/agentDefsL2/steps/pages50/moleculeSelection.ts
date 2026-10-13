/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.ts" enhancement="_blank"/>

import type { D2MoleculeGroup, D2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import type { D2Page11Molecule } from '/_102020_/l2/agentDefsL2/helpers/page11.js';

export interface D2MoleculeGroupJudgment { organismId: string; groups: Array<{ groupId: string; relevant: boolean; reason?: string }> }
export interface D2MoleculeGroupResult { selected: Record<string, string[]>; assessments: D2MoleculeGroupJudgment[] }

export function parseD2MoleculeGroupJudgment(value: unknown, organismIds: string[], inventory: D2MoleculeInventory): D2MoleculeGroupResult {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('D2_MOLECULE_GROUP_RESPONSE');
  const root = value as { organisms?: unknown };
  if (!Array.isArray(root.organisms)) throw new Error('D2_MOLECULE_GROUP_RESPONSE');
  const known = new Set(inventory.groups.map(group => group.groupId));
  const returned = new Map<string, string[]>();
  const assessments: D2MoleculeGroupJudgment[] = [];
  for (const raw of root.organisms) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) throw new Error('D2_MOLECULE_GROUP_RESPONSE');
    const row = raw as { organismId?: unknown; groups?: unknown };
    if (typeof row.organismId !== 'string' || !organismIds.includes(row.organismId) || returned.has(row.organismId) || !Array.isArray(row.groups)) throw new Error(`D2_MOLECULE_GROUP_RESPONSE: ${String(row.organismId)}`);
    const seen = new Set<string>();
    for (const groupId of row.groups) {
      if (typeof groupId !== 'string' || !known.has(groupId) || seen.has(groupId)) throw new Error(`D2_MOLECULE_GROUP_RESPONSE: ${row.organismId}`);
      seen.add(groupId);
    }
    const ids = [...seen];
    returned.set(row.organismId, ids);
    assessments.push({ organismId: row.organismId, groups: ids.map(groupId => ({ groupId, relevant: true })) });
  }
  const selected: Record<string, string[]> = {};
  for (const id of organismIds) selected[id] = returned.get(id) ?? [];
  return { selected, assessments };
}

export function moleculeDecisionContext(selected: Record<string, string[]>, groups: D2MoleculeGroup[]): string {
  const used = new Set(Object.values(selected).flat());
  return JSON.stringify({ organisms: selected, groups: groups.filter(group => used.has(group.groupId)).map(group => ({
    groupId: group.groupId, purpose: group.purpose, tags: group.tags, scenarios: group.scenarios,
    usage: group.usageText,
  })) });
}

/** The public definition may cite only exact tags from a group selected for that organism. */
export function gateD2MoleculeRoles(molecules: Record<string, D2Page11Molecule[]>, selected: Record<string, string[]>, groups: D2MoleculeGroup[]): string[] {
  const byId = new Map(groups.map(group => [group.groupId, group]));
  const errors: string[] = [];
  for (const [organismId, roles] of Object.entries(molecules)) {
    const tags = new Set((selected[organismId] ?? []).flatMap(id => byId.get(id)?.tags ?? []));
    for (const role of roles) for (const tag of [role.preferred, role.alternative].filter((item): item is string => !!item)) {
      if (!tags.has(tag)) errors.push(`D2_MOLECULE_ROLE_UNSELECTED: ${organismId}/${tag}`);
    }
  }
  return errors;
}
