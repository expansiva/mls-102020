/// <mls fileReference="_102020_/l2/agentMaterializeSolution/agentMaterializePlan.ts" enhancement="_blank"/>

declare const mls: any;

// ─── Pipeline item — embedded in each .defs.ts as `export const pipeline` ─────

export interface PipelineItem {
  id: string;
  type: string;
  outputPath: string;   // _102043_/l1/cafeFlow/layer_4_entities/PedidoEntity.ts
  defPath: string;      // _102043_/l1/cafeFlow/layer_4_entities/pedidoEntity.defs.ts
  dependsFiles: string[]; // already-generated .ts files the executor needs as context
  dependsOn: string[];    // pipeline item IDs that must complete before this one
  agent: 'agentMaterializeDef';
}

// ─── L1 layer folders scanned for existing .defs.ts ──────────────────────────

export type L1LayerFolder =
  | 'layer_1_external'
  | 'layer_4_entities'
  | 'layer_3_usecases';

// ─── Scanned file descriptor ──────────────────────────────────────────────────

export interface ScannedDefsFile {
  project: number;
  level: number;
  folder: string;      // e.g. "cafeFlow/layer_4_entities"
  shortName: string;   // e.g. "pedidoEntity"
  moduleName: string;
  mlsPath: string;     // _102043_/l1/cafeFlow/layer_4_entities/pedidoEntity.defs.ts
}

// ─── project.json ─────────────────────────────────────────────────────────────

export interface ProjectModuleRef {
  moduleName: string;
}

export interface ProjectJson {
  modules: ProjectModuleRef[];
}
