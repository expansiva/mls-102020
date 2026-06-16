/// <mls fileReference="_102020_/l2/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { dsSections, dsAxisList, type IDsAxisEntry, type IDsSection } from '/_102020_/l2/designSystemAuraBase.js';
import '/_102020_/l2/plugins/navHeader.js';

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
    addMore: 'Configure another group',
    rule: 'rule',
    rules: 'rules',
    noRules: 'nothing configured',
    save: 'Save design system',
    savedTitle: 'Design system ready',
    savedDesc: 'Only the groups you configured are part of this design system; everything else stays unconfigured.',
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
        addMore: 'Configurar outro grupo',
        rule: 'regra',
        rules: 'regras',
        noRules: 'nada configurado',
        save: 'Salvar design system',
        savedTitle: 'Design system pronto',
        savedDesc: 'Só os grupos que você configurou fazem parte deste design system; o resto fica sem configuração.',
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
        addMore: 'Configurar otro grupo',
        rule: 'regla',
        rules: 'reglas',
        noRules: 'nada configurado',
        save: 'Guardar design system',
        savedTitle: 'Design system listo',
        savedDesc: 'Solo los grupos que configuraste forman parte de este design system; el resto queda sin configurar.',
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
}

interface INewDs {
    dsIndex: number;
    name: string;
    description: string;
    designsystem: Record<string, string>;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-design-system-102020')
export class PluginSelectDesignSystem extends StateLitElement {

    @property({ attribute: false }) projectId: number | null = null;
    @property({ attribute: false }) value: number | null = null;

    @state() private _entries: IDsEntry[] = [];
    @state() private _loading: boolean = false;

    // ─── New design system form ──────────────────────────────────────
    @state() private _dsName: string = '';
    @state() private _dsDesc: string = '';
    // Only the axes the user explicitly configured. An absent axis = unconfigured
    // (it does NOT inherit a default — each DS stands on its own).
    @state() private _axisValues: Record<string, string> = {};
    @state() private _addedSections: Set<string> = new Set();
    @state() private _openSections: Set<string> = new Set(dsSections.filter(s => s.primary).map(s => s.key));
    @state() private _showAddMenu: boolean = false;
    @state() private _nameError: boolean = false;
    @state() private _savedDs: INewDs | null = null;

    connectedCallback() {
        super.connectedCallback();
        if (this.projectId) this._loadDsConfig(this.projectId);
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('projectId')) {
            this._entries = [];
            if (this.projectId) this._loadDsConfig(this.projectId);
            else this._dispatchConfig();
        }
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _customKey(): number {
        if (!this._entries.length) return 1;
        return this._entries[this._entries.length - 1].key + 1;
    }

    private get _isAll(): boolean { return this.value === 0; }
    private get _isCustom(): boolean { return this.value !== null && this.value === this._customKey; }
    private get _selectedEntry(): IDsEntry | null {
        if (this.value === null || this.value <= 0) return null;
        return this._entries.find(e => e.key === this.value) ?? null;
    }

    // ─── Loading ──────────────────────────────────────────────────────

    private async _loadDsConfig(projectId: number): Promise<void> {
        this._loading = true;
        this.requestUpdate();
        try {
            const mod = await import(`/_${projectId}_/l2/project.js`);
            const dsMap: Record<number, { name: string; skill: string }> = mod?.projectConfig?.designSystems ?? {};
            const keys = Object.keys(dsMap).map(Number).sort((a, b) => a - b);
            this._entries = keys.map(k => ({ key: k, name: dsMap[k].name, skill: dsMap[k].skill ?? '' }));
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
        labels[this._customKey] = '+';
        this.dispatchEvent(new CustomEvent('ds-config', {
            detail: { min: 0, max: this._customKey, labels },
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
        const max = this._customKey;
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
        const max = this._customKey;
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
                <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${entry.name}</span>
                    <span class="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500">#${entry.key}</span>
                </div>
            </div>
        `;
    }

    private _renderCustom() {
        const max = this._customKey;
        const visible = dsSections.filter(s => s.primary || this._addedSections.has(s.key));
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

                ${this._renderNameField()}
                ${this._renderDescField()}

                <div class="flex flex-col gap-2.5">
                    ${visible.map(sec => this._renderSectionDetails(sec))}
                </div>

                ${this._renderAddMore()}

                <button
                    class="
                        self-start mt-1 text-sm px-3 py-1.5 rounded-md
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors cursor-pointer
                    "
                    @click=${() => this._onSave()}
                >${this.msg.save}</button>

                ${this._savedDs ? this._renderSavedPreview(this._savedDs) : nothing}
            </div>
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
        const current = this._axisValues[axis.key]; // undefined = unconfigured
        return html`
            <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-gray-600 dark:text-gray-300">${axis.label}</span>
                <div class="flex flex-wrap gap-1.5">
                    ${this._renderClearChip(axis, current === undefined)}
                    ${axis.values.map(v => this._renderValueChip(axis, v, current === v))}
                </div>
            </div>
        `;
    }

    private _renderClearChip(axis: IDsAxisEntry, selected: boolean) {
        return html`
            <button
                class="text-xs px-2 py-1 rounded-md border border-dashed transition-colors cursor-pointer
                    ${selected
                        ? 'border-gray-400 dark:border-gray-500 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-medium'
                        : 'border-gray-200 dark:border-gray-800 bg-transparent text-gray-400 dark:text-gray-600 hover:border-gray-300 dark:hover:border-gray-600'}"
                @click=${() => this._clearAxis(axis.key)}
            >${this.msg.notSet}</button>
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
        const remaining = dsSections.filter(s => !s.primary && !this._addedSections.has(s.key));
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
        const entries = Object.entries(ds.designsystem);
        return html`
            <div class="rounded-lg border border-emerald-200 dark:border-emerald-800/40 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-2.5 flex flex-col gap-1.5">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-emerald-700 dark:text-emerald-300">${this.msg.savedTitle}</span>
                    <span class="ml-auto text-xs font-mono px-1.5 py-0.5 rounded bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400">#${ds.dsIndex}</span>
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

    private _onSave(): void {
        const name = this._dsName.trim();
        if (!name) { this._nameError = true; return; }

        // Each DS stands on its own: store ONLY the axes the user configured.
        // Unconfigured axes are simply absent — no inheritance from a default DS.
        const designsystem: Record<string, string> = { ...this._axisValues };

        const ds: INewDs = { dsIndex: this._customKey, name, description: this._dsDesc.trim(), designsystem };
        this._savedDs = ds;

        console.log('[selectDesignSystem] new design system', ds);
        this.dispatchEvent(new CustomEvent('save-ds', {
            detail: { ds },
            bubbles: true,
            composed: true,
        }));
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
