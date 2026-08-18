/// <mls fileReference="_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ImPlaygroundGateInputs,
  playgroundIntegrityIssues,
  regeneratedPageIssues,
  runImPlaygroundGate,
} from '/_102020_/l2/aura/molecules/agentImproveMolecule2/steps/i5-playground/gate.js';
import { pageHasStateWidget } from '/_102020_/l2/aura/molecules/shared/moleculeTemplates.js';
import { ImSurfaceDiff, slotIsExercised } from '/_102020_/l2/aura/molecules/agentImproveMolecule2/helpers/imSurface.js';

const NO_DIFF: ImSurfaceDiff = {
  addedSlots: [], removedSlots: [], addedProperties: [], removedProperties: [],
  addedEvents: [], removedEvents: [], changed: false,
};

const PAGE = `<div class="p-6">
  <aura--molecules--playground--widget-playground-state-102020 state='playgroundDinamicState'></aura--molecules--playground--widget-playground-state-102020>
  <groupviewtable--ml-data-table>
    <Caption>Customers</Caption>
  </groupviewtable--ml-data-table>
</div>`;

function inputs(over: Partial<ImPlaygroundGateInputs> = {}): ImPlaygroundGateInputs {
  return {
    shouldChange: true,
    playgroundChanged: true,
    before: PAGE,
    after: PAGE,
    tag: 'groupviewtable--ml-data-table',
    diff: NO_DIFF,
    ...over,
  };
}

test('a no-op run that wrote nothing passes', () => {
  assert.deepEqual(runImPlaygroundGate(inputs({ shouldChange: false, playgroundChanged: false })), { ok: true, errors: [] });
});

test('a no-op run that REWROTE the page is refused', () => {
  // It produces a diff the user has to review and claims work that was not needed.
  const result = runImPlaygroundGate(inputs({ shouldChange: false, playgroundChanged: true }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^should_be_noop: /);
});

test('a moved surface with an untouched page is refused', () => {
  const result = runImPlaygroundGate(inputs({ playgroundChanged: false }));
  assert.match(result.errors[0], /^not_updated: /);
});

test('THE 2026-08-05 CHECK: an added slot that no example uses is refused', () => {
  const diff = { ...NO_DIFF, addedSlots: ['Detail'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff }));
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^slot_missing: /);
  assert.match(result.errors[0], /Detail/);
});

test('an added slot that the page exercises passes, in either spelling', () => {
  const diff = { ...NO_DIFF, addedSlots: ['Detail'], changed: true };
  const asAttribute = PAGE.replace('</groupviewtable--ml-data-table>', '<Detail>x</Detail></groupviewtable--ml-data-table>');
  assert.equal(runImPlaygroundGate(inputs({ diff, after: asAttribute })).ok, true);

  const asElement = PAGE.replace('</groupviewtable--ml-data-table>', '<Detail>x</Detail></groupviewtable--ml-data-table>');
  assert.equal(runImPlaygroundGate(inputs({ diff, after: asElement })).ok, true);
});

test('THE DELTA RULE: a slot the page NEVER exercised does not block', () => {
  // Pre-existing debt. i7 reports it; refusing here would freeze the agent on a playground nobody
  // asked to repair.
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: PAGE.replace('Customers', 'Clients') }));
  assert.equal(result.ok, true);
});

test('removing the state widget is refused — every binding depends on it', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const after = PAGE.replace(/<aura--molecules--playground[\s\S]*?<\/aura--molecules--playground--widget-playground-state-102020>/, '');
  const result = runImPlaygroundGate(inputs({ diff, after }));
  assert.ok(result.errors.some(e => /^state_widget: /.test(e)));
});

test('a page that stops instantiating the molecule is refused', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: '<div class="p-6">nothing here</div>' }));
  assert.ok(result.errors.some(e => /^tag_missing: /.test(e)));
});

test('a full HTML document is refused — the playground is a fragment', () => {
  const diff = { ...NO_DIFF, addedProperties: ['dense'], changed: true };
  const result = runImPlaygroundGate(inputs({ diff, after: `<html><body>${PAGE}</body></html>` }));
  assert.ok(result.errors.some(e => /^document: /.test(e)));
});

test('a binding to a property the molecule no longer has is refused', () => {
  const diff = { ...NO_DIFF, removedProperties: ['pageSize'], changed: true };
  const after = PAGE.replace('<groupviewtable--ml-data-table>', '<groupviewtable--ml-data-table page-size="{{playground.ex1.pageSize}}">');
  const result = runImPlaygroundGate(inputs({ diff, after }));
  assert.ok(result.errors.some(e => /^binding_stale: /.test(e)));
});

