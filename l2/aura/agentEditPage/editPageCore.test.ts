/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageCore.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyMessages, applyPagePatch, catalogueKeys, catalogueLocales, designSystemColorTokens, listMethods, methodsForOperation,
  EDIT_PAGE_MAX_PAGES, normalizeOperations, normalizeStandard, operationHistoryEntry, pageOutline, parseEditPageEntry, requestWithAdjustments, readPageDefinition, type EditOperation, type PagePatch,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import {
  EDIT_PAGE_GATE_SYSTEM_PROMPT, EDIT_PAGE_PATCH_SYSTEM_PROMPT, batchLines, editPageStandardPrompt, pagesNamedIn, standardLines, editPageGatePrompt, editPageGateSchema, editPagePatchPrompt, editPageToolArguments,
} from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';
import { gateStep, patchStep, standardStep } from '/_102020_/l2/aura/agentEditPage/editPageIntents.js';
import { recordDefsHistory, splitDefsHistory, withDefsHistory, type DefsHistoryEntry } from '/_102020_/l2/helpers/defsHistory/defsHistory.js';

// 999999/sampleModule are fictitious on purpose: no test depends on a real project. The page follows the shape
// agentMaterializeL2 (pages50) generates: catalogue between the markers, `private msg`, organisms as wrappers.
const PAGE = `/// <mls fileReference="_999999_/l2/sampleModule/web/desktop/page11/pessoas.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SampleModulePessoasShared } from '/_999999_/l2/sampleModule/web/shared/pessoas.js';
import type { Pessoa } from '/_999999_/l2/sampleModule/web/shared/pessoas.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  titulo: 'Pessoas',
  novaPessoa: 'Nova pessoa',
  vazio: 'Nenhuma pessoa: cadastre a primeira.',
};
const pageMessage_en = {
  titulo: 'People',
  novaPessoa: 'New person',
  vazio: 'No people: add the first one.',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br, en: pageMessage_en };
/// **collab_i18n_end**

const MUTED = 'text-[var(--text-muted,currentColor)]';

@customElement('sample-module--web--desktop--page11--pessoas-999999')
export class SampleModuleDesktopPage11PessoasPage extends SampleModulePessoasShared {
  private msg: PageMessageType = pageMessage_pt_br;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const m = this.msg;
    return html\`
      <div class="flex flex-col gap-4 p-6">
        <h1 class="text-2xl">\${m.titulo}</h1>
        \${this.btn(m.novaPessoa, () => this.abrirNova())}
        \${this.renderLista()}
      </div>
    \`;
  }

  private abrirNova() {
    this.setScenario('nova');
  }

  private btn(label: string, onAction: (e: Event) => void) {
    return html\`<button type="button" class="rounded px-3 py-1" @click=\${onAction}>\${label}</button>\`;
  }

  private renderLista() {
    const m = this.msg;
    const items: Pessoa[] = this.pessoas ?? [];
    return html\`
      <section data-organism-id="listaPessoas" class="flex flex-col gap-2">
        \${items.length ? items.map(p => html\`<div class="\${MUTED}">\${p.nome}</div>\`) : html\`<p>\${m.vazio}</p>\`}
      </section>
    \`;
  }
}
`;

const op = (organism: string | null, aspect = 'layout.align', change = 'Center the list.'): EditOperation =>
  ({ id: 'op1', organism, aspect, change, summary: 'Centralizar a lista', revert: false } as EditOperation);

const RENDER_LISTA = `private renderLista() {
    const m = this.msg;
    const items: Pessoa[] = this.pessoas ?? [];
    return html\`
      <section data-organism-id="listaPessoas" class="flex flex-col items-center gap-2">
        \${items.length ? items.map(p => html\`<div class="\${MUTED}">\${p.nome}</div>\`) : html\`<p>\${m.vazio}</p>\`}
        <p class="text-xs">\${m.totalPessoas}</p>
      </section>
    \`;
  }`;

