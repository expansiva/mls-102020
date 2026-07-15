/// <mls fileReference="_102020_/l2/agentChangeFrontend/uxTemplates/calendar_scheduler.defs.ts" enhancement="_blank"/>

import type { UxTemplateDefinition } from "/_102020_/l2/agentChangeFrontend/uxTemplates/uxTemplateTypes.defs.js";

export const calendarSchedulerTemplate = {
  id: "calendar_scheduler",
  title: "Calendar Scheduler",
  version: 1,
  tags: ["calendar", "schedule", "reservation", "planning"],
  description: "Calendar-based interface for appointments, reservations, shifts, bookings and time-bound availability.",
  userJourney: "User selects a date range, reviews scheduled items in calendar form, opens a time slot or event, then creates, updates, moves or cancels the scheduled item.",
  appliesWhen: {
    workspaceKinds: ["calendar", "workflow", "entityManagement"],
    accessPatterns: ["calendar", "list"],
    selection: ["single"],
    operationKinds: ["query", "create", "update", "delete", "transition"],
    requiredSignals: ["date or date-time field", "time-bound entity or operation"],
    optionalSignals: ["reservation", "availability", "shift", "duration", "resource assignment"]
  },
  rejectsWhen: [
    "There is no date or date-time field relevant to the task.",
    "The primary task is not scheduling or availability.",
    "The user must mainly edit non-time-based attributes.",
    "The workflow has no concept of event, slot, booking or period."
  ],
  slots: {
    primarySurface: "calendarView",
    secondarySurfaces: ["agendaList", "eventDetail", "slotActions"],
    toolbarActions: ["dateRange", "filter", "create"],
    rowActions: ["view", "update", "delete"],
    bulkActions: [],
    confirmationActions: ["delete"],
    contextualInputs: ["selectedEntity", "selectedDateRange", "selectedSlot"],
    hiddenInputs: ["technicalId"],
    navigationTargets: ["eventDetail"],
    actionPresentation: {
      query: "toolbar",
      create: "drawer",
      update: "drawer",
      delete: "confirmation",
      transition: "rowAction"
    }
  },
  layoutGuidance: [
    "Use date range as a first-class filter.",
    "Represent scheduled records as events or agenda rows.",
    "Use selected slot/date context for create operations when available.",
    "Provide list fallback when the selected renderer cannot render a true calendar."
  ],
  llmGuidance: [
    "Do not choose this template just because an entity has createdAt.",
    "Use business time fields, not audit timestamps.",
    "Make conflicts and availability visible if the contract supports them.",
    "Keep cancellation/destructive actions confirmed."
  ],
  validationChecks: [
    "The template is backed by business date/time fields.",
    "Audit timestamps alone do not qualify.",
    "Selected slot/date context is not manually typed when available.",
    "Events can be listed if calendar rendering is unavailable."
  ],
  exampleUseCases: [
    "Table reservations.",
    "Appointment scheduling.",
    "Staff shift planning.",
    "Room booking."
  ]
} as const satisfies UxTemplateDefinition;

export default calendarSchedulerTemplate;
