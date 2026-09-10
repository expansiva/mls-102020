/// <mls fileReference="_102020_/l2/aura/studio/classPickerPanel.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
// The in-place picker's panel, as a web component (TASK-102033-picker-web-component).
//
// WHY A COMPONENT
// It used to be `innerHTML` + event delegation + a global `<style>`, built inside studioEditor. That
// cost an `escapeHtml` on every interpolation, spread the UI state (tab, screen, open inputs) through
// the editor, and left 170 sentences hardcoded in Portuguese in a module that also does anchoring and
// persistence. As a component: Lit escapes by construction, the UI state is `@state`, the css is
// scoped, and the words come from the catalog (studioMessages).
//
// THE SPLIT WITH THE EDITOR
// The editor stays the brain — selection, structural anchoring, writing to the model, live update. The
// panel owns the VOCABULARY and the UI: it computes the new class attribute with the pure core and
// emits it. Nothing here knows what a Monaco model is.
//
//   editor --(target/builtClasses/dsRoles/jitLive)--> <aura--studio--class-picker-102020>
//          <--(picker-apply | picker-preview | picker-close)--
//
// LIGHT DOM, on the project's own base (StateLitElement): the same shape as every other widget here,
// which is what makes the .less pipeline and the state subscription available. The price is that this
// chrome renders inside the CLIENT's page, sharing a class namespace with it — so every class carries
// the `acp-` prefix (see classPickerPanel.less for the measurement that made that non-negotiable).

