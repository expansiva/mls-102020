/// <mls fileReference="_102020_/l2/pluginFindTask.ts" enhancement="_102027_/l2/enhancementLit"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { getUserId } from "/_102025_/l2/collabMessagesHelper.js";
import { msgGetTaskUpdate } from '/_102025_/l2/shared/api.js';

import * as msg from '/_102025_/l2/shared/interfaces.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';

/// **collab_i18n_start** 
const message_pt = {
    loading: 'Carregando...',
    find: 'Buscar',
}

const message_en = {
    loading: 'Loading...',
    find: 'Search',
}

type MessageType = typeof message_en;
const messages: { [key: string]: MessageType } = {
    'en': message_en,
    'pt': message_pt
}
/// **collab_i18n_end**

@customElement('plugin-find-task-102020')
export class PluginFindTask extends StateLitElement {

    private msg: MessageType = messages['en'];

    @state() threadId?: string;
    @state() taskId?: string;
    @state() error?: string;

    @property() actualTask: msg.TaskData | undefined;
    @property() actualMessage: msg.Message | undefined = undefined;

    @property() isLoading: boolean = false;

    async firstUpdated(changedProperties: Map<PropertyKey, unknown>) {
        super.updated(changedProperties);
    }


    render() {

        const lang = this.getMessageKey(messages);
        this.msg = messages[lang];
        return html`
            ${this.renderSearch()}
        `;
    }

    private renderSearch() {

        return html`
            <div class="section">
                <div>
                    <label class="title">MessageId</label>
                    <input
                        type="text"
                        @input=${(e: MouseEvent) => this.handleThreadChange(e)}
                    /input>
                </div>
                <div>
                    <label class="title">TaskId</label>
                    <input
                        type="text"
                        @input=${(e: MouseEvent) => this.handleTaskChange(e)}
                    /input>
                </div>
                <div>
                <button
                    @click=${this.findThread}
                    ?disabled=${this.isLoading}
                >
                    ${this.isLoading ? html`<span class="loader"></span>` : this.msg.find}
                </button>
                <small class="error">${this.error}</small>
            </div>
            </div>
            

            ${this.actualTask ? html`<small class="error">Task details moved to mls-102025.</small>` : ''}
        
        `
    }

    private handleThreadChange(e: MouseEvent) {
        const target = e.target as HTMLTextAreaElement;
        this.threadId = target.value.trim();
    }

    private handleTaskChange(e: MouseEvent) {
        const target = e.target as HTMLTextAreaElement;
        this.taskId = target.value.trim();
    }

    private async findThread() {
        this.isLoading = true;

        try {
            const user = getUserId();
            if (!this.taskId || !this.threadId || !user) return;

            const result = await msgGetTaskUpdate({
                messageId: this.threadId,
                taskId: this.taskId,
                userId: user
            });

            if (!result.success || !result.response?.task) {
                throw new Error(result.error || 'Failed to fetch task');
            }

            this.actualTask = result.response.task;

        } catch (err: any) {
            const message = err instanceof Error ? err.message : String(err);
            this.actualTask = undefined;
            this.error = message;
        } finally {
            this.isLoading = false;
        }
    }

}
