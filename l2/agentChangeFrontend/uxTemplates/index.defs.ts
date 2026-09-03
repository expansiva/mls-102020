/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/index.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";
import { bulkActionsTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/bulk_actions.defs.js";
import { calendarSchedulerTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/calendar_scheduler.defs.js";
import { detailViewTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/detail_view.defs.js";
import { kanbanPipelineTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/kanban_pipeline.defs.js";
import { mobileCardsTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/mobile_cards.defs.js";
import { posWorkspaceTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/pos_workspace.defs.js";
import { reportScreenTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/report_screen.defs.js";
import { singleFormTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/single_form.defs.js";
import { splitDetailTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/split_detail.defs.js";
import { statusOverviewTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/status_overview.defs.js";
import { tabularClassicTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/tabular_classic.defs.js";
import { visualDashboardTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/visual_dashboard.defs.js";
import { wizardFlowTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/wizard_flow.defs.js";
import { workflowQueueTemplate } from "/_102020_/l2/agentChangeFrontend/uxTemplates/workflow_queue.defs.js";

export const uxTemplates = [
  tabularClassicTemplate,
  splitDetailTemplate,
  mobileCardsTemplate,
  singleFormTemplate,
  detailViewTemplate,
  workflowQueueTemplate,
  kanbanPipelineTemplate,
  statusOverviewTemplate,
  visualDashboardTemplate,
  calendarSchedulerTemplate,
  reportScreenTemplate,
  bulkActionsTemplate,
  wizardFlowTemplate,
  posWorkspaceTemplate,
] as const satisfies readonly UxTemplateDefinition[];

export const uxTemplateRegistry = {
  schemaVersion: "2026-07-04-ux-template-registry",
  owner: "agentChangeFrontend",
  selectionPolicy: {
    defaultMode: "deterministicScore",
    highConfidenceThreshold: 0.85,
    ambiguousCandidateCount: 3,
    maxRecommendedTemplates: 3,
    variantPolicy: "A screen may be generated as multiple UX variants by selecting multiple compatible templates. Each generated variant uses one UX template as its source of truth.",
    llmRole: "Use template userJourney and guidance to compose the UX plan after deterministic matching. Do not freely choose templates that failed structured applicability checks."
  },
  templates: uxTemplates
} as const;

export default uxTemplateRegistry;
