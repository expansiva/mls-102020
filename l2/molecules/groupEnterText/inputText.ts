/// <mls fileReference="_102020_/l2/molecules/groupEnterText/inputText.ts" enhancement="_102020_/l2/enhancementAura" />
// =============================================================================
// INPUT TEXT MOLECULE
// =============================================================================
// Skill Group: enter + text
// This molecule is presentation-only. No business logic.
// - No Shadow DOM
// - Receives data via properties
// - Emits interaction events
// =============================================================================
import { html, nothing, TemplateResult, unsafeHTML, ifDefined } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { propertyDataSource } from '/_100554_/l2/collabDecorators';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';

/// **collab_i18n_start**
const message_en = {
  requiredMark: '*',
  loading: 'Loading...',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
  en: message_en,
  pt: {
    requiredMark: '*',
    loading: 'Carregando...',
  },
};
/// **collab_i18n_end**

@customElement('molecules--group-enter-text--input-text-102020')
export class InputTextMolecule extends MoleculeAuraElement {
  private msg: MessageType = messages.en;

  // =========================================================================
  // SLOT TAGS (Contract: enter + text)
  // =========================================================================
  slotTags = ['Label', 'Prefix', 'Suffix', 'Helper', 'Error'];

  // =========================================================================
  // PROPERTIES — From Contract
  // =========================================================================
  @propertyDataSource({ type: String })
  value: string = '';

  @property({ type: String })
  name: string = '';

  @property({ type: String })
  type: string = 'text';

  @property({ type: String })
  placeholder: string = '';

  @property({ type: Number })
  maxlength: number | undefined;

  @property({ type: Number })
  minlength: number | undefined;

  @property({ type: String })
  pattern: string | undefined;

  @property({ type: String })
  autocomplete: string | undefined;

  @property({ type: String })
  inputmode: string | undefined;

  @property({ type: Boolean })
  disabled: boolean = false;

  @property({ type: Boolean })
  readonly: boolean = false;

  @property({ type: Boolean })
  required: boolean = false;

  @property({ type: Boolean })
  loading: boolean = false;

  @property({ type: String })
  error: boolean | string = false;

  // =========================================================================
  // INTERNAL STATE
  // =========================================================================
  @state()
  private uid = `it-${Math.random().toString(16).slice(2)}`;

  // =========================================================================
  // DERIVED
  // =========================================================================
  private get isErrored(): boolean {
    return Boolean(this.error) || this.hasSlot('Error');
  }

  private get errorMessage(): string {
    const slotMsg = this.getSlotContent('Error');
    return slotMsg;
  }

  private get helperMessage(): string {
    return this.getSlotContent('Helper');
  }

  private get describedBy(): string | undefined {
    const ids: string[] = [];

    // Priority: error > helper
    if (this.isErrored) {
      ids.push(`input-error-${this.uid}`);
    } else if (this.hasSlot('Helper')) {
      ids.push(`input-helper-${this.uid}`);
    }

    return ids.length ? ids.join(' ') : undefined;
  }

  private get labelId(): string | undefined {
    return this.hasSlot('Label') ? `input-label-${this.uid}` : undefined;
  }

  // =========================================================================
  // EVENT HANDLERS
  // =========================================================================
  private dispatchInputEvent(nextValue: string): void {
    this.dispatchEvent(
      new CustomEvent('input', {
        bubbles: true,
        composed: true,
        detail: { value: nextValue },
      }),
    );
  }

  private dispatchChangeEvent(nextValue: string): void {
    this.dispatchEvent(
      new CustomEvent('change', {
        bubbles: true,
        composed: true,
        detail: { value: nextValue },
      }),
    );
  }

  private handleInput(e: Event): void {
    if (this.disabled || this.readonly) return;
    const el = e.target as HTMLInputElement;
    const nextValue = el.value;

    // Controlled-ish: update our value immediately so UI stays in sync.
    this.value = nextValue;
    this.dispatchInputEvent(nextValue);
  }

  private handleChange(e: Event): void {
    if (this.disabled || this.readonly) return;
    const el = e.target as HTMLInputElement;
    const nextValue = el.value;

    this.value = nextValue;
    this.dispatchChangeEvent(nextValue);
  }

  private handleFocus(): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('focus', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  }

