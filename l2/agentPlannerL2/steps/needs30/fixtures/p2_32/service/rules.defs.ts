/// <mls fileReference="_102047_/l4/ordenServicio/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2 } from '/_102035_/l2/solution/types.js';

export const ordenServicioRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "ordenServicio",
  "rules": {
    "emitBudgetRequiresAnalysis": "El presupuesto solo puede emitirse cuando la orden cuenta con diagnóstico, piezas necesarias y valor propuesto registrados.",
    "customerCanDecideOwnBudget": "El cliente solo puede aprobar o rechazar presupuestos de sus propias órdenes.",
    "repairRequiresApprovedBudget": "La reparación solo puede iniciarse para una orden cuyo presupuesto haya sido aprobado por el cliente.",
    "repairCompletionRequiresWorkRecorded": "Una orden solo puede marcarse como lista para entrega cuando se haya registrado el trabajo de reparación efectuado.",
    "deliveryRequiresReadyOrder": "La entrega y finalización solo pueden realizarse para una orden marcada como lista para entrega.",
    "ruleForeignNamespaceRefused": "No se permite registrar datos de este módulo en espacios de nombres ajenos.",
    "ruleDocumentShapeValidated": "Los documentos del módulo deben ajustarse a la estructura definida para cada registro.",
    "ruleIdentityNeverInNamespace": "Los datos de identidad no pueden almacenarse en el espacio de nombres del módulo.",
    "rulePersonSsnUniqueForUs": "El número de seguridad social de una persona debe ser único cuando el país aplicable sea Estados Unidos.",
    "rulePersonPrivacyConsentRequiredBrEu": "El consentimiento de privacidad es obligatorio para personas sujetas a los requisitos aplicables de Brasil o la Unión Europea.",
    "ruleDeleteBlockedByRelationships": "No se puede eliminar un registro que mantenga relaciones con otros registros.",
    "receptionRequiresCustomerDeviceAndDefect": "La recepción de una orden requiere registrar el cliente, el aparato recibido y el defecto informado.",
    "customerDisclosureExcludesInternalData": "La información visible al cliente se limita al estado, diagnóstico y valor del presupuesto, y excluye los costos internos de piezas y las anotaciones del técnico."
  }
} as const satisfies Ns5RulesArtifactV2;

export type OrdenServicioRulesType = typeof ordenServicioRules;

export default ordenServicioRules;
