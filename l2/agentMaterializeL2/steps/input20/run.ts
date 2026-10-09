/// <mls fileReference="_102020_/l2/agentMaterializeL2/steps/input20/run.ts" enhancement="_blank"/>

// input20: discover the pages of the module, run the pure gate, read the L4 context and slice it per page,
// fingerprint every future unit and persist l2/<module>/pipeline/agentMaterializeL2/input.json.
// No LLM, and no write when nothing changed. The L4 slice is part of each unit hash: an L4 change regenerates.

import { displayPath, writeJson } from '/_102035_/l2/solution/fs.js';
import { sha256Text } from '/_102020_/l2/agentMaterializeL2/helpers/hash.js';
import { m4OwnedFile, type M4RunIdentity } from '/_102020_/l2/agentMaterializeL2/helpers/core.js';
import { gateM4Input, M4_INPUT_KINDS, type M4ContextInput, type M4InputKind, type M4InputProblem } from '/_102020_/l2/agentMaterializeL2/steps/input20/gate.js';
import {
  discoverM4Pages, loadMoleculeCatalog, m4DefsInfo, readDefsPipelineStatus, readM4PageSources, studioInputPort, templateInfo, type M4InputPort,
} from '/_102020_/l2/agentMaterializeL2/steps/input20/io.js';
import { l4RefsOf, readL4Module, renderL4Slice, sliceL4ForPage, type L4ModuleContext, type L4PageRefs } from '/_102020_/l2/agentMaterializeL2/helpers/l4/context.js';

export const M4_INPUT_VERSION = '2026-10-05-materialize-l2-v4-input-v2' as const;

/** One future materialization unit; its inputHash decides reuse in the later steps. */
export type M4UnitKind = 'shared' | 'desktop' | 'mobile' | 'tests';
export interface M4Unit { unitId: string; kind: M4UnitKind; inputHash: string }

export interface M4InputPage {
  pageId: string;
  status: 'accepted' | 'refused';
  inputs: Record<M4InputKind, { path: string; sha256: string } | null>;
  /** Only accepted pages have units. */
  units: M4Unit[];
  problems: M4InputProblem[];
  /** Intent and form-submit names → the shared method that serves them (gate `methods`). */
  methods: Record<string, string>;
  /** Form command-input members that come from the page's selection (gate `contextInputs`). */
  contextInputs?: M4ContextInput[];
  /** Ids of the L4 context this page references (task V6); the text is rebuilt at prompt time. Null when refused. */
  l4: L4PageRefs | null;
}
export interface M4InputSnapshot {
  schemaVersion: typeof M4_INPUT_VERSION;
  project: number;
  module: string;
  defsPipelineStatus: string | null;
  snapshotHash: string;
  accepted: string[];
  refused: string[];
  moduleProblems: M4InputProblem[];
  pages: M4InputPage[];
}

export interface M4InputRunResult { snapshot: M4InputSnapshot; written: boolean; path: string }

export interface M4InputRunPort extends M4InputPort {
  write?(info: ReturnType<typeof m4OwnedFile>, value: unknown): Promise<unknown>;
}

const TAG_IN_SOURCE = /"(?:preferred|alternative)": "([^"]+)"/gu;
const TEMPLATE_IN_SOURCE = /"category": "([^"]+)"/u;

