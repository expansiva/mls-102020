import test from 'node:test';
import assert from 'node:assert/strict';
import { buildD2PagePipeline } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';
import { renderD2Page, assertD2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/render.js';
import { renderD2PageContract } from '/_102020_/l2/agentDefsL2/steps/contracts30/render.js';
import { assertD2Header } from '/_102020_/l2/agentDefsL2/helpers/d2Header.js';
import { expandContextRef, parseDefs, resolveProjectRelativeRef } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { cfeContextReceiptPath, cfeMaterializationFresh } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeReceipt.js';

const project = 817263;

test('headers identify the empty contract and text page independently of the body', () => {
  const source = renderD2PageContract({ pageId: 'empty', calls: [] }, 'l2/renamed/web/contracts/empty.defs.ts', project);
  assert.match(source, /fileReference="_817263_\/l2\/renamed\/web\/contracts\/empty.defs.ts"/u);
  assert.equal(assertD2Header(source, 'l2/renamed/web/contracts/empty.defs.ts', project).trim(), 'export {};');
  const page = pageSource('renamed', 'records', 'desktop');
  assert.doesNotThrow(() => assertD2RenderedPage(page));
  assert.throws(() => assertD2RenderedPage(page.replace('Read approved content.', '<div>forbidden</div>')), /DEFINITION_INVALID/u);
  assert.throws(() => assertD2RenderedPage(page.replace('/records.defs.ts', '/wrong.defs.ts')), /HEADER_INVALID/u);
});

test('productive context reader and receipt writer prove missing refs, selective freshness and resume', async () => {
  const prior = (globalThis as unknown as { mls: unknown }).mls;
  const host = installHost();
  try {
    const { buildGenContext, persistConsumedContext } = await import('/_102020_/l2/agentChangeFrontend/steps/materialize/agentCfeMaterializeGen.js');
    const { planSpecFrontendWithReceipts } = await import('/_102020_/l2/agentChangeFrontend/agentSpecFrontend.js');
    const units = ['renamedA', 'renamedB'].flatMap(pageId => (['desktop', 'mobile'] as const).map(device => ({ pageId, device, defPath: `_${project}_/l2/renamed/web/${device}/page11/${pageId}.defs.ts` })));
    for (const unit of units) {
      const source = pageSource('renamed', unit.pageId, unit.device);
      host.put(unit.defPath, source);
      const item = parseDefs(source).item!;
      for (const ref of [...item.skills ?? [], ...(item.dependsFiles ?? []).flatMap(expandContextRef)]) {
        const resolved = resolveProjectRelativeRef(ref, project);
        if (!host.text.has(resolved)) host.put(resolved, ref.endsWith('.md') ? '# Published experience\nRead approved data.' : 'export const published = true;');
      }
      host.put(`_${project}_/l2/renamed/web/shared/${unit.pageId}.defs.ts`, 'export const definition = {"hidden":null} as const;');
      host.put(item.outputPath, 'export class FixturePanel {}');
    }
    const read = async (ref: string) => host.text.get(ref) ?? null;
    for (const unit of units) {
      const ctx = await buildGenContext(unit.defPath);
      assert.equal(typeof ctx.definitionData, 'string');
      assert.ok(ctx.contextSections.length >= 5);
      await persistConsumedContext(ctx.pipelineItem);
      assert.equal(await cfeMaterializationFresh(unit.defPath, project, read), true);
      const receipt = JSON.parse(host.text.get(cfeContextReceiptPath(ctx.pipelineItem.outputPath))!);
      assert.ok(receipt.sources.every((item: { sha256: string }) => /^sha256:[a-f0-9]{64}$/u.test(item.sha256)));
      assert.ok(receipt.consumed.context && receipt.consumed.skills);
    }
    const noOp = await planSpecFrontendWithReceipts('{"scope":"renamed"}');
    assert.equal(noOp.plans.flatMap(plan => plan.queued).length, 0);
    const writerCount = host.writes.length;
    const hiddenRef = `_${project}_/l2/renamed/web/shared/renamedA.defs.ts`;
    const hiddenBefore = host.text.get(hiddenRef)!;
    host.put(hiddenRef, hiddenBefore.replace('null', '"changed hidden"'));
    const afterHidden = await planSpecFrontendWithReceipts('{"scope":"renamed"}');
    assert.deepEqual(afterHidden.plans.flatMap(plan => plan.queued).map(item => item.defPath).sort(), units.filter(unit => unit.pageId === 'renamedA').map(unit => unit.defPath).sort());
    assert.equal(host.writes.length, writerCount, 'scan performs no writes');
    host.put(hiddenRef, hiddenBefore);

    const templateRef = '_102020_/l4/collabux/templates/fixtureExperience.md';
    const templateBefore = host.text.get(templateRef)!;
    host.put(templateRef, `${templateBefore}\nUpdated published guidance.`);
    for (const unit of units) assert.equal(await cfeMaterializationFresh(unit.defPath, project, read), unit.pageId === 'renamedB');
    host.put(templateRef, templateBefore);
    const technical = '_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts';
    const beforeSkill = host.text.get(technical)!;
    host.put(technical, `${beforeSkill}\n// changed skill`);
    for (const unit of units) assert.equal(await cfeMaterializationFresh(unit.defPath, project, read), false);
    host.put(technical, beforeSkill);

    const unit = units[0]; const item = parseDefs(host.text.get(unit.defPath)!).item!;
    for (const ref of [...item.skills ?? [], ...(item.dependsFiles ?? []).flatMap(expandContextRef), `l2/renamed/web/shared/${unit.pageId}.defs.ts`]) {
      const resolved = resolveProjectRelativeRef(ref, project); const saved = host.text.get(resolved)!;
      host.text.delete(resolved);
      await assert.rejects(() => buildGenContext(unit.defPath), error => error instanceof Error && error.message.includes(resolved));
      host.text.set(resolved, saved);
    }
    const ctx = await buildGenContext(unit.defPath);
    host.failReceipt = cfeContextReceiptPath(ctx.pipelineItem.outputPath);
    await assert.rejects(() => persistConsumedContext(ctx.pipelineItem), /RECEIPT_WRITE_FAILED/u);
    host.failReceipt = '';
    await persistConsumedContext(ctx.pipelineItem);
    for (const sibling of units.slice(1)) assert.equal(await cfeMaterializationFresh(sibling.defPath, project, read), true);
    assert.ok([...host.text.keys()].filter(ref => ref.endsWith('Receipt.json')).length === 4);
    assert.ok(!host.writes.some(ref => ref.endsWith('.defs.ts') || ref.endsWith('.md')), 'inputs and templates never become generated outputs');
  } finally { (globalThis as unknown as { mls: unknown }).mls = prior; }
});

function pageSource(moduleName: string, pageId: string, device: 'desktop' | 'mobile'): string {
  const sources = pageId === 'renamedA' ? [{ role: 'experience', reference: '_102020_/l4/collabux/templates/fixtureExperience.md', sha256: `sha256:${'1'.repeat(64)}` }] : [];
  const template = { categoryRef: 'calendarScheduling', targetPage: 'page11' as const, experiencePage: null, experienceId: null, styleId: null, layoutId: null, reason: 'Use published guidance.', requirementsMet: [], digest: `sha256:${'1'.repeat(64)}`, sources };
  const pipeline = buildD2PagePipeline(moduleName, pageId, device, 'calendarScheduling', ['_102020_/l2/agentDefsL2/skills/genD2PageRenderTs.ts', ...sources.map(source => source.reference)], template, []);
  return renderD2Page({ device, pageId, pageLabel: pageId, pageIntent: 'Read approved content.', actors: [], authorityRefs: [], operationBindings: [], descriptions: [], templateSelection: template, coverage: [], pipeline: [pipeline] }, project);
}

function installHost() {
  const text = new Map<string, string>(); const files: Record<string, unknown> = {}; const writes: string[] = [];
  const host = { text, writes, failReceipt: '', put: (ref: string, content: string) => {
    const info = parse(ref); if (!info) throw new Error(ref);
    text.set(ref, content); files[ref] = { ...info, status: 'unchanged', updatedAt: ref.endsWith('.defs.ts') ? '2026-09-01T00:00:00Z' : '2026-09-25T00:00:00Z', getContent: async () => text.get(ref) ?? '' };
  } };
  const refOf = (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => `_${info.project}_/l${info.level}/${info.folder ? `${info.folder}/` : ''}${info.shortName}${info.extension}`;
  (globalThis as unknown as { mls: unknown }).mls = {
    actualProject: project, events: { addEventListener() {}, removeEventListener() {}, dispatch() {} }, editor: { models: {}, getKeyModel: () => '' },
    stor: { files, convertFileReferenceToFile: parse, getKeyToFile: refOf, localStor: { setContent: async (file: Parameters<typeof refOf>[0], value: { content: string }) => {
      const ref = refOf(file); if (ref === host.failReceipt) throw new Error('simulated receipt failure'); host.put(ref, value.content); writes.push(ref);
    } } }, l2: { typescript: {} },
  };
  // Sidecar creation uses the same production writer; reserve only the empty storage identities.
  for (const pageId of ['renamedA', 'renamedB']) for (const device of ['desktop', 'mobile']) host.put(`_${project}_/l2/renamed/web/${device}/page11/${pageId}Receipt.json`, '');
  return host;
}

function parse(ref: string) {
  const match = /^_(\d+)_\/l(\d+)\/(?:(.+)\/)?([^/]+?)(\.defs\.ts|\.ts|\.md|\.json)$/u.exec(ref);
  return match ? { project: Number(match[1]), level: Number(match[2]), folder: match[3] ?? '', shortName: match[4], extension: match[5] } : null;
}