test('slotIsExercised accepts both spellings and rejects a mere mention', () => {
  assert.equal(slotIsExercised('<Detail>x</Detail>', 'Detail'), true);
  assert.equal(slotIsExercised('<Detail>x</Detail>', 'Detail'), true);
  assert.equal(slotIsExercised('<!-- the Detail slot goes here -->', 'Detail'), false);
});

// ---- slot como atributo, e a regra do delta (2026-08-18) ----

const DIFF_DETAIL: ImSurfaceDiff = { ...NO_DIFF, addedSlots: ['Detail'] };

test('o slot escrito como ATRIBUTO pela edição é recusado', () => {
  const after = PAGE.replace('</groupviewtable--ml-data-table>', '<div slot="Detail">x</div></groupviewtable--ml-data-table>');
  const result = runImPlaygroundGate(inputs({ after, diff: DIFF_DETAIL }));
  assert.ok(result.errors.some(e => /^slot_as_attribute: /.test(e)));
});

test('THE DELTA RULE: a forma errada que a página JÁ tinha não bloqueia', () => {
  // Travar em dívida pré-existente congelaria o agente numa página que ninguém pediu para consertar.
  // Só o que a edição introduziu conta.
  const before = PAGE.replace('</groupviewtable--ml-data-table>', '<div slot="Legado">x</div></groupviewtable--ml-data-table>');
  const after = before.replace('</groupviewtable--ml-data-table>', '<Detail>y</Detail></groupviewtable--ml-data-table>');
  const result = runImPlaygroundGate(inputs({ before, after, diff: DIFF_DETAIL }));
  assert.equal(result.errors.some(e => /^slot_as_attribute: /.test(e)), false);
});

test('slotIsExercised só aceita a TAG — era ela que cegava todos os gates', () => {
  assert.equal(slotIsExercised('<x><Detail>y</Detail></x>', 'Detail'), true);
  assert.equal(slotIsExercised('<x><div slot="Detail">y</div></x>', 'Detail'), false);
});

// ---- a precondição da rota E: só página quebrada é regenerada (2026-08-18) ----

test('uma página ÍNTEGRA não tem o que regenerar', () => {
  // "Gere novamente o playground" é destrutivo por natureza: a página carrega exemplos autorados.
  // O pedido não decide; estas invariantes decidem.
  assert.deepEqual(playgroundIntegrityIssues(PAGE, 'groupviewtable--ml-data-table'), []);
});

test('a página que o teste real produziu — <h1>teste</h1> — é regenerável', () => {
  const issues = playgroundIntegrityIssues('<h1>teste</h1>', 'groupviewtable--ml-data-table');
  assert.ok(issues.length >= 2);
  assert.ok(issues.some(i => /does not instantiate/.test(i)));
  assert.ok(issues.some(i => /state widget/.test(i)));
});

test('página vazia, e a razão é uma só', () => {
  assert.deepEqual(playgroundIntegrityIssues('   ', 'x--y'), ['the page is empty']);
});

test('slot como atributo conta como quebrada — renderiza vazio', () => {
  const page = PAGE.replace('<Caption>Customers</Caption>', '<div slot="Caption">Customers</div>');
  assert.ok(playgroundIntegrityIssues(page, 'groupviewtable--ml-data-table').some(i => /renders empty/.test(i)));
});

test('documento completo conta como quebrada — o playground é fragmento', () => {
  assert.ok(playgroundIntegrityIssues('<!DOCTYPE html><html><body>' + PAGE + '</body></html>', 'groupviewtable--ml-data-table')
    .some(i => /full HTML document/.test(i)));
});

// ---- a página regenerada, e o que o primeiro run da rota E entregou (2026-08-18) ----

/** A forma TRUNCADA, que não é elemento registrado. Foi o que o run gerou, e o gate aprovou. */
const TRUNCADO = "<widget-playground-state-102020 value='{}'></widget-playground-state-102020>";

test('o widget é conferido como TAG: a forma truncada não conta', () => {
  // O defeito de medição: a constante era o sufixo e o teste era `includes`, então o truncado passava.
  // 398 páginas nos seis projetos usam a tag registrada, 8 a truncada — 5 delas saíram do NM2.
  assert.equal(pageHasStateWidget(PAGE), true);
  assert.equal(pageHasStateWidget(TRUNCADO), false);
  assert.equal(pageHasStateWidget(''), false);
});

