/// <mls fileReference="_102047_/l2/agendaClinica/web/contracts/pacientes.defs.ts" enhancement="_blank"/>

/** Identificação resumida exibida em cada resultado da busca de pacientes. */
export interface PatientListIdentification {
  details: {
    identification: {
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docId?: string;
    };
  };
}

/** Dados do paciente necessários para localizar e distinguir resultados pelo nome. */
export interface PatientListDetails {
  identification: PatientListIdentification;
}

/** Paciente em formato compacto para a lista de localização. */
export interface PatientListItem {
  id: string;
  details: PatientListDetails;
}

/** Identificação completa do paciente para conferência e após o cadastro. */
export interface PatientIdentification {
  details: {
    identification: {
      readonly subtype: 'Person';
      name: string;
      readonly status: 'Active' | 'Inactive' | 'Merged' | 'Blocked';
      docType?: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other';
      docId?: string;
    };
  };
}

/** Bloco base do paciente autorizado para conferência na ficha. */
export interface PatientBase {
  details: {
    base: string;
  };
}

/** Dados completos que a página mostra ao conferir o paciente. */
export interface PatientDetails {
  identification: PatientIdentification;
  base: PatientBase;
}

/** Paciente selecionado, pronto para conferência e continuidade no agendamento. */
export interface PatientDetail {
  id: string;
  details: PatientDetails;
}

export interface PacientesContracts {
  /**
   * Finalidade: Inicializa a área de localização de pacientes sem trazer cadastros antes de a recepcionista informar um nome.
   * Entrada: page e pageSize definem a primeira janela da lista. Como a página abriu sem critério de nome, não há termo de busca.
   * Processamento: Prepara a lista paginada em estado vazio quando não há busca nominal. Não consulta nem transfere todos os pacientes; a localização é feita sob demanda por searchPatients.
   * Saída: Retorna patients no contrato paginado para alimentar a lista em estado inicial, preservando a mesma estrutura usada pela busca.
   */
  'agendaClinica.pacientes.loadPatients': {
    kind: 'qry';
    input: { page: number; pageSize: number };
    output: { patients: { items: PatientListItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas']; scope: 'organization' };
  };
  /**
   * Finalidade: Localiza pacientes pelo nome para a recepcionista escolher quem seguirá para o agendamento.
   * Entrada: nameSearch é o nome informado pela recepcionista; page e pageSize definem a janela solicitada dos resultados.
   * Processamento: Pesquisa Paciente pelo índice de nome, aplica o termo informado e retorna somente a página solicitada. Compõe cada resultado com identificador, nome, situação e número de documento, sem carregar a ficha completa.
   * Saída: Retorna patients paginado, já no formato compacto que a lista apresenta para identificar e selecionar um paciente.
   */
  'agendaClinica.pacientes.searchPatients': {
    kind: 'qry';
    input: { nameSearch: string; page: number; pageSize: number };
    output: { patients: { items: PatientListItem[]; page: number; pageSize: number; hasMore: boolean } };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas']; scope: 'organization' };
  };
  /**
   * Finalidade: Carrega a ficha do paciente que a recepcionista selecionou para confirmar sua identificação antes de ir ao agendamento.
   * Entrada: patientId é o identificador do resultado escolhido na lista.
   * Processamento: Lê o paciente selecionado e compõe sua identificação completa e seu bloco base autorizado. A situação é devolvida como campo derivado do cadastro mestre, sem ser gravada por esta consulta.
   * Saída: Retorna patient para a ficha de conferência, evitando carregar dados completos de todos os itens da lista.
   */
  'agendaClinica.pacientes.loadPatientDetail': {
    kind: 'qry';
    input: { patientId: string };
    output: { patient: PatientDetail };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas']; scope: 'organization' };
  };
  /**
   * Finalidade: Cadastra ou associa o novo paciente informado pela recepcionista e o deixa imediatamente disponível para conferência e agendamento.
   * Entrada: name é o nome obrigatório de identificação; docType e docId são o tipo e o número do documento quando informados no formulário.
   * Processamento: Executa Paciente.create por meio do cadastro mestre createOrAttach: valida o formato do documento quando ele for informado, procura identidade existente pelo documento e cria ou associa o papel de paciente conforme necessário. A situação, o subtipo e os dados base retornados são determinados pelo cadastro mestre; não são recebidos como campos graváveis da página.
   * Saída: Retorna a ficha completa do paciente cadastrado e sua projeção compacta para atualizar a ficha e inserir ou atualizar o resultado correspondente na lista sem uma segunda chamada.
   */
  'agendaClinica.pacientes.savePatient': {
    kind: 'cmd';
    writes: 'Paciente.create';
    input: { details: { identification: { name: string; docType?: 'SSN' | 'EIN' | 'Passport' | 'DriversLicense' | 'NationalId' | 'CPF' | 'CNPJ' | 'VAT' | 'Other'; docId?: string } } };
    output: { patient: PatientDetail; patientListItem: PatientListItem };
    rules: [];
    access: { actors: ['recepcionista']; grants: ['recepcionistaGerenciarPacientesEconsultas']; scope: 'organization' };
  };
}
