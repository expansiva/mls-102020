/// <mls fileReference="_102020_/l2/aura/services/serviceGenome.test.ts" enhancement="_blank" />
// The knobs of the genome, as guards on the source.
//
// The service is a Lit component wired to the live stor, the l3 file and the preview, so there is no
// honest way to run it here. What CAN be pinned down is the chain that decided whether a knob is
// operable — and that chain is what failed: the layout and molecules knobs were dimmed and
// unclickable on a perfectly normal project, for a reason none of them was about.
//
// THE DEFECT, ONCE: `_trySetActualModule` only sets `mls.actualModule` when the folder's first
// segment is in the project's module list, and that list was read from `l2/project.js` ->
// `projectConfig.modules`, which is `[]` in every real project (the modules live in
// `l5/project.json`, where the Module knob of serviceProject reads them). With no module,
// `isPageFile` answers false for EVERY folder, `_isPageContext` goes false, and `_renderKnobItem`
// paints both knobs `opacity-30 pointer-events-none`. Two services, two sources, one empty by
// construction.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { routeForSource, sourceOfPageFile } from '/_102020_/l2/aura/helpers/pageRoutes.js';

const SERVICES = fileURLToPath(new URL('.', import.meta.url));
const GENOME = readFileSync(`${SERVICES}serviceGenome.ts`, 'utf8');
const PROJECT = readFileSync(`${SERVICES}serviceProject.ts`, 'utf8');

/** The body of a method, from its signature to the next one at the same indentation. */
function methodOf(source: string, signature: string): string {
  const start = source.indexOf(signature);
  assert.notEqual(start, -1, `the scan found ${signature}`);
  const end = source.indexOf('\n    private ', start + signature.length);
  return source.slice(start, end === -1 ? source.length : end);
}

test('the module list comes from the SAME file the Module knob reads', () => {
  // Not "from project.json" as a string match: what matters is that both services ask the same
  // loader, so a project that fills one in is never empty for the other.
  const loader = methodOf(GENOME, 'private async _loadModuleNames');
  assert.match(loader, /getConfigProject\(project\)/u, 'the l5 config is the source');
  assert.match(loader, /moduleName/u, 'it reads the field project.json actually writes');
  assert.match(PROJECT, /getConfigProject\(project\)/u, 'and it is the Module knob’s source too');
});

test('the old source stays as a FALLBACK, not as the answer', () => {
  const loader = methodOf(GENOME, 'private async _loadModuleNames');
  const viaConfig = loader.indexOf('getConfigProject');
  const viaModule = loader.indexOf('/l2/project.js');
  assert.notEqual(viaModule, -1, 'the old source is still read');
  assert.ok(viaConfig < viaModule, 'the l5 config is asked first');
});

test('an empty answer is not cached — a config still loading has to be asked again', () => {
  const loader = methodOf(GENOME, 'private async _loadModuleNames');
  const cacheAt = loader.indexOf('this._moduleNamesProject = project');
  const guardAt = loader.indexOf('if (!names.length)');
  assert.notEqual(cacheAt, -1);
  assert.ok(guardAt !== -1 && guardAt < cacheAt, 'the empty case returns before the cache is written');
});

test('the project is read the same way everywhere in the service', () => {
  // `getAuraState().actualProject` is written by the KNOBS and is empty until someone goes through
  // one; `mls.actualProject` is the platform's own. Reading only the first is how the layout knob
  // could stay off with the config sitting right there.
  for (const signature of ['private async _loadProjectConfig', 'private async _loadModuleNames']) {
    assert.match(methodOf(GENOME, signature), /getAuraState\(\)\.actualProject \|\| mls\.actualProject/u, signature);
  }
});

test('the layout knob never gives up in silence', () => {
  const init = methodOf(GENOME, 'private async _initLayoutKnob');
  // It used to `return` on an empty list, leaving whatever config was there — the disabled one, with
  // no word about it.
  assert.match(init, /DISABLED_CONFIG\('layout', config \? 'offNoLayouts' : 'offNoProject'\)/u);
  assert.match(init, /console\.warn/u);
});

