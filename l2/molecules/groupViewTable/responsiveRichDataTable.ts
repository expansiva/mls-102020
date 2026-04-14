/// <mls fileReference="_102020_/l2/molecules/groupViewTable/responsiveRichDataTable.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// RESPONSIVE RICH DATA TABLE MOLECULE
// =============================================================================
// Skill Group: view + table (groupViewTable)
// This molecule does NOT contain business logic (no pagination/sort/filter).
// It renders a traditional table layout using Slot Tags and emits interaction events.

import { html, TemplateResult, nothing, unsafeHTML } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  selectRow: 'Select row',
  selectAll: 'Select all rows',
  unselectAll: 'Unselect all rows',
  empty: 'No records found',
  loading: 'Loading...',
};

type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    selectRow: 'Selecionar linha',
    selectAll: 'Selecionar todas as linhas',
    unselectAll: 'Desselecionar todas as linhas',
    empty: 'Nenhum registro encontrado',
    loading: 'Carregando...',
  },
};
/// **collab_i18n_end**

type SelectionMode = 'none' | 'single' | 'multiple';

interface ParsedColumn {
  key: string;
  labelHtml: string;
  align: 'left' | 'center' | 'right';
  width: string | null;
  minWidth: string | null;
  sticky: boolean;
}

interface ParsedRow {
  id: string;
  disabled: boolean;
  cells: Element[];
}

