/// <mls fileReference="_102020_/l2/aura/plugins/helpers/dsTokenInspect.ts" enhancement="_blank"/>

// Token ↔ element, both ways, for the L5 → UI editor:
//   * elementsUsingTokens — hover a token row: which page elements read it (directly, or through a
//     token that points at it: `--ml-primary: var(--primary)` makes a molecule count for `primary`);
//   * tokensForElement    — inspect mode: which tokens an element reads, its own rules first, then the
//     inherited properties (color, font…) it gets from ancestors up to the page host.
// Read from the CSSOM (forEachStyleDecl), same source as the "used on this page" marks.
//
// The highlight is an OVERLAY: fixed boxes in a container of our own under <body>, never a class or
// style on the page's elements — touching them would wake the used-token MutationObserver and leave
// the app's DOM dirty. The pure pieces are exported for Node tests.

import { cleanSelector, expandRefs, forEachStyleDecl, safeMatches, tokenGraph, varRefs } from '/_102020_/l2/aura/plugins/helpers/dsUsedTokens.js';

/** name → names whose value reads it (`primary` → {`ml-primary`}). */
export function reverseGraph(graph: Map<string, Set<string>>): Map<string, Set<string>> {
  const out = new Map<string, Set<string>>();
  for (const [name, refs] of graph) {
    for (const r of refs) {
      const set = out.get(r) ?? new Set<string>();
      set.add(name);
      out.set(r, set);
    }
  }
  return out;
}

// Inherited CSS properties that commonly carry a token: what an element "gets" from its ancestors.
const INHERITED = /^(color|font(-.*)?|line-height|letter-spacing|word-spacing|text-(align|indent|transform|shadow)|white-space|cursor|visibility|caret-color|accent-color|list-style(-.*)?|quotes|tab-size|direction)$/;

export function isInheritedProp(prop: string): boolean {
  return INHERITED.test(prop);
}

/** Token names read by a declaration block, optionally only through inherited properties. */
export function declRefs(style: Pick<CSSStyleDeclaration, 'length' | 'item' | 'getPropertyValue'>, inheritedOnly: boolean): string[] {
  const out: string[] = [];
  for (let i = 0; i < style.length; i++) {
    const prop = style.item(i);
    if (inheritedOnly && !isInheritedProp(prop)) continue;
    const value = style.getPropertyValue(prop);
    if (value.includes('var(')) out.push(...varRefs(value));
  }
  return out;
}

// ─── DOM side ─────────────────────────────────────────────────────────

/** Elements under `root` (root included) that read any of `tokens`, directly or through the token graph. */
export function elementsUsingTokens(root: Element, doc: Document, tokens: string[], tokensCss: string): Element[] {
  const names = expandRefs(tokens, reverseGraph(tokenGraph(tokensCss)));
  const reads = (text: string) => varRefs(text).some(n => names.has(n));
  const found = new Set<Element>();
  forEachStyleDecl(doc, (selector, style) => {
    if (!style.cssText.includes('var(') || !reads(style.cssText)) return;
    const sel = cleanSelector(selector);
    if (!sel) return;
    try {
      if (root.matches(sel)) found.add(root);
      for (const el of Array.from(root.querySelectorAll(sel))) found.add(el);
    } catch { /* selector this engine cannot evaluate */ }
  });
  for (const el of [root, ...Array.from(root.querySelectorAll('[style]'))]) {
    const inline = el.getAttribute('style');
    if (inline && reads(inline)) found.add(el);
  }
  // Document order, so the boxes (and the "+N" cut) are stable.
  return [...found].sort((a, b) => (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? -1 : 1));
}

export interface ElementTokens { own: string[]; inherited: string[]; }

/** Tokens `el` reads: its own rules + inline style, then inherited properties from ancestors up to `root`. */
export function tokensForElement(el: Element, root: Element, doc: Document, tokensCss: string): ElementTokens {
  const graph = tokenGraph(tokensCss);
  const chain: Element[] = [];
  for (let a = el.parentElement; a && root.contains(a); a = a.parentElement) chain.push(a);

  const own = new Set<string>();
  const inherited = new Set<string>();
  forEachStyleDecl(doc, (selector, style) => {
    if (!style.cssText.includes('var(')) return;
    if (safeMatches(el, selector)) for (const r of declRefs(style, false)) own.add(r);
    else if (chain.some(a => safeMatches(a, selector))) for (const r of declRefs(style, true)) inherited.add(r);
  });
  const inlineOwn = (el as HTMLElement).style;
  if (inlineOwn) for (const r of declRefs(inlineOwn, false)) own.add(r);
  for (const a of chain) {
    const st = (a as HTMLElement).style;
    if (st) for (const r of declRefs(st, true)) inherited.add(r);
  }

  const ownAll = expandRefs(own, graph);
  const inheritedAll = [...expandRefs(inherited, graph)].filter(n => !ownAll.has(n));
  return { own: [...ownAll], inherited: inheritedAll };
}

// ─── Overlay highlighter ──────────────────────────────────────────────

const MAX_BOXES = 200;

export interface Highlighter {
  show(elements: Element[], tone?: 'hover' | 'pick'): void;
  clear(): void;
  destroy(): void;
}

export function createHighlighter(doc: Document): Highlighter {
  let layer: HTMLDivElement | null = null;
  let current: Element[] = [];
  let tone: 'hover' | 'pick' = 'hover';
  let frame = 0;

  const ensureLayer = () => {
    if (layer?.isConnected) return layer;
    layer = doc.createElement('div');
    layer.setAttribute('data-ds-token-highlight', '');
    layer.style.cssText = 'position:fixed;inset:0;pointer-events:none;z-index:2147483000;';
    doc.body.appendChild(layer);
    return layer;
  };

  const draw = () => {
    frame = 0;
    const host = ensureLayer();
    host.replaceChildren();
    const color = tone === 'pick' ? '236,72,153' : '99,102,241';   // pink-500 / indigo-500
    for (const el of current.slice(0, MAX_BOXES)) {
      const r = el.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      const box = doc.createElement('div');
      box.style.cssText = `position:fixed;left:${r.left}px;top:${r.top}px;width:${r.width}px;height:${r.height}px;`
        + `outline:2px solid rgba(${color},.9);outline-offset:-1px;background:rgba(${color},.08);border-radius:2px;`;
      host.appendChild(box);
    }
    if (current.length > MAX_BOXES) {
      const more = doc.createElement('div');
      more.textContent = `+${current.length - MAX_BOXES}`;
      more.style.cssText = `position:fixed;right:12px;bottom:12px;padding:2px 6px;border-radius:4px;font:600 11px system-ui;color:#fff;background:rgb(${color});`;
      host.appendChild(more);
    }
  };

  const schedule = () => { if (current.length && !frame) frame = requestAnimationFrame(draw); };
  const win = doc.defaultView;

  return {
    show(elements, t = 'hover') {
      current = elements;
      tone = t;
      win?.addEventListener('scroll', schedule, true);
      win?.addEventListener('resize', schedule);
      draw();
    },
    clear() {
      current = [];
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      win?.removeEventListener('scroll', schedule, true);
      win?.removeEventListener('resize', schedule);
      layer?.replaceChildren();
    },
    destroy() {
      this.clear();
      layer?.remove();
      layer = null;
    },
  };
}
