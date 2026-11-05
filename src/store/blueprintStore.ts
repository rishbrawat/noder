import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import { 
  Connection, 
  Edge, 
  EdgeChange, 
  Node, 
  NodeChange, 
  addEdge, 
  OnNodesChange, 
  OnEdgesChange, 
  OnConnect, 
  applyNodeChanges, 
  applyEdgeChanges 
} from 'reactflow';
import { BlueprintGeneration, NodeData, UEGraphType } from '../types/BlueprintTypes';
import { SimLogEntry } from '../utils/blueprintSimulator';

export interface HistorySnapshot {
  nodes: Node<NodeData>[];
  edges: Edge[];
  description?: string;
}

export interface BlueprintState {
  // Blueprint active canvas data
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodes: Node<NodeData>[];
  selectedEdges: Edge[];
  blueprintName: string;
  blueprintDescription: string;
  architecturePlan: string | null;
  isLoading: boolean;

  // Unreal Output Log
  logs: SimLogEntry[];
  addLog: (entry: { type: SimLogEntry['type']; message: string; id?: string; timestamp?: string }) => void;
  clearLogs: () => void;

  // History (Undo / Redo)
  past: HistorySnapshot[];
  future: HistorySnapshot[];
  canUndo: boolean;
  canRedo: boolean;
  pushHistory: (description?: string) => void;
  undo: () => void;
  redo: () => void;
  clearHistory: () => void;

  // Multi-graph Unreal Tabs
  activeGraphType: UEGraphType;
  subGraphs: Record<string, { nodes: Node<NodeData>[]; edges: Edge[] }>;
  switchGraph: (graphType: UEGraphType) => void;
  
  // Node methods
  onNodesChange: OnNodesChange;
  addNode: (node: Node<NodeData>) => void;
  removeNode: (nodeId: string) => void;
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => void;
  setNodes: (nodes: Node<NodeData>[]) => void;
  
  // Edge methods
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;
  removeEdge: (edgeId: string) => void;
  setEdges: (edges: Edge[]) => void;
  
  // Selection methods
  setSelectedNodes: (nodes: Node<NodeData>[]) => void;
  setSelectedEdges: (edges: Edge[]) => void;
  
  // Blueprint methods
  setBlueprintName: (name: string) => void;
  setBlueprintDescription: (description: string) => void;
  setArchitecturePlan: (plan: string | null) => void;
  clearBlueprint: () => void;
  loadBlueprint: (blueprint: BlueprintGeneration) => void;
  setIsLoading: (isLoading: boolean) => void;
}

const createDefaultConstructionScript = (): Node<NodeData>[] => [
  {
    id: 'cs-root-event',
    type: 'customNode',
    position: { x: 120, y: 150 },
    data: {
      title: 'Construction Script',
      subtitle: 'Construction',
      nodeType: 'event',
      color: '#15803D',
      inputs: [],
      outputs: [{ name: 'Then', type: 'exec' }],
      description: 'Initializes actor components and parameters at edit time and spawn time.',
    },
  },
];

