/// <mls fileReference="_102020_/l2/aura/plugins/pageVisualEdit.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

// Confirm-before-apply panel for agentManagePage2 (TASK-102020-agent-manage-page-2).
//
// Two phases, the contract the Studio already speaks: PLAN runs only the scope gate and shows the
// interpreted operations; APPLY sends them back pre-approved, which patches the page `.ts` and records
// the intent in the defs. Both answers ride the step `traceMsg` channel — `PLAN:<json>` from the gate,
// `NOTES:<line>` from the patch, `CHANGES:<summary>` from the recorder.
//
// It also shows the page's CURRENT `userChanges`: without it, a request that supersedes an earlier one
// looks like the older request was silently lost.

import { html, nothing } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { executeBeforePromptStream, loadAgent } from '/_102027_/l2/aiAgentOrchestration.js';
import { createThread, getUserId } from '/_102025_/l2/collabMessagesHelper.js';
import { getThreadByName } from '/_102025_/l2/collabMessagesIndexedDB.js';
import { getTemporaryContext } from '/_102027_/l2/aiAgentHelper.js';
import { openElementInServiceDetails } from '/_102027_/l2/libCommom.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';
import { getState, setState } from '/_102029_/l2/collabState.js';
import { setTask, getTask, subscribeTaskManager } from '/_102020_/l2/aura/helpers/taskManager.js';
import { pageRef } from '/_102020_/l2/aura/helpers/dsMatch/derivePaths.js';
import { parseUserChanges, type UserChange } from '/_102020_/l2/aura/agentManagePage2/userChangesCore.js';
import type { EditOperation2 } from '/_102020_/l2/aura/agentManagePage2/patchCore.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    title: 'Edit this screen',
    placeholder: 'Describe the visual change (e.g. align the action buttons to the left)',
    review: 'Review change',
    planning: 'Analyzing…',
    applying: 'Applying…',
    done: 'Change applied',
    planTitle: 'Confirm the change',
    apply: 'Apply',
    cancel: 'Cancel',
    whatChanged: 'What changed',
    noPlan: 'No actionable visual change was produced from the request.',
    current: 'Active adjustments on this screen',
    currentEmpty: 'No visual adjustment recorded yet.',
    followTask: 'Follow task',
    scope: 'in',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: {
        title: 'Editar esta tela',
        placeholder: 'Descreva a mudança visual (ex.: alinhar os botões de ação à esquerda)',
        review: 'Revisar mudança',
        planning: 'Analisando…',
        applying: 'Aplicando…',
        done: 'Mudança aplicada',
        planTitle: 'Confirme a mudança',
        apply: 'Aplicar',
        cancel: 'Cancelar',
        whatChanged: 'O que mudou',
        noPlan: 'Nenhuma mudança visual aplicável foi extraída do pedido.',
        current: 'Ajustes ativos nesta tela',
        currentEmpty: 'Nenhum ajuste visual registrado ainda.',
        followTask: 'Acompanhar task',
        scope: 'em',
    },
};
/// **collab_i18n_end**

interface EditPlan {
    operations: EditOperation2[];
    request: string;
}

interface TaskInfo {
    taskId: string;
    task?: mls.msg.TaskData;
    message?: mls.msg.Message;
}

const KIND_STYLES: Record<string, string> = {
    layout: 'bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400',
    style: 'bg-sky-100 dark:bg-sky-900/30 text-sky-600 dark:text-sky-400',
    text: 'bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400',
    visibility: 'bg-rose-100 dark:bg-rose-900/30 text-rose-600 dark:text-rose-400',
};

@customElement('aura--plugins--page-visual-edit-102020')
export class PluginPageVisualEdit extends StateLitElement {

    /** Module path as the agents expect it (e.g. 'buildFlowFsm'). */
    @property({ type: String }) module = '';
    /** Page shortName (the file, not the pageId). */
    @property({ type: String }) page = '';
    @property({ type: Number }) layout = 1;
    @property({ type: Number }) ds = 1;
    /** Segment after web/ (e.g. 'desktop'). */
    @property({ type: String }) device = 'desktop';

    @state() private _draft = '';
    @state() private _plan: EditPlan | null = null;
    @state() private _planning = false;
    @state() private _error = '';
    @state() private _notes = '';
    @state() private _userChanges: UserChange[] = [];

