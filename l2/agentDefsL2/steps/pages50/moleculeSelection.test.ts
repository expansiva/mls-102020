/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import type { ChDiscovery, ChGroupCatalog, ChLevel1 } from '/_102020_/l2/aura/molecules/agentChooseMolecules/helpers/chCatalog.js';
import {
  buildD2MoleculeResearchQuery,
  buildD2MoleculeShortlist,
  buildD2MoleculeShortlistContext,
  assertD2MoleculeResearchReceiptIntegrity,
  resolveD2MoleculeResearch,
  type D2MoleculeGroupJudgment,
  type D2MoleculeNeed,
  type D2MoleculeNeedJudgment,
} from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import type { D2MoleculeCatalogPort, D2MoleculeInventory, D2MoleculeRead } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';

const NEEDS: D2MoleculeNeed[] = [
  { needId: 'desktop:orders', device: 'desktop', organismId: 'orders', intent: 'Review records', inputRefs: ['Orders.status'], outputRefs: [], interaction: 'filter and inspect', accessibility: ['keyboard'], template: 'table' },
  { needId: 'mobile:orders', device: 'mobile', organismId: 'orders', intent: 'Review records on a narrow screen', inputRefs: ['Orders.status'], outputRefs: [], interaction: 'filter and inspect', accessibility: ['keyboard', 'screen reader'], template: 'cards' },
];

void test('shortlists by semantic judgment, excludes irrelevant groups, and supports device-specific choices', async () => {
  const fixture = makeFixture();
  const inventory = inventoryFor(fixture.groups);
  const query = buildD2MoleculeResearchQuery(inventory, NEEDS);
  assert.match(query, /Published purpose for groupTable/u);
  assert.doesNotMatch(query, /groupirrelevant--ml/u);
  const shortlist = await buildD2MoleculeShortlist(fixture.port, inventory, NEEDS, [
    groupJudgment('desktop:orders', ['groupTable', 'groupSearch']),
    groupJudgment('mobile:orders', ['groupTable']),
  ]);
  const context = buildD2MoleculeShortlistContext(shortlist);
  assert.match(context, /Usage contract for/u);
  assert.match(context, /groupIrrelevant/u);
  assert.deepEqual(fixture.calls.sort(), ['groupTable', 'groupSearch', 'usageTable', 'usageSearch'].sort());
  const desktop = roleJudgment('desktop:orders', 'groupTable', 'grouptable--ml-record-table', 'grouptable--ml-record-cards');
  desktop.roles.push({ role: 'filter records', groupId: 'groupSearch', preferred: { tag: 'groupsearch--ml-filter', reason: 'The published control supports the filter interaction.' }, discardedCandidates: [] });
  const result = await resolveD2MoleculeResearch(shortlist, [
    desktop,
    roleJudgment('mobile:orders', 'groupTable', 'grouptable--ml-record-cards', undefined, ['grouptable--ml-record-table']),
  ]);

  assert.deepEqual(result.roles.map(item => [item.device, item.preferred.tag]), [
    ['desktop', 'grouptable--ml-record-table'], ['desktop', 'groupsearch--ml-filter'], ['mobile', 'grouptable--ml-record-cards'],
  ]);
  assert.equal(result.roles[0].alternative?.tag, 'grouptable--ml-record-cards');
  assert.equal(result.receipt.needs[1].candidateDiscards[0].tag, 'grouptable--ml-record-table');
  assert.equal(result.roles[0].preferred.indexReference, '_102040_/l2/molecules/groupTable/index.defs.ts');
  assert.equal(result.receipt.needs[0].groups.find(item => item.groupId === 'groupIrrelevant')?.reason, 'Purpose does not serve this review interaction.');
  assert.equal(result.receipt.sources.length, 5);
  assert.ok(result.receipt.needs[0].compared.find(item => item.groupId === 'groupTable')?.candidateTags.includes('grouptable--ml-record-table'));
  assert.match(result.receipt.consultation, /Review records/u);
  await assert.doesNotReject(() => assertD2MoleculeResearchReceiptIntegrity(result.receipt));
  const tampered = structuredClone(result.receipt);
  tampered.needs[1].candidateDiscards[0].reason = 'edited after selection';
  await assert.rejects(() => assertD2MoleculeResearchReceiptIntegrity(tampered), /D2_MOLECULE_RESEARCH_RECEIPT_HASH/u);
});

