/// <mls fileReference="_102020_/l2/agentNewSolution/steps/e3/fixtures/duplicateGrant.fixture.ts" enhancement="_blank"/>

// Verbatim E3 payload from the first petShop run (module petShop, 2026-08-21):
// three grants for the SAME cliente x petshop:cliente pair, one per access facet
// (public / own / related). Each grant is individually sound; the contract is
// one grant per pair, so the gate rejected it and the step died terminal with no
// repair round. This fixture is the regression evidence for that incident.
export const ns4E3DuplicateGrantPayload = {
    "planId": "e3-access-review",
    "moduleName": "petShop",
    "userLanguage": "pt-BR",
    "title": "Matriz de acesso do Pet Shop",
    "reviewRound": 1,
    "profiles": [
      {
        "profileId": "admin",
        "title": "Administrador da loja",
        "kind": "internal",
        "description": "Responsável pela operação da loja, pela agenda, pelas decisões de agendamento e pelo registro presencial do atendimento.",
        "actorRefs": [
          "admin"
        ],
        "landingIntent": "Acessar a visão operacional para organizar a agenda e conduzir os atendimentos."
      },
      {
        "profileId": "cliente",
        "title": "Cliente",
        "kind": "external",
        "description": "Pessoa que mantém os próprios pets, solicita serviços e acompanha exclusivamente os atendimentos vinculados a eles.",
        "actorRefs": [
          "cliente"
        ],
        "landingIntent": "Conhecer a loja, manter os próprios pets, solicitar agendamentos e acompanhar seus atendimentos."
      }
    ],
    "authorities": [
      {
        "authorityRef": "petshop:admin",
        "title": "Operar a gestão do Pet Shop",
        "description": "Permite administrar a agenda e executar os registros operacionais dos atendimentos da loja.",
        "journeyStepRefs": [
          "approveServiceAppointment.locatePendingServiceAppointment",
          "approveServiceAppointment.approveServiceAppointment",
          "rejectServiceAppointment.locatePendingServiceAppointment",
          "rejectServiceAppointment.rejectServiceAppointment",
          "recordPetArrival.locateConfirmedServiceAppointment",
          "recordPetArrival.recordPetArrival",
          "startServiceExecution.locateArrivedServiceAppointment",
          "startServiceExecution.startServiceExecution",
          "attachBeforeServiceImage.locateStartedServiceExecution",
          "attachBeforeServiceImage.attachBeforeServiceImage",
          "finishServiceExecution.locateStartedServiceExecution",
          "finishServiceExecution.finishServiceExecution",
          "attachAfterServiceImage.locateCompletedServiceExecution",
          "attachAfterServiceImage.attachAfterServiceImage",
          "recordInStorePayment.locateCompletedServiceAppointment",
          "recordInStorePayment.recordInStorePayment",
          "recordPetCollection.locatePaidServiceAppointment",
          "recordPetCollection.recordPetCollection",
          "planServiceUnavailability.locateServiceHours",
          "planServiceUnavailability.createAvailabilityBlock",
          "registerServiceHours.createServiceHours"
        ],
        "informationNeeds": []
      },
      {
        "authorityRef": "petshop:cliente",
        "title": "Utilizar serviços e acompanhar os próprios pets",
        "description": "Permite consultar informações públicas da loja, manter os próprios dados e pets, solicitar serviços e acompanhar exclusivamente os atendimentos relacionados aos próprios pets.",
        "journeyStepRefs": [
          "exploreInstitutionalHome.inspectInstitutionalHome",
          "requestServiceAppointment.locatePet",
          "requestServiceAppointment.locateServiceOffering",
          "requestServiceAppointment.locateAppointmentSlot",
          "requestServiceAppointment.createServiceAppointment",
          "viewPetCareOverview.locatePet",
          "viewPetCareOverview.inspectPetCareOverview",
          "registerCustomerProfile.createCustomerProfile",
          "registerPet.locateCustomerProfile",
          "registerPet.createPet"
        ],
        "informationNeeds": [
          "Informações institucionais e serviços oferecidos pelo Pet Shop",
          "Horários disponíveis para novas solicitações",
          "Cadastro e lista dos pets da própria pessoa cliente",
          "Status, histórico, pendências e imagens vinculados aos próprios pets",
          "Solicitações de agendamento realizadas para os próprios pets"
        ]
      }
    ],
    "grants": [
      {
        "profileRef": "admin",
        "authorityRef": "petshop:admin",
        "reason": "O administrador precisa conduzir integralmente a operação da loja, desde a configuração da agenda até a retirada presencial do pet.",
        "dataScope": {
          "mode": "organization",
          "description": "Todos os horários, indisponibilidades, solicitações, atendimentos, pets, imagens e pagamentos presenciais pertencentes à organização ativa."
        },
        "disclosure": {
          "mode": "fullRecord",
          "description": "A operação exige acesso aos registros completos necessários para decidir agendamentos, atender o pet e registrar cada etapa presencial."
        },
        "useRules": [
          "activeOrganizationRequired",
          "adminOnlyAppointmentDecision",
          "adminOnlyOperationalRegistration",
          "paymentMustBeRecordedBeforePetCollection"
        ]
      },
      {
        "profileRef": "cliente",
        "authorityRef": "petshop:cliente",
        "reason": "O cliente precisa conhecer a loja e selecionar um serviço e um horário que possam ser solicitados, sem acessar dados operacionais da organização.",
        "dataScope": {
          "mode": "public",
          "description": "Somente conteúdo institucional publicado, serviços oferecidos e horários disponibilizados publicamente para novas solicitações."
        },
        "disclosure": {
          "mode": "fieldsOnly",
          "description": "Expõe apenas as informações necessárias para apresentação da loja e criação de uma solicitação de agendamento.",
          "allowedInformation": [
            "Apresentação institucional publicada",
            "Serviços oferecidos ao público",
            "Descrição pública dos serviços",
            "Horários disponíveis para solicitação"
          ],
          "deniedInformation": [
            "Dados de outros clientes e pets",
            "Solicitações de outros clientes",
            "Agenda operacional completa",
            "Indisponibilidades com detalhes internos",
            "Dados de pagamento",
            "Anotações internas da loja"
          ]
        },
        "useRules": [
          "onlyPublishedInstitutionalContent",
          "onlyAvailableAppointmentSlots"
        ]
      },
      {
        "profileRef": "cliente",
        "authorityRef": "petshop:cliente",
        "reason": "O cliente precisa criar e manter o próprio cadastro, cadastrar seus pets e solicitar atendimentos em nome deles.",
        "dataScope": {
          "mode": "own",
          "description": "Somente o cadastro da pessoa autenticada, os pets por ela mantidos e as solicitações de agendamento criadas para esses pets."
        },
        "disclosure": {
          "mode": "fullRecord",
          "description": "Expõe os registros completos próprios necessários para manter o cadastro, os pets e as solicitações de serviço."
        },
        "useRules": [
          "authenticatedCustomerRequired",
          "customerProfileMustBelongToAuthenticatedPerson",
          "petMustBelongToAuthenticatedCustomer",
          "appointmentMustReferenceCustomersOwnPet"
        ]
      },
      {
        "profileRef": "cliente",
        "authorityRef": "petshop:cliente",
        "reason": "O cliente precisa acompanhar pela web a evolução e o histórico dos atendimentos vinculados aos próprios pets.",
        "dataScope": {
          "mode": "related",
          "description": "Somente atendimentos, execuções, pendências e imagens relacionados a pets pertencentes ao cadastro da pessoa cliente autenticada."
        },
        "disclosure": {
          "mode": "fieldsOnly",
          "description": "Expõe o acompanhamento do pet sem revelar informações internas da operação ou dados de terceiros.",
          "allowedInformation": [
            "Identificação e dados cadastrais do próprio pet",
            "Status da própria solicitação de agendamento",
            "Confirmação ou recusa do próprio agendamento",
            "Registro de chegada do próprio pet",
            "Início e conclusão do serviço do próprio pet",
            "Últimas execuções e pendências do próprio pet",
            "Situação de pagamento do próprio atendimento",
            "Registro de retirada do próprio pet",
            "Imagens opcionais de antes e depois vinculadas ao próprio pet"
          ],
          "deniedInformation": [
            "Dados de outros clientes e pets",
            "Agenda geral da loja",
            "Detalhes de indisponibilidades internas",
            "Dados financeiros internos",
            "Dados de pagamento de outros atendimentos",
            "Anotações internas da loja",
            "Registros completos de atendimentos não relacionados aos próprios pets"
          ]
        },
        "useRules": [
          "petOwnershipRequired",
          "relatedServiceRecordRequired",
          "onlyCustomerVisibleServiceImages"
        ]
      }
    ],
    "changeSummary": [
      "Proposta inicial da matriz com os dois perfis solicitados: Administrador da loja e Cliente.",
      "O administrador recebe acesso organizacional à operação; o cliente recebe acesso limitado a conteúdo público, registros próprios e atendimentos relacionados aos próprios pets.",
      "A consulta do cliente foi delimitada para não expor agenda interna, dados de terceiros, informações financeiras internas ou anotações operacionais da loja."
    ]
  } as const;

