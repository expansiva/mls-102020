/// <mls fileReference="_102020_/l2/pageCraft.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html, TemplateResult } from 'lit';
import { customElement, state, query } from 'lit/decorators.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';
import { getMaterializeOrchestrator } from '/_102020_/l2/agents/newModule/materializeOrchestrator.js';
import { addModuleNav, addModuleRoute } from "/_102020_/l2/newModule/astModuleFront.js";
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { createThread, addMessage, getTemporaryContext, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { executeBeforePrompt, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';

// ─── Types ────────────────────────────────────────────────────────────────────

interface MlsFile {
    project: number;
    shortName: string;
    extension: string;
    folder: string;
    getContent: () => Promise<string>;
}

interface PageInfo {
    key: string;
    shortName: string;
    folder: string;
    moduleName: string;
    status: 'draft' | 'generated' | 'unknown';
    pageName: string;
}

interface ModuleGroup {
    moduleName: string;
    folder: string;
    pages: PageInfo[];
}

type DeviceTarget = 'web' | 'mobile' | 'ios' | 'android' | 'pwa' | 'tablet';

declare const mls: {
    actualProject: number;
    stor: {
        files: Record<string, MlsFile>;
    };
};

// ─── Component ───────────────────────────────────────────────────────────────

@customElement('page-craft-102020')
export class PageCraft102020 extends StateLitElement {

    @state() private _loading = true;
    @state() private _modules: ModuleGroup[] = [];
    @state() private _selectedDevice: DeviceTarget = 'web';
    @state() private _selectedPages: Set<string> = new Set();
    @state() private _generating = false;
    @state() private _error: string | null = null;

    @query('#preview') preview: HTMLTextAreaElement | undefined;

    private readonly _devices: { id: DeviceTarget; label: string; icon: string }[] = [
        { id: 'web', label: 'Web', icon: '🌐' },
        { id: 'mobile', label: 'Mobile', icon: '📱' },
        { id: 'ios', label: 'iOS', icon: '🍎' },
        { id: 'android', label: 'Android', icon: '🤖' },
        { id: 'pwa', label: 'PWA', icon: '⚡' },
        { id: 'tablet', label: 'Tablet', icon: '📟' },
    ];

    // ── Lifecycle ─────────────────────────────────────────────────────────────

    override async connectedCallback(): Promise<void> {
        super.connectedCallback();
        await this._scanProject();


    }

    firstUpdated() {
        /*setTimeout(() => {
            let out = addModuleNav(this.ex, { id: 'monitor', label: 'Monitor', href: '/monitor', description: 'Mon' })
            out = addModuleRoute(out, {
                path: '/monitors',
                aliases: [],
                entrypoint: '/_102035_/l2/pizzaria/web/desktop/page13/monitor.js',
                tag: 'pizzaria--web--desktop--page13--monitor-102035',
                title: 'Monitor',
            })

            if (this.preview) this.preview.value = out;

        }, 500)*/
    }

    // ── Render ────────────────────────────────────────────────────────────────

    override render(): TemplateResult {
        if (this._loading) return this._renderLoading();
        if (this._error) return this._renderError();
        if (this._modules.length === 0) return this._renderEmpty();
        return this._renderMain();
    }

    private _renderLoading(): TemplateResult {
        return html`<div class="state-box">Varrendo projeto...</div>`;
    }

    private _renderError(): TemplateResult {
        return html`<div class="state-box error">Erro: ${this._error}</div>`;
    }

    private _renderEmpty(): TemplateResult {
        return html`<div class="state-box">Nenhum <code>module.defs.ts</code> encontrado no projeto atual.</div>`;
    }

    private _renderMain(): TemplateResult {
        const selCount = this._selectedPages.size;

        return html`
            <textarea id="preview" style="border:1px solid; width:100%; display:none"></textarea>
            <div class="pc-root">

                <header class="pc-header">
                    <span class="pc-logo">⚙ PageCraft</span>
                    <button class="pc-refresh" title="Re-escanear projeto" @click=${this._scanProject}>↺</button>
                </header>

                <!-- Device selector -->
                <section class="pc-section">
                    <p class="pc-label">Dispositivo alvo</p>
                    <div class="pc-devices">
                        ${this._devices.map((d) => html`
                            <button
                                class="pc-device-btn ${this._selectedDevice === d.id ? 'active' : ''}"
                                @click=${() => this._selectDevice(d.id)}
                            >${d.icon} ${d.label}</button>
                        `)}
                    </div>
                </section>

                <!-- Modules -->
                ${this._modules.map((mod) => this._renderModule(mod))}

                <!-- Generate bar -->
                <footer class="pc-footer">
                    <span class="pc-sel-summary">
                        ${selCount === 0
                ? 'Nenhuma página selecionada'
                : `${selCount} página${selCount > 1 ? 's' : ''} selecionada${selCount > 1 ? 's' : ''}`}
                    </span>
                    <button
                        class="pc-gen-btn"
                        ?disabled=${selCount === 0 || this._generating}
                        @click=${this._generate}
                    >
                        ${this._generating ? 'Gerando...' : `Gerar para ${this._selectedDevice}`}
                    </button>
                </footer>

            </div>
        `;
    }

    private _renderModule(mod: ModuleGroup): TemplateResult {
        const draft = this._allDraft(mod);
        const generated = this._allGenerated(mod);
        const total = mod.pages.length;
        const pct = total > 0 ? Math.round((generated.length / total) * 100) : 0;

        return html`
            <section class="pc-module">

                <div class="pc-module-head">
                    <span class="pc-module-name">Module: ${mod.moduleName}</span>
                    <span class="pc-pct">${pct}%</span>
                </div>
                <div class="pc-progress-track">
                    <div class="pc-progress-fill" style="width:${pct}%"></div>
                </div>

                <div class="pc-columns">

                    <!-- To generate -->
                    <div class="pc-col">
                        <p class="pc-col-label" style="margin-bottom:.3rem">Para gerar <span class="pc-badge">${draft.length}</span></p>
                        <div class="pc-col-content">
                            ${draft.length === 0
                ? html`<p class="pc-empty">Todas geradas ✓</p>` : draft.map((p) => this._renderDraftItem(p))}
                        </div>
                    </div>

                    <!-- Generated -->
                    <div class="pc-col">
                        <p class="pc-col-label" style="margin-bottom:.3rem">Já geradas <span class="pc-badge done">${generated.length}</span></p>
                        <div class="pc-col-content">
                            ${generated.length === 0
                ? html`<p class="pc-empty">Nenhuma ainda</p>` : generated.map((p) => this._renderDoneItem(p))}
                        </div>
                    </div>

                </div>
            </section>
        `;
    }

    private _renderDraftItem(page: PageInfo): TemplateResult {
        const sel = this._selectedPages.has(page.key);
        return html`
            <div
                class="pc-page-item ${sel ? 'selected' : ''}"
                role="checkbox"
                aria-checked=${sel}
                tabindex="0"
                @click=${() => this._togglePage(page.key)}
                @keydown=${(e: KeyboardEvent) => e.key === 'Enter' && this._togglePage(page.key)}
            >
                <span class="pc-check">${sel ? '◉' : '○'}</span>
                <span class="pc-page-name">${page.pageName}</span>
                <span class="pc-status-badge draft">draft</span>
            </div>
        `;
    }

    private _renderDoneItem(page: PageInfo): TemplateResult {
        return html`
            <div class="pc-page-item done">
                <span class="pc-check done">✓</span>
                <span class="pc-page-name">${page.pageName}</span>
                <span class="pc-status-badge generated">gerado</span>
            </div>
        `;
    }

    // ── Scan logic ────────────────────────────────────────────────────────────

    private async _scanProject(): Promise<void> {
        this._loading = true;
        this._error = null;

        try {
            const files = mls.stor.files;
            const project = mls.actualProject;

            // 1. Find all module.defs.ts in current project
            const moduleKeys = Object.keys(files).filter((key) => {
                const f = files[key];
                return (
                    f.project === project &&
                    f.shortName === 'module' &&
                    f.extension === '.defs.ts'
                );
            });

            if (moduleKeys.length === 0) {
                this._modules = [];
                this._loading = false;
                return;
            }

            // 2. For each module key, resolve pages in same folder
            const groups: ModuleGroup[] = [];

            for (const moduleKey of moduleKeys) {
                const moduleFile = files[moduleKey];
                const moduleName = moduleFile.folder;   // folder name = module name
                const folder = moduleFile.folder;

                // All .defs.ts in the same folder, excluding module.defs itself
                const pageKeys = Object.keys(files).filter((key) => {
                    const f = files[key];
                    return (
                        f.project === project &&
                        f.folder === folder &&
                        f.extension === '.defs.ts' &&
                        f.shortName !== 'module'
                    );
                });

                // 3. Read each page file and determine status
                const pages: PageInfo[] = await Promise.all(
                    pageKeys.map(async (key): Promise<PageInfo> => {
                        const f = files[key];
                        let status: PageInfo['status'] = 'unknown';
                        let pageName = f.shortName.replace(/\.defs$/, '');

                        try {
                            const raw = await f.getContent();
                            const parsed = this._parseDefinition(raw);
                            console.info(parsed)
                            if (parsed) {
                                status = parsed.status === 'draft' ? 'draft' : 'generated';
                                // prefer pageName from definition if available
                                const firstName = parsed.pages?.[0]?.pageName;
                                if (firstName) pageName = firstName;
                            } else {
                                status = 'generated';
                                // prefer pageName from definition if available
                                const firstName = f.shortName;
                                if (firstName) pageName = firstName;
                            }
                        } catch {
                            status = 'unknown';
                        }

                        return { key, shortName: f.shortName, folder, moduleName, status, pageName };
                    })
                );

                groups.push({ moduleName, folder, pages });
            }

            this._modules = groups;
        } catch (err) {
            this._error = err instanceof Error ? err.message : String(err);
        } finally {
            this._loading = false;
        }
    }

    /**
     * Safely extract `status` and `pages` from a raw TS/JS file that uses
     * `export const definition = { ... }`.
     * Strategy: pull out the object literal and JSON.parse a cleaned version.
     */
    private _parseDefinition(raw: string): { status: string; pages?: { pageName?: string }[] } | null {
        try {
            // Extract the object between the first `{` after `definition =` and its matching `}`
            const start = raw.indexOf('{');
            if (start === -1) return null;

            // Find matching closing brace
            let depth = 0;
            let end = -1;
            for (let i = start; i < raw.length; i++) {
                if (raw[i] === '{') depth++;
                else if (raw[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
            }
            if (end === -1) return null;

            let json = raw.slice(start, end + 1);

            // Convert JS object to JSON: remove trailing commas, quote unquoted keys
            json = json
                .replace(/\/\/[^\n]*/g, '')                     // strip line comments
                .replace(/\/\*[\s\S]*?\*\//g, '')               // strip block comments
                .replace(/,(\s*[}\]])/g, '$1')                  // trailing commas
                .replace(/([{,]\s*)([a-zA-Z_$][a-zA-Z0-9_$]*)(\s*):/g, '$1"$2"$3:'); // quote keys

            return JSON.parse(json);
        } catch {
            return null;
        }
    }

    // ── Interaction ───────────────────────────────────────────────────────────

    private _selectDevice(device: DeviceTarget): void {
        this._selectedDevice = device;
        this._selectedPages = new Set();
    }

    private _togglePage(key: string): void {
        const next = new Set(this._selectedPages);
        if (next.has(key)) next.delete(key);
        else next.add(key);
        this._selectedPages = next;
    }

    private async _generate(): Promise<void> {
        if (this._selectedPages.size === 0 || this._generating) return;
        this._generating = true;

        await this.executeAgent();

        /*await new Promise((r) => setTimeout(r, 600)); // placeholder
        this._generating = false;
        await this._scanProject(); // re-scan to pick up new status*/
    }

    private async executeAgent() {


        let pageName = '_102020_/l2/pageCraft.ts';
        let thread = await getThreadByName(pageName);
        if (!thread) {
            thread = await createThread(pageName, [], 'company');
        }

        const userId = getUserId();
        if (!userId) return;

        const threadId = thread?.threadId;
        if (!threadId || !thread) return;

        const moduleAgent = await loadAgent('agentToBePage');

        const messageForAgent = `{"page":"{{page}}", "moduleName":"{{module}}", "device":"web", "type":"page11"}`

        for (let key of this._selectedPages.values()) {
            const md = this._modules.find((m) => m.pages.find((p) => p.key === key));
            if (!md) continue;
            const page = (mls.stor as any).convertFileToFileReference(mls.stor.files[key]); 
            const msg = messageForAgent.replace('{{page}}', page).replace('{{module}}', md.moduleName);
            if (!moduleAgent) throw new Error('Invalid agent');
            const context = getTemporaryContext(threadId, userId, msg);
            executeBeforePrompt(moduleAgent, context);
        }

        setTimeout(() => {
            if (!thread) return;
            window.mls.events.fire([2], ['collabMessages'] as any, JSON.stringify({ type: 'thread-open', threadId: thread.threadId, taskId: '' }))
        }, 500);


    }

    private _allDraft(module: ModuleGroup): PageInfo[] {
        return module.pages.filter((p) => p.status === 'draft' || p.status === 'unknown');
    }

    private _allGenerated(module: ModuleGroup): PageInfo[] {
        return module.pages.filter((p) => p.status === 'generated');
    }

    private async getSkill(info: { path: string, item: mls.defs.MaterializeEntry, project?: number }): Promise<string> {

        const orch = getMaterializeOrchestrator(info.path);
        const user = await orch.getVar(info.path, info.item.specVar);
        const skill = await orch.getSkill(info.item.skillPath);
        const prompt = `##Skill\n${skill}\n\n##User data\n${user}\n\n##User info\n${JSON.stringify(info)}`;

        return prompt;
    }


    private ex = `/// <mls fileReference="_102035_/l2/pizzaria/module.ts" enhancement="_blank" />
import type { AuraModuleFrontendDefinition } from '/_102029_/l2/contracts/bootstrap.js';

export const moduleGenome = {
  page11: {
    device: 'desktop',
    layout: 'standard',
  },
  page21: {
    device: 'mobile',
    layout: 'standard',
  },
} as const;

export const moduleStates = {
  currentSection: 'ui.pizzaria.currentSection',
  selectedCategory: 'ui.pizzaria.selectedCategory',
  searchQuery: 'ui.pizzaria.searchQuery',
  editorAuthor: 'ui.pizzaria.editorAuthor',
} as const;

export const moduleShellPreferences = {
  layout: {
    asideMode: {
      desktop: 'inline',
      mobile: 'fullscreen',
    },
  },
} as const;

export const moduleFrontendDefinition: AuraModuleFrontendDefinition = {
  pageTitle: 'pizzaria',
  device: 'desktop',
  navigation: [
    {
      id: 'monitor',
      label: 'Monitor',
      href: '/monitor',
      description: 'Mon',
    },
  ],
  routes: [
    {
      path: '/monitor',
      aliases: [],
      entrypoint: '/_102035_/l2/pizzaria/web/desktop/page13/monitor.js',
      tag: 'pizzaria--web--desktop--page13--monitor-102035',
      title: 'Monitor',
    },
  ],
};
`

}