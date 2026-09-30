/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.ts" enhancement="_blank"/>

import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import {
  D2MoleculeContextError,
  normalizeD2MlsReference,
  type D2MoleculeCatalogPort,
  type D2MoleculeInventory,
  type D2MoleculeRead,
} from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import type { ChGroupCatalog } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';

export interface D2MoleculeNeed {
  needId: string;
  device: string;
  organismId: string;
  intent: string;
  inputRefs: string[];
  outputRefs: string[];
  interaction: string;
  accessibility: string[];
  template: string | null;
}

export interface D2MoleculeGroupJudgment {
  groupId: string;
  relevant: boolean;
  reason: string;
}

export interface D2MoleculeOptionJudgment { tag: string; reason: string; }
export interface D2MoleculeRoleJudgment {
  role: string;
  groupId: string;
  preferred: D2MoleculeOptionJudgment;
  alternative?: D2MoleculeOptionJudgment;
  discardedCandidates: D2MoleculeOptionJudgment[];
}
export interface D2MoleculeNeedJudgment {
  needId: string;
  roles: D2MoleculeRoleJudgment[];
  noMatchReason?: string;
}

export interface D2MoleculeGroupComparison {
  groupId: string;
  purpose: string;
  indexReference: string;
  usageContractReference: string;
  indexReadReference: string;
  usageContractReadReference: string;
  indexVia: D2MoleculeRead['via'];
  usageContractVia: D2MoleculeRead['via'];
  indexSha256: string;
  usageContractSha256: string;
  candidateTags: string[];
  scenarios: Array<{ scenario: string; candidates: string[] }>;
  groupSkill: string;
  usageSkill: string;
}

export interface D2MoleculeShortlistNeed {
  need: D2MoleculeNeed;
  groups: D2MoleculeGroupJudgment[];
  compared: D2MoleculeGroupComparison[];
}

export interface D2MoleculeShortlist {
  catalogProject: number | null;
  consultation: string;
  needs: D2MoleculeShortlistNeed[];
  sources: D2MoleculeRead[];
}

export interface D2MoleculePublishedOption extends D2MoleculeOptionJudgment {
  indexReference: string;
  usageContractReference: string;
}

export interface D2MoleculePublishedRole {
  needId: string;
  device: string;
  organismId: string;
  role: string;
  groupId: string;
  preferred: D2MoleculePublishedOption;
  alternative?: D2MoleculePublishedOption;
}

export interface D2MoleculeResearchReceipt {
  schemaVersion: '2026-09-29-d2-molecule-research-v1';
  catalogProject: number | null;
  outcome: 'catalog-absent' | 'catalog-valid-no-match' | 'catalog-recommendations';
  consultation: string;
  needs: Array<{
    need: D2MoleculeNeed;
    groups: D2MoleculeGroupJudgment[];
    compared: Array<{ groupId: string; indexReadReference: string; usageContractReadReference: string; candidateTags: string[]; scenarios: Array<{ scenario: string; candidates: string[] }>; indexSha256: string; usageContractSha256: string }>;
    roles: D2MoleculePublishedRole[];
    candidateDiscards: Array<{ role: string; groupId: string; tag: string; reason: string }>;
    noMatchReason?: string;
  }>;
  sources: D2MoleculeRead[];
  contextHash: string;
}

export interface D2MoleculeResearchResult { roles: D2MoleculePublishedRole[]; receipt: D2MoleculeResearchReceipt; }

/** First pass: expose published purposes and page needs so semantic selection can shortlist groups. */
export function buildD2MoleculeResearchQuery(inventory: D2MoleculeInventory, needs: D2MoleculeNeed[]): string {
  return JSON.stringify({
    catalog: inventory.catalogProject === null ? { state: 'absent', reason: inventory.reason } : {
      state: inventory.groups.length ? 'available' : 'valid-without-groups',
      groups: inventory.groups.map(({ groupId, purpose }) => ({ groupId, purpose })),
    },
    needs,
    instructions: [
      'Assess every listed group for every need using its published purpose and the need context.',
      'Return one judgment for each listed group, with a specific reason whether relevant or discarded.',
      'Do not infer relevance from group names or fixed tag mappings.',
      'Do not recommend a group solely because it exists; relevant groups will be read for deeper review.',
      'No match is valid when justified. An absent catalog is distinct from a valid catalog without a match.',
    ],
  });
}

