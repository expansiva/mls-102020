/// <mls fileReference="_102020_/l2/aura/services/serviceSpecExplorer.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Spec Explorer',
    loading: 'Loading…',
    noItems: 'Nothing found in this family.',
    selectItem: 'Select an item to inspect.',
    originalRequest: 'Original request',
    mainActors: 'Actors',
    mainGoal: 'Goal',
    inScope: 'In scope',
    outOfScope: 'Out of scope',
    approvalTrail: 'Approval trail',
    referencedBy: 'Referenced by',
    notReferenced: 'Not referenced anywhere — possibly orphan.',
    technicalDetails: 'Technical details',
    famOverview: 'Overview',
    famOntology: 'Ontology',
    famJourneys: 'Journeys',
    famWorkflows: 'Workflows',
    famUsecases: 'Use Cases',
    famOperations: 'Operations',
    famWorkspaces: 'Workspaces',
    famRules: 'Rules',
    famAccess: 'Access',
    famComposition: 'Composition',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Explorador de Spec',
        loading: 'Carregando…',
        noItems: 'Nada encontrado nessa família.',
        selectItem: 'Selecione um item para inspecionar.',
        originalRequest: 'Pedido original',
        mainActors: 'Atores',
        mainGoal: 'Objetivo',
        inScope: 'Dentro do escopo',
        outOfScope: 'Fora do escopo',
        approvalTrail: 'Trilha de aprovação',
        referencedBy: 'Referenciada por',
        notReferenced: 'Não referenciada em lugar nenhum — possível regra órfã.',
        technicalDetails: 'Detalhes técnicos',
        famOverview: 'Visão geral',
        famOntology: 'Ontologia',
        famJourneys: 'Jornadas',
        famWorkflows: 'Workflows',
        famUsecases: 'Casos de Uso',
        famOperations: 'Operações',
        famWorkspaces: 'Workspaces',
        famRules: 'Regras',
        famAccess: 'Acessos',
        famComposition: 'Composição',
    },
    es: {
        svcTitle: 'Explorador de Spec',
        loading: 'Cargando…',
        noItems: 'Nada encontrado en esta familia.',
        selectItem: 'Seleccione un elemento para inspeccionar.',
        originalRequest: 'Pedido original',
        mainActors: 'Actores',
        mainGoal: 'Objetivo',
        inScope: 'Dentro del alcance',
        outOfScope: 'Fuera del alcance',
        approvalTrail: 'Historial de aprobación',
        referencedBy: 'Referenciada por',
        notReferenced: 'No referenciada en ningún lugar — posible regla huérfana.',
        technicalDetails: 'Detalles técnicos',
        famOverview: 'Resumen',
        famOntology: 'Ontología',
        famJourneys: 'Jornadas',
        famWorkflows: 'Workflows',
        famUsecases: 'Casos de Uso',
        famOperations: 'Operaciones',
        famWorkspaces: 'Workspaces',
        famRules: 'Reglas',
        famAccess: 'Accesos',
        famComposition: 'Composición',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface ISpecItem {
    key: string;
    family: string;
    shortName: string;
    file: mls.stor.IFileInfo;
    data: Record<string, unknown>;
    title: string;
    description: string;
    approvedBy?: string;
    status?: string;
}

interface IRuleEntry {
    id: string;
    description: string;
    referencedBy: ISpecItem[];
}

// ─── Static configs ───────────────────────────────────────────────────

const FAMILY_ORDER = ['ontology', 'journeys', 'workflows', 'usecases', 'operations', 'workspaces', 'rules', 'access', 'composition'] as const;
type FamilyKey = 'overview' | typeof FAMILY_ORDER[number];
const FAMILY_KEYS = new Set<string>(FAMILY_ORDER);
const EXCLUDED_SUBFOLDERS = new Set(['contracts', 'pipeline', 'trace']);

const FAMILY_MSG_KEY: Record<FamilyKey, keyof MessageType> = {
    overview: 'famOverview',
    ontology: 'famOntology',
    journeys: 'famJourneys',
    workflows: 'famWorkflows',
    usecases: 'famUsecases',
    operations: 'famOperations',
    workspaces: 'famWorkspaces',
    rules: 'famRules',
    access: 'famAccess',
    composition: 'famComposition',
};

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-spec-explorer-102020')
export class ServiceSpecExplorer102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf15c',
        state: 'foreground',
        position: 'right',
        tooltip: 'Spec Explorer',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceSpecExplorer',
        level: [4],
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
        await this._loadSpec();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _loading: boolean = false;
    private _specProject: number | null = null;

    @state() private _items: ISpecItem[] = [];
    @state() private _rules: IRuleEntry[] = [];

    @state() private _selectedFamily: FamilyKey = 'overview';
    @state() private _selectedItem: ISpecItem | null = null;
    @state() private _selectedRule: IRuleEntry | null = null;

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        void this._loadSpec();
    }

    createRenderRoot() { return this; }

    // ─── Discovery (mls.stor.files, level 4, curated design artifacts) ─

    private async _loadSpec(): Promise<void> {
        const project = mls.actualProject || 0;
        if (!project || this._specProject === project) return;
        this._loading = true;
        this.requestUpdate();

        const candidates: mls.stor.IFileInfo[] = [];
        for (const file of Object.values(mls.stor.files)) {
            if (!file || file.project !== project || file.level !== 4) continue;
            if (file.status === 'deleted' || file.extension !== '.defs.ts') continue;
            candidates.push(file);
        }

        const moduleId = mls.actualModule || this._inferModule(candidates);

        const items: ISpecItem[] = [];
        for (const file of candidates) {
            if (!moduleId || (file.folder !== moduleId && !file.folder.startsWith(`${moduleId}/`))) continue;
            const sub = file.folder === moduleId ? '' : file.folder.slice(moduleId.length + 1).split('/')[0];
            if (sub && EXCLUDED_SUBFOLDERS.has(sub)) continue;
            if (sub && !FAMILY_KEYS.has(sub)) continue;
            const family: FamilyKey = (sub || 'overview') as FamilyKey;
            if (family !== 'rules' && file.shortName === 'index') continue; // index files aggregate the family; not a leaf

            const data = this._parseArtifactData(String(await file.getContent()));
            if (!data) continue;

            items.push({
                key: `${file.folder}/${file.shortName}`,
                family,
                shortName: file.shortName,
                file,
                data,
                title: this._bestTitle(data, file.shortName),
                description: this._bestDescription(data),
                approvedBy: this._readString(data, 'approvedBy'),
                status: this._readStatus(data),
            });
        }

        const ruleIdsByItem = new Map<string, Set<string>>();
        for (const item of items) {
            const acc = new Set<string>();
            this._collectRuleIds(item.data, acc);
            ruleIdsByItem.set(item.key, acc);
        }

        const rulesFile = items.find((it) => it.family === 'rules');
        const rawRules = Array.isArray((rulesFile?.data as { rules?: unknown })?.rules) ? (rulesFile!.data as { rules: unknown[] }).rules : [];
        const rules: IRuleEntry[] = [];
        for (const r of rawRules) {
            const rule = r as { id?: unknown; description?: unknown };
            if (typeof rule.id !== 'string') continue;
            const referencedBy = items.filter((it) => it.key !== rulesFile?.key && ruleIdsByItem.get(it.key)?.has(rule.id as string));
            rules.push({ id: rule.id, description: typeof rule.description === 'string' ? rule.description : '', referencedBy });
        }

        this._items = items.filter((it) => it.family !== 'rules');
        this._rules = rules;
        this._specProject = project;
        this._loading = false;
        this._selectedFamily = 'overview';
        this._selectedItem = this._items.find((it) => it.family === 'overview' && it.shortName === 'module') ?? this._items.find((it) => it.family === 'overview') ?? null;
        this._selectedRule = null;
        this.requestUpdate();
    }

    private _inferModule(files: mls.stor.IFileInfo[]): string {
        for (const file of files) {
            const first = file.folder.split('/')[0];
            if (first && first !== 'trace') return first;
        }
        return '';
    }

    /** First `export const … = {…} as const [satisfies X];` artifact block — same idiom the codegen
     *  agents use to read these files (e.g. agentCbHttpController.ts), extended to also accept the
     *  `satisfies` form l4 artifacts are written with. */
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

    private _bestTitle(data: Record<string, unknown>, fallback: string): string {
        for (const key of ['title', 'entityId', 'pageId', 'workspaceId', 'useCaseId', 'workflowId', 'journeyId']) {
            const value = data[key];
            if (typeof value === 'string' && value) return value;
        }
        return fallback;
    }

    private _bestDescription(data: Record<string, unknown>): string {
        if (typeof data.description === 'string' && data.description) return data.description;
        const business = data.business as Record<string, unknown> | undefined;
        if (business && typeof business.goal === 'string') return business.goal;
        const story = data.story as Record<string, unknown> | undefined;
        if (story && typeof story.goal === 'string') return story.goal;
        if (typeof data.purpose === 'string' && data.purpose) return data.purpose;
        if (typeof data.note === 'string') return data.note;
        return '';
    }

    private _readString(data: Record<string, unknown>, key: string): string | undefined {
        const value = data[key];
        return typeof value === 'string' ? value : undefined;
    }

    private _readStatus(data: Record<string, unknown>): string | undefined {
        if (typeof data.status === 'string') return data.status;
        const specStatus = data.specStatus as Record<string, unknown> | undefined;
        if (specStatus && typeof specStatus.state === 'string') return specStatus.state;
        return undefined;
    }

    /** Recursively collects every `useRules` id across an artifact — the field appears at varying
     *  nesting depths depending on the artifact (top-level on an ontology entity, per-operation
     *  inside workspace-model.defs.ts), so this walks the whole object rather than assuming a shape. */
    private _collectRuleIds(node: unknown, acc: Set<string>): void {
        if (Array.isArray(node)) {
            for (const child of node) this._collectRuleIds(child, acc);
            return;
        }
        if (!node || typeof node !== 'object') return;
        for (const [key, value] of Object.entries(node as Record<string, unknown>)) {
            if (key === 'useRules' && Array.isArray(value)) {
                for (const id of value) if (typeof id === 'string') acc.add(id);
                continue;
            }
            this._collectRuleIds(value, acc);
        }
    }

    // ─── Selection ──────────────────────────────────────────────────

    private _selectFamily(family: FamilyKey): void {
        this._selectedFamily = family;
        this._selectedItem = family === 'rules' ? null : this._items.find((it) => it.family === family) ?? null;
        this._selectedRule = family === 'rules' ? this._rules[0] ?? null : null;
        this.requestUpdate();
    }

    private _selectItem(item: ISpecItem): void {
        this._selectedFamily = item.family as FamilyKey;
        this._selectedItem = item;
        this._selectedRule = null;
        this.requestUpdate();
    }

    private _selectRule(rule: IRuleEntry): void {
        this._selectedFamily = 'rules';
        this._selectedRule = rule;
        this._selectedItem = null;
        this.requestUpdate();
    }

    // ─── Render ───────────────────────────────────────────────────────

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex h-full min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderFamilyRail()}
                ${this._renderItemList()}
                ${this._renderDetail()}
            </div>
        `;
    }

    private _renderFamilyRail() {
        const families: FamilyKey[] = ['overview', ...FAMILY_ORDER];
        return html`
            <div class="w-36 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                ${families.map((family) => {
                const count = family === 'rules' ? this._rules.length : this._items.filter((it) => it.family === family).length;
                return html`
                        <div
                            class="px-3 py-2 text-xs cursor-pointer border-b border-gray-100 dark:border-gray-900 flex items-center justify-between ${this._selectedFamily === family
                        ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300 font-semibold'
                        : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                            @click=${() => this._selectFamily(family)}
                        >
                            <span>${this.msg[FAMILY_MSG_KEY[family]]}</span>
                            <span class="text-[10px] text-gray-400">${count}</span>
                        </div>
                    `;
            })}
            </div>
        `;
    }

    private _renderItemList() {
        if (this._loading) return html`<div class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 p-3 text-xs text-gray-400">${this.msg.loading}</div>`;

        if (this._selectedFamily === 'rules') {
            return html`
                <div class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                    ${!this._rules.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                    ${this._rules.map((rule) => html`
                        <div
                            class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedRule?.id === rule.id
                    ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                    : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                            @click=${() => this._selectRule(rule)}
                        >
                            <div class="text-xs font-semibold truncate">${rule.id}</div>
                            <div class="text-[10px] ${rule.referencedBy.length ? 'text-gray-400' : 'text-amber-500'}">
                                ${rule.referencedBy.length} ${this.msg.referencedBy.toLowerCase()}
                            </div>
                        </div>
                    `)}
                </div>
            `;
        }

        const items = this._items.filter((it) => it.family === this._selectedFamily);
        return html`
            <div class="w-64 shrink-0 border-r border-gray-200 dark:border-gray-800 overflow-y-auto">
                ${!items.length ? html`<div class="p-3 text-xs text-gray-400">${this.msg.noItems}</div>` : nothing}
                ${items.map((item) => html`
                    <div
                        title=${item.shortName}
                        class="px-3 py-2 cursor-pointer border-b border-gray-100 dark:border-gray-900 ${this._selectedItem?.key === item.key
                ? 'bg-cyan-50 dark:bg-cyan-950 text-cyan-700 dark:text-cyan-300'
                : 'hover:bg-gray-50 dark:hover:bg-gray-900'}"
                        @click=${() => this._selectItem(item)}
                    >
                        <div class="text-xs font-semibold truncate">${item.title}</div>
                        ${item.approvedBy || item.status ? html`
                            <div class="text-[10px] uppercase tracking-wide ${item.approvedBy === 'auto' ? 'text-amber-500' : 'text-gray-400'}">
                                ${[item.approvedBy, item.status].filter(Boolean).join(' · ')}
                            </div>
                        ` : nothing}
                    </div>
                `)}
            </div>
        `;
    }

    private _renderDetail() {
        if (this._selectedFamily === 'rules') return this._renderRuleDetail();
        if (this._selectedItem?.family === 'overview' && this._selectedItem.shortName === 'module') return this._renderModuleOverview(this._selectedItem.data);
        return this._renderItemDetail();
    }

    private _renderRuleDetail() {
        const rule = this._selectedRule;
        if (!rule) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-3">
                <div class="font-mono text-sm">${rule.id}</div>
                <div class="text-sm">${rule.description}</div>
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.referencedBy}</label>
                ${rule.referencedBy.length ? html`
                    <div class="flex flex-col gap-1">
                        ${rule.referencedBy.map((it) => html`
                            <div class="text-xs text-cyan-600 dark:text-cyan-400 cursor-pointer hover:underline" @click=${() => this._selectItem(it)}>
                                [${this.msg[FAMILY_MSG_KEY[it.family as FamilyKey]]}] ${it.title}
                            </div>
                        `)}
                    </div>
                ` : html`<div class="text-xs text-amber-600 dark:text-amber-400">${this.msg.notReferenced}</div>`}
            </div>
        `;
    }

    private _renderItemDetail() {
        const item = this._selectedItem;
        if (!item) return html`<div class="flex-1 flex items-center justify-center text-sm text-gray-400">${this.msg.selectItem}</div>`;
        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-3">
                <div class="text-sm font-semibold">${item.title}</div>
                ${item.approvedBy || item.status ? html`
                    <div class="text-[10px] uppercase tracking-wide ${item.approvedBy === 'auto' ? 'text-amber-500' : 'text-gray-400'}">
                        ${[item.approvedBy, item.status].filter(Boolean).join(' · ')}
                    </div>
                ` : nothing}
                ${item.description ? html`<div class="text-sm whitespace-pre-wrap">${item.description}</div>` : nothing}
                <details class="text-xs">
                    <summary class="cursor-pointer text-gray-500 uppercase tracking-wide font-semibold">${this.msg.technicalDetails}</summary>
                    <pre class="font-mono text-xs border border-gray-200 dark:border-gray-800 rounded p-2 overflow-auto bg-gray-50 dark:bg-gray-900 mt-2">${JSON.stringify(item.data, null, 2)}</pre>
                </details>
            </div>
        `;
    }

    private _renderModuleOverview(data: Record<string, unknown>) {
        const moduleInfo = (data.module ?? {}) as Record<string, unknown>;
        const designContext = (data.designContext ?? {}) as Record<string, unknown>;
        const clarification = (designContext.clarification ?? {}) as Record<string, unknown>;
        const businessScope = (data.businessScope ?? {}) as Record<string, unknown>;
        const specStatus = (data.specStatus ?? {}) as Record<string, unknown>;
        const steps = Array.isArray(specStatus.completedSteps) ? specStatus.completedSteps as Array<Record<string, unknown>> : [];

        return html`
            <div class="flex-1 flex flex-col overflow-y-auto p-4 gap-4">
                <div>
                    <div class="text-sm font-semibold">${typeof moduleInfo.title === 'string' ? moduleInfo.title : ''}</div>
                    ${typeof moduleInfo.purpose === 'string' ? html`<div class="text-sm text-gray-500 mt-1">${moduleInfo.purpose}</div>` : nothing}
                </div>

                ${typeof designContext.initialPrompt === 'string' && designContext.initialPrompt ? html`
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.originalRequest}</label>
                        <div class="text-sm whitespace-pre-wrap mt-1">${designContext.initialPrompt}</div>
                    </div>
                ` : nothing}

                ${typeof clarification.mainActors === 'string' ? html`
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.mainActors}</label>
                        <div class="text-sm mt-1">${clarification.mainActors}</div>
                    </div>
                ` : nothing}

                ${typeof businessScope.mainGoal === 'string' ? html`
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.mainGoal}</label>
                        <div class="text-sm mt-1">${businessScope.mainGoal}</div>
                    </div>
                ` : nothing}

                ${this._renderScopeList(this.msg.inScope, businessScope.inScope)}
                ${this._renderScopeList(this.msg.outOfScope, businessScope.outOfScope)}

                ${steps.length ? html`
                    <div>
                        <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${this.msg.approvalTrail}</label>
                        <div class="flex flex-col gap-1 mt-1">
                            ${steps.map((step) => html`
                                <div class="flex items-center gap-2 text-xs">
                                    <span class="w-40 shrink-0 text-gray-500">${String(step.stepId ?? '')}</span>
                                    <span class="${step.approvedBy === 'auto' ? 'text-amber-500' : 'text-emerald-600 dark:text-emerald-400'}">${String(step.approvedBy ?? '')}</span>
                                    <span class="text-gray-400">${String(step.approvedAt ?? '')}</span>
                                </div>
                            `)}
                        </div>
                    </div>
                ` : nothing}
            </div>
        `;
    }

    private _renderScopeList(label: string, value: unknown) {
        if (!Array.isArray(value) || !value.length) return nothing;
        return html`
            <div>
                <label class="text-xs font-semibold uppercase tracking-wide text-gray-500">${label}</label>
                <ul class="text-sm list-disc list-inside mt-1">
                    ${value.map((entry) => html`<li>${String(entry)}</li>`)}
                </ul>
            </div>
        `;
    }
}
