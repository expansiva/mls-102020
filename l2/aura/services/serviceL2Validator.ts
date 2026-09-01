/// <mls fileReference="_102020_/l2/aura/services/serviceL2Validator.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { createModel } from '/_102027_/l2/libModel.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'L2 Validator',
    loading: 'Loading…',
    noItems: 'Nothing found.',
    selectItem: 'Select a page to inspect.',
    frontendCall: 'Called by the frontend',
    backendRoute: 'Exists in the backend',
    contract: 'Contract',
    shared: 'Shared (execBff call site)',
    controller: 'Backend controller',
    notFound: 'not found',
    linked: 'linked',
    notLinked: 'not linked',
    folder: 'folder',
    page: 'page',
    totalCount: (total: number, issues: number) => `${total} total · ${issues} not linked`,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Validador L2',
        loading: 'Carregando…',
        noItems: 'Nada encontrado.',
        selectItem: 'Selecione uma página para inspecionar.',
        frontendCall: 'Chamada pelo frontend',
        backendRoute: 'Existe no backend',
        contract: 'Contrato',
        shared: 'Shared (ponto de chamada execBff)',
        controller: 'Controller do backend',
        notFound: 'não encontrado',
        linked: 'ligado',
        notLinked: 'não ligado',
        folder: 'folder',
        page: 'page',
        totalCount: (total: number, issues: number) => `${total} no total · ${issues} não ligados`,
    },
    es: {
        svcTitle: 'Validador L2',
        loading: 'Cargando…',
        noItems: 'Nada encontrado.',
        selectItem: 'Seleccione una página para inspeccionar.',
        frontendCall: 'Llamada por el frontend',
        backendRoute: 'Existe en el backend',
        contract: 'Contrato',
        shared: 'Shared (punto de llamada execBff)',
        controller: 'Controller del backend',
        notFound: 'no encontrado',
        linked: 'ligado',
        notLinked: 'no ligado',
        folder: 'folder',
        page: 'page',
        totalCount: (total: number, issues: number) => `${total} en total · ${issues} no ligados`,
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IRouteRow {
    key: string;
    page: string;
    routeName: string;
    route: string;
    contractPath: string;
    sharedPath: string | null;
    backendPath: string | null;
    backendProject: number | null;
    calledInFrontend: boolean;
    existsInBackend: boolean;
    hasIssue: boolean;
}

interface IPageRow {
    key: string;
    page: string;
    folder: string | null;
    sharedPath: string | null;
    routes: IRouteRow[];
    hasIssue: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-l2-validator-102020')
export class ServiceL2Validator102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf0c1',
        state: 'foreground',
        position: 'left',
        tooltip: 'L2 Validator',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceL2Validator',
        level: [2],
    };

    public onClickMain(_op: string): void { }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    async onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        await this._loadAudit();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _loading: boolean = false;
    private _auditProject: number | null = null;

    @state() private _pages: IPageRow[] = [];
    @state() private _selectedPage: IPageRow | null = null;

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        void this._loadAudit();
        mls.events.addListener(2, 'FileAction', this._onFileAction);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        mls.events.removeEventListener([2], ['FileAction'], this._onFileAction);
    }

    createRenderRoot() { return this; }

    /** Selecting a file elsewhere (e.g. via serviceUnit's file explorer) selects the matching
     *  page here too, keyed by shortName — the same identifier a page's contract/shared/desktop
     *  files all share. */
    private readonly _onFileAction = (ev: mls.events.IEvent): void => {
        if (!ev.desc) return;
        try {
            const fa = JSON.parse(ev.desc) as mls.events.IFileAction;
            if (fa.action !== 'open') return;
            const match = this._pages.find((p) => p.page === fa.shortName);
            if (!match) return;
            this._selectedPage = match;
            this.requestUpdate();
        } catch { /* ignore malformed events */ }
    };

    // ─── Discovery + check (mls.stor.files, level 1 backend + level 2 frontend) ─

    private async _loadAudit(): Promise<void> {
        const project = mls.actualProject || 0;
        if (!project || this._auditProject === project) return;
        this._loading = true;
        this.requestUpdate();

        const all: mls.stor.IFileInfo[] = [];
        for (const file of Object.values(mls.stor.files)) {
            if (!file || file.project !== project) continue;
            if (file.status === 'deleted') continue;
            if (file.level !== 1 && file.level !== 2) continue;
            all.push(file);
        }
        const moduleId = mls.actualModule || this._inferModule(all);
        const under = (level: number, suffix: string) => all.filter((f) => f.level === level && f.folder === `${moduleId}/${suffix}`);

        const contractFiles = under(2, 'web/contracts').filter((f) => f.extension === '.ts');
        const sharedFiles = under(2, 'web/shared').filter((f) => f.extension === '.ts');
        const controllerDefs = under(1, 'layer_1_external/adapters/http/controllers').filter((f) => f.extension === '.defs.ts');
        const desktopFiles = all.filter((f) => f.level === 2 && f.extension === '.ts' && new RegExp(`^${moduleId}/web/desktop/page\\d+$`).test(f.folder));

        const rows = await this._checkRoutes(contractFiles, sharedFiles, controllerDefs);
        const pages = this._groupByPage(rows, desktopFiles);

        this._pages = pages;
        this._auditProject = project;
        this._loading = false;
        this._selectedPage = pages[0] ?? null;
        this.requestUpdate();
    }

    /** Groups the flat route list by page, and resolves each page's primary desktop folder — a
     *  page renders under several layout/DS variants (page11, page21, page31, …), all sharing the
     *  same contract/routes, so the FIRST one found (sorted) is shown as the representative folder. */
    private _groupByPage(rows: IRouteRow[], desktopFiles: mls.stor.IFileInfo[]): IPageRow[] {
        const foldersByPage = new Map<string, string[]>();
        for (const f of desktopFiles) {
            const list = foldersByPage.get(f.shortName) ?? [];
            list.push(f.folder);
            foldersByPage.set(f.shortName, list);
        }

        const pageMap = new Map<string, IRouteRow[]>();
        for (const row of rows) {
            const list = pageMap.get(row.page) ?? [];
            list.push(row);
            pageMap.set(row.page, list);
        }

        const pages: IPageRow[] = [];
        for (const [page, routes] of pageMap) {
            const folders = (foldersByPage.get(page) ?? []).sort();
            const sharedPath = routes.find((r) => r.sharedPath)?.sharedPath ?? null;
            pages.push({ key: page, page, folder: folders[0] ?? null, sharedPath, routes, hasIssue: routes.some((r) => r.hasIssue) });
        }
        pages.sort((a, b) => a.page.localeCompare(b.page));
        return pages;
    }

    private _inferModule(files: mls.stor.IFileInfo[]): string {
        for (const file of files) {
            const first = file.folder.split('/')[0];
            if (first && first !== 'trace') return first;
        }
        return '';
    }

    /** First `export const … = {…} as const;` artifact block — same idiom the codegen agents use
     *  (e.g. agentCbHttpController.ts). Unwraps to the artifact's `data`. */
    private _parseArtifactData(content: string): Record<string, unknown> | undefined {
        const s = content.indexOf('= ');
        const e = content.indexOf(' as const');
        if (s === -1 || e <= s) return undefined;
        try {
            const parsed = JSON.parse(content.slice(s + 2, e));
            if (!parsed || typeof parsed !== 'object') return undefined;
            const data = (parsed as { data?: unknown }).data;
            return data && typeof data === 'object' ? data as Record<string, unknown> : parsed as Record<string, unknown>;
        } catch {
            return undefined;
        }
    }

    private _tsPath(file: mls.stor.IFileInfo): string {
        return `${file.folder}/${file.shortName}.ts`;
    }

    /** Navigates to l1 and opens the backend controller file for this route in serviceSourceL1 —
     *  mirrors pluginExploreList.ts's own `fireEvents('open', file, {})` exactly (not just the
     *  FileAction fire): create the file's model first, set `mls.actual[1]` to it, THEN fire —
     *  serviceSourceL1's listener resolves the file from mls.stor.files by key, but other state
     *  (breadcrumb, "currently open" tracking) reads mls.actual[level] directly. */
    private async _goToBackendFile(row: IRouteRow): Promise<void> {
        if (!row.backendPath || row.backendProject == null) return;
        const lastSlash = row.backendPath.lastIndexOf('/');
        const folder = lastSlash >= 0 ? row.backendPath.slice(0, lastSlash) : '';
        const fileName = lastSlash >= 0 ? row.backendPath.slice(lastSlash + 1) : row.backendPath;
        const shortName = fileName.replace(/\.ts$/, '');
        const project = row.backendProject;

        const key = mls.stor.getKeyToFiles(project, 1, shortName, folder, '.ts');
        const file = mls.stor.files[key];
        if (!file) return;

        const position = this.position as ('left' | 'right');

        // l1ServicesLeft has several widgets competing for the same slot (apiExplorer,
        // l1Validator, serviceProject, serviceSourceL1) — selectLevel alone only switches the
        // active level, it does not guarantee serviceSourceL1 is the one actually mounted there.
        // Without it being mounted, its FileAction listener was never registered, and the fire
        // below lands on nobody.
        this.selectLevel(1);
        this.openService('_100554_serviceSourceL1', position, 1);

        await createModel(file, true, false);

        const name = folder ? `_${project}_${folder}/${shortName}` : `_${project}_${shortName}`;
        mls.actual[1].setFullName(name);
        mls.actual[1][position] = file;

        const params: mls.events.IFileAction = {
            action: 'open',
            level: 1,
            project,
            shortName,
            folder,
            extension: '.ts',
            position,
        };
        mls.events.fire([1], ['FileAction'], JSON.stringify(params), 0);
    }

    // ─── Check: contract route → actually called by the frontend, AND → really exists in l1 ─
    // Every route declared in every page's contracts file is listed, not just the broken ones.

    private async _checkRoutes(
        contractFiles: mls.stor.IFileInfo[],
        sharedFiles: mls.stor.IFileInfo[],
        controllerDefsFiles: mls.stor.IFileInfo[],
    ): Promise<IRouteRow[]> {
        const backendRoutes = new Map<string, { path: string; project: number }>();
        for (const f of controllerDefsFiles) {
            const data = this._parseArtifactData(String(await f.getContent()));
            const handlers = Array.isArray((data as { handlers?: unknown } | undefined)?.handlers)
                ? (data as { handlers: Array<Record<string, unknown>> }).handlers
                : [];
            for (const handler of handlers) {
                if (typeof handler.route === 'string') backendRoutes.set(handler.route, { path: this._tsPath(f), project: f.project });
            }
        }

        const sharedByShortName = new Map(sharedFiles.map((f) => [f.shortName, f]));
        const rows: IRouteRow[] = [];
        const routeRe = /export const (\w+Route) = '([^']+)' as const;/g;

        for (const contractFile of contractFiles) {
            const content = String(await contractFile.getContent());
            const sharedFile = sharedByShortName.get(contractFile.shortName);
            const sharedContent = sharedFile ? String(await sharedFile.getContent()) : '';

            routeRe.lastIndex = 0;
            let match: RegExpExecArray | null;
            while ((match = routeRe.exec(content))) {
                const [, routeName, route] = match;
                const calledInFrontend = sharedFile
                    ? new RegExp(`execBff\\s*(?:<[^>]*>)?\\(\\s*${routeName}\\b`).test(sharedContent)
                    : false;
                const backendInfo = backendRoutes.get(route);
                const existsInBackend = Boolean(backendInfo);
                rows.push({
                    key: `${contractFile.shortName}:${routeName}`,
                    page: contractFile.shortName,
                    routeName,
                    route,
                    contractPath: this._tsPath(contractFile),
                    sharedPath: sharedFile ? this._tsPath(sharedFile) : null,
                    backendPath: backendInfo?.path ?? null,
                    backendProject: backendInfo?.project ?? null,
                    calledInFrontend,
                    existsInBackend,
                    hasIssue: !calledInFrontend || !existsInBackend,
                });
            }
        }
        rows.sort((a, b) => a.page.localeCompare(b.page) || a.routeName.localeCompare(b.routeName));
        return rows;
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._loading ? html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.loading}</div>` : html`
                    ${this._renderItemList()}
                    ${this._renderDetail()}
                `}
            </div>
        `;
    }

    private _renderItemList() {
        const pages = this._pages;
        const totalRoutes = pages.reduce((sum, p) => sum + p.routes.length, 0);
        const issueRoutes = pages.reduce((sum, p) => sum + p.routes.filter((r) => r.hasIssue).length, 0);
        return html`
            <div class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                <div class="px-3 py-2 text-[10px] text-gray-400">${this.msg.totalCount(totalRoutes, issueRoutes)}</div>
                ${!pages.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                ${pages.map((p) => html`
                    <div
                        class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedPage?.key === p.key
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                        @click=${() => { this._selectedPage = p; this.requestUpdate(); }}
                    >
                        <div class="font-mono text-[10px] text-gray-400 truncate">${this.msg.folder}: ${p.folder ? `${p.folder}/` : this.msg.notFound}</div>
                        <div class="text-xs font-semibold truncate ${p.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${this.msg.page}: ${p.page}</div>
                        <div class="font-mono text-[10px] truncate ${p.sharedPath ? 'text-gray-400' : 'text-amber-500'}">${this.msg.shared}: ${p.sharedPath ?? this.msg.notFound}</div>
                    </div>
                `)}
            </div>
        `;
    }

    private _renderDetail() {
        const page = this._selectedPage;
        if (!page) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
                <div>
                    <div class="font-mono text-xs text-gray-400">${this.msg.folder}: ${page.folder ? `${page.folder}/` : this.msg.notFound}</div>
                    <div class="text-sm font-semibold">${this.msg.page}: ${page.page}</div>
                    <div class="font-mono text-xs ${page.sharedPath ? 'text-gray-500' : 'text-amber-500'}">${this.msg.shared}: ${page.sharedPath ?? this.msg.notFound}</div>
                </div>
                ${page.routes.map((row) => html`
                    <div class="border-t border-gray-100 dark:border-gray-900 pt-3 flex flex-col gap-1.5">
                        <div class="font-mono text-sm ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${row.route}</div>

                        <div class="text-[10px] text-gray-500 uppercase tracking-wide font-semibold mt-1">${this.msg.contract}</div>
                        <div class="font-mono text-xs text-gray-500">${row.contractPath}</div>

                        <div class="text-xs ${row.calledInFrontend ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">
                            ${this.msg.frontendCall}: ${row.calledInFrontend ? this.msg.linked : this.msg.notLinked}
                            ${row.sharedPath ? html`<span class="font-mono text-gray-400"> · ${row.sharedPath}</span>` : nothing}
                        </div>

                        <div class="text-xs ${row.existsInBackend ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">
                            ${this.msg.backendRoute}: ${row.existsInBackend ? this.msg.linked : this.msg.notLinked}
                            ${row.backendPath ? html`
                                <span
                                    class="font-mono text-cyan-600 dark:text-cyan-400 cursor-pointer hover:underline"
                                    @click=${() => void this._goToBackendFile(row)}
                                > · ${row.backendPath}</span>
                            ` : nothing}
                        </div>
                    </div>
                `)}
            </div>
        `;
    }
}
