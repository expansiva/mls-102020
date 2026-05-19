/// <mls fileReference="_102020_/l2/plugins/markdownViewer.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';
import { StateLitElement } from '/_102027_/l2/stateLitElement.js';

// ─── i18n ─────────────────────────────────────────────────────────────
/// **collab_i18n_start**
const message_en = {
    edit: 'Edit',
    cancel: 'Cancel',
    save: 'Save',
};
type MessageType = typeof message_en;
const messages: Record<string, MessageType> = {
    en: message_en,
    pt: { edit: 'Editar', cancel: 'Cancelar', save: 'Salvar' },
    es: { edit: 'Editar', cancel: 'Cancelar', save: 'Guardar' },
};
/// **collab_i18n_end**

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--markdown-viewer-102020')
export class PluginMarkdownViewer extends StateLitElement {

    @property({ attribute: false }) text: string = '';

    @state() private _editing: boolean = false;
    @state() private _editText: string = '';

    private get msg(): MessageType {
        return messages[this.getMessageKey(messages)];
    }

    createRenderRoot() { return this; }

    render() {
        return this._editing ? this._renderEdit() : this._renderView();
    }

    private _renderView() {
        return html`
            <div class="flex items-start gap-2">
                <div class="flex-1 min-w-0 text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                    ${this.text?.trim()
                        ? unsafeHTML(this._parse(this.text))
                        : html`<span class="italic text-gray-400 dark:text-gray-600">—</span>`}
                </div>
                <button
                    class="
                        shrink-0 text-[10px] px-2 py-0.5 rounded
                        border border-gray-200 dark:border-gray-700
                        text-gray-400 dark:text-gray-600
                        hover:text-gray-600 dark:hover:text-gray-400
                        hover:border-gray-300 dark:hover:border-gray-600
                        transition-colors
                    "
                    @click=${() => { this._editText = this.text ?? ''; this._editing = true; }}
                >${this.msg.edit}</button>
            </div>
        `;
    }

    private _renderEdit() {
        return html`
            <textarea
                class="
                    w-full text-xs font-mono leading-relaxed resize-none
                    bg-white dark:bg-gray-900
                    border border-gray-300 dark:border-gray-700 rounded-md
                    px-2.5 py-2
                    text-gray-700 dark:text-gray-300
                    focus:outline-none focus:ring-1 focus:ring-indigo-400 dark:focus:ring-indigo-600
                "
                rows="6"
                .value=${this._editText}
                @input=${(e: Event) => { this._editText = (e.target as HTMLTextAreaElement).value; }}
            ></textarea>
            <div class="flex justify-end gap-2 mt-2">
                <button
                    class="
                        text-xs px-3 py-1 rounded
                        border border-gray-200 dark:border-gray-700
                        text-gray-500 dark:text-gray-400
                        hover:bg-gray-100 dark:hover:bg-gray-800
                        transition-colors
                    "
                    @click=${() => { this._editing = false; }}
                >${this.msg.cancel}</button>
                <button
                    class="
                        text-xs px-3 py-1 rounded
                        bg-indigo-500 dark:bg-indigo-600 text-white
                        hover:bg-indigo-600 dark:hover:bg-indigo-500
                        transition-colors
                    "
                    @click=${() => { this._save(); }}
                >${this.msg.save}</button>
            </div>
        `;
    }

    private _save() {
        this.dispatchEvent(new CustomEvent('md-save', {
            detail: { value: this._editText },
            bubbles: true,
            composed: true,
        }));
        this._editing = false;
    }

    // ─── Markdown parser ─────────────────────────────────────────────

    private _parse(md: string): string {
        const lines = md.split('\n');
        let out = '';
        let inList = false;
        let paraLines: string[] = [];

        const flushPara = () => {
            if (!paraLines.length) return;
            out += `<p style="margin:0 0 0.4em">${paraLines.map(l => this._inline(l)).join('<br>')}</p>`;
            paraLines = [];
        };
        const closeList = () => {
            if (!inList) return;
            out += '</ul>';
            inList = false;
        };

        for (const line of lines) {
            const headerMatch = line.match(/^(#{1,3})\s+(.*)/);
            const listMatch = line.match(/^[-*]\s+(.*)/);

            if (headerMatch) {
                flushPara(); closeList();
                const level = headerMatch[1].length;
                const sizes = ['font-size:1.1em;font-weight:700', 'font-size:1em;font-weight:700', 'font-weight:600'];
                out += `<div style="${sizes[level - 1]};margin:0.6em 0 0.2em">${this._inline(headerMatch[2])}</div>`;
            } else if (listMatch) {
                flushPara();
                if (!inList) { out += '<ul style="margin:0 0 0.4em;padding:0">'; inList = true; }
                out += `<li style="list-style:none;padding-left:0.9em">&#8226;&nbsp;${this._inline(listMatch[1])}</li>`;
            } else if (line.trim() === '') {
                flushPara(); closeList();
            } else {
                paraLines.push(line);
            }
        }

        flushPara(); closeList();
        return out;
    }

    private _inline(s: string): string {
        s = s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
        s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/`([^`]+)`/g, '<code style="font-family:monospace;font-size:0.9em;background:rgba(128,128,128,0.12);padding:0.1em 0.35em;border-radius:3px">$1</code>');
        return s;
    }
}