const patchOf = (code: string, extra: Partial<PagePatch> = {}): PagePatch => ({ methods: [{ name: 'renderLista', code }], messages: [], notes: 'ok', ...extra });
const TOTAL = { key: 'totalPessoas', texts: [{ locale: 'pt-br', text: 'Total de pessoas' }, { locale: 'en', text: 'Total people' }] };

test('the scanner lists the class methods, including a nested parameter type', () => {
  assert.deepEqual(listMethods(PAGE).map(method => method.name), ['render', 'abrirNova', 'btn', 'renderLista']);
});

test('the outline maps organisms, texts, molecules and calls to methods', () => {
  const outline = pageOutline(PAGE);
  const lista = outline.find(method => method.name === 'renderLista')!;
  assert.deepEqual(lista.organisms, ['listaPessoas']);
  assert.deepEqual(lista.keys, ['vazio']);
  const render = outline.find(method => method.name === 'render')!;
  assert.deepEqual(render.calls, ['btn', 'abrirNova', 'renderLista']);
  assert.deepEqual(render.keys, ['titulo', 'novaPessoa']);
  assert.deepEqual(methodsForOperation(outline, { organism: 'listaPessoas' }), ['renderLista']);
  assert.deepEqual(methodsForOperation(outline, { organism: null }), ['render', 'abrirNova', 'btn']);
  // An organism of the defs with no wrapper on the page lives in the shell.
  assert.deepEqual(methodsForOperation(outline, { organism: 'resumoSemAncora' }), ['render', 'abrirNova', 'btn']);
});

