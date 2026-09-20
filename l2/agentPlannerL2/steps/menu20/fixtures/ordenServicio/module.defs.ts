/// <mls fileReference="_102047_/l4/ordenServicio/module.defs.ts" enhancement="_blank"/>

import type { Ns5ModuleArtifact } from '/_102035_/l2/solution/types.js';

export const ordenServicioModule = {
  "schemaVersion": "2026-09-10-ns5-module-v2",
  "moduleName": "ordenServicio",
  "title": "Órdenes de servicio técnico de electrónica",
  "userLanguage": "es",
  "productLanguages": [
    "es"
  ],
  "defaultLanguage": "es",
  "sourcePrompt": "crear el módulo ordenServicio, en español, para un servicio técnico de electrónica. el cliente trae un aparato y el recepcionista abre una orden de servicio con los datos del cliente, el aparato, el defecto informado y fotos. el técnico analiza y registra el diagnóstico, las piezas necesarias con costo interno y el valor del presupuesto para el cliente. el cliente recibe el presupuesto y lo aprueba o lo rechaza desde el portal; si lo rechaza, la orden se cierra como rechazada y el aparato queda disponible para retiro. si lo aprueba, el técnico realiza la reparación, registra lo que hizo y la marca como lista; el recepcionista entrega y finaliza. el cliente accede al portal y ve solamente sus propias órdenes, con estado, diagnóstico y valor del presupuesto — nunca el costo interno de las piezas ni las anotaciones del técnico. perfiles: recepcionista, técnico y cliente."
} as const satisfies Ns5ModuleArtifact;

export type OrdenServicioModuleType = typeof ordenServicioModule;

export default ordenServicioModule;
