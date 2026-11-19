/// <mls fileReference="_102020_/l2/aura/helpers/componentUsage.ts" enhancement="_blank" />
// Where each component is used: the index behind serviceComponentExplorer.
//
// PURE — no Lit, no `mls.*`. The service reads the files from the stor and hands them here already read;
// turning a tag into a file is a FUNCTION it passes in (`resolveTag`), so this file stays testable in node.
//
// THE RULE: read both and cross them
//   - the IMPORT gives the exact file of the component;
//   - the TAG in the template confirms the use, how many times and on which lines.
//   import + tag  -> confirmed use, with its lines
//   import, no tag (side-effect import) -> "import without use"
//   tag, no import -> "used without import" (works only because some other file loaded it: fragile)
//
// A tag is resolved first by the tags the read files DECLARE (`@customElement('x')`), which is exact for
// both formats; only a tag no read file declares goes to `resolveTag`. Building the tag by hand from the
// path is what NOT to do: it misses the legacy format (`molecules--ml-scenary-102020`).

export interface IFileRef {
  project: number;
  /** Folder under l2, '' for the root. */
  folder: string;
  shortName: string;
}

export interface IUsageSource extends IFileRef {
  content: string;
}

export type TagResolver = (tag: string) => IFileRef | undefined;

/** One entry of `frontend.pages[]` in l5/config.json (only what this reads). */
export interface IConfigPage {
  source?: string;
  title?: string;
  route?: string;
}

export interface IUsageInput {
  /** The project whose pages are the screens. */
  project: number;
  /** The `.ts` files already read: pages and components of the project, components of the dependencies. */
  sources: IUsageSource[];
  /** Fallback for a tag no read file declares. */
  resolveTag?: TagResolver;
  /** `frontend.pages[]` of every module of the project: title and route of each screen. */
  pages?: IConfigPage[];
}

export interface IScreen {
  /** `<module>/<pageId>` */
  key: string;
  module: string;
  pageId: string;
  title: string;
  /** Route without its parameters, '' when the config declares none. */
  route: string;
}

export interface IVariationUse {
  key: string;
  ref: IFileRef;
  /** `desktop/page11` */
  variation: string;
  lines: number[];
  imported: boolean;
}

export interface IScreenUse {
  screen: IScreen;
  variations: IVariationUse[];
  count: number;
}

export interface IModuleUse {
  module: string;
  screens: IScreenUse[];
}

/** A component (or other non-page file) that uses this one in its template. */
export interface IInnerUse {
  key: string;
  ref: IFileRef;
  lines: number[];
  imported: boolean;
  /** The screens that reach it. */
  screens: IScreen[];
}

export interface IComponentUsage {
  key: string;
  ref: IFileRef;
  /** The declared tag, or the tag it was used with when the file was not read. */
  tag: string;
  /** Last folder segment: the molecule "group". */
  group: string;
  origin: 'project' | 'dependency';
  /** False when the file itself was not read (known only by a resolved tag). */
  loaded: boolean;
  /** Tag occurrences, everywhere. */
  uses: number;
  /** Every screen that shows it, directly or through another component. */
  screens: IScreen[];
  /** Direct uses in pages, grouped by module and screen. */
  modules: IModuleUse[];
  /** Components (and other files) that use it. */
  inner: IInnerUse[];
  /** Nothing uses it and nothing imports it. */
  unused: boolean;
}

export type UsageWarningKind = 'import-without-use' | 'used-without-import' | 'unused-component' | 'unresolved-tag';

export interface IUsageWarning {
  kind: UsageWarningKind;
  /** The file where it happens (the page, for the first two kinds). */
  file?: IFileRef;
  component?: IFileRef;
  tag?: string;
  lines: number[];
}

export interface IUsageIndex {
  components: IComponentUsage[];
  warnings: IUsageWarning[];
  screens: IScreen[];
}

// ─── Keys and paths ─────────────────────────────────────────────────

export function fileKey(ref: IFileRef): string {
  return `_${ref.project}_/l2/${ref.folder ? ref.folder + '/' : ''}${ref.shortName}`;
}

/** The `source` the config writes for a file: `l2/<folder>/<shortName>.ts`. */
export function sourceOf(ref: IFileRef): string {
  return `l2/${ref.folder ? ref.folder + '/' : ''}${ref.shortName}.ts`;
}

