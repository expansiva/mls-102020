/// <mls fileReference="_102047_/l4/ordenServicio/ontology/PiezaOrden.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityPiezaOrden = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "PiezaOrden",
  "title": "Pieza de la orden",
  "description": "Pieza necesaria para la reparación registrada por el técnico en una orden, con su cantidad y costo interno; nunca visible para el cliente.",
  "displayField": "descripcion",
  "relationships": {
    "ordenServicio": {
      "relationshipId": "piezaOrden",
      "to": "OrdenServicio",
      "via": "PiezaOrden.ordenServicioId",
      "cardinality": "N:1",
      "title": "Orden de servicio de la pieza",
      "description": "Cada pieza registrada por el técnico pertenece a una orden de servicio.",
      "mode": "fk",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lee una pieza por su id cuando el técnico abre su detalle para corregirla.",
    "listByForeignKey": "Lista las piezas de una orden por ordenServicioId para que el técnico y el recepcionista vean las piezas de la orden; nunca se expone en el portal del cliente.",
    "locate.byText": "Busca piezas por texto en la descripción para que el técnico encuentre una pieza ya registrada.",
    "count": "Cuenta las piezas de una orden para mostrar el total en la ficha de la orden del técnico.",
    "create": "Registra una nueva pieza con cantidad y costo interno en la orden; lo hace el técnico al diagnosticar.",
    "update": "Corrige la cantidad, el costo o la observación de una pieza mientras el técnico prepara el presupuesto.",
    "delete": "Quita una pieza registrada por error antes de emitir el presupuesto; lo hace el técnico.",
    "transaction": "Registra varias piezas de una orden todo o nada cuando el técnico guarda el diagnóstico completo.",
    "ordenServicio.costoInternoOrden": "Suma el costo interno total de las piezas de una orden para que el técnico lo compare con el valor del presupuesto; solo para el técnico."
  },
  "rules": [
    "costoInternoNoVisibleCliente",
    "piezasSoloAntesDePresupuesto",
    "cantidadPositiva"
  ],
  "kind": "entity",
  "class": "supporting",
  "storage": {
    "target": "moduleDatabase",
    "table": "ordenServicio_piezaorden",
    "kind": "relational"
  },
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "derived": true,
        "indexed": true,
        "title": "Id"
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true
      },
      "ordenServicioId": {
        "type": "record",
        "required": true,
        "indexed": true,
        "to": [
          "OrdenServicio"
        ],
        "title": "Orden de servicio",
        "description": "Orden de servicio a la que pertenece la pieza registrada por el técnico."
      },
      "descripcion": {
        "type": "string",
        "required": true,
        "indexed": true,
        "title": "Descripción de la pieza",
        "description": "Nombre o descripción de la pieza necesaria para la reparación; se usa para buscar y ordenar las piezas de una orden.",
        "maxLength": 200
      },
      "details": {
        "type": "object",
        "required": true,
        "title": "Detalles",
        "description": "Datos internos de la pieza; nunca visibles para el cliente.",
        "fields": {
          "cantidad": {
            "type": "integer",
            "required": true,
            "title": "Cantidad",
            "description": "Cantidad de unidades de la pieza necesarias para la reparación.",
            "min": 1
          },
          "costoUnitario": {
            "type": "money",
            "required": true,
            "title": "Costo interno unitario",
            "description": "Costo interno de una unidad de la pieza para el servicio técnico; nunca se muestra al cliente.",
            "min": 0
          },
          "codigoPieza": {
            "type": "string",
            "title": "Código de la pieza",
            "description": "Código o referencia del fabricante o proveedor de la pieza, si el técnico lo conoce.",
            "maxLength": 60
          },
          "observacion": {
            "type": "text",
            "title": "Observación interna",
            "description": "Anotación interna del técnico sobre la pieza; nunca visible para el cliente."
          },
          "costoTotal": {
            "type": "money",
            "derived": true,
            "title": "Costo interno total",
            "description": "Cantidad de la pieza multiplicada por su costo interno unitario; dato interno que el cliente nunca ve."
          }
        }
      }
    }
  }
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OrdenServicioEntityPiezaOrdenType = typeof ordenServicioEntityPiezaOrden;

export default ordenServicioEntityPiezaOrden;
