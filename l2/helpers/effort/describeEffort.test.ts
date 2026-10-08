/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { describeEffort, describeEffortFrom } from '/_102020_/l2/helpers/effort/describeEffort.js';
import { renderD2SharedV2 } from '/_102020_/l2/helpers/sharedV2/format.js';
import type { EffortInput, L4DiffItem } from '/_102035_/l2/solution/poolPlan.js';

const FIXTURE = new URL('./fixtures/agendaClinica/contracts/', import.meta.url);
const GOLDEN = new URL('../../../../mls-102035/l2/solution/fixtures/changeEffort/agendaClinica-regra-anotacao/changeEffort.json', import.meta.url);

function contracts(): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(FIXTURE)) {
    if (!name.endsWith('.defs.txt')) continue;
    out[name.slice(0, -'.defs.txt'.length)] = readFileSync(new URL(name, FIXTURE), 'utf8');
  }
  return out;
}

function input(item: Pick<L4DiffItem, 'changeId' | 'kind' | 'op' | 'entity' | 'before' | 'after'>): EffortInput {
  return {
    module: 'agendaClinica',
    base: { baseId: 'mls-102047', revisionId: 'cc1b2e6' },
    item: { ...item, source: 'l4/agendaClinica/rules.defs.ts' },
  };
}

const LOCATION = { project: 102047, module: 'agendaClinica' };
const MODULE_DEFS = `export const agendaClinicaModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "agendaClinica",
  "userLanguage": "es",
  "productLanguages": [
    "pt-BR",
    "en"
  ],
  "defaultLanguage": "en"
} as const satisfies Ns5Readonly<Ns5ModuleArtifact>;
`;
const CONFIG = JSON.stringify({
  projects: {
    '102047': {
      modules: [
        { moduleId: 'outro', userLanguage: 'de' },
        { moduleId: 'agendaClinica', userLanguage: 'fr' },
      ],
    },
  },
});

function shared(pageId: string, fields: Record<string, string[]>): string {
  return renderD2SharedV2({ ...LOCATION, pageId }, {
    entry: { params: {} },
    forms: {},
    requests: {},
    states: {},
    functions: {},
    journeys: [],
    rules: {},
    access: { actors: [], grants: [] },
    fields,
  });
}

function sharedWithoutFields(pageId: string): string {
  return shared(pageId, { 'Paciente.name': ['nome'] }).replace(/,\n  "fields": \{[\s\S]*?\n  \}/u, '');
}

const NAME = 'field:details.identification.name';
const TEXT_BEFORE = { title: 'Name', type: 'string' };
const TEXT_AFTER = { title: 'Full name', type: 'string' };

function textSources(pages: Record<string, string>, moduleSource: string | undefined = MODULE_DEFS, configSource: string | undefined = CONFIG) {
  return { shared: pages, moduleSource, configSource };
}

void test('rule changed cites only the pages whose routes list the id', () => {
  const pages = contracts();
  const note = describeEffortFrom(input({
    changeId: 'rule:anotacaoObrigatoriaNoAtendimento', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(note.status, 'computed');
  assert.deepEqual(note.materialize, [{
    kind: 'page', id: 'agenda_diaria', path: 'l2/agendaClinica/web/contracts/agenda_diaria.defs.ts',
  }]);
  assert.deepEqual(note.regenerateDefs, []);
  assert.deepEqual(note.runAgents, []);
  const golden = JSON.parse(readFileSync(GOLDEN, 'utf8')) as {
    perItem: Array<{ answers: Array<{ master: { kind: string }; materialize: Array<{ kind: string; id: string }> }> }>;
  };
  const l2 = golden.perItem[0].answers.find(row => row.master.kind === 'l2');
  assert.deepEqual(note.materialize.map(unit => ({ kind: unit.kind, id: unit.id })), l2?.materialize.map(unit => ({ kind: unit.kind, id: unit.id })));

  const conflict = describeEffortFrom(input({
    changeId: 'rule:consultaSemConflito', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(conflict.status, 'computed');
  assert.deepEqual(conflict.materialize.map(unit => unit.id), ['consultas']);
});

void test('a rule no route cites, other kinds, and a module without contracts abend', () => {
  const pages = contracts();
  const missing = describeEffortFrom(input({
    changeId: 'rule:naoExiste', kind: 'rule', op: 'changed', entity: '',
  }), pages);
  assert.equal(missing.status, 'abend');
  assert.equal(missing.abend?.reason, 'no route of any contract cites rule naoExiste');

  for (const item of [
    { changeId: 'field:anotacao', kind: 'field' as const, op: 'changed' as const, entity: 'Consulta' },
    { changeId: 'grant:verAgenda', kind: 'grant' as const, op: 'changed' as const, entity: '' },
    { changeId: 'task:avisar', kind: 'task' as const, op: 'added' as const, entity: '' },
  ]) {
    const row = describeEffortFrom(input(item), pages);
    assert.equal(row.status, 'abend', item.changeId);
    assert.equal(row.abend?.reason, `v1 computes only rule changed; ${item.kind} ${item.op} is not handled`);
    assert.deepEqual(row.materialize, []);
  }

  const empty = describeEffortFrom(input({
    changeId: 'rule:anotacaoObrigatoriaNoAtendimento', kind: 'rule', op: 'changed', entity: '',
  }), {});
  assert.equal(empty.status, 'abend');
  assert.equal(empty.abend?.reason, 'no generated L2 contracts for module agendaClinica');
});

void test('describeEffort abends without reading files when the project is unresolved', async () => {
  const previous = mls.actualProject;
  mls.actualProject = 0;
  try {
    const row = await describeEffort({
      module: 'agendaClinica',
      base: { baseId: 'not-a-project', revisionId: 'x' },
      item: { changeId: 'rule:x', kind: 'rule', op: 'changed', entity: '', source: 'l4/x' },
    });
    assert.equal(row.status, 'abend');
    assert.equal(row.abend?.reason, 'cannot resolve the project of base not-a-project');
    assert.deepEqual(row.materialize, []);
  } finally {
    mls.actualProject = previous;
  }
});

void test('text-only field change materializes the pages that show the field and then agentAddLanguage', () => {
  const pages = {
    ficha: shared('ficha', { 'Paciente.details.identification': ['nome'] }),
    detalhe: shared('detalhe', { 'Paciente.details.identification.name': ['nome'] }),
    outras: shared('outras', { 'Paciente.details.address': ['rua'] }),
  };
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(pages));
  assert.equal(row.status, 'computed');
  assert.deepEqual(row.regenerateDefs, []);
  assert.deepEqual(row.materialize, [
    { kind: 'page', id: 'detalhe', path: 'l2/agendaClinica/web/contracts/detalhe.defs.ts' },
    { kind: 'page', id: 'ficha', path: 'l2/agendaClinica/web/contracts/ficha.defs.ts' },
  ]);
  assert.deepEqual(row.runAgents, [{
    agent: 'agentAddLanguage',
    command: '@@agentAddLanguage ' + JSON.stringify([{
      languages: [{ code: 'en', name: 'en' }, { code: 'pt-BR', name: 'pt-BR' }, { code: 'fr', name: 'fr' }],
      projectId: 102047,
      moduleName: 'agendaClinica',
    }]),
  }]);
});

void test('a field whose type changed is not text and keeps the rule-only abend', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente',
    before: { title: 'Name', type: 'string' }, after: { title: 'Name', type: 'number' },
  }), contracts(), textSources({ ficha: shared('ficha', { 'Paciente.details.identification.name': ['nome'] }) }));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'v1 computes only rule changed; field changed is not handled');
  assert.deepEqual(row.materialize, []);
  assert.deepEqual(row.runAgents, []);
});

