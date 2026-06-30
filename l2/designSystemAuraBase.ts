/// <mls fileReference="_102020_/l2/designSystemAuraBase.ts" enhancement="_blank" />

// Canonical vocabulary of layout RULE axes — single source of truth. Shared by:
//   - the `selectLayoutRules` configuration UI (which axes/values to render);
//   - molecule `.defs.ts` files (each molecule declares the axis values it candidates
//     for, via `export const layoutConfig`);
//   - the matching agent (resolve a layout's rules → pick the molecules that match).
//
// An axis is a UX preference that applies to the whole page. Axes omitted from a
// layout fall back to the `default` declared here. `label`/`section`/`essential` are
// presentation hints for the configuration UI; the matching contract is `values`
// + `default` + `groups`.

export type LayoutSectionKey =
    | 'transversal'
    | 'input'
    | 'selection'
    | 'navigation'
    | 'feedback'
    | 'action'
    | 'visualization';

export interface ILayoutSection {
    key: LayoutSectionKey;
    label: string;
    desc: string;
    /** one of the few sections shown up-front; the rest are added on demand. */
    primary?: boolean;
}

export interface ILayoutAxisDef {
    label: string;
    section: LayoutSectionKey;
    values: readonly string[];
    default: string;
    /** UX groups this axis governs (transversal axes span many groups). */
    groups?: readonly string[];
    /** part of the curated "essential" subset shown by default in the UI. */
    essential?: boolean;
}

export const layoutSections: readonly ILayoutSection[] = [
    { key: 'transversal',   label: 'General',           desc: 'Defaults that apply across the whole interface.', primary: true },
    { key: 'input',         label: 'Input',             desc: 'How users type and edit values.', primary: true },
    { key: 'selection',     label: 'Selection',         desc: 'How users choose from a set of options.', primary: true },
    { key: 'navigation',    label: 'Navigation',        desc: 'How users move between areas and steps.' },
    { key: 'feedback',      label: 'Feedback & status', desc: 'How the interface responds and reports status.' },
    { key: 'action',        label: 'Action & content',  desc: 'Actions, ratings and expandable content.' },
    { key: 'visualization', label: 'Visualization',     desc: 'How collections and data are displayed.' },
];