const createDefaultMaterialGraph = (): { nodes: Node<NodeData>[]; edges: Edge[] } => ({
  nodes: [
    {
      id: 'mat-root-1',
      type: 'customNode',
      position: { x: 550, y: 150 },
      data: {
        title: 'Material Root',
        subtitle: 'Master Material',
        nodeType: 'customNode',
        color: '#E11D48',
        inputs: [
          { name: 'BaseColor', type: 'vector3', defaultValue: [1.0, 0.766, 0.336] },
          { name: 'Metallic', type: 'float', defaultValue: 1.0 },
          { name: 'Specular', type: 'float', defaultValue: 0.8 },
          { name: 'Roughness', type: 'float', defaultValue: 0.18 },
          { name: 'EmissiveColor', type: 'vector3', defaultValue: [0, 0, 0] },
          { name: 'Opacity', type: 'float', defaultValue: 1.0 },
          { name: 'Normal', type: 'vector3' },
          { name: 'WorldPositionOffset', type: 'vector3' }
        ],
        outputs: [{ name: 'Material', type: 'materialattributes' }],
        description: 'Master PBR Material Output Pin Gateway.',
      },
    },
    {
      id: 'mat-color-1',
      type: 'customNode',
      position: { x: 150, y: 100 },
      data: {
        title: 'Constant3Vector (RGB)',
        subtitle: 'Base Color',
        nodeType: 'variable',
        color: '#0284C7',
        inputs: [],
        outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.766, 0.336] }],
        description: 'Gold base color vector.',
      },
    },
    {
      id: 'mat-roughness-1',
      type: 'customNode',
      position: { x: 150, y: 280 },
      data: {
        title: 'Constant (Scalar)',
        subtitle: 'Roughness',
        nodeType: 'variable',
        color: '#0284C7',
        inputs: [],
        outputs: [{ name: 'Out', type: 'float', defaultValue: 0.18 }],
        description: 'Specular micro-roughness.',
      },
    },
  ],
  edges: [
    {
      id: 'edge_mat_color_root',
      source: 'mat-color-1',
      sourceHandle: 'vector3-rgb',
      target: 'mat-root-1',
      targetHandle: 'vector3-basecolor',
      type: 'blueprintEdge',
      data: { pinType: 'vector3' },
    },
    {
      id: 'edge_mat_rough_root',
      source: 'mat-roughness-1',
      sourceHandle: 'float-out',
      target: 'mat-root-1',
      targetHandle: 'float-roughness',
      type: 'blueprintEdge',
      data: { pinType: 'float' },
    },
  ],
});

const createDefaultNiagaraGraph = (): { nodes: Node<NodeData>[]; edges: Edge[] } => ({
  nodes: [
    {
      id: 'niagara-spawn-1',
      type: 'customNode',
      position: { x: 100, y: 120 },
      data: {
        title: 'Emitter Update',
        subtitle: 'Spawn Rate: 200/s',
        nodeType: 'event',
        color: '#0284C7',
        inputs: [],
        outputs: [{ name: 'Then', type: 'exec' }],
        description: 'Spawns particles continuously at 200/s.',
      },
    },
    {
      id: 'niagara-forces-1',
      type: 'customNode',
      position: { x: 420, y: 120 },
      data: {
        title: 'Particle Update (Forces)',
        subtitle: 'Gravity & Turbulence',
        nodeType: 'function',
        color: '#D97706',
        inputs: [{ name: 'Exec', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }],
        description: 'Gravity -980 with Curl Noise turbulence.',
      },
    },
    {
      id: 'niagara-render-1',
      type: 'customNode',
      position: { x: 740, y: 120 },
      data: {
        title: 'Sprite Renderer',
        subtitle: 'Additive Blending',
        nodeType: 'function',
        color: '#9333EA',
        inputs: [{ name: 'Exec', type: 'exec' }],
        outputs: [],
        description: 'Velocity aligned camera-facing billboards.',
      },
    },
  ],
  edges: [
    {
      id: 'edge_niagara_1_2',
      source: 'niagara-spawn-1',
      sourceHandle: 'exec-then',
      target: 'niagara-forces-1',
      targetHandle: 'exec-exec',
      type: 'blueprintEdge',
      data: { pinType: 'exec' },
    },
    {
      id: 'edge_niagara_2_3',
      source: 'niagara-forces-1',
      sourceHandle: 'exec-then',
      target: 'niagara-render-1',
      targetHandle: 'exec-exec',
      type: 'blueprintEdge',
      data: { pinType: 'exec' },
    },
  ],
});

