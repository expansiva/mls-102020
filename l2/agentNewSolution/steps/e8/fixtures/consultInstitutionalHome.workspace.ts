/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e8/fixtures/consultInstitutionalHome.workspace.ts" enhancement="_blank"/>

export const consultInstitutionalHomeWorkspace = {
  "workspaceId": "consultInstitutionalHome",
  "title": "Conhecer o pet shop",
  "actors": [
    "clienteResponsavel"
  ],
  "kind": "operation",
  "entity": "InstitutionalPresentation",
  "bffCalls": [
    {
      "bffId": "qryInspectInstitutionalPresentation",
      "kind": "query",
      "uses": [
        {
          "operationId": "inspectInstitutionalPresentation"
        }
      ],
      "input": [
        {
          "name": "institutionalPresentationInstitutionalPresentationId",
          "from": "inspectInstitutionalPresentation.institutionalPresentationInstitutionalPresentationId",
          "required": true,
          "source": "selectedEntity",
          "type": "string"
        }
      ],
      "output": {
        "kind": "object",
        "fields": [
          {
            "name": "institutionalPresentationId",
            "from": "inspectInstitutionalPresentation.institutionalPresentationId",
            "type": "string",
            "required": true
          },
          {
            "name": "businessName",
            "from": "inspectInstitutionalPresentation.businessName",
            "type": "string",
            "required": true
          },
          {
            "name": "headline",
            "from": "inspectInstitutionalPresentation.headline",
            "type": "string",
            "required": false
          },
          {
            "name": "presentationText",
            "from": "inspectInstitutionalPresentation.presentationText",
            "type": "string",
            "required": true
          }
        ]
      },
      "route": "petShop.consultInstitutionalHome.qryInspectInstitutionalPresentation"
    }
  ],
  "sections": [
    {
      "sectionId": "inspectInstitutionalPresentation",
      "intent": "A pessoa visualiza a apresentação institucional e as informações de atendimento do pet shop.",
      "organisms": [
        {
          "role": "detailPanel",
          "dataSource": "qryInspectInstitutionalPresentation"
        }
      ]
    }
  ],
  "operationIds": [
    "inspectInstitutionalPresentation"
  ],
  "purpose": "Consultar a apresentação institucional do pet shop antes de utilizar seus serviços.",
  "presentation": {
    "categoryRef": "processWizard",
    "confidence": 10,
    "classificationNote": "Derived from the journey tier of the approved E8 model; the category is structural, not a guess."
  },
  "sliceHash": "sha256:b6fdbe28"
} as const;

export default consultInstitutionalHomeWorkspace;
