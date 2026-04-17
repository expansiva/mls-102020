/// <mls fileReference="_102020_/l2/widgetPlaygroundStatePreviewCode.ts" enhancement="_102020_/l2/enhancementAura"/>

// =============================================================================
// PLAYGROUND STATE PREVIEW CODE WIDGET
// =============================================================================
// Editable code viewer with syntax highlighting using highlight.js

import { html, TemplateResult } from 'lit';
import { customElement, property, state, query } from 'lit/decorators.js';
import { MoleculeAuraElement } from '/_102020_/l2/moleculeBase.js';
import { initState, setState } from '/_102027_/l2/collabState.js';

declare const hljs: any;

@customElement('widget-playground-state-preview-code-102020')
export class PlaygroundStatePreviewCode extends MoleculeAuraElement {


  // ===========================================================================
  // PROPERTIES
  // ===========================================================================

  @property({ type: String })
  target: string = '';

  @property({ type: String })
  language: string = 'html';

  // ===========================================================================
  // INTERNAL STATE
  // ===========================================================================

  @state()
  private code: string = '';

  @state()
  private targetElement: Element | null = null;

  @state()
  private hljsLoaded: boolean = false;

  @query('.code-editor')
  private codeEditor: HTMLElement | undefined;

  // ===========================================================================
  // LIFECYCLE
  // ===========================================================================

  async firstUpdated() {
    await this.updateComplete;
    this.loadHljs();
    this.initContent();
  }

  // ===========================================================================
  // METHODS
  // ===========================================================================

  private loadHljs() {
    if ((window as any).hljsLoaded) {
      this.hljsLoaded = true;
      this.highlightCode();
      return;
    }

    // Load CSS
    if (!document.getElementById('hljs-css')) {
      const link = document.createElement('link');
      link.id = 'hljs-css';
      link.rel = 'stylesheet';
      link.href = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/vs2015.min.css';
      document.head.appendChild(link);
    }

    // Load JS
    const script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js';
    script.onload = () => {
      (window as any).hljsLoaded = true;
      this.hljsLoaded = true;
      this.highlightCode();
    };
    document.head.appendChild(script);
  }

  private getSourceCode(): string {
    const template = this.querySelector('template');
    return template ? this.formatHtml(template.innerHTML) : '';
  }

  private initContent() {
    this.targetElement = document.getElementById(this.target);
    this.code = this.getSourceCode();

    // Não injeta nada - demo já tem o HTML
    // Apenas prepara o código para exibir no editor
    if (this.hljsLoaded) {
      this.highlightCode();
    }
  }