const createDefaultGASGraph = (): { nodes: Node<NodeData>[]; edges: Edge[] } => ({
  nodes: [
    {
      id: 'gas-ability-1',
      type: 'customNode',
      position: { x: 80, y: 120 },
      data: {
        title: 'ActivateAbility (GA_DodgeRoll)',
        subtitle: 'Gameplay Ability',
        nodeType: 'event',
        color: '#0284C7',
        inputs: [],
        outputs: [{ name: 'Then', type: 'exec' }],
        description: 'Triggered when ability key is pressed and tags permit.',
      },
    },
    {
      id: 'gas-commit-1',
      type: 'customNode',
      position: { x: 420, y: 120 },
      data: {
        title: 'Commit Ability',
        subtitle: 'Stamina -25, Cooldown 1.5s',
        nodeType: 'function',
        color: '#16A34A',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }],
        description: 'Deducts Stamina and starts dodge cooldown tag.',
      },
    },
    {
      id: 'gas-task-1',
      type: 'customNode',
      position: { x: 760, y: 120 },
      data: {
        title: 'Play Montage And Wait',
        subtitle: 'AM_DodgeRoll',
        nodeType: 'function',
        color: '#D97706',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [
          { name: 'OnCompleted', type: 'exec' },
          { name: 'OnInterrupted', type: 'exec' },
        ],
        description: 'Plays character dodge roll root motion animation.',
      },
    },
    {
      id: 'gas-end-1',
      type: 'customNode',
      position: { x: 1120, y: 120 },
      data: {
        title: 'End Ability',
        subtitle: 'Clean up state & granted tags',
        nodeType: 'function',
        color: '#E11D48',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [],
        description: 'Ends ability and removes State.Dodging tag.',
      },
    },
  ],
  edges: [
    {
      id: 'edge_gas_1_2',
      source: 'gas-ability-1',
      sourceHandle: 'exec-then',
      target: 'gas-commit-1',
      targetHandle: 'exec-execute',
      type: 'blueprintEdge',
      data: { pinType: 'exec' },
    },
    {
      id: 'edge_gas_2_3',
      source: 'gas-commit-1',
      sourceHandle: 'exec-then',
      target: 'gas-task-1',
      targetHandle: 'exec-execute',
      type: 'blueprintEdge',
      data: { pinType: 'exec' },
    },
    {
      id: 'edge_gas_3_4',
      source: 'gas-task-1',
      sourceHandle: 'exec-oncompleted',
      target: 'gas-end-1',
      targetHandle: 'exec-execute',
      type: 'blueprintEdge',
      data: { pinType: 'exec' },
    },
  ],
});

