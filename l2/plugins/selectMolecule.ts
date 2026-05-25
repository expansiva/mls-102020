/// <mls fileReference="_102020_/l2/plugins/selectMolecule.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import '/_102020_/l2/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Molecules',
    desc: 'Switch between molecule variants for the selected widget.',
    noMolecule: 'Select a web component in the preview to enable molecule variants.',
    selectedOnly: 'Selected only',
    allOccurrences: 'All occurrences',
    replaceMode: 'Replace mode',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Moléculas',
        desc: 'Alterne entre variantes de molécula para o widget selecionado.',
        noMolecule: 'Selecione um web component no preview para habilitar as variantes.',
        selectedOnly: 'Somente selecionado',
        allOccurrences: 'Todas as ocorrências',
        replaceMode: 'Modo de substituição',
    },
    es: {
        title: 'Moléculas',
        desc: 'Cambia entre variantes de molécula para el widget seleccionado.',
        noMolecule: 'Seleccione un componente web en el preview para habilitar las variantes.',
        selectedOnly: 'Solo seleccionado',
        allOccurrences: 'Todas las ocurrencias',
        replaceMode: 'Modo de reemplazo',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IMoleculeFile {
    shortName: string;
    folder: string;
    extension: string;
    [key: string]: any;
}

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-molecule-102020')
export class PluginSelectMolecule extends StateLitElement {

    @property({ attribute: false }) group: string = '';
    @property({ attribute: false }) description: string = '';
    @property({ attribute: false }) files: IMoleculeFile[] = [];
    @property({ attribute: false }) value: number | null = null;
    @property({ attribute: false }) replaceMode: 'selected' | 'all' = 'selected';
    @property({ attribute: false }) error: string = '';

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    createRenderRoot() { return this; }

    render() {
        if (!this.group || this.files.length === 0) return this._renderNoMolecule();
        return this._renderMolecules();
    }

    // ─── Scenario renders ─────────────────────────────────────────────

    private _renderNoMolecule() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(1, 1)}
                <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                    <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.noMolecule}</span>
                </div>
            </div>
        `;
    }

    private _renderMolecules() {
        const max = this.files.length;
        const currentName = this.value ? (this.files[this.value - 1]?.shortName ?? '') : '';
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderHeader(this.value ?? 1, max, currentName)}

                ${this.description ? html`
                    <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 px-3 py-2.5">
                        <div class="flex items-center gap-2 mb-1">
                            <span class="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">${this.group}</span>
                        </div>
                        <span class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">${this.description}</span>
                    </div>
                ` : nothing}

                ${this._renderReplaceModeToggle()}

                ${this.error ? html`
                    <div class="rounded-lg border border-rose-200 dark:border-rose-800/40 bg-rose-50 dark:bg-rose-900/10 px-3 py-2">
                        <span class="text-xs text-rose-600 dark:text-rose-400">${this.error}</span>
                    </div>
                ` : nothing}

                <div class="flex flex-col gap-1">
                    ${this.files.map((f, i) => this._renderVariantCard(f, i + 1))}
                </div>
            </div>
        `;
    }

    // ─── Sub-renders ─────────────────────────────────────────────────

    private _renderHeader(value: number, max: number, itemName: string = '') {
        return html`
            <plugins--nav-header-102020
                .fixedLabel=${this.msg.title}
                .itemName=${itemName}
                .desc=${this.msg.desc}
                .value=${value}
                .min=${1}
                .max=${max}
                @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
            ></plugins--nav-header-102020>
        `;
    }

    private _renderReplaceModeToggle() {
        const isSelected = this.replaceMode === 'selected';
        return html`
            <div class="flex flex-col gap-1">
                <span class="text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600 px-0.5">${this.msg.replaceMode}</span>
                <div class="flex rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <button
                        class="
                            flex-1 text-xs py-1.5 transition-colors cursor-pointer
                            ${isSelected
                                ? 'bg-indigo-500 dark:bg-indigo-600 text-white font-medium'
                                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                        "
                        @click=${() => this._dispatchReplaceMode('selected')}
                    >${this.msg.selectedOnly}</button>
                    <button
                        class="
                            flex-1 text-xs py-1.5 transition-colors cursor-pointer
                            border-l border-gray-200 dark:border-gray-700
                            ${!isSelected
                                ? 'bg-indigo-500 dark:bg-indigo-600 text-white font-medium'
                                : 'bg-white dark:bg-gray-900 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'}
                        "
                        @click=${() => this._dispatchReplaceMode('all')}
                    >${this.msg.allOccurrences}</button>
                </div>
            </div>
        `;
    }

    private _renderVariantCard(file: IMoleculeFile, selectValue: number) {
        const isSelected = this.value === selectValue;
        return html`
            <div
                class="
                    flex items-center gap-2.5 px-3 py-2 rounded-lg border cursor-pointer transition-all
                    ${isSelected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                        : 'border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50 hover:border-gray-300 dark:hover:border-gray-700'}
                "
                @click=${() => this._dispatchSelect(selectValue)}
            >
                <div class="
                    shrink-0 w-7 h-7 rounded flex items-center justify-center
                    ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'bg-gray-200 dark:bg-gray-700'}
                ">
                    ${this._svgMolecule(isSelected)}
                </div>
                <span class="text-sm flex-1 truncate
                    ${isSelected ? 'font-semibold text-indigo-600 dark:text-indigo-400' : 'font-medium text-gray-700 dark:text-gray-300'}
                ">${file.shortName}</span>
                ${isSelected ? html`<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></div>` : nothing}
            </div>
        `;
    }

    // ─── SVG icon ─────────────────────────────────────────────────────

    private _svgMolecule(active: boolean) {
        const color = active ? 'text-indigo-500 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500';
        return html`
            <svg class="${color}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <circle cx="12" cy="12" r="3"/>
                <circle cx="4" cy="6" r="2"/>
                <circle cx="20" cy="6" r="2"/>
                <circle cx="4" cy="18" r="2"/>
                <circle cx="20" cy="18" r="2"/>
                <line x1="6" y1="6" x2="9.5" y2="10.5"/>
                <line x1="18" y1="6" x2="14.5" y2="10.5"/>
                <line x1="6" y1="18" x2="9.5" y2="13.5"/>
                <line x1="18" y1="18" x2="14.5" y2="13.5"/>
            </svg>
        `;
    }

    // ─── Event dispatchers ────────────────────────────────────────────

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-molecule', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }

    private _dispatchReplaceMode(mode: 'selected' | 'all') {
        this.dispatchEvent(new CustomEvent('molecule-replace-mode', {
            detail: { value: mode },
            bubbles: true,
            composed: true,
        }));
    }
}
