/// <mls fileReference="_102020_/l2/helpers/defsInput/externalCatalog.ts" enhancement="_blank"/>

import { catalogFilePath, externalConnectionId } from '/_102020_/l2/helpers/connections/catalogPath.js';
import {
  declarationRef,
  declaredSystemsOf,
  integrationLogicalPath,
  integrationOf,
  REGISTRY_LOGICAL_PATH,
  resolveConnection,
  siblingDeclarationMissing,
  siblingModuleNames,
  type ConnectionScope,
} from '/_102020_/l2/helpers/connections/catalogResolve.js';
import type { D2CatalogGap } from '/_102020_/l2/helpers/defsInput/contracts.js';

/** Where to read a source ref (`_<project>_/l…`). The caller owns the files; this module reads nothing itself. */
export interface ExternalCatalogScope {
  project: number;
  moduleName: string;
  read: (ref: string) => Promise<string | null>;
}

export interface ExternalCatalogLoad {
  texts: Record<string, string>;
  unresolved: Record<string, D2CatalogGap>;
}

/** Catalog texts and the two distinct refusals, keyed by `connectionId`. An unknown id is left out. */
export async function externalCatalogTexts(entities: Record<string, unknown>, scope: ExternalCatalogScope): Promise<ExternalCatalogLoad> {
  const texts: Record<string, string> = {};
  const unresolved: Record<string, D2CatalogGap> = {};
  const pending: Array<{ entityId: string; id: string }> = [];
  for (const [entityId, entity] of Object.entries(entities)) {
    const row = entity as { kind?: unknown } | null;
    if (row?.kind !== 'external') continue;
    const id = externalConnectionId(row);
    if (!id || texts[id] || unresolved[id] || pending.some(item => item.id === id)) continue;
    pending.push({ entityId, id });
  }
  if (!pending.length) return { texts, unresolved };
  const systems = await connectionScope(scope);
  for (const { entityId, id } of pending) {
    const platform = await scope.read(catalogFilePath(id));
    const resolved = resolveConnection(id, systems, platform !== null);
    if (resolved.origin === 'platform' && platform !== null) texts[id] = platform;
    else if (resolved.origin === 'own') {
      const text = await scope.read(declarationRef(scope.project, scope.moduleName, id));
      if (text !== null) texts[id] = text;
      else unresolved[id] = {
        kind: 'ownNotGenerated',
        message: `Entity ${entityId} uses system ${id} declared by this module. Generate this module's declaration for system ${id} before L2 (step l1_d1_222).`,
      };
    } else if (resolved.origin === 'sibling') {
      const text = await scope.read(declarationRef(scope.project, resolved.moduleName, id));
      if (text !== null) texts[id] = text;
      else unresolved[id] = { kind: 'siblingNotGenerated', message: siblingDeclarationMissing(id, resolved.moduleName) };
    }
  }
  return { texts, unresolved };
}

async function connectionScope(scope: ExternalCatalogScope): Promise<ConnectionScope> {
  const registry = integrationOf(await scope.read(sourceRef(scope.project, REGISTRY_LOGICAL_PATH)));
  const siblings = [];
  for (const moduleName of siblingModuleNames(registry, scope.moduleName)) {
    const source = await scope.read(sourceRef(scope.project, integrationLogicalPath(moduleName)));
    siblings.push({ moduleName, systems: declaredSystemsOf(integrationOf(source)) });
  }
  const own = declaredSystemsOf(integrationOf(await scope.read(sourceRef(scope.project, integrationLogicalPath(scope.moduleName)))));
  return { moduleName: scope.moduleName, own, siblings };
}

function sourceRef(project: number, logicalPath: string): string {
  return `_${project}_/${logicalPath}`;
}