/** Second pass: read only shortlisted index/scenario/usage sources, deduplicating reads for this round. */
export async function buildD2MoleculeShortlist(
  port: D2MoleculeCatalogPort,
  inventory: D2MoleculeInventory,
  needs: D2MoleculeNeed[],
  groupJudgments: Array<{ needId: string; groups: D2MoleculeGroupJudgment[] }>,
): Promise<D2MoleculeShortlist> {
  const needById = uniqueBy(needs, item => item.needId, 'D2_MOLECULE_NEED_DUPLICATE');
  for (const need of needs) if (!need.needId.trim() || !need.device.trim() || !need.organismId.trim()) {
    throw new D2MoleculeContextError('D2_MOLECULE_NEED_IDENTITY_MISSING', need.needId);
  }
  const judgmentsByNeed = uniqueBy(groupJudgments, item => item.needId, 'D2_MOLECULE_JUDGMENT_DUPLICATE');
  if (judgmentsByNeed.size !== needById.size || [...needById.keys()].some(id => !judgmentsByNeed.has(id))) {
    throw new D2MoleculeContextError('D2_MOLECULE_JUDGMENT_MISSING', 'every need must have exactly one group assessment');
  }
  const inventoryById = uniqueBy(inventory.groups, item => item.groupId, 'D2_MOLECULE_GROUP_AMBIGUOUS');
  const catalogCache = new Map<string, Promise<ChGroupCatalog>>();
  const usageCache = new Map<string, Promise<{ skill: string; via: D2MoleculeRead['via']; sha256: string }>>();
  const reads: D2MoleculeRead[] = [...inventory.metrics.reads];
  const shortlisted: D2MoleculeShortlistNeed[] = [];

  for (const need of needs) {
    const judgment = judgmentsByNeed.get(need.needId)!;
    const groupsById = uniqueBy(judgment.groups, item => item.groupId, 'D2_MOLECULE_GROUP_JUDGMENT_DUPLICATE');
    if (groupsById.size !== inventoryById.size || [...inventoryById.keys()].some(id => !groupsById.has(id))) {
      throw new D2MoleculeContextError('D2_MOLECULE_GROUP_JUDGMENT_MISSING', `${need.needId}: assess every inventory group exactly once`);
    }
    for (const [groupId, item] of groupsById) {
      if (!inventoryById.has(groupId)) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_UNKNOWN', groupId);
      if (!item.reason.trim()) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_REASON_MISSING', `${need.needId}/${groupId}`);
    }

    const compared: D2MoleculeGroupComparison[] = [];
    for (const item of groupsById.values()) {
      if (!item.relevant) continue;
      const entry = inventoryById.get(item.groupId)!;
      const catalog = await readCatalog(port, entry.indexReference, item.groupId, catalogCache);
      if (!catalog.usageContract) throw new D2MoleculeContextError('D2_MOLECULE_USAGE_MISSING', `${item.groupId}: index has no usageContract`);
      const usage = await readUsage(port, catalog.usageContract, item.groupId, usageCache);
      const knownTags = new Set(catalog.molecules.map(molecule => molecule.tag));
      const scenarios = catalog.scenarios.map(scenario => {
        const candidates = [...new Set(scenario.recommended)];
        for (const candidate of candidates) if (!knownTags.has(candidate)) {
          throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_UNKNOWN', `${item.groupId}: ${candidate}`);
        }
        return { scenario: scenario.scenario, candidates };
      });
      const indexSha256 = await sha256Text(JSON.stringify(catalog));
      reads.push({ role: 'group-index', reference: catalog.reference, via: catalog.via, sha256: indexSha256 });
      reads.push({ role: 'usage-contract', reference: catalog.usageContract, via: usage.via, sha256: usage.sha256 });
      compared.push({
        groupId: item.groupId, purpose: entry.purpose,
        indexReference: normalizeD2MlsReference(catalog.reference), usageContractReference: normalizeD2MlsReference(catalog.usageContract),
        indexReadReference: catalog.reference, usageContractReadReference: catalog.usageContract,
        indexVia: catalog.via, usageContractVia: usage.via, indexSha256, usageContractSha256: usage.sha256,
        candidateTags: [...knownTags], scenarios, groupSkill: catalog.skill, usageSkill: usage.skill,
      });
    }
    shortlisted.push({ need, groups: [...groupsById.values()], compared });
  }
  return { catalogProject: inventory.catalogProject, consultation: buildD2MoleculeResearchQuery(inventory, needs), needs: shortlisted, sources: dedupeReads(reads) };
}

