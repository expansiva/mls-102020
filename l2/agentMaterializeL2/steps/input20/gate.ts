/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/gate.ts" enhancement="_blank"/>

// Pure input gate of agentMaterializeL2. It reads the four public defs of every page (contract, shared,
// desktop and mobile page11) and says, page by page, whether code can be generated from them.
//
// Generic by design (Guilherme, 05/10/2026: "não podemos ter tantas regras voltadas para um módulo"):
// - it REFUSES only what makes generation impossible: a missing or unreadable file, or a reference that
//   points at nothing anywhere (a request with no route, an intent that names nothing, a navigation to no page);
// - it RESOLVES references generically: a page11 intent may name a request or a request trigger, and it is
//   mapped to the shared method that serves it (`methods`); every request is a method of its own id, and a
//   navigate intent is a method of its own id that changes page (`navigations`);
// - every other inconsistency is a factual NOTE for the generators (the contract wins on types). It never
//   prescribes code by names: the generators read the defs and the contract themselves.
// The shared has the frozen structure of 13/10/2026 (no forms, no functions): see helpers/defs/shared.ts.
// No IO here: io.ts reads the files and run.ts persists the result.

import { L2_PRIMARY_GENOME, parseL2Page11, type L2Page11Definition, type L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
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
  /** UX variants of the page (`web/<device>/page21/…`, see L2_GENOME): the same page, another page11 per device. */
  variants?: M4VariantSources[];
}

export interface M4VariantSources { genome: string; sources: Record<L2Page11Device, string | null> }
/** A variant that can be generated: both devices parse, and every intent is one the primary page11 already has. */
export interface M4ParsedVariant { genome: string; page11: Record<L2Page11Device, L2Page11Definition> }

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
   * Every name a page11 intent uses, mapped to the shared method that serves it: the request it names
   * (identity), the request it triggers (`createMesa → criarMesa`), or itself for a navigation.
   */
  methods: Record<string, string>;
  /** Members of a submitted command's input that are the page's selection, not something the person types. */
  contextInputs: M4ContextInput[];
  /** The navigate intents of the page: each one a shared method that changes page. */
  navigations: M4Navigation[];
  /** The accepted UX variants (page21…); a refused one is a warning of the page, never a refusal of it. */
  variants: M4ParsedVariant[];
}

/**
 * A navigate intent of page11. The frozen shared has no function for it (13/10/2026): the shared exposes a public
 * method named after the intent that calls auraNavigate to the target page, carrying what that page reads.
 */
export interface M4Navigation {
  method: string;
  organism: string;
  to: string;
  /** The entry params of the target page: the only values a navigation can carry. */
  targetParams: string[];
}

/**
 * A top-level member of a submitted command's input that has the name of an entry param with a `select:` effect,
 * and the state fed by that param (atendimento, 07/10/2026: `lancarItem.comandaId ← selectedComanda`; the
 * draft held comandaId, nobody filled it, and the command never reached the BFF). Matched by the names the
 * defs themselves link (page11 submit intent ↔ contract input ↔ entry param ↔ state source), never by a module's names.
 */