// Create a store with Zustand
export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  blueprintName: 'New Blueprint',
  blueprintDescription: '',
  architecturePlan: null,
  isLoading: false,

  // Unreal Output Log
  logs: [
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'LogBlueprint: Noder Engine initialized. Ready to compile and simulate.',
    },
  ],
  addLog: (entry) => {
    const newEntry: SimLogEntry = {
      id: entry.id || uuidv4(),
      timestamp: entry.timestamp || new Date().toLocaleTimeString(),
      type: entry.type,
      message: entry.message,
    };
    set(state => ({ logs: [...state.logs.slice(-250), newEntry] }));
  },
  clearLogs: () => set({ logs: [] }),

  // History (Undo / Redo)
  past: [],
  future: [],
  canUndo: false,
  canRedo: false,

  pushHistory: (description?: string) => {
    const { nodes, edges, past } = get();
    const snapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
      description,
    };
    const updatedPast = [...past, snapshot].slice(-50);
    set({
      past: updatedPast,
      future: [],
      canUndo: updatedPast.length > 0,
      canRedo: false,
    });
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    if (past.length === 0) return;

    const previous = past[past.length - 1];
    const newPast = past.slice(0, -1);
    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newFuture = [currentSnapshot, ...future].slice(0, 50);

    set({
      nodes: previous.nodes,
      edges: previous.edges,
      selectedNodes: [],
      selectedEdges: [],
      past: newPast,
      future: newFuture,
      canUndo: newPast.length > 0,
      canRedo: true,
    });
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    if (future.length === 0) return;

    const next = future[0];
    const newFuture = future.slice(1);
    const currentSnapshot: HistorySnapshot = {
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };
    const newPast = [...past, currentSnapshot].slice(-50);

    set({
      nodes: next.nodes,
      edges: next.edges,
      selectedNodes: [],
      selectedEdges: [],
      past: newPast,
      future: newFuture,
      canUndo: true,
      canRedo: newFuture.length > 0,
    });
  },

  clearHistory: () => {
    set({
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  },

  // Multi-graph Unreal Tabs
  activeGraphType: 'EventGraph',
  subGraphs: {
    EventGraph: { nodes: [], edges: [] },
    ConstructionScript: { nodes: createDefaultConstructionScript(), edges: [] },
  },

  switchGraph: (targetType: UEGraphType) => {
    const state = get();
    if (state.activeGraphType === targetType) return;

    // Persist current graph before switching
    const currentSubGraphs = {
      ...state.subGraphs,
      [state.activeGraphType]: {
        nodes: state.nodes,
        edges: state.edges,
      },
    };

    let targetGraph = currentSubGraphs[targetType];
    if (!targetGraph) {
      if (targetType === 'ConstructionScript' || targetType === 'Construction') {
        targetGraph = { nodes: createDefaultConstructionScript(), edges: [] };
      } else if (targetType === 'ShadersUE') {
        targetGraph = createDefaultMaterialGraph();
      } else if (targetType === 'NiagaraVFX') {
        targetGraph = createDefaultNiagaraGraph();
      } else if (targetType === 'GASStudio') {
        targetGraph = createDefaultGASGraph();
      } else {
        targetGraph = { nodes: [], edges: [] };
      }
      currentSubGraphs[targetType] = targetGraph;
    }

    set({
      activeGraphType: targetType,
      subGraphs: currentSubGraphs,
      nodes: targetGraph.nodes,
      edges: targetGraph.edges,
      selectedNodes: [],
      selectedEdges: [],
      future: [],
      canRedo: false,
    });
  },
  
  // Node methods
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  addNode: (node: Node<NodeData>) => {
    get().pushHistory('Add Node');
    set({
      nodes: [...get().nodes, node],
    });
  },
  
  removeNode: (nodeId: string) => {
    get().pushHistory('Remove Node');
    set({
      nodes: get().nodes.filter((node) => node.id !== nodeId),
      edges: get().edges.filter(
        (edge) => edge.source !== nodeId && edge.target !== nodeId
      ),
    });
  },
  
  updateNodeData: (nodeId: string, data: Partial<NodeData>) => {
    set({
      nodes: get().nodes.map((node) => {
        if (node.id === nodeId) {
          return {
            ...node,
            data: {
              ...node.data,
              ...data,
            },
          };
        }
        return node;
      }),
    });
  },
  
  setNodes: (nodes) => set({ nodes }),
  
  // Edge methods
  onEdgesChange: (changes: EdgeChange[]) => {
    set({
      edges: applyEdgeChanges(changes, get().edges),
    });
  },
  
  onConnect: (connection: Connection) => {
    get().pushHistory('Connect Wire');
    const pinType = connection.sourceHandle?.split('-')[0] || 'exec';
    set({
      edges: addEdge(
        {
          ...connection,
          type: 'blueprintEdge',
          data: { pinType },
          animated: false,
        },
        get().edges
      ),
    });
  },
  
  removeEdge: (edgeId: string) => {
    get().pushHistory('Remove Wire');
    set({
      edges: get().edges.filter((edge) => edge.id !== edgeId),
    });
  },
  
  setEdges: (edges: Edge[]) => {
    set({ edges });
  },
  
  // Selection methods
  setSelectedNodes: (nodes: Node<NodeData>[]) => {
    set({ selectedNodes: nodes });
  },
  
  setSelectedEdges: (edges: Edge[]) => {
    set({ selectedEdges: edges });
  },
  
  // Blueprint methods
  setBlueprintName: (name: string) => {
    set({ blueprintName: name });
  },
  
  setBlueprintDescription: (description: string) => {
    set({ blueprintDescription: description });
  },

  setArchitecturePlan: (plan: string | null) => {
    set({ architecturePlan: plan });
  },
  
  clearBlueprint: () => {
    if (get().nodes.length > 0 || get().edges.length > 0) {
      get().pushHistory('Clear Canvas');
    }
    set({ 
      activeGraphType: 'EventGraph',
      subGraphs: {
        EventGraph: { nodes: [], edges: [] },
        ConstructionScript: { nodes: createDefaultConstructionScript(), edges: [] },
      },
      nodes: [],
      edges: [],
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  loadBlueprint: (blueprint: BlueprintGeneration) => {
    set({
      activeGraphType: 'EventGraph',
      subGraphs: {
        EventGraph: { nodes: blueprint.nodes, edges: blueprint.edges },
        ConstructionScript: { nodes: createDefaultConstructionScript(), edges: [] },
      },
      blueprintName: blueprint.name,
      blueprintDescription: blueprint.description,
      nodes: blueprint.nodes,
      edges: blueprint.edges,
      selectedNodes: [],
      selectedEdges: [],
    });
  },
  
  setIsLoading: (isLoading: boolean) => {
    set({ isLoading });
  },
}));
