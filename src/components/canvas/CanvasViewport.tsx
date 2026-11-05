import React, { useRef, useCallback } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
  Controls,
  MiniMap,
  SelectionMode,
  Connection,
  Edge,
  Node,
} from 'reactflow';
import 'reactflow/dist/style.css';
import '../reactflow-overrides.css';
import { LuLoader } from 'react-icons/lu';
import { toast } from 'react-hot-toast';
import BlueprintNode from '../nodes/BlueprintNode';
import BlueprintCommentNode from '../nodes/BlueprintCommentNode';
import BlueprintEdge from '../edges/BlueprintEdge';
import { UnrealEngineGrid } from './UnrealEngineGrid';
import { SelectionActionHUD } from '../hud/SelectionActionHUD';
import { NLPInput } from '../NLPInput';
import { CanvasViewportProps } from './types';
import { OriginPinContext } from '../UnrealContextMenu';
import { NodeData } from '../../types/BlueprintTypes';
import { useBlueprintStore } from '../../store/blueprintStore';
import { blueprintAudio } from '../../utils/blueprintAudio';

// Static node and edge types defined outside component to prevent re-instantiation loops
const nodeTypes: NodeTypes = {
  customNode: BlueprintNode,
  commentNode: BlueprintCommentNode,
};

const edgeTypes: EdgeTypes = {
  default: BlueprintEdge,
};

const SNAP_GRID: [number, number] = [16, 16];
const PAN_ON_DRAG: number[] = [1, 2];
const MULTI_SELECTION_KEYS = ['Control', 'Shift', 'Meta'];
const PRO_OPTIONS = { hideAttribution: true };

