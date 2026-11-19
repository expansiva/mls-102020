/// <mls fileReference="_102020_/l2/aura/services/serviceComponentExplorer.ts" enhancement="_102027_/l2/enhancementLit"/>

// Where each component (molecules, organisms, the project's own components) is used: on which screens,
// how many times and on which lines. Before changing a component, the person sees everything that
// changes with it. The index itself is pure and tested (helpers/componentUsage.ts); this file reads the
// stor, keeps the index current and draws it.

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { createModel } from '/_102027_/l2/libModel.js';
import { resolveTagToFile } from '/_102020_/l2/utils.js';
import { runWithConcurrency } from '/_102020_/l2/aura/helpers/runWithConcurrency.js';
import {
    buildComponentUsage,
    fileKey,
    followTargets,
    parseSource,
    type IComponentUsage,
    type IConfigPage,
    type IFileRef,
    type IScreenUse,
    type IUsageIndex,
    type IUsageSource,
    type IUsageWarning,
} from '/_102020_/l2/aura/helpers/componentUsage.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Component Explorer',
    search: 'search component',
    loading: 'Reading the files…',
    noProject: 'No project selected.',
    noComponents: 'No component found.',
    selectComponent: 'Select a component to see where it is used.',
    ownProject: 'project',
    warnings: 'warnings',
    open: 'Open source',
    usedInside: 'Used inside',
    uses: 'uses',
    screens: 'screens',
    modules: 'modules',
    noScreen: 'no screen',
    noImport: 'no import',
    importWithoutUse: 'Import without use',
    usedWithoutImport: 'Used without import',
    unresolvedTag: 'Tag that does not resolve',
    staticOnly: 'Static reading: components loaded by import() or written as text (unsafeHTML) do not show up.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Explorar componentes',
        search: 'buscar componente',
        loading: 'Lendo os arquivos…',
        noProject: 'Nenhum projeto selecionado.',
        noComponents: 'Nenhum componente encontrado.',
        selectComponent: 'Selecione um componente para ver onde ele é usado.',
        ownProject: 'do projeto',
        warnings: 'avisos',
        open: 'Abrir código',
        usedInside: 'Usado dentro de',
        uses: 'usos',
        screens: 'telas',
        modules: 'módulos',
        noScreen: 'nenhuma tela',
        noImport: 'sem import',
        importWithoutUse: 'Import sem uso',
        usedWithoutImport: 'Usado sem importar',
        unresolvedTag: 'Tag que não resolve',
        staticOnly: 'Leitura estática: componentes carregados por import() ou montados por texto (unsafeHTML) não aparecem.',
    },
    es: {
        svcTitle: 'Explorar componentes',
        search: 'buscar componente',
        loading: 'Leyendo los archivos…',
        noProject: 'Ningún proyecto seleccionado.',
        noComponents: 'Ningún componente encontrado.',
        selectComponent: 'Seleccione un componente para ver dónde se usa.',
        ownProject: 'del proyecto',
        warnings: 'avisos',
        open: 'Abrir código',
        usedInside: 'Usado dentro de',
        uses: 'usos',
        screens: 'pantallas',
        modules: 'módulos',
        noScreen: 'ninguna pantalla',
        noImport: 'sin import',
        importWithoutUse: 'Import sin uso',
        usedWithoutImport: 'Usado sin importar',
        unresolvedTag: 'Tag que no resuelve',
        staticOnly: 'Lectura estática: componentes cargados por import() o montados como texto (unsafeHTML) no aparecen.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IProjectGroup {
    project: number;
    own: boolean;
    folders: { folder: string; components: IComponentUsage[] }[];
}

/** FileAction actions after which a file's content may be different. */
const CONTENT_ACTIONS = new Set(['changed', 'statusOrErrorChanged', 'updatedOnServer', 'new', 'delete', 'rename', 'undo']);

