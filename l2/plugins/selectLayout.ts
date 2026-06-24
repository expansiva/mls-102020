/// <mls fileReference="_102020_/l2/plugins/selectLayout.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getAuraState } from '/_102020_/l2/auraState.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import '/_102020_/l2/plugins/navHeader.js';
import '/_102020_/l2/plugins/selectLayoutRules.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Layout',
    allTitle: 'All Layouts',
    desc: 'The layout defines the structural arrangement of UI elements on the page.',
    standard: 'Standard',
    standardDesc: 'Classic top-header with full-width content area.',
    compact: 'Compact',
    compactDesc: 'Condensed layout optimized for dense information display.',
    tabs: 'Tabs',
    tabsDesc: 'Tab-based navigation separating content into distinct sections.',
    sidebar: 'Sidebar',
    sidebarDesc: 'Persistent side navigation alongside a main content area.',
    bento: 'Bento Grids',
    bentoDesc: 'Mosaic-style grid of cards with variable sizes and positions.',
    notCreated: 'Layout not yet created for page',
    addLayout: 'Add Layout',
    adding: 'Adding…',
    addTitle: 'New Layout',
    addDesc: 'Create a new layout: pick a base skill (or custom) and configure its component rules.',
    chooseSkill: 'Layout skill',
    custom: 'Custom',
    nameLabel: 'Name',
    skillLabel: 'Skill path',
    namePlaceholder: 'e.g. compactSidebar',
    skillPlaceholder: '_102020_/l2/skills/layout/…',
    saveLayout: 'Save layout',
    saveError: 'Could not save the layout.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Layout',
        allTitle: 'Todos os Layouts',
        desc: 'O layout define o arranjo estrutural dos elementos na página.',
        standard: 'Padrão',
        standardDesc: 'Cabeçalho superior com área de conteúdo em largura total.',
        compact: 'Compacto',
        compactDesc: 'Layout condensado otimizado para exibição densa de informações.',
        tabs: 'Abas',
        tabsDesc: 'Navegação por abas que separa o conteúdo em seções distintas.',
        sidebar: 'Barra Lateral',
        sidebarDesc: 'Navegação lateral persistente ao lado de uma área de conteúdo principal.',
        bento: 'Bento Grids',
        bentoDesc: 'Grade mosaico de cards com tamanhos e posições variáveis.',
        notCreated: 'Layout ainda não criado para a página',
        addLayout: 'Adicionar Layout',
        adding: 'Adicionando…',
        addTitle: 'Novo Layout',
        addDesc: 'Crie um novo layout: escolha uma skill base (ou custom) e configure as rules de componentes.',
        chooseSkill: 'Skill do layout',
        custom: 'Custom',
        nameLabel: 'Nome',
        skillLabel: 'Caminho da skill',
        namePlaceholder: 'ex.: compactSidebar',
        skillPlaceholder: '_102020_/l2/skills/layout/…',
        saveLayout: 'Salvar layout',
        saveError: 'Não foi possível salvar o layout.',
    },
    es: {
        title: 'Layout',
        allTitle: 'Todos los Layouts',
        desc: 'El layout define la disposición estructural de los elementos en la página.',
        standard: 'Estándar',
        standardDesc: 'Cabecera superior con área de contenido de ancho completo.',
        compact: 'Compacto',
        compactDesc: 'Layout condensado optimizado para mostrar información densa.',
        tabs: 'Pestañas',
        tabsDesc: 'Navegación por pestañas que separa el contenido en secciones distintas.',
        sidebar: 'Barra Lateral',
        sidebarDesc: 'Navegación lateral persistente junto a un área de contenido principal.',
        bento: 'Bento Grids',
        bentoDesc: 'Cuadrícula mosaico de tarjetas con tamaños y posiciones variables.',
        notCreated: 'Layout aún no creado para la página',
        addLayout: 'Agregar Layout',
        adding: 'Agregando…',
        addTitle: 'Nuevo Layout',
        addDesc: 'Cree un nuevo layout: elija una skill base (o custom) y configure sus reglas de componentes.',
        chooseSkill: 'Skill del layout',
        custom: 'Custom',
        nameLabel: 'Nombre',
        skillLabel: 'Ruta de la skill',
        namePlaceholder: 'ej.: compactSidebar',
        skillPlaceholder: '_102020_/l2/skills/layout/…',
        saveLayout: 'Guardar layout',
        saveError: 'No se pudo guardar el layout.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface ILayoutOption {
    value: number;
    name: string;
    skill: string;
    enabled: boolean;
}

