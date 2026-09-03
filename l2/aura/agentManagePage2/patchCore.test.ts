/// <mls fileReference="_102020_/l2/aura/agentManagePage2/patchCore.test.ts" enhancement="_blank" />

// Tests for the pure patch core of agentManagePage2. Uses node:test so scripts/run-tests.mjs picks
// it up. The fixture mirrors the real shape of a generated page (mls-102046/…/page11) — nested
// template literals, the collab_i18n block with four locales, one render method per l4 section.

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scanBalancedTs, scanBlock, scanArray, listMethods, findMethod, countMethod, applyMethodPatches,
  findI18nBlock, findMessageConsts, catalogueKeys, applyMessagePatches,
  fingerprint, guardInvariants, guardNoBehavior, guardMembers, guardMsgKeys, guardScope,
  allowedScopes, warnTokens, applyPagePatch, normalizeOperations2, normalizePatch,
  findExportConst, parseExportJson, hasPageCatalogue, scanParens, methodBodyBrace,
  type EditOperation2, type PagePatch,
} from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

// ─── fixture ────────────────────────────────────────────────────────────────

const PAGE = `/// <mls fileReference="_102046_/l2/buildFlowFsm/web/desktop/page11/approveChangeOrder.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { BuildFlowFsmApproveChangeOrderBase, messages as sharedMessages, type MessageType } from '/_102046_/l2/buildFlowFsm/web/shared/approveChangeOrder.js';
const sharedFallback = sharedMessages[Object.keys(sharedMessages)[0]];
/// **collab_i18n_start**
const fromShared = (m: MessageType) => ({
'locate.title': m['organism.approveChangeOrder.qryLocateChangeOrder.title'],
'approve.action': m['intent.approveChangeOrder.cmdApproveChangeOrderDecision.form.action'],
});
const pageMessage_pt = {
...fromShared(sharedMessages['pt'] ?? sharedFallback),
'loading': 'Carregando…',
'choose': 'Escolha uma opção',
};
type PageMessageType = typeof pageMessage_pt;
const pageMessage_pt_br: PageMessageType = {
...fromShared(sharedMessages['pt-br'] ?? sharedFallback),
'loading': 'Carregando…',
'choose': 'Escolha uma opção',
};
const pageMessage_en: PageMessageType = {
...fromShared(sharedMessages['en'] ?? sharedFallback),
'loading': 'Loading…',
'choose': 'Choose an option',
};
const pageMessage_es: PageMessageType = {
...fromShared(sharedMessages['es'] ?? sharedFallback),
'loading': 'Cargando…',
'choose': 'Elija una opción',
};
const pageMessages: { [key: string]: PageMessageType } = { 'pt': pageMessage_pt, 'pt-br': pageMessage_pt_br, 'en': pageMessage_en, 'es': pageMessage_es };
/// **collab_i18n_end**
const pageFallback = pageMessages[Object.keys(pageMessages)[0]];
@customElement('build-flow-fsm--web--desktop--page11--approve-change-order-102046')
export class BuildFlowFsmDesktopPage11ApproveChangeOrderPage extends BuildFlowFsmApproveChangeOrderBase {
#msgLang: string | null = null;
#msgCache: PageMessageType = pageFallback;
protected get msg(): PageMessageType {
const lang = (document.documentElement.lang || '').toLowerCase();
if (lang !== this.#msgLang) {
this.#msgLang = lang;
this.#msgCache = pageMessages[this.getMessageKey(pageMessages)] || pageFallback;
}
return this.#msgCache;
}
render() {
const msg = this.msg;
return html\`
  <main class="min-h-full">
    <h1>\${msg['locate.title']}</h1>
    \${this.renderLocate()}
    \${this.renderApproval()}
  </main>\`;
}
renderLocate() {
const msg = this.msg;
const rows = this.qryLocateChangeOrderData;
return html\`<section class="p-4">
  \${this.qryLocateChangeOrderState === 'loading' ? html\`<p>\${msg['loading']}</p>\` : rows.length === 0 ? html\`<p>\${msg['choose']}</p>\` : html\`<table>\${rows.map((item) => html\`<tr><td>\${item.changeOrderId}</td></tr>\`)}</table>\`}
</section>\`;
}
renderApproval() {
const msg = this.msg;
return html\`<section class="p-4">
  <div class="flex items-center justify-between gap-4">
    <button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2" @click=\${this.handleCmdApproveChangeOrderDecisionClick} ?disabled=\${this.cmdApproveChangeOrderDecisionState === 'loading'}>\${msg['approve.action']}</button>
  </div>
  \${this.cmdApproveChangeOrderDecisionState === 'error' ? html\`<p role="alert">\${this.cmdApproveChangeOrderDecisionError}</p>\` : nothing}
</section>\`;
}
}
`;