// The same matrix after a valid repair: the three facets collapse into ONE grant
// whose scope covers every step, with the facet limits detailed in disclosure.
export const ns4E3RepairedGrantPayload = buildRepaired();

function buildRepaired(): Record<string, unknown> {
  const source = JSON.parse(JSON.stringify(ns4E3DuplicateGrantPayload)) as Record<string, unknown>;
  const grants = source.grants as Array<Record<string, unknown>>;
  const admin = grants.find(grant => grant.profileRef === 'admin');
  const facets = grants.filter(grant => grant.profileRef === 'cliente');
  const covering = JSON.parse(JSON.stringify(facets[facets.length - 1])) as Record<string, unknown>;
  const disclosure = covering.disclosure as Record<string, unknown>;
  disclosure.allowedInformation = facets
    .flatMap(grant => ((grant.disclosure as Record<string, unknown>).allowedInformation as string[]) || [])
    .filter((item, index, all) => all.indexOf(item) === index);
  covering.reason = facets.map(grant => grant.reason as string).join(' ');
  source.grants = [admin, covering].filter(Boolean);
  return source;
}

/**
 * The E2 journeys this matrix was approved against, derived from the very
 * journeyStepRefs the real authorities carry — so E3 coverage is consistent by
 * construction and these tests isolate the grant rule instead of tripping on
 * unrelated coverage findings.
 */