export async function runM4Input(identity: M4RunIdentity, port: M4InputRunPort = studioInputPort): Promise<M4InputRunResult> {
  const pageIds = discoverM4Pages(identity, port);
  const pages = [];
  for (const pageId of pageIds) pages.push({ pageId, sources: await readM4PageSources(identity, pageId, port) });

  const page11Sources = pages.flatMap(page => [page.sources.desktop, page.sources.mobile]).filter((item): item is string => item !== null);
  const moleculeExists = await loadMoleculeCatalog([...new Set(page11Sources.flatMap(source => [...source.matchAll(TAG_IN_SOURCE)].map(match => match[1])))], port);
  const templates = new Map<string, string | null>();
  for (const category of new Set(page11Sources.map(source => TEMPLATE_IN_SOURCE.exec(source)?.[1]).filter((item): item is string => Boolean(item)))) {
    const info = templateInfo(category);
    templates.set(category, info && port.exists(info) ? await port.read(info) : null);
  }

  const l4 = await readL4Module(identity.project, identity.module, {
    listDefs: (project, folder) => port.listDefs(project, folder, 4),
    exists: port.exists, read: port.read,
  });
  const defsPipelineStatus = await readDefsPipelineStatus(identity, port);
  const gate = gateM4Input({
    ...identity, defsPipelineStatus, pages,
    templateExists: category => templates.get(category) != null,
    moleculeExists,
  });

  const snapshotPages: M4InputPage[] = [];
  for (const page of pages) {
    const hashes = {} as Record<M4InputKind, string>;
    const inputs = {} as M4InputPage['inputs'];
    for (const kind of M4_INPUT_KINDS) {
      const source = page.sources[kind];
      hashes[kind] = source === null ? '' : await sha256Text(source);
      inputs[kind] = source === null ? null : { path: displayPath(m4DefsInfo(identity, kind, page.pageId)), sha256: hashes[kind] };
    }
    const accepted = gate.accepted.includes(page.pageId);
    const units: M4Unit[] = [];
    if (accepted) {
      const parsed = gate.parsed[page.pageId];
      const templateHash = async (device: 'desktop' | 'mobile') => sha256Text(templates.get(parsed.page11[device].template.category) ?? '');
      const unit = async (kind: M4UnitKind, parts: string[]): Promise<M4Unit> => ({ unitId: `${page.pageId}__${kind}`, kind, inputHash: await sha256Text(parts.join('\n')) });
      const l4Hash = await sha256Text(renderL4Slice(sliceL4ForPage(l4, parsed.contract, parsed.shared)));
      // D1 (30/09/2026): the contract .defs.ts is used as is (types for execBff); it is an input, not a unit.
      units.push(await unit('shared', [hashes.contract, hashes.shared, l4Hash]));
      units.push(await unit('desktop', [hashes.contract, hashes.shared, hashes.desktop, await templateHash('desktop'), l4Hash]));
      units.push(await unit('mobile', [hashes.contract, hashes.shared, hashes.mobile, await templateHash('mobile'), l4Hash]));
      units.push(await unit('tests', [hashes.shared, hashes.desktop, hashes.mobile, l4Hash]));
    }
    snapshotPages.push({
      pageId: page.pageId,
      status: accepted ? 'accepted' : 'refused',
      inputs,
      units,
      problems: gate.problems.filter(item => item.page === page.pageId),
      methods: gate.parsed[page.pageId]?.methods ?? {},
      contextInputs: gate.parsed[page.pageId]?.contextInputs ?? [],
      l4: accepted ? l4RefsOf(sliceL4ForPage(l4, gate.parsed[page.pageId].contract, gate.parsed[page.pageId].shared)) : null,
    });
  }
  const moduleProblems = [...gate.problems.filter(item => item.page === '*'), ...l4Notes(l4)];
  const snapshotHash = await sha256Text(JSON.stringify({ defsPipelineStatus, pages: snapshotPages.map(page => ({ pageId: page.pageId, inputs: page.inputs })) }));
  const snapshot: M4InputSnapshot = {
    schemaVersion: M4_INPUT_VERSION, ...identity, defsPipelineStatus, snapshotHash,
    accepted: gate.accepted, refused: gate.refused, moduleProblems, pages: snapshotPages,
  };

  const info = m4OwnedFile(identity, 'input');
  const previous = await port.readJson<M4InputSnapshot>(info);
  const written = JSON.stringify(previous) !== JSON.stringify(snapshot);
  if (written) await (port.write ?? writeJson)(info, snapshot);
  return { snapshot, written, path: displayPath(info) };
}

/** Facts about the L4 (never a refusal): the generators work from the L2 defs alone when it is missing. */
function l4Notes(l4: L4ModuleContext): M4InputProblem[] {
  const notes: M4InputProblem[] = [];
  const note = (code: string, path: string, message: string) => notes.push({ severity: 'warning', code, page: '*', path, message });
  if (!l4.module.productLanguages.length) note('M4_INPUT_L4_LANGUAGES', 'l4:module.defs.ts', 'The L4 module declares no product language; the pages fall back to en.');
  if (!l4.entities.length) note('M4_INPUT_L4_ONTOLOGY', 'l4:ontology', 'The L4 ontology was not found; labels come from the L2 defs alone.');
  return notes;
}

/** One line per problem, errors first, for the step trace and the chat. */
export function formatM4InputReport(snapshot: M4InputSnapshot): string {
  const lines: string[] = [];
  lines.push(`${snapshot.module}: ${snapshot.accepted.length} page(s) accepted [${snapshot.accepted.join(', ')}], ${snapshot.refused.length} refused [${snapshot.refused.join(', ')}].`);
  const all = [...snapshot.moduleProblems, ...snapshot.pages.flatMap(page => page.problems)];
  for (const severity of ['error', 'warning'] as const) {
    for (const item of all.filter(problem => problem.severity === severity)) lines.push(`${severity} ${item.code} [${item.page}] ${item.path} — ${item.message}`);
  }
  return lines.join('\n');
}
