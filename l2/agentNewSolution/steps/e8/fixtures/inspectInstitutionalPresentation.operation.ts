/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/inspectInstitutionalPresentation.operation.ts" enhancement="_blank"/>

export const operationInspectInstitutionalPresentation = {
  "operationId": "inspectInstitutionalPresentation",
  "title": "Conhecer o pet shop",
  "actors": [
    "clienteResponsavel"
  ],
  "entity": "InstitutionalPresentation",
  "kind": "query",
  "reads": [
    "BusinessHours",
    "InstitutionalPresentation"
  ],
  "writes": [],
  "rulesApplied": [],
  "story": {
    "actor": "clienteResponsavel",
    "goal": "Conhecer o pet shop",
    "steps": [
      "Conhecer o pet shop",
      "A pessoa visualiza a apresentação institucional e as informações de atendimento do pet shop."
    ],
    "outcome": "A pessoa visualiza a apresentação institucional e as informações de atendimento do pet shop."
  },
  "accessPattern": {
    "kind": "getById",
    "description": "Conhecer o pet shop",
    "entity": "InstitutionalPresentation",
    "keyField": "InstitutionalPresentation.institutionalPresentationId",
    "pagination": "none",
    "selection": "none",
    "output": [
      "InstitutionalPresentation.institutionalPresentationId",
      "InstitutionalPresentation.businessName",
      "InstitutionalPresentation.headline",
      "InstitutionalPresentation.presentationText"
    ]
  },
  "outputShape": {
    "kind": "object",
    "fields": [
      {
        "name": "institutionalPresentationId",
        "type": "string",
        "required": true,
        "fieldRef": "InstitutionalPresentation.institutionalPresentationId"
      },
      {
        "name": "businessName",
        "type": "string",
        "required": true,
        "fieldRef": "InstitutionalPresentation.businessName"
      },
      {
        "name": "headline",
        "type": "string",
        "required": false,
        "fieldRef": "InstitutionalPresentation.headline"
      },
      {
        "name": "presentationText",
        "type": "string",
        "required": true,
        "fieldRef": "InstitutionalPresentation.presentationText"
      }
    ]
  },
  "inputs": [
    {
      "inputId": "institutionalPresentationInstitutionalPresentationId",
      "fieldRef": "InstitutionalPresentation.institutionalPresentationId",
      "required": true,
      "source": "selectedEntity",
      "description": "Apresentação institucional"
    }
  ],
  "pageId": "consultInstitutionalHome",
  "commandName": "qryInspectInstitutionalPresentation",
  "bffName": "qryInspectInstitutionalPresentation"
} as const;

export default operationInspectInstitutionalPresentation;
