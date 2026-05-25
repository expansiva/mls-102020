/// <mls fileReference="_102020_/l2/plugins/selectLayout.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, nothing } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import '/_102020_/l2/plugins/navHeader.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Layout',
    allTitle: 'All Layouts',
    desc: 'The layout defines the structural arrangement of UI elements on the page.',
    standard: 'Standard',
    standardDesc: 'Classic top-header with full-width content area.',
    compact: 'Compact',
    compactDesc: 'Condensed layout optimized for dense information display.',
    tabs: 'Tabs',
    tabsDesc: 'Tab-based navigation separating content into distinct sections.',
    sidebar: 'Sidebar',
    sidebarDesc: 'Persistent side navigation alongside a main content area.',
    notCreated: 'Layout not yet created for page',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Layout',
        allTitle: 'Todos os Layouts',
        desc: 'O layout define o arranjo estrutural dos elementos na página.',
        standard: 'Padrão',
        standardDesc: 'Cabeçalho superior com área de conteúdo em largura total.',
        compact: 'Compacto',
        compactDesc: 'Layout condensado otimizado para exibição densa de informações.',
        tabs: 'Abas',
        tabsDesc: 'Navegação por abas que separa o conteúdo em seções distintas.',
        sidebar: 'Barra Lateral',
        sidebarDesc: 'Navegação lateral persistente ao lado de uma área de conteúdo principal.',
        notCreated: 'Layout ainda não criado para a página',
    },
    es: {
        title: 'Layout',
        allTitle: 'Todos los Layouts',
        desc: 'El layout define la disposición estructural de los elementos en la página.',
        standard: 'Estándar',
        standardDesc: 'Cabecera superior con área de contenido de ancho completo.',
        compact: 'Compacto',
        compactDesc: 'Layout condensado optimizado para mostrar información densa.',
        tabs: 'Pestañas',
        tabsDesc: 'Navegación por pestañas que separa el contenido en secciones distintas.',
        sidebar: 'Barra Lateral',
        sidebarDesc: 'Navegación lateral persistente junto a un área de contenido principal.',
        notCreated: 'Layout aún no creado para la página',
    },
};
/// **collab_i18n_end**

// ─── Types ───────────────────────────────────────────────────────────

interface ILayoutOption {
    value: number;
    key: 'standard' | 'compact' | 'tabs' | 'sidebar';
}

const LAYOUT_OPTIONS: ILayoutOption[] = [
    { value: 1, key: 'standard' },
    { value: 2, key: 'compact' },
    { value: 3, key: 'tabs' },
    { value: 4, key: 'sidebar' },
];

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--select-layout-102020')
export class PluginSelectLayout extends StateLitElement {

    @property({ attribute: false }) value: number | null = 0;
    @property({ attribute: false }) pageFile: mls.stor.IFileInfo | null = null;

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    // Returns null when pageFile is unknown (no validation possible),
    // or a Set<number> of layout numbers (1-4) that exist for the current page.
    // First digit of pageXX folder name encodes the layout: page1X=standard, page2X=compact, etc.
    private _computeAvailableLayouts(): Set<number> | null {
        if (!this.pageFile) return null;
        const { project, folder, shortName } = this.pageFile;
        const pageMatch = folder.match(/^(.+)\/page\d+$/);
        if (!pageMatch) return null;
        const prefix = pageMatch[1];
        const available = new Set<number>();
        // @ts-ignore
        for (const f of Object.values(mls.stor.files as Record<string, mls.stor.IFileInfo>)) {
            if (f.project !== project || f.shortName !== shortName) continue;
            const m = (f.folder ?? '').match(/^(.+)\/page(\d+)$/);
            if (!m || m[1] !== prefix) continue;
            const layoutNum = parseInt(m[2][0]);
            if (layoutNum >= 1 && layoutNum <= 4) available.add(layoutNum);
        }
        return available;
    }

    createRenderRoot() { return this; }

    render() {
        const max = LAYOUT_OPTIONS.length;
        const available = this._computeAvailableLayouts();
        const isAll = this.value === 0 || this.value === null;
        const selectedOption = LAYOUT_OPTIONS.find(o => o.value === this.value);

        if (isAll) {
            return html`
                <div class="flex flex-col gap-3">
                    <plugins--nav-header-102020
                        .fixedLabel=${this.msg.title}
                        .itemName=${this.msg.allTitle}
                        .desc=${this.msg.desc}
                        .value=${0}
                        .min=${0}
                        .max=${max}
                        @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                    ></plugins--nav-header-102020>

                    <div class="grid grid-cols-2 gap-2">
                        ${LAYOUT_OPTIONS.map(opt => this._renderLayoutCard(opt, false, available))}
                    </div>
                </div>
            `;
        }

        if (!selectedOption) return nothing;
        const hasLayout = available === null || available.has(selectedOption.value);
        return html`
            <div class="flex flex-col gap-3">
                <plugins--nav-header-102020
                    .fixedLabel=${this.msg.title}
                    .itemName=${this.msg[selectedOption.key]}
                    .desc=${this.msg.desc}
                    .value=${this.value ?? 1}
                    .min=${0}
                    .max=${max}
                    @nav-change=${(e: CustomEvent) => this._dispatchSelect(e.detail.value)}
                ></plugins--nav-header-102020>

                ${hasLayout
                    ? this._renderLayoutCard(selectedOption, true, available)
                    : this._renderNotCreatedBanner()}
            </div>
        `;
    }

