/// <mls fileReference="_102020_/l2/aura/agentEditPage/editPageSelection.test.ts" enhancement="_blank"/>

// The selected element (TASK-102020-agent-edit-page-selection): entry, molecule and slot, methods narrowed to the
// element, and the guard that keeps a selected molecule's behavior.

import assert from 'node:assert/strict';
import test from 'node:test';
import {
  applyPagePatch, guardMoleculeBehavior, methodAtOffset, methodsForOperationFocused, moleculeBindings, moleculeOfElement,
  normalizeEditElement, pageOutline, parseEditPageEntry, slotInDocs, type EditOperation, type PagePatch,
} from '/_102020_/l2/aura/agentEditPage/editPageCore.js';
import { selectedElementLines } from '/_102020_/l2/aura/agentEditPage/editPagePrompts.js';

// 999999/sampleModule are fictitious on purpose: no test depends on a real project.
const PAGE = `/// <mls fileReference="_999999_/l2/sampleModule/web/desktop/page11/painel.ts" enhancement="_102020_/l2/enhancementAura"/>

import { html, nothing } from 'lit';
import { customElement } from 'lit/decorators.js';
import { SampleModulePainelShared } from '/_999999_/l2/sampleModule/web/shared/painel.js';
import '/_102040_/l2/molecules/groupviewmetric/ml-metric-big-number.js';

/// **collab_i18n_start**
const pageMessage_pt_br = {
  titulo: 'Painel',
  total: 'Total',
};
type PageMessageType = typeof pageMessage_pt_br;
const pageMessages: Record<string, PageMessageType> = { 'pt-br': pageMessage_pt_br };
/// **collab_i18n_end**

@customElement('sample-module--web--desktop--page11--painel-999999')
export class SampleModuleDesktopPage11PainelPage extends SampleModulePainelShared {
  private msg: PageMessageType = pageMessage_pt_br;

  render() {
    this.msg = pageMessages[this.getMessageKey(pageMessages)];
    const m = this.msg;
    return html\`
      <h1 class="text-2xl">\${m.titulo}</h1>
      \${this.renderResumo()}
      \${this.renderRodape()}
    \`;
  }

  private renderResumo() {
    const m = this.msg;
    return html\`
      <section data-organism-id="resumo" class="flex gap-4">
        <groupviewmetric--ml-metric-big-number data-class="flex-1" .loading=\${this.carregando} @action=\${() => this.abrir()}>
          <Label>\${m.total}</Label>
          <Value>\${this.total}</Value>
        </groupviewmetric--ml-metric-big-number>
      </section>
    \`;
  }

  private renderRodape() {
    return html\`<section data-organism-id="resumo"><p class="text-xs">ok</p></section>\`;
  }
}
`;

const RESUMO = PAGE.slice(PAGE.indexOf('private renderResumo()'), PAGE.indexOf('  private renderRodape()')).trimEnd();
const op = (organism: string | null): EditOperation => ({ id: 'op1', organism, aspect: 'style.emphasis', change: 'Bigger value.', summary: 'Valor maior', revert: false });
const patchOf = (code: string): PagePatch => ({ methods: [{ name: 'renderResumo', code }], messages: [], notes: 'ok' });
const FOCUS = { organism: 'resumo', method: 'renderResumo', molecule: 'groupviewmetric--ml-metric-big-number' };

test('the element in the entry is shaped, and a malformed one refuses the entry', () => {
  const element = { tag: 'GROUPVIEWMETRIC--ML-METRIC-BIG-NUMBER', organism: 'resumo', organismPath: 'section>groupviewmetric--ml-metric-big-number', anchorPath: [{ tag: 'section', index: 0, count: 1 }], literal: '' };
  const parsed = parseEditPageEntry(JSON.stringify({ module: 'sampleModule', page: 'painel', request: 'aumente isto', element }));
  assert.equal(parsed.kind, 'entry');
  if (parsed.kind !== 'entry') return;
  assert.equal(parsed.entry.element?.tag, 'groupviewmetric--ml-metric-big-number');
  assert.equal(normalizeEditElement({ tag: 'div', anchorPath: [{ tag: 'div' }] })?.anchorPath, null, 'a step without index is no anchor');
  assert.equal(parseEditPageEntry(JSON.stringify({ module: 'sampleModule', page: 'painel', request: 'x', element: { tag: '<script>' } })).kind, 'refusal');
});

