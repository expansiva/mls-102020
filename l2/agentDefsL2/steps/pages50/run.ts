/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.ts" enhancement="_blank"/>

import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import type { D2InputSnapshot } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { readD2Input } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { readD2SharedManifest, readD2SharedSource } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { d2PageSemanticRefs, type D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import type { D2MoleculeCatalogPort, D2MoleculePreparedContext, D2MoleculeReceipt } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { assertD2MoleculeCandidates, buildD2MoleculeReceipt, prepareD2MoleculeContext, resolveD2MoleculeSelection } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import type { D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { D2_PAGE_TECHNICAL_SKILL, d2PageUnitContextHash, resolveD2PageCategory } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { D2_PAGES_VERSION, type D2PageDevice, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { gateD2Pages, normalizeD2PageCoverage } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { selectD2Template, type D2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';
import { d2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.js';
import type { D2PageTemplateSelection, D2PageCoverageItem } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { assertD2RenderedPage, renderD2Page } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { d2PageDisplayPath, readD2PageSource, readD2PagesResult, writeD2PageSource, writeD2PagesManifest, writeD2PagesResult } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';

export interface D2PagesUnitResult extends D2RunIdentity, D2PagesContextReceipt { schemaVersion: typeof D2_PAGES_VERSION; pageId: string; status: 'approved'; snapshotHash: string; sharedHash: string; contextHash: string; catalogHash: string; skillHashes: Record<string, string>; categoryRef: string; categoryReason: string; categoryEvidenceRefs: string[]; organismIds: string[]; moleculeReasons: Record<D2PageDevice, string>; moleculeReceipt: D2MoleculeReceipt; sourceHashes: Record<D2PageDevice, string>; artifactPaths: Record<D2PageDevice, string>; pipelineItemIds: Record<D2PageDevice, string>; attempts: number; }
export interface D2PagesManifest extends D2RunIdentity { schemaVersion: typeof D2_PAGES_VERSION; status: 'approved'; snapshotHash: string; units: D2PagesUnitResult[]; }

export async function getD2PagesContext(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string): Promise<{ page: D2InputSnapshot['selection']['pages'][number]; shared: D2SharedDefinition }> {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId && snapshot.selection.writePageIds.includes(item.pageId));
  if (!page) throw new Error(`D2_PAGES_PAGE_NOT_SELECTED: ${pageId}`);
  const source = await readD2SharedSource(identity, pageId);
  const match = /export const definition = ([\s\S]*?) as const;/.exec(source);
  if (!match) throw new Error(`D2_PAGES_SHARED_INVALID: ${pageId}`);
  let shared: D2SharedDefinition;
  try { shared = JSON.parse(match[1]) as D2SharedDefinition; } catch { throw new Error(`D2_PAGES_SHARED_INVALID: ${pageId}`); }
  return { page, shared };
}

export interface D2MoleculeRuntime { port: D2MoleculeCatalogPort; prepared: D2MoleculePreparedContext; }

export async function approveD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, judgment: D2PagesJudgment, molecular: D2MoleculeRuntime, pageSkills: D2PageSkillsContext, attempt: number, verifySources: () => Promise<void> = async () => undefined, expectedPreflightHash = molecular.prepared.receipt.contextHash): Promise<D2PagesUnitResult> {
  if (molecular.prepared.receipt.contextHash !== expectedPreflightHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const { page, shared } = await getD2PagesContext(identity, snapshot, pageId);
  const requested = [...new Set(judgment.presentations.flatMap(item => item.descriptions.flatMap(description => description.moleculeRecommendations.map(recommendation => recommendation.groupId))))];
  const molecules = await resolveD2MoleculeSelection(molecular.port, molecular.prepared.inventory, requested, molecular.prepared.candidates);
  const candidateContext = molecular.prepared.candidates;
  assertD2MoleculeCandidates(molecules, judgment.presentations.flatMap(item => item.descriptions.flatMap(description => description.moleculeRecommendations)));
  const groupSkills = new Map(molecules.groups.map(group => [group.groupId, [group.indexPipelineReference, group.usageContractPipelineReference]]));
  const groupCandidates = new Map(candidateContext.groups.map(group => [group.groupId, new Set(group.scenarios.flatMap(item => item.candidates))]));
  const templateSelection = await pageTemplate(shared, judgment.category.categoryRef);
  const provenance = new Map(molecules.groups.map(group => [group.groupId, {
    indexReference: group.indexPipelineReference, indexVia: group.indexVia, indexSha256: molecules.metrics.reads.find(read => read.role === 'group-index' && read.reference === group.indexReference)!.sha256,
    usageContractReference: group.usageContractPipelineReference, usageContractVia: group.usageContractVia, usageContractSha256: molecules.metrics.reads.find(read => read.role === 'usage-contract' && read.reference === group.usageContractReference)!.sha256,
  }]));
  const normalizedJudgment = normalizeD2PageCoverage(judgment, shared);
  const rendered = gateD2Pages(identity.module, page, shared, normalizedJudgment, groupSkills, pageSkills, groupCandidates, templateSelection, provenance);
  for (const item of rendered) item.pipeline[0].dependsFiles.push(...d2PageSemanticRefs(snapshot, pageId));
  const sources = Object.fromEntries(rendered.map(item => { const source = renderD2Page(item, identity.project); assertD2RenderedPage(source); return [item.device, source]; })) as Record<D2PageDevice, string>;
  const category = resolveD2PageCategory(pageSkills, judgment.category.categoryRef);
  const skillHashes = { [D2_PAGE_TECHNICAL_SKILL]: pageSkills.skillHashes[D2_PAGE_TECHNICAL_SKILL], [category.skillReference]: pageSkills.skillHashes[category.skillReference] };
  const organismIds = rendered[0].descriptions.map(item => item.organismId);
  const moleculeReasons = Object.fromEntries(normalizedJudgment.presentations.map(item => [item.device, item.moleculeReason])) as Record<D2PageDevice, string>;
  const moleculeReceipt = await buildD2MoleculeReceipt(molecular.prepared.inventory, molecular.prepared.candidates, molecules);
  const verifyContext = async () => {
    await verifySources();
    const current = await prepareD2MoleculeContext(molecular.port);
    if (current.receipt.contextHash !== expectedPreflightHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
    const currentSelection = await resolveD2MoleculeSelection(molecular.port, current.inventory, moleculeReceipt.selectedGroupIds, current.candidates);
    if ((await buildD2MoleculeReceipt(current.inventory, current.candidates, currentSelection)).contextHash !== moleculeReceipt.contextHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
  };
  return persistD2PagesUnit(identity, snapshot, pageId, sources, rendered.map(item => item.pipeline[0].id) as [string, string], attempt, { contextHash: await pageContextHash(pageSkills, templateSelection), catalogHash: pageSkills.catalogHash, skillHashes, categoryRef: judgment.category.categoryRef, categoryReason: judgment.category.reason, categoryEvidenceRefs: judgment.category.evidenceRefs, organismIds, moleculeReasons, moleculeReceipt, templateSelection, coverage: { desktop: rendered[0].coverage, mobile: rendered[1].coverage } }, dependency.sourceHash, async () => { await verifyContext(); if ((await pageTemplate(shared, judgment.category.categoryRef)).digest !== templateSelection.digest) throw new Error('D2_PAGES_TEMPLATE_CHANGED'); });
}

export interface D2PagesContextReceipt { contextHash: string; catalogHash: string; skillHashes: Record<string, string>; categoryRef: string; categoryReason: string; categoryEvidenceRefs: string[]; organismIds: string[]; moleculeReasons: Record<D2PageDevice, string>; moleculeReceipt: D2MoleculeReceipt; templateSelection: D2PageTemplateSelection; coverage: Record<D2PageDevice, D2PageCoverageItem[]>; }

export async function persistD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, sources: Record<D2PageDevice, string>, itemIds: [string, string], attempt: number, receipt: D2PagesContextReceipt, expectedSharedHash?: string, verifySources: () => Promise<void> = async () => undefined): Promise<D2PagesUnitResult> {
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  if (expectedSharedHash && dependency.sourceHash !== expectedSharedHash) throw new Error(`D2_PAGES_SHARED_CHANGED: ${pageId}`);
  const prior = await readD2PagesResult(identity, pageId);
  if (prior?.schemaVersion === D2_PAGES_VERSION && prior.status === 'approved' && prior.snapshotHash === snapshot.snapshotHash && prior.sharedHash === dependency.sourceHash && prior.contextHash === receipt.contextHash && prior.moleculeReceipt?.contextHash === receipt.moleculeReceipt.contextHash && prior.sourceHashes.desktop === await sha256Text(sources.desktop) && prior.sourceHashes.mobile === await sha256Text(sources.mobile)) {
    for (const device of ['desktop', 'mobile'] as const) {
      if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== prior.sourceHashes[device]) throw new Error(`D2_PAGES_APPROVED_SOURCE_CHANGED: ${pageId}/${device}`);
    }
    return prior;
  }
  const sourceHashes = { desktop: await sha256Text(sources.desktop), mobile: await sha256Text(sources.mobile) };
  for (const device of ['desktop', 'mobile'] as const) {
    await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) await writeD2PageSource(identity, pageId, device, sources[device]);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) throw new Error(`D2_PAGES_WRITE_HASH_MISMATCH: ${pageId}/${device}`);
  }
  await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const result: D2PagesUnitResult = { schemaVersion: D2_PAGES_VERSION, ...identity, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, sharedHash: dependency.sourceHash, ...receipt, sourceHashes, artifactPaths: { desktop: d2PageDisplayPath(identity, pageId, 'desktop'), mobile: d2PageDisplayPath(identity, pageId, 'mobile') }, pipelineItemIds: { desktop: itemIds[0], mobile: itemIds[1] }, attempts: attempt };
  await writeD2PagesResult(identity, result); return result;
}

export async function findReusableD2PagesUnits(identity: D2RunIdentity, snapshot: D2InputSnapshot, verifySources: () => Promise<void> = async () => undefined, expectedContext?: string | D2PageSkillsContext, molecular?: D2MoleculeRuntime): Promise<D2PagesUnitResult[]> {
  const units: D2PagesUnitResult[] = [];
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources();
  for (const pageId of [...snapshot.selection.writePageIds].sort()) {
    const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    const unit = await readD2PagesResult(identity, pageId);
    if (!unit || unit.schemaVersion !== D2_PAGES_VERSION || unit.status !== 'approved' || unit.snapshotHash !== snapshot.snapshotHash || unit.sharedHash !== dependency.sourceHash) continue;
    let expectedContextHash = typeof expectedContext === 'string' ? expectedContext : undefined;
    if (expectedContext && typeof expectedContext !== 'string') {
      try { const { shared } = await getD2PagesContext(identity, snapshot, pageId); expectedContextHash = await pageContextHash(expectedContext, await pageTemplate(shared, unit.categoryRef)); } catch { continue; }
    }
    if (expectedContextHash !== undefined && unit.contextHash !== expectedContextHash) continue;
    if (!unit.moleculeReceipt || !molecular) continue;
    try {
      if (unit.moleculeReceipt.consumerProject !== identity.project) continue;
      if (molecular.prepared.receipt.contextHash !== (await buildD2MoleculeReceipt(molecular.prepared.inventory, molecular.prepared.candidates)).contextHash) continue;
      const selected = await resolveD2MoleculeSelection(molecular.port, molecular.prepared.inventory, unit.moleculeReceipt.selectedGroupIds, molecular.prepared.candidates);
      if ((await buildD2MoleculeReceipt(molecular.prepared.inventory, molecular.prepared.candidates, selected)).contextHash !== unit.moleculeReceipt.contextHash) continue;
    } catch { continue; }
    let valid = true;
    for (const device of ['desktop', 'mobile'] as const) {
      const source = await readD2PageSource(identity, pageId, device);
      try { assertD2RenderedPage(source); } catch { valid = false; }
      if (await sha256Text(source) !== unit.sourceHashes?.[device]) valid = false;
    }
    if (!valid) continue;
    units.push(unit);
  }
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources(); await assertSnapshot(identity, snapshot.snapshotHash);
  return units;
}

export async function finalizeD2PagesBarrier(identity: D2RunIdentity, snapshot: D2InputSnapshot, verifySources: () => Promise<void> = async () => undefined, expectedContext?: string | D2PageSkillsContext, molecular?: D2MoleculeRuntime): Promise<D2PagesManifest | null> {
  const units = await findReusableD2PagesUnits(identity, snapshot, verifySources, expectedContext, molecular);
  if (units.length !== snapshot.selection.writePageIds.length) return null;
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources(); await assertSnapshot(identity, snapshot.snapshotHash);
  for (const unit of units) {
    const dependency = await assertD2PagesDependencies(identity, snapshot, unit.pageId, verifySources);
    if (dependency.sourceHash !== unit.sharedHash) return null;
    for (const device of ['desktop', 'mobile'] as const) if (await sha256Text(await readD2PageSource(identity, unit.pageId, device)) !== unit.sourceHashes[device]) return null;
  }
  const manifest: D2PagesManifest = { schemaVersion: D2_PAGES_VERSION, ...identity, status: 'approved', snapshotHash: snapshot.snapshotHash, units };
  await writeD2PagesManifest(identity, manifest); return manifest;
}

export async function assertD2PagesDependencies(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, verifySources: () => Promise<void> = async () => undefined) {
  await assertSnapshot(identity, snapshot.snapshotHash); await verifySources(); await assertSnapshot(identity, snapshot.snapshotHash);
  const manifest = await readD2SharedManifest(identity); const unit = manifest?.units.find(item => item.pageId === pageId);
  if (!manifest || manifest.status !== 'approved' || manifest.snapshotHash !== snapshot.snapshotHash || !unit) throw new Error(`D2_PAGES_SHARED_BARRIER_MISSING: ${pageId}`);
  const sourceHash = await sha256Text(await readD2SharedSource(identity, pageId));
  if (sourceHash !== unit.sourceHash) throw new Error(`D2_PAGES_SHARED_HASH_MISMATCH: ${pageId}`);
  return { unit, sourceHash };
}
async function assertSnapshot(identity: D2RunIdentity, hash: string): Promise<void> { if ((await readD2Input(identity))?.snapshotHash !== hash) throw new Error('D2_PAGES_STALE_RUN'); }

export async function pageTemplate(shared: D2SharedDefinition, categoryRef: string, port: D2TemplatePort = d2TemplatePort): Promise<D2PageTemplateSelection> {
  if (categoryRef === 'bespoke') return { categoryRef, targetPage: 'page11', experiencePage: null, experienceId: null, styleId: null, layoutId: null, reason: 'No published category fits the approved capabilities.', requirementsMet: [], sources: [], digest: await sha256Text('bespoke') };
  const selection = await selectD2Template(port, { categoryRef, targetPage: 'page11', orientationPage: 'page21', capabilities: { dataDeclared: shared.dataBindings.some(binding => binding.kind === 'query'), measureDeclared: false, sectionSaveCommandDeclared: false } });
  const { context: _context, sources, ...receipt } = selection;
  return { ...receipt, targetPage: 'page11', sources: sources.map(({ role, reference, sha256 }) => ({ role, reference, sha256 })) };
}
async function pageContextHash(skills: D2PageSkillsContext, template: D2PageTemplateSelection): Promise<string> { return sha256Text(JSON.stringify({ skills: await d2PageUnitContextHash(skills, template.categoryRef), template: template.digest })); }
