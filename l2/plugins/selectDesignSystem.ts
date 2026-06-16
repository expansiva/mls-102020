/// <mls fileReference="_102020_/l2/plugins/selectDesignSystem.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { dsSections, essentialAxisList, dsAxisList, dsDefaults, type IDsAxisEntry, type IDsSection } from '/_102020_/l2/designSystemAuraBase.js';
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
    axesHint: 'Pick a value for each axis. Highlighted values are the defaults.',
    showAll: 'Show all axes',
    showEssential: 'Show essential only',
    defaultTag: 'default',
    save: 'Save design system',
    savedTitle: 'Design system ready',
    savedDesc: 'Only values that differ from the default are stored; the rest fall back automatically.',
    sections: {
        transversal: 'General',
        input: 'Input',
        selection: 'Selection',
        navigation: 'Navigation',
        feedback: 'Feedback & status',
        action: 'Action & content',
        visualization: 'Visualization',
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
        axesHint: 'Escolha um valor para cada eixo. Os valores destacados são os padrões.',
        showAll: 'Mostrar todos os eixos',
        showEssential: 'Mostrar só os essenciais',
        defaultTag: 'padrão',
        save: 'Salvar design system',
        savedTitle: 'Design system pronto',
        savedDesc: 'Só os valores diferentes do padrão são guardados; o resto usa o padrão automaticamente.',
        sections: {
            transversal: 'Geral',
            input: 'Entrada',
            selection: 'Seleção',
            navigation: 'Navegação',
            feedback: 'Feedback e status',
            action: 'Ação e conteúdo',
            visualization: 'Visualização',
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
        axesHint: 'Elige un valor para cada eje. Los valores resaltados son los predeterminados.',
        showAll: 'Mostrar todos los ejes',
        showEssential: 'Mostrar solo los esenciales',
        defaultTag: 'predet.',
        save: 'Guardar design system',
        savedTitle: 'Design system listo',
        savedDesc: 'Solo se guardan los valores distintos del predeterminado; el resto usa el predeterminado automáticamente.',
        sections: {
            transversal: 'General',
            input: 'Entrada',
            selection: 'Selección',
            navigation: 'Navegación',
            feedback: 'Feedback y estado',
            action: 'Acción y contenido',
            visualization: 'Visualización',
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
    extends: number | null;
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
    @state() private _axisValues: Record<string, string> = dsDefaults();
    @state() private _showAll: boolean = false;
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
        const axes = this._showAll ? dsAxisList : essentialAxisList;
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

                <div class="flex items-center justify-between gap-2">
                    <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed">${this.msg.axesHint}</span>
                    <button
                        class="shrink-0 text-[11px] px-2 py-1 rounded-md border border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                        @click=${() => { this._showAll = !this._showAll; }}
                    >${this._showAll ? this.msg.showEssential : this.msg.showAll}</button>
                </div>

                <div class="flex flex-col gap-4">
                    ${dsSections.map(sec => this._renderSection(sec, axes.filter(a => a.section === sec.key)))}
                </div>

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

    private _renderSection(sec: IDsSection, axes: readonly IDsAxisEntry[]) {
        if (!axes.length) return nothing;
        const label = this.msg.sections[sec.key] ?? sec.label;
        return html`
            <div class="flex flex-col gap-2.5">
                <span class="text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">${label}</span>
                ${axes.map(a => this._renderAxis(a))}
            </div>
        `;
    }

    private _renderAxis(axis: IDsAxisEntry) {
        const current = this._axisValues[axis.key] ?? axis.default;
        return html`
            <div class="flex flex-col gap-1">
                <span class="text-xs font-medium text-gray-600 dark:text-gray-300">${axis.label}</span>
                <div class="flex flex-wrap gap-1.5">
                    ${axis.values.map(v => this._renderValueChip(axis, v, current))}
                </div>
            </div>
        `;
    }

    private _renderValueChip(axis: IDsAxisEntry, value: string, current: string) {
        const selected = value === current;
        const isDefault = value === axis.default;
        return html`
            <button
                class="
                    text-xs px-2 py-1 rounded-md border transition-colors cursor-pointer
                    flex items-center gap-1
                    ${selected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
                        : 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-600'}
                "
                @click=${() => this._setAxis(axis.key, value)}
            >
                <span>${this._humanize(value)}</span>
                ${isDefault
                    ? html`<span class="text-[9px] uppercase tracking-wide ${selected ? 'text-indigo-400 dark:text-indigo-400' : 'text-gray-300 dark:text-gray-600'}">${this.msg.defaultTag}</span>`
                    : nothing}
            </button>
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

    private _setAxis(key: string, value: string): void {
        this._axisValues = { ...this._axisValues, [key]: value };
        this._savedDs = null;
    }

    private _onSave(): void {
        const name = this._dsName.trim();
        if (!name) { this._nameError = true; return; }

        // Store only the delta from the defaults; omitted axes fall back automatically.
        const designsystem: Record<string, string> = {};
        for (const axis of dsAxisList) {
            const v = this._axisValues[axis.key];
            if (v && v !== axis.default) designsystem[axis.key] = v;
        }

        const ds: INewDs = { dsIndex: this._customKey, name, extends: null, designsystem };
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