const PAGE_FOLDER = /^([^/]+)\/(?:web\/)?(desktop|mobile|android|ios)\/(page\d+)$/;

/** Module and variation of a page file, or undefined when the folder is not a page folder. */
export function pageOf(ref: IFileRef): { module: string; variation: string } | undefined {
  const match = PAGE_FOLDER.exec(ref.folder);
  if (!match) return undefined;
  return { module: match[1], variation: `${match[2]}/${match[3]}` };
}

// ─── Reading one file ───────────────────────────────────────────────

/**
 * The source with its comments (`//`, `/* *\/`, and `<!-- -->` inside templates) blanked out. Every
 * blanked character becomes a space and newlines stay, so offsets and line numbers do not move.
 */
export function stripComments(src: string): string {
  const out = src.split('');
  const blank = (from: number, to: number) => {
    for (let i = from; i < to; i++) if (out[i] !== '\n') out[i] = ' ';
  };
  // Code inside `${…}` of a template is a frame of its own; `depth` counts its open braces.
  const stack: { kind: 'code' | 'tpl'; depth: number }[] = [{ kind: 'code', depth: 0 }];
  let i = 0;
  while (i < src.length) {
    const top = stack[stack.length - 1];
    const c = src[i];
    const n = src[i + 1];
    if (top.kind === 'tpl') {
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { stack.pop(); i++; continue; }
      if (c === '$' && n === '{') { stack.push({ kind: 'code', depth: 0 }); i += 2; continue; }
      if (c === '<' && src.startsWith('<!--', i)) {
        const end = src.indexOf('-->', i + 4);
        const stop = end === -1 ? src.length : end + 3;
        blank(i, stop);
        i = stop;
        continue;
      }
      i++;
      continue;
    }
    if (c === '/' && n === '/') {
      const end = src.indexOf('\n', i);
      const stop = end === -1 ? src.length : end;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '/' && n === '*') {
      const end = src.indexOf('*/', i + 2);
      const stop = end === -1 ? src.length : end + 2;
      blank(i, stop);
      i = stop;
      continue;
    }
    if (c === '"' || c === "'") {
      // A quote string never crosses a line: an unterminated one (a regex literal with a quote) ends there.
      i++;
      while (i < src.length && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i++;
      continue;
    }
    if (c === '`') { stack.push({ kind: 'tpl', depth: 0 }); i++; continue; }
    if (c === '{') { top.depth++; i++; continue; }
    if (c === '}') {
      if (top.depth === 0 && stack.length > 1) stack.pop();
      else top.depth--;
      i++;
      continue;
    }
    i++;
  }
  return out.join('');
}

function lineStarts(text: string): number[] {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text[i] === '\n') starts.push(i + 1);
  return starts;
}

function lineAt(starts: number[], offset: number): number {
  let lo = 0;
  let hi = starts.length - 1;
  while (lo < hi) {
    const mid = (lo + hi + 1) >> 1;
    if (starts[mid] <= offset) lo = mid;
    else hi = mid - 1;
  }
  return lo + 1;
}

export interface IImportRef {
  ref: IFileRef;
  /** `import '…'`, no names: loads the file only for what it registers. */
  sideEffect: boolean;
  line: number;
}

/** An l2 import specifier as a file: `/_102040_/l2/molecules/g/ml-x.js` or `./x.js`. Others (lit, …) give undefined. */
export function resolveImport(spec: string, from: IFileRef): IFileRef | undefined {
  let project: number;
  let path: string;
  const abs = /^\/_(\d+)_\/l2\/(.+)$/.exec(spec);
  if (abs) {
    project = Number(abs[1]);
    path = abs[2];
  } else if (spec.startsWith('./') || spec.startsWith('../')) {
    project = from.project;
    const parts = from.folder ? from.folder.split('/') : [];
    for (const segment of spec.split('/')) {
      if (segment === '.' || segment === '') continue;
      if (segment === '..') parts.pop();
      else parts.push(segment);
    }
    path = parts.join('/');
  } else {
    return undefined;
  }
  path = path.replace(/\.(js|ts)$/, '');
  const slash = path.lastIndexOf('/');
  const shortName = path.slice(slash + 1);
  if (!shortName) return undefined;
  return { project, folder: slash < 0 ? '' : path.slice(0, slash), shortName };
}

