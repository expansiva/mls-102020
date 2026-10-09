/// <mls fileReference="_102020_/l2/agentMaterializeL2/helpers/l4/context.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import test from 'node:test';
import type { Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { parseL2Contract } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import { parseL2Shared } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { l4RefsOf, parseL4Literal, readL4Module, renderL4Slice, resolveL4Refs, sliceL4ForPage, type L4Port } from '/_102020_/l2/agentMaterializeL2/helpers/l4/context.js';

const root = new URL('../../../../../mls-102047/', import.meta.url);
const path = (info: Ns5FileInfo) => new URL(`l${info.level}/${info.folder}/${info.shortName}${info.extension}`, root);
/** The real files of mls-102047 on disk, as the Studio port would serve them. */
const diskPort: L4Port = {
  listDefs: (_project, folder) => { const dir = new URL(`l4/${folder}/`, root); return existsSync(dir) ? readdirSync(dir).filter(name => name.endsWith('.defs.ts')).map(name => name.slice(0, -'.defs.ts'.length)) : []; },
  exists: info => existsSync(path(info)),
  read: async info => readFileSync(path(info), 'utf8'),
};
const l2 = (module: string, kind: 'contracts' | 'shared', pageId: string) => readFileSync(new URL(`l2/${module}/web/${kind}/${pageId}.defs.ts`, root), 'utf8');

test('parseL4Literal reads the JSON literal of an L4 defs file', () => {
  assert.deepEqual(parseL4Literal("import type { X } from 'y';\n\nexport const m = {\n  \"a\": [1]\n} as const satisfies X;\n"), { a: [1] });
  assert.equal(parseL4Literal('export const m = 1;'), null);
});

test('comandaRestaurante: module, ontology with field titles, rules, journeys and actors', async () => {
  const l4 = await readL4Module(102047, 'comandaRestaurante', diskPort);
  assert.deepEqual(l4.module.productLanguages, ['pt-BR']);
  assert.deepEqual(l4.entities.map(item => item.entityId).sort(), ['Comanda', 'ItemCardapio', 'ItemComanda', 'Mesa']);
  const mesa = l4.entities.find(item => item.entityId === 'Mesa')!;
  assert.equal(mesa.displayField, 'code');
  assert.equal(mesa.fields.find(field => field.path === 'code')?.title, 'Código da mesa');
  assert.equal(mesa.fields.find(field => field.path === 'details.disponivel')?.derived, true);
  assert.ok(l4.rules.mesaDisponivelParaAbrirComanda);
  assert.deepEqual(l4.journeys.map(item => item.journeyId).sort(), ['abrirComanda', 'cancelarItemComanda', 'fecharComanda', 'lancarItemComanda']);
  assert.deepEqual(l4.actors.map(item => item.actorId).sort(), ['caixa', 'garcom']);
});

test('the slice of a page holds only what it references', async () => {
  const l4 = await readL4Module(102047, 'comandaRestaurante', diskPort);
  const slice = (pageId: string) => sliceL4ForPage(l4, parseL2Contract(l2('comandaRestaurante', 'contracts', pageId)).definition, parseL2Shared(l2('comandaRestaurante', 'shared', pageId)).definition);
  const mesas = slice('mesas');
  assert.deepEqual(mesas.entities.map(item => item.entityId), ['Mesa'], 'mesas writes Mesa and names MesaResumo');
  assert.deepEqual(mesas.actors.map(item => item.actorId), ['caixa']);
  assert.deepEqual(mesas.journeys, [], 'mesas declares no journey');
  assert.ok(Object.keys(mesas.rules).includes('mesaDisponivelParaAbrirComanda'), 'the rules of the entity it shows');
  const fechamento = slice('fechamento');
  assert.ok(fechamento.journeys.some(item => item.journeyId === 'fecharComanda'));
  assert.ok(fechamento.entities.some(item => item.entityId === 'Comanda'));
  const text = renderL4Slice(fechamento);
  assert.match(text, /## Entities \(meaning and field titles\)/u);
  assert.match(text, /## Journeys/u);
  assert.ok(!/ItemCardapio\*\*/u.test(renderL4Slice(mesas)), 'an unreferenced entity stays out');
});

test('a page that names no entity gets every entity by meaning only; the refs rebuild the same slice', async () => {
  const l4 = await readL4Module(102047, 'comandaRestaurante', diskPort);
  const slice = (pageId: string) => sliceL4ForPage(l4, parseL2Contract(l2('comandaRestaurante', 'contracts', pageId)).definition, parseL2Shared(l2('comandaRestaurante', 'shared', pageId)).definition);
  const inicio = slice('inicio');
  assert.equal(inicio.wide, true);
  assert.match(renderL4Slice(inicio), /meaning only/u);
  assert.ok(!/Código da mesa/u.test(renderL4Slice(inicio)), 'no field list when wide');
  const mesas = slice('mesas');
  assert.equal(mesas.wide, false);
  assert.ok(!renderL4Slice(mesas).includes('`version`'), 'a field without title is left out');
  assert.equal(renderL4Slice(resolveL4Refs(l4, l4RefsOf(mesas))), renderL4Slice(mesas));
});

test('a module with no L4 gives an empty context, never a failure', async () => {
  const l4 = await readL4Module(102047, 'naoExiste', diskPort);
  assert.deepEqual(l4.entities, []);
  assert.deepEqual(l4.module.productLanguages, []);
});
