/// <mls fileReference="_102020_/l2/molecules/groupSelectOne/singleOptionPicker.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// SINGLE OPTION PICKER MOLECULE
// =============================================================================
// Skill Group: select + one (groupSelectOne)
// This molecule does NOT contain business logic.
// - No Shadow DOM
// - Presentation-only
// - Options provided via Slot Tags (<Content><Item ...>)
// - Accessible + keyboard navigation

import { html, nothing, unsafeHTML, TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';

import { propertyDataSource, propertyCompositeDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement, ParsedItem } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  label: 'Choose one',
  placeholder: 'Select an option',
  loading: 'Loading...',
  noOptions: 'No options available',
  requiredHint: 'Required',
  invalid: 'Invalid',
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    label: 'Escolha uma opção',
    placeholder: 'Selecione uma opção',
    loading: 'Carregando...',
    noOptions: 'Nenhuma opção disponível',
    requiredHint: 'Obrigatório',
    invalid: 'Inválido',
  },
};
/// **collab_i18n_end**

@customElement('molecules--group-select-one--single-option-picker-102020')
export class SingleOptionPickerMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ==========================================================================
  // SLOT TAGS
  // ==========================================================================
  protected slotTags = ['Label', 'Hint', 'Trigger', 'Value', 'Content', 'Group', 'Item', 'Empty'];

  // ==========================================================================
  // PROPERTIES — Contract (select + one)
  // ==========================================================================
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
  error: string | boolean = false;

  @property({ type: String })
  name = '';

  // Optional label/placeholder via properties (supports i18n binding)
  @propertyCompositeDataSource({ type: String })
  label: string = '';

  @propertyCompositeDataSource({ type: String })
  placeholder: string = '';

  // Presentation variant
  // - list: vertical list
  // - segmented: horizontal segmented control
  @property({ type: String, attribute: 'variant' })
  variant: 'list' | 'segmented' = 'list';

  // ==========================================================================
  // INTERNAL STATE
  // ==========================================================================
  @state()
  private activeIndex: number = -1;

  // ==========================================================================
  // GETTERS
  // ==========================================================================
  private get isBlocked(): boolean {
    return this.disabled || this.readonly || this.loading;
  }

  private get items(): ParsedItem[] {
    return this.getItems();
  }

  private get selectedIndex(): number {
    if (this.value == null) return -1;
    return this.items.findIndex(i => String(i.value) === String(this.value));
  }

  private get hasError(): boolean {
    return Boolean(this.error);
  }

  private get errorMessage(): string {
    if (typeof this.error === 'string') return this.error;
    return '';
  }

  private get ariaLabels(): string {
    const fromProp = (this.label || '').trim();
    const fromSlot = (this.getSlotContent('Label') || '').trim();

    // Slot content can contain HTML; we still need plain-text for aria-label.
    const slotText = fromSlot
      .replace(/<[^>]*>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    return fromProp || slotText || this.msg.label;
  }

  private get computedPlaceholder(): string {
    const fromProp = (this.placeholder || '').trim();
    const fromTriggerAttr = (this.getSlotAttr('Trigger', 'placeholder') || '').trim();
    const fromValueAttr = (this.getSlotAttr('Value', 'placeholder') || '').trim();
    return fromProp || fromTriggerAttr || fromValueAttr || this.msg.placeholder;
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================
  updated(changed: Map<string, unknown>): void {
    super.updated?.(changed as unknown as Map<string, unknown>);

    // Keep activeIndex aligned when value changes externally.
    if (changed.has('value')) {
      const idx = this.selectedIndex;
      this.activeIndex = idx >= 0 ? idx : this.getFirstEnabledIndex();
    }

    // If items change (slot content), ensure indexes are in range.
    if (changed.has('loading') || changed.has('disabled') || changed.has('readonly')) {
      if (this.activeIndex < 0) this.activeIndex = this.getFirstEnabledIndex();
    }
  }

  // ==========================================================================
  // EVENTS
  // ==========================================================================
  private emitChange(nextValue: string, option: ParsedItem): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: {
          value: nextValue,
          option,
        },
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

  // ==========================================================================
  // INTERACTION
  // ==========================================================================
  private trySelectIndex(index: number): void {
    if (this.isBlocked) return;

    const item = this.items[index];
    if (!item || item.disabled) return;

    const nextValue = String(item.value);

    if (String(this.value ?? '') === nextValue) {
      // No-op selection; still keep focus/active.
      this.activeIndex = index;
      return;
    }

    this.value = nextValue;
    this.activeIndex = index;
    this.emitChange(nextValue, item);
  }

  private getFirstEnabledIndex(): number {
    const idx = this.items.findIndex(i => !i.disabled);
    return idx;
  }

  private getLastEnabledIndex(): number {
    for (let i = this.items.length - 1; i >= 0; i -= 1) {
      if (!this.items[i].disabled) return i;
    }
    return -1;
  }

  private getNextEnabledIndex(from: number, direction: 1 | -1): number {
    const total = this.items.length;
    if (total === 0) return -1;

    let i = from;
    for (let step = 0; step < total; step += 1) {
      i = i + direction;
      if (i < 0) i = total - 1;
      if (i >= total) i = 0;
      if (!this.items[i]?.disabled) return i;
    }

    return -1;
  }

  private focusItem(index: number): void {
    const el = this.renderRoot?.querySelector<HTMLElement>(`[data-option-index="${index}"]`);
    el?.focus();
  }

  private handleOptionClick(index: number): void {
    this.trySelectIndex(index);
  }

  private handleOptionFocus(index: number): void {
    this.activeIndex = index;
  }

  private handleKeyDown(e: KeyboardEvent): void {
    const key = e.key;

    // Let Tab flow naturally; we only manage focus within when using arrows.
    if (key === 'Tab') return;

    const items = this.items;
    if (items.length === 0) return;

    const isHorizontal = this.variant === 'segmented';
    const isPrevKey = key === 'ArrowUp' || (isHorizontal && key === 'ArrowLeft');
    const isNextKey = key === 'ArrowDown' || (isHorizontal && key === 'ArrowRight');

    const current = this.activeIndex >= 0 ? this.activeIndex : (this.selectedIndex >= 0 ? this.selectedIndex : this.getFirstEnabledIndex());

    if (isPrevKey || isNextKey) {
      e.preventDefault();
      if (this.isBlocked) return;

      const next = this.getNextEnabledIndex(current, (isPrevKey ? -1 : 1) as 1 | -1);
      if (next >= 0) {
        this.activeIndex = next;
        this.focusItem(next);
      }
      return;
    }

    if (key === 'Home') {
      e.preventDefault();
      if (this.isBlocked) return;

      const first = this.getFirstEnabledIndex();
      if (first >= 0) {
        this.activeIndex = first;
        this.focusItem(first);
      }
      return;
    }

    if (key === 'End') {
      e.preventDefault();
      if (this.isBlocked) return;

      const last = this.getLastEnabledIndex();
      if (last >= 0) {
        this.activeIndex = last;
        this.focusItem(last);
      }
      return;
    }

    if (key === 'Enter' || key === ' ') {
      e.preventDefault();
      if (this.isBlocked) return;

      const idx = this.activeIndex >= 0 ? this.activeIndex : current;
      if (idx >= 0) this.trySelectIndex(idx);
      return;
    }

    if (key === 'Escape') {
      // No dropdown to close; keep as no-op (avoid preventing default).
      return;
    }
  }

  // ==========================================================================
  // RENDER HELPERS
  // ==========================================================================
  private getRootClasses(): string {
    return [
      'w-full',
      'rounded-lg',
      'border',
      'bg-white',
      'p-3',
      'transition',
      this.hasError ? 'border-rose-500' : 'border-slate-200',
      !this.isBlocked ? 'hover:border-slate-300' : 'opacity-60',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private getLabelClasses(): string {
    return ['mb-2', 'text-sm', 'font-medium', 'text-slate-900', 'flex', 'items-center', 'gap-2']
      .filter(Boolean)
      .join(' ');
  }

  private getHintClasses(): string {
    return ['mt-2', 'text-xs', this.hasError ? 'text-rose-600' : 'text-slate-500'].join(' ');
  }

  private getOptionsWrapperClasses(): string {
    const base = ['mt-2', 'outline-none'];

    if (this.variant === 'segmented') {
      base.push('flex', 'flex-wrap', 'gap-2');
    } else {
      base.push('flex', 'flex-col', 'gap-2');
    }

    return base.join(' ');
  }

  private getOptionClasses(item: ParsedItem, index: number): string {
    const isSelected = String(item.value) === String(this.value ?? '');
    const isActive = index === this.activeIndex;

    return [
      'w-full',
      this.variant === 'segmented' ? 'w-auto min-w-[3rem]' : '',
      'rounded-md',
      'border',
      'px-3',
      'py-2',
      'text-sm',
      'text-left',
      'transition',
      'focus:outline-none',
      'focus:ring-2',
      'focus:ring-sky-500',
      isSelected ? 'border-sky-500 bg-sky-50 text-sky-900' : 'border-slate-200 bg-white text-slate-900',
      !item.disabled && !this.isBlocked && !isSelected ? 'hover:bg-slate-50 hover:border-slate-300' : '',
      item.disabled ? 'opacity-50 cursor-not-allowed' : this.isBlocked ? 'cursor-not-allowed' : 'cursor-pointer',
      isActive && !this.isBlocked ? 'ring-1 ring-sky-200' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private renderLabelBlock(): TemplateResult {
    const hasLabelProp = (this.label || '').trim().length > 0;
    const hasLabelSlot = (this.getSlotContent('Label') || '').trim().length > 0;

    if (!hasLabelProp && !hasLabelSlot && !this.required) return html`${nothing}`;

    return html`
      <div class=${this.getLabelClasses()}>
        <div class="flex-1">
          ${hasLabelProp ? html`${this.label}` : nothing}
          ${!hasLabelProp && hasLabelSlot ? html`${unsafeHTML(this.getSlotContent('Label'))}` : nothing}
        </div>
        ${this.required
          ? html`<span class="text-[11px] text-slate-500 border border-slate-200 rounded px-1.5 py-0.5">${this.msg.requiredHint}</span>`
          : nothing}
      </div>
    `;
  }

  private renderHintBlock(): TemplateResult {
    const hintSlot = (this.getSlotContent('Hint') || '').trim();
    const msg = this.errorMessage;

    if (!this.hasError && !hintSlot) return html`${nothing}`;

    return html`
      <div class=${this.getHintClasses()} aria-live="polite">
        ${this.hasError
          ? html`${msg ? msg : this.msg.invalid}`
          : html`${unsafeHTML(hintSlot)}`}
      </div>
    `;
  }

  private renderLoading(): TemplateResult {
    return html`
      <div class="mt-2 flex items-center gap-2 text-sm text-slate-600" aria-live="polite">
        <div class="h-4 w-4 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin"></div>
        <div>${this.msg.loading}</div>
      </div>
    `;
  }

  private renderEmpty(): TemplateResult {
    const content = (this.getSlotContent('Empty') || '').trim();
    return html`
      <div class="mt-2 text-sm text-slate-500">
        ${content ? unsafeHTML(content) : html`${this.msg.noOptions}`}
      </div>
    `;
  }

  private renderOptions2(): TemplateResult {
    const items = this.items;

    if (items.length === 0) return this.renderEmpty();

    // Roving tabindex:
    // - selected index gets 0, otherwise activeIndex, otherwise first enabled.
    const selectedIdx = this.selectedIndex;
    const fallbackIdx = this.getFirstEnabledIndex();
    const focusIdx = selectedIdx >= 0 ? selectedIdx : (this.activeIndex >= 0 ? this.activeIndex : fallbackIdx);

    return html`
      <div
        class=${this.getOptionsWrapperClasses()}
        role="radiogroup"
        aria-label=${this.ariaLabels}
        aria-disabled=${this.disabled ? 'true' : 'false'}
        aria-required=${this.required ? 'true' : 'false'}
        aria-invalid=${this.hasError ? 'true' : 'false'}
        @keydown=${this.handleKeyDown}
      >
        ${items.map((item, index) => {
          const isSelected = String(item.value) === String(this.value ?? '');
          const isDisabled = this.isBlocked || item.disabled;
          const tabIndex = index === focusIdx && !isDisabled ? 0 : -1;

          return html`
            <button
              type="button"
              class=${this.getOptionClasses(item, index)}
              role="radio"
              aria-checked=${isSelected ? 'true' : 'false'}
              aria-disabled=${isDisabled ? 'true' : 'false'}
              data-option-index=${String(index)}
              tabindex=${String(tabIndex)}
              ?disabled=${isDisabled}
              @click=${() => this.handleOptionClick(index)}
              @focus=${() => this.handleOptionFocus(index)}
              @blur=${this.emitBlur}
            >
              <span class="flex items-center gap-2">
                <span
                  class=${[
                    'inline-flex',
                    'h-4',
                    'w-4',
                    'rounded-full',
                    'border',
                    isSelected ? 'border-sky-600' : 'border-slate-300',
                    'items-center',
                    'justify-center',
                    'shrink-0',
                  ].join(' ')}
                  aria-hidden="true"
                >
                  <span
                    class=${[
                      'h-2',
                      'w-2',
                      'rounded-full',
                      isSelected ? 'bg-sky-600' : 'bg-transparent',
                    ].join(' ')}
                  ></span>
                </span>

                <span class="flex-1">
                  ${unsafeHTML(item.label || this.computedPlaceholder)}
                </span>
              </span>
            </button>
          `;
        })}
      </div>
    `;
  }

  // ==========================================================================
  // RENDER
  // ==========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang] ?? messages.en;

    return html`
      <div class=${this.getRootClasses()}>
        ${this.renderLabelBlock()}

        ${this.loading ? this.renderLoading() : nothing}

        ${this.renderOptions2()}

        ${this.renderHintBlock()}

        ${this.name
          ? html`<input type="hidden" name=${this.name} .value=${String(this.value ?? '')} />`
          : nothing}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-select-one--single-option-picker-102020': SingleOptionPickerMolecule;
  }
}