test('the molecules knob loads the molecule project before scanning the stor', () => {
  const changed = methodOf(GENOME, 'private async _onPreviewSelectedElementChanged');
  assert.match(changed, /await this\._ensureMoleculesLoaded\(\)/u);
  assert.match(methodOf(GENOME, 'private async _ensureMoleculesLoaded'), /loadProjectInfoIfNeeded\(MOLECULES_PROJECT\)/u);
  // And the three causes are three sentences: only one of them is about the element.
  for (const reason of ['offNoSelection', 'offNotAMolecule', 'offNoGroupMolecules']) {
    assert.ok(changed.includes(reason), reason);
  }
});

test('every reason a knob can give has words in all three catalogs', () => {
  const reasons = [...GENOME.matchAll(/'(off[A-Z]\w*)'/gu)].map((match) => match[1]);
  assert.ok(reasons.length >= 5, 'the scan found the reasons');
  const catalogs = GENOME.split('const message_en')[1].split('/// **collab_i18n_end**')[0];
  for (const reason of new Set(reasons)) {
    const declared = catalogs.split(`${reason}:`).length - 1;
    assert.equal(declared, 3, `${reason} is declared in en, pt and es`);
  }
});

test('the diagnosis prints the whole chain, not the step that gave up', () => {
  // The reason this exists: a warning at the point of failure says nothing about the step before it,
  // and when the failure is upstream (no project, no file in the l3) it does not fire at all.
  const diagnose = methodOf(GENOME, 'private async _diagnose');
  for (const field of ['mls.actualProject', 'mls.actualModule', 'page in context', 'LAYOUT knob', 'MOLECULES knob']) {
    assert.ok(diagnose.includes(field), field);
  }
  assert.match(GENOME, /auraGenomeDiagnose/u, 'and it can be asked for from the console');
});

// ── The selection moved surface (2026-09-11) ────────────────────────────────
//
// The molecule knob was born reading `previewL3.selectedTagName`, written by the L3 preview
// component. The selection now happens IN THE APP: the in-place editor publishes
// `aura.edit.selection` and nobody writes the old key any more — so the knob sat disabled, not
// because the element was not a molecule but because nothing ever told it anything was selected.

test('the genome listens to BOTH selection channels, and drops both on the way out', () => {
  const connected = methodOf(GENOME, 'async connectedCallback');
  for (const key of ["'previewL3.selectedTagName'", "'aura.edit.selection'"]) {
    assert.ok(connected.includes(`subscribe(${key}, this)`), `subscribes ${key}`);
  }
  const disconnected = GENOME.slice(GENOME.indexOf('disconnectedCallback()'), GENOME.indexOf('async firstUpdated'));
  for (const key of ["'previewL3.selectedTagName'", "'aura.edit.selection'"]) {
    assert.ok(disconnected.includes(`unsubscribe(${key}, this)`), `unsubscribes ${key}`);
  }
});

test('both channels reach the SAME handler — one place decides whether the knob is on', () => {
  const handler = GENOME.slice(GENOME.indexOf('handleIcaStateChange('), GENOME.indexOf('// ─── Layout init'));
  assert.equal(handler.split('_onPreviewSelectedElementChanged').length - 1, 2, 'both call it');
  // And the studio channel carries more than a tag: the file and the occurrence are what the swap
  // needs, so they are kept instead of being reduced to the tag.
  assert.match(handler, /this\._studioSelection = selection/u);
});

test('the swap addresses ONE occurrence, in the shape the replacer already parses', () => {
  const selector = methodOf(GENOME, 'private _selectorForSwap');
  assert.match(selector, /nth-of-type\(\$\{studio\.occurrence \+ 1\}\)/u);
  // The old channel keeps its own selector: it has a real DOM path and there is nothing to improve.
  assert.match(selector, /getState\('previewL3\.selectedElement'\)/u);
});

test('the swap writes the file the editor resolved, not the one open in the l3', () => {
  const changed = methodOf(GENOME, 'private async _onMoleculesChanged');
  assert.match(changed, /studio\?\.file/u, 'the studio answer comes first');
  assert.match(changed, /_getActual3File\(\)/u, 'and the l3 route is the fallback');
});

