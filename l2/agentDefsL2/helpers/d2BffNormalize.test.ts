/// <mls fileReference="_102020_/l2/agentDefsL2/helpers/d2BffNormalize.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { buildD2BffDesign, d2OntologyLeafType, normalizeD2BffDesign, type D2BffDesign, type D2BffEndpoint, type D2BffLeaf, type D2BffType } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';

const entities = {
  Tarefa: { record: { fields: { prazo: { type: 'string' }, titulo: { type: 'string' }, id: { type: 'string' } } } },
} as unknown as Record<string, Ns5OntologyAnyEntity>;

const bindings: D2BffDesign['bindings'] = { organisms: [], commands: [], selections: [], journeys: [], updates: [] };

const leaf = (name: string, path: string, type = 'number'): D2BffLeaf => ({ name, type, origin: { kind: 'field', paths: [path] } });

const endpoint = (kind: D2BffEndpoint['kind'], input: D2BffLeaf[], jsdocInput: string): D2BffEndpoint => ({
  id: 'listar', kind, when: 'interaction', input, output: [], rules: [],
  jsdoc: { purpose: 'tarefaId stays here', input: jsdocInput, processing: '', output: '' },
});

const design = (row: D2BffEndpoint): D2BffDesign => ({ types: [], endpoints: [row], bindings });

void test('a query keeps two roles of one field; a command still folds them; jsdoc follows a renamed input', () => {
  const query = normalizeD2BffDesign(design(endpoint('qry', [leaf('prazoDe', 'Tarefa.prazo'), leaf('prazoAte', 'Tarefa.prazo')], 'prazoDe/prazoAte')), entities);
  assert.deepEqual(query.endpoints[0].input.map(item => `${item.name}:${item.type}`), ['prazoDe:string', 'prazoAte:string']);

  const command = normalizeD2BffDesign(design(endpoint('cmd', [leaf('tituloDe', 'Tarefa.titulo'), leaf('tituloAte', 'Tarefa.titulo')], '')), entities);
  assert.deepEqual(command.endpoints[0].input.map(item => item.name), ['titulo']);

  const renamed = normalizeD2BffDesign(design(endpoint('qry', [leaf('tarefaId', 'Tarefa.id')], 'tarefaId: the task; tarefaIdExtra stays')), entities);
  assert.equal(renamed.endpoints[0].input[0].name, 'id');
  assert.equal(renamed.endpoints[0].jsdoc.input, 'id: the task; tarefaIdExtra stays');
  assert.equal(renamed.endpoints[0].jsdoc.purpose, 'tarefaId stays here');
});

const ref = (name: string, type: string): D2BffLeaf => ({ name, type });
const type = (name: string, fields: D2BffLeaf[]): D2BffType => ({ name, description: '', fields });
const qry = (output: D2BffLeaf[]): D2BffEndpoint => ({
  id: 'load', kind: 'qry', when: 'onLoad', input: [], output, rules: [],
  jsdoc: { purpose: 'open', input: 'none', processing: 'all', output: 'row' },
});

