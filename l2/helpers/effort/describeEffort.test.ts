/// <mls fileReference="_102020_/l2/helpers/effort/describeEffort.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import test from 'node:test';
import { describeEffort, describeEffortFrom, effortPrompt, effortPromptFrom, finishEffortFrom } from '/_102020_/l2/helpers/effort/describeEffort.js';
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

function needs(pages: Array<{ pageId: string; entities: string[] }>): string {
  return JSON.stringify({
    pages: pages.map(page => ({
      pageId: page.pageId,
      reads: page.entities.map(entity => ({ entity })),
    })),
  });
}

const NAME = 'field:name';
const TEXT_BEFORE = { title: 'Name', type: 'string' };
const TEXT_AFTER = { title: 'Full name', type: 'string' };

function textSources(needsSource: string | undefined, moduleSource: string | undefined = MODULE_DEFS, configSource: string | undefined = CONFIG) {
  return { needsSource, moduleSource, configSource };
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
  assert.deepEqual(note.create, []);
  assert.deepEqual(note.remove, []);
  assert.equal(note.contract, 'keep');
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

void test('text-only field change materializes the pages that read the entity and then agentAddLanguage', () => {
  const plan = needs([
    { pageId: 'ficha', entities: ['Paciente'] },
    { pageId: 'outras', entities: ['Consulta'] },
  ]);
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(plan));
  assert.equal(row.status, 'computed');
  assert.deepEqual(row.regenerateDefs, []);
  assert.deepEqual(row.create, []);
  assert.deepEqual(row.remove, []);
  assert.equal(row.contract, 'keep');
  assert.deepEqual(row.materialize, [
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
  }), contracts(), textSources(needs([{ pageId: 'ficha', entities: ['Paciente'] }])));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'v1 computes only rule changed; field changed is not handled');
  assert.deepEqual(row.materialize, []);
  assert.deepEqual(row.runAgents, []);
});

void test('a text field no page shows is computed with empty lists', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(needs([{ pageId: 'outras', entities: ['Consulta'] }])));
  assert.equal(row.status, 'computed');
  assert.deepEqual(row.regenerateDefs, []);
  assert.deepEqual(row.materialize, []);
  assert.deepEqual(row.runAgents, []);
  assert.equal(row.abend, undefined);
});

void test('a module without needs abends with the missing path', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(undefined));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'l4/agendaClinica/pool/l1/web/needs.json');
});

void test('a needs file the parser rejects abends with the path and the parser error', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources('{'));
  assert.equal(row.status, 'abend');
  assert.match(row.abend?.reason ?? '', /^l4\/agendaClinica\/pool\/l1\/web\/needs\.json: /u);
});

void test('a module with no language in module.defs or l5 config abends', () => {
  const row = describeEffortFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), {}, textSources(
    needs([{ pageId: 'ficha', entities: ['Paciente'] }]),
    'export const module = { "title": "Agenda", "userLanguage": "es" };\n',
    JSON.stringify({ projects: { '102047': { modules: [{ moduleId: 'agendaClinica' }] } } }),
  ));
  assert.equal(row.status, 'abend');
  assert.equal(row.abend?.reason, 'module has no declared languages');
});