void test('a text field no page shows is computed with empty lists', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources({ outras: shared('outras', { 'Consulta.notes': ['nota'] }) }));
  assert.equal(row.status, 'computed');
  assert.deepEqual(row.regenerateDefs, []);
  assert.deepEqual(row.materialize, []);
  assert.deepEqual(row.runAgents, []);
  assert.equal(row.abend, undefined);
});

void test('a shared without a field index abends', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources({ ficha: sharedWithoutFields('ficha') }));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'shared has no field index; regenerate the L2 defs');
});

void test('a shared the parser rejects abends with the file name and the parser error', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources({ ficha: 'export const definition = {} as const;\n' }));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'ficha.defs.ts: D2_SHARED_V2_SOURCE_SHAPE');
});

void test('a module with no language in module.defs or l5 config abends', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(
    { ficha: shared('ficha', { 'Paciente.details.identification.name': ['nome'] }) },
    'export const module = { "title": "Agenda", "userLanguage": "es" };\n',
    JSON.stringify({ projects: { '102047': { modules: [{ moduleId: 'agendaClinica' }] } } }),
  ));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'module has no declared languages');
});

void test('describeEffort reads shared, module.defs and l5 config for a text change', async () => {
  const previous = mls.stor.files;
  const body = shared('ficha', { 'Paciente.details.identification': ['nome'] });
  mls.stor.files = {
    a: { project: 102047, level: 2, status: 'active', folder: 'agendaClinica/web/shared', extension: '.defs.ts', shortName: 'ficha', getContent: async () => body },
    b: { project: 102047, level: 4, status: 'active', folder: 'agendaClinica', extension: '.defs.ts', shortName: 'module', getContent: async () => MODULE_DEFS },
    c: { project: 102047, level: 5, status: 'active', folder: '', extension: '.json', shortName: 'config', getContent: async () => CONFIG },
    d: { project: 102047, level: 2, status: 'active', folder: 'agendaClinica/web/contracts', extension: '.defs.ts', shortName: 'ficha', getContent: async () => 'contract' },
  } as unknown as typeof mls.stor.files;
  try {
    const row = await describeEffort(input({
      changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
    }));
    assert.equal(row.status, 'computed');
    assert.deepEqual(row.materialize.map(unit => unit.id), ['ficha']);
    assert.equal(row.runAgents[0]?.agent, 'agentAddLanguage');
    assert.equal(row.runAgents[0]?.command.includes('"fr"'), true);
    assert.equal(row.runAgents[0]?.command.includes('"es"'), false);
    assert.equal(row.runAgents[0]?.command.includes('force'), false);
  } finally {
    mls.stor.files = previous;
  }
});

void test('describeEffort imports only helpers and the solution types, and does not write or fetch', () => {
  const text = readFileSync(new URL('./describeEffort.ts', import.meta.url), 'utf8');
  const allowed = ['/_102020_/l2/helpers/', '/_102035_/l2/solution/'];
  const specs = [
    ...text.matchAll(/\bfrom\s+['"]([^'"]+)['"]/g),
    ...text.matchAll(/^\s*import\s+['"]([^'"]+)['"]/gm),
    ...text.matchAll(/\bimport\s*\(\s*['"]([^'"]+)['"]/g),
  ].map(match => match[1]);
  assert.ok(specs.length > 0);
  for (const spec of specs) assert.ok(allowed.some(prefix => spec.startsWith(prefix)), spec);
  for (const name of ['writeFile', 'writeJson', 'writeText', 'saveFile', 'fetch']) {
    assert.equal(new RegExp(`\\b${name}\\b`).test(text), false, name);
  }
});
