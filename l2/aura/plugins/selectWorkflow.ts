/// <mls fileReference="_102020_/l2/aura/plugins/selectWorkflow.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { loadModuleByBuild } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Workflows',
    desc: 'Business workflows of this project (l4). Source of truth for the generated pages.',
    allTitle: 'All Workflows',
    allDesc: 'All workflows found in l4/workflows.',
    noProject: 'No project selected.',
    noWorkflows: 'No workflows found for this project.',
    noResults: 'No workflows match your search.',
    searchPlaceholder: 'Search workflows…',
    page: 'Page',
    operations: 'Operations',
    actors: 'Actors',
    states: 'States',
    trigger: 'Trigger',
    mode: 'Mode',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Workflows',
        desc: 'Workflows de negócio deste projeto (l4). Fonte de verdade das páginas geradas.',
        allTitle: 'Todos os Workflows',
        allDesc: 'Todos os workflows encontrados em l4/workflows.',
        noProject: 'Nenhum projeto selecionado.',
        noWorkflows: 'Nenhum workflow encontrado para este projeto.',
        noResults: 'Nenhum workflow corresponde à sua busca.',
        searchPlaceholder: 'Buscar workflows…',
        page: 'Página',
        operations: 'Operações',
        actors: 'Atores',
        states: 'Estados',
        trigger: 'Gatilho',
        mode: 'Modo',
    },
    es: {
        title: 'Workflows',
        desc: 'Workflows de negocio de este proyecto (l4). Fuente de verdad de las páginas generadas.',
        allTitle: 'Todos los Workflows',
        allDesc: 'Todos los workflows encontrados en l4/workflows.',
        noProject: 'Ningún proyecto seleccionado.',
        noWorkflows: 'No se encontraron workflows para este proyecto.',
        noResults: 'Ningún workflow coincide con su búsqueda.',
        searchPlaceholder: 'Buscar workflows…',
        page: 'Página',
        operations: 'Operaciones',
        actors: 'Actores',
        states: 'Estados',
        trigger: 'Disparador',
        mode: 'Modo',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IWorkflowEntry {
    id: string;
    title: string;
    pageId: string;
    operationIds: string[];
    actors: string[];
    states: string[];
    executionMode: string;
    trigger: string;
    file: mls.stor.IFileInfo;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-workflow-102020')
export class PluginSelectWorkflow extends StateLitElement {

    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) reloadToken: number = 0;

    @state() private _workflows: IWorkflowEntry[] = [];
    @state() private _search: string = '';

    connectedCallback() {
        super.connectedCallback();
        this._loadWorkflows();
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('reloadToken')) {
            this._search = '';
            this._loadWorkflows();
        }
        if (changed.has('value')) this._search = '';
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean { return this.value === 0 || this.value === null; }
    private get _selectedWorkflow(): IWorkflowEntry | null {
        if (this.value === null || this.value <= 0 || this.value > this._workflows.length) return null;
        return this._workflows[this.value - 1];
    }

    // ─── Data Loading ─────────────────────────────────────────────────

    /** Workflows from l4/workflows/*.defs.ts (stor scan + module import, like selectRule). */
    private async _loadWorkflows(): Promise<void> {
        this._workflows = [];
        const project = getAuraState().actualProject;
        if (!project) {
            this._dispatchConfig();
            return;
        }

        const files = (Object.values(mls.stor.files) as any[]).filter(f =>
            f && f.project === project && f.level === 4 && f.status !== 'deleted'
            && String(f.folder || '') === 'workflows' && f.extension === '.defs.ts'
            && typeof f.shortName === 'string' && f.shortName,
        );

        const entries = await Promise.all(files.map(async (f): Promise<IWorkflowEntry | null> => {
            const ref = `l4/workflows/${f.shortName}.defs`;
            let mod: any = null;
            try { mod = await import(`/_${project}_/${ref}.js`); } catch { mod = null; }
            const def = this._extractWorkflow(mod)
                ?? this._extractWorkflow(await loadModuleByBuild(`_${project}_/${ref}.ts`).catch(() => null));
            if (!def) return null;
            return {
                id: String(def.workflowId ?? f.shortName),
                title: String(def.title ?? def.workflowId ?? f.shortName),
                pageId: String(def.pageId ?? ''),
                operationIds: Array.isArray(def.operationIds) ? def.operationIds.map(String) : [],
                actors: Array.isArray(def.actors) ? def.actors.map(String) : [],
                states: Array.isArray(def.states) ? def.states.map(String) : [],
                executionMode: String(def.executionMode ?? ''),
                trigger: String(def.trigger ?? ''),
                file: { project: f.project, folder: f.folder, shortName: f.shortName, level: f.level, extension: f.extension } as mls.stor.IFileInfo,
            };
        }));

        this._workflows = entries
            .filter((e): e is IWorkflowEntry => !!e)
            .sort((a, b) => a.title.localeCompare(b.title));

        this._dispatchConfig();
        this.requestUpdate();
    }

    /** The defs export a single workflow object (named `workflow<Id>`, no default). */
    private _extractWorkflow(mod: any): any | null {
        if (!mod) return null;
        if (mod.default && typeof mod.default === 'object' && 'workflowId' in mod.default) return mod.default;
        for (const value of Object.values(mod)) {
            if (value && typeof value === 'object' && 'workflowId' in (value as any)) return value;
        }
        return null;
    }

    private _dispatchConfig() {
        const labels: Record<number, string> = { 0: 'All' };
        this._workflows.forEach((w, i) => { labels[i + 1] = w.title; });
        this.dispatchEvent(new CustomEvent('workflow-config', {
            detail: {
                min: 0,
                max: this._workflows.length,
                labels,
                workflows: this._workflows.map(w => ({ id: w.id, title: w.title, file: w.file })),
            },
            bubbles: true,
            composed: true,
        }));
    }

    // Selection is visual only for now (D3 open: open defs in the editor vs jump
    // to the linked page in the genome). The service just tracks the knob value.
    private _dispatchSelect(value: number) {
        const entry = value > 0 && value <= this._workflows.length ? this._workflows[value - 1] : null;
        this.dispatchEvent(new CustomEvent('select-workflow', {
            detail: { value, workflowId: entry?.id ?? null, file: entry?.file ?? null },
            bubbles: true,
            composed: true,
        }));
    }

    // ─── Render ───────────────────────────────────────────────────────

    createRenderRoot() { return this; }

    render() {
        const project = getAuraState().actualProject;
        if (!project) return this._renderMessage(this.msg.noProject);
        if (this._isAll) return this._renderAll();
        return this._renderSelected();
    }

    private _renderHeader(itemName: string, desc: string, value: number) {
        return html`
            <aura--plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${desc}
                .value=${value}
                .min=${0}
                .max=${this._workflows.length}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></aura--plugins--nav-header-102020>
        `;
    }

    private _renderMessage(text: string) {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.msg.allTitle, this.msg.desc, 0)}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${text}</span>
                </div>
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._workflows
            .map((w, i) => ({ w, selectValue: i + 1 }))
            .filter(({ w }) => !q || w.title.toLowerCase().includes(q) || w.id.toLowerCase().includes(q));

        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.msg.allTitle, this.msg.allDesc, 0)}

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

                ${this._workflows.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noWorkflows}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ w, selectValue }) => this._renderWorkflowCard(w, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderWorkflowCard(workflow: IWorkflowEntry, selectValue: number) {
        return html`
            <div
                class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    hover:bg-gray-100 dark:hover:bg-gray-800/70
                    px-3 py-2.5 flex flex-col gap-1.5
                    cursor-pointer transition-colors
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                <div class="flex items-baseline gap-2 min-w-0">
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">${workflow.title}</span>
                    <span class="ml-auto text-[10px] font-mono text-gray-400 dark:text-gray-600 shrink-0">${workflow.id}</span>
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    ${workflow.pageId ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            ${this.msg.page}: ${workflow.pageId}
                        </span>` : nothing}
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        ${workflow.operationIds.length} ${this.msg.operations.toLowerCase()}
                    </span>
                    <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                        ${workflow.states.length} ${this.msg.states.toLowerCase()}
                    </span>
                </div>
            </div>
        `;
    }

    private _renderSelected() {
        const workflow = this._selectedWorkflow;
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(workflow?.title ?? '', this.msg.desc, this.value ?? 0)}
                ${workflow ? this._renderWorkflowDetail(workflow) : nothing}
            </div>
        `;
    }

    private _renderWorkflowDetail(workflow: IWorkflowEntry) {
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-baseline gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${workflow.title}</span>
                    <span class="ml-auto text-[10px] font-mono text-gray-400 dark:text-gray-500">${workflow.id}</span>
                </div>
                ${workflow.trigger ? html`
                    <div class="flex flex-col">
                        <span class="text-xs text-gray-400 dark:text-gray-600">${this.msg.trigger}</span>
                        <span class="text-xs text-gray-600 dark:text-gray-300">${workflow.trigger}</span>
                    </div>` : nothing}
                <div class="flex items-center gap-1 flex-wrap">
                    ${workflow.pageId ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            ${this.msg.page}: ${workflow.pageId}
                        </span>` : nothing}
                    ${workflow.executionMode ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            ${this.msg.mode}: ${workflow.executionMode}
                        </span>` : nothing}
                </div>
                ${this._renderChipList(this.msg.operations, workflow.operationIds, 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400')}
                ${this._renderChipList(this.msg.actors, workflow.actors, 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400')}
                ${this._renderChipList(this.msg.states, workflow.states, 'bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400')}
            </div>
        `;
    }

    private _renderChipList(label: string, items: string[], chipClass: string) {
        if (!items.length) return nothing;
        return html`
            <div class="flex flex-col gap-1">
                <span class="text-xs text-gray-400 dark:text-gray-600">${label}</span>
                <div class="flex items-center gap-1 flex-wrap">
                    ${items.map(item => html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full ${chipClass}">${item}</span>
                    `)}
                </div>
            </div>
        `;
    }
}
