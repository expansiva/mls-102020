/// <mls fileReference="_102020_/l2/helpers/defsInput/gate.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { parseNs4ClassicDefsSource } from '/_102035_/l2/solution/helpers/ns4ClassicDefs.js';
import { buildD2InputSnapshot } from '/_102020_/l2/helpers/defsInput/gate.js';
import type { D2InputArtifacts } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { resolveD2OperationBindings } from '/_102020_/l2/helpers/defsInput/operationSemantics.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const EXPENSE = path.join(HERE, '../../agentPlannerL2/steps/needs30/fixtures/p2_32/expense');

function artifactsOf(root: string): D2InputArtifacts {
  const defs = (rel: string): unknown => parseNs4ClassicDefsSource<unknown>(readFileSync(path.join(root, rel), 'utf8'));
  const json = (rel: string): unknown => JSON.parse(readFileSync(path.join(root, rel), 'utf8'));
  const names = (sub: string) => readdirSync(path.join(root, sub)).filter(name => name.endsWith('.defs.ts') && name !== 'index.defs.ts').sort();
  return {
    sources: [], module: defs('module.defs.ts'), journeyIndex: defs('journeys/index.defs.ts'),
    journeys: Object.fromEntries(names('journeys').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`journeys/${name}`)])),
    ontologyIndex: defs('ontology/index.defs.ts'),
    entities: Object.fromEntries(names('ontology').map(name => [name.replace(/\.defs\.ts$/u, ''), defs(`ontology/${name}`)])),
    rules: defs('rules.defs.ts'), workflows: defs('workflows.defs.ts'), access: defs('access.defs.ts'), integration: defs('integration.defs.ts'),
    menu: json('pool/menu.json'), needs: json('pool/needs.json'), backend: json('pool/backend.json'), effort: json('pool/effort.json'),
  };
}

async function problems(artifacts: D2InputArtifacts): Promise<Array<{ code: string; file: string }>> {
  const module = (artifacts.module as { moduleName: string }).moduleName;
  try {
    await buildD2InputSnapshot({ project: 102047, module }, artifacts);
    return [];
  } catch (error) {
    const found = (error as { problems?: Array<{ code: string; file: string }> }).problems;
    if (!found) { assert.match(String(error), /source digest missing/u); return []; }
    return found.map(item => ({ code: item.code, file: item.file }));
  }
}

void test('recorded integration v2 without connections is read; an unknown version is refused', async () => {
  const recorded = artifactsOf(EXPENSE);
  delete (recorded.integration as { connections?: unknown }).connections;
  const accepted = await problems(recorded);
  assert.equal(accepted.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(accepted));

  const current = artifactsOf(EXPENSE);
  (current.integration as { schemaVersion: string }).schemaVersion = '2026-11-17-ns5-integration-v3';
  delete (current.integration as { connections?: unknown }).connections;
  const currentProblems = await problems(current);
  assert.equal(currentProblems.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(currentProblems));

  const unknown = artifactsOf(EXPENSE);
  (unknown.integration as { schemaVersion: string }).schemaVersion = '1999-01-01-ns5-integration-v0';
  const refused = await problems(unknown);
  assert.deepEqual(
    refused.filter(item => item.code === 'UNSUPPORTED_VERSION').map(item => item.file),
    ['l4/integration.defs.ts'],
  );
});

void test('a copied integration v4 passes the entry gate and v3 stays the same', async () => {
  const v3 = artifactsOf(EXPENSE);
  (v3.integration as { schemaVersion: string }).schemaVersion = '2026-11-17-ns5-integration-v3';
  delete (v3.integration as { connections?: unknown }).connections;
  const v3Problems = await problems(v3);
  assert.equal(v3Problems.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(v3Problems));

  const copied = parseNs4ClassicDefsSource<{ schemaVersion: string; externalSystems: unknown }>(
    readFileSync(path.join(HERE, 'fixtures/repoInsideModule-integration.defs.ts'), 'utf8'),
  );
  assert.equal(copied.schemaVersion, '2026-11-19-ns5-integration-v4');
  const v4 = artifactsOf(EXPENSE);
  const integration = v4.integration as { schemaVersion: string; externalSystems?: unknown; connections?: unknown };
  integration.schemaVersion = copied.schemaVersion;
  integration.externalSystems = copied.externalSystems;
  delete integration.connections;
  const v4Problems = await problems(v4);
  assert.equal(v4Problems.some(item => item.code === 'UNSUPPORTED_VERSION'), false, JSON.stringify(v4Problems));
  assert.deepEqual(v4Problems, v3Problems);
});