  private handleBlur(): void {
    if (this.disabled) return;
    this.dispatchEvent(
      new CustomEvent('blur', {
        bubbles: true,
        composed: true,
        detail: {},
      }),
    );
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.disabled) return;
    if (e.key === 'Enter') {
      // For readonly, we still allow enter event (focus interaction) but do not change value.
      this.dispatchEvent(
        new CustomEvent('enter', {
          bubbles: true,
          composed: true,
          detail: { value: this.value ?? '' },
        }),
      );
    }
  }

  // =========================================================================
  // RENDER HELPERS
  // =========================================================================
  private getContainerClasses(): string {
    return [
      'w-full',
      this.disabled ? 'opacity-60' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private getInputWrapClasses(): string {
    const base = [
      'flex items-stretch w-full rounded-md border transition',
      'bg-white',
    ];

    const state = this.isErrored
      ? ['border-rose-500', 'focus-within:ring-2 focus-within:ring-rose-500/40']
      : ['border-slate-300', 'focus-within:ring-2 focus-within:ring-sky-500/40', 'hover:border-slate-400'];

    const disabled = this.disabled
      ? ['bg-slate-100', 'border-slate-200', 'cursor-not-allowed']
      : ['cursor-text'];

    const ro = this.readonly && !this.disabled
      ? ['bg-slate-50']
      : [];

    return [...base, ...state, ...disabled, ...ro]
      .filter(Boolean)
      .join(' ');
  }

  private getInputClasses(): string {
    return [
      'w-full min-w-0',
      'px-3 py-2',
      'text-sm text-slate-900',
      'placeholder:text-slate-400',
      'bg-transparent',
      'outline-none',
      this.disabled ? 'cursor-not-allowed select-none' : '',
      this.readonly && !this.disabled ? 'cursor-default' : '',
    ]
      .filter(Boolean)
      .join(' ');
  }

  private renderLabel(): TemplateResult {
    if (!this.hasSlot('Label')) return html`${nothing}`;

    const labelText = this.getSlotContent('Label');
    const labelClasses = [
      'mb-1 block text-sm font-medium',
      this.disabled ? 'text-slate-500' : 'text-slate-700',
    ]
      .filter(Boolean)
      .join(' ');

    return html`
      <label id=${`input-label-${this.uid}`} class=${labelClasses}>
        ${unsafeHTML(labelText)}
        ${this.required
          ? html`<span class="ml-1 text-rose-600" aria-hidden="true">${this.msg.requiredMark}</span>`
          : nothing}
      </label>
    `;
  }

  private renderPrefix(): TemplateResult {
    if (!this.hasSlot('Prefix')) return html`${nothing}`;

    return html`
      <div class="flex items-center pl-3 pr-1 text-slate-500">
        <div class="flex items-center">${unsafeHTML(this.getSlotContent('Prefix'))}</div>
      </div>
    `;
  }

  private renderSuffixOrLoading(): TemplateResult {
    if (this.loading) {
      return html`
        <div class="flex items-center gap-2 pl-2 pr-3 text-slate-500">
          <span class="inline-block h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-slate-600" aria-hidden="true"></span>
          <span class="text-xs">${this.msg.loading}</span>
        </div>
      `;
    }

    if (!this.hasSlot('Suffix')) return html`${nothing}`;

    return html`
      <div class="flex items-center pl-1 pr-3 text-slate-500">
        <div class="flex items-center">${unsafeHTML(this.getSlotContent('Suffix'))}</div>
      </div>
    `;
  }

  private renderBelowText(): TemplateResult {
    // Priority: error > helper
    if (this.isErrored) {
      const msg = this.errorMessage;
      if (!msg) return html`${nothing}`;
      return html`
        <div
          id=${`input-error-${this.uid}`}
          class="mt-1 text-sm text-rose-600 whitespace-pre-line"
          role="alert"
        >
          ${unsafeHTML(msg)}
        </div>
      `;
    }

    if (this.hasSlot('Helper')) {
      const helper = this.helperMessage;
      return html`
        <div id=${`input-helper-${this.uid}`} class="mt-1 text-sm text-slate-500 whitespace-pre-line">
          ${unsafeHTML(helper)}
        </div>
      `;
    }

    return html`${nothing}`;
  }

  // =========================================================================
  // RENDER
  // =========================================================================
  render(): TemplateResult {
    const lang = this.getMessageKey(messages);
    this.msg = messages[lang];

    const ariaInvalid = this.isErrored ? 'true' : 'false';

    return html`
      <div class=${this.getContainerClasses()}>
        ${this.renderLabel()}

        <div class=${this.getInputWrapClasses()}>
          ${this.renderPrefix()}

          <input
            class=${this.getInputClasses()}
            .value=${this.value ?? ''}
            type=${this.type || 'text'}
            name=${ifDefined(this.name || undefined)}
            placeholder=${ifDefined(this.placeholder || undefined)}
            maxlength=${ifDefined(this.maxlength)}
            minlength=${ifDefined(this.minlength)}
            pattern=${ifDefined(this.pattern)}
            autocomplete=${ifDefined(this.autocomplete)}
            inputmode=${ifDefined(this.inputmode)}
            ?disabled=${this.disabled}
            ?readonly=${this.readonly}
            aria-disabled=${this.disabled ? 'true' : 'false'}
            aria-readonly=${this.readonly ? 'true' : 'false'}
            aria-required=${this.required ? 'true' : 'false'}
            aria-invalid=${ariaInvalid}
            aria-labelledby=${ifDefined(this.labelId)}
            aria-describedby=${ifDefined(this.describedBy)}
            @input=${this.handleInput}
            @change=${this.handleChange}
            @focus=${this.handleFocus}
            @blur=${this.handleBlur}
            @keydown=${this.handleKeyDown}
          />

          ${this.renderSuffixOrLoading()}
        </div>

        ${this.renderBelowText()}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'group-enter-text--input-text-102020': InputTextMolecule;
  }
}
