/// <mls fileReference="_102020_/l2/agentNewSolution/pluginCatalog.defs.ts" enhancement="_blank"/>

export interface PluginCatalogItem {
  pluginId: string;
  provider: string;
  artifactType: 'plugin';
  capabilities: string[];
  requiredCredentials: string[];
}

export interface PluginCatalogDefinition {
  schemaVersion: '2026-06-02';
  plugins: PluginCatalogItem[];
}
