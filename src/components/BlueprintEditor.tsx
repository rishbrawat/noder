import React, { useEffect, useCallback, useState, useMemo, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ReactFlowInstance } from 'reactflow';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'react-hot-toast';
import { useBlueprintStore } from '../store/blueprintStore';
import { useProjectStore } from '../store/projectStore';
import { useFileSystemStore } from '../store/fileSystemStore';
import { useBlueprint } from '../hooks/useBlueprint';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { FileExplorer } from './FileExplorer';
import { BlueprintToolbar } from './toolbar/BlueprintToolbar';
import { NodeDetailsDrawer } from './drawer/NodeDetailsDrawer';
import { OutputLogConsole } from './OutputLogConsole';
import { UnrealContextMenu, OriginPinContext } from './UnrealContextMenu';
import { MyBlueprintDrawer } from './MyBlueprintDrawer';
import { NodeLibraryDrawer } from './NodeLibraryDrawer';
import { EditorModals } from './modals/EditorModals';
import { CanvasViewport } from './canvas/CanvasViewport';
import { ShortcutController, copyGraphToUE5Clipboard, importGraphFromUE5Clipboard } from './controllers/ShortcutController';
import { useSimulationController } from './controllers/SimulationController';
import { compileGraphToT3D } from '../utils/ueT3DCompiler';
import { parseUE5T3DToGraph } from '../utils/ueT3DParser';
import { validateBlueprintGraph } from '../utils/blueprintValidator';
import { formatGraphLayout } from '../utils/blueprintLayout';
import { profileBlueprintGraph } from '../utils/blueprintProfiler';
import { blueprintAudio } from '../utils/blueprintAudio';
import { BlueprintGenerationService } from '../services/blueprintGenerationService';
import { StandardUENodePreset, STANDARD_UE_NODES } from '../data/standardUENodes';
import { BlueprintNode as IBlueprintNode } from '../types/BlueprintTypes';

