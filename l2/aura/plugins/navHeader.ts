/// <mls fileReference="_102020_/l2/aura/plugins/navHeader.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
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
    /**
     * Opt-in rename of the current item: a ✎ next to the name (and a double click on it) swaps the name for an
     * input; Enter emits `name-change` ({ value, name }), Esc and blur cancel. Off by default, so every other
     * panel renders exactly as before.
     */
    @property({ type: Boolean }) editable: boolean = false;
    /** Accessible label of the ✎ button. */
    @property({ attribute: false }) editLabel: string = '';
    /** Keyboard hint shown under the navigator only while editing. */
    @property({ attribute: false }) editHint: string = '';

    @state() private _editing: boolean = false;

    createRenderRoot() { return this; }

    willUpdate(changed: Map<string, unknown>) {
        // Navigating away (or turning the option off) drops an unfinished edit.
        if (changed.has('value') || (changed.has('editable') && !this.editable)) this._editing = false;
    }

    updated(changed: Map<string, unknown>) {
        super.updated(changed);
        if (changed.has('_editing') && this._editing) {
            const input = this.querySelector<HTMLInputElement>('input[data-nav-name]');
            input?.focus();
            input?.select();
        }
    }

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
                    ${this.editable ? this._renderEditableName() : html`
                        <span class="flex-1 text-center text-sm font-medium text-gray-600 dark:text-gray-300">${this.itemName}</span>
                    `}
                    <div class="flex items-center gap-0.5">
                        ${navBtn(this._iconNext(), this.value + 1, atMax)}
                        ${navBtn(this._iconLast(), this.max, atMax)}
                    </div>
                </div>
                ${this._editing && this.editHint ? html`
                    <span class="text-[10px] text-indigo-500 dark:text-indigo-400 text-center">${this.editHint}</span>
                ` : nothing}
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

    // ─── Rename (editable) ────────────────────────────────────────────

    private _renderEditableName() {
        if (this._editing) {
            return html`
                <input
                    data-nav-name
                    type="text"
                    class="flex-1 min-w-0 mx-1 text-center text-sm font-medium px-2 py-0.5 rounded border border-indigo-400 dark:border-indigo-500
                        bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 outline-none"
                    .value=${this.itemName}
                    @keydown=${this._onNameKeydown}
                    @blur=${() => { this._editing = false; }}
                />
            `;
        }
        return html`
            <span
                class="group flex-1 min-w-0 flex items-center justify-center gap-1 text-sm font-medium text-gray-600 dark:text-gray-300"
                @dblclick=${() => { this._editing = true; }}
            >
                <span class="truncate">${this.itemName}</span>
                <button
                    type="button"
                    class="shrink-0 p-0.5 rounded text-gray-400 dark:text-gray-500 opacity-0 group-hover:opacity-100 focus:opacity-100
                        hover:text-indigo-500 dark:hover:text-indigo-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-opacity cursor-pointer"
                    title=${this.editLabel}
                    aria-label=${this.editLabel}
                    @click=${() => { this._editing = true; }}
                >${this._iconPen()}</button>
            </span>
        `;
    }

    private _onNameKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') {
            e.stopPropagation();
            this._editing = false;
            return;
        }
        if (e.key !== 'Enter') return;
        const name = (e.target as HTMLInputElement).value.trim();
        // Leave edit mode before the input goes away, so its blur is a no-op.
        this._editing = false;
        if (!name || name === this.itemName) return;
        this.dispatchEvent(new CustomEvent('name-change', {
            detail: { value: this.value, name },
            bubbles: true,
            composed: true,
        }));
    }

    private _iconPen() {
        return html`<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>`;
    }

    private _dispatch(value: number) {
        this.dispatchEvent(new CustomEvent('nav-change', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
