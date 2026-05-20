/// <mls fileReference="_102020_/l2/plugins/selectLanguage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { languages as allLanguages, ICollabLanguage } from '/_102027_/l2/collabLanguages.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Select Language',
    desc: 'The language defines the locale used for i18n content generation. Each language produces translated variations of the project pages.',
    needsProject: 'Select a project first to see the available languages.',
    allTitle: 'All Languages',
    allDesc: 'Languages configured for this project.',
    customTitle: 'Add Language',
    customDesc: 'Add a new language to this project.',
    noLanguages: 'No languages configured for this project.',
    noResults: 'No languages match your search.',
    searchPlaceholder: 'Search languages…',
    add: 'Add',
    loading: 'Loading languages…',
    createNew: 'Add Language',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Selecionar Idioma',
        desc: 'O idioma define o locale usado para geração de conteúdo i18n. Cada idioma produz variações traduzidas das páginas do projeto.',
        needsProject: 'Selecione um projeto primeiro para ver os idiomas disponíveis.',
        allTitle: 'Todos os Idiomas',
        allDesc: 'Idiomas configurados neste projeto.',
        customTitle: 'Adicionar Idioma',
        customDesc: 'Adicione um novo idioma a este projeto.',
        noLanguages: 'Nenhum idioma configurado neste projeto.',
        noResults: 'Nenhum idioma corresponde à sua busca.',
        searchPlaceholder: 'Buscar idiomas…',
        add: 'Adicionar',
        loading: 'Carregando idiomas…',
        createNew: 'Adicionar Idioma',
    },
    es: {
        title: 'Seleccionar Idioma',
        desc: 'El idioma define el locale para la generación de contenido i18n. Cada idioma produce variaciones traducidas de las páginas del proyecto.',
        needsProject: 'Seleccione un proyecto primero para ver los idiomas disponibles.',
        allTitle: 'Todos los Idiomas',
        allDesc: 'Idiomas configurados en este proyecto.',
        customTitle: 'Agregar Idioma',
        customDesc: 'Agregue un nuevo idioma a este proyecto.',
        noLanguages: 'No hay idiomas configurados en este proyecto.',
        noResults: 'Ningún idioma coincide con su búsqueda.',
        searchPlaceholder: 'Buscar idiomas…',
        add: 'Agregar',
        loading: 'Cargando idiomas…',
        createNew: 'Agregar Idioma',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IProject {
    project: number;
    name: string;
    doSelect: boolean;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-language-102020')
export class PluginSelectLanguage extends StateLitElement {

    @property({ attribute: false }) selectedProject: IProject | null = null;
    @property({ attribute: false }) value: number | null = null;

    @state() private _languages: string[] = [];
    @state() private _loading: boolean = false;
    @state() private _search: string = '';
    @state() private _addSearch: string = '';
    @state() private _addSelected: string = '';
    @state() private _adding: boolean = false;
    @state() private _dropdownOpen: boolean = false;
    @state() config: mls.l5_common.ProjectConfig | undefined;

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('selectedProject')) {
            this._languages = [];
            this._search = '';
            this._addSearch = '';
            this._addSelected = '';
            if (this.selectedProject) this._loadLanguages(this.selectedProject.project);
        }
        if (changed.has('value')) {
            this._search = '';
            this._addSearch = '';
            this._addSelected = '';
            this._dropdownOpen = false;
        }
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean { return this.value === 0; }

    private get _isCustom(): boolean {
        return this.value !== null && this.value > this._languages.length;
    }

    private get _selectedLang(): string | null {
        if (this.value === null || this.value <= 0 || this.value > this._languages.length) return null;
        return this._languages[this.value - 1];
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.selectedProject) return this._renderNeedsProject();
        if (this._loading) return this._renderLoading();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Async ───────────────────────────────────────────────────────

    private async _loadLanguages(projectId: number) {
        this._loading = true;
        this.requestUpdate();
        try {
            this.config = await getConfigProject(projectId);
            this._languages = (this.config as any)?.languages?.map((i: any) => i.language) ?? [];
        } catch {
            this._languages = [];
        }
        this._loading = false;
        this._dispatchConfig();
        this.requestUpdate();
    }

    private async _addLanguage() {
        if (!this._addSelected || !this.selectedProject || !this.config) return;
        this._adding = true;
        this.requestUpdate();
        try {
            const existing: any[] = (this.config as any).languages ?? [];
            const updated = { ...(this.config as any), languages: [...existing, { language: this._addSelected }] };
            await updateConfigProject(this.selectedProject.project, updated);
            this.config = updated as any;
            this._languages = updated.languages.map((i: any) => i.language);
            this._dispatchConfig();
            const newIndex = this._languages.indexOf(this._addSelected);
            if (newIndex >= 0) this._dispatchSelect(newIndex + 1);
        } catch {}
        this._adding = false;
        this.requestUpdate();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNeedsProject() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.msg.title, this.msg.desc)}
                ${this._renderNotice(this.msg.needsProject)}
            </div>
        `;
    }

    private _renderLoading() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.msg.title, this.msg.desc)}
                <span class="text-xs text-gray-400 dark:text-gray-600 italic">${this.msg.loading}</span>
            </div>
        `;
    }

    private _renderSelected() {
        const lang = this._selectedLang!;
        const langObj = (allLanguages as any[]).find(l => l.code === lang);
        const fullName = langObj?.name ?? lang;
        const svg = langObj?.svg ?? '';
        return html`
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${this._renderBackBtn(() => this._dispatchSelect(0))}
                    <span class="text-lg font-semibold text-gray-700 dark:text-gray-200">${this.msg.title}</span>
                </div>
                <div class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    px-3 py-2.5 flex items-center gap-2
                ">
                    <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML(svg)}</div>
                    <span class="text-xs text-gray-700 dark:text-gray-300">${fullName}</span>
                    <span class="
                        ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded
                        bg-emerald-100 dark:bg-emerald-900/30
                        text-emerald-600 dark:text-emerald-400
                        font-semibold uppercase tracking-wider
                    ">${lang}</span>
                </div>
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._languages
            .map((lang, i) => ({ lang, selectValue: i + 1 }))
            .filter(({ lang }) => {
                if (!q) return true;
                const name = (allLanguages as ICollabLanguage[]).find(l => l.code === lang)?.name ?? '';
                return lang.toLowerCase().includes(q) || name.toLowerCase().includes(q);
            });

        return html`
            <div class="flex flex-col gap-3">
                <div class="flex items-start justify-between gap-2">
                    ${this._renderHeader(this.msg.allTitle, this.msg.allDesc)}
                    <button
                        class="
                            shrink-0 text-[10px] px-2.5 py-1 rounded
                            bg-indigo-500 dark:bg-indigo-600 text-white
                            hover:bg-indigo-600 dark:hover:bg-indigo-500
                            transition-colors whitespace-nowrap
                        "
                        @click=${() => this._dispatchSelect(this._languages.length + 1)}
                    >+ ${this.msg.createNew}</button>
                </div>

                <input
                    type="text"
                    .value=${this._search}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-xs px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                />

                ${this._languages.length === 0
                    ? html`<span class="text-[11px] text-gray-400 dark:text-gray-600 italic">${this.msg.noLanguages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-[11px] text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ lang, selectValue }) => this._renderLangCard(lang, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const q = this._addSearch.toLowerCase();
        const alreadyAdded = new Set(this._languages);
        const selectedObj = this._addSelected
            ? (allLanguages as ICollabLanguage[]).find(l => l.code === this._addSelected) ?? null
            : null;
        const filtered = (allLanguages as ICollabLanguage[]).filter(l =>
            !alreadyAdded.has(l.code) &&
            (!q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
        ).slice(0, 80);

        return html`
            <div class="flex flex-col gap-3">
                <div class="flex items-center gap-1.5 flex-wrap">
                    ${this._renderBackBtn(() => this._dispatchSelect(0))}
                    <span class="text-lg font-semibold text-gray-700 dark:text-gray-200">${this.msg.customTitle}</span>
                </div>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">${this.msg.customDesc}</span>

                <input
                    type="text"
                    .value=${this._addSearch}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-xs px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @focus=${() => { this._dropdownOpen = true; }}
                    @blur=${() => { setTimeout(() => { this._dropdownOpen = false; this.requestUpdate(); }, 150); }}
                    @input=${(e: Event) => { this._addSearch = (e.target as HTMLInputElement).value; this._addSelected = ''; this._dropdownOpen = true; }}
                />

                ${this._dropdownOpen ? html`
                    <div class="flex flex-col gap-0.5 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 py-0.5">
                        ${filtered.length === 0
                            ? html`<span class="px-3 py-2 text-[11px] text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                            : filtered.map(l => html`
                                <div
                                    class="
                                        flex items-center gap-2 px-3 py-1.5 cursor-pointer
                                        hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors
                                    "
                                    @mousedown=${(e: Event) => { e.preventDefault(); this._addSelected = l.code; this._addSearch = l.name; this._dropdownOpen = false; }}
                                >
                                    <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML((l as any).svg ?? '')}</div>
                                    <span class="text-xs text-gray-700 dark:text-gray-300">${l.name}</span>
                                    <span class="
                                        ml-auto shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded
                                        bg-gray-100 dark:bg-gray-800
                                        text-gray-500 dark:text-gray-400
                                        uppercase tracking-wider
                                    ">${l.code}</span>
                                </div>
                            `)}
                    </div>
                ` : ''}

                ${selectedObj ? html`
                    <div class="
                        flex items-center gap-2 px-2.5 py-2 rounded-md
                        border border-indigo-200 dark:border-indigo-700
                        bg-indigo-50 dark:bg-indigo-900/10
                    ">
                        <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML((selectedObj as any).svg ?? '')}</div>
                        <span class="flex-1 text-xs text-gray-700 dark:text-gray-300">${selectedObj.name}</span>
                        <span class="
                            shrink-0 text-[10px] font-mono px-1.5 py-0.5 rounded
                            bg-indigo-100 dark:bg-indigo-900/30
                            text-indigo-600 dark:text-indigo-400
                            uppercase tracking-wider
                        ">${selectedObj.code}</span>
                        <button
                            class="shrink-0 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors leading-none"
                            @click=${() => { this._addSelected = ''; this._addSearch = ''; }}
                        >&#x2715;</button>
                    </div>
                ` : ''}

                <button
                    class="
                        self-start text-xs px-3 py-1.5 rounded
                        transition-colors
                        ${!this._addSelected || this._adding
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer'}
                    "
                    ?disabled=${!this._addSelected || this._adding}
                    @click=${() => this._addLanguage()}
                >${this.msg.add}</button>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderHeader(title: string, description: string) {
        return html`
            <div class="flex flex-col gap-1">
                <span class="text-lg font-semibold text-gray-700 dark:text-gray-200">${title}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">${description}</span>
            </div>
        `;
    }

    private _renderNotice(message: string) {
        return html`
            <div class="
                rounded-lg border border-amber-200 dark:border-amber-800/40
                bg-amber-50 dark:bg-amber-900/10
                px-3 py-2.5
            ">
                <span class="text-[11px] text-amber-600 dark:text-amber-400 leading-relaxed">${message}</span>
            </div>
        `;
    }

    private _renderLangCard(lang: string, selectValue: number) {
        const langObj = (allLanguages as any[]).find(l => l.code === lang);
        const fullName = langObj?.name ?? lang;
        const svg = langObj?.svg ?? '';
        return html`
            <div
                class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    px-3 py-2.5 flex items-center gap-2
                    cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800/70 transition-colors
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML(svg)}</div>
                <span class="text-xs text-gray-700 dark:text-gray-300">${fullName}</span>
                <span class="
                    ml-auto text-[10px] font-mono px-1.5 py-0.5 rounded
                    bg-emerald-100 dark:bg-emerald-900/30
                    text-emerald-600 dark:text-emerald-400
                    font-semibold uppercase tracking-wider
                ">${lang}</span>
            </div>
        `;
    }

    private _renderBackBtn(onClick: () => void) {
        return html`
            <button
                class="cursor-pointer p-1 -ml-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors text-gray-400 dark:text-gray-500 hover:text-gray-700 dark:hover:text-gray-200"
                @click=${onClick}
            >
                <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="15 18 9 12 15 6"></polyline>
                </svg>
            </button>
        `;
    }

    private _dispatchConfig() {
        const labels: Record<number, string> = { 0: 'All' };
        this._languages.forEach((lang, i) => { labels[i + 1] = lang; });
        labels[this._languages.length + 1] = '+';
        this.dispatchEvent(new CustomEvent('lang-config', {
            detail: { min: 0, max: this._languages.length + 1, labels },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-language', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
