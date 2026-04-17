/// <mls fileReference="_102020_/l2/widgetPlaygroundStateBoolean.ts" enhancement="_102020_/l2/enhancementAura.ts"/>

import { html, ifDefined, LitElement } from 'lit';
import { customElement, property, query } from 'lit/decorators.js';
import { propertyDataSource } from '/_102027_/l2/collabDecorators.js';
import { CollabLitElement } from '/_102027_/l2/collabLitElement.js'

@customElement('widget-playground-state-boolean-102020')
export class WcInputBoolean102020 extends CollabLitElement {

  @propertyDataSource({ type: Boolean }) value: boolean = false;
  @property({ type: String }) name: string | undefined;
  @propertyDataSource({ type: String }) label: string | undefined;
  @property({ type: Boolean }) disabled: boolean = false;
  @propertyDataSource({ type: String }) hint: string | undefined;

  render() {
    return html`
      <div class="flex flex-col gap-1">

        <label class="flex items-center justify-between cursor-pointer">

          <div class="flex flex-col">
            ${this.label ? html`
              <span class="text-sm font-medium text-gray-700">
                ${this.label}
              </span>
            ` : null}

            ${this.hint ? html`
              <span class="text-xs text-gray-500">
                ${this.hint}
              </span>
            ` : null}
          </div>

          <div class="relative inline-flex items-center">
            <input
              type="checkbox"
              class="sr-only peer"
              .checked=${this.value}
              ?disabled=${this.disabled}
              @change=${this.handleChange}
            />

            <div class="
              w-11 h-6 rounded-full transition
              bg-gray-300

              peer-checked:bg-blue-500
              peer-disabled:bg-gray-200

              after:content-['']
              after:absolute after:top-[2px] after:left-[2px]
              after:w-5 after:h-5
              after:bg-white after:rounded-full
              after:transition

              peer-checked:after:translate-x-5
            "></div>
          </div>

        </label>

      </div>
    `;
  }

  handleChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.value = input.checked;
  }
}