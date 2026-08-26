/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/ns4Fs.test.ts" enhancement="_blank"/>

import assert from 'node:assert/strict';
import test from 'node:test';

import { readNs4AvailableContent } from '/_102020_/l2/agentNewSolution/helpers/ns4ContentRead.js';

async function loadNs4Fs(): Promise<typeof import('/_102020_/l2/agentNewSolution/helpers/ns4Fs.js')> {
  const g = globalThis as unknown as Record<string, any>;
  if (!g.mls) g.mls = { actualProject: 102047, stor: { files: {} } };
  if (!g.mls.events) g.mls.events = { addEventListener() {}, removeEventListener() {}, dispatch() {} };
  return import('/_102020_/l2/agentNewSolution/helpers/ns4Fs.js');
}

test('NS4 reads versionRef=0 locally and never requests the invalid remote blob', async () => {
  let remoteReads = 0;
  const file: any = {
    versionRef: '0',
    getValueInfo: async () => ({ content: { local: true } }),
    getContent: async () => { remoteReads += 1; return 'remote'; },
  };
  assert.deepEqual(await readNs4AvailableContent(file, '.json'), {
    text: '{\n  "local": true\n}\n', unavailableNewFile: false,
  });
  assert.equal(remoteReads, 0);

  file.getValueInfo = async () => ({ content: null });
  assert.deepEqual(await readNs4AvailableContent(file, '.json'), {
    text: null, unavailableNewFile: true,
  });
  assert.equal(remoteReads, 0);
});

test('listNs4E7UseCaseDraftFiles lists live *-draft.json of the module', async () => {
  const ns4 = await loadNs4Fs();
  const g = globalThis as unknown as Record<string, any>;
  g.mls.actualProject = 102047;
  g.mls.stor.files = {
    a: { project: 102047, level: 4, folder: 'petShop/pipeline/e7-usecases', shortName: 'locateServiceExecution-draft', extension: '.json', status: 'changed' },
    b: { project: 102047, level: 4, folder: 'petShop/pipeline/e7-usecases', shortName: 'createPet-draft', extension: '.json', status: 'deleted' },
    c: { project: 1, level: 4, folder: 'petShop/pipeline/e7-usecases', shortName: 'other-draft', extension: '.json', status: 'changed' },
    d: { project: 102047, level: 4, folder: 'petShop/operations', shortName: 'listPet', extension: '.defs.ts', status: 'changed' },
  };
  assert.deepEqual(ns4.listNs4E7UseCaseDraftFiles('petShop').map(file => file.shortName), ['locateServiceExecution-draft']);
});

test('assertNs4ShortName rejects extra dots', async () => {
  const { assertNs4ShortName } = await loadNs4Fs();
  assert.doesNotThrow(() => assertNs4ShortName('e2-journeys-draft'));
  assert.doesNotThrow(() => assertNs4ShortName('attachPetServiceImage--qryLocatePet'));
  assert.throws(
    () => assertNs4ShortName('catalog.catalogList'),
    /filename out of standard: 'catalog\.catalogList' — shortName must not contain dots/,
  );
});

