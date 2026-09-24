/// <mls fileReference="_102020_/l2/aura/helpers/scenarioL2.ts" enhancement="_blank"/>
// The states a page can be put into, read from the page's own `.ts` (D-016, D-017).
//
// WHY THE L2 AND NOT THE L4
// Whoever best represents the state of a page is the page. The l4 workspace is a design document: it
// cannot know a state that is born in the implementation, and it does not exist for every page.
// Measured on the 58 pages of the corpus (22/09/2026): the `.ts` reaches 58 of 58 and the l4 46 of
// 58; where both exist the inventory is IDENTICAL in 46, with 0 keys of the l4 missing from the
// `.ts`. The 12 pages of the `mls-102048` have no workspace at all and used to get "this page has no
// l4 workspace" and an empty panel.
//
// WHY THE READING IS ANCHORED, NEVER "any `ui.*` literal"
// The rendered page carries its own i18n catalog, and its keys look exactly like state keys
// (`ui.<page>.loading`, `.noSelection`, `.chooseProject`). A loose reading drags 15 of them into the
// inventory and the panel then writes a state nobody reads. So a key only counts when it appears
// where a key can appear: the declared list, a call site, or a discriminant.
//
// WHY THE DOMAIN NEEDS TWO READINGS
// The type of the `@property` and the generated comment above it are BOTH incomplete, and neither is
// a matter of taste: the `mls-102048` has no comment at all and declares
// `createChangeOrderState: "idle" | "loading" | "success" | "error"` in the type; the `mls-102050`
// writes `sortBy: string` and puts `values: open|closed` in the comment. United they cover 190 of
// 190 action statuses.
//
// Everything here is pure: no DOM, no stor, no network. Whoever renders decides the words.

import type { IScenarioState, ScenarioKind } from '/_102020_/l2/aura/helpers/scenarioCore.js';

/** A `@property` of the page class — the control the panel writes through. */
export interface IPageProperty {
  name: string;
  /** The declared type, verbatim: `'idle' | 'loading'`, `string`, `QryListTicketOutput[]`. */
  type: string;
  /** The generated doc comment above it, fences stripped. Empty when there is none. */
  comment: string;
  /** The closed domain, type ∪ comment. Empty when the domain is open. */
  valueSet: string[];
}

// ─── The properties of the page class ─────────────────────────────────────────

/**
 * Every `@property` of the source, with its comment and its domain.
 *
 * The comment is captured with a pattern that cannot contain a comment terminator, and not with a
 * lazy `[\s\S]*?`: the lazy form backtracks ACROSS the end of an earlier comment and glues the doc
 * of an unrelated member onto the property below it, silently giving one property another's domain.
 */
export function propertiesOf(source: string): IPageProperty[] {
  const aliases = aliasesOf(source);
  const found: IPageProperty[] = [];
  const pattern = /(?:\/\*\*((?:[^*]|\*(?!\/))*)\*\/\s*)?@property\s*(?:\([\s\S]*?\))?\s*(?:public\s+|declare\s+|accessor\s+)*([A-Za-z_$][\w$]*)\s*[!?]?\s*:\s*([^=;]+)[=;]/gu;
  for (let match = pattern.exec(source); match; match = pattern.exec(source)) {
    const comment = (match[1] ?? '').trim();
    const name = match[2];
    const type = match[3].trim();
    found.push({ name, type, comment, valueSet: domainOf(aliases.get(type) ?? type, comment) });
  }
  return found;
}

/**
 * The `type X = …` declarations of the file, so a property typed by an alias still has a domain.
 *
 * One indirection, not a type system: the generator of the `mls-102048` writes
 * `type ActionStatus = "idle" | "loading" | "success" | "error"` and then four properties typed
 * `ActionStatus` with NO comment above them — without this the four actions of that page have no
 * domain at all and the panel, which exists to put an action in `error`, offers nothing.
 */
