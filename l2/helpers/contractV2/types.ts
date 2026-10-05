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
  /** The comment above the interface (d2_78). */
  jsdoc?: string;
  /** The fields of the body, one per line, with readonly exposed (d2_78). */
  fields?: Array<{ name: string; type: string; optional: boolean; readonly: boolean }>;
}

/** The comment above a route (d2_78): the four sections when their labels are recognized, always the raw text. */
export interface D2ContractV2Jsdoc {
  raw: string;
  purpose?: string;
  input?: string;
  processing?: string;
  output?: string;
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
  /**
   * Empty in the contract of the BFF per page (d2_78): the contract says what the page needs, not where it comes from.
   * An empty meta is not rendered, and a route without one parses as empty (the L1 readers keep compiling).
   */
  meta: D2ContractV2Meta;
  jsdoc?: D2ContractV2Jsdoc;
  rules: string[];
  access: { actors: string[]; grants: string[]; scope: string };
}

export interface D2ContractV2Definition {
  module: string;
  pageId: string;
  projections: D2ContractV2Projection[];
  routes: D2ContractV2Route[];
}