/** Final pass: validate preferred/optional alternative against shortlisted, actually read candidates. */
export async function resolveD2MoleculeResearch(shortlist: D2MoleculeShortlist, judgments: D2MoleculeNeedJudgment[]): Promise<D2MoleculeResearchResult> {
  const decisionByNeed = uniqueBy(judgments, item => item.needId, 'D2_MOLECULE_JUDGMENT_DUPLICATE');
  const expected = new Set(shortlist.needs.map(item => item.need.needId));
  if (decisionByNeed.size !== expected.size || [...expected].some(id => !decisionByNeed.has(id))) {
    throw new D2MoleculeContextError('D2_MOLECULE_JUDGMENT_MISSING', 'every need must have exactly one recommendation judgment');
  }
  const receiptNeeds: D2MoleculeResearchReceipt['needs'] = [];
  const roles: D2MoleculePublishedRole[] = [];
  for (const item of shortlist.needs) {
    const judgment = decisionByNeed.get(item.need.needId)!;
    const byGroup = uniqueBy(item.compared, group => group.groupId, 'D2_MOLECULE_GROUP_COMPARISON_DUPLICATE');
    const groupJudgments = new Map(item.groups.map(group => [group.groupId, group]));
    const roleNames = new Set<string>();
    const needRoles: D2MoleculePublishedRole[] = [];
    const candidateDiscards: D2MoleculeResearchReceipt['needs'][number]['candidateDiscards'] = [];
    if (!byGroup.size && judgment.roles.length) throw new D2MoleculeContextError('D2_MOLECULE_ROLE_WITHOUT_GROUP', item.need.needId);
    if (!byGroup.size && !judgment.noMatchReason?.trim()) throw new D2MoleculeContextError('D2_MOLECULE_NO_MATCH_REASON_MISSING', item.need.needId);
    if (byGroup.size && judgment.noMatchReason) throw new D2MoleculeContextError('D2_MOLECULE_NO_MATCH_WITH_GROUP', item.need.needId);
    if (byGroup.size && !judgment.roles.length) throw new D2MoleculeContextError('D2_MOLECULE_RECOMMENDATION_MISSING', item.need.needId);

    for (const role of judgment.roles) {
      if (!role.role.trim() || roleNames.has(role.role)) throw new D2MoleculeContextError('D2_MOLECULE_ROLE_DUPLICATE', `${item.need.needId}/${role.role}`);
      roleNames.add(role.role);
      const comparison = byGroup.get(role.groupId);
      if (!comparison || !groupJudgments.get(role.groupId)?.relevant) throw new D2MoleculeContextError('D2_MOLECULE_ROLE_GROUP_NOT_SHORTLISTED', `${item.need.needId}/${role.groupId}`);
      const option = (value: D2MoleculeOptionJudgment): D2MoleculePublishedOption => {
        if (!comparison.candidateTags.includes(value.tag)) throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_UNKNOWN', `${role.groupId}: ${value.tag}`);
        if (!value.reason.trim()) throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_REASON_MISSING', `${item.need.needId}/${role.role}/${value.tag}`);
        return { tag: value.tag, reason: value.reason, indexReference: comparison.indexReference, usageContractReference: comparison.usageContractReference };
      };
      const preferred = option(role.preferred);
      const alternative = role.alternative ? option(role.alternative) : undefined;
      if (role.alternative?.tag === role.preferred.tag) throw new D2MoleculeContextError('D2_MOLECULE_ALTERNATIVE_DUPLICATE', `${item.need.needId}/${role.role}`);
      const chosenTags = new Set([role.preferred.tag, role.alternative?.tag].filter((tag): tag is string => Boolean(tag)));
      const discardedByTag = uniqueBy(role.discardedCandidates, candidate => candidate.tag, 'D2_MOLECULE_DISCARD_DUPLICATE');
      for (const candidate of role.discardedCandidates) {
        if (!comparison.candidateTags.includes(candidate.tag)) throw new D2MoleculeContextError('D2_MOLECULE_CANDIDATE_UNKNOWN', `${role.groupId}: ${candidate.tag}`);
        if (!candidate.reason.trim()) throw new D2MoleculeContextError('D2_MOLECULE_DISCARD_REASON_MISSING', `${item.need.needId}/${role.role}/${candidate.tag}`);
        if (chosenTags.has(candidate.tag)) throw new D2MoleculeContextError('D2_MOLECULE_DISCARD_CHOSEN', `${item.need.needId}/${role.role}/${candidate.tag}`);
        candidateDiscards.push({ role: role.role, groupId: role.groupId, tag: candidate.tag, reason: candidate.reason });
      }
      const unexplained = comparison.candidateTags.filter(tag => !chosenTags.has(tag) && !discardedByTag.has(tag));
      if (unexplained.length) throw new D2MoleculeContextError('D2_MOLECULE_DISCARD_REASON_MISSING', `${item.need.needId}/${role.role}: ${unexplained.join(', ')}`);
      const published: D2MoleculePublishedRole = {
        needId: item.need.needId, device: item.need.device, organismId: item.need.organismId,
        role: role.role, groupId: role.groupId, preferred,
        ...(alternative ? { alternative } : {}),
      };
      needRoles.push(published);
      roles.push(published);
    }
    receiptNeeds.push({
      need: item.need, groups: item.groups,
      compared: item.compared.map(group => ({
        groupId: group.groupId, indexReadReference: group.indexReadReference, usageContractReadReference: group.usageContractReadReference,
        candidateTags: group.candidateTags, scenarios: group.scenarios,
        indexSha256: group.indexSha256, usageContractSha256: group.usageContractSha256,
      })),
      roles: needRoles, candidateDiscards, ...(judgment.noMatchReason ? { noMatchReason: judgment.noMatchReason } : {}),
    });
  }
  const base: Omit<D2MoleculeResearchReceipt, 'contextHash'> = {
    schemaVersion: '2026-09-29-d2-molecule-research-v1', catalogProject: shortlist.catalogProject,
    outcome: shortlist.catalogProject === null ? 'catalog-absent' : roles.length ? 'catalog-recommendations' : 'catalog-valid-no-match',
    consultation: shortlist.consultation, needs: receiptNeeds, sources: shortlist.sources,
  };
  return { roles, receipt: { ...base, contextHash: await sha256Text(JSON.stringify(base)) } };
}

