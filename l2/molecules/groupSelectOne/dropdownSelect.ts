/// <mls fileReference="_102020_/l2/molecules/groupSelectOne/dropdownSelect.ts" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// DROPDOWN SELECT (SELECT + ONE) MOLECULE
// =============================================================================
// Skill Group: groupSelectOne (select + one)
// Presentation-only. No backend calls. No global state.
// - No Shadow DOM
// - Slot Tags: Trigger, Value, Content, Group, Item, Empty
// - Full mouse + keyboard interaction
// - Click-outside to close
// =============================================================================


import { html, nothing, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement, ParsedGroup, ParsedItem } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  placeholder: 'Select an option',
  empty: 'No options available',
  loading: 'Loading...',
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    placeholder: 'Selecione uma opção',
    empty: 'Nenhuma opção disponível',
    loading: 'Carregando...',
  },
};
/// **collab_i18n_end**

@customElement('molecules--group-select-one--dropdown-select-102020')
export class DropdownSelectMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ===========================================================================
  protected slotTags = ['Trigger', 'Value', 'Content', 'Group', 'Item', 'Empty'];

  // ===========================================================================
  // PROPERTIES — Contract (select + one)
  // ===========================================================================
  @propertyDataSource({ type: String })
  value: string | null = null;

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  readonly = false;

  @property({ type: Boolean })
  loading = false;

  @property({ type: Boolean })
  required = false;

  @property({ type: String })
  name = '';

  @property({ type: String })
  error: string | boolean = false;

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  @state()
  private isOpen = false;

  /** Active option value used for keyboard navigation */
  @state()
  private activeValue: string | null = null;

  private onDocumentPointerDownBound = (ev: PointerEvent) => this.onDocumentPointerDown(ev);

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  connectedCallback(): void {
    super.connectedCallback();
    document.addEventListener('pointerdown', this.onDocumentPointerDownBound, { capture: true });
  }

  disconnectedCallback(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDownBound, { capture: true } as any);
    super.disconnectedCallback();
  }

  updated(changed: Map<string, unknown>): void {
    // If options change while open, ensure activeValue remains valid.
    if (changed.has('isOpen') || changed.has('value')) {
      // no-op here; open handler sets active
    }

    if (this.isOpen) {
      const items = this.getEnabledItems();
      if (items.length === 0) {
        this.activeValue = null;
        return;
      }
      // Keep activeValue valid
      const activeIsEnabled = this.activeValue
        ? items.some(i => i.value === this.activeValue)
        : false;
      if (!activeIsEnabled) {
        this.activeValue = this.getInitialActiveValue();
      }

      // Ensure active item is visible when navigating
      queueMicrotask(() => this.scrollActiveIntoView());
    }
  }

  // ===========================================================================
  // DERIVED / HELPERS
  // ===========================================================================
  private get interactiveBlocked(): boolean {
    return this.disabled || this.readonly || this.loading;
  }

  private get allItemsFlat(): ParsedItem[] {
    // Includes group + standalone items, in DOM order (Content > Item, Content > Group > Item)
    return this.getItems();
  }

  private getEnabledItems(): ParsedItem[] {
    return this.allItemsFlat.filter(i => !i.disabled);
  }

  private getInitialActiveValue(): string | null {
    const enabled = this.getEnabledItems();
    if (enabled.length === 0) return null;

    // Prefer selected (if enabled), else first enabled
    if (this.value) {
      const selectedEnabled = enabled.find(i => i.value === this.value);
      if (selectedEnabled) return selectedEnabled.value;
    }
    return enabled[0].value;
  }

  private isError(): boolean {
    return !!this.error;
  }

  private getPlaceholder(): string {
    // Contract allows placeholder at Trigger or Value
    return (
      this.getSlotAttr('Value', 'placeholder') ||
      this.getSlotAttr('Trigger', 'placeholder') ||
      this.msg.placeholder
    );
  }

  private getSelectedLabel(): string {
    const selected = this.findItem(this.value);
    return selected?.label ?? '';
  }

  private getTriggerId(): string {
    // Stable enough for aria-controls
    const base = this.name?.trim() ? this.name.trim() : 'dropdown';
    return `dds-${base}-trigger`;
  }

  private getListboxId(): string {
    const base = this.name?.trim() ? this.name.trim() : 'dropdown';
    return `dds-${base}-listbox`;
  }

  private getOptionDomId(value: string): string {
    // Basic escape: keep deterministic id
    const safe = value.replace(/[^a-zA-Z0-9_-]/g, '_');
    const base = this.name?.trim() ? this.name.trim() : 'dropdown';
    return `dds-${base}-opt-${safe}`;
  }

  private getTriggerClasses(): string {
    const base = [
      'w-full',
      'flex items-center justify-between gap-3',
      'rounded-lg border',
      'px-3 py-2',
      'text-sm',
      'transition',
      'select-none',
      'bg-white',
    ];

    const states = [
      this.interactiveBlocked ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer',
      this.isOpen ? 'ring-2 ring-sky-500 border-sky-500' : 'hover:bg-slate-50',
      this.isError() ? 'border-rose-500 ring-rose-200' : 'border-slate-300',
    ];

    return [...base, ...states].filter(Boolean).join(' ');
  }

  private getPanelClasses(): string {
    return [
      'absolute z-50 mt-1 w-full',
      'rounded-lg border border-slate-200 bg-white shadow-lg',
      'max-h-64 overflow-auto',
      'p-1',
    ].join(' ');
  }

  private getGroupLabelClasses(): string {
    return ['px-2 py-1 text-xs font-semibold text-slate-500'].join(' ');
  }

  private getOptionClasses(item: ParsedItem, isSelected: boolean, isActive: boolean): string {
    const base = [
      'w-full',
      'text-left',
      'rounded-md',
      'px-2 py-2',
      'text-sm',
      'transition',
      'flex items-center gap-2',
    ];

    // Visual distinction:
    // - selected: persistent highlight (sky)
    // - active: keyboard focus highlight (amber) distinct from selected
    // If both, keep selected background but add an outline to indicate active.

    const selectedStyles = isSelected ? 'bg-sky-50 text-sky-900' : 'text-slate-900';
    const activeStyles = isActive
      ? (isSelected
          ? 'ring-2 ring-amber-400'
          : 'bg-amber-50 text-slate-900 ring-2 ring-amber-300')
      : '';

    const hoverStyles = !item.disabled && !this.interactiveBlocked ? 'hover:bg-slate-50' : '';
    const disabledStyles = item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer';

    return [...base, selectedStyles, activeStyles, hoverStyles, disabledStyles].filter(Boolean).join(' ');
  }

  private scrollActiveIntoView(): void {
    if (!this.isOpen || !this.activeValue) return;
    const id = this.getOptionDomId(this.activeValue);
    const el = this.querySelector(`#${CSS.escape(id)}`) as HTMLElement | null;
    el?.scrollIntoView({ block: 'nearest' });
  }

  // ===========================================================================
  // OPEN / CLOSE
  // ===========================================================================
  private open(): void {
    if (this.interactiveBlocked) return;
    if (this.isOpen) return;

    this.isOpen = true;
    this.activeValue = this.getInitialActiveValue();

    // Keep focus on trigger (combobox pattern)
    queueMicrotask(() => {
      const trigger = this.getTriggerEl();
      trigger?.focus();
      this.scrollActiveIntoView();
    });
  }

  private close(emitBlur = false): void {
    if (!this.isOpen) return;
    this.isOpen = false;

    // Do not clear activeValue; keep it for re-open heuristics if needed.
    if (emitBlur) this.emitBlur();
  }

  private toggle(): void {
    if (this.isOpen) this.close(false);
    else this.open();
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  private emitChange(nextValue: string): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: nextValue },
      }),
    );
  }

  private emitBlur(): void {
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private getTriggerEl(): HTMLButtonElement | null {
    return this.querySelector('button[data-trigger="true"]');
  }

  private onTriggerBlur = (e: FocusEvent): void => {
    // Only emit blur when focus truly leaves the component.
    const next = e.relatedTarget as Node | null;
    if (next && this.contains(next)) return;
    this.emitBlur();
  };

  private onTriggerClick = (): void => {
    if (this.interactiveBlocked) return;
    this.toggle();
  };

  private onTriggerKeyDown = (e: KeyboardEvent): void => {
    if (this.interactiveBlocked) return;

    const key = e.key;

    // Open behaviors
    if (!this.isOpen) {
      if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Enter' || key === ' ') {
        e.preventDefault();
        this.open();
        // When opening with ArrowUp, set active to last enabled
        if (key === 'ArrowUp') {
          const enabled = this.getEnabledItems();
          this.activeValue = enabled.length ? enabled[enabled.length - 1].value : null;
        }
        return;
      }
      return;
    }

    // When open: navigation + selection
    if (key === 'Escape') {
      e.preventDefault();
      this.close(false);
      return;
    }

    if (key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End') {
      e.preventDefault();
      this.moveActive(key);
      return;
    }

    if (key === 'Enter') {
      e.preventDefault();
      if (this.activeValue) {
        this.trySelect(this.activeValue);
      }
      return;
    }
  };

  private moveActive(key: 'ArrowDown' | 'ArrowUp' | 'Home' | 'End'): void {
    const enabled = this.getEnabledItems();
    if (enabled.length === 0) {
      this.activeValue = null;
      return;
    }

    if (key === 'Home') {
      this.activeValue = enabled[0].value;
      return;
    }

    if (key === 'End') {
      this.activeValue = enabled[enabled.length - 1].value;
      return;
    }

    const currentIndex = this.activeValue
      ? enabled.findIndex(i => i.value === this.activeValue)
      : -1;

    let nextIndex = currentIndex;
    if (key === 'ArrowDown') {
      nextIndex = currentIndex < 0 ? 0 : Math.min(enabled.length - 1, currentIndex + 1);
    } else {
      nextIndex = currentIndex < 0 ? enabled.length - 1 : Math.max(0, currentIndex - 1);
    }

    this.activeValue = enabled[nextIndex]?.value ?? enabled[0].value;
  }

  private trySelect(value: string): void {
    if (this.interactiveBlocked) return;

    const item = this.allItemsFlat.find(i => i.value === value);
    if (!item || item.disabled) return;

    // Only fire change on user action selection
    this.value = value;
    this.emitChange(value);
    this.close(false);

    // Keep focus on trigger after selection
    queueMicrotask(() => this.getTriggerEl()?.focus());
  }

  private onItemPointerDown = (e: PointerEvent): void => {
    // Prevent focus leaving trigger (which would produce blur) before we handle selection
    // Only do this when open and interactive.
    if (!this.isOpen || this.interactiveBlocked) return;
    e.preventDefault();
  };

  private onItemClick(value: string, disabled: boolean): void {
    if (disabled) return;
    this.trySelect(value);
  }

  private onDocumentPointerDown(ev: PointerEvent): void {
    if (!this.isOpen) return;
    const target = ev.target as Node | null;
    if (!target) return;
    if (this.contains(target)) return;
    this.close(false);
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private renderTriggerContent(): TemplateResult {
    const selectedLabel = this.getSelectedLabel();
    const placeholder = this.getPlaceholder();
    const hasSelection = !!selectedLabel;

    // If user provided <Trigger> content, we render it (minus the hidden slot tags).
    // Otherwise render a default trigger UI.
    const hasCustomTrigger = this.hasSlot('Trigger');

    const labelClasses = [
      'min-w-0 flex-1 truncate',
      hasSelection ? 'text-slate-900' : 'text-slate-500',
    ].join(' ');

    const chevronClasses = [
      'shrink-0',
      'text-slate-400',
      this.isOpen ? 'rotate-180 transition-transform' : 'transition-transform',
    ].join(' ');

    if (hasCustomTrigger) {
      // Contract: <Value/> placeholder is in slot tags, but we still must show selected/placeholder.
      // We render the custom Trigger innerHTML as plain content, but ensure the value text exists.
      // Approach: render a default value label and let custom trigger provide extra adornments.
      const customHtml = this.getSlotContent('Trigger');
      return html`
        <span class=${labelClasses}>${hasSelection ? selectedLabel : placeholder}</span>
        <span class=${chevronClasses} aria-hidden="true">▾</span>
        ${customHtml ? html`<span class="hidden">${nothing}</span>` : nothing}
      `;
    }

    return html`
      <span class=${labelClasses}>${hasSelection ? selectedLabel : placeholder}</span>
      <span class=${chevronClasses} aria-hidden="true">▾</span>
    `;
  }

  private renderEmpty(): TemplateResult {
    const emptyContent = this.getSlotContent('Empty');
    const text = emptyContent?.trim() ? nothing : html`<span>${this.msg.empty}</span>`;

    return html`
      <div class="px-2 py-2 text-sm text-slate-500">
        ${emptyContent?.trim() ? html`${emptyContent}` : text}
      </div>
    `;
  }

  private renderOptions2(): TemplateResult {
    const groups: ParsedGroup[] = this.getGroups();
    const standalone = this.getStandaloneItems();

    const anyItems = this.allItemsFlat.length > 0;
    if (!anyItems) return this.renderEmpty();

    const renderItem = (item: ParsedItem): TemplateResult => {
      const isSelected = item.value === this.value;
      const isActive = item.value === this.activeValue;
      const optionId = this.getOptionDomId(item.value);

      return html`
        <div
          id=${optionId}
          role="option"
          aria-selected=${isSelected ? 'true' : 'false'}
          aria-disabled=${item.disabled ? 'true' : 'false'}
          class=${this.getOptionClasses(item, isSelected, isActive)}
          @pointerdown=${this.onItemPointerDown}
          @click=${() => this.onItemClick(item.value, item.disabled)}
        >
          <span class="min-w-0 flex-1 truncate">${html`${item.label}`}</span>
          ${isSelected
            ? html`<span class="shrink-0 text-sky-600" aria-hidden="true">✓</span>`
            : nothing}
        </div>
      `;
    };

    return html`
      ${standalone.length
        ? html`<div class="space-y-1">${standalone.map(renderItem)}</div>`
        : nothing}

      ${groups.map(group => html`
        <div class="mt-1">
          ${group.label
            ? html`<div class=${this.getGroupLabelClasses()}>${group.label}</div>`
            : nothing}
          <div class="space-y-1">
            ${group.items.map(renderItem)}
          </div>
        </div>
      `)}
    `;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang] ?? messages.en;

    const triggerId = this.getTriggerId();
    const listboxId = this.getListboxId();

    const selected = this.findItem(this.value);
    const activeOptionId = this.isOpen && this.activeValue ? this.getOptionDomId(this.activeValue) : undefined;

    // Loading state blocks interaction and shows message
    if (this.loading) {
      return html`
        <div class="w-full">
          <button
            type="button"
            data-trigger="true"
            class=${this.getTriggerClasses()}
            disabled
            aria-busy="true"
          >
            <span class="min-w-0 flex-1 truncate text-slate-500">${this.msg.loading}</span>
            <span class="shrink-0 text-slate-400" aria-hidden="true">⏳</span>
          </button>
        </div>
      `;
    }

    return html`
      <div class="relative w-full">
        <button
          id=${triggerId}
          type="button"
          data-trigger="true"
          class=${this.getTriggerClasses()}
          ?disabled=${this.disabled}
          aria-haspopup="listbox"
          aria-controls=${listboxId}
          aria-expanded=${this.isOpen ? 'true' : 'false'}
          aria-disabled=${this.disabled ? 'true' : 'false'}
          aria-readonly=${this.readonly ? 'true' : 'false'}
          aria-required=${this.required ? 'true' : 'false'}
          aria-invalid=${this.isError() ? 'true' : 'false'}
          aria-activedescendant=${activeOptionId ?? nothing}
          @click=${this.onTriggerClick}
          @keydown=${this.onTriggerKeyDown}
          @blur=${this.onTriggerBlur}
        >
          ${this.renderTriggerContent()}
        </button>

        ${this.isOpen
          ? html`
              <div
                id=${listboxId}
                class=${this.getPanelClasses()}
                role="listbox"
                aria-labelledby=${triggerId}
              >
                ${this.renderOptions2()}
              </div>
            `
          : nothing}

        ${this.isError() && typeof this.error === 'string' && this.error.trim()
          ? html`<div class="mt-1 text-xs text-rose-600">${this.error}</div>`
          : nothing}

        ${this.name
          ? html`<input type="hidden" name=${this.name} value=${selected?.value ?? ''} />`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'molecules--dropdown-select-102020': DropdownSelectMolecule;
  }
}