// Presets for the "Add layout" form: each sets the layout name + its render skill.
const LAYOUT_PRESETS: { name: string; skill: string }[] = [
    { name: 'standard', skill: '_102020_/l2/agentMaterializeSolution/skills/genPageRender.ts' },
    { name: 'compact',  skill: '_102020_/l2/skills/layout/compact.ts' },
    { name: 'sidebar',  skill: '_102020_/l2/skills/layout/sidebar.ts' },
    { name: 'tabs',     skill: '_102020_/l2/skills/layout/tabs.ts' },
    { name: 'bento',    skill: '_102020_/l2/skills/layout/bento.ts' },
];

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-layout-102020')
export class PluginSelectLayout extends StateLitElement {

    @property({ attribute: false }) value: number | null = 0;
    @property({ attribute: false }) pageFile: mls.stor.IFileInfo | null = null;

    @state() private _layoutOptions: ILayoutOption[] = [];
    @state() private _designSystems: Record<number, { name: string; skill: string }> = {};
    @state() private _saving: boolean = false;
    @state() private _saveError: string = '';

    // ─── "Add layout" form state ──────────────────────────────────────
    @state() private _addPreset: string | null = null;   // preset name | 'custom' | null
    @state() private _addName: string = '';
    @state() private _addSkill: string = '';
    @state() private _addRules: Record<string, string> = {};
    @state() private _addSaving: boolean = false;
    @state() private _addError: string = '';

    /** The "+ Add layout" knob slot value (highest layout index + 1). */
    private get _addValue(): number {
        return this._layoutOptions.reduce((m, o) => Math.max(m, o.value), 0) + 1;
    }