const SHARED_MEMBERS = new Set([
  'qryLocateChangeOrderData', 'qryLocateChangeOrderState',
  'cmdApproveChangeOrderDecisionState', 'cmdApproveChangeOrderDecisionError',
  'handleCmdApproveChangeOrderDecisionClick',
]);

const ALIGN_OP: EditOperation2 = { kind: 'layout', scope: 'renderApproval', target: 'action buttons', description: 'align the action buttons to the left' };

const alignedApproval = `renderApproval() {
const msg = this.msg;
return html\`<section class="p-4">
  <div class="flex items-center justify-start gap-4">
    <button class="rounded-md bg-[var(--button-primary-bg,#2563eb)] px-4 py-2" @click=\${this.handleCmdApproveChangeOrderDecisionClick} ?disabled=\${this.cmdApproveChangeOrderDecisionState === 'loading'}>\${msg['approve.action']}</button>
  </div>
  \${this.cmdApproveChangeOrderDecisionState === 'error' ? html\`<p role="alert">\${this.cmdApproveChangeOrderDecisionError}</p>\` : nothing}
</section>\`;
}`;

// ─── scanner ────────────────────────────────────────────────────────────────

test('scanner: plain block', () => {
  assert.equal(scanBlock('{}', 0), 2);
  assert.equal(scanBlock('{ a: 1 }x', 0), 8);
  assert.equal(scanBlock('x{}', 1), 3);
});

test('scanner: braces inside strings do not count', () => {
  assert.equal(scanBlock(`{ a: '}' }`, 0), 10);
  assert.equal(scanBlock(`{ a: "}{" }`, 0), 11);
  assert.equal(scanBlock(`{ a: '\\'}' }`, 0), 12);
});

test('scanner: template literal with an expression that contains braces', () => {
  const src = '{ const x = `a${cond ? \'}\' : \'{\'}b`; }';
  assert.equal(scanBlock(src, 0), src.length);
});

test('scanner: template inside template', () => {
  const src = '{ return html`<p>${flag ? html`<b>${v}</b>` : nothing}</p>`; }';
  assert.equal(scanBlock(src, 0), src.length);
});

test('scanner: comments are skipped', () => {
  assert.equal(scanBlock('{ // }\n}', 0), 8);
  const block = '{ /* } } */ }';
  assert.equal(scanBlock(block, 0), block.length);
});

test('scanner: regex literal with a brace', () => {
  const src = '{ if (/[}]/u.test(s)) return 1; }';
  assert.equal(scanBlock(src, 0), src.length);
});

test('scanner: division is not mistaken for a regex', () => {
  const src = '{ const r = a / b; const q = c / d; }';
  assert.equal(scanBlock(src, 0), src.length);
});

test('scanner: unbalanced and wrong-start return -1', () => {
  assert.equal(scanBlock('{ a: 1 ', 0), -1);
  assert.equal(scanBlock('x{}', 0), -1);
  assert.equal(scanBlock('{ a: "unterminated }', 0), -1);
  assert.equal(scanArray('{}', 0), -1);
});

test('scanner: arrays share the implementation', () => {
  assert.equal(scanArray('[1, [2], 3]', 0), 11);
  assert.equal(scanBalancedTs('[{ a: "]" }]', 0), 12);
});

// ─── methods ────────────────────────────────────────────────────────────────

