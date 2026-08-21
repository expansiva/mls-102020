/// <mls fileReference="_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.test.ts" enhancement="_blank"/>

// The sheet is copied verbatim, so there is exactly one thing that can go wrong and one thing
// that can go wrong silently: the scope (the root selector must BE the copy's tag) and the
// source in the flattened path (the shell's sheet, never the parent's).

import test from 'node:test';
import assert from 'node:assert/strict';
import type { CopyItem } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cContext.js';
import { renderCopiedLess } from '/_102020_/l2/aura/molecules/agentCopyMolecule/helpers/cTemplates.js';
import { C_LESS_NON_BLOCKING, runLessGate } from '/_102020_/l2/aura/molecules/agentCopyMolecule/steps/c4-less/gate.js';

const DEST = 102053;

const ORIGIN_LESS = `/// <mls fileReference="_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner.less" enhancement="_102020_/l2/enhancementStyleAura" />

groupshowprogress--ml-indeterminate-spinner {
  display: block;
  .ml-spinner { animation: spin 1s linear infinite; }
}
`;

function item(overrides: Partial<CopyItem> = {}): CopyItem {
  return {
    origin: {
      ref: '_102040_/l2/molecules/groupshowprogress/ml-indeterminate-spinner',
      project: 102040,
      group: 'groupshowprogress',
      shortName: 'ml-indeterminate-spinner',
      tag: 'groupshowprogress--ml-indeterminate-spinner',
      className: 'IndeterminateSpinnerMolecule',
      chain: { isShell: false },
    },
    destination: {
      group: 'groupshowprogress',
      files: {
        ts: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.ts',
        defs: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.defs.ts',
        less: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.less',
        html: 'l2/molecules/groupshowprogress/ml-indeterminate-spinner.html',
      },
    },
    collision: null,
    rename: null,
    skip: false,
    ...overrides,
  };
}

test('a folha que o renderer produz passa limpa', () => {
  const target = item();
  assert.deepEqual(runLessGate({ item: target, destProject: DEST, writtenLess: renderCopiedLess(target, ORIGIN_LESS, DEST), sourceIsShellSheet: true }), []);
});

test('folha vazia para na primeira queixa', () => {
  const issues = runLessGate({ item: item(), destProject: DEST, writtenLess: '', sourceIsShellSheet: true });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'less_empty');
});

test('header do .less com o projeto errado é pego', () => {
  const target = item();
  const wrong = renderCopiedLess(target, ORIGIN_LESS, 999999);
  assert.ok(runLessGate({ item: target, destProject: DEST, writtenLess: wrong, sourceIsShellSheet: true }).some(issue => issue.code === 'less_header'));
});

test('seletor raiz que não é a tag da cópia é pego, e a mensagem mostra o que achou', () => {
  const target = item();
  const wrongScope = renderCopiedLess(target, ORIGIN_LESS, DEST).replace('groupshowprogress--ml-indeterminate-spinner {', 'outra--tag {');
  const issues = runLessGate({ item: target, destProject: DEST, writtenLess: wrongScope, sourceIsShellSheet: true });
  const scope = issues.find(issue => issue.code === 'less_scope');
  assert.ok(scope);
  assert.match(String(scope?.message), /outra--tag/);
});

test('renomeado: re-escopado passa, e a tag antiga sobrando é pega', () => {
  const target = item({ rename: 'ml-indeterminate-spinner-app' });
  const rescoped = renderCopiedLess(target, ORIGIN_LESS, DEST);
  assert.deepEqual(runLessGate({ item: target, destProject: DEST, writtenLess: rescoped, sourceIsShellSheet: true }), []);

  const leftover = `${rescoped}\ngroupshowprogress--ml-indeterminate-spinner { color: red; }`;
  assert.ok(runLessGate({ item: target, destProject: DEST, writtenLess: leftover, sourceIsShellSheet: true }).some(issue => issue.code === 'less_old_tag'));
});

test('casca: folha vinda do PAI é barrada — desfaria o tema que o cliente escolheu', () => {
  const shell = item({ origin: { ...item().origin, chain: { isShell: true, parentRef: '_102040_/l2/molecules/g/ml-p' } } });
  const written = renderCopiedLess(shell, ORIGIN_LESS, DEST);
  const issues = runLessGate({ item: shell, destProject: DEST, writtenLess: written, sourceIsShellSheet: false });
  const fromParent = issues.find(issue => issue.code === 'less_from_parent');
  assert.ok(fromParent);
  assert.match(String(fromParent?.message), /CASCA/);
  // com a folha da casca, passa
  assert.ok(!runLessGate({ item: shell, destProject: DEST, writtenLess: written, sourceIsShellSheet: true }).some(issue => issue.code === 'less_from_parent'));
});

