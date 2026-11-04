/// <mls fileReference="_102020_/l2/aura/services/preview/previewTextEditor.test.ts" enhancement="_blank" />
// Swapping one molecule for another in the page source — the write behind the genome's molecule knob.
//
// THE DEFECT THIS PINS DOWN: it used to search only the FIRST html`` template of `render()`. The
// generated pages split the screen into helper methods — the 102047's ticketCatalogue has 25
// templates and `render()` holds only the dispatcher — so a molecule anywhere else was not found and
// the knob answered "could not replace the molecule in the source" for a tag sitting right there.
import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyTextEdit,
  dynamicEditNotice,
  findAllI18nMatches,
  findTextOrigin,
  findTextOriginByKey,
  findTextOriginByOccurrence,
  replaceComponentTag,
} from '/_102020_/l2/aura/services/preview/previewTextEditor.js';
import { installMlsStub } from '../../../../../test/mlsStub.js';

// The import half of the swap resolves a TAG to a FILE (`resolveTagToFile`), so the stor has to know
// the two molecules — without them that branch is skipped and the tests below would pass while
// saying nothing about it.
installMlsStub({
  actualProject: 102040,
  files: {
    'ml-button-standard': { project: 102040, level: 2, folder: 'molecules/grouptriggeraction', shortName: 'ml-button-standard', extension: '.ts' },
    'ml-icon-button': { project: 102040, level: 2, folder: 'molecules/grouptriggeraction', shortName: 'ml-icon-button', extension: '.ts' },
  },
});

const OLD = 'grouptriggeraction--ml-button-standard';
const NEW = 'grouptriggeraction--ml-icon-button';
const OLD_IMPORT = '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';
const NEW_IMPORT = '/_102040_/l2/molecules/grouptriggeraction/ml-icon-button.js';

/** The shape the generator emits: a `render()` that dispatches, and the screen in helper methods. */
function page(bodies: string[], imports = `import '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js';\n`): string {
  return [
    '/// <mls fileReference="_102047_/l2/m/web/desktop/page11/x.ts" enhancement="_blank" />',
    "import { html } from 'lit';",
    imports,
    'class X {',
    '  render() {',
    '    return html`<div class="shell">${this.renderScenaryBase()}</div>`;',
    '  }',
    ...bodies.flatMap((body, index) => [
      `  renderScenary${index}() {`,
      `    return html\`${body}\`;`,
      '  }',
    ]),
    '}',
    '',
  ].join('\n');
}

test('a molecule in a HELPER method is found and swapped', () => {
  const source = page([`<section><${OLD} data-variant="primary" @action=\${this.go}><Label>x</Label></${OLD}></section>`]);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'selected');

  assert.equal(result.success, true, result.error);
  assert.match(result.newSource!, new RegExp(`<${NEW} data-variant="primary" @action=\\$\\{this\\.go\\}>`, 'u'));
  assert.match(result.newSource!, new RegExp(`</${NEW}>`, 'u'));
  assert.equal(result.newSource!.includes(OLD + ' '), false, 'no open tag of the old one is left');
});

test('everything the element carries survives — only the NAME changes', () => {
  const inner = `<${OLD} data-class="w-full mt-4" ?disabled=\${!this.id || this.s === 'loading'} @action=\${() => { if (a > b) this.go(); }}><Icon><svg class="h-4"></svg></Icon><Label>\${msg['common.refresh']}</Label></${OLD}>`;
  const source = page([`<div>${inner}</div>`]);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'selected');

  assert.equal(result.success, true, result.error);
  // Byte for byte, the element with a different tag name on each side and nothing else touched.
  assert.ok(result.newSource!.includes(inner.split(OLD).join(NEW)));
});

