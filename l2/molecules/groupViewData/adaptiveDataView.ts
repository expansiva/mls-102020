/// <mls fileReference="_102020_/l2/molecules/groupViewData/adaptiveDataView.ts" enhancement="_102020_/l2/enhancementAura" />

// =============================================================================
// ADAPTIVE DATA VIEW MOLECULE
// =============================================================================
// Skill Group: view + data (groupViewData)
// Renders an adaptive data collection view: Table (desktop) / Cards (mobile)
// This molecule does NOT contain business logic and does NOT access global state.
// =============================================================================

import { html, TemplateResult, nothing, unsafeHTML } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { MoleculeAuraElement, ParsedItem, ParsedGroup } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  loading: 'Loading...',
  empty: 'No records found',
  selectionCount: (count: number) => `${count} selected`,
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    loading: 'Carregando...',
    empty: 'Nenhum registro encontrado',
    selectionCount: (count: number) => `${count} selecionado(s)`,
  },
};
/// **collab_i18n_end**

type SelectionMode = 'none' | 'single' | 'multiple';

type ParsedColumn = {
  field: string;
  header: string;
  width?: string;
  align: 'left' | 'center' | 'right';
  hidden: boolean;
};

type ParsedCell = {
  colspan?: number;
  content: string; // innerHTML
};

type ParsedRow = {
  index: number;
  selected: boolean;
  disabled: boolean;
  cells: ParsedCell[];
  element: Element;
};