test('every ns4Fs *File builder shortName is free of dots', async () => {
  const ns4 = await loadNs4Fs();
  const m = 'petShop';
  const built: Record<string, { shortName: string }> = {
    ns4AgentFile: ns4.ns4AgentFile('skills', 'coverageRepair', '.md'),
    ns4ModuleFile: ns4.ns4ModuleFile(m),
    ns4PipelineFile: ns4.ns4PipelineFile(m),
    ns4E2DraftFile: ns4.ns4E2DraftFile(m),
    ns4E2VersionedDraftFile: ns4.ns4E2VersionedDraftFile(m, 2),
    ns4E2ImpactReportFile: ns4.ns4E2ImpactReportFile(m),
    ns4E3DraftFile: ns4.ns4E3DraftFile(m),
    ns4AccessMatrixFile: ns4.ns4AccessMatrixFile(m),
    ns4E4DraftFile: ns4.ns4E4DraftFile(m),
    ns4E4PlanDraftFile: ns4.ns4E4PlanDraftFile(m),
    ns4E4EntityDraftFile: ns4.ns4E4EntityDraftFile(m, 'Pet'),
    ns4E4RelationshipBindingsDraftFile: ns4.ns4E4RelationshipBindingsDraftFile(m),
    ns4OntologyEntityFile: ns4.ns4OntologyEntityFile(m, 'Pet'),
    ns4OntologyIndexFile: ns4.ns4OntologyIndexFile(m),
    ns4E5DraftFile: ns4.ns4E5DraftFile(m),
    ns4E5ApprovedFile: ns4.ns4E5ApprovedFile(m),
    ns4RulesFile: ns4.ns4RulesFile(m),
    ns4E6DraftFile: ns4.ns4E6DraftFile(m),
    ns4E6ApprovedFile: ns4.ns4E6ApprovedFile(m),
    ns4CompositionFile: ns4.ns4CompositionFile(m),
    ns4E7PlanDraftFile: ns4.ns4E7PlanDraftFile(m),
    ns4E7UseCaseDraftFile: ns4.ns4E7UseCaseDraftFile(m, 'createPet'),
    ns4E7ValidationReportFile: ns4.ns4E7ValidationReportFile(m),
    ns4UseCaseFile: ns4.ns4UseCaseFile(m, 'createPet'),
    ns4UseCaseIndexFile: ns4.ns4UseCaseIndexFile(m),
    ns4WorkflowFile: ns4.ns4WorkflowFile(m, 'petLifecycle'),
    ns4WorkflowIndexFile: ns4.ns4WorkflowIndexFile(m),
    ns4E8SkeletonDraftFile: ns4.ns4E8SkeletonDraftFile(m),
    ns4E8WorkspaceDraftFile: ns4.ns4E8WorkspaceDraftFile(m, 'catalog'),
    ns4E8ValidationReportFile: ns4.ns4E8ValidationReportFile(m),
    ns4WorkspaceFile: ns4.ns4WorkspaceFile(m, 'catalog'),
    ns4WorkspaceModelFile: ns4.ns4WorkspaceModelFile(m),
    ns4OperationFile: ns4.ns4OperationFile(m, 'browseCatalog'),
    ns4SiteMapFile: ns4.ns4SiteMapFile(m),
    ns4ClassicContractFile: ns4.ns4ClassicContractFile(m, 'catalog', 'catalogList'),
    ns4E10ValidationReportFile: ns4.ns4E10ValidationReportFile(m),
    ns4L5ConfigFile: ns4.ns4L5ConfigFile(),
    ns4TodoFrontendFile: ns4.ns4TodoFrontendFile(m),
    ns4TodoBackendFile: ns4.ns4TodoBackendFile(m),
    ns4ProcessFile: ns4.ns4ProcessFile(m),
    ns4JourneyFile: ns4.ns4JourneyFile(m, 'buyProduct'),
    ns4JourneyIndexFile: ns4.ns4JourneyIndexFile(m),
    ns4L5ProjectFile: ns4.ns4L5ProjectFile(102047),
  };
  const exportedFileBuilders = Object.keys(ns4).filter(name => name.endsWith('File') && typeof (ns4 as Record<string, unknown>)[name] === 'function');
  for (const name of exportedFileBuilders) {
    assert.ok(built[name], `builder ${name} missing from the shortName sweep`);
  }
  for (const [name, info] of Object.entries(built)) {
    assert.equal(info.shortName.includes('.'), false, `${name} shortName=${info.shortName}`);
  }
  assert.equal(built.ns4ClassicContractFile.shortName, 'catalog--catalogList');
  assert.equal(built.ns4E2VersionedDraftFile.shortName, 'e2-journeys-draft-v2');
  assert.equal('ns4L5PublishConfFile' in ns4, false);
  assert.equal('writeNs4L5PublishExample' in ns4, false);
});
