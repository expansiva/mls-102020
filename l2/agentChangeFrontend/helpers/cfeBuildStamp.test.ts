/// <mls fileReference="_102020_/l2/agentChangeFrontend/helpers/cfeBuildStamp.test.ts" enhancement="_blank"/>

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  CFE_AGENT_PROJECT, CFE_AGENT_SOURCE_PREFIX, CFE_BUILD_ANCHORS,
  buildProvenance, describeProvenance, digestBuildFiles,
} from './cfeBuildStamp.js';
import {
  NS4_AGENT_PROJECT, NS4_AGENT_SOURCE_PREFIX, NS4_BUILD_ANCHORS,
  buildProvenance as ns4BuildProvenance,
} from '/_102035_/l2/agentNewSolution/helpers/ns4BuildStamp.js';

// versionRefs REAIS do fileinfos.json dentro do obj/compiled.zip do 102020 (build 5a1ec55,
// lastModified 2026-08-22T01:06:54.276Z).
const BUILD_FILES = [
  { shortPath: 'l2/agentNewSolution/agentNewSolution.ts', versionRef: '3a4e92e7adc5c8da7d9d4221dc7e8b5ef057f4d6' },
  { shortPath: 'l2/agentChangeFrontend/helpers/cfeSharedScaffold.ts', versionRef: '699aec17b4df9e5e84dd31156c65a2e92e9fdb72' },
  { shortPath: 'l2/designSystem.ts', versionRef: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa' },
];

test('os dois agentes do 102020 têm proveniências SEPARADAS', () => {
  // Um stamp por agente: o versionRef do ns não diz nada sobre qual CF rodou (e vice-versa), e
  // designSystem.ts (raiz do l2, superfície da plataforma) não pertence a nenhum dos dois.
  const cfe = buildProvenance(CFE_AGENT_PROJECT, BUILD_FILES, { prefix: CFE_AGENT_SOURCE_PREFIX, anchors: CFE_BUILD_ANCHORS });
  const ns4 = ns4BuildProvenance(NS4_AGENT_PROJECT, BUILD_FILES, { prefix: NS4_AGENT_SOURCE_PREFIX, anchors: NS4_BUILD_ANCHORS });
  assert.equal(cfe.files, 1);
  assert.equal(ns4.files, 1);
  assert.notEqual(cfe.buildRef, ns4.buildRef);
  assert.equal(cfe.anchors['l2/agentChangeFrontend/helpers/cfeCreateShared.ts'], 'absent');
  assert.equal(ns4.anchors['l2/agentNewSolution/agentNewSolution.ts'], '3a4e92e7adc5c8da7d9d4221dc7e8b5ef057f4d6');
  // CF stays in 102020; NS moved to the master solution (102035). Separation is by project and prefix.
  assert.equal(CFE_AGENT_PROJECT, 102020);
  assert.equal(NS4_AGENT_PROJECT, 102035);
});

test('digest estável e linha de trace informativa (sem alarme)', () => {
  assert.match(digestBuildFiles(BUILD_FILES), /^[0-9a-f]{8}$/);
  const line = describeProvenance(buildProvenance(CFE_AGENT_PROJECT, BUILD_FILES, {
    prefix: CFE_AGENT_SOURCE_PREFIX, anchors: CFE_BUILD_ANCHORS, lastPushAt: '2026-08-22T01:06:54.276Z', localEdits: 2,
  }));
  assert.match(line, /Agent build: 102020@[0-9a-f]{8}/);
  assert.match(line, /2 source\(s\) edited locally/);
  assert.ok(!/⚠|stale|STALE/u.test(line));
});

test('o arquivo saiu da raiz do l2 e nenhum call site aponta para lá', () => {
  const base = new URL('../../', import.meta.url);
  const nsL2 = new URL('../../../../mls-102035/l2/', import.meta.url);
  // T4: agentBuildStamp.ts na raiz do l2 era promoção a superfície compartilhada da plataforma
  // (ao lado de designSystem.ts/project.ts) que ninguém pediu.
  assert.throws(() => readFileSync(new URL('agentBuildStamp.ts', base), 'utf8'));
  const sites: Array<{ rel: string; root: URL }> = [
    { rel: 'agentNewSolution/agentNewSolution.ts', root: nsL2 },
    { rel: 'agentNewSolution/steps/e10/agentNs4E10.ts', root: nsL2 },
    { rel: 'agentChangeFrontend/steps/scan/agentCfeCreateScanL4.ts', root: base },
    { rel: 'agentChangeFrontend/steps/finalize/agentCfeCreateFinalize.ts', root: base },
  ];
  for (const { rel, root } of sites) {
    const src = readFileSync(new URL(rel, root), 'utf8');
    assert.doesNotMatch(src, /l2\/agentBuildStamp\.js/u, rel);
    assert.doesNotMatch(src, /staleAgentWarning|readAgentBuildInfo/u, rel);
    assert.match(src, /(ns4BuildStamp|cfeBuildStamp)\.js/u, rel);
  }
});

test('os dois helpers escrevem no código o que o stamp NÃO faz', () => {
  const stampFiles = [
    new URL('cfeBuildStamp.ts', import.meta.url),
    new URL('../../../../mls-102035/l2/agentNewSolution/helpers/ns4BuildStamp.ts', import.meta.url),
  ];
  for (const file of stampFiles) {
    const src = readFileSync(file, 'utf8');
    const rel = file.pathname;
    assert.doesNotMatch(src, /compareAgentBuild|CLOCK_TOLERANCE|staleSources/u, rel);
    assert.match(src, /cannot see work that was never committed and pushed/, rel);
    assert.match(src, /NOT a gate/, rel);
    assert.match(src, /Last push registered on the project\. NOT the build time/, rel);
    // Cópia por agente é decisão registrada, não descuido.
    assert.match(src, /per-agent COPY/, rel);
  }
});