export function aliasesOf(source: string): Map<string, string> {
  const aliases = new Map<string, string>();
  const declaration = /^[^\S\n]*(?:export[^\S\n]+)?type[^\S\n]+([A-Za-z_$][\w$]*)[^\S\n]*=([^;]+);/gmu;
  for (let match = declaration.exec(source); match; match = declaration.exec(source)) {
    aliases.set(match[1], match[2].trim());
  }
  return aliases;
}

/**
 * The closed domain of a property: the union of what the type says and what the comment says.
 *
 * Union and not "the first that answers", because neither source is complete in the corpus. Measured
 * over the 945 annotated properties: 172 declare it in the type, 203 in the comment, 209 in one or
 * the other — 6 only in the type and 37 only in the comment.
 */
export function domainOf(type: string, comment: string): string[] {
  const values: string[] = [];
  const add = (value: string): void => {
    const trimmed = value.trim();
    if (trimmed && !values.includes(trimmed)) values.push(trimmed);
  };

  // The type, when it is a union of string literals and nothing else. `string`, `Output[]` and an
  // alias have no domain, and a union with `string` in it is not closed either.
  const parts = type.split('|').map((part) => part.trim());
  if (parts.length > 1 && parts.every((part) => /^(['"`])[^'"`]*\1$/u.test(part))) {
    for (const part of parts) add(part.slice(1, -1));
  }

  // The comment: `/** state qryListTicketSortBy — input, values: open|closed */`.
  const declared = /values:\s*([^*\n]+)/u.exec(comment);
  if (declared) for (const value of declared[1].split('|')) add(value);

  return values;
}

// ─── The keys, read only where a key can appear ───────────────────────────────

/**
 * Every `collabState` key the page declares, by anchored reading.
 *
 * The four generator forms of the corpus, and where each one puts its keys:
 *
 *   `const SUBSCRIBED_STATE_KEYS` at module level      41 pages
 *   no list — the `if (key === …)` / `case` arms       13 pages
 *   only `initStateValue("ui.…", …)`                    3 pages
 *   `const sharedKeys = [...]` in `connectedCallback`    1 page
 *
 * Both quote styles, always: half the corpus writes the keys with double quotes, and ignoring that
 * is what made the first measurement of this reading miss two pages.
 */
export function keysOf(source: string): string[] {
  const keys: string[] = [];
  const add = (key: string): void => {
    if (key && !keys.includes(key)) keys.push(key);
  };

  for (const key of declaredListKeys(source)) add(key);
  for (const key of callSiteKeys(source)) add(key);
  for (const key of discriminantKeys(source)) add(key);
  return keys;
}

/**
 * The literals of a declared list of keys, wherever it is declared.
 *
 * Three names and not two: besides `SUBSCRIBED_STATE_KEYS` and the `sharedKeys` of the
 * `connectedCallback`, the `mls-102049` writes `private readonly subscribedKeys: string[] = [...]`.
 * That page is covered by its `initStateValue` call sites as well, so this is redundancy and not a
 * rescue — which is the point: no single anchor is the only way in.
 */
function declaredListKeys(source: string): string[] {
  const keys: string[] = [];
  const declaration = /\b(?:SUBSCRIBED_STATE_KEYS|sharedKeys|subscribedKeys)\b[^=\n]*=\s*\[/gu;
  for (let match = declaration.exec(source); match; match = declaration.exec(source)) {
    const close = source.indexOf(']', match.index + match[0].length);
    if (close < 0) continue;
    const block = source.slice(match.index + match[0].length, close);
    for (const literal of block.matchAll(/(['"])([^'"\n]+)\1/gu)) keys.push(literal[2]);
  }
  return keys;
}

/** The first argument of the calls that only ever take a state key. */
function callSiteKeys(source: string): string[] {
  const keys: string[] = [];
  const call = /\b(?:setState|getState|initStateValue|subscribe|unsubscribe)\s*\(\s*(['"])([^'"\n]+)\1/gu;
  for (let match = call.exec(source); match; match = call.exec(source)) keys.push(match[2]);
  return keys;
}

/**
 * The keys a page names only to react to them: `if (key === "…")` and the `case` of a switch on a
 * key.
 *
 * Two filters, and both were earned against the corpus. The `case` labels are taken from the
 * switch's own block and only when the switch discriminates on something named like a key, or a bare
 * `case '…'` would also collect the arms of `switch (this.uiScenary)`, which are VALUES. And the
 * literal has to have the shape of a state key: `key` is also the name a generated page gives the
 * left half of an `Object.entries(row)` pair, and
 * `key === 'approvedChangeOrderAmount' ? msg['billing.approved'] : …` is a column label, not a
 * state — 15 of those, in 2 pages of the `mls-102046`.
 */
function discriminantKeys(source: string): string[] {
  const keys: string[] = [];

  const comparison = /\b(?:key|stateKey)\s*===\s*(['"])([^'"\n]+)\1/gu;
  for (let match = comparison.exec(source); match; match = comparison.exec(source)) {
    if (isStateKey(match[2])) keys.push(match[2]);
  }

  const header = /\bswitch\s*\(\s*([A-Za-z_$][\w$]*)\s*\)\s*\{/gu;
  for (let match = header.exec(source); match; match = header.exec(source)) {
    if (!/key/iu.test(match[1])) continue;
    const block = balancedBlock(source, match.index + match[0].length - 1);
    for (const label of block.matchAll(/\bcase\s+(['"])([^'"\n]+)\1\s*:/gu)) {
      if (isStateKey(label[2])) keys.push(label[2]);
    }
  }
  return keys;
}

/**
 * The shape of a `collabState` key of a page: `ui.<page>.<rest>`.
 *
 * Only the discriminants are filtered by it. A declared list and the first argument of `setState`
 * are places where nothing BUT a state key can appear, so a key that one day stops starting with
 * `ui.` is still read there.
 */
function isStateKey(key: string): boolean {
  return /^ui\.[A-Za-z0-9_$]+\..+$/u.test(key);
}

/** The text of the `{ … }` that starts at `open`, braces balanced, strings skipped. */
function balancedBlock(source: string, open: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = open; i < source.length; i += 1) {
    const ch = source[i];
    if (quote) {
      if (ch === '\\') { i += 1; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') { quote = ch; continue; }
    if (ch === '{') { depth += 1; continue; }
    if (ch === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(open, i + 1);
    }
  }
  return source.slice(open);
}

// ─── What a key IS ────────────────────────────────────────────────────────────

/** `ui.ticketHub.action.qryListTicket.status` -> `action.qryListTicket.status`. */
function suffixOf(key: string): string {
  const match = /^ui\.[A-Za-z0-9_$]+\.(.+)$/u.exec(key);
  return match ? match[1] : key;
}

/**
 * The species of a key, by its shape.
 *
 * `scenary` is a species of its own (D-016, Saída 1): it is the SCENE of the page, the one axis that
 * makes a whole branch of markup appear, and its domain is declared in the type. The other two keys
 * the l4 never modelled — `layout.col_*` (24 in the corpus) and `businessContext` (1) — are read and
 * counted but have no species, and they are free text, so the rule of D-017 hides them anyway.
 */
export function kindOfKey(key: string): ScenarioKind {
  const suffix = suffixOf(key);
  if (suffix === 'status') return 'pageStatus';
  if (suffix === 'scenary') return 'scene';
  if (/^action\..+\.error$/u.test(suffix)) return 'actionError';
  if (/^action\..+\.status$/u.test(suffix)) return 'actionStatus';
  if (/^input\./u.test(suffix)) return 'input';
  if (/^data\./u.test(suffix)) return 'queryResult';
  if (/^output\./u.test(suffix)) return 'commandOutput';
  return 'other';
}

/** The action a key belongs to, or null for what belongs to the page itself. */
export function bffOfKey(key: string): string | null {
  const suffix = suffixOf(key);
  const action = /^action\.([^.]+)\.(?:status|error)$/u.exec(suffix);
  if (action) return action[1];
  const io = /^(?:data|output)\.([^.]+)$/u.exec(suffix);
  if (io) return io[1];
  const input = /^input\.([^.]+)\./u.exec(suffix);
  return input ? input[1] : null;
}

/** For an input, the field's own name (`search`), which is not the property name. */
function fieldOfKey(key: string): string | undefined {
  const match = /^input\.[^.]+\.(.+)$/u.exec(suffixOf(key));
  return match ? match[1] : undefined;
}

// ─── The key -> property pairing ──────────────────────────────────────────────

/**
 * Which property of the class each key lands on.
 *
 * It is not decoration: `IScenarioState.name` is how a control on screen is recognised, so a key with
 * the wrong property makes the panel point at nothing. The generators disagree on the naming
 * (`output.createChangeOrder` is `OutputCreateChangeOrder` in the `mls-102048` and
 * `cmdCreateChangeOrderOutput` in the `mls-102046`), so the pairing is READ from the wiring the page
 * itself writes, and the naming convention is only the last resort.
 */
export function pairingsOf(source: string): Map<string, string> {
  const pairs = new Map<string, string>();
  const claim = (key: string, property: string): void => {
    if (key && property && !pairs.has(key)) pairs.set(key, property);
  };

  // `if (key === "…") this.x = …` and `case "…": this.x = …` — the page saying it itself.
  const discriminant = /\b(?:key|stateKey)\s*===\s*(['"])([^'"\n]+)\1|\bcase\s+(['"])([^'"\n]+)\3\s*:/gu;
  for (let match = discriminant.exec(source); match; match = discriminant.exec(source)) {
    claim(match[2] ?? match[4], assignedAfter(source, match.index + match[0].length));
  }

  // `initStateValue("ui.catalog.status", "status", "")` — the one generator that says it outright,
  // with the property as the second argument.
  const declared = /\binitStateValue\s*\(\s*(['"])([^'"\n]+)\1\s*,\s*(['"])([A-Za-z_$][\w$]*)\3/gu;
  for (let match = declared.exec(source); match; match = declared.exec(source)) claim(match[2], match[4]);

  // `const saved = getState("…"); this.x = saved …` and `this.x = getState("…") as string` — the
  // two restore shapes of the `mls-102048`. The assignment can be on EITHER side of the read, and
  // taking only the one after it pairs each key with the NEXT property instead of its own.
  const restore = /\bgetState\s*\(\s*(['"])([^'"\n]+)\1\s*\)/gu;
  for (let match = restore.exec(source); match; match = restore.exec(source)) {
    claim(match[2], assignedInStatement(source, match.index) || assignedAfter(source, match.index + match[0].length));
  }

  // `this.x = value; setState("…", value);` — the generated setter.
  const write = /\bsetState\s*\(\s*(['"])([^'"\n]+)\1/gu;
  for (let match = write.exec(source); match; match = write.exec(source)) {
    claim(match[2], assignedBefore(source, match.index));
  }

  return pairs;
}

/** The property of the first `this.x =` after `from`, within one statement's reach. */
function assignedAfter(source: string, from: number): string {
  const nearby = source.slice(from, from + 400);
  const stop = /(['"])ui\.[^'"\n]+\1/u.exec(nearby);
  const reachable = stop ? nearby.slice(0, stop.index) : nearby;
  const assignment = /\bthis\.([A-Za-z_$][\w$]*)\s*=[^=]/u.exec(reachable);
  return assignment ? assignment[1] : '';
}

/** The property the CURRENT statement assigns, when the read sits on its right-hand side. */
function assignedInStatement(source: string, from: number): string {
  const nearby = source.slice(Math.max(0, from - 300), from);
  const start = Math.max(nearby.lastIndexOf(';'), nearby.lastIndexOf('{'), nearby.lastIndexOf('}'));
  const statement = nearby.slice(start + 1);
  const assignment = /^\s*this\.([A-Za-z_$][\w$]*)\s*=[^=]/u.exec(statement);
  return assignment ? assignment[1] : '';
}

/** The property of the last `this.x = …;` before `from` — the setter writing its own field. */
function assignedBefore(source: string, from: number): string {
  const nearby = source.slice(Math.max(0, from - 200), from);
  const assignments = [...nearby.matchAll(/\bthis\.([A-Za-z_$][\w$]*)\s*=[^=]/gu)];
  const last = assignments[assignments.length - 1];
  return last ? last[1] : '';
}

/**
 * The property name the generators derive from the key, when the page never wires it explicitly.
 *
 * Last resort, and checked against the declared properties before it is trusted — an invented name
 * is a line the panel cannot match to any control.
 */
function conventionalNames(key: string): string[] {
  const suffix = suffixOf(key);
  if (suffix === 'status') return ['status'];
  if (suffix === 'scenary') return ['uiScenary'];

  const action = /^action\.([^.]+)\.(status|error)$/u.exec(suffix);
  if (action) return [action[1] + (action[2] === 'error' ? 'Error' : 'State')];

  const io = /^(data|output)\.([^.]+)$/u.exec(suffix);
  if (io) {
    const role = io[1] === 'data' ? 'Data' : 'Output';
    return [io[2] + role, role + capitalise(io[2])];
  }

  const input = /^input\.([^.]+)\.(.+)$/u.exec(suffix);
  if (input) return [input[1] + capitalise(input[2].replace(/[._-](\w)/gu, (_, c: string) => c.toUpperCase()))];

  return [camelOf(suffix)];
}

function capitalise(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/** `layout.col_list_title` -> `LayoutColListTitle`, which is what the older generator emits. */
function camelOf(suffix: string): string {
  return suffix
    .split(/[.\s_-]+/u)
    .filter(Boolean)
    .map((part) => capitalise(part))
    .join('');
}

// ─── The inventory ────────────────────────────────────────────────────────────

/**
 * Every state of the page, from the shared class and the rendered variation.
 *
 * Both files, because they answer different halves: the shared class declares the properties, their
 * types and their comments, while a variation can name keys the shared one does not.
 *
 * `editable` is `valueSet.length > 0` and nothing else (D-017). A state with an open domain — free
 * text, a query result, a command output, the error text, the page's own status — is read, kept in
 * the list and NOT offered: 743 of the 945 annotated properties of the corpus. They were never
 * editable in practice; the two biggest groups waited on a fixture whose shape was never decided.
 */
export function statesOfPage(shared: string, page: string): IScenarioState[] {
  const source = `${shared}\n${page}`;
  const properties = new Map(propertiesOf(source).map((property) => [property.name, property]));
  const pairs = pairingsOf(source);

  const states: IScenarioState[] = [];
  for (const key of keysOf(source)) {
    const wired = pairs.get(key);
    const conventional = conventionalNames(key);
    const name = (wired && properties.has(wired) ? wired : '')
      || conventional.find((candidate) => properties.has(candidate))
      || wired
      || conventional[0];
    const property = properties.get(name);
    const kind = kindOfKey(key);
    const valueSet = property?.valueSet ?? [];
    states.push({
      key,
      name,
      kind,
      bffId: bffOfKey(key),
      field: kind === 'input' ? fieldOfKey(key) : undefined,
      type: property?.type,
      valueSet: valueSet.length ? valueSet : undefined,
      editable: valueSet.length > 0,
    });
  }

  return ordered(states);
}

/**
 * The page's own states first, then one run per action.
 *
 * Run-length is how `groupByAction` finds the blocks, so the order is not cosmetic: a key emitted out
 * of turn splits its action into two blocks with the same heading.
 */
function ordered(states: readonly IScenarioState[]): IScenarioState[] {
  const rank: Record<ScenarioKind, number> = {
    pageStatus: 0,
    scene: 1,
    other: 2,
    actionStatus: 3,
    actionError: 4,
    queryResult: 5,
    commandOutput: 6,
    input: 7,
  };
  const actions: string[] = [];
  for (const state of states) {
    if (state.bffId && !actions.includes(state.bffId)) actions.push(state.bffId);
  }
  const weight = (state: IScenarioState): number => (state.bffId ? 1 + actions.indexOf(state.bffId) : 0);

  return [...states].sort((left, right) => (weight(left) - weight(right))
    || (rank[left.kind] - rank[right.kind])
    || states.indexOf(left) - states.indexOf(right));
}