test('methods: the real page shape is walked correctly', () => {
  const names = listMethods(PAGE).map(m => m.name);
  assert.deepEqual(names, ['msg', 'render', 'renderLocate', 'renderApproval']);
  assert.equal(countMethod(PAGE, 'renderApproval'), 1);
  assert.equal(countMethod(PAGE, 'renderMissing'), 0);
  assert.equal(findMethod(PAGE, 'renderMissing'), null);
});

test('methods: the span of a method ends at its own closing brace', () => {
  const span = findMethod(PAGE, 'renderLocate')!;
  const body = PAGE.slice(span.start, span.end);
  assert.ok(body.startsWith('renderLocate() {'));
  assert.ok(body.endsWith('}'));
  assert.ok(!body.includes('renderApproval'));
});

test('applyMethodPatches: replaces one method and leaves the rest byte-identical', () => {
  const result = applyMethodPatches(PAGE, [{ name: 'renderApproval', code: alignedApproval }]);
  assert.equal(result.ok, true);
  const out = (result as { ok: true; value: string }).value;
  assert.ok(out.includes('justify-start'));
  assert.ok(!out.includes('justify-between'));
  assert.equal(listMethods(out).length, 4);
  assert.equal(out.slice(0, out.indexOf('renderApproval()')), PAGE.slice(0, PAGE.indexOf('renderApproval()')));
});

test('applyMethodPatches: appends a brand-new helper before the class closing brace', () => {
  const helper = 'renderFooter() {\nreturn html`<footer></footer>`;\n}';
  const result = applyMethodPatches(PAGE, [{ name: 'renderFooter', code: helper }]);
  assert.equal(result.ok, true);
  const out = (result as { ok: true; value: string }).value;
  assert.deepEqual(listMethods(out).map(m => m.name), ['msg', 'render', 'renderLocate', 'renderApproval', 'renderFooter']);
});

test('applyMethodPatches: rejects a mismatched signature, a duplicate and an unbalanced body', () => {
  assert.equal(applyMethodPatches(PAGE, [{ name: 'renderApproval', code: 'renderOther() { return 1; }' }]).ok, false);
  assert.equal(applyMethodPatches(PAGE, [
    { name: 'renderApproval', code: alignedApproval },
    { name: 'renderApproval', code: alignedApproval },
  ]).ok, false);
  assert.equal(applyMethodPatches(PAGE, [{ name: 'renderApproval', code: 'renderApproval() { return 1;' }]).ok, false);
  assert.equal(applyMethodPatches(PAGE, []).ok, false);
});

// ─── i18n ───────────────────────────────────────────────────────────────────

test('i18n: block, locale consts and key set', () => {
  assert.ok(findI18nBlock(PAGE));
  assert.deepEqual(findMessageConsts(PAGE).map(c => c.locale), ['pt', 'pt-br', 'en', 'es']);
  const keys = catalogueKeys(PAGE);
  assert.ok(keys.has('locate.title'));   // from fromShared
  assert.ok(keys.has('loading'));        // from the locale const
  assert.ok(!keys.has('nope'));
});

test('i18n: a new key lands in every locale', () => {
  const result = applyMessagePatches(PAGE, [{ key: 'actions.export', values: { pt: 'Exportar', 'pt-br': 'Exportar', en: 'Export', es: 'Exportar' } }]);
  assert.equal(result.ok, true);
  const { code, warnings } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.equal(warnings.length, 0);
  assert.equal(code.split(`'actions.export':`).length - 1, 4);
  assert.ok(code.includes(`'actions.export': 'Export',`));
  assert.deepEqual(findMessageConsts(code).map(c => c.locale), ['pt', 'pt-br', 'en', 'es']);
});

test('i18n: a missing locale falls back to the default one and warns', () => {
  const result = applyMessagePatches(PAGE, [{ key: 'actions.export', values: { pt: 'Exportar' } }]);
  assert.equal(result.ok, true);
  const { code, warnings } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.equal(code.split(`'actions.export':`).length - 1, 4);
  assert.equal(warnings.length, 3);
  assert.ok(warnings[0].includes('not translated'));
});

