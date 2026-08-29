/// <mls fileReference="_102020_/l2/agentNewSolution/helpers/nsPipelineRun.ts" enhancement="_blank"/>

import type { Ns4PipelineState } from '/_102020_/l2/agentNewSolution/helpers/ns4Core.js';
import { isNs4FastMode } from '/_102020_/l2/agentNewSolution/helpers/ns4FastHandoff.js';

export const NS_PIPELINE_AGENT_SLUG = 'newsolution';

export interface PipelineRunDegradation {
  at: string;
  kind: string;
  reason: string;
  path?: string;
}

export interface PipelineRunSummary {
  moduleName: string;
  agent: string;
  command: string;
  startedAt: string | null;
  finishedAt: string;
  verdict: 'completed' | 'failed' | 'degraded';
  reason: string;
  counts: Record<string, unknown>;
  degradations: PipelineRunDegradation[];
}

export function nextPipelineRunNn(existingShortNames: readonly string[], agentSlug: string): string {
  const re = new RegExp(`^run(\\d+)_${agentSlug}$`);
  let max = 0;
  for (const name of existingShortNames) {
    const match = re.exec(name);
    if (match) max = Math.max(max, Number(match[1]));
  }
  return String(max + 1).padStart(2, '0');
}

export function buildNsRunSummary(input: {
  pipeline: Ns4PipelineState | null;
  moduleName: string;
  longMemory?: Record<string, unknown> | null;
  verdict: 'completed' | 'failed' | 'degraded';
  reason: string;
}): PipelineRunSummary {
  const pipeline = input.pipeline;
  const skipped = pipeline?.steps.e1?.skippedDefaults;
  const degradations: PipelineRunDegradation[] = [];
  if (skipped) {
    degradations.push({
      at: pipeline?.steps.e1?.approvedAt || pipeline?.updatedAt || new Date().toISOString(),
      kind: 'clarification-skip-default',
      reason: `productLanguages=${skipped.productLanguages.join(',') || '(none)'} default=${skipped.defaultLanguage} module=${skipped.moduleName}`,
    });
  }
  const stepCounts: Record<string, string> = {};
  if (pipeline?.steps) {
    for (const [id, step] of Object.entries(pipeline.steps)) {
      if (step && typeof step === 'object' && 'status' in step) stepCounts[id] = String((step as { status: string }).status);
    }
  }
  const fast = isNs4FastMode(input.longMemory);
  const rebuild = pipeline?.rebuiltFrom ? `/rebuild ${pipeline.rebuiltFrom}` : '';
  const command = [fast ? '/fast' : '', rebuild, pipeline?.sourcePrompt || ''].filter(Boolean).join(' ').trim();
  return {
    moduleName: input.moduleName,
    agent: 'agentNewSolution',
    command,
    startedAt: pipeline?.steps.e1?.updatedAt || pipeline?.updatedAt || null,
    finishedAt: new Date().toISOString(),
    verdict: skipped && input.verdict === 'completed' ? 'degraded' : input.verdict,
    reason: input.reason,
    counts: {
      steps: stepCounts,
      skippedClarification: Boolean(skipped),
    },
    degradations,
  };
}

export async function saveNsRunSummary(summary: PipelineRunSummary): Promise<string | null> {
  try {
    if (!summary.moduleName) return null;
    const { listNs4PipelineJsonShortNames, ns4PipelineJsonFile, writeNs4Json } = await import('/_102020_/l2/agentNewSolution/helpers/ns4Fs.js');
    const nn = nextPipelineRunNn(listNs4PipelineJsonShortNames(summary.moduleName), NS_PIPELINE_AGENT_SLUG);
    const info = ns4PipelineJsonFile(summary.moduleName, `run${nn}_${NS_PIPELINE_AGENT_SLUG}`);
    return await writeNs4Json(info, { savedAt: new Date().toISOString(), ...summary });
  } catch {
    return null;
  }
}
