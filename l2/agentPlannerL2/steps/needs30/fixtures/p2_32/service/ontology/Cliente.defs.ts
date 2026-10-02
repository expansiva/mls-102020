/// <mls fileReference="_102047_/l4/ordenServicio/ontology/Cliente.defs.ts" enhancement="_blank"/>

import type { Ns5OntologyEntityV3 } from '/_102035_/l2/solution/types.js';

export const ordenServicioEntityCliente = {
  "schemaVersion": "2026-09-17-ns5-ontology-v3.1",
  "moduleName": "ordenServicio",
  "entityId": "Cliente",
  "title": "Cliente",
  "description": "Persona que entrega un aparato al servicio técnico, consulta sus propias órdenes y decide sobre el presupuesto desde el portal.",
  "displayField": "details.identification.name",
  "relationships": {
    "serviceOrders": {
      "relationshipId": "serviceOrderCustomer",
      "to": "OrdenServicio",
      "via": "OrdenServicio.customerId",
      "cardinality": "1:N",
      "title": "Órdenes de servicio del cliente",
      "description": "Órdenes de servicio asociadas a este cliente, quien puede consultarlas y decidir sobre sus presupuestos.",
      "mode": "fk",
      "direction": "to",
      "required": true,
      "role": "cliente"
    }
  },
  "capabilities": {
    "read.byId": "Consulta un cliente por su identificador maestro para mostrarlo en la orden o en el portal; usa lectura directa por id; lo usan recepcionista, técnico y cliente dentro de sus permisos.",
    "locate.byName": "Busca un cliente por una parte de su nombre al abrir una orden; usa el índice de nombre; lo usa el recepcionista.",
    "locate.byDocument": "Localiza un cliente por su documento para evitar registros duplicados antes de abrir una orden; usa el índice de documento; lo usa el recepcionista.",
    "locate.byContact": "Localiza un cliente por un canal de contacto al identificarlo en recepción; busca sus canales de contacto vinculados; lo usa el recepcionista.",
    "register.createOrAttach": "Crea o vincula el registro maestro de la persona y le asigna el rol de cliente del módulo; deduplica por documento o contacto y adjunta el rol; lo usa el recepcionista al abrir una orden.",
    "edit.platformFields": "Actualiza los datos de identificación, dirección y consentimiento administrados por la plataforma; reindexa la identificación cuando corresponde; lo usa el recepcionista.",
    "link.contact": "Vincula un canal de contacto del cliente para comunicaciones y acceso al portal; crea el ContactChannel y la relación HasContact; lo usa el recepcionista.",
    "invite.login": "Invita al cliente a iniciar sesión en el portal para consultar únicamente sus propias órdenes y decidir sobre presupuestos; crea el índice de acceso; lo usa el recepcionista.",
    "listLinks": "Muestra las relaciones vigentes del cliente, incluidas sus órdenes asociadas; consulta las relaciones y sus vigencias; lo usan recepcionista y técnico según sus permisos.",
    "inactivate": "Inactiva o reactiva el registro maestro del cliente sin eliminarlo; cambia el estado administrado por la plataforma; lo usa el recepcionista autorizado.",
    "attach.document": "Adjunta documentación o imágenes que correspondan al registro maestro del cliente; almacena el archivo mediante la plataforma; lo usa el recepcionista.",
    "audit": "Consulta quién modificó los datos maestros del cliente y cuándo; lee la auditoría de la plataforma; lo usa el personal autorizado."
  },
  "rules": [
    "rule-foreign-namespace-refused",
    "rule-document-shape-validated",
    "rule-identity-never-in-namespace",
    "rule-person-ssn-unique-for-us",
    "rule-person-privacy-consent-required-br-eu"
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
        "description": "Bumped by the engine on every write; optimistic concurrency."
      },
      "details": {
        "type": "object",
        "required": true,
        "description": "Registro maestro de la persona cliente utilizado por el módulo de órdenes de servicio.",
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
                    "title": "Persona",
                    "description": "Persona natural registrada como cliente."
                  }
                ],
                "description": "Indica que este registro maestro corresponde a una persona cliente.",
                "title": "Tipo de registro",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "name": {
                "type": "string",
                "required": true,
                "indexed": true,
                "maxLength": 0,
                "description": "Nombre con el que se identifica al cliente al abrir y consultar sus órdenes de servicio.",
                "title": "Nombre",
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
                    "description": "El cliente puede utilizarse en órdenes de servicio."
                  },
                  {
                    "value": "Inactive",
                    "title": "Inactivo",
                    "description": "El cliente no está disponible para nuevos usos."
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
                "title": "Estado del registro",
                "description": "Disponibilidad del registro maestro del cliente en la plataforma.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docType": {
                "type": "enum",
                "indexed": true,
                "values": [
                  {
                    "value": "SSN",
                    "title": "SSN",
                    "description": "Número de seguridad social."
                  },
                  {
                    "value": "EIN",
                    "title": "EIN",
                    "description": "Número de identificación fiscal estadounidense."
                  },
                  {
                    "value": "Passport",
                    "title": "Pasaporte",
                    "description": "Documento de pasaporte."
                  },
                  {
                    "value": "DriversLicense",
                    "title": "Licencia de conducir",
                    "description": "Licencia de conducir."
                  },
                  {
                    "value": "NationalId",
                    "title": "Documento nacional",
                    "description": "Documento nacional de identidad."
                  },
                  {
                    "value": "CPF",
                    "title": "CPF",
                    "description": "Documento CPF."
                  },
                  {
                    "value": "CNPJ",
                    "title": "CNPJ",
                    "description": "Documento CNPJ."
                  },
                  {
                    "value": "VAT",
                    "title": "IVA",
                    "description": "Identificador fiscal de IVA."
                  },
                  {
                    "value": "Other",
                    "title": "Otro",
                    "description": "Otro tipo de documento admitido por la plataforma."
                  }
                ],
                "title": "Tipo de documento",
                "description": "Tipo de documento nacional usado para identificar y evitar duplicar al cliente.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "docId": {
                "type": "string",
                "indexed": true,
                "description": "Número del documento del cliente, usado para localizarlo y evitar duplicados.",
                "title": "Número de documento",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "countryCode": {
                "type": "string",
                "required": true,
                "indexed": true,
                "pattern": "^[A-Z]{2}$",
                "maxLength": 2,
                "default": "US",
                "description": "Código de país que determina el contexto del documento y las reglas aplicables al cliente.",
                "title": "País",
                "min": 0,
                "max": 0
              }
            },
            "description": "Datos de identificación del cliente administrados por la plataforma."
          },
          "base": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "addresses": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "Address",
                "title": "Direcciones",
                "description": "Direcciones del cliente que la recepción puede consultar o actualizar cuando sean necesarias.",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "contacts": {
                "type": "object",
                "required": true,
                "collection": true,
                "of": "ContactSummary",
                "derived": true,
                "description": "Resumen derivado de los canales de contacto vinculados al cliente, usado para enviarle el acceso al portal y comunicaciones de la orden.",
                "title": "Contactos",
                "maxLength": 0,
                "min": 0,
                "max": 0
              },
              "relationshipRefs": {
                "type": "object",
                "required": true,
                "derived": true,
                "description": "Referencias compactas derivadas de las relaciones del cliente con otros registros maestros.",
                "title": "Referencias de relaciones",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Datos generales del cliente administrados por la plataforma."
          },
          "person": {
            "type": "object",
            "owner": "platform",
            "fields": {
              "privacyConsent": {
                "type": "object",
                "of": "PrivacyConsent",
                "description": "Consentimiento de privacidad del cliente cuando corresponda por su residencia.",
                "title": "Consentimiento de privacidad",
                "maxLength": 0,
                "min": 0,
                "max": 0
              }
            },
            "description": "Datos propios de la persona que pueden ser necesarios para las obligaciones de privacidad del cliente."
          },
          "general": {
            "type": "object",
            "owner": "organization",
            "open": true,
            "description": "Datos promovidos por la organización que el módulo puede consultar, sin declararlos ni modificarlos."
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

export type OrdenServicioEntityClienteType = typeof ordenServicioEntityCliente;

export default ordenServicioEntityCliente;