// ── Changing the page had to change the page IN THE APP (2026-09-11) ────────
//
// `_openPage` opened the file in the l3/l4 editors and stopped there: the editors changed and the app
// on screen stayed on whatever it was rendering. Two different things were being called "open the
// page". The app navigates by URL, and the route of each page is declared in `l5/config.json` under
// `projects[<id>].modules[].frontend.pages[]`, keyed by the very file the knob holds.

/** The real shape, from mls-102047/l5/config.json (trimmed to what is read). */
const CONFIG = {
  projects: {
    '102047': {
      modules: [{
        moduleId: 'controleChamados',
        basePath: '/controleChamados',
        frontend: {
          layer: 'l2',
          pages: [
            {
              pageId: 'commentOpenTicket',
              route: '/controleChamados/commentOpenTicket/:ticketId?',
              source: 'l2/controleChamados/web/desktop/page11/commentOpenTicket.ts',
            },
            {
              pageId: 'commentOpenTicket-page21',
              route: '/controleChamados/commentOpenTicket-page21/:ticketId?',
              source: 'l2/controleChamados/web/desktop/page21/commentOpenTicket.ts',
            },
            {
              pageId: 'ticketCatalogue',
              route: '/controleChamados/ticketCatalogue',
              source: 'l2/controleChamados/web/desktop/page11/ticketCatalogue.ts',
            },
          ],
        },
      }],
    },
  },
};

test('the route of a page comes from its FILE, so a variation is not the same page', () => {
  assert.equal(
    routeForSource(CONFIG, 102047, 'l2/controleChamados/web/desktop/page11/commentOpenTicket.ts'),
    '/controleChamados/commentOpenTicket',
  );
  // Same name, different variation, different screen — matching by name would open the wrong one.
  assert.equal(
    routeForSource(CONFIG, 102047, 'l2/controleChamados/web/desktop/page21/commentOpenTicket.ts'),
    '/controleChamados/commentOpenTicket-page21',
  );
});

test('route parameters are dropped: the knob asks for the screen, not for a record', () => {
  assert.equal(
    routeForSource(CONFIG, 102047, 'l2/controleChamados/web/desktop/page11/ticketCatalogue.ts'),
    '/controleChamados/ticketCatalogue',
    'a route with no parameter is untouched',
  );
  assert.equal(routeForSource(CONFIG, 102047, 'l2/controleChamados/web/desktop/page11/commentOpenTicket.ts').includes(':'), false);
});

test('the key is built the same way on both sides', () => {
  // The service asks with `sourceOfPageFile(file)` and the config writes `source`: one function, so
  // the two spellings cannot drift apart.
  assert.equal(
    sourceOfPageFile({ folder: 'controleChamados/web/desktop/page11', shortName: 'ticketCatalogue' }),
    'l2/controleChamados/web/desktop/page11/ticketCatalogue.ts',
  );
  assert.match(GENOME, /routeForSource\(config, project, sourceOfPageFile\(file\)\)/u);
});

test('a file the config does not declare has no route, and says so by staying empty', () => {
  assert.equal(routeForSource(CONFIG, 102047, 'l2/controleChamados/web/desktop/page11/ghost.ts'), '');
  assert.equal(routeForSource(CONFIG, 999999, 'l2/controleChamados/web/desktop/page11/ticketCatalogue.ts'), '');
  assert.equal(routeForSource(null, 102047, 'x'), '');
  assert.equal(routeForSource({ projects: {} }, 102047, 'x'), '');
});

test('the navigation itself is the shell’s, not a second copy of it', () => {
  // Copying pushState/popstate/activateTab here would be a second implementation of the shell's own
  // routing, and the two would drift. The apps menu calls `openProgramUnified`; so does this.
  const navigate = methodOf(GENOME, 'private async _navigateApp');
  assert.match(navigate, /openProgramUnified/u);
  assert.match(navigate, /_102033_\/l2\/cbe\/runtimeMessagesEnvironment/u);
  assert.match(methodOf(GENOME, 'private async _openPage'), /await this\._navigateApp\(file\)/u);
});

test('a swap that fails says what the replacer said', () => {
  const changed = methodOf(GENOME, 'private async _onMoleculesChanged');
  assert.match(changed, /result\.error \|\| 'Could not replace the molecule in the source\.'/u);
  assert.match(changed, /console\.warn/u);
});
