/// <mls fileReference="_102020_/l2/aura/plugins/selectMolecule.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import '/_102020_/l2/aura/plugins/navHeader.js';
import { getGroupLabel, groupLabels } from '/_102020_/l2/aura/molecules/skills/groupLabels.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Molecules',
    desc: 'Switch between molecule variants for the selected widget.',
    noMolecule: 'Select a web component in the preview to enable molecule variants.',
    applyToAll: 'Apply to all occurrences',
    previewing: 'previewing',
    previewUnavailable: 'preview unavailable',
    catalog: 'View catalog',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Moléculas',
        desc: 'Alterne entre variantes de molécula para o widget selecionado.',
        noMolecule: 'Selecione um web component no preview para habilitar as variantes.',
        applyToAll: 'Aplicar a todas as ocorrências',
        previewing: 'pré-visualizando',
        previewUnavailable: 'pré-visualização indisponível',
        catalog: 'Ver catálogo',
    },
    es: {
        title: 'Moléculas',
        desc: 'Cambia entre variantes de molécula para el widget seleccionado.',
        noMolecule: 'Seleccione un componente web en el preview para habilitar las variantes.',
        applyToAll: 'Aplicar a todas las ocurrencias',
        previewing: 'previsualizando',
        previewUnavailable: 'vista previa no disponible',
        catalog: 'Ver catálogo',
    },
};
/// **collab_i18n_end**

/** Delay before a hovered/focused variant is previewed on the page. */
const PREVIEW_DELAY_MS = 150;
/** Delay before leaving the list puts the page back (short: moving between items cancels it). */
const PREVIEW_CLEAR_MS = 80;

// ─── Types ───────────────────────────────────────────────────────────

interface IMoleculeFile {
    shortName: string;
    folder: string;
    extension: string;
    [key: string]: any;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-molecule-102020')
export class PluginSelectMolecule extends StateLitElement {

    @property({ attribute: false }) group: string = '';
    @property({ attribute: false }) description: string = '';
    @property({ attribute: false }) files: IMoleculeFile[] = [];
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) replaceMode: 'selected' | 'all' = 'selected';
    @property({ attribute: false }) error: string = '';
    /** The variant shown on screen without being applied (hover/focus), as the service confirmed it. */
    @property({ attribute: false }) previewValue: number | null = null;
    /** The variant whose on-screen preview could not be shown. */
    @property({ attribute: false }) previewUnavailable: number | null = null;
    /** The group has an index page, so "Ver catálogo" can open it. */
    @property({ attribute: false }) catalogAvailable: boolean = false;

    /** Waits a moment before asking for a preview, so sweeping the list does not mount every variant. */
    private _previewTimer: ReturnType<typeof setTimeout> | null = null;
    /** The last value asked for, so the same request is not sent twice in a row. */
    private _previewAsked: number | null = null;

