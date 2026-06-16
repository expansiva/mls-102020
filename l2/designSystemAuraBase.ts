/// <mls fileReference="_102020_/l2/designSystemAuraBase.ts" enhancement="_blank" />

// Canonical vocabulary of design-system decision axes — single source of truth
// (DSDefinition.md §4). Shared by:
//   - the `selectDesignSystem` configuration UI (which axes/values to render);
//   - molecule `.defs.ts` files (each molecule declares the axis values it
//     candidates for, via `export const designsystem: IDesignSystemAxes`);
//   - the matching agent (resolve a DS → pick the molecules that match).
//
// An axis is a UX preference that applies to the whole page. Axes omitted from a
// DS fall back to the `default` declared here. `label`/`section`/`essential` are
// presentation hints for the configuration UI; the matching contract is `values`
// + `default` + `groups`.

export type DsSectionKey =
    | 'transversal'
    | 'input'
    | 'selection'
    | 'navigation'
    | 'feedback'
    | 'action'
    | 'visualization';

export interface IDsSection {
    key: DsSectionKey;
    label: string;
}

export interface IDsAxisDef {
    label: string;
    section: DsSectionKey;
    values: readonly string[];
    default: string;
    /** UX groups this axis governs (transversal axes span many groups). */
    groups?: readonly string[];
    /** part of the curated "essential" subset shown by default in the UI. */
    essential?: boolean;
}

export const dsSections = [
    { key: 'transversal',   label: 'General' },
    { key: 'input',         label: 'Input' },
    { key: 'selection',     label: 'Selection' },
    { key: 'navigation',    label: 'Navigation' },
    { key: 'feedback',      label: 'Feedback & status' },
    { key: 'action',        label: 'Action & content' },
    { key: 'visualization', label: 'Visualization' },
] as const satisfies readonly IDsSection[];

// Keyed by axis name (DSDefinition.md §4). `as const` preserves the literal value
// types so molecule declarations can be validated against the exact allowed set.
export const dsAxes = {
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
    intervalInput:  { label: 'Interval input', section: 'input', values: ['dual-calendar', 'drag', 'presets', 'timeline', 'slider'], default: 'dual-calendar', groups: ['groupEnterDateInterval', 'groupEnterDatetimeInterval', 'groupEnterTimeInterval'] },

    // ── seleção ──
    selectOne:      { label: 'Select one',  section: 'selection', values: ['dropdown', 'radio', 'segmented', 'cards', 'listbox', 'slider', 'dial'], default: 'dropdown', essential: true, groups: ['groupSelectOne'] },
    selectMany:     { label: 'Select many', section: 'selection', values: ['dropdown', 'checkbox-list', 'dual-list', 'popover'], default: 'checkbox-list', essential: true, groups: ['groupSelectMany'] },
    upload:         { label: 'File upload',  section: 'selection', values: ['dropzone', 'button', 'avatar'], default: 'dropzone', groups: ['groupSelectFileForUpload'] },

    // ── navegação ──
    navMain:        { label: 'Main navigation',    section: 'navigation', values: ['sidebar', 'topbar', 'bottom-tabs'], default: 'sidebar', groups: ['groupNavigateMain'] },
    sectionNav:     { label: 'Section navigation', section: 'navigation', values: ['tabs', 'pills', 'breadcrumb', 'scrollspy'], default: 'tabs', groups: ['groupNavigateSection'] },
    steps:          { label: 'Steps',              section: 'navigation', values: ['horizontal', 'vertical'], default: 'horizontal', groups: ['groupNavigateSteps'] },

    // ── feedback / status ──
    feedback:       { label: 'User feedback', section: 'feedback', values: ['toast', 'banner', 'inline'], default: 'inline', essential: true, groups: ['groupNotifyUser'] },
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
    metric:         { label: 'Metric',       section: 'visualization', values: ['big-number', 'gauge'], default: 'big-number', groups: ['groupViewMetric'] },
    hierarchy:      { label: 'Hierarchy',    section: 'visualization', values: ['tree', 'orgchart'], default: 'tree', groups: ['groupViewHierarchy'] },
} as const satisfies Record<string, IDsAxisDef>;

// ─── Derived types ───────────────────────────────────────────────────────────

export type DsAxisKey = keyof typeof dsAxes;
export type DsAxisValue<K extends DsAxisKey> = (typeof dsAxes)[K]['values'][number];

/**
 * The `designsystem` bag, declared by the DS file and by each molecule `.defs.ts`.
 * Every axis is optional; omitting one means "wildcard" (molecule) / "use default" (DS).
 *
 * @example a molecule declares the axis values it candidates for:
 *   export const designsystem: IDesignSystemAxes = { feedback: 'toast' };
 */
export type IDesignSystemAxes = { [K in DsAxisKey]?: DsAxisValue<K> };

// ─── Convenience accessors ─────────────────────────────────────────────────────

export interface IDsAxisEntry extends IDsAxisDef { key: DsAxisKey; }

export const dsAxisKeys = Object.keys(dsAxes) as DsAxisKey[];

/** Ordered list form of `dsAxes`, each entry carrying its own `key`. */
export const dsAxisList: readonly IDsAxisEntry[] =
    dsAxisKeys.map(k => ({ key: k, ...(dsAxes[k] as IDsAxisDef) }));

/** Curated subset shown by default in the configuration UI. */
export const essentialAxisList: readonly IDsAxisEntry[] =
    dsAxisList.filter(a => a.essential);

/** Every axis at its default value. */
export function dsDefaults(): Record<DsAxisKey, string> {
    const out = {} as Record<DsAxisKey, string>;
    for (const k of dsAxisKeys) out[k] = dsAxes[k].default;
    return out;
}

/** True when `value` is a valid choice for `key` (validates DS files and molecule defs). */
export function isValidAxisValue(key: string, value: string): boolean {
    const axis = (dsAxes as Record<string, IDsAxisDef>)[key];
    return !!axis && axis.values.includes(value);
}