/** Line chips shown per file before collapsing the rest into "+N". */
const MAX_LINES = 6;

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-component-explorer-102020')
export class ServiceComponentExplorer102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf1b3',
        state: 'foreground',
        position: 'left',
        tooltip: 'Component Explorer',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceComponentExplorer',
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

    async onServiceClick(visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        if (visible) void this._load();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _index: IUsageIndex | null = null;
    @state() private _loading = false;
    @state() private _selectedKey: string | null = null;
    @state() private _search = '';
    @state() private _collapsed = new Set<string>();
    /** Files whose line chips are all shown ("+N" clicked). */
    @state() private _expandedLines = new Set<string>();

    private _project = 0;
    private _loadToken = 0;
    /** The `.ts` files read, by fileKey. Kept so a save rereads one file, not all. */
    private _sources = new Map<string, IUsageSource>();
    private _pages: IConfigPage[] = [];
    private _refreshTimer: ReturnType<typeof setTimeout> | undefined;
    private _pendingRefresh = new Set<string>();

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        void this._load();
        mls.events.addListener(2, 'FileAction', this._onFileAction);
    }

    disconnectedCallback() {
        super.disconnectedCallback();
        mls.events.removeEventListener([2], ['FileAction'], this._onFileAction);
        clearTimeout(this._refreshTimer);
    }

    createRenderRoot() { return this; }

    // ─── Reading (mls.stor) ───────────────────────────────────────────

    private _storFile(ref: IFileRef): mls.stor.IFileInfo | undefined {
        const file = mls.stor.files[mls.stor.getKeyToFiles(ref.project, 2, ref.shortName, ref.folder, '.ts')];
        return file && file.status !== 'deleted' ? file : undefined;
    }

    private async _read(file: mls.stor.IFileInfo): Promise<IUsageSource | undefined> {
        const content = await file.getContent();
        if (typeof content !== 'string') return undefined;
        return { project: file.project, folder: file.folder, shortName: file.shortName, content };
    }

    /**
     * Tag -> file for tags no read file declares: resolveTagToFile, kept only when the file exists in the
     * stor. The legacy format turns `ml-scenary` into `mlScenary`, so the kebab name is tried too.
     */
    private readonly _resolveTag = (tag: string): IFileRef | undefined => {
        let found: IFileRef | undefined;
        try {
            const resolved = resolveTagToFile(tag);
            if (!resolved) return undefined;
            const kebab = resolved.shortName.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase();
            for (const shortName of [resolved.shortName, kebab]) {
                const ref = { project: resolved.project, folder: resolved.folder, shortName };
                if (this._storFile(ref)) { found = ref; break; }
            }
        } catch { /* no project / no stor: unresolved */ }
        return found;
    };

    private async _readConfigPages(project: number): Promise<IConfigPage[]> {
        const file = mls.stor.files[mls.stor.getKeyToFiles(project, 5, 'config', '', '.json')];
        if (!file) return [];
        try {
            const config = JSON.parse(String(await file.getContent()));
            const modules = config?.projects?.[String(project)]?.modules ?? [];
            return modules.flatMap((module: any) => Array.isArray(module?.frontend?.pages) ? module.frontend.pages : []);
        } catch {
            return [];
        }
    }

    private async _readAll(files: mls.stor.IFileInfo[]): Promise<void> {
        const results = await runWithConcurrency(files, 8, (file) => this._read(file));
        for (const result of results) {
            if (result.ok && result.value) this._sources.set(fileKey(result.value), result.value);
        }
    }

    /** The project's l2 `.ts` files, then whatever their tags and side-effect imports lead to
     *  (components inside components), across projects. */
    private async _load(force = false): Promise<void> {
        const project = mls.actualProject || 0;
        if (!project || (!force && this._project === project && (this._index || this._loading))) return;
        const token = ++this._loadToken;
        this._project = project;
        this._loading = true;
        this._index = null;
        this._sources = new Map();
        this.requestUpdate();

        try {
            await mls.stor.loadProjectdependenciesInfoIfNeed(project);
        } catch { /* best effort: whatever is loaded is read */ }

        const own = Object.values(mls.stor.files).filter((file) =>
            file && file.project === project && file.level === 2 && file.extension === '.ts' && file.status !== 'deleted');
        const [pages] = await Promise.all([this._readConfigPages(project), this._readAll(own)]);
        if (token !== this._loadToken) return;
        this._pages = pages;

        await this._followTargets(token);
        if (token !== this._loadToken) return;
        this._rebuild();
        this._loading = false;
        this.requestUpdate();
    }

    private async _followTargets(token: number): Promise<void> {
        const declared = new Map<string, IFileRef>();
        const resolve = (tag: string) => declared.get(tag) ?? this._resolveTag(tag);
        const visited = new Set<string>();
        let pending = [...this._sources.values()];
        while (pending.length && token === this._loadToken) {
            const toRead = new Map<string, mls.stor.IFileInfo>();
            const parsed = pending.map((source) => parseSource(source));
            for (const p of parsed) for (const tag of p.declares) if (!declared.has(tag)) declared.set(tag, p.ref);
            for (const p of parsed) {
                visited.add(p.key);
                for (const target of followTargets(p, resolve)) {
                    const key = fileKey(target);
                    if (visited.has(key) || this._sources.has(key) || toRead.has(key)) continue;
                    const file = this._storFile(target);
                    if (file) toRead.set(key, file);
                    else visited.add(key);
                }
            }
            const before = new Set(this._sources.keys());
            await this._readAll([...toRead.values()]);
            pending = [...this._sources.entries()].filter(([key]) => !before.has(key)).map(([, source]) => source);
        }
    }

    private _rebuild(): void {
        this._index = buildComponentUsage({
            project: this._project,
            sources: [...this._sources.values()],
            resolveTag: this._resolveTag,
            pages: this._pages,
        });
    }

    // ─── Keeping it current: a saved file is reread alone ────────────

    private readonly _onFileAction = (ev: mls.events.IEvent): void => {
        if (!ev.desc) return;
        try {
            const fa = JSON.parse(ev.desc) as mls.events.IFileAction;
            if (fa.action === 'open' && fa.level === 2 && fa.extension === '.ts') {
                // Opening a used component elsewhere selects it here.
                const key = fileKey({ project: fa.project, folder: fa.folder, shortName: fa.shortName });
                if (this._index?.components.some((c) => c.key === key && c.uses > 0)) {
                    this._selectedKey = key;
                    this.requestUpdate();
                }
                return;
            }
            if (!CONTENT_ACTIONS.has(fa.action)) return;
            if (fa.project !== this._project) {
                if (fa.action === 'statusOrErrorChanged' || fa.action === 'changed') this._queueRefresh(fa);
                return;
            }
            if (fa.action === 'rename' || fa.action === 'delete' || fa.action === 'new') {
                void this._load(true);
                return;
            }
            this._queueRefresh(fa);
        } catch { /* ignore malformed events */ }
    };

    private _queueRefresh(fa: mls.events.IFileAction): void {
        if (fa.level !== 2 || fa.extension !== '.ts') return;
        const key = fileKey({ project: fa.project, folder: fa.folder, shortName: fa.shortName });
        if (fa.project !== this._project && !this._sources.has(key)) return;
        this._pendingRefresh.add(key);
        clearTimeout(this._refreshTimer);
        this._refreshTimer = setTimeout(() => void this._refreshPending(), 400);
    }

    private async _refreshPending(): Promise<void> {
        const keys = [...this._pendingRefresh];
        this._pendingRefresh.clear();
        let changed = false;
        for (const key of keys) {
            const m = /^_(\d+)_\/l2\/(?:(.*)\/)?([^/]+)$/.exec(key);
            if (!m) continue;
            const file = this._storFile({ project: Number(m[1]), folder: m[2] ?? '', shortName: m[3] });
            const source = file ? await this._read(file) : undefined;
            const old = this._sources.get(key);
            if (source && source.content !== old?.content) { this._sources.set(key, source); changed = true; }
            if (!source && old) { this._sources.delete(key); changed = true; }
        }
        if (!changed) return;
        await this._followTargets(this._loadToken);
        this._rebuild();
        this.requestUpdate();
    }

    // ─── Open the source (the other side), optionally at a line ──────

    /**
     * The serviceSource only SHOWS models that already exist (`mls.editor.getModels`); it does not create
     * them. So, as the genome and the L2 validator do: create the models, point `mls.actual[2]` at the
     * file, then fire the standard 'open' FileAction for the opposite side.
     */
    private async _openFile(ref: IFileRef, line?: number): Promise<void> {
        const file = this._storFile(ref);
        if (!file) return;
        const position: 'left' | 'right' = this.position === 'right' ? 'left' : 'right';

        const files = await mls.stor.getFiles({ project: file.project, shortName: file.shortName, folder: file.folder, loadContent: false });
        if (files.ts) await createModel(files.ts);
        if (files.html) await createModel(files.html);
        if (files.less) await createModel(files.less);

        const name = file.folder ? `_${file.project}_${file.folder}/${file.shortName}` : `_${file.project}_${file.shortName}`;
        mls.actual[2].setFullName(name);
        mls.actual[2][position] = file;

        const params: mls.events.IFileAction = {
            action: 'open',
            level: 2,
            project: file.project,
            shortName: file.shortName,
            folder: file.folder,
            extension: '.ts',
            position,
        };
        mls.events.fire([2], ['FileAction'], JSON.stringify(params), 0);

        if (!line) return;
        const content = this._sources.get(fileKey(ref))?.content;
        if (content === undefined) return;
        let offset = 0;
        for (let current = 1; current < line; current++) {
            const next = content.indexOf('\n', offset);
            if (next === -1) break;
            offset = next + 1;
        }
        // The serviceSource opens asynchronously: wait for its editor to show this file before moving.
        for (let tries = 0; tries < 30; tries++) {
            if (mls.editor.editors[position]?.ts?.storFile === file) break;
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
        await mls.events.fireMonacoAction('gotoPosition', file, undefined, position, offset + 1);
    }

    // ─── Derived ──────────────────────────────────────────────────────

    private _matches(component: IComponentUsage): boolean {
        const query = this._search.trim().toLowerCase();
        if (!query) return true;
        return component.ref.shortName.toLowerCase().includes(query)
            || component.tag.toLowerCase().includes(query)
            || component.ref.folder.toLowerCase().includes(query);
    }

    /** Only components with uses: one nobody uses is not listed. */
    private get _groups(): IProjectGroup[] {
        const byProject = new Map<number, Map<string, IComponentUsage[]>>();
        for (const component of this._index?.components ?? []) {
            if (!component.uses || !this._matches(component)) continue;
            const project = component.ref.project;
            if (!byProject.has(project)) byProject.set(project, new Map());
            const folders = byProject.get(project)!;
            const list = folders.get(component.ref.folder) ?? [];
            list.push(component);
            folders.set(component.ref.folder, list);
        }
        return [...byProject.entries()]
            .map(([project, folders]) => ({
                project,
                own: project === this._project,
                folders: [...folders.entries()]
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([folder, components]) => ({ folder, components: components.sort((a, b) => b.uses - a.uses || a.ref.shortName.localeCompare(b.ref.shortName)) })),
            }))
            // Dependencies first (where the shared components live), the project's own last.
            .sort((a, b) => Number(a.own) - Number(b.own) || a.project - b.project);
    }

    private get _selected(): IComponentUsage | undefined {
        return this._index?.components.find((c) => c.key === this._selectedKey && c.uses > 0);
    }

    private get _warnings(): IUsageWarning[] {
        return (this._index?.warnings ?? []).filter((w) => w.kind !== 'unused-component');
    }

    private _toggle(id: string): void {
        const next = new Set(this._collapsed);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        this._collapsed = next;
    }

    private _warningLabel(warning: IUsageWarning): string {
        switch (warning.kind) {
            case 'import-without-use': return this.msg.importWithoutUse;
            case 'used-without-import': return this.msg.usedWithoutImport;
            default: return this.msg.unresolvedTag;
        }
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        if (!mls.actualProject) {
            return html`<div class="p-3 text-xs text-gray-400">${this.msg.noProject}</div>`;
        }
        return html`
            <div class="flex h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderList()}
                ${this._renderDetail()}
            </div>
        `;
    }

    // ── Left: the components ──

    private _renderList() {
        const groups = this._groups;
        const warnings = this._warnings;
        return html`
            <div class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                <div class="p-2 border-b border-gray-200 dark:border-gray-800">
                    <input
                        type="search"
                        class="w-full text-xs px-2 py-1.5 rounded-md border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900 focus:outline-none focus:ring-1 focus:ring-cyan-500"
                        placeholder=${this.msg.search}
                        .value=${this._search}
                        @input=${(e: Event) => { this._search = (e.target as HTMLInputElement).value; }}
                    />
                </div>
                <div class="flex-1 overflow-y-auto pb-2">
                    ${this._loading ? html`<div class="p-3 text-xs text-gray-400">${this.msg.loading}</div>` : nothing}
                    ${!this._loading && this._index && !groups.length
                ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noComponents}</div>`
                : nothing}
                    ${groups.map((group) => this._renderProjectGroup(group))}
                    ${warnings.length ? this._renderWarnings(warnings) : nothing}
                </div>
            </div>
        `;
    }

    private _renderProjectGroup(group: IProjectGroup) {
        const id = `p:${group.project}`;
        const closed = this._collapsed.has(id);
        return html`
            <div
                class="sticky top-0 z-10 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800"
                @click=${() => this._toggle(id)}
            >${closed ? '▸' : '▾'} ${group.project}${group.own ? html` <span class="font-normal normal-case text-gray-400">· ${this.msg.ownProject}</span>` : nothing}</div>
            ${closed ? nothing : group.folders.map((folder) => html`
                <div class="px-3 pt-2 pb-0.5 text-[10px] uppercase tracking-wide text-gray-400 truncate" title=${folder.folder}>
                    ${folder.folder.split('/').pop() || '/'}
                </div>
                ${folder.components.map((component) => this._renderItem(component))}
            `)}
        `;
    }

    private _renderItem(component: IComponentUsage) {
        const selected = this._selectedKey === component.key;
        return html`
            <div
                title=${component.tag}
                class="mx-1 pl-3 pr-2 py-1 rounded cursor-pointer flex items-center gap-2 ${selected
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                @click=${() => { this._selectedKey = component.key; }}
            >
                <span class="text-xs truncate flex-1">${component.ref.shortName}</span>
                <span class="text-[10px] tabular-nums px-1.5 rounded-full ${selected
                ? 'bg-cyan-100 dark:bg-cyan-900'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-500'}" title="${component.uses} ${this.msg.uses} · ${component.screens.length} ${this.msg.screens}">
                    ${component.screens.length}
                </span>
            </div>
        `;
    }

    private _renderWarnings(warnings: IUsageWarning[]) {
        const id = 'warnings';
        const closed = !this._collapsed.has(id); // starts closed
        return html`
            <div
                class="mt-3 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide cursor-pointer select-none text-amber-600 dark:text-amber-400 border-t border-gray-200 dark:border-gray-800"
                @click=${() => this._toggle(id)}
            >${closed ? '▸' : '▾'} ⚠ ${this.msg.warnings} (${warnings.length})</div>
            ${closed ? nothing : warnings.map((warning) => html`
                <div class="mx-1 px-2 py-1 text-[11px]">
                    <div class="text-amber-600 dark:text-amber-400">${this._warningLabel(warning)}</div>
                    <div class="truncate" title=${warning.tag || ''}>${warning.component?.shortName || warning.tag || ''}</div>
                    ${warning.file ? html`
                        <div class="flex items-center gap-1 text-gray-500">
                            <span class="truncate" title="${warning.file.folder}/${warning.file.shortName}.ts">${warning.file.shortName}</span>
                            ${this._renderLineChips(`w:${warning.kind}:${fileKey(warning.file)}:${warning.tag || ''}`, warning.file, warning.lines)}
                        </div>` : nothing}
                </div>
            `)}
        `;
    }

    // ── Right: where the selected component is used ──

    private _renderDetail() {
        const component = this._selected;
        if (!component) {
            return html`
                <div class="flex-1 flex flex-col items-center justify-center gap-2 p-6 text-center">
                    <div class="text-sm text-gray-400">${this.msg.selectComponent}</div>
                    <div class="text-[11px] text-gray-400 max-w-xs">${this.msg.staticOnly}</div>
                </div>`;
        }
        const moduleCount = new Set(component.screens.map((s) => s.module)).size;
        return html`
            <div class="flex-1 overflow-y-auto min-w-0">
                <div class="p-4 border-b border-gray-200 dark:border-gray-800 flex items-start gap-3">
                    <div class="min-w-0 flex-1">
                        <div class="text-base font-semibold truncate">${component.ref.shortName}</div>
                        <div class="text-[11px] text-gray-400 truncate" title=${component.key}>${component.ref.project} · ${component.ref.folder || '/'}</div>
                    </div>
                    ${this._storFile(component.ref) ? html`
                        <button
                            class="shrink-0 text-xs px-2.5 py-1 rounded-md border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900"
                            @click=${() => void this._openFile(component.ref)}
                        >${this.msg.open}</button>` : nothing}
                </div>

                <div class="px-4 py-3 flex gap-2">
                    ${this._renderStat(component.uses, this.msg.uses)}
                    ${this._renderStat(component.screens.length, this.msg.screens)}
                    ${this._renderStat(moduleCount, this.msg.modules)}
                </div>

                <div class="px-4 pb-4 flex flex-col gap-3">
                    ${component.modules.map((module) => this._renderModule(component, module.module, module.screens))}
                    ${component.inner.length ? this._renderInner(component) : nothing}
                </div>
            </div>
        `;
    }

    private _renderStat(value: number, label: string) {
        return html`
            <div class="flex-1 rounded-md bg-gray-50 dark:bg-gray-900 px-3 py-2">
                <div class="text-lg font-semibold tabular-nums leading-tight">${value}</div>
                <div class="text-[10px] uppercase tracking-wide text-gray-500">${label}</div>
            </div>
        `;
    }

    private _renderModule(component: IComponentUsage, module: string, screens: IScreenUse[]) {
        const id = `m:${component.key}:${module}`;
        const closed = this._collapsed.has(id);
        return html`
            <div class="rounded-md border border-gray-200 dark:border-gray-800">
                <div
                    class="px-3 py-2 flex items-center gap-2 cursor-pointer select-none text-xs font-semibold"
                    @click=${() => this._toggle(id)}
                >
                    <span class="text-gray-400">${closed ? '▸' : '▾'}</span>
                    <span class="flex-1">${module}</span>
                    <span class="text-[10px] font-normal text-gray-500">${screens.length} ${this.msg.screens}</span>
                </div>
                ${closed ? nothing : html`
                    <div class="border-t border-gray-100 dark:border-gray-900">
                        ${screens.map((screenUse) => this._renderScreen(screenUse))}
                    </div>`}
            </div>
        `;
    }

    private _renderScreen(screenUse: IScreenUse) {
        return html`
            <div class="px-3 py-2 border-b last:border-b-0 border-gray-100 dark:border-gray-900">
                <div class="flex items-center gap-2 text-xs">
                    <span class="font-medium truncate flex-1" title=${screenUse.screen.pageId}>${screenUse.screen.title || screenUse.screen.pageId}</span>
                    <span class="text-[10px] tabular-nums text-gray-500">${screenUse.count}×</span>
                </div>
                ${screenUse.variations.map((variation) => html`
                    <div class="mt-1 flex items-center gap-2 text-[11px]">
                        <button
                            class="shrink-0 px-1.5 rounded bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-cyan-100 dark:hover:bg-cyan-900"
                            title="${variation.ref.folder}/${variation.ref.shortName}.ts"
                            @click=${() => void this._openFile(variation.ref)}
                        >${variation.variation.replace('/', ' · ')}</button>
                        ${this._renderLineChips(variation.key + ':' + screenUse.screen.key, variation.ref, variation.lines)}
                        ${variation.imported ? nothing : html`<span class="text-amber-600 dark:text-amber-400" title=${this.msg.usedWithoutImport}>⚠ ${this.msg.noImport}</span>`}
                    </div>
                `)}
            </div>
        `;
    }

    private _renderInner(component: IComponentUsage) {
        return html`
            <div class="rounded-md border border-gray-200 dark:border-gray-800">
                <div class="px-3 py-2 text-xs font-semibold">${this.msg.usedInside}</div>
                ${component.inner.map((inner) => html`
                    <div class="px-3 py-2 border-t border-gray-100 dark:border-gray-900 text-[11px]">
                        <div class="flex items-center gap-2">
                            <button
                                class="text-xs font-medium truncate hover:text-cyan-600 dark:hover:text-cyan-400"
                                title="${inner.ref.folder}/${inner.ref.shortName}.ts"
                                @click=${() => void this._openFile(inner.ref)}
                            >${inner.ref.shortName}</button>
                            ${this._renderLineChips(inner.key, inner.ref, inner.lines)}
                        </div>
                        <div class="mt-0.5 text-gray-500 truncate">
                            → ${inner.screens.length ? inner.screens.map((s) => s.title || s.pageId).join(', ') : this.msg.noScreen}
                        </div>
                    </div>
                `)}
            </div>
        `;
    }

    /** Line numbers as small chips that open the file at that line; long lists collapse into "+N". */
    private _renderLineChips(id: string, ref: IFileRef, lines: number[]) {
        const all = this._expandedLines.has(id);
        const shown = all ? lines : lines.slice(0, MAX_LINES);
        const rest = lines.length - shown.length;
        return html`
            <span class="flex flex-wrap gap-1">
                ${shown.map((line) => html`
                    <button
                        class="px-1 rounded tabular-nums text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 hover:bg-cyan-100 dark:hover:bg-cyan-900"
                        @click=${() => void this._openFile(ref, line)}
                    >${line}</button>`)}
                ${rest > 0 ? html`
                    <button
                        class="px-1 rounded text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                        @click=${() => { this._expandedLines = new Set(this._expandedLines).add(id); }}
                    >+${rest}</button>` : nothing}
            </span>
        `;
    }
}
