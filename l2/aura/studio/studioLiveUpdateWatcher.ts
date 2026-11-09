/// <mls fileReference="_102020_/l2/aura/studio/studioLiveUpdateWatcher.ts" enhancement="_blank" />
// The file-editor bridge that used to push a compile onto the running preview.
//
// That swap is off. A change in the file editor, a style compile, or a studio service used to reach
// the screen before Save, which showed code the draft server did not have yet. The preview now
// changes when Save reloads it.
//
// Level 3 is not this path. The in-place editor writes the text on the screen itself and still calls
// `compileAndApplyLiveUpdate` (`studioEditor.ts` → `studioLiveUpdate.ts`) so the registered class
// matches that text. This watcher does not listen and does not call `applyLiveUpdate`.

interface IChangedFileRef {
  project: number;
  shortName: string;
  folder: string;
  level?: number;
}

let reportedOff = false;

function reportLiveSwapOff(ref: IChangedFileRef | null): void {
  if (reportedOff) return;
  reportedOff = true;
  const changed = ref ? `${ref.project}/${ref.folder}/${ref.shortName}` : '';
  console.info('[liveUpdate] preview live swap is off until Save', changed);
}

/** Kept so an entry that still asks for a swap gets a no-op instead of a queued retry. */
export async function applyChangedOnMounted(ref: IChangedFileRef): Promise<void> {
  reportLiveSwapOff(ref);
}

export class StudioLiveUpdateWatcher {
  /** Does not listen. The preview is not swapped from a file change. */
  public start(_host: HTMLElement): void {
    reportLiveSwapOff(null);
  }

  public stop(): void {}

  public async applyChanged(ref: IChangedFileRef): Promise<void> {
    reportLiveSwapOff(ref);
  }
}
