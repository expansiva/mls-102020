/// <mls fileReference="_102020_/l2/aura/molecules/skills/groupTriggerAction/adopt.test.ts" enhancement="_blank"/>
// The conversion table of the group, line by line — and the refusals, which are the half that keeps
// the operation honest: nothing of the original may disappear without being named.
import assert from 'node:assert/strict';
import test from 'node:test';
import { scanTemplateTree } from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { describeElement, type IAdoptTarget } from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import { candidate, convert, group } from '/_102020_/l2/aura/molecules/skills/groupTriggerAction/adopt.js';

const TARGET: IAdoptTarget = {
  tag: 'grouptriggeraction--ml-button-standard',
  importPath: '/_102040_/l2/molecules/grouptriggeraction/ml-button-standard.js',
};

function shapeOf(markup: string, tag = 'button') {
  const source = `class X { render() { return html\`<div>${markup}</div>\`; } }`;
  const tree = scanTemplateTree(source);
  const index = tree.elements.findIndex((element) => element.tag === tag);
  return describeElement(source, tree, index)!;
}

function markupOf(markup: string): string {
  const shape = shapeOf(markup);
  const cand = candidate(shape)!;
  const result = convert(shape, cand, TARGET);
  assert.equal(result.ok, true, result.ok ? '' : JSON.stringify(result.reason));
  return result.ok ? result.markup : '';
}

function refusalOf(markup: string, tag = 'button') {
  const shape = shapeOf(markup, tag);
  const cand = candidate(shape);
  if (!cand) return null;
  const result = convert(shape, cand, TARGET);
  return result.ok ? undefined : result.reason;
}

test('the group is the one the catalog names', () => {
  assert.equal(group, 'groupTriggerAction');
});

test('a real button of the 102047 converts the way the task says', () => {
  // Verbatim from ticketCatalogue.ts: the refresh button of the list filter.
  const written = markupOf('<button class="rounded-md px-3 py-2 bg-[var(--button-secondary-bg,#ffffff)]'
    + ' text-[var(--button-secondary-text,#0f172a)] border border-[var(--button-secondary-border,#cbd5e1)]"'
    + " @click=${this.handleQryListTicketClick}>${msg['common.refresh']}</button>");

  assert.equal(written, '<grouptriggeraction--ml-button-standard data-variant="secondary"'
    + " @action=${this.handleQryListTicketClick}><Label>${msg['common.refresh']}</Label>"
    + '</grouptriggeraction--ml-button-standard>');
});

test('the tone comes from the design-system token, and its absence is not invented', () => {
  assert.match(markupOf('<button class="px-3 bg-[var(--button-danger-bg,#dc2626)]">x</button>'), /data-variant="danger"/u);
  // No token: `primary` and a warning, which is what the panel shows before the click.
  assert.match(markupOf('<button class="px-3 bg-white">x</button>'), /data-variant="primary"/u);
  const cand = candidate(shapeOf('<button class="px-3 bg-white">x</button>'))!;
  assert.equal(cand.warnings.some((warning) => warning.id === 'adopt.warnNoVariant'), true);
});

test('`@click` becomes `@action` — the molecule dispatches `action`, not `click`', () => {
  const written = markupOf('<button class="p-2" @click=${() => { if (a > b) this.go(); }}>x</button>');
  assert.match(written, /@action=\$\{\(\) => \{ if \(a > b\) this\.go\(\); \}\}/u);
  assert.equal(written.includes('@click'), false);
});

test('disabled travels in all three forms the real pages write it', () => {
  assert.match(markupOf('<button class="p-2" ?disabled=${!this.id}>x</button>'), /\?disabled=\$\{!this\.id\}/u);
  assert.match(markupOf('<button class="p-2" .disabled=${this.busy}>x</button>'), /\.disabled=\$\{this\.busy\}/u);
  assert.match(markupOf('<button class="p-2" disabled>x</button>'), /\sdisabled>/u);
});

