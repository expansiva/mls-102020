/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/run.ts" enhancement="_blank"/>

import { fileExists, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { parseD2ContractV2, renderD2ContractV2 } from '/_102020_/l2/helpers/contractV2/render.js';
import { d2BffAccess, type D2BffDesign, type D2Grant, type D2Menu, type D2NeedPage } from '/_102020_/l2/agentDefsL2/helpers/d2Bff.js';
import { buildD2ContractFromBff } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import { parseD2SharedV2 } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { readApprovedD2Bff, readD2BffRefusal } from '/_102020_/l2/agentDefsL2/steps/bff55/run.js';
import { readD2SharedReceipt, readD2SharedRefusal, sharedInfo, D2_SHARED_VERSION, type D2SharedReceipt } from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

export const D2_CONTRACTS70_VERSION = '2026-10-04-agent-defs-l2-contracts-v3' as const;
export const D2_CONTRACTS70_REFUSAL_VERSION = '2026-10-04-agent-defs-l2-contracts-refusal' as const;

export interface D2Contracts70Receipt {
  schemaVersion: typeof D2_CONTRACTS70_VERSION;
  project: number;
  module: string;
  pageId: string;
  sharedHash: string;
  designHash: string;
  sourceHash: string;
}

export interface D2Contracts70Page {
  identity: D2RunIdentity;
  pageId: string;
  userLanguage: string;
  design: D2BffDesign;
  access: { actors: string[]; grants: string[]; scope: string };
  entities: Record<string, Ns5OntologyAnyEntity>;
  sharedSource: string;
  sharedReceipt: D2SharedReceipt | null;
}

export interface D2Contracts70Existing {
  source: string | null;
  receipt: D2Contracts70Receipt | null;
}

export interface D2Contracts70Writer {
  writeSource(info: Ns5FileInfo, source: string): Promise<void>;
  writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown>;
}

const productionWriter: D2Contracts70Writer = { writeSource: writeSourceText, writeJson };

export function contractInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/web/contracts`, shortName: pageId, extension: '.defs.ts' };
}

export function contractReceiptInfo(identity: D2RunIdentity, pageId: string): Ns5FileInfo {
  return { project: identity.project, level: 2, folder: `${identity.module}/pipeline/agentDefsL2/contracts70`, shortName: pageId, extension: '.json' };
}

export function renderEmptyD2Contract(identity: D2RunIdentity, pageId: string): string {
  return `/// <mls fileReference="_${identity.project}_/l2/${identity.module}/web/contracts/${pageId}.defs.ts" enhancement="_blank"/>\n\nexport {};\n`;
}

/** E: the contract of the approved BFF, in today's form, with the JSDoc of A; the parser must read back every route. */
export async function contractSourceFor(page: D2Contracts70Page): Promise<string> {
  const receipt = page.sharedReceipt;
  if (!receipt) throw new Error('D2_CONTRACTS_SHARED_RECEIPT_MISSING');
  if (receipt.schemaVersion !== D2_SHARED_VERSION || receipt.project !== page.identity.project || receipt.module !== page.identity.module || receipt.pageId !== page.pageId) throw new Error('D2_CONTRACTS_SHARED_RECEIPT');
  if (receipt.designHash !== await sha256Text(JSON.stringify(page.design))) throw new Error(`D2_CONTRACTS_BFF_CHANGED: the shared of ${page.pageId} was approved over another BFF design; shared60 runs again.`);
  let requestIds: string[];
  try {
    const parsed = parseD2SharedV2(page.sharedSource);
    if (parsed.location.module !== page.identity.module || parsed.location.pageId !== page.pageId) throw new Error('D2_CONTRACTS_SHARED_PAGE');
    requestIds = Object.keys(parsed.definition.requests).sort();
  } catch (error) {
    throw new Error(`D2_CONTRACTS_SHARED_SOURCE: ${error instanceof Error ? error.message : String(error)}`);
  }
  const endpointIds = page.design.endpoints.map(item => item.id).sort();
  if (requestIds.join('\n') !== endpointIds.join('\n')) throw new Error('D2_CONTRACTS_SHARED_REQUESTS: the shared requests are not the endpoints of the approved BFF.');
  if (!endpointIds.length) return renderEmptyD2Contract(page.identity, page.pageId);
  const location = { project: page.identity.project, module: page.identity.module, pageId: page.pageId };
  const definition = buildD2ContractFromBff({ module: page.identity.module, pageId: page.pageId, design: page.design, access: page.access, entities: page.entities, userLanguage: page.userLanguage });
  const source = renderD2ContractV2(location, definition);
  // The JSDoc must not change what the parser reads. access is left out: its actors regex is greedy on any contract.
  const readable = (routes: typeof definition.routes) => JSON.stringify(routes.map(({ access: _access, ...route }) => route));
  if (readable(parseD2ContractV2(source).routes) !== readable(definition.routes)) throw new Error('D2_CONTRACTS_PARSE: the contract parser does not read back the rendered routes.');
  return source;
}

