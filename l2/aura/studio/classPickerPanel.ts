/// <mls fileReference="_102020_/l2/aura/studio/classPickerPanel.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The in-place picker's panel, as a web component (TASK-102033-picker-web-component) — the FLOATING one,
// pinned over the app region.
//
// WHY A COMPONENT
// It used to be `innerHTML` + event delegation + a global `<style>`, built inside studioEditor. That
// cost an `escapeHtml` on every interpolation, spread the UI state (tab, screen, open inputs) through
// the editor, and left 170 sentences hardcoded in Portuguese in a module that also does anchoring and
// persistence. As a component: Lit escapes by construction, the UI state is `@state`, the css is
// scoped, and the words come from the catalog (studioMessages).
//
// WHAT LIVES HERE
// Only this picker's chrome: one row with the tag, the actions, the way back to the docked picker and the
// close. Everything inside the panel is classPickerBase, shared with pageClassPickerPanel
// (TASK-102020-picker-inspector, phase 0). The contract types live there too and are re-exported here,
// because this is the module the editor has always imported them from.
//
// LIGHT DOM: this chrome renders inside the CLIENT's page, sharing a class namespace with it — so every
// class carries the `acp-` prefix (see classPickerPanel.less for the measurement that made that
// non-negotiable).

import { html, nothing } from 'lit';
import { customElement, state } from 'lit/decorators.js';
import { ClassPickerBase, ellipsize, type IPickerTarget } from '/_102020_/l2/aura/studio/classPickerBase.js';
import { t } from '/_102020_/l2/aura/studio/studioMessages.js';
import { onDockedClassPickerChange, setClassPickerMode } from '/_102020_/l2/aura/studio/classPickerDock.js';

export type {
  IPickerAdopt,
  IPickerAdoptOption,
  IPickerApply,
  IPickerInner,
  IPickerLevel,
  IPickerPreview,
  IPickerPropEdit,
  IPickerProps,
  IPickerSide,
  IPickerSlot,
  IPickerSlotMove,
  IPickerTarget,
  IPickerText,
  IPickerTextEdit,
  IStyleClipboard,
} from '/_102020_/l2/aura/studio/classPickerBase.js';

export const CLASS_PICKER_TAG = 'aura--studio--class-picker-102020';

/**
 * How long the header's tag may be before it is cut.
 *
 * More room than a breadcrumb level (it is one item, not nine) and still a hard limit, because the
 * header is a single flex row: a molecule tag (`grouptriggeraction--ml-button-group`, 35 characters)
 * used to push its eight icons out of the panel. With the actions in the ⋯ menu the row holds five,
 * so the tag got room back. The whole name is in the tooltip, and the `.less` keeps an ellipsis as
 * the second line of defence — a cut by character count cannot know the width of the glyphs.
 */
const HEAD_TAG_MAX = 22;

@customElement(CLASS_PICKER_TAG)
export class ClassPickerPanel extends ClassPickerBase {
  // The looks live in classPickerPanel.less, compiled into this constructor by the enhancement
  // (processCssLit -> loadStyle): fixed colours rather than the design system's, because the panel sits
  // on top of the page it edits.

  /**
   * Whether the picker docked in the Pages plugin is on screen — the only case where there is
   * somewhere to go back to (pageClassPickerPanel sent the editing here with its own button).
   */
  @state() private canDock = false;
  private unsubDock: (() => void) | null = null;

  connectedCallback(): void {
    super.connectedCallback();
    this.unsubDock = onDockedClassPickerChange((panel) => { this.canDock = panel !== null; });
  }

  disconnectedCallback(): void {
    this.unsubDock?.();
    this.unsubDock = null;
    super.disconnectedCallback();
  }

  /** One row: the tag, undo/redo and the ⋯ menu, the way back to the Pages panel and the close. */
  protected renderChrome(target: IPickerTarget) {
    return html`<div class="acp-head">
      <span class="acp-tag" title=${target.tag}>${ellipsize(target.tag, HEAD_TAG_MAX)}</span>
      ${this.renderScenarioBadge()}
      <span class="acp-spacer"></span>
      ${this.renderActions()}
      ${this.canDock ? html`<button type="button" class="acp-icon" title=${t('panel.dockReturn')}
        @click=${this.onDockReturn}>↙</button>` : nothing}
      <button type="button" class="acp-close" title=${t('panel.close')} @click=${this.onClose}>&times;</button>
    </div>`;
  }

  /** Back to the Pages panel: the editor moves the selection there as soon as the mode changes. */
  private onDockReturn = (): void => {
    this.preview(null);
    setClassPickerMode('docked');
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'aura--studio--class-picker-102020': ClassPickerPanel;
  }
}