export const ns4E3PetShopJourneysInput = buildPetShopJourneys();

function buildPetShopJourneys(): Record<string, unknown> {
  const authorities = ns4E3DuplicateGrantPayload.authorities as ReadonlyArray<{
    authorityRef: string; journeyStepRefs: ReadonlyArray<string>;
  }>;
  const actorByJourney = new Map<string, string>();
  const stepsByJourney = new Map<string, string[]>();

  authorities.forEach(authority => {
    const actorRef = authority.authorityRef.split(':')[1];
    authority.journeyStepRefs.forEach(stepRef => {
      const [journeyId, stepId] = stepRef.split('.');
      if (!journeyId || !stepId) return;
      actorByJourney.set(journeyId, actorRef);
      const steps = stepsByJourney.get(journeyId) || [];
      if (!steps.includes(stepId)) steps.push(stepId);
      stepsByJourney.set(journeyId, steps);
    });
  });

  const journeys = [...stepsByJourney.entries()].map(([journeyId, stepIds]) => ({
    journeyId,
    business: {
      actorRef: actorByJourney.get(journeyId) || 'admin',
      title: journeyId,
      goal: `Concluir ${journeyId}.`,
      entry: { mode: 'coldStart' },
      steps: stepIds.map(stepId => ({
        stepId,
        kind: /^(locate|inspect)/.test(stepId) ? 'locate' : 'create',
        entity: 'ServiceAppointment',
        title: stepId,
        description: `Passo ${stepId}.`,
        featureRefs: [`${journeyId}Feature`],
      })),
      outcome: { statement: `${journeyId} concluído.`, evidence: [`${journeyId} registrado.`] },
      useRules: [],
    },
  }));

  return {
    planId: 'e2-review', moduleName: 'petShop', userLanguage: 'pt-BR', title: 'Jornadas', reviewRound: 1,
    journeys,
    features: journeys.map(journey => ({
      featureId: `${journey.journeyId}Feature`,
      title: journey.journeyId,
      priority: 'now',
      journeyStepRefs: journey.business.steps.map(step => `${journey.journeyId}.${step.stepId}`),
    })),
  };
}