  private formatHtml(html: string): string {
    let code = html.trim();

    // Normalize whitespace
    code = code.replace(/\s+/g, ' ');

    // Split attributes onto separate lines
    code = code.replace(/<(\w[\w-]*)((?:\s+[\w-]+(?:="[^"]*")?)+)\s*>/g, (match, tagName, attrs) => {
      const attrList = attrs.trim().match(/[\w-]+(?:="[^"]*")?/g) || [];
      if (attrList.length <= 1) {
        return match;
      }
      const indentedAttrs = attrList.map((attr: string) => '  ' + attr).join('\n');
      return '<' + tagName + '\n' + indentedAttrs + '>';
    });

    // Put each tag on its own line
    code = code.replace(/>\s*</g, '>\n<');

    // Indent based on nesting
    const lines = code.split('\n');
    const formatted: string[] = [];
    let indent = 0;

    const voidElements = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'];

    for (let line of lines) {
      line = line.trim();
      if (!line) continue;

      const isClosingTag = /^<\//.test(line);
      const isAttribute = /^[\w-]+(?:="[^"]*")?$/.test(line) && !line.startsWith('<');

      if (isClosingTag) {
        indent = Math.max(0, indent - 1);
      }

      if (isAttribute) {
        formatted.push('  '.repeat(indent) + '  ' + line);
      } else {
        formatted.push('  '.repeat(indent) + line);
      }

      if (!isClosingTag && !isAttribute) {
        const openingTagMatch = line.match(/^<(\w[\w-]*)/);
        if (openingTagMatch) {
          const tagName = openingTagMatch[1].toLowerCase();
          const isSelfClosing = line.endsWith('/>');
          const hasClosingTag = new RegExp('</' + tagName + '>$', 'i').test(line);
          const isVoid = voidElements.includes(tagName);

          if (!isSelfClosing && !hasClosingTag && !isVoid && line.endsWith('>')) {
            indent++;
          }
        }
      }
    }

    return formatted.join('\n');
  }

  private highlightCode() {
    if (!this.codeEditor || !this.hljsLoaded) return;

    const text = this.code;
    hljs.configure({ ignoreUnescapedHTML: true });
    const result = hljs.highlight(text, { language: this.language });
    this.codeEditor.innerHTML = result.value;
  }

  @state()
  private debounceTimer: number | null = null;

  private handleInput(e: Event) {
    const target = e.target as HTMLElement;
    const text = target.innerText || '';
    this.code = text;

    // Re-highlight with cursor preservation
    this.saveSelection();
    this.highlightCode();
    this.restoreSelection();

    // Debounce a atualização do demo
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    this.debounceTimer = window.setTimeout(() => {
      this.updateDemo(text);
    }, 500);
  }

  private updateDemo(text: string) {
    if (!this.targetElement) return;

    // Guarda o state atual antes de destruir
    const currentState = JSON.parse(JSON.stringify(
      (window as any).getCollabWindow?.()._ica?.playground || {}
    ));

    // Destroi o conteúdo atual
    this.targetElement.innerHTML = '';

    // Recria o HTML
    this.targetElement.innerHTML = text;

    // Após o componente ser criado, re-seta cada key do state individualmente
    setTimeout(() => {
      if (Object.keys(currentState).length > 0) {
        this.setStateDeep('playground', currentState);
      }
    }, 100);
  }

  private setStateDeep(prefix: string, obj: any) {
    if (typeof obj !== 'object' || obj === null) return;

    for (const key of Object.keys(obj)) {
      const fullKey = `${prefix}.${key}`;
      const value = obj[key];

      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // Recursivamente seta sub-keys
        this.setStateDeep(fullKey, value);
      } else {
        // Seta esta key individualmente
        setState(fullKey, value);
      }
    }
  }

  private savedRange: Range | null = null;
  private savedOffset: number = 0;

  private saveSelection() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) return;

    const range = selection.getRangeAt(0);

    // Calculate offset from start of contenteditable
    if (this.codeEditor) {
      const preCaretRange = range.cloneRange();
      preCaretRange.selectNodeContents(this.codeEditor);
      preCaretRange.setEnd(range.startContainer, range.startOffset);
      this.savedOffset = preCaretRange.toString().length;
    }
  }

  private restoreSelection() {
    if (!this.codeEditor) return;

    const selection = window.getSelection();
    if (!selection) return;

    // Walk through text nodes to find position
    let currentOffset = 0;
    const walker = document.createTreeWalker(
      this.codeEditor,
      NodeFilter.SHOW_TEXT,
      null
    );

    let node: Text | null;
    while ((node = walker.nextNode() as Text)) {
      const nodeLength = node.textContent?.length || 0;
      if (currentOffset + nodeLength >= this.savedOffset) {
        const range = document.createRange();
        range.setStart(node, this.savedOffset - currentOffset);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        return;
      }
      currentOffset += nodeLength;
    }
  }

  private handleKeyDown(e: KeyboardEvent) {
    // Handle Tab key for indentation
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
  }

  // ===========================================================================
  // RENDER
  // ===========================================================================

  render(): TemplateResult {
    return html`
      <pre class="m-0 p-0 bg-slate-900 rounded-lg overflow-hidden"><code 
        class="code-editor block w-full h-64 p-4 text-sm font-mono text-slate-100 overflow-auto outline-none whitespace-pre"
        contenteditable="true"
        spellcheck="false"
        @input=${this.handleInput}
        @keydown=${this.handleKeyDown}
      ></code></pre>
    `;
  }
}