test('i18n: an existing key or a malformed one is refused', () => {
  assert.equal(applyMessagePatches(PAGE, [{ key: 'loading', values: { pt: 'x' } }]).ok, false);
  assert.equal(applyMessagePatches(PAGE, [{ key: 'locate.title', values: { pt: 'x' } }]).ok, false);
  assert.equal(applyMessagePatches(PAGE, [{ key: '', values: { pt: 'x' } }]).ok, false);
  assert.equal(applyMessagePatches(PAGE, [{ key: 'ok.key', values: {} }]).ok, false);
});

test('i18n: values with quotes are escaped', () => {
  const result = applyMessagePatches(PAGE, [{ key: 'x.y', values: { pt: "d'água", 'pt-br': "d'água", en: "it's", es: 'a' } }]);
  assert.equal(result.ok, true);
  const { code } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.ok(code.includes(`'x.y': 'd\\'água',`));
});

test('i18n: the locale set is discovered from the file, in file order', () => {
  const reordered = PAGE.replace('const pageMessage_pt = {', 'const pageMessage_zz = {')
    .replace('typeof pageMessage_pt', 'typeof pageMessage_zz');
  assert.equal(findMessageConsts(reordered)[0].locale, 'zz');
  const result = applyMessagePatches(reordered, [{ key: 'a.b', values: { en: 'E' } }]);
  assert.equal(result.ok, true);
  const { code } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.ok(code.includes(`'a.b': 'E',`));   // zz has no value ⇒ falls back to the default (itself)
});

// ─── guards ─────────────────────────────────────────────────────────────────

test('guardInvariants: an untouched-contract patch passes', () => {
  const out = (applyMethodPatches(PAGE, [{ name: 'renderApproval', code: alignedApproval }]) as { ok: true; value: string }).value;
  assert.equal(guardInvariants(PAGE, out).ok, true);
});

test('guardInvariants: header, tag, class, imports, locales and msg getter are frozen', () => {
  const fp = fingerprint(PAGE);
  assert.ok(fp.header.startsWith('/// <mls'));
  assert.equal(fp.tag, 'build-flow-fsm--web--desktop--page11--approve-change-order-102046');
  assert.equal(fp.hasRender, true);

  const cases: Array<[string, string]> = [
    ['header', PAGE.replace('enhancement="_102020_/l2/enhancementAura"', 'enhancement="_blank"')],
    ['tag', PAGE.replace('approve-change-order-102046', 'approve-change-order-x')],
    ['class', PAGE.replace('extends BuildFlowFsmApproveChangeOrderBase', 'extends Other')],
    ['imports', PAGE.replace("import { html, nothing } from 'lit';", "import { html, nothing, svg } from 'lit';")],
    ['locales', PAGE.replace(/const pageMessage_es: PageMessageType = \{[\s\S]*?\n\};\n/u, '')],
    ['msg getter', PAGE.replace('return this.#msgCache;', 'return pageFallback;')],
  ];
  for (const [label, mutated] of cases) {
    const guard = guardInvariants(PAGE, mutated);
    assert.equal(guard.ok, false, `${label} should be refused`);
  }
});

test('guardInvariants: dropping render() or an i18n marker is refused', () => {
  const noRender = PAGE.replace(/render\(\) \{[\s\S]*?\n\}\n/u, '');
  assert.equal(guardInvariants(PAGE, noRender).ok, false);
  assert.equal(guardInvariants(PAGE, PAGE.replace('/// **collab_i18n_end**', '')).ok, false);
});

test('guardNoBehavior: presentation passes, behaviour does not', () => {
  assert.equal(guardNoBehavior(alignedApproval).ok, true);
  const refused = [
    '@property() x = 1;',
    'handleSaveClick(e: Event) { }',
    'const r = await fetch("/x");',
    'const m = await import("./x.js");',
    'setTimeout(() => 1, 10);',
    'setState("ui.x", 1);',
    'this.total = 3;',
    'localStorage.getItem("x");',
  ];
  for (const code of refused) assert.equal(guardNoBehavior(code).ok, false, code);
});

