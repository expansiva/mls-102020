/// <mls fileReference="_102020_/l2/serviceBehavior.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ServiceBase, IService, IToolbarContent, IServiceMenu } from '/_102027_/l2/serviceBase.js';
import { AuraInitState, getAuraState } from '/_102020_/l2/auraState.js';

import '/_102027_/l2/collabSelectKnob.js';
import '/_102020_/l2/plugins/selectRule.js';


// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    svcTitle: 'Behavior',
    rule: 'Rules',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        svcTitle: 'Comportamento',
        rule: 'Regras',
    },
    es: {
        svcTitle: 'Comportamiento',
        rule: 'Reglas',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

interface IKnobConfig {
    key: string;
    min: number;
    max: number;
    labels: Record<number, string>;
    disabled?: boolean;
}

// ─── Service ─────────────────────────────────────────────────────────

@customElement('service-behavior-102020')
export class ServiceBehavior102020 extends ServiceBase {

    public details: IService = {
        icon: '&#xf0f6',
        state: 'foreground',
        position: 'left',
        tooltip: 'Behavior',
        visible: true,
        widget: '_102020_serviceBehavior',
        level: [6],
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

    onServiceClick(_visible: boolean, _reinit: boolean, _el: IToolbarContent | null) {
        // @ts-ignore
        this.requestUpdate();
    }

    // ─── State ────────────────────────────────────────────────────────

    @state() private msg: MessageType = message_en;

    @state() private _modules: IModule[] = [];

    @state() private _ruleConfig: IKnobConfig = { key: 'rule', min: 0, max: 0, labels: { 0: 'All' } };

    @state() private _ruleValue: number | null = null;

    @state() private _selectedKnob: string = 'rule';

    // ─── Data Loading ─────────────────────────────────────────────────

    private async _loadData() {
        const project = getAuraState().actualProject;
        if (!project) return;
        try {
            const mod = await import(`/_${project}_/l2/project.js`);
            this._modules = mod?.projectConfig?.modules ?? [];
            this._ruleValue = 0;
        } catch {
            this._modules = [];
        }
        // @ts-ignore
        this.requestUpdate();
    }

    private get _selectedModule(): IModule | null {
        const actualModule = getAuraState().actualModule;
        if (!actualModule) return null;
        return this._modules.find(m => m.name === actualModule) ?? null;
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    private get _knobValues(): Record<string, number | null> {
        return {
            rule: this._ruleValue,
        };
    }

    private _getKnobConfig(key: string): IKnobConfig {
        switch (key) {
            case 'rule': return this._ruleConfig;
            default: return { key, min: 0, max: 0, labels: {}, disabled: true };
        }
    }

    private _setKnobValue(key: string, value: number | null) {
        switch (key) {
            case 'rule': this._ruleValue = value; break;
        }
        // @ts-ignore
        this.requestUpdate();
    }

    // ─── Event Handlers ───────────────────────────────────────────────

    private _onKnobChange(key: string, e: CustomEvent) {
        this._selectedKnob = key;
        this._setKnobValue(key, e.detail.value);
    }

    private _onKnobClick(key: string) {
        this._selectedKnob = key;
        // @ts-ignore
        this.requestUpdate();
    }

    // ─── Lifecycle ────────────────────────────────────────────────────

    connectedCallback() {
        super.connectedCallback();
        AuraInitState();
        this._loadData();
    }

    // ─── Render ───────────────────────────────────────────────────────

    createRenderRoot() { return this; }

    render() {
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
                ${this._renderKnobItem('rule')}
            </div>
        `;
    }

    private _renderKnobItem(key: string) {
        const config = this._getKnobConfig(key);
        const value = this._knobValues[key];
        const isContext = this._selectedKnob === key;
        const isDisabled = config.disabled ?? false;
        const label = this.msg[key as keyof MessageType] || key;

        return html`
            <div class="flex flex-col items-center gap-0.5 ${isDisabled ? 'opacity-30' : ''}">
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

    private _onRuleConfig(e: CustomEvent) {
        const { min, max, labels } = e.detail;
        this._ruleConfig = { key: 'rule', min, max, labels };
        // @ts-ignore
        this.requestUpdate();
    }

    private _renderDetailsRow() {
        return html`
            <div class="flex flex-col flex-1">
                <div class="flex flex-col gap-3 px-4 py-4 flex-1"
                    @select-rule=${(e: CustomEvent) => this._setKnobValue('rule', e.detail.value)}
                    @rule-config=${(e: CustomEvent) => this._onRuleConfig(e)}
                >
                    ${this._renderContextStatusArea()}
                </div>
            </div>
        `;
    }

    private _renderContextStatusArea() {
        switch (this._selectedKnob) {
            case 'rule':
                return html`
                    <plugins--select-rule-102020
                        .selectedModule=${this._selectedModule}
                        .value=${this._ruleValue}
                        @select-rule=${(e: CustomEvent) => this._setKnobValue('rule', e.detail.value)}
                    ></plugins--select-rule-102020>
                `;
            default:
                return nothing;
        }
    }
}
