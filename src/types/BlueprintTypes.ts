import { Node, Edge } from 'reactflow';

export type PinType = 
  | 'exec' 
  | 'bool' 
  | 'float' 
  | 'int' 
  | 'string' 
  | 'vector' 
  | 'vector2d' 
  | 'vector3' 
  | 'vector4'
  | 'rotator'
  | 'transform'
  | 'object' 
  | 'class' 
  | 'name' 
  | 'byte' 
  | 'wildcard' 
  | 'materialattributes';

export type NodeType = 'event' | 'function' | 'variable' | 'macro' | 'customNode' | 'reroute';

export interface PinData {
  name: string;
  type: PinType;
  description?: string;
  value?: any;
}

export interface NodeData {
  title: string;
  subtitle?: string;
  nodeType: NodeType;
  inputs: PinData[];
  outputs: PinData[];
  description?: string;
  color?: string;
  width?: number;
  height?: number;
  performanceSeverity?: string;
  hasBreakpoint?: boolean;
  subGraphId?: string;
}

export type BlueprintNode = Node<NodeData>;
export type BlueprintEdge = Edge;

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  nodes: BlueprintNode[];
  connections: BlueprintEdge[];
}

export interface LLMNodeData {
  id: string;
  title: string;
  nodeType: NodeType;
  color?: string;
  description?: string;
  position?: { x: number; y: number };
  inputs: { name: string; type: PinType; value?: any }[];
  outputs: { name: string; type: PinType }[];
}

export interface LLMConnectionData {
  sourceNodeId: string;
  sourcePinName: string;
  targetNodeId: string;
  targetPinName: string;
}

export interface LLMBlueprintData {
  blueprintName?: string;
  blueprintDescription?: string;
  nodes: LLMNodeData[];
  connections: LLMConnectionData[];
}

export interface BlueprintGeneration {
  name: string;
  description: string;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export interface T3DCompileResult {
  t3dText: string;
  nodeCount: number;
  connectionCount: number;
  warnings: string[];
}

export interface UEPinDefinition {
  category: string;
  subCategoryObject?: string;
  defaultValue?: string;
  direction: 'EGPD_Input' | 'EGPD_Output';
}

export type UEGraphType = 'EventGraph' | 'ConstructionScript' | 'Function';

export interface BlueprintSubGraph {
  id: string;
  name: string;
  type: UEGraphType;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
}

export interface BlueprintVariable {
  id: string;
  name: string;
  type: PinType;
  defaultValue?: any;
  category: string;
  isReplicated: boolean;
  tooltip?: string;
}

export interface CommentNodeData {
  title: string;
  comment?: string;
  color?: string;
  width?: number;
  height?: number;
  nodeType?: 'comment';
}

export interface BlueprintSnapshot {
  id: string;
  name: string;
  timestamp: string;
  nodeCount: number;
  edgeCount: number;
  nodes: BlueprintNode[];
  edges: BlueprintEdge[];
  variables?: BlueprintVariable[];
}

export type PerformanceSeverity = 'optimal' | 'moderate' | 'critical';

export interface PerformanceNodeAudit {
  nodeId: string;
  nodeTitle: string;
  severity: PerformanceSeverity;
  costScore: number; // 1-10
  reason: string;
  recommendation?: string;
}

export interface PerformanceAuditResult {
  overallScore: number; // 0 - 100
  verdict: 'Ship-Ready' | 'Caution' | 'Needs Optimization';
  tickNodeCount: number;
  heavyOperationCount: number;
  pureMathCount: number;
  estimatedFrameCostMs: number;
  nodeAudits: PerformanceNodeAudit[];
  recommendations: string[];
}