export interface M4ContextInput {
  /** The page11 organism whose submit intent sends the command. */
  organism: string;
  /** The shared method that sends the command. */
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
 * The shared method (a request id) that serves `ref`, which may name a request or a request trigger; null when
 * nothing serves it. Every request is served by a public method of its own id.
 */
export function m4ResolveMethod(shared: L2SharedDefinition, ref: string): string | null {
  if (shared.requests[ref]) return ref;
  return Object.entries(shared.requests).find(([, request]) => request.trigger === ref)?.[0] ?? null;
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
  for (const page of input.pages) {
    const target = parsed[page.pageId];
    if (target) for (const variant of page.variants ?? []) checkVariant(target, variant, knownPages, input, problems);
  }

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
      const genome = (result.location as { genome?: string }).genome;
      if (result.location.project !== input.project || result.location.module !== input.module || result.location.pageId !== id || (genome !== undefined && genome !== L2_PRIMARY_GENOME)) {
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
  return { pageId: id, contract, shared, page11: { desktop, mobile }, methods: {}, contextInputs: [], navigations: [], variants: [] };
}

/**
 * A UX variant (page21…) reuses the page's shared: its intents must be ones the primary page11 already resolves, its
 * navigations must reach pages of the module, and both devices must parse at their own folder. Anything else is a
 * warning that leaves the variant out (M4_INPUT_VARIANT_REFUSED); the page and its page11 are never refused for it.
 */
function checkVariant(page: M4ParsedPage, variant: M4VariantSources, knownPages: Set<string>, input: M4GateInput, problems: M4InputProblem[]): void {
  const id = page.pageId;
  const reasons: string[] = [];
  const defs = {} as Record<L2Page11Device, L2Page11Definition>;
  for (const device of ['desktop', 'mobile'] as const) {
    const source = variant.sources[device];
    if (source === null) { reasons.push(`${device} defs missing`); continue; }
    try {
      const { location, definition } = parseL2Page11(source);
      if (location.project !== input.project || location.module !== input.module || location.pageId !== id || location.device !== device || location.genome !== variant.genome) {
        reasons.push(`the fileReference of the ${device} defs does not name ${input.project}/${input.module}/web/${device}/${variant.genome}/${id}`);
        continue;
      }
      defs[device] = definition;
      for (const [organism, row] of Object.entries(definition.organisms)) {
        for (const intent of row.intents) {
          if (intent.kind === 'navigate' && intent.to && !knownPages.has(intent.to)) reasons.push(`${device} intent ${intent.id} of ${organism} navigates to ${intent.to}, which is not a page of this module`);
          else if (!page.methods[intent.id]) reasons.push(`${device} intent ${intent.id} of ${organism} is not an intent of the primary page11, so the shared has no method for it`);
        }
      }
      if (!input.templateExists(definition.template.category)) problems.push(warning('M4_INPUT_TEMPLATE_MISSING', id, `${variant.genome}/${device}:template.category`, `Template ${definition.template.category} does not exist; the ${variant.genome} variant is designed from the defs alone.`));
    } catch (cause) {
      reasons.push(`the ${device} defs do not follow the v2 grammar: ${cause instanceof Error ? cause.message : String(cause)}`);
    }
  }
  if (reasons.length) {
    problems.push(warning('M4_INPUT_VARIANT_REFUSED', id, `${variant.genome}:`, `Variant ${variant.genome} of ${id} is left out: ${reasons.join('; ')}.`));
    return;
  }
  page.variants.push({ genome: variant.genome, page11: defs });
}

function checkPage(page: M4ParsedPage, all: Record<string, M4ParsedPage>, knownPages: Set<string>, input: M4GateInput, problems: M4InputProblem[]): void {
  const id = page.pageId;
  const { shared, contract } = page;
  const refuse = (code: string, path: string, message: string) => problems.push(error(code, id, path, message));
  const note = (code: string, path: string, message: string) => problems.push(warning(code, id, path, message));

  // Calls: every request is a route of the contract.
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
  for (const [stateId, state] of Object.entries(shared.states)) {
    if (classifyL2StateSource(state.source, shared).kind === 'invalid') note('M4_INPUT_STATE_SOURCE', `shared:states.${stateId}`, `State ${stateId} has source ${JSON.stringify(state.source)}, which names nothing known; its type comes from what the requests write into it.`);
  }
  // A command output member that no state reads (`item`, the summary row returned next to the record): the command
  // still applies it, where its route comment says (reembolsoDespesas, 13/10/2026).
  for (const [requestId, request] of Object.entries(shared.requests)) {
    const unread = request.returns.filter(key => !Object.values(shared.states).some(state => state.source === `${requestId}.${key}`));
    if (request.kind === 'cmd' && unread.length) note('M4_INPUT_RETURN_UNREAD', `shared:requests.${requestId}.returns`, `Command ${requestId} returns [${unread.join(', ')}], which no state has as its source. Its route comment says where each one goes (a row to insert or update in a list, a record to redraw); apply it there.`);
  }
  for (const item of m4RequiredParams(page)) note('M4_INPUT_REQUIRED_PARAM', `shared:entry.params.${item.param}`, item.message);

  // Names a page uses → the method that serves them (a request or a request trigger).
  const resolve = (ref: string, path: string, what: string) => {
    const method = m4ResolveMethod(shared, ref);
    if (method) page.methods[ref] = method;
    else refuse('M4_INPUT_UNRESOLVED', path, `${what} ${ref} names no request or request trigger of the shared.`);
  };
  page.contextInputs = m4ContextInputs(page);
  for (const item of page.contextInputs) {
    note('M4_INPUT_CONTEXT_INPUT', `page11:organisms.${item.organism}`,
      `${item.organism} submits ${item.route}; its input member ${item.member} is the page's selection (entry param ${item.param}, state ${item.state}). ${item.method} fills ${item.member} from this.${item.state}; the person does not type it, and a draft is not where it comes from.`);
  }
  for (const device of ['desktop', 'mobile'] as const) {
    const def = page.page11[device];
    for (const [organism, row] of Object.entries(def.organisms)) {
      for (const intent of row.intents) {
        if (intent.kind === 'navigate' && intent.to && !knownPages.has(intent.to)) refuse('M4_INPUT_NAVIGATE_TARGET', `${device}:organisms.${organism}.intents.${intent.id}`, `Intent ${intent.id} navigates to ${intent.to}, which is not a page of this module.`);
        if (intent.kind === 'navigate') {
          // Served by a shared method of the intent id that calls auraNavigate (no functions since 13/10/2026).
          page.methods[intent.id] = intent.id;
          const to = intent.to ?? '';
          if (!page.navigations.some(item => item.method === intent.id)) page.navigations.push({ method: intent.id, organism, to, targetParams: Object.keys(all[to]?.shared.entry.params ?? {}) });
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

/**
 * The facts of every `required: true` entry param (materializadorL2.md §5: "the page does not open without it"), from the
 * links the defs declare: the request inputs it feeds, whether that request is the opening load (`trigger: 'onLoad'`) and
 * the route comment about that input. Whether the param is a condition of opening is the generator's reading
 * (shared40 prompt, Entry params): an input of an action, or one the route comment says comes from the session, is not.
 * tarefas (16/10/2026): `termo` feeds only a search, `avisoId` only the opening of one notice, `responsavelId` "vem do
 * contexto, nunca da tela".
 */
export function m4RequiredParams(page: Pick<M4ParsedPage, 'shared' | 'contract'>): Array<{ param: string; opening: boolean; message: string }> {
  const out: Array<{ param: string; opening: boolean; message: string }> = [];
  for (const [name, param] of Object.entries(page.shared.entry.params)) {
    if (!param.required) continue;
    const feeds: string[] = [];
    let opening = false;
    for (const route of page.contract.routes) {
      const member = route.inputMembers.find(item => item.name === name);
      if (!member) continue;
      const trigger = page.shared.requests[route.requestId]?.trigger;
      const onLoad = trigger === 'onLoad';
      if (onLoad && !member.optional) opening = true;
      const said = route.jsdoc?.input?.split(';').map(part => part.trim()).find(part => new RegExp(`(?<![\\w$])${name}(?![\\w$])`, 'u').test(part));
      feeds.push(`${route.requestId}.${name} (${onLoad ? 'the opening load' : `started by ${trigger ?? 'nothing'}`}${member.optional ? ', optional in the contract' : ''}${said ? `; the route says: "${said}"` : ''})`);
    }
    out.push({
      param: name,
      opening,
      message: feeds.length
        ? `Param ${name} is required. It feeds ${feeds.join(', ')}. It is a condition of opening only when it feeds the opening load and the route does not say it comes from the session or the context; otherwise it is required for the call it feeds, and the page opens without it.`
        : `Param ${name} is required, but it feeds no request input of the contract: the page opens without it.`,
    });
  }
  return out;
}

/** The context members of the input of every command a page11 submit intent sends (see M4ContextInput). */
export function m4ContextInputs(page: Pick<M4ParsedPage, 'shared' | 'contract' | 'page11'>): M4ContextInput[] {
  const { shared, contract } = page;
  const found: M4ContextInput[] = [];
  const seen = new Set<string>();
  for (const def of Object.values(page.page11)) {
    for (const [organism, row] of Object.entries(def.organisms)) {
      for (const intent of row.intents) {
        const method = intent.kind === 'submit' ? m4ResolveMethod(shared, intent.id) : null;
        if (!method || shared.requests[method].kind !== 'cmd') continue;
        const route = contract.routes.find(item => item.requestId === method);
        if (!route) continue;
        for (const member of route.inputMembers) {
          const param = shared.entry.params[member.name];
          if (!param || !param.effect.startsWith('select:')) continue;
          const state = Object.entries(shared.states).find(([, item]) => item.source === `entry.params.${member.name}`)?.[0];
          if (!state || seen.has(`${method}|${member.name}`)) continue;
          seen.add(`${method}|${member.name}`);
          found.push({ organism, method, route: route.route, member: member.name, param: member.name, state });
        }
      }
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
