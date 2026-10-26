/// <mls fileReference="_102020_/l2/aura/studio/studioAutoSave.ts" enhancement="_blank" />
// Which stor files are worth an auto-save, the comment text, and the debounce.
// The injected `send` does the write; this module never touches mls.stor.
// "Already sent" is the CRC map in studioDraftFiles. `originalCRC` is the published baseline.

import {
  draftContentCrc,
  rememberSentCrc,
  sentCrcOf,
  sourceModelSlot,
} from '/_102033_/l2/cbe/studioDraftFiles.js';

/** Fields this decision reads off a stor file (`IFileInfo`). */
export interface IAutoSaveStorFile {
  project: number;
  level: number;
  shortName: string;
  folder: string;
  extension: string;
  status: string;
  hasError: boolean;
  /** False after a draft send. Absent still counts as local when no CRC can be read. */
  inLocalStorage?: boolean;
}

export function buildAutoSaveStorFile(file: IAutoSaveStorFile): IAutoSaveStorFile {
  return {
    project: file.project,
    level: file.level,
    shortName: file.shortName,
    folder: file.folder,
    extension: file.extension,
    status: file.status,
    hasError: file.hasError,
    inLocalStorage: file.inLocalStorage,
  };
}

const SOURCE_LEVELS: ReadonlySet<number> = new Set([1, 2, 3]);

/**
 * Site-project files that should go to the draft: l1–l3, not yet sent, no compile error.
 * A deletion is always sent (nothing is sent but the delete).
 * Anything else is pending only when its content CRC differs from the last send,
 * or when that send was not recorded and the file is still local.
 * `.defs.ts` and `.test.ts` stay (they are source). `.d.ts` does not.
 */
export function pendingFiles<T extends IAutoSaveStorFile>(storFiles: readonly T[], projectId: number): T[] {
  const pending: T[] = [];
  for (const file of storFiles) {
    if (file.project !== projectId) continue;
    if (file.status === 'nochange') continue;
    if (!stillUnsent(file)) continue;
    if (file.hasError !== false && file.status !== 'deleted') continue;
    if (!SOURCE_LEVELS.has(file.level)) continue;
    if (isDeclaration(file)) continue;
    pending.push(file);
  }
  return pending;
}

type CrcDrift = 'same' | 'differs' | 'unknown';

interface IBaselineModel {
  model?: { getValue(): string };
}

interface IBaselineModels {
  ts?: IBaselineModel;
  test?: IBaselineModel;
  html?: IBaselineModel;
  style?: IBaselineModel;
  defs?: IBaselineModel;
}

/** Sent content matches the last-send CRC. A deletion has no content to compare. */
function stillUnsent(file: IAutoSaveStorFile): boolean {
  if (file.status === 'deleted') return true;
  const drift = crcDrift(file);
  if (drift === 'differs') return true;
  if (drift === 'same') return false;
  return file.inLocalStorage !== false;
}

/** Text of this file's open model. Undefined when the model is not open or cannot be read. */
function openModelText(file: IAutoSaveStorFile): string | undefined {
  const slot = sourceModelSlot(file.extension);
  if (!slot) return undefined;
  const host = globalThis as {
    mls?: {
      editor?: {
        getKeyModel?: (project: number, shortName: string, folder: string, level: number) => string;
        models?: Record<string, IBaselineModels | undefined>;
      };
    };
  };
  const getKeyModel = host.mls?.editor?.getKeyModel;
  const models = host.mls?.editor?.models;
  if (!getKeyModel || !models) return undefined;
  let key: string;
  try {
    key = getKeyModel(file.project, file.shortName, file.folder, file.level);
  } catch (err) {
    console.error('studio auto-save could not read the model key', file.shortName, err);
    return undefined;
  }
  const model = models[key]?.[slot];
  if (!model?.model) return undefined;
  try {
    return model.model.getValue();
  } catch (err) {
    console.error('studio auto-save could not read the CRC', file.shortName, err);
    return undefined;
  }
}

