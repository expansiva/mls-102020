import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const base = '/Volumes/WagnerSSD1/collab/mls-base';
const root = path.join(base, 'mls-102047');
const repo20 = path.join(base, 'mls-102020');
const web = path.join(root, 'l2/agendaClinica/web');
const pipelineRoot = path.join(root, 'l2/agendaClinica/pipeline/agentDefsL2');
const evidence = path.dirname(fileURLToPath(import.meta.url));
const fail = message => { throw new Error(message); };
const sha256 = value => createHash('sha256').update(value).digest('hex');
const walk = folder => readdirSync(folder, { withFileTypes: true }).flatMap(entry => { const full = path.join(folder, entry.name); return entry.isDirectory() ? walk(full) : [full]; });
const pagesOf = tree => tree.flatMap(item => [...(item.kind === 'page' ? [item] : []), ...pagesOf(Array.isArray(item.children) ? item.children : [])]);
const parseExport = (source, name) => { const match = new RegExp(`export const ${name} = ([\\s\\S]*?) as const;`).exec(source); if (!match) fail(`export ${name} missing`); try { return JSON.parse(match[1]); } catch { fail(`export ${name} invalid JSON`); } };
const idOf = (raw, occurrences) => { const kind = String(raw.kind || '').trim(); const folded = kind.replace(/[^A-Za-z0-9]+/gu, '-').replace(/^-|-$/gu, '').toLowerCase(); const n = (occurrences.get(folded) || 0) + 1; occurrences.set(folded, n); return String(raw.organismId || raw.id || `organism.${folded}.${n}`); };
const refPath = reference => { const match = /^_(\d+)_\/(.+?)(?:\.js|\.ts)?$/u.exec(reference); if (!match) return ''; const raw = path.join(base, `mls-${match[1]}`, match[2]); return existsSync(raw) ? raw : existsSync(`${raw}.ts`) ? `${raw}.ts` : ''; };

