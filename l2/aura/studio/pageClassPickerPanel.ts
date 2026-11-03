/// <mls fileReference="_102020_/l2/aura/studio/pageClassPickerPanel.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The class picker DOCKED in the Pages plugin (aura--plugins--select-page-102020), next to the floating
// one (classPickerPanel).
//
// SAME CONTENT, DIFFERENT HOME
// The editor feeds this one exactly what it feeds the floating panel and listens to the same `picker-*`
// events. What changes is where it lives: in the studio's side panel instead of pinned over the app
// region — so no fixed position, the panel's own width, and the side panel's light/dark colours. It used
// to be a full COPY of the floating panel; the content is now classPickerBase, shared by both
// (TASK-102020-picker-inspector, phase 0), and this file is only the chrome: a header and a toolbar, the
// empty state, and the switch to the floating picker.
//
// HOW THE EDITOR FINDS IT
// It registers itself in classPickerDock while connected. While it is there and the mode is 'docked',
// the editor feeds the selection here and keeps the floating panel hidden. The button next to the
// close switches the mode to 'floating': the editing goes back to the floating panel and this one
// shrinks to a line with the way back (the floating panel has one too). The mode is remembered.
//
// Still LIGHT DOM in the same document as the client page (the Tailwind JIT scans it in studio mode),
// so the `acp-` prefix rule of classPickerPanel.less holds here too.

import { html } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ClassPickerBase, ellipsize, type IPickerTarget } from '/_102020_/l2/aura/studio/classPickerBase.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import {
  dockClassPicker,
  getClassPickerMode,
  onDockedClassPickerChange,
  setClassPickerMode,
  undockClassPicker,
  type ClassPickerMode,
} from '/_102020_/l2/aura/studio/classPickerDock.js';

export const PAGE_CLASS_PICKER_TAG = 'aura--studio--page-class-picker-102020';

/**
 * How long the header's tag may be before it is cut.
 *
 * The same as the floating panel's: both have one row with five controls next to the tag. The whole
 * name is in the tooltip, and the `.less` keeps an ellipsis as the second line of defence.
 */
const HEAD_TAG_MAX = 22;

@customElement(PAGE_CLASS_PICKER_TAG)
export class PageClassPickerPanel extends ClassPickerBase {
  // The looks live in pageClassPickerPanel.less, compiled into this constructor by the enhancement
  // (processCssLit -> loadStyle). Every class is prefixed `acp-` (same document as the client page),
  // and the colours are the side panel's own light/dark palette, never the design system's.

  /** Where the editing is — mirrored from classPickerDock, which is what the editor reads. */
  @state() private mode: ClassPickerMode = getClassPickerMode();
  private unsubMode: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    // The floating panel can bring the editing back, so the mode is followed, not only set here.
    this.unsubMode = onDockedClassPickerChange(() => { this.mode = getClassPickerMode(); });
    // Last, so the editor's first feed lands on a panel that is already listening to the state.
    dockClassPicker(this);
  }

  disconnectedCallback(): void {
    // First: the editor gets the floating panel back before this one stops rendering.
    undockClassPicker(this);
    this.unsubMode?.();
    this.unsubMode = null;
    super.disconnectedCallback();
  }

  /** Sends the editing to the floating panel, or brings it back here. */
  private switchMode(next: ClassPickerMode): void {
    this.preview(null);
    this.mode = next;
    setClassPickerMode(next);
  }

  render() {
    // While the floating panel has the editing, this one is only the way back.
    if (this.mode === 'floating') {
      return html`<div class="acp-empty-state acp-floating-state">
        <span class="acp-reason">${t('panel.dockFloating')}</span>
        <button type="button" class="acp-chip" @click=${() => this.switchMode('docked')}>${t('panel.dockBack')}</button>
      </div>`;
    }
    return super.render();
  }

  /**
   * Unlike the floating panel, this one stays on screen with nothing selected: an empty box in the
   * side panel would read as broken, so it says what to do instead.
   */
  protected renderEmpty() {
    return html`<div class="acp-empty-state">
      <span class="acp-head-row">
        <span class="acp-label">${t('panel.dockTitle')}</span>
        ${this.floatButton()}
      </span>
      <span class="acp-reason">${t('panel.dockEmpty')}</span>
    </div>`;
  }

  /**
   * One row, like the floating one: the tag, undo/redo and the ⋯ menu, the switch and the close. The
   * toolbar row it used to have was for eight icons; with the actions in the menu there is room for all
   * of it next to the tag.
   */
  protected renderChrome(target: IPickerTarget) {
    return html`<div class="acp-head">
      <span class="acp-tag" title=${target.tag}>${ellipsize(target.tag, HEAD_TAG_MAX)}</span>
      ${this.renderScenarioBadge()}
      <span class="acp-spacer"></span>
      ${this.renderActions()}
      ${this.floatButton()}
      <button type="button" class="acp-close" title=${t('panel.close')} @click=${this.onClose}>&times;</button>
    </div>`;
  }

  /** The way out to the floating panel — next to the close, with the rest of the panel's own chrome. */
  private floatButton() {
    return html`<button type="button" class="acp-icon" title=${t('panel.dockFloat')}
      @click=${() => this.switchMode('floating')}>↗</button>`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'aura--studio--page-class-picker-102020': PageClassPickerPanel;
  }
}
