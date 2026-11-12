/// <mls fileReference="_102020_/l2/aura/helpers/draftPanelOpenDropsComplements.test.ts" enhancement="_blank" />
// st71 s0b — measure only. 5 new page rows → what opening the draft panel calls
// (loadPanel, rememberOpenedDraftText, collectEditedFiles) vs the only path
// that drops .less/.test.ts/.defs.ts and keeps .ts/.html.
import assert from 'node:assert/strict';
import test from 'node:test';
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

test('st71 s0b: opening the panel keeps 5 rows; template-default sweep leaves .ts and .html', async () => {
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

  host.mls = {
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
    },
  };

  const keysOf = (): string[] => Object.keys(files).filter((key) => files[key]).sort();
  const extensionsOf = (): string[] => keysOf().map((key) => key.split('|').pop() ?? '').sort();

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
    host.mls = previousMls;
  }
});
