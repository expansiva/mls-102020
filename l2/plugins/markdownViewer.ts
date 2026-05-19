/// <mls fileReference="_102020_/l2/plugins/markdownViewer.ts" enhancement="_102027_/l2/enhancementLit.ts"/>

import { html } from 'lit';
import { customElement, property } from 'lit/decorators.js';
import { unsafeHTML } from 'lit/directives/unsafe-html.js';

// ─── Component ───────────────────────────────────────────────────────

@customElement('plugins--markdown-viewer-102020')
export class PluginMarkdownViewer extends StateLitElement {

    @property({ attribute: false }) text: string = '';

    createRenderRoot() { return this; }

    render() {
        if (!this.text?.trim()) return html``;
        return html`
            <div class="text-xs text-gray-500 dark:text-gray-400 leading-relaxed">
                ${unsafeHTML(this._parse(this.text))}
            </div>
        `;
    }

    private _parse(md: string): string {
        let s = md
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        s = s.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
        s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        s = s.replace(/\*(.+?)\*/g, '<em>$1</em>');
        s = s.replace(/`([^`]+)`/g, '<code style="font-family:monospace;background:rgba(128,128,128,0.12);padding:0.1em 0.35em;border-radius:3px">$1</code>');

        s = s.replace(/^### (.+)$/gm, '<div style="font-weight:600;margin-top:0.5em;margin-bottom:0.15em">$1</div>');
        s = s.replace(/^## (.+)$/gm, '<div style="font-weight:700;font-size:1.05em;margin-top:0.6em;margin-bottom:0.15em">$1</div>');
        s = s.replace(/^# (.+)$/gm, '<div style="font-weight:700;font-size:1.15em;margin-top:0.75em;margin-bottom:0.2em">$1</div>');

        s = s.replace(/^[-*] (.+)$/gm, '<div style="padding-left:0.9em">&#8226;&nbsp;$1</div>');

        const paras = s.split(/\n{2,}/);
        s = paras
            .map(p => p.trim())
            .filter(Boolean)
            .map(p => `<p style="margin:0 0 0.4em 0">${p.replace(/\n/g, '<br>')}</p>`)
            .join('');

        return s;
    }
}
