/// <mls fileReference="_102020_/l2/aura/plugins/selectLanguage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { readModuleDefaultLanguage, readModuleDefsLanguages, readModuleLanguages, writeConfigModuleLanguages, writeModuleLanguages } from '/_102020_/l2/aura/helpers/moduleLanguages.js';
import { repairBrokenPages, scanModuleForLanguages } from '/_102020_/l2/aura/agentManageLanguages/helpers/moduleLanguageScan.js';
import { isPlanActionable } from '/_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.js';
import type { ModuleLanguagePlan, ModuleLanguagePlanKind } from '/_102020_/l2/aura/agentManageLanguages/helpers/addLanguageCore.js';
import { runWithConcurrency } from '/_102020_/l2/aura/helpers/runWithConcurrency.js';
import { getConfigProject } from '/_102027_/l2/libProjectConfig.js';
import { languages as allLanguages, findLanguageByCode, ICollabLanguage } from '/_102027_/l2/collabLanguages.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { getActualLanguage, setActualLanguage, saveAuraProject } from '/_102020_/l2/aura/helpers/auraState.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { ITask, setTask, getTask, getTasksByScope, hasRunning, hasPending, clearScope, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Language',
    desc: 'The language defines the locale used for i18n content generation. Each language produces translated variations of the module pages.',
    needsProject: 'Select a project first to see the available languages.',
    needsModule: 'Select a module first to see the available languages.',
    allTitle: 'All Languages',
    allDesc: 'Languages configured for this module.',
    customTitle: 'Add Language',
    customDesc: 'Add a new language to this module.',
    noLanguages: 'No languages configured for this module.',
    noResults: 'No languages match your search.',
    searchPlaceholder: 'Search languages…',
    add: 'Add',
    loading: 'Loading languages…',
    createNew: 'Add Language',
    removeTitle: 'Remove Language',
    removeDesc: 'This language will be permanently removed from the selected module.',
    removeBtn: 'Remove',
    followTask: 'Follow task',
    scopeModule: 'Current module only:',
    scopeAll: 'All project modules ({n})',
    presentIn: 'in {x}/{n}',
    previewLoading: 'Checking modules…',
    previewSummary: 'Will run in {x} of {n} modules · {p} pages to translate',
    nothingToDo: 'Nothing to do: every module is ignored or already has the language.',
    kindNoDefs: 'ignored: no module.defs.ts',
    kindNoPages: 'ignored: no pages',
    kindComplete: 'already has it',
    kindConfigOnly: 'add (configuration only)',
    kindAdd: 'add ({n} pages)',
    kindCompleteTranslation: 'complete translation ({n} pages)',
    statusQueued: 'queued',
    statusRunning: 'processing…',
    resultConfigOnly: 'configuration updated',
    resultDone: 'done',
    resultPending: 'done with {n} pages pending',
    retry: 'Run again',
    retryFailed: 'Run again the failed ones ({n})',
    stalled: 'no progress for {m} min — stopped waiting',
    fixBroken: 'fix {n} pages with an invalid block',
    resultRepaired: '{n} pages fixed',
    syncRuntime: 'update the app languages',
    resultRuntime: 'app languages updated (publish to see them)',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Idioma',
        desc: 'O idioma define o locale usado para geração de conteúdo i18n. Cada idioma produz variações traduzidas das páginas do módulo.',
        needsProject: 'Selecione um projeto primeiro para ver os idiomas disponíveis.',
        needsModule: 'Selecione um módulo primeiro para ver os idiomas.',
        allTitle: 'Todos os Idiomas',
        allDesc: 'Idiomas configurados neste módulo.',
        customTitle: 'Adicionar Idioma',
        customDesc: 'Adicione um novo idioma a este módulo.',
        noLanguages: 'Nenhum idioma configurado neste módulo.',
        noResults: 'Nenhum idioma corresponde à sua busca.',
        searchPlaceholder: 'Buscar idiomas…',
        add: 'Adicionar',
        loading: 'Carregando idiomas…',
        createNew: 'Adicionar Idioma',
        removeTitle: 'Remover Idioma',
        removeDesc: 'Este idioma será removido permanentemente do módulo selecionado.',
        removeBtn: 'Remover',
        followTask: 'Acompanhar task',
        scopeModule: 'Somente módulo atual:',
        scopeAll: 'Todos os módulos do projeto ({n})',
        presentIn: 'em {x}/{n}',
        previewLoading: 'Verificando módulos…',
        previewSummary: 'Vai rodar em {x} de {n} módulos · {p} páginas para traduzir',
        nothingToDo: 'Nada a fazer: todos os módulos foram ignorados ou já possuem o idioma.',
        kindNoDefs: 'ignorado: sem module.defs.ts',
        kindNoPages: 'ignorado: sem páginas',
        kindComplete: 'já possui',
        kindConfigOnly: 'adicionar (só configuração)',
        kindAdd: 'adicionar ({n} páginas)',
        kindCompleteTranslation: 'completar tradução ({n} páginas)',
        statusQueued: 'na fila',
        statusRunning: 'processando…',
        resultConfigOnly: 'configuração atualizada',
        resultDone: 'concluído',
        resultPending: 'concluído com {n} páginas pendentes',
        retry: 'Rodar novamente',
        retryFailed: 'Rodar novamente os que falharam ({n})',
        stalled: 'sem progresso há {m} min — parou de aguardar',
        fixBroken: 'corrigir {n} páginas com bloco inválido',
        resultRepaired: '{n} páginas corrigidas',
        syncRuntime: 'atualizar idiomas do app',
        resultRuntime: 'idiomas do app atualizados (publique para ver)',
    },
    es: {
        title: 'Idioma',
        desc: 'El idioma define el locale para la generación de contenido i18n. Cada idioma produce variaciones traducidas de las páginas del módulo.',
        needsProject: 'Seleccione un proyecto primero para ver los idiomas disponibles.',
        needsModule: 'Seleccione un módulo primero para ver los idiomas.',
        allTitle: 'Todos los Idiomas',
        allDesc: 'Idiomas configurados en este módulo.',
        customTitle: 'Agregar Idioma',
        customDesc: 'Agregue un nuevo idioma a este módulo.',
        noLanguages: 'No hay idiomas configurados en este módulo.',
        noResults: 'Ningún idioma coincide con su búsqueda.',
        searchPlaceholder: 'Buscar idiomas…',
        add: 'Agregar',
        loading: 'Cargando idiomas…',
        createNew: 'Agregar Idioma',
        removeTitle: 'Eliminar Idioma',
        removeDesc: 'Este idioma será eliminado permanentemente del módulo seleccionado.',
        removeBtn: 'Eliminar',
        followTask: 'Seguir tarea',
        scopeModule: 'Solo el módulo actual:',
        scopeAll: 'Todos los módulos del proyecto ({n})',
        presentIn: 'en {x}/{n}',
        previewLoading: 'Verificando módulos…',
        previewSummary: 'Se ejecutará en {x} de {n} módulos · {p} páginas para traducir',
        nothingToDo: 'Nada que hacer: todos los módulos fueron ignorados o ya tienen el idioma.',
        kindNoDefs: 'ignorado: sin module.defs.ts',
        kindNoPages: 'ignorado: sin páginas',
        kindComplete: 'ya lo tiene',
        kindConfigOnly: 'agregar (solo configuración)',
        kindAdd: 'agregar ({n} páginas)',
        kindCompleteTranslation: 'completar traducción ({n} páginas)',
        statusQueued: 'en cola',
        statusRunning: 'procesando…',
        resultConfigOnly: 'configuración actualizada',
        resultDone: 'concluido',
        resultPending: 'concluido con {n} páginas pendientes',
        retry: 'Ejecutar de nuevo',
        retryFailed: 'Ejecutar de nuevo los que fallaron ({n})',
        stalled: 'sin progreso hace {m} min — dejó de esperar',
        fixBroken: 'corregir {n} páginas con bloque inválido',
        resultRepaired: '{n} páginas corregidas',
        syncRuntime: 'actualizar idiomas de la app',
        resultRuntime: 'idiomas de la app actualizados (publique para verlos)',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IProject {
    project: number;
    name: string;
    doSelect: boolean;
}

type AddScope = 'module' | 'all';

/** A project module and its own languages — `null` when it has no module.defs.ts (ignored by a batch). */
interface IProjectModule {
    name: string;
    languages: string[] | null;
}

/** `taskData` of one module's row in the add batch. */
interface IAddRow {
    module: string;
    languages: string[];
    kind?: ModuleLanguagePlanKind;
    pages?: number;
    addToDefs?: string[];
    pendingAfter?: number;
    /** Pages whose broken block was repaired in place before the run. */
    repaired?: number;
    /** l5/config.json got the module's languages (what the app's language switch lists). */
    runtimeUpdated?: boolean;
}

const ADD_SCOPE = 'language:add';

// Modules of a batch run one at a time: each module already translates its pages in parallel, and
// modules in parallel would add up their steps (5 × 100 pages = 500 simultaneous translations).
// Raise it, or read it from a configuration, to run several modules at once.
const MODULE_CONCURRENCY = 1;

// A module whose task shows no step changing status for this long stops being waited for: it is marked
// as failed (retryable) and the batch moves on. The slowest translation step measured took ~18s.
const MODULE_STALL_MS = 5 * 60_000;

// Module-level, like the taskManager store: survives the plugin being re-created between knob navigations.
const taskInfoByKey = new Map<string, { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }>();

class AgentStalledError extends Error {
    constructor(readonly stallMs: number) {
        super(`no progress for ${Math.round(stallMs / 60_000)} min`);
    }
}

/** Every step's id and status (and fan-out progress): it changes whenever any step moves. */
function taskProgressSignature(task: mls.msg.TaskData | undefined): string {
    const parts: string[] = [];
    const walk = (steps: any[] | null | undefined) => {
        for (const step of steps ?? []) {
            const p = step?.progress;
            parts.push(`${step?.stepId}:${step?.status ?? ''}${p ? `:${p.completed}/${p.failed}` : ''}`);
            walk(step?.nextSteps);
        }
    };
    walk((task as any)?.iaCompressed?.nextSteps);
    return parts.join('|');
}

function fmt(text: string, vars: Record<string, string | number>): string {
    return text.replace(/\{(\w+)\}/g, (all, key) => (key in vars ? String(vars[key]) : all));
}


// ─── Component ───────────────────────────────────────────────────────

@customElement('aura--plugins--select-language-102020')
export class PluginSelectLanguage extends StateLitElement {

    @property({ attribute: false }) selectedProject: IProject | null = null;
    @property({ attribute: false }) selectedModule: string | null = null;
    @property({ attribute: false }) value: number | null = null;

    @state() private _languages: string[] = [];
    @state() private _loading: boolean = false;
    @state() private _search: string = '';
    @state() private _addSearch: string = '';
    @state() private _addSelected: string[] = [];
    @state() private _dropdownOpen: boolean = false;
    @state() private _addScope: AddScope = 'module';
    @state() private _projectModules: IProjectModule[] | null = null;
    @state() private _preview: ModuleLanguagePlan[] | null = null;
    @state() private _previewLoading: boolean = false;
    private _previewToken = 0;

    private _unsubTasks: (() => void) | undefined;
    private threadCache = new Map<string, Promise<any>>();

    connectedCallback() {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
    }

    // Reload guard by VALUE (project id + module name): parents may pass a fresh
    // selectedProject object each render, and reloading on identity alone loops.
    private _loadedKey: string | null = null;

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('selectedProject') || changed.has('selectedModule')) {
            const key = this.selectedProject && this.selectedModule
                ? `${this.selectedProject.project}/${this.selectedModule}`
                : null;
            if (key !== this._loadedKey) {
                this._loadedKey = key;
                this._languages = [];
                this._search = '';
                this._addSearch = '';
                this._addSelected = [];
                this._addScope = 'module';
                this._projectModules = null;
                if (key) this._loadLanguages();
            }
        }
        if (changed.has('value')) {
            this._search = '';
            this._addSearch = '';
            this._addSelected = [];
            this._dropdownOpen = false;
        }
    }

    updated(changed: Map<string, unknown>) {
        if (changed.has('_addSelected') || changed.has('_addScope') || changed.has('value')
            || changed.has('_languages') || changed.has('_projectModules')) {
            this._refreshPreview();
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
        if (!this.selectedModule) return this._renderNeedsModule();
        if (this._loading) return this._renderLoading();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Async ───────────────────────────────────────────────────────

    private async _loadLanguages() {
        if (!this.selectedProject || !this.selectedModule) return;
        this._loading = true;
        this.requestUpdate();
        try {
            this._languages = await readModuleLanguages(this.selectedProject.project, this.selectedModule);
        } catch {
            this._languages = [];
        }
        this._loading = false;
        this._dispatchConfig();
        this.requestUpdate();
        this._loadProjectModules();
    }

    /** Every module of the project with its own languages — the "all modules" scope and its dropdown hints. */
    private async _loadProjectModules() {
        const project = this.selectedProject?.project;
        if (!project) return;
        try {
            const config: any = await getConfigProject(project);
            const names: string[] = (config?.modules ?? [])
                .map((m: any) => m?.moduleName ?? m?.name ?? '')
                .filter((name: string) => !!name);
            const modules: IProjectModule[] = [];
            for (const name of names) modules.push({ name, languages: await readModuleDefsLanguages(project, name) });
            if (this.selectedProject?.project === project) this._projectModules = modules;
        } catch {
            if (this.selectedProject?.project === project) this._projectModules = [];
        }
    }

    private get _addTargets(): string[] {
        if (!this.selectedModule) return [];
        if (this._addScope === 'module') return [this.selectedModule];
        return (this._projectModules ?? []).map(m => m.name);
    }

    /** Re-reads the targets on every change: the preview follows the same rule as the run. */
    private async _refreshPreview() {
        const token = ++this._previewToken;
        const project = this.selectedProject?.project;
        const languages = [...this._addSelected];
        const targets = this._addTargets;
        if (!project || !this._isCustom || languages.length === 0 || targets.length === 0) {
            if (this._preview !== null || this._previewLoading) {
                this._preview = null;
                this._previewLoading = false;
            }
            return;
        }
        this._previewLoading = true;
        const plans: ModuleLanguagePlan[] = [];
        try {
            for (const module of targets) {
                plans.push(await scanModuleForLanguages(project, module, languages));
                if (token !== this._previewToken) return;
            }
        } catch {
            /* a failed read leaves the preview empty; the run re-checks each module anyway */
        }
        if (token !== this._previewToken) return;
        this._preview = plans;
        this._previewLoading = false;
    }

    private async _executeRemoveLanguage() {
        const lang = this._selectedLang;
        if (!lang || !this.selectedProject || !this.selectedModule) return;
        if (hasRunning('language:remove')) return;

        clearScope('language:remove');
        const langObj = findLanguageByCode(lang);
        const taskKey = `language:remove:${lang}`;
        const prompt = JSON.stringify([{ languages: [{ code: lang, name: langObj?.name ?? lang }], projectId: this.selectedProject.project, moduleName: this.selectedModule }]);

        setTask(taskKey, { status: 'running', startedAt: Date.now() });

        try {
            const defaultLanguage = await readModuleDefaultLanguage(this.selectedProject.project, this.selectedModule);
            if (defaultLanguage && lang === defaultLanguage) {
                throw new Error(`Cannot remove the default language '${lang}'`);
            }
            await this.executeAgent('agentRemoveLanguage', prompt);
            if (this.selectedProject && this.selectedModule) {
                const updated = this._languages.filter(l => l !== lang);
                await writeModuleLanguages(this.selectedProject.project, this.selectedModule, updated);
                // The app's language switch lists l5/config.json: drop the language there too.
                await writeConfigModuleLanguages(this.selectedProject.project, this.selectedModule, updated);
                this._languages = updated;
                const currentLang = getActualLanguage(this.selectedModule);
                if (currentLang && !updated.includes(currentLang)) {
                    setActualLanguage(this.selectedModule, updated[0] ?? null);
                    saveAuraProject();
                }
                this._dispatchConfig();
                this._dispatchSelect(0);
            }
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (e: any) {
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: e?.message });
        }
    }

    private async executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
        stallMs?: number,
    ): Promise<{ taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }> {
        const fullName = '_102020_/l2/serviceExploreProjects';

        let threadPromise = this.threadCache.get(fullName);
        if (!threadPromise) {
            threadPromise = (async () => {
                let thread = await getThreadByName(fullName);
                if (!thread) thread = await createThread(fullName, [], 'company');
                return thread;
            })();
            this.threadCache.set(fullName, threadPromise);
        }

        const thread = await threadPromise;
        const userId = getUserId();
        if (!userId) return { taskId: '' };

        const threadId = thread?.threadId;
        if (!threadId) return { taskId: '' };

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);
        let taskId = '';
        let task: mls.msg.TaskData | undefined;
        let message: mls.msg.Message | undefined;
        let progressSignature = '';
        let lastProgressAt = Date.now();
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                taskId = event.taskId; task = event.task; message = event.message ?? message;
                onTaskCreated?.({ taskId, task, message });

                // The stream polls for as long as the server keeps the task in progress, and a step whose LLM
                // call never returns keeps it there forever. Throwing ends the stream (the server task is left as is).
                if (stallMs) {
                    const signature = taskProgressSignature(task);
                    if (signature !== progressSignature) {
                        progressSignature = signature;
                        lastProgressAt = Date.now();
                    } else if (Date.now() - lastProgressAt > stallMs) {
                        throw new AgentStalledError(stallMs);
                    }
                }
            }
        }
        return { taskId, task, message };
    }

    private async _executeAddLanguage() {
        if (this._addSelected.length === 0 || !this.selectedProject || !this.selectedModule) return;
        if (hasPending(ADD_SCOPE)) return;

        const languages = [...this._addSelected];
        const modules = this._addTargets;
        if (modules.length === 0) return;

        clearScope(ADD_SCOPE);
        taskInfoByKey.clear();
        this._addSelected = [];
        this._addSearch = '';

        await this._runAddBatch(this.selectedProject.project, modules.map(module => ({ module, languages })));
    }

    /** Runs the rows again from a fresh check: only what is still missing is queued again. */
    private async _retryAdd(taskKeys: string[]) {
        if (!this.selectedProject || hasPending(ADD_SCOPE)) return;
        const items = taskKeys
            .map(key => getTask(key)?.taskData as IAddRow | undefined)
            .filter((row): row is IAddRow => !!row)
            .map(row => ({ module: row.module, languages: row.languages }));
        if (items.length === 0) return;
        await this._runAddBatch(this.selectedProject.project, items);
    }

    /** One task per module, so each module has its own status, error, follow-up and retry. */
    private async _runAddBatch(project: number, items: { module: string; languages: string[] }[]) {
        const keyOf = (item: { module: string; languages: string[] }) => `${ADD_SCOPE}:${item.module}:${item.languages.join('+')}`;
        for (const item of items) {
            const row: IAddRow = { ...item };
            setTask(keyOf(item), { status: 'queued', startedAt: Date.now(), taskData: row });
        }

        await runWithConcurrency(items, MODULE_CONCURRENCY, item => this._runAddModule(project, item, keyOf(item)));
        await this._afterAddBatch(project, items.map(item => keyOf(item)));
    }

    private async _runAddModule(project: number, item: { module: string; languages: string[] }, taskKey: string) {
        const row: IAddRow = { ...item };
        const update = (status: ITask['status'], message?: string) =>
            setTask(taskKey, { ...getTask(taskKey)!, status, message, taskData: { ...row } });

        taskInfoByKey.delete(taskKey);
        setTask(taskKey, { ...getTask(taskKey)!, status: 'running', startedAt: Date.now(), message: undefined });
        try {
            // Re-checked at run time, never taken from the preview: the module may have changed since.
            let plan = await scanModuleForLanguages(project, item.module, item.languages);
            if (plan.broken.length > 0) {
                // Pages an earlier run left broken (one line, missing type): repaired in place (no model), then re-checked.
                row.repaired = await repairBrokenPages(plan.broken);
                plan = await scanModuleForLanguages(project, item.module, item.languages);
            }
            row.kind = plan.kind;
            row.pages = plan.pending.length;
            row.addToDefs = plan.addToDefs;
            update('running');

            if (plan.kind === 'translate') {
                await this.executeAgent('agentAddLanguage', this._addPrompt(project, item), (data) => {
                    taskInfoByKey.set(taskKey, data);
                    this.requestUpdate();
                }, MODULE_STALL_MS);
            }
            if ((plan.kind === 'translate' || plan.kind === 'configOnly') && plan.addToDefs.length > 0) {
                await this._addToModuleDefs(project, item.module, plan.addToDefs);
            }
            if (plan.kind === 'translate') {
                // A failed translation step does not fail the task, so what is still pending is read from the pages.
                const after = await scanModuleForLanguages(project, item.module, item.languages);
                row.pendingAfter = after.pending.length;
            }
            if (plan.kind !== 'noDefs' && plan.kind !== 'noPages') {
                // The app lists l5/config.json, not module.defs.ts: keep it in step with what the module now has.
                const languages = await readModuleDefsLanguages(project, item.module);
                if (languages) row.runtimeUpdated = await writeConfigModuleLanguages(project, item.module, languages);
            }
            update('done');
        } catch (e: any) {
            const message = e instanceof AgentStalledError
                ? fmt(this.msg.stalled, { m: Math.round(e.stallMs / 60_000) })
                : (e?.message ?? String(e));
            update('error', message);
        }
    }

    private _addPrompt(project: number, item: { module: string; languages: string[] }): string {
        const languages = item.languages.map(code => {
            const obj = (allLanguages as ICollabLanguage[]).find(l => l.code === code);
            return { code, name: obj?.name ?? code };
        });
        return JSON.stringify([{ languages, projectId: project, moduleName: item.module }]);
    }

    /** Appends to the module's OWN list, read again right before writing. */
    private async _addToModuleDefs(project: number, moduleName: string, languages: string[]) {
        const current = await readModuleDefsLanguages(project, moduleName);
        if (!current) throw new Error(`module.defs.ts not found or without languages for module '${moduleName}'`);
        const missing = languages.filter(code => !current.includes(code));
        if (missing.length === 0) return;
        await writeModuleLanguages(project, moduleName, [...current, ...missing]);
    }

    private _isRetryable(task: ITask): boolean {
        const row = task.taskData as IAddRow | undefined;
        return task.status === 'error' || (task.status === 'done' && (row?.pendingAfter ?? 0) > 0);
    }

    private async _afterAddBatch(project: number, taskKeys: string[]) {
        if (this.selectedProject?.project !== project || !this.selectedModule) return;
        await this._loadProjectModules();

        const touchedCurrent = taskKeys.some(key => (getTask(key)?.taskData as IAddRow | undefined)?.module === this.selectedModule);
        if (!touchedCurrent) return;

        const wasCustom = this._isCustom;
        const languages = await readModuleLanguages(project, this.selectedModule);
        if (languages.join('|') === this._languages.join('|')) return;
        this._languages = languages;
        this._dispatchConfig();
        if (!wasCustom) return;

        // Single module, all good: back to the list, as before. Otherwise stay on the results and their retry.
        const allGood = taskKeys.every(key => { const t = getTask(key); return !t || !this._isRetryable(t); });
        this._dispatchSelect(this._addScope === 'module' && allGood ? 0 : this._languages.length + 1);
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

    private _renderNeedsModule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.msg.title, this.msg.desc)}
                ${this._renderNotice(this.msg.needsModule)}
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

    private _renderSelected() {
        const lang = this._selectedLang!;
        const langObj = findLanguageByCode(lang);
        const fullName = langObj?.name ?? lang;
        const svg = langObj?.svg ?? '';
        const max = this._languages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${fullName}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></aura--plugins--nav-header-102020>
                <div class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    px-3 py-2.5 flex items-center gap-2
                ">
                    <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML(svg)}</div>
                    <span class="text-sm text-gray-700 dark:text-gray-300">${fullName}</span>
                    <span class="
                        ml-auto text-sm font-mono px-1.5 py-0.5 rounded
                        bg-emerald-100 dark:bg-emerald-900/30
                        text-emerald-600 dark:text-emerald-400
                        font-semibold uppercase tracking-wider
                    ">${lang}</span>
                </div>
                ${(() => {
                    const taskKey = `language:remove:${lang}`;
                    const removing = getTask(taskKey)?.status === 'running';
                    const isRunning = hasRunning('language:remove');
                    return html`
                        <fieldset class="rounded-lg border border-red-200 dark:border-red-800/40 px-3 py-2.5 flex flex-col gap-2">
                            <legend class="text-sm font-medium text-red-500 dark:text-red-400 px-1">${this.msg.removeTitle}</legend>
                            <span class="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">${this.msg.removeDesc}</span>
                            <button
                                class="
                                    self-start flex items-center gap-1.5 text-sm px-3 py-1.5 rounded transition-colors
                                    ${isRunning
                                        ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                                        : 'bg-red-500 dark:bg-red-600 text-white hover:bg-red-600 dark:hover:bg-red-500 cursor-pointer'}
                                "
                                ?disabled=${isRunning}
                                @click=${() => this._executeRemoveLanguage()}
                            >
                                ${removing ? this._renderSpinner('border-gray-400 dark:border-gray-500') : ''}
                                ${removing ? 'processing…' : this.msg.removeBtn}
                            </button>
                        </fieldset>
                    `;
                })()}
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._languages
            .map((lang, i) => ({ lang, selectValue: i + 1 }))
            .filter(({ lang }) => {
                if (!q) return true;
                const name = findLanguageByCode(lang)?.name ?? '';
                return lang.toLowerCase().includes(q) || name.toLowerCase().includes(q);
            });

        const max = this._languages.length + 1;
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

                ${this._languages.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noLanguages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ lang, selectValue }) => this._renderLangCard(lang, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const addTasks = getTasksByScope(ADD_SCOPE);
        const isBusy = hasPending(ADD_SCOPE);
        const q = this._addSearch.toLowerCase();
        const selectedSet = new Set(this._addSelected);

        // "All modules": a language is hidden only when every module that can take it already has it.
        const validModules = (this._projectModules ?? []).filter(m => m.languages);
        const presentCount = (code: string) => validModules.filter(m => m.languages!.includes(code)).length;
        const alreadyAdded = this._addScope === 'all'
            ? (code: string) => validModules.length > 0 && presentCount(code) === validModules.length
            : (code: string) => this._languages.includes(code);

        const filtered = (allLanguages as ICollabLanguage[]).filter(l =>
            !alreadyAdded(l.code) &&
            (!q || l.name.toLowerCase().includes(q) || l.code.toLowerCase().includes(q))
        ).slice(0, 80);

        const actionable = (this._preview ?? []).filter(isPlanActionable);
        const canAdd = this._addSelected.length > 0 && !isBusy && !this._previewLoading
            && this._preview !== null && actionable.length > 0;

        const max = this._languages.length + 1;
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

                ${this._renderScope(isBusy)}

                <input
                    type="text"
                    .value=${this._addSearch}
                    placeholder=${this.msg.searchPlaceholder}
                    class="
                        w-full text-sm px-2.5 py-1.5 rounded-md
                        border border-gray-200 dark:border-gray-700
                        bg-white dark:bg-gray-900
                        text-gray-700 dark:text-gray-300
                        placeholder-gray-400 dark:placeholder-gray-600
                        focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                    "
                    @focus=${() => { this._dropdownOpen = true; }}
                    @blur=${() => { setTimeout(() => { this._dropdownOpen = false; this.requestUpdate(); }, 150); }}
                    @input=${(e: Event) => { this._addSearch = (e.target as HTMLInputElement).value; this._dropdownOpen = true; }}
                />

                ${this._dropdownOpen ? html`
                    <div class="flex flex-col gap-0.5 max-h-52 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded-md bg-white dark:bg-gray-900 py-0.5">
                        ${filtered.length === 0
                            ? html`<span class="px-3 py-2 text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                            : filtered.map(l => {
                                const isSelected = selectedSet.has(l.code);
                                const present = this._addScope === 'all' ? presentCount(l.code) : 0;
                                return html`
                                    <div
                                        class="
                                            flex items-center gap-2 px-3 py-1.5 cursor-pointer transition-colors
                                            ${isSelected
                                                ? 'bg-indigo-50 dark:bg-indigo-900/20'
                                                : 'hover:bg-gray-100 dark:hover:bg-gray-800'}
                                        "
                                        @mousedown=${(e: Event) => {
                                            e.preventDefault();
                                            this._addSelected = isSelected
                                                ? this._addSelected.filter(c => c !== l.code)
                                                : [...this._addSelected, l.code];
                                            this._dropdownOpen = false;
                                        }}
                                    >
                                        <span class="shrink-0 w-3.5 text-center text-sm text-indigo-500 dark:text-indigo-400">
                                            ${isSelected ? '✓' : ''}
                                        </span>
                                        <div class="shrink-0 w-[30px] h-7 overflow-hidden rounded-sm">${unsafeHTML((l as any).svg ?? '')}</div>
                                        <span class="text-sm text-gray-700 dark:text-gray-300">${l.name}</span>
                                        ${present > 0 ? html`
                                            <span class="text-xs text-gray-400 dark:text-gray-500 whitespace-nowrap">
                                                ${fmt(this.msg.presentIn, { x: present, n: validModules.length })}
                                            </span>
                                        ` : ''}
                                        <span class="
                                            ml-auto shrink-0 text-sm font-mono px-1.5 py-0.5 rounded
                                            bg-gray-100 dark:bg-gray-800
                                            text-gray-500 dark:text-gray-400
                                            uppercase tracking-wider
                                        ">${l.code}</span>
                                    </div>
                                `;
                            })}
                    </div>
                ` : ''}

                ${this._addSelected.length > 0 ? html`
                    <div class="flex flex-wrap gap-1.5">
                        ${this._addSelected.map(code => {
                            const langObj = (allLanguages as ICollabLanguage[]).find(l => l.code === code);
                            return html`
                                <div class="flex items-center gap-1.5 pl-1.5 pr-2 py-1 rounded-md
                                    border border-indigo-200 dark:border-indigo-700
                                    bg-indigo-50 dark:bg-indigo-900/10
                                ">
                                    <div class="shrink-0 w-[30px] h-6 overflow-hidden rounded-sm">${unsafeHTML((langObj as any)?.svg ?? '')}</div>
                                    <span class="text-sm font-mono uppercase tracking-wider text-indigo-600 dark:text-indigo-400">${code}</span>
                                    ${langObj ? html`<span class="text-sm text-gray-500 dark:text-gray-400">${langObj.name}</span>` : ''}
                                    <button
                                        class="ml-0.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors leading-none"
                                        @click=${() => { this._addSelected = this._addSelected.filter(c => c !== code); }}
                                    >&#x2715;</button>
                                </div>
                            `;
                        })}
                    </div>
                    ${this._renderPreview(actionable)}
                ` : ''}

                <button
                    class="
                        self-end text-sm px-3 py-1.5 rounded
                        transition-colors
                        ${!canAdd
                            ? 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-600 cursor-not-allowed'
                            : 'bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 cursor-pointer'}
                    "
                    ?disabled=${!canAdd}
                    @click=${() => this._executeAddLanguage()}
                >${this.msg.add}</button>

                ${addTasks.size > 0 ? this._renderAddResults(addTasks, isBusy) : ''}
            </div>
        `;
    }

    private _renderScope(isBusy: boolean) {
        const total = this._projectModules?.length ?? 0;
        const option = (scope: AddScope, label: unknown, disabled: boolean) => html`
            <label class="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}">
                <input
                    type="radio"
                    name="language-add-scope"
                    class="accent-indigo-500"
                    .checked=${this._addScope === scope}
                    ?disabled=${disabled}
                    @change=${() => { this._addScope = scope; }}
                />
                <span>${label}</span>
            </label>
        `;
        return html`
            <div class="flex flex-col gap-1.5">
                ${option('module', html`${this.msg.scopeModule} <span class="font-semibold">${this.selectedModule}</span>`, isBusy)}
                ${option('all', fmt(this.msg.scopeAll, { n: total }), isBusy || total === 0)}
            </div>
        `;
    }

    private _planLabel(plan: { kind?: ModuleLanguagePlanKind; pages?: number; addToDefs?: string[] }): string {
        switch (plan.kind) {
            case 'noDefs': return this.msg.kindNoDefs;
            case 'noPages': return this.msg.kindNoPages;
            case 'complete': return this.msg.kindComplete;
            case 'configOnly': return this.msg.kindConfigOnly;
            case 'translate':
                return fmt((plan.addToDefs?.length ?? 1) > 0 ? this.msg.kindAdd : this.msg.kindCompleteTranslation, { n: plan.pages ?? 0 });
            default: return '';
        }
    }

    private _renderPreview(actionable: ModuleLanguagePlan[]) {
        if (this._previewLoading) {
            return html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.previewLoading}</span>`;
        }
        const preview = this._preview;
        if (!preview) return '';
        const pages = actionable.reduce((sum, p) => sum + p.pending.length, 0);
        return html`
            <div class="flex flex-col gap-1 rounded-md border border-gray-200 dark:border-gray-700 px-2.5 py-2">
                ${actionable.length === 0
                    ? html`<span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.nothingToDo}</span>`
                    : this._addScope === 'all'
                        ? html`<span class="text-sm text-gray-600 dark:text-gray-300">
                            ${fmt(this.msg.previewSummary, { x: actionable.length, n: preview.length, p: pages })}
                          </span>`
                        : ''}
                ${preview.map(plan => {
                    const active = isPlanActionable(plan);
                    const fix = (plan.broken.length > 0 ? ` · ${fmt(this.msg.fixBroken, { n: plan.broken.length })}` : '')
                        + (plan.runtimeStale ? ` · ${this.msg.syncRuntime}` : '');
                    return html`
                        <div class="flex items-center gap-2 text-sm">
                            <span class="font-mono ${active ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-600'}">${plan.moduleName}</span>
                            <span class="ml-auto ${active ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-600 italic'}">
                                ${this._planLabel({ kind: plan.kind, pages: plan.pending.length, addToDefs: plan.addToDefs })}${fix}
                            </span>
                        </div>
                    `;
                })}
            </div>
        `;
    }

    private _renderAddResults(addTasks: Map<string, ITask>, isBusy: boolean) {
        const retryable = [...addTasks.entries()].filter(([, task]) => this._isRetryable(task)).map(([key]) => key);
        return html`
            <div class="flex flex-col gap-1">
                ${[...addTasks.entries()].map(([taskKey, task]) => this._renderAddRow(taskKey, task, isBusy))}
                ${retryable.length > 0 && !isBusy ? html`
                    <button
                        class="self-end text-sm px-3 py-1.5 rounded transition-colors bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 cursor-pointer"
                        @click=${() => this._retryAdd(retryable)}
                    >${fmt(this.msg.retryFailed, { n: retryable.length })}</button>
                ` : ''}
            </div>
        `;
    }

    private _renderAddRow(taskKey: string, task: ITask, isBusy: boolean) {
        const row = (task.taskData ?? {}) as IAddRow;
        const ignored = row.kind === 'noDefs' || row.kind === 'noPages' || row.kind === 'complete';
        const pendingAfter = row.pendingAfter ?? 0;
        const tone: 'idle' | 'running' | 'ok' | 'warn' | 'error' =
            task.status === 'queued' ? 'idle'
            : task.status === 'running' ? 'running'
            : task.status === 'error' ? 'error'
            : ignored && !(row.repaired ?? 0) && !row.runtimeUpdated ? 'idle'
            : pendingAfter > 0 ? 'warn'
            : 'ok';
        const box = {
            idle: 'bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-800',
            running: 'bg-indigo-50 dark:bg-indigo-900/10 border border-indigo-200 dark:border-indigo-700',
            ok: 'bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-200 dark:border-emerald-700',
            warn: 'bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-700',
            error: 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-700',
        }[tone];
        const text = {
            idle: 'text-gray-400 dark:text-gray-500',
            running: 'text-indigo-600 dark:text-indigo-400',
            ok: 'text-emerald-600 dark:text-emerald-400',
            warn: 'text-amber-600 dark:text-amber-400',
            error: 'text-red-600 dark:text-red-400',
        }[tone];
        const label =
            task.status === 'queued' ? this.msg.statusQueued
            : task.status === 'running' ? this.msg.statusRunning
            : task.status === 'error' ? (task.message ?? '')
            : ignored ? this._planLabel(row)
            : row.kind === 'configOnly' ? this.msg.resultConfigOnly
            : pendingAfter > 0 ? fmt(this.msg.resultPending, { n: pendingAfter })
            : this.msg.resultDone;
        const repairedNote = task.status !== 'done' ? ''
            : ((row.repaired ?? 0) > 0 ? ` · ${fmt(this.msg.resultRepaired, { n: row.repaired! })}` : '')
            + (row.runtimeUpdated ? ` · ${this.msg.resultRuntime}` : '');
        const info = taskInfoByKey.get(taskKey);

        return html`
            <div class="flex items-center gap-2 px-2.5 py-1.5 rounded-md ${box}">
                ${tone === 'running' ? this._renderSpinner() : ''}
                ${tone === 'ok' ? html`<span class="text-sm ${text}">✓</span>` : ''}
                ${tone === 'warn' ? html`<span class="text-sm ${text}">!</span>` : ''}
                ${tone === 'error' ? html`<span class="text-sm ${text}">✕</span>` : ''}
                <span class="text-sm font-mono ${text}">${row.module}</span>
                <span class="text-sm font-mono uppercase tracking-wider ${text}">${(row.languages ?? []).join(', ')}</span>
                <span class="text-sm ${text} ${tone === 'running' || tone === 'idle' ? 'italic' : ''} truncate">${label}${repairedNote}</span>
                <div class="ml-auto flex items-center gap-2 shrink-0">
                    ${this._isRetryable(task) && !isBusy ? html`
                        <button
                            class="text-sm text-amber-600 dark:text-amber-400 hover:underline cursor-pointer whitespace-nowrap"
                            @click=${() => this._retryAdd([taskKey])}
                        >${this.msg.retry}</button>
                    ` : ''}
                    ${info?.task ? html`
                        <button
                            class="text-sm text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                            @click=${() => this._openTaskInfo(taskKey)}
                        >${this.msg.followTask}</button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    private async _openTaskInfo(taskKey: string) {
        const info = taskInfoByKey.get(taskKey);
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        const messageId = info.message?.createAt ?? '';
        el.setAttribute('messageId', messageId);
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderSpinner(color: string = 'border-indigo-500 dark:border-indigo-400') {
        return html`<div class="w-3 h-3 border-2 ${color} border-t-transparent rounded-full animate-spin shrink-0"></div>`;
    }

    private _renderHeader(title: string, description: string) {
        return html`
            <div class="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
                <span class="text-base font-semibold text-gray-700 dark:text-gray-200 text-center">${title}</span>
                <span class="text-xs text-gray-400 dark:text-gray-500 leading-relaxed text-center">${description}</span>
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
                <span class="text-sm text-amber-600 dark:text-amber-400 leading-relaxed">${message}</span>
            </div>
        `;
    }

    private _renderLangCard(lang: string, selectValue: number) {
        const langObj = findLanguageByCode(lang);
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
                <span class="text-sm text-gray-700 dark:text-gray-300">${fullName}</span>
                <span class="
                    ml-auto text-sm font-mono px-1.5 py-0.5 rounded
                    bg-emerald-100 dark:bg-emerald-900/30
                    text-emerald-600 dark:text-emerald-400
                    font-semibold uppercase tracking-wider
                ">${lang}</span>
            </div>
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
        const langCode = value > 0 && value <= this._languages.length ? this._languages[value - 1] : null;
        if (langCode && this.selectedModule) {
            setActualLanguage(this.selectedModule, langCode);
            saveAuraProject();
        }
        this.dispatchEvent(new CustomEvent('select-language', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