const menu = JSON.parse(readFileSync(path.join(root, 'l4/agendaClinica/pool/l2/web/menu.json'), 'utf8'));
const pages = pagesOf(menu.tree);
const expectedPages = pages.map(page => page.id).sort();
const defs = walk(web).filter(file => file.endsWith('.defs.ts')).sort();
const unexpectedTs = walk(web).filter(file => file.endsWith('.ts') && !file.endsWith('.defs.ts'));
if (defs.length !== pages.length * 4) fail(`defs mismatch ${defs.length}/${pages.length * 4}`);
if (unexpectedTs.length) fail(`materialized ts forbidden: ${unexpectedTs.join(',')}`);
const categoryCatalog = JSON.parse(readFileSync(path.join(repo20, 'l4/collabux/templates/categoryList.json'), 'utf8'));
const categorySkills = new Map(categoryCatalog.categories.map(item => [item.categoryId, `_102020_/l2/agentDefsL2/skills/pageCategories/${item.categoryId}.md`]));
categorySkills.set('bespoke', '_102020_/l2/agentDefsL2/skills/pageCategories/bespoke.md');
const technicalSkill = '_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts';
const moleculeGroups = new Map();
for (const file of walk(path.join(base, 'mls-102040/l2/molecules')).filter(file => file.endsWith('/index.defs.ts'))) {
  const source = readFileSync(file, 'utf8'); const group = /export const group = ['"]([^'"]+)['"]/u.exec(source)?.[1];
  const usageContract = /export const usageContract = ['"]([^'"]+)['"]/u.exec(source)?.[1];
  const usageRef = usageContract ? `${usageContract.replace(/^\//u, '')}.ts` : '';
  if (group) moleculeGroups.set(group, { tags: new Set([...source.matchAll(/tag:\s*['"]([^'"]+)['"]/gu)].map(match => match[1])), indexRef: `_102040_/${path.relative(path.join(base, 'mls-102040'), file).replaceAll(path.sep, '/')}`, usageRef });
}
const reportPages = []; const pipelineItems = []; let totalDescriptions = 0; let totalRecommendations = 0;
for (const page of pages) {
  const occurrences = new Map(); const expectedOrganisms = (page.organisms || []).map(raw => ({ organismId: idOf(raw, occurrences), kind: raw.kind, sourceText: raw.text }));
  const sharedFile = path.join(web, 'shared', `${page.id}.defs.ts`); const sharedSource = readFileSync(sharedFile, 'utf8'); const shared = parseExport(sharedSource, 'definition');
  const scenarios = new Set(shared.scenaries.map(item => item.value)); const capabilities = new Set([...shared.actions.map(item => item.actionId), ...shared.states.map(item => item.stateKey), ...shared.scenaries.map(item => item.value)]);
  const devices = {};
  for (const device of ['desktop', 'mobile']) {
    const file = path.join(web, device, 'page11', `${page.id}.defs.ts`); const source = readFileSync(file, 'utf8');
    const descriptions = parseExport(source, 'descriptions'); const pipeline = parseExport(source, 'pipeline');
    if (descriptions.length !== expectedOrganisms.length) fail(`${page.id}/${device} organisms ${descriptions.length}/${expectedOrganisms.length}`);
    for (let index = 0; index < expectedOrganisms.length; index += 1) {
      const actual = descriptions[index]; const expected = expectedOrganisms[index];
      if (actual.organismId !== expected.organismId || actual.kind !== expected.kind) fail(`${page.id}/${device} organism identity mismatch at ${index}`);
      if (!actual.description?.trim() || !scenarios.has(actual.contentRef)) fail(`${page.id}/${device}/${actual.organismId} description/content invalid`);
      if (!Array.isArray(actual.capabilityRefs) || actual.capabilityRefs.some(ref => !capabilities.has(ref))) fail(`${page.id}/${device}/${actual.organismId} capability invalid`);
      if (!Array.isArray(actual.moleculeRecommendations)) fail(`${page.id}/${device}/${actual.organismId} recommendations missing`);
      for (const recommendation of actual.moleculeRecommendations) {
        const group = moleculeGroups.get(recommendation.groupId); if (!group) fail(`unknown molecule group ${recommendation.groupId}`);
        if (!recommendation.reason?.trim() || !recommendation.candidates?.length || recommendation.candidates.some(tag => !group.tags.has(tag))) fail(`${page.id}/${device}/${actual.organismId} molecule invalid`);
        if (!existsSync(refPath(group.indexRef)) || !existsSync(refPath(group.usageRef))) fail(`${recommendation.groupId} skills unreadable`);
        totalRecommendations += 1;
      }
    }
    const item = pipeline[0]; if (!item || pipeline.length !== 1 || item.type !== 'l2_page') fail(`${page.id}/${device} pipeline invalid`);
    const categorySkill = categorySkills.get(item.categoryRef); if (!categorySkill) fail(`${page.id}/${device} category invalid ${item.categoryRef}`);
    for (const required of [technicalSkill, categorySkill]) if (!item.skills.includes(required) || !existsSync(refPath(required))) fail(`${page.id}/${device} required skill unreadable ${required}`);
    const recommendedGroups = new Set(descriptions.flatMap(item => item.moleculeRecommendations.map(rec => rec.groupId)));
    for (const groupId of recommendedGroups) { const group = moleculeGroups.get(groupId); for (const ref of [group.indexRef, group.usageRef]) if (!item.skills.includes(ref)) fail(`${page.id}/${device} missing molecule skill ${ref}`); }
    devices[device] = { descriptions, categoryRef: item.categoryRef, skills: item.skills };
    pipelineItems.push(item); totalDescriptions += descriptions.length;
  }
  const left = devices.desktop.descriptions; const right = devices.mobile.descriptions;
  for (let index = 0; index < left.length; index += 1) if (left[index].organismId !== right[index].organismId || left[index].kind !== right[index].kind || left[index].contentRef !== right[index].contentRef || JSON.stringify([...left[index].capabilityRefs].sort()) !== JSON.stringify([...right[index].capabilityRefs].sort())) fail(`${page.id} device parity mismatch ${left[index].organismId}`);
  reportPages.push({ pageId: page.id, label: page.label, organisms: expectedOrganisms, scenarios: [...scenarios], sharedInputs: shared.states.filter(item => item.source === 'userInput').map(item => ({ stateKey: item.stateKey, name: item.name, required: item.required, presentation: item.presentation, contractRef: item.contractRef })), devices });
}
if (totalDescriptions !== pages.reduce((sum, page) => sum + page.organisms.length, 0) * 2) fail(`description total mismatch ${totalDescriptions}`);
if (!totalRecommendations) fail('entire run has no molecule recommendations');
const sharedItems = pages.map(page => parseExport(readFileSync(path.join(web, 'shared', `${page.id}.defs.ts`), 'utf8'), 'pipeline'));
pipelineItems.push(...sharedItems); if (pipelineItems.length !== pages.length * 3 || new Set(pipelineItems.map(item => item.id)).size !== pipelineItems.length) fail('materialization graph invalid');
const rawResults = pages.map(page => path.join(pipelineRoot, 'pages50/results', `${page.id}.json`)); if (rawResults.some(file => !existsSync(file))) fail('raw page result missing');
const finalReport = JSON.parse(readFileSync(path.join(pipelineRoot, 'finalize60/report.json'), 'utf8')); if (finalReport.status !== 'complete' || finalReport.pending.length || finalReport.artifactPaths.length !== defs.length) fail('final report incomplete');
const inventory = defs.map(file => { const content = readFileSync(file); const stat = statSync(file); return { path: path.relative(root, file).replaceAll(path.sep, '/'), sha256: sha256(content), bytes: stat.size, mtimeMs: stat.mtimeMs }; });
const compareName = process.argv[4]; let noOp = null;
if (compareName) { const before = JSON.parse(readFileSync(path.join(evidence, compareName), 'utf8')); noOp = { byteIdentical: JSON.stringify(before.map(({ path: name, sha256: hash, bytes }) => ({ path: name, sha256: hash, bytes }))) === JSON.stringify(inventory.map(({ path: name, sha256: hash, bytes }) => ({ path: name, sha256: hash, bytes }))), mtimesInvariant: JSON.stringify(before.map(item => item.mtimeMs)) === JSON.stringify(inventory.map(item => item.mtimeMs)) }; if (!noOp.byteIdentical || !noOp.mtimesInvariant) fail(`no-op inventory changed ${JSON.stringify(noOp)}`); }
const verification = { root, userLanguage: menu.userLanguage, pages: expectedPages, defs: defs.length, pageDefs: pages.length * 2, organismDescriptions: totalDescriptions, moleculeRecommendations: totalRecommendations, materializationItems: pipelineItems.length, rawResults: rawResults.length, finalReport: { status: finalReport.status, pending: finalReport.pending, snapshotHash: finalReport.snapshotHash }, consumerContexts: reportPages.filter(item => ['consultas_profissional', 'pacientes'].includes(item.pageId)), exposedSharedInputsForReview: reportPages.flatMap(item => item.sharedInputs.map(input => ({ pageId: item.pageId, ...input }))), pageReport: reportPages, noOp, knownPending: [{ id: 'attendance-note-requiredness', description: 'L4 requires the attendance note while generated contract/shared may expose it as optional; do not claim complete app approval.' }, { id: 'shared-input-human-decision-review', description: 'Review exposedSharedInputsForReview after generation and separate technical transport inputs from human decisions.' }] };
writeFileSync(path.join(evidence, process.argv[2] || 'inventory-generation.json'), `${JSON.stringify(inventory, null, 2)}\n`);
writeFileSync(path.join(evidence, process.argv[3] || 'verification-generation.json'), `${JSON.stringify(verification, null, 2)}\n`);
console.log(`verified defs=${defs.length} descriptions=${totalDescriptions} recommendations=${totalRecommendations} items=${pipelineItems.length}`);