    private _taskInfo: TaskInfo | null = null;
    private _threadCache = new Map<string, Promise<mls.msg.Thread | undefined>>();
    private _unsubTasks?: () => void;

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)] ?? message_en;
    }

    private get taskKey(): string {
        return `edit2:${this.module}/${this.page}`;
    }

    connectedCallback(): void {
        super.connectedCallback();
        this._unsubTasks = subscribeTaskManager(() => this.requestUpdate());
        void this._loadUserChanges();
    }

    disconnectedCallback(): void {
        this._unsubTasks?.();
        super.disconnectedCallback();
    }

    updated(changed: Map<string, unknown>): void {
        if (changed.has('page') || changed.has('module') || changed.has('layout') || changed.has('ds') || changed.has('device')) {
            this._plan = null;
            this._error = '';
            this._notes = '';
            void this._loadUserChanges();
        }
    }

    /** The active adjustment set, read from the page defs (the single record of user intent). */
    private async _loadUserChanges(): Promise<void> {
        this._userChanges = [];
        if (!this.module || !this.page) return;
        const ref = pageRef(mls.actualProject || 0, this.module, this.layout, this.ds, this.page, '.defs.ts', this.device);
        const src = await getContentByMlsPath(ref);
        if (src) this._userChanges = parseUserChanges(src);
    }

    render() {
        if (!this.module || !this.page) return nothing;
        return html`
            <div class="flex flex-col gap-2">
                ${this._plan ? this._renderConfirm() : this._renderInput()}
                ${this._renderCurrent()}
            </div>
        `;
    }

    // ─── phase A: describe + plan ─────────────────────────────────────

    private _renderInput() {
        const msg = this.msg;
        const task = getTask(this.taskKey);
        const running = task?.status === 'running';
        const busy = running || this._planning;
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/40 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-gray-600 dark:text-gray-300">${msg.title}</span>
                <textarea
                    rows="2"
                    class="w-full text-xs px-2 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600 resize-y"
                    placeholder=${msg.placeholder}
                    .value=${this._draft}
                    @input=${(e: Event) => { this._draft = (e.target as HTMLTextAreaElement).value; }}
                ></textarea>
                <button
                    class="self-start text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors cursor-pointer"
                    ?disabled=${busy || !this._draft.trim()}
                    @click=${() => this._onPlan()}
                >${this._planning ? msg.planning : running ? msg.applying : msg.review}</button>
                ${running || task?.status === 'done' ? html`
                    <div class="flex items-center gap-2 text-xs">
                        ${running ? html`<span class="text-indigo-500 dark:text-indigo-400 italic">${msg.applying}</span>` : nothing}
                        ${task?.status === 'done' ? html`<span class="text-emerald-600 dark:text-emerald-400">✓ ${msg.done}</span>` : nothing}
                        ${this._taskInfo?.task ? html`
                            <button class="ml-auto text-indigo-500 dark:text-indigo-400 hover:underline cursor-pointer whitespace-nowrap"
                                @click=${() => this._openTask()}>${msg.followTask}</button>
                        ` : nothing}
                    </div>
                ` : nothing}
                ${this._notes ? html`
                    <div class="text-xs text-emerald-700 dark:text-emerald-300 rounded bg-emerald-50 dark:bg-emerald-900/20 px-2 py-1.5">
                        <span class="font-semibold">${msg.whatChanged}:</span> ${this._notes}
                    </div>
                ` : nothing}
                ${this._error ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${this._error}</div>
                ` : nothing}
                ${task?.status === 'error' && task.message ? html`
                    <div class="text-xs text-red-600 dark:text-red-400 whitespace-pre-wrap wrap-break-word rounded bg-red-50 dark:bg-red-900/20 px-2 py-1.5">${task.message}</div>
                ` : nothing}
            </div>
        `;
    }

    // ─── phase B: confirm ─────────────────────────────────────────────

    private _renderConfirm() {
        const msg = this.msg;
        const plan = this._plan!;
        return html`
            <div class="rounded-lg border border-indigo-200 dark:border-indigo-800/40 bg-indigo-50 dark:bg-indigo-900/10 px-3 py-2.5 flex flex-col gap-2">
                <span class="text-xs font-semibold text-indigo-700 dark:text-indigo-300">${msg.planTitle}</span>
                <div class="flex flex-col gap-1">
                    ${plan.operations.map(op => html`
                        <div class="flex items-baseline gap-1.5 text-xs text-gray-700 dark:text-gray-200">
                            <span class="text-[10px] font-medium px-1.5 py-0.5 rounded-full shrink-0 ${KIND_STYLES[op.kind] ?? KIND_STYLES.layout}">${op.kind}</span>
                            <span class="leading-snug">${op.description}</span>
                            <span class="ml-auto font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">${msg.scope} ${op.scope}</span>
                        </div>
                    `)}
                </div>
                <div class="flex items-center gap-2">
                    <button
                        class="text-sm px-3 py-1.5 rounded-md bg-indigo-500 dark:bg-indigo-600 text-white hover:bg-indigo-600 dark:hover:bg-indigo-500 transition-colors cursor-pointer"
                        @click=${() => this._onApply()}
                    >${msg.apply}</button>
                    <button
                        class="text-sm px-3 py-1.5 rounded-md border border-gray-300 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:border-gray-400 dark:hover:border-gray-600 transition-colors cursor-pointer"
                        @click=${() => { this._plan = null; }}
                    >${msg.cancel}</button>
                </div>
            </div>
        `;
    }

    // ─── the active adjustment set ────────────────────────────────────

    private _renderCurrent() {
        const msg = this.msg;
        return html`
            <div class="rounded-lg border border-gray-200 dark:border-gray-800 px-3 py-2 flex flex-col gap-1">
                <span class="text-[11px] font-semibold text-gray-500 dark:text-gray-400">${msg.current}</span>
                ${this._userChanges.length ? this._userChanges.map(change => html`
                    <div class="flex items-baseline gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                        <span class="font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0">${change.intent}</span>
                        <span class="leading-snug">${change.change}</span>
                        <span class="ml-auto font-mono text-[10px] text-gray-400 dark:text-gray-500 shrink-0 whitespace-nowrap">${msg.scope} ${change.scope}</span>
                    </div>
                `) : html`<span class="text-xs text-gray-400 dark:text-gray-500 italic">${msg.currentEmpty}</span>`}
            </div>
        `;
    }

    // ─── actions ──────────────────────────────────────────────────────

    private async _onPlan(): Promise<void> {
        const request = this._draft.trim();
        if (!request || this._planning || getTask(this.taskKey)?.status === 'running') return;
        this._error = '';
        this._notes = '';
        this._planning = true;
        try {
            const res = await this._executeAgent(JSON.stringify({ ...this._coords(), request, planOnly: true }));
            if (res.failure) this._error = res.failure;
            else if (res.plan?.length) this._plan = { operations: res.plan as EditOperation2[], request };
            else this._error = this.msg.noPlan;
        } catch (e: any) {
            this._error = e?.message ?? 'error';
        } finally {
            this._planning = false;
        }
    }

    private async _onApply(): Promise<void> {
        const plan = this._plan;
        if (!plan || getTask(this.taskKey)?.status === 'running') return;

        // The preview repaints on the .ts write; pause it while the patch is in flight.
        const prevPause = getState('preview.pausePreview');
        setState('preview.pausePreview', true);
        setTask(this.taskKey, { status: 'running', startedAt: Date.now() });
        this._plan = null;
        try {
            const res = await this._executeAgent(JSON.stringify({ ...this._coords(), request: plan.request, operations: plan.operations }));
            if (res.failure) {
                setTask(this.taskKey, { ...getTask(this.taskKey)!, status: 'error', message: res.failure });
                return;
            }
            setTask(this.taskKey, { ...getTask(this.taskKey)!, status: 'done' });
            if (res.notes) this._notes = res.notes;
            this._draft = '';
        } catch (e: any) {
            setTask(this.taskKey, { ...getTask(this.taskKey)!, status: 'error', message: e?.message });
        } finally {
            setState('preview.pausePreview', prevPause ?? false);
            await this._loadUserChanges();
        }
    }

    private _coords() {
        return { module: this.module, page: this.page, layout: this.layout, ds: this.ds, device: this.device };
    }

    private async _openTask(): Promise<void> {
        const info = this._taskInfo;
        if (!info?.task) return;
        await import('/_102025_/l2/collabMessagesTaskInfo.js');
        const el = document.createElement('collab-messages-task-info-102025');
        el.setAttribute('messageId', info.message?.createAt ?? '');
        if (info.task.PK) el.setAttribute('taskId', info.task.PK);
        (el as any)['task'] = info.task;
        (el as any)['message'] = info.message;
        openElementInServiceDetails(el);
    }

    /**
     * Drive the whole agent flow and pick the answers out of the intent stream: a failed step's
     * `traceMsg` (the gate's rejection reason, or the patch's revert message), the gate's
     * `PLAN:<json>`, and the patch's `NOTES:<line>`.
     */
    private async _executeAgent(prompt: string): Promise<{ failure?: string; plan?: unknown[]; notes?: string }> {
        const fullName = '_102020_/l2/serviceGenome';
        let threadPromise = this._threadCache.get(fullName);
        if (!threadPromise) {
            threadPromise = (async () => {
                let thread = await getThreadByName(fullName);
                if (!thread) thread = await createThread(fullName, [], 'company');
                return thread;
            })();
            this._threadCache.set(fullName, threadPromise);
        }
        const thread = await threadPromise;
        const userId = getUserId();
        const threadId = thread?.threadId;
        if (!userId || !threadId) return {};

        const moduleAgent = await loadAgent('agentManagePage2');
        if (!moduleAgent) throw new Error('agentManagePage2 not found');
        const context = getTemporaryContext(threadId, userId, prompt);

        let failure: string | undefined;
        let plan: unknown[] | undefined;
        let notes: string | undefined;
        for await (const event of executeBeforePromptStream(moduleAgent, context)) {
            if (event.type === 'task-created') {
                this._taskInfo = { taskId: event.taskId, task: event.task, message: event.message };
                this.requestUpdate();
            } else if (event.type === 'hook-done') {
                for (const intent of event.intents ?? []) {
                    const i = intent as any;
                    if (i?.type !== 'update-status') continue;
                    if (i.status === 'failed' && i.traceMsg) failure = String(i.traceMsg);
                    else if (i.status === 'completed' && typeof i.traceMsg === 'string') {
                        if (i.traceMsg.startsWith('PLAN:')) { try { plan = JSON.parse(i.traceMsg.slice(5)); } catch { /* ignore */ } }
                        else if (i.traceMsg.startsWith('NOTES:')) notes = i.traceMsg.slice(6);
                    }
                }
            } else if (event.type === 'error') {
                failure = String(event.error);
            }
        }
        return { failure, plan, notes };
    }
}