test('integridade: a tag truncada do widget torna a página regenerável', () => {
  const html = `<div>${TRUNCADO}<groupviewtable--ml-data-table></groupviewtable--ml-data-table></div>`;
  const razoes = playgroundIntegrityIssues(html, 'groupviewtable--ml-data-table');
  assert.equal(razoes.length, 1);
  assert.match(razoes[0], /state widget/);
});

test('A PÁGINA QUE O PRIMEIRO RUN DA ROTA E ESCREVEU é recusada, pelos quatro motivos', () => {
  // Medida contra a real: 2.1KB contra os 21KB da referência da biblioteca, 4 instâncias, 4 chaves de
  // exemplo, widget truncado e ZERO estado — 20 bindings vivos sem nada atrás. Todo check do gate
  // passou, porque todos eram do DELTA de uma edição, e regeneração não tem delta.
  const html = [
    TRUNCADO,
    '<div class="playground-card"><grouptriggeraction--ml-copy-button size="{{playground.default.size}}"><Label>Copiar</Label></grouptriggeraction--ml-copy-button></div>',
    '<div class="playground-card"><grouptriggeraction--ml-copy-button disabled="{{playground.disabled.disabled}}"><Label>Indisponível</Label></grouptriggeraction--ml-copy-button></div>',
  ].join('\n');
  const erros = regeneratedPageIssues(html, 'grouptriggeraction--ml-copy-button', []);
  const codigos = erros.map(e => e.split(':')[0]);
  assert.deepEqual(codigos.sort(), ['examples_count', 'state_binding', 'state_placeholder', 'state_widget_missing', 'tag_uses'].sort());
});

test('a rota E entra no gate e recusa a página pobre; a mesma página sem rota E passa', () => {
  const pobre = `${TRUNCADO}\n<grouptriggeraction--ml-copy-button></grouptriggeraction--ml-copy-button>`;
  const comRotaE = runImPlaygroundGate(inputs({
    before: '<h1>teste</h1>', after: pobre, tag: 'grouptriggeraction--ml-copy-button', regenerate: true, examples: [],
  }));
  assert.equal(comRotaE.ok, false);
  assert.ok(comRotaE.errors.some(e => /^state_widget_missing: /.test(e)));

  // Sem rota E as mesmas regras não valem — a página herdada não é culpa desta execução, e é a regra
  // do delta que já governava este gate.
  const semRotaE = runImPlaygroundGate(inputs({
    before: '<h1>teste</h1>', after: pobre, tag: 'grouptriggeraction--ml-copy-button',
  }));
  assert.equal(semRotaE.ok, true);
});

test('uma página regenerada COMPLETA passa', () => {
  const seis = ['basic', 'disabled', 'loading', 'iconOnly', 'longLabel', 'small'];
  const cards = seis.map(chave =>
    `<div><h3>${chave}</h3><grouptriggeraction--ml-copy-button size="{{playground.${chave}.size}}"><Label>Copiar</Label></grouptriggeraction--ml-copy-button></div>`,
  ).join('\n');
  const html = `<div class="p-6"><header><h1>ml-copy-button</h1></header>\n${PAGE.split('\n')[1]}\n${cards}</div>`;
  const examples = seis.map(chave => ({ name: chave, state: [{ stateName: `playground.${chave}.size`, value: '"medium"' }] }));
  assert.deepEqual(regeneratedPageIssues(html, 'grouptriggeraction--ml-copy-button', examples), []);
});

test('regeneração: estado inventado à mão é recusado — o token tem de sobreviver ao gate', () => {
  // O estado é montado por código a partir de `examples` (substituteDemoState), depois do gate. Uma
  // página que já traz o objeto de estado pronto perdeu o token, e um objeto malformado é descartado
  // em silêncio: o binding renderiza vazio e ninguém percebe.
  const seis = ['a', 'b', 'c', 'd', 'e', 'f'];
  const cards = seis.map(k => `<grouptriggeraction--ml-copy-button size="{{playground.${k}.size}}"></grouptriggeraction--ml-copy-button>`).join('\n');
  const html = `<aura--molecules--playground--widget-playground-state-102020 state='{"playground":{}}'></aura--molecules--playground--widget-playground-state-102020>\n${cards}`;
  const erros = regeneratedPageIssues(html, 'grouptriggeraction--ml-copy-button', seis.map(k => ({ name: k, state: [{ stateName: `playground.${k}.size`, value: '"medium"' }] })));
  assert.equal(erros.length, 1);
  assert.match(erros[0], /^state_placeholder: /);
});