test('guardMembers: unknown this.<member> is refused', () => {
  assert.equal(guardMembers(alignedApproval, new Set([...SHARED_MEMBERS, 'renderApproval'])).ok, true);
  const guard = guardMembers('return html`${this.naoExiste}`;', SHARED_MEMBERS);
  assert.equal(guard.ok, false);
  assert.ok((guard as { ok: false; reason: string }).reason.includes('naoExiste'));
  // allowlisted members need no shared declaration
  assert.equal(guardMembers('this.requestUpdate(); const m = this.msg;', new Set()).ok, true);
});

test('guardMsgKeys: only catalogue keys are accepted', () => {
  const keys = catalogueKeys(PAGE);
  assert.equal(guardMsgKeys(alignedApproval, keys).ok, true);
  assert.equal(guardMsgKeys("html`${msg['nope.key']}`", keys).ok, false);
});

test('guardScope: only authorized methods (plus new helpers) may be touched', () => {
  assert.deepEqual([...allowedScopes([ALIGN_OP])], ['renderApproval']);
  assert.deepEqual([...allowedScopes([{ ...ALIGN_OP, scope: 'page' }])], ['render']);

  const ok: PagePatch = { methods: [{ name: 'renderApproval', code: alignedApproval }], notes: '' };
  assert.equal(guardScope(PAGE, ok, [ALIGN_OP]).ok, true);

  const offScope: PagePatch = { methods: [{ name: 'renderLocate', code: 'renderLocate() { return html``; }' }], notes: '' };
  assert.equal(guardScope(PAGE, offScope, [ALIGN_OP]).ok, false);

  const withHelper: PagePatch = {
    methods: [{ name: 'renderApproval', code: alignedApproval }, { name: 'renderButtons', code: 'renderButtons() { return html``; }' }],
    notes: '',
  };
  assert.equal(guardScope(PAGE, withHelper, [ALIGN_OP]).ok, true);
});

test('warnTokens: unknown design tokens warn but do not fail', () => {
  assert.deepEqual(warnTokens(alignedApproval, new Set()), []);
  assert.deepEqual(warnTokens(alignedApproval, new Set(['--button-primary-bg'])), []);
  assert.equal(warnTokens(alignedApproval, new Set(['--other'])).length, 1);
});

// ─── orchestration ──────────────────────────────────────────────────────────

test('applyPagePatch: happy path splices, guards and reports no warning', () => {
  const patch: PagePatch = { methods: [{ name: 'renderApproval', code: alignedApproval }], notes: 'botões à esquerda' };
  const result = applyPagePatch(PAGE, patch, { operations: [ALIGN_OP], sharedMembers: SHARED_MEMBERS });
  assert.equal(result.ok, true);
  const { code, warnings } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.ok(code.includes('justify-start'));
  assert.deepEqual(warnings, []);
});

test('applyPagePatch: a patch that invents a member never reaches the file', () => {
  const bad = alignedApproval.replace('this.cmdApproveChangeOrderDecisionError', 'this.inventado');
  const result = applyPagePatch(PAGE, { methods: [{ name: 'renderApproval', code: bad }], notes: '' }, { operations: [ALIGN_OP], sharedMembers: SHARED_MEMBERS });
  assert.equal(result.ok, false);
  assert.ok((result as { ok: false; reason: string }).reason.includes('inventado'));
});

test('applyPagePatch: a new i18n key is available to the guard in the same round', () => {
  const withKey = alignedApproval.replace("msg['approve.action']", "msg['actions.export']");
  const patch: PagePatch = {
    methods: [{ name: 'renderApproval', code: withKey }],
    messages: [{ key: 'actions.export', values: { pt: 'Exportar', 'pt-br': 'Exportar', en: 'Export', es: 'Exportar' } }],
    notes: '',
  };
  const result = applyPagePatch(PAGE, patch, { operations: [ALIGN_OP], sharedMembers: SHARED_MEMBERS });
  assert.equal(result.ok, true);
  const { code } = (result as { ok: true; value: { code: string; warnings: string[] } }).value;
  assert.equal(code.split(`'actions.export':`).length - 1, 4);
});