test('the occurrence decides WHICH one, across different helper methods', () => {
  const source = page([
    `<div><${OLD}><Label>um</Label></${OLD}></div>`,
    `<div><${OLD}><Label>dois</Label></${OLD}></div>`,
    `<div><${OLD}><Label>tres</Label></${OLD}></div>`,
  ]);

  const second = replaceComponentTag(OLD, NEW, source, `${OLD}:nth-of-type(2)`, 'selected');
  assert.equal(second.success, true, second.error);
  assert.match(second.newSource!, new RegExp(`<${NEW}><Label>dois`, 'u'));
  assert.match(second.newSource!, new RegExp(`<${OLD}><Label>um`, 'u'), 'the others are untouched');
  assert.match(second.newSource!, new RegExp(`<${OLD}><Label>tres`, 'u'));

  // No selector: the first one, which is what the old contract did.
  const first = replaceComponentTag(OLD, NEW, source, undefined, 'selected');
  assert.match(first.newSource!, new RegExp(`<${NEW}><Label>um`, 'u'));
});

test('mode "all" swaps every occurrence, wherever it lives', () => {
  const source = page([
    `<div><${OLD}><Label>um</Label></${OLD}></div>`,
    `<div><${OLD}><Label>dois</Label></${OLD}></div>`,
  ]);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'all');
  assert.equal(result.success, true, result.error);
  assert.equal(result.newSource!.includes(OLD), false, 'not one is left');
  // Two opens and two closes. The import line is not counted here: it carries the module PATH
  // (`…/ml-icon-button.js`), not the tag — a folder and a tag are not the same string, and pretending
  // they are is how a count starts passing for the wrong reason.
  assert.equal(result.newSource!.split(`<${NEW}>`).length - 1, 2, 'two opens');
  assert.equal(result.newSource!.split(`</${NEW}>`).length - 1, 2, 'two closes');
  assert.ok(result.newSource!.includes(`import '${NEW_IMPORT}';`), 'and the import followed');
});

test('the import follows the swap', () => {
  const source = page([`<div><${OLD}><Label>um</Label></${OLD}></div>`]);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'all');
  assert.equal(result.success, true, result.error);
  assert.ok(result.newSource!.includes(`import '${NEW_IMPORT}';`), 'the new import is there');
  // The last one of its kind went away with it.
  assert.equal(result.newSource!.includes('ml-button-standard'), false);
});

test('the import of the old molecule STAYS while another occurrence still uses it', () => {
  const source = page([
    `<div><${OLD}><Label>um</Label></${OLD}></div>`,
    `<div><${OLD}><Label>dois</Label></${OLD}></div>`,
  ]);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'selected');
  assert.equal(result.success, true, result.error);
  assert.match(result.newSource!, /ml-button-standard/u, 'still imported');
  assert.match(result.newSource!, /ml-icon-button/u, 'and the new one too');
});

test('a tag that is nowhere is refused, saying so', () => {
  const source = page(['<div><p>no molecule here</p></div>']);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'selected');
  assert.equal(result.success, false);
  assert.match(result.error!, /not found in any html/u);
});

test('what is not a swap at all is refused before anything is read', () => {
  const source = page([`<div><${OLD}></${OLD}></div>`]);
  assert.equal(replaceComponentTag(OLD, OLD, source).success, false, 'the same tag');
  assert.equal(replaceComponentTag('', NEW, source).success, false, 'no tag');
  assert.equal(replaceComponentTag('button', 'div', source).success, false, 'core elements are not molecules');
});

test('a tag written inside TypeScript is not markup and is not swapped', () => {
  // The whole reason the scanner is used instead of a regex over the file: a name in a string or in a
  // comment is not an element, and rewriting it would corrupt code that happens to mention the tag.
  const source = page([`<div><${OLD}><Label>um</Label></${OLD}></div>`])
    .replace('class X {', `const NOTE = 'render <${OLD}> here';\nclass X {`);
  const result = replaceComponentTag(OLD, NEW, source, undefined, 'selected');
  assert.equal(result.success, true, result.error);
  assert.match(result.newSource!, new RegExp(`const NOTE = 'render <${OLD}> here';`, 'u'), 'the string is intact');
});

