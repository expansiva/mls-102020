/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelOpenDropsComplements.test.ts" enhancement="_blank" />
// st71 s0b — measure only. 5 new page rows → what opening the draft panel calls
// (loadPanel, rememberOpenedDraftText, collectEditedFiles) vs the only path
// that drops .less/.test.ts/.defs.ts and keeps .ts/.html.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';
import { applyDraftFiles, type DraftFilesDeps } from '/_102033_/l2/cbe/studioDraftFiles.js';
import { getBaseTemplate } from '/_102029_/l2/libCommom.js';
import { removeNewStorFilesWithTemplateDefault } from '/_102027_/l2/libStor.js';
import {
  collectEditedFiles,
  loadPanel,
  rememberOpenedDraftText,
  type FetchImpl,
  type IPanelStorFile,
} from '/_102020_/l2/aura/helpers/draftPanelCore.js';

const PROJECT = 102071;
const LEVEL = 2;
const FOLDER = 'st71fixture';
const NAME = 'rastreioD';
const EXTENSIONS = ['.ts', '.html', '.less', '.test.ts', '.defs.ts'] as const;

interface IPageFile extends IPanelStorFile {
  versionRef?: string;
  getContent: () => Promise<string | null>;
}

function fileKey(file: { project: number; level?: number; folder?: string; shortName?: string; extension?: string }): string {
  return [file.project, file.level, file.folder, file.shortName, file.extension].join('|');
}

function jsonResponse(body: unknown, status = 200): { status: number; json: () => Promise<unknown> } {
  return { status, json: async () => body };
}

function customPageSource(extension: string): string {
  if (extension === '.ts') {
    return `/// <mls fileReference="_${PROJECT}_/l2/${FOLDER}/${NAME}.ts" enhancement="_102027_/l2/enhancementLit.ts"/>
import { CollabPageElement } from '/_102027_/l2/collabPageElement.js';
import { customElement } from 'lit/decorators.js';
import { globalState, initState, setState } from '/_102027_/l2/collabState.js';
`;
  }
  return `<page-rastreio-d></page-rastreio-d>`;
}

async function sourceFor(extension: string): Promise<string> {
  if (extension === '.ts' || extension === '.html') return customPageSource(extension);
  const enhancement = extension === '.less' ? 'enhancementStyle' : '_blank';
  return getBaseTemplate({ project: PROJECT, folder: FOLDER, shortName: NAME, extension }, enhancement);
}

interface MountedRows {
  files: Record<string, IPageFile>;
  extensionsOf: () => string[];
  setDriver: (getDefaultDriver: (project: number) => Promise<{ driverVersion?: string }>) => void;
  restore: () => void;
}

async function mountFiveNewRows(): Promise<MountedRows> {
  const host = globalThis as { mls?: unknown };
  const previousMls = host.mls;
  const files: Record<string, IPageFile> = {};
  const stored = new Map<IPageFile, string>();

  const attachContent = (file: IPageFile): void => {
    file.getContent = async () => (file.inLocalStorage ? stored.get(file) ?? null : null);
  };

  for (const extension of EXTENSIONS) {
    const file: IPageFile = {
      project: PROJECT,
      level: LEVEL,
      folder: FOLDER,
      shortName: NAME,
      extension,
      status: 'new',
      inLocalStorage: true,
      versionRef: '0',
      getContent: async () => null,
    };
    stored.set(file, await sourceFor(extension));
    attachContent(file);
    files[fileKey(file)] = file;
  }

  const mls = {
    actualProject: PROJECT,
    istrace: false,
    events: { fireFileAction: () => {} },
    editor: {
      models: {},
      getKeyModel: () => 'k',
    },
    common: {
      tripleslash: {
        parseXMLTripleSlash: (line: string) => {
          const match = /enhancement="([^"]*)"/u.exec(line);
          return match ? { variables: { enhancement: match[1] } } : undefined;
        },
      },
    },
    stor: {
      files,
      getKeyToFile: (info: { project: number; level: number; folder: string; shortName: string; extension: string }) => fileKey(info),
      getKeyToFiles: (project: number, level: number, name: string, folder: string, extension: string) =>
        [project, level, folder, name, extension].join('|'),
      localStor: {
        setContent: async (file: IPageFile, value: { content: string | null }) => {
          if (value.content == null) {
            stored.delete(file);
            file.inLocalStorage = false;
            return true;
          }
          stored.set(file, value.content);
          file.inLocalStorage = true;
          return true;
        },
      },
      others: undefined as { getDefaultDriver?: (project: number) => Promise<{ driverVersion?: string }> } | undefined,
    },
  };
  host.mls = mls;

  const keysOf = (): string[] => Object.keys(files).filter((key) => files[key]).sort();
  const extensionsOf = (): string[] => keysOf().map((key) => key.split('|').pop() ?? '').sort();
  return {
    files,
    extensionsOf,
    setDriver(getDefaultDriver) { mls.stor.others = { getDefaultDriver }; },
    restore() { host.mls = previousMls; },
  };
}

interface SaveHost {
  showLoader(loader: boolean): void;
  templateSweepApplies(): Promise<boolean>;
  myMessage: { msgTotFile: string };
  totFileSize: string;
  scenery: string;
  initInfoProject(): Promise<void>;
  setInfos(): Promise<void>;
}

