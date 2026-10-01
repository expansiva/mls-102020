/// <mls fileReference="_102020_/l2/agentMaterializeL2v3/steps/entry10/run.ts" enhancement="_blank"/>

import { writeJson, type Ns5FileInfo } from '/_102035_/l2/solution/fs.js';
import type { M3RunIdentity } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Invocation.js';
import { failM3Step, m3ErrorMessage, productionFailurePort, type M3FailurePort } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3StepFailure.js';
import { listM3RunDirs, m3TraceFileInfo } from '/_102020_/l2/agentMaterializeL2v3/helpers/m3Trace.js';

export const M3_RUN_VERSION = '2026-10-01-m3-run-v1' as const;

export interface M3EntryPort {
  listRunDirs(): string[];
  writeJson(info: Ns5FileInfo, value: unknown): Promise<unknown>;
  now(): Date;
  failure: M3FailurePort;
}

export type M3StepResult = { status: 'completed'; summary: string } | { status: 'failed'; reason: string };

export function productionEntryPort(identity: { project: number; module: string; runDir: string }): M3EntryPort {
  return {
    listRunDirs: () => listM3RunDirs(mls.stor.files as never, identity.project, identity.module),
    writeJson,
    now: () => new Date(),
    failure: productionFailurePort(identity.project, identity.module, identity.runDir),
  };
}

export async function executeM3Entry(port: M3EntryPort, identity: M3RunIdentity & { runDir: string }, command: string): Promise<M3StepResult> {
  try {
    if (port.listRunDirs().includes(identity.runDir)) throw new Error(`M3_RUN_DIR_TAKEN: ${identity.runDir}`);
    await port.writeJson(m3TraceFileInfo(identity.project, identity.module, identity.runDir, 'run'), {
      schemaVersion: M3_RUN_VERSION, project: identity.project, module: identity.module, pages: identity.pages,
      devices: identity.devices, runDir: identity.runDir, startedAt: port.now().toISOString(), command,
    });
    return { status: 'completed', summary: `entry10 started ${identity.runDir}` };
  } catch (error) {
    return { status: 'failed', reason: await failM3Step(port.failure, { module: identity.module, runDir: identity.runDir, stepId: 'entry10' }, m3ErrorMessage(error)) };
  }
}
