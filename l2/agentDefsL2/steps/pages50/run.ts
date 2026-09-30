/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/run.ts" enhancement="_blank"/>

import type { D2RunIdentity } from '/_102020_/l2/agentDefsL2/helpers/d2Core.js';
import { sha256Text } from '/_102020_/l2/agentDefsL2/steps/contracts30/run.js';
import type { D2InputSnapshot, D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import { readD2Input, readD2InputBundle } from '/_102020_/l2/agentDefsL2/steps/input20/io.js';
import { getD2SharedContext } from '/_102020_/l2/agentDefsL2/steps/shared40/run.js';
import { deriveD2SharedValidationModel } from '/_102020_/l2/agentDefsL2/steps/shared40/definition.js';
import { d2SharedContextPort } from '/_102020_/l2/agentDefsL2/steps/shared40/contextCatalog.js';
import { readD2SharedManifest, readD2SharedSource } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import { d2PageSemanticRefs, type D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_SHARED_VERSION } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { parseD2RenderedSharedDefinitionDocument } from '/_102020_/l2/agentDefsL2/steps/shared40/render.js';
import { readD2SharedResult } from '/_102020_/l2/agentDefsL2/steps/shared40/io.js';
import type { D2SharedDefinitionDocument, D2ResolvableSymbol } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';
import type { D2MoleculeCatalogPort } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import { buildD2MoleculeInventory } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeContext.js';
import type { D2PageSkillsContext } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { D2_PAGE_TECHNICAL_SKILL, d2PageUnitContextHash, resolveD2PageCategory } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryContext.js';
import { D2_PAGES_VERSION, type D2PageDevice, type D2PagesJudgment } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { gateD2Pages, normalizeD2PageCoverage } from '/_102020_/l2/agentDefsL2/steps/pages50/gate.js';
import { selectD2Template, type D2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/templateContext.js';
import { d2TemplatePort } from '/_102020_/l2/agentDefsL2/steps/pages50/categoryCatalog.js';
import type { D2PageTemplateSelection, D2PageCoverageItem } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { d2PageDisplayPath, readD2PageSource, readD2PagesResult, writeD2PageSource, writeD2PagesManifest, writeD2PagesResult } from '/_102020_/l2/agentDefsL2/steps/pages50/io.js';
import { assertD2CompiledSources } from '/_102020_/l2/agentDefsL2/steps/finalize60/compile.js';
import type { D2MoleculeNeed } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import type { D2MoleculePublishedRole, D2MoleculeResearchReceipt, D2MoleculeResearchResult } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { assertD2MoleculeResearchReceiptIntegrity, buildD2MoleculeShortlist, resolveD2MoleculeResearch, d2MoleculeInventoryHash } from '/_102020_/l2/agentDefsL2/steps/pages50/moleculeSelection.js';
import { buildD2Page11DefinitionDocument, renderD2Page11DefinitionDocument, parseD2Page11DefinitionSource } from '/_102020_/l2/agentDefsL2/steps/pages50/page11Definition.js';
import type { D2DefinitionOrganism, D2DefinitionReference } from '/_102020_/l2/agentDefsL2/helpers/d2DefinitionFormat.js';

export interface D2PagesUnitResult extends D2RunIdentity, D2PagesContextReceipt { schemaVersion: typeof D2_PAGES_VERSION; pageId: string; status: 'approved'; snapshotHash: string; sharedHash: string; contextHash: string; catalogHash: string; skillHashes: Record<string, string>; categoryRef: string; categoryReason: string; categoryEvidenceRefs: string[]; organismIds: string[]; sourceHashes: Record<D2PageDevice, string>; artifactPaths: Record<D2PageDevice, string>; unitIds: Record<D2PageDevice, string>; attempts: number; }
export interface D2PagesManifest extends D2RunIdentity { schemaVersion: typeof D2_PAGES_VERSION; status: 'approved'; snapshotHash: string; units: D2PagesUnitResult[]; }

export function buildD2PageMoleculeNeeds(pageId: string, page: D2SelectedPage, shared: D2SharedDefinitionDocument): D2MoleculeNeed[] {
  const occurrences = new Map<string, number>();
  const organisms = page.organisms.map(raw => {
    const item = record(raw); const kind = String(item.kind || '');
    const folded = kind.replace(/[^A-Za-z0-9]+/gu, '-').replace(/^-|-$/gu, '').toLowerCase();
    const count = (occurrences.get(folded) || 0) + 1; occurrences.set(folded, count);
    return { organismId: String(item.organismId || item.id || `organism.${folded}.${count}`), kind, content: String(item.text || item.intent || item.description || ''), capabilityRefs: Array.isArray(item.capabilityRefs) ? item.capabilityRefs : shared.actions.map(action => action.id) };
  });
  return (['desktop', 'mobile'] as const).flatMap(device => organisms.map(item => {
    const actions = shared.actions.filter(action => item.capabilityRefs.includes(action.id));
    return {
      needId: `${pageId}/${device}/${item.organismId}`,
      device,
      organismId: item.organismId,
      intent: `${item.kind}: ${item.content}`,
      inputRefs: [...new Set(actions.flatMap(action => action.inputs.map(input => input.stateRef)))],
      outputRefs: [...new Set(actions.flatMap(action => action.resultStateRef ? [action.resultStateRef] : []))],
      interaction: `${page.label} ${item.content}; capabilities ${item.capabilityRefs.join(', ')}`,
      accessibility: ['keyboard operable', 'visible loading and error feedback'],
      template: null,
    };
  }));
}

export async function getD2PagesContext(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string): Promise<{ page: D2InputSnapshot['selection']['pages'][number]; shared: D2SharedDefinition; definition: D2SharedDefinitionDocument; symbols: D2ResolvableSymbol[] }> {
  const page = snapshot.selection.pages.find(item => item.pageId === pageId && snapshot.selection.writePageIds.includes(item.pageId));
  if (!page) throw new Error(`D2_PAGES_PAGE_NOT_SELECTED: ${pageId}`);
  const [source, unit] = await Promise.all([readD2SharedSource(identity, pageId), readD2SharedResult(identity, pageId)]);
  if (!unit || unit.schemaVersion !== D2_SHARED_VERSION || unit.snapshotHash !== snapshot.snapshotHash || unit.pageId !== pageId || await sha256Text(source) !== unit.sourceHash) throw new Error(`D2_PAGES_SHARED_RECEIPT_INVALID: ${pageId}`);
  let definition: D2SharedDefinitionDocument;
  try { definition = parseD2RenderedSharedDefinitionDocument(source, unit.symbols); } catch { throw new Error(`D2_PAGES_SHARED_INVALID: ${pageId}`); }
  const bundle = await readD2InputBundle(identity);
  const { contract } = getD2SharedContext(identity, snapshot, bundle.artifacts, pageId);
  return { page, shared: deriveD2SharedValidationModel(identity.module, page, contract, definition), definition, symbols: unit.symbols };
}

export interface D2MoleculeRuntime { port: D2MoleculeCatalogPort; }

export async function approveD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, judgment: D2PagesJudgment, research: D2MoleculeResearchResult, molecular: D2MoleculeRuntime, pageSkills: D2PageSkillsContext, attempt: number, verifySources: () => Promise<void> = async () => undefined, expectedPreflightHash?: string, compile: typeof assertD2CompiledSources = assertD2CompiledSources): Promise<D2PagesUnitResult> {
  if (expectedPreflightHash && await d2MoleculeInventoryHash(await buildD2MoleculeInventory(molecular.port)) !== expectedPreflightHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const pageContext = await getD2PagesContext(identity, snapshot, pageId);
  const { page, shared } = pageContext;
  const templateSelection = await pageTemplate(shared, judgment.category.categoryRef);
  const normalizedJudgment = normalizeD2PageCoverage(judgment, shared);
  const rendered = gateD2Pages(identity.module, page, shared, normalizedJudgment, pageSkills, templateSelection, research.roles);
  for (const item of rendered) item.pipeline[0].dependsFiles.push(...d2PageSemanticRefs(snapshot, pageId));
  const built = await Promise.all(rendered.map(item => renderPage11Unit(identity, snapshot, page, shared, pageContext.definition, pageContext.symbols, item, pageSkills, research.roles)));
  const sources = Object.fromEntries(built.map(item => [item.device, item.source])) as Record<D2PageDevice, string>;
  const referenceHashes = await readD2PageReferenceHashes(built.flatMap(item => item.symbols));
  const category = resolveD2PageCategory(pageSkills, judgment.category.categoryRef);
  const skillHashes = { [D2_PAGE_TECHNICAL_SKILL]: pageSkills.skillHashes[D2_PAGE_TECHNICAL_SKILL], [category.skillReference]: pageSkills.skillHashes[category.skillReference] };
  const organismIds = rendered[0].descriptions.map(item => item.organismId);
  const verifyContext = async () => {
    await verifySources();
    if (expectedPreflightHash && await d2MoleculeInventoryHash(await buildD2MoleculeInventory(molecular.port)) !== expectedPreflightHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
    await verifyD2MoleculeResearch(molecular.port, pageId, page, pageContext.definition, research.receipt);
    if (JSON.stringify(await readD2PageReferenceHashes(built.flatMap(item => item.symbols))) !== JSON.stringify(referenceHashes)) throw new Error(`D2_PAGES_REFERENCE_CHANGED: ${pageId}`);
  };
  return persistD2PagesUnit(identity, snapshot, pageId, sources, rendered.map(item => item.pipeline[0].id) as [string, string], attempt, { referenceHashes, contextHash: await pageContextHash(pageSkills, templateSelection), catalogHash: pageSkills.catalogHash, skillHashes, categoryRef: judgment.category.categoryRef, categoryReason: judgment.category.reason, categoryEvidenceRefs: judgment.category.evidenceRefs, organismIds, moleculeResearchReceipt: research.receipt, templateSelection, coverage: { desktop: rendered[0].coverage, mobile: rendered[1].coverage }, symbols: { desktop: built.find(item => item.device === 'desktop')!.symbols, mobile: built.find(item => item.device === 'mobile')!.symbols } }, dependency.sourceHash, async () => { await verifyContext(); if ((await pageTemplate(shared, judgment.category.categoryRef)).digest !== templateSelection.digest) throw new Error('D2_PAGES_TEMPLATE_CHANGED'); }, compile);
}

async function renderPage11Unit(identity: D2RunIdentity, snapshot: D2InputSnapshot, page: D2SelectedPage, shared: D2SharedDefinition, definition: D2SharedDefinitionDocument, inheritedSymbols: readonly D2ResolvableSymbol[], rendered: Awaited<ReturnType<typeof gateD2Pages>>[number], pageSkills: D2PageSkillsContext, selectedRoles: D2MoleculePublishedRole[]): Promise<{ device: D2PageDevice; source: string; symbols: D2ResolvableSymbol[] }> {
  const sharedPath = `l2/${identity.module}/web/shared/${page.pageId}.defs.ts`;
  const contractPath = definition.contractRef.fileRef;
  const category = resolveD2PageCategory(pageSkills, rendered.templateSelection.categoryRef);
  const categoryRef: D2DefinitionReference = { purpose: `page category ${category.categoryRef}`, fileRef: category.skillReference };
  const templateSources = rendered.templateSelection.sources;
  const template = templateSources.find(item => item.role === 'category');
  const style = templateSources.find(item => item.role === 'style-global' || item.role === 'style-category' || item.role === 'layout');
  const sharedSymbols: D2ResolvableSymbol[] = [
    { fileRef: sharedPath, contentIds: definition.contents.map(item => item.id) },
    ...definition.actions.map(item => ({ fileRef: sharedPath, fragment: `actions.${item.id}` })),
    ...definition.states.map(item => ({ fileRef: sharedPath, fragment: `states.${item.id}` })),
    ...definition.contents.map(item => ({ fileRef: sharedPath, fragment: `contents.${item.id}` })),
    ...definition.scenarios.map(item => ({ fileRef: sharedPath, fragment: `scenarios.${item.id}` })),
  ];
  const capabilityRefsByOrganism = new Map<string, D2DefinitionReference[]>();
  const organisms: D2DefinitionOrganism[] = rendered.descriptions.map(description => {
    const source = shared.coverage.find(item => item.organismId === description.organismId);
    if (!source) throw new Error(`D2_PAGE11_SHARED_COVERAGE_MISSING: ${description.organismId}`);
    const refs = description.capabilityRefs.map(capability => capabilityDefinitionRef(capability, shared, definition, sharedPath));
    capabilityRefsByOrganism.set(description.organismId, refs);
    const raw = record(page.organisms[source.sourceIndex]);
    const kind = typeof raw.kind === 'string' ? raw.kind : source.kind;
    const rawContentId = typeof raw.contentRef === 'string' && raw.contentRef.trim()
      ? raw.contentRef.trim()
      : `content.${kind.replace(/[^A-Za-z0-9]+/g, '-').replace(/^-|-$/g, '').toLowerCase()}`;
    const content = definition.contents.find(item => item.id === source.contentRef);
    if (!content) throw new Error(`D2_PAGE11_CONTENT_REF_MISSING: ${description.organismId}/${rawContentId}`);
    const fieldRefs = description.outputFieldRefs.map(value => {
      const separator = value.indexOf('.');
      if (separator <= 0 || separator === value.length - 1) throw new Error(`D2_PAGE11_FIELD_REF_INVALID: ${value}`);
      return { purpose: 'selected output field', fileRef: contractPath, fragment: value };
    });
    const journeyRefs = page.journeyRefs.flatMap(journeyId => {
      const sourceDigest = snapshot.l4?.journeys.find(item => item.journeyId === journeyId)?.source;
      if (!sourceDigest) throw new Error(`D2_PAGE11_JOURNEY_REF_MISSING: ${journeyId}`);
      return [{ purpose: `page journey ${journeyId}`, fileRef: sourceDigest.path }];
    });
    return { id: description.organismId, kind: description.kind, description: description.description, contentRef: content.id, capabilityRefs: refs, journeyRefs, ...(fieldRefs.length ? { fieldRefs } : {}) };
  });
  const references = [
    { purpose: 'project design system', fileRef: 'l2/designSystem.ts' },
    categoryRef,
    { purpose: 'technical page definition guidance', fileRef: D2_PAGE_TECHNICAL_SKILL },
    ...templateSources.map(source => ({ purpose: `selected ${source.role} template source`, fileRef: source.reference })),
    ...d2PageSemanticRefs(snapshot, page.pageId).map(fileRef => ({ purpose: 'page journey, rule, authority or ontology source', fileRef })),
  ];
  const symbols: D2ResolvableSymbol[] = [
    ...inheritedSymbols,
    ...sharedSymbols,
    ...references.map(item => ({ fileRef: item.fileRef })),
    ...organisms.flatMap(item => item.journeyRefs.map(ref => ({ fileRef: ref.fileRef }))),
    ...selectedRoles.filter(role => role.device === rendered.device).flatMap(role => [role.preferred, ...(role.alternative ? [role.alternative] : [])].flatMap(option => [option.indexReference, option.usageContractReference].map(fileRef => ({ fileRef })))),
  ];
  const document = buildD2Page11DefinitionDocument({
    pageId: page.pageId,
    device: rendered.device,
    intent: rendered.pageIntent,
    sharedRef: { purpose: 'shared interaction definition', fileRef: sharedPath },
    references,
    presentation: {
      categoryRef,
      ...(template ? { templateRef: { purpose: 'selected page experience', fileRef: template.reference } } : {}),
      ...(style ? { styleRef: { purpose: 'selected visual style or layout', fileRef: style.reference } } : {}),
      reason: rendered.templateSelection.reason,
      ...(rendered.device === 'mobile' ? { mobileWidthRef: { purpose: 'validate mobile at 390px and inspect 360px and 430px', fileRef: D2_PAGE_TECHNICAL_SKILL } } : {}),
    },
    organisms,
    selectedRoles: selectedRoles.filter(role => role.device === rendered.device),
    symbols: uniqueSymbols(symbols),
    capabilityRefsByOrganism,
  });
  return { device: rendered.device, source: renderD2Page11DefinitionDocument(identity.module, document, uniqueSymbols(symbols), identity.project), symbols: uniqueSymbols(symbols) };
}

function capabilityDefinitionRef(capability: string, legacy: D2SharedDefinition, definition: D2SharedDefinitionDocument, sharedPath: string): D2DefinitionReference {
  if (legacy.actions.some(item => item.actionId === capability) && definition.actions.some(item => item.id === capability)) return { purpose: `shared action ${capability}`, fileRef: sharedPath, fragment: `actions.${capability}` };
  const legacyState = legacy.states.find(item => item.stateKey === capability);
  if (legacyState) {
    const state = definition.states.find(item => item.typeRef?.fragment && item.typeRef.fragment === legacyState.contractRef);
    if (state) return { purpose: legacyState.title || legacyState.name, fileRef: sharedPath, fragment: `states.${state.id}` };
  }
  const scenarioIndex = legacy.scenaries.findIndex(item => item.value === capability);
  const scenario = scenarioIndex >= 0 ? definition.scenarios[scenarioIndex] : undefined;
  if (scenario) return { purpose: `shared scenario ${capability}`, fileRef: sharedPath, fragment: `scenarios.${scenario.id}` };
  throw new Error(`D2_PAGE_CAPABILITY_REF_UNRESOLVED: ${capability}`);
}

export interface D2PagesContextReceipt { referenceHashes: Record<string, string>; contextHash: string; catalogHash: string; skillHashes: Record<string, string>; categoryRef: string; categoryReason: string; categoryEvidenceRefs: string[]; organismIds: string[]; moleculeResearchReceipt: D2MoleculeResearchReceipt; templateSelection: D2PageTemplateSelection; coverage: Record<D2PageDevice, D2PageCoverageItem[]>; symbols: Record<D2PageDevice, D2ResolvableSymbol[]>; }

export async function persistD2PagesUnit(identity: D2RunIdentity, snapshot: D2InputSnapshot, pageId: string, sources: Record<D2PageDevice, string>, itemIds: [string, string], attempt: number, receipt: D2PagesContextReceipt, expectedSharedHash?: string, verifySources: () => Promise<void> = async () => undefined, compile: typeof assertD2CompiledSources = assertD2CompiledSources): Promise<D2PagesUnitResult> {
  const dependency = await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  if (expectedSharedHash && dependency.sourceHash !== expectedSharedHash) throw new Error(`D2_PAGES_SHARED_CHANGED: ${pageId}`);
  for (const device of ['desktop', 'mobile'] as const) parseD2Page11DefinitionSource(sources[device], receipt.symbols[device]);
  const prior = await readD2PagesResult(identity, pageId);
  if (prior?.schemaVersion === D2_PAGES_VERSION && prior.status === 'approved' && prior.snapshotHash === snapshot.snapshotHash && prior.sharedHash === dependency.sourceHash && prior.contextHash === receipt.contextHash && JSON.stringify(prior.referenceHashes) === JSON.stringify(receipt.referenceHashes) && prior.moleculeResearchReceipt?.contextHash === receipt.moleculeResearchReceipt.contextHash && prior.sourceHashes.desktop === await sha256Text(sources.desktop) && prior.sourceHashes.mobile === await sha256Text(sources.mobile)) {
    for (const device of ['desktop', 'mobile'] as const) {
      if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== prior.sourceHashes[device]) throw new Error(`D2_PAGES_APPROVED_SOURCE_CHANGED: ${pageId}/${device}`);
    }
    await compile(identity, (['desktop', 'mobile'] as const).map(device => ({ pageId, kind: device === 'desktop' ? 'desktopPage' : 'mobilePage', path: d2PageDisplayPath(identity, pageId, device), source: sources[device] })));
    await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    return prior;
  }
  const sourceHashes = { desktop: await sha256Text(sources.desktop), mobile: await sha256Text(sources.mobile) };
  for (const device of ['desktop', 'mobile'] as const) {
    await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) await writeD2PageSource(identity, pageId, device, sources[device]);
    if (await sha256Text(await readD2PageSource(identity, pageId, device)) !== sourceHashes[device]) throw new Error(`D2_PAGES_WRITE_HASH_MISMATCH: ${pageId}/${device}`);
  }
  await compile(identity, (['desktop', 'mobile'] as const).map(device => ({ pageId, kind: device === 'desktop' ? 'desktopPage' : 'mobilePage', path: d2PageDisplayPath(identity, pageId, device), source: sources[device] })));
  await assertD2PagesDependencies(identity, snapshot, pageId, verifySources);
  const result: D2PagesUnitResult = { schemaVersion: D2_PAGES_VERSION, ...identity, pageId, status: 'approved', snapshotHash: snapshot.snapshotHash, sharedHash: dependency.sourceHash, ...receipt, sourceHashes, artifactPaths: { desktop: d2PageDisplayPath(identity, pageId, 'desktop'), mobile: d2PageDisplayPath(identity, pageId, 'mobile') }, unitIds: { desktop: itemIds[0], mobile: itemIds[1] }, attempts: attempt };
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
    if (!unit.moleculeResearchReceipt || !molecular) continue;
    try {
      if (!await d2PageReferencesCurrent(unit)) continue;
      const page = snapshot.selection.pages.find(item => item.pageId === pageId);
      if (!page) continue;
      const shared = parseD2RenderedSharedDefinitionDocument(await readD2SharedSource(identity, pageId), dependency.unit.symbols);
      await verifyD2MoleculeResearch(molecular.port, pageId, page, shared, unit.moleculeResearchReceipt);
    } catch { continue; }
    let valid = true;
    for (const device of ['desktop', 'mobile'] as const) {
      const source = await readD2PageSource(identity, pageId, device);
      try { parseD2Page11DefinitionSource(source, unit.symbols[device]); } catch { valid = false; }
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

export async function verifyD2MoleculeResearch(port: D2MoleculeCatalogPort, pageId: string, page: D2SelectedPage, shared: D2SharedDefinitionDocument, receipt: D2MoleculeResearchReceipt): Promise<void> {
  await assertD2MoleculeResearchReceiptIntegrity(receipt);
  const inventory = await buildD2MoleculeInventory(port);
  const shortlist = await buildD2MoleculeShortlist(port, inventory, buildD2PageMoleculeNeeds(pageId, page, shared), receipt.needs.map(item => ({ needId: item.need.needId, groups: item.groups })));
  const current = await resolveD2MoleculeResearch(shortlist, receipt.needs.map(item => ({
    needId: item.need.needId,
    roles: item.roles.map(role => ({ role: role.role, groupId: role.groupId, preferred: { tag: role.preferred.tag, reason: role.preferred.reason }, ...(role.alternative ? { alternative: { tag: role.alternative.tag, reason: role.alternative.reason } } : {}), discardedCandidates: item.candidateDiscards.filter(discard => discard.role === role.role && discard.groupId === role.groupId).map(({ tag, reason }) => ({ tag, reason })) })),
    ...(item.noMatchReason ? { noMatchReason: item.noMatchReason } : {}),
  })));
  if (current.receipt.contextHash !== receipt.contextHash) throw new Error(`D2_MOLECULE_CONTEXT_CHANGED: ${pageId}`);
}
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
function uniqueSymbols(symbols: D2ResolvableSymbol[]): D2ResolvableSymbol[] { return [...new Map(symbols.map(symbol => [`${symbol.fileRef}\0${symbol.fragment || ''}`, symbol])).values()]; }
async function readD2PageReferenceHashes(symbols: readonly D2ResolvableSymbol[]): Promise<Record<string, string>> {
  const hashes: Record<string, string> = {};
  for (const ref of [...new Set(symbols.map(symbol => symbol.fileRef))].sort()) {
    const source = await d2SharedContextPort.readText(ref);
    if (!source) throw new Error(`D2_PAGES_REFERENCE_MISSING: ${ref}`);
    hashes[ref] = await sha256Text(source);
  }
  return hashes;
}
export async function d2PageReferencesCurrent(unit: D2PagesUnitResult): Promise<boolean> {
  return !!unit.referenceHashes && JSON.stringify(await readD2PageReferenceHashes([...unit.symbols.desktop, ...unit.symbols.mobile])) === JSON.stringify(unit.referenceHashes);
}
