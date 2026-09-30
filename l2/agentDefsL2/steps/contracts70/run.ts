/// <mls fileReference="_102020_/l2/agentDefsL2/steps/contracts70/run.ts" enhancement="_blank"/>

import { fileExists, readJson, readSourceText, writeJson, writeSourceText, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { Ns5OntologyAnyEntity } from '/_102035_/l2/solution/types.js';
import { sha256Text } from '/_102020_/l2/helpers/hash.js';
import type { D2RunIdentity } from '/_102020_/l2/helpers/defsInput/contracts.js';
import { readD2Input, readD2InputBundle, assertD2InputSourcesStable } from '/_102020_/l2/helpers/defsInput/io.js';
import { buildD2ContractV2, gateD2ContractV2, renderD2ContractV2, type D2ContractV2Definition } from '/_102020_/l2/agentDefsL2/helpers/d2ContractV2.js';
import type { D2DerivedPageRequests, D2PageRequestsCategory, D2PageRequestsInput, D2PageRequestsSibling } from '/_102020_/l2/agentDefsL2/helpers/d2PageRequests.js';
import { parseD2SharedV2 } from '/_102020_/l2/agentDefsL2/helpers/d2SharedV2.js';
import { parseD2Page11Definition, type D2Page11Definition } from '/_102020_/l2/agentDefsL2/helpers/page11.js';
import { buildD2Page11Needs, type D2Page11Needs } from '/_102020_/l2/agentDefsL2/helpers/page11Needs.js';
import {
  buildD2SharedContext, draftFile, page11File, readD2SharedReceipt, sharedInfo, D2_SHARED_VERSION, type D2SharedReceipt,
} from '/_102020_/l2/agentDefsL2/steps/shared60/run.js';

export const D2_CONTRACTS70_VERSION = '2026-09-30-agent-defs-l2-contracts-v2' as const;

export interface D2Contracts70Receipt {
  schemaVersion: typeof D2_CONTRACTS70_VERSION;
  project: number;
  module: string;
  pageId: string;
  sharedHash: string;
  derivedHash: string;
  sourceHash: string;
}

export interface D2Contracts70Page {
  identity: D2RunIdentity;
  pageId: string;
  derived: D2DerivedPageRequests;
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

export async function derivedHashOf(derived: D2DerivedPageRequests): Promise<string> {
  return sha256Text(JSON.stringify(derived));
}

export function contractSourceFor(page: D2Contracts70Page): string {
  assertSharedApproved(page);
  let sharedRequests: Record<string, unknown>;
  try {
    const parsed = parseD2SharedV2(page.sharedSource);
    if (parsed.location.module !== page.identity.module || parsed.location.pageId !== page.pageId) throw new Error('D2_CONTRACTS_SHARED_PAGE');
    sharedRequests = parsed.definition.requests;
    const derivedIds = page.derived.requests.map(item => item.id).sort();
    const sharedIds = Object.keys(sharedRequests).sort();
    if (derivedIds.join('\n') !== sharedIds.join('\n')) throw new Error('D2_CONTRACTS_SHARED_REQUESTS');
    if (!derivedIds.length) return renderEmptyD2Contract(page.identity, page.pageId);
    const definition = buildD2ContractV2(page.derived, parsed.definition, page.entities);
    if (!definition.routes.length) throw new Error('D2_CONTRACTS_EMPTY');
    const issues = gateD2ContractV2(definition, page.derived, parsed.definition, page.entities);
    if (issues.length) throw new Error(`D2_CONTRACTS_GATE: ${issues.map(issue => `${issue.code}: ${issue.message}`).join(' | ')}`);
    return renderD2ContractV2({ project: page.identity.project, module: page.identity.module, pageId: page.pageId }, definition);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith('D2_CONTRACTS_')) throw error;
    throw new Error(`D2_CONTRACTS_SHARED_SOURCE: ${error instanceof Error ? error.message : String(error)}`);
  }
}

function assertSharedApproved(page: D2Contracts70Page): void {
  const receipt = page.sharedReceipt;
  if (!receipt) throw new Error('D2_CONTRACTS_SHARED_RECEIPT_MISSING');
  if (receipt.schemaVersion !== D2_SHARED_VERSION || receipt.project !== page.identity.project || receipt.module !== page.identity.module || receipt.pageId !== page.pageId) {
    throw new Error('D2_CONTRACTS_SHARED_RECEIPT');
  }
}

export async function approveD2Contracts70(page: D2Contracts70Page, existing: D2Contracts70Existing, writer: D2Contracts70Writer = productionWriter): Promise<{ receipt: D2Contracts70Receipt; wrote: boolean }> {
  const sharedHash = await sha256Text(page.sharedSource);
  if (page.sharedReceipt && page.sharedReceipt.sourceHash !== sharedHash) throw new Error('D2_CONTRACTS_SHARED_HASH');
  const source = contractSourceFor(page);
  const receipt: D2Contracts70Receipt = {
    schemaVersion: D2_CONTRACTS70_VERSION,
    project: page.identity.project,
    module: page.identity.module,
    pageId: page.pageId,
    sharedHash,
    derivedHash: await derivedHashOf(page.derived),
    sourceHash: await sha256Text(source),
  };
  const same = existing.receipt
    && existing.receipt.schemaVersion === receipt.schemaVersion
    && existing.receipt.sharedHash === receipt.sharedHash
    && existing.receipt.derivedHash === receipt.derivedHash
    && existing.receipt.sourceHash === receipt.sourceHash
    && existing.source !== null
    && await sha256Text(existing.source) === receipt.sourceHash;
  if (same) return { receipt, wrote: false };
  await writer.writeSource(contractInfo(page.identity, page.pageId), source);
  await writer.writeJson(contractReceiptInfo(page.identity, page.pageId), receipt);
  return { receipt, wrote: true };
}

export interface D2Contracts70Port {
  pageIds(): Promise<string[]>;
  load(pageId: string): Promise<D2Contracts70Page>;
  readExisting(pageId: string): Promise<D2Contracts70Existing>;
  writer: D2Contracts70Writer;
}

export async function executeD2Contracts70(port: D2Contracts70Port): Promise<{ wrote: string[]; reused: string[] }> {
  const wrote: string[] = [];
  const reused: string[] = [];
  for (const pageId of await port.pageIds()) {
    const page = await port.load(pageId);
    const existing = await port.readExisting(pageId);
    const result = await approveD2Contracts70(page, existing, port.writer);
    (result.wrote ? wrote : reused).push(pageId);
  }
  return { wrote, reused };
}

export async function loadD2ContractsPage(identity: D2RunIdentity, pageId: string): Promise<D2Contracts70Page> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_CONTRACTS_INPUT_MISSING');
  const bundle = await readD2InputBundle(identity);
  await assertD2InputSourcesStable(bundle);
  if (!snapshot.selection.writePageIds.includes(pageId)) throw new Error(`D2_CONTRACTS_PAGE_NOT_SELECTED: ${pageId}`);
  const catalog = await readJson<{ categories: D2PageRequestsCategory[] }>({ project: 102020, level: 4, folder: 'collabux/templates', shortName: 'categoryList', extension: '.json' });
  if (!catalog?.categories) throw new Error('D2_CONTRACTS_CATEGORIES_MISSING');
  const ids = [...snapshot.selection.writePageIds].sort();
  const siblings: D2PageRequestsSibling[] = [];
  let own: { desktop: D2Page11Definition; mobile: D2Page11Definition; draftDesktop: D2Page11Needs; draftMobile: D2Page11Needs; desktopText: string; mobileText: string; draftDesktopText: string; draftMobileText: string } | null = null;
  for (const id of ids) {
    const devices = ['desktop', 'mobile'] as const;
    const texts = await Promise.all(devices.map(device => readSourceText(page11File(identity, id, device))));
    const drafts = await Promise.all(devices.map(device => readJson<unknown>(draftFile(identity, id, device))));
    if (texts.some(text => !text) || drafts.some(draft => !draft)) throw new Error(`D2_CONTRACTS_PAGE11_MISSING: ${id}`);
    const row: D2PageRequestsSibling = {
      pageId: id,
      desktop: parseD2Page11Definition(texts[0]).definition,
      mobile: parseD2Page11Definition(texts[1]).definition,
      draftDesktop: buildD2Page11Needs(drafts[0]),
      draftMobile: buildD2Page11Needs(drafts[1]),
    };
    siblings.push(row);
    if (id === pageId) own = {
      desktop: parseD2Page11Definition(texts[0]).definition, mobile: parseD2Page11Definition(texts[1]).definition,
      draftDesktop: buildD2Page11Needs(drafts[0]), draftMobile: buildD2Page11Needs(drafts[1]),
      desktopText: texts[0], mobileText: texts[1], draftDesktopText: JSON.stringify(drafts[0]), draftMobileText: JSON.stringify(drafts[1]),
    };
  }
  if (!own) throw new Error(`D2_CONTRACTS_PAGE11_MISSING: ${pageId}`);
  const needs = bundle.artifacts.needs as { pages: D2PageRequestsInput['needsPages'] };
  const input: D2PageRequestsInput = {
    module: identity.module, pageId,
    desktop: own.desktop, mobile: own.mobile,
    draftDesktop: own.draftDesktop, draftMobile: own.draftMobile,
    siblings, needsPages: needs.pages,
    menu: bundle.artifacts.menu as D2PageRequestsInput['menu'],
    entities: bundle.artifacts.entities as D2PageRequestsInput['entities'],
    access: bundle.artifacts.access as D2PageRequestsInput['access'],
    rules: bundle.artifacts.rules as D2PageRequestsInput['rules'],
    categories: catalog.categories,
  };
  const context = buildD2SharedContext(input, {
    identity, inputHash: snapshot.snapshotHash,
    page11: { desktop: own.desktop, mobile: own.mobile },
    page11Text: { desktop: own.desktopText, mobile: own.mobileText },
    drafts: { desktop: own.draftDesktop, mobile: own.draftMobile },
    draftText: { desktop: own.draftDesktopText, mobile: own.draftMobileText },
    skill: '', prompt: '',
  });
  const sharedSource = await readSourceText(sharedInfo(identity, pageId));
  if (!sharedSource) throw new Error('D2_CONTRACTS_SHARED_RECEIPT_MISSING');
  return {
    identity, pageId, derived: context.derived, entities: input.entities, sharedSource,
    sharedReceipt: await readD2SharedReceipt(identity, pageId),
  };
}

export async function productionContractsPort(identity: D2RunIdentity): Promise<D2Contracts70Port> {
  const snapshot = await readD2Input(identity);
  if (!snapshot) throw new Error('D2_CONTRACTS_INPUT_MISSING');
  const ids = [...snapshot.selection.writePageIds].sort();
  return {
    pageIds: async () => ids,
    load: pageId => loadD2ContractsPage(identity, pageId),
    readExisting: async pageId => ({
      source: fileExists(contractInfo(identity, pageId)) ? await readSourceText(contractInfo(identity, pageId)) || null : null,
      receipt: await readJson<D2Contracts70Receipt>(contractReceiptInfo(identity, pageId)),
    }),
    writer: productionWriter,
  };
}

export function builtDefinition(page: D2Contracts70Page): D2ContractV2Definition {
  const parsed = parseD2SharedV2(page.sharedSource);
  return buildD2ContractV2(page.derived, parsed.definition, page.entities);
}
