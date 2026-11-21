/// <mls fileReference="_102047_/l4/ordenServicio/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3, Ns5Readonly } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityCliente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Persona que trae un aparato al servicio técnico, es dueña de sus órdenes de servicio y accede al portal para ver sus propias órdenes y aprobar o rechazar el presupuesto. Se registra (o se reutiliza) al abrir la orden.",
  "displayField": "details.identification.name",
  "relationships": {
    "ordenes": {
      "relationshipId": "ordenCliente",
      "to": "OrdenServicio",
      "via": "OrdenServicio.clienteId",
      "cardinality": "1:N",
      "title": "Órdenes de servicio del cliente",
      "description": "Cada orden de servicio pertenece a un cliente; en el portal el cliente solo ve las suyas.",
      "mode": "fk",
      "direction": "to",
      "required": true
    }
  },
  "capabilities": {
    "read.byId": "Lee el cliente por su id para mostrar su nombre y contactos en la orden de servicio y en el portal; lo usan recepcionista, técnico y el propio cliente.",
    "locate.byName": "Busca al cliente por parte del nombre cuando el recepcionista abre una orden y no tiene el documento a mano.",
    "locate.byDocument": "Busca al cliente por su documento nacional para reutilizar el mismo registro antes de abrir la orden; lo usa el recepcionista.",
    "locate.byContact": "Encuentra al cliente por su teléfono o correo cuando llama o escribe preguntando por su aparato; lo usa el recepcionista.",
    "register.createOrAttach": "Registra al cliente si no existe o reutiliza el registro existente y le asigna el rol ordenServicio.Cliente al abrir la orden; lo usa el recepcionista.",
    "edit.platformFields": "Corrige el nombre, el documento o el consentimiento del cliente cuando el recepcionista detecta datos desactualizados.",
    "link.contact": "Agrega el teléfono, WhatsApp o correo del cliente como canal de contacto vinculado, para avisarle del presupuesto y del retiro; lo usa el recepcionista.",
    "listLinks": "Muestra los vínculos del cliente, como sus canales de contacto, en la ficha que consulta el recepcionista.",
    "invite.login": "Da acceso al portal al cliente para que vea sus propias órdenes y apruebe o rechace el presupuesto; lo dispara la plataforma al registrarlo el recepcionista.",
    "locate.byLogin": "Resuelve qué cliente está detrás del correo de acceso al portal, para mostrarle solamente sus órdenes.",
    "inactivate": "Deja inactivo al cliente sin borrarlo, conservando sus órdenes históricas; lo usa el recepcionista.",
    "comment": "Permite al recepcionista dejar una nota interna sobre el cliente, sin visibilidad en el portal.",
    "statusHistory.read": "Muestra cuándo y quién activó o inactivó al cliente, en la ficha del recepcionista.",
    "audit": "Registra quién modificó los datos del cliente y cuándo, consultable por un administrador."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-identity-never-in-namespace",
    "rule-document-shape-validated",
    "rule-delete-blocked-by-relationships",
    "rule-person-privacy-consent-required-br-eu",
    "clienteVeSoloSusOrdenes",
    "clienteNoVeCostoInterno"
  ],
  "kind": "role",
  "subtype": "Person",
  "roleTag": "ordenServicio.Cliente",
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
        "writePrecondition": true,
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro maestro de la persona que trae aparatos al servicio técnico, visto desde el módulo de órdenes de servicio.",
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
                    "value": "Person",
                    "title": "Persona"
                  }
                ],
                "description": "Siempre persona: el cliente del servicio técnico es una persona física.",
                "title": "Subtipo"
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 200,
                "description": "Nombre del cliente con el que el recepcionista lo busca y que aparece en sus órdenes de servicio.",
                "title": "Nombre"
              },
              "status": {
                "type": "enum",
                "required": true,
                "indexed": true,
                "derived": true,
                "values": [
                  {
                    "value": "Active",
                    "title": "Activo"
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactivo"
                  },
                  {
                    "value": "Merged",
                    "title": "Fusionado"
                  },
                  {
                    "value": "Blocked",
                    "title": "Bloqueado"
                  }
                ],
                "title": "Estado",
                "description": "Situación del registro maestro del cliente (activo o inactivo)."
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN"
                  },
                  {
                    "value": "EIN",
                    "title": "EIN"
                  },
                  {
                    "value": "Passport",
                    "title": "Pasaporte"
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Licencia de conducir"
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional de identidad"
                  },
                  {
                    "value": "CPF",
                    "title": "CPF"
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ"
                  },
                  {
                    "value": "VAT",
                    "title": "Identificación fiscal"
                  },
                  {
                    "value": "Other",
                    "title": "Otro"
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo de documento nacional del cliente, usado para buscarlo y evitar duplicados al abrir la orden."
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número del documento con el que el recepcionista localiza al cliente antes de registrarlo de nuevo.",
                "title": "Número de documento"
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "País del cliente (ISO 3166-1 alfa-2), al que pertenecen su documento y las reglas de privacidad.",
                "title": "País"
              },
              "tags": {
                "type": "string",
                "required": true,
                "collection": true,
                "derived": true,
                "description": "Roles del registro; incluye ordenServicio.Cliente cuando la persona es cliente del servicio técnico.",
                "title": "Roles"
              }
            },
            "description": "Datos con los que el recepcionista busca y reconoce al cliente al abrir una orden."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumen de teléfonos y correos del cliente, para avisarle del presupuesto y de que el aparato está listo o disponible para retiro.",
                "title": "Contactos"
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Claves compactas de los vínculos del cliente, recalculadas por la plataforma.",
                "title": "Referencias de vínculos"
              }
            },
            "description": "Datos comunes del registro maestro que el módulo lee."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimiento del cliente para el tratamiento de sus datos personales, exigido según su país de residencia.",
                "title": "Consentimiento de privacidad"
              }
            },
            "description": "Datos de persona física que el módulo usa."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Campos promovidos por la organización; el módulo solo los lee."
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
} as const satisfies Ns5Readonly<Ns5OntologyEntityV3>;

export type OrdenServicioEntityClienteType = typeof ordenServicioEntityCliente;

export default ordenServicioEntityCliente;