test('`type="submit"` survives, and `type="button"` is the default and is not written', () => {
  assert.match(markupOf('<button type="submit" class="p-2">x</button>'), /\stype="submit"/u);
  assert.equal(markupOf('<button type="button" class="p-2">x</button>').includes('type='), false);
});

test('only the classes that hold the button in place travel, as data-class', () => {
  const written = markupOf('<button class="w-full mt-4 rounded-md px-3 bg-[var(--button-primary-bg,#2563eb)]">x</button>');
  assert.match(written, /data-class="w-full mt-4"/u);
  assert.equal(written.includes('px-3'), false);
});

test('the content travels whole, whatever it is', () => {
  assert.match(markupOf('<button class="p-2">${msg[\'a\']} — ${n}</button>'), /<Label>\$\{msg\['a'\]\} — \$\{n\}<\/Label>/u);
  // 84 of the 463 real buttons carry an element inside, and none of them is an icon: cutting it
  // would throw the button's own content away.
  assert.match(markupOf('<button class="p-2"><div class="c">${msg[\'a\']}</div></button>'),
    /<Label><div class="c">\$\{msg\['a'\]\}<\/div><\/Label>/u);
});

test('an icon goes to the Icon slot and the rest to the Label', () => {
  const written = markupOf('<button class="p-2"><svg class="h-4"></svg>${msg[\'a\']}</button>');
  assert.match(written, /<Icon><svg class="h-4"><\/svg><\/Icon>/u);
  assert.match(written, /<Label>\$\{msg\['a'\]\}<\/Label>/u);
});

test('the tag is the catalog one, verbatim — no concatenation anywhere', () => {
  const other: IAdoptTarget = { tag: 'grouptriggeraction--ml-icon-button', importPath: '/x.js' };
  const shape = shapeOf('<button class="p-2">x</button>');
  const result = convert(shape, candidate(shape)!, other);
  assert.equal(result.ok, true);
  if (!result.ok) return;
  assert.match(result.markup, /^<grouptriggeraction--ml-icon-button /u);
  assert.match(result.markup, /<\/grouptriggeraction--ml-icon-button>$/u);
  assert.deepEqual(result.imports, ['/x.js']);
});

// ── The refusals ────────────────────────────────────────────────────────────

test('an attribute the table does not know refuses the conversion, NAMING it', () => {
  const reason = refusalOf('<button class="p-2" @dblclick=${this.go} ?autofocus=${true}>x</button>');
  assert.equal(reason?.id, 'reason.adoptUnknownAttr');
  assert.equal(reason?.params?.attrs, '@dblclick, ?autofocus');
});

test('a `type` written as a binding is refused instead of dropped', () => {
  assert.equal(refusalOf('<button class="p-2" type=${this.kind}>x</button>')?.id, 'reason.adoptUnknownAttr');
});

test('content with behaviour of its own is refused: a slot would kill it', () => {
  const reason = refusalOf('<button class="p-2"><span @click=${this.inner}>x</span></button>');
  assert.equal(reason?.id, 'reason.adoptSlotBindings');
});

test('a button that already carries data-variant is refused, not written twice', () => {
  assert.equal(refusalOf('<button class="p-2" data-variant="ghost">x</button>')?.id, 'reason.adoptUnknownAttr');
});

test('nothing else candidates — this group is buttons and only buttons', () => {
  assert.equal(candidate(shapeOf('<a class="p-2" href="/x">x</a>', 'a')), null);
  assert.equal(candidate(shapeOf('<input class="p-2">', 'input')), null);
  assert.equal(candidate(shapeOf('<div class="p-2">x</div>', 'div')), null);
  // Already adopted: a molecule tag is not a control to convert.
  assert.equal(candidate(shapeOf('<grouptriggeraction--ml-button-standard></grouptriggeraction--ml-button-standard>',
    'grouptriggeraction--ml-button-standard')), null);
});

test('the button is its own unit — nothing is lifted', () => {
  assert.equal(candidate(shapeOf('<button class="p-2">x</button>'))!.lift, 0);
});