test('the catalogue: keys, locales, and a new key in every locale', () => {
  assert.deepEqual(catalogueKeys(PAGE), ['titulo', 'novaPessoa', 'vazio']);
  assert.deepEqual(catalogueLocales(PAGE), ['pt-br', 'en']);
  const added = applyMessages(PAGE, [{ key: 'ajuda', texts: [{ locale: 'pt-br', text: "Dica: use o filtro d'água" }] }]);
  assert.ok(added.ok);
  if (!added.ok) return;
  assert.match(added.value.code, /vazio: 'Nenhuma pessoa: cadastre a primeira.',\n  ajuda: 'Dica: use o filtro d\\'água',\n\};/u);
  assert.match(added.value.code, /vazio: 'No people: add the first one.',\n  ajuda: 'Dica: use o filtro d\\'água',\n\};/u);
  assert.deepEqual(added.value.warnings, ["'ajuda' has no en text; the pt-br one was used"]);
  assert.equal(applyMessages(PAGE, [{ key: 'titulo', texts: [{ locale: 'en', text: 'x' }] }]).ok, false, 'an existing key is refused');
  assert.equal(applyMessages(PAGE, [{ key: 'acoes.exportar', texts: [{ locale: 'en', text: 'x' }] }]).ok, false, 'a dotted key cannot be read as m.<key>');
});

test('a valid patch replaces only its method and adds the text to every locale', () => {
  const result = applyPagePatch(PAGE, patchOf(RENDER_LISTA, { messages: [TOTAL] }), { operations: [op('listaPessoas')], tokens: [] });
  assert.ok(result.ok, result.ok ? '' : result.reason);
  if (!result.ok) return;
  const { code } = result.value;
  assert.ok(code.includes('items-center gap-2'));
  assert.ok(code.includes("totalPessoas: 'Total de pessoas',") && code.includes("totalPessoas: 'Total people',"));
  const untouched = (text: string) => text.slice(0, text.indexOf('  private renderLista'));
  assert.equal(untouched(code).replace(/\n  totalPessoas: '[^']*',/gu, ''), untouched(PAGE), 'nothing else changed');
  assert.deepEqual(result.value.touched, ['renderLista']);
});

test('CRLF files stay CRLF', () => {
  const crlf = PAGE.replace(/\n/gu, '\r\n');
  const result = applyPagePatch(crlf, patchOf(RENDER_LISTA, { messages: [TOTAL] }), { operations: [op('listaPessoas')], tokens: [] });
  assert.ok(result.ok, result.ok ? '' : result.reason);
  if (!result.ok) return;
  assert.equal(/[^\r]\n/u.test(result.value.code), false, 'no bare LF');
});

test('a new render helper may be added next to the approved method', () => {
  const helper = 'private renderTotal() {\n    return html`<p>${this.msg.vazio}</p>`;\n  }';
  const result = applyPagePatch(PAGE, { methods: [{ name: 'renderLista', code: RENDER_LISTA.replace('m.totalPessoas', 'm.vazio') }, { name: 'renderTotal', code: helper }], messages: [], notes: '' }, { operations: [op('listaPessoas')], tokens: [] });
  assert.ok(result.ok, result.ok ? '' : result.reason);
  if (!result.ok) return;
  assert.deepEqual(listMethods(result.value.code).map(method => method.name), ['render', 'abrirNova', 'btn', 'renderLista', 'renderTotal']);
});

test('what the patch may not do is refused with the reason', () => {
  const ctx = { operations: [op('listaPessoas')], tokens: ['text-muted', 'surface-bg'] };
  const refused = (patch: PagePatch) => {
    const result = applyPagePatch(PAGE, patch, ctx);
    return result.ok ? '' : result.reason;
  };
  assert.match(refused({ methods: [{ name: 'render', code: 'render() { return nothing; }' }], messages: [], notes: '' }), /not part of the approved change/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('const m = this.msg;', 'const m = this.msg; this.pessoas = [];'))), /assigns to a member/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('items-center', 'bg-[#ff0000]'))), /hex color/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('items-center', 'bg-blue-500'))), /palette color class/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('items-center', 'bg-[var(--brand-pink,transparent)]'))), /--brand-pink/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace(' data-organism-id="listaPessoas"', ''))), /removed the anchor/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('private renderLista()', 'private renderListaNova()'))), /does not start with its own declaration/u);
  assert.match(refused(patchOf(RENDER_LISTA.replace('const m = this.msg;', 'const m = await this.msg;'))), /awaits/u);
  assert.match(refused(patchOf(`${RENDER_LISTA}}`)), /not one balanced method/u);
});

test('what the method already did is not held against the patch', () => {
  const withHex = PAGE.replace('class="flex flex-col gap-2"', 'class="flex flex-col gap-2 border-[#ccc]"');
  const result = applyPagePatch(withHex, patchOf(RENDER_LISTA.replace('items-center', 'items-center border-[#ccc]').replace('<p class="text-xs">${m.totalPessoas}</p>', '')), { operations: [op('listaPessoas')], tokens: [] });
  assert.ok(result.ok, result.ok ? '' : result.reason);
});

test('operations: unknown organism or aspect, and repeats, are dropped', () => {
  const { valid, dropped } = normalizeOperations([
    { organism: 'listaPessoas', aspect: 'layout.align', change: 'Center.', summary: 'Centralizar', revert: false },
    { organism: 'listaPessoas', aspect: 'layout.align', change: 'Again.', summary: '', revert: false },
    { organism: 'outra', aspect: 'style.color', change: 'Red.', summary: '', revert: false },
    { organism: null, aspect: 'layout.magic', change: 'x', summary: '', revert: false },
    { organism: null, aspect: 'text', change: 'Rename the title.', summary: '', revert: true },
  ], new Set(['listaPessoas']));
  assert.deepEqual(valid.map(item => `${item.id} ${item.organism}/${item.aspect} ${item.revert}`), ['op1 listaPessoas/layout.align false', 'op2 null/text true']);
  assert.equal(valid[1].summary, 'Rename the title.', 'summary falls back to change');
  assert.equal(dropped.length, 3);
});

