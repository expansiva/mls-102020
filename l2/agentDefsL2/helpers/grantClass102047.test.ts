import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { grantShowsPath } from '/_102020_/l2/helpers/defsInput/grantDisclosure.js';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures/denied102047');

type Disclosure = { mode: string; allowedFields?: readonly string[]; deniedFields?: readonly string[] };
type Grant = { grantId: string; entityRefs: string[]; disclosure: Disclosure };
type FieldNode = { fields?: Record<string, FieldNode> };

const MODULES = ['compras', 'financeiro', 'manutencaoFrota', 'ordenServicio', 'hiringPipeline'] as const;

function readFixture(name: string): string {
  return readFileSync(join(fixtureDir, name), 'utf8');
}

function artifact(text: string): { grants: Grant[] } {
  const start = text.indexOf('= {');
  const end = text.lastIndexOf('} as const');
  return JSON.parse(text.slice(start + 2, end + 1));
}

function entityOf(text: string): { entityId: string; record: { fields: Record<string, FieldNode> } } {
  return artifact(text) as never;
}

function covers(item: string, path: string): boolean {
  return item === path || path.startsWith(`${item}.`);
}

function leafPaths(fields: Record<string, FieldNode>, prefix: string): string[] {
  const paths: string[] = [];
  for (const [name, node] of Object.entries(fields)) {
    const path = `${prefix}.${name}`;
    if (node.fields) paths.push(...leafPaths(node.fields, path));
    else paths.push(path);
  }
  return paths;
}

function firstFieldNotDenied(entityId: string, fields: Record<string, FieldNode>, disclosure: Disclosure): string {
  const denied = disclosure.deniedFields ?? [];
  const allowed = disclosure.allowedFields ?? [];
  const found = leafPaths(fields, entityId).find(path => {
    if (denied.some(item => covers(item, path))) return false;
    if (allowed.length > 0 && !allowed.some(item => covers(item, path))) return false;
    return true;
  });
  if (!found) throw new Error(`nenhum campo visível em ${entityId}`);
  return found;
}

test('fieldsOnly com deniedFields esconde o negado e mostra um campo da ontologia', () => {
  const names = readdirSync(fixtureDir).filter(name => name.endsWith('__access.defs.ts.txt'));
  assert.deepEqual(names.map(name => name.slice(0, name.indexOf('__'))).sort(), [...MODULES].sort());

  const hits: { moduleName: string; grantId: string; shown: string[] }[] = [];
  for (const moduleName of MODULES) {
    const { grants } = artifact(readFixture(`${moduleName}__access.defs.ts.txt`));
    for (const grant of grants) {
      const denied = grant.disclosure.deniedFields ?? [];
      if (grant.disclosure.mode !== 'fieldsOnly' || denied.length === 0) continue;
      const entities = [...new Set(denied.map(path => path.slice(0, path.indexOf('.'))))];
      const shown: string[] = [];
      for (const entityId of entities) {
        const ontology = entityOf(readFixture(`${moduleName}__${entityId}.defs.ts.txt`));
        assert.equal(ontology.entityId, entityId);
        const path = firstFieldNotDenied(entityId, ontology.record.fields, grant.disclosure);
        assert.equal(grantShowsPath(grant.disclosure, path), true, `${grant.grantId} mostra ${path}`);
        shown.push(path);
      }
      for (const path of denied) {
        assert.equal(grantShowsPath(grant.disclosure, path), false, `${grant.grantId} esconde ${path}`);
      }
      hits.push({ moduleName, grantId: grant.grantId, shown });
    }
  }

  assert.deepEqual(hits.map(hit => `${hit.moduleName}:${hit.grantId}`), [
    'compras:almoxarifePedidosRecebimento',
    'financeiro:pagadorMeusTitulos',
    'financeiro:pagadorMeusRecebimentos',
    'manutencaoFrota:motoristaVeiculosAtribuidos',
    'ordenServicio:recepcionistaOrdenes',
    'ordenServicio:clienteMisOrdenes',
    'hiringPipeline:managerCandidates',
  ]);
  assert.equal(hits.length, 7);
  assert.deepEqual(
    Object.fromEntries(MODULES.map(name => [name, hits.filter(hit => hit.moduleName === name).length])),
    { compras: 1, financeiro: 2, manutencaoFrota: 1, ordenServicio: 2, hiringPipeline: 1 },
  );
});
