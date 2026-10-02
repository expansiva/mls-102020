/// <mls fileReference="_102047_/l4/ordenServicio/ontology/Aparato.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityAparato = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "Aparato",
  "title": "Aparato",
  "description": "Equipo electrónico recibido para diagnóstico, presupuesto, reparación y posterior entrega.",
  "displayField": "details.identification.name",
  "relationships": {
    "serviceOrders": {
      "relationshipId": "serviceOrderDevice",
      "to": "OrdenServicio",
      "via": "OrdenServicio.deviceId",
      "cardinality": "1:N",
      "title": "Órdenes de servicio del aparato",
      "description": "Órdenes de servicio que registran este aparato como el equipo recibido para diagnóstico, reparación o retiro.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Consulta un aparato por su identificador maestro mediante lectura directa; lo usan recepción y técnicos al abrir o atender una orden de servicio.",
    "locate.byName": "Busca aparatos por el nombre registrado en el índice maestro; lo usa recepción para localizar un aparato antes de abrir una orden.",
    "register.createOrAttach": "Crea el aparato si no existe o le asigna el rol de Aparato de ordenServicio mediante identificación del registro maestro; lo usa recepción al recibir un equipo.",
    "edit.platformFields": "Actualiza los datos maestros del aparato, como nombre, marca, modelo, categoría o número de serie, mediante la edición del registro; lo usa recepción al corregir la identificación del equipo.",
    "inactivate": "Inactiva o reactiva el registro maestro sin eliminarlo mediante el cambio de estado de MDM; lo usa recepción cuando un aparato ya no debe utilizarse.",
    "attach.document": "Adjunta fotografías del aparato y de su estado de recepción al registro maestro por categoría documental; lo usa recepción al recibir el equipo.",
    "statusHistory.read": "Consulta los cambios de estado maestro del aparato mediante su historial de estado; lo usa recepción al revisar su disponibilidad administrativa.",
    "audit": "Consulta quién modificó los datos maestros del aparato y cuándo mediante la auditoría de MDM; lo usa personal autorizado para seguimiento."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-delete-blocked-by-relationships",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace"
  ],
  "kind": "role",
  "subtype": "AssetEquipment",
  "roleTag": "ordenServicio.Aparato",
  "source": "/_102034_/l4/ontology/mdm.defs.ts",
  "record": {
    "fields": {
      "id": {
        "type": "uuid",
        "required": true,
        "indexed": true,
        "derived": true,
        "description": "mdmId; stable through promotion and merge."
      },
      "version": {
        "type": "integer",
        "required": true,
        "derived": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Documento maestro del aparato con sus datos de identificación, base, equipo y el espacio propio de órdenes de servicio.",
        "fields": {
          "identification": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "subtype": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "AssetEquipment",
                    "title": "Equipo o aparato",
                    "description": "Equipo, dispositivo o infraestructura."
                  }
                ],
                "description": "Indica que este registro maestro corresponde a un equipo o aparato.",
                "title": "Subtipo",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nombre con el que recepción identifica el aparato al abrir y consultar una orden de servicio.",
                "title": "Nombre del aparato",
                "min": 0,
                "max": 0
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Activo",
                    "description": "El aparato puede utilizarse en órdenes de servicio."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactivo",
                    "description": "El aparato se conserva pero no se utiliza."
                  },
                  {
                    "value": "Merged",
                    "title": "Fusionado",
                    "description": "El registro fue fusionado con otro registro maestro."
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado",
                    "description": "El registro está bloqueado por la plataforma."
                  }
                ],
                "title": "Estado maestro",
                "description": "Estado de actividad del registro maestro del aparato.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 0,
                "default": "US",
                "description": "Código ISO del país aplicable al registro maestro del aparato.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Datos de identificación y estado del aparato en el registro maestro."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {},
            "description": "Rama base de la plataforma para datos comunes del registro maestro; este módulo no utiliza campos propios de esta rama."
          },
          "assetEquipment": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "serialNumber": {
                "type": "string",
                "title": "Número de serie",
                "description": "Número de serie informado o visible en el aparato recibido.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "brand": {
                "type": "string",
                "title": "Marca",
                "description": "Marca del aparato electrónico.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "model": {
                "type": "string",
                "title": "Modelo",
                "description": "Modelo comercial o técnico del aparato.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "category": {
                "type": "string",
                "title": "Categoría",
                "description": "Categoría del aparato, como teléfono, computadora, televisor u otro equipo electrónico.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Características del equipo electrónico recibidas para identificarlo durante el diagnóstico, reparación y entrega."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Rama de datos promovidos por la organización, disponible para lectura y declarada fuera de este módulo."
          },
          "ordenServicio": {
            "type": "object",
            "owner": "module",
            "fields": {},
            "description": "Module namespace; the prompt asked for no data of this module about the record."
          }
        }
      }
    }
  }
} as const satisfies Ns5OntologyEntityV3;

export type OrdenServicioEntityAparatoType = typeof ordenServicioEntityAparato;

export default ordenServicioEntityAparato;