test('an applied operation becomes a request entry; Studio entries stay', () => {
  const defs = '/// <mls fileReference="_999999_/l2/sampleModule/web/desktop/page11/pessoas.defs.ts" enhancement="_blank"/>\n\nexport const definition = {\n  "intent": "x"\n} as const;\n';
  const studio: DefsHistoryEntry = { kind: 'class', organism: 'listaPessoas', target: 'section', from: 'a', to: 'b', at: '2026-10-28T00:00:00Z', attribute: 'class' };
  const entry = operationHistoryEntry(op('listaPessoas'), 'centralize a lista', '2026-10-29T00:00:00Z');
  const written = withDefsHistory(withDefsHistory(defs, [studio]), recordDefsHistory([studio], entry));
  assert.deepEqual(splitDefsHistory(written).history, [studio, entry]);
  assert.ok(written.startsWith(defs));
});

test('the page definition is read as data', () => {
  const defs = `export const definition = ${JSON.stringify({
    template: { category: 'x', experience: 'y' }, intent: 'Ver pessoas',
    sections: [{ id: 'principal', priority: 'primary', purpose: 'Listar', organisms: ['listaPessoas'] }],
    organisms: { listaPessoas: { kind: 'list', text: 'Pessoas da equipe', intents: [] } },
  }, null, 2)} as const;\n`;
  assert.deepEqual(readPageDefinition(defs), { intent: 'Ver pessoas', organisms: [{ id: 'listaPessoas', kind: 'list', text: 'Pessoas da equipe', section: 'principal', purpose: 'Listar' }] });
  assert.equal(readPageDefinition('nothing'), null);
});

test('design system color tokens', () => {
  const ds = 'export const tokens = { themes: [{ color: {\n "page-bg": "#fff",\n "text-muted": "#666",\n "_dark-page-bg": "#000"\n }, spacing: {} }] };';
  assert.deepEqual(designSystemColorTokens(ds), ['page-bg', 'text-muted']);
});

test('the Studio entry', () => {
  const parsed = parseEditPageEntry('{"module":"sampleModule","page":"pessoas","request":" centralize "}');
  assert.deepEqual(parsed, { kind: 'entry', entry: { module: 'sampleModule', page: 'pessoas', device: 'desktop', genome: 'page11', request: 'centralize', operations: null, element: null, marks: [], adjust: [], batch: [], standardize: false, standard: null } });
  assert.equal(parseEditPageEntry('{"module":"sampleModule","page":"pessoas","request":"x","device":"tv"}').kind, 'refusal');
  assert.equal(parseEditPageEntry('{"module":"sampleModule","page":"pessoas","request":"x","operations":[{"aspect":"nope"}]}').kind, 'refusal');
});

test('the Studio entry: adjustments, planned (no operations) or applied (with the plan), at most three, never empty', () => {
  const ops = '"operations":[{"id":"op1","organism":"listaPessoas","aspect":"style.emphasis","change":"maior","summary":"maior"}]';
  const base = `{"module":"sampleModule","page":"pessoas","request":"titulo maior",${ops}`;
  const ok = parseEditPageEntry(`${base},"adjust":[" menos azul "]}`);
  assert.equal(ok.kind, 'entry');
  assert.deepEqual(ok.kind === 'entry' ? ok.entry.adjust : null, ['menos azul']);
  const plan = parseEditPageEntry('{"module":"sampleModule","page":"pessoas","request":"x","adjust":["y"]}');
  assert.deepEqual(plan.kind === 'entry' ? [plan.entry.operations, plan.entry.adjust] : null, [null, ['y']], 'no operations: the gate plans the adjustment');
  assert.equal(parseEditPageEntry(`${base},"adjust":["a","b","c","d"]}`).kind, 'refusal', 'over the limit');
  assert.equal(parseEditPageEntry(`${base},"adjust":["  "]}`).kind, 'refusal', 'empty item');
  assert.equal(parseEditPageEntry(`${base},"adjust":"y"}`).kind, 'refusal', 'not a list');
  assert.equal(requestWithAdjustments('titulo maior', []), 'titulo maior');
  assert.equal(requestWithAdjustments('titulo maior', ['menos azul', 'mais espaco']), 'titulo maior (ajuste: menos azul; mais espaco)');
});

