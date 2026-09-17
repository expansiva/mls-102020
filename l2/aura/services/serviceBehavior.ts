/// <mls fileReference="_102020_/l2/aura/services/serviceBehavior.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { AuraInitState, getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import {
    announceNewReleaseContext,
    NEW_RELEASE_TOBE_UPDATED_EVENT,
    type NewReleaseContext,
    type NewReleaseVersion,
} from '/_102035_/l2/newRelease/helpers/context.js';
import {
    listEligibleProjects,
    listReadableProjects,
    listNs5ModuleSummaries,
    type NewReleaseModuleSummary,
} from '/_102035_/l2/newRelease/helpers/l4Reader.js';

import '/_102020_/l2/aura/widgets/auraSelectKnob.js';
import '/_102020_/l2/aura/plugins/navHeader.js';

/// **collab_i18n_start**
const message_en = {
    svcTitle: 'New release',
    intro: 'Choose the project, module and version to review.',
    project: 'Project',
    module: 'Module',
    version: 'Version',
    projectDesc: 'Projects with a materialized l5/config.json.',
    moduleDesc: 'Level 4 modules available for human review.',
    versionDesc: 'Current definition or a prepared future version.',
    current: 'Current',
    tobe: 'To be',
    loading: 'Loading release context…',
    empty: 'No eligible project was found.',
    moduleMap: 'Module blueprint',
    moduleMapDescription: 'Review the business, follow generation and prepare the next version in one place.',
    complete: 'Complete',
    failed: 'Failed',
    inProgress: 'In progress',
    awaitingStep: 'Awaiting review',
    unknown: 'No pipeline',
    compatibility: 'Project compatibility',
    ineligibleTitle: 'This project is not ready for New release yet.',
    missingL4: 'No reviewable root L4 module definition was found in the current project.',
    missingRuntime: 'The L4 definition exists, but l5/config.json has not been materialized with at least one module.',
    projectUnavailable: 'The current project could not be identified in Studio.',
    ineligibleHint: 'Complete the project structure and rebuild the release. The knobs remain available so you can inspect or select another compatible project.',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Nova versão',
        intro: 'Escolha o projeto, o módulo e a versão que deseja revisar.',
        project: 'Projeto',
        module: 'Módulo',
        version: 'Versão',
        projectDesc: 'Projetos com l5/config.json materializado.',
        moduleDesc: 'Módulos do nível 4 disponíveis para revisão humana.',
        versionDesc: 'Definição atual ou uma versão futura preparada.',
        current: 'Atual',
        tobe: 'Tobe',
        loading: 'Carregando o contexto da release…',
        empty: 'Nenhum projeto elegível foi encontrado.',
        moduleMap: 'Mapa do módulo',
        moduleMapDescription: 'Revise o negócio, acompanhe a geração e prepare a próxima versão em um só lugar.',
        complete: 'Completo',
        failed: 'Falhou',
        inProgress: 'Em andamento',
        awaitingStep: 'Aguardando revisão',
        unknown: 'Sem pipeline',
        compatibility: 'Compatibilidade do projeto',
        ineligibleTitle: 'Este projeto ainda não está preparado para Nova versão.',
        missingL4: 'Nenhuma definição de módulo L4 revisável foi encontrada na raiz do projeto atual.',
        missingRuntime: 'A definição L4 existe, mas o l5/config.json ainda não foi materializado com pelo menos um módulo.',
        projectUnavailable: 'Não foi possível identificar o projeto atual no Studio.',
        ineligibleHint: 'Complete a estrutura do projeto e gere novamente a release. Os knobs continuam disponíveis para inspeção ou para selecionar outro projeto compatível.',
    },
    es: {
        svcTitle: 'Nueva versión',
        intro: 'Elija el proyecto, el módulo y la versión que desea revisar.',
        project: 'Proyecto',
        module: 'Módulo',
        version: 'Versión',
        projectDesc: 'Proyectos con l5/config.json materializado.',
        moduleDesc: 'Módulos de nivel 4 disponibles para revisión humana.',
        versionDesc: 'Definición actual o una versión futura preparada.',
        current: 'Actual',
        tobe: 'Tobe',
        loading: 'Cargando el contexto de la release…',
        empty: 'No se encontró ningún proyecto elegible.',
        moduleMap: 'Mapa del módulo',
        moduleMapDescription: 'Revise el negocio, acompañe la generación y prepare la próxima versión en un solo lugar.',
        complete: 'Completo',
        failed: 'Falló',
        inProgress: 'En curso',
        awaitingStep: 'Esperando revisión',
        unknown: 'Sin pipeline',
        compatibility: 'Compatibilidad del proyecto',
        ineligibleTitle: 'Este proyecto todavía no está preparado para Nueva versión.',
        missingL4: 'No se encontró una definición de módulo L4 revisable en la raíz del proyecto actual.',
        missingRuntime: 'La definición L4 existe, pero l5/config.json aún no fue materializado con al menos un módulo.',
        projectUnavailable: 'No fue posible identificar el proyecto actual en Studio.',
        ineligibleHint: 'Complete la estructura del proyecto y genere nuevamente la versión. Los knobs siguen disponibles para inspección o para seleccionar otro proyecto compatible.',
    },
};
/// **collab_i18n_end**

