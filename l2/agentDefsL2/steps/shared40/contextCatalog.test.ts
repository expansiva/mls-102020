import assert from 'node:assert/strict';
import test from 'node:test';
import { d2SharedContextPort } from './contextCatalog.js';

interface FileInfo {
  project: number;
  level: 2 | 4;
  folder: string;
  shortName: string;
  extension: string;
}

const fileKey = (info: FileInfo): string =>
  `${info.project}/l${info.level}/${info.folder}/${info.shortName}${info.extension}`;

void test('productive context port reads a runtime l2 root file and a local contract in a subfolder', async () => {
  const host = globalThis as unknown as { mls?: unknown };
  const previousMls = host.mls;
  const files: Record<string, unknown> = {};
  const addFile = (info: FileInfo, content: string): void => {
    files[fileKey(info)] = {
      status: 'changed',
      getValueInfo: async () => ({ content }),
      getContent: async () => content,
    };
  };

  addFile({ project: 102029, level: 2, folder: '', shortName: 'stateLitElement', extension: '.ts' }, 'runtime-root');
  addFile({
    project: 102047,
    level: 2,
    folder: 'agendaClinica/web/contracts',
    shortName: 'consultas_profissional.defs',
    extension: '.ts',
  }, 'local-contract');

  host.mls = { actualProject: 102047, stor: { files, getKeyToFile: fileKey } };
  try {
    assert.equal(await d2SharedContextPort.readText('_102029_/l2/stateLitElement.ts'), 'runtime-root');
    assert.equal(
      await d2SharedContextPort.readText('l2/agendaClinica/web/contracts/consultas_profissional.defs.ts'),
      'local-contract',
    );
  } finally {
    host.mls = previousMls;
  }
});
