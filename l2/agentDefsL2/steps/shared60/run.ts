/// <mls fileReference="_102020_/l2/agentDefsL2/steps/shared60/run.ts" enhancement="_blank"/>

import { readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { parseD2Page11Definition, type D2Page11Definition, type D2Page11Device } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import { d2BffAccess, type D2Grant, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { renderD2SharedV2 } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { d2SharedDeriveIssues, deriveD2Shared, type D2SharedDeriveInput } from '/_102020_/l2/agentDefsL2/helpers/d2SharedDerive.js';
import { readApprovedD2Bff } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';

/** d2_75: the shared is derived by code from the approved BFF; no LLM call. */
export const D2_SHARED_VERSION = '2026-10-04-agent-defs-l2-shared-v4' as const;

export interface D2SharedReceipt {
  schemaVersion: typeof D2_SHARED_VERSION;
  project: number;
  module: string;
  pageId: string;
  inputHash: string;
  page11Hashes: Record<D2Page11Device, string>;
  draftHashes: Record<D2Page11Device, string>;
  designHash: string;
  siblingsHash: string;
  sourceHash: string;
}

export interface D2SharedPage {
  identity: D2RunIdentity;
  inputHash: string;
  page11Text: Record<D2Page11Device, string>;
  draftText: Record<D2Page11Device, string>;
  derive: D2SharedDeriveInput;
}

export interface D2SharedExisting { source: string | null; receipt: D2SharedReceipt | null }
export interface D2SharedWriter { writeSource(info: Ns5FileInfo, source: string): Promise<void>; writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown> }
const productionWriter: D2SharedWriter = { writeSource: writeSourceText, writeJson };

export function sharedInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/shared`, shortName: pageId, extension: '.defs.ts' };
}
export function receiptInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/shared60`, shortName: pageId, extension: '.json' };
}
export function page11File(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/${device}/page11`, shortName: pageId, extension: '.defs.ts' };
}
export function draftFile(identity: D2RunIdentity, pageId: string, device: D2Page11Device): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/page11Needs`, shortName: `${pageId}${device === 'desktop' ? 'Desktop' : 'Mobile'}`, extension: '.json' };
}

export async function readD2SharedReceipt(identity: D2RunIdentity, pageId: string): Promise<D2SharedReceipt | null> {
  const value = await readJson<D2SharedReceipt>(receiptInfo(identity, pageId));
  return value?.schemaVersion === D2_SHARED_VERSION ? value : null;
}

/** The shared source of one page, or the named refusal when the code's own output fails its fact checks (d2_70). */
export function d2SharedSourceFor(page: D2SharedPage): string {
  const definition = deriveD2Shared(page.derive);
  const issues = d2SharedDeriveIssues(page.derive, definition);
  if (issues.length) throw new Error(`D2_SHARED_SELF_CHECK: ${issues.map(issue => `${issue.code}: ${issue.message}`).join(' | ')}`);
  return renderD2SharedV2({ ...page.identity, pageId: page.derive.pageId }, definition);
}

/** Writes only when the derived bytes or their inputs changed; the same inputs reuse with no write. */
export async function approveD2SharedPage(page: D2SharedPage, existing: D2SharedExisting, writer: D2SharedWriter = productionWriter): Promise<{ receipt: D2SharedReceipt; wrote: boolean }> {
  const source = d2SharedSourceFor(page);
  const receipt: D2SharedReceipt = {
    schemaVersion: D2_SHARED_VERSION, ...page.identity, pageId: page.derive.pageId, inputHash: page.inputHash,
    page11Hashes: { desktop: await sha256Text(page.page11Text.desktop), mobile: await sha256Text(page.page11Text.mobile) },
    draftHashes: { desktop: await sha256Text(page.draftText.desktop), mobile: await sha256Text(page.draftText.mobile) },
    designHash: await sha256Text(JSON.stringify(page.derive.design)),
    siblingsHash: await sha256Text(JSON.stringify(page.derive.siblings)),
    sourceHash: await sha256Text(source),
  };
  const same = existing.receipt && existing.source !== null && JSON.stringify(existing.receipt) === JSON.stringify(receipt) && await sha256Text(existing.source) === receipt.sourceHash;
  if (same) return { receipt, wrote: false };
  await writer.writeSource(sharedInfo(page.identity, page.derive.pageId), source);
  await writer.writeJson(receiptInfo(page.identity, page.derive.pageId), receipt);
  return { receipt, wrote: true };
}

export interface D2SharedPort {
  pageIds(): Promise<string[]>;
  load(pageId: string): Promise<D2SharedPage>;
  readExisting(pageId: string): Promise<D2SharedExisting>;
  writer: D2SharedWriter;
}