// Keyed by axis name. `as const` preserves the literal value types so molecule
// declarations can be validated against the exact allowed set.
export const layoutAxes = {
    // ── transversais (afetam muitos grupos) ──
    density:        { label: 'Density',         section: 'transversal', values: ['comfortable', 'compact'],              default: 'comfortable', essential: true },
    motion:         { label: 'Motion',          section: 'transversal', values: ['full', 'reduced', 'none'],             default: 'full' },
    labelPlacement: { label: 'Label placement', section: 'transversal', values: ['top', 'inline', 'floating'],           default: 'top', essential: true,
                      groups: ['groupEnterText', 'groupEnterNumber', 'groupEnterMoney'] },
    validation:     { label: 'Validation',      section: 'transversal', values: ['inline-below', 'tooltip', 'summary'],  default: 'inline-below', essential: true },
    requiredMark:   { label: 'Required mark',   section: 'transversal', values: ['asterisk', 'optional-tag', 'none'],    default: 'asterisk', essential: true },
    listOverflow:   { label: 'List overflow',   section: 'transversal', values: ['pagination', 'infinite', 'load-more'], default: 'pagination',
                      groups: ['groupViewData', 'groupViewTable', 'groupSelectMany'] },

    // ── entrada ──
    boolean:        { label: 'Boolean input',  section: 'input', values: ['checkbox', 'toggle', 'segmented', 'icon'], default: 'checkbox', essential: true, groups: ['groupEnterBoolean'] },
    numberInput:    { label: 'Number input',   section: 'input', values: ['input', 'stepper', 'slider'],              default: 'input', groups: ['groupEnterNumber'] },
    dateInput:      { label: 'Date input',     section: 'input', values: ['calendar-popover', 'inline-calendar', 'compact', 'shortcuts', 'masked'], default: 'calendar-popover', groups: ['groupEnterDate', 'groupEnterDatetime'] },
    timeInput:      { label: 'Time input',     section: 'input', values: ['clock', 'scroll-picker', 'duration'],      default: 'clock', groups: ['groupEnterTime'] },
    intervalInput:  { label: 'Interval input', section: 'input', values: ['dual-calendar', 'drag', 'presets', 'timeline', 'slider', 'fields', 'duration'], default: 'dual-calendar', groups: ['groupEnterDateInterval', 'groupEnterDatetimeInterval', 'groupEnterTimeInterval'] },

    // ── seleção ──
    selectOne:      { label: 'Select one',  section: 'selection', values: ['dropdown', 'radio', 'segmented', 'cards', 'listbox', 'slider', 'dial'], default: 'dropdown', essential: true, groups: ['groupSelectOne'] },
    selectMany:     { label: 'Select many', section: 'selection', values: ['dropdown', 'checkbox-list', 'dual-list', 'popover'], default: 'checkbox-list', essential: true, groups: ['groupSelectMany'] },
    upload:         { label: 'File upload',  section: 'selection', values: ['dropzone', 'button', 'avatar'], default: 'dropzone', groups: ['groupSelectFileForUpload'] },

    // ── navegação ──
    navMain:        { label: 'Main navigation',    section: 'navigation', values: ['sidebar', 'topbar', 'bottom-tabs'], default: 'sidebar', groups: ['groupNavigateMain'] },
    sectionNav:     { label: 'Section navigation', section: 'navigation', values: ['tabs', 'pills', 'breadcrumb', 'scrollspy'], default: 'tabs', groups: ['groupNavigateSection'] },
    steps:          { label: 'Steps',              section: 'navigation', values: ['horizontal', 'vertical'], default: 'horizontal', groups: ['groupNavigateSteps'] },

    // ── feedback / status ──
    feedback:       { label: 'User feedback', section: 'feedback', values: ['toast', 'banner', 'inline', 'modal'], default: 'inline', essential: true, groups: ['groupNotifyUser'] },
    progress:       { label: 'Progress',      section: 'feedback', values: ['linear', 'circular', 'segmented', 'spinner'], default: 'linear', groups: ['groupShowProgress'] },

    // ── ação / rating / expand / search ──
    actionStyle:    { label: 'Action style',   section: 'action', values: ['standard', 'icon', 'split', 'kebab'], default: 'standard', groups: ['groupTriggerAction'] },
    rating:         { label: 'Rating',         section: 'action', values: ['stars', 'thumbs', 'nps', 'emoji', 'slider', 'tags'], default: 'stars', groups: ['groupRateItem'] },
    expand:         { label: 'Expand content', section: 'action', values: ['accordion', 'collapsible', 'readmore', 'overlay'], default: 'accordion', groups: ['groupExpandContent'] },
    accordionMode:  { label: 'Accordion mode', section: 'action', values: ['single', 'multiple'], default: 'single', groups: ['groupExpandContent'] },
    search:         { label: 'Search',         section: 'action', values: ['bar', 'bar-with-history'], default: 'bar', groups: ['groupSearchContent'] },

    // ── visualização ──
    recordsView:    { label: 'Records view', section: 'visualization', values: ['table', 'grid', 'list', 'kanban', 'calendar', 'timeline'], default: 'table', essential: true, groups: ['groupViewData', 'groupViewTable'] },
    cardLayout:     { label: 'Card layout',  section: 'visualization', values: ['horizontal', 'vertical', 'media', 'profile'], default: 'vertical', groups: ['groupViewCard'] },
    metric:         { label: 'Metric',       section: 'visualization', values: ['big-number', 'gauge', 'sparkline'], default: 'big-number', groups: ['groupViewMetric'] },
    hierarchy:      { label: 'Hierarchy',    section: 'visualization', values: ['tree', 'orgchart', 'mindmap'], default: 'tree', groups: ['groupViewHierarchy'] },
} as const satisfies Record<string, ILayoutAxisDef>;

// ─── Derived types ───────────────────────────────────────────────────────────

export type LayoutAxisKey = keyof typeof layoutAxes;
export type LayoutAxisValue<K extends LayoutAxisKey> = (typeof layoutAxes)[K]['values'][number];

/**
 * The axis bag, declared by each molecule `.defs.ts` (`export const layoutConfig`).
 * Every axis is optional; omitting one means "wildcard" (molecule) / "use default" (layout).
 */
export type ILayoutAxes = { [K in LayoutAxisKey]?: LayoutAxisValue<K> };

// ─── Convenience accessors ─────────────────────────────────────────────────────

export interface ILayoutAxisEntry extends ILayoutAxisDef { key: LayoutAxisKey; }

export const layoutAxisKeys = Object.keys(layoutAxes) as LayoutAxisKey[];

/** Ordered list form of `layoutAxes`, each entry carrying its own `key`. */
export const layoutAxisList: readonly ILayoutAxisEntry[] =
    layoutAxisKeys.map(k => ({ key: k, ...(layoutAxes[k] as ILayoutAxisDef) }));

/** Curated subset shown by default in the configuration UI. */
export const essentialAxisList: readonly ILayoutAxisEntry[] =
    layoutAxisList.filter(a => a.essential);

/** Every axis at its default value. */
export function layoutRuleDefaults(): Record<LayoutAxisKey, string> {
    const out = {} as Record<LayoutAxisKey, string>;
    for (const k of layoutAxisKeys) out[k] = layoutAxes[k].default;
    return out;
}

/** True when `value` is a valid choice for `key` (validates layout rules and molecule defs). */
export function isValidAxisValue(key: string, value: string): boolean {
    const axis = (layoutAxes as Record<string, ILayoutAxisDef>)[key];
    return !!axis && axis.values.includes(value);
}
