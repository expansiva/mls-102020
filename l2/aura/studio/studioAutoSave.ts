/// <mls fileReference="_102020_/l2/aura/studio/studioAutoSave.ts" enhancement="_blank" />
// Whether an open model's text still matches the text captured before a draft write.
// The manual save uses this to keep a local copy when the model moved during the write.
// This module never writes.

import { sourceModelSlot } from '/_102033_/l2/cbe/studioDraftFiles.js';

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

interface IOpenModelFile {
  project: number;
  level: number;
  shortName: string;
  folder: string;
  extension: string;
}

/** True when the open model is readable and is no longer the text captured for this save. */
export function modelTextDiffers(file: IOpenModelFile, capturedText: string): boolean {
  const now = openModelText(file);
  if (now === undefined) return false;
  return now !== capturedText;
}

/** Text of this file's open model. Undefined when the model is not open or cannot be read. */
export function openModelText(file: IOpenModelFile): string | undefined {
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
    console.error('[studio] draft save could not read the model key', file.shortName, err);
    return undefined;
  }
  const model = models[key]?.[slot];
  if (!model?.model) return undefined;
  try {
    return model.model.getValue();
  } catch (err) {
    console.error('[studio] draft save could not read the model text', file.shortName, err);
    return undefined;
  }
}
