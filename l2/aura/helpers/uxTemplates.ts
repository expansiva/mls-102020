/// <mls fileReference="_102020_/l2/aura/helpers/uxTemplates.ts" enhancement="_blank" />

/**
 * The UX templates of a genome UX (`config.layouts[N]`), one per page, and the options a page can pick.
 *
 * A UX is a set of templates per page: `layouts[N].templates.pages["<module>/<page>"]` holds the full path
 * of the chosen `.md` (`_102020_/l4/collabux/templates/<category>/<file>.md`). The key carries the module
 * because `layouts` belongs to the project and the same page id can exist in two modules. A page with no
 * entry uses the template of its page11 (`template.category` of `web/desktop/page11/<page>.defs.ts`).
 *
 * The options come from `l4/collabux/templates/experienceIndex.json` → `categories[<category>]`, in the
 * index's order. The category is the folder segment of the page11 template path.
 *
 * PURE — no `mls.*`, no DOM. The plugin (`plugins/selectUx.ts`) reads the files and writes the config.
 */

export const UX_TEMPLATES_ROOT = '_102020_/l4/collabux/templates/';
export const UX_BESPOKE = 'bespoke';

export type UxLang = 'pt' | 'en';
export type UxText = Partial<Record<UxLang, string>>;

export interface IUxIndexEntry {
    experience: string;
    file: string;           // "<category>/<file>.md", relative to UX_TEMPLATES_ROOT
    label?: UxText;
    description?: UxText;
    bestFor?: UxText;
}

export interface IUxExperienceIndex {
    description?: string;
    categories: Record<string, IUxIndexEntry[]>;
}

/** The part of a `config.layouts[N]` entry this helper reads and writes. */
export interface IUxLayout {
    name?: string;
    useMolecules?: boolean;
    templates?: { pages?: Record<string, string> };
    [key: string]: unknown;
}

export interface IUxTemplateOption {
    experience: string;
    template: string;       // full path, the value stored in templates.pages
    label: string;
    description: string;
    bestFor: string;
    isDefault: boolean;     // the page11 template
}

/** Why a page offers no option: no page11 defs, a bespoke page, or a category absent from the index. */
export type UxOptionsReason = 'noDefs' | 'bespoke' | 'unknownCategory';

export interface IUxTemplateOptions {
    category: string | null;
    options: IUxTemplateOption[];
    reason: UxOptionsReason | null;
}

/** Key of a page in `templates.pages`. */
export function uxPageKey(module: string, page: string): string {
    return `${module}/${page}`;
}

/** Full path of an index entry's file. */
export function uxTemplatePath(file: string): string {
    return `${UX_TEMPLATES_ROOT}${file}`;
}

/**
 * Category of a page11 `template.category` value: the folder segment of
 * `_102020_/l4/collabux/templates/<category>/<file>.md`, or `bespoke` as is. Anything else is null.
 */
export function uxTemplateCategory(templatePath: string | null | undefined): string | null {
    const value = (templatePath ?? '').trim();
    if (!value) return null;
    if (value === UX_BESPOKE) return UX_BESPOKE;
    if (!value.startsWith(UX_TEMPLATES_ROOT)) return null;
    const [category, file] = value.slice(UX_TEMPLATES_ROOT.length).split('/');
    return category && file ? category : null;
}

/** The template chosen for a page in this UX, or null when the page uses its page11 one. */
export function getPageTemplate(layout: IUxLayout | null | undefined, key: string): string | null {
    const value = layout?.templates?.pages?.[key];
    return typeof value === 'string' && value ? value : null;
}

/**
 * Writes (or, with null, deletes) the page's entry. Deleting the last entry also deletes `pages`, and an
 * empty `templates` with it, so "back to default" leaves no trace in the config.
 */
export function setPageTemplate(layout: IUxLayout, key: string, template: string | null): void {
    if (template) {
        const templates = isRecord(layout.templates) ? layout.templates : {};
        const pages = isRecord(templates.pages) ? templates.pages : {};
        pages[key] = template;
        templates.pages = pages;
        layout.templates = templates;
        return;
    }
    const templates = layout.templates;
    if (!isRecord(templates)) return;
    if (isRecord(templates.pages)) {
        delete templates.pages[key];
        if (!Object.keys(templates.pages).length) delete templates.pages;
    }
    if (!Object.keys(templates).length) delete layout.templates;
}

/** How many pages of this UX have a template chosen. */
export function countPageTemplates(layout: IUxLayout | null | undefined): number {
    const pages = layout?.templates?.pages;
    return isRecord(pages) ? Object.values(pages).filter(v => typeof v === 'string' && v).length : 0;
}

/**
 * The options of the page's category, in the index's order, the page11 one marked as default.
 * `page11Template` is the page11 `template.category` (null when the page has no page11 defs).
 */
export function buildTemplateOptions(
    index: IUxExperienceIndex | null | undefined,
    page11Template: string | null | undefined,
    lang: UxLang,
): IUxTemplateOptions {
    const category = uxTemplateCategory(page11Template);
    if (!page11Template) return { category: null, options: [], reason: 'noDefs' };
    if (category === UX_BESPOKE) return { category, options: [], reason: 'bespoke' };
    const entries = category ? index?.categories?.[category] : undefined;
    if (!category || !Array.isArray(entries) || !entries.length) return { category, options: [], reason: 'unknownCategory' };
    const options = entries.map(entry => {
        const template = uxTemplatePath(entry.file);
        return {
            experience: entry.experience,
            template,
            label: pick(entry.label, lang) || entry.experience,
            description: pick(entry.description, lang),
            bestFor: pick(entry.bestFor, lang),
            isDefault: template === page11Template,
        };
    });
    return { category, options, reason: null };
}

/**
 * The template in effect for the page: the entry when there is one, the page11 one otherwise.
 * `missing` flags an entry that is not among the options (a template renamed or removed).
 */
export function resolveEffectiveTemplate(
    layout: IUxLayout | null | undefined,
    key: string,
    page11Template: string | null | undefined,
    options: readonly IUxTemplateOption[],
): { template: string | null; isDefault: boolean; missing: boolean } {
    const chosen = getPageTemplate(layout, key);
    if (!chosen) return { template: page11Template || null, isDefault: true, missing: false };
    return { template: chosen, isDefault: chosen === page11Template, missing: !options.some(o => o.template === chosen) };
}

function pick(text: UxText | undefined, lang: UxLang): string {
    return text?.[lang] ?? text?.en ?? text?.pt ?? '';
}

function isRecord(value: unknown): value is Record<string, any> {
    return !!value && typeof value === 'object' && !Array.isArray(value);
}
