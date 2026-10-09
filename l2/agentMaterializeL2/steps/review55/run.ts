/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/review55/run.ts" enhancement="_blank"/>

// review55, one page × device: a second LLM reviews the generated page against the template and the intent of
// the page, and returns findings with a severity. REPORT ONLY (Guilherme, 05/10/2026): nothing is rewritten and
// nothing is refused; the findings go to the receipt (and to the module report). A later version may let
// blocker/major findings drive one repair round of pages50.
// The review is reused while the page file and its context are unchanged.

import { displayPath, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { parseL2Page11, type L2Page11Device } from '/_102020_/l2/agentMaterializeL2/helpers/defs/page11.js';
import { readL4Module, renderL4Slice, resolveL4Refs } from '/_102020_/l2/agentMaterializeL2/helpers/l4/context.js';
import type { M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import type { M4InputSnapshot } from '/_102020_/l2/agentMaterializeL2/steps/input20/run.js';
import { m4DefsInfo, templateInfo } from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { readM4Snapshot, sharedDeclarationInfo } from '/_102020_/l2/agentMaterializeL2/steps/shared40/run.js';
import { pageReceiptInfo, pageSourceInfo, studioPagePort, type M4PagePort, type M4PageReceipt } from '/_102020_/l2/agentMaterializeL2/steps/pages50/run.js';

export const M4_REVIEW_VERSION = '2026-10-05-materialize-l2-v4-review-v1' as const;
export const M4_REVIEW_TOOL = 'submitPageReview' as const;
export const M4_REVIEW_SEVERITIES = ['blocker', 'major', 'minor'] as const;
export type M4ReviewSeverity = typeof M4_REVIEW_SEVERITIES[number];

export interface M4ReviewFinding {
  severity: M4ReviewSeverity;
  /** What it is about: template, intent, journey, hierarchy, titles, states, mobile, accessibility, text… */
  area: string;
  message: string;
  /** The line of the template or of the page intent the finding rests on, quoted. */
  basis: string;
  /** Where in the page: a render method, an organism id or a short quote of the source. */
  where: string;
  /** What would fix it, in one sentence. */
  fix: string;
}
export interface M4ReviewReceipt {
  schemaVersion: typeof M4_REVIEW_VERSION;
  project: number;
  module: string;
  pageId: string;
  device: L2Page11Device;
  contextHash: string;
  pagePath: string;
  summary: string;
  findings: M4ReviewFinding[];
  /** Set when the reviewer gave no usable answer: the unit is settled for this run, and reviewed again next time. */
  failed?: string;
}
export interface M4ReviewContext {
  identity: M4RunIdentity;
  pageId: string;
  device: L2Page11Device;
  prompt: string;
  humanPrompt: string;
  contextHash: string;
}

export const reviewPromptInfo: Ns5FileInfo = { project: 102020, level: 2, folder: 'agentMaterializeL2/steps/review55', shortName: 'prompt', extension: '.md' };
export function reviewReceiptInfo(identity: M4RunIdentity, pageId: string, device: L2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentMaterializeL2/review55`, shortName: `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`, extension: '.json' };
}

/** The page must exist with a pages50 receipt: the review reads what pages50 approved, nothing else. */
export async function buildM4ReviewContext(identity: M4RunIdentity, pageId: string, device: L2Page11Device, port: M4PagePort = studioPagePort, snapshot?: M4InputSnapshot): Promise<M4ReviewContext> {
  const snap = snapshot ?? await readM4Snapshot(identity, port);
  const page = snap.pages.find(item => item.pageId === pageId && item.status === 'accepted');
  if (!page) throw new Error(`M4_REVIEW_PAGE_NOT_ACCEPTED: ${pageId}`);
  const sourceInfo = pageSourceInfo(identity, pageId, device);
  if (!port.exists(sourceInfo)) throw new Error(`M4_REVIEW_PAGE_MISSING: ${displayPath(sourceInfo)}; pages50 must generate it first.`);
  const receipt = await port.readJson<M4PageReceipt>(pageReceiptInfo(identity, pageId, device));
  const source = await port.read(sourceInfo);
  const page11Source = await port.read(m4DefsInfo(identity, device, pageId));
  const page11 = parseL2Page11(page11Source).definition;
  const template = templateInfo(page11.template.category);
  const templateText = template && port.exists(template) ? await port.read(template) : '';
  const declarationInfo = sharedDeclarationInfo(identity, pageId);
  const declaration = port.exists(declarationInfo) ? await port.read(declarationInfo) : '';
  const l4Context = page.l4 ? await readL4Module(identity.project, identity.module, { listDefs: (project, folder) => port.listDefs(project, folder, 4), exists: port.exists, read: port.read }) : null;
  const l4 = l4Context && page.l4 ? renderL4Slice(resolveL4Refs(l4Context, page.l4)) : '';
  const prompt = await port.read(reviewPromptInfo);
  const parts = [
    '# Page under review',
    `- module: ${identity.module}; page: ${pageId}; device: ${device}`,
    `- file: ${displayPath(sourceInfo)}`,
    '',
    '# The page file',
    '```ts', source.trim(), '```',
    '',
    '# The design answer its author gave',
    '```json', JSON.stringify(receipt?.design ?? null, null, 2), '```',
    '',
    `# Page definition — web/${device}/page11/${pageId}.defs.ts (intent, sections, organisms)`,
    '```ts', page11Source.trim(), '```',
    '',
    `# Template — ${page11.template.category}`,
    templateText.trim() || '(template not found)',
    '',
    '# Business context (L4)',
    l4 || '(the module has no L4 context)',
    '',
    `# Shared declaration — what the page can read and call`,
    '```ts', declaration.trim() || '(not found)', '```',
  ];
  const humanPrompt = parts.join('\n');
  return { identity, pageId, device, prompt, humanPrompt, contextHash: await sha256Text(`${prompt}\n---\n${humanPrompt}`) };
}

export function buildM4ReviewPrompt(context: M4ReviewContext): { systemPrompt: string; humanPrompt: string } {
  return { systemPrompt: context.prompt, humanPrompt: context.humanPrompt };
}

/** Records the review. Malformed rows are dropped; a missing answer is recorded as such (report only, never a failure). */
export async function recordM4Review(context: M4ReviewContext, answer: { summary: string; findings: M4ReviewFinding[]; failed?: string }, port: Pick<M4PagePort, 'writeJson'> = studioPagePort): Promise<M4ReviewReceipt> {
  const receipt: M4ReviewReceipt = {
    schemaVersion: M4_REVIEW_VERSION, ...context.identity, pageId: context.pageId, device: context.device,
    contextHash: context.contextHash, pagePath: displayPath(pageSourceInfo(context.identity, context.pageId, context.device)),
    summary: answer.summary, findings: answer.findings, ...(answer.failed ? { failed: answer.failed } : {}),
  };
  await port.writeJson(reviewReceiptInfo(context.identity, context.pageId, context.device), receipt);
  return receipt;
}

/**
 * settled: the unit has a review of its current context (done or failed): the step may finish.
 * reusable: settled and not failed: the next run does not review it again.
 */
export async function m4ReviewState(identity: M4RunIdentity, pageId: string, device: L2Page11Device, port: M4PagePort = studioPagePort, snapshot?: M4InputSnapshot): Promise<{ settled: boolean; reusable: boolean }> {
  try {
    const receipt = await port.readJson<M4ReviewReceipt>(reviewReceiptInfo(identity, pageId, device));
    if (!receipt || receipt.schemaVersion !== M4_REVIEW_VERSION) return { settled: false, reusable: false };
    const context = await buildM4ReviewContext(identity, pageId, device, port, snapshot);
    const settled = context.contextHash === receipt.contextHash;
    return { settled, reusable: settled && !receipt.failed };
  } catch {
    return { settled: false, reusable: false };
  }
}

/** One line per finding, worst first, for the step trace. */
export function formatM4Review(receipt: M4ReviewReceipt): string {
  const rank = (item: M4ReviewFinding) => M4_REVIEW_SEVERITIES.indexOf(item.severity);
  const rows = [...receipt.findings].sort((a, b) => rank(a) - rank(b)).map(item => `${item.severity} [${item.area}] ${item.message} — fix: ${item.fix}`);
  const count = (severity: M4ReviewSeverity) => receipt.findings.filter(item => item.severity === severity).length;
  if (receipt.failed) return `Review ${receipt.pageId}/${receipt.device} failed: ${receipt.failed}`;
  return [`Review ${receipt.pageId}/${receipt.device}: ${count('blocker')} blocker, ${count('major')} major, ${count('minor')} minor. ${receipt.summary}`, ...rows].join('\n');
}

/** The tool answer: well-formed findings only. */
export function m4ReviewToolAnswer(payload: unknown): { summary: string; findings: M4ReviewFinding[] } {
  const root = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {};
  const result = root.type === 'flexible' ? root.result as Record<string, unknown> | undefined : undefined;
  if (result && result.toolName !== M4_REVIEW_TOOL) throw new Error(`M4_REVIEW_TOOL_MISMATCH: expected ${M4_REVIEW_TOOL}.`);
  let args: unknown = result ? result.arguments : root.arguments ?? root.payload ?? root;
  if (typeof args === 'string') {
    try { args = JSON.parse(args); } catch { throw new Error('M4_REVIEW_TOOL_JSON: the tool arguments are not JSON.'); }
  }
  const value = args && typeof args === 'object' ? args as Record<string, unknown> : {};
  const text = (field: unknown) => typeof field === 'string' ? field : '';
  const findings = (Array.isArray(value.findings) ? value.findings : []).flatMap((row: unknown) => {
    const item = row && typeof row === 'object' ? row as Record<string, unknown> : {};
    const severity = item.severity as M4ReviewSeverity;
    if (!M4_REVIEW_SEVERITIES.includes(severity) || !text(item.message)) return [];
    return [{ severity, area: text(item.area), message: text(item.message), basis: text(item.basis), where: text(item.where), fix: text(item.fix) }];
  });
  return { summary: text(value.summary), findings };
}

export const m4ReviewToolSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'findings'],
  properties: {
    summary: { type: 'string', description: 'Two or three sentences: does the page serve its intent and follow its template on this device?' },
    findings: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['severity', 'area', 'message', 'basis', 'where', 'fix'],
        properties: {
          severity: { type: 'string', enum: [...M4_REVIEW_SEVERITIES] },
          area: { type: 'string', description: 'template, intent, journey, hierarchy, titles, states, mobile, accessibility, text, data…' },
          message: { type: 'string' },
          basis: { type: 'string', description: 'The quoted line of the template, the page intent, a section purpose or the L4 the finding rests on.' },
          where: { type: 'string', description: 'A render method, an organism id or a short quote of the page.' },
          fix: { type: 'string', description: 'One sentence.' },
        },
      },
    },
  },
} as const;
