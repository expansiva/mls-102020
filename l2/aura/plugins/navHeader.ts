/// <mls fileReference="_102020_/l2/aura/plugins/navHeader.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--nav-header-102020')
export class PluginNavHeader extends StateLitElement {

    @property({ attribute: false }) fixedLabel: string = '';
    @property({ attribute: false }) itemName: string = '';
    @property({ attribute: false }) desc: string = '';
    @property({ type: Number }) value: number = 0;
    @property({ type: Number }) min: number = 0;
    @property({ type: Number }) max: number = 1;

    createRenderRoot() { return this; }

    render() {
        const atMin = this.value <= this.min;
        const atMax = this.value >= this.max;
        const navBtn = (svg: unknown, target: number, disabled: boolean) => html`
            <button
                class="p-1 rounded transition-colors
                    ${disabled
                        ? 'text-gray-300 dark:text-gray-700 cursor-default'
                        : 'text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'}"
                ?disabled=${disabled}
                @click=${() => { if (!disabled) this._dispatch(target); }}
            >${svg}</button>
        `;
        return html`
            <div class="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
                <span class="text-base font-semibold text-gray-700 dark:text-gray-200 text-center">${this.fixedLabel}</span>
                <div class="flex items-center rounded-md bg-gray-100 dark:bg-gray-800/60 px-1 py-2">
                    <div class="flex items-center gap-0.5">
                        ${navBtn(this._iconFirst(), this.min, atMin)}
                        ${navBtn(this._iconPrev(), this.value - 1, atMin)}
                    </div>
                    <span class="flex-1 text-center text-sm font-medium text-gray-600 dark:text-gray-300">${this.itemName}</span>
                    <div class="flex items-center gap-0.5">
                        ${navBtn(this._iconNext(), this.value + 1, atMax)}
                        ${navBtn(this._iconLast(), this.max, atMax)}
                    </div>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-center">${this.desc}</span>
            </div>
        `;
    }

    private _iconFirst() {
        return html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="11 17 6 12 11 7"/><polyline points="18 17 13 12 18 7"/></svg>`;
    }
    private _iconPrev() {
        return html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>`;
    }
    private _iconNext() {
        return html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>`;
    }
    private _iconLast() {
        return html`<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>`;
    }

    private _dispatch(value: number) {
        this.dispatchEvent(new CustomEvent('nav-change', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
