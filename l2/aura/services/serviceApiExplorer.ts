/// <mls fileReference="_102020_/l2/aura/services/serviceApiExplorer.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { execBff, type BffClientResponse } from '/_102029_/l2/bffClient.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'API Explorer',
    noRoutines: 'No BFF routines found for this project.',
    selectRoutine: 'Select a routine to test.',
    body: 'Body',
    run: 'Run',
    running: 'Running…',
    response: 'Response',
    confirmMutating: 'This routine may change data. Run it anyway?',
    invalidJson: 'Invalid JSON body.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Explorador de API',
        noRoutines: 'Nenhuma rotina BFF encontrada para este projeto.',
        selectRoutine: 'Selecione uma rotina para testar.',
        body: 'Corpo',
        run: 'Executar',
        running: 'Executando…',
        response: 'Resposta',
        confirmMutating: 'Essa rotina pode alterar dados. Executar mesmo assim?',
        invalidJson: 'Corpo JSON inválido.',
    },
    es: {
        svcTitle: 'Explorador de API',
        noRoutines: 'No se encontraron rutinas BFF para este proyecto.',
        selectRoutine: 'Seleccione una rutina para probar.',
        body: 'Cuerpo',
        run: 'Ejecutar',
        running: 'Ejecutando…',
        response: 'Respuesta',
        confirmMutating: 'Esta rutina puede cambiar datos. ¿Ejecutar de todos modos?',
        invalidJson: 'Cuerpo JSON inválido.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IRouteField {
    inputId: string;
    fieldRef?: string;
    required: boolean;
    source?: string;
    description?: string;
}

