/// <mls fileReference="_102020_/l2/agentDefsL2/steps/pages50/gate.ts" enhancement="_blank"/>

import type { D2SelectedPage } from '/_102020_/l2/agentDefsL2/steps/input20/contracts.js';
import type { D2SharedDefinition } from '/_102020_/l2/agentDefsL2/steps/shared40/contracts.js';
import { D2_PAGES_JUDGMENT_VERSION, buildD2PagePipeline, knownD2PageCapabilities, type D2PageDevice, type D2PagesJudgment, type D2RenderedPage } from '/_102020_/l2/agentDefsL2/steps/pages50/contracts.js';

export function parseD2PagesJudgment(value: unknown): D2PagesJudgment {
  const root = record(value);
  exactKeys(root, ['schemaVersion', 'pageId', 'presentations'], 'D2_PAGES_SCHEMA');
  if (root.schemaVersion !== D2_PAGES_JUDGMENT_VERSION) fail('D2_PAGES_SCHEMA_VERSION');
  if (typeof root.pageId !== 'string' || !Array.isArray(root.presentations)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  for (const raw of root.presentations) {
    const presentation = record(raw);
    exactKeys(presentation, ['device', 'descriptions', 'capabilityRefs', 'groupIds'], 'D2_PAGES_PRESENTATION_SCHEMA');
    if (typeof presentation.device !== 'string' || !Array.isArray(presentation.descriptions) || !Array.isArray(presentation.capabilityRefs) || !Array.isArray(presentation.groupIds)) fail('D2_PAGES_SCHEMA_TRUNCATED');
  }
  return root as unknown as D2PagesJudgment;
}

export function gateD2Pages(
  moduleName: string,
  page: D2SelectedPage,
  shared: D2SharedDefinition,
  judgment: D2PagesJudgment,
  groupSkills: ReadonlyMap<string, string[]>,
): D2RenderedPage[] {
  const errors: string[] = [];
  if (judgment.pageId !== page.pageId) errors.push(`D2_PAGES_PAGE_CHANGED: ${judgment.pageId}`);
  const byDevice = new Map<D2PageDevice, D2PagesJudgment['presentations'][number]>();
  for (const presentation of judgment.presentations) {
    if (presentation.device !== 'desktop' && presentation.device !== 'mobile') { errors.push(`D2_PAGES_DEVICE_UNKNOWN: ${presentation.device}`); continue; }
    if (byDevice.has(presentation.device)) errors.push(`D2_PAGES_DEVICE_DUPLICATE: ${presentation.device}`);
    byDevice.set(presentation.device, presentation);
  }
  for (const device of ['desktop', 'mobile'] as const) if (!byDevice.has(device)) errors.push(`D2_PAGES_DEVICE_MISSING: ${device}`);
  const known = new Set(knownD2PageCapabilities(shared));
  for (const presentation of byDevice.values()) {
    if (!Array.isArray(presentation.descriptions) || !presentation.descriptions.length || presentation.descriptions.some(item => typeof item !== 'string' || !item.trim())) errors.push(`D2_PAGES_DESCRIPTIONS_EMPTY: ${presentation.device}`);
    if (!Array.isArray(presentation.capabilityRefs) || !presentation.capabilityRefs.length) errors.push(`D2_PAGES_CAPABILITIES_EMPTY: ${presentation.device}`);
    for (const ref of presentation.capabilityRefs || []) if (!known.has(ref)) errors.push(`D2_PAGES_CAPABILITY_UNKNOWN: ${presentation.device} -> ${ref}`);
    for (const group of presentation.groupIds || []) if (!groupSkills.has(group)) errors.push(`D2_PAGES_GROUP_UNKNOWN: ${presentation.device} -> ${group}`);
    const prose = (presentation.descriptions || []).join('\n');
    if (/<\/?[a-z][^>]*>|```(?:html|css)|\b(?:display|grid-template|position)\s*:|\b(?:two|three|2|3)[ -]column\b/iu.test(prose)) errors.push(`D2_PAGES_LAYOUT_PRESCRIPTION: ${presentation.device} evidence=${evidence(prose)}`);
    if (!shared.dataBindings.length && /\b(?:dashboard|statistics?|metrics?|aggregate|totals?)\b/iu.test(prose)) errors.push(`D2_PAGES_DATA_CLAIM_UNSUPPORTED: ${presentation.device} evidence=${evidence(prose)}`);
  }
  const desktop = byDevice.get('desktop'); const mobile = byDevice.get('mobile');
  if (desktop && mobile) {
    if (setKey(desktop.capabilityRefs) !== setKey(mobile.capabilityRefs)) errors.push('D2_PAGES_CAPABILITY_PARITY');
    if (JSON.stringify(desktop.descriptions) === JSON.stringify(mobile.descriptions)) errors.push('D2_PAGES_DEVICE_DIFFERENCE');
  }
  if (errors.length) throw new Error(errors.join('\n'));
  return (['desktop', 'mobile'] as const).map(device => {
    const presentation = byDevice.get(device)!;
    const skills = presentation.groupIds.flatMap(group => groupSkills.get(group) || []);
    return { device, descriptions: presentation.descriptions.map(item => item.trim()), pipeline: [buildD2PagePipeline(moduleName, page.pageId, device, skills)] };
  });
}

function setKey(values: string[]): string { return [...new Set(values)].sort().join('\0'); }
function evidence(value: string): string { return JSON.stringify(value.replace(/\s+/gu, ' ').slice(0, 160)); }
function exactKeys(value: Record<string, unknown>, allowed: string[], prefix: string): void { const extra = Object.keys(value).find(key => !allowed.includes(key)); if (extra) fail(`${prefix}_UNKNOWN_KEY: ${extra}`); }
function fail(message: string): never { throw new Error(message); }
function record(value: unknown): Record<string, unknown> { return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}; }
