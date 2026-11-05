import React from 'react';
import {
  Node,
  Edge,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  ReactFlowInstance,
} from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { OriginPinContext } from '../UnrealContextMenu';

export interface CanvasViewportProps {
  // Graph elements & change handlers
  nodes: Node<NodeData>[];
  edges: Edge[];
  onNodesChange: OnNodesChange;
  onEdgesChange: OnEdgesChange;
  onConnect: OnConnect;

  // Viewport configuration
  theme: string;
  snapToGrid: boolean;
  showMiniMap: boolean;
  isOutputLogExpanded: boolean;
  isLoading: boolean;
  selectedNodes: Node<NodeData>[];

  // Interaction handlers
  onInit?: (instance: ReactFlowInstance) => void;
  onNodeDoubleClick?: (e: React.MouseEvent, node: Node<NodeData>) => void;
  onEdgeDoubleClick?: (e: React.MouseEvent, edge: Edge) => void;
  onContextMenuRequest: (pos: { x: number; y: number }, originPin?: OriginPinContext | null) => void;
  onPaneClick?: (e: React.MouseEvent) => void;
  onNodeClick?: (e: React.MouseEvent, node: Node<NodeData>) => void;
  onEdgeClick?: (e: React.MouseEvent, edge: Edge) => void;
  onNodeDragStart?: () => void;

  // Multi-selection HUD actions
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
  onStraighten: () => void;
  onCollapseToMacro: () => void;
  onWrapComment: () => void;
  onDuplicate: () => void;
  onDelete: () => void;

  // Generation & abort
  onGenerationComplete: (queryText: string) => void;
  onCancelGeneration: () => void;

  // Shared ReactFlow instance ref
  reactFlowInstanceRef: React.MutableRefObject<ReactFlowInstance | null>;
  heldKeyRef?: React.MutableRefObject<string | null>;
  onQuickSpawn?: (presetId: string, clientX?: number, clientY?: number) => void;
}