import { html, nothing, type TemplateResult } from 'lit';
import { customElement, property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { getActualLanguage, getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { currentLanguage, describePageFolder } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import {
  ADD_GROUPS,
  ANIMATION_GROUPS,
  CASCADE_MAX_CHILDREN,
  CASCADE_STEPS,
  activeAnimationGroups,
  activeAnimations,
  animationOption,
  animationScreen,
  applyAnimationCustom,
  applyAnimationGroup,
  applyAnimationOption,
  applyAnimationState,
  applyCascade,
  applyTypedValue,
  addUtility,
  addableProperties,
  addableProperty,
  buildAnimationClass,
  chipAvailability,
  classesInCategories,
  colorOf,
  diffLiterals,
  newRoleOptions,
  pasteCategories,
  pasteStyle,
  readAnimationCustom,
  readAnimationState,
  readCascade,
  readTypedValue,
  removeAnimationCustom,
  removeCascade,
  removeUtility,
  replaceUtility,
  typedValueSpec,
  roleLabel,
  roleVar,
  splitUtilities,
  utilityLabel,
  utilityOptions,
  type AddGroup,
  type AnimationScreen,
  type AnimationStateKey,
  type IAddableProperty,
  type ITypedValueSpec,
  type IAnimationGroup,
  type IAnimationOption,
  type IAnimationState,
  type IUtilityToken,
} from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { t, tr, type IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

export const CLASS_PICKER_TAG = 'aura--studio--class-picker-102020';

/**
 * How long a breadcrumb label may be before it is cut.
 *
 * The row scrolls, so this is not about the panel's width: it is about one long level (a molecule tag
 * is `molecules--ml-scenary-102020`) pushing every other level out of reach of the eye. The whole
 * name is in the tooltip, and the hover shows the element itself.
 */
const CHAIN_LABEL_MAX = 10;

/**
 * What each text attribute is CALLED for someone who is not writing HTML.
 *
 * "tooltip" is what the user sees, `title` is what the markup says — the attribute name travels in
 * the tooltip of the label, so both are there and neither has to be guessed.
 */
const TEXT_ATTR_LABEL: Record<string, string> = {
  placeholder: 'attr.placeholder',
  title: 'attr.title',
  'aria-label': 'attr.ariaLabel',
  alt: 'attr.alt',
};

/**
 * One level of the selection's ancestor chain (TASK-102020-ancestor-breadcrumb).
 *
 * `index` is the HANDLE: the panel sends it back and the editor resolves the element. A live node
 * parked in a property of this component would be a node the chrome outlives — the same reason
 * `publishSelection` carries data only.
 */
export interface IPickerLevel {
  index: number;
  tag: string;
  /** The level's class attribute — the tooltip only: the label is the tag, and the hover is the rest. */
  literal: string;
  /** The selection itself — highlighted, and not a link to itself. */
  current: boolean;
}

/**
 * A text the selection carries in an ATTRIBUTE (TASK-102020-attribute-text).
 *
 * `placeholder`, `title`, `aria-label` and `alt` are text the user READS and, until this, the only
 * text on the page with no way in: they have no box of their own, so the pointer cannot land on them
 * and the panel is where the gesture has to live.
 */
export interface IPickerText {
  attribute: string;
  value: string;
  /**
   * Catalog keys whose value IS this text. Empty means not editable here (written in the markup, or
   * from a molecule's own file); more than one means the panel ASKS which — an attribute has no
   * position in the DOM to break the tie with.
   */
  keys: string[];
  /** Why there is no key — shown in place of the field, which stays read-only. */
  reason?: IMessageRef;
}

/** What the panel asks the editor to write into an attribute. */
export interface IPickerTextEdit {
  attribute: string;
  /** The key the user is editing — chosen when the text matched more than one. */
  key: string;
  value: string;
}

/** What the editor knows about the selection and the panel needs to render it. */
export interface IPickerTarget {
  /** Tag of the selected element, for the header. */
  tag: string;
  /**
   * The chain from the page's own element down to the selection, root-first.
   *
   * It exists because the pointer cannot reach a wrapper whose children cover it — 1 element in 5 of
   * the real pages — and the refusal that used to say "try selecting the element around it" was
   * asking for something the tool did not have.
   */
  levels: IPickerLevel[];
  /** Text this element carries in an attribute — empty for most elements. */
  texts: IPickerText[];
  /** File that receives the edit, already formatted for display. */
  fileLabel: string;
  /**
   * The same file, structured — the identity of the page ON SCREEN.
   *
   * The Info tab needs module and variation, and the folder is where they are. Asking `auraState`
   * instead was wrong twice over: `actualLayout` is written only by the genome knob and
   * `actualDesignSystem` only by the project knob, and even with `studioAuraSeed` filling both on
   * studio entry, the state answers "what the Studio is pointing at" while this tab asks "what is on
   * screen". Absent while the anchor could not be resolved.
   */
  file?: { project: number; shortName: string; folder: string };
  /** The element's class attribute — the panel's whole input. */
  literal: string;
  /** False when the anchor could not be resolved: everything is read-only. */
  editable: boolean;
  refusal?: IMessageRef;
  warning?: IMessageRef;
  /** Element children of the selection — the cascade row needs to know. */
  childCount: number;
  /**
   * Whether the element can still be found with NO classes at all.
   *
   * True for a structural anchor (its position in the template identifies it); false when the editor
   * had to fall back to COUNTING the literal in the source, because there the literal is the address
   * and an element without one could not be reached again — not even to put a class back.
   */
  canRemoveLast: boolean;
  /**
   * What the undo/redo buttons would undo and redo, already translated; empty when there is nothing.
   *
   * The stack lives in the editor (it covers text edits too, which never pass through this panel), so
   * the panel only shows what it is told.
   */
  undo: string;
  redo: string;
  /**
   * Whether the element can change places with the sibling above or below it.
   *
   * Answered by the editor with the REAL planner, not by a guess: a move button that is enabled has
   * to be one that writes. When it cannot, the reason travels with it and becomes the tooltip — the
   * same discipline the chips follow, so the user knows before clicking and not after.
   */
  canMoveUp: boolean;
  canMoveDown: boolean;
  moveUpReason?: IMessageRef;
  moveDownReason?: IMessageRef;
}

/** What the panel asks the editor to write. */
export interface IPickerApply {
  literal: string;
  /** Already-translated description for the status line (it mixes class names and words). */
  what: string;
}

/** What the panel asks the editor to SHOW for a moment, without writing anything. */
export interface IPickerPreview {
  /** An animation option: shown, replayed if it is an entrance, and undone on its own. */
  option?: string;
  /** A whole class attribute — what a paste would produce. Held while the pointer stays. */
  literal?: string;
}

/**
 * The copied style, held BETWEEN selections.
 *
 * Session-only and panel-only: no system clipboard (pasting across tabs or machines opens a format
 * question this gesture does not need) and no persistence.
 */
export interface IStyleClipboard {
  literal: string;
  /** Tag it came from, for the label. A name only — the element itself may be long gone. */
  tag: string;
}

@customElement(CLASS_PICKER_TAG)
export class ClassPickerPanel extends StateLitElement {
  @property({ attribute: false }) target?: IPickerTarget;
  /** Classes with a rule in the BUILT css — what the client will actually render. */
  @property({ attribute: false }) builtClasses: Set<string> = new Set<string>();
  @property({ attribute: false }) dsRoles: string[] = [];
  @property({ attribute: false }) resolveVar: (cssVar: string) => string = () => '';
  @property({ type: Boolean }) jitLive = false;

  @state() private tab: 'classes' | 'animations' | 'info' = 'classes';
  @state() private screen: AnimationScreen = 'root';
  /** Group whose "custom value" input is open. */
  @state() private customEditing: string | null = null;
  /** Token index whose role palette is expanded. */
  @state() private roleEditing: number | null = null;
  /**
   * Switches flipped before anything was applied.
   *
   * The animation state is READ from the class attribute, so with nothing applied yet a switch would
   * snap back on the next render ("no mouse" → "sempre"). Dropped when the selection changes.
   */
  @state() private pendingState: Partial<IAnimationState> = {};
  /**
   * The copied style. Deliberately NOT dropped when the selection changes — copying on one element
   * and pasting on another is the whole gesture.
   */
  @state() private clipboard: IStyleClipboard | null = null;
  /** Group of the "+" whose properties are showing. */
  @state() private addGroup: AddGroup | null = null;
  /** Property whose design-system palette is open in the "+" (colour does not seed a value). */
  @state() private addColor: string | null = null;
  /** Token index whose typed-value input is open. */
  @state() private typedEditing: number | null = null;
  /** State keys the scenario panel is currently simulating — see renderScenarioBadge. */
  @state() private simulatedKeys: string[] = [];
  /** Which catalog key the user chose for an ambiguous attribute text, by attribute. */
  @state() private textKeys: Record<string, string> = {};
  /** Last value asked for per attribute — the guard against Enter and blur writing twice. */
  private lastSent: Record<string, string> = {};

  // The looks live in classPickerPanel.less, compiled into this constructor by the enhancement
  // (processCssLit -> loadStyle). Two things that file explains and this one depends on: every class
  // is prefixed `acp-` because this renders in the CLIENT page's light DOM, and the colours are fixed
  // rather than the design system's, because the panel sits on top of the page it edits.


  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  private static readonly SCENARIO_KEY = 'aura.scenario.simulated';

  connectedCallback(): void {
    console.info('[picker] connected : teste publish 102020 - 2');
    super.connectedCallback();
    this.readScenario();
    subscribe(ClassPickerPanel.SCENARIO_KEY, this);
  }

  disconnectedCallback(): void {
    unsubscribe(ClassPickerPanel.SCENARIO_KEY, this);
    super.disconnectedCallback();
  }

  /**
   * The notify contract of collabState: it looks for this method (or a plain function).
   *
   * The base class has its own, for the attribute-bound subscriptions it manages; this one is for the
   * key subscribed by hand above, so the base's behaviour has to be kept.
   */
  handleIcaStateChange(key: string, value: unknown): void {
    super.handleIcaStateChange(key, value);
    if (key === ClassPickerPanel.SCENARIO_KEY) this.readScenario();
  }

  private readScenario(): void {
    const simulated = getState(ClassPickerPanel.SCENARIO_KEY) as string[] | undefined;
    this.simulatedKeys = Array.isArray(simulated) ? simulated : [];
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    // A new selection drops what belonged to the previous one: a switch nobody applied yet, and any
    // expanded list, which would otherwise open on an element that never asked for it.
    const previous = changed.get('target') as IPickerTarget | undefined;
    if (changed.has('target') && previous && previous.literal !== this.target?.literal) {
      this.customEditing = null;
      this.typedEditing = null;
      // The "+" is answered by what the element already has, and that just changed.
      this.addGroup = null;
      this.addColor = null;
    }
    if (changed.has('target') && previous?.tag !== this.target?.tag) {
      this.pendingState = {};
      this.roleEditing = null;
    }
    // A different element means a different sentence behind the same attribute name. The editor
    // re-validates the key against what it offered, so a stale choice cannot write — but it could
    // still SHOW the wrong key, and that is a lie the panel must not tell.
    if (changed.has('target') && previous
      && (previous.tag !== this.target?.tag || previous.literal !== this.target?.literal)) {
      this.textKeys = {};
      this.lastSent = {};
    }
  }

  /**
   * Keeps the breadcrumb scrolled to its end.
   *
   * The selection is the LAST item, and a chain deeper than the panel is wide would leave it off
   * screen — the one item that must always be visible. Scrolling to the end is what makes the
   * truncation happen on the left, where the page's outer wrappers are.
   */
  updated(changed: Map<string, unknown>): void {
    super.updated(changed);
    if (!changed.has('target')) return;
    const row = this.renderRoot.querySelector('.acp-chain');
    if (row) row.scrollLeft = row.scrollWidth;
  }

  render() {
    const target = this.target;
    if (!target) return nothing;

    return html`
      <div class="acp-head">
        <span class="acp-tag">${target.tag}</span>
        ${this.renderScenarioBadge()}
        ${this.moveButton('up')}
        ${this.moveButton('down')}
        ${this.historyButton('undo')}
        ${this.historyButton('redo')}
        ${this.renderCopyIcon()}
        ${this.renderPasteIcon()}
        <span class="acp-spacer"></span>
        <button type="button" class="acp-close" title=${t('panel.close')} @click=${this.onClose}>&times;</button>
      </div>
      ${this.renderChain(target)}
      ${this.renderTexts(target)}
      <div class="acp-tabs">
        ${this.tabButton('classes', 'panel.tabClasses')}
        ${this.tabButton('animations', 'panel.tabAnimations')}
        ${this.tabButton('info', 'panel.tabInfo')}
      </div>
      ${target.refusal ? html`<div class="acp-note acp-refusal">${tr(target.refusal)}</div>` : nothing}
      ${target.warning ? html`<div class="acp-note acp-warning">${tr(target.warning)}</div>` : nothing}
      ${this.tab === 'animations' ? this.renderAnimations() : nothing}
      ${this.tab === 'info' ? this.renderInfo() : nothing}
      ${this.tab === 'classes' ? this.renderClasses() : nothing}
    `;
  }

  /**
   * The breadcrumb: every element between the page and the selection, one click each.
   *
   * ONE ROW, and it scrolls instead of wrapping — the deepest of the real pages is 9 levels, which
   * does not fit in 340px. What may fall off is the far end of the page, never the selection: the row
   * is kept scrolled to its end (see `updated`), so the truncation is on the left. With fewer than
   * two levels there is nothing to walk and the row would only repeat the header.
   */
  private renderChain(target: IPickerTarget) {
    const levels = target.levels;
    if (levels.length < 2) return nothing;
    // The one right above the selection is what `Esc` does, and its tooltip says so.
    const parent = levels.length - 2;
    return html`<div class="acp-chain" title=${t('panel.chainTitle')}>${levels.map((level, at) => html`
      ${at ? html`<span class="acp-chain-sep">›</span>` : nothing}
      ${level.current
    ? html`<span class="acp-chain-now" title=${this.levelTitle(level, 'panel.chainCurrent')}
        >${this.levelLabel(level)}</span>`
    : html`<button type="button" class="acp-chain-item"
        title=${this.levelTitle(level, at === parent ? 'panel.chainUp' : 'panel.chainSelect')}
        @click=${() => this.emitLevel(level.index)}
        @mouseenter=${() => this.emitLevelHover(level.index)}
        @mouseleave=${() => this.emitLevelHover(null)}
      >${this.levelLabel(level)}</button>`}`)}</div>`;
  }

  /**
   * The label of a level: the TAG, and nothing else.
   *
   * It used to carry the first classes too, and that was worse than plain: `section.rounded-lg.borde…`
   * spends the whole row on one level and still gets cut mid-word, while the thing that actually says
   * WHICH element this is — the hover — was already there. The classes stay in the tooltip.
   */
  private levelLabel(level: IPickerLevel): string {
    const tag = level.tag;
    return tag.length > CHAIN_LABEL_MAX ? `${tag.slice(0, CHAIN_LABEL_MAX)}…` : tag;
  }

  /** What the level does, and under it the class attribute the label deliberately does not show. */
  private levelTitle(level: IPickerLevel, id: string): string {
    const what = t(id, { tag: level.tag });
    return level.literal ? `${what}\n${level.literal}` : what;
  }

  /** The panel asks for a level by index; the editor owns the elements and resolves it. */
  private emitLevel(index: number): void {
    this.preview(null);
    this.dispatchEvent(new CustomEvent<number>('picker-level', {
      detail: index, bubbles: true, composed: true,
    }));
  }

  /** Hovering a level marks it on screen — `null` when the pointer leaves. */
  private emitLevelHover(index: number | null): void {
    this.dispatchEvent(new CustomEvent<number | null>('picker-level-hover', {
      detail: index, bubbles: true, composed: true,
    }));
  }

  /**
   * The texts this element carries in an attribute — one line each.
   *
   * ABOVE the tabs, and not inside the "classes" tab, because it is not a class and because the
   * whole point is that the user can SEE that the text is editable: a `placeholder` has no box on
   * screen, so nothing about it is discoverable by pointing. It only renders when the element has
   * one, which is a minority of elements.
   */
  private renderTexts(target: IPickerTarget) {
    if (!target.texts.length) return nothing;
    return html`<div class="acp-texts">
      ${target.texts.map((text) => this.renderText(text))}
    </div>`;
  }

  private renderText(text: IPickerText) {
    const label = TEXT_ATTR_LABEL[text.attribute];
    const head = html`<span class="acp-text-label" title=${text.attribute}
      >${label ? t(label) : text.attribute}</span>`;

    // No key: the text is data, or markup, or in a file this screen does not reach. Read-only with
    // the reason the editor resolved — the same shape a class row uses when it has nothing to offer.
    if (!text.keys.length) {
      return html`<div class="acp-text acp-readonly">${head}
        <span class="acp-reason">${tr(text.reason) || t('reason.attrNotInCatalog')}</span></div>`;
    }

    const chosen = this.textKey(text);
    if (!chosen) {
      // Ambiguous: the markup could not name the key (a mapped `fromShared`, a ternary), so the only
      // way back was the sentence — and several keys hold it. Choosing here would be writing one the
      // user never pointed at.
      return html`<div class="acp-text">${head}
        <span class="acp-reason">${t('panel.textPickKey', { count: text.keys.length })}</span>
        <span class="acp-chips">${text.keys.map((key) => html`<button type="button" class="acp-chip"
          title=${key} @click=${() => { this.textKeys = { ...this.textKeys, [text.attribute]: key }; }}
        >${key}</button>`)}</span></div>`;
    }

    return html`<div class="acp-text">${head}
      <input class="acp-text-input" type="text" .value=${text.value}
        title=${t('panel.textOf', { key: chosen })}
        @keydown=${(e: KeyboardEvent) => this.onTextKeydown(e, text)}
        @blur=${(e: Event) => this.commitText(text, e.target as HTMLInputElement)}>
      ${text.keys.length > 1
    ? html`<button type="button" class="acp-link" title=${t('panel.textOtherKey')}
        @click=${() => { const next = { ...this.textKeys }; delete next[text.attribute]; this.textKeys = next; }}
      >${chosen}</button>`
    : nothing}</div>`;
  }

  /** The key being edited: the only one, or the one the user picked when there were several. */
  private textKey(text: IPickerText): string {
    if (text.keys.length === 1) return text.keys[0];
    const chosen = this.textKeys[text.attribute];
    return chosen && text.keys.includes(chosen) ? chosen : '';
  }

  /** Enter applies, Escape gives up — the same contract as every other field of this panel. */
  private onTextKeydown = (e: KeyboardEvent, text: IPickerText): void => {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitText(text, input);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      // Put the value back BEFORE blurring: that is what makes the blur below a no-op.
      input.value = text.value;
      input.blur();
    }
  };

  /**
   * Asks the editor to write it — once.
   *
   * `lastSent` is not bookkeeping for its own sake: Enter commits and the blur that follows would
   * arrive while the write is still in flight, with `text.value` still holding the old sentence — a
   * second write of the same edit, which the history would then have to undo twice.
   */
  private commitText(text: IPickerText, input: HTMLInputElement): void {
    const value = input.value.trim();
    const key = this.textKey(text);
    if (!key || !value || value === text.value || value === this.lastSent[text.attribute]) return;
    this.lastSent[text.attribute] = value;
    this.dispatchEvent(new CustomEvent<IPickerTextEdit>('picker-text', {
      detail: { attribute: text.attribute, key, value },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * Move the element one place among its siblings.
   *
   * Disabled carries the reason, because "why not" is the useful half here: not a sibling, one line
   * of code behind several elements, a helper's own root. The keyboard does the same thing
   * (Ctrl+Alt+Arrow), and so does dragging the element in the app.
   */
  private moveButton(direction: 'up' | 'down') {
    const can = direction === 'up' ? this.target?.canMoveUp : this.target?.canMoveDown;
    const reason = direction === 'up' ? this.target?.moveUpReason : this.target?.moveDownReason;
    return html`<button type="button" class="acp-history" ?disabled=${!can}
      title=${can ? t(`panel.move${direction === 'up' ? 'Up' : 'Down'}`) : (tr(reason) || t('panel.moveNo'))}
      @click=${() => this.dispatchEvent(new CustomEvent(`picker-move-${direction}`, { bubbles: true, composed: true }))}
    >${direction === 'up' ? '\u2191' : '\u2193'}</button>`;
  }

  /**
   * Undo or redo, with the name of what it would do in the tooltip.
   *
   * Disabled is the honest state when the stack is empty — and the shortcut (Ctrl+Z) does the same
   * thing, so this is a reminder as much as a button.
   */
  private historyButton(direction: 'undo' | 'redo') {
    const what = (direction === 'undo' ? this.target?.undo : this.target?.redo) ?? '';
    return html`<button type="button" class="acp-history" ?disabled=${!what}
      title=${what ? t(`panel.${direction}Of`, { what }) : t(`panel.${direction}`)}
      @click=${() => this.dispatchEvent(new CustomEvent(`picker-${direction}`, { bubbles: true, composed: true }))}
    >${direction === 'undo' ? '\u21B6' : '\u21B7'}</button>`;
  }

  private tabButton(id: 'classes' | 'animations' | 'info', label: string) {
    return html`<button type="button" class="acp-tab ${this.tab === id ? 'acp-active' : ''}"
      @click=${() => { this.tab = id; this.preview(null); }}>${t(label)}</button>`;
  }

  /**
   * A badge while the page is in a SIMULATED state (TASK-102020-scenario-panel).
   *
   * The scenario panel puts the page into a chosen state so the branches that are normally invisible
   * can be edited — and two message `<p>`s look identical. Without this, editing the class of the
   * error branch while believing it is the success one is an easy mistake, and the picker is exactly
   * where the user is looking when they make it.
   *
   * This is the one thing the panel SUBSCRIBES to: everything else it needs comes from the editor,
   * one call away, and reading a projection of that would be a second source of truth.
   */
  private renderScenarioBadge() {
    if (!this.simulatedKeys.length) return nothing;
    return html`<span class="acp-scenario" title=${this.simulatedKeys.join('\n')}
      >${t('panel.scenario', { count: this.simulatedKeys.length })}</span>`;
  }

  // ─── Classes tab ───────────────────────────────────────────────────────────

  /**
   * The tab: what the element has, and what it could have.
   *
   * An element with NO class is not a dead end — it is exactly where the "+" earns its place. The
   * editor anchors it by position alone and the first write inserts the attribute, so the only
   * difference here is the line that says there is nothing yet.
   */
  private renderClasses() {
    const tokens = splitUtilities(this.target?.literal ?? '');
    return html`<div class="acp-rows">
      ${tokens.length
    ? tokens.map((token) => this.renderClassBlock(token))
    : html`<div class="acp-block acp-readonly"><span class="acp-reason">${t('panel.noClasses')}</span></div>`}
      ${this.renderAdd()}
    </div>`;
  }

  /**
   * One block per class token: what it edits on its own line, the neighbours below.
   *
   * The label is the PROPERTY, not the class: `bg-[var(--button-secondary-bg,#f8fafc)]` says what is
   * written, "background colour" says what the row does. The class itself is the tooltip, and it stays
   * the label when there is no honest name for the family — showing the class beats inventing a name.
   */
  private renderClassBlock(token: IUtilityToken) {
    const options = utilityOptions(token, 2, this.dsRoles, (cssVar) => this.resolveVar(cssVar));
    const label = utilityLabel(token);
    const text = label.property
      ? [t(label.property), ...label.variants.map((part) => (part.id ? t(part.id, part.params) : part.raw ?? ''))].join(' · ')
      : token.raw;

    const head = html`<span class="acp-head-row">
      <span class="acp-label" title=${token.raw}>${text}</span>
      ${this.removeButton(token, text)}
    </span>`;

    if (options.kind === 'none') {
      return html`<div class="acp-block acp-readonly">${head}<span class="acp-reason">${tr(options.reason)}</span></div>`;
    }
    if (options.kind === 'role') {
      return html`<div class="acp-block">${head}${this.renderRolePicker(token, options.options)}</div>`;
    }

    const editable = this.target?.editable ?? false;
    const typed = typedValueSpec(token, options.kind);
    return html`<div class="acp-block">${head}<span class="acp-chips">${options.options.map((option) => {
      const isCurrent = option === token.raw;
      const availability = chipAvailability(isCurrent, this.builtClasses.has(option), this.jitLive);
      if (availability === 'hidden') return nothing;
      const jitOnly = availability === 'jit-only';
      return html`<button type="button"
        class="acp-chip ${isCurrent ? 'acp-current' : ''} ${jitOnly ? 'acp-jit' : ''}"
        title=${jitOnly ? `${option} — ${t('panel.publishNote')}` : option}
        ?disabled=${!editable || isCurrent}
        @click=${() => this.applyLiteral(replaceUtility(this.literal, token.raw, option, token.index), `${token.raw} → ${option}`)}
      >${option.split(':').pop() ?? option}${jitOnly ? html`<span class="acp-star">*</span>` : nothing}</button>`;
    })}${typed ? this.renderTypedValue(token, typed) : nothing}</span></div>`;
  }

  /**
   * The `×` of a row: the whole property leaves.
   *
   * The LAST class can go too. That used to be refused because the literal WAS the anchor; now the
   * element is found by its position in the template, the write takes the whole `class="…"` attribute
   * out, and the panel comes back offering the "+". The one exception is an element the editor could
   * only find by COUNTING its literal — there the literal is the address (see canRemoveLast).
   */
  private removeButton(token: IUtilityToken, name: string) {
    const editable = this.target?.editable ?? false;
    const stranded = splitUtilities(this.literal).length <= 1 && !(this.target?.canRemoveLast ?? false);
    return html`<button type="button" class="acp-remove" ?disabled=${!editable || stranded}
      title=${stranded ? t('panel.removeLast') : t('panel.removeProperty')}
      @mouseenter=${() => { if (!stranded) this.previewLiteral(removeUtility(this.literal, token.raw)); }}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => this.applyLiteral(
    removeUtility(this.literal, token.raw),
    t('status.propertyRemoved', { property: name }),
  )}>&times;</button>`;
  }

  /**
   * The `...` of a numeric row: `p-[13px]`, `w-[320px]`.
   *
   * The core has always READ a typed value as the current value of its family (it leads the chips and
   * the scale is the way back) — what was missing was the way in. Gated by the family AND by the kind,
   * so the colour side of `text-*` never gets a px input.
   */
  private renderTypedValue(token: IUtilityToken, spec: ITypedValueSpec) {
    const editable = this.target?.editable ?? false;

    if (this.typedEditing === token.index) {
      const current = readTypedValue(token);
      return html`<span class="acp-custom">
        <input type="number" min=${spec.min} max=${spec.max} .value=${current === null ? '' : String(current)}
          placeholder=${`${spec.min}–${spec.max}`}
          @keydown=${this.onTypedKeydown}>
        <span class="acp-unit">${spec.unit}</span>
        <button type="button" class="acp-chip" @click=${() => this.commitTyped(token, spec)}>${t('panel.customApply')}</button>
        <button type="button" class="acp-link" @click=${() => { this.typedEditing = null; }}>${t('panel.customCancel')}</button>
      </span>`;
    }

    return html`<button type="button" class="acp-chip acp-more" ?disabled=${!editable}
      title=${t('panel.typedOpen', { unit: spec.unit, min: spec.min, max: spec.max })}
      @click=${() => { this.typedEditing = token.index; this.focusTypedSoon(); }}>…</button>`;
  }

  /**
   * The "+": a property this element does not have yet.
   *
   * Two steps, never a form — the category, then the property — because the catalog is ~20 entries and
   * a flat list of twenty in a 340px panel is a scroll, not a menu. The new property is born with the
   * value the project uses most; colour is the exception (no concentration to call a default), and it
   * opens the design-system palette instead of guessing.
   */
  private renderAdd() {
    const editable = this.target?.editable ?? false;
    const options = addableProperties(this.literal, { childCount: this.target?.childCount ?? 0 });

    if (!options.length) {
      return html`<div class="acp-block acp-add acp-readonly">
        <span class="acp-label">${t('panel.addProperty')}</span>
        <span class="acp-reason">${t('panel.addNothing')}</span>
      </div>`;
    }

    if (this.addColor) {
      const entry = addableProperty(this.addColor);
      const roles = entry?.family ? newRoleOptions(entry.family, this.dsRoles, (cssVar) => this.resolveVar(cssVar)) : [];
      return html`<div class="acp-block acp-add">
        <span class="acp-head-row">
          <span class="acp-label">${t(this.addColor)}</span>
          <button type="button" class="acp-link" @click=${() => { this.addColor = null; }}>${t('panel.customCancel')}</button>
        </span>
        ${roles.length
    ? html`<span class="acp-role-list">${roles.map((option) => html`<button type="button" class="acp-role-item"
            @click=${() => this.addSeed(this.addColor ?? '', option)}>${this.roleRow(option)}</button>`)}</span>`
    : html`<span class="acp-reason">${t('reason.noDsTokens')}</span>`}
        <small class="acp-hint">${t('panel.addColor')}</small>
      </div>`;
    }

    if (this.addGroup) {
      const group = this.addGroup;
      return html`<div class="acp-block acp-add">
        <span class="acp-head-row">
          <span class="acp-label">${t('panel.addPick')} · ${t(`group.${group}`)}</span>
          <button type="button" class="acp-link" @click=${() => { this.addGroup = null; }}>${t('panel.customCancel')}</button>
        </span>
        <span class="acp-chips">${options.filter((entry) => entry.group === group).map((entry) => this.addChip(entry))}</span>
      </div>`;
    }

    // Only the groups that have something to offer for THIS element: an empty category is a promise
    // the panel cannot keep.
    const groups = ADD_GROUPS.filter((group) => options.some((entry) => entry.group === group));
    return html`<div class="acp-block acp-add">
      <span class="acp-label" title=${t('panel.addTitle')}>${t('panel.addProperty')}</span>
      <span class="acp-chips">${groups.map((group) => html`<button type="button" class="acp-chip" ?disabled=${!editable}
        @click=${() => { this.addGroup = group; }}>${t(`group.${group}`)}</button>`)}</span>
    </div>`;
  }

  private addChip(entry: IAddableProperty) {
    const editable = this.target?.editable ?? false;
    const seed = entry.seed;
    // Same rule as every other chip: a class with no rule in the built css is marked, never silent.
    const jitOnly = Boolean(seed) && !this.builtClasses.has(seed ?? '');
    const title = seed
      ? (jitOnly ? `${seed} — ${t('panel.publishNote')}` : seed)
      : t('panel.addColor');

    return html`<button type="button" class="acp-chip ${jitOnly ? 'acp-jit' : ''}" ?disabled=${!editable} title=${title}
      @mouseenter=${() => { if (seed) this.previewLiteral(addUtility(this.literal, seed)); }}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => { if (seed) this.addSeed(entry.property, seed); else this.addColor = entry.property; }}
    >${t(entry.property)}${jitOnly ? html`<span class="acp-star">*</span>` : nothing}</button>`;
  }

  private addSeed(property: string, cls: string): void {
    this.addGroup = null;
    this.addColor = null;
    this.applyLiteral(addUtility(this.literal, cls), t('status.propertyAdded', { property: t(property) }));
  }

  /**
   * Copy and paste, as two icons in the header.
   *
   * They used to be a text button plus a whole block in the classes tab, with the summary of what
   * would enter and leave. The gesture is two clicks on two different elements and it does not need a
   * section of its own — so what is left on screen is the pair of icons, and the summary goes to the
   * console while this is being tried out (see logPaste).
   */
  private renderCopyIcon() {
    const has = Boolean(this.literal.trim());
    return html`<button type="button" class="acp-icon" ?disabled=${!has}
      title=${has ? t('panel.copyStyleTitle') : t('status.nothingToCopy')}
      @click=${this.onCopy}>\u29C9</button>`;
  }

  /**
   * Paste: the whole style, so the target ends up identical to the source.
   *
   * That is the decision this feature was built on (2026-09-01) and it is why one icon is enough. The
   * two narrower variants — only the looks, and keeping this element's place — have no button any
   * more; what they WOULD produce is printed next to the summary, so they stay visible while we
   * decide whether they deserve to come back.
   */
  private renderPasteIcon() {
    const clip = this.clipboard;
    const editable = this.target?.editable ?? false;
    const result = clip ? pasteStyle(this.literal, clip.literal) : '';
    const nothingToDo = !clip || !editable || result === this.literal;

    return html`<button type="button" class="acp-icon" ?disabled=${nothingToDo}
      title=${clip ? t('panel.pasteFromTitle', { tag: clip.tag }) : t('panel.pasteEmpty')}
      @mouseenter=${() => { if (!nothingToDo) this.previewLiteral(result); }}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => this.onPaste()}>\u{1F4CB}</button>`;
  }

  private onPaste(): void {
    const clip = this.clipboard;
    if (!clip) return;
    const result = pasteStyle(this.literal, clip.literal);
    if (result === this.literal) return;
    this.logPaste(clip, result);
    this.applyLiteral(result, t('status.pasted', { tag: clip.tag }));
  }

  /**
   * What the on-screen summary used to say, in the console — English, like every other developer
   * diagnostic in these modules.
   *
   * `removes` is the half nobody expects: pasting REPLACES, so the target also loses what it had and
   * the source has not. And `alternatives` keeps the two variants that lost their button measurable:
   * `looksOnly` brings colour/border/radius/shadow/typography only, `keepingPlace` holds this
   * element's own width/position/span instead of taking the source's.
   */
  private logPaste(clip: IStyleClipboard, result: string): void {
    const diff = diffLiterals(this.literal, result);
    console.info('[picker] paste', {
      from: clip.tag,
      adds: diff.added,
      removes: diff.removed,
      // Not in the built css: works here, reaches the client on the next publish.
      jitOnly: diff.added.filter((cls) => !this.builtClasses.has(cls)),
      place: classesInCategories(result, ['place']),
      alternatives: {
        looksOnly: pasteCategories(this.literal, clip.literal, ['appearance']),
        keepingPlace: pasteStyle(
          this.literal,
          clip.literal,
          classesInCategories(this.literal, ['place']),
          classesInCategories(clip.literal, ['place']),
        ),
      },
    });
  }

  private onCopy = (): void => {
    const literal = this.literal;
    const tag = this.target?.tag ?? '';
    if (!literal.trim()) {
      this.status(t('status.nothingToCopy'));
      return;
    }
    this.clipboard = { literal, tag };
    this.status(t('status.copied', { tag }));
  };

  /**
   * The design-system roles as a palette: a swatch, the role name, the colour.
   *
   * Not a `<select>`: a native `<option>` takes no markup, so the only way to show the colour there is
   * to paint the whole row. It expands INLINE because the panel scrolls — a positioned popup would be
   * clipped by its own container.
   */
  private renderRolePicker(token: IUtilityToken, options: string[]) {
    const current = options[0];
    const open = this.roleEditing === token.index;
    const editable = this.target?.editable ?? false;

    const row = (option: string) => this.roleRow(option);

    return html`<span class="acp-chips">
      <button type="button" class="acp-role-btn" title=${t('panel.roleTitle')} ?disabled=${!editable}
        @click=${() => { this.roleEditing = open ? null : token.index; }}>
        ${row(current)}<span>${open ? '▴' : '▾'}</span>
      </button>
      ${open ? html`<span class="acp-role-list">${options.map((option) => {
        const isCurrent = option === current;
        const availability = chipAvailability(isCurrent, this.builtClasses.has(option), this.jitLive);
        if (availability === 'hidden') return nothing;
        return html`<button type="button" class="acp-role-item ${isCurrent ? 'acp-current' : ''}"
          @click=${() => {
    this.roleEditing = null;
    this.applyLiteral(replaceUtility(this.literal, token.raw, option, token.index), `${roleLabel(token.raw)} → ${roleLabel(option)}`);
  }}>${row(option)}${isCurrent ? html`<span>✓</span>` : nothing}</button>`;
      })}</span>` : nothing}
    </span>`;
  }

  /** A swatch, the role name and the colour it resolves to — one line of the palette. */
  private roleRow(option: string) {
    const value = this.resolveVar(roleVar(option));
    const colour = colorOf(value);
    return html`
      <span class="acp-swatch ${colour ? '' : 'acp-empty'}" style=${colour ? `background:${colour}` : ''}></span>
      <span class="acp-role-name">${roleLabel(option)}</span>
      <span class="acp-role-value">${value}</span>
    `;
  }

  // ─── Info tab ──────────────────────────────────────────────────────────────

  /**
   * What is being edited: the page, and the element.
   *
   * It exists because the header was carrying the file name and running out of room — and because the
   * answers people actually need while editing ("which variation is this?", "which file does this
   * land in?", "why can't I edit it?") were spread between a tooltip and a status strip.
   *
   * The page half comes from the aura state, which is the only source that has it: the editor knows
   * the FILE it writes to, not the module/variation/language the Studio is pointing at. Read at
   * render time rather than subscribed — this tab is only on screen while it is open, and the panel
   * re-renders on every selection and every edit.
   */
  private renderInfo() {
    const target = this.target;
    const aura = getAuraState();
    // The file the editor resolved is the page ON SCREEN; the aura state is the fallback, because it
    // is filled by the Studio's knobs and can be empty (see IPickerTarget.file).
    const file = target?.file;
    const identity = describePageFolder(file?.folder ?? '');
    const project = file?.project ?? aura?.actualPage?.project;
    const module = identity.module || aura?.actualModule || '';
    const name = file?.shortName || aura?.actualPage?.shortName || '';
    const layout = identity.layout ?? aura?.actualLayout;
    const ds = identity.designSystem ?? aura?.actualDesignSystem;
    const variation = layout && ds ? `page${layout}${ds}` : '';
    // The language the page is RENDERING in — the same source the text editor treats as the truth.
    const language = currentLanguage() || getActualLanguage() || '';
    const tokens = splitUtilities(this.literal);

    return html`<div class="acp-rows">
      <div class="acp-block">
        <span class="acp-label">${t('panel.infoPage')}</span>
        ${this.infoRow('panel.infoProject', project ? String(project) : '')}
        ${this.infoRow('panel.infoModule', module)}
        ${this.infoRow('panel.infoName', name)}
        ${this.infoRow('panel.infoDevice', identity.device)}
        ${this.infoRow('panel.infoVariation', variation)}
        ${this.infoRow('panel.infoLanguage', language)}
        ${this.infoRow('panel.infoFile', target?.fileLabel ?? '')}
      </div>
      <div class="acp-block">
        <span class="acp-label">${t('panel.infoElement')}</span>
        ${this.infoRow('panel.infoTag', target?.tag ?? '')}
        ${this.infoRow('panel.infoClasses', String(tokens.length))}
        ${this.infoRow('panel.infoChildren', String(target?.childCount ?? 0))}
        ${this.infoRow('panel.infoEditable', t(target?.editable ? 'panel.infoYes' : 'panel.infoNo'))}
        ${target?.refusal ? this.infoRow('panel.infoRefusal', tr(target.refusal)) : nothing}
        ${target?.warning ? this.infoRow('panel.infoWarning', tr(target.warning)) : nothing}
        ${this.simulatedKeys.length
    ? this.infoRow('panel.infoScenario', String(this.simulatedKeys.length))
    : nothing}
      </div>
    </div>`;
  }

  /** One `label: value` line. An empty value shows a dash — saying nothing would read as a bug. */
  private infoRow(label: string, value: string) {
    return html`<span class="acp-info-row">
      <span class="acp-info-label">${t(label)}</span>
      <span class="acp-info-value" title=${value}>${value || '\u2014'}</span>
    </span>`;
  }

  // ─── Animations tab ────────────────────────────────────────────────────────

  private renderAnimations() {
    const spec = animationScreen(this.screen);
    const editable = this.target?.editable ?? false;
    const state = this.animationState();
    const activeOptions = new Set(activeAnimations(this.literal));
    const activeGroups = new Set(activeAnimationGroups(this.literal));

    return html`
      ${spec.back ? html`<div class="acp-crumb">
        <button type="button" class="acp-link" @click=${() => this.goTo(spec.back!)}>‹ ${t('panel.back')}</button>
        <span class="acp-here">${t(spec.title)}</span>
      </div>` : nothing}
      ${spec.note ? html`<div class="acp-note">${t(spec.note)}</div>` : nothing}
      ${this.screen === 'root' && !activeOptions.size ? html`<div class="acp-note">${t('panel.previewHint')}</div>` : nothing}
      <div class="acp-rows">
        ${spec.rows.map((row) => {
    if (row.cascade) return this.renderCascade();
    const chips = row.state
      ? row.state.options.map((option) => this.chip({
        label: t(option.label),
        title: t(option.hint),
        current: state[row.state!.key] === (option.value === 'true' ? true : option.value),
        editable,
        onClick: () => this.applyState(row.state!.key, option.value),
      }))
      : row.mode === 'groups'
        ? (row.groups ?? []).map((group) => this.groupChip(group, activeGroups, state, editable))
        : (row.group ? row.group.options.map((option) => this.optionChip(row.group!, option, activeOptions, state, editable)) : []);

    return html`<div class="acp-block">
          <span class="acp-label">${t(row.title)}</span>
          <span class="acp-chips">
            ${chips}
            ${row.more ? html`<button type="button" class="acp-chip acp-more" title=${t('panel.more')}
              @click=${() => this.goTo(row.more!)}>…</button>` : nothing}
            ${!row.more && row.group?.custom ? this.renderCustom(row.group) : nothing}
          </span>
        </div>`;
  })}
        ${spec.motionSwitch ? html`
          <label class="acp-switch">
            <input type="checkbox" .checked=${state.motionSafe} ?disabled=${!editable}
              @change=${(e: Event) => this.applyState('motionSafe', String((e.target as HTMLInputElement).checked))}>
            ${t('panel.motionSafe')}
          </label>
          <small class="acp-hint">${t('panel.motionSafeHint')}</small>` : nothing}
        ${spec.advanced ? html`<button type="button" class="acp-link acp-advanced"
          @click=${() => this.goTo(spec.advanced!)}>${t('panel.advanced')} ›</button>` : nothing}
      </div>
    `;
  }

  private optionChip(group: IAnimationGroup, option: IAnimationOption, active: Set<string>, state: IAnimationState, editable: boolean) {
    const isOn = active.has(option.id);
    const availability = this.availability(group, option, isOn, state);
    if (availability === 'hidden') return nothing;
    return this.chip({
      label: t(option.label),
      title: t(option.hint),
      current: isOn,
      editable,
      jitOnly: availability === 'jit-only',
      preview: option.id,
      onClick: () => this.applyLiteral(applyAnimationOption(this.literal, option.id, state), t(option.label)),
    });
  }

  private groupChip(group: IAnimationGroup, activeGroups: Set<string>, state: IAnimationState, editable: boolean) {
    const option = group.options.find((candidate) => candidate.id === group.defaultOptionId) ?? group.options[0];
    if (!option) return nothing;
    const isOn = activeGroups.has(group.id);
    return this.chip({
      label: t(group.rootLabel ?? group.title),
      title: t(option.hint),
      current: isOn,
      editable,
      jitOnly: this.availability(group, option, isOn, state) === 'jit-only',
      preview: option.id,
      onClick: () => this.applyLiteral(applyAnimationGroup(this.literal, group.id, state), t(group.rootLabel ?? group.title)),
    });
  }

  /**
   * The cascade row: "the children appear one after another", configured from the CONTAINER.
   *
   * The cap is stated instead of silently truncating: the delay is one class PER CHILD (Tailwind
   * cannot compute an index into a delay), so a long list would put dozens of classes on one element.
   */
  private renderCascade() {
    const children = this.target?.childCount ?? 0;
    const editable = this.target?.editable ?? false;
    if (children < 2) {
      return html`<div class="acp-block acp-readonly">
        <span class="acp-label">${t('panel.cascadeTitle')}</span>
        <span class="acp-reason">${t('panel.cascadeNoChildren')}</span>
      </div>`;
    }

    const current = readCascade(this.literal);
    const dropped = Math.max(0, children - CASCADE_MAX_CHILDREN);
    return html`<div class="acp-block">
      <span class="acp-label">${t('panel.cascadeTitle')}</span>
      <span class="acp-chips">${CASCADE_STEPS.map((step) => this.chip({
    label: `${step}ms`,
    title: t('panel.cascadeChip', { step }),
    current: current.step === step,
    editable,
    onClick: () => this.applyCascadeStep(step, children),
  }))}</span>
      <span class="acp-reason">${dropped > 0
    ? t('panel.cascadeCapped', { count: children, dropped, max: CASCADE_MAX_CHILDREN })
    : t('panel.cascadeChildren', { count: children })}</span>
    </div>`;
  }

  /** The typed value: the group's own chip when it is set, and the way in when it is not. */
  private renderCustom(group: IAnimationGroup) {
    const spec = group.custom;
    if (!spec) return nothing;
    const editable = this.target?.editable ?? false;
    const typed = readAnimationCustom(this.literal, group.id);

    if (this.customEditing === group.id) {
      return html`<span class="acp-custom">
        <input type="number" min=${spec.min} max=${spec.max} .value=${typed === null ? '' : String(typed)}
          placeholder=${`${spec.min}–${spec.max}`}
          @keydown=${this.onCustomKeydown}>
        <span class="acp-unit">${spec.unit}</span>
        <button type="button" class="acp-chip" @click=${() => this.commitCustom(group.id)}>${t('panel.customApply')}</button>
        <button type="button" class="acp-link" @click=${() => { this.customEditing = null; }}>${t('panel.customCancel')}</button>
      </span>`;
    }

    return html`
      ${typed === null ? nothing : this.chip({
    label: `${typed}${spec.unit}`,
    title: t('panel.customClear', { hint: t(spec.hint) }),
    current: true,
    editable,
    onClick: () => this.applyLiteral(removeAnimationCustom(this.literal, group.id), t('status.customCleared')),
  })}
      <button type="button" class="acp-chip acp-more" ?disabled=${!editable}
        title=${t('panel.customOpen', { hint: t(spec.hint) })}
        @click=${() => { this.customEditing = group.id; this.focusCustomSoon(); }}>…</button>`;
  }

  private chip(chip: {
    label: string;
    title: string;
    current: boolean;
    editable: boolean;
    jitOnly?: boolean;
    preview?: string;
    onClick: () => void;
  }) {
    return html`<button type="button"
      class="acp-chip ${chip.current ? 'acp-current' : ''} ${chip.jitOnly ? 'acp-jit' : ''}"
      title=${chip.jitOnly ? `${chip.title} — ${t('panel.jitOnly')}` : chip.title}
      ?disabled=${!chip.editable}
      @mouseenter=${() => this.preview(chip.preview ?? null)}
      @mouseleave=${() => this.preview(null)}
      @click=${chip.onClick}
    >${chip.label}${chip.jitOnly ? html`<span class="acp-star">*</span>` : nothing}</button>`;
  }

  // ─── State and intents ─────────────────────────────────────────────────────

  private get literal(): string {
    return this.target?.literal ?? '';
  }

  /** The animation state of the selection, plus the switches flipped before anything was applied. */
  private animationState(): IAnimationState {
    return { ...readAnimationState(this.literal), ...this.pendingState };
  }

  /** Same rule as every other chip: a class with no rule in the built css and no JIT does nothing. */
  private availability(group: IAnimationGroup, option: IAnimationOption, isOn: boolean, state: IAnimationState) {
    const classes = option.classes.map((cls) => buildAnimationClass(cls, group.kind, state));
    return chipAvailability(isOn, classes.every((cls) => this.builtClasses.has(cls)), this.jitLive);
  }

  private goTo(screen: AnimationScreen): void {
    this.screen = screen;
    this.customEditing = null;
    this.preview(null);
  }

  private applyState(key: AnimationStateKey, value: string): void {
    const resolved = key === 'motionSafe' ? value === 'true' : value;
    this.pendingState = { ...this.pendingState, [key]: resolved };
    const next = applyAnimationState(this.literal, key, value);
    if (next === this.literal) {
      // Nothing on the element to rewrite yet: the choice is remembered for the next chip.
      this.requestUpdate();
      return;
    }
    const what = key === 'motionSafe'
      ? t(value === 'true' ? 'status.motionSafeOn' : 'status.motionSafeOff')
      : value;
    this.applyLiteral(next, what);
  }

  private applyCascadeStep(step: number, children: number): void {
    if (readCascade(this.literal).step === step) {
      this.applyLiteral(removeCascade(this.literal), t('status.cascadeRemoved'));
      return;
    }
    const result = applyCascade(this.literal, step, children, this.animationState());
    this.applyLiteral(result.literal, result.dropped > 0
      ? t('status.cascadePartial', { step, count: result.applied })
      : t('status.cascadeApplied', { step }));
  }

  private commitCustom(groupId: string): void {
    const input = this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null;
    if (!input) return;
    if (input.value.trim() === '' || !Number.isFinite(Number(input.value))) {
      this.status(t('status.needNumber'));
      return;
    }
    const result = applyAnimationCustom(this.literal, groupId, Number(input.value), this.animationState());
    if (!result) return;
    this.customEditing = null;
    const group = ANIMATION_GROUPS.find((candidate) => candidate.id === groupId);
    this.applyLiteral(result.literal, `${t(group?.title ?? '')} ${result.value}${group?.custom?.unit ?? ''}`);
  }

  private commitTyped(token: IUtilityToken, spec: ITypedValueSpec): void {
    const input = this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null;
    if (!input) return;
    if (input.value.trim() === '' || !Number.isFinite(Number(input.value))) {
      this.status(t('status.needNumber'));
      return;
    }
    const next = applyTypedValue(this.literal, token, Number(input.value), spec);
    this.typedEditing = null;
    this.applyLiteral(next, `${token.raw} → ${splitUtilities(next)[token.index]?.raw ?? ''}`);
  }

  /** Enter applies, Escape cancels — contained, exactly like the animations input. */
  private onTypedKeydown = (e: KeyboardEvent): void => {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      const token = splitUtilities(this.literal).find((candidate) => candidate.index === this.typedEditing);
      const spec = token ? typedValueSpec(token, utilityOptions(token).kind) : null;
      if (token && spec) this.commitTyped(token, spec);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.typedEditing = null;
    }
  };

  private focusTypedSoon(): void {
    void this.updateComplete.then(() => {
      (this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null)?.focus();
    });
  }

  /**
   * Enter applies, Escape cancels — and the event stops here.
   *
   * The editor is armed while this panel is open: without the containment the page (and the shell's
   * shortcuts) would see every keystroke typed into the field.
   */
  private onCustomKeydown = (e: KeyboardEvent): void => {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitCustom(this.customEditing ?? '');
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.customEditing = null;
    }
    void input;
  };

  private focusCustomSoon(): void {
    void this.updateComplete.then(() => {
      (this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null)?.focus();
    });
  }

  private applyLiteral(literal: string, what: string): void {
    if (literal === this.literal) return;
    this.preview(null);
    this.dispatchEvent(new CustomEvent<IPickerApply>('picker-apply', {
      detail: { literal, what },
      bubbles: true,
      composed: true,
    }));
  }

  /** The editor owns the element, so it owns the preview: the panel only says WHAT to show. */
  private preview(optionId: string | null): void {
    if (optionId && !animationOption(optionId)) return;
    this.emitPreview(optionId ? { option: optionId } : null);
  }

  /** The other kind of preview: a whole class attribute, which is what a paste produces. */
  private previewLiteral(literal: string | null): void {
    this.emitPreview(literal === null || literal === this.literal ? null : { literal });
  }

  private emitPreview(detail: IPickerPreview | null): void {
    this.dispatchEvent(new CustomEvent<IPickerPreview | null>('picker-preview', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  private status(message: string): void {
    this.dispatchEvent(new CustomEvent('picker-status', { detail: message, bubbles: true, composed: true }));
  }

  private onClose = (): void => {
    this.preview(null);
    this.dispatchEvent(new CustomEvent('picker-close', { bubbles: true, composed: true }));
  };
}

declare global {
  interface HTMLElementTagNameMap {
    'aura--studio--class-picker-102020': ClassPickerPanel;
  }
}