test('the molecule is the element itself or the closest one above it, with the slot below it', () => {
  const asTag = moleculeOfElement(normalizeEditElement({ tag: 'groupviewmetric--ml-metric-big-number', organismPath: 'section>groupviewmetric--ml-metric-big-number' })!);
  assert.deepEqual(asTag, { tag: 'groupviewmetric--ml-metric-big-number', group: 'groupviewmetric', name: 'ml-metric-big-number', slotCandidate: null });
  const inside = moleculeOfElement(normalizeEditElement({ tag: 'div', organismPath: 'section>groupviewmetric--ml-metric-big-number#1>figure>value' })!);
  assert.equal(inside?.tag, 'groupviewmetric--ml-metric-big-number');
  assert.equal(inside?.slotCandidate, 'figure');
  assert.equal(moleculeOfElement(normalizeEditElement({ tag: 'p', organismPath: 'section>p' })!), null);
  const suffixed = moleculeOfElement(normalizeEditElement({ tag: 'groupselectone--ml-select-102040', organismPath: '' })!);
  assert.deepEqual([suffixed?.tag, suffixed?.name], ['groupselectone--ml-select-102040', 'ml-select'], 'the file has no project suffix; the markup keeps it');
  assert.equal(moleculeOfElement(normalizeEditElement({ tag: 'molecules--ml-scenary-102020', organismPath: '' })!), null, 'not a catalog molecule');
  const docs = 'Pass CSS classes on slot tags via `data-class`:\n  <Label data-class="uppercase">Text</Label>\n<Value>…</Value>';
  assert.equal(slotInDocs('value', docs), 'Value');
  assert.equal(slotInDocs('figure', docs), null, 'a DOM node the skill does not name is not a slot');
});

test('the element narrows the methods of its organism to the one holding it', () => {
  const outline = pageOutline(PAGE);
  assert.deepEqual(methodsForOperationFocused(outline, op('resumo'), null), ['renderResumo', 'renderRodape']);
  assert.deepEqual(methodsForOperationFocused(outline, op('resumo'), FOCUS), ['renderResumo']);
  assert.deepEqual(methodsForOperationFocused(outline, op(null), FOCUS), ['render'], 'another organism keeps its rule');
  assert.equal(methodAtOffset(PAGE, PAGE.indexOf('<groupviewmetric--ml-metric-big-number')), 'renderResumo');
  assert.equal(methodAtOffset(PAGE, PAGE.indexOf('const pageMessage_pt_br')), null);
});

test('molecule bindings: events, properties and boolean attributes; plain attributes are appearance', () => {
  assert.deepEqual(moleculeBindings(RESUMO, 'groupviewmetric--ml-metric-big-number'), [['.loading=${this.carregando}', '@action=${() => this.abrir()}']]);
});

test('a selected molecule may change its appearance, never its behavior', () => {
  const ctx = { operations: [op('resumo')], tokens: [], focus: FOCUS };
  const appearance = RESUMO.replace('data-class="flex-1"', 'data-class="flex-1 text-center" size="lg"').replace('<Value>', '<Value data-class="text-5xl">');
  const ok = applyPagePatch(PAGE, patchOf(appearance), ctx);
  assert.ok(ok.ok, ok.ok ? '' : ok.reason);
  const refused = (code: string) => { const r = applyPagePatch(PAGE, patchOf(code), ctx); return r.ok ? '' : r.reason; };
  assert.match(refused(RESUMO.replace('@action=${() => this.abrir()}', '@action=${() => this.fechar()}')), /behavior of <groupviewmetric--ml-metric-big-number>/u);
  assert.match(refused(RESUMO.replace(' .loading=${this.carregando}', '')), /behavior/u);
  assert.match(refused(RESUMO.replace('data-class="flex-1"', 'data-class="flex-1" @click=${() => this.abrir()}')), /behavior/u);
  assert.match(refused(RESUMO.replace(/<groupviewmetric[\s\S]*?<\/groupviewmetric--ml-metric-big-number>/u, '')), /adds or removes/u);
  assert.match(applyPagePatch(PAGE, { methods: [{ name: 'renderRodape', code: 'private renderRodape() {\n    return nothing;\n  }' }], messages: [], notes: '' }, ctx).ok ? '' : 'refused', /refused/u, 'the other method of the organism is out of the element');
});

test('without a selected molecule the bindings are not guarded here (the behavior rules still apply)', () => {
  const r = guardMoleculeBehavior('<a-b x=${1}></a-b>', '<a-b x=${2}></a-b>', 'groupviewmetric--ml-metric-big-number');
  assert.ok(r.ok);
});

test('the prompt section shows the element, where it is, and the molecule documentation', () => {
  const lines = selectedElementLines({
    element: { tag: 'groupviewmetric--ml-metric-big-number', organism: 'resumo', organismPath: 'section>groupviewmetric--ml-metric-big-number', literal: '' },
    located: { method: 'renderResumo', snippet: '<groupviewmetric--ml-metric-big-number>…</groupviewmetric--ml-metric-big-number>', renders: 2 },
    molecule: { tag: 'groupviewmetric--ml-metric-big-number', slot: 'Value', skill: 'SKILL TEXT', usage: 'USAGE TEXT' },
  }).join('\n');
  assert.match(lines, /in method renderResumo \(rendered 2 times/u);
  assert.match(lines, /slot <Value>/u);
  assert.ok(lines.includes('SKILL TEXT') && lines.includes('USAGE TEXT'));
  assert.deepEqual(selectedElementLines(null), []);
  assert.match(selectedElementLines({ element: { tag: 'p', organism: null, organismPath: 'p', literal: 'x' }, located: null, molecule: null }).join('\n'), /could not be located/u);
});
