/// <mls fileReference="_102020_/l2/aura/services/serviceL1Validator.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'L1 Validator',
    loading: 'Loading…',
    noItems: 'Nothing found in this layer.',
    selectItem: 'Select an item to inspect.',
    checkPorts: 'Usecase → Port',
    checkUsecaseRefs: 'Controller → Usecase',
    checkBindings: 'Port → Adapter',
    declared: 'Declared',
    actual: 'Actually used',
    overDeclared: 'Declared but never used',
    underDeclared: 'Used but never declared',
    yes: 'yes',
    no: 'no',
    handler: 'Handler',
    port: 'Port',
    adapter: 'Adapter',
    registered: 'Registered',
    linked: 'linked',
    notLinked: 'not linked',
    usedBy: 'Used by',
    notUsedAnywhere: 'Not used by any usecase.',
    request: 'Request',
    route: 'Route',
    imported: 'Imported',
    called: 'Called',
    inController: 'Wired in controller',
    inRequests: 'Defined in requests',
    totalCount: (total: number, issues: number) => `${total} total · ${issues} not linked`,
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Validador L1',
        loading: 'Carregando…',
        noItems: 'Nada encontrado nessa camada.',
        selectItem: 'Selecione um item para inspecionar.',
        checkPorts: 'Usecase → Port',
        checkUsecaseRefs: 'Controller → Usecase',
        checkBindings: 'Port → Adapter',
        declared: 'Declarado',
        actual: 'Usado de fato',
        overDeclared: 'Declarado mas nunca usado',
        underDeclared: 'Usado mas nunca declarado',
        yes: 'sim',
        no: 'não',
        handler: 'Handler',
        port: 'Port',
        adapter: 'Adapter',
        registered: 'Registrado',
        linked: 'ligado',
        notLinked: 'não ligado',
        usedBy: 'Usado por',
        notUsedAnywhere: 'Não usado por nenhum usecase.',
        request: 'Request',
        route: 'Rota',
        imported: 'Importado',
        called: 'Chamado',
        inController: 'Ligada no controller',
        inRequests: 'Definida no requests',
        totalCount: (total: number, issues: number) => `${total} no total · ${issues} não ligados`,
    },
    es: {
        svcTitle: 'Validador L1',
        loading: 'Cargando…',
        noItems: 'Nada encontrado en esta capa.',
        selectItem: 'Seleccione un elemento para inspeccionar.',
        checkPorts: 'Usecase → Port',
        checkUsecaseRefs: 'Controller → Usecase',
        checkBindings: 'Port → Adapter',
        declared: 'Declarado',
        actual: 'Usado realmente',
        overDeclared: 'Declarado pero nunca usado',
        underDeclared: 'Usado pero nunca declarado',
        yes: 'sí',
        no: 'no',
        handler: 'Handler',
        port: 'Port',
        adapter: 'Adapter',
        registered: 'Registrado',
        linked: 'ligado',
        notLinked: 'no ligado',
        usedBy: 'Usado por',
        notUsedAnywhere: 'No usado por ningún usecase.',
        request: 'Request',
        route: 'Ruta',
        imported: 'Importado',
        called: 'Llamado',
        inController: 'Conectada en el controller',
        inRequests: 'Definida en requests',
        totalCount: (total: number, issues: number) => `${total} en total · ${issues} no ligados`,
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IPortRow {
    key: string;
    moduleId: string;
    usecase: string;
    path: string;
    declared: string[];
    actual: string[];
    over: string[]; // declared but never resolved
    under: string[]; // resolved but never declared
    hasIssue: boolean;
}

interface IUsecaseRefRow {
    key: string;
    moduleId: string;
    controller: string;
    controllerPath: string;
    handlerName: string;
    usecaseRef: string;
    /** definition-v2: controller → requests[route] → usecase. Empty on the old schema. */
    route: string;
    requestPath: string | null;
    inController: boolean;
    inRequests: boolean;
    imported: boolean;
    called: boolean;
    hasIssue: boolean;
}

interface IRequestRoute {
    uses: string[];
    path: string;
    content: string;
}

interface IBindingRow {
    key: string;
    moduleId: string;
    entityId: string;
    hasPort: boolean;
    hasAdapter: boolean;
    isRegistered: boolean;
    portPath: string | null;
    adapterPath: string | null;
    hasIssue: boolean;
}

type CheckKey = 'ports' | 'usecaseRefs' | 'bindings';
const CHECK_ORDER: CheckKey[] = ['usecaseRefs', 'ports', 'bindings'];
const CHECK_MSG_KEY: Record<CheckKey, keyof MessageType> = {
    ports: 'checkPorts',
    usecaseRefs: 'checkUsecaseRefs',
    bindings: 'checkBindings',
};

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-l1-validator-102020')
export class ServiceL1Validator102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf058',
        state: 'foreground',
        position: 'left',
        tooltip: 'L1 Validator',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceL1Validator',
        level: [1],
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

    @state() private _portRows: IPortRow[] = [];
    @state() private _usecaseRefRows: IUsecaseRefRow[] = [];
    @state() private _bindingRows: IBindingRow[] = [];

    @state() private _selectedCheck: CheckKey = 'ports';
    @state() private _selectedPortRow: IPortRow | null = null;
    @state() private _selectedUsecaseRefRow: IUsecaseRefRow | null = null;
    @state() private _selectedBindingRow: IBindingRow | null = null;

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        void this._loadAudit();
    }

    createRenderRoot() { return this; }

    // ─── Discovery + checks (mls.stor.files, level 1) ──────────────────

    private async _loadAudit(): Promise<void> {
        const project = mls.actualProject || 0;
        if (!project || this._auditProject === project) return;
        this._loading = true;
        this.requestUpdate();

        const all: mls.stor.IFileInfo[] = [];
        for (const file of Object.values(mls.stor.files)) {
            if (!file || file.project !== project || file.level !== 1) continue;
            if (file.status === 'deleted') continue;
            all.push(file);
        }
        const portRows: IPortRow[] = [];
        const usecaseRefRows: IUsecaseRefRow[] = [];
        const bindingRows: IBindingRow[] = [];
        for (const moduleId of this._modules(all)) {
            const under = (suffix: string) => all.filter((f) => f.folder === `${moduleId}/${suffix}`);

            const usecaseDefs = under('layer_2_application/usecases').filter((f) => f.extension === '.defs.ts');
            const usecaseTs = under('layer_2_application/usecases').filter((f) => f.extension === '.ts');
            const controllerDefs = under('layer_1_external/adapters/http/controllers').filter((f) => f.extension === '.defs.ts');
            const controllerTs = under('layer_1_external/adapters/http/controllers').filter((f) => f.extension === '.ts');
            const requestDefs = under('layer_2_application/requests').filter((f) => f.extension === '.defs.ts');
            const requestTs = under('layer_2_application/requests').filter((f) => f.extension === '.ts');
            const portDefs = under('layer_2_application/ports').filter((f) => f.extension === '.defs.ts');
            const persistence = under('layer_1_external/adapters/persistence');
            const adapterDefs = persistence.filter((f) => f.extension === '.defs.ts' && f.shortName.endsWith('RepositoryAdapter'));
            const registerFile = persistence.find((f) => f.extension === '.ts' && f.shortName === 'registerRepositories') ?? null;

            const requestRoutes = await this._loadRequestRoutes(requestDefs, requestTs);
            portRows.push(...await this._checkUsecasePorts(moduleId, usecaseDefs, usecaseTs, portDefs));
            usecaseRefRows.push(...await this._checkControllerUsecases(moduleId, controllerDefs, controllerTs, requestRoutes));
            bindingRows.push(...await this._checkPortBindings(moduleId, portDefs, adapterDefs, registerFile));
        }

        this._portRows = portRows;
        this._usecaseRefRows = usecaseRefRows;
        this._bindingRows = bindingRows;
        this._auditProject = project;
        this._loading = false;
        this._selectedCheck = 'usecaseRefs';
        this._selectedUsecaseRefRow = usecaseRefRows[0] ?? null;
        this._selectedPortRow = null;
        this._selectedBindingRow = null;
        this.requestUpdate();
    }

    /** Real, clickable-in-spirit path of a file's `.ts` sibling — used to show WHERE something
     *  lives, not just its short id (e.g. `buildFlowFsm/layer_1_external/.../changeOrder.ts`). */
    private _tsPath(file: mls.stor.IFileInfo): string {
        return `${file.folder}/${file.shortName}.ts`;
    }

    /** Every module of the project: the first folder segment of anything under `<module>/layer_N_…`. */
    private _modules(files: mls.stor.IFileInfo[]): string[] {
        const modules = new Set<string>();
        for (const file of files) {
            const match = /^([^/]+)\/layer_\d+_/.exec(file.folder);
            if (match) modules.add(match[1]);
        }
        return [...modules].sort((a, b) => a.localeCompare(b));
    }

    /** First `export const … = {…} as const;` artifact block — same idiom the codegen agents use
     *  (e.g. agentCbHttpController.ts). Unwraps to the artifact's `data`. */
    private _parseArtifactData(content: string): Record<string, unknown> | undefined {
        const parsed = this._parseArtifact(content);
        if (!parsed) return undefined;
        const data = (parsed as { data?: unknown }).data;
        return data && typeof data === 'object' ? data as Record<string, unknown> : parsed;
    }

    private _parseArtifact(content: string): Record<string, unknown> | undefined {
        const s = content.indexOf('= ');
        const e = content.indexOf(' as const');
        if (s === -1 || e <= s) return undefined;
        try {
            const parsed = JSON.parse(content.slice(s + 2, e));
            return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : undefined;
        } catch {
            return undefined;
        }
    }

    private _escapeRegExp(text: string): string {
        return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }

    /** definition-v2 request services: route → usecases it `uses`, plus the `.ts` that implements it. */
    private async _loadRequestRoutes(defsFiles: mls.stor.IFileInfo[], tsFiles: mls.stor.IFileInfo[]): Promise<Map<string, IRequestRoute>> {
        const tsByShortName = new Map(tsFiles.map((f) => [f.shortName, f]));
        const routes = new Map<string, IRequestRoute>();
        for (const defFile of defsFiles) {
            const data = this._parseArtifactData(String(await defFile.getContent()));
            const requests = Array.isArray((data as { requests?: unknown } | undefined)?.requests)
                ? (data as { requests: Array<Record<string, unknown>> }).requests
                : [];
            const tsFile = tsByShortName.get(defFile.shortName);
            const content = tsFile ? String(await tsFile.getContent()) : '';
            const path = this._tsPath(tsFile ?? defFile);
            for (const request of requests) {
                if (typeof request.route !== 'string') continue;
                const uses = Array.isArray(request.uses) ? request.uses.filter((u): u is string => typeof u === 'string') : [];
                routes.set(request.route, { uses, path, content });
            }
        }
        return routes;
    }

    // ─── Check 1: usecase-declared ports vs. resolveRepository() call sites ─
    // Every usecase is listed, not just the mismatched ones — the port names that don't line up
    // are what gets flagged inside each row.

    private async _checkUsecasePorts(
        moduleId: string,
        defsFiles: mls.stor.IFileInfo[],
        tsFiles: mls.stor.IFileInfo[],
        portDefs: mls.stor.IFileInfo[],
    ): Promise<IPortRow[]> {
        const tsByShortName = new Map(tsFiles.map((f) => [f.shortName, f]));
        const portIdByShortName = new Map<string, string>();
        for (const f of portDefs) {
            const artifactId = this._parseArtifact(String(await f.getContent()))?.artifactId;
            portIdByShortName.set(f.shortName, typeof artifactId === 'string' ? artifactId : f.shortName);
        }
        const rows: IPortRow[] = [];
        for (const defFile of defsFiles) {
            const tsFile = tsByShortName.get(defFile.shortName);
            if (!tsFile) continue;
            const content = String(await defFile.getContent());
            const rawPorts = (this._parseArtifactData(content) as { ports?: unknown } | undefined)?.ports;
            const declared = Array.isArray(rawPorts)
                ? rawPorts.filter((p): p is string => typeof p === 'string')
                : this._portsFromDependencies(this._parseArtifact(content)?.dependencies, portIdByShortName);
            const actual = this._extractResolvedPorts(String(await tsFile.getContent()));
            const over = declared.filter((p) => !actual.includes(p));
            const under = actual.filter((p) => !declared.includes(p));
            rows.push({ key: `${moduleId}:${defFile.shortName}`, moduleId, usecase: defFile.shortName, path: this._tsPath(tsFile), declared, actual, over, under, hasIssue: over.length > 0 || under.length > 0 });
        }
        rows.sort((a, b) => a.usecase.localeCompare(b.usecase));
        return rows;
    }

    /** definition-v2 usecases may omit `ports` and only list the port defs among their `dependencies`. */
    private _portsFromDependencies(dependencies: unknown, portIdByShortName: Map<string, string>): string[] {
        if (!Array.isArray(dependencies)) return [];
        const ports: string[] = [];
        for (const dep of dependencies) {
            const match = typeof dep === 'string' ? /\/layer_2_application\/ports\/([^/]+)\.defs\.ts$/.exec(dep) : null;
            if (match) ports.push(portIdByShortName.get(match[1]) ?? match[1]);
        }
        return ports;
    }

    /** Tolerant of the two real pitfalls found while validating this by hand: the call spanning
     *  multiple lines, and the context variable not always being named `ctx` (e.g. `txContext`). */
    private _extractResolvedPorts(content: string): string[] {
        const found = new Set<string>();
        const re = /resolveRepository<[^>]*>\(\s*[A-Za-z_$][\w$]*\s*,\s*['"]([^'"]+)['"]/gs;
        let match: RegExpExecArray | null;
        while ((match = re.exec(content))) found.add(match[1]);
        return [...found];
    }

    // ─── Check 2: controller-declared usecaseRef vs. actual import + call site ─
    // Every (handler, usecaseRef) pair is listed; imported/called are shown for all of them,
    // only the ones missing either turn up highlighted.

    private async _checkControllerUsecases(
        moduleId: string,
        defsFiles: mls.stor.IFileInfo[],
        tsFiles: mls.stor.IFileInfo[],
        requestRoutes: Map<string, IRequestRoute>,
    ): Promise<IUsecaseRefRow[]> {
        const tsByShortName = new Map(tsFiles.map((f) => [f.shortName, f]));
        const rows: IUsecaseRefRow[] = [];
        for (const defFile of defsFiles) {
            const tsFile = tsByShortName.get(defFile.shortName);
            if (!tsFile) continue;
            const data = this._parseArtifactData(String(await defFile.getContent()));
            const handlers = Array.isArray((data as { handlers?: unknown } | undefined)?.handlers)
                ? (data as { handlers: Array<Record<string, unknown>> }).handlers
                : [];
            const tsContent = String(await tsFile.getContent());
            const base = { moduleId, controller: defFile.shortName, controllerPath: this._tsPath(tsFile) };
            for (const handler of handlers) {
                const handlerName = typeof handler.handlerName === 'string' ? handler.handlerName : '';
                const refs = new Set<string>();
                if (typeof handler.usecaseRef === 'string') refs.add(handler.usecaseRef);
                if (Array.isArray(handler.usecaseRefs)) {
                    for (const ref of handler.usecaseRefs) if (typeof ref === 'string') refs.add(ref);
                }
                if (refs.size) {
                    for (const ref of refs) {
                        const imported = this._isImported(tsContent, ref);
                        const called = this._isCalled(tsContent, ref);
                        rows.push({ ...base, key: `${moduleId}:${defFile.shortName}:${handlerName}:${ref}`, handlerName, usecaseRef: ref, route: '', requestPath: null, inController: true, inRequests: true, imported, called, hasIssue: !imported || !called });
                    }
                    continue;
                }
                // definition-v2: the controller hands the route to requests[route], which calls the usecases it `uses`.
                if (typeof handler.route !== 'string') continue;
                const route = handler.route;
                const quoted = `['"]${this._escapeRegExp(route)}['"]`;
                const inController = new RegExp(`\\bkey\\s*:\\s*${quoted}`).test(tsContent)
                    && new RegExp(`\\brequests\\s*\\[\\s*${quoted}\\s*\\]\\s*\\(`).test(tsContent);
                const request = requestRoutes.get(route);
                const inRequests = !!request && new RegExp(`${quoted}\\s*:`).test(request.content);
                const command = route.split('.').pop() || route;
                const uses = request?.uses.length ? request.uses : [''];
                for (const ref of uses) {
                    const imported = !ref || (!!request && this._isImported(request.content, ref));
                    const called = !ref || (!!request && this._isCalled(request.content, ref));
                    rows.push({
                        ...base, key: `${moduleId}:${defFile.shortName}:${route}:${ref}`, handlerName: command, usecaseRef: ref,
                        route, requestPath: request?.path ?? null, inController, inRequests, imported, called,
                        hasIssue: !inController || !inRequests || !imported || !called,
                    });
                }
            }
        }
        rows.sort((a, b) => a.controller.localeCompare(b.controller) || a.handlerName.localeCompare(b.handlerName));
        return rows;
    }

    private _isImported(content: string, ref: string): boolean {
        return new RegExp(`import\\s*\\{[^}]*\\b${this._escapeRegExp(ref)}\\b[^}]*\\}\\s*from`, 's').test(content);
    }

    private _isCalled(content: string, ref: string): boolean {
        return new RegExp(`\\b${this._escapeRegExp(ref)}\\s*\\(`).test(content);
    }

    // ─── Check 3: port ↔ adapter ↔ registerRepositories.ts binding ─
    // One row per entity id found ANYWHERE across ports/adapters/registrations, so a key that only
    // exists in one of the three places (the actual bug shape) still shows up as a row.

    /** Rows are keyed by the repository registry key. The old schema registers by entityId; definition-v2
     *  registers by the port name, which the adapter declares as `portId` and the port as its `artifactId`. */
    private async _checkPortBindings(
        moduleId: string,
        portDefs: mls.stor.IFileInfo[],
        adapterDefs: mls.stor.IFileInfo[],
        registerFile: mls.stor.IFileInfo | null,
    ): Promise<IBindingRow[]> {
        const adapters = new Map<string, string>();
        for (const f of adapterDefs) {
            const data = this._parseArtifactData(String(await f.getContent()));
            const portId = (data as { portId?: unknown } | undefined)?.portId;
            const entityId = (data as { entityId?: unknown } | undefined)?.entityId;
            const key = typeof portId === 'string' ? portId : typeof entityId === 'string' ? entityId : f.shortName;
            adapters.set(key, this._tsPath(f));
        }
        const ports = new Map<string, string>();
        for (const f of portDefs) {
            const content = String(await f.getContent());
            const artifactId = this._parseArtifact(content)?.artifactId;
            const data = this._parseArtifactData(content);
            const entityId = (data as { entityId?: unknown } | undefined)?.entityId;
            const key = typeof artifactId === 'string' && adapters.has(artifactId) ? artifactId
                : typeof entityId === 'string' ? entityId : f.shortName;
            ports.set(key, this._tsPath(f));
        }
        const registeredKeys = new Set<string>();
        if (registerFile) {
            const content = String(await registerFile.getContent());
            const re = /registerRepository\(\s*['"]([^'"]+)['"]/g;
            let match: RegExpExecArray | null;
            while ((match = re.exec(content))) registeredKeys.add(match[1]);
        }

        const allIds = new Set<string>([...ports.keys(), ...adapters.keys(), ...registeredKeys]);
        const rows: IBindingRow[] = [];
        for (const entityId of allIds) {
            const hasPort = ports.has(entityId);
            const hasAdapter = adapters.has(entityId);
            const isRegistered = registeredKeys.has(entityId);
            rows.push({
                key: `${moduleId}:${entityId}`, moduleId, entityId, hasPort, hasAdapter, isRegistered,
                portPath: ports.get(entityId) ?? null, adapterPath: adapters.get(entityId) ?? null,
                hasIssue: !(hasPort && hasAdapter && isRegistered),
            });
        }
        rows.sort((a, b) => a.entityId.localeCompare(b.entityId));
        return rows;
    }

    // ─── Selection ──────────────────────────────────────────────────

    private _selectCheck(check: CheckKey): void {
        this._selectedCheck = check;
        this._selectedPortRow = check === 'ports' ? this._portRows[0] ?? null : null;
        this._selectedUsecaseRefRow = check === 'usecaseRefs' ? this._usecaseRefRows[0] ?? null : null;
        this._selectedBindingRow = check === 'bindings' ? this._bindingRows[0] ?? null : null;
        this.requestUpdate();
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderCheckRail()}
                ${this._loading ? html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.loading}</div>` : html`
                    ${this._renderItemList()}
                    ${this._renderDetail()}
                `}
            </div>
        `;
    }

    private _renderCheckRail() {
        const counts: Record<CheckKey, number> = {
            ports: this._portRows.filter((r) => r.hasIssue).length,
            usecaseRefs: this._usecaseRefRows.filter((r) => r.hasIssue).length,
            bindings: this._bindingRows.filter((r) => r.hasIssue).length,
        };
        return html`
            <div class="w-44 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                ${CHECK_ORDER.map((check) => html`
                    <div
                        class="px-3 py-2 text-xs cursor-pointer border-b border-gray-100 dark:border-gray-900 flex items-center justify-between ${this._selectedCheck === check
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                        @click=${() => this._selectCheck(check)}
                    >
                        <span>${this.msg[CHECK_MSG_KEY[check]]}</span>
                        <span class="text-[10px] ${counts[check] ? 'text-amber-500 font-semibold' : 'text-gray-400'}">${counts[check]}</span>
                    </div>
                `)}
            </div>
        `;
    }

    private _renderItemList() {
        if (this._selectedCheck === 'ports') {
            const rows = this._portRows;
            return html`
                <div class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                    <div class="px-3 py-2 text-[10px] text-gray-400">${this.msg.totalCount(rows.length, rows.filter((r) => r.hasIssue).length)}</div>
                    ${!rows.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                    ${this._renderGrouped(rows, (row) => html`
                        <div
                            class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedPortRow?.key === row.key
                    ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                            @click=${() => { this._selectedPortRow = row; this.requestUpdate(); }}
                        >
                            <div class="text-xs font-semibold truncate ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${row.usecase}</div>
                            <div class="font-mono text-[10px] text-gray-400 truncate">${row.path}</div>
                            <div class="text-[10px] ${row.hasIssue ? 'text-amber-500' : 'text-gray-400'}">
                                ${row.hasIssue
                    ? `${row.over.length ? `${row.over.length} ${this.msg.overDeclared.toLowerCase()}` : ''}${row.over.length && row.under.length ? ' · ' : ''}${row.under.length ? `${row.under.length} ${this.msg.underDeclared.toLowerCase()}` : ''}`
                    : `${row.declared.length} ${this.msg.linked}`}
                            </div>
                        </div>
                    `)}
                </div>
            `;
        }
        if (this._selectedCheck === 'usecaseRefs') {
            const rows = this._usecaseRefRows;
            return html`
                <div class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                    <div class="px-3 py-2 text-[10px] text-gray-400">${this.msg.totalCount(rows.length, rows.filter((r) => r.hasIssue).length)}</div>
                    ${!rows.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                    ${this._renderGrouped(rows, (row) => html`
                        <div
                            class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedUsecaseRefRow?.key === row.key
                    ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                            @click=${() => { this._selectedUsecaseRefRow = row; this.requestUpdate(); }}
                        >
                            <div class="text-xs font-semibold truncate ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${row.controller}</div>
                            <div class="font-mono text-[10px] text-gray-400 truncate">${row.controllerPath}</div>
                            ${row.route ? html`<div class="font-mono text-[10px] truncate text-gray-500 dark:text-gray-400">${row.handlerName}</div>` : nothing}
                            <div class="font-mono text-[10px] truncate ${row.hasIssue ? 'text-amber-500' : 'text-gray-400'}">${row.usecaseRef || '—'}</div>
                        </div>
                    `)}
                </div>
            `;
        }
        const rows = this._bindingRows;
        return html`
            <div class="w-72 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                <div class="px-3 py-2 text-[10px] text-gray-400">${this.msg.totalCount(rows.length, rows.filter((r) => r.hasIssue).length)}</div>
                ${!rows.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                ${this._renderGrouped(rows, (row) => html`
                    <div
                        class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedBindingRow?.key === row.key
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300' : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                        @click=${() => { this._selectedBindingRow = row; this.requestUpdate(); }}
                    >
                        <div class="text-xs font-semibold truncate ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${row.entityId}</div>
                        ${row.adapterPath || row.portPath ? html`<div class="font-mono text-[10px] text-gray-400 truncate">${row.adapterPath ?? row.portPath}</div>` : nothing}
                        <div class="text-[10px] ${row.hasIssue ? 'text-amber-500' : 'text-gray-400'}">${row.hasIssue ? this.msg.notLinked : this.msg.linked}</div>
                    </div>
                `)}
            </div>
        `;
    }

    private _renderGrouped<T extends { moduleId: string }>(rows: T[], renderRow: (row: T) => unknown) {
        const groups = new Map<string, T[]>();
        for (const row of rows) groups.set(row.moduleId, [...(groups.get(row.moduleId) || []), row]);
        return [...groups.entries()].map(([moduleId, moduleRows]) => html`
            <div class="sticky top-0 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-b border-gray-200 dark:border-gray-800">
                ${moduleId} <span class="font-normal ${moduleRows.some((r) => (r as { hasIssue?: boolean }).hasIssue) ? 'text-amber-500' : 'text-gray-400'}">(${moduleRows.length})</span>
            </div>
            ${moduleRows.map(renderRow)}
        `);
    }

    private _renderCheckLine(label: string, ok: boolean) {
        return html`<div class="text-xs ${ok ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">${label}: ${ok ? this.msg.yes : this.msg.no}</div>`;
    }

    private _renderDetail() {
        if (this._selectedCheck === 'ports') return this._renderPortDetail();
        if (this._selectedCheck === 'usecaseRefs') return this._renderUsecaseRefDetail();
        return this._renderBindingDetail();
    }

    private _renderPortDetail() {
        const row = this._selectedPortRow;
        if (!row) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
                <div class="text-sm font-semibold">${row.usecase}</div>
                <div class="font-mono text-xs text-gray-500">${row.path}</div>
                <div class="grid grid-cols-2 gap-4">
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.declared}</label>
                        <ul class="text-xs mt-1 flex flex-col gap-0.5">
                            ${row.declared.length ? row.declared.map((p) => this._renderPortLink(p, row.over.includes(p))) : html`<li class="text-gray-400">—</li>`}
                        </ul>
                    </div>
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.actual}</label>
                        <ul class="text-xs mt-1 flex flex-col gap-0.5">
                            ${row.actual.length ? row.actual.map((p) => this._renderPortLink(p, row.under.includes(p))) : html`<li class="text-gray-400">—</li>`}
                        </ul>
                    </div>
                </div>
                ${row.over.length ? html`<div class="text-xs text-amber-600 dark:text-amber-400">${this.msg.overDeclared}: ${row.over.join(', ')}</div>` : nothing}
                ${row.under.length ? html`<div class="text-xs text-amber-600 dark:text-amber-400">${this.msg.underDeclared}: ${row.under.join(', ')}</div>` : nothing}
            </div>
        `;
    }

    private _renderPortLink(portName: string, isMismatch: boolean) {
        const target = this._bindingRows.find((b) => b.moduleId === this._selectedPortRow?.moduleId && b.entityId === portName) ?? null;
        if (!target) return html`<li class="${isMismatch ? 'text-amber-500 font-semibold' : ''}">${portName}${isMismatch ? ' ⚠' : ''}</li>`;
        return html`
            <li
                class="cursor-pointer hover:underline w-fit ${isMismatch ? 'text-amber-500 font-semibold' : 'text-cyan-600 dark:text-cyan-400'}"
                @click=${() => this._goToBinding(target)}
            >${portName}${isMismatch ? ' ⚠' : ''}</li>
        `;
    }

    private _goToBinding(target: IBindingRow): void {
        this._selectedCheck = 'bindings';
        this._selectedBindingRow = target;
        this.requestUpdate();
    }

    private _renderUsecaseRefDetail() {
        const row = this._selectedUsecaseRefRow;
        if (!row) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        const target = this._portRows.find((p) => p.moduleId === row.moduleId && p.usecase === row.usecaseRef) ?? null;
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-3">
                <div class="text-sm font-semibold">${row.controller}</div>
                <div class="font-mono text-xs text-gray-500">${row.controllerPath}</div>
                ${row.route ? html`
                    <div class="text-xs text-gray-500">${this.msg.route}: <span class="font-mono">${row.route}</span></div>
                    ${this._renderCheckLine(this.msg.inController, row.inController)}
                    <div class="text-xs text-gray-500">${this.msg.request}: <span class="font-mono text-gray-400">${row.requestPath ?? '—'}</span></div>
                    ${this._renderCheckLine(this.msg.inRequests, row.inRequests)}
                ` : html`<div class="text-xs text-gray-500">${this.msg.handler}: ${row.handlerName}</div>`}
                ${row.usecaseRef ? html`
                    ${this._renderCheckLine(this.msg.imported, row.imported)}
                    ${this._renderCheckLine(this.msg.called, row.called)}
                ` : nothing}
                ${!row.usecaseRef ? nothing : target ? html`
                    <div
                        class="cursor-pointer hover:underline w-fit ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}"
                        @click=${() => this._goToUsecase(target)}
                    >
                        <div class="font-mono text-sm">${row.usecaseRef} →</div>
                        <div class="font-mono text-[10px]">${target.path}</div>
                    </div>
                ` : html`<div class="font-mono text-sm ${row.hasIssue ? 'text-amber-600 dark:text-amber-400' : ''}">${row.usecaseRef}</div>`}
            </div>
        `;
    }

    private _goToUsecase(target: IPortRow): void {
        this._selectedCheck = 'ports';
        this._selectedPortRow = target;
        this.requestUpdate();
    }

    private _renderBindingDetail() {
        const row = this._selectedBindingRow;
        if (!row) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        const usedBy = this._portRows.filter((p) => p.moduleId === row.moduleId && (p.declared.includes(row.entityId) || p.actual.includes(row.entityId)));
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-3">
                <div class="text-sm font-semibold">${row.entityId}</div>
                <div class="text-xs ${row.hasPort ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">
                    ${this.msg.port}: ${row.hasPort ? this.msg.yes : this.msg.no}
                    ${row.portPath ? html`<span class="font-mono text-gray-400"> · ${row.portPath}</span>` : nothing}
                </div>
                <div class="text-xs ${row.hasAdapter ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">
                    ${this.msg.adapter}: ${row.hasAdapter ? this.msg.yes : this.msg.no}
                    ${row.adapterPath ? html`<span class="font-mono text-gray-400"> · ${row.adapterPath}</span>` : nothing}
                </div>
                <div class="text-xs ${row.isRegistered ? 'text-gray-500' : 'text-amber-600 dark:text-amber-400 font-semibold'}">${this.msg.registered}: ${row.isRegistered ? this.msg.yes : this.msg.no}</div>
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.usedBy}</label>
                ${usedBy.length ? html`
                    <div class="flex flex-col gap-1">
                        ${usedBy.map((u) => html`
                            <div
                                class="cursor-pointer hover:underline w-fit ${u.hasIssue ? 'text-amber-600 dark:text-amber-400' : 'text-cyan-600 dark:text-cyan-400'}"
                                @click=${() => this._goToUsecase(u)}
                            >
                                <div class="text-xs">${u.usecase}</div>
                                <div class="font-mono text-[10px]">${u.path}</div>
                            </div>
                        `)}
                    </div>
                ` : html`<div class="text-xs text-amber-600 dark:text-amber-400">${this.msg.notUsedAnywhere}</div>`}
            </div>
        `;
    }
}