void test('a mounted type drops the mount prefix; an unmounted type and two prefixes stay; the contract has one details', () => {
  const nested = normalizeD2BffDesign({
    types: [
      type('A', [leaf('id', 'A.id', 'string'), ref('details', 'ADetails')]),
      type('ADetails', [leaf('totalEscrito', 'A.details.total')]),
      type('Solto', [leaf('totalEscrito', 'A.details.total')]),
      type('Esquerda', [ref('details', 'NosDois')]),
      type('Direita', [ref('extra', 'NosDois')]),
      type('NosDois', [leaf('totalEscrito', 'A.details.total')]),
      type('MembroRef', [ref('details', 'MembroRefDetails')]),
      type('MembroRefDetails', [ref('identification', 'MembroRefIdentification')]),
      type('MembroRefIdentification', [leaf('nomeEscrito', 'Membro.details.identification.name', 'string')]),
    ],
    endpoints: [qry([{ name: 'row', type: 'A' }])],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('ADetails'), ['total']);
  assert.deepEqual(names('Solto'), ['details.total']);
  assert.deepEqual(names('NosDois'), ['details.total']);
  assert.deepEqual(names('MembroRefIdentification'), ['name']);
  assert.deepEqual(nested.endpoints[0].output.map(item => item.name), ['row']);

  const source = renderD2ContractV2(
    { project: 1, module: 'alpha', pageId: 'rows' },
    buildD2ContractFromBff({
      module: 'alpha', pageId: 'rows', design: nested,
      access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
      entities, userLanguage: 'en',
    }),
  );
  assert.match(source, /interface A \{[^}]*details: ADetails;/su);
  assert.match(source, /interface ADetails \{[^}]*total: number;/su);
  assert.doesNotMatch(source, /interface ADetails \{[^}]*details:/su);
});

// Excerpts of tarefas bff55 responses inicio_membro-1.json and inicio_gestor-1.json (102047 9587aaa).
const from = (name: string, type: string, path: string): D2BffLeaf => ({ name, type, origin: { kind: 'field', paths: [path] } });

void test('a named type mounted through a field origin drops that origin path, not a nested details', () => {
  const nested = normalizeD2BffDesign({
    types: [
      type('TarefaResumoDetalhes', [
        from('aberta', 'boolean', 'Tarefa.details.aberta'),
        from('venceHoje', 'boolean', 'Tarefa.details.venceHoje'),
        from('atrasada', 'boolean', 'Tarefa.details.atrasada'),
        from('progressoChecklist', 'string', 'Tarefa.details.progressoChecklist'),
      ]),
      type('TarefaResumo', [
        from('id', 'string', 'Tarefa.id'),
        from('details', 'TarefaResumoDetalhes', 'Tarefa.details'),
      ]),
      type('ListaResumoDetalhes', [from('quantidadeTarefasAbertas', 'number', 'Lista.details.quantidadeTarefasAbertas')]),
      type('ListaResumo', [from('details', 'ListaResumoDetalhes', 'Lista.details')]),
      type('MembroNomeIdentificacao', [from('name', 'string', 'MembroEquipe.details.identification.name')]),
      type('MembroNomeDetalhes', [from('identification', 'MembroNomeIdentificacao', 'MembroEquipe.details.identification')]),
      type('MembroNome', [from('details', 'MembroNomeDetalhes', 'MembroEquipe.details')]),
    ],
    endpoints: [qry([{ name: 'row', type: 'TarefaResumo' }])],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('TarefaResumoDetalhes'), ['aberta', 'venceHoje', 'atrasada', 'progressoChecklist']);
  assert.deepEqual(names('ListaResumoDetalhes'), ['quantidadeTarefasAbertas']);
  assert.deepEqual(names('MembroNomeIdentificacao'), ['name']);
  assert.deepEqual(names('MembroNomeDetalhes'), ['identification']);
  assert.deepEqual(names('MembroNome'), ['details']);
});

void test('d2_106: the mount prefix comes from the chain of field names, with or without an origin on the mounting field', () => {
  // Shape of the tarefas answer of 17/10 (bff55/responses/inicio_membro-1.json): mounts without origin, and the summary
  // mounted in a list field whose origin is Tarefa.id.
  const mount = (name: string, typeName: string): D2BffLeaf => ({ name, type: typeName, origin: null as unknown as D2BffLeaf['origin'] });
  const nested = normalizeD2BffDesign({
    types: [
      type('TarefaResumoDetalhes', [from('aberta', 'boolean', 'Tarefa.details.aberta'), from('atrasada', 'boolean', 'Tarefa.details.atrasada')]),
      type('TarefaResumo', [from('id', 'string', 'Tarefa.id'), mount('details', 'TarefaResumoDetalhes')]),
      type('ResumoMinhasTarefas', [from('tarefas', 'TarefaResumo[]', 'Tarefa.id')]),
      type('MembroIdentificacao', [from('name', 'string', 'MembroEquipe.details.identification.name')]),
      type('MembroDetalhes', [mount('identification', 'MembroIdentificacao')]),
      type('MembroRef', [mount('details', 'MembroDetalhes')]),
      type('TarefaPendencia', [from('id', 'string', 'Tarefa.id'), from('responsavel', 'MembroRef', 'MembroEquipe.details.identification.name'), from('criador', 'MembroRef', 'MembroEquipe.details.identification.name')]),
    ],
    endpoints: [qry([{ name: 'resumo', type: 'ResumoMinhasTarefas' }, { name: 'pendencia', type: 'TarefaPendencia' }])],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('TarefaResumoDetalhes'), ['aberta', 'atrasada']);
  assert.deepEqual(names('MembroIdentificacao'), ['name']);
  assert.deepEqual(names('MembroDetalhes'), ['identification']);
});

void test('d2_110: a named type mounted on an endpoint leaf drops the mount prefix; a join leaf does not vote', () => {
  const nested = normalizeD2BffDesign({
    types: [
      type('TarefaDescricaoDetails', [from('descricao', 'string', 'Tarefa.details.descricao')]),
      type('AvisoTarefa', [
        from('id', 'string', 'Aviso.details.id'),
        from('prazo', 'string', 'Aviso.details.prazo'),
        from('titulo', 'string', 'Tarefa.titulo'),
      ]),
      type('AvisoDetalhes', [{ name: 'details', type: 'AvisoTarefa' }]),
    ],
    endpoints: [{
      ...qry([{ name: 'row', type: 'AvisoDetalhes' }]),
      input: [{ name: 'details', type: 'TarefaDescricaoDetails' }],
    }],
    bindings,
  }, entities);
  const names = (typeName: string): string[] => nested.types.find(item => item.name === typeName)!.fields.map(item => item.name);
  assert.deepEqual(names('TarefaDescricaoDetails'), ['descricao']);
  assert.deepEqual(names('AvisoTarefa'), ['id', 'prazo', 'tarefa.titulo']);
});

void test('d2_110: the three real tarefas bff55 answers have no mounted type repeating its mount field', () => {
  const files = [
    'd2_110_734e360_minhas_tarefas-1.json',
    'd2_110_9587aaa_minhas_tarefas-1.json',
    'd2_110_ffa4a28_minhas_tarefas-1.json',
    'd2_110_ffa4a28_meus_avisos-1.json',
  ];
  for (const file of files) {
    const envelope = JSON.parse(readFileSync(new URL(`./fixtures/${file}`, import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
    const design = normalizeD2BffDesign(buildD2BffDesign(envelope.raw.result.arguments), entities);
    const source = renderD2ContractV2(
      { project: 1, module: 'tarefas', pageId: file.includes('avisos') ? 'meus_avisos' : 'minhas_tarefas' },
      buildD2ContractFromBff({
        module: 'tarefas', pageId: file.includes('avisos') ? 'meus_avisos' : 'minhas_tarefas', design,
        access: { actors: ['clerk'], grants: ['manage'], scope: 'organization' },
        entities, userLanguage: 'en',
      }),
    );
    const mountFields = new Map<string, Set<string>>();
    const add = (child: string, field: string): void => {
      const set = mountFields.get(child) ?? new Set<string>();
      set.add(field);
      mountFields.set(child, set);
    };
    for (const row of design.types) for (const leaf of row.fields) {
      const ref = leaf.type.replace(/\[\]$/u, '');
      if (design.types.some(item => item.name === ref)) add(ref, leaf.name);
    }
    for (const endpoint of design.endpoints) for (const leaf of [...endpoint.input, ...endpoint.output]) {
      const ref = leaf.type.replace(/\[\]$/u, '');
      if (design.types.some(item => item.name === ref)) add(ref, leaf.name);
    }
    for (const type of design.types) {
      for (const field of mountFields.get(type.name) ?? []) {
        assert.equal(type.fields.some(leaf => leaf.name === field || leaf.name.startsWith(`${field}.`)), false, `${file} ${type.name} keeps ${field}`);
      }
    }
    assert.doesNotMatch(source, /interface TarefaDescricaoDetails \{[^}]*details:/su, file);
    assert.doesNotMatch(source, /interface TarefaMotivoDetails \{[^}]*details:/su, file);
  }
});

void test('d2_120: distinct leaves of one object field stay distinct, with the answer name and type', () => {
  const envelope = JSON.parse(readFileSync(new URL('./fixtures/d2_120_my_access_completion-1.json', import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
  const member = {
    record: { fields: { id: { type: 'string' }, details: { type: 'object', fields: { person: { type: 'object', fields: { privacyConsent: { type: 'object' } } } } } } },
  } as unknown as Ns5OntologyAnyEntity;
  const design = normalizeD2BffDesign(buildD2BffDesign(envelope.raw.result.arguments), { ...entities, Member: member }, 'My_access_completionContracts');
  const consent = design.types.find(item => item.name === 'PrivacyConsent')!;
  assert.deepEqual(consent.fields.map(item => `${item.name}:${item.type}`), [
    'textId:string',
    'textVersion:string',
    'acceptedAt:string',
    'channel:string',
    'valid:boolean',
  ]);
  const source = renderD2ContractV2(
    { project: 102056, module: 'onboarding', pageId: 'my_access_completion' },
    buildD2ContractFromBff({
      module: 'onboarding', pageId: 'my_access_completion', design,
      access: { actors: ['member'], grants: ['use'], scope: 'organization' },
      entities: { ...entities, Member: member }, userLanguage: 'en',
    }),
  );
  const iface = /export interface PrivacyConsent \{([\s\S]*?)\n\}/u.exec(source)?.[1] ?? '';
  assert.match(iface, /textId: string;/u);
  assert.doesNotMatch(iface, /privacyConsent: \{/u);
});

void test('d2_107: an L4 enum written as plain strings gives the same values as one written as { value, title }', () => {
  // inicio (17/10): PessoaOrganizacao.details.identification.status is ["Active", ...]; Empresa's status is [{ value, title }].
  const role = (values: unknown[]) => ({ record: { fields: { details: { type: 'object', fields: { status: { type: 'enum', values } } } } } }) as unknown as Ns5OntologyAnyEntity;
  assert.deepEqual(d2OntologyLeafType(role(['Active', 'Inactive']), 'Pessoa.details.status')?.values, ['Active', 'Inactive']);
  assert.deepEqual(d2OntologyLeafType(role([{ value: 'Active', title: 'Ativa' }, { value: 'Inactive' }]), 'Pessoa.details.status')?.values, ['Active', 'Inactive']);
});

void test('d2_121: a platform object of a known MDM type becomes that type', () => {
  const envelope = JSON.parse(readFileSync(new URL('./fixtures/d2_121_company_setup-1.json', import.meta.url), 'utf8')) as { raw: { result: { arguments: unknown } } };
  const company = JSON.parse(readFileSync(new URL('./fixtures/d2_121_Company.defs.ts.json', import.meta.url), 'utf8')) as Ns5OntologyAnyEntity;
  const normalized = normalizeD2BffDesign(buildD2BffDesign(envelope.raw.result.arguments), { Company: company }, 'Company_setupContracts');
  const address = normalized.types.find(item => item.name === 'Address');
  assert.ok(address);
  const byName = Object.fromEntries(address.fields.map(item => [item.name, item]));
  for (const name of ['type', 'line1', 'countryCode', 'isPrimary']) assert.equal(byName[name]?.optional, undefined, name);
  for (const name of ['label', 'line2', 'line3', 'city', 'stateOrProvince', 'postalCode', 'formatted', 'geolocation']) assert.equal(byName[name]?.optional, true, name);
  assert.match(byName.type.type, /'Residential'/u);
  assert.equal(byName.line1.type, 'string');
  assert.equal(byName.geolocation.type, 'GeoPoint');
  assert.equal(byName.formatted.derived, true);
  const addressLeaves = [
    ...normalized.types.flatMap(item => item.fields),
    ...normalized.endpoints.flatMap(item => [...item.input, ...item.output]),
  ].filter(item => item.name === 'addresses' || item.name.endsWith('.addresses'));
  assert.ok(addressLeaves.length > 0);
  assert.ok(addressLeaves.every(item => item.type === 'Address[]'));
  const source = renderD2ContractV2(
    { project: 102056, module: 'onboarding', pageId: 'company_setup' },
    buildD2ContractFromBff({
      module: 'onboarding', pageId: 'company_setup', design: normalized,
      access: { actors: ['owner'], grants: ['prepare'], scope: 'organization' },
      entities: { Company: company }, userLanguage: 'en',
    }),
  );
  assert.match(source, new RegExp('addresses\\?: Address\\[]'));
  assert.match(source, new RegExp('line1: string;'));
  assert.match(source, new RegExp('readonly formatted\\?: string;'));
  assert.doesNotMatch(source, new RegExp('addresses\\?: string'));
  const bare = JSON.parse('{"record":{"fields":{"details":{"type":"object","fields":{"blob":{"type":"object"},"other":{"type":"object","of":"NotAPlatformType"}}}}}}') as Ns5OntologyAnyEntity;
  const kept = normalizeD2BffDesign(design(endpoint('qry', [leaf('blob', 'Thing.details.blob', 'string'), leaf('other', 'Thing.details.other', 'string')], '')), { Thing: bare });
  assert.deepEqual(kept.endpoints[0].input.map(item => item.type), ['string', 'string']);
});
