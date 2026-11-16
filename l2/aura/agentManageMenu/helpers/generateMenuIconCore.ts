/// <mls fileReference="_102020_/l2/aura/agentManageMenu/helpers/generateMenuIconCore.ts" enhancement="_blank"/>

// Pure core of agentGenerateMenuIcon: the request, the prompt, the validation of the returned icons and
// the one-shot draft the menu editor reads. No I/O: the agent reads and writes, the editor saves.
//
// The icon is stored as MARKUP (`navigation[i].iconSvg`) and inlined by the collab-messages apps tab,
// so it is executable surface: every returned drawing passes 102036 isSafeMenuIconSvg, the same rule
// the apps tab applies when it draws, or it is dropped.

import { menuIconSvgProblems, type InlineSvgProblem } from '/_102036_/l2/inlineSvg.js';

/** How many drawings one generation asks for (the editor shows them side by side). */
export const MENU_ICON_CANDIDATES = 3;

/** Key of the one-shot draft in the Studio document (`l5/project.json`); never read by the runtime. */
export const MENU_ICON_DRAFT_KEY = 'menuIconDraft';

export interface GenerateMenuIconRequest {
  projectId: number;
  moduleId?: string;
  pageId?: string;
  /** Menu label of the page: what the icon stands for. */
  label?: string;
  /** Description of the page in the menu, for context. */
  description?: string;
  /** What the icon should show, in the user's words. */
  brief?: string;
  requestId?: string;
}

export interface MenuIconCandidate {
  svg: string;
  note?: string;
}

export interface MenuIconDraft {
  requestId: string;
  icons: MenuIconCandidate[];
  createdAt: string;
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Validates and normalizes the agent entry. Throws with an actionable message. */
export function normalizeMenuIconRequest(raw: unknown): GenerateMenuIconRequest {
  if (!isRecord(raw)) throw new Error('entry must be a JSON object');
  const projectId = Number(raw.projectId);
  if (!Number.isInteger(projectId) || projectId <= 0) throw new Error('entry needs { projectId }');
  const request: GenerateMenuIconRequest = {
    projectId,
    moduleId: readString(raw.moduleId) || undefined,
    pageId: readString(raw.pageId) || undefined,
    label: readString(raw.label) || undefined,
    description: readString(raw.description) || undefined,
    brief: readString(raw.brief) || undefined,
    requestId: readString(raw.requestId) || undefined,
  };
  if (!request.brief && !request.label) throw new Error('entry needs { brief } or the page { label }');
  return request;
}

/** The brief leads; the page label and description are the context the icon has to fit. */
export function buildGenerateMenuIconHumanPrompt(request: GenerateMenuIconRequest): string {
  return [
    request.brief ? `Draw: ${request.brief}` : `Draw an icon for the menu entry "${request.label}".`,
    request.brief && request.label ? `It is the icon of the menu entry "${request.label}".` : '',
    request.description ? `That page: ${request.description}` : '',
    `Return ${MENU_ICON_CANDIDATES} different drawings of the idea.`,
  ].filter(Boolean).join('\n');
}

const PROBLEM_TEXT: Record<InlineSvgProblem, string> = {
  'empty': 'no svg was returned',
  'too-large': 'over the size limit, simplify the drawing',
  'not-svg': 'must be a single <svg> root element',
  'many-roots': 'must contain exactly one <svg> element',
  'no-viewbox': 'must declare a viewBox',
  'forbidden': 'must be plain shapes: no script/style/image/use/animate/foreignObject',
  'event-handler': 'must carry no event handler',
  'external-url': 'must not reference anything external',
  'root-size': 'the <svg> root must not declare width/height',
  'fixed-color': 'must paint with currentColor only',
};

/** Why a drawing would be refused, in words a person (or the prompt) can act on. Empty = accepted. */
export function describeMenuIconProblems(markup: unknown): string[] {
  return menuIconSvgProblems(markup).map((problem) => PROBLEM_TEXT[problem]);
}

function stripFence(value: string): string {
  return value.replace(/^```[a-z]*\s*/iu, '').replace(/```$/u, '').trim();
}

/**
 * The drawings of an LLM result that pass the rule, at most MENU_ICON_CANDIDATES. Fails when none does,
 * with the reasons of each refused one.
 */
export function sanitizeGeneratedMenuIcons(
  result: unknown,
): { ok: true; icons: MenuIconCandidate[]; dropped: number } | { ok: false; error: string } {
  if (!isRecord(result) || !Array.isArray(result.icons)) return { ok: false, error: 'result has no icons array' };
  const icons: MenuIconCandidate[] = [];
  const reasons: string[] = [];
  result.icons.forEach((item, index) => {
    const svg = stripFence(readString(isRecord(item) ? item.svg : item));
    const problems = describeMenuIconProblems(svg);
    if (problems.length) {
      reasons.push(`#${index + 1}: ${problems.join(', ')}`);
      return;
    }
    if (icons.length < MENU_ICON_CANDIDATES && !icons.some((icon) => icon.svg === svg)) {
      const note = readString(isRecord(item) ? item.note : '');
      icons.push(note ? { svg, note } : { svg });
    }
  });
  if (!icons.length) return { ok: false, error: reasons.length ? reasons.join('; ') : 'no icon returned' };
  return { ok: true, icons, dropped: result.icons.length - icons.length };
}

/** The Studio document with the draft set (a copy). */
export function withMenuIconDraft(projectConfig: unknown, requestId: string, icons: MenuIconCandidate[], now = new Date()): Record<string, unknown> {
  const next: Record<string, unknown> = isRecord(projectConfig) ? { ...projectConfig } : {};
  const draft: MenuIconDraft = { requestId, icons, createdAt: now.toISOString() };
  next[MENU_ICON_DRAFT_KEY] = draft;
  return next;
}

/** The draft of THIS request, revalidated (the document is editable by hand), or undefined. */
export function readMenuIconDraft(projectConfig: unknown, requestId: string): MenuIconCandidate[] | undefined {
  if (!isRecord(projectConfig)) return undefined;
  const draft = projectConfig[MENU_ICON_DRAFT_KEY];
  if (!isRecord(draft) || readString(draft.requestId) !== requestId || !requestId) return undefined;
  const sanitized = sanitizeGeneratedMenuIcons({ icons: draft.icons });
  return sanitized.ok ? sanitized.icons : undefined;
}

/** The Studio document without the draft (a copy). */
export function clearMenuIconDraft(projectConfig: unknown): Record<string, unknown> {
  const next: Record<string, unknown> = isRecord(projectConfig) ? { ...projectConfig } : {};
  delete next[MENU_ICON_DRAFT_KEY];
  return next;
}
