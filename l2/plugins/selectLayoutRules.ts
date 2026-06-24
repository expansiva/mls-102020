/// <mls fileReference="_102020_/l2/plugins/selectLayoutRules.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

// Layout-rules editor (cascade base → module → page) for a SINGLE selected layout.
// Adapted from selectDesignSystem's scoped editor, but operating on layouts[layout] instead of
// designSystems[ds], and WITHOUT the list/identity/"+" navigation (the layout is already chosen
// by the genome's layout knob). Scope: 'project' = layout base | 'module' | 'page'.

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getConfigProject, updateConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { dsSections, dsAxisList, type IDsAxisEntry, type IDsSection } from '/_102020_/l2/designSystemAuraBase.js';
import { effectiveRulesProvenance, UNSET, type RuleSource } from '/_102020_/l2/dsMatch/resolveRulesForPage.js';

type RulesScope = 'project' | 'module' | 'page'; // 'project' = layout base

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    needsLayout: 'Select a layout first to configure its rules.',
    loading: 'Loading…',
    tabLayout: 'Layout (base)',
    tabModule: 'Module',
    tabPage: 'Page',
    notSet: 'Not set',
    inheritLabel: 'Inherit',
    unsetRule: 'Remove (unset)',
    addMore: 'Configure another group',
    rule: 'rule',
    rules: 'rules',
    noRules: 'nothing configured',
    save: 'Save rules',
    saving: 'Saving…',
    saveError: 'Could not save the rules.',
    saved: 'Rules saved',
    savedDesc: 'Only the groups you configured are part of this level; everything else inherits.',
    scopeBannerLayout: 'Base rules for this layout. Modules and pages can override them.',
    scopeBannerModule: 'MODULE level. These rules apply only to this module and override the layout base.',
    scopeBannerPage: 'PAGE level. These rules apply only to this page and override the module and the layout base.',
    emptyModuleTitle: 'No module-specific configuration',
    emptyModuleDesc: 'This module inherits everything from the layout base. Add an override to change rules just for this module.',
    emptyPageTitle: 'No page-specific configuration',
    emptyPageDesc: 'This page inherits from the module and the layout base. Add an override to change rules just for this page.',
    addModuleConfig: 'Add module configuration',
    addPageConfig: 'Add page configuration',
    inheritedTitle: 'Inherited (read-only)',
    inheritedFromLayout: 'From layout (base)',
    inheritedFromModule: 'From module',
    inheritedLevelEmpty: 'Nothing configured at this level.',
    configuredOne: 'rule configured',
    configuredMany: 'rules configured',
    sections: {
        transversal: 'General', input: 'Input', selection: 'Selection', navigation: 'Navigation',
        feedback: 'Feedback & status', action: 'Action & content', visualization: 'Visualization',
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
        needsLayout: 'Selecione um layout primeiro para configurar suas regras.',
        loading: 'Carregando…',
        tabLayout: 'Layout (base)',
        tabModule: 'Módulo',
        tabPage: 'Página',
        notSet: 'Não configurar',
        inheritLabel: 'Herdar',
        unsetRule: 'Remover (unset)',
        addMore: 'Configurar outro grupo',
        rule: 'regra',
        rules: 'regras',
        noRules: 'nada configurado',
        save: 'Salvar regras',
        saving: 'Salvando…',
        saveError: 'Não foi possível salvar as regras.',
        saved: 'Regras salvas',
        savedDesc: 'Só os grupos que você configurou fazem parte deste nível; o resto é herdado.',
        scopeBannerLayout: 'Regras base deste layout. Módulos e páginas podem sobrescrevê-las.',
        scopeBannerModule: 'Nível MÓDULO. Estas regras valem só para este módulo e sobrescrevem a base do layout.',
        scopeBannerPage: 'Nível PÁGINA. Estas regras valem só para esta página e sobrescrevem o módulo e a base do layout.',
        emptyModuleTitle: 'Sem configuração específica do módulo',
        emptyModuleDesc: 'Este módulo herda tudo da base do layout. Adicione uma sobrescrita para mudar regras só neste módulo.',
        emptyPageTitle: 'Sem configuração específica da página',
        emptyPageDesc: 'Esta página herda do módulo e da base do layout. Adicione uma sobrescrita para mudar regras só nesta página.',
        addModuleConfig: 'Adicionar configuração do módulo',
        addPageConfig: 'Adicionar configuração da página',
        inheritedTitle: 'Herdado (somente leitura)',
        inheritedFromLayout: 'Do layout (base)',
        inheritedFromModule: 'Do módulo',
        inheritedLevelEmpty: 'Nada configurado neste nível.',
        configuredOne: 'regra configurada',
        configuredMany: 'regras configuradas',
        sections: {
            transversal: 'Geral', input: 'Entrada', selection: 'Seleção', navigation: 'Navegação',
            feedback: 'Feedback e status', action: 'Ação e conteúdo', visualization: 'Visualização',
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
        needsLayout: 'Seleccione un layout primero para configurar sus reglas.',
        loading: 'Cargando…',
        tabLayout: 'Layout (base)',
        tabModule: 'Módulo',
        tabPage: 'Página',
        notSet: 'Sin configurar',
        inheritLabel: 'Heredar',
        unsetRule: 'Quitar (unset)',
        addMore: 'Configurar otro grupo',
        rule: 'regla',
        rules: 'reglas',
        noRules: 'nada configurado',
        save: 'Guardar reglas',
        saving: 'Guardando…',
        saveError: 'No se pudieron guardar las reglas.',
        saved: 'Reglas guardadas',
        savedDesc: 'Solo los grupos que configuraste forman parte de este nivel; el resto se hereda.',
        scopeBannerLayout: 'Reglas base de este layout. Módulos y páginas pueden sobrescribirlas.',
        scopeBannerModule: 'Nivel MÓDULO. Estas reglas aplican solo a este módulo y sobrescriben la base del layout.',
        scopeBannerPage: 'Nivel PÁGINA. Estas reglas aplican solo a esta página y sobrescriben el módulo y la base del layout.',
        emptyModuleTitle: 'Sin configuración específica del módulo',
        emptyModuleDesc: 'Este módulo hereda todo de la base del layout. Agrega una sobrescritura para cambiar reglas solo en este módulo.',
        emptyPageTitle: 'Sin configuración específica de la página',
        emptyPageDesc: 'Esta página hereda del módulo y de la base del layout. Agrega una sobrescritura para cambiar reglas solo en esta página.',
        addModuleConfig: 'Agregar configuración del módulo',
        addPageConfig: 'Agregar configuración de la página',
        inheritedTitle: 'Heredado (solo lectura)',
        inheritedFromLayout: 'Del layout (base)',
        inheritedFromModule: 'Del módulo',
        inheritedLevelEmpty: 'Nada configurado en este nivel.',
        configuredOne: 'regla configurada',
        configuredMany: 'reglas configuradas',
        sections: {
            transversal: 'General', input: 'Entrada', selection: 'Selección', navigation: 'Navegación',
            feedback: 'Feedback y estado', action: 'Acción y contenido', visualization: 'Visualización',
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

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-layout-rules-102020')
export class PluginSelectLayoutRules extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) layout: number | null = null;
    @property({ attribute: false }) module: string | null = null;
    @property({ attribute: false }) page: string | null = null;

    // Scope is chosen internally via the toggle (the layout is fixed by the parent knob).
    @state() private _scope: RulesScope = 'project';
    @state() private _loading: boolean = false;
    @state() private _rules: Record<string, string> = {};
    @state() private _moduleOverrides: Record<string, Record<string, string>> = {};
    @state() private _pageOverrides: Record<string, Record<string, string>> = {};

    @state() private _axisValues: Record<string, string> = {};
    @state() private _inherited: Record<string, { value: string; source: RuleSource }> = {};
    @state() private _addedSections: Set<string> = new Set();
    @state() private _openSections: Set<string> = new Set();
    @state() private _showAddMenu: boolean = false;
    @state() private _saving: boolean = false;
    @state() private _saveError: string = '';
    @state() private _saved: boolean = false;
    @state() private _editingScope: boolean = false;

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('module') || changed.has('page')) {
            // Clamp the scope if the context no longer supports it.
            if (this._scope === 'page' && (!this.module || !this.page)) this._scope = 'project';
            if (this._scope === 'module' && !this.module) this._scope = 'project';
        }
        if (changed.has('projectId') || changed.has('layout')) {
            this._load();
        } else if (changed.has('module') || changed.has('page')) {
            this._loadForm();
        }
    }

    private _setScope(scope: RulesScope): void {
        if (this._scope === scope) return;
        this._scope = scope;
        this._loadForm();
    }

    private _renderScopeToggle() {
        const tabs: Array<{ scope: RulesScope; label: string; on: boolean }> = [
            { scope: 'project', label: this.msg.tabLayout, on: true },
            { scope: 'module', label: this.msg.tabModule, on: !!this.module },
            { scope: 'page', label: this.msg.tabPage, on: !!this.module && !!this.page },
        ];
        return html`
            <div class="flex flex-wrap gap-1.5">
                ${tabs.filter(t => t.on).map(t => html`
                    <button
                        class="text-[11px] px-2 py-0.5 rounded-full border transition-colors cursor-pointer
                            ${this._scope === t.scope
                                ? 'bg-indigo-500 dark:bg-indigo-600 text-white border-transparent'
                                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:border-gray-300'}"
                        @click=${() => this._setScope(t.scope)}
                    >${t.label}</button>
                `)}
            </div>
        `;
    }

    private get msg(): MessageType { return messages[this.getMessageKey(messages)]; }
    private get _isBaseScope(): boolean { return this._scope !== 'module' && this._scope !== 'page'; }
    private get _scopeKey(): string { return `${this.module ?? ''}/${this.page ?? ''}`; }

    createRenderRoot() { return this; }

    // ─── Loading ──────────────────────────────────────────────────────

    private async _load(): Promise<void> {
        if (!this.projectId || this.layout == null) return;
        this._loading = true;
        this.requestUpdate();
        try {
            const config: any = await getConfigProject(this.projectId);
            const lay = config?.layouts?.[String(this.layout)] ?? {};
            this._rules = lay.rules ?? {};
            this._moduleOverrides = lay.moduleOverrides ?? {};
            this._pageOverrides = lay.pageOverrides ?? {};
        } catch {
            this._rules = {}; this._moduleOverrides = {}; this._pageOverrides = {};
        }
        this._loading = false;
        this._loadForm();
        this.requestUpdate();
    }

    /** The partial this scope edits (its own bucket on the layout). */
    private _scopeBucket(): Record<string, string> {
        if (this._scope === 'module') return this._moduleOverrides[this.module ?? ''] ?? {};
        if (this._scope === 'page') return this._pageOverrides[this._scopeKey] ?? {};
        return this._rules;
    }

    /** Effective values inherited from the PARENT scopes (layout base for module; +module for page). */
    private _computeInherited(): Record<string, { value: string; source: RuleSource }> {
        if (this._scope === 'module') return effectiveRulesProvenance(this._rules).effective;
        if (this._scope === 'page') return effectiveRulesProvenance(this._rules, this._moduleOverrides[this.module ?? '']).effective;
        return {};
    }

    private _loadForm(): void {
        const bucket = this._scopeBucket();
        this._axisValues = { ...bucket };
        this._inherited = this._computeInherited();
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
        this._saved = false;
        this._saveError = '';
        this._saving = false;
        this._editingScope = false;
        this.requestUpdate();
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        if (!this.projectId || this.layout == null) return this._renderNotice(this.msg.needsLayout);
        if (this._loading) return html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.loading}</span>`;
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderScopeToggle()}
                ${this._isBaseScope ? this._renderBaseForm() : this._renderScopedForm()}
            </div>
        `;
    }

    private get _scopeHasOwnConfig(): boolean {
        return Object.keys(this._scopeBucket()).length > 0;
    }

    /** Sections shown: base scope → primary + added; module/page → only configured + added. */
    private get _visibleSections(): IDsSection[] {
        if (this._isBaseScope) return dsSections.filter(s => s.primary || this._addedSections.has(s.key));
        return dsSections.filter(s => this._sectionRuleCount(s.key) > 0 || this._addedSections.has(s.key));
    }

    private _renderBaseForm() {
        return html`
            ${this._renderBanner(this.msg.scopeBannerLayout)}
            <div class="flex flex-col gap-2.5">
                ${this._visibleSections.map(sec => this._renderSectionDetails(sec))}
            </div>
            ${this._renderAddMore()}
            ${this._renderSaveButton()}
            ${this._renderSaveFeedback()}
        `;
    }

    private _renderScopedForm() {
        const showEditable = this._scopeHasOwnConfig || this._editingScope;
        const banner = this._scope === 'page' ? this.msg.scopeBannerPage : this.msg.scopeBannerModule;
        return html`
            ${this._renderBanner(banner)}
            ${showEditable ? this._renderScopeEditable() : this._renderScopeEmpty()}
            ${this._renderInheritedLevels()}
        `;
    }

    private _renderBanner(text: string) {
        return html`
            <div class="rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2">
                <span class="text-xs text-indigo-700 dark:text-indigo-300 leading-relaxed">${text}</span>
            </div>
        `;
    }

    private _renderScopeEditable() {
        return html`
            <div class="flex flex-col gap-2.5">
                ${this._visibleSections.map(sec => this._renderSectionDetails(sec))}
            </div>
            ${this._renderAddMore()}
            ${this._renderSaveButton()}
            ${this._renderSaveFeedback()}
        `;
    }

    private _renderScopeEmpty() {
        const isPage = this._scope === 'page';
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
                class="self-start mt-1 text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
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
            ${this._saved
                ? html`<div class="rounded-md border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/10 px-2.5 py-1.5 flex flex-col gap-0.5">
                    <span class="text-xs font-semibold text-emerald-700 dark:text-emerald-300">${this.msg.saved}</span>
                    <span class="text-[11px] text-emerald-600/80 dark:text-emerald-400/80">${this.msg.savedDesc}</span>
                </div>`
                : nothing}
        `;
    }

    // ── Read-only parent levels ──
    private _inheritedLevels(): { title: string; rules: Record<string, string> }[] {
        const levels: { title: string; rules: Record<string, string> }[] = [
            { title: this.msg.inheritedFromLayout, rules: this._rules ?? {} },
        ];
        if (this._scope === 'page') {
            const mod = this.module ?? '';
            levels.push({
                title: `${this.msg.inheritedFromModule}${mod ? ` · ${mod}` : ''}`,
                rules: this._moduleOverrides[mod] ?? {},
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
                        ? html`<div class="flex flex-wrap gap-1">${entries.map(([k, v]) => this._renderReadonlyChip(k, v))}</div>`
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
            <details class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900/40 overflow-hidden" ?open=${open}>
                <summary class="list-none [&::-webkit-details-marker]:hidden cursor-pointer select-none px-3 py-2.5 flex items-center gap-2"
                    @click=${(e: Event) => { e.preventDefault(); this._toggleSection(sec.key); }}>
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
        const current = this._axisValues[axis.key];
        const inherited = this._isBaseScope ? undefined : this._inherited[axis.key];
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
        const label = (!this._isBaseScope && inheritedValue !== undefined) ? this.msg.inheritLabel : this.msg.notSet;
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
                    @click=${() => { this._showAddMenu = !this._showAddMenu; this.requestUpdate(); }}
                ><span class="text-sm leading-none">+</span> ${this.msg.addMore}</button>
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

    private _renderNotice(text: string) {
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                <span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${text}</span>
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
        this._saved = false;
    }

    private _clearAxis(key: string): void {
        if (!(key in this._axisValues)) return;
        const next = { ...this._axisValues };
        delete next[key];
        this._axisValues = next;
        this._saved = false;
    }

    private async _onSave(): Promise<void> {
        if (!this.projectId || this.layout == null || this._saving) return;
        const rules: Record<string, string> = { ...this._axisValues };
        this._saving = true;
        this._saveError = '';
        try {
            await this._persist(this.projectId, this.layout, rules);
        } catch (err) {
            console.error('[selectLayoutRules] failed to save layout rules', err);
            this._saveError = this.msg.saveError;
            this._saving = false;
            return;
        }
        await this._load();
        this._saved = true;
        this._saving = false;
        this.dispatchEvent(new CustomEvent('save-layout-rules', {
            detail: { layout: this.layout, scope: this._scope, module: this.module, page: this.page, rules },
            bubbles: true,
            composed: true,
        }));
    }

    /**
     * Write into project.json → layouts[layout], in the bucket for the current scope:
     *   base   → rules
     *   module → moduleOverrides[module]
     *   page   → pageOverrides["{module}/{page}"]
     */
    private async _persist(projectId: number, layout: number, rules: Record<string, string>): Promise<void> {
        const config: any = await getConfigProject(projectId);
        if (!config) throw new Error('project config not found');
        const current = config.layouts;
        const layouts: Record<string, any> = (current && typeof current === 'object' && !Array.isArray(current)) ? current : {};
        const existing = layouts[layout] ?? {};

        if (this._scope === 'module') {
            if (!this.module) throw new Error('module scope requires a module');
            const moduleOverrides = { ...(existing.moduleOverrides ?? {}) };
            moduleOverrides[this.module] = rules;
            layouts[layout] = { ...existing, moduleOverrides };
        } else if (this._scope === 'page') {
            if (!this.module || !this.page) throw new Error('page scope requires module and page');
            const pageOverrides = { ...(existing.pageOverrides ?? {}) };
            pageOverrides[this._scopeKey] = rules;
            layouts[layout] = { ...existing, pageOverrides };
        } else {
            layouts[layout] = { ...existing, rules };
        }
        config.layouts = layouts;
        await updateConfigProject(projectId, config);
    }
}
