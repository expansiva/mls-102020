/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts30/contracts.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/agentNewSolution/helpers/ns4ClassicDefs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import {
  D2ContractDerivationError,
  buildD2ContractsCatalog,
  collectD2EntityFields,
  type D2ContractField,
  type D2ContractsSources,
} from '/_102020_/l2/agentDefsL2/steps/contracts30/contracts.js';
import { assertD2RenderedContract, renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const INPUT_FIXTURES = path.resolve(HERE, '..', 'input20', 'fixtures', 'current');
const HEAD = path.join(HERE, 'fixtures', 'head');

void test('pinned ontology and journey fixtures match agendaClinica HEAD', () => {
  const provenance = json(path.join(HEAD, 'provenance.json')) as { commit: string; sha256: Record<string, string> };
  assert.equal(provenance.commit, 'a2f929ed8778c9d8240ac445d6206d401434fdc9');
  for (const [relative, expected] of Object.entries(provenance.sha256)) {
    assert.equal(createHash('sha256').update(readFileSync(path.join(HEAD, 'l4', relative))).digest('hex'), expected, relative);
  }
});

void test('nested catalog preserves paths, metadata, enum codes, references and collections', () => {
  const fields = collectD2EntityFields(syntheticNestedEntity());
  const flat = flatten(fields);
  assert.ok(flat.some(field => field.path === 'Example.left.code'));
  assert.ok(flat.some(field => field.path === 'Example.right.code'));
  assert.equal(new Set(flat.map(field => field.path)).size, flat.length);
  const status = flat.find(field => field.path === 'Example.status')!;
  assert.deepEqual(status.enumValues, ['open', 'closed']);
  assert.equal(status.tsType, '"open" | "closed"');
  assert.equal(status.required, true);
  const reference = flat.find(field => field.path === 'Example.ownerId')!;
  assert.deepEqual(reference.referenceTo, ['Owner']);
  const tags = flat.find(field => field.path === 'Example.tags')!;
  assert.equal(tags.collection, true);
});

void test('agendaClinica contracts obey operations, grants and exact backend routes', () => {
  const pages = buildD2ContractsCatalog(declaredPayloadSources());
  assert.equal(pages.length, 5);
  assert.equal(pages.flatMap(page => page.calls).length, 19);
  const professional = pages.find(page => page.pageId === 'consultas_profissional')!;
  const receptionist = pages.find(page => page.pageId === 'consultas_recepcionista')!;
  const receptionistRegistration = pages.find(page => page.pageId === 'cadastro_recepcionista')!;
  const list = professional.calls.find(call => call.callName === 'listConsulta')!;
  assert.equal(list.outputShape, 'array');
  assert.ok(flatten(list.input).filter(field => field.name !== 'page').every(field => field.indexed));
  assert.ok(flatten(list.input).some(field => field.name === 'page'));
  const status = flatten(list.output).find(field => field.path === 'Consulta.status')!;
  assert.equal(status.tsType, '"scheduled" | "confirmed" | "noShow" | "attended"');
  assert.equal(status.required, true);
  assert.deepEqual(list.relationships.map(item => [item.relationshipId, item.to, item.collection]), [
    ['appointmentPatient', 'Paciente', false],
    ['appointmentProfessional', 'Profissional', false],
  ]);
  const professionalTransition = professional.calls.find(call => call.callName === 'registrarAtendimento')!;
  assert.ok(flatten(professionalTransition.input).some(field => field.path === 'Consulta.details.attendanceNote'));
  const receptionistPaths = receptionist.calls.flatMap(call => flatten(call.output).map(field => field.path));
  assert.equal(receptionistPaths.includes('Consulta.details.attendanceNote'), false);
  const create = receptionistRegistration.calls.find(call => call.callName === 'createRecepcionista')!;
  assert.equal(flatten(create.input).some(field => field.derived), false);
  const update = receptionistRegistration.calls.find(call => call.callName === 'updateRecepcionista')!;
  assert.ok(flatten(update.input).some(field => field.name === 'id' && field.derived));
  assert.ok(pages.flatMap(page => page.calls).every(call => call.route === `agendaClinica.${pages.find(page => page.calls.includes(call))!.pageId}.${call.route.startsWith(`agendaClinica.${pages.find(page => page.calls.includes(call))!.pageId}.qry`) ? 'qry' : 'cmd'}${call.callPascal}`));
});

void test('write preconditions are metadata-driven and remain separate from writable payloads', () => {
  const sources = declaredPayloadSources();
  const receptionist = structuredClone(sources.entities.Recepcionista) as unknown as Record<string, unknown>;
  const fields = rec(rec(receptionist.record).fields);
  fields.revisionToken = { type: 'integer', required: true, derived: true, writePrecondition: true };
  const identification = rec(rec(rec(fields.details).fields).identification);
  const identificationFields = rec(identification.fields);
  identificationFields.name = { ...rec(identificationFields.name), writePrecondition: true };
  sources.entities.Recepcionista = receptionist as unknown as Ns5OntologyAnyEntity;
  const consulta = structuredClone(sources.entities.Consulta) as unknown as Record<string, unknown>;
  rec(rec(consulta.record).fields).version = { type: 'integer', required: true, derived: true, writePrecondition: true };
  sources.entities.Consulta = consulta as unknown as Ns5OntologyAnyEntity;

  const pages = buildD2ContractsCatalog(sources);
  const calls = pages.find(page => page.pageId === 'cadastro_recepcionista')!.calls;
  const create = calls.find(call => call.callName === 'createRecepcionista')!;
  const update = calls.find(call => call.callName === 'updateRecepcionista')!;
  const token = flatten(update.input).find(field => field.path === 'Recepcionista.revisionToken');
  assert.equal(token?.writePrecondition, true);
  assert.equal(token?.required, true);
  assert.equal(flatten(create.input).some(field => field.writePrecondition), false, 'create never asks for a prior snapshot');
  assert.equal(flatten(update.input).filter(field => field.path === 'Recepcionista.revisionToken').length, 1);
  assert.equal(flatten(update.input).filter(field => field.path === 'Recepcionista.details.identification.name').length, 1, 'nested precondition is not duplicated when trees merge');
  assert.ok(flatten(update.input).some(field => field.path === 'Recepcionista.details.identification.docId'), 'a nested precondition does not drop writable siblings');

  const transition = pages.find(page => page.pageId === 'consultas_profissional')!.calls.find(call => call.callName === 'registrarAtendimento')!;
  assert.deepEqual(flatten(transition.input).filter(field => field.writePrecondition).map(field => field.path), ['Consulta.version']);
  assert.ok(flatten(transition.input).some(field => field.path === 'Consulta.details.attendanceNote'), 'explicit transition payload remains present');

  const unmarked = declaredPayloadSources();
  const consultaVersion = collectD2EntityFields(unmarked.entities.Consulta).find(field => field.path === 'Consulta.version')!;
  assert.equal(consultaVersion.writePrecondition, false, 'an unmarked non-MDM version is not inferred by name');
});

void test('missing or invalid payload, unsupported types, invalid grants and changed routes are identified', () => {
  assert.throws(() => buildD2ContractsCatalog(currentSources()), (error: unknown) => {
    if (!(error instanceof D2ContractDerivationError)) return false;
    return error.issues.some(issue => issue.code === 'D2_CONTRACT_TRANSITION_PAYLOAD_MISSING'
      && issue.source === 'ontology'
      && issue.path === 'Consulta.transitions.registrarAtendimento');
  });

  const badType = declaredPayloadSources();
  const consulta = structuredClone(badType.entities.Consulta) as unknown as Record<string, unknown>;
  const record = rec(consulta.record); rec(rec(record.fields).scheduledAt).type = 'quantum';
  badType.entities.Consulta = consulta as unknown as Ns5OntologyAnyEntity;
  assertCode(() => buildD2ContractsCatalog(badType), 'D2_CONTRACT_TYPE_UNSUPPORTED');

  const badPayload = declaredPayloadSources();
  const payloadEntity = structuredClone(badPayload.entities.Consulta) as unknown as Record<string, unknown>;
  const transition = rows(payloadEntity.transitions).find(item => item.transitionId === 'registrarAtendimento')!;
  transition.payload = ['details.missing'];
  badPayload.entities.Consulta = payloadEntity as unknown as Ns5OntologyAnyEntity;
  assertCode(() => buildD2ContractsCatalog(badPayload), 'D2_CONTRACT_TRANSITION_PATH_INVALID');

  const badGrant = declaredPayloadSources();
  const access = structuredClone(badGrant.access) as Record<string, unknown>;
  const grant = rows(access.grants).find(item => item.grantId === 'recepcionistaAgendaConsultas')!;
  rec(grant.disclosure).allowedFields = ['Consulta.missing'];
  badGrant.access = access;
  assertCode(() => buildD2ContractsCatalog(badGrant), 'D2_CONTRACT_GRANT_PATH_INVALID');

  const changedRoute = declaredPayloadSources();
  changedRoute.pages[0].endpoints[0].route = 'agendaClinica.changed.route';
  assertCode(() => buildD2ContractsCatalog(changedRoute), 'D2_CONTRACT_ROUTE_CHANGED');

  const ambiguousActor = declaredPayloadSources();
  ambiguousActor.pages.find(page => page.pageId === 'consultas_recepcionista')!.actors.push('profissional');
  assertCode(() => buildD2ContractsCatalog(ambiguousActor), 'D2_CONTRACT_GRANT_AMBIGUOUS');
});

void test('rendered defs are safe, static pages are empty and a .defs.js consumer compiles', () => {
  const contract = buildD2ContractsCatalog(declaredPayloadSources()).find(page => page.pageId === 'consultas_profissional')!;
  const source = renderD2PageContract(contract);
  assertD2RenderedContract(source, contract);
  assert.doesNotMatch(source, /\bany\b|\bunknown\b|items:|pageSize:|total:/);
  assert.equal(renderD2PageContract({ pageId: 'static', calls: [] }), 'export {};\n');

  const folder = mkdtempSync(path.join(tmpdir(), 'd2-contract-'));
  try {
    writeFileSync(path.join(folder, 'consultas_profissional.defs.ts'), source);
    writeFileSync(path.join(folder, 'consumer.ts'), [
      "import { listConsultaRoute } from './consultas_profissional.defs.js';",
      "import type { ListConsultaOutput, RegistrarAtendimentoInput } from './consultas_profissional.defs.js';",
      "const route: 'agendaClinica.consultas_profissional.qryListConsulta' = listConsultaRoute;",
      'const output: ListConsultaOutput = [];',
      'const input: RegistrarAtendimentoInput | null = null;',
      'void route; void output; void input;',
    ].join('\n'));
    const tsc = path.resolve(HERE, '../../../../..', 'node_modules', '.bin', 'tsc');
    const result = spawnSync(tsc, ['--noEmit', '--strict', '--skipLibCheck', '--module', 'NodeNext', '--moduleResolution', 'NodeNext', 'consumer.ts', 'consultas_profissional.defs.ts'], { cwd: folder, encoding: 'utf8' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
  } finally { rmSync(folder, { recursive: true, force: true }); }
});

void test('contracts30 core has no LLM, live persistence or materialization pipeline', () => {
  const source = ['contracts.ts', 'render.ts'].map(name => readFileSync(path.join(HERE, name), 'utf8')).join('\n');
  assert.doesNotMatch(source, /getBestModel|callLLM|createAgent|writeJson|writeSourceText|deleteFile|l2_contract/);
});

function currentSources(): D2ContractsSources {
  const backend = json(path.join(INPUT_FIXTURES, 'backend.json'));
  const needs = json(path.join(INPUT_FIXTURES, 'needs.json'));
  const access = defs(path.join(INPUT_FIXTURES, 'access.defs.ts'));
  const entities: Record<string, Ns5OntologyAnyEntity> = {};
  for (const name of readdirSync(path.join(HEAD, 'l4', 'ontology')).filter(name => name !== 'index.defs.ts')) {
    const entity = defs(path.join(HEAD, 'l4', 'ontology', name)) as unknown as Ns5OntologyAnyEntity;
    entities[String(rec(entity).entityId)] = entity;
  }
  const usecases = rows(backend.usecases);
  return {
    module: 'agendaClinica', entities, access,
    pages: rows(needs.pages).map(page => {
      const pageId = String(page.pageId);
      const endpoints = rows(backend.endpoints).filter(endpoint => endpoint.page === pageId);
      const ids = new Set(endpoints.map(endpoint => endpoint.usecaseRef));
      return { pageId, actors: strings(page.actors), endpoints, usecases: usecases.filter(usecase => ids.has(usecase.usecaseId)) };
    }),
  };
}

function declaredPayloadSources(): D2ContractsSources {
  const sources = currentSources();
  const consulta = structuredClone(sources.entities.Consulta) as unknown as Record<string, unknown>;
  for (const transition of rows(consulta.transitions)) {
    transition.payload = transition.transitionId === 'registrarAtendimento' ? ['details.attendanceNote'] : [];
  }
  sources.entities.Consulta = consulta as unknown as Ns5OntologyAnyEntity;
  return sources;
}

function syntheticNestedEntity(): Ns5OntologyAnyEntity {
  return {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: 'fixture', entityId: 'Example', title: 'Example', description: 'fixture', displayField: 'status',
    kind: 'entity', class: 'core', storage: { target: 'moduleDatabase', table: 'fixture_example', kind: 'relational' }, relationships: {}, capabilities: {}, rules: [],
    record: { fields: {
      id: { type: 'uuid', required: true, derived: true },
      left: { type: 'object', fields: { code: { type: 'string', required: true } } },
      right: { type: 'object', fields: { code: { type: 'string' } } },
      status: { type: 'enum', required: true, values: [{ value: 'open', title: 'Open', description: '' }, { value: 'closed', title: 'Closed', description: '' }] },
      ownerId: { type: 'record', to: ['Owner'] },
      tags: { type: 'array', collection: true, fields: { value: { type: 'string' } } },
    } }, uniqueKeys: [], lifecycleStates: [], transitions: [],
  } as unknown as Ns5OntologyAnyEntity;
}

function assertCode(run: () => unknown, code: string): void {
  assert.throws(run, (error: unknown) => error instanceof D2ContractDerivationError && error.issues.some(issue => issue.code === code));
}

function flatten(fields: D2ContractField[]): D2ContractField[] { return fields.flatMap(field => [field, ...flatten(field.children)]); }
function json(file: string): Record<string, unknown> { return JSON.parse(readFileSync(file, 'utf8')) as Record<string, unknown>; }
function defs(file: string): Record<string, unknown> { const value = parseNs4ClassicDefsSource<Record<string, unknown>>(readFileSync(file, 'utf8')); assert.ok(value, file); return value; }
function rec(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function rows(value: unknown): Array<Record<string, unknown>> { return Array.isArray(value) ? value.map(rec) : []; }
function strings(value: unknown): string[] { return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : []; }
