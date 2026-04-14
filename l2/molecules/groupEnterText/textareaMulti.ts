/// <mls fileReference="_102020_/l2/molecules/groupEnterText/textareaMulti.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// TEXTAREA MULTI MOLECULE
// =============================================================================
// Skill Group: enter + text
// This molecule does NOT contain business logic.
// - No Shadow DOM
// - Presentation-only
// - Data via properties; events via CustomEvent

import { html, TemplateResult, nothing, unsafeHTML, ifDefined } from 'lit';
import { customElement, property, query, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  loading: 'Loading…',
  required: 'Required',
  characterCount: 'Character count',
};

type MessageType = typeof message_en;

const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    loading: 'Carregando…',
    required: 'Obrigatório',
    characterCount: 'Contagem de caracteres',
  },
};
/// **collab_i18n_end**

type ResizeMode = 'none' | 'vertical' | 'horizontal' | 'both';

@customElement('molecules--group-enter-text--textarea-multi-102020')
export class TextareaMultiMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // ===========================================================================
  // SLOT TAGS (contract: enter + text)
  // ===========================================================================
  slotTags = ['Label', 'Prefix', 'Suffix', 'Helper', 'Error'];

  // ===========================================================================
  // PROPERTIES — Contract + textarea-specific responsibilities
  // ===========================================================================
  @propertyDataSource({ type: String })
  value: string = '';

  @property({ type: String })
  name = '';

  // Config
  @property({ type: String })
  placeholder = '';

  @property({ type: Number })
  rows = 3;

  @property({ type: String })
  resize: ResizeMode = 'vertical';

  @property({ type: Boolean })
  autosize = false;

  @property({ type: Number, attribute: 'min-rows' })
  minRows?: number;

  @property({ type: Number, attribute: 'max-rows' })
  maxRows?: number;

  @property({ type: Number })
  maxlength?: number;

  @property({ type: Number })
  minlength?: number;

  @property({ type: String })
  pattern?: string;

  @property({ type: String })
  autocomplete?: string;

  @property({ type: String })
  inputmode?: string;

  // A11y / external association
  @property({ type: String, attribute: 'input-id' })
  inputId?: string;

  @property({ type: String, attribute: 'aria-label' })
  ariaLabell?: string;

  @property({ type: String, attribute: 'aria-labelledby' })
  ariaLabelledby?: string;

  @property({ type: String, attribute: 'aria-describedby' })
  ariaDescribedby?: string;

  // States
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
  // INTERNAL
  // ===========================================================================
  @query('textarea')
  private textareaEl?: HTMLTextAreaElement;

  @state()
  private uid = `ta-${Math.random().toString(16).slice(2)}`;

  @state()
  private isFocused = false;

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================
  firstUpdated(): void {
    // Ensure initial sync and autosize
    this.syncTextareaValueFromProp();
    this.applyAutosizeSoon();
  }

  updated(changed: Map<string, unknown>): void {
    if (changed.has('value')) {
      this.syncTextareaValueFromProp();
      this.applyAutosizeSoon();
    }

    if (changed.has('autosize') || changed.has('rows') || changed.has('minRows') || changed.has('maxRows')) {
      this.applyAutosizeSoon();
    }
  }

  // ===========================================================================
  // VALUE SYNC
  // ===========================================================================
  private syncTextareaValueFromProp(): void {
    const el = this.textareaEl;
    if (!el) return;

    const next = this.value ?? '';

    // Avoid resetting caret/scroll when user is typing and value is already in sync
    if (el.value !== next) {
      el.value = next;
    }
  }

  // ===========================================================================
  // AUTOSIZE
  // ===========================================================================
  private applyAutosizeSoon(): void {
    if (!this.autosize) return;
    // Wait for layout
    queueMicrotask(() => this.applyAutosize());
  }

  private applyAutosize(): void {
    const el = this.textareaEl;
    if (!el || !this.autosize) return;

    const computed = window.getComputedStyle(el);
    const lineHeight = this.parsePx(computed.lineHeight) ?? this.estimateLineHeight(computed.fontSize);

    const baseRows = this.rows > 0 ? this.rows : 1;
    const minRows = (this.minRows ?? baseRows) > 0 ? (this.minRows ?? baseRows) : 1;
    const maxRows = this.maxRows;

    const paddingTop = this.parsePx(computed.paddingTop) ?? 0;
    const paddingBottom = this.parsePx(computed.paddingBottom) ?? 0;
    const borderTop = this.parsePx(computed.borderTopWidth) ?? 0;
    const borderBottom = this.parsePx(computed.borderBottomWidth) ?? 0;

    const chrome = paddingTop + paddingBottom + borderTop + borderBottom;

    // Measure natural content height
    el.style.height = 'auto';

    // scrollHeight includes padding, not borders (typically). We'll clamp using rows heights + chrome.
    const natural = el.scrollHeight;

    const minHeight = minRows * lineHeight + chrome;
    const maxHeight = typeof maxRows === 'number' && maxRows > 0 ? maxRows * lineHeight + chrome : undefined;

    const clamped = Math.max(minHeight, maxHeight ? Math.min(natural, maxHeight) : natural);
    el.style.height = `${clamped}px`;

    // When clamped, allow internal scroll; otherwise hide it for a cleaner autosize.
    if (maxHeight && natural > maxHeight) {
      el.style.overflowY = 'auto';
    } else {
      el.style.overflowY = 'hidden';
    }
  }

  private parsePx(value: string): number | undefined {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? n : undefined;
  }

  private estimateLineHeight(fontSize: string): number {
    const fs = this.parsePx(fontSize) ?? 16;
    // Typical UA default line-height is ~1.2
    return fs * 1.2;
  }

  // ===========================================================================
  // EVENTS
  // ===========================================================================
  private canEdit(): boolean {
    // Consistent behavior: loading acts like disabled for interaction.
    // Readonly still allows focus/select/copy.
    return !this.disabled && !this.loading && !this.readonly;
  }

  private handleInput(e: Event): void {
    const el = e.target as HTMLTextAreaElement;

    // Even if readonly/disabled, browsers won't change value; keep safe.
    const next = el.value;
    this.value = next;

    if (this.autosize) this.applyAutosizeSoon();

    this.dispatchEvent(
      new CustomEvent('input', {
        bubbles: true,
        composed: true,
        detail: { value: next },
      }),
    );
  }

  private handleChange(e: Event): void {
    const el = e.target as HTMLTextAreaElement;
    const next = el.value;
    this.value = next;

    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: next },
      }),
    );
  }

  private handleFocus(): void {
    this.isFocused = true;
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleBlur(): void {
    this.isFocused = false;
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
      }),
    );
  }

  private handleKeydown(e: KeyboardEvent): void {
    if (e.key === 'Enter' && !e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
      // For textarea, Enter should create a newline by default.
      // We only emit the event without preventing default.
      this.dispatchEvent(
        new CustomEvent('enter', {
          bubbles: true,
          composed: true,
          detail: { value: this.value ?? '' },
        }),
      );
    }
  }

  // ===========================================================================
  // RENDER HELPERS
  // ===========================================================================
  private getLabelId(): string {
    return `textarea-label-${this.uid}`;
  }

  private getHelperId(): string {
    return `textarea-helper-${this.uid}`;
  }

  private getErrorId(): string {
    return `textarea-error-${this.uid}`;
  }

  private hasError(): boolean {
    return Boolean(this.error);
  }

  private getErrorMessage(): string {
    if (typeof this.error === 'string' && this.error.trim()) return this.error;
    const slotMsg = this.getSlotContent('Error');
    return slotMsg;
  }

  private renderBelow(): TemplateResult {
    const hasError = this.hasError();
    const errMsg = this.getErrorMessage();

    if (hasError && (errMsg || this.getSlotContent('Error'))) {
      return html`
        <div id=${this.getErrorId()} class="mt-1 text-sm text-rose-700">${unsafeHTML(errMsg || '')}</div>
      `;
    }

    if (this.hasSlot('Helper')) {
      return html`
        <div id=${this.getHelperId()} class="mt-1 text-sm text-slate-600">${unsafeHTML(this.getSlotContent('Helper'))}</div>
      `;
    }

    return html`${nothing}`;
  }

  private renderMaxLengthCount(): TemplateResult {
    if (typeof this.maxlength !== 'number') return html`${nothing}`;

    const current = (this.value ?? '').length;
    const limit = this.maxlength;

    const classes = [
      'mt-1 text-xs',
      current > limit ? 'text-rose-700' : 'text-slate-500',
    ].filter(Boolean).join(' ');

    return html`
      <div class=${classes} aria-label=${this.msg.characterCount}>
        <span class="sr-only">${this.msg.characterCount}:</span>
        ${current}/${limit}
      </div>
    `;
  }

  private getTextareaClasses(): string {
    const hasError = this.hasError();

    return [
      // Base
      'block w-full rounded-md border bg-white px-3 py-2 text-sm leading-5',
      'text-slate-900 placeholder:text-slate-400',
      'transition',
      // Focus
      !this.disabled && !this.loading
        ? 'focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500'
        : '',
      // Border colors
      hasError ? 'border-rose-500' : 'border-slate-300',
      // Disabled / loading / readonly
      this.disabled || this.loading ? 'opacity-60 cursor-not-allowed bg-slate-50' : '',
      this.readonly && !this.disabled && !this.loading ? 'bg-slate-50' : '',
      // Resize
      this.resize === 'none'
        ? 'resize-none'
        : this.resize === 'vertical'
          ? 'resize-y'
          : this.resize === 'horizontal'
            ? 'resize-x'
            : 'resize',
    ].filter(Boolean).join(' ');
  }

  private getWrapperClasses(): string {
    const hasError = this.hasError();

    return [
      'w-full',
      hasError ? '' : '',
    ].filter(Boolean).join(' ');
  }

  private renderLabel(): TemplateResult {
    if (!this.hasSlot('Label')) return html`${nothing}`;

    const requiredMark = this.required
      ? html`<span class="ml-1 text-rose-700" aria-label=${this.msg.required}>*</span>`
      : html`${nothing}`;

    return html`
      <label id=${this.getLabelId()} class="mb-1 block text-sm font-medium text-slate-900">
        ${unsafeHTML(this.getSlotContent('Label'))}${requiredMark}
      </label>
    `;
  }

  private renderPrefix(): TemplateResult {
    if (!this.hasSlot('Prefix')) return html`${nothing}`;
    return html`<div class="shrink-0 pl-3 text-slate-500">${unsafeHTML(this.getSlotContent('Prefix'))}</div>`;
  }

  private renderSuffixOrLoading(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="shrink-0 pr-3 text-slate-500" aria-live="polite">
          <span class="text-xs">${this.msg.loading}</span>
        </div>
      `;
    }

    if (!this.hasSlot('Suffix')) return html`${nothing}`;
    return html`<div class="shrink-0 pr-3 text-slate-500">${unsafeHTML(this.getSlotContent('Suffix'))}</div>`;
  }

  private computeAriaDescribedBy(): string | undefined {
    const ids: string[] = [];

    if (this.ariaDescribedby) ids.push(this.ariaDescribedby);

    const hasError = this.hasError();
    const errMsg = this.getErrorMessage();
    if (hasError && errMsg) ids.push(this.getErrorId());
    else if (this.hasSlot('Helper')) ids.push(this.getHelperId());

    const joined = ids.filter(Boolean).join(' ').trim();
    return joined || undefined;
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const effectiveId = this.inputId || `textarea-${this.uid}`;

    const ariaInvalid = this.hasError() ? 'true' : 'false';

    // Prefer explicit aria-labelledby, else if Label slot exists, use internal label id
    const ariaLabelledby = this.ariaLabelledby || (this.hasSlot('Label') ? this.getLabelId() : undefined);
    const ariaDescribedBy = this.computeAriaDescribedBy();

    const disabled = this.disabled || this.loading;

    return html`
      <div class=${this.getWrapperClasses()}>
        ${this.renderLabel()}

        <div class="flex items-stretch gap-2 rounded-md">
          ${this.renderPrefix()}

          <div class="flex-1">
            <textarea
              id=${effectiveId}
              class=${this.getTextareaClasses()}
              name=${this.name}
              .value=${this.value ?? ''}
              placeholder=${this.placeholder}
              rows=${this.rows}
              ?disabled=${disabled}
              ?readonly=${this.readonly}
              aria-disabled=${String(disabled)}
              aria-readonly=${String(this.readonly)}
              aria-required=${String(this.required)}
              aria-invalid=${ariaInvalid}
              aria-label=${ifDefined(this.ariaLabell)}
              aria-labelledby=${ifDefined(ariaLabelledby)}
              aria-describedby=${ifDefined(ariaDescribedBy)}
              maxlength=${ifDefined(this.maxlength)}
              minlength=${ifDefined(this.minlength)}
              pattern=${ifDefined(this.pattern)}
              autocomplete=${ifDefined(this.autocomplete)}
              inputmode=${ifDefined(this.inputmode)}
              @input=${this.handleInput}
              @change=${this.handleChange}
              @focus=${this.handleFocus}
              @blur=${this.handleBlur}
              @keydown=${this.handleKeydown}
            ></textarea>

            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0 flex-1">
                ${this.renderBelow()}
              </div>
              <div class="shrink-0">
                ${this.renderMaxLengthCount()}
              </div>
            </div>
          </div>

          ${this.renderSuffixOrLoading()}
        </div>
      </div>
    `;
  }
}