test('applyPagePatch: behaviour is refused before any splice happens', () => {
  const bad = alignedApproval.replace('const msg = this.msg;', 'const msg = this.msg;\nthis.dirty = true;');
  const result = applyPagePatch(PAGE, { methods: [{ name: 'renderApproval', code: bad }], notes: '' }, { operations: [ALIGN_OP], sharedMembers: SHARED_MEMBERS });
  assert.equal(result.ok, false);
});

test('normalizeOperations2 + normalizePatch filter malformed payloads', () => {
  const ops = normalizeOperations2([
    { kind: 'layout', scope: 'renderApproval', target: '', description: ' align left ' },
    { kind: 'structural', description: 'legacy kind' },
    { kind: 'style', description: '' },
    { kind: 'text', description: 'relabel' },
  ]);
  assert.equal(ops.length, 2);
  assert.equal(ops[0].description, 'align left');
  assert.equal(ops[1].scope, 'page');

  assert.equal(normalizePatch({ methods: [] }), null);
  assert.equal(normalizePatch(null), null);
  const patch = normalizePatch({ methods: [{ name: ' renderApproval ', code: 'x' }, { name: 1 }], notes: ' n ' })!;
  assert.equal(patch.methods.length, 1);
  assert.equal(patch.methods[0].name, 'renderApproval');
  assert.equal(patch.notes, 'n');
});

test('methods: a function-typed parameter does not hide the method', () => {
  // Real defect (mls-102046 declineChangeOrder/forwardChangeOrderForClientApproval): a `[^)]*`
  // parameter pattern stops at the `)` of `(e: Event)` and the whole method disappears from the list.
  const withHelper = PAGE.replace('renderApproval() {', `renderTextField(name: string, label: string, handler: (event: Event) => void) {
return html\`<label>\${label}</label>\`;
}
renderApproval() {`);
  const names = listMethods(withHelper).map(m => m.name);
  assert.deepEqual(names, ['msg', 'render', 'renderLocate', 'renderTextField', 'renderApproval']);
  const span = findMethod(withHelper, 'renderTextField')!;
  assert.ok(withHelper.slice(span.start, span.end).endsWith('}'));
  const nested = '(a: (b: (c: number) => void) => void)';
  assert.equal(scanParens(nested, 0), nested.length);
});

test('methods: a patch body whose parameter list holds braces is still validated', () => {
  const code = ['renderChip({ label }: { label: string }) {', 'return html`<span>${label}</span>`;', '}'].join('\n');
  assert.equal(methodBodyBrace(code), code.indexOf(') {') + 2);
  const result = applyMethodPatches(PAGE, [{ name: 'renderChip', code }]);
  assert.equal(result.ok, true);
});

test('CRLF sources are handled like LF ones', () => {
  const crlf = PAGE.split('\n').join('\r\n');
  assert.deepEqual(listMethods(crlf).map(m => m.name), ['msg', 'render', 'renderLocate', 'renderApproval']);
  assert.deepEqual(findMessageConsts(crlf).map(c => c.locale), ['pt', 'pt-br', 'en', 'es']);
  const identity = findMethod(crlf, 'renderApproval')!;
  const rt = applyMethodPatches(crlf, [{ name: 'renderApproval', code: crlf.slice(identity.start, identity.end) }]);
  assert.equal(rt.ok, true);
  assert.equal((rt as { ok: true; value: string }).value, crlf);
  const ins = applyMessagePatches(crlf, [{ key: 'a.b', values: { pt: 'A', 'pt-br': 'A', en: 'B', es: 'C' } }]);
  assert.equal(ins.ok, true);
  assert.equal((ins as { ok: true; value: { code: string } }).value.code.split("'a.b':").length - 1, 4);
});

// ─── legacy page shape: no per-locale catalogue of its own ──────────────────

