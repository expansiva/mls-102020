/// <mls fileReference="_102020_/l2/aura/services/serviceExploreProjects.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { checkIfHasLocalProject, getLocalProjectName } from '/_102027_/l2/libCommom.js';
import { AuraInitState, getAuraState, setAuraState, saveAuraProject } from '/_102020_/l2/aura/helpers/auraState.js';
import { dsIndexNameMap } from '/_102020_/l2/aura/helpers/dsMatch/buildDesignSystemTs.js';

import '/_102027_/l2/collabSelectKnob.js';
import '/_102020_/l2/aura/plugins/selectOrganization.js';
import '/_102020_/l2/aura/plugins/selectProject.js';
import '/_102020_/l2/aura/plugins/selectDesignSystem.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Explore Projects',
    organization: 'Organization',
    project: 'Project',
    designSystem: 'UI',
    designSystemFull: 'User Interface (design system)',
    orgScenarioTitle: 'Select Organization',
    orgScenarioDesc: 'An organization groups multiple projects under the same umbrella. Select one to browse the projects available to your team.',
    orgAllTitle: 'All Organizations',
    orgAllDesc: 'Overview of all organizations available in the system.',
    orgCustomTitle: 'New Organization',
    orgCustomDesc: 'Create a new organization to group your projects.',
    projectScenarioTitle: 'Select Project',
    projectScenarioDesc: 'A project is a deliverable within an organization — it contains pages, components, and all generated code.',
    projectAllTitle: 'All Projects',
    projectAllDesc: 'Overview of all projects in this organization.',
    projectCustomTitle: 'New Project',
    projectCustomDesc: 'Create a new project within this organization.',
    projectNeedsOrg: 'Select an organization first to see the available projects.',
    dsScenarioTitle: 'Select Design System',
    dsNeedsProject: 'Select a project first to see the available design systems.',
    projects: 'projects',
    noOrgs: 'No organizations found.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Explorar Projetos',
        organization: 'Organização',
        project: 'Projeto',
        designSystem: 'UI',
        designSystemFull: 'User Interface (design system)',
        orgScenarioTitle: 'Selecionar Organização',
        orgScenarioDesc: 'Uma organização agrupa vários projetos sob o mesmo guarda-chuva. Selecione uma para navegar pelos projetos disponíveis para o seu time.',
        orgAllTitle: 'Todas as Organizações',
        orgAllDesc: 'Visão geral de todas as organizações disponíveis no sistema.',
        orgCustomTitle: 'Nova Organização',
        orgCustomDesc: 'Crie uma nova organização para agrupar seus projetos.',
        projectScenarioTitle: 'Selecionar Projeto',
        projectScenarioDesc: 'Um projeto é uma entrega dentro de uma organização — contém páginas, componentes e todo o código gerado.',
        projectAllTitle: 'Todos os Projetos',
        projectAllDesc: 'Visão geral de todos os projetos desta organização.',
        projectCustomTitle: 'Novo Projeto',
        projectCustomDesc: 'Crie um novo projeto dentro desta organização.',
        projectNeedsOrg: 'Selecione uma organização primeiro para ver os projetos disponíveis.',
        dsScenarioTitle: 'Selecionar Design System',
        dsNeedsProject: 'Selecione um projeto primeiro para ver os design systems disponíveis.',
        projects: 'projetos',
        noOrgs: 'Nenhuma organização encontrada.',
    },
    es: {
        svcTitle: 'Explorar Proyectos',
        organization: 'Organización',
        project: 'Proyecto',
        designSystem: 'UI',
        designSystemFull: 'User Interface (design system)',
        orgScenarioTitle: 'Seleccionar Organización',
        orgScenarioDesc: 'Una organización agrupa múltiples proyectos bajo el mismo paraguas. Seleccione una para explorar los proyectos disponibles para su equipo.',
        orgAllTitle: 'Todas las Organizaciones',
        orgAllDesc: 'Visión general de todas las organizaciones disponibles en el sistema.',
        orgCustomTitle: 'Nueva Organización',
        orgCustomDesc: 'Cree una nueva organización para agrupar sus proyectos.',
        projectScenarioTitle: 'Seleccionar Proyecto',
        projectScenarioDesc: 'Un proyecto es un entregable dentro de una organización — contiene páginas, componentes y todo el código generado.',
        projectAllTitle: 'Todos los Proyectos',
        projectAllDesc: 'Visión general de todos los proyectos de esta organización.',
        projectCustomTitle: 'Nuevo Proyecto',
        projectCustomDesc: 'Cree un nuevo proyecto dentro de esta organización.',
        projectNeedsOrg: 'Seleccione una organización primero para ver los proyectos disponibles.',
        dsScenarioTitle: 'Seleccionar Design System',
        dsNeedsProject: 'Seleccione un proyecto primero para ver los sistemas de diseño disponibles.',
        projects: 'proyectos',
        noOrgs: 'No se encontraron organizaciones.',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IProject {
    project: number;
    name: string;
    doSelect: boolean;
}

interface IOrg {
    name: string;
    created_at: string;
    description: string;
    key: string;
    index: number;
    projects: IProject[];
}

interface IKnobConfig {
    key: string;
    min: number;
    max: number;
    labels: Record<number, string>;
    disabled?: boolean;
}

// ─── Static configs ───────────────────────────────────────────────────

const DISABLED_CONFIG = (key: string): IKnobConfig => ({
    key,
    min: 1,
    max: 1,
    labels: {},
    disabled: true,
});

const LOCAL_ORG_KEY = 'local-projects';
const LOCAL_ORG_NAME = 'Local Projects';

// ─── Service ─────────────────────────────────────────────────────────

@customElement('aura--services--service-explore-projects-102020')
export class ServiceExploreProjects102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf0b1',
        state: 'foreground',
        position: 'left',
        tooltip: 'Explore Projects',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceExploreProjects',
        level: [6],
    };

    public onClickMain(op: string): void {
        if (this.menu.setMode) this.menu.setMode('initial');
    }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) { }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _orgs: IOrg[] = [];
    @state() private _orgConfig: IKnobConfig = DISABLED_CONFIG('organization');

    @state() private _orgValue: number | null = null;
    @state() private _projectValue: number | null = null;
    @state() private _dsValue: number | null = null;

    @state() private _selectedKnob: string = 'organization';

    @state() private _projectConfig: IKnobConfig = DISABLED_CONFIG('project');
    @state() private _dsConfig: IKnobConfig = DISABLED_CONFIG('designSystem');

    // ─── Org Loading ──────────────────────────────────────────────────

    private _loadOrgs() {
        const orgs = this._getOrgsFromMls();
        this._orgs = orgs;
        this._orgConfig = this._buildOrgConfig(orgs);

        const isLocalActual = mls.actualProject === mls.stor.LOCALPROJECTNUMBER;
        const actualOrgIndex: number | null = mls?.l5?.actualOrg ?? null;
        let matchedPos = actualOrgIndex !== null
            ? orgs.findIndex(o => o.index === actualOrgIndex)
            : -1;
        if (isLocalActual) matchedPos = orgs.findIndex(o => o.key === LOCAL_ORG_KEY);
        this._setKnobValue('organization', matchedPos >= 0 ? matchedPos + 1 : 0);

        if (matchedPos >= 0) {
            const org = orgs[matchedPos];
            const actualProjectId: number | null = isLocalActual ? mls.stor.LOCALPROJECTNUMBER : getAuraState().actualProject;
            const matchedProjectPos = actualProjectId !== null
                ? org.projects.findIndex(p => p.project === actualProjectId)
                : -1;
            this._setKnobValue('project', matchedProjectPos >= 0 ? matchedProjectPos + 1 : 0);
            if (matchedProjectPos >= 0 && actualProjectId) {
                this._selectedKnob = 'project';
                this._initDsConfig(actualProjectId);
            }
        }
    }

    private _getOrgsFromMls(): IOrg[] {
        if (!mls?.stor?.orgs) return [];
        const result: IOrg[] = [];
        Object.keys(mls.stor.orgs).forEach((org, index) => {
            const { name, description, created_at, projects } = mls.stor.orgs[org].sett;
            const prj: IProject[] = [];
            projects.forEach((p: any) => {
                try {
                    const json = JSON.parse(p.value);
                    if (!p.id) return;
                    const info = mls.l5.getProjectSettings(p.id);
                    let doSelect = true;
                    let projectDriver = '';
                    let projectURL = '';
                    if (!json.projectURL && json.l5_actionPrjSettings) {
                        projectDriver = json.l5_actionPrjSettings.projectDriver || '';
                        projectURL = json.l5_actionPrjSettings.projectURL || '';
                    } else if (json.projectURL) {
                        projectDriver = json.projectDriver || '';
                        projectURL = json.projectURL || '';
                    }
                    if (!projectDriver || !projectURL || projectDriver === 'mls') return;
                    if (!info || !info.projectDriver || !info.projectURL) doSelect = false;
                    if (doSelect) prj.push({ project: p.id, name: p.name, doSelect });
                } catch (e) { }
            });
            if (prj.length <= 0) return;
            result.push({ name, created_at, description, key: org, index, projects: prj });
        });
        if (checkIfHasLocalProject()) result.unshift(this._buildLocalOrg());
        return result;
    }

    // Virtual organization, in memory only — the local project belongs to no real org.
    private _buildLocalOrg(): IOrg {
        return {
            name: LOCAL_ORG_NAME,
            created_at: '',
            description: 'Local test projects (browser only)',
            key: LOCAL_ORG_KEY,
            index: -1,
            projects: [{ project: mls.stor.LOCALPROJECTNUMBER, name: getLocalProjectName() || 'Local', doSelect: true }],
        };
    }

    private _buildOrgConfig(orgs: IOrg[]): IKnobConfig {
        const labels: Record<number, string> = { 0: 'All' };
        orgs.forEach((org, i) => { labels[i + 1] = org.name; });
        labels[orgs.length + 1] = 'Custom';
        return { key: 'organization', min: 0, max: orgs.length + 1, labels };
    }

    private _buildProjectConfigFromOrg(org: IOrg): IKnobConfig {
        const labels: Record<number, string> = { 0: 'All' };
        org.projects.forEach((p, i) => { labels[i + 1] = p.name; });
        labels[org.projects.length + 1] = 'Custom';
        return { key: 'project', min: 0, max: org.projects.length + 1, labels, disabled: false };
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    private get _selectedOrg(): IOrg | null {
        if (this._orgValue === null || this._orgValue <= 0 || this._orgValue > this._orgs.length) return null;
        return this._orgs[this._orgValue - 1];
    }

    private get _selectedProject(): IProject | null {
        const org = this._selectedOrg;
        if (!org || this._projectValue === null || this._projectValue <= 0 || this._projectValue > org.projects.length) return null;
        return org.projects[this._projectValue - 1];
    }

    private get _knobValues(): Record<string, number | null> {
        return {
            organization: this._orgValue,
            project: this._projectValue,
            designSystem: this._dsValue,
        };
    }

    private _getKnobConfig(key: string): IKnobConfig {
        switch (key) {
            case 'organization': return this._orgConfig;
            case 'project': return this._projectConfig;
            case 'designSystem': return this._dsConfig;
            default: return DISABLED_CONFIG(key);
        }
    }

    private _setKnobValue(key: string, value: number | null) {
        switch (key) {
            case 'organization':
                this._orgValue = value;
                this._dsValue = null;
                const org = this._orgs[value !== null ? value - 1 : -1];
                if (org) {
                    this._projectConfig = this._buildProjectConfigFromOrg(org);
                    this._projectValue = 0;
                } else {
                    this._projectConfig = DISABLED_CONFIG('project');
                    this._projectValue = null;
                }
                this._dsConfig = DISABLED_CONFIG('designSystem');
                break;
            case 'project':
                this._projectValue = value;
                this._dsValue = null;
                const orgLen = this._selectedOrg?.projects.length ?? 0;
                const isRealProject = value !== null && value > 0 && value <= orgLen;
                const candidateProject = isRealProject ? (this._selectedOrg?.projects[(value as number) - 1] ?? null) : null;
                if (candidateProject) {
                    this._initDsConfig(candidateProject.project);
                } else {
                    this._dsConfig = DISABLED_CONFIG('designSystem');
                }
                break;
            case 'designSystem':
                this._dsValue = value;
                if (value !== null && value > 0 && value <= this._dsConfig.max
                    && this._dsConfig.labels[value] !== '+') {
                    setAuraState('actualDesignSystem', value);
                    saveAuraProject();
                }
                break;
        }
        this.requestUpdate();
    }

    // ─── Event Handlers ───────────────────────────────────────────────

    private _onKnobChange(key: string, e: CustomEvent) {
        this._selectedKnob = key;
        this._setKnobValue(key, e.detail.value);
    }

    private _onKnobClick(key: string) {
        this._selectedKnob = key;
        this.requestUpdate();
    }

    private async _onDsCreated(value: number) {
        // New DS persisted: rebuild the knob (new entry + fresh "+" slot), then select it.
        const project = this._selectedProject?.project;
        if (project != null) await this._initDsConfig(project);
        this._setKnobValue('designSystem', value);
    }

    private _onDsConfig(e: CustomEvent) {
        this._dsConfig = { key: 'designSystem', min: e.detail.min, max: e.detail.max, labels: e.detail.labels };
        const actualDs = getAuraState().actualDesignSystem;
        if (actualDs !== null && actualDs > 0 && actualDs < e.detail.max) {
            this._dsValue = actualDs;
        } else {
            if (this._dsValue === null) this._dsValue = 0;
        }
        this.requestUpdate();
    }

    private async _initDsConfig(projectId: number): Promise<void> {
        try {
            const dsMap = await dsIndexNameMap(projectId);
            const keys = Object.keys(dsMap).map(Number).sort((a, b) => a - b);
            const labels: Record<number, string> = { 0: 'All' };
            keys.forEach(k => { labels[k] = dsMap[String(k)]; });
            const customKey = keys.length ? keys[keys.length - 1] + 1 : 1;
            labels[customKey] = '+';
            this._onDsConfig(new CustomEvent('ds-config', {
                detail: { min: 0, max: customKey, labels },
            }));
        } catch { /* ignore */ }
    }

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        AuraInitState();
        this._loadOrgs();
    }

    // ─── Render ───────────────────────────────────────────────────────

    createRenderRoot() { return this; }

    render() {
        this.style.display = 'block';
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];

        return html`
            <div class="flex flex-col min-h-full bg-white dark:bg-gray-950 text-gray-800 dark:text-gray-200">
                ${this._renderKnobRow()}
                ${this._renderDetailsRow()}
            </div>
        `;
    }

    // ─── Knob Row ─────────────────────────────────────────────────────

    private _renderKnobRow() {
        return html`
            <div class="
                flex items-center justify-center
                px-2 py-3
                border-b border-gray-200 dark:border-gray-800
                gap-0
            " style="--knob-scale: 0.5">
                ${this._renderKnobItem('organization')}
                ${this._renderKnobItem('project')}
                ${this._renderKnobItem('designSystem')}
            </div>
        `;
    }

    private _renderKnobItem(key: string) {
        const config = this._getKnobConfig(key);
        const value = this._knobValues[key];
        const isContext = this._selectedKnob === key;
        const isDisabled = config.disabled ?? false;
        const label = this.msg[key as keyof MessageType] || key;
        const fullLabel = this.msg[`${key}Full` as keyof MessageType] || label; // tooltip: name in full

        return html`
            <div title=${fullLabel} class="flex flex-col items-center gap-0.5 ${isDisabled ? 'opacity-30' : ''}">
                <collab-select-knob-102027
                    .min=${config.min}
                    .max=${config.max}
                    .value=${value}
                    .step=${1}
                    .active=${true}
                    .disabled=${isDisabled}
                    .selected=${isContext}
                    .showTicks=${false}
                    @knob-change=${(e: CustomEvent) => this._onKnobChange(key, e)}
                ></collab-select-knob-102027>

                <div
                    class="flex flex-col items-center gap-0.5 cursor-pointer"
                    @click=${() => this._onKnobClick(key)}
                >
                    <span class="
                        text-[9px] font-semibold uppercase tracking-wider
                        ${isContext
                ? 'text-gray-700 dark:text-gray-200'
                : 'text-gray-400 dark:text-gray-600'}
                        transition-colors duration-200
                    ">${label}</span>

                    <div class="
                        w-full h-0.5 rounded-full
                        transition-all duration-200
                        ${isContext
                ? 'bg-cyan-400 shadow-[0_0_4px_1px_rgba(34,211,238,0.6),0_0_8px_2px_rgba(34,211,238,0.3)]'
                : 'bg-transparent'}
                    "></div>
                </div>
            </div>
        `;
    }

    // ─── Details Row ──────────────────────────────────────────────────

    private _renderDetailsRow() {
        return html`
            <div class="flex flex-col flex-1">
                <div class="flex flex-col gap-3 px-4 py-4 flex-1"
                    @select-ds=${(e: CustomEvent) => this._setKnobValue('designSystem', e.detail.value)}
                    @ds-created=${(e: CustomEvent) => this._onDsCreated(e.detail.value)}
                    @ds-config=${(e: CustomEvent) => this._onDsConfig(e)}
                >
                    ${this._renderContextStatusArea()}
                </div>
            </div>
        `;
    }

    private _renderContextStatusArea() {
        switch (this._selectedKnob) {
            case 'organization':
                return html`
                    <aura--plugins--select-organization-102020
                        .orgs=${this._orgs}
                        .value=${this._orgValue}
                        @select-org=${(e: CustomEvent) => this._setKnobValue('organization', e.detail.value)}
                    ></aura--plugins--select-organization-102020>
                `;
            case 'project':
                return html`
                    <aura--plugins--select-project-102020
                        .selectedOrg=${this._selectedOrg}
                        .value=${this._projectValue}
                        @select-project=${(e: CustomEvent) => this._setKnobValue('project', e.detail.value)}
                    ></aura--plugins--select-project-102020>
                `;
            case 'designSystem':
                // Phase B — DS = styling. Same tokens editor as the genome (project-wide tokens).
                return html`
                    <aura--plugins--select-design-system-102020
                        .projectId=${this._selectedProject?.project ?? null}
                        .value=${this._dsValue}
                    ></aura--plugins--select-design-system-102020>
                `;
            default:
                return nothing;
        }
    }
}
