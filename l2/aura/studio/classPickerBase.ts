/// <mls fileReference="_102020_/l2/aura/studio/classPickerBase.ts" enhancement="_blank" />
// What the two class pickers SHARE: everything inside the panel.
//
// There are two pickers — the floating one (classPickerPanel), pinned over the app region, and the one
// docked in the Pages plugin (pageClassPickerPanel). They were copies of ~1.500 lines that differed only
// in their chrome: the header and its toolbar, the empty state and the way to switch between them.
// Every change had to be made twice, and the last three tasks did it by script. Now the content lives
// here once, and each panel is a subclass that brings its own chrome (`renderChrome`), its own empty
// state (`renderEmpty`) and its own .less.
//
// THE SPLIT WITH THE EDITOR
// The editor stays the brain — selection, structural anchoring, writing to the model, live update. The
// panel owns the VOCABULARY and the UI: it computes the new class attribute with the pure core and
// emits it. Nothing here knows what a Monaco model is.
//
//   editor --(target/builtClasses/dsRoles/jitLive)--> <picker>
//          <--(picker-apply | picker-preview | picker-close)--
//
// LIGHT DOM, on the project's own base (StateLitElement), in the same document as the client page: every
// class carries the `acp-` prefix (see classPickerPanel.less for the measurement that made that
// non-negotiable). No .less of its own — the subclass's is what styles all of this.

import { html, nothing, type TemplateResult } from 'lit';
import { property, state } from 'lit/decorators.js';
import { StateLitElement } from '/_102029_/l2/stateLitElement.js';
import { getState, subscribe, unsubscribe } from '/_102029_/l2/collabState.js';
import { getActualLanguage, getAuraState } from '/_102020_/l2/aura/helpers/auraState.js';
import { combinationName } from '/_102020_/l2/aura/helpers/pageCombination.js';
import { currentLanguage, describePageFolder } from '/_102020_/l2/aura/studio/studioEditTarget.js';
import {
  ANIMATION_GROUPS,
  CASCADE_MAX_CHILDREN,
  CASCADE_STEPS,
  activeAnimationGroups,
  activeAnimations,
  animationOption,
  animationScreen,
  animationTokens,
  applyAnimationCustom,
  applyAnimationGroup,
  applyAnimationOption,
  applyAnimationState,
  applyCascade,
  applyTypedValue,
  addUtility,
  addableProperties,
  INSPECTOR_GROUPS,
  inspectorGroupOf,
  inspectorGroupOfProperty,
  type InspectorGroup,
  addableProperty,
  buildAnimationClass,
  chipAvailability,
  classesInCategories,
  colorOf,
  diffLiterals,
  newRoleOptions,
  pasteCategories,
  pasteStyle,
  pasteStyleInto,
  readAnimationCustom,
  readAnimationState,
  readCascade,
  readTypedValue,
  removeAnimationCustom,
  removeCascade,
  removeUtility,
  replaceUtility,
  toggleImportant,
  classToAdd,
  importantInChannel,
  typedValueSpec,
  roleLabel,
  roleVar,
  splitUtilities,
  utilityLabel,
  utilityOptions,
  type AnimationScreen,
  type IAnimationRow,
  type IAnimationScreenSpec,
  type ClassChannel,
  type AnimationStateKey,
  type IAddableProperty,
  type ITypedValueSpec,
  type IAnimationGroup,
  type IAnimationOption,
  type IAnimationState,
  type IUtilityToken,
} from '/_102020_/l2/aura/studio/studioClassEdit.js';
import { isCoreElementTag } from '/_102020_/l2/aura/studio/studioAdoptEdit.js';
import { planPropTransfer, snapshotProps, type IMoleculePropRow, type IPropSnapshot, type PropValue } from '/_102020_/l2/aura/studio/studioMoleculeProps.js';
import { t, tr, type IMessageRef } from '/_102020_/l2/aura/studio/studioMessages.js';

/**
 * How long a breadcrumb label may be before it is cut.
 *
 * The row scrolls, so this is not about the panel's width: it is about one long level (a molecule tag
 * is `molecules--ml-scenary-102020`) pushing every other level out of reach of the eye. The whole
 * name is in the tooltip, and the hover shows the element itself.
 */
const CHAIN_LABEL_MAX = 10;

/** A category of the Animations tab: the detail screen whose rows it shows. */
interface IAnimationCategory {
  id: string;
  title: string;
  screen: AnimationScreen;
}

/**
 * The Animations tab, in order: what happens when the element
 * appears, what loops, what answers the mouse, and the tuning that applies to all of them.
 */
const ANIMATION_CATEGORIES: readonly IAnimationCategory[] = [
  { id: 'entrance', title: 'anim.cat.entrance', screen: 'entrance' },
  { id: 'continuous', title: 'anim.cat.continuous', screen: 'continuous' },
  { id: 'hover', title: 'anim.cat.hover', screen: 'hover' },
  { id: 'advanced', title: 'anim.cat.advanced', screen: 'advanced' },
];

