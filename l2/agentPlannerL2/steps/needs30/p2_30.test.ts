/// <mls fileReference="_102020_/l2/agentPlannerL2/steps/needs30/p2_30.test.ts" enhancement="_blank"/>

/**
 * p2_30: a form page without a journey keeps only the records menu20 assigned to it in meta.records.
 * Fixtures under fixtures/p2_30 are copies of two real modules (a clinic and a fleet) as generated on 02/10.
 */

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import {
  collectRecordsKept,
  parseP2Grants,
  parsePreviousMenuTree,
  type MenuV2,
  type P2MenuFile,
} from '/_102020_/l2/agentPlannerL2/steps/menu20/contracts.js';
import { validateP2Menu } from '/_102020_/l2/agentPlannerL2/steps/menu20/gate.js';
import { parseP2L4Sources } from '/_102020_/l2/agentPlannerL2/steps/workspaces20/contracts.js';
import { buildP2NeedsFile, type P2NeedsPage } from '/_102020_/l2/agentPlannerL2/steps/needs30/contracts.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts } from '/_102020_/l2/helpers/defsInput/contracts.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, 'fixtures/p2_30');
const AT = new Date(Date.UTC(2026, 9, 2, 12, 0, 0));

function defs(dir: string, rel: string): unknown {
  const parsed = parseNs4ClassicDefsSource<unknown>(readFileSync(path.join(ROOT, dir, rel), 'utf8'));
  if (!parsed) throw new Error(`${dir}/${rel}`);
  return parsed;
}
function json<T>(dir: string, rel: string): T { return JSON.parse(readFileSync(path.join(ROOT, dir, rel), 'utf8')) as T; }
function ids(dir: string, sub: string): string[] {
  return readdirSync(path.join(ROOT, dir, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
}

function load(dir: string) {
  const access = defs(dir, 'access.defs.ts');
  const module = defs(dir, 'module.defs.ts') as { moduleName?: string; userLanguage?: string };
  const sources = parseP2L4Sources({
    moduleName: module.moduleName, userLanguage: module.userLanguage,
    journeyIndex: defs(dir, 'journeys/index.defs.ts'), journeys: ids(dir, 'journeys').map(name => defs(dir, `journeys/${name}`)),
    access, ontologyIndex: defs(dir, 'ontology/index.defs.ts'), ontologyEntities: ids(dir, 'ontology').map(name => defs(dir, `ontology/${name}`)),
  });
  return { sources, grants: parseP2Grants(access), menu: json<P2MenuFile>(dir, 'pool/menu.json'), needs: json<{ pages: P2NeedsPage[] }>(dir, 'pool/needs.json') };
}

function withRecords(menu: P2MenuFile, records: Record<string, string[]>): P2MenuFile {
  return { ...structuredClone(menu), meta: { ...structuredClone(menu.meta), records } };
}
function draftOf(menu: P2MenuFile): MenuV2 {
  return { tree: parsePreviousMenuTree(menu), authorities: menu.authorities, meta: { journeys: menu.meta.journeys, processes: menu.meta.processes, records: menu.meta.records } };
}
function pageOf(pages: readonly P2NeedsPage[], pageId: string): P2NeedsPage {
  const page = pages.find(item => item.pageId === pageId);
  assert.ok(page, pageId);
  return page;
}
function renameIds<T>(value: T, map: Readonly<Record<string, string>>): T {
  if (typeof value === 'string') return (map[value] || value) as T;
  if (Array.isArray(value)) return value.map(item => renameIds(item, map)) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).map(([key, item]) => [map[key] || key, renameIds(item, map)])) as T;
}

const CLINIC_RECORDS = { Profissional: ['meu_cadastro_profissional'], Recepcionista: ['meu_cadastro_recepcao'] };

void test('p2_30: the own-registration page keeps only its record, renamed or not', () => {
  const clinic = load('clinic');
  const menu = withRecords(clinic.menu, CLINIC_RECORDS);
  const file = buildP2NeedsFile({ menu, sources: clinic.sources, grants: clinic.grants, processes: [], now: AT });
  const own = pageOf(file.pages, 'meu_cadastro_recepcao');
  assert.deepEqual(own.writes.map(item => `${item.entity}:${item.operation}`).sort(), ['Recepcionista:create', 'Recepcionista:update']);
  assert.equal(own.reads.some(item => item.entity === 'Profissional'), false);
  assert.equal(own.writes.some(item => item.entity === 'Profissional'), false);
  // Before p2_30 the same page also maintained the record its grant only consults.
  assert.deepEqual([...new Set(pageOf(clinic.needs.pages, 'meu_cadastro_recepcao').writes.map(item => item.entity))].sort(), ['Profissional', 'Recepcionista']);
  assert.deepEqual(pageOf(file.pages, 'meu_cadastro_profissional').writes.map(item => item.entity).sort(), ['Profissional', 'Profissional']);
  assert.deepEqual(validateP2Menu(draftOf(menu), { sources: clinic.sources, grants: clinic.grants, processes: [] }).issues.filter(item => item.code.startsWith('P2_MENU_RECORD')), []);

  const map: Record<string, string> = {
    Profissional: 'RecordA', Recepcionista: 'RecordB', Paciente: 'RecordC', Consulta: 'RecordD', ContatoPaciente: 'RecordE',
    meu_cadastro_recepcao: 'page_b', meu_cadastro_profissional: 'page_a', recepcionista: 'actorB', profissional: 'actorA',
  };
  const renamedMenu = renameIds(menu, map);
  renamedMenu.authorities = Object.fromEntries(Object.entries(menu.authorities).map(([key, pages]) => [
    `actor:${map[key.slice('actor:'.length)] || key.slice('actor:'.length)}`, pages.map(pageId => map[pageId] || pageId),
  ]));
  const renamed = buildP2NeedsFile({ menu: renamedMenu, sources: renameIds(clinic.sources, map), grants: renameIds(clinic.grants, map), processes: [], now: AT });
  assert.deepEqual(pageOf(renamed.pages, 'page_b').writes.map(item => `${item.entity}:${item.operation}`).sort(), ['RecordB:create', 'RecordB:update']);
});