    private _renderLayoutCard(opt: ILayoutOption, isSelected: boolean, available: Set<number> | null) {
        const hasLayout = available === null || available.has(opt.value);
        const label = this.msg[opt.key];
        const desc = this.msg[`${opt.key}Desc` as keyof MessageType];
        const pageName = this.pageFile?.shortName ?? '';

        return html`
            <div
                class="
                    rounded-xl border p-2.5 transition-all flex flex-col gap-2
                    ${isSelected
                        ? 'border-indigo-400 dark:border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 shadow-sm cursor-pointer'
                        : hasLayout
                            ? 'border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 hover:border-gray-300 dark:hover:border-gray-700 cursor-pointer'
                            : 'border-gray-100 dark:border-gray-800/50 bg-gray-50 dark:bg-gray-900/50 cursor-default'}
                "
                @click=${() => hasLayout ? this._dispatchSelect(opt.value) : undefined}
            >
                <div class="w-full aspect-[4/3] rounded-lg overflow-hidden ${hasLayout ? '' : 'opacity-40'}
                    ${isSelected ? 'bg-indigo-100 dark:bg-indigo-900/30' : 'bg-gray-100 dark:bg-gray-800'}
                ">
                    ${this._renderDiagram(opt.key, isSelected)}
                </div>
                <div class="flex flex-col gap-0.5">
                    <div class="flex items-center gap-1.5">
                        ${isSelected ? html`<div class="w-1.5 h-1.5 rounded-full bg-indigo-500 dark:bg-indigo-400 shrink-0"></div>` : nothing}
                        <span class="text-xs font-semibold ${hasLayout ? '' : 'opacity-50'}
                            ${isSelected ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}
                        ">${label}</span>
                    </div>
                    ${hasLayout
                        ? html`<span class="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">${desc}</span>`
                        : html`<span class="text-[10px] text-amber-500 dark:text-amber-400 leading-snug italic">${this.msg.notCreated} ${pageName}</span>`
                    }
                </div>
            </div>
        `;
    }

    private _renderNotCreatedBanner() {
        const pageName = this.pageFile?.shortName ?? '';
        return html`
            <div class="rounded-lg border border-amber-200 dark:border-amber-800/40 bg-amber-50 dark:bg-amber-900/10 px-3 py-2.5">
                <span class="text-sm text-amber-600 dark:text-amber-400">${this.msg.notCreated} ${pageName}</span>
            </div>
        `;
    }

    private _renderDiagram(key: ILayoutOption['key'], selected: boolean) {
        const header = selected ? '#818cf8' : '#9ca3af';
        const content = selected ? '#c7d2fe' : '#e5e7eb';
        const sidebar = selected ? '#a5b4fc' : '#d1d5db';
        const darkHeader = selected ? '#4f46e5' : '#4b5563';
        const darkContent = selected ? '#3730a3' : '#374151';
        const darkSidebar = selected ? '#4338ca' : '#374151';

        if (key === 'standard') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="72" height="12" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="72" height="12" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="4" y="20" width="72" height="36" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="20" width="72" height="36" rx="2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        if (key === 'compact') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="72" height="8" rx="2" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="72" height="8" rx="2" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="4" y="15" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="15" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="24" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="24" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="33" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="33" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="42" width="72" height="6" rx="1" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="42" width="72" height="6" rx="1" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        if (key === 'tabs') return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="16" height="10" rx="2 2 0 0" fill="${header}" class="dark:hidden"/>
                <rect x="4" y="4" width="16" height="10" rx="2 2 0 0" fill="${darkHeader}" class="hidden dark:block"/>
                <rect x="22" y="4" width="16" height="10" rx="2 2 0 0" fill="${content}" class="dark:hidden"/>
                <rect x="22" y="4" width="16" height="10" rx="2 2 0 0" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="40" y="4" width="16" height="10" rx="2 2 0 0" fill="${content}" class="dark:hidden"/>
                <rect x="40" y="4" width="16" height="10" rx="2 2 0 0" fill="${darkContent}" class="hidden dark:block"/>
                <rect x="4" y="14" width="72" height="42" rx="0 2 2 2" fill="${content}" class="dark:hidden"/>
                <rect x="4" y="14" width="72" height="42" rx="0 2 2 2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;

        return html`
            <svg viewBox="0 0 80 60" xmlns="http://www.w3.org/2000/svg" class="w-full h-full">
                <rect x="4" y="4" width="18" height="52" rx="2" fill="${sidebar}" class="dark:hidden"/>
                <rect x="4" y="4" width="18" height="52" rx="2" fill="${darkSidebar}" class="hidden dark:block"/>
                <rect x="26" y="4" width="50" height="52" rx="2" fill="${content}" class="dark:hidden"/>
                <rect x="26" y="4" width="50" height="52" rx="2" fill="${darkContent}" class="hidden dark:block"/>
            </svg>`;
    }

    private _dispatchSelect(value: number) {
        this.dispatchEvent(new CustomEvent('select-layout', {
            detail: { value },
            bubbles: true,
            composed: true,
        }));
    }
}