export async function approveD2Contracts70(page: D2Contracts70Page, existing: D2Contracts70Existing, writer: D2Contracts70Writer = productionWriter): Promise<{ receipt: D2Contracts70Receipt; wrote: boolean }> {
  const sharedHash = await sha256Text(page.sharedSource);
  if (page.sharedReceipt && page.sharedReceipt.sourceHash !== sharedHash) throw new Error('D2_CONTRACTS_SHARED_HASH');
  const source = await contractSourceFor(page);
  const receipt: D2Contracts70Receipt = {
    schemaVersion: D2_CONTRACTS70_VERSION, project: page.identity.project, module: page.identity.module, pageId: page.pageId,
    sharedHash, designHash: await sha256Text(JSON.stringify(page.design)), sourceHash: await sha256Text(source),
  };
  const same = existing.receipt && existing.source !== null && JSON.stringify(existing.receipt) === JSON.stringify(receipt)
    && await sha256Text(existing.source) === receipt.sourceHash;
  if (same) return { receipt, wrote: false };
  await writer.writeSource(contractInfo(page.identity, page.pageId), source);
  await writer.writeJson(contractReceiptInfo(page.identity, page.pageId), receipt);
  return { receipt, wrote: true };
}

export interface D2Contracts70Port {
  pageIds(): Promise<string[]>;
  /** The refusal an earlier stage recorded for the page, which then has no contract to render (d2_76). */
  upstreamRefusal?(pageId: string): Promise<string | null>;
  load(pageId: string): Promise<D2Contracts70Page>;
  readExisting(pageId: string): Promise<D2Contracts70Existing>;
  writer: D2Contracts70Writer;
}

/** Every page goes alone (d2_76): refused upstream is skipped, refused here is recorded, the others are rendered. */
export async function executeD2Contracts70(port: D2Contracts70Port, identity?: D2RunIdentity): Promise<{ wrote: string[]; reused: string[]; skipped: string[]; refused: Array<{ pageId: string; diagnostic: string }> }> {
  const wrote: string[] = [];
  const reused: string[] = [];
  const skipped: string[] = [];
  const refused: Array<{ pageId: string; diagnostic: string }> = [];
  for (const pageId of await port.pageIds()) {
    if (await port.upstreamRefusal?.(pageId)) { skipped.push(pageId); continue; }
    try {
      const result = await approveD2Contracts70(await port.load(pageId), await port.readExisting(pageId), port.writer);
      (result.wrote ? wrote : reused).push(pageId);
    } catch (error) {
      const diagnostic = error instanceof Error ? error.message : String(error);
      refused.push({ pageId, diagnostic });
      if (identity) await port.writer.writeJson(contractReceiptInfo(identity, pageId), { schemaVersion: D2_CONTRACTS70_REFUSAL_VERSION, ...identity, pageId, diagnostic });
    }
  }
  return { wrote, reused, skipped, refused };
}

export async function readD2ContractsRefusal(identity: D2RunIdentity, pageId: string): Promise<string | null> {
  const value = await readJson<{ schemaVersion?: string; diagnostic?: string }>(contractReceiptInfo(identity, pageId));
  return value?.schemaVersion === D2_CONTRACTS70_REFUSAL_VERSION ? value.diagnostic ?? '' : null;
}

export async function loadD2ContractsPage(identity: D2RunIdentity, pageId: string): Promise<D2Contracts70Page> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_CONTRACTS_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  if (!snapshot.selection.writePageIds.includes(pageId)) throw new Error(`D2_CONTRACTS_PAGE_NOT_SELECTED: ${pageId}`);
  const design = await readApprovedD2Bff(identity, pageId);
  if (!design) throw new Error(`D2_CONTRACTS_BFF_MISSING: ${pageId}`);
  const need = (bundle.artifacts.needs as { pages: D2NeedPage[] }).pages.find(item => item.pageId === pageId);
  if (!need) throw new Error(`D2_CONTRACTS_NEEDS_PAGE: ${pageId}`);
  const sharedSource = await readSourceText(sharedInfo(identity, pageId));
  if (!sharedSource) throw new Error('D2_CONTRACTS_SHARED_RECEIPT_MISSING');
  const menu = bundle.artifacts.menu as D2Menu;
  return {
    identity, pageId, design,
    userLanguage: menu.userLanguage || (bundle.artifacts.module as { userLanguage?: string } | null)?.userLanguage || 'en',
    access: d2BffAccess(design, need, (bundle.artifacts.access as { grants?: D2Grant[] } | null)?.grants ?? []),
    entities: bundle.artifacts.entities as Record<string, Ns5OntologyAnyEntity>,
    sharedSource, sharedReceipt: await readD2SharedReceipt(identity, pageId),
  };
}

export async function productionContractsPort(identity: D2RunIdentity): Promise<D2Contracts70Port> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_CONTRACTS_INPUT_MISSING');
  const ids = [...snapshot.selection.writePageIds].sort();
  return {
    pageIds: async () => ids,
    upstreamRefusal: async pageId => (await readD2BffRefusal(identity, pageId))?.diagnostic ?? await readD2SharedRefusal(identity, pageId),
    load: pageId => loadD2ContractsPage(identity, pageId),
    readExisting: async pageId => ({
      source: fileExists(contractInfo(identity, pageId)) ? await readSourceText(contractInfo(identity, pageId)) || null : null,
      receipt: await readJson<D2Contracts70Receipt>(contractReceiptInfo(identity, pageId)),
    }),
    writer: productionWriter,
  };
}
