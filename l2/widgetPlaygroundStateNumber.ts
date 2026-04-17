/// <mls fileReference="_102020_/l2/widgetPlaygroundStateNumber.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, ifDefined, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators.js';
import {CollabLitElement} from '/_102027_/l2/collabLitElement.js'

@customElement('widget-playground-state-number-102020')
export class WcInputNumber102020 extends CollabLitElement {

  @propertyDataSource({ type: Number }) value: number | undefined;

  @property({ type: String }) name: string | undefined;
  @propertyDataSource({ type: String }) label: string | undefined;
  @property({ type: Number }) min: number | undefined;
  @property({ type: Number }) max: number | undefined;
  @property({ type: Number }) step: number | undefined;

  @property({ type: String }) placeholder: string | undefined;
  @property({ type: Boolean }) disabled: boolean = false;
  @property({ type: Boolean }) readonly: boolean = false;
  @property({ type: Boolean }) required: boolean = false;

  @propertyDataSource({ type: String }) hint: string | undefined;

  error: string = '';

  render() {
    return html`
      <div class="flex flex-col gap-1">

        ${this.label ? html`
          <label class="text-sm font-medium text-gray-700">
            ${this.label}
          </label>
        ` : null}

        <input
          type="number"
          class="
            w-full px-3 py-2 rounded-lg border
            text-sm text-gray-900
            bg-white border-gray-300
            transition outline-none

            focus:ring-2 focus:ring-blue-500 focus:border-blue-500

            disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed

            ${this.error ? 'border-red-500 focus:ring-red-500 focus:border-red-500' : ''}
          "
          name=${ifDefined(this.name)}
          .value=${this.value ?? ''}
          min=${ifDefined(this.min)}
          max=${ifDefined(this.max)}
          step=${ifDefined(this.step)}
          placeholder=${ifDefined(this.placeholder)}
          ?disabled=${this.disabled}
          ?readonly=${this.readonly}
          ?required=${this.required}
          @input=${this.handleChange}
        />

        ${this.hint ? html`
          <small class="text-xs text-gray-500">${this.hint}</small>
        ` : null}

        ${this.error ? html`
          <div class="text-xs text-red-500 font-medium">${this.error}</div>
        ` : null}

      </div>
    `;
  }

  handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.value ? Number(input.value) : undefined;
  }
}