export const CanvasViewport: React.FC<CanvasViewportProps> = ({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  onConnect,
  theme,
  snapToGrid,
  showMiniMap,
  isOutputLogExpanded,
  isLoading,
  selectedNodes,
  onInit,
  onNodeDoubleClick,
  onEdgeDoubleClick,
  onContextMenuRequest,
  onPaneClick,
  onNodeClick,
  onEdgeClick,
  onNodeDragStart,
  onAlignHorizontal,
  onAlignVertical,
  onStraighten,
  onCollapseToMacro,
  onWrapComment,
  onDuplicate,
  onDelete,
  onGenerationComplete,
  onCancelGeneration,
  reactFlowInstanceRef,
  heldKeyRef,
  onQuickSpawn,
}) => {
  const connectingPinRef = useRef<OriginPinContext | null>(null);
  const isConnectingRef = useRef(false);
  const rightClickStartPos = useRef<{ x: number; y: number } | null>(null);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) {
      rightClickStartPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (rightClickStartPos.current) {
      const dx = Math.abs(e.clientX - rightClickStartPos.current.x);
      const dy = Math.abs(e.clientY - rightClickStartPos.current.y);
      if (dx > 6 || dy > 6) {
        // Right-click drag-pan detected, bypass context menu
        return;
      }
    }
    onContextMenuRequest({ x: e.clientX, y: e.clientY }, null);
  }, [onContextMenuRequest]);

  const handleConnectStart = useCallback((_: any, params: any) => {
    if (params?.nodeId && params?.handleId) {
      const pinType = params.handleId.split('-')[0] || 'exec';
      const pinName = params.handleId.split('-').slice(1).join('-') || 'Pin';
      connectingPinRef.current = {
        nodeId: params.nodeId,
        handleId: params.handleId,
        handleType: params.handleType || 'source',
        pinType,
        pinName,
      };
      isConnectingRef.current = true;
    }
  }, []);

  const handleConnectWrapper = useCallback((connection: Connection) => {
    isConnectingRef.current = false;
    connectingPinRef.current = null;
    onConnect(connection);
  }, [onConnect]);

  const handleConnectEnd = useCallback((event: any) => {
    if (isConnectingRef.current && connectingPinRef.current) {
      const origin = connectingPinRef.current;
      isConnectingRef.current = false;
      connectingPinRef.current = null;

      const targetElement = event.target as HTMLElement;
      const isTargetCanvas =
        targetElement?.classList?.contains('react-flow__pane') ||
        targetElement?.classList?.contains('react-flow__renderer') ||
        targetElement?.tagName === 'svg' ||
        targetElement?.closest('.react-flow__pane');

      if (isTargetCanvas && 'clientX' in event && 'clientY' in event) {
        onContextMenuRequest({ x: event.clientX, y: event.clientY }, origin);
      }
    }
  }, [onContextMenuRequest]);

  const handleInternalPaneClick = useCallback((e: React.MouseEvent) => {
    if (onPaneClick) {
      onPaneClick(e);
      return;
    }
    const store = useBlueprintStore.getState();
    if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
      store.setSelectedNodes([]);
      store.setSelectedEdges([]);
    }
    onContextMenuRequest({ x: -1000, y: -1000 }, null);
    const held = heldKeyRef?.current;
    if (held && onQuickSpawn) {
      if (held === 'b') onQuickSpawn('flow-branch', e.clientX, e.clientY);
      else if (held === 's') onQuickSpawn('flow-sequence', e.clientX, e.clientY);
      else if (held === 'd') onQuickSpawn('flow-delay', e.clientX, e.clientY);
      else if (held === 'p') onQuickSpawn('print-string', e.clientX, e.clientY);
    }
  }, [onPaneClick, onContextMenuRequest, heldKeyRef, onQuickSpawn]);

  const handleInternalEdgeDoubleClick = useCallback((e: React.MouseEvent, edge: Edge) => {
    if (onEdgeDoubleClick) {
      onEdgeDoubleClick(e, edge);
      return;
    }
    const store = useBlueprintStore.getState();
    let spawnX = 300;
    let spawnY = 200;
    if (e?.clientX !== undefined && reactFlowInstanceRef.current) {
      const p = typeof reactFlowInstanceRef.current.screenToFlowPosition === 'function'
        ? reactFlowInstanceRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        : reactFlowInstanceRef.current.project({ x: e.clientX, y: e.clientY });
      spawnX = Math.round(p.x) - 8;
      spawnY = Math.round(p.y) - 8;
    } else {
      const src = nodes.find(n => n.id === edge.source);
      const tgt = nodes.find(n => n.id === edge.target);
      if (src && tgt) {
        spawnX = Math.round((src.position.x + tgt.position.x) / 2);
        spawnY = Math.round((src.position.y + tgt.position.y) / 2);
      }
    }
    const pinType = (edge.data as any)?.pinType || (edge.sourceHandle?.split('-')[0]) || 'exec';
    const knotId = `knot_${Date.now()}`;
    const knotNode: Node<NodeData> = {
      id: knotId,
      type: 'customNode',
      position: { x: spawnX, y: spawnY },
      data: {
        title: 'Reroute',
        subtitle: 'Knot',
        nodeType: 'reroute',
        color: '#71717A',
        inputs: [{ name: 'In', type: pinType }],
        outputs: [{ name: 'Out', type: pinType }],
      },
    };
    store.pushHistory('Add Reroute Knot');
    store.setNodes([...nodes, knotNode]);
    store.setEdges([
      ...edges.filter(ed => ed.id !== edge.id),
      {
        id: `edge_${edge.source}_${knotId}_${Date.now()}`,
        source: edge.source,
        sourceHandle: edge.sourceHandle,
        target: knotId,
        targetHandle: `${pinType}-in`,
        type: 'blueprintEdge',
        data: { pinType },
        animated: false,
      },
      {
        id: `edge_${knotId}_${edge.target}_${Date.now()}`,
        source: knotId,
        sourceHandle: `${pinType}-out`,
        target: edge.target,
        targetHandle: edge.targetHandle,
        type: 'blueprintEdge',
        data: { pinType },
        animated: false,
      },
    ]);
    blueprintAudio.playStepPulse();
    toast.success('Inserted Unreal Reroute Knot (K2Node_Knot)');
  }, [onEdgeDoubleClick, nodes, edges, reactFlowInstanceRef]);

  return (
    <div className="flex-1 relative h-full overflow-hidden pb-8">
      <ReactFlowProvider>
        <div className="w-full h-full absolute inset-0">
          {/* Floating Multi-Node Selection Action HUD */}
          <SelectionActionHUD
            selectedCount={selectedNodes.length}
            onAlignHorizontal={onAlignHorizontal}
            onAlignVertical={onAlignVertical}
            onStraighten={onStraighten}
            onCollapseToMacro={onCollapseToMacro}
            onWrapComment={onWrapComment}
            onDuplicate={onDuplicate}
            onDelete={onDelete}
          />

          <ReactFlow
            onInit={(inst) => {
              reactFlowInstanceRef.current = inst;
              if (onInit) onInit(inst);
            }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={handleConnectWrapper}
            onConnectStart={handleConnectStart}
            onConnectEnd={handleConnectEnd}
            nodeTypes={nodeTypes}
            edgeTypes={edgeTypes}
            fitView
            proOptions={PRO_OPTIONS}
            minZoom={0.02}
            maxZoom={12}
            selectionMode={SelectionMode.Partial}
            selectionOnDrag={true}
            panOnDrag={PAN_ON_DRAG}
            panActivationKeyCode="Space"
            panOnScroll={false}
            zoomOnScroll={true}
            zoomOnPinch={true}
            zoomOnDoubleClick={false}
            multiSelectionKeyCode={MULTI_SELECTION_KEYS}
            elevateNodesOnSelect={true}
            snapToGrid={snapToGrid}
            snapGrid={SNAP_GRID}
            onNodeDragStart={onNodeDragStart}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onEdgeClick={onEdgeClick}
            onEdgeDoubleClick={handleInternalEdgeDoubleClick}
            onPointerDown={handlePointerDown}
            onPaneContextMenu={handleContextMenu}
            onPaneClick={handleInternalPaneClick}
            className={theme === 'dark' ? 'bg-[#0E0E11]' : 'bg-[#F8FAFC]'}
          >
            <UnrealEngineGrid theme={theme} />
            <Controls className="border-zinc-300 dark:border-zinc-800" />
            {showMiniMap && (
              <MiniMap
                nodeColor={(n: Node<NodeData>) => (n.data as any)?.color || '#18181B'}
                className="border border-zinc-300 dark:border-zinc-800 rounded-lg overflow-hidden hidden md:block"
              />
            )}

            {/* Floating Bottom NLP Prompt Bar - Elevates smoothly when Output Log is open */}
            <div className={`absolute ${isOutputLogExpanded ? 'bottom-72' : 'bottom-12'} left-1/2 transform -translate-x-1/2 z-20 w-full max-w-2xl px-4 pointer-events-auto transition-all duration-200`}>
              <NLPInput onGenerate={onGenerationComplete} />
            </div>

            {/* Loading Overlay */}
            {isLoading && (
              <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 animate-fade-in">
                <div className="flex flex-col items-center p-6 rounded-xl bg-zinc-950/95 border border-gold-500/30 shadow-2xl max-w-sm text-center">
                  <LuLoader className="w-8 h-8 text-gold-500 animate-spin mb-3" />
                  <p className="text-white font-semibold text-xs tracking-wider uppercase mb-1">
                    Synthesizing Blueprint Graph with Gemini...
                  </p>
                  <p className="text-[11px] text-zinc-400 mb-4">
                    Executing structured schema synthesis and wiring logic flow
                  </p>
                  <button
                    type="button"
                    onClick={onCancelGeneration}
                    className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs border border-zinc-700 transition-colors"
                  >
                    Cancel Request
                  </button>
                </div>
              </div>
            )}
          </ReactFlow>
        </div>
      </ReactFlowProvider>
    </div>
  );
};

export default CanvasViewport;
