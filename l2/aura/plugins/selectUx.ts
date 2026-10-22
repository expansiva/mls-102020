/// <mls fileReference="_102020_/l2/aura/plugins/selectUx.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { readSourceText } from '/_102035_/l2/solution/fs.js';
import { readStorText } from '/_102020_/l2/agentMaterializeL2/helpers/storText.js';
import { parseL2Page11 } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import {
    buildTemplateOptions,
    countPageTemplates,
    resolveEffectiveTemplate,
    setPageTemplate,
    uxPageKey,
    type IUxExperienceIndex,
    type IUxLayout,
    type IUxTemplateOption,
    type UxLang,
} from '/_102020_/l2/aura/helpers/uxTemplates.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'UX · User Experience',
    allTitle: 'All UX',
    desc: 'A UX is a set of templates, one per page: each page can follow a different experience of its category.',
    pagesWithTemplate: 'pages with template',
    nameHeader: 'Name',
    nameHint: 'Enter saves, Esc cancels.',
    addTitle: 'New UX',
    addDesc: 'Create a new UX. Pick the templates of each page after creating it.',
    namePlaceholder: 'e.g. Ux 2',
    saveUx: 'Create UX',
    adding: 'Creating…',
    saveError: 'Could not save the UX.',
    moleculesHeader: 'Molecules',
    useMoleculesLabel: 'Use molecules',
    useMoleculesDesc: 'Molecules are the ready-made web components pages are built from. When on, the generator picks a molecule per element; when off, pages of this UX get no web components.',
    moleculesOn: 'On',
    moleculesOff: 'Off',
    templatesHeader: 'Template of the page',
    templatesDesc: 'The experience this page follows in this UX. Without a choice, the page keeps the template of its first version (page11).',
    defaultBadge: 'default',
    bestFor: 'Best for',
    backToDefault: 'Back to default',
    loading: 'Loading…',
    noPage: 'Open a page of the module to choose its template.',
    noDefs: 'This page has no page11 definition yet, so there is no category to choose from.',
    bespoke: 'This page is bespoke: it follows no template category.',
    unknownCategory: 'The category of this page is not in the template index.',
    templateMissing: 'The chosen template was not found:',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'UX · User Experience',
        allTitle: 'Todas as UX',
        desc: 'Uma UX é um conjunto de templates, um por página: cada página pode seguir uma experiência diferente da sua categoria.',
        pagesWithTemplate: 'páginas com template',
        nameHeader: 'Nome',
        nameHint: 'Enter grava, Esc cancela.',
        addTitle: 'Nova UX',
        addDesc: 'Crie uma nova UX. Os templates de cada página são escolhidos depois de criá-la.',
        namePlaceholder: 'ex.: Ux 2',
        saveUx: 'Criar UX',
        adding: 'Criando…',
        saveError: 'Não foi possível salvar a UX.',
        moleculesHeader: 'Moléculas',
        useMoleculesLabel: 'Usar moléculas',
        useMoleculesDesc: 'Moléculas são os web components prontos com que as páginas são montadas. Quando ligado, o gerador escolhe uma molécula por elemento; quando desligado, as páginas desta UX não recebem web components.',
        moleculesOn: 'Ligado',
        moleculesOff: 'Desligado',
        templatesHeader: 'Template da página',
        templatesDesc: 'A experiência que esta página segue nesta UX. Sem escolha, a página fica com o template da sua primeira versão (page11).',
        defaultBadge: 'padrão',
        bestFor: 'Melhor para',
        backToDefault: 'Voltar ao padrão',
        loading: 'Carregando…',
        noPage: 'Abra uma página do módulo para escolher o template dela.',
        noDefs: 'Esta página ainda não tem definição no page11, então não há categoria para escolher.',
        bespoke: 'Esta página é bespoke: não segue nenhuma categoria de template.',
        unknownCategory: 'A categoria desta página não está no índice de templates.',
        templateMissing: 'O template escolhido não foi encontrado:',
    },
    es: {
        title: 'UX · User Experience',
        allTitle: 'Todas las UX',
        desc: 'Una UX es un conjunto de templates, uno por página: cada página puede seguir una experiencia distinta de su categoría.',
        pagesWithTemplate: 'páginas con template',
        nameHeader: 'Nombre',
        nameHint: 'Enter guarda, Esc cancela.',
        addTitle: 'Nueva UX',
        addDesc: 'Cree una nueva UX. Los templates de cada página se eligen después de crearla.',
        namePlaceholder: 'ej.: Ux 2',
        saveUx: 'Crear UX',
        adding: 'Creando…',
        saveError: 'No se pudo guardar la UX.',
        moleculesHeader: 'Moléculas',
        useMoleculesLabel: 'Usar moléculas',
        useMoleculesDesc: 'Las moléculas son los web components listos con los que se construyen las páginas. Cuando está activado, el generador elige una molécula por elemento; cuando está desactivado, las páginas de esta UX no reciben web components.',
        moleculesOn: 'Activado',
        moleculesOff: 'Desactivado',
        templatesHeader: 'Template de la página',
        templatesDesc: 'La experiencia que sigue esta página en esta UX. Sin elección, la página mantiene el template de su primera versión (page11).',
        defaultBadge: 'predeterminado',
        bestFor: 'Ideal para',
        backToDefault: 'Volver al predeterminado',
        loading: 'Cargando…',
        noPage: 'Abra una página del módulo para elegir su template.',
        noDefs: 'Esta página aún no tiene definición en page11, así que no hay categoría para elegir.',
        bespoke: 'Esta página es bespoke: no sigue ninguna categoría de template.',
        unknownCategory: 'La categoría de esta página no está en el índice de templates.',
        templateMissing: 'No se encontró el template elegido:',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IUxOption {
    value: number;
    layout: IUxLayout;
}

// experienceIndex.json, read once per session (the same file agentDefsL2 reads categoryList.json from).
// A failed read is not cached, so the next render asks again.
const TEMPLATES_PROJECT = 102020;
let experienceIndexCache: Promise<IUxExperienceIndex | null> | null = null;

function loadExperienceIndex(): Promise<IUxExperienceIndex | null> {
    if (!experienceIndexCache) {
        experienceIndexCache = (async () => {
            try {
                // The templates live in 102020, which the app under preview does not necessarily load.
                await mls.stor.server.loadProjectInfoIfNeeded(TEMPLATES_PROJECT);
            } catch { /* the read below says whether it is there */ }
            const text = await readSourceText({ project: TEMPLATES_PROJECT, level: 4, folder: 'collabux/templates', shortName: 'experienceIndex', extension: '.json' });
            return JSON.parse(text) as IUxExperienceIndex;
        })().catch((error) => {
            console.warn('[selectUx] could not read experienceIndex.json', error);
            experienceIndexCache = null;
            return null;
        });
    }
    return experienceIndexCache;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-ux-102020')
export class PluginSelectUx extends StateLitElement {

    @property({ attribute: false }) value: number | null = 0;
    /** Module and page in context (the l3 page of the genome service); null outside a page. */
    @property({ attribute: false }) module: string | null = null;
    @property({ attribute: false }) page: string | null = null;

    @state() private _uxOptions: IUxOption[] = [];

    // ─── Name editing (selected UX) ───────────────────────────────────
    @state() private _nameDraft: string | null = null;   // null = not editing

    // ─── "+" slot state ───────────────────────────────────────────────
    @state() private _addName: string = '';
    @state() private _addSaving: boolean = false;
    @state() private _addError: string = '';

    // ─── Templates of the current page ────────────────────────────────
    @state() private _index: IUxExperienceIndex | null = null;
    @state() private _page11Template: string | null = null;
    @state() private _templatesLoading: boolean = false;
    private _templatesFor: string = '';     // "<module>/<page>" the template state belongs to

    /** The "+" knob slot value (highest UX index + 1). */
    private get _addValue(): number {
        return this._uxOptions.reduce((m, o) => Math.max(m, o.value), 0) + 1;
    }

    private get _projectId(): number | null {
        return getAuraState().actualProject || mls.actualProject || null;
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    /** Language of the index texts: pt or en (the index has no es). */
    private get _indexLang(): UxLang {
        return this.getMessageKey(messages) === 'pt' ? 'pt' : 'en';
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadProjectConfig();
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value')) this._nameDraft = null;
        const key = this.module && this.page ? uxPageKey(this.module, this.page) : '';
        if (key !== this._templatesFor) void this._loadPageTemplates(key);
    }

    private async _loadProjectConfig(): Promise<void> {
        const project = this._projectId;
        if (!project) return;
        try {
            const config: any = await getConfigProject(project);
            const layoutsMap: Record<string, IUxLayout> = config?.layouts ?? {};
            this._uxOptions = Object.entries(layoutsMap)
                .map(([k, v]) => ({ value: Number(k), layout: v ?? {} }))
                .sort((a, b) => a.value - b.value);
        } catch { /* no project config */ }
        // @ts-ignore
        this.requestUpdate();
    }

    /**
     * The page11 template of the page in context and the index. The page11 defs are always the
     * desktop ones: one template per page serves every device.
     */
    private async _loadPageTemplates(key: string): Promise<void> {
        this._templatesFor = key;
        this._page11Template = null;
        if (!key || !this.module || !this.page) return;
        const project = this._projectId;
        if (!project) return;
        this._templatesLoading = true;
        const [index, page11] = await Promise.all([
            loadExperienceIndex(),
            this._readPage11Template(project, this.module, this.page),
        ]);
        if (key !== this._templatesFor) return; // the page changed while reading
        this._index = index;
        this._page11Template = page11;
        this._templatesLoading = false;
    }

    private async _readPage11Template(project: number, module: string, page: string): Promise<string | null> {
        try {
            const source = await readStorText({ project, level: 2, folder: `${module}/web/desktop/page11`, shortName: page, extension: '.defs.ts' });
            return parseL2Page11(source).definition.template.category || null;
        } catch {
            return null; // no page11 defs (or not in the grammar): the section says so
        }
    }

    createRenderRoot() { return this; }

    render() {
        const addValue = this._addValue;
        const max = addValue;                 // last navigable slot is "+"
        const v = this.value ?? 0;
        const selected = this._uxOptions.find(o => o.value === v);

        if (v === 0) {
            return html`
                <div class="flex flex-col gap-3">
                    ${this._renderHeader(0, max, this.msg.allTitle, this.msg.desc)}
                    <div class="flex flex-col gap-1.5">
                        ${this._uxOptions.map(opt => this._renderUxRow(opt))}
                    </div>
                </div>
            `;
        }

        if (v === addValue) {
            return html`
                <div class="flex flex-col gap-3">
                    ${this._renderHeader(addValue, max, this.msg.addTitle, this.msg.addDesc)}
                    ${this._renderAddForm()}
                </div>
            `;
        }

        if (!selected) return nothing;
        return html`
            <div class="flex flex-col gap-4">
                ${this._renderHeader(v, max, selected.layout.name ?? String(v), this.msg.desc)}
                ${this._renderNameSection(selected)}
                ${this._renderMoleculesSection(selected)}
                ${v >= 2 ? this._renderTemplatesSection(selected) : nothing}
            </div>
        `;
    }

    private _renderHeader(value: number, max: number, itemName: string, desc: string) {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${desc}
                .value=${value}
                .min=${0}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    // ─── Value 0: every UX ────────────────────────────────────────────

    private _renderUxRow(opt: IUxOption) {
        const count = countPageTemplates(opt.layout);
        return html`
            <div
                class="flex items-center justify-between gap-2 rounded-lg border px-3 py-2 cursor-pointer transition-colors
                    border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700"
                @click=${() => this._dispatchSelect(opt.value)}
            >
                <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${opt.layout.name ?? opt.value}</span>
                <span class="text-[10px] text-gray-400 dark:text-gray-500">${count} ${this.msg.pagesWithTemplate}</span>
            </div>
        `;
    }

    // ─── Selected UX: name ────────────────────────────────────────────

    private _renderNameSection(opt: IUxOption) {
        const value = this._nameDraft ?? opt.layout.name ?? '';
        return html`
            <div class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1.5">${this.msg.nameHeader}</span>
                <input
                    type="text"
                    class="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                    .value=${value}
                    @input=${(e: Event) => { this._nameDraft = (e.target as HTMLInputElement).value; }}
                    @keydown=${(e: KeyboardEvent) => this._onNameKeydown(e, opt)}
                />
                <span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.nameHint}</span>
            </div>
        `;
    }

    private _onNameKeydown(e: KeyboardEvent, opt: IUxOption) {
        if (e.key === 'Escape') {
            this._nameDraft = null;
            (e.target as HTMLInputElement).value = opt.layout.name ?? '';
            (e.target as HTMLInputElement).blur();
            return;
        }
        if (e.key !== 'Enter') return;
        const name = (this._nameDraft ?? '').trim();
        if (!name || name === opt.layout.name) { this._nameDraft = null; return; }
        // Only `name` changes: the templates are keyed by page, never by the UX name.
        void this._updateLayout(opt.value, layout => { layout.name = name; }).then(ok => {
            if (!ok) return;
            this._nameDraft = null;
            this.dispatchEvent(new CustomEvent('layout-renamed', { detail: { value: opt.value }, bubbles: true, composed: true }));
        });
    }

    // ─── Selected UX: molecules ───────────────────────────────────────
    // Per-UX "Use molecules" flag, persisted in config.layouts[value].useMolecules (absent = on).

    private _renderMoleculesSection(opt: IUxOption) {
        const on = opt.layout.useMolecules !== false;
        return html`
            <div class="flex flex-col gap-2">
                <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1.5">${this.msg.moleculesHeader}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-snug">${this.msg.useMoleculesDesc}</span>
                <div class="flex items-center gap-2.5 pt-0.5">
                    <button
                        type="button"
                        role="switch"
                        aria-checked=${on}
                        class="relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer
                            ${on ? 'bg-indigo-500 dark:bg-indigo-600' : 'bg-gray-300 dark:bg-gray-700'}"
                        @click=${() => this._updateLayout(opt.value, layout => { layout.useMolecules = !on; })}
                    >
                        <span class="inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}"></span>
                    </button>
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">
                        ${this.msg.useMoleculesLabel}
                        <span class="ml-1 text-[10px] font-semibold ${on ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500'}">
                            · ${on ? this.msg.moleculesOn : this.msg.moleculesOff}
                        </span>
                    </span>
                </div>
            </div>
        `;
    }

    // ─── Selected UX (≥ 2): template of the current page ─────────────
    // UX 1 is page11 itself: its template is the one agentDefsL2 chose, so there is nothing to pick.

    private _renderTemplatesSection(opt: IUxOption) {
        const header = html`
            <span class="text-sm font-semibold text-gray-700 dark:text-gray-200 border-b border-gray-200 dark:border-gray-700 pb-1.5">
                ${this.msg.templatesHeader}${this.page ? html` <span class="font-mono text-xs text-gray-400 dark:text-gray-500">· ${this.page}</span>` : nothing}
            </span>
        `;
        const note = (text: string) => html`<div class="flex flex-col gap-2">${header}<span class="text-xs text-gray-400 dark:text-gray-500 leading-snug">${text}</span></div>`;

        if (!this.module || !this.page) return note(this.msg.noPage);
        if (this._templatesLoading) return note(this.msg.loading);

        const key = uxPageKey(this.module, this.page);
        const { options, reason } = buildTemplateOptions(this._index, this._page11Template, this._indexLang);
        if (reason) return note(this.msg[reason]);

        const effective = resolveEffectiveTemplate(opt.layout, key, this._page11Template, options);
        return html`
            <div class="flex flex-col gap-2">
                ${header}
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-snug">${this.msg.templatesDesc}</span>
                ${effective.missing ? html`
                    <div class="flex flex-col gap-1.5 rounded-md border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-2.5 py-1.5">
                        <span class="text-xs text-amber-600 dark:text-amber-400">${this.msg.templateMissing} <span class="font-mono">${effective.template}</span></span>
                        ${this._renderBackToDefault(opt, key)}
                    </div>
                ` : nothing}
                <div class="flex flex-col gap-2">
                    ${options.map(o => this._renderTemplateCard(opt, key, o, o.template === effective.template))}
                </div>
                ${!effective.isDefault && !effective.missing ? this._renderBackToDefault(opt, key) : nothing}
            </div>
        `;
    }

    private _renderTemplateCard(opt: IUxOption, key: string, option: IUxTemplateOption, isSelected: boolean) {
        return html`
            <div
                class="
                    rounded-xl border p-2.5 transition-all flex flex-col gap-1 cursor-pointer
                    ${isSelected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700'}
                "
                @click=${() => this._onPickTemplate(opt, key, option)}
            >
                <div class="flex items-center gap-1.5">
                    ${isSelected ? html`<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></div>` : nothing}
                    <span class="text-xs font-semibold ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}">${option.label}</span>
                    ${option.isDefault ? html`
                        <span class="text-[10px] px-1.5 rounded-full border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400">${this.msg.defaultBadge}</span>
                    ` : nothing}
                </div>
                <span class="text-[11px] text-gray-500 dark:text-gray-400 leading-snug">${option.description}</span>
                ${option.bestFor ? html`
                    <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug"><span class="font-semibold">${this.msg.bestFor}:</span> ${option.bestFor}</span>
                ` : nothing}
            </div>
        `;
    }

    private _renderBackToDefault(opt: IUxOption, key: string) {
        return html`
            <button
                class="self-start text-xs px-2.5 py-1 rounded border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600 cursor-pointer"
                @click=${() => this._updateLayout(opt.value, layout => setPageTemplate(layout, key, null))}
            >${this.msg.backToDefault}</button>
        `;
    }

    /** Picking the page11 template is "back to default": the entry is deleted, not written. */
    private _onPickTemplate(opt: IUxOption, key: string, option: IUxTemplateOption) {
        void this._updateLayout(opt.value, layout => setPageTemplate(layout, key, option.isDefault ? null : option.template));
    }

    // ─── "+" slot: new UX (name only) ─────────────────────────────────

    private _renderAddForm() {
        const canSave = !!this._addName.trim() && !this._addSaving;
        return html`
            <div class="flex flex-col gap-2">
                <label class="flex flex-col gap-1">
                    <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${this.msg.nameHeader}</span>
                    <input
                        type="text"
                        class="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                        .value=${this._addName}
                        placeholder=${this.msg.namePlaceholder}
                        @input=${(e: Event) => { this._addName = (e.target as HTMLInputElement).value; }}
                        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Enter' && canSave) this._onSaveNewUx(); }}
                    />
                </label>
                <button
                    class="
                        self-start text-sm px-3 py-1.5 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors cursor-pointer
                    "
                    ?disabled=${!canSave}
                    @click=${this._onSaveNewUx}
                >
                    ${this._addSaving ? this.msg.adding : this.msg.saveUx}
                </button>
                ${this._addError ? html`
                    <div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5">
                        <span class="text-xs text-red-600 dark:text-red-400 font-mono">${this._addError}</span>
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private async _onSaveNewUx(): Promise<void> {
        const projectId = this._projectId;
        const name = this._addName.trim();
        if (projectId == null || !name) return;

        this._addSaving = true;
        this._addError = '';
        try {
            const config: any = await getConfigProject(projectId);
            if (!config) throw new Error('project config not found');
            const current = config.layouts;
            const layouts: Record<string, any> = (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
            const newIndex = this._addValue;
            layouts[newIndex] = { name };
            config.layouts = layouts;
            await updateConfigProject(projectId, config);   // local only: saved with the project

            // Refresh and let the host rebuild the knob (new entry + fresh "+" slot) and select it.
            await this._loadProjectConfig();
            this._addName = '';
            this.dispatchEvent(new CustomEvent('layout-created', {
                detail: { value: newIndex },
                bubbles: true,
                composed: true,
            }));
        } catch (err) {
            this._addError = `${this.msg.saveError} ${(err as Error)?.message ?? ''}`.trim();
        } finally {
            this._addSaving = false;
        }
    }

    // ─── Config write ─────────────────────────────────────────────────

    /** Read-modify-write of `config.layouts[value]`, local only (no `save`), then reload. */
    private async _updateLayout(value: number, change: (layout: IUxLayout) => void): Promise<boolean> {
        const projectId = this._projectId;
        if (projectId == null) return false;
        try {
            const config: any = await getConfigProject(projectId);
            const layout = config?.layouts?.[String(value)];
            if (!layout) return false;
            change(layout);
            await updateConfigProject(projectId, config);
            await this._loadProjectConfig();
            return true;
        } catch {
            return false; // leave the UI as-is on failure
        }
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-layout', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