/** Remember the content just written to the draft. Does not touch `originalCRC`. */
export function recordSentContent(file: IAutoSaveStorFile): void {
  const text = openModelText(file);
  if (text === undefined) return;
  try {
    rememberSentCrc(file, draftContentCrc(text, file.extension));
  } catch (err) {
    console.error('studio auto-save could not record the sent CRC', file.shortName, err);
  }
}

function crcDrift(file: IAutoSaveStorFile): CrcDrift {
  const sent = sentCrcOf(file);
  if (sent === undefined) return 'unknown';
  const text = openModelText(file);
  if (text === undefined) return 'unknown';
  try {
    return draftContentCrc(text, file.extension) === sent ? 'same' : 'differs';
  } catch (err) {
    console.error('studio auto-save could not read the CRC', file.shortName, err);
    return 'unknown';
  }
}

export function autosaveMessage(files: readonly IAutoSaveStorFile[]): string {
  const names = files.map(fileName).join(', ');
  return `autosave: ${files.length} arquivo(s): ${names}`;
}

export interface ICreateAutoSaverOptions<T extends IAutoSaveStorFile> {
  debounceMs: number;
  send: (files: readonly T[]) => Promise<void>;
  now: () => number;
  hasDraft: () => boolean;
  onError: (reason: unknown) => void;
}

export interface IAutoSaver<T extends IAutoSaveStorFile> {
  notify(fileRef: T): void;
  flush(): Promise<void>;
}

interface IPendingTicket<T extends IAutoSaveStorFile> {
  file: T;
  ticket: number;
}

/**
 * One burst of `notify` becomes one `send`, `debounceMs` after the last call.
 * `hasDraft() === false` makes `notify` a no-op. A rejected `send` leaves the
 * files pending and calls `onError`.
 */
export function createAutoSaver<T extends IAutoSaveStorFile>(
  options: ICreateAutoSaverOptions<T>,
): IAutoSaver<T> {
  const pending = new Map<string, IPendingTicket<T>>();
  let nextTicket = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let inFlight: Promise<void> | null = null;

  const clearTimer = (): void => {
    if (timer === null) return;
    clearTimeout(timer);
    timer = null;
  };

  const fire = (): Promise<void> => {
    if (inFlight) return inFlight;
    inFlight = deliver().finally(() => {
      inFlight = null;
    });
    return inFlight;
  };

  const deliver = async (): Promise<void> => {
    if (!options.hasDraft()) return;
    const batch = [...pending.values()];
    if (batch.length === 0) return;
    try {
      await options.send(batch.map((item) => item.file));
    } catch (err) {
      console.error('studio auto-save send failed', err);
      options.onError(err);
      return;
    }
    for (const item of batch) {
      const key = fileKey(item.file);
      if (pending.get(key)?.ticket === item.ticket) pending.delete(key);
    }
  };

  const arm = (): void => {
    clearTimer();
    const markedAt = options.now();
    timer = setTimeout(() => {
      timer = null;
      if (options.now() < markedAt) {
        console.error('studio auto-save clock went backwards');
        return;
      }
      void fire();
    }, options.debounceMs);
  };

  return {
    notify(fileRef: T): void {
      if (!options.hasDraft()) return;
      nextTicket += 1;
      pending.set(fileKey(fileRef), { file: fileRef, ticket: nextTicket });
      arm();
    },
    flush(): Promise<void> {
      clearTimer();
      return fire();
    },
  };
}

/** `.defs.ts` does not end with `.d.ts`; a declaration file does. */
function isDeclaration(file: IAutoSaveStorFile): boolean {
  return `${file.shortName}${file.extension}`.endsWith('.d.ts');
}

function fileName(file: IAutoSaveStorFile): string {
  const folder = file.folder.length > 0 ? `${file.folder}/` : '';
  return `l${file.level}/${folder}${file.shortName}${file.extension}`;
}

function fileKey(file: IAutoSaveStorFile): string {
  return `${file.project}\u0000${file.level}\u0000${file.folder}\u0000${file.shortName}\u0000${file.extension}`;
}