test('the Studio entry: a request of several pages lists the others, distinct, without marks', () => {
  const base = '"module":"sampleModule","page":"pessoas","request":"titulos iguais"';
  const ok = parseEditPageEntry(`{${base},"batch":["empresas","contratos"]}`);
  assert.deepEqual(ok.kind === 'entry' ? ok.entry.batch : null, ['empresas', 'contratos']);
  assert.equal(parseEditPageEntry(`{${base},"batch":["pessoas"]}`).kind, 'refusal', 'the page itself');
  assert.equal(parseEditPageEntry(`{${base},"batch":["a1","a1"]}`).kind, 'refusal', 'repeated');
  assert.equal(parseEditPageEntry(`{${base},"batch":["../x"]}`).kind, 'refusal', 'not a page name');
  const many = Array.from({ length: EDIT_PAGE_MAX_PAGES }, (_, i) => `p${i}`);
  assert.equal(parseEditPageEntry(`{${base},"batch":${JSON.stringify(many)}}`).kind, 'refusal', 'over the limit (the page counts)');
  assert.equal(parseEditPageEntry(`{${base},"batch":${JSON.stringify(many.slice(1))}}`).kind, 'entry');
  const element = '"element":{"tag":"h1","organism":null,"organismPath":"h1","anchorPath":null,"literal":""}';
  assert.equal(parseEditPageEntry(`{${base},${element},"batch":["empresas"]}`).kind, 'refusal', 'an element belongs to one page');
});

test('step ids carry the device: desktop and mobile of the same page never collide', () => {
  const args = { project: 999999, module: 'sampleModule', page: 'pessoas', genome: 'page11', request: 'x', operations: null, element: null, marks: [], adjust: [], batch: [], attempt: 1 };
  const desktop = gateStep({ ...args, device: 'desktop' }).planning!.planId;
  const mobile = gateStep({ ...args, device: 'mobile' }).planning!.planId;
  assert.notEqual(desktop, mobile);
  assert.notEqual(patchStep({ ...args, device: 'desktop' }).planning!.planId, patchStep({ ...args, device: 'mobile' }).planning!.planId);
});

test('prompts: a request of several pages asks for the same answer on all of them', () => {
  assert.deepEqual(batchLines([]), []);
  const lines = batchLines(['empresas', 'contratos']).join(' ');
  assert.ok(lines.includes('goes to 3 pages') && lines.includes('empresas, contratos') && lines.includes('the same design tokens'));
  const definition = readPageDefinition('export const definition = {"intent":"Ver","sections":[],"organisms":{"listaPessoas":{"kind":"list","text":"Lista"}}} as const;')!;
  const gate = editPageGatePrompt({ request: 'x', pageLabel: 'p', definition, outline: pageOutline(PAGE), sharedDeclaration: '', history: [], batch: ['empresas'] });
  assert.ok(gate.includes('# The same request goes to 2 pages of the module'));
  const patch = editPagePatchPrompt({ pageLabel: 'p', operations: [op('listaPessoas')], methodsByOperation: { op1: ['renderLista'] }, source: PAGE, sharedDeclaration: '', tokens: [], locales: [], history: [], definition, batch: ['empresas'] });
  assert.ok(patch.indexOf('# The same request goes to') < patch.indexOf('# The page file'));
});