export async function assertD2MoleculeResearchReceiptIntegrity(receipt: D2MoleculeResearchReceipt): Promise<void> {
  if (receipt.schemaVersion !== '2026-09-29-d2-molecule-research-v1') throw new D2MoleculeContextError('D2_MOLECULE_RESEARCH_RECEIPT_VERSION', receipt.schemaVersion);
  const sourceIds = receipt.sources.map(source => `${source.role}\0${source.reference}`);
  if (new Set(sourceIds).size !== sourceIds.length) throw new D2MoleculeContextError('D2_MOLECULE_RESEARCH_SOURCE_DUPLICATE', 'source refs must be deduplicated');
  for (const need of receipt.needs) for (const group of need.compared) {
    const index = receipt.sources.find(source => source.role === 'group-index' && source.reference === group.indexReadReference);
    const usage = receipt.sources.find(source => source.role === 'usage-contract' && source.reference === group.usageContractReadReference);
    if (index?.sha256 !== group.indexSha256 || usage?.sha256 !== group.usageContractSha256) {
      throw new D2MoleculeContextError('D2_MOLECULE_RESEARCH_PROVENANCE', `${need.need.needId}/${group.groupId}`);
    }
  }
  if (receipt.catalogProject === null && receipt.outcome !== 'catalog-absent') throw new D2MoleculeContextError('D2_MOLECULE_RESEARCH_OUTCOME', 'missing catalog has a non-absent outcome');
  const { contextHash, ...base } = receipt;
  const actual = await sha256Text(JSON.stringify(base));
  if (contextHash !== actual) throw new D2MoleculeContextError('D2_MOLECULE_RESEARCH_RECEIPT_HASH', `${contextHash} != ${actual}`);
}

