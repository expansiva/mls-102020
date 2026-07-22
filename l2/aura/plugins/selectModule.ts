/// <mls fileReference="_102020_/l2/aura/plugins/selectModule.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { setLastModule, openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { getAuraState, setAuraState, saveAuraProject } from '/_102020_/l2/aura/helpers/auraState.js';
import { listVariationsStatus, type ModuleVariationStatus, type PageVariationStatus } from '/_102020_/l2/aura/helpers/dsMatch/variationStatus.js';
import { setTask, getTask, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import { getState, setState } from '/_102029_/l2/collabState.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Module',
    desc: 'A module organizes the project source files into logical areas, each with its own pages, components, and shared code.',
    allTitle: 'All Modules',
    allDesc: 'Overview of all modules in this project.',
    customTitle: 'New Module',
    customDesc: 'Add a new module to organize a new area of the project.',
    noModules: 'No modules found in this project.',
    noResults: 'No modules match your search.',
    createNew: 'New Module',
    searchPlaceholder: 'Search modules…',
    inDevelopment: 'In development',
    selectBtn: 'Select Module',
    actualModule: 'actual module',
    variationsTitle: 'Variations',
    variationsLoading: 'Checking variations…',
    variationsError: 'Could not load the variations.',
    statusFresh: 'up to date',
    statusMaterialize: 'materialize pending',
    statusGeneration: 'generation pending',
    statusStale: 'outdated',
    generateVariation: 'Generate variation',
    materializeVariation: 'Materialize',
    variationRunning: 'Running…',
    variationDone: 'Task finished',
    orphanLabel: 'orphan',
    pagesWord: 'pages',
    followTask: 'Follow task',
    useMoleculesLabel: 'Use molecules',
    useMoleculesHint: 'When off, pages get only the configured layout rules (no web components).',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Módulo',
        desc: 'Um módulo organiza os arquivos fonte do projeto em áreas lógicas, cada uma com suas próprias páginas, componentes e código compartilhado.',
        allTitle: 'Todos os Módulos',
        allDesc: 'Visão geral de todos os módulos deste projeto.',
        customTitle: 'Novo Módulo',
        customDesc: 'Adicione um novo módulo para organizar uma nova área do projeto.',
        noModules: 'Nenhum módulo encontrado neste projeto.',
        noResults: 'Nenhum módulo corresponde à sua busca.',
        createNew: 'Novo Módulo',
        searchPlaceholder: 'Buscar módulos…',
        inDevelopment: 'Em desenvolvimento',
        selectBtn: 'Selecionar Módulo',
        actualModule: 'módulo atual',
        variationsTitle: 'Variações',
        variationsLoading: 'Verificando variações…',
        variationsError: 'Não foi possível carregar as variações.',
        statusFresh: 'atualizado',
        statusMaterialize: 'pendente materialize',
        statusGeneration: 'pendente geração',
        statusStale: 'desatualizada',
        generateVariation: 'Gerar variação',
        materializeVariation: 'Materializar',
        variationRunning: 'Executando…',
        variationDone: 'Task concluída',
        orphanLabel: 'órfã',
        pagesWord: 'páginas',
        followTask: 'Acompanhar task',
        useMoleculesLabel: 'Usar moléculas',
        useMoleculesHint: 'Quando desligado, as páginas recebem apenas as regras de layout configuradas (sem web components).',
    },
    es: {
        title: 'Módulo',
        desc: 'Un módulo organiza los archivos fuente del proyecto en áreas lógicas, cada una con sus propias páginas, componentes y código compartido.',
        allTitle: 'Todos los Módulos',
        allDesc: 'Visión general de todos los módulos de este proyecto.',
        customTitle: 'Nuevo Módulo',
        customDesc: 'Añade un nuevo módulo para organizar una nueva área del proyecto.',
        noModules: 'No se encontraron módulos en este proyecto.',
        noResults: 'Ningún módulo coincide con su búsqueda.',
        createNew: 'Nuevo Módulo',
        searchPlaceholder: 'Buscar módulos…',
        inDevelopment: 'En desarrollo',
        selectBtn: 'Seleccionar Módulo',
        actualModule: 'módulo actual',
        variationsTitle: 'Variaciones',
        variationsLoading: 'Verificando variaciones…',
        variationsError: 'No se pudieron cargar las variaciones.',
        statusFresh: 'actualizado',
        statusMaterialize: 'materialize pendiente',
        statusGeneration: 'generación pendiente',
        statusStale: 'desactualizada',
        generateVariation: 'Generar variación',
        materializeVariation: 'Materializar',
        variationRunning: 'Ejecutando…',
        variationDone: 'Tarea finalizada',
        orphanLabel: 'huérfana',
        pagesWord: 'páginas',
        followTask: 'Seguir tarea',
        useMoleculesLabel: 'Usar moléculas',
        useMoleculesHint: 'Cuando está desactivado, las páginas reciben solo las reglas de layout configuradas (sin web components).',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-module-102020')
export class PluginSelectModule extends StateLitElement {

    @property({ attribute: false }) modules: IModule[] = [];
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) reloadToken: number = 0;

    @state() private _search: string = '';

    // ─── Variations panel state ───────────────────────────────────────
    @state() private _variations: ModuleVariationStatus[] | null = null;
    @state() private _varsLoading: boolean = false;
    @state() private _varsError: boolean = false;
    @state() private _expandedVariation: string | null = null;
    private _varsLoadedFor: string | null = null;
    private _varsLoadSeq = 0;
    private _threadCache = new Map<string, Promise<any>>();
    private _taskInfoByKey = new Map<string, { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }>();
    private _unsubTasks: (() => void) | undefined;

    connectedCallback() {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value')) this._search = '';
        // Service (re)open bumps the token: drop the guard so the stor is re-checked
        // (files may have been deleted/created outside this panel).
        if (changed.has('reloadToken')) this._varsLoadedFor = null;
        this._maybeLoadVariations();
    }

    private get msg(): MessageType {
        const lang = this.getMessageKey(messages);
        return messages[lang];
    }

    private get _isAll(): boolean {
        return this.value === 0;
    }

    private get _isCustom(): boolean {
        return this.value !== null && this.value > this.modules.length;
    }

    private get _selectedModule(): IModule | null {
        if (this.value === null || this.value <= 0 || this.value > this.modules.length) return null;
        return this.modules[this.value - 1];
    }

    private _doSelectModule(name: string) {
        const actualPrj = getAuraState().actualProject
        if (!actualPrj) return;
        setLastModule(actualPrj, name);
        mls.setActualModule(name);
        setAuraState('actualModule', name);
        saveAuraProject();
        this.requestUpdate();
    }

    createRenderRoot() { return this; }

    render() {
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderSelected() {
        const module = this._selectedModule;
        const max = this.modules.length + 1;
        const isActual = module !== null && getAuraState().actualModule === module.name;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${module?.name ?? ''}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                ${module
                    ? isActual
                        ? html`<span class="
                            self-end text-sm px-2 py-0.5 rounded-full font-medium
                            bg-emerald-100 dark:bg-emerald-900/30
                            text-emerald-600 dark:text-emerald-400
                        ">${this.msg.actualModule}</span>`
                        : html`<button
                            class="
                                self-end text-sm px-2.5 py-1 rounded
                                bg-indigo-500 dark:bg-indigo-600 text-white
                                hover:bg-indigo-600 dark:hover:bg-indigo-500
                                transition-colors whitespace-nowrap cursor-pointer
                            "
                            @click=${() => this._doSelectModule(module.name)}
                        >${this.msg.selectBtn}</button>`
                    : nothing}
                ${module ? this._renderModuleDetail(module) : nothing}
                ${module ? this._renderVariationsPanel(module) : nothing}
            </div>
        `;
    }

    // ─── Variations panel ─────────────────────────────────────────────
    // Consolidated per-variation (page{layout}{ds}) status of the selected module,
    // with the pending action (generate / materialize) per variation.

    private _maybeLoadVariations(): void {
        const module = this._selectedModule;
        if (!module) {
            this._varsLoadedFor = null;
            this._variations = null;
            return;
        }
        const device = getAuraState().actualDevice ?? 'web/desktop';
        const key = `${module.name}|${device}`;
        if (key === this._varsLoadedFor) return;
        this._varsLoadedFor = key;
        this._expandedVariation = null;
        this._loadVariations(module.name, device);
    }

    private _reloadVariations(): void {
        this._varsLoadedFor = null;
        this._maybeLoadVariations();
    }

    private async _loadVariations(moduleName: string, device: string): Promise<void> {
        const seq = ++this._varsLoadSeq;
        this._varsLoading = true;
        this._varsError = false;
        this._variations = null;
        const project = getAuraState().actualProject;
        if (!project) { this._varsLoading = false; return; }
        try {
            const variations = await listVariationsStatus(project, moduleName, device);
            if (seq !== this._varsLoadSeq) return; // superseded by a newer load
            this._variations = variations;
        } catch {
            if (seq !== this._varsLoadSeq) return;
            this._varsError = true;
        } finally {
            if (seq === this._varsLoadSeq) this._varsLoading = false;
        }
    }

    private _statusLabel(status: PageVariationStatus): string {
        switch (status) {
            case 'generation': return this.msg.statusGeneration;
            case 'materialize': return this.msg.statusMaterialize;
            case 'stale': return this.msg.statusStale;
            default: return this.msg.statusFresh;
        }
    }

    private _statusChipClass(status: PageVariationStatus): string {
        switch (status) {
            case 'generation': return 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400';
            case 'materialize': return 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400';
            case 'stale': return 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400';
            default: return 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400';
        }
    }

    private _renderVariationsPanel(module: IModule) {
        const useMolecules = getAuraState().useMolecules ?? true;
        return html`
            <div class="flex flex-col gap-1.5">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${this.msg.variationsTitle}</span>
                <label class="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300 cursor-pointer" title=${this.msg.useMoleculesHint}>
                    <input
                        type="checkbox"
                        class="cursor-pointer"
                        .checked=${useMolecules}
                        @change=${(e: Event) => this._onToggleUseMolecules((e.target as HTMLInputElement).checked)}
                    />
                    <span>${this.msg.useMoleculesLabel}</span>
                </label>
                ${this._varsLoading
                    ? html`<span class="text-xs text-gray-400 dark:text-gray-500 italic">${this.msg.variationsLoading}</span>`
                    : nothing}
                ${this._varsError
                    ? html`<span class="text-xs text-red-500 dark:text-red-400">${this.msg.variationsError}</span>`
                    : nothing}
                ${this._variations?.map(v => this._renderVariationRow(module, v)) ?? nothing}
            </div>
        `;
    }

    private _onToggleUseMolecules(checked: boolean): void {
        setAuraState('useMolecules', checked);
        saveAuraProject();
        this.requestUpdate();
    }

    private _renderVariationRow(module: IModule, v: ModuleVariationStatus) {
        const taskKey = `variation:${module.name}:${v.variation}`;
        const task = getTask(taskKey);
        const running = task?.status === 'running';
        const total = v.pages.length;
        const affected = v.counts[v.status] ?? 0;
        const expanded = this._expandedVariation === v.variation;
        const needsMaterialize = v.status === 'materialize';
        const needsGenerate = v.status === 'generation' || v.status === 'stale';

        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2 flex flex-col gap-1.5">
                <div
                    class="flex items-center gap-2 cursor-pointer"
                    @click=${() => { this._expandedVariation = expanded ? null : v.variation; }}
                >
                    <span class="text-sm font-mono font-semibold text-gray-700 dark:text-gray-200">${v.variation}</span>
                    <span class="text-xs text-gray-400 dark:text-gray-500 truncate">${v.layoutName} · ${v.dsName}</span>
                    ${v.orphan ? html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            ${this.msg.orphanLabel}
                        </span>` : nothing}
                    <span class="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${this._statusChipClass(v.status)}">
                        ${this._statusLabel(v.status)}${v.status !== 'fresh' && total ? ` (${affected}/${total} ${this.msg.pagesWord})` : ''}
                    </span>
                </div>
                ${expanded ? html`
                    ${total ? html`
                        <div class="flex flex-col gap-1 pl-1">
                            ${v.pages.map(p => html`
                                <div class="flex items-center gap-2">
                                    <span class="text-xs text-gray-600 dark:text-gray-300 truncate">${p.page}</span>
                                    <span class="ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${this._statusChipClass(p.status)}">
                                        ${this._statusLabel(p.status)}
                                    </span>
                                </div>
                            `)}
                        </div>
                    ` : nothing}
                    ${needsGenerate || needsMaterialize ? html`
                        <button
                            class="
                                self-start text-xs px-2.5 py-1 rounded
                                bg-indigo-500 dark:bg-indigo-600 text-white
                                hover:bg-indigo-600 dark:hover:bg-indigo-500
                                disabled:opacity-50 disabled:cursor-not-allowed
                                transition-colors cursor-pointer
                            "
                            ?disabled=${running}
                            @click=${(e: Event) => { e.stopPropagation(); this._onVariationAction(module, v); }}
                        >${running ? this.msg.variationRunning : needsMaterialize ? this.msg.materializeVariation : this.msg.generateVariation}</button>
                    ` : nothing}
                ` : nothing}
                ${task ? html`
                    <div class="flex items-center gap-2 text-xs">
                        ${task.status === 'running' ? html`<span class="text-indigo-500 dark:text-indigo-400 italic">${this.msg.variationRunning}</span>` : nothing}
                        ${task.status === 'done' ? html`<span class="text-emerald-600 dark:text-emerald-400">✓ ${this.msg.variationDone}</span>` : nothing}
                        ${task.status === 'error' ? html`<span class="text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>` : nothing}
                        ${this._taskInfoByKey.get(taskKey)?.task ? html`
                            <button class="ml-auto text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${(e: Event) => { e.stopPropagation(); this._openTask(taskKey); }}>${this.msg.followTask}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
            </div>
        `;
    }

    // Generate (agentImplementGenome + materialize) or materialize-only, per variation —
    // same shape as selectPage's _onRegenerate, but scoped to the missing/stale pages.
    private async _onVariationAction(module: IModule, v: ModuleVariationStatus): Promise<void> {
        const taskKey = `variation:${module.name}:${v.variation}`;
        if (getTask(taskKey)?.status === 'running') return;
        // The agent's `device` is the segment after web/ (e.g. 'desktop'); aura stores 'web/desktop'.
        const device = (getAuraState().actualDevice ?? 'web/desktop').replace(/^web\//, '') || 'desktop';
        const asIndex = (x: number | string) => Number.isFinite(Number(x)) ? Number(x) : x;

        setTask(taskKey, { status: 'running', startedAt: Date.now() });
        // Pause the preview while the agent rewrites the defs (avoids repaint thrash); restore after.
        const prevPause = getState('preview.pausePreview');
        // Surface "Follow task" as soon as the primary agent task exists.
        const trackTask = (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => {
            this._taskInfoByKey.set(taskKey, data);
            this.requestUpdate();
        };
        try {
            if (v.status === 'materialize') {
                // Defs already written — only the rendered .ts pages are missing.
                await this._executeAgent('agentMaterializeL2', '{}', trackTask);
            } else {
                const pages = v.pages
                    .filter(p => p.status === 'generation' || p.status === 'stale')
                    .map(p => p.page);
                const prompt = JSON.stringify({
                    module: module.name,
                    layout: asIndex(v.layout),
                    ds: asIndex(v.ds),
                    device,
                    pages,
                    materialize: true,
                    useMolecules: getAuraState().useMolecules ?? true,
                });
                setState('preview.pausePreview', true);
                await this._executeAgent('agentImplementGenome', prompt, trackTask);
                // Unpause before materialize so the .ts writes repaint the preview.
                setState('preview.pausePreview', prevPause ?? false);
                await this._executeAgent('agentMaterializeL2', '{}');
            }
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (e: any) {
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: e?.message });
        } finally {
            setState('preview.pausePreview', prevPause ?? false);
            this._reloadVariations();
        }
    }

    private async _executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
    ): Promise<void> {
        // Thread host: selectModule lives in serviceProject.
        const fullName = '_102020_/l2/serviceProject';
        let threadPromise = this._threadCache.get(fullName);
        if (!threadPromise) {
            threadPromise = (async () => {
                let thread = await getThreadByName(fullName);
                if (!thread) thread = await createThread(fullName, [], 'company');
                return thread;
            })();
            this._threadCache.set(fullName, threadPromise);
        }
        const thread = await threadPromise;
        const userId = getUserId();
        const threadId = thread?.threadId;
        if (!userId || !threadId) return;

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);

        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                onTaskCreated?.({ taskId: event.taskId, task: event.task, message: event.message });
            }
        }
    }

    private async _openTask(taskKey: string): Promise<void> {
        const info = this._taskInfoByKey.get(taskKey);
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', info.message?.createAt ?? '');
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    private _renderModuleDetail(module: IModule) {
        return html`
            <div class="
                rounded-lg border border-gray-200 dark:border-gray-800
                bg-gray-50 dark:bg-gray-900/50
                px-3 py-2.5
            ">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${module.name}</span>
                    <span
                        class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                        style="max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                    >${module.path}</span>
                </div>
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const actualModule = getAuraState().actualModule;
        const filtered = this.modules
            .map((m, i) => ({ m, selectValue: i + 1 }))
            .filter(({ m }) => !q || m.name.toLowerCase().includes(q) || m.path.toLowerCase().includes(q))
            .sort((a, b) => {
                if (a.m.name === actualModule) return -1;
                if (b.m.name === actualModule) return 1;
                return 0;
            });
        const max = this.modules.length + 1;

        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.allTitle}
                    .desc=${this.msg.allDesc}
                    .value=${0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                <button
                    class="
                        self-end text-sm px-2.5 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap
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

                ${this.modules.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noModules}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ m, selectValue }) => this._renderModuleCard(m, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this.modules.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg.customTitle}
                    .desc=${this.msg.customDesc}
                    .value=${max}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
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

    private _renderModuleCard(module: IModule, selectValue: number) {
        const isActive = getAuraState().actualModule === module.name;
        return html`
            <div
                class="
                    rounded-lg border
                    ${isActive
                        ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/70'}
                    px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                ${isActive ? html`<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"></div>` : nothing}
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${module.name}</span>
                <span
                    class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                    style="max-width:150px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                >${module.path}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-module', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