function serviceSaveBody(signature: string): string {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../../../mls-100554/l2/serviceSave.ts'), 'utf8');
  const start = source.indexOf(signature);
  if (start < 0) throw new Error(signature + ' not found in serviceSave.ts');
  const bodyStart = source.indexOf('{', start);
  let depth = 0;
  let end = bodyStart;
  for (; end < source.length; end++) {
    const ch = source[end];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        end++;
        break;
      }
    }
  }
  return source.slice(bodyStart, end);
}

function transpileSave(wrapped: string, fileName: string): string {
  const transpiled = ts.transpileModule(wrapped, {
    compilerOptions: { target: ts.ScriptTarget.ES2022 },
    fileName,
    reportDiagnostics: true,
  });
  const errors = (transpiled.diagnostics ?? []).filter((item) => item.category === ts.DiagnosticCategory.Error);
  if (errors.length > 0) {
    throw new Error(errors.map((item) => ts.flattenDiagnosticMessageText(item.messageText, '\n')).join('\n'));
  }
  return transpiled.outputText;
}

function loadServiceSave(): {
  init: (this: SaveHost, isSetInfoProject?: boolean) => Promise<void>;
  templateSweepApplies: (this: SaveHost) => Promise<boolean>;
} {
  const initBody = serviceSaveBody('private async init(isSetInfoProject: boolean = true)');
  const appliesBody = serviceSaveBody('private async templateSweepApplies(): Promise<boolean>');
  const wrapped = `async function templateSweepApplies() ${appliesBody}
async function init(isSetInfoProject = true) ${initBody}
return { init, templateSweepApplies };`;
  const output = transpileSave(wrapped, 'serviceSave.init.ts');
  const factory = new Function('removeNewStorFilesWithTemplateDefault', output);
  return factory(removeNewStorFilesWithTemplateDefault);
}

function saveHost(): SaveHost {
  const host: SaveHost = {
    showLoader() {},
    templateSweepApplies: async () => false,
    myMessage: { msgTotFile: 'Total' },
    totFileSize: '',
    scenery: '',
    async initInfoProject() {},
    async setInfos() {},
  };
  return host;
}

test('st71 page files through the draft panel and the legacy save sweep', async (t) => {
  await t.test('st71 s0b: opening the panel keeps 5 rows; template-default sweep leaves .ts and .html', async () => {
  const mounted = await mountFiveNewRows();
  const files = mounted.files;
  const extensionsOf = mounted.extensionsOf;

  try {
    assert.deepEqual(extensionsOf(), ['.defs.ts', '.html', '.less', '.test.ts', '.ts']);

    const fetchImpl: FetchImpl = async () => jsonResponse({
      statusCode: 200,
      status: 'listed',
      drafts: [{
        branch: `team/${PROJECT}`,
        ahead: 0,
        behind: 0,
        author: 'Ada',
        email: 'ada@example.com',
        date: '2026-11-12',
        message: '',
        files: [],
      }],
    });
    await loadPanel(fetchImpl, PROJECT, `team-${PROJECT}`);
    await rememberOpenedDraftText(Object.values(files));
    const edited = collectEditedFiles(files, PROJECT).map((file) => file.extension).sort();
    assert.deepEqual(extensionsOf(), ['.defs.ts', '.html', '.less', '.test.ts', '.ts'], 'loadPanel + rememberOpenedDraftText must not drop rows');
    assert.deepEqual(edited, ['.defs.ts', '.html', '.less', '.test.ts', '.ts']);

    const storedRows: { [key: string]: IPageFile } = files;
    const deps: DraftFilesDeps = {
      draftDiff: async () => ({ head: 'h', main: 'mainsha', files: [] }),
      hasLocalEdit: () => true,
      addOrUpdateFile: async (info) => info as IPageFile,
      fileKey,
      files: () => storedRows,
    };
    const applied = await applyDraftFiles(PROJECT, `team-${PROJECT}`, deps, { head: 'h', main: 'mainsha', files: [] });
    assert.deepEqual(applied, { added: 0, changed: 0, removed: 0 });
    assert.deepEqual(extensionsOf(), ['.defs.ts', '.html', '.less', '.test.ts', '.ts'], 'empty applyDraftFiles must not drop new rows');

    const removed = await removeNewStorFilesWithTemplateDefault();
    const removedExt = removed.map((file) => file.extension).sort();
    console.log(`ST71-S0B remaining ${JSON.stringify(extensionsOf())} removed ${JSON.stringify(removedExt)}`);
    assert.deepEqual(removedExt, ['.defs.ts', '.less', '.test.ts']);
    assert.deepEqual(extensionsOf(), ['.html', '.ts']);
  } finally {
    mounted.restore();
  }
  });

  await t.test('st71 s1c: VM driver keeps the five new rows; legacy driver leaves .ts and .html', async () => {
    const loaded = loadServiceSave();
    const host = saveHost();
    host.templateSweepApplies = loaded.templateSweepApplies;

    const vm = await mountFiveNewRows();
    vm.setDriver(async () => ({ driverVersion: '1.0.0-vm.1' }));
    try {
      await loaded.init.call(host);
      assert.deepEqual(vm.extensionsOf(), ['.defs.ts', '.html', '.less', '.test.ts', '.ts']);
    } finally {
      vm.restore();
    }

    const legacy = await mountFiveNewRows();
    legacy.setDriver(async () => ({ driverVersion: '1.0.0.4' }));
    try {
      await loaded.init.call(host);
      assert.deepEqual(legacy.extensionsOf(), ['.html', '.ts']);
    } finally {
      legacy.restore();
    }
  });
});
