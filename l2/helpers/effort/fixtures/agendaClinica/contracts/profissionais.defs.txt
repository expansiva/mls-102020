/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/profissionais.defs.ts" enhancement="_blank"/>

/** Identificação resumida exibida na lista de profissionais disponíveis. */
export interface ProfessionalDirectoryIdentification {
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
    };
  };
}

/** Dados resumidos da agenda clínica exibidos na lista. */
export interface ProfessionalDirectoryAgendaClinica {
  details: {
    agendaClinica: {
      professionalType: 'medical' | 'therapist';
    };
  };
}

/** Agrupa os dados do profissional necessários para localizar um cadastro na lista. */
export interface ProfessionalDirectoryDetails {
  identification: ProfessionalDirectoryIdentification;
  agendaClinica: ProfessionalDirectoryAgendaClinica;
}

/** Linha paginada do diretório de profissionais disponíveis. */
export interface ProfessionalDirectoryItem {
  id: string;
  details: ProfessionalDirectoryDetails;
}

/** Dados de identificação completos usados para conferir e manter o cadastro. */
export interface ProfessionalIdentification {
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docType?: 'CPF' | 'Passport' | 'NationalId' | 'Other';
      docId?: string;
      countryCode: string;
    };
  };
}

/** Dados da agenda clínica que definem a atuação do profissional. */
export interface ProfessionalAgendaClinica {
  details: {
    agendaClinica: {
      professionalType: 'medical' | 'therapist';
    };
  };
}

/** Agrupa os dados completos de identificação e atuação do profissional. */
export interface ProfessionalDetails {
  identification: ProfessionalIdentification;
  agendaClinica: ProfessionalAgendaClinica;
}

/** Cadastro completo do profissional selecionado ou recém-gravado. */
export interface ProfessionalRecord {
  id: string;
  version: number;
  details: ProfessionalDetails;
}

export interface ProfissionaisContracts {
  /**
   * Finalidade: Carrega a primeira página do diretório de profissionais disponíveis quando a página é aberta.
   * Entrada: page e pageSize definem a página inicial e a quantidade de linhas adequadas à tela; são parâmetros de navegação do estado da página.
   * Processamento: Lista somente profissionais da organização cuja situação do cadastro mestre é Active, pois a página prioriza quem está disponível para o agendamento. Ordena de forma estável pelo nome e projeta apenas identificador, nome, situação e tipo de atuação.
   * Saída: Retorna professionals no contrato paginado { items, page, pageSize, hasMore }, já filtrado para profissionais ativos, para preencher o diretório sem carregar documentos ou o cadastro completo.
   */
  'agendaClinica.profissionais.loadAvailableProfessionals': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { professionals: { items: ProfessionalDirectoryItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Obtém a próxima página do diretório de profissionais disponíveis quando a recepcionista solicita mais resultados.
   * Entrada: page é a página seguinte solicitada e pageSize é a quantidade de linhas por página; ambos vêm do estado de paginação da lista.
   * Processamento: Aplica o mesmo recorte organizacional, situação Active e ordenação estável do carregamento inicial, buscando somente a página solicitada.
   * Saída: Retorna professionals no contrato paginado para anexar seus items ao diretório já mostrado e informar se ainda há mais resultados.
   */
  'agendaClinica.profissionais.loadMoreAvailableProfessionals': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { professionals: { items: ProfessionalDirectoryItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Localiza, sob demanda, profissionais disponíveis pelo nome para a recepcionista escolher o cadastro certo.
   * Entrada: search é o texto de nome informado pela recepcionista; page e pageSize controlam a primeira página da busca.
   * Processamento: Usa a capacidade de localização por nome no escopo da organização, mantém somente registros Active e aplica correspondência normalizada por nome. Ordena os resultados de forma estável e não expõe documento nesta consulta resumida.
   * Saída: Retorna professionals no contrato paginado, substituindo a lista corrente pelos resultados da busca já adequados à seleção.
   */
  'agendaClinica.profissionais.searchAvailableProfessionals': {
    kind: 'qry';
    input: { search: string; page: number; pageSize: number };
    output: { professionals: { items: ProfessionalDirectoryItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Busca a próxima página da localização por nome sem reiniciar os resultados já exibidos.
   * Entrada: search preserva o termo de busca ativo; page e pageSize identificam a próxima página a carregar.
   * Processamento: Repete exatamente o recorte organizacional, a situação Active, a normalização de nome e a ordenação estável da busca inicial, limitando a leitura à página solicitada.
   * Saída: Retorna professionals no contrato paginado para acrescentar os novos items aos resultados de busca existentes.
   */
  'agendaClinica.profissionais.loadMoreProfessionalSearch': {
    kind: 'qry';
    input: { search: string; page: number; pageSize: number };
    output: { professionals: { items: ProfessionalDirectoryItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega o cadastro completo do profissional que a recepcionista selecionou para conferência e edição.
   * Entrada: id é o identificador do profissional selecionado no diretório.
   * Processamento: Lê o registro pelo identificador dentro do escopo organizacional autorizado e compõe nome, documento, país, situação, tipo de atuação e version para controle otimista. Não carrega dados de privacidade ou dados gerais que a página não usa.
   * Saída: Retorna professional completo para preencher simultaneamente o detalhe e o formulário de manutenção.
   */
  'agendaClinica.profissionais.getProfessional': {
    kind: 'qry';
    input: { id: string };
    output: { professional: ProfessionalRecord };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Cria ou reutiliza e vincula o cadastro mestre de uma pessoa como profissional da agenda clínica.
   * Entrada: name, docType, docId e countryCode preenchem a identificação mestre; professionalType grava a atuação medical ou therapist no namespace agendaClinica.
   * Processamento: Executa register.createOrAttach no escopo autorizado. Valida a combinação de documento e país exigida pela operação e mantém a identificação no cadastro mestre, gravando no namespace agendaClinica somente a atuação permitida.
   * Saída: Retorna professional com id e version gerados ou resolvidos, situação, identificação e atuação para redesenhar detalhe e formulário e inserir ou atualizar a linha correspondente no diretório.
   */
  'agendaClinica.profissionais.createProfessional': {
    kind: 'cmd';
    writes: 'Profissional.create';
    input: { details: { identification: { name: string; docType?: 'CPF' | 'Passport' | 'NationalId' | 'Other'; docId?: string; countryCode: string }; agendaClinica: { professionalType: 'medical' | 'therapist' } } };
    output: { professional: ProfessionalRecord };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
  /**
   * Finalidade: Atualiza os dados de identificação permitidos e o tipo de atuação do profissional selecionado.
   * Entrada: id identifica o cadastro e version faz a concorrência otimista; os demais campos são as alterações de nome, documento, país e tipo de atuação preenchidas no formulário.
   * Processamento: Recusa versão desatualizada e aplica edit.platformFields à identificação e edit.moduleNamespace exclusivamente a agendaClinica.professionalType. Não altera situação, consentimento ou dados gerais.
   * Saída: Retorna professional com a nova version e todos os dados exibidos, permitindo redesenhar detalhe e formulário e atualizar a linha da lista sem nova leitura.
   */
  'agendaClinica.profissionais.updateProfessional': {
    kind: 'cmd';
    writes: 'Profissional.update';
    input: { id: string; version: number; details: { identification: { name: string; docType?: 'CPF' | 'Passport' | 'NationalId' | 'Other'; docId?: string; countryCode: string }; agendaClinica: { professionalType: 'medical' | 'therapist' } } };
    output: { professional: ProfessionalRecord };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaConsultarProfissionais']; scope: 'organization' };
  };
}