test('prompts: the adjustment says the file already holds the result, the newest ask last', () => {
  const definition = readPageDefinition('export const definition = {"intent":"Ver","sections":[],"organisms":{"listaPessoas":{"kind":"list","text":"Lista"}}} as const;')!;
  const input = { pageLabel: 'p', operations: [op('listaPessoas')], methodsByOperation: { op1: ['renderLista'] }, source: PAGE, sharedDeclaration: '', tokens: [], locales: [], history: [], definition };
  assert.ok(!editPagePatchPrompt(input).includes('# Adjustment'));
  const prompt = editPagePatchPrompt({ ...input, adjust: ['menos azul', 'mais espaco'] });
  const section = prompt.indexOf('# Adjustment after the person saw the result');
  assert.ok(section >= 0 && section < prompt.indexOf('# The page file'));
  assert.ok(prompt.includes('ALREADY contains the result'));
  assert.ok(prompt.includes('- Earlier (1): menos azul') && prompt.includes('- Now: mais espaco'));
  assert.ok(prompt.includes('are the plan of the adjustment asked now'));
});

test('prompts: model type markers, strict tool, content', () => {
  for (const prompt of [EDIT_PAGE_GATE_SYSTEM_PROMPT, EDIT_PAGE_PATCH_SYSTEM_PROMPT]) {
    assert.match(prompt, /^<!-- modelType: (?:reasoning|code) -->\n<!-- x-tool-strict: true -->/u);
  }
  const schema = editPageGateSchema(['listaPessoas']) as { required: string[] };
  assert.deepEqual(schema.required, ['verdict', 'reason', 'operations']);
  const definition = readPageDefinition('export const definition = {"intent":"Ver","sections":[],"organisms":{"listaPessoas":{"kind":"list","text":"Lista"}}} as const;')!;
  const gate = editPageGatePrompt({ request: 'centralize', pageLabel: 'sampleModule/pessoas', definition, outline: pageOutline(PAGE), sharedDeclaration: 'declare class X {}', history: [] });
  assert.ok(gate.includes('- renderLista() wraps listaPessoas; texts vazio'));
  const patch = editPagePatchPrompt({ pageLabel: 'p', operations: [op('listaPessoas')], methodsByOperation: { op1: ['renderLista'] }, source: PAGE, sharedDeclaration: '', tokens: ['page-bg'], locales: ['pt-br', 'en'], history: [], definition, repair: { diagnostic: 'TS2339 x', previous: 'y' } });
  assert.ok(patch.includes('→ methods: renderLista') && patch.includes('TS2339 x'));
  assert.deepEqual(editPageToolArguments({ type: 'flexible', result: { toolName: 'submitEditPlan', arguments: '{"verdict":"apply"}' } }, 'submitEditPlan'), { verdict: 'apply' });
  assert.throws(() => editPageToolArguments({ type: 'flexible', result: { toolName: 'other', arguments: '{}' } }, 'submitEditPlan'), /MISMATCH/u);
});

test('prompts: an adjustment is planned by the gate on the result, only the newest ask, any organism', () => {
  const definition = readPageDefinition('export const definition = {"intent":"Ver","sections":[],"organisms":{"listaPessoas":{"kind":"list","text":"Lista"}}} as const;')!;
  const input = { request: 'centralize', pageLabel: 'p', definition, outline: pageOutline(PAGE), sharedDeclaration: '', history: [] };
  assert.ok(editPageGatePrompt(input).startsWith('# The request\n'));
  const gate = editPageGatePrompt({ ...input, adjust: ['menos azul', 'header igual ao da inicio'] });
  assert.ok(gate.startsWith('# The request (already applied)\ncentralize'));
  assert.ok(gate.indexOf('# The adjustment to plan now') < gate.indexOf('# The page —'));
  assert.ok(gate.includes('- Earlier (1): menos azul') && gate.includes('- Now: header igual ao da inicio'));
  assert.ok(gate.includes('not only the ones the request touched'));
});

