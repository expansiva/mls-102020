/// <mls fileReference="_102020_/l2/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { IDesignSystemTokens, DsFont } from '/_102029_/l2/designSystemBase.js';
import { readThemes, writeTheme, themeDsIndex } from '/_102020_/l2/dsMatch/buildDesignSystemTs.js';
import '/_102020_/l2/plugins/navHeader.js';

// DESIGN SYSTEM = the entries of `_<project>_/l2/designSystem.ts` — the SINGLE home of
// identity + styling tokens. This plugin edits those entries DIRECTLY (token names are
// free-form; a `_dark-<token>` key is the dark value of `<token>`; `fonts` declares font
// loading). l5/project.json only keeps the per-DS GENERATION config (skill/rules/…),
// correlated by `dsIndex`. The DS knob mirrors the layout knob: 0 = All, dsIndex… = edit,
// last slot = Add.

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Design System',
    desc: 'The design systems of this project — tokens live in designSystem.ts.',
    needsProject: 'Select a project first to see its design systems.',
    allTitle: 'All Design Systems',
    allDesc: 'Design systems found in this project\'s designSystem.ts.',
    addTitle: 'New Design System',
    addDesc: 'Create a design system: name it and edit its tokens.',
    noDs: 'No design systems yet — designSystem.ts has no entries.',
    loading: 'Loading design systems…',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. sunset',
    nameRequired: 'Give the design system a name.',
    descLabel: 'Description',
    descPlaceholder: 'What this design system is for (optional)',
    colorsTitle: 'Colors',
    colorsTag: 'light / dark',
    tokenCol: 'Token',
    valueCol: 'Value',
    light: 'Light',
    dark: 'Dark',
    darkHint: 'empty = no dark value (light is used in both modes)',
    addToken: '+ Add token',
    typographyTitle: 'Typography',
    typographyTag: 'tokens',
    fontsTitle: 'Font loading',
    fontsTag: '@import / @font-face',
    fontsHint: 'Families that must be LOADED (google/custom). The family value itself is a normal typography token.',
    addFont: '+ Add font',
    fontRolePlaceholder: 'role (e.g. display)',
    fontSource: 'Source',
    fontFamily: 'Family',
    fontFamilyPlaceholder: 'Type any Google font…',
    fontFallback: 'Fallback',
    fontWeights: 'Weights',
    fontUrl: 'Font URL',
    fontUrlPlaceholder: 'https://…/font.css',
    fontUrlHint: 'Stylesheet URL (@import) or a font file. External domains must be reachable.',
    globalTitle: 'Global',
    globalTag: 'spacing · misc',
    save: 'Save design system',
    create: 'Create design system',
    saving: 'Saving…',
    saveError: 'Could not save the design system.',
    tokensSuffix: 'tokens',
    defaultNote: 'The default design system (1) uses pure Tailwind for styling — there are no tokens to configure here.',
    defaultBadge: 'Tailwind',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Design System',
        desc: 'Os design systems deste projeto — os tokens moram no designSystem.ts.',
        needsProject: 'Selecione um projeto primeiro para ver os design systems.',
        allTitle: 'Todos os Design Systems',
        allDesc: 'Design systems encontrados no designSystem.ts do projeto.',
        addTitle: 'Novo Design System',
        addDesc: 'Crie um design system: dê um nome e edite os tokens.',
        noDs: 'Nenhum design system ainda — o designSystem.ts não tem entradas.',
        loading: 'Carregando design systems…',
        nameLabel: 'Nome',
        namePlaceholder: 'ex.: sunset',
        nameRequired: 'Dê um nome ao design system.',
        descLabel: 'Descrição',
        descPlaceholder: 'Para que serve este design system (opcional)',
        colorsTitle: 'Cores',
        colorsTag: 'light / dark',
        tokenCol: 'Token',
        valueCol: 'Valor',
        light: 'Light',
        dark: 'Dark',
        darkHint: 'vazio = sem valor dark (o light vale nos dois modos)',
        addToken: '+ Adicionar token',
        typographyTitle: 'Tipografia',
        typographyTag: 'tokens',
        fontsTitle: 'Carregamento de fontes',
        fontsTag: '@import / @font-face',
        fontsHint: 'Famílias que precisam ser CARREGADAS (google/custom). O valor da família é um token normal de tipografia.',
        addFont: '+ Adicionar fonte',
        fontRolePlaceholder: 'papel (ex.: display)',
        fontSource: 'Origem',
        fontFamily: 'Família',
        fontFamilyPlaceholder: 'Digite qualquer fonte do Google…',
        fontFallback: 'Fallback',
        fontWeights: 'Pesos',
        fontUrl: 'URL da fonte',
        fontUrlPlaceholder: 'https://…/font.css',
        fontUrlHint: 'URL de stylesheet (@import) ou arquivo de fonte. O domínio externo precisa estar acessível.',
        globalTitle: 'Global',
        globalTag: 'espaçamento · outros',
        save: 'Salvar design system',
        create: 'Criar design system',
        saving: 'Salvando…',
        saveError: 'Não foi possível salvar o design system.',
        tokensSuffix: 'tokens',
        defaultNote: 'O design system padrão (1) usa Tailwind puro para estilização — não há tokens para configurar aqui.',
        defaultBadge: 'Tailwind',
    },
    es: {
        title: 'Design System',
        desc: 'Los design systems de este proyecto — los tokens viven en designSystem.ts.',
        needsProject: 'Seleccione un proyecto primero para ver sus design systems.',
        allTitle: 'Todos los Design Systems',
        allDesc: 'Design systems encontrados en el designSystem.ts del proyecto.',
        addTitle: 'Nuevo Design System',
        addDesc: 'Cree un design system: póngale nombre y edite sus tokens.',
        noDs: 'Aún no hay design systems — designSystem.ts no tiene entradas.',
        loading: 'Cargando design systems…',
        nameLabel: 'Nombre',
        namePlaceholder: 'ej.: sunset',
        nameRequired: 'Dale un nombre al design system.',
        descLabel: 'Descripción',
        descPlaceholder: 'Para qué sirve este design system (opcional)',
        colorsTitle: 'Colores',
        colorsTag: 'light / dark',
        tokenCol: 'Token',
        valueCol: 'Valor',
        light: 'Light',
        dark: 'Dark',
        darkHint: 'vacío = sin valor dark (light vale en ambos modos)',
        addToken: '+ Agregar token',
        typographyTitle: 'Tipografía',
        typographyTag: 'tokens',
        fontsTitle: 'Carga de fuentes',
        fontsTag: '@import / @font-face',
        fontsHint: 'Familias que deben CARGARSE (google/custom). El valor de la familia es un token normal de tipografía.',
        addFont: '+ Agregar fuente',
        fontRolePlaceholder: 'rol (ej.: display)',
        fontSource: 'Origen',
        fontFamily: 'Familia',
        fontFamilyPlaceholder: 'Escribe cualquier fuente de Google…',
        fontFallback: 'Fallback',
        fontWeights: 'Pesos',
        fontUrl: 'URL de la fuente',
        fontUrlPlaceholder: 'https://…/font.css',
        fontUrlHint: 'URL de stylesheet (@import) o archivo de fuente. El dominio externo debe ser accesible.',
        globalTitle: 'Global',
        globalTag: 'espaciado · otros',
        save: 'Guardar design system',
        create: 'Crear design system',
        saving: 'Guardando…',
        saveError: 'No se pudo guardar el design system.',
        tokensSuffix: 'tokens',
        defaultNote: 'El design system por defecto (1) usa Tailwind puro para estilizar — no hay tokens que configurar aquí.',
        defaultBadge: 'Tailwind',
    },
};
/// **collab_i18n_end**

