/// <mls fileReference="_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cm2SharedFileFromTarget,
  parseContractTypesFromCompiledTs,
  parseContractTypesFromDefsSource,
  parseSharedDefinition,
} from '/_102020_/l2/aura/molecules/agentChooseMolecules2/helpers/cm2Shared.js';

void test('derives the workspace shared defs from a device/layout page path', () => {
  const shared = cm2SharedFileFromTarget({ project: 102047, level: 2, folder: 'controleChamados/web/desktop/page21', shortName: 'ticketCatalogue', extension: '.defs.ts' });
  assert.deepEqual(shared, { project: 102047, level: 2, folder: 'controleChamados/web/shared', shortName: 'ticketCatalogue', extension: '.defs.ts' });
});

void test('the rule is generic across genomes — page11 and page31 resolve to the same shared', () => {
  const of = (folder: string) => cm2SharedFileFromTarget({ project: 102047, level: 2, folder, shortName: 'ticketHub', extension: '.defs.ts' })?.folder;
  assert.equal(of('controleChamados/web/desktop/page11'), 'controleChamados/web/shared');
  assert.equal(of('controleChamados/web/desktop/page31'), 'controleChamados/web/shared');
  assert.equal(of('controleChamados/web/mobile/pageX9'), 'controleChamados/web/shared');
});

void test('returns null when there is no "web" segment to anchor on, and when the target IS the shared', () => {
  assert.equal(cm2SharedFileFromTarget({ project: 102047, level: 2, folder: 'controleChamados/l4stuff', shortName: 'x', extension: '.defs.ts' }), null);
  assert.equal(cm2SharedFileFromTarget({ project: 102047, level: 2, folder: 'controleChamados/web/shared', shortName: 'x', extension: '.defs.ts' }), null);
});

// A trimmed but real shape of _102047_/l2/controleChamados/web/shared/ticketCatalogue.defs.ts.
const SHARED_SOURCE = `/// <mls fileReference="_102047_/l2/controleChamados/web/shared/ticketCatalogue.defs.ts" enhancement="_blank"/>

/**
 * uiScenary contract (page skeleton reads \`scenaries[].value\`):
 *   preconditions = required route/selection inputs.
 */
export const definition = {
  "pageId": "ticketCatalogue",
  "contractRef": {
    "tsPath": "_102047_/l2/controleChamados/web/contracts/ticketCatalogue.ts"
  },
  "destructiveCommandIds": [
    "cmdDeleteTicket"
  ],
  "dataBindings": [
    {
      "id": "binding.ticketCatalogue.qryListTicket",
      "command": "qryListTicket",
      "description": "Listar Chamado",
      "kind": "query",
      "inputs": []
    },
    {
      "id": "binding.ticketCatalogue.cmdDeleteTicket",
      "command": "cmdDeleteTicket",
      "description": "Excluir Chamado",
      "kind": "command",
      "inputs": [
        { "name": "ticketId", "source": "selectedEntity", "required": true, "presentation": "selection" }
      ]
    }
  ],
  "i18n": {
    "intent.qryListTicket.list.column.title.label": "Título",
    "intent.qryListTicket.list.column.status.label": "Situação"
  }
};

export const pipeline = [
  { "id": "ticketCatalogue__l2_shared", "type": "l2_shared" }
] as const;
`;

void test('reads exactly the four facts this agent takes from the shared', () => {
  const shared = parseSharedDefinition(SHARED_SOURCE);
  assert.ok(shared);
  assert.equal(shared!.dataBindings.length, 2);
  assert.equal(shared!.contractTsPath, '_102047_/l2/controleChamados/web/contracts/ticketCatalogue.ts');
  assert.deepEqual(shared!.destructiveCommandIds, ['cmdDeleteTicket']);
  assert.equal(shared!.i18n['intent.qryListTicket.list.column.title.label'], 'Título');
});

void test('a JSDoc block before the definition does not confuse the cut', () => {
  const shared = parseSharedDefinition(SHARED_SOURCE);
  assert.equal((shared!.dataBindings[0] as any).id, 'binding.ticketCatalogue.qryListTicket');
});

void test('a shared missing any of the four facts yields empty values, never a throw', () => {
  const bare = parseSharedDefinition('export const definition = {\n  "pageId": "x"\n};\n\nexport const pipeline = [] as const;\n');
  assert.deepEqual(bare, { dataBindings: [], i18n: {}, destructiveCommandIds: [], contractTsPath: '' });
});

void test('an unparseable or non-object shared is refused, never guessed', () => {
  assert.equal(parseSharedDefinition(''), null);
  assert.equal(parseSharedDefinition('export const definition = `prose`;\n\nexport const pipeline = [] as const;\n'), null);
  assert.equal(parseSharedDefinition('export const definition = { not json };\n\nexport const pipeline = [] as const;\n'), null);
});

const CONTRACT_DEFS_SOURCE = `export const definition = [
  {
    "commandName": "qryListTicket",
    "input": [],
    "output": [
      { "name": "ticketId", "type": "string" },
      { "name": "status", "type": "'open' | 'closed'" }
    ]
  }
];

export const pipeline = [] as const;
`;

void test('parses field types from a contract .defs.ts (definition is an ARRAY here, not an object)', () => {
  const types = parseContractTypesFromDefsSource(CONTRACT_DEFS_SOURCE);
  assert.deepEqual(types, { qryListTicket: { input: {}, output: { ticketId: 'string', status: "'open' | 'closed'" } } });
});

const CONTRACT_TS_SOURCE = `export interface CmdCreateTicketInput {
  title: string;
  description: string;
  status: string;
}
export interface CmdCreateTicketOutput {
  ticketId: string;
}
`;

void test('falls back to regex-parsing the compiled contract .ts — the only one on disk in a real client project', () => {
  const types = parseContractTypesFromCompiledTs(CONTRACT_TS_SOURCE);
  assert.deepEqual(types.cmdCreateTicket.input, { title: 'string', description: 'string', status: 'string' });
  assert.deepEqual(types.cmdCreateTicket.output, { ticketId: 'string' });
});