/** Every page is derived; a refused page does not stop its siblings (d2_64), and the stage names every refusal. */
export async function executeD2Shared(port: D2SharedPort): Promise<{ wrote: string[]; reused: string[]; refused: Array<{ pageId: string; diagnostic: string }> }> {
  const wrote: string[] = [];
  const reused: string[] = [];
  const refused: Array<{ pageId: string; diagnostic: string }> = [];
  for (const pageId of await port.pageIds()) {
    try {
      const result = await approveD2SharedPage(await port.load(pageId), await port.readExisting(pageId), port.writer);
      (result.wrote ? wrote : reused).push(pageId);
    } catch (error) { refused.push({ pageId, diagnostic: error instanceof Error ? error.message : String(error) }); }
  }
  return { wrote, reused, refused };
}

/** The pure part: the page pair, the approved BFF, the access it implies and the siblings that navigate here. */
export function d2SharedPageFrom(input: {
  identity: D2RunIdentity;
  inputHash: string;
  pageId: string;
  page11Text: Record<D2Page11Device, string>;
  drafts: Record<D2Page11Device, unknown>;
  need: D2NeedPage;
  menu: D2Menu;
  grants: readonly D2Grant[];
  entities: Record<string, Ns5OntologyAnyEntity>;
  design: D2SharedDeriveInput['design'];
  siblings: D2SharedDeriveInput['siblings'];
}): D2SharedPage {
  const page11: Record<D2Page11Device, D2Page11Definition> = { desktop: parseD2Page11Definition(input.page11Text.desktop).definition, mobile: parseD2Page11Definition(input.page11Text.mobile).definition };
  const drafts: Record<D2Page11Device, D2Page11Needs> = { desktop: buildD2Page11Needs(input.drafts.desktop), mobile: buildD2Page11Needs(input.drafts.mobile) };
  const access = d2BffAccess(input.design, input.need, input.grants);
  return {
    identity: input.identity, inputHash: input.inputHash, page11Text: input.page11Text,
    draftText: { desktop: JSON.stringify(input.drafts.desktop), mobile: JSON.stringify(input.drafts.mobile) },
    derive: {
      pageId: input.pageId, page11, drafts, need: input.need, menu: input.menu, design: input.design,
      access: { actors: access.actors, grants: access.grants }, entities: input.entities, siblings: input.siblings,
    },
  };
}

async function readPair(identity: D2RunIdentity, pageId: string): Promise<{ texts: Record<D2Page11Device, string>; drafts: Record<D2Page11Device, unknown> }> {
  const devices = ['desktop', 'mobile'] as const;
  const texts = await Promise.all(devices.map(device => readSourceText(page11File(identity, pageId, device))));
  const drafts = await Promise.all(devices.map(device => readJson<unknown>(draftFile(identity, pageId, device))));
  if (texts.some(text => !text) || drafts.some(draft => !draft)) throw new Error(`D2_SHARED_PAGE11_MISSING: ${pageId}`);
  return { texts: { desktop: texts[0], mobile: texts[1] }, drafts: { desktop: drafts[0], mobile: drafts[1] } };
}

export async function productionSharedPort(identity: D2RunIdentity): Promise<D2SharedPort> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_SHARED_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  const ids = [...snapshot.selection.writePageIds].sort();
  const pairs = new Map<string, Awaited<ReturnType<typeof readPair>>>();
  const pairOf = async (pageId: string) => { if (!pairs.has(pageId)) pairs.set(pageId, await readPair(identity, pageId)); return pairs.get(pageId)!; };
  return {
    pageIds: async () => ids,
    load: async pageId => {
      const design = await readApprovedD2Bff(identity, pageId);
      if (!design) throw new Error(`D2_SHARED_BFF_MISSING: ${pageId} has no approved BFF design; bff55 runs first.`);
      const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
      if (!need) throw new Error(`D2_SHARED_NEEDS_PAGE: ${pageId}`);
      const own = await pairOf(pageId);
      const siblings: D2SharedDeriveInput['siblings'] = [];
      for (const id of ids.filter(item => item !== pageId)) {
        const pair = await pairOf(id);
        siblings.push({ pageId: id, page11: parseD2Page11Definition(pair.texts.desktop).definition, drafts: [buildD2Page11Needs(pair.drafts.desktop), buildD2Page11Needs(pair.drafts.mobile)] });
      }
      return d2SharedPageFrom({
        identity, inputHash: snapshot.snapshotHash, pageId, page11Text: own.texts, drafts: own.drafts, need, menu: bundle.artifacts.menu as D2Menu,
        grants: (bundle.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? [], entities: bundle.artifacts.entities as Record<string, Ns5OntologyAnyEntity>, design, siblings,
      });
    },
    readExisting: async pageId => {
      let source: string | null = null;
      try { source = await readSourceText(sharedInfo(identity, pageId)) || null; } catch { source = null; }
      return { source, receipt: await readD2SharedReceipt(identity, pageId) };
    },
    writer: productionWriter,
  };
}
