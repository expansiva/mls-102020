/// <mls fileReference="_102020_/l2/plugins/selectAssetsMedia.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    category: 'Assets',
    title: 'Media',
    desc: 'Browse and manage media assets such as images, videos, and fonts used in your project.',
    inDevelopment: 'In development',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        category: 'Assets',
        title: 'Mídia',
        desc: 'Navegue e gerencie assets de mídia como imagens, vídeos e fontes usados no seu projeto.',
        inDevelopment: 'Em desenvolvimento',
    },
    es: {
        category: 'Assets',
        title: 'Medios',
        desc: 'Explore y gestione activos multimedia como imágenes, videos y fuentes usados en su proyecto.',
        inDevelopment: 'En desarrollo',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface IModule {
    name: string;
    path: string;
}

const MY_SLOT = 3;
const ASSETS_MIN = 1;
const ASSETS_MAX = 3;

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-assets-media-102020')
export class PluginSelectAssetsMedia extends StateLitElement {

    @property({ attribute: false }) selectedModule: IModule | null = null;
    @property({ attribute: false }) device: number | null = null;

    private get msg(): MessageType {
        const lang = this.getMessageKey(messages);
        return messages[lang];
    }

    createRenderRoot() { return this; }

    render() {
        return html`
            <div class="flex flex-col gap-3">
                ${this._renderNavHeader(this.msg.category, this.msg.title, this.msg.desc, MY_SLOT, ASSETS_MIN, ASSETS_MAX)}
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

    private _renderNavHeader(fixedLabel: string, itemName: string, desc: string, value: number, min: number, max: number) {
        const atMin = value <= min;
        const atMax = value >= max;
        const navBtn = (label: string, target: number, disabled: boolean) => html`
            <button
                class="px-1.5 py-1 rounded text-base font-mono leading-none transition-colors
                    ${disabled
                        ? 'text-gray-300 dark:text-gray-700 cursor-default'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer'}"
                ?disabled=${disabled}
                @click=${() => { if (!disabled) this._dispatchSelect(target); }}
            >${label}</button>
        `;
        return html`
            <div class="flex flex-col gap-1 border-b border-gray-200 dark:border-gray-700 pb-4">
                <span class="text-[10px] font-semibold uppercase tracking-widest text-gray-400 dark:text-gray-600 text-center">${fixedLabel}</span>
                <div class="flex items-center">
                    <div class="flex items-center gap-0.5">
                        ${navBtn('«', min, atMin)}
                        ${navBtn('‹', value - 1, atMin)}
                    </div>
                    <span class="flex-1 text-center text-lg font-semibold text-gray-700 dark:text-gray-200">${itemName}</span>
                    <div class="flex items-center gap-0.5">
                        ${navBtn('›', value + 1, atMax)}
                        ${navBtn('»', max, atMax)}
                    </div>
                </div>
                <span class="text-sm text-gray-400 dark:text-gray-500 leading-relaxed text-center">${desc}</span>
            </div>
        `;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-assets', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
