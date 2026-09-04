/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyMoleculeChoices,
  applyPipelineSkills,
  parseContractTypesFromCompiledTs,
  parseContractTypesFromDefsSource,
  parsePageDefsSource,
  serializePageDefsSource,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2DefsPatch.js';

// A trimmed but real shape of _102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs.ts.
const PAGE_SOURCE = `/// <mls fileReference="_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.defs.ts" enhancement="_blank"/>

export const definition = {
  "pageId": "approveChangeOrder",
  "dataBindings": [
    {
      "id": "binding.approveChangeOrder.qryLocateChangeOrder",
      "command": "qryLocateChangeOrder",
      "kind": "query",
      "inputs": []
    },
    {
      "id": "binding.approveChangeOrder.cmdApproveChangeOrderDecision",
      "command": "cmdApproveChangeOrderDecision",
      "kind": "command",
      "inputs": [
        {
          "name": "status",
          "presentation": "form"
        }
      ]
    }
  ]
};

export const pipeline = [
  {
    "id": "approveChangeOrder__l2_page",
    "type": "l2_page",
    "skills": [
      "_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts"
    ],
    "dependsFiles": [
      "_102046_/l2/buildFlowFsm/web/shared/approveChangeOrder.ts"
    ]
  }
] as const;
`;

void test('parses both exports of a page .defs.ts', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE);
  assert.ok(parsed);
  assert.equal(parsed!.definitionJson.pageId, 'approveChangeOrder');
  assert.equal((parsed!.pipelineJson[0] as any).id, 'approveChangeOrder__l2_page');
});

void test('round-trips byte-for-byte when nothing changes', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const rewritten = serializePageDefsSource(parsed, parsed.definitionJson, parsed.pipelineJson);
  assert.equal(rewritten, PAGE_SOURCE);
});

void test('returns null for a file that is not the { definition, pipeline } shape', () => {
  assert.equal(parsePageDefsSource('export const somethingElse = {} as const;'), null);
  assert.equal(parsePageDefsSource(''), null);
});

void test('applyMoleculeChoices sets molecule on the query binding and the form input, never on selection/route', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const regionIds = ['binding.approveChangeOrder.qryLocateChangeOrder', 'binding.approveChangeOrder.cmdApproveChangeOrderDecision::status'];
  const choices = new Map([
    ['binding.approveChangeOrder.qryLocateChangeOrder', { group: 'groupViewTable', tag: 'groupviewtable--ml-data-table' }],
    ['binding.approveChangeOrder.cmdApproveChangeOrderDecision::status', { group: 'groupSelectOne', tag: 'groupselectone--ml-select-one' }],
  ]);
  const patched = applyMoleculeChoices(parsed.definitionJson, regionIds, choices);
  const bindings = (patched.dataBindings as any[]);
  assert.deepEqual(bindings[0].molecule, { group: 'groupViewTable', tag: 'groupviewtable--ml-data-table' });
  assert.deepEqual(bindings[1].inputs[0].molecule, { group: 'groupSelectOne', tag: 'groupselectone--ml-select-one' });
});

void test('applyMoleculeChoices removes a stale molecule when the new answer is null (reconciliation)', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  (parsed.definitionJson.dataBindings as any[])[0].molecule = { group: 'stale', tag: 'stale--tag' };
  const patched = applyMoleculeChoices(
    parsed.definitionJson,
    ['binding.approveChangeOrder.qryLocateChangeOrder'],
    new Map([['binding.approveChangeOrder.qryLocateChangeOrder', null]]),
  );
  assert.equal('molecule' in (patched.dataBindings as any[])[0], false);
});

void test('applyMoleculeChoices leaves a region untouched when it was never answered (e.g. c1 said no group)', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const patched = applyMoleculeChoices(parsed.definitionJson, ['binding.approveChangeOrder.qryLocateChangeOrder'], new Map());
  assert.equal('molecule' in (patched.dataBindings as any[])[0], false);
});

void test('a page:: region lands in the root pageMolecules[] — it has no binding node to carry it', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const patched = applyMoleculeChoices(
    parsed.definitionJson,
    ['page::feedback'],
    new Map([['page::feedback', { group: 'groupNotifyUser', tag: 'groupnotifyuser--ml-toast-notification' }]]),
  );
  assert.deepEqual(patched.pageMolecules, [{ role: 'feedback', group: 'groupNotifyUser', tag: 'groupnotifyuser--ml-toast-notification' }]);
  // The bindings are untouched by a page-level choice.
  assert.equal('molecule' in (patched.dataBindings as any[])[0], false);
});