export const BlueprintEditor: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { currentUser } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [panelState, setPanelState] = useState({ isPanelOpen: true, isDetailsOpen: true, isOutputLogExpanded: false, showMiniMap: false, snapToGrid: true, isHeatmapActive: false });
  const [activeSubGraphName, setActiveSubGraphName] = useState<string | null>(null);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [contextMenuOriginPin, setContextMenuOriginPin] = useState<OriginPinContext | null>(null);
  const [modals, setModals] = useState<Record<string, boolean>>({});
  const setModal = (k: string, v: boolean) => setModals(m => ({ ...m, [k]: v }));

  const {
    nodes, edges, onNodesChange, onEdgesChange, onConnect, blueprintName, isLoading,
    activeGraphType, switchGraph, setSelectedNodes, setSelectedEdges, setIsLoading,
    loadBlueprint, clearBlueprint, setNodes, setEdges, pushHistory, undo, redo,
    canUndo, canRedo, logs: storeLogs, addLog, clearLogs,
  } = useBlueprintStore();
  const { projects } = useProjectStore();
  const { selectedFileId, fetchFiles, selectFile, setupRealtimeUpdates, cleanupRealtimeUpdates, debouncedSaveContent, isSaving, lastSavedAt } = useFileSystemStore();
  const { exportBlueprint, cancelGeneration } = useBlueprint();

  const reactFlowInstanceRef = useRef<ReactFlowInstance | null>(null);
  const lastMousePosRef = useRef<{ x: number; y: number }>({ x: 300, y: 200 });
  const heldKeyRef = useRef<string | null>(null);
  const sim = useSimulationController({ nodes, edges, blueprintName, setNodes, setEdges, addLog });
  const currentProject = useMemo(() => projects.find(p => p.id === projectId), [projects, projectId]);

  useEffect(() => {
    if (projectId) { setupRealtimeUpdates(projectId); fetchFiles(projectId); }
    return () => cleanupRealtimeUpdates();
  }, [projectId, setupRealtimeUpdates, fetchFiles, cleanupRealtimeUpdates]);

  useEffect(() => {
    if (selectedFileId && nodes.length > 0) debouncedSaveContent(selectedFileId, JSON.stringify(exportBlueprint(), null, 2));
  }, [nodes, edges, selectedFileId, debouncedSaveContent, exportBlueprint]);

  const structuralHash = useMemo(() => {
    const nSig = nodes.map(n => `${n.id}:${n.data?.title}:${n.data?.inputs?.length}:${n.data?.outputs?.length}:${Boolean(n.data?.hasBreakpoint)}`).join('|');
    const eSig = edges.map(e => `${e.source}:${e.sourceHandle}->${e.target}:${e.targetHandle}`).join('|');
    return `${nodes.length}:${nSig}#${edges.length}:${eSig}`;
  }, [nodes, edges]);

  const compiledT3D = useMemo(() => !nodes.length || !structuralHash ? { t3dText: '', nodeCount: 0, connectionCount: 0 } : compileGraphToT3D(nodes, edges), [nodes, edges, structuralHash]);
  const validation = useMemo(() => !structuralHash ? { isValid: true, errorCount: 0, warningCount: 0, infoCount: 0, issues: [] } : validateBlueprintGraph(nodes, edges, activeGraphType), [nodes, edges, structuralHash, activeGraphType]);
  const profilerAudit = useMemo(() => !structuralHash ? { overallScore: 100, verdict: 'Ship-Ready' as const, tickNodeCount: 0, heavyOperationCount: 0, pureMathCount: 0, estimatedFrameCostMs: 0, nodeAudits: [], recommendations: [] } : profileBlueprintGraph(nodes, edges), [nodes, edges, structuralHash]);
  const selectedNodesList = useMemo(() => nodes.filter(n => n.selected), [nodes]);
  const savedSnapshots = useMemo(() => {
    try { const raw = localStorage.getItem(`noder_snapshots_${(blueprintName || 'MainGraph').replace(/\s+/g, '_')}`); return raw ? JSON.parse(raw) : []; } catch { return []; }
  }, [blueprintName]);

  const handleToggleHeatmap = useCallback(() => {
    const next = !panelState.isHeatmapActive;
    setPanelState(s => ({ ...s, isHeatmapActive: next }));
    if (next) {
      const map = new Map(profilerAudit.nodeAudits.map(a => [a.nodeId, a.severity]));
      setNodes(nodes.map(n => ({ ...n, data: { ...n.data, performanceSeverity: map.get(n.id) || 'optimal' } })));
      toast.success('Performance Heatmap enabled');
    } else {
      setNodes(nodes.map(n => { const { performanceSeverity: _, ...rest } = n.data as any; return { ...n, data: rest }; }));
      toast('Heatmap disabled');
    }
  }, [panelState.isHeatmapActive, profilerAudit, nodes, setNodes]);

  const handleAddComment = useCallback(() => {
    const sel = nodes.filter(n => n.selected);
    const minX = sel.length ? Math.min(...sel.map(n => n.position.x)) : 150, minY = sel.length ? Math.min(...sel.map(n => n.position.y)) : 150;
    const maxX = sel.length ? Math.max(...sel.map(n => n.position.x + 240)) : 670, maxY = sel.length ? Math.max(...sel.map(n => n.position.y + 180)) : 490;
    const w = Math.max(340, maxX - minX + 80), h = Math.max(220, maxY - minY + 100);
    const commentNode: IBlueprintNode = { id: uuidv4(), type: 'commentNode', position: { x: Math.max(50, minX - 40), y: Math.max(50, minY - 60) }, style: { width: w, height: h, zIndex: -1 }, data: { title: sel.length ? 'Selected Logic Group' : 'Comment Group', color: '#CA8A04', width: w, height: h, inputs: [], outputs: [], nodeType: 'macro' } };
    pushHistory('Add Comment'); setNodes([commentNode, ...nodes]); toast.success('Added Unreal Comment Box (C)');
  }, [nodes, setNodes, pushHistory]);

  const handleStraightenConnections = useCallback(() => {
    let mod = false;
    const updated = nodes.map(node => {
      if (!node.selected) return node;
      const inEdge = edges.find(e => e.target === node.id), src = inEdge ? nodes.find(n => n.id === inEdge.source) : null;
      if (src) { mod = true; return { ...node, position: { ...node.position, y: src.position.y } }; }
      const outEdge = edges.find(e => e.source === node.id), tgt = outEdge ? nodes.find(n => n.id === outEdge.target) : null;
      if (tgt) { mod = true; return { ...node, position: { ...node.position, y: tgt.position.y } }; }
      return node;
    });
    if (mod) { pushHistory('Straighten Wires'); setNodes(updated); toast.success('Straightened wire connections (Q)'); }
  }, [nodes, edges, setNodes, pushHistory]);

  const handleAlign = useCallback((axis: 'x' | 'y') => {
    const sel = nodes.filter(n => n.selected);
    if (sel.length < 2) return;
    pushHistory('Align Nodes');
    const avg = Math.round(sel.reduce((acc, n) => acc + n.position[axis], 0) / sel.length);
    setNodes(nodes.map(n => n.selected ? { ...n, position: { ...n.position, [axis]: avg } } : n));
    toast.success(`Aligned ${sel.length} nodes ${axis === 'y' ? 'horizontally (Shift+A)' : 'vertically (Shift+W)'}`);
  }, [nodes, setNodes, pushHistory]);

  const handleDeleteSelected = useCallback(() => {
    const sel = nodes.filter(n => n.selected);
    if (!sel.length) return;
    pushHistory('Delete Selected');
    const selIds = new Set(sel.map(n => n.id)), healed: typeof edges = [];
    sel.forEach(node => {
      if (node.data?.nodeType === 'reroute' || node.data?.title?.toLowerCase() === 'reroute') {
        const inE = edges.filter(e => e.target === node.id), outE = edges.filter(e => e.source === node.id);
        if (inE.length === 1 && outE.length === 1) healed.push({ id: `edge_${inE[0].source}_${outE[0].target}_${Date.now()}`, source: inE[0].source, sourceHandle: inE[0].sourceHandle, target: outE[0].target, targetHandle: outE[0].targetHandle, type: 'blueprintEdge', data: inE[0].data || outE[0].data, animated: inE[0].animated });
      }
    });
    setNodes(nodes.filter(n => !selIds.has(n.id)));
    setEdges([...edges.filter(e => !selIds.has(e.source) && !selIds.has(e.target)), ...healed]);
    toast.success(`Deleted ${sel.length} node(s)`);
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  const handleDuplicateSelected = useCallback(() => {
    const sel = nodes.filter(n => n.selected);
    if (!sel.length) return;
    pushHistory('Duplicate Selected');
    setNodes([...nodes.map(n => ({ ...n, selected: false })), ...sel.map(n => ({ ...n, id: uuidv4(), position: { x: n.position.x + 40, y: n.position.y + 40 }, selected: true, data: { ...n.data, inputs: (n.data.inputs || []).map(i => ({ ...i })), outputs: (n.data.outputs || []).map(o => ({ ...o })) } }))]);
    toast.success(`Duplicated ${sel.length} node(s)`);
  }, [nodes, setNodes, pushHistory]);

  const handleCollapseToMacro = useCallback(() => {
    const sel = nodes.filter(n => n.selected);
    if (sel.length < 2) { toast('Select at least 2 nodes to collapse into a Macro (Ctrl+G)', { icon: 'ℹ️' }); return; }
    const name = window.prompt('Enter Macro / Subgraph name:', 'CalculateMechanic');
    if (!name?.trim()) return;
    const macroId = `subgraph_${Date.now()}`, selIds = new Set(sel.map(n => n.id));
    const inputs: any[] = [{ name: 'Execute', type: 'exec' }], outputs: any[] = [{ name: 'Then', type: 'exec' }];
    edges.filter(e => !selIds.has(e.source) && selIds.has(e.target)).forEach(e => { const p = (e.targetHandle || '').split('-').slice(1).join('-') || 'In'; if (!inputs.some(i => i.name === p)) inputs.push({ name: p, type: (e.data as any)?.pinType || 'exec' }); });
    edges.filter(e => selIds.has(e.source) && !selIds.has(e.target)).forEach(e => { const p = (e.sourceHandle || '').split('-').slice(1).join('-') || 'Out'; if (!outputs.some(o => o.name === p)) outputs.push({ name: p, type: (e.data as any)?.pinType || 'exec' }); });
    const macroNode: IBlueprintNode = { id: macroId, type: 'customNode', position: { x: Math.round(sel.reduce((a, n) => a + n.position.x, 0) / sel.length), y: Math.round(sel.reduce((a, n) => a + n.position.y, 0) / sel.length) }, data: { title: `Macro: ${name.trim()}`, subtitle: 'Collapsed Subgraph', nodeType: 'macro', color: '#CA8A04', subGraphId: macroId, inputs, outputs } };
    useBlueprintStore.setState({ subGraphs: { ...useBlueprintStore.getState().subGraphs, [macroId]: { nodes: sel.map(n => ({ ...n, selected: false })), edges: edges.filter(e => selIds.has(e.source) && selIds.has(e.target)) } } });
    pushHistory('Collapse to Macro'); setNodes([...nodes.filter(n => !selIds.has(n.id)), macroNode]); setEdges(edges.filter(e => !selIds.has(e.source) && !selIds.has(e.target)));
    toast.success(`Collapsed ${sel.length} nodes into Macro "${name.trim()}"`);
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  const handleSpawnAtPosition = useCallback((presetId: string, clientX?: number, clientY?: number) => {
    const preset = STANDARD_UE_NODES.find(p => p.id === presetId);
    if (!preset) return;
    const x = clientX !== undefined ? clientX - 100 : lastMousePosRef.current.x, y = clientY !== undefined ? clientY - 40 : lastMousePosRef.current.y;
    setNodes([...nodes, { id: uuidv4(), type: 'customNode', position: { x: Math.max(50, x), y: Math.max(50, y) }, data: { title: preset.title, subtitle: preset.subtitle, nodeType: preset.nodeType, color: preset.color, inputs: preset.inputs.map(i => ({ ...i })), outputs: preset.outputs.map(o => ({ ...o })) } }]);
    toast.success(`Spawned "${preset.title}"`);
  }, [nodes, setNodes]);

  const handleAddNodeFromLibrary = useCallback((preset: StandardUENodePreset, spawnPos?: { x: number; y: number }, originPin?: OriginPinContext | null) => {
    const newId = uuidv4();
    let flowX = spawnPos?.x ?? Math.round(Math.random() * 150 + 250), flowY = spawnPos?.y ?? Math.round(Math.random() * 150 + 150);
    if (spawnPos && reactFlowInstanceRef.current) {
      const p = typeof reactFlowInstanceRef.current.screenToFlowPosition === 'function' ? reactFlowInstanceRef.current.screenToFlowPosition(spawnPos) : reactFlowInstanceRef.current.project(spawnPos);
      flowX = Math.round(p.x); flowY = Math.round(p.y);
    }
    const newNode: IBlueprintNode = { id: newId, type: 'customNode', position: { x: flowX, y: flowY }, data: { title: preset.title, subtitle: preset.subtitle, nodeType: preset.nodeType, color: preset.color, inputs: preset.inputs.map(i => ({ ...i })), outputs: preset.outputs.map(o => ({ ...o })) } };
    pushHistory(originPin ? 'Spawn & Connect Wire' : 'Spawn Node');
    if (originPin) {
      const newEdges = [...edges];
      if (originPin.handleType === 'source') {
        const inp = newNode.data.inputs.find(i => i.type === originPin.pinType || (originPin.pinType === 'exec' && i.type === 'exec'));
        if (inp) newEdges.push({ id: `edge_${originPin.nodeId}_${newId}_${Date.now()}`, source: originPin.nodeId, sourceHandle: originPin.handleId, target: newId, targetHandle: `${inp.type}-${inp.name.toLowerCase().replace(/\s+/g, '')}`, type: 'blueprintEdge', data: { pinType: originPin.pinType }, animated: false });
      } else {
        const out = newNode.data.outputs.find(o => o.type === originPin.pinType || (originPin.pinType === 'exec' && o.type === 'exec'));
        if (out) newEdges.push({ id: `edge_${newId}_${originPin.nodeId}_${Date.now()}`, source: newId, sourceHandle: `${out.type}-${out.name.toLowerCase().replace(/\s+/g, '')}`, target: originPin.nodeId, targetHandle: originPin.handleId, type: 'blueprintEdge', data: { pinType: originPin.pinType }, animated: false });
      }
      setEdges(newEdges); blueprintAudio.playStepPulse(); toast.success(`Connected "${preset.title}"`);
    } else { toast.success(`Spawned "${preset.title}"`); }
    setNodes([...nodes, newNode]);
  }, [nodes, edges, setNodes, setEdges, pushHistory]);

  const handleExport = useCallback(() => {
    try {
      const blob = new Blob([JSON.stringify({ nodes, edges, projectName: currentProject?.name || 'UnrealProject', timestamp: new Date().toISOString() }, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob), a = document.createElement('a');
      a.href = url; a.download = `${(currentProject?.name || 'blueprint').replace(/\s+/g, '_')}_graph.json`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url); toast.success('Blueprint JSON downloaded');
    } catch { toast.error('Export failed'); }
  }, [nodes, edges, currentProject]);

  const handleSaveTemplate = useCallback(async () => {
    if (!currentUser) { toast.error('Please log in to save templates'); return; }
    try {
      setIsLoading(true); const bp = exportBlueprint();
      await BlueprintGenerationService.saveAsTemplate({ name: bp.blueprintName, description: bp.blueprintDescription, nodes, edges }, currentUser.uid);
      toast.success('Blueprint saved as template!'); setIsLoading(false);
    } catch { toast.error('Failed to save blueprint as template'); setIsLoading(false); }
  }, [currentUser, exportBlueprint, nodes, edges, setIsLoading]);

  return (
    <div className="flex h-screen w-full bg-zinc-100 dark:bg-noder-black text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans select-none">
      <FileExplorer projectId={projectId || ''} onFileSelect={(fId) => { selectFile(fId); const f = useFileSystemStore.getState().files.find(fi => fi.id === fId); if (f?.content) { try { const d = JSON.parse(f.content); clearBlueprint(); setTimeout(() => loadBlueprint(d), 50); } catch { /* ignore */ } } }} selectedFileId={selectedFileId} onTogglePanel={(open) => setPanelState(s => ({ ...s, isPanelOpen: open }))} isPanelOpen={panelState.isPanelOpen} />
      <div className="flex-1 flex flex-col relative h-full overflow-hidden">
        <ShortcutController
          onUndo={() => { undo(); blueprintAudio.playStepPulse(); toast('Undo (Ctrl+Z)', { icon: '↩️', duration: 1200 }); }}
          onRedo={() => { redo(); blueprintAudio.playStepPulse(); toast('Redo (Ctrl+Y)', { icon: '↪️', duration: 1200 }); }}
          onAddComment={handleAddComment} onStraightenConnections={handleStraightenConnections}
          onAlignHorizontal={() => handleAlign('y')} onAlignVertical={() => handleAlign('x')}
          onFormatGraph={() => { if (nodes.length > 1) { pushHistory('Format Graph Layout'); setNodes(formatGraphLayout(nodes, edges)); blueprintAudio.playStepPulse(); toast.success('Formatted execution flow (Shift+F)'); } }}
          onDeleteSelected={handleDeleteSelected} onDuplicateSelected={handleDuplicateSelected} onCollapseToMacro={handleCollapseToMacro}
          onToggleBreakpoint={sim.toggleBreakpoint} onOpenContextMenu={(pos) => setContextMenuPos(pos)}
          isSimulating={sim.isSimulating} isSimPaused={sim.isSimPaused} onResumeSimulation={sim.resumeSimulation} onStepForward={sim.stepForward}
          onPasteUE5={(data) => { try { const { nodes: pN, edges: pE } = parseUE5T3DToGraph(data); if (pN.length) { pushHistory('Paste from UE5'); setNodes(pN); setEdges(pE); toast.success(`Pasted ${pN.length} nodes from UE5!`); } } catch (err) { console.warn(err); } }}
          lastMousePosRef={lastMousePosRef} heldKeyRef={heldKeyRef}
        />
        <BlueprintToolbar
          projectName={currentProject?.name} onNavigateBack={() => navigate('/projects')} blueprintName={blueprintName}
          activeSubGraphName={activeSubGraphName} onExitSubGraph={() => { const p = useBlueprintStore.getState().subGraphs['EventGraph']; if (p) { setNodes(p.nodes); setEdges(p.edges); setActiveSubGraphName(null); toast('Returned to EventGraph'); } }} activeGraphType={activeGraphType}
          onSwitchGraph={switchGraph} nodeCount={nodes.length} validation={validation} isSaving={isSaving} lastSavedAt={lastSavedAt}
          isSimulating={sim.isSimulating} onStartSimulation={sim.startSimulation} onOpenMyBlueprint={() => setModal('myBlueprint', true)}
          profilerScore={profilerAudit.overallScore} onOpenProfiler={() => setModal('profiler', true)} onOpenSnapshot={() => setModal('snapshot', true)}
          onOpenCpp={() => setModal('cpp', true)} onOpenPython={() => setModal('python', true)} onOpenT3D={() => setModal('t3d', true)}
          onOpenRemoteBridge={() => setModal('remoteBridge', true)} onOpenRefactor={() => setModal('refactor', true)}
          onCollapseToMacro={handleCollapseToMacro} onOpenDiff={() => setModal('diff', true)}
          onImportUE5={() => importGraphFromUE5Clipboard(setNodes, setEdges, pushHistory, addLog)}
          onExportJSON={handleExport} onCopyUE5={() => copyGraphToUE5Clipboard(nodes, edges, addLog)} snapToGrid={panelState.snapToGrid}
          onToggleSnapToGrid={() => { const next = !panelState.snapToGrid; setPanelState(s => ({ ...s, snapToGrid: next })); toast(next ? 'Snap to Grid (16px) Enabled' : 'Snap to Grid Disabled', { icon: '📐' }); }}
          canUndo={canUndo} canRedo={canRedo} onUndo={() => { undo(); blueprintAudio.playStepPulse(); toast('Undo (Ctrl+Z)', { icon: '↩️', duration: 1200 }); }}
          onRedo={() => { redo(); blueprintAudio.playStepPulse(); toast('Redo (Ctrl+Y)', { icon: '↪️', duration: 1200 }); }}
          onFormatGraph={() => { if (nodes.length > 1) { pushHistory('Format Graph Layout'); setNodes(formatGraphLayout(nodes, edges)); blueprintAudio.playStepPulse(); toast.success('Formatted execution flow (Shift+F)'); } }}
          onAutoArrange={() => { const perRow = Math.max(1, Math.ceil(Math.sqrt(nodes.length))); setNodes(nodes.map((n, i) => ({ ...n, position: { x: 100 + (i % perRow) * 370, y: 150 + Math.floor(i / perRow) * 250 } }))); pushHistory('Auto-arrange'); toast.success('Nodes organized in grid layout'); }}
          onSaveTemplate={handleSaveTemplate} showMiniMap={panelState.showMiniMap} onToggleMiniMap={() => setPanelState(s => ({ ...s, showMiniMap: !s.showMiniMap }))}
          onClearCanvas={() => { if (window.confirm('Clear all nodes and wires from canvas?')) { clearBlueprint(); toast.success('Canvas cleared'); } }} onOpenBYOK={() => setModal('byok', true)}
          theme={theme} onToggleTheme={toggleTheme} isDetailsOpen={panelState.isDetailsOpen} onToggleDetails={() => setPanelState(s => ({ ...s, isDetailsOpen: !s.isDetailsOpen }))}
        />
        <CanvasViewport
          nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect} theme={theme}
          snapToGrid={panelState.snapToGrid} showMiniMap={panelState.showMiniMap} isOutputLogExpanded={panelState.isOutputLogExpanded} isLoading={isLoading}
          selectedNodes={selectedNodesList} reactFlowInstanceRef={reactFlowInstanceRef} heldKeyRef={heldKeyRef} onQuickSpawn={handleSpawnAtPosition}
          onNodeDragStart={() => pushHistory('Move Node')}
          onNodeClick={(e, node) => { if (!e.shiftKey && !e.ctrlKey && !e.metaKey) setSelectedNodes([node]); }}
          onNodeDoubleClick={(_, node) => { if (node.data?.subGraphId) { const sub = useBlueprintStore.getState().subGraphs[node.data.subGraphId]; if (sub) { setActiveSubGraphName(node.data.title); setNodes(sub.nodes); setEdges(sub.edges); toast(`Drilled down into ${node.data.title}`); } } }}
          onEdgeClick={(_, edge) => setSelectedEdges([edge])}
          onContextMenuRequest={(pos, origin) => { setContextMenuOriginPin(origin || null); setContextMenuPos(pos); }}
          onAlignHorizontal={() => handleAlign('y')} onAlignVertical={() => handleAlign('x')} onStraighten={handleStraightenConnections}
          onCollapseToMacro={handleCollapseToMacro} onWrapComment={handleAddComment} onDuplicate={handleDuplicateSelected} onDelete={handleDeleteSelected}
          onGenerationComplete={() => { setIsLoading(false); setTimeout(() => reactFlowInstanceRef.current?.fitView({ padding: 0.25, duration: 800 }), 100); }}
          onCancelGeneration={cancelGeneration}
        />
        <NodeDetailsDrawer selectedNodes={selectedNodesList} edges={edges} isOpen={panelState.isDetailsOpen} onToggle={() => setPanelState(s => ({ ...s, isDetailsOpen: !s.isDetailsOpen }))} onWrapComment={handleAddComment} onStraighten={handleStraightenConnections} onDuplicate={handleDuplicateSelected} onDelete={handleDeleteSelected} />
        <OutputLogConsole logs={storeLogs} isSimulating={sim.isSimulating} isPaused={sim.isSimPaused} isAudioMuted={sim.isAudioMuted} isExpanded={panelState.isOutputLogExpanded} onToggleExpand={(exp) => setPanelState(s => ({ ...s, isOutputLogExpanded: exp }))} onToggleMute={sim.toggleAudioMute} onStartSimulation={sim.startSimulation} onStopSimulation={sim.stopSimulation} onResumeSimulation={sim.resumeSimulation} onStepForward={sim.stepForward} onClearLogs={clearLogs} />
        {contextMenuPos && (
          <UnrealContextMenu x={contextMenuPos.x} y={contextMenuPos.y} originPin={contextMenuOriginPin} onClose={() => { setContextMenuPos(null); setContextMenuOriginPin(null); }} onSelectNode={(preset, origin) => { handleAddNodeFromLibrary(preset, contextMenuPos, origin || contextMenuOriginPin); setContextMenuPos(null); setContextMenuOriginPin(null); }} onAddComment={handleAddComment} />
        )}
        <NodeLibraryDrawer isOpen={Boolean(modals.nodeLibrary)} onClose={() => setModal('nodeLibrary', false)} onAddNode={handleAddNodeFromLibrary} />
        <MyBlueprintDrawer isOpen={Boolean(modals.myBlueprint)} onClose={() => setModal('myBlueprint', false)} />
        <EditorModals nodes={nodes} edges={edges} blueprintName={blueprintName} compiledT3D={compiledT3D} savedSnapshots={savedSnapshots} profilerAudit={profilerAudit} isHeatmapActive={panelState.isHeatmapActive} isT3DModalOpen={Boolean(modals.t3d)} setIsT3DModalOpen={(v) => setModal('t3d', v)} isCppModalOpen={Boolean(modals.cpp)} setIsCppModalOpen={(v) => setModal('cpp', v)} isPythonModalOpen={Boolean(modals.python)} setIsPythonModalOpen={(v) => setModal('python', v)} isProfilerOpen={Boolean(modals.profiler)} setIsProfilerOpen={(v) => setModal('profiler', v)} isSnapshotOpen={Boolean(modals.snapshot)} setIsSnapshotOpen={(v) => setModal('snapshot', v)} isDiffOpen={Boolean(modals.diff)} setIsDiffOpen={(v) => setModal('diff', v)} isRemoteBridgeOpen={Boolean(modals.remoteBridge)} setIsRemoteBridgeOpen={(v) => setModal('remoteBridge', v)} isRefactorOpen={Boolean(modals.refactor)} setIsRefactorOpen={(v) => setModal('refactor', v)} isBYOKOpen={Boolean(modals.byok)} setIsBYOKOpen={(v) => setModal('byok', v)} onToggleHeatmap={handleToggleHeatmap} onRestoreSnapshot={(rNodes, rEdges) => { pushHistory('Restore Snapshot'); setNodes(rNodes); setEdges(rEdges); addLog({ type: 'info', message: `LogBlueprint: Graph state restored from snapshot (${rNodes.length} nodes).` }); }} onApplyRefactor={(optNodes, optEdges) => { pushHistory('Refactor & Clean Graph'); setNodes(optNodes); setEdges(optEdges); }} />
      </div>
    </div>
  );
};

export default BlueprintEditor;
