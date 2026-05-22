/// <mls fileReference="_102020_/l2/plugins/selectRule.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import '/_102020_/l2/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Rules',
    desc: 'A rule defines business logic or validation applied to pages and components.',
    allTitle: 'All Rules',
    allDesc: 'Overview of all rules in this module.',
    customTitle: 'New Rule',
    customDesc: 'Create a new rule for this module.',
    noRules: 'No rules found in this module.',
    noResults: 'No rules match your search.',
    createNew: 'New Rule',
    searchPlaceholder: 'Search rules…',
    inDevelopment: 'In development',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Regras',
        desc: 'Uma regra define lógica de negócio ou validação aplicada a páginas e componentes.',
        allTitle: 'Todas as Regras',
        allDesc: 'Visão geral de todas as regras deste módulo.',
        customTitle: 'Nova Regra',
        customDesc: 'Crie uma nova regra para este módulo.',
        noRules: 'Nenhuma regra encontrada neste módulo.',
        noResults: 'Nenhuma regra corresponde à sua busca.',
        createNew: 'Nova Regra',
        searchPlaceholder: 'Buscar regras…',
        inDevelopment: 'Em desenvolvimento',
    },
    es: {
        title: 'Reglas',
        desc: 'Una regla define lógica de negocio o validación aplicada a páginas y componentes.',
        allTitle: 'Todas las Reglas',
        allDesc: 'Visión general de todas las reglas de este módulo.',
        customTitle: 'Nueva Regla',
        customDesc: 'Cree una nueva regla para este módulo.',
        noRules: 'No se encontraron reglas en este módulo.',
        noResults: 'Ninguna regla coincide con su búsqueda.',
        createNew: 'Nueva Regla',
        searchPlaceholder: 'Buscar reglas…',
        inDevelopment: 'En desarrollo',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IRule {
    name: string;
    path: string;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-rule-102020')
export class PluginSelectRule extends StateLitElement {

    @property({ attribute: false }) rules: IRule[] = [];
    @property({ attribute: false }) value: number | null = null;

    @state() private _search: string = '';

    willUpdate(changed: Map<string, unknown>) {
        if (changed.has('value')) this._search = '';
    }

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    private get _isAll(): boolean {
        return this.value === 0;
    }

    private get _isCustom(): boolean {
        return this.value !== null && this.value > this.rules.length;
    }

    private get _selectedRule(): IRule | null {
        if (this.value === null || this.value <= 0 || this.value > this.rules.length) return null;
        return this.rules[this.value - 1];
    }

    createRenderRoot() { return this; }

    render() {
        if (this._isAll) return this._renderAll();
        if (this._isCustom) return this._renderCustom();
        return this._renderSelected();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderSelected() {
        const rule = this._selectedRule;
        const max = this.rules.length + 1;
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${rule?.name ?? ''}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 0}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>
                ${rule ? this._renderRuleDetail(rule) : nothing}
            </div>
        `;
    }

    private _renderRuleDetail(rule: IRule) {
        return html`
            <div class="
                rounded-lg border border-gray-200 dark:border-gray-800
                bg-gray-50 dark:bg-gray-900/50
                px-3 py-2.5
            ">
                <div class="flex items-center gap-2">
                    <span class="text-sm font-semibold text-gray-700 dark:text-gray-300">${rule.name}</span>
                    <span
                        class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                        style="max-width:180px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                    >${rule.path}</span>
                </div>
            </div>
        `;
    }

    private _renderAll() {
        const q = this._search.toLowerCase();
        const filtered = this.rules
            .map((r, i) => ({ r, selectValue: i + 1 }))
            .filter(({ r }) => !q || r.name.toLowerCase().includes(q) || r.path.toLowerCase().includes(q));
        const max = this.rules.length + 1;

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

                ${this.rules.length === 0
                    ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noRules}</span>`
                    : filtered.length === 0
                        ? html`<span class="text-sm text-gray-400 dark:text-gray-600 italic">${this.msg.noResults}</span>`
                        : html`
                            <div class="flex flex-col gap-1.5">
                                ${filtered.map(({ r, selectValue }) => this._renderRuleCard(r, selectValue))}
                            </div>
                        `}
            </div>
        `;
    }

    private _renderCustom() {
        const max = this.rules.length + 1;
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
                <div class="
                    rounded-lg border border-amber-200 dark:border-amber-800/40
                    bg-amber-50 dark:bg-amber-900/10
                    px-3 py-2.5
                ">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.inDevelopment}</span>
                </div>
            </div>
        `;
    }

    // ─── Shared helpers ───────────────────────────────────────────────

    private _renderRuleCard(rule: IRule, selectValue: number) {
        return html`
            <div
                class="
                    rounded-lg border border-gray-200 dark:border-gray-800
                    bg-gray-50 dark:bg-gray-900/50
                    hover:bg-gray-100 dark:hover:bg-gray-800/70
                    px-3 py-2.5 flex items-center gap-2
                    cursor-pointer transition-colors
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                <span class="text-sm font-medium text-gray-700 dark:text-gray-300">${rule.name}</span>
                <span
                    class="ml-auto text-sm font-mono text-gray-400 dark:text-gray-600"
                    style="max-width:150px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis"
                >${rule.path}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-rule', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
