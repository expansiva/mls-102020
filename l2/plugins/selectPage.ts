/// <mls fileReference="_102020_/l2/plugins/selectPage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import '/_102020_/l2/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Pages',
    desc: 'A page represents a screen or route within the module.',
    allTitle: 'All Pages',
    allDesc: 'Overview of all pages in this module.',
    customTitle: 'New Page',
    customDesc: 'Create a new page in this module.',
    noPages: 'No pages found in this module.',
    noResults: 'No pages match your search.',
    createNew: 'New Page',
    searchPlaceholder: 'Search pages…',
    inDevelopment: 'In development',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Páginas',
        desc: 'Uma página representa uma tela ou rota dentro do módulo.',
        allTitle: 'Todas as Páginas',
        allDesc: 'Visão geral de todas as páginas deste módulo.',
        customTitle: 'Nova Página',
        customDesc: 'Crie uma nova página neste módulo.',
        noPages: 'Nenhuma página encontrada neste módulo.',
        noResults: 'Nenhuma página corresponde à sua busca.',
        createNew: 'Nova Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'Em desenvolvimento',
    },
    es: {
        title: 'Páginas',
        desc: 'Una página representa una pantalla o ruta dentro del módulo.',
        allTitle: 'Todas las Páginas',
        allDesc: 'Visión general de todas las páginas de este módulo.',
        customTitle: 'Nueva Página',
        customDesc: 'Cree una nueva página en este módulo.',
        noPages: 'No se encontraron páginas en este módulo.',
        noResults: 'Ninguna página coincide con su búsqueda.',
        createNew: 'Nueva Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'En desarrollo',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IPage {
    name: string;
    path: string;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-page-102020')
export class PluginSelectPage extends StateLitElement {

    @property({ attribute: false }) pages: IPage[] = [];
    @property({ attribute: false }) value: number | null = null;

    @state() private _search: string = '';

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value')) this._search = '';
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean {
        return this.value === 0;
    }

    private get _isCustom(): boolean {
        return this.value !== null && this.value > this.pages.length;
    }

    private get _selectedPage(): IPage | null {
        if (this.value === null || this.value <= 0 || this.value > this.pages.length) return null;
        return this.pages[this.value - 1];
    }

    createRenderRoot() { return this; }

    render() {
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderSelected() {
        const page = this._selectedPage;
        const max = this.pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${page?.name ?? ''}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                ${page ? this._renderPageDetail(page) : nothing}
            </div>
        `;
    }

    private _renderPageDetail(page: IPage) {
        return html`
            <div class="
                rounded-lg border border-gray-200 dark:border-gray-800
                bg-gray-50 dark:bg-gray-900/50
                px-3 py-2.5
            ">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${page.name}</span>
                    <span
                        class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                        style="max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                    >${page.path}</span>
                </div>
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this.pages
            .map((p, i) => ({ p, selectValue: i + 1 }))
            .filter(({ p }) => !q || p.name.toLowerCase().includes(q) || p.path.toLowerCase().includes(q));
        const max = this.pages.length + 1;

        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.allTitle}
                    .desc=${this.msg.allDesc}
                    .value=${0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                <button
                    class="
                        self-end text-sm px-2.5 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchSelect(max)}
                >+ ${this.msg.createNew}</button>

                <input
                    type="text"
                    .value=${this._search}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                />

                ${this.pages.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noPages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ p, selectValue }) => this._renderPageCard(p, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this.pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.customTitle}
                    .desc=${this.msg.customDesc}
                    .value=${max}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                <div class="
                    rounded-lg border border-amber-200 dark:border-amber-800/40
                    bg-amber-50 dark:bg-amber-900/10
                    px-3 py-2.5
                ">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.inDevelopment}</span>
                </div>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderPageCard(page: IPage, selectValue: number) {
        return html`
            <div
                class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    hover:bg-gray-100 dark:hover:bg-gray-800/70
                    px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${page.name}</span>
                <span
                    class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                    style="max-width:150px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                >${page.path}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-page', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