test('the standard: rules within bounds, classes a page may use; only with the other pages, never with operations', () => {
  const rule = { what: 'page header title', classes: 'text-2xl  font-semibold', summary: 'título 2xl' };
  assert.deepEqual(normalizeStandard({ rules: [rule] }), { ok: true, value: { rules: [{ ...rule, classes: 'text-2xl font-semibold' }] } });
  assert.deepEqual(normalizeStandard(undefined), { ok: true, value: null });
  for (const classes of ['text-[#ff0000]', 'dark:text-white', 'x" onclick="y', 'a${b}']) {
    assert.equal(normalizeStandard({ rules: [{ ...rule, classes }] }).ok, false, classes);
  }
  assert.equal(normalizeStandard({ rules: [{ ...rule, summary: ' ' }] }).ok, false);
  const base = '{"module":"sampleModule","page":"pessoas","request":"header igual"';
  const ok = parseEditPageEntry(`${base},"batch":["empresas"],"standardize":true}`);
  assert.deepEqual(ok.kind === 'entry' ? [ok.entry.standardize, ok.entry.standard] : null, [true, null]);
  assert.equal(parseEditPageEntry(`${base},"standardize":true}`).kind, 'refusal', 'no other page');
  const ops = '"operations":[{"id":"op1","organism":"listaPessoas","aspect":"style.emphasis","change":"maior","summary":"maior"}]';
  assert.equal(parseEditPageEntry(`${base},"batch":["empresas"],"standardize":true,${ops}}`).kind, 'refusal', 'no operations');
  const args = { project: 999999, module: 'sampleModule', page: 'pessoas', device: 'desktop' as const, genome: 'page11', request: 'x', operations: null, element: null, marks: [], adjust: [], batch: ['empresas'], standardize: true, standard: null, attempt: 1 };
  assert.ok(standardStep(args).planning!.planId.startsWith('editPage-standard-desktop-pessoas'));
});

test('prompts: the standard reads the reference and named pages whole; gate and patch take it as binding', () => {
  assert.deepEqual(pagesNamedIn('seguindo o modelo da pagina inicio, title', ['inicio', 'listas_tarefas', 'ini']), ['inicio']);
  const standard = { rules: [{ what: 'page header title', classes: 'text-2xl font-semibold', summary: 'título' }] };
  const prompt = editPageStandardPrompt({ request: 'header igual', pageLabel: 'p', source: PAGE, named: [{ page: 'inicio', source: 'INICIO' }], others: [{ page: 'empresas', outline: pageOutline(PAGE) }], tokens: [] });
  assert.ok(prompt.includes('## The reference page — p') && prompt.includes('## A page the request names — inicio') && prompt.includes('- empresas'));
  assert.ok(!prompt.includes('# The previous standard'));
  const adjusted = editPageStandardPrompt({ request: 'header igual', adjust: ['titulo menor'], previous: standard, pageLabel: 'p', source: PAGE, named: [], others: [], tokens: [] });
  assert.ok(adjusted.includes('- page header title: text-2xl font-semibold') && adjusted.includes('# The adjustment asked now\ntitulo menor'));
  assert.deepEqual(standardLines(null), []);
  assert.ok(standardLines(standard).join('\n').includes('use EXACTLY these classes'));
  const definition = readPageDefinition('export const definition = {"intent":"Ver","sections":[],"organisms":{"listaPessoas":{"kind":"list","text":"Lista"}}} as const;')!;
  const gate = editPageGatePrompt({ request: 'x', pageLabel: 'p', definition, outline: pageOutline(PAGE), sharedDeclaration: '', history: [], batch: ['empresas'], standard });
  assert.ok(gate.indexOf('# The common standard') > gate.indexOf('# The same request goes to'));
  const patch = editPagePatchPrompt({ pageLabel: 'p', operations: [op('listaPessoas')], methodsByOperation: { op1: ['renderLista'] }, source: PAGE, sharedDeclaration: '', tokens: [], locales: [], history: [], definition, standard });
  assert.ok(patch.includes('- page header title: text-2xl font-semibold'));
});
