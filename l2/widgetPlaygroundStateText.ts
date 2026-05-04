/// <mls fileReference="_102020_/l2/widgetPlaygroundStateText.ts" enhancement="_102020_/l2/enhancementAura.ts"/>

import { html } from 'lit';
import { ifDefined } from 'lit/directives/if-defined.js';
import { customElement, property, query } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators.js';
import { CollabLitElement } from '/_102027_/l2/collabLitElement.js'

@customElement('widget-playground-state-text-102020')
export class WidgetPlaygroundStateText extends CollabLitElement {
  
    autocapitalize: any = "off";
    validationmessage: string | undefined;
    debounce: string | undefined;

    @propertyDataSource({ type: String }) value: string | undefined;

    @property({ type: String }) name: string | undefined;

    @propertyDataSource({ type: String }) label: string | undefined;

    @property({ type: String }) pattern: string | undefined;

    @property({ type: String }) errormessage: string | undefined;

    @property({ type: String }) placeholder: string | undefined;

    @property({ type: String }) autocomplete: string | undefined;

    @property({ type: Number }) maxlength: number | undefined = undefined;

    @property({ type: Number }) minlength: number | undefined = undefined;

    @property({ type: Boolean }) required: boolean = false;

    @property({ type: Boolean }) disabled: boolean = false;

    @property({ type: Boolean }) readonly: boolean = false;

    @property({ type: Boolean }) autofocus: boolean = false;

    @propertyDataSource({ type: String }) hint: string | undefined;

    @property({ type: String }) autoCapitalize: 'off' | 'none' | 'on' | 'sentences' | 'words' | 'characters' | undefined = undefined;

    @query('.input_control') input: HTMLInputElement | undefined;

    error: string = '';

    render() {
        return html`
    <div class="flex flex-col gap-1">
      
      ${this.label ? html`
        <label class="text-sm font-medium text-gray-700 dark:text-gray-300">
          ${this.label}
        </label>
      ` : null}

      <input
        class="
          w-full px-3 py-2 rounded-lg border
          text-sm text-gray-900 dark:text-gray-100
          bg-white dark:bg-slate-800
          border-gray-300 dark:border-slate-600
          transition
          outline-none
          
          focus:ring-2 focus:ring-blue-500 focus:border-blue-500
          dark:focus:ring-blue-400 dark:focus:border-blue-400
          
          disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed
          dark:disabled:bg-slate-700 dark:disabled:text-slate-500
          
          placeholder:text-gray-400 dark:placeholder:text-slate-500
          
          ${this.error ? 'border-red-500 focus:ring-red-500 focus:border-red-500 dark:border-red-400 dark:focus:ring-red-400 dark:focus:border-red-400' : ''}
        "
        type="text"
        name=${ifDefined(this.name)}
        ?disabled=${this.disabled}
        ?readonly=${this.readonly}
        ?required=${this.required}
        maxlength=${ifDefined(this.maxlength)}    
        minlength=${ifDefined(this.minlength)}
        autocomplete=${ifDefined(this.autocomplete)}
        placeholder=${ifDefined(this.placeholder)}
        .value=${this.value || ''}
        ?autofocus=${this.autofocus}
        pattern=${ifDefined(this.pattern)}
        @input=${this.handleChange}
      />

      ${this.hint ? html`
        <small class="text-xs text-gray-500 dark:text-gray-400">
          ${this.hint}
        </small>
      ` : null}

      ${this.error ? html`
        <div class="text-xs text-red-500 dark:text-red-400 font-medium">
          ${this.error}
        </div>
      ` : null}

    </div>
  `;
    }

    handleChange(event: Event) {
        const input = event.target as HTMLInputElement;
        this.value = input.value;
    }

}