// ─── Types ────────────────────────────────────────────────────────────

interface IDsEntry { key: number; dsIndex: string; name: string; description: string; skill: string; theme: IDesignSystemTokens; }
interface IColorRow { name: string; light: string; dark: string; }   // dark '' = no dark value
interface IValueRow { name: string; value: string; }

// Per-DS skill slot (generation config, kept in project.json — correlated by dsIndex).
const DS_SKILL_DEFAULT = '_102020_/l2/agentImplementGenome/skills/genCfePageDesignSystem.ts';

const FONT_SOURCES = ['system', 'google', 'custom'];
const GOOGLE_FONTS = [
    'Inter', 'Roboto', 'DM Sans', 'Manrope', 'Work Sans', 'Plus Jakarta Sans', 'Source Sans 3',
    'Space Grotesk', 'Bricolage Grotesque', 'Fraunces', 'Playfair Display', 'Lora', 'Merriweather',
    'JetBrains Mono', 'IBM Plex Mono',
];
const SYSTEM_FONTS = ['system-ui', 'Georgia', 'Times New Roman', 'Arial', 'Helvetica', 'Verdana', 'Courier New'];
const FALLBACKS = ['sans-serif', 'serif', 'monospace'];

// Starter tokens for the Add view — a suggestion, not a vocabulary: every name is editable.
const STARTER: Pick<IDesignSystemTokens, 'color' | 'typography' | 'global'> & { fonts: DsFont[] } = {
    color: {
        'ds-primary': '#3B82F6', '_dark-ds-primary': '#60A5FA',
        'ds-bg': '#FFFFFF', '_dark-ds-bg': '#0B0B0B',
        'ds-surface': '#FFFFFF', '_dark-ds-surface': '#171717',
        'ds-text': '#111111', '_dark-ds-text': '#F5F5F5',
        'ds-border': '#E5E7EB', '_dark-ds-border': '#262626',
    },
    typography: { 'ds-font-display': 'system-ui, sans-serif', 'ds-font-body': 'system-ui, sans-serif' },
    global: { 'ds-radius': '0.375rem', 'ds-border-w': '1px' },
    fonts: [],
};

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-design-system-102020')
export class PluginSelectDesignSystem extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) value: number | null = 0;

    @state() private _entries: IDsEntry[] = [];
    @state() private _loading = false;

    // ── working model (edit + add share it) — mirrors ONE theme entry ──
    @state() private _name = '';
    @state() private _desc = '';
    @state() private _skill = DS_SKILL_DEFAULT;
    @state() private _colors: IColorRow[] = [];
    @state() private _typo: IValueRow[] = [];
    @state() private _global: IValueRow[] = [];
    @state() private _fonts: DsFont[] = [];

    @state() private _editingKey: number | null = null;   // which DS the form is synced to
    @state() private _nameError = false;
    @state() private _saving = false;
    @state() private _saveError = '';

    connectedCallback() {
        super.connectedCallback();
        if (this.projectId) this._load(this.projectId);
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('projectId')) {
            this._entries = [];
            this._editingKey = null;
            if (this.projectId) this._load(this.projectId);
        }
        if (changed.has('value')) this._editingKey = null; // re-sync the form to the new target
        this._syncForm();
    }

    // ── knob math (0=All, dsIndex…=DS, customKey=Add) ─────────────────
    private get _lastKey(): number { return this._entries.length ? this._entries[this._entries.length - 1].key : 0; }
    private get _customKey(): number { return this._lastKey + 1; }
    private get _maxValue(): number { return this._customKey; }
    private get _isAll(): boolean { return (this.value ?? 0) === 0; }
    private get _isAdd(): boolean { return this.value === this._customKey; }
    private get _selectedEntry(): IDsEntry | null {
        if (this.value === null || this.value <= 0) return null;
        return this._entries.find(e => e.key === this.value) ?? null;
    }

    /** The default DS (lowest dsIndex, conventionally "1") styles with pure Tailwind — no tokens. */
    private _isDefaultKey(key: number): boolean {
        if (!this._entries.length) return false;
        return key === Math.min(...this._entries.map(e => e.key));
    }
    private get _isDefaultDs(): boolean {
        const entry = this._selectedEntry;
        return !!entry && this._isDefaultKey(entry.key);
    }

    private get msg(): MessageType { return messages[this.getMessageKey(messages)]; }

    // ── loading (designSystem.ts = identity + tokens; project.json = skill) ──
    private async _load(projectId: number): Promise<void> {
        this._loading = true;
        this.requestUpdate();
        try {
            const themes = await readThemes(projectId);
            const config: any = await getConfigProject(projectId).catch(() => null);
            const dsMap: Record<string, any> = (config?.designSystems && typeof config.designSystems === 'object' && !Array.isArray(config.designSystems))
                ? config.designSystems : {};
            this._entries = themes
                .map((theme, i) => {
                    const dsIndex = themeDsIndex(theme, i);
                    return {
                        key: Number(dsIndex),
                        dsIndex,
                        name: theme.themeName,
                        description: theme.description ?? '',
                        skill: dsMap[dsIndex]?.skill ?? DS_SKILL_DEFAULT,
                        theme,
                    };
                })
                .sort((a, b) => a.key - b.key);
        } catch {
            this._entries = [];
        }
        this._loading = false;
        this.requestUpdate();
    }

    // ── form sync ──────────────────────────────────────────────────────
    private _syncForm(): void {
        if (!this.projectId || this._loading) return;
        if (this._isAdd) {
            if (this._editingKey !== this._customKey) { this._loadStarter(); this._editingKey = this._customKey; }
        } else if (this.value !== null && this.value > 0) {
            const entry = this._selectedEntry;
            if (entry && this._editingKey !== entry.key) { this._loadFromEntry(entry); this._editingKey = entry.key; }
        }
    }

    private _loadStarter(): void {
        this._name = '';
        this._desc = '';
        this._skill = DS_SKILL_DEFAULT;
        this._colors = this._colorRowsFrom(STARTER.color);
        this._typo = this._valueRowsFrom(STARTER.typography);
        this._global = this._valueRowsFrom(STARTER.global);
        this._fonts = [];
        this._nameError = false; this._saveError = ''; this._saving = false;
    }

    private _loadFromEntry(entry: IDsEntry): void {
        const t = entry.theme;
        this._name = entry.name;
        this._desc = entry.description;
        this._skill = entry.skill || DS_SKILL_DEFAULT;
        this._colors = this._colorRowsFrom(t.color ?? {});
        this._typo = this._valueRowsFrom(t.typography ?? {});
        this._global = this._valueRowsFrom(t.global ?? {});
        this._fonts = (t.fonts ?? []).map(f => ({ ...f, weights: f.weights ? [...f.weights] : undefined }));
        this._nameError = false; this._saveError = ''; this._saving = false;
    }

    /** color map → rows, pairing `<token>` + `_dark-<token>` into light/dark columns. */
    private _colorRowsFrom(color: Record<string, string>): IColorRow[] {
        return Object.entries(color)
            .filter(([k]) => !k.startsWith('_dark-'))
            .map(([name, light]) => ({ name, light, dark: color[`_dark-${name}`] ?? '' }));
    }

    private _valueRowsFrom(map: Record<string, string>): IValueRow[] {
        return Object.entries(map).map(([name, value]) => ({ name, value }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.projectId) return this._renderNeedsProject();
        if (this._loading) return this._renderLoading();
        if (this._isAll) return this._renderAll();
        if (this._isAdd) return this._renderAdd();
        return this._renderEdit();
    }

    // ── scenario: ALL ───────────────────────────────────────────────────
    private _renderAll() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(this.msg.allTitle, this.msg.allDesc, 0)}
                ${this._entries.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noDs}</span>`
                    : html`<div class="grid grid-cols-2 gap-2">${this._entries.map(e => this._renderDsCard(e))}</div>`}
                ${this._renderAddCard()}
            </div>
        `;
    }

    private _renderDsCard(entry: IDsEntry) {
        const t = entry.theme;
        const lightColors = Object.entries(t.color ?? {}).filter(([k]) => !k.startsWith('_dark-')).map(([, v]) => v).slice(0, 6);
        const tokenCount = Object.keys(t.color ?? {}).filter(k => !k.startsWith('_dark-')).length
            + Object.keys(t.typography ?? {}).length + Object.keys(t.global ?? {}).length;
        return html`
            <div class="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 flex flex-col gap-2 cursor-pointer transition-colors"
                @click=${() => this._dispatchSelect(entry.key)}>
                <div class="flex items-center gap-1.5 min-w-0">
                    <span class="text-xs font-semibold text-gray-700 dark:text-gray-200 truncate">${entry.name}</span>
                    <span class="ml-auto shrink-0 text-[9px] font-mono px-1 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">ds ${entry.dsIndex}</span>
                </div>
                ${entry.description
                    ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug line-clamp-2">${entry.description}</span>`
                    : nothing}
                <div class="flex h-6 rounded-md overflow-hidden border border-black/5">
                    ${lightColors.length
                        ? lightColors.map(c => html`<span class="flex-1" style="background:${c}"></span>`)
                        : html`<span class="flex-1 bg-gray-100 dark:bg-gray-800"></span>`}
                </div>
                <div class="flex gap-2 flex-wrap text-[10px] text-gray-400 dark:text-gray-500">
                    ${this._isDefaultKey(entry.key)
                        ? html`<span class="font-semibold text-indigo-500 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 rounded px-1.5 py-0.5">${this.msg.defaultBadge}</span>`
                        : html`
                            <span>${tokenCount} ${this.msg.tokensSuffix}</span>
                            ${t.fonts?.length ? html`<span>${t.fonts.length} fonts</span>` : nothing}
                        `}
                </div>
            </div>
        `;
    }

    private _renderAddCard() {
        return html`
            <div class="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-500 p-3 flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 dark:text-gray-500 hover:text-indigo-500 transition-colors min-h-23"
                @click=${() => this._dispatchSelect(this._customKey)}>
                <span class="text-2xl leading-none">+</span>
                <span class="text-xs font-semibold">${this.msg.addTitle}</span>
            </div>
        `;
    }

    // ── scenario: EDIT / ADD ────────────────────────────────────────────
    private _renderEdit() {
        const entry = this._selectedEntry;
        if (!entry) return nothing;
        // Default DS: identity only (name/desc) + a Tailwind notice — no token editor.
        const body = this._isDefaultDs
            ? html`${this._renderDefaultNote()}`
            : html`${this._renderEditor()}`;
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(entry.name, this.msg.desc, this.value ?? 0)}
                ${this._renderNameField()}
                ${this._renderDescField()}
                ${body}
                ${this._renderSave(this.msg.save)}
            </div>
        `;
    }

    private _renderDefaultNote() {
        return html`
            <div class="rounded-md border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-2.5 py-2 flex items-start gap-2">
                <svg class="w-3.5 h-3.5 mt-0.5 shrink-0 text-indigo-500 dark:text-indigo-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
                <span class="text-[11px] text-indigo-700 dark:text-indigo-300 leading-snug">${this.msg.defaultNote}</span>
            </div>
            ${this._saveError ? this._renderSaveError() : nothing}
        `;
    }

    private _renderAdd() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._navHeader(this.msg.addTitle, this.msg.addDesc, this._customKey)}
                ${this._renderNameField()}
                ${this._renderDescField()}
                ${this._renderEditor()}
                ${this._renderSave(this.msg.create)}
            </div>
        `;
    }

    // ── the editor (colors + typography/fonts + global) ────────────────
    private _renderEditor() {
        return html`
            <datalist id="ds-google-fonts">${GOOGLE_FONTS.map(f => html`<option value=${f}></option>`)}</datalist>
            <div class="flex flex-col gap-2.5">
                ${this._renderColorsSection()}
                ${this._renderTypographySection()}
                ${this._renderGlobalSection()}
            </div>
            ${this._saveError ? this._renderSaveError() : nothing}
        `;
    }

    private _renderSaveError() {
        return html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5"><span class="text-[11px] text-red-600 dark:text-red-400">${this._saveError}</span></div>`;
    }

    private _section(title: string, tag: string | null, open: boolean, body: unknown) {
        return html`
            <details class="group rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden" ?open=${open}>
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2.5 flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${title}</span>
                    ${tag ? html`<span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">${tag}</span>` : nothing}
                    <svg class="ml-auto w-3.5 h-3.5 text-gray-400 transition-transform group-open:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                </summary>
                <div class="px-3 pb-3 pt-2 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800/70">${body}</div>
            </details>
        `;
    }

    // colors: token | light | dark (dark may be empty = no _dark- pair)
    private _renderColorsSection() {
        return this._section(this.msg.colorsTitle, this.msg.colorsTag, true, html`
            <div class="grid grid-cols-[1fr_96px_96px_18px] gap-1.5 items-center text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-0.5">
                <span>${this.msg.tokenCol}</span><span>${this.msg.light}</span><span>${this.msg.dark}</span><span></span>
            </div>
            <div class="flex flex-col gap-1.5">
                ${this._colors.map((r, i) => this._renderColorRow(r, i))}
            </div>
            <span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.darkHint}</span>
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                @click=${() => { this._colors = [...this._colors, { name: '', light: '#888888', dark: '' }]; }}>${this.msg.addToken}</button>
        `);
    }

    private _renderColorRow(row: IColorRow, i: number) {
        return html`
            <div class="grid grid-cols-[1fr_96px_96px_18px] gap-1.5 items-center">
                <input class="min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-1.5 py-1.5 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-900 outline-none"
                    .value=${row.name} placeholder="token"
                    @input=${(e: Event) => { row.name = (e.target as HTMLInputElement).value.trim(); }} />
                ${this._colorCell(row, 'light')}
                ${this._colorCell(row, 'dark')}
                <button class="text-gray-400 hover:text-red-500 text-base cursor-pointer rounded h-6 leading-none"
                    @click=${() => { this._colors = this._colors.filter((_, j) => j !== i); }}>×</button>
            </div>
        `;
    }

    // a color cell accepts ANY css value; the picker is a convenience that syncs on valid hex
    private _colorCell(row: IColorRow, variant: 'light' | 'dark') {
        const value = row[variant];
        const isHex = /^#[0-9a-fA-F]{6}$/.test(value);
        return html`
            <div class="flex items-center gap-1 min-w-0 border border-gray-200 dark:border-gray-700 rounded-md px-1 py-1 bg-white dark:bg-gray-900">
                <label class="relative w-4 h-4 rounded border border-black/10 overflow-hidden cursor-pointer shrink-0" style="background:${isHex ? value : 'transparent'}">
                    <input type="color" class="absolute inset-0 opacity-0 cursor-pointer" .value=${isHex ? value : '#888888'}
                        @input=${(e: Event) => { row[variant] = (e.target as HTMLInputElement).value.toUpperCase(); this.requestUpdate(); }} />
                </label>
                <input class="w-full min-w-0 text-[10px]! font-mono text-gray-600 dark:text-gray-400 bg-transparent border-0 outline-none p-0"
                    .value=${value} placeholder=${variant === 'dark' ? '—' : ''}
                    @input=${(e: Event) => { row[variant] = (e.target as HTMLInputElement).value.trim(); }} />
            </div>
        `;
    }

    // typography: value rows + the font-loading cards
    private _renderTypographySection() {
        return this._section(this.msg.typographyTitle, this.msg.typographyTag, false, html`
            ${this._renderValueRows(this._typo, rows => { this._typo = rows; })}
            <div class="border-t border-gray-100 dark:border-gray-800/70 pt-3 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontsTitle}</span>
                    <span class="text-[10px] font-semibold text-gray-400 dark:text-gray-500 bg-gray-100 dark:bg-gray-800 rounded px-1.5 py-0.5">${this.msg.fontsTag}</span>
                </div>
                <p class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this.msg.fontsHint}</p>
                <div class="flex flex-col gap-2">
                    ${this._fonts.map((f, i) => this._renderFontCard(f, i))}
                </div>
                <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                    @click=${() => { this._fonts = [...this._fonts, { name: '', source: 'google', family: '', weights: [400], fallback: 'sans-serif' }]; }}>${this.msg.addFont}</button>
            </div>
        `);
    }

    // global: plain token | value rows
    private _renderGlobalSection() {
        return this._section(this.msg.globalTitle, this.msg.globalTag, false,
            this._renderValueRows(this._global, rows => { this._global = rows; }));
    }

    private _renderValueRows(rows: IValueRow[], commit: (rows: IValueRow[]) => void) {
        return html`
            <div class="grid grid-cols-[1fr_1fr_18px] gap-1.5 items-center text-[9px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500 px-0.5">
                <span>${this.msg.tokenCol}</span><span>${this.msg.valueCol}</span><span></span>
            </div>
            <div class="flex flex-col gap-1.5">
                ${rows.map((r, i) => html`
                    <div class="grid grid-cols-[1fr_1fr_18px] gap-1.5 items-center">
                        <input class="min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 rounded-md px-1.5 py-1.5 border border-transparent focus:border-indigo-400 focus:bg-white dark:focus:bg-gray-900 outline-none"
                            .value=${r.name} placeholder="token"
                            @input=${(e: Event) => { r.name = (e.target as HTMLInputElement).value.trim(); }} />
                        <input class="min-w-0 text-[11px]! font-mono text-gray-600 dark:text-gray-400 rounded-md px-1.5 py-1.5 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 focus:outline-none focus:border-indigo-400"
                            .value=${r.value} placeholder="value"
                            @input=${(e: Event) => { r.value = (e.target as HTMLInputElement).value; }} />
                        <button class="text-gray-400 hover:text-red-500 text-base cursor-pointer rounded h-6 leading-none"
                            @click=${() => { commit(rows.filter((_, j) => j !== i)); }}>×</button>
                    </div>
                `)}
            </div>
            <button class="self-start text-xs font-semibold px-3 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors cursor-pointer"
                @click=${() => { commit([...rows, { name: '', value: '' }]); }}>${this.msg.addToken}</button>
        `;
    }

    private _renderFontCard(font: DsFont, i: number) {
        const source = font.source ?? 'system';
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-2.5 flex flex-col gap-2">
                <div class="flex items-center gap-2">
                    <input class="min-w-0 flex-1 text-[11px]! font-semibold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-800 rounded px-2 py-1 border border-transparent focus:border-indigo-400 outline-none"
                        .value=${font.name} placeholder=${this.msg.fontRolePlaceholder}
                        @input=${(e: Event) => { font.name = (e.target as HTMLInputElement).value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-'); }} />
                    <button class="text-gray-400 hover:text-red-500 text-base leading-none cursor-pointer"
                        @click=${() => { this._fonts = this._fonts.filter((_, j) => j !== i); }}>×</button>
                </div>

                ${this._renderSegField(this.msg.fontSource, FONT_SOURCES, source, v => { font.source = v as DsFont['source']; this.requestUpdate(); })}

                <div class="grid grid-cols-2 gap-2">
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFamily}</label>
                        ${source === 'system'
                            ? this._renderInlineSelect(SYSTEM_FONTS, font.family, v => { font.family = v; this.requestUpdate(); })
                            : html`<input class="min-w-0 text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                                list=${source === 'google' ? 'ds-google-fonts' : nothing}
                                .value=${font.family} placeholder=${this.msg.fontFamilyPlaceholder}
                                @input=${(e: Event) => { font.family = (e.target as HTMLInputElement).value; this.requestUpdate(); }} />`}
                    </div>
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontFallback}</label>
                        ${this._renderInlineSelect(FALLBACKS, font.fallback ?? 'sans-serif', v => { font.fallback = v; this.requestUpdate(); })}
                    </div>
                </div>

                ${source !== 'system' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontWeights}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                            .value=${(font.weights ?? []).join(', ')} placeholder="400, 600, 700"
                            @change=${(e: Event) => { font.weights = this._parseWeights((e.target as HTMLInputElement).value); }} />
                    </div>` : nothing}

                ${source === 'custom' ? html`
                    <div class="flex flex-col gap-1">
                        <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${this.msg.fontUrl}</label>
                        <input class="text-[11px]! px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400 font-mono"
                            .value=${font.url ?? ''} placeholder=${this.msg.fontUrlPlaceholder}
                            @input=${(e: Event) => { font.url = (e.target as HTMLInputElement).value.trim() || undefined; }} />
                        <span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${this.msg.fontUrlHint}</span>
                    </div>` : nothing}
            </div>
        `;
    }

    private _renderInlineSelect(options: string[], current: string | undefined, onPick: (v: string) => void) {
        return html`
            <select class="min-w-0 text-[11px]! px-1.5 py-1.5 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none focus:border-indigo-400"
                @change=${(e: Event) => onPick((e.target as HTMLSelectElement).value)}>
                ${options.map(o => html`<option ?selected=${o === current}>${o}</option>`)}
            </select>
        `;
    }

    private _renderSegField(label: string, options: string[], current: string, onPick: (v: string) => void) {
        return html`
            <div class="flex flex-col gap-1.5">
                <label class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${label}</label>
                <div class="flex gap-1 p-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900">
                    ${options.map(o => html`
                        <button class="flex-1 text-[11px] font-semibold capitalize px-1.5 py-1 rounded transition-colors cursor-pointer
                            ${o === current ? 'bg-indigo-500 text-white' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}"
                            @click=${() => onPick(o)}>${o}</button>
                    `)}
                </div>
            </div>
        `;
    }

    private _parseWeights(raw: string): number[] {
        return raw.split(/[,\s]+/).map(s => parseInt(s, 10)).filter(n => Number.isFinite(n) && n > 0);
    }

    // ── name + save ─────────────────────────────────────────────────────
    private _renderNameField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.nameLabel}</label>
                <input type="text"
                    class="w-full text-[11px]! px-2.5 py-1.5 rounded-md border bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400
                        ${this._nameError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}"
                    placeholder=${this.msg.namePlaceholder} .value=${this._name}
                    @input=${(e: Event) => { this._name = (e.target as HTMLInputElement).value; this._nameError = false; }} />
                ${this._nameError ? html`<span class="text-[11px] text-red-500 dark:text-red-400">${this.msg.nameRequired}</span>` : nothing}
            </div>
        `;
    }

    private _renderDescField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-[11px] font-semibold text-gray-600 dark:text-gray-300">${this.msg.descLabel}</label>
                <textarea rows="2"
                    class="w-full text-[11px]! px-2.5 py-1.5 rounded-md resize-y border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400"
                    placeholder=${this.msg.descPlaceholder} .value=${this._desc}
                    @input=${(e: Event) => { this._desc = (e.target as HTMLTextAreaElement).value; }}></textarea>
            </div>
        `;
    }

    private _renderSave(label: string) {
        return html`
            <button class="self-start mt-1 text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                ?disabled=${this._saving} @click=${() => this._onSave()}>${this._saving ? this.msg.saving : label}</button>
        `;
    }

    // ── persistence ─────────────────────────────────────────────────────
    /** The form rows, back as ONE theme entry (exactly what will live in designSystem.ts). */
    private _buildTheme(dsIndex: string, name: string, description: string): IDesignSystemTokens {
        // Default DS styles with pure Tailwind — persist identity only, never any tokens.
        if (this._isDefaultDs) return { themeName: name, description, color: {}, typography: {}, global: {}, dsIndex };
        // Two passes so the entry lists ALL light tokens first, then ALL `_dark-` tokens —
        // not interleaved light/dark/light/dark (matches the canonical entry shape + getCssVars).
        const color: Record<string, string> = {};
        for (const r of this._colors) {
            const n = r.name.trim();
            if (n) color[n] = r.light;
        }
        for (const r of this._colors) {
            const n = r.name.trim();
            if (n && r.dark.trim()) color[`_dark-${n}`] = r.dark.trim();
        }
        const typography: Record<string, string> = {};
        for (const r of this._typo) if (r.name.trim()) typography[r.name.trim()] = r.value;
        const global: Record<string, string> = {};
        for (const r of this._global) if (r.name.trim()) global[r.name.trim()] = r.value;

        const fonts: DsFont[] = this._fonts
            .filter(f => f.name.trim() && f.family.trim())
            .map(f => {
                const out: DsFont = { name: f.name.trim(), source: f.source ?? 'system', family: f.family.trim() };
                if (f.fallback) out.fallback = f.fallback;
                if (f.source !== 'system' && f.weights?.length) out.weights = [...f.weights];
                if (f.source === 'custom' && f.url) out.url = f.url;
                if (f.source === 'custom' && f.faces?.length) out.faces = f.faces;
                return out;
            });

        const theme: IDesignSystemTokens = { themeName: name, description, color, typography, global, dsIndex };
        if (fonts.length) theme.fonts = fonts;
        // Carry forward the reconciliation agent's field: it is NOT edited by this form, but
        // writeTheme replaces the whole entry — omitting it here would wipe it on every save.
        const recon = this._selectedEntry?.theme?.tokenReconciliation;
        if (recon) theme.tokenReconciliation = recon;
        return theme;
    }

    private async _onSave(): Promise<void> {
        const name = this._name.trim();
        if (!name) { this._nameError = true; return; }
        if (!this.projectId || this._saving) return;

        const isNew = this._isAdd;
        const dsIndex = isNew ? String(this._customKey) : (this._selectedEntry?.dsIndex ?? String(this._customKey));
        const key = Number(dsIndex);

        this._saving = true;
        this._saveError = '';
        try {
            // designSystem.ts — identity + tokens (the single home), matched by dsIndex.
            await writeTheme(this.projectId, this._buildTheme(dsIndex, name, this._desc.trim()));
            // project.json — only the generation config bucket for this dsIndex.
            await this._persistConfig(this.projectId, dsIndex, this._skill || DS_SKILL_DEFAULT);
        } catch (err) {
            console.error('[selectDesignSystem] save failed', err);
            this._saveError = this.msg.saveError;
            this._saving = false;
            return;
        }

        await this._load(this.projectId);
        this._saving = false;

        if (isNew) {
            // Notify the host so it rebuilds the DS knob (new entry + fresh "+" slot) and selects it.
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('ds-created', { detail: { value: key }, bubbles: true, composed: true }));
        } else {
            this._editingKey = key;
            this.dispatchEvent(new CustomEvent('save-ds', { detail: { key, isNew, name }, bubbles: true, composed: true }));
        }
    }

    /** project.json designSystems[dsIndex] = GENERATION config only (no identity, no tokens). */
    private async _persistConfig(projectId: number, dsIndex: string, skill: string): Promise<void> {
        const config: any = await getConfigProject(projectId);
        if (!config) throw new Error('project config not found');
        const current = config.designSystems;
        const designSystems: Record<string, any> =
            (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
        const existing = designSystems[dsIndex] ?? {};
        const entry: Record<string, any> = { ...existing, skill };
        delete entry.name;
        delete entry.description;
        delete entry.tokens;
        delete entry.styleHints;
        designSystems[dsIndex] = entry;
        config.designSystems = designSystems;
        await updateConfigProject(projectId, config);
    }

    // ── shared chrome ───────────────────────────────────────────────────
    private _navHeader(itemName: string, desc: string, value: number) {
        return html`
            <plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${desc}
                .value=${value}
                .min=${0}
                .max=${this._maxValue}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></plugins--nav-header-102020>
        `;
    }

    private _renderNeedsProject() {
        return html`<div class="flex flex-col gap-3">${this._renderHeader(this.msg.title, this.msg.desc)}${this._renderNotice(this.msg.needsProject)}</div>`;
    }

    private _renderLoading() {
        return html`<div class="flex flex-col gap-3">${this._renderHeader(this.msg.title, this.msg.desc)}<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.loading}</span></div>`;
    }

    private _renderHeader(title: string, description: string) {
        return html`
            <div class="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
                <span class="text-base font-semibold text-gray-700 dark:text-gray-200 text-center">${title}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-center">${description}</span>
            </div>
        `;
    }

    private _renderNotice(text: string) {
        return html`<div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5"><span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${text}</span></div>`;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-ds', { detail: { value }, bubbles: true, composed: true }));
    }
}
