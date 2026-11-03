import { create } from 'zustand';
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

export interface BlueprintState {
  // Blueprint active canvas data
  nodes: Node<NodeData>[];
  edges: Edge[];
  selectedNodes: Node<NodeData>[];
  selectedEdges: Edge[];
  blueprintName: string;
  blueprintDescription: string;
  isLoading: boolean;

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

// Create a store with Zustand
export const useBlueprintStore = create<BlueprintState>((set, get) => ({
  // Initial state
  nodes: [],
  edges: [],
  selectedNodes: [],
  selectedEdges: [],
  blueprintName: 'New Blueprint',
  blueprintDescription: '',
  isLoading: false,

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
      if (targetType === 'ConstructionScript') {
        targetGraph = { nodes: createDefaultConstructionScript(), edges: [] };
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
    });
  },
  
  // Node methods
  onNodesChange: (changes: NodeChange[]) => {
    set({
      nodes: applyNodeChanges(changes, get().nodes),
    });
  },
  
  addNode: (node: Node<NodeData>) => {
    set({
      nodes: [...get().nodes, node],
    });
  },
  
  removeNode: (nodeId: string) => {
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
    set({
      edges: addEdge(
        {
          ...connection,
          animated: connection.sourceHandle?.startsWith('exec'),
          style: { 
            strokeWidth: 2,
          },
          className: connection.sourceHandle?.split('-')[0] || 'edge-default'
        },
        get().edges
      ),
    });
  },
  
  removeEdge: (edgeId: string) => {
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
  
  clearBlueprint: () => {
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