void test('p2_30: a page that keeps four records stays the same', () => {
  const fleet = load('fleet');
  const before = pageOf(fleet.needs.pages, 'cadastros_operacionais');
  const kept = [...new Set(before.writes.map(item => item.entity))].sort();
  assert.equal(kept.length, 4);
  const menu = withRecords(fleet.menu, Object.fromEntries(kept.map(entity => [entity, ['cadastros_operacionais']])));
  const after = pageOf(buildP2NeedsFile({ menu, sources: fleet.sources, grants: fleet.grants, processes: [], now: AT }).pages, 'cadastros_operacionais');
  const shape = (page: P2NeedsPage) => ({
    writes: page.writes.map(item => `${item.entity}:${item.operation}:${item.from.join(',')}`).sort(),
    reads: page.reads.map(item => item.entity).sort(),
  });
  assert.deepEqual(shape(after), shape(before));
});

void test('p2_30: menu20 refuses each wrong meta.records by name', () => {
  const clinic = load('clinic');
  const kept = collectRecordsKept(clinic.sources, clinic.grants).map(row => row.entityRef);
  assert.ok(kept.includes('Recepcionista') && kept.includes('Profissional'));
  const codes = (records: Record<string, string[]>) => validateP2Menu(draftOf(withRecords(clinic.menu, records)), { sources: clinic.sources, grants: clinic.grants, processes: [] })
    .issues.filter(item => item.code.startsWith('P2_MENU_RECORD')).map(item => item.code).sort();
  assert.deepEqual(codes({ ...CLINIC_RECORDS, RecordFantasma: ['meu_cadastro_recepcao'] }), ['P2_MENU_RECORD_GRANT', 'P2_MENU_RECORD_UNKNOWN']);
  assert.deepEqual(codes({ ...CLINIC_RECORDS, Recepcionista: ['meu_cadastro_recepcao', 'pagina_inexistente'] }), ['P2_MENU_RECORD_PAGE_UNKNOWN']);
  assert.deepEqual(codes({ Profissional: ['meu_cadastro_profissional'] }), ['P2_MENU_RECORD_FORM_PAGE']);
  // The receptionist's only Profissional grant consults it; the professional's page is not the receptionist's.
  assert.deepEqual(codes({ ...CLINIC_RECORDS, Recepcionista: ['meu_cadastro_recepcao', 'meu_cadastro_profissional'] }), ['P2_MENU_RECORD_GRANT']);

});

void test('p2_30: input20 blocks the pre-fix needs before any D2 LLM', async () => {
  const dir = 'clinic';
  const journeyFiles = ids(dir, 'journeys');
  const entityFiles = ids(dir, 'ontology');
  const artifacts = (needs: unknown): D2InputArtifacts => ({
    sources: [], module: defs(dir, 'module.defs.ts'), journeyIndex: defs(dir, 'journeys/index.defs.ts'),
    journeys: Object.fromEntries(journeyFiles.map(name => [name.replace(/\.defs\.ts$/u, ''), defs(dir, `journeys/${name}`)])),
    ontologyIndex: defs(dir, 'ontology/index.defs.ts'),
    entities: Object.fromEntries(entityFiles.map(name => [name.replace(/\.defs\.ts$/u, ''), defs(dir, `ontology/${name}`)])),
    rules: defs(dir, 'rules.defs.ts'), workflows: defs(dir, 'workflows.defs.ts'), access: defs(dir, 'access.defs.ts'),
    integration: defs(dir, 'integration.defs.ts'), menu: json(dir, 'pool/menu.json'), needs,
    backend: json(dir, 'pool/backend.json'), effort: json(dir, 'pool/effort.json'),
  });
  const identity = { project: 102047, module: 'clinicFixture' };
  const problemsOf = async (needs: unknown) => {
    try {
      const snapshot = await buildD2InputSnapshot(identity, artifacts(needs));
      return snapshot.problems.map(item => ({ code: item.code, severity: item.severity }));
    } catch (error) {
      return ((error as { problems?: Array<{ code: string; severity: string }> }).problems ?? []).map(item => ({ code: item.code, severity: item.severity }));
    }
  };
  const before = await problemsOf(json(dir, 'pool/needs.json'));
  assert.ok(before.some(item => item.code === 'PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD' && item.severity === 'error'), JSON.stringify(before));
  const clinic = load(dir);
  const fixed = buildP2NeedsFile({ menu: withRecords(clinic.menu, CLINIC_RECORDS), sources: clinic.sources, grants: clinic.grants, processes: [], now: AT });
  const after = await problemsOf(fixed);
  assert.equal(after.some(item => item.code === 'PAGE_OWN_SCOPE_WITH_OTHER_ENTITY_CRUD'), false, JSON.stringify(after));
});