// ── The swap was writing in the wrong element (2026-09-28) ─────────────────
//
// THE DEFECT, ONCE: the in-place editor published the element's position among its peers ON SCREEN
// and this function read it as a position among the occurrences IN THE TEXT. The source order
// follows the order the render helpers are DECLARED; the screen order follows the order they are
// COMPOSED. On 102047/consultas `render()` is declared LAST and paints FIRST, so selecting the
// header button (screen 0) rewrote the first button of `renderActions` (text 0) — inside a table,
// off screen, and in silence.
//
// The fixture keeps the real shape of that page: helpers declared first, `render()` last, six
// occurrences of one tag across four methods, one of them inside a `.map()`.
const SWAP_TAG = 'grouptriggeraction--ml-button-standard';
const CONSULTAS_SHAPE = [
  'class Consultas extends PageBase {',
  '  private renderActions(row: ConsultaRow): TemplateResult {',
  '    return html`<div class="detail-actions">'
    + `<${SWAP_TAG} data-variant="danger"><Label>\${m.registerNoShow}</Label></${SWAP_TAG}>`
    + `<${SWAP_TAG} data-variant="ghost"><Label>\${m.confirm}</Label></${SWAP_TAG}>`
    + '</div>`;',
  '  }',
  '  private renderDetail(): TemplateResult {',
  '    return html`<section class="detail-panel">${this.renderActions(row)}'
    + `<${SWAP_TAG} data-variant="secondary"><Label>\${m.editConsultation}</Label></${SWAP_TAG}>`
    + '</section>`;',
  '  }',
  '  private renderForm(update: boolean): TemplateResult {',
  '    return html`<form class="consulta-form">'
    + `<${SWAP_TAG} type="submit"><Label>\${m.save}</Label></${SWAP_TAG}>`
    + `<${SWAP_TAG} data-variant="ghost"><Label>\${m.cancel}</Label></${SWAP_TAG}>`
    + '</form>`;',
  '  }',
  '  render(): TemplateResult {',
  '    return html`<main class="consultas-page"><header class="page-header">'
    + `<${SWAP_TAG} @action=\${() => this.enterCreateConsultaScenario()}><Label>\${m.schedule}</Label></${SWAP_TAG}>`
    + '</header>${this.renderScenes()}</main>`;',
  '  }',
  '}',
].join('\n');

/** Offset of the Nth `<tag` in the text, 0-based — the shape the exact target speaks. */
function openStartOf(source: string, tag: string, nth: number): number {
  let at = -1;
  for (let i = 0; i <= nth; i += 1) at = source.indexOf(`<${tag}`, at + 1);
  return at;
}

test('the fixture has the real mismatch: the button that paints first is the LAST in the text', () => {
  const occurrences = CONSULTAS_SHAPE.split(`<${SWAP_TAG}`).length - 1;
  assert.equal(occurrences, 6, 'six opening tags across four methods');
  // The header one is the last in the text and the first on screen — that is the whole defect.
  const header = openStartOf(CONSULTAS_SHAPE, SWAP_TAG, 5);
  assert.ok(CONSULTAS_SHAPE.slice(header, header + 400).includes('enterCreateConsultaScenario'), 'text 5 is the header button');
});

test('an exact offset rewrites THAT element, and screen order never enters the decision', () => {
  const header = openStartOf(CONSULTAS_SHAPE, SWAP_TAG, 5);
  // The screen position of the header button is 0 — which is what the knob used to send.
  const result = replaceComponentTag(SWAP_TAG, 'groupselectone--ml-select-native', CONSULTAS_SHAPE, SWAP_TAG, 'selected', header);
  assert.equal(result.success, true, result.error);
  const after = result.newSource ?? '';
  // The header button changed...
  assert.match(after, /groupselectone--ml-select-native @action/u);
  // ...and `renderActions`, which the occurrence index used to hit, did not.
  const actions = after.slice(after.indexOf('renderActions'), after.indexOf('renderDetail'));
  assert.equal(actions.includes('groupselectone--ml-select-native'), false, 'the table buttons are untouched');
  assert.equal((after.match(/groupselectone--ml-select-native/gu) ?? []).length, 2, 'open and close of ONE element');
});