/** Static imports and re-exports (type-only ones left out). Expects the text with comments stripped. */
export function parseImports(text: string, from: IFileRef): IImportRef[] {
  const starts = lineStarts(text);
  const found: IImportRef[] = [];
  const named = /(?<![\w$.])(import|export)\s+(type\s+)?([\w$*{}\s,]+?)\s+from\s*(['"])([^'"\n]+)\4/g;
  const bare = /(?<![\w$.])import\s*(['"])([^'"\n]+)\1/g;
  for (const m of text.matchAll(named)) {
    if (m[2]) continue;
    const ref = resolveImport(m[5], from);
    if (ref) found.push({ ref, sideEffect: false, line: lineAt(starts, m.index ?? 0) });
  }
  for (const m of text.matchAll(bare)) {
    const ref = resolveImport(m[2], from);
    if (ref) found.push({ ref, sideEffect: true, line: lineAt(starts, m.index ?? 0) });
  }
  return found;
}

/** Opening tags of custom elements (a hyphen in the name), with their 1-based lines. Expects comments stripped. */
export function parseTags(text: string): { tag: string; line: number }[] {
  const starts = lineStarts(text);
  const found: { tag: string; line: number }[] = [];
  const re = /<([a-z][a-z0-9]*(?:--?[a-z0-9]+)+)(?=[\s/>])/g;
  for (const m of text.matchAll(re)) found.push({ tag: m[1], line: lineAt(starts, m.index ?? 0) });
  return found;
}

/**
 * Tags the file registers: `@customElement(…)`, `customElements.define(…)` and any `define…(…)` helper
 * (`defineMoleculeOnce(TAG, Class)`). The first argument may be a string or a string constant of the same
 * file (`const TAG = 'molecules--ml-scenary-102020'`). Only names with a hyphen count: a custom element
 * always has one, `Object.defineProperty(obj, …)` never passes one.
 */
export function declaredTags(text: string): string[] {
  const constants = new Map<string, string>();
  for (const m of text.matchAll(/\bconst\s+([A-Za-z_$][\w$]*)\s*(?::\s*string\s*)?=\s*['"]([^'"\n]+)['"]/g)) constants.set(m[1], m[2]);
  const tags: string[] = [];
  const re = /(?:@customElement|(?<![\w$])define\w*)\(\s*(?:['"]([^'"\n]+)['"]|([A-Za-z_$][\w$]*))/g;
  for (const m of text.matchAll(re)) {
    const tag = m[1] ?? constants.get(m[2]);
    if (tag && tag.includes('-') && !tags.includes(tag)) tags.push(tag);
  }
  return tags;
}

export interface IParsedSource {
  key: string;
  ref: IFileRef;
  imports: IImportRef[];
  tags: { tag: string; line: number }[];
  declares: string[];
}

export function parseSource(source: IUsageSource): IParsedSource {
  const ref: IFileRef = { project: source.project, folder: source.folder, shortName: source.shortName };
  const text = stripComments(source.content);
  return {
    key: fileKey(ref),
    ref,
    imports: parseImports(text, ref),
    tags: parseTags(text),
    declares: declaredTags(text),
  };
}

/**
 * The files a parsed source leads to: the targets of its tags and of its side-effect imports. The service
 * reads these too (components inside components); named imports (shared, helpers) are not followed.
 */
export function followTargets(parsed: IParsedSource, resolveTag: (tag: string) => IFileRef | undefined): IFileRef[] {
  const targets: IFileRef[] = [];
  for (const imp of parsed.imports) if (imp.sideEffect) targets.push(imp.ref);
  for (const { tag } of parsed.tags) {
    const ref = resolveTag(tag);
    if (ref) targets.push(ref);
  }
  return targets;
}

// ─── Screens ────────────────────────────────────────────────────────

function routeWithoutParams(route: string): string {
  return route.split('/').filter((segment) => !segment.startsWith(':')).join('/');
}

/** The config entry of a page file: by exact source, then (mobile only) by its desktop mirror. */
function configPageOf(ref: IFileRef, pages: IConfigPage[]): IConfigPage | undefined {
  const source = sourceOf(ref);
  const exact = pages.find((page) => page?.source === source);
  if (exact || !source.includes('/web/mobile/')) return exact;
  const mirror = source.replace('/web/mobile/', '/web/desktop/');
  return pages.find((page) => page?.source === mirror);
}

/** Desktop first, then mobile, then the rest; page11 before page21. */
function variationOrder(a: string, b: string): number {
  const rank = (v: string) => (v.startsWith('desktop/') ? 0 : v.startsWith('mobile/') ? 1 : 2);
  return rank(a) - rank(b) || a.localeCompare(b, undefined, { numeric: true });
}

// ─── The index ──────────────────────────────────────────────────────

export function buildComponentUsage(input: IUsageInput): IUsageIndex {
  const pages = input.pages ?? [];
  const parsed = new Map<string, IParsedSource>();
  for (const source of input.sources) {
    const p = parseSource(source);
    parsed.set(p.key, p);
  }

  // Tag -> file: declared first (exact for both formats), then the resolver.
  const declared = new Map<string, IFileRef>();
  for (const p of parsed.values()) for (const tag of p.declares) if (!declared.has(tag)) declared.set(tag, p.ref);
  const resolved = new Map<string, IFileRef | undefined>();
  const resolveTag = (tag: string): IFileRef | undefined => {
    if (declared.has(tag)) return declared.get(tag);
    if (!resolved.has(tag)) resolved.set(tag, input.resolveTag?.(tag));
    return resolved.get(tag);
  };

  // Screens: the pages of the project, one screen per <module>/<pageId>, the variations inside it.
  const isPage = (ref: IFileRef) => ref.project === input.project && !!pageOf(ref);
  const screenOfPage = new Map<string, IScreen>();
  const screens = new Map<string, IScreen>();
  const pageFiles = [...parsed.values()].filter((p) => isPage(p.ref))
    .sort((a, b) => variationOrder(pageOf(a.ref)!.variation, pageOf(b.ref)!.variation));
  for (const p of pageFiles) {
    const { module } = pageOf(p.ref)!;
    const key = `${module}/${p.ref.shortName}`;
    let screen = screens.get(key);
    const entry = configPageOf(p.ref, pages);
    if (!screen) {
      screen = { key, module, pageId: p.ref.shortName, title: '', route: '' };
      screens.set(key, screen);
    }
    if (!screen.title && entry?.title) screen.title = String(entry.title);
    if (!screen.route && entry?.route) screen.route = routeWithoutParams(String(entry.route));
    screenOfPage.set(p.key, screen);
  }

  // Components: non-page files that declare an element, plus every resolved tag target.
  const components = new Map<string, { ref: IFileRef; tag: string; loaded: boolean }>();
  for (const p of parsed.values()) {
    if (isPage(p.ref) || !p.declares.length) continue;
    components.set(p.key, { ref: p.ref, tag: p.declares[0], loaded: true });
  }
  // All tags first, so whether an import points at a component does not depend on the order of the files.
  for (const p of parsed.values()) {
    for (const { tag } of p.tags) {
      const ref = resolveTag(tag);
      if (!ref) continue;
      const key = fileKey(ref);
      if (key !== p.key && !components.has(key)) components.set(key, { ref, tag, loaded: parsed.has(key) });
    }
  }

  interface ITagUse { consumer: string; lines: number[]; imported: boolean }
  const usesOf = new Map<string, ITagUse[]>();
  const importedBy = new Map<string, Set<string>>();
  /** target -> files that carry it to a screen (tag uses, and named imports of non-components). */
  const reverse = new Map<string, Set<string>>();
  const addReverse = (target: string, from: string) => {
    if (!reverse.has(target)) reverse.set(target, new Set());
    reverse.get(target)!.add(from);
  };
  const warnings: IUsageWarning[] = [];

  for (const p of parsed.values()) {
    const lines = new Map<string, { ref: IFileRef; tag: string; lines: number[] }>();
    const unresolved = new Map<string, number[]>();
    for (const { tag, line } of p.tags) {
      const ref = resolveTag(tag);
      if (!ref) {
        if (!unresolved.has(tag)) unresolved.set(tag, []);
        unresolved.get(tag)!.push(line);
        continue;
      }
      const key = fileKey(ref);
      if (key === p.key) continue;
      if (!lines.has(key)) lines.set(key, { ref, tag, lines: [] });
      lines.get(key)!.lines.push(line);
    }
    // Problems are reported for the project's own files: a dependency's demo page is not this project's.
    const own = p.ref.project === input.project;
    if (own) for (const [tag, at] of unresolved) warnings.push({ kind: 'unresolved-tag', file: p.ref, tag, lines: at });

    const imports = new Map<string, IImportRef>();
    for (const imp of p.imports) {
      const key = fileKey(imp.ref);
      if (key === p.key) continue;
      const known = imports.get(key);
      if (!known || (known.sideEffect && !imp.sideEffect)) imports.set(key, imp);
      if (!importedBy.has(key)) importedBy.set(key, new Set());
      importedBy.get(key)!.add(p.key);
    }

    for (const [key, use] of lines) {
      const imported = imports.has(key);
      if (!usesOf.has(key)) usesOf.set(key, []);
      usesOf.get(key)!.push({ consumer: p.key, lines: use.lines, imported });
      addReverse(key, p.key);
      if (!imported && own) warnings.push({ kind: 'used-without-import', file: p.ref, component: use.ref, tag: use.tag, lines: use.lines });
    }
    for (const [key, imp] of imports) {
      if (lines.has(key)) continue;
      if (components.has(key)) {
        if (imp.sideEffect && own) warnings.push({ kind: 'import-without-use', file: p.ref, component: imp.ref, lines: [imp.line] });
      } else {
        addReverse(key, p.key);
      }
    }
  }

  const screensCache = new Map<string, IScreen[]>();
  const screensOf = (start: string): IScreen[] => {
    const cached = screensCache.get(start);
    if (cached) return cached;
    const seen = new Set<string>([start]);
    const queue = [start];
    const found = new Map<string, IScreen>();
    while (queue.length) {
      const key = queue.shift()!;
      const screen = screenOfPage.get(key);
      if (screen) found.set(screen.key, screen);
      for (const next of reverse.get(key) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    const list = [...found.values()].sort(screenOrder);
    screensCache.set(start, list);
    return list;
  };

  // A use counts when it is in the project, or when its file reaches a screen of the project (an
  // organism of a dependency placed on a page). A dependency's demo/catalog file that only shows the
  // molecule is not a use of THIS project.
  const counts = (consumer: string) => parsed.get(consumer)?.ref.project === input.project || screensOf(consumer).length > 0;

  const result: IComponentUsage[] = [];
  for (const [key, info] of components) {
    const uses = (usesOf.get(key) ?? []).filter((use) => counts(use.consumer));
    const byModule = new Map<string, Map<string, IScreenUse>>();
    const inner: IInnerUse[] = [];
    let count = 0;
    for (const use of uses) {
      count += use.lines.length;
      const screen = screenOfPage.get(use.consumer);
      const consumer = parsed.get(use.consumer)!;
      if (screen) {
        if (!byModule.has(screen.module)) byModule.set(screen.module, new Map());
        const moduleScreens = byModule.get(screen.module)!;
        if (!moduleScreens.has(screen.key)) moduleScreens.set(screen.key, { screen, variations: [], count: 0 });
        const screenUse = moduleScreens.get(screen.key)!;
        screenUse.variations.push({ key: use.consumer, ref: consumer.ref, variation: pageOf(consumer.ref)!.variation, lines: use.lines, imported: use.imported });
        screenUse.count += use.lines.length;
      } else {
        inner.push({ key: use.consumer, ref: consumer.ref, lines: use.lines, imported: use.imported, screens: screensOf(use.consumer) });
      }
    }
    const modules: IModuleUse[] = [...byModule.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([module, list]) => ({
        module,
        screens: [...list.values()]
          .sort((a, b) => screenOrder(a.screen, b.screen))
          .map((s) => ({ ...s, variations: s.variations.sort((x, y) => variationOrder(x.variation, y.variation)) })),
      }));
    inner.sort((a, b) => a.key.localeCompare(b.key));
    const unused = !uses.length && ![...importedBy.get(key) ?? []].some(counts);
    const folder = info.ref.folder;
    result.push({
      key,
      ref: info.ref,
      tag: info.tag,
      group: folder.slice(folder.lastIndexOf('/') + 1),
      origin: info.ref.project === input.project ? 'project' : 'dependency',
      loaded: info.loaded,
      uses: count,
      screens: screensOf(key),
      modules,
      inner,
      unused,
    });
    if (unused) warnings.push({ kind: 'unused-component', component: info.ref, tag: info.tag, lines: [] });
  }
  result.sort((a, b) => a.key.localeCompare(b.key));

  return { components: result, warnings, screens: [...screens.values()].sort(screenOrder) };
}

function screenOrder(a: IScreen, b: IScreen): number {
  return a.module.localeCompare(b.module) || a.pageId.localeCompare(b.pageId);
}