type ContextKey = 'project' | 'module' | 'version';

interface IKnobConfig {
    min: number;
    max: number;
    value: number;
    disabled: boolean;
}

@customElement('aura--services--service-behavior-102020')
export class ServiceBehavior102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf0f6',
        state: 'foreground',
        position: 'left',
        tooltip: 'Nova versão',
        visible: true,
        widget: '_102020_/l2/aura/services/serviceBehavior',
        level: [4],
    };

    public onClickMain(_op: string): void {
        if (this.menu.setMode) this.menu.setMode('initial');
    }

    public menu: IServiceMenu = {
        title: '',
        main: {},
        tools: {},
        tabs: undefined,
        onClickMain: this.onClickMain.bind(this),
    };

    @state() private msg: MessageType = message_en;
    @state() private _projects: number[] = [];
    @state() private _readableProjects: number[] = [];
    @state() private _eligibleProjects: number[] = [];
    @state() private _modules: NewReleaseModuleSummary[] = [];
    @state() private _projectValue = 1;
    @state() private _moduleValue = 1;
    @state() private _versionValue = 1;
    @state() private _selectedKnob: ContextKey = 'module';
    @state() private _loading = true;

    private _loadToken = 0;

    private get _project(): number {
        return this._projects[this._projectValue - 1] ?? 0;
    }

    private get _module(): NewReleaseModuleSummary | null {
        return this._modules[this._moduleValue - 1] ?? null;
    }

    private get _projectEligible(): boolean {
        return this._eligibleProjects.includes(this._project);
    }

    private get _versions(): NewReleaseVersion[] {
        return this._module?.tobeChanges ? ['asis', 'tobe'] : ['asis'];
    }

    private get _version(): NewReleaseVersion {
        return this._versions[this._versionValue - 1] ?? 'asis';
    }

    connectedCallback() {
        super.connectedCallback();
        AuraInitState();
        window.addEventListener(NEW_RELEASE_TOBE_UPDATED_EVENT, this._onTobeUpdated as EventListener);
    }

    disconnectedCallback() {
        window.removeEventListener(NEW_RELEASE_TOBE_UPDATED_EVENT, this._onTobeUpdated as EventListener);
        super.disconnectedCallback();
    }

    private _onTobeUpdated = async (event: Event) => {
        const detail = (event as CustomEvent<{ project?: number; moduleName?: string }>).detail;
        const currentModule = this._module;
        if (!currentModule || detail?.project !== this._project || detail?.moduleName !== currentModule.name) return;
        const selected = currentModule.name;
        await this._loadModules(selected);
        this._versionValue = this._module?.tobeChanges ? 2 : 1;
        this._announceContext();
    };

    async onServiceClick(visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        if (!visible) return;
        await this._loadData();
        await this._openModuleBlueprint();
    }

    private async _loadData(): Promise<void> {
        const token = ++this._loadToken;
        const aura = getAuraState();
        this._loading = true;
        this._readableProjects = listReadableProjects();
        this._eligibleProjects = await listEligibleProjects();
        if (token !== this._loadToken) return;

        const actualProject = Number(aura.actualProject || 0);
        const actualModule = String(aura.actualModule || '');
        this._projects = actualProject > 0 && !this._eligibleProjects.includes(actualProject)
            ? [actualProject, ...this._eligibleProjects]
            : this._eligibleProjects;
        const preferredProject = this._projects.includes(actualProject)
            ? actualProject
            : this._projects[0] ?? 0;
        this._projectValue = Math.max(1, this._projects.indexOf(preferredProject) + 1);
        if (!this._projectEligible) this._selectedKnob = 'project';
        await this._loadModules(actualModule, token);
        if (token !== this._loadToken) return;
        this._loading = false;
        this._updateMenuTitle();
        this.requestUpdate();
    }

    private async _loadModules(preferredModule = '', token = ++this._loadToken): Promise<void> {
        this._modules = this._projectEligible ? await listNs5ModuleSummaries(this._project) : [];
        if (token !== this._loadToken) return;
        const preferredIndex = this._modules.findIndex(module => module.name === preferredModule);
        this._moduleValue = preferredIndex >= 0 ? preferredIndex + 1 : 1;
        this._versionValue = 1;
    }

    private _knobConfig(key: ContextKey): IKnobConfig {
        const count = key === 'project' ? this._projects.length : key === 'module' ? this._modules.length : this._versions.length;
        const value = key === 'project' ? this._projectValue : key === 'module' ? this._moduleValue : this._versionValue;
        return { min: 1, max: Math.max(1, count), value, disabled: count <= 1 };
    }

    private async _setKnobValue(key: ContextKey, value: number | null): Promise<void> {
        if (value === null) return;
        const hadContext = Boolean(this._context());
        this._selectedKnob = key;
        if (key === 'project' && value !== this._projectValue) {
            this._projectValue = value;
            await this._loadModules();
        } else if (key === 'module' && value !== this._moduleValue) {
            this._moduleValue = value;
            this._versionValue = 1;
        } else if (key === 'version') {
            this._versionValue = value;
        }
        this._announceContext();
        if (!hadContext && this._context()) await this._openModuleBlueprint();
    }

    private _announceContext(): void {
        const context = this._context();
        if (!context) return;
        announceNewReleaseContext(context);
        this._updateMenuTitle();
        this.requestUpdate();
    }

    private _context(): NewReleaseContext | null {
        if (!this._project || !this._module) return null;
        return { project: this._project, moduleName: this._module.name, version: this._version };
    }

    private async _openModuleBlueprint(): Promise<void> {
        const context = this._context();
        if (!context) return;
        await import('/_102035_/l2/newRelease/widgets/index.js');
        const escapeAttribute = (value: unknown) => String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
        const htmlText = `<new-release--widgets--index-102035 project="${escapeAttribute(context.project)}" module-name="${escapeAttribute(context.moduleName)}" version="${escapeAttribute(context.version)}"></new-release--widgets--index-102035>`;
        mls.events.fire(
            4,
            'PluginDetails' as any,
            JSON.stringify({
                project: 102035,
                shortName: 'l2/newRelease/widgets/index',
                htmlText,
            }),
            0,
        );
    }

    private _updateMenuTitle(): void {
        this.menu.title = this._project && this._module ? `${this._project}-${this._module.name}` : this.msg.svcTitle;
        this.menu.updateTitle?.();
    }

    createRenderRoot() { return this; }

    render() {
        const lang = this.getMessageKey(messages);
        this.msg = messages[lang] ?? message_en;
        return html`
            <section class="nr-service">
                <header class="nr-service__intro">
                    <span>${this.msg.svcTitle}</span>
                    <p>${this.msg.intro}</p>
                </header>
                ${this._loading ? html`<div class="nr-service__loading">${this.msg.loading}</div>` : html`
                    <div class="nr-service__knobs" style="--knob-scale: 0.48">
                        ${this._renderKnob('project')}
                        ${this._renderKnob('module')}
                        ${this._renderKnob('version')}
                    </div>
                    ${this._projectEligible ? html`
                        ${this._renderNavigator()}
                        ${this._renderContextCard()}
                    ` : this._renderCompatibilityCard()}
                `}
            </section>
        `;
    }

    private _renderKnob(key: ContextKey) {
        const config = this._knobConfig(key);
        return html`
            <div class="nr-service__knob ${this._selectedKnob === key ? 'is-selected' : ''}">
                <aura--widgets--aura-select-knob-102020
                    .min=${config.min}
                    .max=${config.max}
                    .value=${config.value}
                    .step=${1}
                    .active=${!config.disabled}
                    .disabled=${config.disabled}
                    .selected=${this._selectedKnob === key}
                    .showTicks=${false}
                    @knob-change=${(event: CustomEvent) => void this._setKnobValue(key, event.detail.value)}
                    @knob-click=${() => { this._selectedKnob = key; this.requestUpdate(); }}
                ></aura--widgets--aura-select-knob-102020>
                <button type="button" @click=${() => { this._selectedKnob = key; this.requestUpdate(); }}>${this.msg[key]}</button>
            </div>
        `;
    }

    private _selectedLabel(): string {
        if (this._selectedKnob === 'project') return this._project ? String(this._project) : '—';
        if (this._selectedKnob === 'module') return this._module?.title ?? '—';
        return this._version === 'tobe' ? this.msg.tobe : this.msg.current;
    }

    private _selectedDescription(): string {
        if (this._selectedKnob === 'project') return this.msg.projectDesc;
        if (this._selectedKnob === 'module') return this.msg.moduleDesc;
        return this.msg.versionDesc;
    }

    private _renderNavigator() {
        const config = this._knobConfig(this._selectedKnob);
        return html`
            <div class="nr-service__navigator">
                <aura--plugins--nav-header-102020
                    .fixedLabel=${this.msg[this._selectedKnob]}
                    .itemName=${this._selectedLabel()}
                    .desc=${this._selectedDescription()}
                    .value=${config.value}
                    .min=${config.min}
                    .max=${config.max}
                    @nav-change=${(event: CustomEvent) => void this._setKnobValue(this._selectedKnob, event.detail.value)}
                ></aura--plugins--nav-header-102020>
            </div>
        `;
    }

    private _statusLabel(): string {
        const status = this._module?.status ?? 'unknown';
        return this.msg[status as keyof MessageType] || this.msg.unknown;
    }

    private _compatibilityReason(): string {
        if (!this._project) return this.msg.projectUnavailable;
        return this._readableProjects.includes(this._project) ? this.msg.missingRuntime : this.msg.missingL4;
    }

    private _renderCompatibilityCard() {
        return html`
            <article class="nr-service__compatibility" role="status">
                <span>${this.msg.compatibility}${this._project ? html` · ${this._project}` : nothing}</span>
                <h2>${this.msg.ineligibleTitle}</h2>
                <p>${this._compatibilityReason()}</p>
                <p>${this.msg.ineligibleHint}</p>
            </article>
        `;
    }

    private _renderContextCard() {
        const module = this._module?.module;
        if (!this._module || !module) return nothing;
        return html`
            <article class="nr-service__context">
                <div class="nr-service__context-heading">
                    <div>
                        <span>${this.msg.moduleMap}</span>
                        <h2>${this._module.title}</h2>
                    </div>
                    <strong class="nr-service__status nr-service__status--${this._module.status}">${this._statusLabel()}</strong>
                </div>
                <p>${this.msg.moduleMapDescription}</p>
            </article>
        `;
    }
}
