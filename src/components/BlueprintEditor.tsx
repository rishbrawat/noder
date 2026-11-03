import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactFlow, {
  ReactFlowProvider,
  NodeTypes,
  EdgeTypes,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  SelectionMode,
  useViewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
import './reactflow-overrides.css';
import { 
  LuArrowLeft, 
  LuDownload, 
  LuSave, 
  LuTrash2, 
  LuLoader, 
  LuLayoutGrid, 
  LuClipboardCopy, 
  LuCheck, 
  LuTerminal, 
  LuTriangleAlert, 
  LuCircleCheck, 
  LuSun, 
  LuMoon,
  LuCode,
  LuClipboardPaste,
  LuPlay,
  LuActivity,
  LuHistory,
  LuFolderTree,
  LuChevronDown,
  LuMap,
  LuGitCompare,
  LuRadio,
  LuWrench,
  LuMinimize2,
  LuCornerUpLeft,
  LuAlignHorizontalJustifyCenter,
  LuAlignVerticalJustifyCenter,
  LuMessageSquare,
  LuCopy,
  LuSparkles,
} from 'react-icons/lu';
import { v4 as uuidv4 } from 'uuid';
import BlueprintNode from './nodes/BlueprintNode';
import BlueprintCommentNode from './nodes/BlueprintCommentNode';
import BlueprintEdge from './edges/BlueprintEdge';
import { NLPInput } from './NLPInput';
import { useBlueprintStore } from '../store/blueprintStore';
import { useBlueprint } from '../hooks/useBlueprint';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { useProjectStore } from '../store/projectStore';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileExplorer } from './FileExplorer';
import { compileGraphToT3D } from '../utils/ueT3DCompiler';
import { parseUE5T3DToGraph } from '../utils/ueT3DParser';
import { validateBlueprintGraph } from '../utils/blueprintValidator';
import { profileBlueprintGraph } from '../utils/blueprintProfiler';
import { buildSimulationSteps, SimLogEntry, SimStep } from '../utils/blueprintSimulator';
import { blueprintAudio } from '../utils/blueprintAudio';
import { T3DInspectorModal } from './modals/T3DInspectorModal';
import { CppTranspilerModal } from './modals/CppTranspilerModal';
import { PythonScriptModal } from './modals/PythonScriptModal';
import { BlueprintProfilerModal } from './modals/BlueprintProfilerModal';
import { SnapshotModal } from './modals/SnapshotModal';
import { DiffModal } from './modals/DiffModal';
import { RemoteBridgeModal } from './modals/RemoteBridgeModal';
import { RefactorModal } from './modals/RefactorModal';
import { UnrealContextMenu } from './UnrealContextMenu';
import { MyBlueprintDrawer } from './MyBlueprintDrawer';
import { NodeLibraryDrawer } from './NodeLibraryDrawer';
import { OutputLogConsole } from './OutputLogConsole';
import { StandardUENodePreset, STANDARD_UE_NODES } from '../data/standardUENodes';
import { BlueprintNode as IBlueprintNode } from '../types/BlueprintTypes';
import { toast } from 'react-hot-toast';

// Define custom node types
const nodeTypes: NodeTypes = {
  customNode: BlueprintNode,
  commentNode: BlueprintCommentNode,
};

// Define custom edge types
const edgeTypes: EdgeTypes = {
  default: BlueprintEdge,
};

// Dynamic Level-of-Detail (LOD) Unreal Engine 5 Grid
const UnrealEngineGrid: React.FC<{ theme: string }> = React.memo(({ theme }) => {
  const { zoom } = useViewport();
  const isDark = theme === 'dark';

  return (
    <>
      {/* Minor Subdivision Grid (24px): hides smoothly at extreme zoom-out (< 0.35) to prevent moiré noise */}
      {zoom >= 0.35 && (
        <Background
          id="ue5-grid-minor"
          variant={BackgroundVariant.Lines}
          gap={24}
          lineWidth={0.65}
          color={isDark ? 'rgba(255, 255, 255, 0.03)' : 'rgba(0, 0, 0, 0.035)'}
        />
      )}
      {/* Major Coordinate Grid (120px: 5x5 subdivision): always visible across infinite zoom range */}
      <Background
        id="ue5-grid-major"
        variant={BackgroundVariant.Lines}
        gap={120}
        lineWidth={1.2}
        color={isDark ? 'rgba(255, 255, 255, 0.085)' : 'rgba(0, 0, 0, 0.12)'}
      />
    </>
  );
});

// Static constants to prevent ReactFlow StoreUpdater infinite re-render loops
const SNAP_GRID: [number, number] = [16, 16];
const PAN_ON_DRAG: number[] = [1, 2];
const MULTI_SELECTION_KEYS = ['Control', 'Shift', 'Meta'];
const PRO_OPTIONS = { hideAttribution: true };