test('without the exact offset it still picks by index — the preview route is unchanged', () => {
  const result = replaceComponentTag(SWAP_TAG, 'groupselectone--ml-select-native', CONSULTAS_SHAPE, SWAP_TAG, 'selected');
  assert.equal(result.success, true, result.error);
  // This is the OLD behaviour, kept on purpose for the L3 preview: index 0 of the TEXT.
  const after = result.newSource ?? '';
  const actions = after.slice(after.indexOf('renderActions'), after.indexOf('renderDetail'));
  assert.equal(actions.includes('groupselectone--ml-select-native'), true, 'still the first in the text');
});

test('an offset that names no element is refused, not rounded to the first one', () => {
  const result = replaceComponentTag(SWAP_TAG, 'groupselectone--ml-select-native', CONSULTAS_SHAPE, SWAP_TAG, 'selected', 7);
  assert.equal(result.success, false);
  assert.match(result.error ?? '', /offset 7/u);
});

test('the opening and the closing rewritten are always the same element', () => {
  // A self-closed occurrence FIRST: it has no `</tag>`, so the closing list used to be one shorter
  // than the opening one, and index N meant a different element on each side.
  const source = [
    'class X {',
    '  render() {',
    `    return html\`<div><${SWAP_TAG} data-icon="x" /><${SWAP_TAG}><Label>a</Label></${SWAP_TAG}></div>\`;`,
    '  }',
    '}',
  ].join('\n');
  const second = openStartOf(source, SWAP_TAG, 1);
  const result = replaceComponentTag(SWAP_TAG, 'groupselectone--ml-select-native', source, SWAP_TAG, 'selected', second);
  assert.equal(result.success, true, result.error);
  const after = result.newSource ?? '';
  // The self-closed one keeps its name...
  assert.match(after, new RegExp(`<${SWAP_TAG} data-icon="x" />`, 'u'));
  // ...and the pair that changed opens and closes with the same new name.
  assert.match(after, /<groupselectone--ml-select-native><Label>a<\/Label><\/groupselectone--ml-select-native>/u);
});

// Trecho real de mls-102047 l2/reembolsoDespesas/web/desktop/page11/inicio.ts (catálogo da página).
const INICIO = `
/// **collab_i18n_start**
const pageMessage_pt_br = {
pageTitle: 'Despesas aguardando sua decisão',
pageIntro: 'Veja o que a equipe enviou e escolha por onde começar a análise.',
metricLabel: 'Aguardando decisão',
};
const pageMessage_en_us: typeof pageMessage_pt_br = {
pageTitle: 'Expenses waiting for your decision',
pageIntro: 'See what your team has sent and choose where to start the review.',
metricLabel: 'Awaiting decision',
};
const pageMessage_es_es: typeof pageMessage_pt_br = {
pageTitle: 'Gastos pendientes de tu decisión',
pageIntro: 'Mira lo que envió el equipo y elige por dónde empezar el análisis.',
metricLabel: 'Pendientes de decisión',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = {
'pt-br': pageMessage_pt_br,
'en-us': pageMessage_en_us,
'es-es': pageMessage_es_es,
};
/// **collab_i18n_end**
<p>\${this.msg['pageIntro']}</p>
`;

const PT_INTRO = 'Veja o que a equipe enviou e escolha por onde começar a análise.';
const EN_INTRO = 'See what your team has sent and choose where to start the review.';

function declareEnFirst(source: string): string {
  const ptStart = source.indexOf('const pageMessage_pt_br = {');
  const enStart = source.indexOf('const pageMessage_en_us');
  const esStart = source.indexOf('const pageMessage_es_es');
  if (ptStart < 0 || enStart < 0 || esStart < 0 || !(ptStart < enStart && enStart < esStart)) {
    throw new Error('excerpt lost the pageMessage_pt_br / en_us / es_es order');
  }
  return source.slice(0, ptStart) + source.slice(enStart, esStart) + source.slice(ptStart, enStart) + source.slice(esStart);
}

