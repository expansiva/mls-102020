/// <mls fileReference="_102020_/l2/aura/studio/pageTreePanel.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The page tree: the "Structure" section at the top of the Visual tab of the Pages plugin.
//
// WHAT IT IS
// A view of the page on screen, built by the editor (pageTreeCore) and handed here as DATA through
// pageTreeDock. It selects (by the editor's one selection path), marks on hover, and reorders
// siblings by drag. It never holds a live node: what goes back to the editor is a node id, resolved
// there at the moment of the click.
//
// WHAT IT IS NOT
// A mode. Nothing else in the editor changes while it is open or closed; it is one more way in to the
// same selection. The open/closed state is the person's preference (localStorage, read and written
// defensively, like the picker's docked/floating mode).
//
// IDS ARE NOT STABLE across rebuilds (a node added above shifts every id below it), so what the panel
// remembers — which nodes are open — is keyed by the node's PATH (position + tag at every level),
// which survives an edit elsewhere in the page.
//
// LIGHT DOM, in the same document as the client page, so every class carries the `apt-` prefix (the
// Tailwind JIT scans it in studio mode), the same rule as the docked picker's `acp-`.

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import {
  searchTree,
  treeDropRefusal,
  type IPageTree,
  type IPageTreeNode,
} from '/_102020_/l2/aura/studio/pageTreeCore.js';
import {
  dockPageTree,
  TREE_HOVER,
  TREE_MOVE,
  TREE_SELECT,
  undockPageTree,
  type IPageTreeSink,
  type ITreeMoveDetail,
} from '/_102020_/l2/aura/studio/pageTreeDock.js';

export const PAGE_TREE_TAG = 'aura--studio--page-tree-102020';

const OPEN_KEY = 'aura.studio.pageTreeOpen';

/** Levels opened on their own the first time a page shows up. */
const AUTO_OPEN_DEPTH = 2;

const ICONS: Record<IPageTreeNode['kind'], string> = {
  page: '▣',
  organism: '◆',
  molecule: '⬡',
  slot: '⌗',
  element: '▢',
};

function readOpen(): boolean {
  try {
    return localStorage.getItem(OPEN_KEY) !== 'closed';
  } catch {
    return true;
  }
}

function writeOpen(open: boolean): void {
  try {
    localStorage.setItem(OPEN_KEY, open ? 'open' : 'closed');
  } catch { /* storage blocked: the choice lasts the session */ }
}

@customElement(PAGE_TREE_TAG)
export class PageTreePanel extends StateLitElement implements IPageTreeSink {
  @property({ attribute: false }) tree: IPageTree | null = null;
  @property({ attribute: false }) selectedId: number | null = null;

  @state() private open = readOpen();
  @state() private query = '';
  /** Open nodes, by path key. */
  @state() private expanded = new Set<string>();
  /** The row the keyboard is on (a node id of the current tree). */
  @state() private focusId: number | null = null;
  /** Drag in progress: the node, and what the row under the pointer would say. */
  @state() private dragId: number | null = null;
  @state() private dropAt: { id: number; side: 'before' | 'after' | null; reason: string } | null = null;

  /** Path key of every id, and the id of every path key — recomputed per tree. */
  private keyOf = new Map<number, string>();
  /** The page the expanded set belongs to; another page starts from the auto-opened levels. */
  private pageKey = '';
  private scrollToSelection = false;

  connectedCallback(): void {
    super.connectedCallback();
    dockPageTree(this);
  }

  disconnectedCallback(): void {
    undockPageTree(this);
    super.disconnectedCallback();
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    if (changed.has('tree')) this.indexTree();
    if ((changed.has('selectedId') || changed.has('tree')) && this.tree && this.selectedId !== null) {
      // The selection came from anywhere (a click on the page, the breadcrumb, Esc): open the way to it.
      const before = this.expanded.size;
      const next = new Set(this.expanded);
      for (let at = this.tree.parentOf[this.selectedId]; at >= 0; at = this.tree.parentOf[at]) {
        const key = this.keyOf.get(at);
        if (key) next.add(key);
      }
      if (next.size !== before) this.expanded = next;
      if (changed.has('selectedId')) this.scrollToSelection = true;
    }
  }

  updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!this.scrollToSelection) return;
    this.scrollToSelection = false;
    const row = this.querySelector<HTMLElement>('.apt-row.apt-selected');
    const list = this.querySelector<HTMLElement>('.apt-list');
    if (!row || !list) return;
    // Only the list scrolls: scrolling the side panel or the page would move what the person is using.
    const rowBox = row.getBoundingClientRect();
    const listBox = list.getBoundingClientRect();
    if (rowBox.top < listBox.top) list.scrollTop -= listBox.top - rowBox.top;
    else if (rowBox.bottom > listBox.bottom) list.scrollTop += rowBox.bottom - listBox.bottom;
  }

  /** Keys by path, and the auto-opened levels when the page changed. */
  private indexTree(): void {
    this.keyOf = new Map();
    const tree = this.tree;
    if (!tree) return;
    const visit = (node: IPageTreeNode, key: string): void => {
      this.keyOf.set(node.id, key);
      node.children.forEach((kid, at) => visit(kid, `${key}/${at}:${kid.tag}${kid.repeated ? '*' : ''}`));
    };
    const rootKey = `${tree.root.tag}`;
    visit(tree.root, rootKey);
    if (rootKey !== this.pageKey) {
      this.pageKey = rootKey;
      const auto = new Set<string>();
      const open = (node: IPageTreeNode, depth: number): void => {
        if (depth >= AUTO_OPEN_DEPTH || node.repeated) return;
        auto.add(this.keyOf.get(node.id)!);
        node.children.forEach((kid) => open(kid, depth + 1));
      };
      open(tree.root, 0);
      this.expanded = auto;
      this.focusId = null;
    }
  }

  // ─── Actions ──────────────────────────────────────────────────────────────

  private emit<T>(type: string, detail: T): void {
    this.dispatchEvent(new CustomEvent(type, { detail }));
  }

  private toggleOpen(): void {
    this.open = !this.open;
    writeOpen(this.open);
    if (!this.open) this.emit(TREE_HOVER, null);
  }

  private toggle(node: IPageTreeNode): void {
    const key = this.keyOf.get(node.id);
    if (!key) return;
    const next = new Set(this.expanded);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    this.expanded = next;
  }

  private isOpen(node: IPageTreeNode): boolean {
    if (this.query.trim()) return true;
    const key = this.keyOf.get(node.id);
    return key !== undefined && this.expanded.has(key);
  }

  private select(node: IPageTreeNode): void {
    this.focusId = node.id;
    this.emit(TREE_SELECT, node.id);
  }

  private collapseAll(): void {
    const tree = this.tree;
    this.expanded = tree ? new Set([this.keyOf.get(tree.root.id)!]) : new Set();
  }

  /** The rows on screen, in order — what the arrow keys walk. */
  private visibleIds(): number[] {
    const tree = this.tree;
    if (!tree) return [];
    const search = searchTree(tree, this.query);
    const filtering = Boolean(this.query.trim());
    const out: number[] = [];
    const walk = (node: IPageTreeNode): void => {
      if (filtering && !search.visible.has(node.id)) return;
      out.push(node.id);
      if (node.children.length && this.isOpen(node)) node.children.forEach(walk);
    };
    walk(tree.root);
    return out;
  }

  private onKey(e: KeyboardEvent): void {
    const tree = this.tree;
    if (!tree) return;
    const ids = this.visibleIds();
    const current = this.focusId ?? this.selectedId ?? ids[0];
    const at = ids.indexOf(current);
    const node = (id: number): IPageTreeNode | null => {
      const stack = [tree.root];
      while (stack.length) {
        const next = stack.pop()!;
        if (next.id === id) return next;
        stack.push(...next.children);
      }
      return null;
    };
    let handled = true;
    if (e.key === 'ArrowDown') this.focusId = ids[Math.min(ids.length - 1, at + 1)] ?? current;
    else if (e.key === 'ArrowUp') this.focusId = ids[Math.max(0, at - 1)] ?? current;
    else if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      const focused = node(current);
      const opening = e.key === 'ArrowRight';
      if (focused && focused.children.length && this.isOpen(focused) !== opening) this.toggle(focused);
      else if (!opening && tree.parentOf[current] >= 0) this.focusId = tree.parentOf[current];
    } else if (e.key === 'Enter') {
      const focused = node(current);
      if (focused) this.select(focused);
    } else handled = false;
    if (!handled) return;
    e.preventDefault();
    // The editor's own keys (Ctrl+Z, Esc, Ctrl+Alt+↑) are on the window in capture; arrows here are ours.
    e.stopPropagation();
    if (this.focusId !== null) this.emit(TREE_HOVER, this.focusId);
  }

  // ─── Drag (siblings of the same parent, at any distance) ────────────────

  private canMove(node: IPageTreeNode): boolean {
    return node.kind !== 'page' && node.kind !== 'slot' && !node.item && !node.repeated;
  }

  private onDragStart(e: DragEvent, node: IPageTreeNode): void {
    this.dragId = node.id;
    e.dataTransfer?.setData('text/plain', String(node.id));
    if (e.dataTransfer) e.dataTransfer.effectAllowed = 'move';
    this.emit(TREE_HOVER, null);
  }

  private onDragOver(e: DragEvent, node: IPageTreeNode): void {
    const tree = this.tree;
    if (this.dragId === null || !tree) return;
    const refusal = treeDropRefusal(tree, this.dragId, node.id);
    if (refusal) {
      this.dropAt = { id: node.id, side: null, reason: refusal === 'self' ? '' : t(`tree.drop.${refusal}`) };
      return;
    }
    e.preventDefault();
    const box = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const side = e.clientY < box.top + box.height / 2 ? 'before' : 'after';
    if (this.dropAt?.id !== node.id || this.dropAt.side !== side) this.dropAt = { id: node.id, side, reason: '' };
  }

  private onDrop(e: DragEvent, node: IPageTreeNode): void {
    e.preventDefault();
    const moved = this.dragId;
    const side = this.dropAt?.id === node.id ? this.dropAt.side : null;
    this.endDrag();
    if (moved === null || !side) return;
    this.emit<ITreeMoveDetail>(TREE_MOVE, { moved, target: node.id, side });
  }

  private endDrag(): void {
    this.dragId = null;
    this.dropAt = null;
  }

  // ─── Render ───────────────────────────────────────────────────────────────

  render() {
    return html`
      <div class="apt-head">
        <button type="button" class="apt-toggle" aria-expanded=${String(this.open)} @click=${this.toggleOpen}>
          <span class="apt-chev">${this.open ? '▾' : '▸'}</span>${t('tree.title')}
        </button>
        ${this.open && this.selectedId !== null ? html`<span class="apt-note">${t('tree.followsSelection')}</span>` : nothing}
      </div>
      ${this.open ? this.renderBody() : nothing}
    `;
  }

  private renderBody() {
    const tree = this.tree;
    if (!tree) return html`<div class="apt-empty">${t('tree.empty')}</div>`;
    const search = searchTree(tree, this.query);
    const filtering = Boolean(this.query.trim());
    const rows = this.renderNode(tree.root, 0, false, filtering ? search : null);
    return html`
      <div class="apt-tools">
        <input class="apt-search" type="search" .value=${this.query} placeholder=${t('tree.search')}
          @input=${(e: Event) => { this.query = (e.target as HTMLInputElement).value; }}>
        <button type="button" class="apt-icon" title=${t('tree.collapseAll')} @click=${this.collapseAll}>⊟</button>
      </div>
      <div class="apt-list" role="tree" tabindex="0"
        @keydown=${this.onKey}
        @mouseleave=${() => this.emit(TREE_HOVER, null)}
        @dragend=${this.endDrag}>
        ${filtering && !search.hits.size ? html`<div class="apt-empty">${t('tree.noMatch')}</div>` : rows}
      </div>
      ${this.dropAt?.reason ? html`<div class="apt-drop-reason">${this.dropAt.reason}</div>` : nothing}
    `;
  }

  private renderNode(
    node: IPageTreeNode,
    depth: number,
    parentHidden: boolean,
    search: { hits: Set<number>; visible: Set<number> } | null,
  ): TemplateResult | typeof nothing {
    if (search && !search.visible.has(node.id)) return nothing;
    const open = this.isOpen(node);
    const hasKids = node.children.length > 0;
    const dimmed = parentHidden || node.hidden;
    const drop = this.dropAt?.id === node.id ? this.dropAt : null;
    const classes = [
      'apt-row',
      `apt-kind-${node.kind}`,
      node.id === this.selectedId ? 'apt-selected' : '',
      node.id === this.focusId ? 'apt-focus' : '',
      dimmed ? 'apt-dim' : '',
      search?.hits.has(node.id) ? 'apt-hit' : '',
      this.dragId === node.id ? 'apt-dragging' : '',
      drop?.side === 'before' ? 'apt-drop-before' : '',
      drop?.side === 'after' ? 'apt-drop-after' : '',
      drop && !drop.side && drop.reason ? 'apt-drop-no' : '',
    ].filter(Boolean).join(' ');

    const main = node.kind === 'element' && node.text ? node.text : node.name;
    const second = node.kind === 'element'
      ? (node.text ? node.tag : '')
      : node.kind === 'page' ? '' : node.text ? `“${node.text}”` : '';
    const layout = node.layout === 'grid'
      ? (node.columns ? t('tree.layout.gridCols', { count: node.columns }) : t('tree.layout.grid'))
      : node.layout ? t(`tree.layout.${node.layout}`) : '';
    const canDrag = this.canMove(node);

    const row = html`
      <div class=${classes} role="treeitem" aria-selected=${String(node.id === this.selectedId)}
        aria-expanded=${hasKids ? String(open) : nothing}
        style="padding-left:${4 + depth * 14}px"
        title=${`${t(`tree.kind.${node.kind}`)} · ${node.tag}`}
        draggable=${canDrag ? 'true' : 'false'}
        @mouseenter=${() => { if (this.dragId === null) this.emit(TREE_HOVER, node.id); }}
        @click=${() => this.select(node)}
        @dragstart=${(e: DragEvent) => this.onDragStart(e, node)}
        @dragover=${(e: DragEvent) => this.onDragOver(e, node)}
        @dragleave=${() => { if (this.dropAt?.id === node.id) this.dropAt = null; }}
        @drop=${(e: DragEvent) => this.onDrop(e, node)}>
        <button type="button" class="apt-chev ${hasKids ? '' : 'apt-none'}" tabindex="-1"
          @click=${(e: Event) => { e.stopPropagation(); this.toggle(node); }}>${hasKids ? (open ? '▾' : '▸') : ''}</button>
        <span class="apt-ico" aria-hidden="true">${ICONS[node.kind]}</span>
        <span class="apt-main">${main}</span>
        ${second ? html`<span class="apt-second">${second}</span>` : nothing}
        ${layout ? html`<span class="apt-layout">${layout}</span>` : nothing}
        ${node.repeated ? html`<span class="apt-badge" title=${t('tree.repeatedTitle', { count: node.repeated })}>× ${node.repeated}</span>` : nothing}
        ${node.hidden && !parentHidden ? html`<span class="apt-badge" title=${t('tree.hiddenTitle')}>${t('tree.hidden')}</span>` : nothing}
        ${this.canMove(node) ? html`<span class="apt-grip" title=${t('tree.drag')}>⠿</span>` : nothing}
      </div>`;

    if (!hasKids || !open) return row;
    return html`${row}${node.children.map((kid) => this.renderNode(kid, depth + 1, dimmed, search))}`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aura--studio--page-tree-102020': PageTreePanel;
  }
}