    willUpdate(changed: Map<PropertyKey, unknown>) {
        // The service cleared the preview on its own (new selection, real swap, mode toggle): the next
        // hover on the same variant has to be sent again.
        if ((changed.has('previewValue') || changed.has('previewUnavailable'))
            && this.previewValue === null && this.previewUnavailable === null) {
            this._previewAsked = null;
        }
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        // Leaving the panel (another knob, another service) must not leave a preview on the page.
        this._schedulePreview(null, true);
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.group || this.files.length === 0) return this._renderNoMolecule();
        return this._renderMolecules();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNoMolecule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(1, 1)}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.noMolecule}</span>
                </div>
            </div>
        `;
    }

    private _renderMolecules() {
        const max = this.files.length;
        const currentName = this.value ? (this.files[this.value - 1]?.shortName ?? '') : '';
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.value ?? 1, max, currentName)}

                ${this._renderGroupCard()}

                ${this._renderReplaceModeToggle()}

                ${this.error ? html`
                    <div class="rounded-lg border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/10 px-3 py-2">
                        <span class="text-xs text-rose-600 dark:text-rose-400">${this.error}</span>
                    </div>
                ` : nothing}

                <div
                    class="flex flex-col gap-1"
                    @mouseleave=${() => this._schedulePreview(null)}
                    @focusout=${(e: FocusEvent) => this._onListFocusOut(e)}
                >
                    ${this.files.map((f, i) => this._renderVariantCard(f, i + 1))}
                </div>
            </div>
        `;
    }

    // ─── Sub-renders ─────────────────────────────────────────────────

    /**
     * The group card: its translated title and summary from `groupLabels`. The `description` the
     * service sends is the agents' contract (English, technical), so it only shows for a group that
     * has no label yet — the card is never left empty.
     */
    private _renderGroupCard() {
        const label = getGroupLabel(this.group, this.getMessageKey(groupLabels));
        if (label) {
            return html`
                <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5">
                    <div class="flex items-baseline gap-2 mb-1">
                        <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${label.title}</span>
                        <span class="ml-auto font-mono text-[10px] text-gray-400 dark:text-gray-600 truncate">${this.group}</span>
                    </div>
                    <span class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">${label.summary}</span>
                    ${this._renderCatalogButton()}
                </div>
            `;
        }
        if (!this.description) return nothing;
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5">
                <div class="flex items-center gap-2 mb-1">
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${this.group}</span>
                </div>
                <span class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">${this.description}</span>
                ${this._renderCatalogButton()}
            </div>
        `;
    }

    /** "Ver catálogo": only when the group has an index page to open. */
    private _renderCatalogButton() {
        if (!this.catalogAvailable) return nothing;
        return html`
            <div class="mt-2">
                <button
                    type="button"
                    class="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-md border
                        border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300
                        hover:bg-gray-100 dark:hover:bg-gray-800"
                    @click=${() => this.dispatchEvent(new CustomEvent('molecule-catalog', { bubbles: true, composed: true }))}
                >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
                    </svg>
                    ${this.msg.catalog}
                </button>
            </div>
        `;
    }

    private _renderHeader(value: number, max: number, itemName: string = '') {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${this.msg.desc}
                .value=${value}
                .min=${1}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    private _renderReplaceModeToggle() {
        const isAll = this.replaceMode === 'all';
        return html`
            <div class="flex items-center justify-between gap-2 px-0.5">
                <span class="text-xs text-gray-500 dark:text-gray-400">${this.msg.applyToAll}</span>
                <button
                    role="switch"
                    aria-checked=${isAll}
                    class="
                        relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full
                        border-2 border-transparent transition-colors duration-200
                        ${isAll ? 'bg-indigo-500 dark:bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}
                    "
                    @click=${() => this._dispatchReplaceMode(isAll ? 'selected' : 'all')}
                >
                    <span class="
                        pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow
                        transform transition duration-200
                        ${isAll ? 'translate-x-4' : 'translate-x-0'}
                    "></span>
                </button>
            </div>
        `;
    }

    private _renderVariantCard(file: IMoleculeFile, selectValue: number) {
        const isSelected = this.value === selectValue;
        const isPreviewing = !isSelected && this.previewValue === selectValue;
        const isUnavailable = !isSelected && this.previewUnavailable === selectValue;
        return html`
            <div
                role="button"
                tabindex="0"
                data-variant=${selectValue}
                class="
                    flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all
                    focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400
                    ${isSelected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : isPreviewing
                            ? 'border-dashed border-indigo-300 dark:border-indigo-700 bg-gray-50 dark:bg-gray-900/50'
                            : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'}
                "
                @click=${() => this._dispatchSelect(selectValue)}
                @keydown=${(e: KeyboardEvent) => this._onVariantKey(e, selectValue)}
                @mouseenter=${() => this._schedulePreview(selectValue)}
                @focus=${() => this._schedulePreview(selectValue)}
            >
                <div class="
                    shrink-0 w-7 h-7 rounded flex items-center justify-center
                    ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-700'}
                ">
                    ${this._svgMolecule(isSelected)}
                </div>
                <span class="flex-1 min-w-0 flex flex-col">
                    <span class="text-sm truncate
                        ${isSelected ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'font-medium text-gray-700 dark:text-gray-300'}
                    ">${file.shortName}</span>
                    ${isUnavailable ? html`<span class="text-[11px] text-amber-600 dark:text-amber-400">${this.msg.previewUnavailable}</span>` : nothing}
                </span>
                ${isSelected ? html`<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></div>` : nothing}
                ${isPreviewing ? html`<span class="text-[10px] text-indigo-500 dark:text-indigo-400 shrink-0">${this.msg.previewing}</span>` : nothing}
            </div>
        `;
    }

    // ─── SVG icon ─────────────────────────────────────────────────────

    private _svgMolecule(active: boolean) {
        const color = active ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500';
        return html`
            <svg class="${color}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="4" cy="6" r="2"/>
                <circle cx="20" cy="6" r="2"/>
                <circle cx="4" cy="18" r="2"/>
                <circle cx="20" cy="18" r="2"/>
                <line x1="6" y1="6" x2="9.5" y2="10.5"/>
                <line x1="18" y1="6" x2="14.5" y2="10.5"/>
                <line x1="6" y1="18" x2="9.5" y2="13.5"/>
                <line x1="18" y1="18" x2="14.5" y2="13.5"/>
            </svg>
        `;
    }

    // ─── Preview (hover / focus) ──────────────────────────────────────

    /**
     * Asks the service to show `value` on the page without applying it, or to put the page back
     * (`null`). Entering a variant waits a little (sweeping the list is not a request for each one);
     * leaving the list is quicker. The variant already applied is the page as it is: asking for it
     * means "put it back".
     */
    private _schedulePreview(value: number | null, immediate = false) {
        if (this._previewTimer) clearTimeout(this._previewTimer);
        this._previewTimer = null;
        const wanted = value === this.value ? null : value;
        const send = () => {
            this._previewTimer = null;
            if (wanted === this._previewAsked) return;
            this._previewAsked = wanted;
            this.dispatchEvent(new CustomEvent('molecule-preview', {
                detail: { value: wanted },
                bubbles: true,
                composed: true,
            }));
        };
        if (immediate) { send(); return; }
        this._previewTimer = setTimeout(send, wanted === null ? PREVIEW_CLEAR_MS : PREVIEW_DELAY_MS);
    }

    private _onListFocusOut(e: FocusEvent) {
        const next = e.relatedTarget as Node | null;
        if (next && (e.currentTarget as HTMLElement).contains(next)) return;
        this._schedulePreview(null);
    }

    private _onVariantKey(e: KeyboardEvent, value: number) {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            this._schedulePreview(null, true);
            this._dispatchSelect(value);
        } else if (e.key === 'Escape') {
            this._schedulePreview(null, true);
        }
    }

    // ─── Event dispatchers ────────────────────────────────────────────

    private _dispatchSelect(value: number) {
        // The real swap replaces whatever was being previewed; the service clears it first.
        if (this._previewTimer) clearTimeout(this._previewTimer);
        this._previewTimer = null;
        this._previewAsked = null;
        this.dispatchEvent(new CustomEvent('select-molecule', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchReplaceMode(mode: 'selected' | 'all') {
        this.dispatchEvent(new CustomEvent('molecule-replace-mode', {
            detail: { value: mode },
            bubbles: true,
            composed: true,
        }));
    }
}