export function buildD2MoleculeShortlistContext(shortlist: D2MoleculeShortlist): string {
  return JSON.stringify({ moleculeResearch: shortlist.needs.map(item => ({
    need: item.need,
    relevantGroups: item.compared.map(({ groupId, purpose, indexReference, usageContractReference, candidateTags, scenarios, groupSkill, usageSkill }) => ({
      groupId, purpose, indexReference, usageContractReference, candidateTags, scenarios, groupSkill, usageSkill,
    })),
    discardedGroups: item.groups.filter(group => !group.relevant).map(group => ({ groupId: group.groupId, reason: group.reason })),
  })) }, null, 2);
}

async function readCatalog(port: D2MoleculeCatalogPort, reference: string, groupId: string, cache: Map<string, Promise<ChGroupCatalog>>): Promise<ChGroupCatalog> {
  let pending = cache.get(reference);
  if (!pending) {
    pending = port.readGroup(reference).then(({ catalog, error }) => {
      if (!catalog) throw new D2MoleculeContextError('D2_MOLECULE_INDEX_UNREADABLE', `${groupId}: ${error}`);
      if (catalog.group !== groupId) throw new D2MoleculeContextError('D2_MOLECULE_GROUP_MISMATCH', `${reference} exports '${catalog.group}', expected '${groupId}'`);
      return catalog;
    });
    cache.set(reference, pending);
  }
  return pending;
}

async function readUsage(port: D2MoleculeCatalogPort, reference: string, groupId: string, cache: Map<string, Promise<{ skill: string; via: D2MoleculeRead['via']; sha256: string }>>): Promise<{ skill: string; via: D2MoleculeRead['via']; sha256: string }> {
  let pending = cache.get(reference);
  if (!pending) {
    pending = port.readUsageContract(reference).then(async ({ contract, error }) => {
      if (!contract?.skill.trim()) throw new D2MoleculeContextError('D2_MOLECULE_USAGE_UNREADABLE', `${groupId}: ${error || reference}`);
      return { skill: contract.skill, via: contract.via, sha256: await sha256Text(contract.skill) };
    });
    cache.set(reference, pending);
  }
  return pending;
}

function uniqueBy<T>(items: T[], keyOf: (item: T) => string, code: string): Map<string, T> {
  const map = new Map<string, T>();
  for (const item of items) {
    const key = keyOf(item);
    if (map.has(key)) throw new D2MoleculeContextError(code, key);
    map.set(key, item);
  }
  return map;
}

function dedupeReads(reads: D2MoleculeRead[]): D2MoleculeRead[] {
  return [...new Map(reads.map(read => [`${read.role}\0${read.reference}`, read])).values()]
    .sort((a, b) => `${a.role}\0${a.reference}`.localeCompare(`${b.role}\0${b.reference}`));
}