// Some pages generated before the skeleton rule (3 of 34 in mls-102046) carry `collab_i18n_<lang>`
// consts instead of a catalogue block and read the SHARED keys straight through `this.msg`.
const LEGACY_PAGE = `/// <mls fileReference="_102046_/l2/m/web/desktop/page11/decline.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { DeclineBase, messages, type MessageType } from '/_102046_/l2/m/web/shared/decline.js';

const collab_i18n_pt: MessageType = messages['pt'];
const collab_i18n_messages = { pt: collab_i18n_pt };
type CollabI18nLocale = keyof typeof collab_i18n_messages;

@customElement('m--web--desktop--page11--decline-102046')
export class MDesktopPage11DeclinePage extends DeclineBase {
  get msg(): MessageType {
    const locale: CollabI18nLocale = 'pt';
    return collab_i18n_messages[locale];
  }
  render() {
    const msg = this.msg;
    return html\`<main>\${this.renderLocate()}</main>\`;
  }
  renderLocate() {
    const msg = this.msg;
    return html\`<section class="flex justify-between">
      <h2>\${msg['section.decline.locate.title']}</h2>
    </section>\`;
  }
}
`;

const LEGACY_OP: EditOperation2 = { kind: 'layout', scope: 'renderLocate', target: '', description: 'align left' };

test('legacy shape: no catalogue is detected, not treated as corruption', () => {
  assert.equal(hasPageCatalogue(PAGE), true);
  assert.equal(hasPageCatalogue(LEGACY_PAGE), false);
  assert.deepEqual(fingerprint(LEGACY_PAGE).i18nMarkers, [0, 0]);
  assert.equal(guardInvariants(LEGACY_PAGE, LEGACY_PAGE).ok, true);
});

test('legacy shape: a patch works and shared keys are the vocabulary', () => {
  const patched = LEGACY_PAGE.slice(LEGACY_PAGE.indexOf('renderLocate() {'), LEGACY_PAGE.lastIndexOf('}\n}'))
    .replace('justify-between', 'justify-start') + '}';
  const result = applyPagePatch(LEGACY_PAGE, { methods: [{ name: 'renderLocate', code: patched }], notes: '' }, {
    operations: [LEGACY_OP],
    sharedMembers: new Set(),
    sharedMsgKeys: new Set(['section.decline.locate.title']),
  });
  assert.equal(result.ok, true);
  assert.ok((result as { ok: true; value: { code: string } }).value.code.includes('justify-start'));

  // without the shared vocabulary the same patch is refused
  const noVocab = applyPagePatch(LEGACY_PAGE, { methods: [{ name: 'renderLocate', code: patched }], notes: '' }, {
    operations: [LEGACY_OP], sharedMembers: new Set(),
  });
  assert.equal(noVocab.ok, false);
});

test('legacy shape: introducing new text is refused with a usable reason', () => {
  const result = applyMessagePatches(LEGACY_PAGE, [{ key: 'a.b', values: { pt: 'X' } }]);
  assert.equal(result.ok, false);
  assert.ok((result as { ok: false; reason: string }).reason.includes('no per-locale catalogue'));
});

// ─── defs export splice ─────────────────────────────────────────────────────

const DEFS = `/// <mls fileReference="_102046_/l2/m/web/desktop/page11/p.defs.ts" enhancement="_blank"/>

export const definition = {
  "pageId": "p",
  "dataBindings": [{ "id": "b1", "inputs": [] }]
};

export const pipeline = [
  { "id": "p__l2_page", "type": "l2_page" }
] as const;
`;

test('findExportConst + parseExportJson read the defs exports', () => {
  const span = findExportConst(DEFS, 'definition')!;
  assert.ok(DEFS.slice(span.start).startsWith('export const definition'));
  assert.ok(DEFS.slice(span.start, span.end).endsWith(';'));
  assert.equal(parseExportJson(DEFS, 'definition').pageId, 'p');
  assert.equal(parseExportJson(DEFS, 'pipeline')[0].type, 'l2_page');   // survives `as const`
  assert.equal(parseExportJson(DEFS, 'nope'), null);
});