void test('rejects invented candidates and distinguishes unreadable shortlist sources from no-match', async () => {
  const fixture = makeFixture();
  const inventory = inventoryFor(fixture.groups);
  const shortlist = await buildD2MoleculeShortlist(fixture.port, inventory, [NEEDS[0]], [groupJudgment('desktop:orders', ['groupTable'])]);
  const invented = roleJudgment('desktop:orders', 'groupTable', 'invented--tag');
  await assert.rejects(() => resolveD2MoleculeResearch(shortlist, [invented]), /D2_MOLECULE_CANDIDATE_UNKNOWN/u);

  const missing = makeFixture();
  missing.port.readUsageContract = async () => ({ contract: null, error: 'source not available' });
  await assert.rejects(() => buildD2MoleculeShortlist(missing.port, inventoryFor(missing.groups), [NEEDS[0]], [groupJudgment('desktop:orders', ['groupTable'])]), /D2_MOLECULE_USAGE_UNREADABLE/u);

  const duplicate = inventoryFor(fixture.groups);
  duplicate.groups.push({ ...duplicate.groups[0] });
  await assert.rejects(() => buildD2MoleculeShortlist(fixture.port, duplicate, [NEEDS[0]], [groupJudgment('desktop:orders', ['groupTable'])]), /D2_MOLECULE_GROUP_AMBIGUOUS/u);
});

void test('records justified no-match separately from absent catalog and keeps recommendations empty', async () => {
  const fixture = makeFixture();
  const inventory = inventoryFor(fixture.groups);
  const shortlist = await buildD2MoleculeShortlist(fixture.port, inventory, [NEEDS[0]], [groupJudgment('desktop:orders', [])]);
  const valid = await resolveD2MoleculeResearch(shortlist, [{
    needId: 'desktop:orders', roles: [], noMatchReason: 'No published group fits this interaction need.',
  }]);
  assert.equal(valid.receipt.outcome, 'catalog-valid-no-match');
  assert.deepEqual(valid.roles, []);
  assert.deepEqual(fixture.calls, []);

  const absentInventory = inventoryFor([]);
  absentInventory.catalogProject = null;
  const absent = await buildD2MoleculeShortlist(fixture.port, absentInventory, [NEEDS[0]], [{ needId: 'desktop:orders', groups: [] }]);
  const absentResult = await resolveD2MoleculeResearch(absent, [{ needId: 'desktop:orders', roles: [], noMatchReason: 'No catalog is available.' }]);
  assert.equal(absentResult.receipt.outcome, 'catalog-absent');
});

void test('large inventory stays in semantic consultation while the output contains only chosen roles', async () => {
  const groups = Array.from({ length: 120 }, (_, index) => ({
    groupId: `group${index}`, purpose: `Published purpose ${index}`, moleculeCount: 0,
    indexReference: `/_102040_/l2/molecules/group${index}/index.defs`,
  }));
  const inventory = inventoryFor([]);
  inventory.groups = groups;
  const assessments: D2MoleculeGroupJudgment[] = groups.map(group => ({ groupId: group.groupId, relevant: false, reason: 'No interaction match.' }));
  const shortlist = await buildD2MoleculeShortlist(makeFixture().port, inventory, [NEEDS[0]], [{ needId: NEEDS[0].needId, groups: assessments }]);
  const result = await resolveD2MoleculeResearch(shortlist, [{ needId: NEEDS[0].needId, roles: [], noMatchReason: 'No published group fits the need.' }]);
  assert.match(buildD2MoleculeResearchQuery(inventory, [NEEDS[0]]), /group119/u);
  assert.deepEqual(result.roles, []);
  assert.equal(result.receipt.needs[0].groups.length, 120);
});

