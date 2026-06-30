/// <mls fileReference="_102020_/l2/plugins/selectPage.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getAuraState } from '/_102020_/l2/auraState.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/cfeMaterializeStudio.js';
import { pageDsCheckByDefs, restampPage, layoutHasRules, type PageDsCheck } from '/_102020_/l2/dsMatch/dsVersion.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { setTask, getTask, subscribeTaskManager } from '/_102020_/l2/taskManager.js';
import { getState, setState } from '/_102029_/l2/collabState.js';
import '/_102020_/l2/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Pages',
    desc: 'Pages of the selected module. Filtered by active device when one is selected.',
    allTitle: 'All Pages',
    allDesc: 'All pages found for the selected module and device.',
    customTitle: 'New Page',
    customDesc: 'Create a new page in this module.',
    noModule: 'No module selected.',
    noPages: 'No pages found for this module.',
    noResults: 'No pages match your search.',
    createNew: 'New Page',
    searchPlaceholder: 'Search pages…',
    inDevelopment: 'In development',
    devices: 'Devices',
    notCreated: 'Pages have not been created for this layout / design system combination.',
    generatePages: 'Generate pages',
    outdated: 'Outdated',
    review: 'Review',
    reviewIntro: 'Molecules used by this page changed since it was generated:',
    markReviewed: 'Mark as reviewed',
    saving: 'Saving…',
    staleIntro: 'The selection no longer reflects the design system:',
    staleReasonRules: "The page's rules changed.",
    staleReasonRemoved: 'A molecule it uses was removed.',
    staleReasonIncompatible: 'A molecule it uses is no longer compatible.',
    staleReasonNoStamp: 'The page predates DS versioning.',
    regeneratePage: 'Regenerate page',
    regenerating: 'Regenerating…',
    regenerated: 'Task started',
    followTask: 'Follow task',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Páginas',
        desc: 'Páginas do módulo selecionado. Filtradas pelo device ativo quando um estiver selecionado.',
        allTitle: 'Todas as Páginas',
        allDesc: 'Todas as páginas encontradas para o módulo e device selecionados.',
        customTitle: 'Nova Página',
        customDesc: 'Crie uma nova página neste módulo.',
        noModule: 'Nenhum módulo selecionado.',
        noPages: 'Nenhuma página encontrada para este módulo.',
        noResults: 'Nenhuma página corresponde à sua busca.',
        createNew: 'Nova Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'Em desenvolvimento',
        devices: 'Dispositivos',
        notCreated: 'As páginas não foram criadas para esta combinação de layout / design system.',
        generatePages: 'Gerar páginas',
        outdated: 'Desatualizada',
        review: 'Revisar',
        reviewIntro: 'Moléculas usadas por esta página mudaram desde a geração:',
        markReviewed: 'Marcar como revisada',
        saving: 'Salvando…',
        staleIntro: 'A seleção não reflete mais o design system:',
        staleReasonRules: 'As regras da página mudaram.',
        staleReasonRemoved: 'Uma molécula usada foi removida.',
        staleReasonIncompatible: 'Uma molécula usada ficou incompatível.',
        staleReasonNoStamp: 'A página é anterior ao versionamento do DS.',
        regeneratePage: 'Refazer página',
        regenerating: 'Refazendo…',
        regenerated: 'Task iniciada',
        followTask: 'Acompanhar task',
    },
    es: {
        title: 'Páginas',
        desc: 'Páginas del módulo seleccionado. Filtradas por dispositivo activo cuando hay uno seleccionado.',
        allTitle: 'Todas las Páginas',
        allDesc: 'Todas las páginas encontradas para el módulo y dispositivo seleccionados.',
        customTitle: 'Nueva Página',
        customDesc: 'Cree una nueva página en este módulo.',
        noModule: 'Ningún módulo seleccionado.',
        noPages: 'No se encontraron páginas para este módulo.',
        noResults: 'Ninguna página coincide con su búsqueda.',
        createNew: 'Nueva Página',
        searchPlaceholder: 'Buscar páginas…',
        inDevelopment: 'En desarrollo',
        devices: 'Dispositivos',
        notCreated: 'Las páginas no se han creado para esta combinación de layout / design system.',
        generatePages: 'Generar páginas',
        outdated: 'Desactualizada',
        review: 'Revisar',
        reviewIntro: 'Las moléculas usadas por esta página cambiaron desde su generación:',
        markReviewed: 'Marcar como revisada',
        saving: 'Guardando…',
        staleIntro: 'La selección ya no refleja el design system:',
        staleReasonRules: 'Las reglas de la página cambiaron.',
        staleReasonRemoved: 'Una molécula usada fue eliminada.',
        staleReasonIncompatible: 'Una molécula usada ya no es compatible.',
        staleReasonNoStamp: 'La página es anterior al versionado del DS.',
        regeneratePage: 'Regenerar página',
        regenerating: 'Regenerando…',
        regenerated: 'Tarea iniciada',
        followTask: 'Seguir tarea',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

interface IPageEntry {
    name: string;
    devices: string[];
    file: mls.stor.IFileInfo;
}

// ─── Constants ───────────────────────────────────────────────────────

const DEVICE_SUB_PATHS: Record<number, string> = {
    1: 'web/desktop',
    2: 'web/mobile',
    3: 'android',
    4: 'ios',
};

const DEVICE_LABELS: Record<string, string> = {
    'web/desktop': 'Web Desktop',
    'web/mobile': 'Web Mobile',
    'android': 'Android',
    'ios': 'iOS',
};

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-page-102020')
export class PluginSelectPage extends StateLitElement {

    @property({ attribute: false }) selectedModule: IModule | null = null;
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) reloadToken: number = 0;

    @state() private _pages: IPageEntry[] = [];
    @state() private _search: string = '';
    @state() private _activeDevice: string | null = null;
    @state() private _pagesNotCreated: boolean = false;
    // page name → DS-version check: status ('stale' | 'review' | 'fresh') + what changed / why.
    @state() private _checkByName: Record<string, PageDsCheck> = {};
    // page currently being re-stamped (disables its button).
    @state() private _busyPage: string | null = null;

    private _threadCache = new Map<string, Promise<any>>();
    private _taskInfoByName = new Map<string, { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }>();
    private _unsubTasks: (() => void) | undefined;

    connectedCallback() {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
        this._loadPages();
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        this._unsubTasks?.();
    }

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('selectedModule') || changed.has('reloadToken')) {
            this._search = '';
            this._loadPages();
        }
        if (changed.has('value')) {
            this._search = '';
        }
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean { return this.value === 0; }
    private get _isCustom(): boolean { return this.value !== null && this.value > this._pages.length; }
    private get _selectedPage(): IPageEntry | null {
        if (this.value === null || this.value <= 0 || this.value > this._pages.length) return null;
        return this._pages[this.value - 1];
    }

    // ─── Page Loading ─────────────────────────────────────────────────

    private get _modulePath(): string | null {
        return this.selectedModule?.path ?? getAuraState().actualModule ?? null;
    }

    private get _moduleName(): string | null {
        return this.selectedModule?.name ?? getAuraState().actualModule ?? null;
    }

    private async _loadPages(): Promise<void> {
        this._pages = [];
        this._pagesNotCreated = false;
        const modulePath = this._modulePath;
        if (!modulePath) {
            this._dispatchConfig();
            return;
        }

        const project = getAuraState().actualProject;
        const activeDevicePath = getAuraState().actualDevice;

        this._activeDevice = activeDevicePath ? (DEVICE_LABELS[activeDevicePath] ?? null) : null;

        // The page variation folder is page<layout><designSystem> (e.g. page11 =
        // layout 1, DS 1). Build it from the current aura selection.
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        const variation = `page${layout}${ds}`;

        // Pages now live in the project config.json (l0). Read the stor content
        // and pull the frontend pages for the selected module.
        let pages: any[] = [];
        try {
            const content = await getContentByMlsPath(`_${project}_/l0/config.json`);
            if (!content) throw new Error('config.json not found');
            const config = JSON.parse(content);
            const moduleDef = config?.projects?.[String(project)]?.modules
                ?.find((m: any) => m.moduleId === modulePath);
            pages = moduleDef?.frontend?.pages ?? [];
        } catch {
            this._dispatchConfig();
            this.requestUpdate();
            return;
        }

        const pageMap = new Map<string, { devices: Set<string>; file: mls.stor.IFileInfo }>();
        let candidateCount = 0;

        for (const page of pages) {
            // source: e.g. "l2/cafeFlow/web/desktop/page11/dashboardGerente.ts"
            const source: string = page.source ?? '';
            const relative = source.replace(/^\.?\//, '').replace(/\.ts$/, '');
            const levelMatch = relative.match(/^l(\d+)\/(.+)$/);
            if (!levelMatch) continue;

            const level = parseInt(levelMatch[1], 10);
            const afterLevel = levelMatch[2];
            const lastSlash = afterLevel.lastIndexOf('/');
            if (lastSlash < 0) continue;

            const rawFolder = afterLevel.substring(0, lastSlash);
            const shortName = afterLevel.substring(lastSlash + 1);
            if (!shortName) continue;

            let devicePath: string | null = null;
            for (const dp of Object.values(DEVICE_SUB_PATHS)) {
                if (rawFolder.includes(`/${dp}/`) || rawFolder.endsWith(`/${dp}`)) { devicePath = dp; break; }
            }
            if (!devicePath) continue;

            if (activeDevicePath && devicePath !== activeDevicePath) continue;

            // Swap the source's variation segment (e.g. page11) for the current one.
            const folder = rawFolder.replace(/page\d+(\/|$)/, `${variation}$1`);
            candidateCount++;

            // Only surface pages that actually exist for this layout/DS combination.
            if (!this._fileExists(project, level, folder, shortName)) continue;

            const name = page.pageId || shortName;
            if (!pageMap.has(name)) {
                const file = { project, folder, shortName, level, extension: '.ts' } as mls.stor.IFileInfo;
                pageMap.set(name, { devices: new Set(), file });
            }
            pageMap.get(name)!.devices.add(devicePath);
        }

        this._pages = Array.from(pageMap.entries())
            .map(([name, { devices, file }]) => ({ name, devices: Array.from(devices).sort(), file }))
            .sort((a, b) => a.name.localeCompare(b.name));

        // Config lists pages for this module/device, but none exist for the
        // current variation → offer to generate them.
        this._pagesNotCreated = candidateCount > 0 && this._pages.length === 0;

        this._dispatchConfig();
        this.requestUpdate();
        this._autoSelectActivePage();
        this._loadPageStatus();
    }

    // Compute each page's DS-version check (stale / review / fresh + details). Only meaningful
    // for non-default design systems (the default DS / origin pages carry no stamp).
    private async _loadPageStatus(): Promise<void> {
        this._checkByName = {};
        const module = this._modulePath;
        const project = getAuraState().actualProject;
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        if (!module || !project || this._pages.length === 0) return;
        // Gate (L6): only check staleness when the layout actually has rules configured.
        if (!(await layoutHasRules(project, layout))) return;

        const results = await Promise.all(this._pages.map(async (p) => {
            try {
                const check = await pageDsCheckByDefs(
                    { project: p.file.project, folder: p.file.folder ?? '', shortName: p.file.shortName },
                    module,
                    layout,
                    ds,
                );
                return [p.name, check] as const;
            } catch {
                return [p.name, null] as const;
            }
        }));

        const map: Record<string, PageDsCheck> = {};
        for (const [name, check] of results) if (check) map[name] = check;
        this._checkByName = map;
        this.requestUpdate();
    }

    private _renderStatusBadge(pageName: string) {
        const status = this._checkByName[pageName]?.status;
        if (status === 'stale') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400">
                ${this.msg.outdated}
            </span>`;
        if (status === 'review') return html`
            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400">
                ${this.msg.review}
            </span>`;
        return nothing;
    }

    // Re-fire the select event for the page already active in the state, so the
    // preview repaints when this component (re)loads.
    private _autoSelectActivePage(): void {
        const activePage = getAuraState().actualPage;
        if (!activePage) return;
        const index = this._pages.findIndex(p =>
            p.file.shortName === activePage.shortName &&
            p.file.project === activePage.project
        );
        if (index < 0) return;
        this._dispatchSelect(index + 1);
    }

    private _fileExists(project: number | null, level: number, folder: string, shortName: string): boolean {
        try {
            const key = mls.stor.getKeyToFile({ project, level, folder, shortName, extension: '.ts' });
            const file = (mls.stor.files as Record<string, any>)[key];
            return !!file && file.status !== 'deleted';
        } catch {
            return false;
        }
    }

    private _dispatchConfig() {
        const labels: Record<number, string> = { 0: 'All' };
        this._pages.forEach((p, i) => { labels[i + 1] = p.name; });
        labels[this._pages.length + 1] = '+';
        this.dispatchEvent(new CustomEvent('page-config', {
            detail: {
                min: 0,
                max: this._pages.length + 1,
                labels,
                pages: this._pages.map(p => ({ name: p.name, file: p.file })),
            },
            bubbles: true,
            composed: true,
        }));
    }

    createRenderRoot() { return this; }

    render() {
        if (!this._modulePath) return this._renderNoModule();
        if (this._pagesNotCreated) return this._renderNotCreated();
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNoModule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.noModule}</span>
                </div>
            </div>
        `;
    }

    private _renderHeader(value = 0, max = 1) {
        return html`
            <plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${this.msg.allTitle}
                .desc=${this.msg.desc}
                .value=${value}
                .min=${0}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></plugins--nav-header-102020>
        `;
    }

    private _renderSelected() {
        const page = this._selectedPage;
        const max = this._pages.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${page?.name ?? ''}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                ${page ? this._renderPageDetail(page) : nothing}
            </div>
        `;
    }

    private _renderPageDetail(page: IPageEntry) {
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5 flex flex-col gap-2">
                <div class="flex items-baseline gap-1">
                    <span class="text-xs text-gray-400 dark:text-gray-500">${this._moduleName}/</span>
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-200">${page.name}</span>
                    <span class="ml-auto">${this._renderStatusBadge(page.name)}</span>
                </div>
                <div class="flex items-center gap-1 flex-wrap">
                    <span class="text-xs text-gray-400 dark:text-gray-600">${this.msg.devices}:</span>
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                            ${DEVICE_LABELS[d] ?? d}
                        </span>
                    `)}
                </div>
            </div>
            ${this._renderDsVersionPanel(page)}
        `;
    }

    // ─── DS-version panel (review / stale) ────────────────────────────

    private _renderDsVersionPanel(page: IPageEntry) {
        const check = this._checkByName[page.name];
        if (!check) return nothing;
        if (check.status === 'review') return this._renderReviewPanel(page, check);
        if (check.status === 'stale') return this._renderStalePanel(page, check);
        return nothing;
    }

    private _renderReviewPanel(page: IPageEntry, check: PageDsCheck) {
        return html`
            <div class="rounded-lg border border-sky-200 dark:border-sky-800/40 bg-sky-50 dark:bg-sky-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-sky-700 dark:text-sky-300">${this.msg.reviewIntro}</span>
                <div class="flex flex-col gap-1.5">
                    ${check.changed.map(m => html`
                        <div class="flex flex-col">
                            <span class="text-xs text-gray-700 dark:text-gray-300">${this._humanizeGroup(m.group)}</span>
                            <span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${m.tag}</span>
                        </div>
                    `)}
                </div>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-sky-500 dark:bg-sky-600 text-white hover:bg-sky-600 dark:hover:bg-sky-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${this._busyPage === page.name}
                    @click=${() => this._onMarkReviewed(page)}
                >${this._busyPage === page.name ? this.msg.saving : this.msg.markReviewed}</button>
            </div>
        `;
    }

    private _renderStalePanel(page: IPageEntry, check: PageDsCheck) {
        const reason = {
            'rules': this.msg.staleReasonRules,
            'molecule-removed': this.msg.staleReasonRemoved,
            'molecule-incompatible': this.msg.staleReasonIncompatible,
            'no-stamp': this.msg.staleReasonNoStamp,
        }[check.staleReason ?? 'no-stamp'];
        const mol = check.staleMolecule;
        const task = getTask(`regenerate:${page.name}`);
        const running = task?.status === 'running';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-amber-700 dark:text-amber-300">${this.msg.staleIntro}</span>
                <span class="text-xs text-amber-600 dark:text-amber-400">${reason}</span>
                ${mol ? html`<span class="text-[10px] font-mono text-gray-400 dark:text-gray-500 truncate">${mol.tag}</span>` : nothing}
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-amber-500 dark:bg-amber-600 text-white hover:bg-amber-600 dark:hover:bg-amber-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${running}
                    @click=${() => this._onRegenerate(page)}
                >${running ? this.msg.regenerating : this.msg.regeneratePage}</button>
                ${task ? html`
                    <div class="flex items-center gap-2 text-xs">
                        ${task.status === 'running' ? html`<span class="text-indigo-500 dark:text-indigo-400 italic">${this.msg.regenerating}</span>` : nothing}
                        ${task.status === 'done' ? html`<span class="text-emerald-600 dark:text-emerald-400">✓ ${this.msg.regenerated}</span>` : nothing}
                        ${task.status === 'error' ? html`<span class="text-red-500 dark:text-red-400 truncate">${task.message ?? 'error'}</span>` : nothing}
                        ${this._taskInfoByName.get(page.name)?.task ? html`
                            <button class="ml-auto text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${() => this._openTask(page.name)}>${this.msg.followTask}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _humanizeGroup(group: string): string {
        return group.replace(/^group/, '').replace(/([A-Z])/g, ' $1').trim() || group;
    }

    private async _onMarkReviewed(page: IPageEntry) {
        const module = this._modulePath;
        const layout = getAuraState().actualLayout ?? 1;
        const ds = getAuraState().actualDesignSystem ?? 1;
        if (!module) return;
        this._busyPage = page.name;
        this.requestUpdate();
        await restampPage(
            { project: page.file.project, folder: page.file.folder ?? '', shortName: page.file.shortName },
            module,
            layout,
            ds,
            new Date().toISOString(),
        );
        this._busyPage = null;
        await this._loadPageStatus();
    }

    // Regenerate this single page through the DS-implementation agent (pages: [page]).
    private async _onRegenerate(page: IPageEntry) {
        const module = this._modulePath;
        const layout = getAuraState().actualLayout;
        const ds = getAuraState().actualDesignSystem;
        if (!module || layout == null || ds == null) return;
        // The agent's `device` is the segment after web/ (e.g. 'desktop'); aura stores 'web/desktop'.
        const device = (getAuraState().actualDevice ?? 'web/desktop').replace(/^web\//, '') || 'desktop';

        const taskKey = `regenerate:${page.name}`;
        if (getTask(taskKey)?.status === 'running') return;

        const materialize = true; // the button regenerates the rendered .ts page too
        const prompt = JSON.stringify({ module, layout, ds, device, pages: [page.name], materialize });
        // Pause the preview while the agent rewrites the defs (avoids repaint thrash); restore after.
        const prevPause = getState('preview.pausePreview');
        setState('preview.pausePreview', true);
        setTask(taskKey, { status: 'running', startedAt: Date.now() });
        try {
            // 1) DS-implementation: rewrite the page defs (page{layout}{ds}/<page>.defs.ts).
            await this._executeAgent('agentImplementGenome', prompt, (data) => {
                this._taskInfoByName.set(page.name, data);
                this.requestUpdate(); // surface "Follow task" as soon as the task exists
            });
            // 2) Materialize: read the now-stale defs and generate the .ts page. Unpause first
            //    so the .ts write repaints the preview with the new result.
            if (materialize) {
                setState('preview.pausePreview', prevPause ?? false);
                await this._executeAgent('agentMaterializeL2', '{}');
            }
            setTask(taskKey, { ...getTask(taskKey)!, status: 'done' });
        } catch (e: any) {
            setTask(taskKey, { ...getTask(taskKey)!, status: 'error', message: e?.message });
        } finally {
            setState('preview.pausePreview', prevPause ?? false);
            await this._loadPageStatus(); // re-check: the regenerated page should now be fresh
        }
    }

    private async _executeAgent(
        agentName: string,
        prompt: string,
        onTaskCreated?: (data: { taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }) => void,
    ): Promise<{ taskId: string; task?: mls.msg.TaskData; message?: mls.msg.Message }> {
        const fullName = '_102020_/l2/servicePage';
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
        if (!userId || !threadId) return { taskId: '' };

        const moduleAgent = await loadAgent(agentName);
        if (!moduleAgent) throw new Error('Invalid agent');
        const context = getTemporaryContext(threadId, userId, prompt);

        let taskId = '';
        let task: mls.msg.TaskData | undefined;
        let message: mls.msg.Message | undefined;
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                taskId = event.taskId; task = event.task; message = event.message;
                onTaskCreated?.({ taskId, task, message });
            }
        }
        return { taskId, task, message };
    }

    private async _openTask(pageName: string) {
        const info = this._taskInfoByName.get(pageName);
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', info.message?.createAt ?? '');
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this._pages
            .map((p, i) => ({ p, selectValue: i + 1 }))
            .filter(({ p }) => !q || p.name.toLowerCase().includes(q));
        const max = this._pages.length + 1;
        const activePage = getAuraState().actualPage;

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

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <button
                    class="
                        self-end text-sm px-2.5 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
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

                ${this._pages.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noPages}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ p, selectValue }) => {
                                    const isActive = !!activePage
                                        && p.file.shortName === activePage.shortName
                                        && p.file.project === activePage.project;
                                    return this._renderPageCard(p, selectValue, isActive);
                                })}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this._pages.length + 1;
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
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.inDevelopment}</span>
                </div>
            </div>
        `;
    }

    private _renderNotCreated() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader()}

                ${this._activeDevice ? html`
                    <div class="flex items-center gap-1.5 px-1">
                        <div class="w-1.5 h-1.5 rounded-full bg-indigo-500 shrink-0"></div>
                        <span class="text-xs text-indigo-600 dark:text-indigo-400 font-medium">${this._activeDevice}</span>
                    </div>
                ` : nothing}

                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.notCreated}</span>
                </div>

                <button
                    class="
                        self-start text-sm px-3 py-1.5 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors whitespace-nowrap cursor-pointer
                    "
                    @click=${() => this._dispatchGenerate()}
                >${this.msg.generatePages}</button>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderPageCard(page: IPageEntry, selectValue: number, isActive = false) {
        return html`
            <div
                class="
                    rounded-lg border px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                    ${isActive
                        ? 'border-emerald-200 dark:border-emerald-700/50 bg-emerald-50 dark:bg-emerald-900/10 hover:bg-emerald-100 dark:hover:bg-emerald-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:bg-gray-100 dark:hover:bg-gray-800/70'}
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                ${isActive ? html`<div class="w-1.5 h-1.5 rounded-full bg-emerald-500 dark:bg-emerald-400 shrink-0"></div>` : nothing}
                <div class="flex-1 flex items-baseline gap-1 min-w-0">
                    <span class="text-[10px] text-gray-400 dark:text-gray-600 shrink-0">${this._moduleName}/</span>
                    <span class="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">${page.name}</span>
                </div>
                <div class="flex items-center gap-1 shrink-0">
                    ${this._renderStatusBadge(page.name)}
                    ${page.devices.map(d => html`
                        <span class="text-[10px] font-medium px-1 py-0.5 rounded bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400">
                            ${DEVICE_LABELS[d]?.replace('Web ', '') ?? d}
                        </span>
                    `)}
                </div>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        const entry = value > 0 && value <= this._pages.length ? this._pages[value - 1] : null;
        this.dispatchEvent(new CustomEvent('select-page', {
            detail: { value, file: entry?.file ?? null },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchGenerate() {
        this.dispatchEvent(new CustomEvent('generate-pages', {
            detail: {
                module: this._modulePath,
                device: getAuraState().actualDevice,
                layout: getAuraState().actualLayout,
                designSystem: getAuraState().actualDesignSystem,
            },
            bubbles: true,
            composed: true,
        }));
    }
}
