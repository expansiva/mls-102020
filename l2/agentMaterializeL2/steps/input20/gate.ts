/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/gate.ts" enhancement="_blank"/>

// Pure input gate of agentMaterializeL2. It reads the four public defs of every page (contract, shared,
// desktop and mobile page11) and says, page by page, whether code can be generated from them.
//
// Generic by design (Guilherme, 05/10/2026: "não podemos ter tantas regras voltadas para um módulo"):
// - it REFUSES only what makes generation impossible: a missing or unreadable file, or a reference that
//   points at nothing anywhere (a request with no route, a call to nothing, a navigation to no page);
// - it RESOLVES references generically: a form submit or a page11 intent may name a function, a request
//   or a request trigger, and it is mapped to the shared method that serves it (`methods`);
// - every other inconsistency is a factual NOTE for the generators (the contract wins on types). It never
//   prescribes code by function names: the generators read the defs and the contract themselves.
// No IO here: io.ts reads the files and run.ts persists the result.

import { parseL2Page11, type L2Page11Definition, type L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { classifyL2StateSource, parseL2Shared, type L2SharedDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/shared.js';
import { parseL2Contract, type L2ContractDefinition } from '/_102020_/l2/agentMaterializeL2/helpers/defs/contract.js';

export type M4InputKind = 'contract' | 'shared' | L2Page11Device;
export const M4_INPUT_KINDS: readonly M4InputKind[] = ['contract', 'shared', 'desktop', 'mobile'];

export interface M4InputProblem {
  /** `error` refuses the page; `warning` is a factual note handed to the generators. */
  severity: 'error' | 'warning';
  code: string;
  /** Page id, or '*' for a module-level problem. */
  page: string;
  /** Where in the defs: `<kind>:<json path>`. */
  path: string;
  message: string;
}

export interface M4PageSources {
  pageId: string;
  /** Source text per kind; null when the file does not exist. */
  sources: Record<M4InputKind, string | null>;
}

export interface M4GateInput {
  project: number;
  module: string;
  /** Status of l2/<module>/pipeline/agentDefsL2/pipeline.json, or null when it does not exist. */
  defsPipelineStatus: string | null;
  pages: M4PageSources[];
  /** Whether a `_NNN_/l4/collabux/templates/…` reference resolves to an existing file. */
  templateExists: (category: string) => boolean;
  /** Whether a molecule tag is listed in its group index in _102040_. */
  moleculeExists: (tag: string) => boolean;
}

export interface M4ParsedPage {
  pageId: string;
  contract: L2ContractDefinition;
  shared: L2SharedDefinition;
  page11: Record<L2Page11Device, L2Page11Definition>;
  /**
   * Every name a page11 intent or a form submit uses, mapped to the shared method that serves it.
   * `createMesa → criarMesa` when the name is a request trigger; identity when it is a function.
   */
  methods: Record<string, string>;
  /** Members of a form's command input that are the page's selection, not something the form asks for. */
  contextInputs: M4ContextInput[];
}

/**
 * A top-level member of a form's command input that has the name of an entry param with a `select:` effect,
 * and the state fed by that param (atendimento, 07/10/2026: `lancarItem.comandaId ← selectedComanda`; the
 * draft held comandaId, nobody filled it, and the command never reached the BFF). Matched by the names the
 * defs themselves link (contract input ↔ entry param ↔ state source), never by a module's names.
 */
export interface M4ContextInput {
  form: string;
  /** The shared method that submits the form. */
  method: string;
  route: string;
  member: string;
  param: string;
  state: string;
}

export interface M4GateResult {
  accepted: string[];
  refused: string[];
  problems: M4InputProblem[];
  parsed: Record<string, M4ParsedPage>;
}

/**
 * The shared method (a function id) that serves `ref`, which may name a function, a request or a request
 * trigger; null when nothing serves it. A request with no function is served by a method of its own name.
 */
export function m4ResolveMethod(shared: L2SharedDefinition, ref: string): string | null {
  if (shared.functions[ref]) return ref;
  const byRequest = (requestId: string) => Object.entries(shared.functions).find(([, fn]) => fn.calls === requestId)?.[0] ?? (shared.requests[requestId] ? requestId : null);
  if (shared.requests[ref]) return byRequest(ref);
  const triggered = Object.entries(shared.requests).find(([, request]) => request.trigger === ref)?.[0];
  return triggered ? byRequest(triggered) : null;
}

export function gateM4Input(input: M4GateInput): M4GateResult {
  const problems: M4InputProblem[] = [];
  const parsed: Record<string, M4ParsedPage> = {};
  const pageIds = input.pages.map(page => page.pageId).sort();
  if (input.defsPipelineStatus !== 'complete') {
    problems.push(error('M4_INPUT_DEFS_PIPELINE_INCOMPLETE', '*', 'pipeline/agentDefsL2/pipeline.json',
      input.defsPipelineStatus === null ? 'agentDefsL2 never ran on this module.' : `agentDefsL2 pipeline status is ${input.defsPipelineStatus}, not complete.`));
  }
  if (!pageIds.length) problems.push(error('M4_INPUT_NO_PAGES', '*', 'web', 'No page defs were found under web/.'));

  for (const page of input.pages) {
    const result = parsePage(input, page, problems);
    if (result) parsed[page.pageId] = result;
  }
  const knownPages = new Set(pageIds);
  for (const page of Object.values(parsed)) checkPage(page, parsed, knownPages, input, problems);

  const moduleBlocked = problems.some(item => item.page === '*' && item.severity === 'error');
  const refused = pageIds.filter(id => moduleBlocked || !parsed[id] || problems.some(item => item.page === id && item.severity === 'error'));
  return { accepted: pageIds.filter(id => !refused.includes(id)), refused, problems, parsed };
}

function parsePage(input: M4GateInput, page: M4PageSources, problems: M4InputProblem[]): M4ParsedPage | null {
  const id = page.pageId;
  let ok = true;
  const read = <T>(kind: M4InputKind, parse: (source: string) => { location: { project: number; module: string; pageId: string }; definition: T }): T | null => {
    const source = page.sources[kind];
    if (source === null) {
      problems.push(error('M4_INPUT_DEFS_MISSING', id, `${kind}:`, `The ${kind} defs of page ${id} do not exist.`));
      ok = false;
      return null;
    }
    try {
      const result = parse(source);
      if (result.location.project !== input.project || result.location.module !== input.module || result.location.pageId !== id) {
        problems.push(error('M4_INPUT_DEFS_LOCATION', id, `${kind}:`, `The fileReference of the ${kind} defs does not name ${input.project}/${input.module}/${id}.`));
        ok = false;
      }
      return result.definition;
    } catch (cause) {
      problems.push(error('M4_INPUT_DEFS_FORMAT', id, `${kind}:`, `The ${kind} defs do not follow the v2 grammar: ${cause instanceof Error ? cause.message : String(cause)}`));
      ok = false;
      return null;
    }
  };
  const contract = read('contract', parseL2Contract);
  const shared = read('shared', parseL2Shared);
  const desktop = read('desktop', parseL2Page11);
  const mobile = read('mobile', parseL2Page11);
  if (!ok || !contract || !shared || !desktop || !mobile) return null;
  return { pageId: id, contract, shared, page11: { desktop, mobile }, methods: {}, contextInputs: [] };
}

function checkPage(page: M4ParsedPage, all: Record<string, M4ParsedPage>, knownPages: Set<string>, input: M4GateInput, problems: M4InputProblem[]): void {
  const id = page.pageId;
  const { shared, contract } = page;
  const refuse = (code: string, path: string, message: string) => problems.push(error(code, id, path, message));
  const note = (code: string, path: string, message: string) => problems.push(warning(code, id, path, message));

  // Calls: every request is a route of the contract, and every function calls, writes and navigates to something.
  const routePrefix = `${input.module}.${id}.`;
  const routes = new Map(contract.routes.map(route => [route.requestId, route]));
  for (const [requestId, request] of Object.entries(shared.requests)) {
    const route = routes.get(requestId);
    if (!route) { refuse('M4_INPUT_ROUTE_MISSING', `shared:requests.${requestId}`, `Request ${requestId} has no route ${routePrefix}${requestId} in the contract.`); continue; }
    if (route.kind !== request.kind || (route.writes ?? '') !== (request.writes ?? '')) note('M4_INPUT_ROUTE_KIND', `shared:requests.${requestId}`, `Request ${requestId} is ${request.kind}/${request.writes ?? '-'} in the shared and ${route.kind}/${route.writes ?? '-'} in the contract. The contract wins.`);
    const outputNames = new Set(route.outputMembers.map(member => member.name));
    const missing = request.returns.filter(key => !outputNames.has(key));
    if (missing.length) note('M4_INPUT_RETURN_MISSING', `shared:requests.${requestId}.returns`, `Request ${requestId} returns [${missing.join(', ')}], which the contract output does not have. The contract output wins.`);
  }
  for (const route of contract.routes) {
    if (!shared.requests[route.requestId]) note('M4_INPUT_ROUTE_EXTRA', `contract:${route.route}`, `Route ${route.route} has no request in the shared; nothing calls it.`);
  }
  for (const [fnId, fn] of Object.entries(shared.functions)) {
    if (fn.calls && !shared.requests[fn.calls]) refuse('M4_INPUT_FUNCTION_REF', `shared:functions.${fnId}.calls`, `Function ${fnId} calls ${fn.calls}, which is not a request of the shared.`);
    for (const target of [fn.sets, ...(fn.updates ?? [])].filter((item): item is string => Boolean(item))) {
      if (!shared.states[target]) note('M4_INPUT_STATE_UNKNOWN', `shared:functions.${fnId}`, `Function ${fnId} writes ${target}, which is not a declared state; the shared declares it from the contract output.`);
    }
    if (fn.navigate && !knownPages.has(fn.navigate)) refuse('M4_INPUT_NAVIGATE_TARGET', `shared:functions.${fnId}.navigate`, `Function ${fnId} navigates to ${fn.navigate}, which is not a page of this module.`);
    const target = fn.navigate ? all[fn.navigate] : undefined;
    for (const key of Object.keys(fn.carries ?? {})) {
      if (target && !target.shared.entry.params[key]) note('M4_INPUT_CARRIES_TARGET', `shared:functions.${fnId}.carries.${key}`, `Function ${fnId} carries ${key}, which page ${fn.navigate} does not read as an entry param.`);
    }
  }
  for (const [stateId, state] of Object.entries(shared.states)) {
    if (classifyL2StateSource(stateId, state.source, shared).kind === 'invalid') note('M4_INPUT_STATE_SOURCE', `shared:states.${stateId}`, `State ${stateId} has source ${JSON.stringify(state.source)}, which names nothing known; its type comes from what the functions write into it.`);
  }

  // Names a page or a form uses → the method that serves them (function, request or trigger).
  const resolve = (ref: string, path: string, what: string) => {
    const method = m4ResolveMethod(shared, ref);
    if (method) page.methods[ref] = method;
    else refuse('M4_INPUT_UNRESOLVED', path, `${what} ${ref} names no function, request or request trigger of the shared.`);
  };
  for (const [formId, form] of Object.entries(shared.forms)) resolve(form.submit, `shared:forms.${formId}.submit`, `Form ${formId} submits`);
  page.contextInputs = m4ContextInputs(page);
  for (const item of page.contextInputs) {
    note('M4_INPUT_CONTEXT_INPUT', `shared:forms.${item.form}`,
      `Form ${item.form} submits ${item.route}; its input member ${item.member} is the page's selection (entry param ${item.param}, state ${item.state}). ${item.method} fills ${item.member} from this.${item.state}; the form does not ask for it and its draft is not where it comes from.`);
  }
  for (const device of ['desktop', 'mobile'] as const) {
    const def = page.page11[device];
    for (const [organism, row] of Object.entries(def.organisms)) {
      for (const intent of row.intents) {
        if (intent.kind === 'navigate' && intent.to && !knownPages.has(intent.to)) refuse('M4_INPUT_NAVIGATE_TARGET', `${device}:organisms.${organism}.intents.${intent.id}`, `Intent ${intent.id} navigates to ${intent.to}, which is not a page of this module.`);
        if (intent.kind === 'navigate' && !m4ResolveMethod(shared, intent.id)) {
          // A navigation with no function of its own: the page navigates by itself with auraNavigate.
          note('M4_INPUT_NAVIGATE_UNSERVED', `${device}:organisms.${organism}.intents.${intent.id}`, `Intent ${intent.id} navigates to ${intent.to ?? '?'} and no shared function serves it.`);
          continue;
        }
        resolve(intent.id, `${device}:organisms.${organism}.intents.${intent.id}`, 'Intent');
      }
    }
    // Facts for the page generator; none refuses.
    const placed = new Set(def.sections.flatMap(section => section.organisms));
    for (const section of def.sections) {
      const unknown = section.organisms.filter(organism => !def.organisms[organism]);
      if (unknown.length) note('M4_INPUT_SECTION_ORGANISM', `${device}:sections.${section.id}`, `Section ${section.id} places [${unknown.join(', ')}], which are not organisms of the page.`);
    }
    const unplaced = Object.keys(def.organisms).filter(organism => !placed.has(organism));
    if (unplaced.length) note('M4_INPUT_SECTION_ORGANISM', `${device}:sections`, `Organisms [${unplaced.join(', ')}] are in no section.`);
    for (const [organism, list] of Object.entries(def.molecules)) {
      const unknown = list.flatMap(molecule => [molecule.preferred, molecule.alternative]).filter((tag): tag is string => Boolean(tag) && !input.moleculeExists(tag as string));
      if (unknown.length) note('M4_INPUT_MOLECULE_UNKNOWN', `${device}:molecules.${organism}`, `Molecules [${unknown.join(', ')}] are not in their group index; they are not offered to the page.`);
    }
    if (!input.templateExists(def.template.category)) note('M4_INPUT_TEMPLATE_MISSING', `${device}:template.category`, `Template ${def.template.category} does not exist; the page is designed from the defs alone.`);
  }
  const desktopIds = Object.keys(page.page11.desktop.organisms).sort().join(', ');
  const mobileIds = Object.keys(page.page11.mobile.organisms).sort().join(', ');
  if (desktopIds !== mobileIds) note('M4_INPUT_DEVICE_ORGANISMS', 'page11:organisms', `Desktop has [${desktopIds}] and mobile has [${mobileIds}]; each device renders its own.`);
}

/** The context members of every form's command input (see M4ContextInput). */
export function m4ContextInputs(page: Pick<M4ParsedPage, 'shared' | 'contract'>): M4ContextInput[] {
  const { shared, contract } = page;
  const found: M4ContextInput[] = [];
  for (const [formId, form] of Object.entries(shared.forms)) {
    const method = m4ResolveMethod(shared, form.submit);
    if (!method) continue;
    const requestId = shared.functions[method]?.calls ?? (shared.requests[method] ? method : null);
    const route = contract.routes.find(item => item.requestId === requestId);
    if (!route) continue;
    for (const member of route.inputMembers) {
      const param = shared.entry.params[member.name];
      if (!param || !param.effect.startsWith('select:')) continue;
      const state = Object.entries(shared.states).find(([, row]) => row.source === `entry.params.${member.name}`)?.[0];
      if (state) found.push({ form: formId, method, route: route.route, member: member.name, param: member.name, state });
    }
  }
  return found;
}

function error(code: string, page: string, path: string, message: string): M4InputProblem {
  return { severity: 'error', code, page, path, message };
}
function warning(code: string, page: string, path: string, message: string): M4InputProblem {
  return { severity: 'warning', code, page, path, message };
}