    connectedCallback() {
        super.connectedCallback();
        this._loadProjectConfig();
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('pageFile')) {
            this._loadGenome();
        }
    }

    private async _loadProjectConfig(): Promise<void> {
        const project = getAuraState().actualProject;
        if (!project) return;
        try {
            const config: any = await getConfigProject(project);
            const layoutsMap: Record<number, { name: string; skill: string }> = config?.layouts ?? {};
            this._layoutOptions = Object.entries(layoutsMap)
                .map(([k, v]) => ({ value: Number(k), name: v.name, skill: v.skill, enabled: false }))
                .sort((a, b) => a.value - b.value);
            this._designSystems = config?.designSystems ?? {};
        } catch { /* no project config */ }
        // @ts-ignore
        this.requestUpdate();
    }

    private async _loadGenome(): Promise<void> {

        this._layoutOptions = this._layoutOptions.map(o => ({ ...o, enabled: false }));
        if (!this.pageFile) return;

        if (!this._layoutOptions.length) await this._loadProjectConfig();

        const project = getAuraState().actualProject;
        const modulePrefix = getAuraState().actualModule ?? '';
        if (!project || !modulePrefix) return;

        const folder = this.pageFile.folder ?? '';
        const genomeKey = folder.substring(modulePrefix.length + 1); // e.g. "web/desktop/page11"
        if (!genomeKey) return;

        const parts = genomeKey.split('/');
        const pageSeg = parts[parts.length - 1];        // "page11"
        const dsDigit = pageSeg.replace(/^page\d/, ''); // DS digit(s), e.g. "1"
        const deviceParts = parts.slice(0, -1);         // ["web","desktop"]
        const shortName = this.pageFile.shortName;

        // A layout is "created" for this page when its page<layout><ds> variation
        // file exists in the stor.
        const checked = await Promise.all(this._layoutOptions.map(async (o) => {
            const variation = `page${o.value}${dsDigit}`;
            const varFolder = [modulePrefix, ...deviceParts, variation].join('/');
            const storFiles = await mls.stor.getFiles({ project, shortName, folder: varFolder, loadContent: false });
            return { ...o, enabled: !!storFiles.ts };
        }));
        this._layoutOptions = checked;

        // @ts-ignore
        this.requestUpdate();
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private _getLayoutLabel(name: string): string {
        return (this.msg[name as keyof MessageType] as string) ?? name;
    }

    private _getLayoutDesc(name: string): string {
        return (this.msg[`${name}Desc` as keyof MessageType] as string) ?? '';
    }

    createRenderRoot() { return this; }

    render() {
        const addValue = this._addValue;
        const max = addValue;                 // last navigable slot is "+ Add layout"
        const v = this.value ?? 0;
        const isAll = v === 0;
        const isAdd = v === addValue;
        const selectedOption = this._layoutOptions.find(o => o.value === v);

        if (isAll) {
            return html`
                <div class="flex flex-col gap-3">
                    <plugins--nav-header-102020
                        .fixedLabel=${this.msg.title}
                        .itemName=${this.msg.allTitle}
                        .desc=${this.msg.desc}
                        .value=${0}
                        .min=${0}
                        .max=${max}
                        @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                    ></plugins--nav-header-102020>

                    <div class="grid grid-cols-2 gap-2">
                        ${this._layoutOptions.map(opt => this._renderLayoutCard(opt, false))}
                    </div>
                </div>
            `;
        }

        if (isAdd) {
            return html`
                <div class="flex flex-col gap-3">
                    <plugins--nav-header-102020
                        .fixedLabel=${this.msg.title}
                        .itemName=${this.msg.addTitle}
                        .desc=${this.msg.addDesc}
                        .value=${addValue}
                        .min=${0}
                        .max=${max}
                        @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                    ></plugins--nav-header-102020>
                    ${this._renderAddForm()}
                </div>
            `;
        }

        if (!selectedOption) return nothing;
        const isConfigured = selectedOption.enabled;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this._getLayoutLabel(selectedOption.name)}
                    .desc=${this.msg.desc}
                    .value=${v}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>

                ${isConfigured
                    ? this._renderLayoutCard(selectedOption, true)
                    : this._renderNotCreatedBanner(selectedOption)}
            </div>
        `;
    }

    private _isConfiguredLayout(opt: ILayoutOption): boolean {
        return opt.enabled;
    }

    private _renderLayoutCard(opt: ILayoutOption, isSelected: boolean) {
        const hasLayout = this._isConfiguredLayout(opt);
        const label = this._getLayoutLabel(opt.name);
        const desc = this._getLayoutDesc(opt.name);
        const pageName = this.pageFile?.shortName ?? '';

        return html`
            <div
                class="
                    rounded-xl border p-2.5 transition-all flex flex-col gap-2
                    ${isSelected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm cursor-pointer'
                        : hasLayout
                            ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer'
                            : 'border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-900/50 cursor-default'}
                "
                @click=${() => hasLayout ? this._dispatchSelect(opt.value) : undefined}
            >
                <div class="w-full aspect-[4/3] rounded-lg overflow-hidden ${hasLayout ? '' : 'opacity-40'}
                    ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'}
                ">
                    ${this._renderDiagram(opt.name, isSelected)}
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-1.5">
                        ${isSelected ? html`<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></div>` : nothing}
                        <span class="text-xs font-semibold ${hasLayout ? '' : 'opacity-50'}
                            ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}
                        ">${label}</span>
                    </div>
                    ${hasLayout
                        ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${desc}</span>`
                        : html`<span class="text-[10px] text-amber-500 dark:text-amber-400 leading-snug italic">${this.msg.notCreated} ${pageName}</span>`
                    }
                </div>
            </div>
        `;
    }

    private _renderNotCreatedBanner(opt: ILayoutOption) {
        const pageName = this.pageFile?.shortName ?? '';
        const label = this._getLayoutLabel(opt.name);
        return html`
            <div class="flex flex-col gap-2">
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.notCreated} ${pageName}</span>
                </div>
                <button
                    class="
                        self-start text-sm px-3 py-1.5 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        disabled:opacity-50 disabled:cursor-not-allowed
                        transition-colors cursor-pointer
                    "
                    ?disabled=${this._saving}
                    @click=${() => this._addLayoutToGenome(opt)}
                >
                    ${this._saving ? this.msg.adding : `+ ${this.msg.addLayout} (${label})`}
                </button>
                ${this._saveError ? html`
                    <div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5">
                        <span class="text-xs text-red-600 dark:text-red-400 font-mono">${this._saveError}</span>
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _renderDiagram(name: string, selected: boolean) {
        const header  = selected ? '#818cf8' : '#9ca3af';
        const content = selected ? '#c7d2fe' : '#e5e7eb';
        const sidebar = selected ? '#a5b4fc' : '#d1d5db';
        const darkHeader  = selected ? '#4f46e5' : '#4b5563';
        const darkContent = selected ? '#3730a3' : '#374151';
        const darkSidebar = selected ? '#4338ca' : '#374151';

        if (name === 'standard') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="72" height="12" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="72" height="12" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="4" y="20" width="72" height="36" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="20" width="72" height="36" rx="2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        if (name === 'compact') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="72" height="8" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="72" height="8" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="4" y="15" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="15" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="24" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="24" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="33" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="33" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="42" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="42" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        if (name === 'tabs') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="16" height="12" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="16" height="12" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="22" y="4" width="16" height="12" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="22" y="4" width="16" height="12" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="40" y="4" width="16" height="12" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="40" y="4" width="16" height="12" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="12" width="72" height="44" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="12" width="72" height="44" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="12" width="16" height="4" rx="0" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="12" width="16" height="4" rx="0" fill="${darkHeader}" class="hidden dark:block"/>
            </svg>`;

        if (name === 'sidebar') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="18" height="52" rx="2" fill="${sidebar}" class="dark:hidden"/>
                <rect x="4" y="4" width="18" height="52" rx="2" fill="${darkSidebar}" class="hidden dark:block"/>
                <rect x="26" y="4" width="50" height="52" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="26" y="4" width="50" height="52" rx="2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        if (name === 'bento') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4"  width="44" height="26" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="4"  width="44" height="26" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="52" y="4" width="24" height="12" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="52" y="4" width="24" height="12" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="52" y="18" width="24" height="12" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="52" y="18" width="24" height="12" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="34"  width="24" height="22" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="34"  width="24" height="22" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="32" y="34" width="44" height="22" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="32" y="34" width="44" height="22" rx="2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="72" height="52" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="4" width="72" height="52" rx="2" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="16" y="20" width="48" height="4" rx="1" fill="${header}" class="dark:hidden"/>
                <rect x="16" y="20" width="48" height="4" rx="1" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="24" y="28" width="32" height="4" rx="1" fill="${header}" class="dark:hidden"/>
                <rect x="24" y="28" width="32" height="4" rx="1" fill="${darkHeader}" class="hidden dark:block"/>
            </svg>`;
    }

    private async _addLayoutToGenome(opt: ILayoutOption): Promise<void> {
        this._saving = true;
        this._saveError = '';

        try {
            const modulePrefix = getAuraState().actualModule ?? '';
            if (!modulePrefix || !this.pageFile) return;

            const folder = this.pageFile.folder ?? '';
            const genomeKey = folder.substring(modulePrefix.length + 1);
            if (!genomeKey) return;

            const parts = genomeKey.split('/');
            const currentPage = parts[2] ?? '';
            const dsDigit = currentPage.replace(/^page\d/, '');
            const newPage = `page${opt.value}${dsDigit}`;
            const newGenomeKey = [...parts.slice(0, 2), newPage].join('/');

            const actualDsKey = getAuraState().actualDesignSystem;
            const ds = actualDsKey !== null ? this._designSystems[actualDsKey] : null;

            const genomeValue = {
                designSystem: ds?.name ?? 'default',
                device: getAuraState().actualDevice ?? 'web/desktop',
                layout: opt.name,
            };

            console.log('[selectLayout] genome key   :', newGenomeKey);
            console.log('[selectLayout] genome value :', genomeValue);
        } finally {
            this._saving = false;
        }
    }

    // ─── "Add layout" form ────────────────────────────────────────────

    private _renderAddForm() {
        const projectId = getAuraState().actualProject;
        const isCustom = this._addPreset === 'custom';
        const hasChoice = this._addPreset != null;
        const canSave = !!this._addName.trim() && !!this._addSkill.trim() && !this._addSaving;

        return html`
            <div class="flex flex-col gap-4">
                <!-- Skill preset picker -->
                <div class="flex flex-col gap-1.5">
                    <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.chooseSkill}</span>
                    <div class="flex flex-wrap gap-1.5">
                        ${LAYOUT_PRESETS.map(p => this._renderPresetChip(p.name, p.skill, this._getLayoutLabel(p.name)))}
                        ${this._renderPresetChip('custom', '', this.msg.custom)}
                    </div>
                </div>

                <!-- Name + skill path (editable in custom; shown read-only-ish for presets) -->
                ${hasChoice ? html`
                    <div class="flex flex-col gap-2">
                        <label class="flex flex-col gap-1">
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${this.msg.nameLabel}</span>
                            <input
                                type="text"
                                class="text-sm px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100"
                                .value=${this._addName}
                                placeholder=${this.msg.namePlaceholder}
                                ?readonly=${!isCustom}
                                @input=${(e: Event) => { this._addName = (e.target as HTMLInputElement).value; }}
                            />
                        </label>
                        <label class="flex flex-col gap-1">
                            <span class="text-xs font-medium text-gray-500 dark:text-gray-400">${this.msg.skillLabel}</span>
                            <input
                                type="text"
                                class="text-xs px-2 py-1 rounded border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 font-mono"
                                .value=${this._addSkill}
                                placeholder=${this.msg.skillPlaceholder}
                                ?readonly=${!isCustom}
                                @input=${(e: Event) => { this._addSkill = (e.target as HTMLInputElement).value; }}
                            />
                        </label>
                    </div>
                ` : nothing}

                <!-- Component rules editor (draft mode) -->
                ${hasChoice && projectId != null ? html`
                    <plugins--select-layout-rules-102020
                        .projectId=${projectId}
                        .draft=${true}
                        .initialRules=${this._addRules}
                        @rules-changed=${this._onAddRulesChanged}
                    ></plugins--select-layout-rules-102020>
                ` : nothing}

                <!-- Save -->
                ${hasChoice ? html`
                    <div class="flex flex-col gap-2">
                        <button
                            class="
                                self-start text-sm px-3 py-1.5 rounded
                                bg-indigo-500 dark:bg-indigo-600 text-white
                                hover:bg-indigo-600 dark:hover:bg-indigo-500
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors cursor-pointer
                            "
                            ?disabled=${!canSave}
                            @click=${this._onSaveNewLayout}
                        >
                            ${this._addSaving ? this.msg.adding : this.msg.saveLayout}
                        </button>
                        ${this._addError ? html`
                            <div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5">
                                <span class="text-xs text-red-600 dark:text-red-400 font-mono">${this._addError}</span>
                            </div>
                        ` : nothing}
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _renderPresetChip(name: string, skill: string, label: string) {
        const active = this._addPreset === name;
        return html`
            <button
                class="
                    text-xs px-2.5 py-1 rounded-full border transition-colors cursor-pointer
                    ${active
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-300'
                        : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'}
                "
                @click=${() => this._selectPreset(name, skill)}
            >${label}</button>
        `;
    }

    private _selectPreset(name: string, skill: string) {
        this._addPreset = name;
        this._addError = '';
        if (name === 'custom') {
            this._addName = '';
            this._addSkill = '';
        } else {
            this._addName = name;
            this._addSkill = skill;
        }
    }

    private _onAddRulesChanged(e: CustomEvent) {
        this._addRules = { ...(e.detail?.rules ?? {}) };
    }

    private async _onSaveNewLayout(): Promise<void> {
        const projectId = getAuraState().actualProject;
        if (projectId == null) return;

        const name = this._addName.trim();
        const skill = this._addSkill.trim();
        if (!name || !skill) return;

        this._addSaving = true;
        this._addError = '';
        try {
            const config: any = await getConfigProject(projectId);
            if (!config) throw new Error('project config not found');

            const current = config.layouts;
            const layouts: Record<string, any> = (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
            const newIndex = this._addValue;
            layouts[newIndex] = { name, skill, rules: { ...this._addRules } };
            config.layouts = layouts;
            await updateConfigProject(projectId, config);

            // Refresh options and notify the host so it rebuilds the layout knob
            // (new entry + fresh "+ Add" slot) and selects the freshly created layout.
            await this._loadProjectConfig();
            this._resetAddForm();
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

    private _resetAddForm() {
        this._addPreset = null;
        this._addName = '';
        this._addSkill = '';
        this._addRules = {};
        this._addError = '';
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-layout', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
