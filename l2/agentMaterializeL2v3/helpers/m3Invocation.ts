/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.ts" enhancement="_blank"/>

// adapted from mls-102020/l2/agentDefsL2/helpers/d2Core.ts:88-160 @ 301a76dc (message and step parsing; flags are new)

export type M3Device = 'desktop' | 'mobile';

export const M3_HELP = [
  'Usage: @@agentMaterializeL2v3 <module> [/pages <pageId>[,<pageId>...]] [/devices desktop|mobile|desktop,mobile]',
  '<module> and each <pageId> are lowerCamel (^[a-z][A-Za-z0-9]{0,59}$).',
  'Without /pages every page of the last agentDefsL2 finalize80 is used; without /devices both devices are used.',
].join('\n');

export interface M3RunIdentity {
  project: number;
  module: string;
  /** null = every page. */
  pages: string[] | null;
  devices: M3Device[];
}

export type M3MessageInvocation =
  | { kind: 'help' }
  | ({ kind: 'run' } & M3RunIdentity)
  | { kind: 'refusal'; diagnostic: string };

export type M3StepInvocation =
  | ({ kind: 'run'; runDir: string } & M3RunIdentity)
  | { kind: 'refusal'; diagnostic: string };

const AGENT_PREFIXES = [
  /@@\s*_102020_\/l2\/agentMaterializeL2v3/gi,
  /@@\s*_102020_agentMaterializeL2v3/gi,
  /@@\s*agentMaterializeL2v3/gi,
];
const DEVICES: readonly M3Device[] = ['desktop', 'mobile'];
const TOKEN_RE = /^[a-z][A-Za-z0-9]{0,59}$/u;

export function currentM3Project(): number {
  return Number(mls.actualProject || 0);
}

export function m3TokenOk(value: string): boolean {
  return TOKEN_RE.test(value);
}

function refuse(diagnostic: string): { kind: 'refusal'; diagnostic: string } {
  return { kind: 'refusal', diagnostic };
}

function parsePages(list: readonly string[]): string[] | { kind: 'refusal'; diagnostic: string } {
  if (!list.length || list.some(item => !item)) return refuse('Empty page name in /pages.');
  for (const page of list) if (!m3TokenOk(page)) return refuse(`Invalid page name: ${page}.`);
  const duplicate = list.find((page, index) => list.indexOf(page) !== index);
  if (duplicate) return refuse(`Repeated page: ${duplicate}.`);
  return [...list];
}

function parseDevices(list: readonly string[]): M3Device[] | { kind: 'refusal'; diagnostic: string } {
  if (!list.length || list.some(item => !item)) return refuse('Empty device in /devices.');
  for (const device of list) if (!(DEVICES as readonly string[]).includes(device)) return refuse(`Invalid device: ${device}.`);
  return DEVICES.filter(device => list.includes(device));
}

export function parseM3MessageInvocation(value: string, project = currentM3Project()): M3MessageInvocation {
  let raw = String(value || '');
  for (const prefix of AGENT_PREFIXES) raw = raw.replace(prefix, ' ');
  const tokens = raw.trim().split(/\s+/u).filter(Boolean);
  if (tokens.length === 1 && tokens[0].toLowerCase() === '/help') return { kind: 'help' };
  if (!tokens.length || tokens[0].startsWith('/')) return refuse(`Missing module. ${M3_HELP.split('\n')[0]}`);
  const module = tokens[0];
  if (!m3TokenOk(module)) return refuse('Module name must be lowerCamel and must not contain a path.');
  let pagesRaw: string[] | null = null;
  let devicesRaw: string[] | null = null;
  for (let index = 1; index < tokens.length; index += 2) {
    const flag = tokens[index].toLowerCase();
    if (flag !== '/pages' && flag !== '/devices') {
      return refuse(tokens[index].startsWith('/') ? `Unknown flag: ${tokens[index]}.` : `Unexpected argument: ${tokens[index]}.`);
    }
    const argument = tokens[index + 1];
    if (!argument || argument.startsWith('/')) return refuse(`Empty value for ${flag}.`);
    if (flag === '/pages') {
      if (pagesRaw) return refuse('Repeated flag: /pages.');
      pagesRaw = argument.split(',');
    } else {
      if (devicesRaw) return refuse('Repeated flag: /devices.');
      devicesRaw = argument.split(',');
    }
  }
  if (!Number.isSafeInteger(project) || project <= 0) return refuse('The current project is unavailable.');
  const pages = pagesRaw ? parsePages(pagesRaw) : null;
  if (pages && !Array.isArray(pages)) return pages;
  const devices = devicesRaw ? parseDevices(devicesRaw) : [...DEVICES];
  if (!Array.isArray(devices)) return devices;
  return { kind: 'run', project, module, pages: pages as string[] | null, devices };
}

export function parseM3StepInvocation(value: string, currentProject = currentM3Project()): M3StepInvocation {
  let parsed: unknown;
  try {
    parsed = JSON.parse(String(value || '{}'));
  } catch {
    return refuse('agentMaterializeL2v3 step args must be JSON.');
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return refuse('agentMaterializeL2v3 step args must be an object.');
  const raw = parsed as Record<string, unknown>;
  const allowed = new Set(['project', 'module', 'pages', 'devices', 'runDir']);
  const unknown = Object.keys(raw).find(key => !allowed.has(key));
  if (unknown) return refuse(`Unknown step arg: ${unknown}.`);
  const project = typeof raw.project === 'number' ? raw.project : Number.NaN;
  if (!Number.isSafeInteger(project) || project <= 0) return refuse('Step args require a positive integer project.');
  if (project !== currentProject) return refuse(`Step project ${project} does not match the current project ${currentProject}.`);
  const module = typeof raw.module === 'string' ? raw.module.trim() : '';
  if (!m3TokenOk(module)) return refuse('Step module must be lowerCamel and must not contain a path.');
  const runDir = typeof raw.runDir === 'string' ? raw.runDir : '';
  if (!/^run_\d{14}$/u.test(runDir)) return refuse('Step runDir must match run_<14 digits>.');
  let pages: string[] | null = null;
  if (raw.pages !== null) {
    if (!Array.isArray(raw.pages) || raw.pages.some(item => typeof item !== 'string')) return refuse('Step pages must be null or a list of page names.');
    const checked = parsePages(raw.pages as string[]);
    if (!Array.isArray(checked)) return checked;
    pages = checked;
  }
  if (!Array.isArray(raw.devices) || raw.devices.some(item => typeof item !== 'string')) return refuse('Step devices must be a list.');
  const devices = parseDevices(raw.devices as string[]);
  if (!Array.isArray(devices)) return devices;
  return { kind: 'run', project, module, pages, devices, runDir };
}
