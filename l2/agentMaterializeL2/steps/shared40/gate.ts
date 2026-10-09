/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/shared40/gate.ts" enhancement="_blank"/>

// Pure gate of a generated shared .ts, run BEFORE the file is written and compiled. It checks what the
// compiler cannot: that every id of the definition exists with its exact name, that only contract routes
// and allowed modules are used, and that the file holds no rendering and no user-facing text.
// Generic only (05/10/2026): no check depends on how a module names its functions. Compilation in the Studio comes after, in run.ts.

import type { L2SharedDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import type { L2ContractDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';
import type { M4ContextInput, M4InputProblem } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';

export interface M4SharedTarget {
  project: number;
  module: string;
  pageId: string;
  className: string;
  shared: L2SharedDefinition;
  contract: L2ContractDefinition;
  /** The input20 notes of this page: facts about the defs (the contract wins), never code prescriptions. */
  rules: M4InputProblem[];
  /** Intent and form-submit names → the method that serves them (input20). Every method must exist. */
  methods?: Record<string, string>;
  /** Form command-input members that are the page's selection (input20): the method reads them from the state. */
  contextInputs?: M4ContextInput[];
}

export interface M4SharedIssue { code: string; message: string }

const RUNTIME_IMPORTS = [
  'lit/decorators.js',
  '/_102029_/l2/stateLitElement.js',
  '/_102029_/l2/bffClient.js',
  '/_102029_/l2/collabState.js',
  '/_102029_/l2/interactionRuntime.js',
  '/_102033_/l2/shared/layout/auraNavigate.js',
];

export function m4SharedClassName(module: string, pageId: string): string {
  const pascal = (value: string) => `${value[0].toUpperCase()}${value.slice(1)}`;
  return `${pascal(module)}${pascal(pageId)}Shared`;
}

export function m4SharedPath(target: Pick<M4SharedTarget, 'project' | 'module' | 'pageId'>): string {
  return `_${target.project}_/l2/${target.module}/web/shared/${target.pageId}.ts`;
}

export function m4ContractImport(target: Pick<M4SharedTarget, 'project' | 'module' | 'pageId'>): string {
  return `/_${target.project}_/l2/${target.module}/web/contracts/${target.pageId}.defs.js`;
}

export function gateM4SharedSource(source: string, target: M4SharedTarget): M4SharedIssue[] {
  const issues: M4SharedIssue[] = [];
  const push = (code: string, message: string) => issues.push({ code, message });
  const text = source.replace(/\r\n/gu, '\n');
  const code = stripComments(text);

  const header = `/// <mls fileReference="${m4SharedPath(target)}" enhancement="_102020_/l2/enhancementAura"/>`;
  if (text.split('\n')[0] !== header) push('M4_SHARED_HEADER', `The first line must be exactly: ${header}`);

  const allowed = new Set([...RUNTIME_IMPORTS, m4ContractImport(target)]);
  for (const match of code.matchAll(/\b(?:import|export)\s[^;]*?\bfrom\s+['"]([^'"]+)['"]/gu)) {
    if (!allowed.has(match[1])) push('M4_SHARED_IMPORT', `Import ${match[1]} is not allowed; use only ${[...allowed].join(', ')}.`);
  }
  if (/\bimport\s*\(/u.test(code)) push('M4_SHARED_IMPORT', 'Dynamic import() is not allowed.');

  if (!new RegExp(`\\bexport\\s+class\\s+${target.className}\\s+extends\\s+StateLitElement\\b`, 'u').test(code)) {
    push('M4_SHARED_CLASS', `The file must declare export class ${target.className} extends StateLitElement.`);
  }
  for (const [pattern, what] of [
    [/@customElement\b|customElements\.define\s*\(/u, 'a custom element registration'],
    [/(?:^|\s)render\s*\(\s*\)/mu, 'a render() method'],
    [/\bstatic\s+styles\b/u, 'static styles'],
    [/\b(?:html|css|svg)`/u, 'an html/css/svg template'],
    [/\bconsole\.\w+\s*\(/u, 'console output'],
    [/\bTODO\b/u, 'a TODO'],
  ] as const) {
    if (pattern.test(code)) push('M4_SHARED_FORBIDDEN', `The shared must not contain ${what}.`);
  }

  for (const stateId of Object.keys(target.shared.states)) {
    if (!new RegExp(`@property\\(\\s*\\{\\s*attribute:\\s*false\\s*\\}\\s*\\)\\s*(?:public\\s+)?${stateId}\\b`, 'u').test(code)) {
      push('M4_SHARED_STATE_MISSING', `State ${stateId} must be a public field declared @property({ attribute: false }) ${stateId}.`);
    } else if (!new RegExp(`/\\*\\*[^\\n]*\\*/[ \\t]*\\n[ \\t]*@property\\(\\s*\\{\\s*attribute:\\s*false\\s*\\}\\s*\\)\\s*(?:public\\s+)?${stateId}\\b`, 'u').test(text)) {
      push('M4_SHARED_JSDOC', `State ${stateId} needs its one-line JSDoc /** state ${stateId} — source … */ on the line right above the field; the pages read it from the .d.ts.`);
    }
  }

  // Seen in the Studio run of 01/10: `this[member] = value` with member: keyof <Class> → 68 × TS2540 per line.
  if (/\bthis\s*\[[^\]]+\]\s*=(?!=)/u.test(code)) {
    push('M4_SHARED_DYNAMIC_WRITE', "Do not write this[member] = …: keyof the class includes read-only HTMLElement properties (TS2540). Use type StateMember = '<member>' | …, and write with (this as unknown as Record<string, unknown>)[member] = value inside publish/assignState.");
  }

  // publish(member, value: unknown) compiles but stops the compiler from checking what is published
  // (fechamento, 05/10/2026). The value must be typed by the member: value: this[M].
  if (/\bpublish\s*(?:<[^>]*>)?\s*\(/u.test(code) && !/\bpublish\s*<[^>]*>\s*\(\s*member\s*:\s*M\s*,\s*value\s*:\s*this\s*\[\s*M\s*\]\s*\)/u.test(code)) {
    push('M4_SHARED_PUBLISH', 'Declare private publish<M extends StateMember>(member: M, value: this[M]): void — the value typed by the member, never unknown or any.');
  }
  // `any` hides the row shape (v2, 02/10: empty cells) and `!` hides a null; the one `any` allowed is the
  // `value` of handleIcaStateChange, whose signature comes from StateLitElement.
  const anyUses = (code.replace(/handleIcaStateChange\s*\(\s*key\s*:\s*string\s*,\s*value\s*:\s*any\s*\)/u, '').match(/:\s*any\b|\bas\s+any\b|<any>|\bany\[\]/gu) ?? []).length;
  if (anyUses) push('M4_SHARED_ANY', `The shared uses \`any\` ${anyUses}×; type it with the contract types (only handleIcaStateChange(key: string, value: any) may keep it).`);
  const nonNull = (code.match(/[\w)\]]!(?=[.;,)\]\s])(?!=)/gu) ?? []).length;
  if (nonNull) push('M4_SHARED_NON_NULL', `The shared uses the non-null assertion \`!\` ${nonNull}×; guard the null instead (if (!x) return; or x?.field ?? fallback).`);

  // Seen in the Studio run of 01/10: navigation by window.location.assign, a full reload outside the shell.
  for (const match of code.matchAll(/\b(?:window\.)?location\.(?:assign|replace)\s*\(|\b(?:window\.)?location(?:\.href)?\s*=(?!=)|\bhistory\.(?:pushState|replaceState)\s*\(/gu)) {
    push('M4_SHARED_LOCATION', `${match[0].trim()} is refused: the app is a single-page shell. Replace it with auraNavigate(href, { basePath: '/${target.module}' }) and import { auraNavigate } from '/_102033_/l2/shared/layout/auraNavigate.js'.`);
  }
  for (const fnId of Object.keys(target.shared.functions)) {
    if (methodBody(code, fnId) === null) push('M4_SHARED_FUNCTION_MISSING', `Function ${fnId} must be a public method named exactly ${fnId}.`);
  }
  for (const [ref, method] of Object.entries(target.methods ?? {})) {
    if (methodBody(code, method) === null) push('M4_SHARED_FUNCTION_MISSING', `The pages call ${method} (for ${ref}); it must be a public method named exactly ${method}.`);
  }
  // A form's command input member that is the page's selection comes from its state, not from the draft the
  // form edits (atendimento, 07/10/2026: lancarItem refused itself in the browser, comandaId was never filled).
  for (const item of target.contextInputs ?? []) {
    const body = reachableBody(code, item.method);
    if (body && !new RegExp(`\\bthis\\.${item.state}\\b`, 'u').test(body)) push('M4_SHARED_CONTEXT_INPUT', `${item.method} must fill the input member ${item.member} of ${item.route} from this.${item.state} (the page's selection, entry param ${item.param}), in its own body or in a method it calls. The form does not ask for ${item.member}; a draft field nobody fills leaves the command refused in the browser.`);
  }
  // A fresh visit (Guilherme, 06/10/2026): collabState outlives the page, so errors, success, the scene and
  // the drafts of the previous visit came back. Every entry must reset the transient members.
  const entry = reachableBody(code, 'connectedCallback');
  const transient = [...Object.keys(target.shared.requests).flatMap(id => [`${id}Status`, `${id}Error`]), 'scenary'];
  const notReset = transient.filter(member => !new RegExp(`['"\`]${member}['"\`]`, 'u').test(entry));
  if (entry && notReset.length) push('M4_SHARED_VISIT_RESET', `Entering the page must reset the transient members of the previous visit, from connectedCallback (directly or through a method it calls): ${notReset.join(', ')} (statuses to 'idle', errors to null, scenary to '', drafts to empty). Hydrate only the data members.`);

  // Within a visit (Guilherme, 09/10/2026): an old "Item lançado" or an old error stayed on screen while the person
  // edited the next item, picked another record or changed scene. When the person changes what a command acts on,
  // its result goes back to idle.
  const results = Object.entries(target.shared.requests).filter(([, request]) => request.kind === 'cmd').flatMap(([id]) => [`${id}Status`, `${id}Error`]);
  if (results.length) {
    for (const method of m4SharedUiMethods(code, target.shared)) {
      const body = reachableBody(code, method);
      const kept = results.filter(member => !new RegExp(`['"\`]${member}['"\`]`, 'u').test(body));
      if (kept.length) push('M4_SHARED_RESULT_RESET', `${method} changes what the commands act on (a form, the selection or the scene), so it must reset their results, in its own body or through a method it calls (a private resetCommandResults() is fine): ${kept.join(', ')} (statuses to 'idle', errors to null). Publish a command's status last, after its own draft reset, and never call a public setter after it.`);
    }
  }

  // The scene state every page may use (decision of Guilherme, 01/10/2026): the page decides the scenes.
  if (!/@property\(\s*\{\s*attribute:\s*false\s*\}\s*\)\s*(?:public\s+)?scenary\b/u.test(code) || methodBody(code, 'setScenario') === null) {
    push('M4_SHARED_SCENARY', "Declare the scene state: @property({ attribute: false }) scenary = ''; and a public setScenario(value: string): void that publishes it.");
  }

  const routes = new Set(target.contract.routes.map(route => route.route));
  const routePrefix = `${target.module}.${target.pageId}.`;
  // `<module>.<pageId>.<param>` is also the localStorage key of an entry param (briefing §5), the same
  // shape as a route: those literals are storage keys, not routes (false positive of 01/10/2026).
  const storageKeys = new Set(Object.keys(target.shared.entry.params).map(name => `${routePrefix}${name}`));
  for (const match of code.matchAll(/['"`]([a-z][A-Za-z0-9]*\.[a-z][A-Za-z0-9_]*\.[a-z][A-Za-z0-9]*)['"`]/gu)) {
    if (match[1].startsWith(routePrefix) && !routes.has(match[1]) && !storageKeys.has(match[1])) push('M4_SHARED_ROUTE_UNKNOWN', `Route ${match[1]} is not in the contract.`);
  }
  for (const requestId of Object.keys(target.shared.requests)) {
    const route = `${routePrefix}${requestId}`;
    if (!code.includes(`'${route}'`) && !code.includes(`"${route}"`)) push('M4_SHARED_ROUTE_UNUSED', `Request ${requestId} is never called; use the literal route '${route}'.`);
  }
  if (Object.keys(target.shared.requests).length && !/\bexecBff\s*[<(]/u.test(code)) push('M4_SHARED_ROUTE_UNUSED', 'The shared never calls execBff.');

  for (const [name, param] of Object.entries(target.shared.entry.params)) {
    if (!code.includes(`'${name}'`) && !code.includes(`"${name}"`)) push('M4_SHARED_ENTRY_PARAM', `Entry param ${name} is never read by name.`);
    if (param.sources.includes('url') && !code.includes('URLSearchParams')) push('M4_SHARED_ENTRY_PARAM', 'Entry params must be read from the URL with URLSearchParams.');
    if ((param.sources.includes('localStorage') || param.persist) && !code.includes('localStorage')) push('M4_SHARED_ENTRY_PARAM', `Entry param ${name} must use localStorage.`);
  }

  for (const [fnId, fn] of Object.entries(target.shared.functions)) {
    if (!fn.navigate) continue;
    const body = reachableBody(code, fnId);
    if (!/\bauraNavigate\s*\(/u.test(body)) {
      push('M4_SHARED_NAVIGATE', `Function ${fnId} must call auraNavigate(...) in its own body or in a method or function it calls (method, function declaration or arrow).`
        + (/\bauraNavigate\s*\(/u.test(code) ? ' auraNavigate is called in the file, but not from code reachable from this function.'
          : ` auraNavigate is never called in the file: add import { auraNavigate } from '/_102033_/l2/shared/layout/auraNavigate.js' and call auraNavigate(\`/${target.module}/${fn.navigate}?…\`, { basePath: '/${target.module}' }).`));
    }
    // Text heuristics on purpose: the page name and each carry key must be visible somewhere in the
    // reachable code, in whatever form (a path segment, a literal argument, an object key).
    if (!new RegExp(`(?<![\\w$])${fn.navigate}(?![\\w$])`, 'u').test(body)) push('M4_SHARED_NAVIGATE', `Function ${fnId} must navigate to /${target.module}/${fn.navigate}.`);
    for (const key of Object.keys(fn.carries ?? {})) {
      if (!new RegExp(`(?<![\\w$])${key}(?![\\w$])`, 'u').test(body)) push('M4_SHARED_NAVIGATE', `Function ${fnId} must carry ${key} as a query param.`);
    }
  }

  for (const literal of stringLiterals(code)) {
    if (/\s/u.test(literal)) push('M4_SHARED_TEXT', `String literal ${JSON.stringify(literal)} looks like user-facing text; the shared holds codes only.`);
  }
  return dedupe(issues);
}

const LIFECYCLE_METHODS = new Set(['connectedCallback', 'disconnectedCallback', 'handleIcaStateChange', 'firstUpdated', 'updated', 'willUpdate', 'render', 'constructor']);
const NOT_METHODS = new Set(['if', 'for', 'while', 'switch', 'catch', 'return', 'function', 'await', 'void', 'new', 'typeof', 'super', 'this']);

/**
 * The public methods the page calls to change what is on screen without asking the backend: form setters, selections,
 * setScenario. Left out: the lifecycle, and every function of the definition that calls a request or navigates (it
 * is a load or a command itself, or it leaves the page).
 */
export function m4SharedUiMethods(code: string, shared: Pick<L2SharedDefinition, 'functions'>): string[] {
  // `public` is optional in TypeScript (the reference shared omits it). A name counts only when its declaration is a
  // class method with no private/protected/static and not a module `function`: a bare call `goTo(x);` also starts a
  // line, and methodBody would find the private method or module function it calls.
  const names = new Set([...code.matchAll(/^[ \t]*(?:public\s+)?(?:async\s+)?([A-Za-z_$][\w$]*)\s*(?:<[^>\n]*>)?\s*\(/gmu)].map(match => match[1]));
  const isPublicMethod = (name: string): boolean => {
    const heads = code.matchAll(new RegExp(`^[ \\t]*((?:(?:export|public|private|protected|static|async|function)\\s+)*)${name}\\s*(?:<[^>\\n]*>)?\\s*\\(`, 'gmu'));
    for (const head of heads) {
      // A declaration: after its parameters comes `{` (maybe past a return type), never `;` or `=`.
      let i = (head.index ?? 0) + head[0].length;
      let depth = 1;
      while (i < code.length && depth > 0) { if (code[i] === '(') depth += 1; else if (code[i] === ')') depth -= 1; i += 1; }
      const open = code.indexOf('{', i);
      if (open < 0 || /[;=]/u.test(code.slice(i, open).replace(/:[^{]*/u, ''))) continue;
      return !/\b(?:export|private|protected|static|function)\b/u.test(head[1]);
    }
    return false;
  };
  return [...names].filter(name => {
    if (LIFECYCLE_METHODS.has(name) || NOT_METHODS.has(name) || !isPublicMethod(name)) return false;
    const fn = shared.functions[name];
    return !(fn && (fn.calls || fn.navigate));
  }).sort();
}

/**
 * Puts back the one-line JSDoc of every state field that has none right above it, written from the defs
 * (`state <id> — <description>; source <source>[; organisms …]`). Run before the gate: a missing state JSDoc
 * is formatting, and the defs hold its whole text. agendaClinica/consultas (07/10/2026): attempt 1 had every
 * JSDoc, the repair dropped the seven state ones, and the page hit the repair limit on M4_SHARED_JSDOC alone.
 * A field the source does not declare is left alone (M4_SHARED_STATE_MISSING reports it).
 */
export function m4FillStateJsdoc(source: string, target: Pick<M4SharedTarget, 'shared'>): string {
  const lines = source.split('\n');
  const oneLine = (value: string) => value.replace(/\s+/gu, ' ').replace(/\*\//gu, '* /').trim();
  for (const [stateId, state] of Object.entries(target.shared.states)) {
    const field = new RegExp(`^([ \\t]*)@property\\(\\s*\\{\\s*attribute:\\s*false\\s*\\}\\s*\\)\\s*(?:public\\s+)?${stateId}\\b`, 'u');
    const index = lines.findIndex(line => field.test(line));
    if (index < 0 || /^[ \t]*\/\*\*.*\*\/[ \t]*$/u.test(lines[index - 1] ?? '')) continue;
    const indent = field.exec(lines[index])?.[1] ?? '';
    const organisms = state.organisms?.length ? `; organisms ${state.organisms.join(', ')}` : '';
    lines.splice(index, 0, `${indent}/** state ${stateId} — ${oneLine(state.description)}; source ${oneLine(state.source)}${oneLine(organisms)} */`);
  }
  return lines.join('\n');
}

/**
 * The body of `name` plus the bodies of the methods and module functions it calls, transitively.
 * A shared may delegate (a private `navigateTo`, a module `buildUrl`); a rule is met anywhere in that tree.
 */
export function reachableBody(code: string, name: string): string {
  const seen = new Set<string>();
  const queue = [name];
  const parts: string[] = [];
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const body = methodBody(code, current) ?? arrowBody(code, current);
    if (body === null) continue;
    parts.push(body);
    for (const call of body.matchAll(/(?:\bthis\.|(?<![.\w]))([A-Za-z_$][\w$]*)\s*(?:<[^>\n]*>)?\s*\(/gu)) queue.push(call[1]);
  }
  return parts.join('\n');
}

/** The body of a class method or module function `name(…) {…}`, or null when there is none. */
export function methodBody(code: string, name: string): string | null {
  const head = new RegExp(`^[ \\t]*(?:export\\s+)?(?:public\\s+|private\\s+|protected\\s+)?(?:static\\s+)?(?:async\\s+)?(?:function\\s+)?${name}\\s*(?:<[^>\\n]*>)?\\s*\\(`, 'mu').exec(code);
  if (!head) return null;
  let i = head.index + head[0].length;
  let depth = 1;
  while (i < code.length && depth > 0) { if (code[i] === '(') depth += 1; else if (code[i] === ')') depth -= 1; i += 1; }
  const open = code.indexOf('{', i);
  if (open < 0) return null;
  const between = code.slice(i, open);
  if (/[;=]/u.test(between.replace(/:[^{]*/u, ''))) return null;
  depth = 1;
  let j = open + 1;
  while (j < code.length && depth > 0) { if (code[j] === '{') depth += 1; else if (code[j] === '}') depth -= 1; j += 1; }
  return code.slice(open + 1, j - 1);
}

/**
 * The body of an arrow bound to `name`: a module `const name = (…) => …` or a class field
 * `private name = (…) => …`. A block body is returned without braces; an expression body up to `;` or end of line.
 */
export function arrowBody(code: string, name: string): string | null {
  const head = new RegExp(`^[ \\t]*(?:export\\s+)?(?:(?:const|let|var)\\s+|(?:public\\s+|private\\s+|protected\\s+)?(?:readonly\\s+)?)${name}\\s*(?::[^=\\n]+)?=\\s*(?:async\\s*)?(?:\\([^)]*\\)|[A-Za-z_$][\\w$]*)\\s*(?::[^=\\n]+)?=>\\s*`, 'mu').exec(code);
  if (!head) return null;
  const start = head.index + head[0].length;
  if (code[start] !== '{') {
    const end = code.slice(start).search(/;|\n/u);
    return code.slice(start, end < 0 ? code.length : start + end);
  }
  let depth = 1;
  let j = start + 1;
  while (j < code.length && depth > 0) { if (code[j] === '{') depth += 1; else if (code[j] === '}') depth -= 1; j += 1; }
  return code.slice(start + 1, j - 1);
}

function stripComments(code: string): string {
  let out = '';
  let i = 0;
  let quote = '';
  while (i < code.length) {
    const ch = code[i];
    if (quote) {
      out += ch;
      if (ch === '\\') { out += code[i + 1] ?? ''; i += 2; continue; }
      if (ch === quote) quote = '';
      i += 1;
      continue;
    }
    if (ch === '\'' || ch === '"' || ch === '`') { quote = ch; out += ch; i += 1; continue; }
    if (ch === '/' && code[i + 1] === '/') { while (i < code.length && code[i] !== '\n') i += 1; continue; }
    if (ch === '/' && code[i + 1] === '*') { const end = code.indexOf('*/', i + 2); i = end < 0 ? code.length : end + 2; continue; }
    out += ch;
    i += 1;
  }
  return out;
}

/** Single- and double-quoted literals of comment-free code (template literals are paths and keys). */
function stringLiterals(code: string): string[] {
  const found: string[] = [];
  for (const match of code.matchAll(/'((?:[^'\\\n]|\\.)*)'|"((?:[^"\\\n]|\\.)*)"/gu)) found.push(match[1] ?? match[2] ?? '');
  return found;
}

function dedupe(issues: M4SharedIssue[]): M4SharedIssue[] {
  const seen = new Set<string>();
  return issues.filter(item => { const key = `${item.code}|${item.message}`; if (seen.has(key)) return false; seen.add(key); return true; });
}