export const BlueprintEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isArranging, setIsArranging] = useState(false);
  const [isPanelOpen, setIsPanelOpen] = useState(true);

  // Modals & Panels state
  const [isT3DModalOpen, setIsT3DModalOpen] = useState(false);
  const [isCppModalOpen, setIsCppModalOpen] = useState(false);
  const [isPythonModalOpen, setIsPythonModalOpen] = useState(false);
  const [isNodeLibraryOpen, setIsNodeLibraryOpen] = useState(false);
  const [isMyBlueprintOpen, setIsMyBlueprintOpen] = useState(false);
  const [isProfilerOpen, setIsProfilerOpen] = useState(false);
  const [isSnapshotOpen, setIsSnapshotOpen] = useState(false);
  const [isDiffOpen, setIsDiffOpen] = useState(false);
  const [isRemoteBridgeOpen, setIsRemoteBridgeOpen] = useState(false);
  const [isRefactorOpen, setIsRefactorOpen] = useState(false);
  const [activeSubGraphName, setActiveSubGraphName] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isHeatmapActive, setIsHeatmapActive] = useState(false);
  const [isBridgesDropdownOpen, setIsBridgesDropdownOpen] = useState(false);
  const [showMiniMap, setShowMiniMap] = useState(false);
  const [showLintPopover, setShowLintPopover] = useState(false);

  // Simulation, Audio & Breakpoint state
  const [isSimulating, setIsSimulating] = useState(false);
  const [isSimPaused, setIsSimPaused] = useState(false);
  const [isAudioMuted, setIsAudioMuted] = useState(false);
  const [activeSimSteps, setActiveSimSteps] = useState<SimStep[]>([]);
  const [simStepIndex, setSimStepIndex] = useState(0);
  const [heldKey, setHeldKey] = useState<string | null>(null);
  const [lastMousePos, setLastMousePos] = useState<{ x: number; y: number }>({ x: 300, y: 200 });
  const [simLogs, setSimLogs] = useState<SimLogEntry[]>([
    {
      id: 'init-1',
      timestamp: new Date().toLocaleTimeString(),
      type: 'info',
      message: 'LogBlueprint: Noder Engine initialized. Ready to compile and simulate.',
    },
  ]);
  const simTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rightClickStartPos = useRef<{ x: number; y: number } | null>(null);
  const [snapToGrid, setSnapToGrid] = useState(true);

  // Access blueprint store
  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    blueprintName,
    isLoading,
    activeGraphType,
    switchGraph,
    setSelectedNodes,
    setSelectedEdges,
    setIsLoading,
    loadBlueprint,
    clearBlueprint,
    setNodes,
    setEdges,
  } = useBlueprintStore();

  const { projects } = useProjectStore();
  const {
    selectedFileId: currentSelectedFileId,
    fetchFiles,
    selectFile,
    setupRealtimeUpdates,
    cleanupRealtimeUpdates,
    debouncedSaveContent,
    isSaving,
    lastSavedAt,
  } = useFileSystemStore();

  const currentProject = useMemo(() => {
    return projects.find(p => p.id === projectId);
  }, [projects, projectId]);

  // Setup file system subscriptions
  useEffect(() => {
    if (projectId) {
      setupRealtimeUpdates(projectId);
      fetchFiles(projectId);
    }
    return () => {
      cleanupRealtimeUpdates();
    };
  }, [projectId, setupRealtimeUpdates, fetchFiles, cleanupRealtimeUpdates]);

  const { exportBlueprint } = useBlueprint();

  // Auto-save whenever nodes or edges mutate in an active file
  useEffect(() => {
    if (currentSelectedFileId && nodes.length > 0) {
      const blueprintData = exportBlueprint();
      debouncedSaveContent(currentSelectedFileId, JSON.stringify(blueprintData, null, 2));
    }
  }, [nodes, edges, currentSelectedFileId, debouncedSaveContent, exportBlueprint]);

  // Compile T3D for live inspector
  const compiledT3D = useMemo(() => {
    if (nodes.length === 0) return { t3dText: '', nodeCount: 0, connectionCount: 0 };
    return compileGraphToT3D(nodes, edges);
  }, [nodes, edges]);

  // Real-time Graph Validation
  const validation = useMemo(() => {
    return validateBlueprintGraph(nodes, edges, activeGraphType);
  }, [nodes, edges, activeGraphType]);

  // Unreal Engine 5 Performance Profiler Audit
  const profilerAudit = useMemo(() => {
    return profileBlueprintGraph(nodes, edges);
  }, [nodes, edges]);

  // Toggle Heatmap Visualization
  const handleToggleHeatmap = useCallback(() => {
    const nextState = !isHeatmapActive;
    setIsHeatmapActive(nextState);

    if (nextState) {
      const auditMap = new Map(profilerAudit.nodeAudits.map(a => [a.nodeId, a.severity]));
      setNodes(nodes.map(n => ({
        ...n,
        data: {
          ...n.data,
          performanceSeverity: auditMap.get(n.id) || 'optimal',
        },
      })));
      toast.success('Performance Heatmap enabled');
    } else {
      setNodes(nodes.map(n => {
        const { performanceSeverity: _, ...restData } = n.data as any;
        return {
          ...n,
          data: restData,
        };
      }));
      toast('Heatmap disabled');
    }
  }, [isHeatmapActive, profilerAudit, nodes, setNodes]);

  // Load snapshots for visual Diff inspection
  const savedSnapshots = useMemo(() => {
    try {
      const storageKey = `noder_snapshots_${(blueprintName || 'MainGraph').replace(/\s+/g, '_')}`;
      const raw = localStorage.getItem(storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }, [blueprintName]);

  // Unreal Engine Comment Box (EdGraphNode_Comment) Generator
  const handleAddComment = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    let posX = 150;
    let posY = 150;
    let width = 520;
    let height = 340;

    if (selected.length > 0) {
      const minX = Math.min(...selected.map(n => n.position.x));
      const minY = Math.min(...selected.map(n => n.position.y));
      const maxX = Math.max(...selected.map(n => n.position.x + 240));
      const maxY = Math.max(...selected.map(n => n.position.y + 180));
      posX = Math.max(50, minX - 40);
      posY = Math.max(50, minY - 60);
      width = Math.max(340, maxX - minX + 80);
      height = Math.max(220, maxY - minY + 100);
    }

    const commentNode: IBlueprintNode = {
      id: uuidv4(),
      type: 'commentNode',
      position: { x: posX, y: posY },
      style: { width, height, zIndex: -1 },
      data: {
        title: selected.length > 0 ? 'Selected Logic Group' : 'Comment Group',
        color: '#CA8A04',
        width,
        height,
        inputs: [],
        outputs: [],
        nodeType: 'macro',
      },
    };

    setNodes([commentNode, ...nodes]);
    toast.success('Added Unreal Comment Box (C)');
  }, [nodes, setNodes]);

  // Simulation Runner: Interactive Visual Execution with Breakpoint Pausing
  const handleStartSimulation = useCallback(() => {
    if (nodes.length === 0) {
      toast.error('No nodes to simulate');
      return;
    }

    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsSimulating(true);
    setIsSimPaused(false);

    const steps = buildSimulationSteps(nodes, edges);
    if (steps.length === 0) {
      setIsSimulating(false);
      return;
    }

    setActiveSimSteps(steps);
    setSimStepIndex(0);

    setSimLogs(prev => [
      ...prev,
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: '──────────────────────────────────────────',
      },
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'exec',
        message: `LogSimulation: Starting interactive execution trace for ${blueprintName || 'MainGraph'}...`,
      },
    ]);

    blueprintAudio.playEventChime();

    const playNext = (idx: number) => {
      if (idx >= steps.length) {
        setIsSimulating(false);
        setIsSimPaused(false);
        setNodes(nodes.map(n => ({ ...n, selected: false })));
        blueprintAudio.playSuccessChime();
        return;
      }

      const step = steps[idx];
      const currentNodes = useBlueprintStore.getState().nodes;
      setNodes(currentNodes.map(n => ({ ...n, selected: n.id === step.activeNodeId })));

      setSimLogs(prev => [
        ...prev,
        {
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          type: step.logType,
          message: step.logMessage,
        },
      ]);

      if (step.isBreakpoint) {
        setIsSimPaused(true);
        setSimStepIndex(idx + 1);
        blueprintAudio.playBreakpointHit();
        toast('Breakpoint hit! Simulation suspended (F5 to resume, F10 to step).', { icon: '🛑' });
        return;
      }

      if (step.logType === 'success') {
        blueprintAudio.playSuccessChime();
      } else {
        blueprintAudio.playStepPulse();
      }

      setSimStepIndex(idx + 1);
      simTimerRef.current = setTimeout(() => playNext(idx + 1), 600);
    };

    playNext(0);
  }, [nodes, edges, blueprintName, setNodes]);

  const handleStopSimulation = useCallback(() => {
    if (simTimerRef.current) clearTimeout(simTimerRef.current);
    setIsSimulating(false);
    setIsSimPaused(false);
    setNodes(nodes.map(n => ({ ...n, selected: false })));
    setSimLogs(prev => [
      ...prev,
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'warn',
        message: 'LogSimulation: Simulation aborted by user.',
      },
    ]);
  }, [nodes, setNodes]);

  const handleStepForward = useCallback(() => {
    if (!isSimulating || simStepIndex >= activeSimSteps.length) return;
    const step = activeSimSteps[simStepIndex];
    const currentNodes = useBlueprintStore.getState().nodes;
    setNodes(currentNodes.map(n => ({ ...n, selected: n.id === step.activeNodeId })));

    if (step.isBreakpoint) {
      blueprintAudio.playBreakpointHit();
    } else {
      blueprintAudio.playStepPulse();
    }

    setSimLogs(prev => [
      ...prev,
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        type: step.logType,
        message: step.logMessage,
      },
    ]);
    const nextIdx = simStepIndex + 1;
    setSimStepIndex(nextIdx);
    if (nextIdx >= activeSimSteps.length) {
      setIsSimulating(false);
      setIsSimPaused(false);
      setNodes(nodes.map(n => ({ ...n, selected: false })));
      blueprintAudio.playSuccessChime();
      toast.success('Simulation completed');
    }
  }, [isSimulating, simStepIndex, activeSimSteps, nodes, setNodes]);

  const handleResumeSimulation = useCallback(() => {
    if (!isSimulating || simStepIndex >= activeSimSteps.length) return;
    setIsSimPaused(false);
    toast.success('Resuming execution trace');

    const playNext = (idx: number) => {
      if (idx >= activeSimSteps.length) {
        setIsSimulating(false);
        setIsSimPaused(false);
        setNodes(nodes.map(n => ({ ...n, selected: false })));
        blueprintAudio.playSuccessChime();
        return;
      }

      const step = activeSimSteps[idx];
      const currentNodes = useBlueprintStore.getState().nodes;
      setNodes(currentNodes.map(n => ({ ...n, selected: n.id === step.activeNodeId })));

      setSimLogs(prev => [
        ...prev,
        {
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          type: step.logType,
          message: step.logMessage,
        },
      ]);

      if (step.isBreakpoint) {
        setIsSimPaused(true);
        setSimStepIndex(idx + 1);
        blueprintAudio.playBreakpointHit();
        toast('Breakpoint hit! Simulation suspended.', { icon: '🛑' });
        return;
      }

      if (step.logType === 'success') {
        blueprintAudio.playSuccessChime();
      } else {
        blueprintAudio.playStepPulse();
      }

      setSimStepIndex(idx + 1);
      simTimerRef.current = setTimeout(() => playNext(idx + 1), 600);
    };

    playNext(simStepIndex);
  }, [isSimulating, simStepIndex, activeSimSteps, nodes, setNodes]);

  // Toggle UE5 Breakpoint on Selected Node (F9)
  const handleToggleBreakpoint = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) {
      toast('Select a node to toggle breakpoint (F9)', { icon: 'ℹ️' });
      return;
    }
    const target = selected[0];
    const newBreakpoint = !target.data?.hasBreakpoint;
    setNodes(nodes.map(n => n.id === target.id ? {
      ...n,
      data: {
        ...n.data,
        hasBreakpoint: newBreakpoint,
      }
    } : n));
    toast(newBreakpoint ? `Breakpoint set on "${target.data.title}" (F9)` : `Breakpoint removed`, { icon: '🔴' });
  }, [nodes, setNodes]);

  // Duplicate Selected Nodes (Ctrl+W / Ctrl+D)
  const handleDuplicateSelected = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;

    const duplicates: IBlueprintNode[] = selected.map(n => ({
      ...n,
      id: uuidv4(),
      position: { x: n.position.x + 40, y: n.position.y + 40 },
      selected: true,
      data: {
        ...n.data,
        inputs: (n.data.inputs || []).map(i => ({ ...i })),
        outputs: (n.data.outputs || []).map(o => ({ ...o })),
      },
    }));

    const updatedNodes = [...nodes.map(n => ({ ...n, selected: false })), ...duplicates];
    setNodes(updatedNodes);
    toast.success(`Duplicated ${duplicates.length} node(s)`);
  }, [nodes, setNodes]);

  // Straighten Connections (Q) - Real Unreal Engine 5 Muscle Memory
  const handleStraightenConnections = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;

    let modified = false;
    const updated = nodes.map(node => {
      if (!node.selected) return node;

      const inEdge = edges.find(e => e.target === node.id);
      if (inEdge) {
        const sourceNode = nodes.find(n => n.id === inEdge.source);
        if (sourceNode) {
          modified = true;
          return {
            ...node,
            position: { ...node.position, y: sourceNode.position.y }
          };
        }
      }

      const outEdge = edges.find(e => e.source === node.id);
      if (outEdge) {
        const targetNode = nodes.find(n => n.id === outEdge.target);
        if (targetNode) {
          modified = true;
          return {
            ...node,
            position: { ...node.position, y: targetNode.position.y }
          };
        }
      }

      return node;
    });

    if (modified) {
      setNodes(updated);
      toast.success('Straightened wire connections (Q)');
    }
  }, [nodes, edges, setNodes]);

  // Align Selected Nodes Horizontally (Shift+A)
  const handleAlignSelectedHorizontal = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return;
    const avgY = Math.round(selected.reduce((acc, n) => acc + n.position.y, 0) / selected.length);
    const updated = nodes.map(n => n.selected ? { ...n, position: { ...n.position, y: avgY } } : n);
    setNodes(updated);
    toast.success(`Aligned ${selected.length} nodes horizontally (Shift+A)`);
  }, [nodes, setNodes]);

  // Align Selected Nodes Vertically (Shift+W)
  const handleAlignSelectedVertical = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) return;
    const avgX = Math.round(selected.reduce((acc, n) => acc + n.position.x, 0) / selected.length);
    const updated = nodes.map(n => n.selected ? { ...n, position: { ...n.position, x: avgX } } : n);
    setNodes(updated);
    toast.success(`Aligned ${selected.length} nodes vertically (Shift+W)`);
  }, [nodes, setNodes]);

  // Delete Selected Nodes (Del / Backspace)
  const handleDeleteSelected = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length === 0) return;
    const selectedIds = new Set(selected.map(n => n.id));
    setNodes(nodes.filter(n => !selectedIds.has(n.id)));
    setEdges(edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target)));
    toast.success(`Deleted ${selected.length} node(s)`);
  }, [nodes, edges, setNodes, setEdges]);

  // Double-Click Wire to Spawn Unreal Reroute Knot (K2Node_Knot)
  const handleEdgeDoubleClick = useCallback((_e: React.MouseEvent, edge: any) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    const midX = sourceNode && targetNode ? Math.round((sourceNode.position.x + targetNode.position.x) / 2) + 20 : 300;
    const midY = sourceNode && targetNode ? Math.round((sourceNode.position.y + targetNode.position.y) / 2) + 20 : 200;
    const pinType = (edge.data as any)?.pinType || 'exec';
    const knotId = `knot_${Date.now()}`;

    const knotNode: IBlueprintNode = {
      id: knotId,
      type: 'customNode',
      position: { x: midX, y: midY },
      data: {
        title: 'Reroute',
        subtitle: 'Knot',
        nodeType: 'reroute',
        color: '#71717A',
        inputs: [{ name: 'In', type: pinType }],
        outputs: [{ name: 'Out', type: pinType }],
      },
    };

    const edge1 = {
      id: `edge_${edge.source}_${knotId}_${Date.now()}`,
      source: edge.source,
      sourceHandle: edge.sourceHandle,
      target: knotId,
      targetHandle: `${pinType}-in`,
      type: 'blueprintEdge',
      data: { pinType },
    };

    const edge2 = {
      id: `edge_${knotId}_${edge.target}_${Date.now()}`,
      source: knotId,
      sourceHandle: `${pinType}-out`,
      target: edge.target,
      targetHandle: edge.targetHandle,
      type: 'blueprintEdge',
      data: { pinType },
    };

    setNodes([...nodes, knotNode]);
    setEdges([...edges.filter(e => e.id !== edge.id), edge1, edge2]);
    blueprintAudio.playStepPulse();
    toast.success('Inserted Unreal Reroute Knot (K2Node_Knot)');
  }, [nodes, edges, setNodes, setEdges]);

  // Collapse Selected Nodes into a Subgraph / Macro (Ctrl+G)
  const handleCollapseToMacro = useCallback(() => {
    const selected = nodes.filter(n => n.selected);
    if (selected.length < 2) {
      toast('Select at least 2 nodes to collapse into a Macro (Ctrl+G)', { icon: 'ℹ️' });
      return;
    }

    const macroName = window.prompt('Enter Macro / Subgraph name:', 'CalculateMechanic');
    if (!macroName || !macroName.trim()) return;

    const macroId = `subgraph_${Date.now()}`;
    const selectedIds = new Set(selected.map(n => n.id));

    // Internal nodes for the new subgraph
    const subGraphNodes = selected.map(n => ({ ...n, selected: false }));
    const subGraphEdges = edges.filter(e => selectedIds.has(e.source) && selectedIds.has(e.target));

    // Determine inputs (edges coming from outside to inside)
    const inboundEdges = edges.filter(e => !selectedIds.has(e.source) && selectedIds.has(e.target));
    // Determine outputs (edges going from inside to outside)
    const outboundEdges = edges.filter(e => selectedIds.has(e.source) && !selectedIds.has(e.target));

    const macroInputs: any[] = [{ name: 'Execute', type: 'exec' }];
    inboundEdges.forEach(e => {
      const pinName = (e.targetHandle || '').split('-').slice(1).join('-') || 'In';
      if (!macroInputs.some(p => p.name === pinName)) {
        macroInputs.push({ name: pinName, type: (e.data as any)?.pinType || 'exec' });
      }
    });

    const macroOutputs: any[] = [{ name: 'Then', type: 'exec' }];
    outboundEdges.forEach(e => {
      const pinName = (e.sourceHandle || '').split('-').slice(1).join('-') || 'Out';
      if (!macroOutputs.some(p => p.name === pinName)) {
        macroOutputs.push({ name: pinName, type: (e.data as any)?.pinType || 'exec' });
      }
    });

    const avgX = Math.round(selected.reduce((acc, n) => acc + n.position.x, 0) / selected.length);
    const avgY = Math.round(selected.reduce((acc, n) => acc + n.position.y, 0) / selected.length);

    const macroCompositeNode: IBlueprintNode = {
      id: macroId,
      type: 'customNode',
      position: { x: avgX, y: avgY },
      data: {
        title: `Macro: ${macroName.trim()}`,
        subtitle: 'Collapsed Subgraph',
        nodeType: 'macro',
        color: '#CA8A04',
        subGraphId: macroId,
        inputs: macroInputs,
        outputs: macroOutputs,
      },
    };

    const currentSubGraphs = {
      ...useBlueprintStore.getState().subGraphs,
      [macroId]: { nodes: subGraphNodes, edges: subGraphEdges },
    };

    const remainingNodes = [...nodes.filter(n => !selectedIds.has(n.id)), macroCompositeNode];
    const remainingEdges = edges.filter(e => !selectedIds.has(e.source) && !selectedIds.has(e.target));

    useBlueprintStore.setState({ subGraphs: currentSubGraphs });
    setNodes(remainingNodes);
    setEdges(remainingEdges);
    toast.success(`Collapsed ${selected.length} nodes into Macro "${macroName.trim()}"`);
  }, [nodes, edges, setNodes, setEdges]);

  // Exit current subgraph back to root graph
  const handleExitSubGraph = useCallback(() => {
    const parentGraph = useBlueprintStore.getState().subGraphs['EventGraph'];
    if (parentGraph) {
      setNodes(parentGraph.nodes);
      setEdges(parentGraph.edges);
      setActiveSubGraphName(null);
      toast('Returned to EventGraph');
    }
  }, [setNodes, setEdges]);

  // Quick Spawn standard node at position
  const handleSpawnAtPosition = useCallback((presetId: string, clientX?: number, clientY?: number) => {
    const preset = STANDARD_UE_NODES.find(p => p.id === presetId);
    if (!preset) return;
    const newId = uuidv4();
    const spawnX = clientX !== undefined ? clientX - 100 : lastMousePos.x;
    const spawnY = clientY !== undefined ? clientY - 40 : lastMousePos.y;

    const newNode: IBlueprintNode = {
      id: newId,
      type: 'customNode',
      position: { x: Math.max(50, spawnX), y: Math.max(50, spawnY) },
      data: {
        title: preset.title,
        subtitle: preset.subtitle,
        nodeType: preset.nodeType,
        color: preset.color,
        inputs: preset.inputs.map(i => ({ ...i })),
        outputs: preset.outputs.map(o => ({ ...o })),
      },
    };

    setNodes([...nodes, newNode]);
    toast.success(`Spawned "${preset.title}"`);
  }, [nodes, setNodes, lastMousePos]);

  // Add node from library or context menu
  const handleAddNodeFromLibrary = useCallback((preset: StandardUENodePreset, spawnPos?: { x: number; y: number }) => {
    const newId = uuidv4();
    const spawnX = spawnPos ? spawnPos.x : Math.round(Math.random() * 150 + 250);
    const spawnY = spawnPos ? spawnPos.y : Math.round(Math.random() * 150 + 150);

    const newNode: IBlueprintNode = {
      id: newId,
      type: 'customNode',
      position: { x: spawnX, y: spawnY },
      data: {
        title: preset.title,
        subtitle: preset.subtitle,
        nodeType: preset.nodeType,
        color: preset.color,
        inputs: preset.inputs.map(i => ({ ...i })),
        outputs: preset.outputs.map(o => ({ ...o })),
      },
    };

    setNodes([...nodes, newNode]);
    toast.success(`Spawned "${preset.title}" onto canvas`);
  }, [nodes, setNodes]);

  // Authentic Unreal Engine Hotkeys & Shortcuts Engine
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) return;

      const key = e.key.toLowerCase();

      // Track held keys for quick click spawning (B, S, D, P)
      if (['b', 's', 'd', 'p'].includes(key) && !e.ctrlKey && !e.metaKey && !e.altKey) {
        setHeldKey(key);
      }

      if (key === 'c' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleAddComment();
      } else if (key === 'q' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        handleStraightenConnections();
      } else if (e.shiftKey && key === 'a') {
        e.preventDefault();
        handleAlignSelectedHorizontal();
      } else if (e.shiftKey && key === 'w') {
        e.preventDefault();
        handleAlignSelectedVertical();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        handleDeleteSelected();
      } else if (e.key === 'Tab') {
        e.preventDefault();
        setContextMenuPos({ x: lastMousePos.x, y: lastMousePos.y });
      } else if (e.key === 'F9') {
        e.preventDefault();
        handleToggleBreakpoint();
      } else if (e.key === 'F5' && isSimulating && isSimPaused) {
        e.preventDefault();
        handleResumeSimulation();
      } else if (e.key === 'F10' && isSimulating) {
        e.preventDefault();
        handleStepForward();
      } else if ((e.ctrlKey || e.metaKey) && (key === 'w' || key === 'd')) {
        e.preventDefault();
        handleDuplicateSelected();
      } else if ((e.ctrlKey || e.metaKey) && key === 'g') {
        e.preventDefault();
        handleCollapseToMacro();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      if (['b', 's', 'd', 'p'].includes(key)) {
        setHeldKey(null);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      setLastMousePos({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [
    handleAddComment,
    handleStraightenConnections,
    handleAlignSelectedHorizontal,
    handleAlignSelectedVertical,
    handleDeleteSelected,
    handleToggleBreakpoint,
    handleResumeSimulation,
    handleStepForward,
    handleDuplicateSelected,
    handleCollapseToMacro,
    isSimulating,
    isSimPaused,
    lastMousePos,
  ]);

  // Restore snapshot handler
  const handleRestoreSnapshot = useCallback((restoredNodes: IBlueprintNode[], restoredEdges: any[]) => {
    setNodes(restoredNodes);
    setEdges(restoredEdges);
    setSimLogs(prev => [
      ...prev,
      {
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString(),
        type: 'info',
        message: `LogBlueprint: Graph state restored from snapshot (${restoredNodes.length} nodes).`,
      },
    ]);
  }, [setNodes, setEdges]);

  // Copy to Unreal Engine 5 Clipboard in native T3D format
  const handleCopyToUE5 = useCallback(async () => {
    if (nodes.length === 0) {
      toast.error('No nodes in blueprint to copy');
      return;
    }

    try {
      const { t3dText, nodeCount } = compileGraphToT3D(nodes, edges);
      await navigator.clipboard.writeText(t3dText);
      toast.success(
        `Copied ${nodeCount} nodes! Paste directly into Unreal Engine 5 Event Graph (Ctrl+V).`,
        { duration: 4500 }
      );
      setSimLogs(prev => [
        ...prev,
        {
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'info',
          message: `LogCompiler: Exported ${nodeCount} nodes to Unreal Engine T3D clipboard format.`,
        },
      ]);
    } catch (err: any) {
      console.error('Failed to copy to UE5 clipboard:', err);
      toast.error('Failed to copy to clipboard');
    }
  }, [nodes, edges]);

  // Reverse Compiler: Import / Paste from Unreal Engine 5
  const handleImportUE5T3D = useCallback(async () => {
    try {
      const clipboardText = await navigator.clipboard.readText();
      if (!clipboardText || !clipboardText.includes('Begin Object')) {
        toast.error('Clipboard does not contain valid Unreal Engine T3D nodes. Copy nodes inside UE5 first!');
        return;
      }

      const { nodes: parsedNodes, edges: parsedEdges } = parseUE5T3DToGraph(clipboardText);
      if (parsedNodes.length === 0) {
        toast.error('No valid Unreal Engine nodes detected in clipboard.');
        return;
      }

      setNodes(parsedNodes);
      setEdges(parsedEdges);
      toast.success(`Successfully imported ${parsedNodes.length} nodes from Unreal Engine 5!`);

      setSimLogs(prev => [
        ...prev,
        {
          id: uuidv4(),
          timestamp: new Date().toLocaleTimeString(),
          type: 'success',
          message: `LogCompiler: Successfully reverse-compiled ${parsedNodes.length} nodes and ${parsedEdges.length} connections from Unreal Engine 5.`,
        },
      ]);
    } catch (e: any) {
      console.error('Failed to import UE5 T3D:', e);
      toast.error(`Import error: ${e.message}`);
    }
  }, [setNodes, setEdges]);

  // Global Ctrl+V listener for instant pasting from UE5
  useEffect(() => {
    const handleGlobalPaste = async (e: ClipboardEvent) => {
      const activeTag = (document.activeElement?.tagName || '').toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

      const pasteData = e.clipboardData?.getData('text');
      if (pasteData && pasteData.includes('Begin Object Class=')) {
        e.preventDefault();
        try {
          const { nodes: parsedNodes, edges: parsedEdges } = parseUE5T3DToGraph(pasteData);
          if (parsedNodes.length > 0) {
            setNodes(parsedNodes);
            setEdges(parsedEdges);
            toast.success(`Pasted ${parsedNodes.length} nodes directly from Unreal Engine 5!`);
          }
        } catch (err: any) {
          console.warn('Clipboard paste parse failed:', err);
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => window.removeEventListener('paste', handleGlobalPaste);
  }, [setNodes, setEdges]);

  // Export JSON file
  const handleExport = useCallback(() => {
    try {
      const exportData = {
        nodes,
        edges,
        projectName: currentProject?.name || 'UnrealProject',
        timestamp: new Date().toISOString()
      };
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${(currentProject?.name || 'blueprint').replace(/\s+/g, '_')}_graph.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Blueprint JSON downloaded');
    } catch {
      toast.error('Export failed');
    }
  }, [nodes, edges, currentProject]);

  // Save as Template
  const handleSaveTemplate = useCallback(async () => {
    if (!currentUser) {
      toast.error('Please log in to save templates');
      return;
    }

    try {
      setIsLoading(true);
      const blueprint = exportBlueprint();
      await BlueprintGenerationService.saveAsTemplate(
        {
          name: blueprint.blueprintName,
          description: blueprint.blueprintDescription,
          nodes,
          edges
        },
        currentUser.uid
      );
      toast.success('Blueprint saved as template!');
      setIsLoading(false);
    } catch {
      toast.error('Failed to save blueprint as template');
      setIsLoading(false);
    }
  }, [currentUser, exportBlueprint, nodes, edges, setIsLoading]);

  // Clear Canvas
  const handleClearCanvas = useCallback(() => {
    if (window.confirm('Clear all nodes and wires from canvas?')) {
      clearBlueprint();
      toast.success('Canvas cleared');
    }
  }, [clearBlueprint]);

  // File selection
  const handleFileSelect = (fileId: string) => {
    if (currentSelectedFileId === fileId) return;
    selectFile(fileId);
    const { files } = useFileSystemStore.getState();
    const file = files.find(f => f.id === fileId);

    if (file && file.type === 'file' && file.content) {
      try {
        const blueprintData = JSON.parse(file.content);
        clearBlueprint();
        setTimeout(() => {
          loadBlueprint(blueprintData);
          setSuccessMessage(`Loaded ${file.name.replace(/\.ueblueprint$/, '')}`);
          setTimeout(() => setSuccessMessage(null), 2500);
        }, 50);
      } catch (error) {
        console.error('Error parsing blueprint data:', error);
        setErrorMessage('Failed to load blueprint: Invalid JSON');
      }
    }
  };

  // Auto-arrange nodes in grid
  const handleAutoArrangeNodes = useCallback(() => {
    if (nodes.length === 0 || isArranging) return;
    setIsArranging(true);

    try {
      const nodeWidth = 280;
      const nodeHeight = 180;
      const horizontalSpacing = 90;
      const verticalSpacing = 70;
      const nodesPerRow = Math.max(1, Math.ceil(Math.sqrt(nodes.length)));

      const arrangedNodes = nodes.map((node, index) => {
        const row = Math.floor(index / nodesPerRow);
        const col = index % nodesPerRow;

        return {
          ...node,
          position: {
            x: 100 + col * (nodeWidth + horizontalSpacing),
            y: 150 + row * (nodeHeight + verticalSpacing),
          },
        };
      });

      setNodes(arrangedNodes);
      toast.success('Nodes organized in grid layout');
    } finally {
      setIsArranging(false);
    }
  }, [nodes, isArranging, setNodes]);

  const handleGenerationComplete = useCallback((_queryText: string) => {
    setIsLoading(false);
  }, [setIsLoading]);

  const selectedNodeCount = useMemo(() => nodes.filter(n => n.selected).length, [nodes]);

  const handlePanePointerDown = useCallback((e: React.PointerEvent) => {
    if (e.button === 2) {
      rightClickStartPos.current = { x: e.clientX, y: e.clientY };
    }
  }, []);

  const handlePaneContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    if (rightClickStartPos.current) {
      const dx = Math.abs(e.clientX - rightClickStartPos.current.x);
      const dy = Math.abs(e.clientY - rightClickStartPos.current.y);
      if (dx > 6 || dy > 6) {
        // Was a right-click drag pan, skip context menu
        return;
      }
    }
    setContextMenuPos({ x: e.clientX, y: e.clientY });
  }, []);

  return (
    <div className="flex h-screen w-full bg-zinc-100 dark:bg-noder-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      {/* File Explorer Sidebar */}
      <FileExplorer
        projectId={projectId || ''}
        onFileSelect={handleFileSelect}
        selectedFileId={currentSelectedFileId}
        onTogglePanel={setIsPanelOpen}
        isPanelOpen={isPanelOpen}
      />

      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        {/* Studio Top Control Bar */}
        <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-noder-dark px-3 flex items-center justify-between z-20 shrink-0 gap-2">
          {/* Left: Breadcrumb, Integrated Tabs, Diagnostics */}
          <div className="flex items-center space-x-2 shrink-0">
            <button
              onClick={() => navigate('/projects')}
              className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Return to Workspaces"
            >
              <LuArrowLeft size={16} />
            </button>
            <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hidden sm:inline truncate max-w-[120px]">
              {currentProject?.name || 'Workspace'}
            </span>
            <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline">/</span>
            {activeSubGraphName ? (
              <div className="flex items-center space-x-1.5 bg-gold-500/10 border border-gold-500/30 px-2 py-0.5 rounded text-xs shrink-0">
                <span className="font-mono text-gold-400 font-semibold">{activeSubGraphName}</span>
                <button
                  onClick={handleExitSubGraph}
                  className="flex items-center space-x-1 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.2 rounded bg-zinc-800 transition-colors"
                  title="Return to Main EventGraph"
                >
                  <LuCornerUpLeft size={11} />
                  <span>Exit</span>
                </button>
              </div>
            ) : (
              <span className="text-xs font-mono font-medium text-gold-500 dark:text-gold-400 truncate max-w-[130px]">
                {blueprintName || 'MainGraph'}
              </span>
            )}

            {/* Sub-Graph Tabs integrated cleanly */}
            <div className="flex items-center bg-zinc-100 dark:bg-black/50 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800 ml-1">
              <button
                onClick={() => switchGraph('EventGraph')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  activeGraphType === 'EventGraph'
                    ? 'bg-white dark:bg-zinc-800 text-gold-500 dark:text-gold-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>⚡ EventGraph</span>
                {activeGraphType === 'EventGraph' && (
                  <span className="text-[10px] px-1 rounded bg-gold-500/10 font-mono text-gold-500">
                    {nodes.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => switchGraph('ConstructionScript')}
                className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                  activeGraphType === 'ConstructionScript'
                    ? 'bg-white dark:bg-zinc-800 text-green-500 dark:text-green-400 shadow-sm'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <span>🛠️ Construction</span>
              </button>
            </div>

            {/* Graph Linter Diagnostic Pill */}
            <div className="relative">
              <button
                onClick={() => setShowLintPopover(!showLintPopover)}
                className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
                  validation.errorCount > 0
                    ? 'border-red-500/40 bg-red-500/10 text-red-500'
                    : validation.warningCount > 0
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-500'
                    : 'border-green-500/40 bg-green-500/10 text-green-500'
                }`}
                title="Blueprint Graph Linter (ueLint)"
              >
                {validation.isValid && validation.warningCount === 0 ? (
                  <>
                    <LuCircleCheck className="w-3.5 h-3.5 text-green-500" />
                    <span className="hidden md:inline">Valid</span>
                  </>
                ) : (
                  <>
                    <LuTriangleAlert className="w-3.5 h-3.5" />
                    <span>{validation.warningCount}w</span>
                  </>
                )}
              </button>

              {/* Lint Issues Dropdown */}
              {showLintPopover && (
                <div className="absolute top-8 left-0 w-72 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-3 z-50 text-xs animate-fade-in">
                  <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                    <span className="font-semibold text-zinc-900 dark:text-zinc-100">Graph Diagnostics</span>
                    <button onClick={() => setShowLintPopover(false)} className="text-zinc-400 hover:text-zinc-600">×</button>
                  </div>
                  {validation.issues.length === 0 ? (
                    <p className="text-green-600 dark:text-green-400 text-[11px]">All execution flow pins and node signatures are intact.</p>
                  ) : (
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {validation.issues.map(iss => (
                        <div key={iss.id} className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[11px]">
                          <p className="font-medium text-zinc-800 dark:text-zinc-200">{iss.nodeTitle ? `${iss.nodeTitle}: ` : ''}{iss.message}</p>
                          {iss.tip && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{iss.tip}</p>}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Right: Studio Tool Groups & Bridges */}
          <div className="flex items-center space-x-1.5 shrink-0">
            {/* Auto-Save Indicator */}
            <div className="mr-1 hidden xl:flex items-center space-x-1 text-[10px] font-mono text-zinc-500">
              {isSaving ? (
                <>
                  <LuLoader className="w-3 h-3 animate-spin text-gold-500" />
                  <span>Saving</span>
                </>
              ) : lastSavedAt ? (
                <>
                  <LuCheck className="w-3 h-3 text-green-500" />
                  <span>Saved</span>
                </>
              ) : null}
            </div>

            {/* Primary Simulation Button */}
            <button
              onClick={handleStartSimulation}
              disabled={isSimulating}
              className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
                isSimulating
                  ? 'border-gold-500 bg-gold-500/20 text-gold-400 animate-pulse'
                  : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
              }`}
              title="Step-by-step visual execution simulator"
            >
              <LuPlay size={12} className="text-gold-500" />
              <span>{isSimulating ? 'Simulating...' : 'Simulate'}</span>
            </button>

            {/* My Blueprint / Variables */}
            <button
              onClick={() => setIsMyBlueprintOpen(true)}
              className="flex items-center space-x-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
              title="Actor Variables (My Blueprint)"
            >
              <LuFolderTree size={13} className="text-gold-500" />
              <span className="hidden lg:inline">Variables</span>
            </button>

            {/* Performance Profiler */}
            <button
              onClick={() => setIsProfilerOpen(true)}
              className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
                profilerAudit.overallScore >= 80
                  ? 'border-green-500/40 bg-green-500/10 text-green-500'
                  : 'border-gold-500/40 bg-gold-500/10 text-gold-500'
              }`}
              title="Unreal Performance Profiler"
            >
              <LuActivity size={12} />
              <span>{profilerAudit.overallScore}</span>
            </button>

            {/* Snapshots History */}
            <button
              onClick={() => setIsSnapshotOpen(true)}
              className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
              title="Blueprint Snapshot Revisions"
            >
              <LuHistory size={14} className="text-gold-500" />
            </button>

            {/* Bridges & Tools Dropdown */}
            <div className="relative">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsBridgesDropdownOpen(!isBridgesDropdownOpen);
                }}
                className="flex items-center space-x-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
                title="Unreal Engine Code & Clipboard Bridges"
              >
                <span>Bridges</span>
                <LuChevronDown size={12} className="text-zinc-400" />
              </button>

              {isBridgesDropdownOpen && (
                <div
                  onClick={(e) => e.stopPropagation()}
                  className="absolute right-0 top-8 w-52 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-1.5 z-50 text-xs animate-fade-in space-y-0.5"
                >
                  <button
                    onClick={() => {
                      setIsCppModalOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuCode className="w-3.5 h-3.5 text-green-500" />
                    <span>Transpile to C++ (.h/.cpp)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsPythonModalOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
                    <span>Python Script (.py)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsT3DModalOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuTerminal className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Inspect T3D ASCII</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRemoteBridgeOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuRadio className="w-3.5 h-3.5 text-green-500" />
                    <span>Live UE5 Remote Bridge</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsRefactorOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuWrench className="w-3.5 h-3.5 text-gold-500" />
                    <span>Refactor & Clean Graph</span>
                  </button>
                  <button
                    onClick={() => {
                      handleCollapseToMacro();
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuMinimize2 className="w-3.5 h-3.5 text-gold-500" />
                    <span>Collapse to Macro (Ctrl+G)</span>
                  </button>
                  <button
                    onClick={() => {
                      setIsDiffOpen(true);
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuGitCompare className="w-3.5 h-3.5 text-gold-500" />
                    <span>Visual Graph Diff</span>
                  </button>
                  <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 my-1" />
                  <button
                    onClick={() => {
                      handleImportUE5T3D();
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuClipboardPaste className="w-3.5 h-3.5 text-gold-500" />
                    <span>Paste / Import from UE5</span>
                  </button>
                  <button
                    onClick={() => {
                      handleExport();
                      setIsBridgesDropdownOpen(false);
                    }}
                    className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
                  >
                    <LuDownload className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Export Graph JSON</span>
                  </button>
                </div>
              )}
            </div>

            {/* Quick Action: Copy for UE5 */}
            <button
              onClick={handleCopyToUE5}
              className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gold-500 hover:bg-gold-400 text-black text-xs font-semibold shadow-sm transition-all shrink-0"
              title="Copy to clipboard for Ctrl+V paste into Unreal Engine 5"
            >
              <LuClipboardCopy size={13} />
              <span>Copy UE5</span>
            </button>

            <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800 mx-0.5" />

            {/* Utilities: Grid, Save, Clear, MiniMap, Theme */}
            <button
              onClick={() => {
                const next = !snapToGrid;
                setSnapToGrid(next);
                toast(next ? 'Snap to Grid (16px) Enabled' : 'Snap to Grid Disabled', { icon: '📐' });
              }}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors ${
                snapToGrid
                  ? 'border-gold-500/50 bg-gold-500/15 text-gold-400 font-semibold shadow-sm'
                  : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-200'
              }`}
              title="Toggle Unreal Engine Snap to Grid (16px)"
            >
              16px
            </button>
            <button
              onClick={handleAutoArrangeNodes}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Auto-arrange Grid Layout"
            >
              <LuLayoutGrid size={14} />
            </button>
            <button
              onClick={handleSaveTemplate}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Save as Template"
            >
              <LuSave size={14} />
            </button>
            <button
              onClick={() => setShowMiniMap(!showMiniMap)}
              className={`p-1 rounded transition-colors ${
                showMiniMap
                  ? 'bg-gold-500/10 text-gold-500'
                  : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
              }`}
              title="Toggle MiniMap Navigator"
            >
              <LuMap size={14} />
            </button>
            <button
              onClick={handleClearCanvas}
              className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors"
              title="Clear Canvas"
            >
              <LuTrash2 size={14} />
            </button>
            <button
              onClick={toggleTheme}
              className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              title="Toggle Theme"
            >
              {theme === 'dark' ? <LuSun size={14} className="text-gold-400" /> : <LuMoon size={14} />}
            </button>
          </div>
        </header>

        {/* Canvas Viewport */}
        <div className="flex-1 relative h-full overflow-hidden pb-8">
          <ReactFlowProvider>
            <div className="w-full h-full absolute inset-0">
              {/* Floating Multi-Node Selection Action HUD */}
              {selectedNodeCount >= 2 && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/90 dark:bg-zinc-900/95 border border-gold-500/50 rounded-full shadow-2xl backdrop-blur-md text-xs text-white select-none">
                  <span className="font-mono text-gold-400 font-semibold px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-[11px]">
                    {selectedNodeCount} Selected
                  </span>
                  <span className="text-zinc-600">|</span>
                  <button
                    onClick={handleAlignSelectedHorizontal}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Align Horizontally (Shift+A)"
                  >
                    <LuAlignHorizontalJustifyCenter size={14} />
                  </button>
                  <button
                    onClick={handleAlignSelectedVertical}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Align Vertically (Shift+W)"
                  >
                    <LuAlignVerticalJustifyCenter size={14} />
                  </button>
                  <button
                    onClick={handleStraightenConnections}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Straighten Connections (Q)"
                  >
                    <LuSparkles size={14} />
                  </button>
                  <button
                    onClick={handleCollapseToMacro}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Collapse to Macro (Ctrl+G)"
                  >
                    <LuMinimize2 size={14} />
                  </button>
                  <button
                    onClick={handleAddComment}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Wrap in Comment (C)"
                  >
                    <LuMessageSquare size={14} />
                  </button>
                  <button
                    onClick={handleDuplicateSelected}
                    className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
                    title="Duplicate Selected (Ctrl+D)"
                  >
                    <LuCopy size={14} />
                  </button>
                  <button
                    onClick={handleDeleteSelected}
                    className="p-1.5 hover:text-red-400 hover:bg-red-500/20 text-red-400 rounded transition-colors"
                    title="Delete Selected (Del)"
                  >
                    <LuTrash2 size={14} />
                  </button>
                </div>
              )}

              <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
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
                onNodeClick={(e, node) => {
                  if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    setSelectedNodes([node]);
                  }
                }}
                onNodeDoubleClick={(_, node) => {
                  if (node.data?.subGraphId) {
                    const subGraph = useBlueprintStore.getState().subGraphs[node.data.subGraphId];
                    if (subGraph) {
                      setActiveSubGraphName(node.data.title);
                      setNodes(subGraph.nodes);
                      setEdges(subGraph.edges);
                      toast(`Drilled down into ${node.data.title}`);
                    }
                  }
                }}
                onEdgeClick={(_, edge) => setSelectedEdges([edge])}
                onEdgeDoubleClick={handleEdgeDoubleClick}
                onPointerDown={handlePanePointerDown}
                onPaneContextMenu={handlePaneContextMenu}
                onPaneClick={(e) => {
                  if (!e.shiftKey && !e.ctrlKey && !e.metaKey) {
                    setSelectedNodes([]);
                    setSelectedEdges([]);
                  }
                  setContextMenuPos(null);

                  // Unreal Engine Hotkey Spawning (B+Click, S+Click, D+Click, P+Click)
                  if (heldKey === 'b') {
                    handleSpawnAtPosition('flow-branch', e.clientX, e.clientY);
                  } else if (heldKey === 's') {
                    handleSpawnAtPosition('flow-sequence', e.clientX, e.clientY);
                  } else if (heldKey === 'd') {
                    handleSpawnAtPosition('flow-delay', e.clientX, e.clientY);
                  } else if (heldKey === 'p') {
                    handleSpawnAtPosition('print-string', e.clientX, e.clientY);
                  }
                }}
                className={theme === 'dark' ? 'bg-[#0E0E11]' : 'bg-[#F8FAFC]'}
              >
                <UnrealEngineGrid theme={theme} />
                <Controls className="border-zinc-300 dark:border-zinc-800" />
                {showMiniMap && (
                  <MiniMap
                    nodeColor={(n) => (n.data as any)?.color || '#18181B'}
                    className="border border-zinc-300 dark:border-zinc-800 rounded-lg overflow-hidden hidden md:block"
                  />
                )}

                {/* Floating Bottom NLP Prompt Bar */}
                <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 z-10 w-full max-w-2xl px-4 pointer-events-auto">
                  <NLPInput onGenerate={handleGenerationComplete} />
                </div>

                {/* Loading Overlay */}
                {isLoading && (
                  <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
                    <div className="flex flex-col items-center p-6 rounded-lg bg-noder-dark border border-zinc-800 shadow-2xl">
                      <LuLoader className="w-7 h-7 text-gold-500 animate-spin mb-3" />
                      <p className="text-white font-semibold text-xs tracking-wider uppercase">
                        Synthesizing Blueprint Graph with Gemini...
                      </p>
                    </div>
                  </div>
                )}
              </ReactFlow>
            </div>
          </ReactFlowProvider>
        </div>

        {/* Unreal Engine Output Log Console */}
        <OutputLogConsole
          logs={simLogs}
          isSimulating={isSimulating}
          isPaused={isSimPaused}
          isAudioMuted={isAudioMuted}
          onToggleMute={() => {
            const next = !isAudioMuted;
            setIsAudioMuted(next);
            blueprintAudio.setMuted(next);
          }}
          onStartSimulation={handleStartSimulation}
          onStopSimulation={handleStopSimulation}
          onResumeSimulation={handleResumeSimulation}
          onStepForward={handleStepForward}
          onClearLogs={() => setSimLogs([])}
        />

        {/* Unreal Engine Right-Click Action Palette */}
        {contextMenuPos && (
          <UnrealContextMenu
            x={contextMenuPos.x}
            y={contextMenuPos.y}
            onClose={() => setContextMenuPos(null)}
            onSelectNode={(preset) => handleAddNodeFromLibrary(preset, contextMenuPos)}
            onAddComment={handleAddComment}
          />
        )}

        {/* Node Library Drawer */}
        <NodeLibraryDrawer
          isOpen={isNodeLibraryOpen}
          onClose={() => setIsNodeLibraryOpen(false)}
          onAddNode={handleAddNodeFromLibrary}
        />

        {/* T3D Live Inspector Modal */}
        <T3DInspectorModal
          isOpen={isT3DModalOpen}
          onClose={() => setIsT3DModalOpen(false)}
          t3dContent={compiledT3D.t3dText}
          nodeCount={compiledT3D.nodeCount}
          connectionCount={compiledT3D.connectionCount}
        />

        {/* C++ Transpiler Modal */}
        <CppTranspilerModal
          isOpen={isCppModalOpen}
          onClose={() => setIsCppModalOpen(false)}
          blueprintName={blueprintName}
          targetClass="Character"
          nodes={nodes}
          edges={edges}
        />

        {/* Python Automation Script Modal */}
        <PythonScriptModal
          isOpen={isPythonModalOpen}
          onClose={() => setIsPythonModalOpen(false)}
          blueprintName={blueprintName}
          targetClass="Character"
          nodes={nodes}
          edges={edges}
        />

        {/* My Blueprint Drawer */}
        <MyBlueprintDrawer
          isOpen={isMyBlueprintOpen}
          onClose={() => setIsMyBlueprintOpen(false)}
        />

        {/* Blueprint Performance Profiler Modal */}
        <BlueprintProfilerModal
          isOpen={isProfilerOpen}
          onClose={() => setIsProfilerOpen(false)}
          audit={profilerAudit}
          isHeatmapActive={isHeatmapActive}
          onToggleHeatmap={handleToggleHeatmap}
        />

        {/* Snapshot & Revisions History Modal */}
        <SnapshotModal
          isOpen={isSnapshotOpen}
          onClose={() => setIsSnapshotOpen(false)}
          blueprintName={blueprintName}
          nodes={nodes}
          edges={edges}
          onRestoreSnapshot={handleRestoreSnapshot}
          onOpenDiff={() => {
            setIsSnapshotOpen(false);
            setIsDiffOpen(true);
          }}
        />

        {/* Visual Graph Diff Modal */}
        <DiffModal
          isOpen={isDiffOpen}
          onClose={() => setIsDiffOpen(false)}
          currentNodes={nodes}
          currentEdges={edges}
          snapshots={savedSnapshots}
          onRollback={handleRestoreSnapshot}
        />

        {/* Unreal Engine 5 Live Remote Execution Bridge Modal */}
        <RemoteBridgeModal
          isOpen={isRemoteBridgeOpen}
          onClose={() => setIsRemoteBridgeOpen(false)}
          blueprintName={blueprintName || 'MainGraph'}
          targetClass="Character"
          nodes={nodes}
          edges={edges}
        />

        {/* Blueprint Refactoring & Code Optimizer Modal */}
        <RefactorModal
          isOpen={isRefactorOpen}
          onClose={() => setIsRefactorOpen(false)}
          nodes={nodes}
          edges={edges}
          onApplyRefactor={(optimizedNodes, optimizedEdges) => {
            setNodes(optimizedNodes);
            setEdges(optimizedEdges);
          }}
        />

        {/* Error / Success Badges */}
        {errorMessage && (
          <div className="fixed bottom-12 right-4 z-50 bg-red-950 border border-red-700 text-red-200 px-3.5 py-2 rounded text-xs shadow-2xl">
            {errorMessage}
          </div>
        )}
        {successMessage && (
          <div className="fixed bottom-12 right-4 z-50 bg-green-950 border border-green-700 text-green-200 px-3.5 py-2 rounded text-xs shadow-2xl">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default BlueprintEditor;
