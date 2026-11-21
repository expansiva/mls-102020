/// <mls fileReference="_102047_/l4/ordenServicio/rules.defs.ts" enhancement="_blank"/>

import type { Ns5RulesArtifactV2, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioRules = {
  "schemaVersion": "2026-09-16-ns5-rules-v2",
  "moduleName": "ordenServicio",
  "rules": {
    "numeroOrdenUnico": "Cada orden de servicio tiene un número único, emitido por la secuencia de la plataforma al abrirla, que no se repite ni cambia.",
    "fotosAparatoEnAdjuntos": "Las fotos del aparato tomadas al abrir la orden se guardan como adjuntos de la orden de servicio.",
    "presupuestoRequiereDiagnosticoYValor": "El técnico solo puede emitir el presupuesto de una orden abierta cuando tiene registrados el diagnóstico y un valor de presupuesto para el cliente mayor que cero.",
    "piezasSoloAntesDePresupuesto": "Las piezas de una orden solo se pueden agregar, modificar o quitar mientras la orden está abierta, antes de emitir el presupuesto.",
    "cantidadPositiva": "La cantidad de cada pieza registrada en una orden debe ser un número entero mayor que cero.",
    "costoTotalPieza": "El costo total de una pieza es su cantidad multiplicada por su costo interno unitario.",
    "costoInternoPiezasOrden": "El costo interno de piezas de una orden es la suma de los costos totales de todas las piezas registradas en ella.",
    "clienteSoloRespondeSusOrdenes": "El cliente solo puede aprobar o rechazar el presupuesto de sus propias órdenes, y únicamente mientras la orden está presupuestada.",
    "rechazoCierraOrden": "Cuando el cliente rechaza el presupuesto, la orden se cierra como rechazada, no admite reparación y el aparato queda disponible para retiro.",
    "listaRequiereTrabajoRealizado": "El técnico solo puede marcar como lista una orden aprobada cuando tiene registrada la descripción del trabajo realizado.",
    "finalizarSoloOrdenLista": "El recepcionista solo puede finalizar una orden que está lista, registrando la entrega del aparato al cliente.",
    "disponibleParaRetiroCalculado": "Una orden está disponible para retiro cuando su estado es lista o rechazada.",
    "clienteVeSoloSusOrdenes": "En el portal, el cliente ve únicamente las órdenes de servicio de las que es dueño.",
    "clienteNoVeCostoInterno": "En el portal, el cliente ve el estado, el aparato, el diagnóstico y el valor del presupuesto de su orden, pero nunca ningún costo interno.",
    "costoInternoOcultoAlCliente": "Las piezas registradas en una orden, con su cantidad, costo unitario, costo total y observaciones, nunca se muestran al cliente.",
    "costoInternoNoVisibleCliente": "El costo interno de piezas calculado para la orden nunca se muestra al cliente.",
    "anotacionesTecnicoOcultasAlCliente": "Las anotaciones internas del técnico sobre la orden nunca se muestran al cliente."
  }
} as const satisfies Ns5Readonly<Ns5RulesArtifactV2>;

export type OrdenServicioRulesType = typeof ordenServicioRules;

export default ordenServicioRules;
