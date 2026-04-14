/// <mls fileReference="_102020_/l2/molecules/groupEnterNumber/inputNumber.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// INPUT NUMBER MOLECULE
// =============================================================================
// Skill Group: enter + number
// This molecule does NOT contain business logic.
// - No Shadow DOM
// - Presentation + normalization only

import { html, TemplateResult, nothing, unsafeHTML } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  increment: 'Increment',
  decrement: 'Decrement',
  loading: 'Loading...',
  required: 'Required field',
  invalidNumber: 'Invalid number',
};
const message_pt = {
  increment: 'Incrementar',
  decrement: 'Decrementar',
  loading: 'Carregando...',
  required: 'Campo obrigatório',
  invalidNumber: 'Número inválido',
};

type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: message_pt,
};
/// **collab_i18n_end**

@customElement('molecules--group-enter-number--input-number-102020')
export class InputNumberMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS
  // ==========================================================================
  slotTags = ['Label', 'Prefix', 'Suffix', 'Helper', 'Error'];

  // ===========================================================================
  // PROPERTIES — Contract
  // ==========================================================================
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
  precision: number | undefined;

  @property({ type: String })
  placeholder = '';

  @property({ type: String })
  inputmode: 'numeric' | 'decimal' = 'decimal';

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
  // ==========================================================================
  @state()
  private inputText = '';

  @state()
  private isFocused = false;

  @state()
  private uid = `in-${Math.random().toString(36).slice(2, 10)}`;

  // ===========================================================================
  // LIFECYCLE
  // ==========================================================================
  firstUpdated(): void {
    this.syncTextFromValue();
  }

  willUpdate(changed: Map<string, unknown>): void {
    // If external value updates and user is not editing, reflect it.
    if (changed.has('value') && !this.isFocused) {
      this.syncTextFromValue();
    }

    // When precision changes, reformat when not editing.
    if (changed.has('precision') && !this.isFocused) {
      this.syncTextFromValue();
    }
  }

  // ===========================================================================
  // NORMALIZATION POLICY (consistent)
  // ==========================================================================
  // Confirming value means: on blur, on Enter, and on stepper (up/down).
  // Confirmed value is always:
  // - Parsed to number (or null if empty)
  // - Clamped to min/max
  // - Snapped to step (nearest)
  // - Rounded to precision (if provided)

  private getDecimalSeparatorPolicy(): 'both' {
    // Accept '.' and ',' during typing; normalize to '.' for parsing.
    return 'both';
  }

  private allowsNegative(): boolean {
    // Rule: negative is allowed only if min is undefined or min < 0.
    return this.min === undefined || this.min < 0;
  }

  private normalizeDecimalInput(text: string): string {
    // Convert commas to dots for internal parsing.
    if (this.getDecimalSeparatorPolicy() === 'both') {
      return text.replace(/,/g, '.');
    }
    return text;
  }

  private isIntermediateText(text: string): boolean {
    // States that can occur during typing but aren't confirmable numbers yet.
    const t = this.normalizeDecimalInput(text).trim();
    if (t === '') return true;
    if (this.allowsNegative() && t === '-') return true;
    if (t === '.') return true;
    if (this.allowsNegative() && t === '-.') return true;
    if (/^-?\d+\.$/.test(t)) return true; // e.g., "0." or "12."
    return false;
  }

  private parseTextToNumber(text: string): number | null {
    const t0 = text.trim();
    if (t0 === '') return null;

    const t = this.normalizeDecimalInput(t0);

    if (this.isIntermediateText(t0)) return null;

    // Reject negatives if not allowed
    if (!this.allowsNegative() && t.startsWith('-')) return null;

    // Strict numeric parse
    if (!/^-?\d+(?:\.\d+)?$/.test(t)) return null;

    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    return n;
  }

  private roundToPrecision(n: number): number {
    if (this.precision === undefined) return n;
    const p = Math.max(0, Math.floor(this.precision));
    const factor = 10 ** p;
    // Consistent rounding: half away from zero is not JS default; we use Math.round
    // which is symmetric around 0.5 with IEEE behavior; consistent enough for UI.
    return Math.round(n * factor) / factor;
  }

  private clampToBounds(n: number): number {
    let out = n;
    if (this.min !== undefined && out < this.min) out = this.min;
    if (this.max !== undefined && out > this.max) out = this.max;
    return out;
  }

  private getEffectiveStep(): number {
    const s = this.step ?? 1;
    if (!Number.isFinite(s) || s <= 0) return 1;
    return s;
  }

  private snapToStep(n: number): number {
    const step = this.getEffectiveStep();
    // Snap to nearest step based on min if provided, else 0.
    const base = this.min !== undefined ? this.min : 0;
    const k = Math.round((n - base) / step);
    return base + k * step;
  }

  private normalizeConfirmedNumber(n: number): number {
    // Policy order: clamp -> snap -> clamp -> precision -> clamp
    let out = this.clampToBounds(n);
    out = this.snapToStep(out);
    out = this.clampToBounds(out);
    out = this.roundToPrecision(out);
    out = this.clampToBounds(out);
    return out;
  }

  private formatNumberToText(n: number): string {
    if (this.precision === undefined) return String(n);
    const p = Math.max(0, Math.floor(this.precision));
    return n.toFixed(p);
  }

  private syncTextFromValue(): void {
    if (this.value === null || this.value === undefined) {
      this.inputText = '';
      return;
    }
    const normalized = this.normalizeConfirmedNumber(this.value);
    this.inputText = this.formatNumberToText(normalized);
  }

  // ===========================================================================
  // DERIVED UI STATE
  // ==========================================================================
  private hasExternalError(): boolean {
    return this.error !== false && this.error !== '';
  }

  private computeAriaInvalid(): boolean {
    // Invalid if external error OR (required and empty)
    if (this.hasExternalError()) return true;
    if (this.required) {
      const parsed = this.parseTextToNumber(this.inputText);
      // If user left it blank (or intermediate), treat as invalid when required.
      if (this.inputText.trim() === '') return true;
      if (parsed === null) return true;
    }
    return false;
  }

  private getValidationMessage(): string {
    if (typeof this.error === 'string' && this.error.trim()) return this.error;
    if (this.hasSlot('Error')) return this.getSlotContent('Error');

    // Fallback messages only for required/invalid-number cases.
    if (this.required) {
      if (this.inputText.trim() === '') return this.msg.required;
      const parsed = this.parseTextToNumber(this.inputText);
      if (parsed === null) return this.msg.invalidNumber;
    }
    return '';
  }

  private isInteractionBlocked(): boolean {
    // loading blocks changes; focus policy: allow focus unless disabled
    return this.disabled || this.readonly || this.loading;
  }

  // ===========================================================================
  // EVENTS
  // ==========================================================================
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

  private emitFocus(): void {
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
        detail: {},
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
  // INPUT FILTERING (typing)
  // ==========================================================================
  private filterToAllowedCharacters(raw: string): string {
    // Allow digits, one decimal separator ('.' or ','), and optional leading '-'.
    const allowNeg = this.allowsNegative();
    let out = '';
    let hasSep = false;
    let hasMinus = false;

    for (let i = 0; i < raw.length; i += 1) {
      const ch = raw[i];
      const isDigit = ch >= '0' && ch <= '9';
      const isSep = ch === '.' || ch === ',';
      const isMinus = ch === '-';

      if (isDigit) {
        out += ch;
        continue;
      }

      if (isSep) {
        if (!hasSep) {
          out += ch;
          hasSep = true;
        }
        continue;
      }

      if (isMinus && allowNeg) {
        // Only at start
        if (!hasMinus && out.length === 0) {
          out += ch;
          hasMinus = true;
        }
        continue;
      }
      // ignore any other character
    }

    // If inputmode is numeric, remove separators.
    if (this.inputmode === 'numeric') {
      out = out.replace(/[.,]/g, '');
    }

    return out;
  }

  private handleNativeInput(e: Event): void {
    if (this.disabled || this.readonly || this.loading) {
      // revert displayed text to current state
      const input = e.target as HTMLInputElement;
      input.value = this.inputText;
      return;
    }

    const input = e.target as HTMLInputElement;
    const filtered = this.filterToAllowedCharacters(input.value);

    // Keep caret reasonably: for simplicity, set value; native will move caret to end.
    // This is acceptable for a standard numeric field.
    input.value = filtered;
    this.inputText = filtered;

    const parsed = this.parseTextToNumber(this.inputText);
    this.emitInput(parsed);
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (e.key === 'Enter') {
      if (this.disabled || this.readonly || this.loading) return;
      const confirmed = this.confirmFromTextAndMaybeUpdate();
      this.emitEnter(confirmed);
    }

    if (e.key === 'ArrowUp') {
      if (this.isInteractionBlocked()) return;
      e.preventDefault();
      this.handleStep('up');
    }

    if (e.key === 'ArrowDown') {
      if (this.isInteractionBlocked()) return;
      e.preventDefault();
      this.handleStep('down');
    }
  }

  private handleFocus(): void {
    if (this.disabled) return;
    this.isFocused = true;
    this.emitFocus();
  }

  private handleBlurInternal(): void {
    this.isFocused = false;
    // Confirm on blur
    if (!this.disabled && !this.readonly && !this.loading) {
      this.confirmFromTextAndMaybeUpdate();
    } else {
      // For readonly/loading: keep display consistent with bound value
      this.syncTextFromValue();
    }
    this.emitBlur();
  }

  private confirmFromTextAndMaybeUpdate(): number | null {
    const raw = this.inputText;

    // Empty is allowed when not required
    if (raw.trim() === '') {
      const next = this.required ? null : null;
      // If required and empty: keep empty but do not change value automatically.
      // Still, the emitted change should reflect actual value state if it changed.
      if (!this.required) {
        const changed = this.value !== null;
        this.value = null;
        if (changed) this.emitChange(this.value);
      }
      return next;
    }

    const parsed = this.parseTextToNumber(raw);
    if (parsed === null) {
      // Invalid/intermediate: do not confirm, do not emit change.
      // Keep user text to allow correction.
      return null;
    }

    const normalized = this.normalizeConfirmedNumber(parsed);
    const nextText = this.formatNumberToText(normalized);
    this.inputText = nextText;

    const changed = this.value !== normalized;
    this.value = normalized;

    if (changed) this.emitChange(this.value);

    return normalized;
  }

  private handleStep(direction: 'up' | 'down'): void {
    if (this.disabled || this.readonly || this.loading) return;

    const step = this.getEffectiveStep();
    const currentParsed = this.parseTextToNumber(this.inputText);

    // Base current value policy:
    // - If current text parses to number: start there
    // - Else if bound value exists: start there
    // - Else start at min if defined, else 0
    let base = currentParsed;
    if (base === null) base = this.value;
    if (base === null || base === undefined) base = this.min !== undefined ? this.min : 0;

    const delta = direction === 'up' ? step : -step;
    const rawNext = base + delta;
    const normalized = this.normalizeConfirmedNumber(rawNext);

    const nextText = this.formatNumberToText(normalized);
    this.inputText = nextText;

    const changed = this.value !== normalized;
    this.value = normalized;

    this.emitStep(this.value, direction);
    if (changed) this.emitChange(this.value);
  }

  // ===========================================================================
  // RENDER HELPERS
  // ==========================================================================
  private renderLabel(labelId: string): TemplateResult {
    if (!this.hasSlot('Label')) return html``;

    const requiredMark = this.required
      ? html`<span class="text-rose-600" aria-hidden="true">*</span>`
      : nothing;

    return html`
      <label id=${labelId} class="mb-1 block text-sm font-medium text-slate-700">
        <span>${unsafeHTML(this.getSlotContent('Label'))}</span>
        ${requiredMark}
      </label>
    `;
  }

  private renderHelperOrError(helperId: string, errorId: string, ariaInvalid: boolean): TemplateResult {
    if (ariaInvalid) {
      const msg = this.getValidationMessage();
      if (!msg) return html``;

      return html`
        <div id=${errorId} class="mt-1 text-sm text-rose-600">
          ${unsafeHTML(msg)}
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

    return html``;
  }

  private getInputClasses(ariaInvalid: boolean): string {
    return [
      // base
      'block w-full min-w-0 flex-1 bg-transparent px-3 py-2 text-sm outline-none',
      // text colors
      this.disabled ? 'text-slate-400' : 'text-slate-900',
      // cursor
      this.disabled ? 'cursor-not-allowed' : this.readonly ? 'cursor-default' : 'cursor-text',
      // placeholder
      'placeholder:text-slate-400',
    ].filter(Boolean).join(' ');
  }

  private getWrapperClasses(ariaInvalid: boolean): string {
    return [
      // base
      'flex w-full items-stretch rounded-lg border bg-white transition',
      // focus ring
      this.isFocused && !this.disabled
        ? (ariaInvalid ? 'ring-2 ring-rose-500 border-rose-500' : 'ring-2 ring-sky-500 border-sky-500')
        : (ariaInvalid ? 'border-rose-500' : 'border-slate-300'),
      // hover
      !this.disabled && !this.readonly && !this.loading && !this.isFocused ? 'hover:border-slate-400' : '',
      // disabled
      this.disabled ? 'opacity-60' : '',
      // readonly
      this.readonly ? 'bg-slate-50' : '',
    ].filter(Boolean).join(' ');
  }

  private getAffixClasses(side: 'prefix' | 'suffix'): string {
    return [
      'flex items-center px-3 text-sm text-slate-600',
      side === 'prefix' ? 'border-r border-slate-200' : 'border-l border-slate-200',
      this.disabled ? 'text-slate-400' : '',
    ].filter(Boolean).join(' ');
  }

  private getStepperBtnClasses(position: 'up' | 'down'): string {
    const isBlocked = this.isInteractionBlocked();
    return [
      'flex h-1/2 w-8 items-center justify-center text-slate-600 transition',
      'hover:bg-slate-50 active:bg-slate-100',
      'focus:outline-none focus:ring-2 focus:ring-sky-500',
      position === 'up' ? 'border-b border-slate-200' : '',
      isBlocked ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer',
    ].filter(Boolean).join(' ');
  }

  private renderLoadingOrSuffix(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="flex items-center gap-2 px-3 text-sm text-slate-500">
          <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600"></span>
          <span>${this.msg.loading}</span>
        </div>
      `;
    }

    if (this.hasSlot('Suffix')) {
      return html`<div class=${this.getAffixClasses('suffix')}>${unsafeHTML(this.getSlotContent('Suffix'))}</div>`;
    }

    return html``;
  }

  // ===========================================================================
  // RENDER
  // ==========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const labelId = `number-label-${this.uid}`;
    const helperId = `number-helper-${this.uid}`;
    const errorId = `number-error-${this.uid}`;

    const ariaInvalid = this.computeAriaInvalid();

    const describedByParts: string[] = [];
    if (ariaInvalid && this.getValidationMessage()) describedByParts.push(errorId);
    else if (this.hasSlot('Helper')) describedByParts.push(helperId);

    const ariaDescribedBy = describedByParts.length ? describedByParts.join(' ') : undefined;

    // For forms, ensure name exists; value is kept in `value` property and also represented in text input.
    // We keep type="text" to support intermediate states.

    return html`
      <div class="w-full">
        ${this.renderLabel(labelId)}

        <div class=${this.getWrapperClasses(ariaInvalid)}>
          ${this.hasSlot('Prefix')
            ? html`<div class=${this.getAffixClasses('prefix')}>${unsafeHTML(this.getSlotContent('Prefix'))}</div>`
            : nothing}

          <input
            class=${this.getInputClasses(ariaInvalid)}
            type="text"
            name=${this.name}
            .value=${this.inputText}
            placeholder=${this.placeholder}
            inputmode=${this.inputmode}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly || this.loading}
            aria-labelledby=${this.hasSlot('Label') ? labelId : nothing}
            aria-describedby=${ariaDescribedBy ?? nothing}
            aria-invalid=${ariaInvalid ? 'true' : 'false'}
            aria-required=${this.required ? 'true' : 'false'}
            aria-valuemin=${this.min !== undefined ? String(this.min) : nothing}
            aria-valuemax=${this.max !== undefined ? String(this.max) : nothing}
            aria-valuenow=${this.value !== null && this.value !== undefined ? String(this.value) : nothing}
            @input=${this.handleNativeInput}
            @keydown=${this.handleKeyDown}
            @focus=${this.handleFocus}
            @blur=${this.handleBlurInternal}
          />

          <!-- Stepper + Suffix/Loading area -->
          <div class="flex items-stretch">
            ${this.renderLoadingOrSuffix()}

            <div class="flex w-8 flex-col border-l border-slate-200">
              <button
                type="button"
                class=${this.getStepperBtnClasses('up')}
                aria-label=${this.msg.increment}
                @click=${() => this.handleStep('up')}
                tabindex=${this.disabled ? -1 : 0}
              >
                <span class="text-xs">▲</span>
              </button>
              <button
                type="button"
                class=${this.getStepperBtnClasses('down')}
                aria-label=${this.msg.decrement}
                @click=${() => this.handleStep('down')}
                tabindex=${this.disabled ? -1 : 0}
              >
                <span class="text-xs">▼</span>
              </button>
            </div>
          </div>
        </div>

        ${this.renderHelperOrError(helperId, errorId, ariaInvalid)}
      </div>
    `;
  }
}