@customElement('molecules--group-view-table--responsive-rich-data-table-102020')
export class ResponsiveRichDataTableMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ===========================================================================
  // Contract base tags + extended tags for richer config
  slotTags = [
    'Caption',
    'TableHeader',
    'TableBody',
    'TableFooter',
    'TableRow',
    'TableHead',
    'TableCell',
    'Empty',
    'Loading',
    // Extended (config)
    'Columns',
    'Column',
  ];

  // ===========================================================================
  // PROPERTIES — From Contract + selection/interaction options
  // ===========================================================================
  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  striped = false;

  @property({ type: Boolean })
  hoverable = true;

  @property({ type: Boolean })
  bordered = false;

  @property({ type: Boolean })
  compact = false;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  readonly = false;

  /** Enables emitting row-click event on row click */
  @property({ type: Boolean, attribute: 'row-clickable' })
  rowClickable = true;

  /** none | single | multiple */
  @property({ type: String, attribute: 'selection-mode' })
  selectionMode: SelectionMode = 'none';

  /** Whether to render a dedicated selection control column */
  @property({ type: Boolean, attribute: 'show-selection-column' })
  showSelectionColumn = false;

  /** Controlled selection: comma-separated ids OR array-like string. Recommended: comma-separated. */
  @property({ type: String, attribute: 'selected-ids' })
  selectedIds: string | null = null;

  /** When true, the component will compute and apply selection changes internally. Default: false (controlled). */
  @property({ type: Boolean, attribute: 'uncontrolled-selection' })
  uncontrolledSelection = false;

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  @state()
  private internalSelected = new Set<string>();

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  connectedCallback() {
    super.connectedCallback();
    this.addEventListener('click', this.handleRootClick as EventListener);
    this.addEventListener('keydown', this.handleRootKeyDown as EventListener);
  }

  disconnectedCallback() {
    this.removeEventListener('click', this.handleRootClick as EventListener);
    this.removeEventListener('keydown', this.handleRootKeyDown as EventListener);
    super.disconnectedCallback();
  }

  // ===========================================================================
  // PARSERS
  // ===========================================================================
  private parseSelectedIds(value: string | null): Set<string> {
    if (!value) return new Set<string>();
    const trimmed = value.trim();
    if (!trimmed) return new Set<string>();

    // Accept simple CSV (preferred)
    if (!trimmed.startsWith('[')) {
      return new Set(
        trimmed
          .split(',')
          .map(s => s.trim())
          .filter(Boolean),
      );
    }

    // Best-effort JSON array parsing
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return new Set(parsed.map(v => String(v)));
      }
      return new Set<string>();
    } catch {
      return new Set<string>();
    }
  }

  private getEffectiveSelectedSet(): Set<string> {
    if (this.uncontrolledSelection) return new Set(this.internalSelected);
    return this.parseSelectedIds(this.selectedIds);
  }

  private getSelectionEnabled(): boolean {
    if (this.disabled || this.readonly) return false;
    return this.selectionMode === 'single' || this.selectionMode === 'multiple';
  }

  private parseColumns(): ParsedColumn[] {
    const columnEls = Array.from(this.querySelectorAll('Columns > Column'));

    // If columns are not provided, infer from header TableHead if present.
    if (columnEls.length === 0) {
      const headerRow = this.querySelector('TableHeader > TableRow');
      const heads = headerRow ? Array.from(headerRow.querySelectorAll('TableHead')) : [];
      return heads.map((th, idx) => {
        const key = th.getAttribute('key') || `col-${idx + 1}`;
        const align = (th.getAttribute('align') as 'left' | 'center' | 'right' | null) || 'left';
        const width = th.getAttribute('width');
        const minWidth = th.getAttribute('minWidth') || th.getAttribute('min-width');
        const sticky = th.hasAttribute('sticky');
        return {
          key,
          labelHtml: th.innerHTML,
          align,
          width,
          minWidth,
          sticky,
        };
      });
    }

    return columnEls.map((col, idx) => {
      const key = col.getAttribute('key') || `col-${idx + 1}`;
      const align = (col.getAttribute('align') as 'left' | 'center' | 'right' | null) || 'left';
      const width = col.getAttribute('width');
      const minWidth = col.getAttribute('minWidth') || col.getAttribute('min-width');
      const sticky = col.hasAttribute('sticky');
      return {
        key,
        labelHtml: col.innerHTML,
        align,
        width,
        minWidth,
        sticky,
      };
    });
  }

  private parseRows(): ParsedRow[] {
    const bodyRowEls = Array.from(this.querySelectorAll('TableBody > TableRow'));
    return bodyRowEls.map((rowEl, idx) => {
      const id = rowEl.getAttribute('id') || rowEl.getAttribute('row-id') || `row-${idx + 1}`;
      const disabled = rowEl.hasAttribute('disabled');
      const cells = Array.from(rowEl.querySelectorAll('TableCell'));
      return { id, disabled, cells };
    });
  }

  private getTextAlignClass(align: 'left' | 'center' | 'right'): string {
    if (align === 'center') return 'text-center';
    if (align === 'right') return 'text-right';
    return 'text-left';
  }

  private getCellPaddingClasses(): string {
    return this.compact ? 'px-3 py-2' : 'px-4 py-3';
  }

  private getTableBaseClasses(): string {
    return [
      'min-w-full',
      'text-sm',
      'text-slate-900',
      'bg-white',
      'border-separate',
      'border-spacing-0',
      'table-auto',
    ].join(' ');
  }

  private getCellBorderClasses(): string {
    // Using border-separate requires borders on cells for full grid.
    return this.bordered ? 'border-b border-slate-200' : 'border-b border-slate-200';
  }

  private getHeadCellClasses(col: ParsedColumn): string {
    return [
      this.getCellPaddingClasses(),
      'font-semibold',
      'text-slate-700',
      'bg-slate-50',
      'align-middle',
      this.getTextAlignClass(col.align),
      this.getCellBorderClasses(),
      this.bordered ? 'border-r border-slate-200 last:border-r-0' : '',
      col.sticky ? 'sticky left-0 z-10' : '',
    ].filter(Boolean).join(' ');
  }

  private getBodyRowClasses(isSelected: boolean, index: number, rowDisabled: boolean): string {
    const canHover = this.hoverable && !rowDisabled;
    const stripedBg = this.striped && index % 2 === 1 ? 'bg-slate-50/60' : 'bg-white';
    return [
      'group',
      'outline-none',
      stripedBg,
      canHover ? 'hover:bg-slate-100/70' : '',
      isSelected ? 'bg-sky-50' : '',
      isSelected ? 'ring-1 ring-inset ring-sky-200' : '',
      rowDisabled ? 'opacity-60' : '',
      this.getSelectionEnabled() && !rowDisabled ? 'cursor-pointer' : '',
      'focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2',
    ].filter(Boolean).join(' ');
  }

  private getBodyCellClasses(col: ParsedColumn, rowDisabled: boolean): string {
    return [
      this.getCellPaddingClasses(),
      'align-top',
      this.getTextAlignClass(col.align),
      this.getCellBorderClasses(),
      this.bordered ? 'border-r border-slate-200 last:border-r-0' : '',
      rowDisabled ? 'text-slate-600' : 'text-slate-900',
      col.sticky ? 'sticky left-0 bg-inherit' : '',
    ].filter(Boolean).join(' ');
  }

  private getColumnStyle(col: ParsedColumn): string {
    const parts: string[] = [];
    if (col.width) parts.push(`width: ${col.width};`);
    if (col.minWidth) parts.push(`min-width: ${col.minWidth};`);
    return parts.join(' ');
  }

  private getSelectionHeaderCellTemplate(): TemplateResult {
    const enabled = this.getSelectionEnabled();
    const isMultiple = this.selectionMode === 'multiple';
    const selected = this.getEffectiveSelectedSet();
    const rows = this.parseRows().filter(r => !r.disabled);
    const allSelectableIds = rows.map(r => r.id);
    const allSelected = allSelectableIds.length > 0 && allSelectableIds.every(id => selected.has(id));
    const someSelected = allSelectableIds.some(id => selected.has(id)) && !allSelected;

    // Header control only makes sense for multiple selection.
    if (!this.showSelectionColumn || !isMultiple) {
      return html``;
    }

    const base = [
      this.getCellPaddingClasses(),
      'bg-slate-50',
      'border-b border-slate-200',
      this.bordered ? 'border-r border-slate-200' : '',
      'w-10',
      'text-center',
    ].filter(Boolean).join(' ');

    const ariaLabel = allSelected ? this.msg.unselectAll : this.msg.selectAll;

    return html`
      <th class=${base} scope="col">
        <input
          type="checkbox"
          class=${[
            'h-4 w-4 rounded border-slate-300 text-sky-600',
            enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
            'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
          ].join(' ')}
          aria-label=${ariaLabel}
          .checked=${allSelected}
          .indeterminate=${someSelected}
          ?disabled=${!enabled}
          data-selection="header"
        />
      </th>
    `;
  }

  private getSelectionBodyCellTemplate(row: ParsedRow, isSelected: boolean): TemplateResult {
    if (!this.showSelectionColumn) return html``;

    const enabled = this.getSelectionEnabled() && !row.disabled;
    const base = [
      this.getCellPaddingClasses(),
      'border-b border-slate-200',
      this.bordered ? 'border-r border-slate-200' : '',
      'w-10',
      'text-center',
      row.disabled ? 'opacity-60' : '',
    ].filter(Boolean).join(' ');

    if (this.selectionMode === 'single') {
      return html`
        <td class=${base}>
          <input
            type="radio"
            name="table-selection"
            class=${[
              'h-4 w-4 border-slate-300 text-sky-600',
              enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
            ].join(' ')}
            aria-label=${this.msg.selectRow}
            .checked=${isSelected}
            ?disabled=${!enabled}
            data-selection="row"
            data-row-id=${row.id}
          />
        </td>
      `;
    }

    if (this.selectionMode === 'multiple') {
      return html`
        <td class=${base}>
          <input
            type="checkbox"
            class=${[
              'h-4 w-4 rounded border-slate-300 text-sky-600',
              enabled ? 'cursor-pointer' : 'cursor-not-allowed opacity-50',
              'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2',
            ].join(' ')}
            aria-label=${this.msg.selectRow}
            .checked=${isSelected}
            ?disabled=${!enabled}
            data-selection="row"
            data-row-id=${row.id}
          />
        </td>
      `;
    }

    // selectionMode === 'none'
    return html`<td class=${base}></td>`;
  }

  // ===========================================================================
  // EVENTS (emitted)
  // ===========================================================================
  private emitRowClick(index: number, rowEl: Element, rowId: string) {
    this.dispatchEvent(
      new CustomEvent('row-click', {
        bubbles: true,
        composed: true,
        detail: { index, row: rowEl, id: rowId },
      }),
    );
  }

  private emitSelectionChange(nextSelectedIds: string[], meta: { id?: string; source: 'row' | 'checkbox' | 'radio' | 'header' | 'keyboard' }) {
    this.dispatchEvent(
      new CustomEvent('selection-change', {
        bubbles: true,
        composed: true,
        detail: {
          selectedIds: nextSelectedIds,
          mode: this.selectionMode,
          ...meta,
        },
      }),
    );
  }

  private emitHeaderInteract(payload: { key?: string; index?: number; originalEvent: Event }) {
    this.dispatchEvent(
      new CustomEvent('header-interact', {
        bubbles: true,
        composed: true,
        detail: payload,
      }),
    );
  }

  private emitCellAction(payload: { rowId: string; columnKey?: string; action: string; originalEvent: Event }) {
    this.dispatchEvent(
      new CustomEvent('cell-action', {
        bubbles: true,
        composed: true,
        detail: payload,
      }),
    );
  }

  // ===========================================================================
  // INTERACTION HANDLERS (delegated)
  // ===========================================================================
  private requestToggleRowSelection(rowId: string, source: 'row' | 'checkbox' | 'radio' | 'keyboard') {
    if (!this.getSelectionEnabled()) return;

    const selected = this.getEffectiveSelectedSet();
    const next = new Set(selected);

    if (this.selectionMode === 'single') {
      if (selected.has(rowId)) {
        // keep selected (radio-like). Still allow emitting request with same selection.
        next.clear();
        next.add(rowId);
      } else {
        next.clear();
        next.add(rowId);
      }
    }

    if (this.selectionMode === 'multiple') {
      if (next.has(rowId)) next.delete(rowId);
      else next.add(rowId);
    }

    const nextArr = Array.from(next);

    if (this.uncontrolledSelection) {
      this.internalSelected = new Set(nextArr);
    }

    this.emitSelectionChange(nextArr, { id: rowId, source });
  }

  private requestToggleAllSelection(source: 'header') {
    if (!this.getSelectionEnabled()) return;
    if (this.selectionMode !== 'multiple') return;

    const rows = this.parseRows().filter(r => !r.disabled);
    const ids = rows.map(r => r.id);

    const selected = this.getEffectiveSelectedSet();
    const allSelected = ids.length > 0 && ids.every(id => selected.has(id));

    const next = allSelected ? [] : ids;

    if (this.uncontrolledSelection) {
      this.internalSelected = new Set(next);
    }

    this.emitSelectionChange(next, { source });
  }

  private handleRootClick(e: MouseEvent) {
    const target = e.target as HTMLElement | null;
    if (!target) return;

    // Cell action: any element with data-action inside a cell
    const actionEl = target.closest('[data-action]') as HTMLElement | null;
    if (actionEl) {
      const action = actionEl.getAttribute('data-action') || '';
      const rowEl = actionEl.closest('tr[data-row-id]') as HTMLTableRowElement | null;
      if (!rowEl) return;
      const rowId = rowEl.getAttribute('data-row-id') || '';
      const colKey = actionEl.getAttribute('data-col-key') || actionEl.closest('td[data-col-key]')?.getAttribute('data-col-key') || undefined;
      this.emitCellAction({ rowId, columnKey: colKey || undefined, action, originalEvent: e });
      return;
    }

    // Header interaction
    const th = target.closest('th[data-col-key]') as HTMLElement | null;
    if (th) {
      const key = th.getAttribute('data-col-key') || undefined;
      const idxStr = th.getAttribute('data-col-index');
      const index = idxStr ? Number(idxStr) : undefined;
      this.emitHeaderInteract({ key, index, originalEvent: e });
      return;
    }

    // Selection controls
    const selectionEl = target.closest('input[data-selection]') as HTMLInputElement | null;
    if (selectionEl) {
      const kind = selectionEl.getAttribute('data-selection');
      if (kind === 'header') {
        e.stopPropagation();
        this.requestToggleAllSelection('header');
        return;
      }
      if (kind === 'row') {
        const rowId = selectionEl.getAttribute('data-row-id') || '';
        if (!rowId) return;
        e.stopPropagation();
        const source = this.selectionMode === 'single' ? 'radio' : 'checkbox';
        this.requestToggleRowSelection(rowId, source);
        return;
      }
    }

    // Row click
    const row = target.closest('tr[data-row-id]') as HTMLTableRowElement | null;
    if (!row) return;

    const rowId = row.getAttribute('data-row-id') || '';
    const rowIndexStr = row.getAttribute('data-row-index');
    const rowIndex = rowIndexStr ? Number(rowIndexStr) : -1;

    if (this.rowClickable) {
      const sourceRowEl = this.querySelector(`TableBody > TableRow[id="${CSS.escape(rowId)}"], TableBody > TableRow[row-id="${CSS.escape(rowId)}"]`);
      this.emitRowClick(rowIndex, sourceRowEl || row, rowId);
    }

    // Optional click-to-select when enabled
    const parsedRows = this.parseRows();
    const parsedRow = parsedRows.find(r => r.id === rowId);
    if (!parsedRow || parsedRow.disabled) return;

    // If selection is enabled and user clicks row (not on interactive content), request selection.
    if (this.getSelectionEnabled()) {
      this.requestToggleRowSelection(rowId, 'row');
    }
  }

  private handleRootKeyDown(e: KeyboardEvent) {
    if (!this.getSelectionEnabled()) return;
    if (e.key !== 'Enter' && e.key !== ' ') return;

    const target = e.target as HTMLElement | null;
    if (!target) return;

    const row = target.closest('tr[data-row-id]') as HTMLTableRowElement | null;
    if (!row) return;

    // Avoid interfering with native controls.
    const isOnInteractive = !!(target.closest('a,button,input,select,textarea,[role="button"],[contenteditable="true"]'));
    if (isOnInteractive) return;

    const rowId = row.getAttribute('data-row-id') || '';
    if (!rowId) return;

    const parsedRows = this.parseRows();
    const parsedRow = parsedRows.find(r => r.id === rowId);
    if (!parsedRow || parsedRow.disabled) return;

    e.preventDefault();
    this.requestToggleRowSelection(rowId, 'keyboard');
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private renderCaption(): TemplateResult {
    if (!this.hasSlot('Caption')) return html``;
    const content = this.getSlotContent('Caption');
    return html`<caption class="text-left text-slate-700 font-medium mb-2">${unsafeHTML(content)}</caption>`;
  }

  private renderLoadingState(): TemplateResult {
    const content = this.hasSlot('Loading') ? this.getSlotContent('Loading') : this.msg.loading;
    return html`
      <div class="w-full rounded-md border border-slate-200 bg-white p-6 text-slate-600">
        <div class="flex items-center gap-3">
          <div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></div>
          <div class="text-sm">${unsafeHTML(content)}</div>
        </div>
      </div>
    `;
  }

  private renderEmptyState(): TemplateResult {
    const content = this.hasSlot('Empty') ? this.getSlotContent('Empty') : this.msg.empty;
    return html`
      <div class="w-full rounded-md border border-slate-200 bg-white p-6 text-slate-600">
        <div class="text-sm">${unsafeHTML(content)}</div>
      </div>
    `;
  }

  private renderHeader(columns: ParsedColumn[]): TemplateResult {
    // Prefer Columns definition if provided; otherwise use TableHeader slot.
    const hasColumns = this.querySelectorAll('Columns > Column').length > 0;

    if (!hasColumns) {
      const headerRows = Array.from(this.querySelectorAll('TableHeader > TableRow'));
      const headRowsTemplate = headerRows.map((rowEl, rowIndex) => {
        const heads = Array.from(rowEl.querySelectorAll('TableHead'));
        return html`
          <tr>
            ${this.showSelectionColumn ? this.getSelectionHeaderCellTemplate() : html``}
            ${heads.map((th, idx) => {
              const key = th.getAttribute('key') || `col-${idx + 1}`;
              const align = (th.getAttribute('align') as 'left' | 'center' | 'right' | null) || 'left';
              const width = th.getAttribute('width');
              const minWidth = th.getAttribute('minWidth') || th.getAttribute('min-width');
              const sticky = th.hasAttribute('sticky');
              const col: ParsedColumn = { key, labelHtml: th.innerHTML, align, width, minWidth, sticky };
              const colspan = th.getAttribute('colspan');
              const rowspan = th.getAttribute('rowspan');
              return html`
                <th
                  class=${this.getHeadCellClasses(col)}
                  style=${this.getColumnStyle(col)}
                  scope="col"
                  data-col-key=${key}
                  data-col-index=${String(idx)}
                  colspan=${colspan || nothing}
                  rowspan=${rowspan || nothing}
                >
                  <div class="flex items-center gap-2 ${align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'}">
                    ${unsafeHTML(col.labelHtml)}
                  </div>
                </th>
              `;
            })}
          </tr>
        `;
      });

      return html`<thead>${headRowsTemplate}</thead>`;
    }

    // Columns-driven header
    return html`
      <thead>
        <tr>
          ${this.showSelectionColumn ? this.getSelectionHeaderCellTemplate() : html``}
          ${columns.map((col, idx) => html`
            <th
              class=${this.getHeadCellClasses(col)}
              style=${this.getColumnStyle(col)}
              scope="col"
              data-col-key=${col.key}
              data-col-index=${String(idx)}
            >
              <div class="flex items-center gap-2 ${col.align === 'right' ? 'justify-end' : col.align === 'center' ? 'justify-center' : 'justify-start'}">
                ${unsafeHTML(col.labelHtml)}
              </div>
            </th>
          `)}
        </tr>
      </thead>
    `;
  }

  private renderBody(columns: ParsedColumn[], rows: ParsedRow[]): TemplateResult {
    const selected = this.getEffectiveSelectedSet();

    // Render using the provided TableBody slot structure, but mapping cells to columns when possible.
    // Association rules:
    // - TableRow must have id (stable).
    // - TableCell may provide key; if present, it matches a column key.
    // - If no key, it falls back to positional mapping.

    const rowTemplates = rows.map((row, rowIndex) => {
      const isSelected = selected.has(row.id);

      // Build map key->cell
      const cellByKey = new Map<string, Element>();
      row.cells.forEach((cellEl, idx) => {
        const key = cellEl.getAttribute('key') || cellEl.getAttribute('data-key') || '';
        if (key) cellByKey.set(key, cellEl);
        else cellByKey.set(`__index_${idx}`, cellEl);
      });

      const rowClasses = this.getBodyRowClasses(isSelected, rowIndex, row.disabled);
      const tabIndex = this.getSelectionEnabled() && !row.disabled ? 0 : -1;

      return html`
        <tr
          class=${rowClasses}
          data-row-id=${row.id}
          data-row-index=${String(rowIndex)}
          role="row"
          aria-selected=${isSelected ? 'true' : 'false'}
          tabindex=${String(tabIndex)}
        >
          ${this.getSelectionBodyCellTemplate(row, isSelected)}

          ${columns.length > 0
            ? columns.map((col, colIndex) => {
                const explicit = cellByKey.get(col.key);
                const fallback = cellByKey.get(`__index_${colIndex}`);
                const cellEl = explicit || fallback;

                const colspan = cellEl?.getAttribute('colspan');
                const rowspan = cellEl?.getAttribute('rowspan');
                const cellContent = cellEl ? cellEl.innerHTML : '';

                return html`
                  <td
                    class=${this.getBodyCellClasses(col, row.disabled)}
                    style=${this.getColumnStyle(col)}
                    data-col-key=${col.key}
                    colspan=${colspan || nothing}
                    rowspan=${rowspan || nothing}
                  >
                    <div class="min-w-0">
                      ${unsafeHTML(cellContent)}
                    </div>
                  </td>
                `;
              })
            : row.cells.map((cellEl, idx) => {
                const col: ParsedColumn = {
                  key: cellEl.getAttribute('key') || `col-${idx + 1}`,
                  labelHtml: '',
                  align: ((cellEl.getAttribute('align') as 'left' | 'center' | 'right' | null) || 'left'),
                  width: cellEl.getAttribute('width'),
                  minWidth: cellEl.getAttribute('minWidth') || cellEl.getAttribute('min-width'),
                  sticky: cellEl.hasAttribute('sticky'),
                };
                const colspan = cellEl.getAttribute('colspan');
                const rowspan = cellEl.getAttribute('rowspan');
                return html`
                  <td
                    class=${this.getBodyCellClasses(col, row.disabled)}
                    style=${this.getColumnStyle(col)}
                    data-col-key=${col.key}
                    colspan=${colspan || nothing}
                    rowspan=${rowspan || nothing}
                  >
                    <div class="min-w-0">
                      ${unsafeHTML(cellEl.innerHTML)}
                    </div>
                  </td>
                `;
              })}
        </tr>
      `;
    });

    return html`<tbody>${rowTemplates}</tbody>`;
  }

  private renderFooter(): TemplateResult {
    const footerRows = Array.from(this.querySelectorAll('TableFooter > TableRow'));
    if (footerRows.length === 0) return html``;

    const rowTemplates = footerRows.map(rowEl => {
      const cells = Array.from(rowEl.querySelectorAll('TableCell'));
      return html`
        <tr>
          ${this.showSelectionColumn ? html`<td class=${[this.getCellPaddingClasses(), 'border-b border-slate-200', this.bordered ? 'border-r border-slate-200' : '', 'w-10'].filter(Boolean).join(' ')}></td>` : html``}
          ${cells.map(cellEl => {
            const colspan = cellEl.getAttribute('colspan');
            const rowspan = cellEl.getAttribute('rowspan');
            return html`
              <td
                class=${[
                  this.getCellPaddingClasses(),
                  'text-slate-700',
                  'bg-white',
                  'border-b border-slate-200',
                  this.bordered ? 'border-r border-slate-200 last:border-r-0' : '',
                ].filter(Boolean).join(' ')}
                colspan=${colspan || nothing}
                rowspan=${rowspan || nothing}
              >
                ${unsafeHTML(cellEl.innerHTML)}
              </td>
            `;
          })}
        </tr>
      `;
    });

    return html`<tfoot class="bg-white">${rowTemplates}</tfoot>`;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const columns = this.parseColumns();
    const rows = this.parseRows();

    if (this.loading) {
      // If developer provided <Loading>, show it.
      return this.renderLoadingState();
    }

    if (rows.length === 0) {
      return this.renderEmptyState();
    }

    const containerClasses = [
      'w-full',
      'overflow-x-auto',
      'rounded-md',
      'border',
      'border-slate-200',
      'bg-white',
    ].join(' ');

    const tableAriaBusy = this.loading ? 'true' : 'false';

    return html`
      <div class=${containerClasses}>
        <table class=${this.getTableBaseClasses()} aria-busy=${tableAriaBusy}>
          ${this.renderCaption()}
          ${this.renderHeader(columns)}
          ${this.renderBody(columns, rows)}
          ${this.renderFooter()}
        </table>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-view-table--responsive-rich-data-table-102020': ResponsiveRichDataTableMolecule;
  }
}
