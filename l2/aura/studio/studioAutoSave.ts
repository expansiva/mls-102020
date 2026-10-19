/// <mls fileReference="_102020_/l2/aura/studio/studioAutoSave.ts" enhancement="_blank" />
// Which stor files are worth an auto-save, the comment text, and the debounce.
// The injected `send` does the write; this module never touches mls.stor.

/** Fields this decision reads off a stor file (`IFileInfo`). */
export interface IAutoSaveStorFile {
  project: number;
  level: number;
  shortName: string;
  folder: string;
  extension: string;
  status: string;
  hasError: boolean;
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
  };
}

const SOURCE_LEVELS: ReadonlySet<number> = new Set([1, 2, 3]);

/**
 * Site-project files that should go to the draft: l1–l3, dirty, no compile error, unless it is a deletion (nothing is sent but the delete).
 * `.defs.ts` and `.test.ts` stay (they are source). `.d.ts` does not.
 */
export function pendingFiles<T extends IAutoSaveStorFile>(storFiles: readonly T[], projectId: number): T[] {
  const pending: T[] = [];
  for (const file of storFiles) {
    if (file.project !== projectId) continue;
    if (file.status === 'nochange') continue;
    if (file.hasError !== false && file.status !== 'deleted') continue;
    if (!SOURCE_LEVELS.has(file.level)) continue;
    if (isDeclaration(file)) continue;
    pending.push(file);
  }
  return pending;
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
