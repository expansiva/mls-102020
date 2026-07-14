/// <mls fileReference="_102020_/l2/agentChangeFrontend/steps/create-page/agentCfeCreatePageReview.ts" enhancement="_102027_/l2/enhancementAgent"/>

import { IAgentAsync, IAgentMeta } from '/_102027_/l2/aiAgentBase.js';
import { getAllSteps } from '/_102027_/l2/aiAgentHelper.js';
import { createAddStepIntent, createAgentStepPayload, createUpdateStatusIntent, readCreateContext } from '/_102020_/l2/agentChangeFrontend/helpers/cfeCreateShared.js';
import { evaluateGeneratedPageQuality, parseDefs } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeCore.js';
import { getContentByMlsPath } from '/_102020_/l2/agentChangeFrontend/helpers/cfeMaterializeStudio.js';

interface CreatePageReviewArgs {
  planId: string;
  pageIds: string[];
  attempt: number;
}

interface BrokenPage {
  pageId: string;
  feedback: string;
}

const AGENT_NAME = 'agentCfeCreatePageReview';
const MAX_REVIEW_ATTEMPT = 2;

export function createAgent(): IAgentAsync {
  return {
    agentName: AGENT_NAME,
    agentProject: 102020,
    agentFolder: 'agentChangeFrontend/steps/create-page',
    agentDescription: 'Review generated page defs and schedule one bounded sequential repair round',
    visibility: 'private',
    beforePromptStep,
  };
}

async function beforePromptStep(agent: IAgentMeta, context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep, step: mls.msg.AIAgentStep, hookSequential: number): Promise<mls.msg.AgentIntent[]> {
  try {
    const args = parseArgs(step.prompt);
    const createContext = await readCreateContext();
    const pages = args.pageIds.map(pageId => createContext.pages.find(page => page.pageId === pageId)).filter((page): page is NonNullable<typeof page> => Boolean(page));
    const missingPlans = args.pageIds.filter(pageId => !pages.some(page => page.pageId === pageId));
    const broken: BrokenPage[] = missingPlans.map(pageId => ({ pageId, feedback: `page plan not found during review: ${pageId}` }));
    for (const page of pages) {
      const reviewed = await reviewPage(createContext.project, page.moduleName, page.pageId);
      if (reviewed) broken.push(reviewed);
    }

    if (broken.length === 0) {
      return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `UX quality PASS for ${args.pageIds.length} page(s) on review ${args.attempt}`)];
    }

    const summary = broken.map(item => `${item.pageId}: ${item.feedback}`).join('\n');
    if (args.attempt >= MAX_REVIEW_ATTEMPT) {
      return [createUpdateStatusIntent(
        context,
        parentStep,
        step,
        hookSequential,
        'completed',
        `UX-QUALITY-PENDING after one repair round (${broken.length}/${args.pageIds.length} page(s)):\n${summary}`,
      )];
    }

    const nextAttempt = args.attempt + 1;
    const anchor = findMutableParentStep(context, parentStep);
    const repairs = broken.map(item => {
      const planId = `create-page-repair-${safePlanPart(item.pageId)}-${nextAttempt}`;
      return createAddStepIntent(context, anchor, createAgentStepPayload(
        planId,
        'agentCfeCreatePage',
        `Repair page ${item.pageId}`,
        { pageId: item.pageId, qualityAttempt: nextAttempt - 1, qualityFeedback: item.feedback.slice(0, 4000) },
        [],
        'sequential',
        'waiting_human_input',
      ));
    });
    const repairPlanIds = repairs.map(intent => intent.step.planning?.planId || '').filter(Boolean);
    const nextReviewPlanId = `create-page-review-${nextAttempt}`;
    const nextReview = createAddStepIntent(context, anchor, createAgentStepPayload(
      nextReviewPlanId,
      AGENT_NAME,
      'Revisar paginas apos reparo',
      { planId: nextReviewPlanId, pageIds: broken.map(item => item.pageId), attempt: nextAttempt },
      repairPlanIds,
      'sequential',
      'waiting_dependency',
    ));

    return [
      ...repairs,
      nextReview,
      createUpdateStatusIntent(context, parentStep, step, hookSequential, 'completed', `${broken.length} page(s) rejected; repair round 1/1 started:\n${summary}`),
    ];
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[${agent.agentName}] ${message}`);
    return [createUpdateStatusIntent(context, parentStep, step, hookSequential, 'failed', message)];
  }
}

async function reviewPage(project: number, moduleName: string, pageId: string): Promise<BrokenPage | null> {
  const pagePath = `_${project}_/l2/${moduleName}/web/desktop/page11/${pageId}.defs.ts`;
  const sharedPath = `_${project}_/l2/${moduleName}/web/shared/${pageId}.defs.ts`;
  const [pageSource, sharedSource] = await Promise.all([
    getContentByMlsPath(pagePath),
    getContentByMlsPath(sharedPath),
  ]);
  if (!pageSource || !sharedSource) {
    const missing = [!pageSource ? pagePath : '', !sharedSource ? sharedPath : ''].filter(Boolean);
    return { pageId, feedback: `generated defs missing: ${missing.join(', ')}` };
  }

  const quality = evaluateGeneratedPageQuality(parseDefs(pageSource).data, parseDefs(sharedSource).data);
  const failures = quality.checks.filter(check => !check.passed && check.scope === 'layout');
  if (failures.length === 0) return null;
  return { pageId, feedback: failures.map(check => `${check.id}: ${check.message}`).join('; ') };
}

function findMutableParentStep(context: mls.msg.ExecutionContext, parentStep: mls.msg.AIAgentStep): mls.msg.AIAgentStep {
  const steps = getAllSteps(context.task?.iaCompressed?.nextSteps);
  const current = steps.find(item => item.stepId === parentStep.stepId) || null;
  if (isMutableAgentStep(current)) return current;
  const owner = steps.find(item =>
    item.nextSteps?.some(child => child.stepId === parentStep.stepId) ||
    item.interaction?.payload?.some(child => child.stepId === parentStep.stepId)) || null;
  if (isMutableAgentStep(owner)) return owner;
  const root = context.task?.iaCompressed?.nextSteps?.[0] || null;
  return isMutableAgentStep(root) ? root : parentStep;
}

function isMutableAgentStep(step: mls.msg.AIPayload | null): step is mls.msg.AIAgentStep {
  return step?.type === 'agent' && step.status !== 'completed' && step.status !== 'failed';
}

function parseArgs(prompt: string | undefined): CreatePageReviewArgs {
  if (!prompt) throw new Error('missing create page review args');
  const parsed = JSON.parse(prompt) as Record<string, unknown>;
  const planId = readString(parsed.planId);
  const pageIds = Array.isArray(parsed.pageIds) ? parsed.pageIds.map(readString).filter(Boolean) : [];
  const attempt = typeof parsed.attempt === 'number' && Number.isInteger(parsed.attempt) ? parsed.attempt : 1;
  if (!planId || pageIds.length === 0) throw new Error('create page review requires planId and pageIds');
  return { planId, pageIds: [...new Set(pageIds)], attempt };
}

function safePlanPart(value: string): string {
  return value.replace(/[^A-Za-z0-9_-]+/g, '-');
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}