interface IRouteEntry {
    route: string;
    moduleId: string;
    pageId: string;
    command: string;
    kind: string;
    inputTypeName?: string;
    inputContract: IRouteField[];
}

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-api-explorer-102020')
export class ServiceApiExplorer102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf1e6',
        state: 'foreground',
        position: 'left',
        tooltip: 'API Explorer',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceApiExplorer',
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
        await this._loadRoutes();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _routes: IRouteEntry[] = [];
    @state() private _loadingRoutes: boolean = false;
    private _routesProject: number | null = null;

    @state() private _selectedRoute: IRouteEntry | null = null;
    @state() private _bodyText: string = '{}';
    @state() private _bodyError: string = '';
    @state() private _confirmingMutation: boolean = false;
    @state() private _running: boolean = false;
    @state() private _response: BffClientResponse | null = null;

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        void this._loadRoutes();
    }

    createRenderRoot() { return this; }

    // ─── Route discovery (mls.stor.files, level 1, http controllers) ──

    private async _loadRoutes(): Promise<void> {
        const project = mls.actualProject || 0;
        if (!project || this._routesProject === project) return;
        this._loadingRoutes = true;
        this.requestUpdate();

        const routes: IRouteEntry[] = [];
        for (const file of Object.values(mls.stor.files)) {
            if (!file || file.project !== project || file.level !== 1) continue;
            if (file.status === 'deleted' || file.extension !== '.defs.ts') continue;
            if (!file.folder.endsWith('/layer_1_external/adapters/http/controllers')) continue;
            const data = this._parseArtifactData(String(await file.getContent()));
            if (!data) continue;
            const handlers = Array.isArray((data as any).handlers) ? (data as any).handlers : [];
            const moduleId = String((data as any).moduleName || file.folder.split('/')[0] || '');
            const pageId = String((data as any).pageId || '');
            for (const h of handlers) {
                if (!h || typeof h.route !== 'string') continue;
                routes.push({
                    route: h.route,
                    moduleId,
                    pageId,
                    command: String(h.command || ''),
                    kind: String(h.kind || ''),
                    inputTypeName: h.inputTypeName ? String(h.inputTypeName) : undefined,
                    inputContract: Array.isArray(h.inputContract)
                        ? h.inputContract
                            .filter((f: any) => f && typeof f.inputId === 'string')
                            .map((f: any) => ({
                                inputId: String(f.inputId),
                                fieldRef: f.fieldRef ? String(f.fieldRef) : undefined,
                                required: f.required === true,
                                source: f.source ? String(f.source) : undefined,
                                description: f.description ? String(f.description) : undefined,
                            }))
                        : [],
                });
            }
        }
        routes.sort((a, b) => a.route.localeCompare(b.route));

        this._routes = routes;
        this._routesProject = project;
        this._loadingRoutes = false;
        this.requestUpdate();
    }

    /** First `export const … = {…} as const;` artifact block — same idiom the codegen agents use
     *  to read these files (e.g. agentCbHttpController.ts). Unwraps to the artifact's `data`. */
    private _parseArtifactData(content: string): Record<string, unknown> | undefined {
        const s = content.indexOf('= ');
        const e = content.indexOf(' as const;');
        if (s === -1 || e <= s) return undefined;
        try {
            const parsed = JSON.parse(content.slice(s + 2, e));
            if (!parsed || typeof parsed !== 'object') return undefined;
            const data = (parsed as { data?: unknown }).data;
            return data && typeof data === 'object' ? data as Record<string, unknown> : parsed;
        } catch {
            return undefined;
        }
    }

    // ─── Selection / body editing ───────────────────────────────────

    private _selectRoute(entry: IRouteEntry): void {
        this._selectedRoute = entry;
        this._bodyText = this._exampleBody(entry);
        this._bodyError = '';
        this._confirmingMutation = false;
        this._response = null;
        this.requestUpdate();
    }

    private _exampleBody(entry: IRouteEntry): string {
        const body: Record<string, string> = {};
        for (const field of entry.inputContract) body[field.inputId] = '';
        return JSON.stringify(body, null, 2);
    }

    private _onBodyInput(e: Event): void {
        this._bodyText = (e.target as HTMLTextAreaElement).value;
        this._bodyError = '';
    }

    // ─── Execution ──────────────────────────────────────────────────

    private _onRunClick(): void {
        if (!this._selectedRoute) return;
        let params: unknown;
        try {
            params = this._bodyText.trim() ? JSON.parse(this._bodyText) : {};
        } catch {
            this._bodyError = this.msg.invalidJson;
            this.requestUpdate();
            return;
        }
        if (this._selectedRoute.kind === 'command' && !this._confirmingMutation) {
            this._confirmingMutation = true;
            this.requestUpdate();
            return;
        }
        void this._run(params);
    }

    private async _run(params: unknown): Promise<void> {
        const route = this._selectedRoute?.route;
        if (!route) return;
        this._running = true;
        this._confirmingMutation = false;
        this._response = null;
        this.requestUpdate();

        this._response = await execBff(route, params, { mode: 'blocking' });

        this._running = false;
        this.requestUpdate();
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderRouteList()}
                ${this._renderDetail()}
            </div>
        `;
    }

    private _renderRouteList() {
        return html`
            <div class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                ${this._loadingRoutes ? html`<div class="p-3 text-xs text-gray-400">…</div>` : nothing}
                ${!this._loadingRoutes && !this._routes.length
                ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noRoutines}</div>`
                : nothing}
                ${this._routes.map((entry) => html`
                    <div
                        title=${entry.route}
                        class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedRoute?.route === entry.route
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                        @click=${() => this._selectRoute(entry)}
                    >
                        <div class="text-xs font-semibold truncate">${entry.pageId}</div>
                        <div class="font-mono text-[11px] truncate text-gray-500 dark:text-gray-400">${entry.command}</div>
                        <div class="text-[10px] uppercase tracking-wide ${entry.kind === 'command' ? 'text-amber-500' : 'text-gray-400'}">${entry.kind}</div>
                    </div>
                `)}
            </div>
        `;
    }

    private _renderDetail() {
        const entry = this._selectedRoute;
        if (!entry) {
            return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectRoutine}</div>`;
        }

        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-3">
                <div class="font-mono text-sm break-all">${entry.route}</div>

                ${entry.inputContract.length ? html`
                    <div class="text-xs text-gray-500 flex flex-col gap-1">
                        ${entry.inputContract.map((f) => html`
                            <div>
                                <span class="font-semibold">${f.inputId}</span>${f.required ? html`<span class="text-red-500"> *</span>` : nothing}
                                — ${f.description || f.fieldRef || ''}
                            </div>
                        `)}
                    </div>
                ` : nothing}

                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.body}</label>
                <textarea
                    class="font-mono text-xs border border-gray-200 dark:border-gray-800 rounded p-2 min-h-[140px] bg-gray-50 dark:bg-gray-900"
                    .value=${this._bodyText}
                    @input=${(e: Event) => this._onBodyInput(e)}
                ></textarea>
                ${this._bodyError ? html`<div class="text-xs text-red-500">${this._bodyError}</div>` : nothing}

                ${this._confirmingMutation ? html`
                    <div class="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <span>${this.msg.confirmMutating}</span>
                        <button class="px-2 py-1 rounded bg-amber-500 text-white text-xs" @click=${() => this._onRunClick()}>${this.msg.run}</button>
                    </div>
                ` : html`
                    <button
                        class="self-start px-3 py-1.5 rounded bg-cyan-500 text-white text-xs disabled:opacity-50"
                        ?disabled=${this._running}
                        @click=${() => this._onRunClick()}
                    >${this._running ? this.msg.running : this.msg.run}</button>
                `}

                ${this._response ? html`
                    <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.response}</label>
                    <div class="text-xs ${this._response.ok ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}">
                        ${this._response.ok ? 'OK' : (this._response.error?.code || 'ERROR')}
                    </div>
                    <pre class="font-mono text-xs border border-gray-200 dark:border-gray-800 rounded p-2 overflow-auto bg-gray-50 dark:bg-gray-900">${JSON.stringify(this._response.ok ? this._response.data : this._response.error, null, 2)}</pre>
                ` : nothing}
            </div>
        `;
    }
}
