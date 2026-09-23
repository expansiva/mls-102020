import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const repo20 = path.join(base, 'mls-102020');
const root = path.join(base, 'mls-102047');
const web = path.join(root, 'l2/agendaClinica/web');
const pipelineRoot = path.join(root, 'l2/agendaClinica/pipeline/agentDefsL2');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const fail = message => { throw new Error(message); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => { const full = path.join(folder, entry.name); return entry.isDirectory() ? walk(full) : [full]; });
const pagesOf = tree => tree.flatMap(item => [...(item.kind === 'page' ? [item] : []), ...pagesOf(Array.isArray(item.children) ? item.children : [])]);
const parseExport = (source, name) => { const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source); if (!match) fail(`export ${name} missing`); try { return JSON.parse(match[1]); } catch { fail(`export ${name} invalid JSON`); } };
const refPath = reference => { const match = /^\/?_(\d+)_\/(.+?)(?:\.(?:js|ts|md|json))?$/u.exec(reference); if (!match) return ''; const raw = path.join(base, `mls-${match[1]}`, match[2]); return [raw, `${raw}.ts`, `${raw}.md`, `${raw}.json`, raw.replace(/\.js$/u, '.ts')].find(existsSync) || ''; };
const inventoryOf = files => files.sort().map(file => { const content = readFileSync(file); const stat = statSync(file); return { path: path.relative(root, file).replaceAll(path.sep, '/'), sha256: sha256(content), bytes: stat.size, mtimeMs: stat.mtimeMs }; });
const sameInventory = (left, right, withMtime = false) => JSON.stringify(left.map(item => withMtime ? item : { path: item.path, sha256: item.sha256, bytes: item.bytes })) === JSON.stringify(right.map(item => withMtime ? item : { path: item.path, sha256: item.sha256, bytes: item.bytes }));
const canonicalGroupUnion = groupsByDevice => [...new Set(Object.values(groupsByDevice).flat())].sort();
if (JSON.stringify(canonicalGroupUnion({ desktop: ['groupB', 'groupA'], mobile: ['groupC', 'groupB'] })) !== JSON.stringify(['groupA', 'groupB', 'groupC'])) fail('recommendation union self-check failed');

const menu = JSON.parse(readFileSync(path.join(root, 'l4/agendaClinica/pool/l2/web/menu.json'), 'utf8'));
const pages = pagesOf(menu.tree);
const expectedPages = pages.map(page => page.id).sort();
const files = walk(web);
const defs = files.filter(file => file.endsWith('.defs.ts')).sort();
const unexpectedTs = files.filter(file => file.endsWith('.ts') && !file.endsWith('.defs.ts'));
if (defs.length !== pages.length * 4) fail(`defs mismatch ${defs.length}/${pages.length * 4}`);
if (unexpectedTs.length) fail(`materialized ts forbidden: ${unexpectedTs.join(',')}`);

const sharedManifest = JSON.parse(readFileSync(path.join(pipelineRoot, 'shared.json'), 'utf8'));
const pagesManifest = JSON.parse(readFileSync(path.join(pipelineRoot, 'pages.json'), 'utf8'));
if (sharedManifest.schemaVersion !== '2026-09-23-agent-defs-l2-shared-v2' || sharedManifest.units?.length !== pages.length) fail(`shared receipt is not current: ${sharedManifest.schemaVersion}`);
if (pagesManifest.schemaVersion !== '2026-09-23-agent-defs-l2-pages-v6' || pagesManifest.units?.length !== pages.length) fail(`pages receipt is not current: ${pagesManifest.schemaVersion}`);