test('seletor raiz com pseudo/classe ainda conta como escopo certo', () => {
  const target = item();
  const withPseudo = renderCopiedLess(target, ORIGIN_LESS, DEST)
    .replace('groupshowprogress--ml-indeterminate-spinner {', 'groupshowprogress--ml-indeterminate-spinner:hover {');
  assert.deepEqual(runLessGate({ item: target, destProject: DEST, writtenLess: withPseudo, sourceIsShellSheet: true }), []);
});

// Regressão do T5 (Studio, 2026-08-20): a folha de uma molécula PORTAL tem seletor raiz composto
// (`tag, div[data-widget="tag"]`) e era rejeitada pelo gate, mesmo estando correta.
const PORTAL_LESS = `/// <mls fileReference="_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker.less" enhancement="_102020_/l2/enhancementStyleAura"/>

groupenterdatetime--ml-datetime-picker,
div[data-widget="groupenterdatetime--ml-datetime-picker"] {
  .ml-label { color: red; }
}
`;

function portalItem(rename: string | null = null): CopyItem {
  return item({
    origin: {
      ref: '_102040_/l2/molecules/groupenterdatetime/ml-datetime-picker',
      project: 102040,
      group: 'groupenterdatetime',
      shortName: 'ml-datetime-picker',
      tag: 'groupenterdatetime--ml-datetime-picker',
      className: 'DatetimePickerMolecule',
      chain: { isShell: false },
    },
    destination: {
      group: 'groupenterdatetime',
      files: {
        ts: 'l2/molecules/groupenterdatetime/ml-datetime-picker.ts',
        defs: 'l2/molecules/groupenterdatetime/ml-datetime-picker.defs.ts',
        less: 'l2/molecules/groupenterdatetime/ml-datetime-picker.less',
        html: 'l2/molecules/groupenterdatetime/ml-datetime-picker.html',
      },
    },
    rename,
  });
}

test('molécula portal: folha com seletor raiz composto passa (regressão T5)', () => {
  const target = portalItem();
  const written = renderCopiedLess(target, PORTAL_LESS, DEST);
  assert.deepEqual(runLessGate({ item: target, destProject: DEST, writtenLess: written, sourceIsShellSheet: true }), []);
});

test('molécula portal renomeada: as DUAS formas do escopo são re-escopadas', () => {
  const target = portalItem('ml-datetime-picker-app');
  const written = renderCopiedLess(target, PORTAL_LESS, DEST);
  assert.deepEqual(runLessGate({ item: target, destProject: DEST, writtenLess: written, sourceIsShellSheet: true }), []);
  assert.match(written, /div\[data-widget="groupenterdatetime--ml-datetime-picker-app"\]/);
});

// Regressão do Studio (2026-08-20): 1 das 154 moléculas da base tem `.less` só com header
// (groupviewtable/ml-data-table). Tratar isso como erro de escopo abortou a cópia de um grupo de 12
// DEPOIS de o c3 já ter escrito 24 arquivos.
const HEADER_ONLY_LESS = `/// <mls fileReference="_102040_/l2/molecules/groupviewtable/ml-data-table.less" enhancement="_102020_/l2/enhancementStyleAura"/>
`;

test('folha só com header: informativa, não bloqueia, e o escopo não é checado', () => {
  const target = item();
  const written = renderCopiedLess(target, HEADER_ONLY_LESS, DEST);
  const issues = runLessGate({ item: target, destProject: DEST, writtenLess: written, sourceIsShellSheet: true });
  assert.equal(issues.length, 1);
  assert.equal(issues[0].code, 'less_no_rules');
  assert.ok(C_LESS_NON_BLOCKING.includes(issues[0].code), 'less_no_rules tem de ser não-bloqueante');
  assert.ok(!issues.some(issue => issue.code === 'less_scope'), 'sem regras não há escopo a conferir');
});

test('folha só com header numa casca: nem less_scope nem less_from_parent atrapalham', () => {
  const shell = item({ origin: { ...item().origin, chain: { isShell: true, parentRef: '_102040_/l2/molecules/g/ml-p' } } });
  const written = renderCopiedLess(shell, HEADER_ONLY_LESS, DEST);
  const issues = runLessGate({ item: shell, destProject: DEST, writtenLess: written, sourceIsShellSheet: true });
  assert.deepEqual(issues.map(issue => issue.code), ['less_no_rules']);
});