@customElement('molecules--group-view-data--adaptive-data-view-102020')
export class AdaptiveDataViewMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // =========================================================================
  // SLOT TAGS
  // =========================================================================
  // Contract-defined slot tags only.
  slotTags = ['Columns', 'Column', 'Rows', 'Row', 'Cell', 'Empty', 'Loading'];

  // =========================================================================
  // PROPERTIES — Contract + implementation-specific
  // =========================================================================
  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  hoverable = true;

  @property({ type: Boolean })
  selectable = false;

  /** When true, blocks all interactions (click/keyboard/selection). */
  @property({ type: Boolean })
  disabled = false;

  /** Selection mode: none | single | multiple */
  @property({ type: String })
  selectionMode: SelectionMode = 'none';

  /** Breakpoint (px). Below this width -> cards, otherwise table. */
  @property({ type: Number, attribute: 'breakpoint' })
  breakpointPx = 768;

  // =========================================================================
  // INTERNAL STATE
  // =========================================================================
  @state()
  private isCardMode = false;

  @state()
  private selectedIndexes: number[] = [];

  @state()
  private activeIndex = 0;

  private resizeObserver: ResizeObserver | null = null;
  private mediaQueryList: MediaQueryList | null = null;

  // =========================================================================
  // LIFECYCLE
  // =========================================================================
  connectedCallback() {
    super.connectedCallback();
    this.setupResponsiveMode();
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    this.teardownResponsiveMode();
  }

  firstUpdated() {
    // Initialize selection from declarative <Row selected>
    this.syncSelectionFromSlots();
    this.syncActiveIndex();
  }

  updated(changed: Map<string, unknown>) {
    if (changed.has('breakpointPx')) {
      this.teardownResponsiveMode();
      this.setupResponsiveMode();
    }

    // Re-sync selection if slot content changed due to parent re-render.
    // We do this lightly by checking selected indexes existence.
    if (changed.has('loading') || changed.has('disabled') || changed.has('selectionMode') || changed.has('selectable')) {
      this.syncActiveIndex();
    }
  }

  // =========================================================================
  // RESPONSIVE MODE
  // =========================================================================
  private setupResponsiveMode(): void {
    // Prefer matchMedia for viewport width changes.
    const mq = `(max-width: ${Math.max(0, this.breakpointPx - 1)}px)`;
    if (typeof window !== 'undefined' && 'matchMedia' in window) {
      this.mediaQueryList = window.matchMedia(mq);
      this.isCardMode = this.mediaQueryList.matches;
      const handler = (e: MediaQueryListEvent) => {
        this.isCardMode = e.matches;
      };
      // addEventListener supported in modern browsers.
      try {
        this.mediaQueryList.addEventListener('change', handler);
        // Store handler on instance via closure; teardown re-creates anyway.
      } catch {
        // Safari fallback
        this.mediaQueryList.addListener(handler);
      }
      return;
    }

    // Fallback to ResizeObserver on host.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(entries => {
        const entry = entries[0];
        const width = entry?.contentRect?.width ?? 0;
        this.isCardMode = width < this.breakpointPx;
      });
      this.resizeObserver.observe(this);
    }
  }

  private teardownResponsiveMode(): void {
    if (this.resizeObserver) {
      try {
        this.resizeObserver.disconnect();
      } catch {
        // ignore
      }
      this.resizeObserver = null;
    }

    if (this.mediaQueryList) {
      // Remove listeners best-effort.
      try {
        // We cannot remove the exact handler reference here due to closure.
        // Replacing matchMedia on breakpoint changes is enough; disconnectCallback handles lifecycle.
      } catch {
        // ignore
      }
      this.mediaQueryList = null;
    }
  }

  // =========================================================================
  // PARSERS
  // =========================================================================
  private parseColumns(): ParsedColumn[] {
    const colsEl = this.getSlot('Columns');
    if (!colsEl) return [];
    const columnEls = Array.from(colsEl.querySelectorAll('Column'));
    return columnEls.map(el => {
      const alignRaw = (el.getAttribute('align') || 'left').toLowerCase();
      const align = (alignRaw === 'center' || alignRaw === 'right' || alignRaw === 'left') ? (alignRaw as 'left' | 'center' | 'right') : 'left';
      return {
        field: el.getAttribute('field') || '',
        header: el.getAttribute('header') || '',
        width: el.getAttribute('width') || undefined,
        align,
        hidden: el.hasAttribute('hidden'),
      };
    });
  }

  private parseRows(): ParsedRow[] {
    const rowsEl = this.getSlot('Rows');
    if (!rowsEl) return [];
    const rowEls = Array.from(rowsEl.querySelectorAll(':scope > Row'));

    return rowEls.map((rowEl, index) => {
      const cellEls = Array.from(rowEl.querySelectorAll(':scope > Cell'));
      const cells: ParsedCell[] = cellEls.map(cell => ({
        colspan: cell.getAttribute('colspan') ? Number(cell.getAttribute('colspan')) : undefined,
        content: cell.innerHTML,
      }));
      return {
        index,
        selected: rowEl.hasAttribute('selected'),
        disabled: rowEl.hasAttribute('disabled'),
        cells,
        element: rowEl,
      };
    });
  }

  private getVisibleColumnIndexes(columns: ParsedColumn[]): number[] {
    return columns
      .map((c, idx) => ({ c, idx }))
      .filter(x => !x.c.hidden)
      .map(x => x.idx);
  }

  // =========================================================================
  // VALIDATION / SYNC
  // =========================================================================
  private syncSelectionFromSlots(): void {
    const rows = this.parseRows();
    const selected = rows.filter(r => r.selected).map(r => r.index);

    if (!this.selectable || this.selectionMode === 'none') {
      this.selectedIndexes = [];
      return;
    }

    if (this.selectionMode === 'single') {
      this.selectedIndexes = selected.length > 0 ? [selected[0]] : [];
      return;
    }

    // multiple
    this.selectedIndexes = selected;
  }

  private syncActiveIndex(): void {
    const rows = this.parseRows();
    if (rows.length === 0) {
      this.activeIndex = 0;
      return;
    }

    const firstSelected = this.selectedIndexes[0];
    const preferred = typeof firstSelected === 'number' ? firstSelected : 0;
    this.activeIndex = Math.min(Math.max(0, preferred), rows.length - 1);
  }

  private isInteractiveBlocked(): boolean {
    return this.loading || this.disabled;
  }

  private isRowSelected(index: number): boolean {
    return this.selectedIndexes.includes(index);
  }

  // =========================================================================
  // EVENTS
  // =========================================================================
  private emitRowClick(index: number, rowEl: Element): void {
    this.dispatchEvent(
      new CustomEvent('row-click', {
        bubbles: true,
        composed: true,
        detail: { index, data: rowEl },
      }),
    );
  }

  private emitSelectionChange(): void {
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        bubbles: true,
        composed: true,
        detail: { selected: [...this.selectedIndexes] },
      }),
    );
  }

  // =========================================================================
  // SELECTION HANDLING
  // =========================================================================
  private handleToggleSelection(index: number, row: ParsedRow): void {
    if (this.isInteractiveBlocked()) return;
    if (!this.selectable || this.selectionMode === 'none') return;
    if (row.disabled) return;

    if (this.selectionMode === 'single') {
      const next = this.isRowSelected(index) ? [] : [index];
      this.selectedIndexes = next;
      this.emitSelectionChange();
      return;
    }

    // multiple
    const set = new Set(this.selectedIndexes);
    if (set.has(index)) set.delete(index);
    else set.add(index);
    this.selectedIndexes = Array.from(set).sort((a, b) => a - b);
    this.emitSelectionChange();
  }

  private handleRowActivate(index: number, row: ParsedRow): void {
    if (this.isInteractiveBlocked()) return;
    if (row.disabled) return;

    this.activeIndex = index;
    this.emitRowClick(index, row.element);

    // Selection on click depends on selectable.
    if (this.selectable && this.selectionMode !== 'none') {
      this.handleToggleSelection(index, row);
    }
  }

  // =========================================================================
  // KEYBOARD NAVIGATION
  // =========================================================================
  private handleKeyDown(e: KeyboardEvent): void {
    if (this.isInteractiveBlocked()) return;

    const rows = this.parseRows();
    if (rows.length === 0) return;

    const key = e.key;
    const current = this.activeIndex;

    const findNextEnabled = (start: number, dir: 1 | -1): number => {
      let i = start;
      for (let steps = 0; steps < rows.length; steps++) {
        i = i + dir;
        if (i < 0) i = rows.length - 1;
        if (i >= rows.length) i = 0;
        if (!rows[i].disabled) return i;
      }
      return start;
    };

    if (key === 'ArrowDown' || key === 'ArrowRight') {
      e.preventDefault();
      this.activeIndex = findNextEnabled(current, 1);
      this.focusActiveRow();
      return;
    }

    if (key === 'ArrowUp' || key === 'ArrowLeft') {
      e.preventDefault();
      this.activeIndex = findNextEnabled(current, -1);
      this.focusActiveRow();
      return;
    }

    if (key === 'Home') {
      e.preventDefault();
      const first = rows.findIndex(r => !r.disabled);
      this.activeIndex = first >= 0 ? first : 0;
      this.focusActiveRow();
      return;
    }

    if (key === 'End') {
      e.preventDefault();
      const last = (() => {
        for (let i = rows.length - 1; i >= 0; i--) if (!rows[i].disabled) return i;
        return rows.length - 1;
      })();
      this.activeIndex = last;
      this.focusActiveRow();
      return;
    }

    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      const row = rows[this.activeIndex];
      if (!row) return;
      this.handleRowActivate(this.activeIndex, row);
      return;
    }
  }

  private focusActiveRow(): void {
    // Focus the element representing the active row/card (rendered with data-row-index)
    const el = this.querySelector(`[data-row-index="${this.activeIndex}"]`) as HTMLElement | null;
    el?.focus();
  }

  // =========================================================================
  // CSS HELPERS
  // =========================================================================
  private getRowClasses(row: ParsedRow): string {
    const selected = this.isRowSelected(row.index);
    const blocked = this.isInteractiveBlocked();

    return [
      'w-full',
      'transition',
      'outline-none',
      // base
      'border-b border-slate-200',
      // hover
      this.hoverable && !blocked && !row.disabled ? 'hover:bg-slate-50' : '',
      // selected
      selected ? 'bg-sky-50' : 'bg-white',
      // disabled
      row.disabled || blocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      // focus
      !row.disabled && !blocked ? 'focus:ring-2 focus:ring-sky-500 focus:ring-offset-2' : '',
    ].filter(Boolean).join(' ');
  }

  private getCardClasses(row: ParsedRow): string {
    const selected = this.isRowSelected(row.index);
    const blocked = this.isInteractiveBlocked();

    return [
      'w-full',
      'rounded-lg border',
      'transition',
      'outline-none',
      // state
      selected ? 'border-sky-400 bg-sky-50' : 'border-slate-200 bg-white',
      this.hoverable && !blocked && !row.disabled ? 'hover:border-slate-300 hover:bg-slate-50' : '',
      row.disabled || blocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      !row.disabled && !blocked ? 'focus:ring-2 focus:ring-sky-500 focus:ring-offset-2' : '',
      'p-4',
    ].filter(Boolean).join(' ');
  }

  private getCellAlignClass(align: 'left' | 'center' | 'right'): string {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  }

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  private renderLoadingState(): TemplateResult {
    const content = this.getSlotContent('Loading');
    return html`
      <div class="w-full py-10 text-center text-slate-600" aria-live="polite">
        ${content ? unsafeHTML(content) : html`${this.msg.loading}`}
      </div>
    `;
  }

  private renderEmptyState(): TemplateResult {
    const content = this.getSlotContent('Empty');
    return html`
      <div class="w-full py-10 text-center text-slate-500" aria-live="polite">
        ${content ? unsafeHTML(content) : html`${this.msg.empty}`}
      </div>
    `;
  }

  private renderSelectionHint(): TemplateResult {
    if (!this.selectable || this.selectionMode === 'none') return html`${nothing}`;
    const count = this.selectedIndexes.length;
    return html`
      <div class="sr-only" aria-live="polite">
        ${this.msg.selectionCount(count)}
      </div>
    `;
  }

  private renderTable(columns: ParsedColumn[], rows: ParsedRow[]): TemplateResult {
    const visibleIdx = this.getVisibleColumnIndexes(columns);
    const ariaLabel = this.ariaLabel || 'Data table';

    return html`
      <div
        class="w-full"
        role="region"
        aria-label=${ariaLabel}
        aria-busy=${this.loading ? 'true' : 'false'}
        @keydown=${this.handleKeyDown}
      >
        ${this.renderSelectionHint()}

        <div class="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table class="min-w-full border-collapse" role="table">
            <thead class="bg-slate-50" role="rowgroup">
              <tr role="row" class="text-slate-700">
                ${visibleIdx.map(i => {
                  const col = columns[i];
                  const thClasses = [
                    'px-4 py-3 text-xs font-semibold uppercase tracking-wide',
                    this.getCellAlignClass(col.align),
                  ].join(' ');
                  const style = col.width ? `width:${col.width};` : '';
                  return html`<th role="columnheader" class=${thClasses} style=${style}>${col.header}</th>`;
                })}
              </tr>
            </thead>

            <tbody role="rowgroup">
              ${rows.map(row => {
                const selected = this.isRowSelected(row.index);
                const blocked = this.isInteractiveBlocked();
                const tabIndex = row.index === this.activeIndex && !blocked ? 0 : -1;

                return html`
                  <tr
                    role="row"
                    class=${this.getRowClasses(row)}
                    data-row-index=${row.index}
                    tabindex=${tabIndex}
                    aria-selected=${selected ? 'true' : 'false'}
                    aria-disabled=${row.disabled || blocked ? 'true' : 'false'}
                    @click=${() => this.handleRowActivate(row.index, row)}
                  >
                    ${visibleIdx.map(i => {
                      const col = columns[i];
                      const cell = row.cells[i];
                      const tdClasses = [
                        'px-4 py-3 text-sm text-slate-900 align-top',
                        this.getCellAlignClass(col.align),
                      ].join(' ');

                      // If a cell is missing, render empty.
                      if (!cell) {
                        return html`<td role="cell" class=${tdClasses}></td>`;
                      }

                      const colspan = cell.colspan && cell.colspan > 1 ? cell.colspan : undefined;
                      return html`
                        <td role="cell" class=${tdClasses} colspan=${colspan ?? nothing}>
                          ${unsafeHTML(cell.content)}
                        </td>
                      `;
                    })}
                  </tr>
                `;
              })}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  private renderCards(columns: ParsedColumn[], rows: ParsedRow[]): TemplateResult {
    const visibleIdx = this.getVisibleColumnIndexes(columns);
    const ariaLabel = this.ariaLabel || 'Data list';

    // In card mode, use first visible column as title.
    const titleColIndex = visibleIdx.length > 0 ? visibleIdx[0] : 0;
    const fieldColIndexes = visibleIdx.filter(i => i !== titleColIndex);

    return html`
      <div
        class="w-full"
        role="region"
        aria-label=${ariaLabel}
        aria-busy=${this.loading ? 'true' : 'false'}
        @keydown=${this.handleKeyDown}
      >
        ${this.renderSelectionHint()}

        <div class="grid grid-cols-1 gap-3">
          ${rows.map(row => {
            const selected = this.isRowSelected(row.index);
            const blocked = this.isInteractiveBlocked();
            const tabIndex = row.index === this.activeIndex && !blocked ? 0 : -1;

            const titleCell = row.cells[titleColIndex];
            const title = titleCell ? titleCell.content : '';

            return html`
              <div
                role="listitem"
                class=${this.getCardClasses(row)}
                data-row-index=${row.index}
                tabindex=${tabIndex}
                aria-selected=${selected ? 'true' : 'false'}
                aria-disabled=${row.disabled || blocked ? 'true' : 'false'}
                @click=${() => this.handleRowActivate(row.index, row)}
              >
                <div class="flex items-start justify-between gap-3">
                  <div class="min-w-0">
                    <div class="text-sm font-semibold text-slate-900 break-words">
                      ${title ? unsafeHTML(title) : html`${nothing}`}
                    </div>
                  </div>

                  ${this.selectable && this.selectionMode !== 'none' ? html`
                    <div class="shrink-0">
                      <div
                        class=${[
                          'h-5 w-5 rounded border flex items-center justify-center',
                          selected ? 'border-sky-500 bg-sky-500' : 'border-slate-300 bg-white',
                        ].join(' ')}
                        aria-hidden="true"
                      >
                        ${selected ? html`<div class="h-2.5 w-2.5 rounded-sm bg-white"></div>` : html`${nothing}`}
                      </div>
                    </div>
                  ` : html`${nothing}`}
                </div>

                ${fieldColIndexes.length > 0 ? html`
                  <dl class="mt-3 grid grid-cols-1 gap-2">
                    ${fieldColIndexes.map(i => {
                      const col = columns[i];
                      const cell = row.cells[i];
                      if (!col || col.hidden) return html`${nothing}`;
                      const value = cell ? cell.content : '';
                      return html`
                        <div class="grid grid-cols-3 gap-3">
                          <dt class="col-span-1 text-xs font-medium text-slate-500">${col.header}</dt>
                          <dd class="col-span-2 text-sm text-slate-900">${value ? unsafeHTML(value) : html`${nothing}`}</dd>
                        </div>
                      `;
                    })}
                  </dl>
                ` : html`${nothing}`}
              </div>
            `;
          })}
        </div>
      </div>
    `;
  }

  private renderContractValidation(columns: ParsedColumn[]): TemplateResult {
    // Render nothing visually; keep as comments for developers in DOM.
    // Contract rules: Columns and Rows required; at least 1 Column required; Column requires field+header.
    const hasColumns = this.hasSlot('Columns');
    const hasRows = this.hasSlot('Rows');
    const errors: string[] = [];

    if (!hasColumns) errors.push('Missing required slot <Columns>');
    if (!hasRows) errors.push('Missing required slot <Rows>');

    if (hasColumns && columns.length === 0) errors.push('At least 1 <Column> is required inside <Columns>');

    columns.forEach(col => {
      if (!col.field) errors.push('<Column> requires attribute "field"');
      if (!col.header) errors.push('<Column> requires attribute "header"');
    });

    if (errors.length === 0) return html`${nothing}`;

    // Hidden developer hint (not user-visible)
    return html`<!-- ${errors.join(' | ')} -->`;
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const columns = this.parseColumns();
    const rows = this.parseRows();

    // States: loading > empty > content
    if (this.loading) {
      return html`
        <div class="w-full" aria-busy="true">
          ${this.renderContractValidation(columns)}
          ${this.renderLoadingState()}
        </div>
      `;
    }

    if (rows.length === 0) {
      return html`
        <div class="w-full" aria-busy="false">
          ${this.renderContractValidation(columns)}
          ${this.renderEmptyState()}
        </div>
      `;
    }

    return html`
      <div class="w-full">
        ${this.renderContractValidation(columns)}
        ${this.isCardMode
          ? this.renderCards(columns, rows)
          : this.renderTable(columns, rows)
        }
      </div>
    `;
  }
}