void test('a rerun reconciles one role in place, and keeps the other roles', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  parsed.definitionJson.pageMolecules = [
    { role: 'feedback', group: 'stale', tag: 'stale--tag' },
    { role: 'confirmation', group: 'keptGroup', tag: 'kept--tag' },
  ];
  const patched = applyMoleculeChoices(
    parsed.definitionJson,
    ['page::feedback'],
    new Map([['page::feedback', { group: 'groupNotifyUser', tag: 'groupnotifyuser--ml-toast-notification' }]]),
  );
  assert.deepEqual(patched.pageMolecules, [
    { role: 'confirmation', group: 'keptGroup', tag: 'kept--tag' },
    { role: 'feedback', group: 'groupNotifyUser', tag: 'groupnotifyuser--ml-toast-notification' },
  ]);
});

void test('answering none for the last page role deletes pageMolecules entirely — never an empty array', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  parsed.definitionJson.pageMolecules = [{ role: 'feedback', group: 'g', tag: 't' }];
  const patched = applyMoleculeChoices(parsed.definitionJson, ['page::feedback'], new Map([['page::feedback', null]]));
  assert.equal('pageMolecules' in patched, false);
});

void test('a page:: role is never written as null, and an unknown page role writes nothing', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  const noRole = applyMoleculeChoices(parsed.definitionJson, ['page::'], new Map([['page::', { group: 'g', tag: 't' }]]));
  assert.equal('pageMolecules' in noRole, false);
});

void test('applyPipelineSkills appends to skills/dependsFiles of entry 0 only, deduplicated', () => {
  const parsed = parsePageDefsSource(PAGE_SOURCE)!;
  // PIPELINE form on both: no leading slash, with extension (see cm2Types.cm2PipelineRef).
  const addition = {
    usageRef: '_102020_/l2/aura/molecules/skills/groupSelectOne/usage.ts',
    componentFiles: ['_102040_/l2/molecules/groupselectone/ml-select-one.ts'],
  };
  const once = applyPipelineSkills(parsed.pipelineJson, [addition]);
  const twice = applyPipelineSkills(once, [addition]);
  const entry = twice[0] as any;
  assert.equal(entry.skills.filter((s: string) => s === addition.usageRef).length, 1);
  assert.equal(entry.dependsFiles.filter((s: string) => s === addition.componentFiles[0]).length, 1);
  // The original skill/dependsFile survive the patch.
  assert.ok(entry.skills.includes('_102020_/l2/agentChangeFrontend/skills/genCfePage11RenderTs.ts'));
  // Nothing this agent adds to a pipeline array may carry a leading slash — materialize drops those.
  for (const value of [...entry.skills, ...entry.dependsFiles]) assert.equal(value.startsWith('/'), false, value);
});

const CONTRACT_DEFS_SOURCE = `export const definition = [
  {
    "commandName": "qryLocateChangeOrder",
    "input": [],
    "output": [
      { "name": "changeOrderId", "type": "string" },
      { "name": "changeAmount", "type": "number" }
    ]
  }
];

export const pipeline = [] as const;
`;

void test('parses field types from a contract .defs.ts (definition is an ARRAY here, not an object)', () => {
  const types = parseContractTypesFromDefsSource(CONTRACT_DEFS_SOURCE);
  assert.deepEqual(types, { qryLocateChangeOrder: { input: {}, output: { changeOrderId: 'string', changeAmount: 'number' } } });
});

const CONTRACT_TS_SOURCE = `export interface CmdApproveChangeOrderDecisionInput {
  changeOrderChangeOrderId: string;
  status: string;
}
export interface CmdApproveChangeOrderDecisionOutput {
  changeOrderId: string;
}
`;

void test('falls back to regex-parsing the compiled contract .ts when no .defs.ts is on disk', () => {
  const types = parseContractTypesFromCompiledTs(CONTRACT_TS_SOURCE);
  assert.deepEqual(types.cmdApproveChangeOrderDecision.input, { changeOrderChangeOrderId: 'string', status: 'string' });
  assert.deepEqual(types.cmdApproveChangeOrderDecision.output, { changeOrderId: 'string' });
});