function groupJudgment(needId: string, relevant: string[]) {
  return {
    needId,
    groups: ['groupTable', 'groupSearch', 'groupIrrelevant'].map(groupId => ({
      groupId, relevant: relevant.includes(groupId),
      reason: relevant.includes(groupId) ? `Published purpose supports ${groupId} for this need.` : 'Purpose does not serve this review interaction.',
    })),
  };
}

function roleJudgment(needId: string, groupId: string, preferred: string, alternative?: string, discarded: string[] = []): D2MoleculeNeedJudgment {
  return { needId, roles: [{
    role: 'display records', groupId,
    preferred: { tag: preferred, reason: 'The published interaction matches this presentation need.' },
    ...(alternative ? { alternative: { tag: alternative, reason: 'A useful presentation variant supports the same role.' } } : {}),
    discardedCandidates: discarded.map(tag => ({ tag, reason: 'This variation does not fit the selected device presentation.' })),
  }] };
}

function makeFixture(): { port: D2MoleculeCatalogPort; groups: ChGroupCatalog[]; calls: string[] } {
  const calls: string[] = [];
  const groups: ChGroupCatalog[] = [
    group('groupTable', ['grouptable--ml-record-table', 'grouptable--ml-record-cards'], 'usageTable'),
    group('groupSearch', ['groupsearch--ml-filter'], 'usageSearch'),
    group('groupIrrelevant', ['groupirrelevant--ml-control'], 'usageIrrelevant'),
  ];
  const port: D2MoleculeCatalogPort = {
    discover: async () => discovery(),
    readLevel1: async project => ({ level1: level1(project), error: '' }),
    readGroup: async reference => {
      const value = groups.find(item => item.reference === reference);
      if (!value) return { catalog: null, error: 'source not available' };
      calls.push(value.group);
      return { catalog: structuredClone(value), error: '' };
    },
    readUsageContract: async reference => {
      calls.push(reference.includes('usageTable') ? 'usageTable' : reference.includes('usageSearch') ? 'usageSearch' : 'usageIrrelevant');
      return { contract: { reference, via: 'stor', skill: `Usage contract for ${reference}` }, error: '' };
    },
  };
  return { port, groups, calls };
}

function group(name: string, tags: string[], usage: string): ChGroupCatalog {
  return {
    reference: `/_102040_/l2/molecules/${name}/index.defs`, via: 'stor', group: name,
    usageContract: `/_102020_/l2/aura/molecules/skills/${usage}/usage`,
    molecules: tags.map(tag => ({ tag, defs: `/_102040_/l2/molecules/${name}/${tag.split('--')[1]}.defs` })),
    scenarios: [{ scenario: 'show records', recommended: tags }], skill: `Purpose for ${name}`,
  };
}

function inventoryFor(catalogs: ChGroupCatalog[]): D2MoleculeInventory {
  const reads: D2MoleculeRead[] = [{ role: 'inventory', reference: '/_102040_/l2/molecules/skill', via: 'stor', sha256: `sha256:${'1'.repeat(64)}` }];
  return {
    consumerProject: 999, catalogProject: 102040, selectedBy: 'dependency', directDeps: [102040], resolvedDeps: [102040], candidates: [102040],
    reason: null, groups: catalogs.map(item => ({ groupId: item.group, purpose: `Published purpose for ${item.group}`, moleculeCount: item.molecules.length, indexReference: item.reference })),
    context: '{}', metrics: { inventoryBytes: 2, totalBytes: 2, reads },
  };
}

function discovery(): ChDiscovery { return { project: 102040, selectedBy: 'dependency', candidates: [102040], error: '', activeProject: 999, directDeps: [102040], resolvedDeps: [102040] }; }
function level1(project: number): ChLevel1 { return { project, reference: '/_102040_/l2/molecules/skill', via: 'stor', theme: null, skill: '', groups: [] }; }