void test('the gate reads an external call for input fields and leaves an entity binding unchanged', async () => {
  const artifacts = artifactsOf(EXPENSE);
  const module = (artifacts.module as { moduleName: string }).moduleName;
  (artifacts.ontologyIndex as { entities: Array<Record<string, unknown>> }).entities.push({ entityId: 'OutsideRecord', kind: 'external' });
  artifacts.entities.OutsideRecord = {
    schemaVersion: '2026-09-17-ns5-ontology-v3.1', moduleName: module, entityId: 'OutsideRecord', kind: 'external', connectionId: 'cm',
    record: { fields: { name: { type: 'string', required: true } } },
  };
  const journey = artifacts.journeys.registrarEnviarDespesa as { business: { steps: Array<Record<string, unknown>> } };
  journey.business.steps.push(
    { stepId: 'saveOutside', kind: 'act', entity: 'OutsideRecord', effect: 'update' },
    { stepId: 'dropOutside', kind: 'act', entity: 'OutsideRecord', effect: 'transition', transitionRef: 'dropOutside' },
  );
  (artifacts.integration as { connections: unknown[] }).connections = [
    { connectionId: 'cm', operationId: 'updateAgent', direction: 'call', usedBy: ['registrarEnviarDespesa.saveOutside'] },
    { connectionId: 'cm', operationId: 'discardAgentDraft', direction: 'call', usedBy: ['registrarEnviarDespesa.dropOutside'] },
  ];
  const backend = artifacts.backend as { endpoints: Array<Record<string, unknown>>; usecases: Array<Record<string, unknown>> };
  const effort = artifacts.effort as { totals: { endpoints: { toCreate: number }; usecases: { toCreate: number } }; screens: Array<{ pageId: string; endpoints: string[] }>; endpoints: Array<Record<string, unknown>>; usecases: Array<Record<string, unknown>> };
  for (const [usecaseId, operation] of [['saveOutside', 'update'], ['dropOutside', 'transition']] as const) {
    const route = `reembolsoDespesas.minhas_despesas.cmd${usecaseId}`;
    backend.endpoints.push({ route, page: 'minhas_despesas', kind: 'cmd', usecaseRef: usecaseId, status: 'toCreate', tableRefs: [], noTable: 'ok' });
    backend.usecases.push({ usecaseId, entity: 'OutsideRecord', operation, ports: [], status: 'toCreate', existing: '', reason: '', tableRefs: [], noTable: 'ok' });
    effort.endpoints.push({ route, page: 'minhas_despesas', kind: 'cmd', usecaseRef: usecaseId, status: 'toCreate' });
    effort.usecases.push({ usecaseId, entity: 'OutsideRecord', operation, status: 'toCreate', existing: '' });
    effort.screens.find(screen => screen.pageId === 'minhas_despesas')!.endpoints.push(route);
  }
  effort.totals.endpoints.toCreate += 2;
  effort.totals.usecases.toCreate += 2;
  const digest = (rel: string) => ({ path: `l4/${module}/${rel}`, sha256: 'a', bytes: 1, schemaVersion: '' });
  artifacts.sources = [
    digest('module.defs.ts'), digest('journeys/index.defs.ts'), digest('ontology/index.defs.ts'),
    digest('rules.defs.ts'), digest('workflows.defs.ts'), digest('access.defs.ts'), digest('integration.defs.ts'),
    ...Object.keys(artifacts.journeys).map(id => digest(`journeys/${id}.defs.ts`)),
    ...Object.keys(artifacts.entities).map(id => digest(`ontology/${id}.defs.ts`)),
  ];

  const snapshot = await buildD2InputSnapshot({ project: 102047, module }, artifacts);
  const page = snapshot.selection.pages.find(item => item.pageId === 'minhas_despesas')!;
  const fields = (operation: string) => page.operationBindings?.find(item => item.entityId === 'OutsideRecord' && item.operation === operation)?.inputFields.map(field => field.path);
  assert.deepEqual(fields('update'), ['agentId', 'expectVersion']);
  assert.deepEqual(fields('transition'), ['draftId']);

  const entityUsecases = page.usecases.filter(usecase => textRef(usecase.entity) === 'Despesa');
  const despesaIds = new Set(entityUsecases.map(usecase => textRef(usecase.usecaseId)));
  const entityEndpoints = page.endpoints.filter(endpoint => despesaIds.has(textRef(endpoint.usecaseRef)));
  const direct = resolveD2OperationBindings({
    module, entities: artifacts.entities, access: artifacts.access, rules: artifacts.rules, digests: artifacts.sources,
  }, page.pageId, entityEndpoints, entityUsecases, page.actors);
  const fromGate = (page.operationBindings ?? []).filter(item => item.entityId === 'Despesa');
  assert.deepEqual(fromGate.map(item => item.inputFields), direct.map(item => item.inputFields));
});

function textRef(value: unknown): string { return typeof value === 'string' ? value : ''; }