void test('describeEffort reads needs, module.defs and l5 config for a text change', async () => {
  const previous = mls.stor.files;
  const body = needs([{ pageId: 'ficha', entities: ['Paciente'] }, { pageId: 'outras', entities: ['Consulta'] }]);
  mls.stor.files = {
    a: { project: 102047, level: 4, status: 'active', folder: 'agendaClinica/pool/l1/web', extension: '.json', shortName: 'needs', getContent: async () => body },
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

const TAREFAS_CONTRACTS = new URL('./fixtures/tarefas/contracts/', import.meta.url);
const TAREFAS_SHARED = new URL('./fixtures/tarefas/shared/', import.meta.url);

function defsIn(dir: URL): Record<string, string> {
  const out: Record<string, string> = {};
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.defs.txt')) continue;
    out[name.slice(0, -'.defs.txt'.length)] = readFileSync(new URL(name, dir), 'utf8');
  }
  return out;
}

function removed(changeId: string): EffortInput {
  return {
    module: 'tarefas',
    base: { baseId: 'mls-102047', revisionId: '537525a4' },
    item: { changeId, kind: 'rule', op: 'removed', entity: '', source: 'l4/tarefas/rules.defs.ts' },
  };
}

function contractUnit(pageId: string): { kind: 'contract'; id: string; path: string } {
  return { kind: 'contract', id: pageId, path: `l2/tarefas/web/contracts/${pageId}.defs.ts` };
}

function sharedUnit(pageId: string): { kind: 'shared'; id: string; path: string } {
  return { kind: 'shared', id: pageId, path: `l2/tarefas/web/shared/${pageId}.defs.ts` };
}

function pageUnit(pageId: string): { kind: 'page'; id: string; path: string } {
  return { kind: 'page', id: pageId, path: `l2/tarefas/web/contracts/${pageId}.defs.ts` };
}

void test('a removed rule drops its id from citing contracts and shared lists and rematerializes those pages', () => {
  const pages = defsIn(TAREFAS_CONTRACTS);
  const shared = defsIn(TAREFAS_SHARED);
  const sources = { shared };

  const both = describeEffortFrom(removed('rule:devolucaoExigeMotivo'), pages, sources);
  assert.equal(both.status, 'computed');
  assert.equal(both.contract, 'keep');
  assert.deepEqual(both.create, []);
  assert.deepEqual(both.remove, []);
  assert.deepEqual(both.regenerateDefs, [
    contractUnit('inicio'),
    sharedUnit('inicio'),
    contractUnit('minhas_tarefas'),
    sharedUnit('minhas_tarefas'),
  ]);
  assert.deepEqual(both.materialize, [pageUnit('inicio'), pageUnit('minhas_tarefas')]);

  const inicio = describeEffortFrom(removed('rule:resumoDiarioOitoHoras'), pages, sources);
  assert.equal(inicio.status, 'computed');
  assert.equal(inicio.contract, 'keep');
  assert.deepEqual(inicio.regenerateDefs, [contractUnit('inicio'), sharedUnit('inicio')]);
  assert.deepEqual(inicio.materialize, [pageUnit('inicio')]);
  assert.deepEqual(inicio.create, []);
  assert.deepEqual(inicio.remove, []);

  const none = describeEffortFrom(removed('rule:naoExiste'), pages, sources);
  assert.equal(none.status, 'computed');
  assert.equal(none.contract, 'keep');
  assert.deepEqual(none.regenerateDefs, []);
  assert.deepEqual(none.materialize, []);
  assert.equal(none.abend, undefined);
});

void test('describeEffort reads shared defs for a removed rule', async () => {
  const previous = mls.stor.files;
  const contract = readFileSync(new URL('inicio.defs.txt', TAREFAS_CONTRACTS), 'utf8');
  const shared = readFileSync(new URL('inicio.defs.txt', TAREFAS_SHARED), 'utf8');
  mls.stor.files = {
    contract: {
      project: 102047, level: 2, status: 'active', folder: 'tarefas/web/contracts', extension: '.defs.ts', shortName: 'inicio',
      getContent: async () => contract,
    },
    shared: {
      project: 102047, level: 2, status: 'active', folder: 'tarefas/web/shared', extension: '.defs.ts', shortName: 'inicio',
      getContent: async () => shared,
    },
    otherProject: {
      project: 1, level: 2, status: 'active', folder: 'tarefas/web/shared', extension: '.defs.ts', shortName: 'minhas_tarefas',
      getContent: async () => shared,
    },
  } as unknown as typeof mls.stor.files;
  try {
    const row = await describeEffort(removed('rule:resumoDiarioOitoHoras'));
    assert.equal(row.status, 'computed');
    assert.deepEqual(row.regenerateDefs, [contractUnit('inicio'), sharedUnit('inicio')]);
    assert.deepEqual(row.materialize, [pageUnit('inicio')]);
  } finally {
    mls.stor.files = previous;
  }
});

const R1_PHRASE = 'Uma tarefa criada sem prioridade assume a prioridade média.';
const R4_PHRASE = 'O gestor pode exportar as tarefas filtradas em CSV.';
const MODEL = new URL('./fixtures/tarefas/model/', import.meta.url);

function added(changeId: string, description: string): EffortInput {
  return {
    module: 'tarefas',
    base: { baseId: 'mls-102047', revisionId: '537525a4' },
    item: {
      changeId, kind: 'rule', op: 'added', entity: '', source: 'l4/tarefas/rules.defs.ts',
      after: { ruleId: changeId.slice('rule:'.length), description },
    },
  };
}

function recorded(name: string): unknown {
  return JSON.parse(readFileSync(new URL(name, MODEL), 'utf8'));
}

void test('a new rule asks the model to choose among the contract pages; other items do not', () => {
  const pages = defsIn(TAREFAS_CONTRACTS);
  const pageIds = Object.keys(pages).sort();
  const request = effortPromptFrom(added('rule:novaTarefaPrioridadeMedia', R1_PHRASE), pages);
  assert.ok(request);
  assert.equal(request.prompt.includes('rule:novaTarefaPrioridadeMedia') || request.prompt.includes('novaTarefaPrioridadeMedia'), true);
  assert.equal(request.prompt.includes(R1_PHRASE), true);
  assert.equal(request.prompt.includes('materialize'), true);
  assert.equal(request.prompt.includes('newAction'), true);
  const schema = request.schema as { properties: { pages: { items: { properties: { page: { enum: string[] } } } } } };
  assert.deepEqual(schema.properties.pages.items.properties.page.enum, pageIds);
  for (const pageId of pageIds) assert.equal(request.prompt.includes(pageId), true, pageId);

  assert.equal(effortPromptFrom(input({
    changeId: 'rule:anotacaoObrigatoriaNoAtendimento', kind: 'rule', op: 'changed', entity: '',
  }), pages), null);
  assert.equal(effortPromptFrom(removed('rule:devolucaoExigeMotivo'), pages), null);
  assert.equal(effortPromptFrom(input({
    changeId: NAME, kind: 'field', op: 'changed', entity: 'Paciente', before: TEXT_BEFORE, after: TEXT_AFTER,
  }), pages), null);
});

void test('a recorded new-rule reply materializes, or rebuilds the page when the contract must change', () => {
  const pages = defsIn(TAREFAS_CONTRACTS);
  const r1 = finishEffortFrom(added('rule:novaTarefaPrioridadeMedia', R1_PHRASE), pages, recorded('r1.json'));
  assert.equal(r1.status, 'computed');
  assert.equal(r1.contract, 'keep');
  assert.deepEqual(r1.materialize, [pageUnit('minhas_tarefas')]);
  assert.deepEqual(r1.regenerateDefs, []);
  assert.deepEqual(r1.create, []);
  assert.deepEqual(r1.remove, []);

  const r4 = finishEffortFrom(added('rule:gestorExportaCsv', R4_PHRASE), pages, recorded('r4.json'));
  assert.equal(r4.status, 'computed');
  assert.equal(r4.contract, 'change');
  assert.deepEqual(r4.materialize, [pageUnit('tarefas_equipe')]);
  assert.deepEqual(r4.regenerateDefs, [pageUnit('tarefas_equipe')]);
  assert.deepEqual(r4.create, []);
});

void test('a new-rule reply abends when the page is unknown, already exists, or the shape is wrong', () => {
  const pages = defsIn(TAREFAS_CONTRACTS);
  const item = added('rule:novaTarefaPrioridadeMedia', R1_PHRASE);
  const missing = finishEffortFrom(item, pages, {
    pages: [{ page: 'nao_existe', change: 'materialize' }], create: [], reason: 'missing',
  });
  assert.equal(missing.status, 'abend');
  assert.equal(missing.abend?.reason, 'page nao_existe does not exist');
  assert.deepEqual(missing.materialize, []);

  const exists = finishEffortFrom(item, pages, {
    pages: [], create: [{ page: 'inicio' }], reason: 'dup',
  });
  assert.equal(exists.status, 'abend');
  assert.equal(exists.abend?.reason, 'page inicio already exists');

  const shape = finishEffortFrom(item, pages, { pages: [], create: [], note: 'extra' });
  assert.equal(shape.status, 'abend');
  assert.equal(shape.abend?.reason.includes('outside the schema'), true);
  assert.equal(shape.materialize.length, 0);
  assert.equal(shape.status === 'computed', false);
});

void test('effortPrompt reads the module contracts only for a new rule', async () => {
  const previous = mls.stor.files;
  const contract = readFileSync(new URL('inicio.defs.txt', TAREFAS_CONTRACTS), 'utf8');
  mls.stor.files = {
    contract: {
      project: 102047, level: 2, status: 'active', folder: 'tarefas/web/contracts', extension: '.defs.ts', shortName: 'inicio',
      getContent: async () => contract,
    },
  } as unknown as typeof mls.stor.files;
  try {
    const request = await effortPrompt(added('rule:novaTarefaPrioridadeMedia', R1_PHRASE));
    assert.ok(request);
    const schema = request.schema as { properties: { pages: { items: { properties: { page: { enum: string[] } } } } } };
    assert.deepEqual(schema.properties.pages.items.properties.page.enum, ['inicio']);
    assert.equal(await effortPrompt(removed('rule:devolucaoExigeMotivo')), null);
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
