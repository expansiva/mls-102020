/// <mls fileReference="_102020_/l2/helpers/contractV2/types.ts" enhancement="_blank"/>

export interface D2ContractV2Location {
  project: number;
  module: string;
  pageId: string;
}

export interface D2ContractV2Projection {
  name: string;
  entityId: string;
  requestIds: string[];
  body: string;
}

export interface D2ContractV2MetaOutput {
  entity: string;
  many: boolean;
}

export interface D2ContractV2MetaList {
  key: string;
  page: string;
  pageSize: string;
  hasMore: string;
}

export interface D2ContractV2MetaParamFilter {
  filters: string;
  field: string;
}

export interface D2ContractV2MetaParamPage {
  pages: string;
}

export type D2ContractV2MetaParam = D2ContractV2MetaParamFilter | D2ContractV2MetaParamPage;

export interface D2ContractV2Meta {
  output: Record<string, D2ContractV2MetaOutput>;
  lists: Record<string, D2ContractV2MetaList>;
  params: Record<string, D2ContractV2MetaParam>;
}

export interface D2ContractV2Route {
  route: string;
  kind: 'qry' | 'cmd';
  writes?: string;
  input: string;
  output: string;
  meta: D2ContractV2Meta;
  rules: string[];
  access: { actors: string[]; grants: string[]; scope: string };
}

export interface D2ContractV2Definition {
  module: string;
  pageId: string;
  projections: D2ContractV2Projection[];
  routes: D2ContractV2Route[];
}
