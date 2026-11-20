/// <mls fileReference="_102020_/l2/helpers/defsInput/externalCatalog.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { externalCatalogTexts } from '/_102020_/l2/helpers/defsInput/externalCatalog.js';
import { explainD2ExternalCall } from '/_102020_/l2/helpers/defsInput/operationSemantics.js';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const GITHUB = path.join(HERE, '../../../../mls-102047/l1/repoHost/layer_1_external/connections/github.ts');

const entity = { kind: 'external', connectionId: 'github' };
const entities = { ContentFile: entity };
const journeys = { guardar: { business: { steps: [{ stepId: 'gravar', kind: 'act', entity: 'ContentFile', effect: 'update' }] } } };
const connections = [{ connectionId: 'github', operationId: 'gravarArquivo', direction: 'call', usedBy: ['guardar.gravar'] }];

function registry(modules: string[]): string {
  return `export const registry = ${JSON.stringify({ modules: modules.map(moduleName => ({ moduleName })) })} as const;`;
}
function integration(id: string): string {
  return `export const integration = ${JSON.stringify({ externalSystems: [{ id, title: '', description: '', settings: [], operations: [{ operationId: 'gravarArquivo', direction: 'call', description: '' }] }] })} as const;`;
}

void test('a sibling declaration supplies the real github input names', async () => {
  const github = readFileSync(GITHUB, 'utf8');
  const read = async (ref: string): Promise<string | null> => {
    if (ref.endsWith('/l4/organization/registry.defs.ts')) return registry(['conteudo', 'repoHost']);
    if (ref.endsWith('/l4/repoHost/integration.defs.ts')) return integration('github');
    if (ref.endsWith('/l1/repoHost/layer_1_external/connections/github.ts')) return github;
    return null;
  };
  const loaded = await externalCatalogTexts(entities, { project: 102047, moduleName: 'conteudo', read });
  assert.equal(loaded.unresolved.github, undefined);
  assert.equal(loaded.texts.github, github);
  const explained = explainD2ExternalCall({
    entityId: 'ContentFile', operation: 'update', entity, connections, journeys, catalogText: loaded.texts.github,
  });
  assert.equal(explained.gap, null);
  assert.deepEqual(explained.ask?.names, ['caminho', 'conteudo', 'mensagemRegistro']);
});

void test('this module declaration supplies the real github input names', async () => {
  const github = readFileSync(GITHUB, 'utf8');
  const read = async (ref: string): Promise<string | null> => {
    if (ref.endsWith('/l4/organization/registry.defs.ts')) return registry(['conteudo']);
    if (ref.endsWith('/l4/conteudo/integration.defs.ts')) return integration('github');
    if (ref.endsWith('/l1/conteudo/layer_1_external/connections/github.ts')) return github;
    return null;
  };
  const loaded = await externalCatalogTexts(entities, { project: 102047, moduleName: 'conteudo', read });
  assert.equal(loaded.unresolved.github, undefined);
  assert.equal(loaded.texts.github, github);
  const explained = explainD2ExternalCall({
    entityId: 'ContentFile', operation: 'update', entity, connections, journeys, catalogText: loaded.texts.github,
  });
  assert.equal(explained.gap, null);
  assert.deepEqual(explained.ask?.names, ['caminho', 'conteudo', 'mensagemRegistro']);
});

void test('a system of this module without a generated declaration is a distinct refusal', async () => {
  const read = async (ref: string): Promise<string | null> => {
    if (ref.endsWith('/l4/organization/registry.defs.ts')) return registry(['conteudo']);
    if (ref.endsWith('/l4/conteudo/integration.defs.ts')) return integration('github');
    return null;
  };
  const loaded = await externalCatalogTexts(entities, { project: 102047, moduleName: 'conteudo', read });
  const gap = loaded.unresolved.github;
  assert.equal(gap?.kind, 'ownNotGenerated');
  assert.match(gap?.message ?? '', /ContentFile/);
  assert.match(gap?.message ?? '', /github/);
  assert.match(gap?.message ?? '', /@@agentDefsL1 conteudo \/declarations/);
  assert.match(gap?.message ?? '', /@@agentMaterializeL1/);
  assert.match(gap?.message ?? '', /l1\/conteudo\/layer_1_external\/connections\/github\.defs\.ts/);
  assert.doesNotMatch(gap?.message ?? '', /l1_d1_/);
  assert.doesNotMatch(gap?.message ?? '', /capacity/);
  assert.doesNotMatch(gap?.message ?? '', /declare num irmão/);
  const explained = explainD2ExternalCall({
    entityId: 'ContentFile', operation: 'update', entity, connections, journeys, catalogText: '', unresolved: gap,
  });
  assert.equal(explained.ask, null);
  assert.equal(explained.gap, 'ownNotGenerated');
});

void test('a sibling without a generated declaration is a distinct refusal', async () => {
  const read = async (ref: string): Promise<string | null> => {
    if (ref.endsWith('/l4/organization/registry.defs.ts')) return registry(['conteudo', 'repoHost']);
    if (ref.endsWith('/l4/repoHost/integration.defs.ts')) return integration('github');
    return null;
  };
  const loaded = await externalCatalogTexts(entities, { project: 102047, moduleName: 'conteudo', read });
  assert.equal(loaded.unresolved.github?.kind, 'siblingNotGenerated');
  assert.match(loaded.unresolved.github?.message ?? '', /repoHost/);
  assert.equal(explainD2ExternalCall({
    entityId: 'ContentFile', operation: 'update', entity, connections, journeys, catalogText: '', unresolved: loaded.unresolved.github,
  }).gap, 'siblingNotGenerated');
});