test('pageIntro do inicio resolve como i18n com pt_br e en_us', () => {
  const origin = findTextOriginByKey('pageIntro', INICIO, 'pt-br');
  assert.equal(origin.type, 'i18n');
  if (origin.type !== 'i18n') return;
  assert.deepEqual(origin.languages.map(entry => entry.lang), ['pt_br', 'en_us', 'es_es']);
  assert.equal(origin.languages.find(entry => entry.lang === 'pt_br')?.value, PT_INTRO);
  assert.equal(origin.languages.find(entry => entry.lang === 'en_us')?.value, EN_INTRO);
  assert.equal(origin.templateExpression, "this.msg['pageIntro']");
});

test('idioma ativo pt acha pt_br mesmo quando en_us vem primeiro', () => {
  const source = declareEnFirst(INICIO);
  const matches = findAllI18nMatches(PT_INTRO, source, 'pt');
  assert.equal(matches.length, 1);
  assert.equal(matches[0].key, 'pageIntro');
  assert.equal(findAllI18nMatches(EN_INTRO, source, 'pt').length, 0);

  const origin = findTextOriginByKey('pageIntro', source, 'pt');
  const edited = applyTextEdit(origin, 'Novo texto', source, 'pt');
  assert.equal(edited.success, true);
  assert.match(edited.newSource || '', /pageMessage_pt_br = \{\npageTitle: 'Despesas aguardando sua decisão',\npageIntro: 'Novo texto',/);
  assert.match(edited.newSource || '', /See what your team has sent and choose where to start the review\./);
});

test('página só com pageMessage_pt e idioma ativo en: a edição grava no catálogo que existe', () => {
  // 102047 comandaRestaurante/web/desktop/page11/inicio.ts: catálogo único em pt; o log do nível 3 dizia lang: en.
  const source = `
/// **collab_i18n_start**
const pageMessage_pt = {
  pageTitle: 'Visão geral',
  pageIntro: 'Acompanhe a operação e decida o próximo atendimento ou fechamento.',
};
type PageMessageType = typeof pageMessage_pt;
const pageMessages: Record<string, PageMessageType> = { pt: pageMessage_pt };
/// **collab_i18n_end**
`;
  const text = 'Acompanhe a operação e decida o próximo atendimento ou fechamento.';
  const origin = findTextOriginByOccurrence(text, source, 0, 'en');
  assert.equal(origin.type, 'i18n');
  const edited = applyTextEdit(origin, 'Novo texto', source, 'en');
  assert.equal(edited.success, true);
  assert.match(edited.newSource || '', /pageIntro: 'Novo texto',/);
  assert.match(edited.newSource || '', /pageTitle: 'Visão geral',/);
});

test('message_en antigo, com tipo opcional, continua editável', () => {
  const source = `
/// **collab_i18n_start**
const message_en: typeof x = { hello: 'Hello' };
const message_pt: MessageType = { hello: 'Olá' };
/// **collab_i18n_end**
`;
  const origin = findTextOriginByKey('hello', source, 'en');
  assert.equal(origin.type, 'i18n');
  if (origin.type !== 'i18n') return;
  assert.deepEqual(origin.languages.map(entry => entry.lang), ['en', 'pt']);
  const edited = applyTextEdit(origin, 'Hi', source, 'en');
  assert.equal(edited.success, true);
  assert.match(edited.newSource || '', /const message_en: typeof x = \{ hello: 'Hi' \}/);
  assert.match(edited.newSource || '', /const message_pt: MessageType = \{ hello: 'Olá' \}/);
});

test('origem dynamic chama a mensagem ao usuário', () => {
  const origin = findTextOrigin('Acompanhe a operação…', INICIO);
  assert.equal(origin.type, 'dynamic');
  const warnings: unknown[][] = [];
  const original = console.warn;
  console.warn = (...args: unknown[]) => { warnings.push(args); };
  try {
    assert.match(dynamicEditNotice(origin, 'en') || '', /expression/);
    assert.match(dynamicEditNotice(origin, 'pt-BR') || '', /expressão/);
    assert.match(dynamicEditNotice(origin, 'es_es') || '', /expresión/);
  } finally {
    console.warn = original;
  }
  assert.equal(warnings.length, 3);
  assert.equal(dynamicEditNotice(findTextOriginByKey('pageIntro', INICIO, 'pt'), 'pt'), null);
});
