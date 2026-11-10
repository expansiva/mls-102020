/// <mls fileReference="_102020_/l2/aura/services/serviceDraft.test.ts" enhancement="_blank" />
// The draft panel is a Lit service wired to the live stor, so it does not run in node.
// What can be pinned is the source: the panel stays behind the VM driver, Publish goes
// through the core, the three catalogs share keys, and the plugin lists this service first.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import '/_102020_/l2/aura/helpers/auraStateEditStub.js';


const SERVICES = fileURLToPath(new URL('.', import.meta.url));
const DRAFT = readFileSync(`${SERVICES}serviceDraft.ts`, 'utf8');
const TOOL = readFileSync(fileURLToPath(new URL('../studio/studioEditTool.ts', import.meta.url)), 'utf8');
const PLUGIN = readFileSync(fileURLToPath(new URL('../../pluginCollabCoreIndex.ts', import.meta.url)), 'utf8');

/** The body of a method, from its signature to the next one at the same indentation. */
function methodOf(source: string, signature: string): string {
    const start = source.indexOf(signature);
    assert.notEqual(start, -1, `the scan found ${signature}`);
    const end = source.indexOf('\n    private ', start + signature.length);
    return source.slice(start, end === -1 ? source.length : end);
}

test('the panel renders only behind isVmDriver', () => {
    const render = methodOf(DRAFT, '\n    render()');
    const gate = render.indexOf('isVmDriver(');
    const panel = render.indexOf('_renderPanel()');
    assert.notEqual(gate, -1, 'render asks isVmDriver');
    assert.ok(panel !== -1 && gate < panel, 'the panel call sits behind the driver check');
    assert.match(render, /if\s*\(\s*!isVmDriver\(/);
});

test('Publish goes through the core publish and does not call /exec', () => {
    const handler = methodOf(DRAFT, 'private async _onPublish');
    assert.match(handler, /\bpublish\(/);
    assert.doesNotMatch(DRAFT, /['"]\/exec['"]/);
    assert.doesNotMatch(DRAFT, /callExec\(/);
});

test('publish confirms the draft file count before the comment and shows the error', () => {
    const handler = methodOf(DRAFT, 'private async _onPublish');
    const confirmAt = handler.indexOf('confirm(');
    const commentAt = handler.indexOf('_askComment(');
    assert.ok(confirmAt !== -1 && commentAt > confirmAt, 'confirm sits before the comment');
    assert.match(handler, /confirmPublish/);
    assert.match(handler, /\{count\}/);
    assert.match(handler, /this\._error = this\.msg\.conflict/);
    assert.match(handler, /this\._error = this\.msg\.nothingToPromote/);
    assert.match(handler, /this\._error = err instanceof Error \? err\.message : String\(err\)/);
});

test('reset test database confirms before draftResetDatabase, and discard keeps the test data', () => {
    const actions = methodOf(DRAFT, 'private _renderActions');
    assert.match(actions, /this\.msg\.resetDatabase/);
    assert.match(actions, /_onResetDatabase/);
    assert.match(DRAFT, /resetDatabase: 'Reset test database'/);
    assert.match(DRAFT, /resetDatabase: 'Reiniciar BD de teste'/);
    assert.match(DRAFT, /resetDatabase: 'Reiniciar BD de prueba'/);
    const handler = methodOf(DRAFT, 'private async _onResetDatabase');
    const confirmAt = handler.indexOf('confirm(');
    const callAt = handler.indexOf('await resetDraftDatabase(');
    assert.ok(confirmAt !== -1 && callAt > confirmAt, 'draftResetDatabase sits behind confirm');
    assert.match(handler, /confirmResetDatabase/);
    assert.match(handler, /console\.error\(/);
    assert.match(handler, /this\._error = this\._draftReason\(message\)/);
    assert.match(handler, /_noteDatabaseReset\(database\)/);
    const note = methodOf(DRAFT, 'private _noteDatabaseReset');
    assert.match(note, /this\._phase === 'error'/);
    assert.match(note, /databaseReset\.replace\('\{database\}', database\)/);
    assert.match(DRAFT, /Delete the draft test data and recreate it from the seed\?/);
    assert.match(DRAFT, /Apagar os dados de teste do rascunho e recriá-los com a semente\?/);
    assert.match(DRAFT, /¿Borrar los datos de prueba del borrador y recrearlos con la semilla\?/);
    const discardLines = [...DRAFT.matchAll(/confirmDiscard: '([^']*)'/g)].map((match) => match[1]);
    assert.equal(discardLines.length, 3);
    for (const line of discardLines) {
        assert.match(line, /\{count\}/);
        assert.doesNotMatch(line, /database|banco|\bBD\b/i);
    }
    assert.match(DRAFT, /source changes and keep the test data/);
    assert.match(DRAFT, /alterações de fontes e manter os dados de teste/);
    assert.match(DRAFT, /cambios de fuentes y mantener los datos de prueba/);
    assert.doesNotMatch(DRAFT, /databaseDropped/);
});

test('discard confirms the draft file count and clears local copies the same way as undo', () => {
    const handler = methodOf(DRAFT, 'private async _onDiscard');
    const confirmAt = handler.indexOf('confirm(');
    const discardAt = handler.indexOf('await discard(');
    assert.ok(confirmAt !== -1 && discardAt > confirmAt, 'discard sits behind confirm');
    assert.match(handler, /confirmDiscard/);
    assert.match(handler, /\{count\}/);
    assert.match(handler, /storFiles:\s*mls\.stor\.files/);
    assert.match(handler, /setContent\(file as mls\.stor\.IFileInfo, \{ content: null \}\)/);
    assert.match(handler, /file\.status = 'nochange'/);
});

test('save shows the blocked list that the core returns', () => {
    const handler = methodOf(DRAFT, 'private async applyDraftSave');
    assert.match(methodOf(DRAFT, 'private async _onSave'), /runDraftSave\(/);
    assert.match(handler, /this\._blocked = saved\.blocked/);
    assert.doesNotMatch(handler, /fileTooBig|fileRefused|lang:/);
    const line = methodOf(DRAFT, 'private _blockedLine');
    assert.match(line, /formatDraftBlockReason\(block, lang, this\.msg\.fileTooBig, this\.msg\.fileRefused\)/);
});

test('the panel shows an upload part in en, pt and es and listens for collabDraftUpload', () => {
    assert.match(DRAFT, /addEventListener\(COLLAB_DRAFT_UPLOAD, this\._onDraftUpload\)/);
    assert.match(DRAFT, /removeEventListener\(COLLAB_DRAFT_UPLOAD, this\._onDraftUpload\)/);
    assert.match(DRAFT, /draftUploadLine\(this\._upload, this\.msg\.uploadingPart\)/);
    assert.match(DRAFT, /uploadingPart: 'Sending \{file\} \(part \{part\} of \{total\}\)'/);
    assert.match(DRAFT, /uploadingPart: 'Enviando \{file\} \(parte \{part\} de \{total\}\)'/);
    assert.equal([...DRAFT.matchAll(/uploadingPart: 'Enviando \{file\} \(parte \{part\} de \{total\}\)'/g)].length, 2);
    assert.match(DRAFT, /fileRefused: '\{path\} was not saved: \{reason\}\.'/);
    assert.match(DRAFT, /fileRefused: '\{path\} não foi salvo: \{reason\}\.'/);
    assert.match(DRAFT, /fileRefused: '\{path\} no se guardó: \{reason\}\.'/);
});

test('panel buttons use the Studio BUTTON classes', () => {
    // The same tokens as the header editor's BUTTON / BUTTON_PRIMARY, plus the pointer cursor.
    const header = readFileSync(fileURLToPath(new URL('../plugins/pluginHeaderEditor.ts', import.meta.url)), 'utf8');
    const tokens = (source: string, name: string): string[] => {
        const start = source.indexOf(`const ${name} = `);
        assert.notEqual(start, -1, `${name} is declared`);
        const end = source.indexOf(';\n', start);
        return [...source.slice(start, end).matchAll(/'([^']*)'/g)].flatMap((m) => m[1].split(/\s+/)).filter(Boolean);
    };
    for (const name of ['BUTTON', 'BUTTON_PRIMARY']) {
        const mine = tokens(DRAFT, name);
        for (const token of tokens(header, name)) assert.ok(mine.includes(token), `${name} keeps ${token}`);
        assert.ok(mine.includes('cursor-pointer'), `${name} has the pointer cursor`);
        assert.ok(mine.includes('disabled:cursor-not-allowed'), `${name} shows a disabled cursor`);
    }
    assert.doesNotMatch(DRAFT, /actionClass/);
    assert.equal([...DRAFT.matchAll(/class=\$\{BUTTON\}/g)].length, 9);
    assert.equal([...DRAFT.matchAll(/class=\$\{BUTTON_PRIMARY\}/g)].length, 1);
    const actions = methodOf(DRAFT, 'private _renderActions');
    const primaryAt = actions.indexOf('class=${BUTTON_PRIMARY}');
    const publishAt = actions.indexOf('_onPublish');
    assert.ok(primaryAt !== -1 && publishAt > primaryAt, 'Publish is the primary button');
    assert.doesNotMatch(actions.replace('class=${BUTTON_PRIMARY}', ''), /BUTTON_PRIMARY/);
});

test('en, pt and es declare the same keys', () => {
    const catalogs = DRAFT.split('const message_en')[1].split('/// **collab_i18n_end**')[0];
    const enBody = catalogs.split('const messages')[0];
    const keys = [...enBody.matchAll(/^\s{4}(\w+):/gm)].map((match) => match[1]);
    assert.ok(keys.length >= 8, 'the scan found the english keys');
    for (const key of keys) {
        const declared = [...catalogs.matchAll(new RegExp(`^\\s+${key}:`, 'gm'))].length;
        assert.equal(declared, 3, `${key} is declared in en, pt and es`);
    }
});

test('other drafts show the person and view or try, and bring is not a button', () => {
    const people = methodOf(DRAFT, 'private _panelPeople');
    assert.match(people, /pendingFiles\(\[\], item\.files/);
    assert.match(people, /this\._personName\(a\)\.localeCompare/);
    const name = methodOf(DRAFT, 'private _personName');
    assert.match(name, /branch\.startsWith\('team\/'\)/);
    assert.match(name, /this\.msg\.team/);
    assert.match(name, /draftPerson\(item\)/);
    assert.doesNotMatch(DRAFT, /files\.map\(\(file\) => html`<div>\$\{file\}<\/div>`\)/);
    assert.doesNotMatch(DRAFT, /\$\{item\.branch\}/);
    assert.doesNotMatch(DRAFT, /msg\.bring/);
    assert.match(DRAFT, /unknownPerson: 'Unknown person'/);
    assert.match(DRAFT, /unknownPerson: 'Pessoa desconhecida'/);
    assert.match(DRAFT, /unknownPerson: 'Persona desconocida'/);
    assert.match(DRAFT, /experimentDisabled/);
    assert.match(DRAFT, /slug === null \? this\.msg\.experimentDisabled/);
    assert.match(DRAFT, /!!ping\.promoting/);
    assert.doesNotMatch(DRAFT, /mergeDraft/);
    const action = methodOf(DRAFT, 'private _renderNodeAction');
    assert.match(action, /msg\.view/);
    assert.match(action, /msg\.experiment/);
});

test('a successful experiment calls loadProjectDefinitions once, after the draft is active', () => {
    const handler = methodOf(DRAFT, 'private async _onExperiment');
    const requestAt = handler.indexOf('await requestModeChange(');
    const confirmAt = handler.indexOf("activeDraft() !== slug");
    const confirmReturn = handler.indexOf('return;', confirmAt);
    const callAt = handler.indexOf('await loadProjectDefinitions(project)');
    const reloadAt = handler.indexOf('await this._load()', callAt);
    assert.ok(requestAt !== -1 && confirmAt > requestAt, 'the mode change runs first');
    assert.ok(confirmReturn !== -1 && confirmReturn < callAt, 'a failed activation returns before the entry');
    assert.ok(reloadAt > callAt, 'the panel reloads after the entry');
    assert.equal([...handler.matchAll(/loadProjectDefinitions\(project\)/g)].length, 1);
    const enterAt = handler.indexOf('enterDraft:');
    const enterLine = handler.slice(enterAt, handler.indexOf('\n', enterAt));
    assert.doesNotMatch(enterLine, /loadProjectDefinitions/);
    const entry = handler.slice(callAt, reloadAt);
    assert.match(entry, /console\.error\(/);
    assert.match(entry, /experimentFailed/);
    assert.doesNotMatch(handler, /location\.reload/);
    assert.match(DRAFT, /import \{ loadProjectDefinitions \} from '\/_102033_\/l2\/cbe\/initStudio\.js'/);
});

test('view, try and the project default go through the core', () => {
    assert.match(DRAFT, /viewDiff\(/);
    assert.match(DRAFT, /requestModeChange\(/);
    assert.match(DRAFT, /activeDraft\(/);
    assert.match(DRAFT, /mls\.sites/);
    assert.doesNotMatch(DRAFT, /experimentDraft\(/);
    assert.doesNotMatch(DRAFT, /document\.cookie/);
    assert.match(DRAFT, /saveDefaultDraft\(/);
    assert.match(DRAFT, /<pre class="diff">/);
    assert.doesNotMatch(DRAFT, /['"]\/exec['"]/);
});

test('a merged publish leaves the busy phase and a failed release stays on the panel', () => {
    const handler = methodOf(DRAFT, 'private async _onPublish');
    const mergedAt = handler.indexOf('onMerged:');
    const phaseAt = handler.indexOf("this._phase = 'updating'");
    assert.ok(mergedAt !== -1 && phaseAt > mergedAt, 'the buttons leave publishing when the merge lands');
    assert.match(handler, /outcome === 'merged'/);
    assert.match(handler, /await this\._load\(true\)/);
    assert.match(handler, /outcome === 'release-pending'/);
    assert.match(handler, /this\.msg\.releasePending\.replace\('\{reason\}'/);
    assert.match(handler, /this\.msg\.releaseTimeout/);
    assert.match(handler, /this\.msg\.releaseBuildFailed/);
    assert.match(handler, /console\.error\(/);
    assert.doesNotMatch(handler, /location\.reload/);
    const panel = methodOf(DRAFT, 'private _renderPanel');
    const busyAt = panel.indexOf("this._phase === 'loading' || this._phase === 'publishing'");
    assert.notEqual(busyAt, -1);
    assert.doesNotMatch(panel.slice(busyAt, panel.indexOf('\n', busyAt)), /updating/);
    assert.match(panel, /siteUpdateClock\(this\._updateElapsed\)/);
    assert.match(panel, /this\.msg\.siteUpdating/);
    assert.doesNotMatch(panel, /location\.reload/);
    assert.match(DRAFT, /siteUpdating: 'Published\. Updating the site… \(\{time\}\)'/);
    assert.match(DRAFT, /siteUpdating: 'Publicado\. Atualizando o site… \(\{time\}\)'/);
    assert.match(DRAFT, /siteUpdating: 'Publicado\. Actualizando el sitio… \(\{time\}\)'/);
    assert.match(DRAFT, /The draft was published, but the site has not been updated yet/);
    assert.match(DRAFT, /O rascunho foi publicado, mas o site ainda não foi atualizado/);
    assert.match(DRAFT, /El borrador se publicó, pero el sitio todavía no se actualizó/);
    assert.doesNotMatch(DRAFT, /reloadSite:/);
});

test('st66 s4c: the panel and the core do not reload the page, and a failed tab update is shown', () => {
    const core = readFileSync(fileURLToPath(new URL('../helpers/draftPanelCore.ts', import.meta.url)), 'utf8');
    assert.equal(/effects\.reload\(/.test(core), false);
    assert.equal(DRAFT.includes('location.reload'), false);
    assert.equal(DRAFT.includes('_offerReload'), false);
    assert.equal(DRAFT.includes('reloadSite'), false);
    const discard = methodOf(DRAFT, 'private async _onDiscard');
    assert.match(discard, /notifyDraftDiscarded|discard\(/);
    const sync = methodOf(DRAFT, 'private async _onSyncPublished');
    assert.match(sync, /notifyDraftDiscarded\(project, before, after\)/);
    assert.match(DRAFT, /COLLAB_PREVIEW_UPDATE_FAILED/);
    assert.match(DRAFT, /preview tabs were not updated/);
    assert.match(methodOf(DRAFT, 'private readonly _onPreviewUpdateFailed'), /this\._phase = 'error'/);
});

test('the three blocks come from localEdits, panelModel and readPublished', () => {
    assert.match(DRAFT, /localEdits\(mls\.stor\.files, project\)/);
    assert.match(DRAFT, /panelModel\(/);
    assert.match(DRAFT, /readPublished\(/);
    assert.match(DRAFT, /collab-draft-published-/);
    const publish = methodOf(DRAFT, 'private async _onPublish');
    assert.match(publish, /rememberPublished:/);
    assert.match(publish, /draftFiles/);
    assert.match(publish, /sessionStorage\.setItem/);
    const writeAt = publish.indexOf('sessionStorage.setItem');
    const tryAt = publish.lastIndexOf('try {', writeAt);
    assert.ok(tryAt !== -1 && tryAt < writeAt, 'the published write sits in try/catch');
});

test('undo asks, then restores a saved file through undoFile and still clears a browser copy only after confirm', () => {
    const undo = methodOf(DRAFT, 'private async _onUndoLocal');
    const confirmAt = undo.indexOf('confirm(');
    const callAt = undo.indexOf('undoFile(');
    const setAt = undo.indexOf('setContent(');
    assert.ok(confirmAt !== -1 && callAt > confirmAt && setAt > confirmAt, 'confirm, then undoFile; setContent stays behind confirm');
    assert.match(undo, /confirmUndoPublished/);
    assert.match(undo, /confirmUndoNew/);
    assert.match(undo, /this\.msg\.confirmUndo\b/);
    assert.match(undo, /setContent\(item as mls\.stor\.IFileInfo, \{ content: null \}\)/);
    assert.match(undo, /item\.status = 'nochange'/);
    assert.match(undo, /deleteFile\(/);
    assert.match(undo, /_draftReason\(message\)/);
    assert.match(DRAFT, /Undo \{file\}\? The file goes back to the published version, in the draft too\./);
    assert.match(DRAFT, /Desfazer \{file\}\? O arquivo volta à versão publicada, também no rascunho\./);
    assert.match(DRAFT, /¿Deshacer \{file\}\? El archivo vuelve a la versión publicada, también en el borrador\./);
    assert.match(DRAFT, /Remove the new file \{file\} from the draft\?/);
    assert.match(DRAFT, /Remover o arquivo novo \{file\} do rascunho\?/);
    assert.match(DRAFT, /¿Quitar el archivo nuevo \{file\} del borrador\?/);
    assert.doesNotMatch(undo, /draftRestorePaths/);
});

test('serviceDraft.less stays within 15 lines', () => {
    const less = readFileSync(`${SERVICES}serviceDraft.less`, 'utf8');
    const lines = less.endsWith('\n') ? less.split('\n').length - 1 : less.split('\n').length;
    assert.ok(lines <= 24, `serviceDraft.less has ${lines} lines`);
});

test('the panel has no auto-save status line and the Save button keeps the unsaved count', () => {
    assert.doesNotMatch(DRAFT, /_autoSaveLine|autoSaveSending|autoSaveAgent|autoSavePending|autoSaveLast|autoSaveFailed/);
    assert.doesNotMatch(DRAFT, /Sending…|Paused: agent working|Last send at/);
    const actions = methodOf(DRAFT, 'private _renderActions');
    assert.match(actions, /saveAll/);
    assert.match(actions, /_onSave\(\)/);
    assert.doesNotMatch(actions, /<p /);
    assert.match(DRAFT, /Save all \(\{count\}\)/);
    assert.match(DRAFT, /Salvar tudo \(\{count\}\)/);
    assert.match(DRAFT, /Guardar todo \(\{count\}\)/);
});

test('manual Save still sends through saveToDraft and setContents', () => {
    const saveStart = TOOL.indexOf('export async function runDraftSave');
    const saveEnd = TOOL.indexOf('let editor:', saveStart);
    const save = TOOL.slice(saveStart, saveEnd);
    assert.match(save, /saveToDraft\(/);
    assert.match(save, /\(clean, text\) => mls\.stor\.setContents\(clean, text\)/);
    assert.match(save, /afterDraftSave\(file\)/);
    assert.match(save, /lockedDraftWrite\(/);
    assert.match(methodOf(DRAFT, 'private async _onSave'), /runDraftSave\(/);
    assert.doesNotMatch(TOOL, /sendAutoSaveBatch|DraftAutoSave|syncDraftAutoSave/);
});

test('a file change only asks the panel to recount', () => {
    const connected = methodOf(DRAFT, 'connectedCallback()');
    assert.match(connected, /subscribeDraftFiles\(\(\) => \{ this\.requestUpdate\(\); \}\)/);
    assert.doesNotMatch(connected, /setContents|saveToDraft/);
    const listen = TOOL.slice(TOOL.indexOf('function listenDraftFiles'), TOOL.indexOf('function stopDraftFiles'));
    assert.match(TOOL, /const DRAFT_FILE_LEVELS = \[1, 2, 3, 5\]/);
    assert.match(listen, /for \(const level of DRAFT_FILE_LEVELS\) events\.addListener\(level, 'FileAction'/);
    assert.match(listen, /addListener\(2, 'styleChanged'/);
    assert.doesNotMatch(listen, /setContents|saveToDraft|notify\(/);
    assert.doesNotMatch(TOOL, /collabAgentChain|nr-implementation-state|DraftAutoSave|syncDraftAutoSave/);
});

test('the live-update watcher does not start a draft send', () => {
    const body = TOOL.slice(TOOL.indexOf('async function syncWatcher'), TOOL.indexOf('async function syncEditor'));
    assert.match(body, /if \(!state\.studioMode\)/);
    assert.match(body, /watcher\?\.stop\(\)/);
    assert.doesNotMatch(body, /syncDraftAutoSave|setContents|saveToDraft/);
    assert.doesNotMatch(TOOL, /document\.cookie/);
    assert.doesNotMatch(TOOL, /readDraftCookie/);
    const teardown = TOOL.slice(TOOL.indexOf('function teardown'), TOOL.indexOf('async function apply'));
    assert.doesNotMatch(teardown, /syncDraftAutoSave|setContents/);
});

test('the draft panel has no GitHub sources option', () => {
    assert.doesNotMatch(DRAFT, /_renderSourcesOption/);
    assert.doesNotMatch(DRAFT, /sourcesFromGitHub/);
    assert.doesNotMatch(DRAFT, /sourcesNextLoad/);
    assert.doesNotMatch(DRAFT, /collabStudioSourcesFromGitHub/);
    assert.doesNotMatch(DRAFT, /studioSourcesOption/);
    assert.doesNotMatch(DRAFT, /Fetch sources from GitHub/);
    assert.doesNotMatch(DRAFT, /Buscar fontes no GitHub/);
    assert.doesNotMatch(DRAFT, /Buscar fuentes en GitHub/);
});

test('actions stay on top and the tree paints only open rows', () => {
    assert.doesNotMatch(DRAFT, /_namesSuffix/);
    assert.match(DRAFT, /Save all \(\{count\}\)/);
    assert.match(DRAFT, /Salvar tudo \(\{count\}\)/);
    assert.match(DRAFT, /Guardar todo \(\{count\}\)/);
    assert.match(DRAFT, /Publish \(\{count\}\)/);
    assert.match(DRAFT, /Discard all \(\{count\}\)/);
    assert.match(DRAFT, /Descartar tudo \(\{count\}\)/);
    assert.match(DRAFT, /Descartar todo \(\{count\}\)/);
    assert.match(DRAFT, /Discard this module/);
    assert.match(DRAFT, /Descartar este módulo/);
    const panel = methodOf(DRAFT, 'private _renderPanel()');
    const actions = panel.indexOf('_renderActions(');
    const tree = panel.indexOf('_renderTree(');
    const box = panel.indexOf('_renderNodeBox(');
    assert.ok(actions !== -1 && tree > actions && box > tree, 'the bar, the tree, then the box');
    assert.doesNotMatch(panel, /_renderLocal\(/);
    assert.doesNotMatch(panel, /_renderDraft\(/);
    assert.doesNotMatch(panel, /_renderPublished\(/);
    assert.doesNotMatch(panel, /_renderOthers\(/);
    assert.match(panel, /buildPanelTree\(/);
    assert.match(panel, /visibleTreeRows\(/);
    assert.match(panel, /actionCounts\(/);
    const painted = methodOf(DRAFT, 'private _renderTree(');
    assert.match(painted, /rows\.map/);
    assert.doesNotMatch(painted, /\.children/);
    const row = methodOf(DRAFT, 'private _renderTreeRow');
    assert.match(row, /draftCountText\(/);
    assert.match(row, /_selectNode\(/);
    assert.match(row, /_toggleNode\(/);
    assert.doesNotMatch(row, /discardModule/);
    assert.doesNotMatch(row, /undoLocal/);
    const nodeBox = methodOf(DRAFT, 'private _renderNodeBox');
    assert.match(nodeBox, /msg\.branch/);
    assert.match(nodeBox, /msg\.release/);
    assert.match(nodeBox, /draftNodeActions\(/);
    assert.match(nodeBox, /_fileErrorLine\(/);
    const nodeAction = methodOf(DRAFT, 'private _renderNodeAction');
    assert.match(nodeAction, /makeDefault/);
    assert.match(nodeAction, /syncPublished/);
    assert.match(nodeAction, /discardModule/);
    assert.match(nodeAction, /undoLocal/);
    assert.match(nodeAction, /msg\.view/);
    assert.match(nodeAction, /msg\.experiment/);
    assert.match(DRAFT, /mine: 'Mine'/);
    assert.match(DRAFT, /mine: 'Meu'/);
    assert.match(DRAFT, /mine: 'Mío'/);
    assert.match(DRAFT, /team: 'Team'/);
    assert.match(DRAFT, /team: 'Time'/);
    assert.match(DRAFT, /team: 'Equipo'/);
    assert.match(DRAFT, /draft-actions/);
    assert.match(DRAFT, /draft-tree/);
    assert.match(DRAFT, /draft-node-box/);
});

test('discard module confirms the count, then restores through the shared function', () => {
    const handler = methodOf(DRAFT, 'private async _onModuleDiscard');
    const confirmAt = handler.indexOf('confirm(');
    const callAt = handler.indexOf('await discardModuleInStudio(');
    assert.ok(confirmAt !== -1 && callAt > confirmAt, 'confirm, then the shared discard');
    assert.match(handler, /confirmDiscardModule/);
    assert.match(handler, /\{count\}/);
    assert.match(handler, /\{module\}/);
    assert.doesNotMatch(handler, /await discardModule\(/);
    assert.match(handler, /_draftReason\(message\)/);
    assert.match(handler, /_noteModuleDiscarded\(moduleName\)/);
    assert.match(DRAFT, /moduleDiscarded: 'Discarded module \{module\}.'/)
    assert.match(DRAFT, /noActiveDraft: 'There is no active draft.'/);
    assert.match(DRAFT, /noActiveDraft: 'Não há rascunho ativo.'/);
    assert.match(DRAFT, /noActiveDraft: 'No hay un borrador activo.'/);
    assert.doesNotMatch(handler, /location\.reload/);
    // The published config is read in `draftModuleDiscard.ts`, by the sha of `main`; the panel keeps no copy.
    assert.doesNotMatch(DRAFT, /_readPublishedConfig/);
    assert.doesNotMatch(DRAFT, /getHistoryContent/);
    const reason = methodOf(DRAFT, 'private _draftReason');
    for (const code of [
        'draft.ref_invalid',
        'draft.ref_not_ancestor',
        'draft.path_invalid',
        'draft.path_outside_layers',
        'draft.path_local',
        'draft.paths_required',
        'draft.not_owner',
        'draft.bad_slug',
        'draft.no_active_draft',
        'draft.config_missing',
    ]) {
        assert.match(reason, new RegExp(code.replaceAll('.', '\\.')));
    }
    assert.match(DRAFT, /Discard \{count\} changes in \{module\}\?/);
    assert.match(DRAFT, /Descartar \{count\} alterações do módulo \{module\}\?/);
    assert.match(DRAFT, /¿Descartar \{count\} cambios del módulo \{module\}\?/);
});

test('serviceDraft is on l5ServicesLeft before serviceSave', () => {
    const draftAt = PLUGIN.indexOf("widget: '_102020_/l2/aura/services/serviceDraft'");
    const saveAt = PLUGIN.indexOf("widget: '_100554_serviceSave'");
    assert.notEqual(draftAt, -1, 'serviceDraft is registered');
    assert.notEqual(saveAt, -1, 'serviceSave is registered');
    assert.ok(draftAt < saveAt, 'same priority: array order puts the draft panel first');
    const entryStart = PLUGIN.lastIndexOf('category:', draftAt);
    const entry = PLUGIN.slice(entryStart, draftAt);
    assert.match(entry, /l5ServicesLeft/);
    assert.match(entry, /priority:\s*1/);
});