/** A label cut to fit, with the ellipsis that says it was cut. The full text goes in a tooltip. */
export function ellipsize(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max)}…` : text;
}

/** A configuration value in a sentence: `—` when there is none. */
function propText(value: PropValue | null): string {
  return value === null || value === '' ? '—' : String(value);
}

/** Which row an open input belongs to: a molecule has two sections, and token indexes repeat across them. */
function sideKey(side: IPickerSide, token: IUtilityToken): string {
  return `${sideId(side)}:${token.index}`;
}

/** Which section: the tag, the inside, or one slot — the handle of the open "+". */
function sideId(side: IPickerSide): string {
  return side.slot === undefined ? side.channel : `slot${side.slot}`;
}

/**
 * The two icons of duplicate and remove.
 *
 * NOT `⧉`, which is already the copy-STYLE icon two buttons away: the same glyph for two
 * different operations in the same row is worse than an unfamiliar one. `⎘` (next page) reads as
 * "one more of these" and `⌦` (erase to the right) is not the panel's `×` (close).
 */
const DUPLICATE_ICON = '⎘';
const REMOVE_ICON = '⌦';

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
 * One level of the selection's ancestor chain.
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
 * A text the selection carries in an ATTRIBUTE.
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

/** A molecule's `data-class`: its literal and whether it can be written. */
export interface IPickerInner {
  literal: string;
  editable: boolean;
  refusal?: IMessageRef;
  warning?: IMessageRef;
  /** Same meaning as IPickerTarget.canRemoveLast, for this attribute. */
  canRemoveLast: boolean;
}

/**
 * One section of the classes tab: which attribute, what it holds, whether it writes.
 *
 * Captured by every handler of the section — two sections render at once, so "the" literal of the
 * panel is not enough to know where a click lands.
 */
export interface IPickerSide {
  channel: ClassChannel;
  literal: string;
  editable: boolean;
  canRemoveLast: boolean;
  /** Position in IPickerTarget.slots when this section is a molecule's slot. */
  slot?: number;
}

/**
 * One of a molecule's slots present in the page (`<Label>`, `<Column>`), through its `data-class`.
 * The molecule hides it and applies the class to what it renders
 * for that slot.
 */
export interface IPickerSlot {
  /** The slot tag as the molecule declares it. */
  name: string;
  /** 1-based among the slots of the same name. */
  index: number;
  /** More than one slot of this name — the label carries the index. */
  repeated: boolean;
  /** How many slots it is nested in (`TableHead` in `TableRow` in `TableHeader` = 2) — the tree's indent. */
  depth: number;
  /** The slot's own text, cut short ("Paciente") — what tells `TableHead 2` from `TableHead 3`. */
  hint: string;
  /**
   * The ways it can move among its same-name siblings — only when its group declares it in `slotOrder`
   * and the editor's planner already said yes. Empty = no arrows.
   */
  moves: ('up' | 'down')[];
  literal: string;
  editable: boolean;
  refusal?: IMessageRef;
  warning?: IMessageRef;
  canRemoveLast: boolean;
}

/** What the panel asks the editor to move: one slot, by position in IPickerTarget.slots. */
export interface IPickerSlotMove {
  slot: number;
  direction: 'up' | 'down';
}

/** What the editor knows about the selection and the panel needs to render it. */
export interface IPickerTarget {
  /** Tag of the selected element, for the header. */
  tag: string;
  /**
   * A molecule's INNER box, through its `data-class` — absent for anything that is not a molecule.
   *
   * The classes tab then has two sections: the tag (`literal`, the box the parent lays out) and the
   * inside (this, the box the user sees). The animations tab and copy/paste act on this one.
   */
  inner?: IPickerInner;
  /** A molecule's slots present in the page; empty for anything else. */
  slots: IPickerSlot[];
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
  /**
   * Whether the element can be duplicated and removed.
   *
   * Answered by the real planners, like the move's — and the NOTES are what the user has to know
   * before clicking duplicate: how many copies a repeated node makes, and the id the copy carries.
   * Neither is visible afterwards.
   */
  canDuplicate: boolean;
  canRemove: boolean;
  duplicateReason?: IMessageRef;
  removeReason?: IMessageRef;
  duplicateNotes: IMessageRef[];
}

/**
 * One molecule the user may adopt.
 *
 * The `tag` is the catalog's, verbatim — the panel never builds one, and the editor writes exactly
 * what it is handed back.
 */
export interface IPickerAdoptOption {
  tag: string;
  variant: string;
  /** First line of the molecule's objective — what tells two siblings of a group apart. */
  objective: string;
  /** The one the project's design system resolves for this group. */
  chosen: boolean;
}

/**
 * The Molecules tab, as the editor answers it.
 *
 * Everything here is decided BEFORE the gesture, with the real converter: what would be replaced,
 * what the conversion recognised, what it warns about and why it cannot happen. A tab that offers
 * [Adotar] is a tab that writes.
 */
export interface IPickerAdopt {
  /** The catalog is 155 files through collabImport: the first opening of the tab pays for it. */
  loading: boolean;
  group?: string;
  why?: IMessageRef;
  /** The element that would be replaced — `lifted` when it is not the one that was clicked. */
  replaces?: { tag: string; lifted: boolean };
  options: IPickerAdoptOption[];
  /** Tag currently chosen in the list (the DS's, until the user changes it). */
  current?: string;
  /** What the converter recognised: the label, the icon, the tone, how many items, the events. */
  parts?: { label?: string; icon?: string; variant?: string; items?: number; events: Record<string, string> };
  warnings: IMessageRef[];
  /** Why [Adotar] is off. Present means the conversion was refused, not that it was not tried. */
  refusal?: IMessageRef;
  /** The markup that would be written — shown, because a rewrite of the page should not be blind. */
  markup?: string;
  /**
   * Why there is no group, when there is none.
   *
   * "No group claims this element" is one of four possible facts and the only one that is about the
   * element; the others are about the catalog, the conversion files or this screen's file. Without
   * this the tab told the user to look at their markup for a problem that was ours.
   */
  noneReason?: IMessageRef;
}

/**
 * The Properties tab, as the editor answers it.
 *
 * Absent until the tab is opened: the group's configuration is a module of its own, and the molecule's
 * `.defs.ts` is what names the group.
 */
export interface IPickerProps {
  loading: boolean;
  group?: string;
  /** The rows, already decided by studioMoleculeProps — the panel only renders them. */
  rows: IMoleculePropRow[];
  /** Why the tab is empty (no group found, nothing editable). */
  why?: IMessageRef;
  /** Why nothing here writes (the element is not located, it lives in another project's file). */
  refusal?: IMessageRef;
}

/** What the panel asks the editor to write into a molecule's configuration attribute. */
export interface IPickerPropEdit {
  attribute: string;
  /** Null goes back to the default — the attribute leaves the source. */
  value: PropValue | null;
}

/** What the panel asks the editor to write. */
export interface IPickerApply {
  literal: string;
  /** Which attribute the literal is for; `class` when absent. */
  attribute?: ClassChannel;
  /** Which of the molecule's slots, when the write is a slot's `data-class`. */
  slot?: number;
  /** Already-translated description for the status line (it mixes class names and words). */
  what: string;
}

/** What the panel asks the editor to SHOW for a moment, without writing anything. */
export interface IPickerPreview {
  /** An animation option: shown, replayed if it is an entrance, and undone on its own. */
  option?: string;
  /** A whole class attribute — what a paste would produce. Held while the pointer stays. */
  literal?: string;
  /** Which attribute `literal` goes into; `class` when absent. */
  attribute?: ClassChannel;
  /** Which of the molecule's slots `literal` goes into, when it is a slot's. */
  slot?: number;
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
  /** Which part the classes were read from: a plain element, a molecule's tag or inside, or one of its slots. */
  part: 'element' | 'tag' | 'inner' | 'slot';
  /** The slot's NAME when it came from one — what a paste looks for in the next molecule. */
  slot?: string;
  /** A molecule's properties, as copied (see snapshotProps); absent for a slot or a plain element. */
  props?: IPropSnapshot[];
  /** Copied before the properties were read: asked for, and filled in when they arrive. */
  propsPending?: boolean;
}

/** A paste that writes more than once: several class attributes (every slot of a name) and/or properties. */
export interface IPickerPaste {
  literals: { literal: string; attribute: ClassChannel; slot?: number }[];
  props: IPickerPropEdit[];
  /** Already-translated description for the status line and the undo label. */
  what: string;
}

/** One way to paste, as the ⋯ menu offers it. */
interface IPasteOption {
  label: string;
  title: string;
  detail?: unknown;
  literals: IPickerPaste['literals'];
  props: IPickerPropEdit[];
  what: string;
}

/**
 * The panel's content, for both pickers. Abstract: a subclass registers the tag and draws the chrome.
 */
export abstract class ClassPickerBase extends StateLitElement {
  @property({ attribute: false }) target?: IPickerTarget;
  /** Classes with a rule in the BUILT css — what the client will actually render. */
  @property({ attribute: false }) builtClasses: Set<string> = new Set<string>();
  @property({ attribute: false }) dsRoles: string[] = [];
  @property({ attribute: false }) resolveVar: (cssVar: string) => string = () => '';
  @property({ type: Boolean }) jitLive = false;
  /** The Molecules tab's answer; absent until the tab is opened (the catalog is not cheap). */
  @property({ attribute: false }) adopt?: IPickerAdopt;
  /**
   * The molecule MOUNTED, for real, by the editor — held as a node and not as markup.
   *
   * It is the one preview of this panel that cannot be faked: the tag does not exist in the page's
   * compiled class, so there is nothing on screen to restyle. Importing the module defines the
   * element, and what is rendered here is the real thing with the real content — which also proves,
   * before anything is written, that the tag exists and loads.
   */
  @property({ attribute: false }) adoptPreview: HTMLElement | null = null;
  /** The Properties tab's answer; absent until the tab is opened. */
  @property({ attribute: false }) props?: IPickerProps;

  @state() private tab: 'classes' | 'animations' | 'info' | 'molecules' | 'props' = 'classes';
  /** Group whose "custom value" input is open. */
  @state() private customEditing: string | null = null;
  /** Token index whose role palette is expanded. */
  @state() private roleEditing: string | null = null;
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
  /** Groups of the Style tab the user folded or opened, by section and subject; unset = by content. */
  @state() private groupsOpen: Record<string, boolean> = {};
  /** Property whose design-system palette is open in the "+" (colour does not seed a value). */
  @state() private addColor: string | null = null;
  /** Which section's "+" is open — a molecule has several (its inside, its tag, its slots). */
  @state() private addChannel = 'class';
  /**
   * Which part of a molecule the Style tab edits: its inside
   * (`data-class`), its tag (`class`) or one of its slots, by index in `target.slots`. One at a time —
   * the stacked sections were the clutter.
   */
  @state() private editPart: 'inner' | 'tag' | number = 'inner';
  /** The slot tree under the part selector is open. */
  @state() private slotTreeOpen = false;
  /** Repeated slots (`TableHead ×5`) whose items are showing in the tree, by group key. */
  @state() private slotGroupsOpen: string[] = [];
  /** The ⋯ menu of the chrome is open. */
  @state() private menuOpen = false;
  /** Token index whose typed-value input is open. */
  @state() private typedEditing: string | null = null;
  /** State keys the scenario panel is currently simulating — see renderScenarioBadge. */
  @state() private simulatedKeys: string[] = [];
  /** Which catalog key the user chose for an ambiguous attribute text, by attribute. */
  @state() private textKeys: Record<string, string> = {};
  /** Last value asked for per attribute — the guard against Enter and blur writing twice. */
  protected lastSent: Record<string, string> = {};
  /** Same guard, for the fields of the Properties tab, by attribute. */
  protected propSent: Record<string, string> = {};
  /**
   * The remove button, armed by the first click.
   *
   * Removing is the only gesture of the L3 whose undo does not outlive the session, so it is the only
   * one that asks — and it asks in the button itself, not in a `confirm()` the browser owns.
   */
  @state() private confirmRemove = false;

  // The looks live in each SUBCLASS's .less, compiled into its constructor by the enhancement
  // (processCssLit -> loadStyle): classPickerPanel.less for the floating one, pageClassPickerPanel.less
  // for the docked one. Both style every class this file renders.


  // ─── Lifecycle ─────────────────────────────────────────────────────────────

  protected static readonly SCENARIO_KEY = 'aura.scenario.simulated';

  connectedCallback(): void {
    super.connectedCallback();
    this.readScenario();
    subscribe(ClassPickerBase.SCENARIO_KEY, this);
  }

  disconnectedCallback(): void {
    unsubscribe(ClassPickerBase.SCENARIO_KEY, this);
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
    if (key === ClassPickerBase.SCENARIO_KEY) this.readScenario();
  }

  protected readScenario(): void {
    const simulated = getState(ClassPickerBase.SCENARIO_KEY) as string[] | undefined;
    this.simulatedKeys = Array.isArray(simulated) ? simulated : [];
  }

  protected willUpdate(changed: Map<string, unknown>): void {
    // A new selection drops what belonged to the previous one: a switch nobody applied yet, and any
    // expanded list, which would otherwise open on an element that never asked for it.
    const previous = changed.get('target') as IPickerTarget | undefined;
    if (changed.has('target') && previous
      && (previous.literal !== this.target?.literal || previous.inner?.literal !== this.target?.inner?.literal)) {
      this.customEditing = null;
      this.typedEditing = null;
      // The "+" is answered by what the element already has, and that just changed.
      this.addColor = null;
    }
    if (changed.has('target') && previous?.tag !== this.target?.tag) {
      // A new element starts on the box the user sees.
      this.editPart = 'inner';
      this.slotTreeOpen = false;
      this.slotGroupsOpen = [];
      this.groupsOpen = {};
      this.pendingState = {};
      this.roleEditing = null;
    }
    // A new selection is a new question for the Molecules tab, and the editor only answers when
    // asked. The trigger is the ABSENCE of an answer and not a changed literal: the editor drops its
    // answer whenever the selected element changes, and two different elements can carry the same
    // class attribute. It cannot loop — an answer of "nothing candidates" is still an answer.
    if (changed.has('target') && this.tab === 'molecules' && !this.adopt) this.openTab('molecules');
    // The tab the selection just left has to stop being the open one: a molecule has no Molecules
    // tab, and staying on it would show a panel with no tab highlighted.
    if (changed.has('target') && this.tab === 'molecules' && !this.isCoreElement) this.tab = 'classes';
    // The Properties tab, the same two rules the other way round: it asks again for a new molecule,
    // and it is not there for anything that is not one.
    if (changed.has('target') && this.tab === 'props' && !this.isMolecule) this.tab = 'classes';
    if (changed.has('target') && this.tab === 'props' && !this.props) this.openTab('props');
    if (changed.has('target') && previous?.tag !== this.target?.tag) this.propSent = {};
    // The arming never survives a render: whatever else changed, the second click has to be a
    // deliberate second click on the same element.
    if (changed.has('target')) this.confirmRemove = false;
    // Nor does the menu: every action in it ends in a write, and the write answers with a new target.
    if (changed.has('target')) this.menuOpen = false;
    // A slot that is no longer there (the page was rebuilt) is not a part to stay on.
    if (typeof this.editPart === 'number' && !this.target?.slots[this.editPart]) this.editPart = 'inner';
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
    this.syncClipboardProps(changed);
    if (!changed.has('target')) return;
    const row = this.renderRoot.querySelector('.acp-chain');
    if (row) row.scrollLeft = row.scrollWidth;
  }


  /**
   * The copied style and the properties, which are read on demand (the Properties tab is paid when
   * asked for): a copy made before they were read gets them when they arrive — unless the selection
   * moved to another tag meanwhile, and then the copy keeps the classes only. A molecule about to be
   * pasted into needs ITS rows to decide what fits, so they are asked for too.
   */
  protected syncClipboardProps(changed: Map<string, unknown>): void {
    const clip = this.clipboard;
    if (!clip) return;
    const previous = changed.get('target') as IPickerTarget | undefined;
    if (clip.propsPending) {
      if (changed.has('target') && previous && previous.tag !== this.target?.tag) {
        this.clipboard = { ...clip, propsPending: false };
      } else if (this.props && !this.props.loading) {
        this.clipboard = { ...clip, props: snapshotProps(this.props.rows), propsPending: false };
      }
      return;
    }
    if (clip.props?.length && this.isMolecule && !this.props) this.requestProps();
  }

  /** Ask the editor for the molecule's properties without opening the tab. */
  protected requestProps(): void {
    this.dispatchEvent(new CustomEvent('picker-props-open', { bubbles: true, composed: true }));
  }

  /**
   * The panel's own chrome — the tag, the actions, the way to the other picker and the close.
   *
   * The one part the two pickers draw differently: one row pinned over the app, or a header plus a
   * toolbar in the side panel.
   */
  protected abstract renderChrome(target: IPickerTarget): unknown;

  /** What shows with nothing selected. The floating picker is hidden then; the docked one says so. */
  protected renderEmpty(): unknown {
    return nothing;
  }

  render() {
    const target = this.target;
    if (!target) return this.renderEmpty();

    return html`
      ${this.renderChrome(target)}
      ${this.renderChain(target)}
      ${this.renderTexts(target)}
      ${this.renderClipboardBar()}
      <div class="acp-tabs">
        ${this.tabButton('classes', 'panel.tabStyle')}
        ${this.tabButton('animations', 'panel.tabAnimations', animationTokens(this.mainSide.literal).owned.length)}
        ${this.isCoreElement ? this.tabButton('molecules', 'panel.tabComponent') : nothing}
        ${this.isMolecule ? this.tabButton('props', 'panel.tabComponent') : nothing}
        <span class="acp-spacer"></span>
        <button type="button" class="acp-tab acp-tab-icon ${this.infoOpen ? 'acp-active' : ''}"
          title=${t('panel.tabInfo')} aria-label=${t('panel.tabInfo')}
          @click=${() => { this.tab = 'info'; this.preview(null); }}><i class="fa-solid fa-circle-info" aria-hidden="true"></i></button>
      </div>
      ${this.showsTopNotes ? this.renderNotes(target.refusal, target.warning) : nothing}
      ${this.tab === 'animations' ? this.renderAnimations() : nothing}
      ${this.tab === 'molecules' ? this.renderMolecules() : nothing}
      ${this.tab === 'props' ? this.renderProps() : nothing}
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
  protected renderChain(target: IPickerTarget) {
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
  protected levelLabel(level: IPickerLevel): string {
    return ellipsize(level.tag, CHAIN_LABEL_MAX);
  }

  /** What the level does, and under it the class attribute the label deliberately does not show. */
  protected levelTitle(level: IPickerLevel, id: string): string {
    const what = t(id, { tag: level.tag });
    return level.literal ? `${what}\n${level.literal}` : what;
  }

  /** The panel asks for a level by index; the editor owns the elements and resolves it. */
  protected emitLevel(index: number): void {
    this.preview(null);
    this.dispatchEvent(new CustomEvent<number>('picker-level', {
      detail: index, bubbles: true, composed: true,
    }));
  }

  /** Hovering a level marks it on screen — `null` when the pointer leaves. */
  protected emitLevelHover(index: number | null): void {
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
  protected renderTexts(target: IPickerTarget) {
    if (!target.texts.length) return nothing;
    return html`<div class="acp-texts">
      ${target.texts.map((text) => this.renderText(text))}
    </div>`;
  }

  protected renderText(text: IPickerText) {
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
  protected textKey(text: IPickerText): string {
    if (text.keys.length === 1) return text.keys[0];
    const chosen = this.textKeys[text.attribute];
    return chosen && text.keys.includes(chosen) ? chosen : '';
  }

  /** Enter applies, Escape gives up — the same contract as every other field of this panel. */
  protected onTextKeydown = (e: KeyboardEvent, text: IPickerText): void => {
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
  protected commitText(text: IPickerText, input: HTMLInputElement): void {
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
  protected moveButton(direction: 'up' | 'down') {
    const can = direction === 'up' ? this.target?.canMoveUp : this.target?.canMoveDown;
    const reason = direction === 'up' ? this.target?.moveUpReason : this.target?.moveDownReason;
    return this.menuItem({
      icon: direction === 'up' ? '\u2191' : '\u2193',
      label: t(direction === 'up' ? 'panel.menuMoveUp' : 'panel.menuMoveDown'),
      title: can ? t(`panel.move${direction === 'up' ? 'Up' : 'Down'}`) : (tr(reason) || t('panel.moveNo')),
      disabled: !can,
      onClick: () => this.dispatchEvent(new CustomEvent(`picker-move-${direction}`, { bubbles: true, composed: true })),
    });
  }

  /**
   * Duplicate the element: one more of these, right after it.
   *
   * The notes travel in the tooltip because they are the whole difference between a useful gesture
   * and a surprise: a node inside a `.map()` makes N copies, and a copy carries the same `id`.
   */
  protected duplicateButton() {
    const can = this.target?.canDuplicate ?? false;
    const notes = (this.target?.duplicateNotes ?? []).map((note) => tr(note)).filter(Boolean);
    const title = can
      ? [t('panel.duplicate'), ...notes].join(' · ')
      : (tr(this.target?.duplicateReason) || t('panel.duplicateNo'));
    return this.menuItem({
      icon: DUPLICATE_ICON,
      label: t('panel.menuDuplicate'),
      title,
      disabled: !can,
      noted: notes.length > 0,
      onClick: () => this.dispatchEvent(new CustomEvent('picker-duplicate', { bubbles: true, composed: true })),
    });
  }

  /**
   * Remove the element — in TWO clicks.
   *
   * The first arms it, the second writes. It is the only gesture here that asks, and the reason is
   * not that it is dangerous in the file (the undo is exact) but that the undo lives in this
   * session's memory: close the Studio and the markup is gone from the source.
   */
  protected removeElementButton() {
    const can = this.target?.canRemove ?? false;
    if (!can) {
      return this.menuItem({
        icon: REMOVE_ICON, label: t('panel.menuRemove'),
        title: tr(this.target?.removeReason) || t('panel.removeNo'), disabled: true, onClick: () => undefined,
      });
    }
    // The first click ARMS and keeps the menu open — the second, on the same line, is what writes.
    return this.menuItem({
      icon: REMOVE_ICON,
      label: t(this.confirmRemove ? 'panel.menuRemoveConfirm' : 'panel.menuRemove'),
      title: this.confirmRemove ? t('panel.removeConfirm') : t('panel.remove'),
      danger: this.confirmRemove,
      keepOpen: true,
      onClick: this.onRemoveElement,
    });
  }

  /** First click arms, second writes. Nothing else on this panel needs two clicks. */
  protected onRemoveElement = (): void => {
    if (!this.confirmRemove) {
      this.confirmRemove = true;
      return;
    }
    this.confirmRemove = false;
    this.menuOpen = false;
    this.dispatchEvent(new CustomEvent('picker-remove', { bubbles: true, composed: true }));
  };

  /**
   * Undo or redo, with the name of what it would do in the tooltip.
   *
   * Disabled is the honest state when the stack is empty — and the shortcut (Ctrl+Z) does the same
   * thing, so this is a reminder as much as a button.
   */
  protected historyButton(direction: 'undo' | 'redo') {
    const what = (direction === 'undo' ? this.target?.undo : this.target?.redo) ?? '';
    return html`<button type="button" class="acp-history" ?disabled=${!what}
      title=${what ? t(`panel.${direction}Of`, { what }) : t(`panel.${direction}`)}
      @click=${() => this.dispatchEvent(new CustomEvent(`picker-${direction}`, { bubbles: true, composed: true }))}
    >${direction === 'undo' ? '\u21B6' : '\u21B7'}</button>`;
  }

  /**
   * Whether the element's refusal and warning go above the tabs.
   *
   * They are the TAG's — the element as the page wrote it. In the Style tab of a molecule each part
   * shows its own instead (renderClasses), so the tag's never sits on top of the inside's rows; and the
   * Properties tab answers for itself.
   */
  protected get showsTopNotes(): boolean {
    if (this.tab === 'props') return false;
    return !((this.tab === 'classes' || this.tab === 'animations') && this.innerSide);
  }

  /** The chosen part's refusal and warning (and, for a repeated slot, that it repeats). */
  protected renderPartNotes() {
    const part = this.editPart;
    const slot = typeof part === 'number' ? this.target?.slots[part] : undefined;
    if (slot) {
      return html`${this.renderNotes(slot.refusal, slot.warning)}
        ${slot.repeated ? html`<div class="acp-note">${t('panel.slotRepeatedNote')}</div>` : nothing}`;
    }
    if (part === 'tag') return this.renderNotes(this.target?.refusal, this.target?.warning);
    return this.renderNotes(this.target?.inner?.refusal, this.target?.inner?.warning);
  }

  /** The Info tab is the one showing — it is an icon at the end of the tab row, not a named tab. */
  protected get infoOpen(): boolean {
    return this.tab === 'info';
  }

  /** A refusal and a warning, each only when there is one. */
  protected renderNotes(refusal?: IMessageRef, warning?: IMessageRef) {
    return html`${refusal ? html`<div class="acp-note acp-refusal">${tr(refusal)}</div>` : nothing}
      ${warning ? html`<div class="acp-note acp-warning">${tr(warning)}</div>` : nothing}`;
  }

  protected tabButton(id: 'classes' | 'animations' | 'info' | 'molecules' | 'props', label: string, count = 0) {
    return html`<button type="button" class="acp-tab ${this.tab === id ? 'acp-active' : ''}"
      @click=${() => { this.tab = id; this.preview(null); this.openTab(id); }}>${t(label)}${count
  ? html`<span class="acp-tab-count">${count}</span>`
  : nothing}</button>`;
  }

  /**
   * Whether the selection is a CORE html element — the only thing that can be adopted.
   *
   * A tag with a hyphen is a custom element by the html spec, which here means a molecule (or some
   * other web component). Adopting one would be swapping a molecule for a molecule: a different
   * operation, with a different question (which VARIANT of the group), and that one already has a
   * home in the genome's molecule knob. So the tab is not disabled for those — it is not there,
   * because an absent tab asks nothing.
   */
  protected get isCoreElement(): boolean {
    return isCoreElementTag(this.target?.tag ?? '');
  }

  /**
   * Opening the Molecules tab is what ASKS for the catalog.
   *
   * Never on arming the editor and never on selecting an element: `buildMoleculeCatalog` imports ~155
   * `.defs.ts` through collabImport. It is cached afterwards, but the first read has to be paid by
   * someone who asked for it.
   */
  protected openTab(id: 'classes' | 'animations' | 'info' | 'molecules' | 'props'): void {
    // The Properties tab is paid the same way: the group's configuration is read when it is asked for.
    if (id === 'props') this.dispatchEvent(new CustomEvent('picker-props-open', { bubbles: true, composed: true }));
    if (id !== 'molecules') return;
    this.dispatchEvent(new CustomEvent('picker-adopt-open', { bubbles: true, composed: true }));
  }

  /** Whether the selection is a molecule — the one thing with configuration attributes to edit. */
  protected get isMolecule(): boolean {
    return Boolean(this.target?.inner);
  }

  // ─── Properties tab ───────────────

  /**
   * The molecule's configuration attributes, one control per type.
   *
   * Everything here was decided by studioMoleculeProps: which rows, which values, which are read-only
   * and why. The tab renders and emits `picker-prop` — the docked panel does exactly the same.
   */
  protected renderProps() {
    const props = this.props;
    if (!props || props.loading) {
      return html`<div class="acp-rows"><div class="acp-block">
        <span class="acp-reason">${t('panel.propsLoading')}</span></div></div>`;
    }
    const editable = !props.refusal;
    return html`
      ${props.refusal ? html`<div class="acp-note acp-refusal">${tr(props.refusal)}</div>` : nothing}
      <div class="acp-rows">
        ${props.rows.length
    ? props.rows.map((row) => this.renderPropRow(row, editable))
    : html`<div class="acp-block"><span class="acp-reason">${tr(props.why)
      || t('panel.propsNone', { group: props.group ?? '' })}</span></div>`}
      </div>`;
  }

  protected renderPropRow(row: IMoleculePropRow, editable: boolean) {
    const head = html`<span class="acp-label" title=${row.attribute}>${row.label}</span>`;
    if (row.source === 'expression') {
      return html`<div class="acp-block acp-readonly">${head}<span class="acp-reason">${tr(row.reason)}</span></div>`;
    }
    return html`<div class="acp-block ${editable ? '' : 'acp-readonly'}">${head}
      ${this.renderPropControl(row, editable)}
      ${row.source === 'absent'
    ? html`<span class="acp-reason">${t('panel.propDefault', { value: propText(row.default) })}</span>`
    : editable && row.type !== 'enum' && row.type !== 'boolean'
      ? html`<button type="button" class="acp-link" title=${t('panel.propResetHint')}
          @click=${() => this.emitProp(row, null)}>${t('panel.propReset', { value: propText(row.default) })}</button>`
      : nothing}
    </div>`;
  }

  /** Chips for a closed list, a switch for a boolean, a field for the rest. */
  protected renderPropControl(row: IMoleculePropRow, editable: boolean) {
    if (row.type === 'enum') {
      return html`<span class="acp-chips">${(row.values ?? []).map((value) => html`<button type="button"
        class="acp-chip ${value === String(row.value) ? 'acp-current' : ''}"
        title=${value === String(row.default) ? t('panel.propIsDefault') : value}
        ?disabled=${!editable || value === String(row.value)}
        @click=${() => this.emitProp(row, value)}>${value}${value === String(row.default)
  ? html`<span class="acp-star">*</span>` : nothing}</button>`)}</span>`;
    }
    if (row.type === 'boolean') {
      return html`<label class="acp-switch"><input type="checkbox" .checked=${row.value === true}
        ?disabled=${!editable}
        @change=${(e: Event) => this.emitProp(row, (e.target as HTMLInputElement).checked)}>
        ${row.value === true ? t('panel.propOn') : t('panel.propOff')}</label>`;
    }
    const listId = `acp-props-${row.attribute}`;
    return html`<input class="acp-text-input" type=${row.type === 'number' ? 'number' : 'text'}
        .value=${row.value === null ? '' : String(row.value)}
        min=${row.min ?? nothing} max=${row.max ?? nothing}
        list=${row.examples?.length ? listId : nothing}
        ?disabled=${!editable}
        @keydown=${(e: KeyboardEvent) => this.onPropKeydown(e, row)}
        @blur=${(e: Event) => this.commitProp(row, e.target as HTMLInputElement)}>
      ${row.examples?.length
    ? html`<datalist id=${listId}>${row.examples.map((example) => html`<option value=${example}></option>`)}</datalist>`
    : nothing}`;
  }

  /** Enter applies, Escape gives up — the same contract as every other field of this panel. */
  protected onPropKeydown = (e: KeyboardEvent, row: IMoleculePropRow): void => {
    e.stopPropagation();
    const input = e.target as HTMLInputElement;
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitProp(row, input);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      input.value = row.value === null ? '' : String(row.value);
      input.blur();
    }
  };

  /** A field's value, once — `propSent` is the same guard as the text fields' (Enter, then blur). */
  protected commitProp(row: IMoleculePropRow, input: HTMLInputElement): void {
    const value = input.value.trim();
    const current = row.value === null ? '' : String(row.value);
    if (value === current || value === this.propSent[row.attribute]) return;
    this.propSent[row.attribute] = value;
    this.emitProp(row, value === '' ? null : value);
  }

  protected emitProp(row: IMoleculePropRow, value: PropValue | null): void {
    this.dispatchEvent(new CustomEvent<IPickerPropEdit>('picker-prop', {
      detail: { attribute: row.attribute, value },
      bubbles: true,
      composed: true,
    }));
  }

  /**
   * A badge while the page is in a SIMULATED state.
   *
   * The scenario panel puts the page into a chosen state so the branches that are normally invisible
   * can be edited — and two message `<p>`s look identical. Without this, editing the class of the
   * error branch while believing it is the success one is an easy mistake, and the picker is exactly
   * where the user is looking when they make it.
   *
   * This is the one thing the panel SUBSCRIBES to: everything else it needs comes from the editor,
   * one call away, and reading a projection of that would be a second source of truth.
   */
  protected renderScenarioBadge() {
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
  protected renderClasses() {
    const inner = this.innerSide;
    if (!inner) return html`<div class="acp-rows">${this.renderSection(this.tagSide)}</div>`;
    // A molecule: ONE part at a time, chosen above. Each part
    // brings its own refusal and warning — the tag's never sits on top of the inside's rows.
    const part = this.editPart;
    const side = typeof part === 'number' && this.target?.slots[part]
      ? this.slotSide(part)
      : part === 'tag' ? this.tagSide : inner;
    return html`${this.renderParts()}${this.renderPartNotes()}<div class="acp-rows">${this.renderSection(side)}</div>`;
  }

  /**
   * The part selector of a molecule: `Interior | Tag | Slots ▾`.
   *
   * The first two are always one click away — they are the common switch. The slots live behind the
   * third, because a table has 17 of them (measured on the 102047: 359 of 620 molecules have 0–1 slot,
   * 55 have 7 or more). With ONE slot the segment carries its name and is a plain choice; with none it
   * is not there.
   */
  protected renderParts() {
    const slots = this.target?.slots ?? [];
    const part = this.editPart;
    const segment = (on: boolean, label: string, sub: string, title: string, onClick: () => void) => html`
      <button type="button" class="acp-part ${on ? 'acp-active' : ''}" title=${title} @click=${onClick}
        >${label}<span class="acp-part-sub">${sub}</span></button>`;
    const choose = (next: 'inner' | 'tag' | number): void => {
      this.editPart = next;
      this.slotTreeOpen = false;
      this.addColor = null;
      this.preview(null);
    };

    let slotSegment: unknown = nothing;
    if (slots.length === 1) {
      slotSegment = segment(part === 0, slots[0].name, t('panel.partSlot'), t('panel.sectionSlotsTitle'), () => choose(0));
    } else if (slots.length > 1) {
      const chosen = typeof part === 'number' ? slots[part] : undefined;
      slotSegment = segment(
        Boolean(chosen),
        `${chosen ? this.slotLabel(chosen) : t('panel.partSlots')} ${this.slotTreeOpen ? '▴' : '▾'}`,
        t('panel.partSlotsCount', { count: slots.length }),
        t('panel.sectionSlotsTitle'),
        () => { this.slotTreeOpen = !this.slotTreeOpen; },
      );
    }

    return html`<div class="acp-parts">
        ${segment(part === 'inner', t('panel.partInner'), 'data-class', t('panel.sectionInnerTitle'), () => choose('inner'))}
        ${segment(part === 'tag', t('panel.partTag'), 'class', t('panel.sectionTagTitle'), () => choose('tag'))}
        ${slotSegment}
      </div>
      ${this.slotTreeOpen && slots.length > 1 ? this.renderSlotTree(choose) : nothing}`;
  }

  /** `Label`, or `TableHead 2` when the name repeats. */
  protected slotLabel(slot: IPickerSlot): string {
    return slot.repeated ? `${slot.name} ${slot.index}` : slot.name;
  }

  /**
   * Asks the editor to move a slot, and keeps the selector on it: when the slot that moved is the one
   * being edited, the part follows it to the position it will have in the new list.
   *
   * The list is the slots in document order with their depth, so the new position is computed here:
   * moving up takes the previous sibling's place; moving down lands after the next sibling's subtree.
   */
  protected moveSlot(index: number, direction: 'up' | 'down'): void {
    const slots = this.target?.slots ?? [];
    const slot = slots[index];
    if (!slot) return;
    const span = (at: number): number => {
      let end = at + 1;
      while (end < slots.length && slots[end].depth > slots[at].depth) end += 1;
      return end - at;
    };
    let other = -1;
    if (direction === 'up') {
      for (let at = index - 1; at >= 0 && slots[at].depth >= slot.depth; at -= 1) {
        if (slots[at].depth === slot.depth) {
          if (slots[at].name === slot.name) other = at;
          break;
        }
      }
    } else {
      const at = index + span(index);
      if (at < slots.length && slots[at].depth === slot.depth && slots[at].name === slot.name) other = at;
    }
    if (other >= 0 && this.editPart === index) {
      this.editPart = direction === 'up' ? other : index + span(other);
    }
    const detail: IPickerSlotMove = { slot: index, direction };
    this.dispatchEvent(new CustomEvent('picker-slot-move', { detail, bubbles: true, composed: true }));
  }

  /**
   * The molecule's slots as the page nests them, with repeated siblings folded (`TableHead ×5`).
   *
   * A slot that only holds other slots (`TableHeader`, `TableRow`) is still a choice — it has a
   * `data-class` like any other — but it reads quieter: it is structure, not something on screen.
   */
  protected renderSlotTree(choose: (next: number) => void) {
    const slots = this.target?.slots ?? [];
    const rows: unknown[] = [];
    for (let at = 0; at < slots.length; at += 1) {
      const slot = slots[at];
      const container = (slots[at + 1]?.depth ?? -1) > slot.depth;
      // Siblings of the same name, one after the other at the same depth: one folded group.
      let end = at;
      while (end + 1 < slots.length && slots[end + 1].name === slot.name && slots[end + 1].depth === slot.depth) end += 1;
      const pad = (extra: number): string => `padding-left:${10 + (slot.depth + extra) * 12}px`;
      const node = (index: number, label: string, kind: string, indent = 0) => {
        const item = slots[index];
        const button = html`<button type="button" class="acp-slot-node ${this.editPart === index ? 'acp-active' : ''} ${kind}"
          style=${pad(indent)} title=${item.literal || t('panel.slotNoClasses')} @click=${() => choose(index)}
          >${label}<span class="acp-slot-hint">${item.literal}</span></button>`;
        if (!item.moves?.length) return button;
        const arrow = (direction: 'up' | 'down') => {
          if (!item.moves.includes(direction)) return html`<span class="acp-slot-move-gap"></span>`;
          const label = t(direction === 'up' ? 'panel.slotMoveUp' : 'panel.slotMoveDown');
          const icon = direction === 'up' ? 'fa-arrow-up' : 'fa-arrow-down';
          return html`<button type="button" class="acp-slot-move" title=${label} aria-label=${label}
            @click=${() => this.moveSlot(index, direction)}><i class="fa-solid ${icon}"></i></button>`;
        };
        return html`<div class="acp-slot-row">${button}<span class="acp-slot-moves">${arrow('up')}${arrow('down')}</span></div>`;
      };
      if (end === at) {
        rows.push(node(at, slot.hint ? `${slot.name} · ${slot.hint}` : slot.name, container ? 'acp-slot-structure' : ''));
        continue;
      }
      const key = `${slot.depth}:${slot.name}:${at}`;
      const open = this.slotGroupsOpen.includes(key) || (typeof this.editPart === 'number' && this.editPart >= at && this.editPart <= end);
      rows.push(html`<button type="button" class="acp-slot-node acp-slot-group" style=${pad(0)}
        @click=${() => { this.slotGroupsOpen = open ? this.slotGroupsOpen.filter((other) => other !== key) : [...this.slotGroupsOpen, key]; }}
        >${open ? '▾' : '▸'} ${slot.name}<span class="acp-slot-hint">×${end - at + 1}</span></button>`);
      if (open) {
        for (let index = at; index <= end; index += 1) {
          const item = slots[index];
          rows.push(node(index, item.hint ? `${item.index} · ${item.hint}` : `${item.index}`, '', 1));
        }
      }
      at = end;
    }
    return html`<div class="acp-slot-tree">${rows}</div>`;
  }

  /**
   * One attribute's rows, grouped by SUBJECT.
   *
   * Each group is a line with a summary of what it holds — readable folded — and, open, its rows and
   * its own "+". Every group starts folded, so an element is a short list of subjects and not a wall
   * of rows. A group with nothing to show and nothing to offer is not drawn.
   */
  protected renderSection(side: IPickerSide) {
    // Motion lives in the Animations tab (animationTokens): its classes are not listed here twice.
    const owned = new Set(animationTokens(side.literal).owned);
    const tokens = splitUtilities(side.literal).filter((token) => !owned.has(token.raw));
    const options = addableProperties(side.literal, { childCount: this.target?.childCount ?? 0, channel: side.channel });
    // Inside a molecule the parent-facing classes do not work, and the section says where they go.
    const channelHint = side.channel === 'data-class'
      ? html`<small class="acp-hint">${t('panel.addChannelHint')}</small>`
      : nothing;
    return html`${INSPECTOR_GROUPS.filter((group) => group !== 'animation').map((group) => this.renderGroup(
      group,
      side,
      tokens.filter((token) => inspectorGroupOf(token) === group),
      options.filter((entry) => inspectorGroupOfProperty(entry.property) === group),
    ))}
      ${channelHint}`;
  }

  /** One subject: its line (name, summary, count) and, open, its rows and its "+". */
  protected renderGroup(group: InspectorGroup, side: IPickerSide, tokens: IUtilityToken[], adds: IAddableProperty[]) {
    if (!tokens.length && !adds.length) return nothing;
    const key = `${sideId(side)}:${group}`;
    // Every group starts FOLDED (decided with the user): the summary on the line already
    // says what is there, and opening is the gesture that asks for the rows.
    const open = this.groupsOpen[key] ?? false;
    const summary = tokens.map((token) => token.raw).join(' ');
    // Open, the rows sit INSIDE the group: indented under its name, behind a guide line, with quieter
    // labels — the subject is the parent and its properties are children, not sections of their own.
    return html`<div class="acp-group ${open ? 'acp-open' : ''}">
      <button type="button" class="acp-group-head" aria-expanded=${open ? 'true' : 'false'} title=${summary}
        @click=${() => { this.groupsOpen = { ...this.groupsOpen, [key]: !open }; }}>
        <span class="acp-group-caret">${open ? '▾' : '▸'}</span>
        <span class="acp-group-name">${t(`inspector.${group}`)}</span>
        <span class="acp-group-sum">${summary || '—'}</span>
        ${tokens.length ? html`<span class="acp-group-count">${tokens.length}</span>` : nothing}
      </button>
      ${open ? html`<div class="acp-group-body">
        ${tokens.map((token) => this.renderClassBlock(token, side))}${this.renderGroupAdd(group, side, adds)}
      </div>` : nothing}
    </div>`;
  }

  /**
   * The "+" of one subject: the properties this element does not have yet, from the same catalog as
   * before — chosen inside the subject, so the old two-step menu
   * (group, then property) is gone. Colour opens the design-system palette right here.
   */
  protected renderGroupAdd(group: InspectorGroup, side: IPickerSide, adds: IAddableProperty[]) {
    if (!adds.length) return nothing;
    if (this.addColor && this.addChannel === sideId(side) && inspectorGroupOfProperty(this.addColor) === group) {
      const entry = addableProperty(this.addColor);
      const roles = entry?.family ? newRoleOptions(entry.family, this.dsRoles, (cssVar) => this.resolveVar(cssVar)) : [];
      return html`<div class="acp-block acp-add">
        <span class="acp-head-row">
          <span class="acp-label">${t(this.addColor)}</span>
          <button type="button" class="acp-link" @click=${() => { this.addColor = null; }}>${t('panel.customCancel')}</button>
        </span>
        ${roles.length
    ? html`<span class="acp-role-list">${roles.map((option) => html`<button type="button" class="acp-role-item"
            @click=${() => this.addSeed(this.addColor ?? '', option, side)}>${this.roleRow(option)}</button>`)}</span>`
    : html`<span class="acp-reason">${t('reason.noDsTokens')}</span>`}
        <small class="acp-hint">${t('panel.addColor')}</small>
      </div>`;
    }
    return html`<div class="acp-group-add" title=${t('panel.addTitle')}>
      <span class="acp-group-plus">+</span>
      <span class="acp-chips">${adds.map((entry) => this.addChip(entry, side))}</span>
    </div>`;
  }

  /**
   * One block per class token: what it edits on its own line, the neighbours below.
   *
   * The label is the PROPERTY, not the class: `bg-[var(--button-secondary-bg,#f8fafc)]` says what is
   * written, "background colour" says what the row does. The class itself is the tooltip, and it stays
   * the label when there is no honest name for the family — showing the class beats inventing a name.
   */
  protected renderClassBlock(token: IUtilityToken, side: IPickerSide) {
    const options = utilityOptions(token, 2, this.dsRoles, (cssVar) => this.resolveVar(cssVar), side.channel);
    const label = utilityLabel(token);
    const text = label.property
      ? [t(label.property), ...label.variants.map((part) => (part.id ? t(part.id, part.params) : part.raw ?? ''))].join(' · ')
      : token.raw;

    const head = html`<span class="acp-head-row">
      <span class="acp-label" title=${token.raw}>${text}</span>
      ${this.importantButton(token, side)}
      ${this.removeButton(token, text, side)}
    </span>`;

    if (options.kind === 'none') {
      return html`<div class="acp-block acp-readonly">${head}<span class="acp-reason">${tr(options.reason)}</span></div>`;
    }
    if (options.kind === 'role') {
      return html`<div class="acp-block">${head}${this.renderRolePicker(token, options.options, side)}</div>`;
    }

    const editable = side.editable;
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
        @click=${() => this.applyLiteral(importantInChannel(replaceUtility(side.literal, token.raw, option, token.index), token.index, side.channel), `${token.raw} → ${option}`, side)}
      >${option.split(':').pop() ?? option}${jitOnly ? html`<span class="acp-star">*</span>` : nothing}</button>`;
    })}${typed ? this.renderTypedValue(token, typed, side) : nothing}</span></div>`;
  }

  /**
   * The `×` of a row: the whole property leaves.
   *
   * The LAST class can go too. That used to be refused because the literal WAS the anchor; now the
   * element is found by its position in the template, the write takes the whole `class="…"` attribute
   * out, and the panel comes back offering the "+". The one exception is an element the editor could
   * only find by COUNTING its literal — there the literal is the address (see canRemoveLast).
   */
  /**
   * The `!important` of a row: lit (blue, like a selection) when the
   * class is important, quiet when it is not, and a click turns it on or off. Written out in mono like the
   * classes, on purpose: a lone `!` in a box read as a warning. The reason to reach for it is in the tooltip — a
   * molecule's `data-class` that loses to the variant's own class wins with it.
   */
  protected importantButton(token: IUtilityToken, side: IPickerSide) {
    const on = Boolean(token.important);
    const next = toggleImportant(side.literal, token);
    return html`<button type="button" class="acp-important ${on ? 'acp-active' : ''}" ?disabled=${!side.editable}
      title=${t(on ? 'panel.importantOn' : 'panel.importantOff')} aria-pressed=${on ? 'true' : 'false'}
      @mouseenter=${() => this.previewLiteral(next, side)}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => this.applyLiteral(next, t(on ? 'status.importantRemoved' : 'status.importantAdded', { cls: token.base }), side)}
    >!important</button>`;
  }

  protected removeButton(token: IUtilityToken, name: string, side: IPickerSide) {
    const editable = side.editable;
    const stranded = splitUtilities(side.literal).length <= 1 && !side.canRemoveLast;
    return html`<button type="button" class="acp-remove" ?disabled=${!editable || stranded}
      title=${stranded ? t('panel.removeLast') : t('panel.removeProperty')}
      @mouseenter=${() => { if (!stranded) this.previewLiteral(removeUtility(side.literal, token.raw), side); }}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => this.applyLiteral(
    removeUtility(side.literal, token.raw),
    t('status.propertyRemoved', { property: name }),
    side,
  )}>&times;</button>`;
  }

  /**
   * The `...` of a numeric row: `p-[13px]`, `w-[320px]`.
   *
   * The core has always READ a typed value as the current value of its family (it leads the chips and
   * the scale is the way back) — what was missing was the way in. Gated by the family AND by the kind,
   * so the colour side of `text-*` never gets a px input.
   */
  protected renderTypedValue(token: IUtilityToken, spec: ITypedValueSpec, side: IPickerSide) {
    const editable = side.editable;

    if (this.typedEditing === sideKey(side, token)) {
      const current = readTypedValue(token);
      return html`<span class="acp-custom">
        <input type="number" min=${spec.min} max=${spec.max} .value=${current === null ? '' : String(current)}
          placeholder=${`${spec.min}–${spec.max}`}
          @keydown=${(e: KeyboardEvent) => this.onTypedKeydown(e, token, spec, side)}>
        <span class="acp-unit">${spec.unit}</span>
        <button type="button" class="acp-chip" @click=${() => this.commitTyped(token, spec, side)}>${t('panel.customApply')}</button>
        <button type="button" class="acp-link" @click=${() => { this.typedEditing = null; }}>${t('panel.customCancel')}</button>
      </span>`;
    }

    return html`<button type="button" class="acp-chip acp-more" ?disabled=${!editable}
      title=${t('panel.typedOpen', { unit: spec.unit, min: spec.min, max: spec.max })}
      @click=${() => { this.typedEditing = sideKey(side, token); this.focusTypedSoon(); }}>…</button>`;
  }

  protected addChip(entry: IAddableProperty, side: IPickerSide) {
    const editable = side.editable;
    const seed = entry.seed;
    // What the click writes: in a molecule's data-class, the seed already `!important` (classToAdd).
    const written = seed ? classToAdd(seed, side.channel) : null;
    // Same rule as every other chip: a class with no rule in the built css is marked, never silent.
    const jitOnly = Boolean(written) && !this.builtClasses.has(written ?? '');
    const title = written
      ? (jitOnly ? `${written} — ${t('panel.publishNote')}` : written)
      : t('panel.addColor');

    return html`<button type="button" class="acp-chip ${jitOnly ? 'acp-jit' : ''}" ?disabled=${!editable} title=${title}
      @mouseenter=${() => { if (written) this.previewLiteral(addUtility(side.literal, written), side); }}
      @mouseleave=${() => this.previewLiteral(null)}
      @click=${() => {
        if (seed) this.addSeed(entry.property, seed, side);
        else { this.addColor = entry.property; this.addChannel = sideId(side); }
      }}
    >${t(entry.property)}${jitOnly ? html`<span class="acp-star">*</span>` : nothing}</button>`;
  }

  protected addSeed(property: string, cls: string, side: IPickerSide): void {
    this.addColor = null;
    // Into a molecule's data-class the new class goes in already `!important` (classToAdd).
    this.applyLiteral(addUtility(side.literal, classToAdd(cls, side.channel)), t('status.propertyAdded', { property: t(property) }), side);
  }

  /**
   * Copy and paste, as two icons in the header.
   *
   * They used to be a text button plus a whole block in the classes tab, with the summary of what
   * would enter and leave. The gesture is two clicks on two different elements and it does not need a
   * section of its own — so what is left on screen is the pair of icons, and the summary goes to the
   * console while this is being tried out (see logPaste).
   */
  protected renderCopyIcon() {
    const part = this.mainPart;
    const has = Boolean(this.literal.trim()) || part === 'inner' || part === 'tag';
    return this.menuItem({
      icon: '\u29C9',
      label: part === 'slot' ? t('panel.menuCopySlot', { slot: this.slotLabel(this.target!.slots[this.editPart as number]) }) : t('panel.menuCopy'),
      title: has ? t('panel.copyStyleTitle') : t('status.nothingToCopy'),
      disabled: !has,
      onClick: this.onCopy,
    });
  }

  /** Which part the main side is — what a copy records as its origin. */
  protected get mainPart(): IStyleClipboard['part'] {
    if (!this.innerSide) return 'element';
    const part = this.editPart;
    if (typeof part === 'number' && this.target?.slots[part]) return 'slot';
    return part === 'tag' ? 'tag' : 'inner';
  }

  /** The class write a paste makes into one side (none when it would change nothing or cannot write). */
  protected pasteWrite(side: IPickerSide, clip: IStyleClipboard): IPickerPaste['literals'] {
    if (!side.editable) return [];
    const literal = pasteStyleInto(side.literal, clip.literal, side.channel).literal;
    return literal === side.literal ? [] : [{ literal, attribute: side.channel, slot: side.slot }];
  }

  /**
   * The ways to paste the copied style here — each one REPLACES (a decision with the user), so the
   * target ends up like the source.
   *
   * From a slot: into the selected slot, into every slot of the same name (no need to reopen the tree),
   * or into the molecule's inside. Otherwise: the style — the classes of the main side plus, on a
   * molecule, the copied properties that fit (planPropTransfer) — and the classes alone.
   */
  protected pasteOptions(): IPasteOption[] {
    const clip = this.clipboard;
    const target = this.target;
    if (!clip || !target) return [];
    const fromSlot = clip.part === 'slot' && clip.slot;
    const what = fromSlot ? t('status.pastedSlot', { slot: clip.slot! }) : t('status.pasted', { tag: clip.tag });
    const options: IPasteOption[] = [];

    if (fromSlot && this.isMolecule) {
      if (typeof this.editPart === 'number' && target.slots[this.editPart]) {
        options.push({
          label: t('panel.menuPasteSlot', { slot: this.slotLabel(target.slots[this.editPart]) }),
          title: t('panel.pasteFromSlotTitle', { slot: clip.slot! }),
          literals: this.pasteWrite(this.mainSide, clip), props: [], what,
        });
      }
      const same = target.slots.map((slot, at) => ({ slot, at })).filter(({ slot }) => slot.name === clip.slot);
      if (same.length) {
        options.push({
          label: t('panel.menuPasteAllSlots', { slot: clip.slot!, count: same.length }),
          title: t('panel.pasteFromSlotTitle', { slot: clip.slot! }),
          detail: t('panel.pasteAllSlotsDetail'),
          literals: same.flatMap(({ at }) => this.pasteWrite(this.slotSide(at), clip)),
          props: [],
          what: t('status.pastedSlots', { slot: clip.slot!, count: same.length }),
        });
      }
      const inner = this.innerSide;
      if (inner) {
        options.push({
          label: t('panel.menuPasteInner'), title: t('panel.pasteFromSlotTitle', { slot: clip.slot! }),
          literals: this.pasteWrite(inner, clip), props: [], what,
        });
      }
      return options;
    }

    const literals = this.pasteWrite(this.mainSide, clip);
    const part = this.mainPart;
    const takesProps = Boolean(clip.props?.length) && (part === 'inner' || part === 'tag');
    const rows = this.props && !this.props.loading ? this.props.rows : null;
    const transfer = takesProps && rows ? planPropTransfer(clip.props!, rows) : null;
    const props: IPickerPropEdit[] = transfer ? transfer.writes.map((w) => ({ attribute: w.attribute, value: w.value })) : [];
    let detail: unknown = undefined;
    if (takesProps && !rows) detail = t('panel.clipPropsPending');
    else if (transfer) {
      const fit = transfer.writes.length + transfer.same.length;
      detail = html`${t('panel.pasteSummaryProps', { fit, total: clip.props!.length })}
        ${transfer.writes.map((w) => html`<span class="acp-menu-ok">✓ ${w.label}: ${w.value === null ? t('panel.pasteDefault') : String(w.value)}</span>`)}
        ${transfer.skipped.map((s) => html`<span class="acp-menu-skip">— ${t(`panel.propSkip.${s.reason}`, { label: s.label })}</span>`)}`;
    }
    options.push({
      label: t('panel.menuPaste'),
      title: t('panel.pasteFromTitle', { tag: clip.tag }),
      detail, literals, props, what,
    });
    if (props.length) {
      options.push({ label: t('panel.menuPasteClassesOnly'), title: t('panel.pasteFromTitle', { tag: clip.tag }), literals, props: [], what });
    }
    return options;
  }

  /** The paste lines of the ⋯ menu; with nothing copied, one disabled line that says so. */
  protected renderPasteItems() {
    const options = this.pasteOptions();
    if (!options.length) {
      return this.menuItem({ icon: '\u{1F4CB}', label: t('panel.menuPaste'), title: t('panel.pasteEmpty'), disabled: true, onClick: () => undefined });
    }
    return options.map((option) => {
      const nothingToDo = !option.literals.length && !option.props.length;
      // The preview shows the first class write (the main side, or the first slot of the name).
      const first = option.literals[0];
      return this.menuItem({
        icon: '\u{1F4CB}',
        label: option.label,
        title: option.title,
        detail: option.detail,
        disabled: nothingToDo,
        onEnter: () => { if (first) this.emitPreview({ literal: first.literal, attribute: first.attribute, slot: first.slot }); },
        onLeave: () => this.emitPreview(null),
        onClick: () => this.onPaste(option),
      });
    });
  }

  /** The copied style, while there is one: where it came from, what it carries, and a way to forget it. */
  protected renderClipboardBar() {
    const clip = this.clipboard;
    if (!clip) return nothing;
    const classes = clip.literal.trim() ? clip.literal.trim().split(/\s+/).length : 0;
    const parts = [
      clip.part === 'slot' && clip.slot ? t('panel.clipFromSlot', { slot: clip.slot }) : t('panel.clipFrom', { tag: clip.tag }),
      t('panel.clipClasses', { count: classes }),
      clip.propsPending ? t('panel.clipPropsPending') : clip.props?.length ? t('panel.clipProps', { count: clip.props.length }) : '',
    ].filter(Boolean);
    return html`<div class="acp-clip" title=${clip.literal}>
      <span class="acp-clip-text">\u{1F4CB} ${parts.join(' · ')}</span>
      <button type="button" class="acp-icon" title=${t('panel.clipForget')} aria-label=${t('panel.clipForget')}
        @click=${() => { this.clipboard = null; }}>\u2715</button>
    </div>`;
  }

  /**
   * The chrome's actions: undo and redo in sight, the rest in a
   * ⋯ menu with their NAMES written.
   *
   * Ten icons of one weight, from four subjects, was the clutter: the panel's own chrome now shows only
   * what is used all the time, and the menu reads as a list of things to do. Every line keeps its
   * tooltip — the reason it is off, the notes of a duplicate — exactly as the icons had it.
   */
  protected renderActions() {
    return html`${this.historyButton('undo')}
      ${this.historyButton('redo')}
      <span class="acp-menu-wrap"
        @keydown=${(e: KeyboardEvent) => { if (e.key === 'Escape' && this.menuOpen) { e.stopPropagation(); this.menuOpen = false; } }}>
        <button type="button" class="acp-icon ${this.menuOpen ? 'acp-active' : ''}" title=${t('panel.moreActions')}
          aria-label=${t('panel.moreActions')} aria-expanded=${this.menuOpen ? 'true' : 'false'}
          @click=${() => { this.menuOpen = !this.menuOpen; this.confirmRemove = false; }}>\u22EF</button>
        ${this.menuOpen ? html`<div class="acp-menu" role="menu">
          ${this.moveButton('up')}
          ${this.moveButton('down')}
          <div class="acp-menu-sep"></div>
          ${this.duplicateButton()}
          ${this.removeElementButton()}
          <div class="acp-menu-sep"></div>
          ${this.renderCopyIcon()}
          ${this.renderPasteItems()}
        </div>` : nothing}
      </span>`;
  }

  /** One line of the ⋯ menu: an icon, a name, the tooltip that says why — and it closes the menu. */
  protected menuItem(item: {
    icon: string;
    label: string;
    title: string;
    disabled?: boolean;
    noted?: boolean;
    danger?: boolean;
    /** Arming a two-click action: the menu stays open for the second click. */
    keepOpen?: boolean;
    /** A second line under the name: what the action will do (what a paste carries). */
    detail?: unknown;
    onClick: () => void;
    onEnter?: () => void;
    onLeave?: () => void;
  }) {
    return html`<button type="button" role="menuitem"
      class="acp-menu-item ${item.noted ? 'acp-noted' : ''} ${item.danger ? 'acp-danger' : ''}"
      ?disabled=${item.disabled ?? false} title=${item.title}
      @mouseenter=${() => item.onEnter?.()} @mouseleave=${() => item.onLeave?.()}
      @click=${() => { if (!item.keepOpen) this.menuOpen = false; item.onClick(); }}
      ><span class="acp-menu-icon">${item.icon}</span><span class="acp-menu-text">${item.label}${item.detail ? html`<span class="acp-menu-detail">${item.detail}</span>` : nothing}</span></button>`;
  }

  /**
   * One class write and no properties goes out as `picker-apply`, like a chip; anything more (classes
   * and properties, every slot of a name) as `picker-paste`, which the editor records as ONE step.
   */
  protected onPaste(option?: IPasteOption): void {
    const clip = this.clipboard;
    if (!clip) return;
    const chosen = option ?? this.pasteOptions()[0];
    if (!chosen || (!chosen.literals.length && !chosen.props.length)) return;
    const single = chosen.literals.length === 1 && !chosen.props.length ? chosen.literals[0] : null;
    if (single && single.attribute === this.channel && single.slot === this.mainSide.slot) {
      // Into a molecule only the channel's vocabulary travels; what stayed behind goes to the console.
      const { literal: result, dropped } = pasteStyleInto(this.literal, clip.literal, this.channel);
      if (result === this.literal) return;
      this.logPaste(clip, result, dropped);
      this.applyLiteral(result, t('status.pasted', { tag: clip.tag }));
      return;
    }
    this.preview(null);
    this.dispatchEvent(new CustomEvent<IPickerPaste>('picker-paste', {
      detail: { literals: chosen.literals, props: chosen.props, what: chosen.what },
      bubbles: true,
      composed: true,
    }));
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
  protected logPaste(clip: IStyleClipboard, result: string, dropped: string[]): void {
    const diff = diffLiterals(this.literal, result);
    console.info('[picker] paste', {
      from: clip.tag,
      into: this.channel,
      adds: diff.added,
      removes: diff.removed,
      // Not carried by a molecule's `data-class` (place and outer margins only).
      outsideChannel: dropped,
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

  protected onCopy = (): void => {
    const literal = this.literal;
    const tag = this.target?.tag ?? '';
    const part = this.mainPart;
    const molecule = part === 'inner' || part === 'tag';
    if (!literal.trim() && !molecule) {
      this.status(t('status.nothingToCopy'));
      return;
    }
    const clip: IStyleClipboard = { literal, tag, part };
    if (part === 'slot') clip.slot = this.target?.slots[this.editPart as number]?.name;
    if (molecule) {
      // The properties go along; read now when the tab has them, else asked for and filled in later.
      if (this.props && !this.props.loading) clip.props = snapshotProps(this.props.rows);
      else {
        clip.propsPending = true;
        this.requestProps();
      }
    }
    this.clipboard = clip;
    this.status(part === 'slot' && clip.slot ? t('status.copiedSlot', { slot: clip.slot }) : t('status.copied', { tag }));
  };

  /**
   * The design-system roles as a palette: a swatch, the role name, the colour.
   *
   * Not a `<select>`: a native `<option>` takes no markup, so the only way to show the colour there is
   * to paint the whole row. It expands INLINE because the panel scrolls — a positioned popup would be
   * clipped by its own container.
   */
  protected renderRolePicker(token: IUtilityToken, options: string[], side: IPickerSide) {
    const current = options[0];
    const open = this.roleEditing === sideKey(side, token);
    const editable = side.editable;

    const row = (option: string) => this.roleRow(option);

    return html`<span class="acp-chips">
      <button type="button" class="acp-role-btn" title=${t('panel.roleTitle')} ?disabled=${!editable}
        @click=${() => { this.roleEditing = open ? null : sideKey(side, token); }}>
        ${row(current)}<span>${open ? '▴' : '▾'}</span>
      </button>
      ${open ? html`<span class="acp-role-list">${options.map((option) => {
        const isCurrent = option === current;
        const availability = chipAvailability(isCurrent, this.builtClasses.has(option), this.jitLive);
        if (availability === 'hidden') return nothing;
        return html`<button type="button" class="acp-role-item ${isCurrent ? 'acp-current' : ''}"
          @click=${() => {
    this.roleEditing = null;
    this.applyLiteral(importantInChannel(replaceUtility(side.literal, token.raw, option, token.index), token.index, side.channel), `${roleLabel(token.raw)} → ${roleLabel(option)}`, side);
  }}>${row(option)}${isCurrent ? html`<span>✓</span>` : nothing}</button>`;
      })}</span>` : nothing}
    </span>`;
  }

  /** A swatch, the role name and the colour it resolves to — one line of the palette. */
  protected roleRow(option: string) {
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
  // ─── Molecules tab ───────────────────────────

  /**
   * The one operation that changes the page's VOCABULARY, and the only tab that shows the write
   * before it happens.
   *
   * The order on screen is the order of the decision: what claims this element, what would be
   * replaced, which molecule, what the conversion understood, what it warns about — and only then
   * the button. The refusal takes the place of the button rather than sitting next to a disabled one,
   * because "why not" is the whole answer when the answer is no.
   */
  protected renderMolecules() {
    const adopt = this.adopt;
    if (!adopt || adopt.loading) return html`<div class="acp-note">${t('panel.adoptLoading')}</div>`;
    if (!adopt.group) {
      return html`<div class="acp-note">${adopt.noneReason ? tr(adopt.noneReason) : t('panel.adoptNone')}</div>`;
    }

    const editable = this.target?.editable ?? false;
    return html`<div class="acp-rows">
      <div class="acp-block">
        <span class="acp-label">${t('panel.adoptGroup')}</span>
        <span class="acp-adopt-group">${adopt.group}</span>
        ${adopt.why ? html`<span class="acp-reason">${tr(adopt.why)}</span>` : nothing}
        ${adopt.replaces ? html`<span class="acp-reason acp-adopt-replaces"
          @mouseenter=${() => this.emitLevelHover(this.replacedLevel())}
          @mouseleave=${() => this.emitLevelHover(null)}
        >${t(adopt.replaces.lifted ? 'panel.adoptReplaces' : 'panel.adoptReplacesSelf', { tag: adopt.replaces.tag })}</span>` : nothing}
      </div>

      <div class="acp-block">
        <span class="acp-label">${t('panel.adoptMolecule')}</span>
        <div class="acp-chips">
          ${adopt.options.map((option) => html`<button type="button"
            class="acp-chip ${option.tag === adopt.current ? 'acp-current' : ''}"
            title=${this.optionTitle(option)}
            @click=${() => this.selectMolecule(option.tag)}
          >${option.chosen ? html`<span class="acp-star">★</span> ` : nothing}${option.variant}</button>`)}
        </div>
      </div>

      ${adopt.parts ? this.renderAdoptParts(adopt.parts) : nothing}
      ${adopt.warnings.map((warning) => html`<div class="acp-note acp-warning">${tr(warning)}</div>`)}
      ${adopt.markup ? html`<div class="acp-block">
        <code class="acp-adopt-markup">${adopt.markup}</code>
      </div>` : nothing}

      ${adopt.refusal
    ? html`<div class="acp-note acp-refusal">${tr(adopt.refusal)}</div>`
    : html`<div class="acp-block acp-adopt-actions">
        <button type="button" class="acp-chip" ?disabled=${!editable}
          @click=${this.emitAdoptPreview}>${t('panel.adoptPreview')}</button>
        <button type="button" class="acp-chip acp-adopt-go" ?disabled=${!editable}
          @click=${this.emitAdopt}>${t('panel.adoptApply')}</button>
        <span class="acp-reason">${t('panel.adoptPreviewHint')}</span>
      </div>`}

      ${this.adoptPreview ? html`<div class="acp-adopt-stage">
        <span class="acp-label">${t('panel.adoptPreviewNext')}</span>
        ${this.adoptPreview}
      </div>` : nothing}
    </div>`;
  }

  /**
   * The tooltip of a molecule chip: its tag, what it is for, and whether the design system picked it.
   *
   * The chip itself shows only the short name (`ml-button-standard`), because six of them have to fit
   * in 340px — everything that tells two siblings of a group apart lives here.
   */
  protected optionTitle(option: IPickerAdoptOption): string {
    const lines = [option.tag];
    if (option.objective) lines.push(option.objective);
    if (option.chosen) lines.push(t('panel.adoptChosen'));
    return lines.join('\n');
  }

  /** What the conversion understood, as rows — the only place the user can check it before writing. */
  protected renderAdoptParts(parts: NonNullable<IPickerAdopt['parts']>) {
    const events = Object.entries(parts.events);
    if (!parts.label && !parts.icon && !parts.variant && !parts.items && !events.length) return nothing;
    return html`<div class="acp-block">
      ${parts.variant ? this.infoRow('panel.adoptVariant', parts.variant) : nothing}
      ${parts.label ? this.infoRow('panel.adoptLabel', parts.label) : nothing}
      ${parts.icon ? this.infoRow('panel.adoptIcon', parts.icon) : nothing}
      ${parts.items ? this.infoRow('panel.adoptItems', String(parts.items)) : nothing}
      ${events.length ? this.infoRow('panel.adoptEvents', events.map(([name, value]) => `${name}=${value}`).join(' · ')) : nothing}
    </div>`;
  }

  /**
   * The level the breadcrumb should highlight while the pointer is on "what will be replaced".
   *
   * The chain ends at the selection, so one level up is the last but one — the same index the `Esc`
   * tooltip uses. It is how a `lift: 1` stops being a sentence and becomes the element on screen.
   */
  protected replacedLevel(): number | null {
    const levels = this.target?.levels ?? [];
    if (!this.adopt?.replaces?.lifted || levels.length < 2) return null;
    return levels[levels.length - 2].index;
  }

  protected selectMolecule(tag: string): void {
    this.dispatchEvent(new CustomEvent<string>('picker-adopt-select', { detail: tag, bubbles: true, composed: true }));
  }

  protected emitAdoptPreview = (): void => {
    this.dispatchEvent(new CustomEvent('picker-adopt-preview', { bubbles: true, composed: true }));
  };

  protected emitAdopt = (): void => {
    this.dispatchEvent(new CustomEvent('picker-adopt', { bubbles: true, composed: true }));
  };

  protected renderInfo() {
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
    // The UX comes from the folder; the UI from the Studio's pick (the folder page{UX}1 does not carry it).
    const ds = aura?.actualDesignSystem ?? identity.designSystem;
    const variation = layout ? combinationName(layout, ds) : '';
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
  protected infoRow(label: string, value: string) {
    return html`<span class="acp-info-row">
      <span class="acp-info-label">${t(label)}</span>
      <span class="acp-info-value" title=${value}>${value || '\u2014'}</span>
    </span>`;
  }

  // ─── Animations tab ────────────────────────────────────────────────────────

  /**
   * The Animations tab by CATEGORY.
   *
   * It used to navigate between SCREENS (root → entrance / continuous / hover / advanced, with a back
   * link). It now has the Style tab's shape: categories that fold, each with a summary of what is on,
   * all starting folded, no screen to leave. The rows inside are the detail screens' rows, unchanged —
   * the catalog, the preview and the writes are the same. On a molecule it acts on the part chosen in
   * the selector, like the Style tab.
   */
  protected renderAnimations() {
    const side = this.mainSide;
    const editable = side.editable;
    const state = this.animationState();
    const active = new Set(activeAnimations(side.literal));
    const activeGroups = new Set(activeAnimationGroups(side.literal));
    const unknown = animationTokens(side.literal).unknown;
    return html`${this.innerSide ? html`${this.renderParts()}${this.renderPartNotes()}` : nothing}
      ${!active.size && !unknown.length ? html`<div class="acp-note">${t('panel.previewHint')}</div>` : nothing}
      <div class="acp-rows">
        ${ANIMATION_CATEGORIES.map((category) => this.renderAnimationCategory(category, side, state, active, activeGroups, editable))}
        ${this.renderOtherAnimations(side, unknown)}
      </div>`;
  }

  /** One category: its line (name and what is on) and, open, the rows of its detail screen. */
  protected renderAnimationCategory(
    category: IAnimationCategory,
    side: IPickerSide,
    state: IAnimationState,
    active: Set<string>,
    activeGroups: Set<string>,
    editable: boolean,
  ) {
    const spec = animationScreen(category.screen);
    const key = `anim:${sideId(side)}:${category.id}`;
    const open = this.groupsOpen[key] ?? false;
    const summary = this.animationSummary(spec, side.literal, active, state);
    return html`<div class="acp-group ${open ? 'acp-open' : ''}">
      <button type="button" class="acp-group-head" aria-expanded=${open ? 'true' : 'false'} title=${summary}
        @click=${() => { this.groupsOpen = { ...this.groupsOpen, [key]: !open }; this.customEditing = null; this.preview(null); }}>
        <span class="acp-group-caret">${open ? '▾' : '▸'}</span>
        <span class="acp-group-name">${t(category.title)}</span>
        <span class="acp-group-sum">${summary || '—'}</span>
      </button>
      ${open ? html`<div class="acp-group-body">
        ${spec.note ? html`<small class="acp-hint">${t(spec.note)}</small>` : nothing}
        ${spec.rows.map((row) => this.renderAnimationRow(row, state, active, activeGroups, editable))}
        ${spec.motionSwitch ? html`
          <label class="acp-switch">
            <input type="checkbox" .checked=${state.motionSafe} ?disabled=${!editable}
              @change=${(e: Event) => this.applyState('motionSafe', String((e.target as HTMLInputElement).checked))}>
            ${t('panel.motionSafe')}
          </label>
          <small class="acp-hint">${t('panel.motionSafeHint')}</small>` : nothing}
      </div>` : nothing}
    </div>`;
  }

  /** One row of a category — what a detail screen used to show for it. */
  protected renderAnimationRow(
    row: IAnimationRow,
    state: IAnimationState,
    active: Set<string>,
    activeGroups: Set<string>,
    editable: boolean,
  ) {
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
        : (row.group ? row.group.options.map((option) => this.optionChip(row.group!, option, active, state, editable)) : []);
    return html`<div class="acp-block">
      <span class="acp-label">${t(row.title)}</span>
      <span class="acp-chips">
        ${chips}
        ${row.group?.custom ? this.renderCustom(row.group) : nothing}
      </span>
    </div>`;
  }

  /**
   * What a category has on, for its line: the options' names, typed values and the cascade step.
   * Empty when nothing of the category is on — the line then shows a dash.
   */
  protected animationSummary(spec: IAnimationScreenSpec, literal: string, active: Set<string>, state: IAnimationState): string {
    const parts: string[] = [];
    for (const row of spec.rows) {
      if (row.cascade) {
        const cascade = readCascade(literal);
        if (cascade.step !== null) parts.push(t('panel.cascadeSummary', { step: cascade.step }));
        continue;
      }
      const groups = row.group ? [row.group] : (row.groups ?? []);
      for (const group of groups) {
        for (const option of group.options) if (active.has(option.id)) parts.push(t(option.label));
        const typed = group.custom ? readAnimationCustom(literal, group.id) : null;
        if (typed !== null && group.custom) parts.push(`${typed}${group.custom.unit}`);
      }
    }
    if (spec.motionSwitch && state.motionSafe) parts.push(t('panel.motionSafeShort'));
    return [...new Set(parts)].join(' · ');
  }

  /**
   * Motion the catalog does not explain (`duration-700` with no option around it) — the "Outras"
   * category, drawn only when there is some. Its rows are the Style tab's rows: neighbours and a ×.
   */
  protected renderOtherAnimations(side: IPickerSide, unknown: string[]) {
    if (!unknown.length) return nothing;
    const tokens = splitUtilities(side.literal).filter((token) => unknown.includes(token.raw));
    const key = `anim:${sideId(side)}:other`;
    const open = this.groupsOpen[key] ?? false;
    const summary = tokens.map((token) => token.raw).join(' ');
    return html`<div class="acp-group ${open ? 'acp-open' : ''}">
      <button type="button" class="acp-group-head" aria-expanded=${open ? 'true' : 'false'} title=${summary}
        @click=${() => { this.groupsOpen = { ...this.groupsOpen, [key]: !open }; }}>
        <span class="acp-group-caret">${open ? '▾' : '▸'}</span>
        <span class="acp-group-name">${t('anim.cat.other')}</span>
        <span class="acp-group-sum">${summary}</span>
        <span class="acp-group-count">${tokens.length}</span>
      </button>
      ${open ? html`<div class="acp-group-body">${tokens.map((token) => this.renderClassBlock(token, side))}</div>` : nothing}
    </div>`;
  }

  protected optionChip(group: IAnimationGroup, option: IAnimationOption, active: Set<string>, state: IAnimationState, editable: boolean) {
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

  protected groupChip(group: IAnimationGroup, activeGroups: Set<string>, state: IAnimationState, editable: boolean) {
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
  protected renderCascade() {
    const children = this.target?.childCount ?? 0;
    const editable = this.mainSide.editable;
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
  protected renderCustom(group: IAnimationGroup) {
    const spec = group.custom;
    if (!spec) return nothing;
    const editable = this.mainSide.editable;
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

  protected chip(chip: {
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

  /** The tag's own `class` — the only section of anything that is not a molecule. */
  protected get tagSide(): IPickerSide {
    const target = this.target;
    return {
      channel: 'class',
      literal: target?.literal ?? '',
      editable: target?.editable ?? false,
      canRemoveLast: target?.canRemoveLast ?? false,
    };
  }

  /** One of the molecule's slots, through its `data-class`. */
  protected slotSide(at: number): IPickerSide {
    const slot = this.target?.slots[at];
    return {
      channel: 'data-class',
      literal: slot?.literal ?? '',
      editable: slot?.editable ?? false,
      canRemoveLast: slot?.canRemoveLast ?? false,
      slot: at,
    };
  }

  /** A molecule's inside, through its `data-class`; null for anything else. */
  protected get innerSide(): IPickerSide | null {
    const inner = this.target?.inner;
    if (!inner) return null;
    return { channel: 'data-class', literal: inner.literal, editable: inner.editable, canRemoveLast: inner.canRemoveLast };
  }

  /**
   * The part everything acts on: the tag of a plain element, or — on a molecule — the part chosen in the
   * selector (its inside by default). The Animations tab, copy and paste follow it, like the Style tab.
   */
  protected get mainSide(): IPickerSide {
    const inner = this.innerSide;
    if (!inner) return this.tagSide;
    const part = this.editPart;
    if (typeof part === 'number' && this.target?.slots[part]) return this.slotSide(part);
    return part === 'tag' ? this.tagSide : inner;
  }

  protected get literal(): string {
    return this.mainSide.literal;
  }

  /** The attribute of the main side — what the paste writes into. */
  protected get channel(): ClassChannel {
    return this.mainSide.channel;
  }

  /** The animation state of the selection, plus the switches flipped before anything was applied. */
  protected animationState(): IAnimationState {
    return { ...readAnimationState(this.literal), ...this.pendingState };
  }

  /** Same rule as every other chip: a class with no rule in the built css and no JIT does nothing. */
  protected availability(group: IAnimationGroup, option: IAnimationOption, isOn: boolean, state: IAnimationState) {
    const classes = option.classes.map((cls) => buildAnimationClass(cls, group.kind, state));
    return chipAvailability(isOn, classes.every((cls) => this.builtClasses.has(cls)), this.jitLive);
  }

  protected applyState(key: AnimationStateKey, value: string): void {
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

  protected applyCascadeStep(step: number, children: number): void {
    if (readCascade(this.literal).step === step) {
      this.applyLiteral(removeCascade(this.literal), t('status.cascadeRemoved'));
      return;
    }
    const result = applyCascade(this.literal, step, children, this.animationState());
    this.applyLiteral(result.literal, result.dropped > 0
      ? t('status.cascadePartial', { step, count: result.applied })
      : t('status.cascadeApplied', { step }));
  }

  protected commitCustom(groupId: string): void {
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

  protected commitTyped(token: IUtilityToken, spec: ITypedValueSpec, side: IPickerSide): void {
    const input = this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null;
    if (!input) return;
    if (input.value.trim() === '' || !Number.isFinite(Number(input.value))) {
      this.status(t('status.needNumber'));
      return;
    }
    const next = importantInChannel(applyTypedValue(side.literal, token, Number(input.value), spec), token.index, side.channel);
    this.typedEditing = null;
    this.applyLiteral(next, `${token.raw} → ${splitUtilities(next)[token.index]?.raw ?? ''}`, side);
  }

  /** Enter applies, Escape cancels — contained, exactly like the animations input. */
  protected onTypedKeydown(e: KeyboardEvent, token: IUtilityToken, spec: ITypedValueSpec, side: IPickerSide): void {
    e.stopPropagation();
    if (e.key === 'Enter') {
      e.preventDefault();
      this.commitTyped(token, spec, side);
    }
    if (e.key === 'Escape') {
      e.preventDefault();
      this.typedEditing = null;
    }
  }

  protected focusTypedSoon(): void {
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
  protected onCustomKeydown = (e: KeyboardEvent): void => {
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

  protected focusCustomSoon(): void {
    void this.updateComplete.then(() => {
      (this.renderRoot.querySelector('input[type="number"]') as HTMLInputElement | null)?.focus();
    });
  }

  protected applyLiteral(literal: string, what: string, side: IPickerSide = this.mainSide): void {
    if (literal === side.literal) return;
    this.preview(null);
    this.dispatchEvent(new CustomEvent<IPickerApply>('picker-apply', {
      detail: { literal, what, attribute: side.channel, slot: side.slot },
      bubbles: true,
      composed: true,
    }));
  }

  /** The editor owns the element, so it owns the preview: the panel only says WHAT to show. */
  protected preview(optionId: string | null): void {
    if (optionId && !animationOption(optionId)) return;
    const side = this.mainSide;
    this.emitPreview(optionId ? { option: optionId, attribute: side.channel, slot: side.slot } : null);
  }

  /** The other kind of preview: a whole class attribute, which is what a paste produces. */
  protected previewLiteral(literal: string | null, side: IPickerSide = this.mainSide): void {
    this.emitPreview(literal === null || literal === side.literal ? null : { literal, attribute: side.channel, slot: side.slot });
  }

  protected emitPreview(detail: IPickerPreview | null): void {
    this.dispatchEvent(new CustomEvent<IPickerPreview | null>('picker-preview', {
      detail,
      bubbles: true,
      composed: true,
    }));
  }

  protected status(message: string): void {
    this.dispatchEvent(new CustomEvent('picker-status', { detail: message, bubbles: true, composed: true }));
  }

  protected onClose = (): void => {
    this.preview(null);
    this.dispatchEvent(new CustomEvent('picker-close', { bubbles: true, composed: true }));
  };
}
