/// <mls fileReference="_102020_/l2/molecules/groupEnterNumber/quantitySelector.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// QUANTITY SELECTOR MOLECULE
// =============================================================================
// TagName: molecules--group-enter-number--quantity-selector-102020
// Skill Group: enter + number
// This molecule does NOT contain business logic.
// =============================================================================
import { html, TemplateResult, nothing, unsafeHTML, ifDefined } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  decrement: 'Decrease',
  increment: 'Increase',
  loading: 'Loading...',
  invalidConfig: 'Invalid configuration',
};
const message_pt = {
  decrement: 'Diminuir',
  increment: 'Aumentar',
  loading: 'Carregando...',
  invalidConfig: 'Configuração inválida',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: message_pt,
};
/// **collab_i18n_end**

@customElement('molecules--group-enter-number--quantity-selector-102020')
export class QuantitySelectorMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS (contract)
  // ===========================================================================
  slotTags = ['Label', 'Prefix', 'Suffix', 'Helper', 'Error'];

  // ===========================================================================
  // PROPERTIES — From Contract
  // ===========================================================================
  @propertyDataSource({ type: Number })
  value: number | null = null;

  @property({ type: String })
  name = '';

  @property({ type: Number })
  min: number | undefined;

  @property({ type: Number })
  max: number | undefined;

  @property({ type: Number })
  step = 1;

  @property({ type: Number })
  precision: number | undefined; // not used for integer quantities, kept for contract compatibility

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  inputmode: 'numeric' | 'decimal' = 'numeric';

  @property({ type: Boolean })
  disabled = false;

  @property({ type: Boolean })
  readonly = false;

  @property({ type: Boolean })
  required = false;

  @property({ type: Boolean })
  loading = false;

  @property({ type: String })
  error: boolean | string = false;

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================
  @state()
  private inputText: string = '';

  @state()
  private userInteracted = false;

  private uid = `qty-${Math.random().toString(16).slice(2)}`;

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  firstUpdated() {
    this.syncInputTextFromValue();
  }

  // Keep input display in sync when `value` is externally controlled.
  updated(changed: Map<string, unknown>) {
    if (changed.has('value')) {
      // Avoid overriding while user is typing: only sync when not focused.
      const input = this.getInputEl();
      const isFocused = input ? document.activeElement === input : false;
      if (!isFocused) this.syncInputTextFromValue();
    }

    // If config changes cause invalidity, keep input stable but ensure aria updates.
    if (changed.has('min') || changed.has('max') || changed.has('step')) {
      // no-op, computed states will re-render
    }
  }

  private getInputEl(): HTMLInputElement | null {
    return this.renderRoot?.querySelector?.('input[data-qty-input]') as HTMLInputElement | null;
  }

  private syncInputTextFromValue(): void {
    this.inputText = this.value === null || this.value === undefined ? '' : String(this.value);
  }

  // ===========================================================================
  // COMPUTED
  // ===========================================================================
  private getIsConfigInvalid(): boolean {
    const stepOk = Number.isInteger(this.step) && this.step > 0;
    const minOk = this.min === undefined || Number.isFinite(this.min);
    const maxOk = this.max === undefined || Number.isFinite(this.max);
    const boundsOk = this.min === undefined || this.max === undefined || this.min <= this.max;
    return !stepOk || !minOk || !maxOk || !boundsOk;
  }

  private getIsBlocked(): boolean {
    return this.disabled || this.loading;
  }

  private getHasError(): boolean {
    return Boolean(this.error) || this.getIsConfigInvalid();
  }

  private getErrorMessage(): string {
    if (this.getIsConfigInvalid()) return this.msg.invalidConfig;
    if (typeof this.error === 'string') return this.error;
    // If error=true and there is an <Error> slot, it will be rendered.
    return '';
  }

  private getClamped(value: number): number {
    let v = value;
    if (this.min !== undefined) v = Math.max(this.min, v);
    if (this.max !== undefined) v = Math.min(this.max, v);
    return v;
  }

  private getStepAligned(value: number): number {
    // Align to step relative to base (min if defined else 0)
    const base = this.min !== undefined ? this.min : 0;
    const step = this.step;
    if (!Number.isFinite(value) || !Number.isFinite(base) || !Number.isFinite(step) || step <= 0) return value;

    const delta = value - base;
    const k = Math.round(delta / step);
    return base + k * step;
  }

  private normalizeToInteger(value: number): number {
    // Ensure integer; decimals normalized before any change emission.
    if (!Number.isFinite(value)) return 0;
    return Math.trunc(value);
  }

  private parseInputTextToNumber(text: string): number | null {
    const raw = text.trim();
    if (!raw) return null;
    // Allow user to type '-' temporarily; treat as empty until committed.
    if (raw === '-') return null;

    // Accept only digits and optional leading minus.
    // If user types decimal separator, parseFloat then truncate.
    const normalized = raw.replace(',', '.');
    const n = Number(normalized);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  private computeInitialValueForStep(): number {
    // When value is empty and user steps, start from min (if defined) else 0, then apply operation.
    const base = this.min !== undefined ? this.min : 0;
    return this.normalizeToInteger(base);
  }

  private computeNextValueFromStep(direction: 'up' | 'down'): number | null {
    if (this.getIsBlocked() || this.readonly) return this.value;
    if (this.getIsConfigInvalid()) return this.value;

    const step = this.step;
    const current = this.value === null || this.value === undefined ? this.computeInitialValueForStep() : this.value;
    const currentInt = this.normalizeToInteger(current);

    const nextRaw = direction === 'up' ? currentInt + step : currentInt - step;
    const nextAligned = this.getStepAligned(nextRaw);
    const nextClamped = this.getClamped(this.normalizeToInteger(nextAligned));
    return nextClamped;
  }

  private getCanDecrement(): boolean {
    if (this.getIsBlocked() || this.readonly) return false;
    if (this.getIsConfigInvalid()) return false;

    const v = this.value;
    if (v === null || v === undefined) {
      // If min is defined and equals initial, decrement would likely go below; block when min is defined.
      return this.min === undefined;
    }
    if (this.min === undefined) return true;
    return v > this.min;
  }

  private getCanIncrement(): boolean {
    if (this.getIsBlocked() || this.readonly) return false;
    if (this.getIsConfigInvalid()) return false;

    const v = this.value;
    if (v === null || v === undefined) {
      // Allow increment even when max defined; it will clamp.
      return !(this.max !== undefined && this.computeInitialValueForStep() >= this.max);
    }
    if (this.max === undefined) return true;
    return v < this.max;
  }

  private getAriaNow(): number | undefined {
    if (this.value === null || this.value === undefined) return undefined;
    return this.value;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  private emitInput(value: number | null): void {
    this.dispatchEvent(
      new CustomEvent('input', {
        bubbles: true,
        composed: true,
        detail: { value },
      })
    );
  }

  private emitChange(value: number | null): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value },
      })
    );
  }

  private emitBlur(): void {
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
        detail: {},
      })
    );
  }

  private emitFocus(): void {
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
        detail: {},
      })
    );
  }

  private emitEnter(value: number | null): void {
    this.dispatchEvent(
      new CustomEvent('enter', {
        bubbles: true,
        composed: true,
        detail: { value },
      })
    );
  }

  private emitStep(value: number | null, direction: 'up' | 'down'): void {
    this.dispatchEvent(
      new CustomEvent('step', {
        bubbles: true,
        composed: true,
        detail: { value, direction },
      })
    );
  }

  // ===========================================================================
  // HANDLERS
  // ===========================================================================
  private handleDecrement(): void {
    if (!this.getCanDecrement()) return;
    this.userInteracted = true;

    const next = this.computeNextValueFromStep('down');
    if (next === undefined) return;

    this.value = next;
    this.inputText = next === null ? '' : String(next);

    this.emitStep(next, 'down');
    this.emitChange(next);
  }

  private handleIncrement(): void {
    if (!this.getCanIncrement()) return;
    this.userInteracted = true;

    const next = this.computeNextValueFromStep('up');
    if (next === undefined) return;

    this.value = next;
    this.inputText = next === null ? '' : String(next);

    this.emitStep(next, 'up');
    this.emitChange(next);
  }

  private handleInput(e: Event): void {
    if (this.getIsBlocked() || this.readonly) {
      // Keep the field visually in sync.
      this.syncInputTextFromValue();
      return;
    }

    this.userInteracted = true;
    const target = e.target as HTMLInputElement;
    const nextText = target.value;

    // Soft filter: allow digits, minus, and separators during typing.
    const softFiltered = nextText.replace(/[^0-9\-.,]/g, '');
    if (softFiltered !== nextText) {
      target.value = softFiltered;
    }

    this.inputText = target.value;

    // Emit input with best-effort parsed number (not yet normalized/stepped/clamped).
    const parsed = this.parseInputTextToNumber(this.inputText);
    if (parsed === null) {
      this.emitInput(null);
      return;
    }

    const asInt = this.normalizeToInteger(parsed);
    this.emitInput(asInt);
  }

  private commitFromText(reason: 'blur' | 'enter' | 'change'): number | null {
    if (this.getIsConfigInvalid()) {
      // Keep current value and restore text.
      this.syncInputTextFromValue();
      return this.value;
    }

    const parsed = this.parseInputTextToNumber(this.inputText);

    // Required: after user interaction, do not allow final empty.
    if ((parsed === null || parsed === undefined) && this.required && this.userInteracted) {
      const fallback = this.min !== undefined ? this.min : 0;
      const fallbackInt = this.normalizeToInteger(fallback);
      const aligned = this.getStepAligned(fallbackInt);
      const clamped = this.getClamped(this.normalizeToInteger(aligned));
      this.value = clamped;
      this.inputText = String(clamped);
      return clamped;
    }

    if (parsed === null || parsed === undefined) {
      this.value = null;
      this.inputText = '';
      return null;
    }

    // Normalize: integer, align to step, clamp to bounds.
    const intValue = this.normalizeToInteger(parsed);
    const aligned = this.getStepAligned(intValue);
    const clamped = this.getClamped(this.normalizeToInteger(aligned));

    this.value = clamped;
    this.inputText = String(clamped);

    return clamped;
  }

  private handleChange(): void {
    if (this.getIsBlocked() || this.readonly) return;
    this.userInteracted = true;

    const committed = this.commitFromText('change');
    this.emitChange(committed);
  }

  private handleBlur(): void {
    // Commit on blur even if readonly? readonly should not allow edits, but blur should still emit.
    if (!this.getIsBlocked() && !this.readonly) {
      this.userInteracted = true;
      const committed = this.commitFromText('blur');
      this.emitChange(committed);
    } else {
      // Restore any accidental edits.
      this.syncInputTextFromValue();
    }

    this.emitBlur();
  }

  private handleFocus(): void {
    this.emitFocus();
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      this.userInteracted = true;
      if (!this.getIsBlocked() && !this.readonly) {
        const committed = this.commitFromText('enter');
        this.emitChange(committed);
        this.emitEnter(committed);
      } else {
        this.emitEnter(this.value);
      }
      return;
    }

    // Keyboard step when focused in input.
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      this.handleIncrement();
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      this.handleDecrement();
      return;
    }
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private renderLabel(labelId: string): TemplateResult {
    if (!this.hasSlot('Label')) return html`${nothing}`;
    return html`
      <div class="mb-1 flex items-center gap-2">
        <div id=${labelId} class="text-sm font-medium text-slate-700">
          ${unsafeHTML(this.getSlotContent('Label'))}
          ${this.required ? html`<span class="text-rose-600"> *</span>` : nothing}
        </div>
      </div>
    `;
  }

  private renderHelperOrError(helperId: string, errorId: string): TemplateResult {
    const showError = this.getHasError() && (typeof this.error === 'string' || this.hasSlot('Error') || this.getIsConfigInvalid());
    if (showError) {
      const msg = this.getErrorMessage();
      return html`
        <div id=${errorId} class="mt-1 text-sm text-rose-700">
          ${msg ? unsafeHTML(msg) : unsafeHTML(this.getSlotContent('Error'))}
        </div>
      `;
    }

    if (this.hasSlot('Helper')) {
      return html`
        <div id=${helperId} class="mt-1 text-sm text-slate-500">
          ${unsafeHTML(this.getSlotContent('Helper'))}
        </div>
      `;
    }

    return html`${nothing}`;
  }

  private getControlClasses(): string {
    const hasError = this.getHasError();
    const blocked = this.getIsBlocked();
    return [
      'w-full',
      'rounded-lg border',
      'bg-white',
      'transition',
      'flex items-stretch',
      hasError ? 'border-rose-500' : 'border-slate-200',
      !blocked && !hasError ? 'hover:border-slate-300' : '',
      blocked ? 'opacity-60' : '',
      'focus-within:ring-2',
      hasError ? 'focus-within:ring-rose-500/30' : 'focus-within:ring-sky-500/30',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private getButtonClasses(disabledBtn: boolean, side: 'left' | 'right'): string {
    return [
      'w-10',
      'shrink-0',
      'flex items-center justify-center',
      'text-slate-700',
      'select-none',
      'transition',
      'border-slate-200',
      side === 'left' ? 'border-r rounded-l-lg' : 'border-l rounded-r-lg',
      disabledBtn ? 'cursor-not-allowed text-slate-400 bg-slate-50' : 'cursor-pointer hover:bg-slate-50 active:bg-slate-100',
      'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-sky-500/40',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private getInputClasses(): string {
    const blocked = this.getIsBlocked();
    const ro = this.readonly;
    return [
      'flex-1',
      'min-w-0',
      'px-2',
      'py-2',
      'text-center',
      'text-slate-900',
      'bg-transparent',
      'outline-none',
      'text-sm',
      blocked ? 'cursor-not-allowed' : '',
      ro ? 'cursor-default' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const labelId = `quantity-label-${this.uid}`;
    const helperId = `quantity-helper-${this.uid}`;
    const errorId = `quantity-error-${this.uid}`;

    const describedBy = [
      this.hasSlot('Helper') && !(this.getHasError() && (typeof this.error === 'string' || this.hasSlot('Error') || this.getIsConfigInvalid())) ? helperId : '',
      this.getHasError() && (typeof this.error === 'string' || this.hasSlot('Error') || this.getIsConfigInvalid()) ? errorId : '',
    ]
      .filter(Boolean)
      .join(' ');

    const canDec = this.getCanDecrement();
    const canInc = this.getCanIncrement();

    const inputDisabled = this.getIsBlocked();

    return html`
      <div class="w-full">
        ${this.renderLabel(labelId)}

        <div class=${this.getControlClasses()}>
          ${this.hasSlot('Prefix')
            ? html`<div class="flex items-center px-3 text-slate-600 text-sm border-r border-slate-200">${unsafeHTML(this.getSlotContent('Prefix'))}</div>`
            : nothing}

          <button
            type="button"
            class=${this.getButtonClasses(!canDec, 'left')}
            aria-label=${this.msg.decrement}
            ?disabled=${!canDec}
            @click=${this.handleDecrement}
          >
            −
          </button>

          <input
            data-qty-input
            class=${this.getInputClasses()}
            type="text"
            inputmode=${this.inputmode}
            name=${ifDefined(this.name || undefined)}
            placeholder=${this.placeholder}
            .value=${this.inputText}
            ?disabled=${inputDisabled}
            ?readonly=${this.readonly}
            aria-labelledby=${ifDefined(this.hasSlot('Label') ? labelId : undefined)}
            aria-describedby=${ifDefined(describedBy || undefined)}
            aria-invalid=${this.getHasError() ? 'true' : 'false'}
            aria-required=${this.required ? 'true' : 'false'}
            aria-valuemin=${ifDefined(this.min !== undefined ? String(this.min) : undefined)}
            aria-valuemax=${ifDefined(this.max !== undefined ? String(this.max) : undefined)}
            aria-valuenow=${ifDefined(this.getAriaNow() !== undefined ? String(this.getAriaNow()) : undefined)}
            @input=${this.handleInput}
            @change=${this.handleChange}
            @blur=${this.handleBlur}
            @focus=${this.handleFocus}
            @keydown=${this.handleKeyDown}
          />

          <button
            type="button"
            class=${this.getButtonClasses(!canInc, 'right')}
            aria-label=${this.msg.increment}
            ?disabled=${!canInc}
            @click=${this.handleIncrement}
          >
            +
          </button>

          ${this.loading
            ? html`<div class="flex items-center px-3 text-slate-500 text-sm border-l border-slate-200">${this.msg.loading}</div>`
            : this.hasSlot('Suffix')
              ? html`<div class="flex items-center px-3 text-slate-600 text-sm border-l border-slate-200">${unsafeHTML(this.getSlotContent('Suffix'))}</div>`
              : nothing}
        </div>

        ${this.renderHelperOrError(helperId, errorId)}
      </div>
    `;
  }
}