const sharedSkillRef = '_102020_/l2/agentDefsL2/skills/genD2SharedTs.ts';
const sharedSkill = readFileSync(refPath(sharedSkillRef), 'utf8');
if (!/extend StateLitElement/u.test(sharedSkill) || !/runBlockingUiAction/u.test(sharedSkill)) fail('shared skill content is incomplete');
const runtimeRefs = ['_102029_/l2/stateLitElement.ts', '_102029_/l2/collabLitElement.ts', '_102029_/l2/bffClient.ts', '_102029_/l2/collabState.ts', '_102029_/l2/interactionRuntime.ts'];
const runtimePatterns = [/export abstract class StateLitElement/u, /export (?:abstract )?class CollabLitElement/u, /export async function execBff/u, /export function setState/u, /export async function runBlockingUiAction/u];
const runtimeContext = runtimeRefs.map((reference, index) => { const file = refPath(reference); const source = file && readFileSync(file, 'utf8'); if (!source || !runtimePatterns[index].test(source)) fail(`runtime context unreadable: ${reference}`); return { reference, sha256: sha256(source), bytes: Buffer.byteLength(source) }; });
const designSystemPath = path.join(root, 'l2/designSystem.ts');
const designSystem = readFileSync(designSystemPath, 'utf8');
const designTokens = [...new Set([...designSystem.matchAll(/"([a-z][a-z0-9-]*)"\s*:\s*"/gu)].map(match => match[1]))].sort();
if (!designTokens.includes('page-bg') || !designTokens.includes('button-primary-text')) fail('project design system has no effective canonical tokens');
const moleculeGroups = new Map();
for (const file of walk(path.join(base, 'mls-102040/l2/molecules')).filter(file => file.endsWith('/index.defs.ts'))) {
  const source = readFileSync(file, 'utf8'); const groupId = /export const group = ['"]([^'"]+)['"]/u.exec(source)?.[1]; const usage = /export const usageContract = ['"]([^'"]+)['"]/u.exec(source)?.[1];
  if (groupId) moleculeGroups.set(groupId, { indexRef: `_102040_/${path.relative(path.join(base, 'mls-102040'), file).replaceAll(path.sep, '/')}`, usageRef: usage ? `${usage.replace(/^\//u, '')}.ts` : '', tags: new Set([...source.matchAll(/tag:\s*['"]([^'"]+)['"]/gu)].map(match => match[1])) });
}
const backend = JSON.parse(readFileSync(path.join(root, 'l4/agendaClinica/pool/l2/web/backend.json'), 'utf8'));
const backendRoutes = [...new Set(backend.endpoints.map(item => item.route))].sort();
const contractRoutes = defs.filter(file => file.includes('/web/contracts/')).flatMap(file => [...readFileSync(file, 'utf8').matchAll(/export const \w+Route = ["']([^"']+)["'] as const;/gu)].map(match => match[1])).sort();
if (JSON.stringify(contractRoutes) !== JSON.stringify(backendRoutes)) fail(`contract routes mismatch ${contractRoutes.length}/${backendRoutes.length}`);

const pipelineItems = [];
const sharedExamples = [];
const pageExamples = [];
const capabilityKinds = {};
const recommendationKinds = { desktop: new Set(), mobile: new Set() };
const recommendationGroupAudit = [];
let totalDescriptions = 0;
let totalRecommendations = 0;
for (const page of pages) {
  const sharedFile = path.join(web, 'shared', `${page.id}.defs.ts`);
  const sharedSource = readFileSync(sharedFile, 'utf8');
  const definition = parseExport(sharedSource, 'definition');
  const sharedPipeline = parseExport(sharedSource, 'pipeline');
  if (!Array.isArray(sharedPipeline) || sharedPipeline.length !== 1) fail(`${page.id}: shared pipeline must be an array with one item`);
  const shared = sharedPipeline[0];
  if (shared.agent !== undefined || shared.type !== 'l2_shared' || shared.id !== `${page.id}__l2_shared`) fail(`${page.id}: shared identity/agent invalid`);
  if (JSON.stringify(shared.dependsFiles) !== JSON.stringify([`l2/agendaClinica/web/contracts/${page.id}.defs.ts`, '_102029_.d.ts']) || shared.dependsOn.length || JSON.stringify(shared.skills) !== JSON.stringify([sharedSkillRef])) fail(`${page.id}: shared context ordering invalid`);
  pipelineItems.push(shared);
  sharedExamples.push({ pageId: page.id, item: shared, definitionSummary: { states: definition.states.length, actions: definition.actions.length, scenaries: definition.scenaries.length }, consumer: { skillHash: sha256(sharedSkill), runtimeContext } });

  const scenarios = new Set(definition.scenaries.map(item => item.value));
  const capabilities = new Set([...definition.actions.map(item => item.actionId), ...definition.states.map(item => item.stateKey), ...definition.scenaries.map(item => item.value)]);
  const deviceDescriptions = {};
  const recommendedGroupsByDevice = {};
  const pageReceipt = pagesManifest.units.find(unit => unit.pageId === page.id);
  if (!pageReceipt) fail(`${page.id}: page receipt missing`);
  for (const device of ['desktop', 'mobile']) {
    const file = path.join(web, device, 'page11', `${page.id}.defs.ts`);
    const source = readFileSync(file, 'utf8');
    const descriptions = parseExport(source, 'descriptions');
    const pagePipeline = parseExport(source, 'pipeline');
    if (!Array.isArray(pagePipeline) || pagePipeline.length !== 1) fail(`${page.id}/${device}: page pipeline must contain one item`);
    const item = pagePipeline[0];
    if (item.agent !== undefined || item.type !== 'l2_page' || item.id !== `${page.id}__${device}__page11`) fail(`${page.id}/${device}: page identity/agent invalid`);
    if (JSON.stringify(item.dependsFiles) !== JSON.stringify([`l2/agendaClinica/web/shared/${page.id}.ts`, 'l2/designSystem.ts']) || JSON.stringify(item.dependsOn) !== JSON.stringify([`${page.id}__l2_shared`])) fail(`${page.id}/${device}: page context ordering invalid`);
    const effectiveSkills = item.skills.map(reference => { const resolved = refPath(reference); if (!resolved) fail(`${page.id}/${device}: unreadable skill ${reference}`); const content = readFileSync(resolved, 'utf8'); if (!content.trim()) fail(`${page.id}/${device}: empty skill ${reference}`); return { reference, sha256: sha256(content), bytes: Buffer.byteLength(content) }; });
    if (!item.skills.includes('_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts') || !item.skills.some(reference => reference.startsWith('_102020_/l2/agentDefsL2/skills/pageCategories/'))) fail(`${page.id}/${device}: technical/category skill missing`);
    if (descriptions.length !== (page.organisms || []).length) fail(`${page.id}/${device}: organism description count mismatch`);
    for (const description of descriptions) {
      if (!description.description?.trim() || !scenarios.has(description.contentRef) || description.capabilityRefs.some(reference => !capabilities.has(reference))) fail(`${page.id}/${device}/${description.organismId}: invalid scene/capability`);
      const kind = String(description.kind || '').toLowerCase(); capabilityKinds[kind] = (capabilityKinds[kind] || 0) + 1;
      for (const recommendation of description.moleculeRecommendations || []) {
        if (!recommendation.reason?.trim() || !recommendation.candidates?.length) fail(`${page.id}/${device}/${description.organismId}: invalid recommendation`);
        const group = moleculeGroups.get(recommendation.groupId); if (!group || recommendation.candidates.some(tag => !group.tags.has(tag))) fail(`${page.id}/${device}/${description.organismId}: unknown molecule candidate`);
        recommendationKinds[device].add(kind); totalRecommendations += 1;
      }
    }
    const recommendedGroups = [...new Set(descriptions.flatMap(description => description.moleculeRecommendations.map(recommendation => recommendation.groupId)))].sort();
    for (const groupId of recommendedGroups) { const group = moleculeGroups.get(groupId); for (const reference of [group.indexRef, group.usageRef]) if (!item.skills.includes(reference)) fail(`${page.id}/${device}: selected molecule skill missing ${reference}`); }
    const expectedMoleculeSkills = recommendedGroups.flatMap(groupId => { const group = moleculeGroups.get(groupId); return [group.indexRef, group.usageRef]; }).sort();
    const actualMoleculeSkills = item.skills.filter(reference => reference.startsWith('_102040_/l2/molecules/') || reference.startsWith('_102020_/l2/aura/molecules/skills/')).sort();
    if (JSON.stringify(actualMoleculeSkills) !== JSON.stringify(expectedMoleculeSkills)) fail(`${page.id}/${device}: molecule skills differ from this device recommendations`);
    recommendedGroupsByDevice[device] = recommendedGroups;
    const expectedHash = pageReceipt.sourceHashes[device]; if (`sha256:${sha256(source)}` !== expectedHash) fail(`${page.id}/${device}: result source hash mismatch`);
    pipelineItems.push(item); totalDescriptions += descriptions.length; deviceDescriptions[device] = descriptions;
    pageExamples.push({ pageId: page.id, device, item, descriptions: descriptions.length, recommendations: descriptions.reduce((sum, description) => sum + description.moleculeRecommendations.length, 0), consumer: { designSystem: { sha256: sha256(designSystem), bytes: Buffer.byteLength(designSystem), tokenCount: designTokens.length }, skills: effectiveSkills } });
  }
  const desktop = deviceDescriptions.desktop; const mobile = deviceDescriptions.mobile;
  for (let index = 0; index < desktop.length; index += 1) if (desktop[index].organismId !== mobile[index].organismId || desktop[index].kind !== mobile[index].kind || desktop[index].contentRef !== mobile[index].contentRef || JSON.stringify([...desktop[index].capabilityRefs].sort()) !== JSON.stringify([...mobile[index].capabilityRefs].sort())) fail(`${page.id}: device parity mismatch at ${index}`);
  const receiptGroups = pageReceipt.moleculeReceipt.selectedGroupIds;
  const recommendationUnion = canonicalGroupUnion(recommendedGroupsByDevice);
  if (new Set(receiptGroups).size !== receiptGroups.length || JSON.stringify([...receiptGroups].sort()) !== JSON.stringify(recommendationUnion)) fail(`${page.id}: desktop/mobile recommendation union differs from molecular receipt`);
  recommendationGroupAudit.push({ pageId: page.id, devices: recommendedGroupsByDevice, union: recommendationUnion, receipt: [...receiptGroups].sort() });
  const sharedReceipt = sharedManifest.units.find(unit => unit.pageId === page.id); if (!sharedReceipt || `sha256:${sha256(sharedSource)}` !== sharedReceipt.sourceHash) fail(`${page.id}: shared result source hash mismatch`);
}

for (const device of ['desktop', 'mobile']) for (const expected of ['form', 'list']) if (![...recommendationKinds[device]].some(kind => kind.includes(expected))) fail(`${device}: no real recommendation for ${expected} capability`);
if (totalDescriptions !== pages.reduce((sum, page) => sum + page.organisms.length, 0) * 2) fail(`description total mismatch ${totalDescriptions}`);
if (!totalRecommendations) fail('run contains no molecule recommendations');
if (pipelineItems.length !== pages.length * 3 || new Set(pipelineItems.map(item => item.id)).size !== pipelineItems.length) fail('materialization graph is not 18 unique items');
const ids = new Set(pipelineItems.map(item => item.id)); for (const item of pipelineItems) for (const dependency of item.dependsOn || []) if (!ids.has(dependency)) fail(`unknown dependency ${dependency} from ${item.id}`);

const finalReport = JSON.parse(readFileSync(path.join(pipelineRoot, 'finalize60/report.json'), 'utf8'));
if (finalReport.status !== 'complete' || finalReport.pending.length || finalReport.artifactPaths.length !== defs.length) fail('final report incomplete');
const l1Before = JSON.parse(readFileSync(path.join(evidence, 'l1-before.json'), 'utf8'));
const l1Now = inventoryOf(walk(path.join(root, 'l1')).filter(file => statSync(file).isFile()));
if (!sameInventory(l1Before, l1Now, true)) fail('L1 changed since d2_18 preflight');
const inventory = inventoryOf(defs);
const compareName = process.argv[4]; let noOp = null;
if (compareName) { const before = JSON.parse(readFileSync(path.join(evidence, compareName), 'utf8')); noOp = { byteIdentical: sameInventory(before, inventory), mtimesInvariant: sameInventory(before, inventory, true) }; if (!noOp.byteIdentical || !noOp.mtimesInvariant) fail(`no-op inventory changed ${JSON.stringify(noOp)}`); }

const molecularName = process.argv[5] || 'molecular-verification.json';
execFileSync(path.join(base, 'node_modules/.bin/tsx'), ['--import', path.join(base, 'test/register-hooks.mjs'), '--import', path.join(base, 'test/setup-l2.ts'), 'l2/certificacao/runs/d2_18/verify-molecular.ts', molecularName], { cwd: repo20, stdio: 'inherit' });
const molecular = JSON.parse(readFileSync(path.join(evidence, molecularName), 'utf8'));
const verification = {
  root, pages: expectedPages, defs: defs.length, pageDefs: pages.length * 2, routes: contractRoutes.length, organismDescriptions: totalDescriptions,
  moleculeRecommendations: totalRecommendations, recommendationCapabilityKinds: { desktop: [...recommendationKinds.desktop].sort(), mobile: [...recommendationKinds.mobile].sort() }, capabilityKinds,
  recommendationGroupAudit,
  materializationItems: pipelineItems.length, graphAcyclic: true, noAgentFields: true,
  consumerContext: { sharedSkill: { reference: sharedSkillRef, sha256: sha256(sharedSkill), bytes: Buffer.byteLength(sharedSkill) }, runtime102029: runtimeContext, designSystem: { path: 'l2/designSystem.ts', sha256: sha256(designSystem), bytes: Buffer.byteLength(designSystem), tokenCount: designTokens.length }, molecular },
  receipts: { sharedSchema: sharedManifest.schemaVersion, pagesSchema: pagesManifest.schemaVersion, sharedUnits: sharedManifest.units.length, pageUnits: pagesManifest.units.length },
  finalReport: { status: finalReport.status, pending: finalReport.pending, snapshotHash: finalReport.snapshotHash, artifactPaths: finalReport.artifactPaths.length },
  l1Preserved: true, examples: { shared: sharedExamples.slice(0, 2), pages: pageExamples.filter(item => ['consultas_profissional', 'pacientes'].includes(item.pageId)) }, noOp,
  knownPending: [{ id: 'attendance-note-requiredness', description: 'L4 requires the attendance note while generated contract/shared may expose it as optional; this is not complete app approval.' }, { id: 'shared-input-human-decision-review', description: 'Review technical transport inputs separately from human decisions.' }],
};
writeFileSync(path.join(evidence, process.argv[2] || 'inventory-generation.json'), `${JSON.stringify(inventory, null, 2)}\n`);
writeFileSync(path.join(evidence, process.argv[3] || 'verification-generation.json'), `${JSON.stringify(verification, null, 2)}\n`);
console.log(`verified defs=${defs.length} descriptions=${totalDescriptions} recommendations=${totalRecommendations} items=${pipelineItems.length} l1=preserved`);
