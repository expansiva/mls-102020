/// <mls fileReference="_102020_/l2/aura/plugins/infoTip.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';

// Only one tip is open at a time: opening one tells the others to close.
const OPEN_EVENT = 'aura-info-tip-open';

/**
 * A small ⓘ button that shows an explanation on demand, so a panel can keep its long texts off the screen.
 *
 * Light DOM, and the popover is `absolute left-0 right-0 top-full`: it spans the nearest positioned
 * ancestor, so place the tip inside a `relative` container (usually the section title row).
 * Opens by click or keyboard; closes on Esc, on a click outside and when another tip opens.
 */
@customElement('aura--plugins--info-tip-102020')
export class PluginInfoTip extends StateLitElement {

    @property({ attribute: false }) text: string = '';
    /** Accessible label of the button. */
    @property({ attribute: false }) label: string = '';

    @state() private _open: boolean = false;

    createRenderRoot() { return this; }

    connectedCallback() {
        super.connectedCallback();
        window.addEventListener(OPEN_EVENT, this._onOtherOpened);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        window.removeEventListener(OPEN_EVENT, this._onOtherOpened);
        this._unlisten();
    }

    render() {
        if (!this.text) return nothing;
        return html`
            <button
                type="button"
                aria-label=${this.label}
                title=${this.label}
                aria-expanded=${this._open ? 'true' : 'false'}
                class="w-4 h-4 shrink-0 rounded-full grid place-items-center text-[10px] font-bold leading-none border transition-colors cursor-pointer
                    ${this._open
                        ? 'border-indigo-400 text-indigo-600 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-900/40'
                        : 'border-gray-300 dark:border-gray-600 text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200'}"
                @click=${this._toggle}
            >i</button>
            ${this._open ? html`
                <div
                    role="note"
                    class="absolute left-0 right-0 top-full mt-1.5 z-20 rounded-lg border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-800 shadow-lg px-3 py-2 text-xs font-normal leading-snug text-gray-600 dark:text-gray-300"
                >${this.text}</div>
            ` : nothing}
        `;
    }

    private _toggle = (e: Event) => {
        e.stopPropagation();
        if (this._open) { this._close(); return; }
        window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: this }));
        this._open = true;
        document.addEventListener('pointerdown', this._onPointerDown, true);
        document.addEventListener('keydown', this._onKeydown, true);
    };

    private _close() {
        this._open = false;
        this._unlisten();
    }

    private _unlisten() {
        document.removeEventListener('pointerdown', this._onPointerDown, true);
        document.removeEventListener('keydown', this._onKeydown, true);
    }

    private _onOtherOpened = (e: Event) => {
        if ((e as CustomEvent).detail !== this && this._open) this._close();
    };

    private _onPointerDown = (e: Event) => {
        if (!e.composedPath().includes(this)) this._close();
    };

    private _onKeydown = (e: KeyboardEvent) => {
        if (e.key !== 'Escape') return;
        e.stopPropagation();
        this._close();
    };
}
