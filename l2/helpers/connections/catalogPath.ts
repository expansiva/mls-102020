/// <mls fileReference="_102020_/l2/helpers/connections/catalogPath.ts" enhancement="_blank"/>

/** One connection name: the same shape the runtime catalog reader accepts. Anything else is not a catalog. */
const CONNECTION_ID = /^[a-z][A-Za-z0-9]*$/;

const CATALOG_DIR = '/_102034_/l1/server/layer_1_external/connections/catalogs';

/** The `connectionId` of an entity. Reads that field and nothing else; a missing or invalid id is empty. */
export function externalConnectionId(entity: unknown): string {
  const id = (entity as { connectionId?: unknown } | null)?.connectionId;
  return typeof id === 'string' && CONNECTION_ID.test(id) ? id : '';
}

/** Source file of one connection catalog. Empty when `connectionId` is not valid. */
export function catalogFilePath(connectionId: string): string {
  if (!CONNECTION_ID.test(connectionId)) return '';
  return `${CATALOG_DIR}/${connectionId}.ts`;
}

/** Import specifier the generated code uses for that same catalog. */
export function catalogImportPath(connectionId: string): string {
  if (!CONNECTION_ID.test(connectionId)) return '';
  return `${CATALOG_DIR}/${connectionId}.js`;
}
