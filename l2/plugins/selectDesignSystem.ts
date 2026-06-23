/// <mls fileReference="_102020_/l2/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { dsSections, dsAxisList, type IDsAxisEntry, type IDsSection } from '/_102020_/l2/designSystemAuraBase.js';
import { effectiveRulesProvenance, UNSET, type RuleSource } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';
import '/_102020_/l2/plugins/navHeader.js';

// Scope this plugin configures: project (l6), a module (l5), or a page (l3).
type DsScope = 'project' | 'module' | 'page';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Design System',
    desc: 'A design system defines the visual tokens (colors, typography, spacing) applied when generating components for this project.',
    needsProject: 'Select a project first to see the available design systems.',
    allTitle: 'All Design Systems',
    allDesc: 'Design systems configured for this project.',
    customTitle: 'New Design System',
    customDesc: 'Add a new design system to this project.',
    noDs: 'No design systems configured for this project.',
    loading: 'Loading design systems…',
    nameLabel: 'Name',
    namePlaceholder: 'e.g. ERP Compact',
    nameRequired: 'Give the design system a name.',
    descLabel: 'Description',
    descPlaceholder: 'What this design system is for (optional)',
    notSet: 'Not set',
    inheritLabel: 'Inherit',
    unsetRule: 'Remove (unset)',
    addMore: 'Configure another group',
    rule: 'rule',
    rules: 'rules',
    noRules: 'nothing configured',
    save: 'Save design system',
    saving: 'Saving…',
    saveError: 'Could not save the design system.',
    savedTitle: 'Design system ready',
    savedDesc: 'Only the groups you configured are part of this design system; everything else stays unconfigured.',
    scopeBannerModule: 'You are configuring the MODULE level. These rules apply only to this module and override the project defaults.',
    scopeBannerPage: 'You are configuring the PAGE level. These rules apply only to this page and override the module and project defaults.',
    emptyModuleTitle: 'No module-specific configuration',
    emptyModuleDesc: 'This module inherits everything from the project. Add an override to change rules just for this module.',
    emptyPageTitle: 'No page-specific configuration',
    emptyPageDesc: 'This page inherits from the module and the project. Add an override to change rules just for this page.',
    addModuleConfig: 'Add module configuration',
    addPageConfig: 'Add page configuration',
    inheritedTitle: 'Inherited (read-only)',
    inheritedFromProject: 'From project',
    inheritedFromModule: 'From module',
    inheritedLevelEmpty: 'Nothing configured at this level.',
    configuredOne: 'rule configured',
    configuredMany: 'rules configured',
    sections: {
        transversal: 'General',
        input: 'Input',
        selection: 'Selection',
        navigation: 'Navigation',
        feedback: 'Feedback & status',
        action: 'Action & content',
        visualization: 'Visualization',
    } as Record<string, string>,
    sectionDescs: {
        transversal: 'Defaults that apply across the whole interface.',
        input: 'How users type and edit values.',
        selection: 'How users choose from a set of options.',
        navigation: 'How users move between areas and steps.',
        feedback: 'How the interface responds and reports status.',
        action: 'Actions, ratings and expandable content.',
        visualization: 'How collections and data are displayed.',
    } as Record<string, string>,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Design System',
        desc: 'Um design system define os tokens visuais (cores, tipografia, espaçamentos) aplicados na geração de componentes do projeto.',
        needsProject: 'Selecione um projeto primeiro para ver os design systems disponíveis.',
        allTitle: 'Todos os Design Systems',
        allDesc: 'Design systems configurados neste projeto.',
        customTitle: 'Novo Design System',
        customDesc: 'Adicione um novo design system a este projeto.',
        noDs: 'Nenhum design system configurado neste projeto.',
        loading: 'Carregando design systems…',
        nameLabel: 'Nome',
        namePlaceholder: 'ex.: ERP Compacto',
        nameRequired: 'Dê um nome ao design system.',
        descLabel: 'Descrição',
        descPlaceholder: 'Para que serve este design system (opcional)',
        notSet: 'Não configurar',
        inheritLabel: 'Herdar',
        unsetRule: 'Remover (unset)',
        addMore: 'Configurar outro grupo',
        rule: 'regra',
        rules: 'regras',
        noRules: 'nada configurado',
        save: 'Salvar design system',
        saving: 'Salvando…',
        saveError: 'Não foi possível salvar o design system.',
        savedTitle: 'Design system pronto',
        savedDesc: 'Só os grupos que você configurou fazem parte deste design system; o resto fica sem configuração.',
        scopeBannerModule: 'Você está configurando o nível MÓDULO. Estas regras valem só para este módulo e sobrescrevem os padrões do projeto.',
        scopeBannerPage: 'Você está configurando o nível PÁGINA. Estas regras valem só para esta página e sobrescrevem os padrões do módulo e do projeto.',
        emptyModuleTitle: 'Sem configuração específica do módulo',
        emptyModuleDesc: 'Este módulo herda tudo do projeto. Adicione uma sobrescrita para mudar regras apenas neste módulo.',
        emptyPageTitle: 'Sem configuração específica da página',
        emptyPageDesc: 'Esta página herda do módulo e do projeto. Adicione uma sobrescrita para mudar regras apenas nesta página.',
        addModuleConfig: 'Adicionar configuração do módulo',
        addPageConfig: 'Adicionar configuração da página',
        inheritedTitle: 'Herdado (somente leitura)',
        inheritedFromProject: 'Do projeto',
        inheritedFromModule: 'Do módulo',
        inheritedLevelEmpty: 'Nada configurado neste nível.',
        configuredOne: 'regra configurada',
        configuredMany: 'regras configuradas',
        sections: {
            transversal: 'Geral',
            input: 'Entrada',
            selection: 'Seleção',
            navigation: 'Navegação',
            feedback: 'Feedback e status',
            action: 'Ação e conteúdo',
            visualization: 'Visualização',
        },
        sectionDescs: {
            transversal: 'Padrões que valem para toda a interface.',
            input: 'Como o usuário digita e edita valores.',
            selection: 'Como o usuário escolhe entre opções.',
            navigation: 'Como o usuário navega entre áreas e etapas.',
            feedback: 'Como a interface responde e mostra status.',
            action: 'Ações, avaliações e conteúdo expansível.',
            visualization: 'Como coleções e dados são exibidos.',
        },
    },
    es: {
        title: 'Design System',
        desc: 'Un sistema de diseño define los tokens visuales (colores, tipografía, espaciado) aplicados al generar componentes del proyecto.',
        needsProject: 'Seleccione un proyecto primero para ver los sistemas de diseño disponibles.',
        allTitle: 'Todos los Design Systems',
        allDesc: 'Design systems configurados en este proyecto.',
        customTitle: 'Nuevo Design System',
        customDesc: 'Añade un nuevo design system a este proyecto.',
        noDs: 'No hay design systems configurados en este proyecto.',
        loading: 'Cargando design systems…',
        nameLabel: 'Nombre',
        namePlaceholder: 'ej.: ERP Compacto',
        nameRequired: 'Dale un nombre al design system.',
        descLabel: 'Descripción',
        descPlaceholder: 'Para qué sirve este design system (opcional)',
        notSet: 'Sin configurar',
        inheritLabel: 'Heredar',
        unsetRule: 'Quitar (unset)',
        addMore: 'Configurar otro grupo',
        rule: 'regla',
        rules: 'reglas',
        noRules: 'nada configurado',
        save: 'Guardar design system',
        saving: 'Guardando…',
        saveError: 'No se pudo guardar el design system.',
        savedTitle: 'Design system listo',
        savedDesc: 'Solo los grupos que configuraste forman parte de este design system; el resto queda sin configurar.',
        scopeBannerModule: 'Estás configurando el nivel MÓDULO. Estas reglas aplican solo a este módulo y sobrescriben los valores del proyecto.',
        scopeBannerPage: 'Estás configurando el nivel PÁGINA. Estas reglas aplican solo a esta página y sobrescriben los valores del módulo y del proyecto.',
        emptyModuleTitle: 'Sin configuración específica del módulo',
        emptyModuleDesc: 'Este módulo hereda todo del proyecto. Agrega una sobrescritura para cambiar reglas solo en este módulo.',
        emptyPageTitle: 'Sin configuración específica de la página',
        emptyPageDesc: 'Esta página hereda del módulo y del proyecto. Agrega una sobrescritura para cambiar reglas solo en esta página.',
        addModuleConfig: 'Agregar configuración del módulo',
        addPageConfig: 'Agregar configuración de la página',
        inheritedTitle: 'Heredado (solo lectura)',
        inheritedFromProject: 'Del proyecto',
        inheritedFromModule: 'Del módulo',
        inheritedLevelEmpty: 'Nada configurado en este nivel.',
        configuredOne: 'regla configurada',
        configuredMany: 'reglas configuradas',
        sections: {
            transversal: 'General',
            input: 'Entrada',
            selection: 'Selección',
            navigation: 'Navegación',
            feedback: 'Feedback y estado',
            action: 'Acción y contenido',
            visualization: 'Visualización',
        },
        sectionDescs: {
            transversal: 'Ajustes que aplican a toda la interfaz.',
            input: 'Cómo el usuario escribe y edita valores.',
            selection: 'Cómo el usuario elige entre opciones.',
            navigation: 'Cómo el usuario navega entre áreas y pasos.',
            feedback: 'Cómo la interfaz responde y muestra estado.',
            action: 'Acciones, valoraciones y contenido expandible.',
            visualization: 'Cómo se muestran colecciones y datos.',
        },
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IDsEntry {
    key: number;
    name: string;
    skill: string;
    description: string;
    rules: Record<string, string>;                                  // project-level rules
    moduleOverrides: Record<string, Record<string, string>>;        // [module] → partial
    pageOverrides: Record<string, Record<string, string>>;          // ["{module}/{page}"] → partial
}

interface INewDs {
    name: string;
    description: string;
    rules: Record<string, string>;
}

// Skill used by the materialization agent to render a page from this DS.
const DS_SKILL = '_102020_/l2/agentMaterializeSolution/skills/genPageDS.ts';

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-design-system-102020')
export class PluginSelectDesignSystem extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) value: number | null = null;
    // Granularity: 'project' (l6) edits ds.rules; 'module' (l5) edits moduleOverrides[module];
    // 'page' (l3) edits pageOverrides["{module}/{page}"]. Defaults to project (back-compat).
    @property({ attribute: false }) scope: DsScope = 'project';
    @property({ attribute: false }) module: string | null = null;
    @property({ attribute: false }) page: string | null = null;

    @state() private _entries: IDsEntry[] = [];
    @state() private _loading: boolean = false;
    // Effective values inherited from PARENT scopes (axis → {value, source}); shown so the user
    // sees what an override/unset would change. Empty at project scope.
    @state() private _inherited: Record<string, { value: string; source: RuleSource }> = {};

    // ─── New design system form ──────────────────────────────────────
    @state() private _dsName: string = '';
    @state() private _dsDesc: string = '';
    // Only the axes the user explicitly configured. An absent axis = unconfigured
    // (it does NOT inherit a default — each DS stands on its own).
    @state() private _axisValues: Record<string, string> = {};
    @state() private _addedSections: Set<string> = new Set();
    @state() private _openSections: Set<string> = new Set();
    @state() private _showAddMenu: boolean = false;
    @state() private _nameError: boolean = false;
    @state() private _savedDs: INewDs | null = null;
    @state() private _saving: boolean = false;
    @state() private _saveError: string = '';
    // Which DS the form is currently populated for: an entry key (edit), the
    // custom key (new), or null (not yet synced).
    @state() private _editingKey: number | null = null;
    // At a child scope (module/page) with no own override yet: true once the user opts to
    // start configuring this level, revealing the editable form over the empty state.
    @state() private _editingScope: boolean = false;

    connectedCallback() {
        super.connectedCallback();
        if (this.projectId) this._loadDsConfig(this.projectId);
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('projectId')) {
            this._entries = [];
            this._editingKey = null;
            this._editingScope = false;
            if (this.projectId) this._loadDsConfig(this.projectId);
            else this._dispatchConfig();
        }
        if (changed.has('value') || changed.has('scope') || changed.has('module') || changed.has('page')) {
            this._editingKey = null; // force the form to reload for the new scope/target
            this._editingScope = false; // a new target re-evaluates its own empty/configured state
        }
        // The knob range depends on scope (project exposes the extra "+" slot), so
        // recompute it when the scope changes without a project reload.
        if (changed.has('scope') && this.projectId && !this._loading) {
            this._dispatchConfig();
        }
        this._syncForm();
    }

    private get _isProjectScope(): boolean { return this.scope !== 'module' && this.scope !== 'page'; }

    /** Page-override key: "{module}/{page}". */
    private get _scopeKey(): string { return `${this.module ?? ''}/${this.page ?? ''}`; }

    /** The partial this scope edits (its own bucket on the DS). */
    private _scopeBucket(entry: IDsEntry): Record<string, string> {
        if (this.scope === 'module') return entry.moduleOverrides[this.module ?? ''] ?? {};
        if (this.scope === 'page') return entry.pageOverrides[this._scopeKey] ?? {};
        return entry.rules;
    }

    /** Effective values inherited from the PARENT scopes (project for module; project+module for page). */
    private _computeInherited(entry: IDsEntry): Record<string, { value: string; source: RuleSource }> {
        if (this.scope === 'module') return effectiveRulesProvenance(entry.rules).effective;
        if (this.scope === 'page') return effectiveRulesProvenance(entry.rules, entry.moduleOverrides[this.module ?? '']).effective;
        return {};
    }

    /** Populate the editable form for the current target (new DS or selected DS). */
    private _syncForm(): void {
        if (!this.projectId || this._loading) return;
        if (this._isCustom) {
            if (this._editingKey !== this._customKey) {
                this._resetForm();
                this._editingKey = this._customKey;
            }
        } else if (this.value !== null && this.value > 0) {
            const entry = this._selectedEntry;
            if (entry && this._editingKey !== entry.key) {
                this._loadFormFromEntry(entry);
                this._editingKey = entry.key;
            }
        }
    }

    private _resetForm(): void {
        this._dsName = '';
        this._dsDesc = '';
        this._axisValues = {};
        this._inherited = {};
        this._addedSections = new Set();
        this._openSections = new Set();
        this._showAddMenu = false;
        this._savedDs = null;
        this._nameError = false;
        this._saveError = '';
        this._saving = false;
    }

    private _loadFormFromEntry(entry: IDsEntry): void {
        const bucket = this._scopeBucket(entry); // this scope's own partial (rules / moduleOverrides / pageOverrides)
        this._dsName = entry.name;
        this._dsDesc = entry.description ?? '';
        this._axisValues = { ...bucket };
        this._inherited = this._computeInherited(entry);
        // Reveal any non-primary section that already holds a rule.
        const added = new Set<string>();
        for (const axis of dsAxisList) {
            if (axis.key in bucket) {
                const sec = dsSections.find(s => s.key === axis.section);
                if (sec && !sec.primary) added.add(sec.key);
            }
        }
        this._addedSections = added;
        this._openSections = new Set();
        this._showAddMenu = false;
        this._savedDs = null;
        this._nameError = false;
        this._saveError = '';
        this._saving = false;
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _customKey(): number {
        if (!this._entries.length) return 1;
        return this._entries[this._entries.length - 1].key + 1;
    }

    /** Highest existing entry key (entries are sorted ascending), or 0 when none. */
    private get _lastEntryKey(): number {
        return this._entries.length ? this._entries[this._entries.length - 1].key : 0;
    }

    /** Top of the selectable range: includes the "+" slot only at project scope (l6). */
    private get _maxValue(): number {
        return this._isProjectScope ? this._customKey : this._lastEntryKey;
    }

    private get _isAll(): boolean { return this.value === 0; }
    // Adding a new DS is only allowed at project scope (l6). Module (l5) and
    // page (l3) scopes only edit rules for existing design systems.
    private get _isCustom(): boolean {
        return this._isProjectScope && this.value !== null && this.value === this._customKey;
    }
    private get _selectedEntry(): IDsEntry | null {
        if (this.value === null || this.value <= 0) return null;
        return this._entries.find(e => e.key === this.value) ?? null;
    }

    // ─── Loading ──────────────────────────────────────────────────────

    private async _loadDsConfig(projectId: number): Promise<void> {
        this._loading = true;
        this.requestUpdate();
        try {
            const config = await getConfigProject(projectId);
            const dsMap = (config?.designSystems ?? {}) as unknown as Record<string, { name: string; skill?: string; description?: string; rules?: Record<string, string>; moduleOverrides?: Record<string, Record<string, string>>; pageOverrides?: Record<string, Record<string, string>> }>;
            const keys = Object.keys(dsMap).map(Number).sort((a, b) => a - b);
            this._entries = keys.map(k => ({
                key: k,
                name: dsMap[k].name,
                skill: dsMap[k].skill ?? '',
                description: dsMap[k].description ?? '',
                rules: dsMap[k].rules ?? {},
                moduleOverrides: dsMap[k].moduleOverrides ?? {},
                pageOverrides: dsMap[k].pageOverrides ?? {},
            }));
        } catch {
            this._entries = [];
        }
        this._loading = false;
        this._dispatchConfig();
        this.requestUpdate();
    }

    private _dispatchConfig(): void {
        const labels: Record<number, string> = { 0: 'All' };
        this._entries.forEach(e => { labels[e.key] = e.name; });
        // The "+" (new DS) slot only exists at project scope (l6).
        if (this._isProjectScope) labels[this._customKey] = '+';
        this.dispatchEvent(new CustomEvent('ds-config', {
            detail: { min: 0, max: this._maxValue, labels },
            bubbles: true,
            composed: true,
        }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.projectId) return this._renderNeedsProject();
        if (this._loading) return this._renderLoading();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
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
                <span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.loading}</span>
            </div>
        `;
    }

    private _renderAll() {
        const max = this._maxValue;
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
                ${this._entries.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noDs}</span>`
                    : html`<div class="flex flex-col gap-1.5">
                        ${this._entries.map(e => this._renderDsCard(e))}
                    </div>`}
            </div>
        `;
    }

    private _renderSelected() {
        const entry = this._selectedEntry;
        const max = this._maxValue;
        if (!entry) return nothing;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${entry.name}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                ${this._renderDsForm()}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this._maxValue;
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
                ${this._renderDsForm()}
            </div>
        `;
    }

    // ─── Editable DS form (shared by "new" and "selected/edit") ───────

    /** True when the current child scope already has its own override bucket persisted. */
    private get _scopeHasOwnConfig(): boolean {
        const entry = this._selectedEntry;
        if (!entry) return false;
        return Object.keys(this._scopeBucket(entry)).length > 0;
    }

    private _renderDsForm() {
        // Project scope (l6) edits the DS identity + its base rules — the original form.
        // Module/page scopes edit only THIS level's override and surface the parent levels
        // read-only below, so the user can see the granularity they're configuring.
        return this._isProjectScope ? this._renderProjectForm() : this._renderScopedForm();
    }

    /**
     * Sections shown in the editable form.
     * - Project (l6): primary sections always + any the user added (the full base form).
     * - Module/page (l3/l5): ONLY sections that already hold a rule at this scope, plus any
     *   the user explicitly added — keeps the override UI clean; the rest live behind "+".
     */
    private get _visibleSections(): IDsSection[] {
        if (this._isProjectScope) {
            return dsSections.filter(s => s.primary || this._addedSections.has(s.key));
        }
        return dsSections.filter(s => this._sectionRuleCount(s.key) > 0 || this._addedSections.has(s.key));
    }

    // ── Project scope: identity + base rules (editable) ───────────────
    private _renderProjectForm() {
        const visible = this._visibleSections;
        return html`
            ${this._renderNameField()}
            ${this._renderDescField()}

            <div class="flex flex-col gap-2.5">
                ${visible.map(sec => this._renderSectionDetails(sec))}
            </div>

            ${this._renderAddMore()}
            ${this._renderSaveButton()}
            ${this._renderSaveFeedback()}
        `;
    }

    // ── Module/page scope: own override (editable) + parents (read-only) ──
    private _renderScopedForm() {
        const showEditable = this._scopeHasOwnConfig || this._editingScope;
        return html`
            ${this._renderScopeBanner()}
            ${showEditable ? this._renderScopeEditable() : this._renderScopeEmpty()}
            ${this._renderInheritedLevels()}
        `;
    }

    private _renderScopeBanner() {
        const text = this.scope === 'page' ? this.msg.scopeBannerPage : this.msg.scopeBannerModule;
        return html`
            <div class="rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2">
                <span class="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">${text}</span>
            </div>
        `;
    }

    private _renderScopeEditable() {
        const visible = this._visibleSections;
        return html`
            <div class="flex flex-col gap-2.5">
                ${visible.map(sec => this._renderSectionDetails(sec))}
            </div>

            ${this._renderAddMore()}
            ${this._renderSaveButton()}
            ${this._renderSaveFeedback()}
        `;
    }

    private _renderScopeEmpty() {
        const isPage = this.scope === 'page';
        const title = isPage ? this.msg.emptyPageTitle : this.msg.emptyModuleTitle;
        const desc = isPage ? this.msg.emptyPageDesc : this.msg.emptyModuleDesc;
        const btn = isPage ? this.msg.addPageConfig : this.msg.addModuleConfig;
        return html`
            <div class="rounded-lg border border-dashed border-gray-300 dark:border-gray-700 px-3 py-5 flex flex-col items-center gap-2 text-center">
                <span class="text-sm font-semibold text-gray-600 dark:text-gray-300">${title}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed max-w-xs">${desc}</span>
                <button
                    class="mt-1 text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer flex items-center gap-1"
                    @click=${() => { this._editingScope = true; this.requestUpdate(); }}
                ><span class="text-sm leading-none">+</span> ${btn}</button>
            </div>
        `;
    }

    private _renderSaveButton() {
        return html`
            <button
                class="
                    self-start mt-1 text-sm px-3 py-1.5 rounded-md
                    bg-indigo-500 dark:bg-indigo-600 text-white
                    hover:bg-indigo-600 dark:hover:bg-indigo-500
                    disabled:opacity-50 disabled:cursor-not-allowed
                    transition-colors cursor-pointer
                "
                ?disabled=${this._saving}
                @click=${() => this._onSave()}
            >${this._saving ? this.msg.saving : this.msg.save}</button>
        `;
    }

    private _renderSaveFeedback() {
        return html`
            ${this._saveError
                ? html`<div class="rounded-md border border-red-200 dark:border-red-800/40 bg-red-50 dark:bg-red-900/10 px-2.5 py-1.5">
                    <span class="text-xs text-red-600 dark:text-red-400">${this._saveError}</span>
                </div>`
                : nothing}

            ${this._savedDs ? this._renderSavedPreview(this._savedDs) : nothing}
        `;
    }

    // ── Read-only parent levels (project for module; project+module for page) ──
    private _inheritedLevels(): { title: string; rules: Record<string, string> }[] {
        const entry = this._selectedEntry;
        if (!entry) return [];
        const levels: { title: string; rules: Record<string, string> }[] = [
            { title: this.msg.inheritedFromProject, rules: entry.rules ?? {} },
        ];
        if (this.scope === 'page') {
            const mod = this.module ?? '';
            levels.push({
                title: `${this.msg.inheritedFromModule}${mod ? ` · ${mod}` : ''}`,
                rules: entry.moduleOverrides[mod] ?? {},
            });
        }
        return levels;
    }

    private _renderInheritedLevels() {
        const levels = this._inheritedLevels();
        if (!levels.length) return nothing;
        return html`
            <div class="flex flex-col gap-2 mt-1 pt-3 border-t border-gray-100 dark:border-gray-800/70">
                <span class="text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500">${this.msg.inheritedTitle}</span>
                ${levels.map(l => this._renderReadonlyLevel(l.title, l.rules))}
            </div>
        `;
    }

    private _renderReadonlyLevel(title: string, rules: Record<string, string>) {
        const entries = Object.entries(rules);
        const count = entries.length;
        const countLabel = `${count} ${count === 1 ? this.msg.configuredOne : this.msg.configuredMany}`;
        return html`
            <details class="group rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden">
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2 flex items-center gap-2">
                    <svg class="w-3 h-3 shrink-0 text-gray-400 dark:text-gray-500 transition-transform group-open:rotate-90"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    <span class="text-xs font-semibold text-gray-500 dark:text-gray-400">${title}</span>
                    <span class="text-[11px] text-gray-400 dark:text-gray-500">(${countLabel})</span>
                </summary>
                <div class="px-3 pb-2.5 pt-2 border-t border-gray-100 dark:border-gray-800/70">
                    ${count
                        ? html`<div class="flex flex-wrap gap-1">
                            ${entries.map(([k, v]) => this._renderReadonlyChip(k, v))}
                        </div>`
                        : html`<span class="text-[11px] text-gray-400 dark:text-gray-600 italic">${this.msg.inheritedLevelEmpty}</span>`}
                </div>
            </details>
        `;
    }

    private _renderReadonlyChip(axisKey: string, value: string) {
        const axis = dsAxisList.find(a => String(a.key) === axisKey);
        const label = axis?.label ?? axisKey;
        const isUnset = value === UNSET;
        const display = isUnset ? this.msg.unsetRule : this._humanize(value);
        return html`
            <span class="text-[10px] px-1.5 py-0.5 rounded ${isUnset
                ? 'bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400 line-through'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400'}"
            >${label}: ${display}</span>
        `;
    }

    private _renderNameField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.nameLabel}</label>
                <input
                    type="text"
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md
                        border ${this._nameError ? 'border-red-400 dark:border-red-500' : 'border-gray-200 dark:border-gray-700'}
                        bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    placeholder=${this.msg.namePlaceholder}
                    .value=${this._dsName}
                    @input=${(e: Event) => { this._dsName = (e.target as HTMLInputElement).value; this._nameError = false; }}
                />
                ${this._nameError
                    ? html`<span class="text-xs text-red-500 dark:text-red-400">${this.msg.nameRequired}</span>`
                    : nothing}
            </div>
        `;
    }

    private _renderDescField() {
        return html`
            <div class="flex flex-col gap-1">
                <label class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.descLabel}</label>
                <textarea
                    rows="2"
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md resize-y
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    placeholder=${this.msg.descPlaceholder}
                    .value=${this._dsDesc}
                    @input=${(e: Event) => { this._dsDesc = (e.target as HTMLTextAreaElement).value; this._savedDs = null; }}
                ></textarea>
            </div>
        `;
    }

    private _sectionAxes(secKey: string): readonly IDsAxisEntry[] {
        return dsAxisList.filter(a => a.section === secKey);
    }

    private _sectionRuleCount(secKey: string): number {
        return this._sectionAxes(secKey).filter(a => a.key in this._axisValues).length;
    }

    private _renderSectionDetails(sec: IDsSection) {
        const open = this._openSections.has(sec.key);
        const label = this.msg.sections[sec.key] ?? sec.label;
        const desc = this.msg.sectionDescs[sec.key] ?? sec.desc;
        const count = this._sectionRuleCount(sec.key);
        return html`
            <details
                class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden"
                ?open=${open}
            >
                <summary
                    class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2.5 flex items-center gap-2"
                    @click=${(e: Event) => { e.preventDefault(); this._toggleSection(sec.key); }}
                >
                    <svg class="w-3.5 h-3.5 shrink-0 text-gray-400 dark:text-gray-500 transition-transform ${open ? 'rotate-90' : ''}"
                        viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
                    <div class="flex flex-col gap-0.5 min-w-0">
                        <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${label}</span>
                        <span class="text-[11px] text-gray-400 dark:text-gray-500 leading-snug">${desc}</span>
                    </div>
                    ${this._renderCountBadge(count)}
                </summary>
                <div class="px-3 pb-3 pt-2 flex flex-col gap-3 border-t border-gray-100 dark:border-gray-800/70">
                    ${this._sectionAxes(sec.key).map(a => this._renderAxis(a))}
                </div>
            </details>
        `;
    }

    private _renderCountBadge(count: number) {
        const label = count === 1 ? this.msg.rule : this.msg.rules;
        return html`
            <span class="ml-auto shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full
                ${count > 0
                    ? 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-300'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600'}"
            >${count > 0 ? `${count} ${label}` : this.msg.noRules}</span>
        `;
    }

    private _renderAxis(axis: IDsAxisEntry) {
        const current = this._axisValues[axis.key];                 // value set at THIS scope, UNSET, or undefined
        const inherited = this._isProjectScope ? undefined : this._inherited[axis.key]; // from parent scopes
        const isUnset = current === UNSET;
        return html`
            <div class="flex flex-col gap-1">
                <div class="flex items-baseline gap-2">
                    <span class="text-xs font-medium text-gray-600 dark:text-gray-300">${axis.label}</span>
                    ${inherited
                        ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500">${this.msg.inheritLabel}: ${this._humanize(inherited.value)} <span class="opacity-60">(${inherited.source})</span></span>`
                        : nothing}
                </div>
                <div class="flex flex-wrap gap-1.5">
                    ${this._renderClearChip(axis, current === undefined, inherited?.value)}
                    ${axis.values.map(v => this._renderValueChip(axis, v, current === v))}
                    ${inherited ? this._renderUnsetChip(axis, isUnset) : nothing}
                </div>
            </div>
        `;
    }

    private _renderClearChip(axis: IDsAxisEntry, selected: boolean, inheritedValue?: string) {
        // At a child scope, "not set here" means INHERIT the parent value.
        const label = (!this._isProjectScope && inheritedValue !== undefined) ? this.msg.inheritLabel : this.msg.notSet;
        return html`
            <button
                class="text-xs px-2 py-1 rounded-md border border-dashed transition-colors cursor-pointer
                    ${selected
                        ? 'border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium'
                        : 'border-gray-200 dark:border-gray-800 bg-transparent text-gray-400 dark:text-gray-600 hover:border-gray-300 dark:hover:border-gray-600'}"
                @click=${() => this._clearAxis(axis.key)}
            >${label}</button>
        `;
    }

    /** Only shown at child scopes when there is an inherited value: writes the UNSET sentinel (relax). */
    private _renderUnsetChip(axis: IDsAxisEntry, selected: boolean) {
        return html`
            <button
                class="text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer
                    ${selected
                        ? 'border-red-400 dark:border-red-500 bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 font-medium'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:border-red-300 dark:hover:border-red-600'}"
                @click=${() => this._setAxis(axis.key, UNSET)}
            >${this.msg.unsetRule}</button>
        `;
    }

    private _renderValueChip(axis: IDsAxisEntry, value: string, selected: boolean) {
        return html`
            <button
                class="text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer
                    ${selected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}"
                @click=${() => this._setAxis(axis.key, value)}
            >${this._humanize(value)}</button>
        `;
    }

    private _renderAddMore() {
        const visible = new Set(this._visibleSections.map(s => s.key));
        const remaining = dsSections.filter(s => !visible.has(s.key));
        if (!remaining.length) return nothing;
        return html`
            <div class="flex flex-col gap-2">
                <button
                    class="self-start text-xs px-2.5 py-1.5 rounded-md border border-dashed border-gray-300 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer flex items-center gap-1"
                    @click=${() => { this._showAddMenu = !this._showAddMenu; }}
                >
                    <span class="text-sm leading-none">+</span> ${this.msg.addMore}
                </button>
                ${this._showAddMenu
                    ? html`<div class="flex flex-wrap gap-1.5">
                        ${remaining.map(sec => html`
                            <button
                                class="text-xs px-2 py-1 rounded-md border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:border-indigo-400 dark:hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                                @click=${() => this._addSection(sec.key)}
                            >${this.msg.sections[sec.key] ?? sec.label}</button>
                        `)}
                    </div>`
                    : nothing}
            </div>
        `;
    }

    private _renderSavedPreview(ds: INewDs) {
        const entries = Object.entries(ds.rules);
        return html`
            <div class="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2.5 flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">${this.msg.savedTitle}</span>
                    <span class="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">#${this._editingKey ?? this._customKey}</span>
                </div>
                <span class="text-sm font-medium text-gray-700 dark:text-gray-200">${ds.name}</span>
                ${ds.description
                    ? html`<span class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">${ds.description}</span>`
                    : nothing}
                <span class="text-xs text-emerald-600/80 dark:text-emerald-400/80 leading-relaxed">${this.msg.savedDesc}</span>
                ${entries.length
                    ? html`<div class="flex flex-wrap gap-1 mt-1">
                        ${entries.map(([k, v]) => html`
                            <span class="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-100/70 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300">${k}: ${v}</span>
                        `)}
                    </div>`
                    : nothing}
            </div>
        `;
    }

    private _humanize(value: string): string {
        return value.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    }

    private _toggleSection(key: string): void {
        const next = new Set(this._openSections);
        if (next.has(key)) next.delete(key); else next.add(key);
        this._openSections = next;
    }

    private _addSection(key: string): void {
        this._addedSections = new Set(this._addedSections).add(key);
        this._openSections = new Set(this._openSections).add(key);
        this._showAddMenu = false;
    }

    private _setAxis(key: string, value: string): void {
        this._axisValues = { ...this._axisValues, [key]: value };
        this._savedDs = null;
    }

    private _clearAxis(key: string): void {
        if (!(key in this._axisValues)) return;
        const next = { ...this._axisValues };
        delete next[key];
        this._axisValues = next;
        this._savedDs = null;
    }

    private async _onSave(): Promise<void> {
        const name = this._dsName.trim();
        // Name identifies the DS — required only at project scope. module/page scopes save
        // overrides for an existing DS (its name stays).
        if (this._isProjectScope && !name) { this._nameError = true; return; }
        if (!this.projectId || this._saving) return;

        // Each DS stands on its own: store ONLY the axes the user configured.
        // Unconfigured axes are simply absent — no inheritance from a default DS.
        const rules: Record<string, string> = { ...this._axisValues };
        const ds: INewDs = { name, description: this._dsDesc.trim(), rules };

        const key = this._editingKey ?? this._customKey;
        const isNew = key === this._customKey;

        this._saving = true;
        this._saveError = '';
        try {
            await this._persistDs(this.projectId, key, ds);
        } catch (err) {
            console.error('[selectDesignSystem] failed to save design system', err);
            this._saveError = this.msg.saveError;
            this._saving = false;
            return;
        }

        // Refresh the list/labels from the just-written config and keep this DS in view.
        await this._loadDsConfig(this.projectId);
        this._editingKey = key;
        this._savedDs = ds;
        this._saving = false;

        console.log('[selectDesignSystem]', isNew ? 'created' : 'updated', 'design system', key, ds);
        this.dispatchEvent(new CustomEvent('save-ds', {
            detail: { key, isNew, ds },
            bubbles: true,
            composed: true,
        }));
    }

    /**
     * Write into `project.json` → `designSystems[key]`, in the bucket for the current scope:
     *   project → rules (+ name/description/skill)
     *   module  → moduleOverrides[module]
     *   page    → pageOverrides["{module}/{page}"]
     * Merges into the existing entry (never clobbers the other buckets/identity).
     */
    private async _persistDs(projectId: number, key: number, ds: INewDs): Promise<void> {
        const config: any = await getConfigProject(projectId);
        if (!config) throw new Error('project config not found');

        const current = config.designSystems;
        const designSystems: Record<string, any> =
            (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};

        const existing = designSystems[key] ?? {};

        if (this.scope === 'module') {
            if (!this.module) throw new Error('module scope requires a module');
            const moduleOverrides = { ...(existing.moduleOverrides ?? {}) };
            moduleOverrides[this.module] = ds.rules;
            designSystems[key] = { ...existing, moduleOverrides };
        } else if (this.scope === 'page') {
            if (!this.module || !this.page) throw new Error('page scope requires module and page');
            const pageOverrides = { ...(existing.pageOverrides ?? {}) };
            pageOverrides[this._scopeKey] = ds.rules;
            designSystems[key] = { ...existing, pageOverrides };
        } else {
            designSystems[key] = {
                ...existing,
                name: ds.name,
                description: ds.description,
                skill: existing.skill ?? DS_SKILL,
                rules: ds.rules,
            };
        }
        config.designSystems = designSystems;

        await updateConfigProject(projectId, config);
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderDsCard(entry: IDsEntry) {
        return html`
            <div
                class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    hover:bg-gray-100 dark:hover:bg-gray-800/70
                    px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                "
                @click=${() => this._dispatchSelect(entry.key)}
            >
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${entry.name}</span>
                <span class="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">#${entry.key}</span>
            </div>
        `;
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
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                <span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${text}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-ds', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
