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
import { NodeLibraryDrawer, getNodePresetsForGraph } from './NodeLibraryDrawer';
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

// Tri-Engine Expansion Modules
import { ShaderPreviewViewport } from '../features/shaders/components/ShaderPreviewViewport';
import { ShaderPresetsToolbar } from '../features/shaders/components/ShaderPresetsToolbar';
import { evaluateMaterialGraph } from '../features/shaders/utils/webglShaderGenerator';
import { compileMaterialToT3D } from '../features/shaders/utils/ueMaterialT3DCompiler';
import { ShaderPreset } from '../features/shaders/types/materialTypes';

import { NiagaraPreviewViewport } from '../features/niagara/components/NiagaraPreviewViewport';
import { EmitterStageStack } from '../features/niagara/components/EmitterStageStack';
import { DEFAULT_NIAGARA_CONFIG } from '../features/niagara/data/niagaraModulesCatalog';
import { compileNiagaraToT3D } from '../features/niagara/utils/ueNiagaraT3DCompiler';
import { evaluateNiagaraGraph } from '../features/niagara/utils/niagaraGraphEvaluator';
import { NiagaraEmitterConfig } from '../features/niagara/types/niagaraTypes';

import { GameplayTagMatrix } from '../features/gas/components/GameplayTagMatrix';
import { GameplayEffectDrawer } from '../features/gas/components/GameplayEffectDrawer';
import { AttributeSetInspector } from '../features/gas/components/AttributeSetInspector';
import { PRESET_ABILITY_DODGE, PRESET_GAMEPLAY_EFFECTS } from '../features/gas/data/gasCatalog';
import { compileGameplayAbilityToT3D } from '../features/gas/utils/gasT3DCompiler';
import { generateGameplayAbilityCpp } from '../features/gas/utils/gasCppGenerator';
import { GameplayAbilityDefinition } from '../features/gas/types/gasTypes';

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

  // Tri-Engine Expansion Local States
  const [niagaraConfig, setNiagaraConfig] = useState<NiagaraEmitterConfig>(DEFAULT_NIAGARA_CONFIG);
  const [gasAbility, setGasAbility] = useState<GameplayAbilityDefinition>(PRESET_ABILITY_DODGE);
  const [isShaderCopied, setIsShaderCopied] = useState<boolean>(false);
  const [isNiagaraCopied, setIsNiagaraCopied] = useState<boolean>(false);
  const [isGasCopied, setIsGasCopied] = useState<boolean>(false);
  const [activeGasTab, setActiveGasTab] = useState<'tags' | 'effects' | 'attributes'>('tags');

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

  const materialProperties = useMemo(() => {
    return evaluateMaterialGraph(nodes, edges);
  }, [nodes, edges]);

  const detailsOffsetRight = useMemo(() => {
    if (activeGraphType === 'NiagaraVFX' || activeGraphType === 'ShadersUE') {
      return 'right-96';
    }
    if (activeGraphType === 'GASStudio') {
      return 'right-[420px]';
    }
    return 'right-0';
  }, [activeGraphType]);

  const effectiveNiagaraConfig = useMemo(() => {
    if (activeGraphType === 'NiagaraVFX') {
      return evaluateNiagaraGraph(nodes, edges, niagaraConfig);
    }
    return niagaraConfig;
  }, [activeGraphType, nodes, edges, niagaraConfig]);

  const handleNiagaraConfigChange = useCallback((patch: Partial<NiagaraEmitterConfig>) => {
    setNiagaraConfig(prev => ({ ...prev, ...patch }));

    let hasChanges = false;
    const updatedNodes = nodes.map((n) => {
      const title = (n.data?.title || '').trim();
      const id = n.id;
      let nodeModified = false;
      let newSubtitle = n.data?.subtitle;

      const updatedInputs = (n.data?.inputs || []).map((pin) => {
        const pinName = pin.name.toLowerCase().replace(/[\s_-]+/g, '');

        if (patch.spawnRate !== undefined && (pinName === 'spawnrate' || title === 'Spawn Rate' || id === 'niagara-spawn-1')) {
          if (pinName === 'spawnrate') {
            nodeModified = true;
            newSubtitle = `Spawn Rate: ${patch.spawnRate}/s`;
            return { ...pin, value: patch.spawnRate };
          }
        }

        if (patch.burstInstantaneousCount !== undefined && pinName === 'spawncount') {
          nodeModified = true;
          return { ...pin, value: patch.burstInstantaneousCount };
        }

        if (patch.gravityForceZ !== undefined && pinName === 'gravity') {
          nodeModified = true;
          return { ...pin, value: patch.gravityForceZ };
        }

        if (patch.curlNoiseStrength !== undefined && (pinName === 'curlnoise' || pinName === 'noisestrength')) {
          nodeModified = true;
          return { ...pin, value: patch.curlNoiseStrength };
        }

        if (patch.dragCoefficient !== undefined && (pinName === 'drag' || pinName === 'dragcoefficient')) {
          nodeModified = true;
          return { ...pin, value: patch.dragCoefficient };
        }

        if (patch.pointAttractorStrength !== undefined && pinName === 'attractorstrength') {
          nodeModified = true;
          return { ...pin, value: patch.pointAttractorStrength };
        }

        if (patch.initialSize !== undefined && (pinName === 'initialsize' || pinName === 'spritesize')) {
          nodeModified = true;
          return { ...pin, value: patch.initialSize };
        }

        if (patch.endSize !== undefined && pinName === 'endsize') {
          nodeModified = true;
          return { ...pin, value: patch.endSize };
        }

        if (patch.bounciness !== undefined && pinName === 'restitution') {
          nodeModified = true;
          return { ...pin, value: patch.bounciness };
        }

        if (patch.spriteRendererFacing !== undefined && pinName === 'facingmode') {
          nodeModified = true;
          return { ...pin, value: patch.spriteRendererFacing };
        }

        if (patch.blendMode !== undefined && pinName === 'blendmode') {
          nodeModified = true;
          return { ...pin, value: patch.blendMode };
        }

        if (patch.initialVelocityConeAngle !== undefined && pinName === 'coneangle') {
          nodeModified = true;
          return { ...pin, value: patch.initialVelocityConeAngle };
        }

        if (patch.initialVelocityMagnitude !== undefined && pinName === 'velocitystrength') {
          nodeModified = true;
          return { ...pin, value: patch.initialVelocityMagnitude };
        }

        if (patch.lifetimeMax !== undefined && pinName === 'lifetimemax') {
          nodeModified = true;
          return { ...pin, value: patch.lifetimeMax };
        }

        if (patch.loopDuration !== undefined && pinName === 'loopduration') {
          nodeModified = true;
          return { ...pin, value: patch.loopDuration };
        }

        if (patch.determinism !== undefined && pinName === 'determinism') {
          nodeModified = true;
          return { ...pin, value: patch.determinism };
        }

        return pin;
      });

      if (patch.simTarget !== undefined && title === 'Emitter Properties') {
        nodeModified = true;
        newSubtitle = patch.simTarget;
      }

      if (nodeModified) {
        hasChanges = true;
        return {
          ...n,
          data: {
            ...n.data,
            subtitle: newSubtitle,
            inputs: updatedInputs,
          },
        };
      }
      return n;
    });

    if (hasChanges) {
      setNodes(updatedNodes);
    }
  }, [nodes, setNodes]);

  const handleSelectShaderPreset = useCallback((preset: ShaderPreset) => {
    pushHistory(`Apply Preset: ${preset.name}`);
    const rootNode = nodes.find(n => n.data.title === 'Material Root' || n.id.includes('root'));
    if (rootNode) {
      const updatedInputs = (rootNode.data.inputs || []).map(inp => {
        if (inp.name === 'BaseColor' && preset.properties.baseColor) return { ...inp, defaultValue: preset.properties.baseColor };
        if (inp.name === 'Metallic' && preset.properties.metallic !== undefined) return { ...inp, defaultValue: preset.properties.metallic };
        if (inp.name === 'Roughness' && preset.properties.roughness !== undefined) return { ...inp, defaultValue: preset.properties.roughness };
        if (inp.name === 'Specular' && preset.properties.specular !== undefined) return { ...inp, defaultValue: preset.properties.specular };
        if (inp.name === 'EmissiveColor' && preset.properties.emissiveColor) return { ...inp, defaultValue: preset.properties.emissiveColor };
        if (inp.name === 'Opacity' && preset.properties.opacity !== undefined) return { ...inp, defaultValue: preset.properties.opacity };
        return inp;
      });
      setNodes(nodes.map(n => n.id === rootNode.id ? { ...n, data: { ...n.data, inputs: updatedInputs } } : n));
    }
    toast.success(`Applied shader preset: ${preset.name}`);
  }, [nodes, setNodes, pushHistory]);

  const handleCopyMaterialUE5 = useCallback(() => {
    const result = compileMaterialToT3D(nodes, edges);
    navigator.clipboard.writeText(result.t3dText);
    setIsShaderCopied(true);
    setTimeout(() => setIsShaderCopied(false), 2000);
    addLog({ type: 'info', message: `LogMaterial: Copied ${nodes.length} Material Expressions to UE5 clipboard buffer.` });
    toast.success('Copied UE5 Material Graph to clipboard!');
  }, [nodes, edges, addLog]);

  const handleCopyNiagaraUE5 = useCallback((asSystem = false) => {
    const result = compileNiagaraToT3D(effectiveNiagaraConfig, { asSystem });
    navigator.clipboard.writeText(result.t3dText);
    setIsNiagaraCopied(true);
    setTimeout(() => setIsNiagaraCopied(false), 2000);
    const targetLabel = asSystem
      ? `Niagara System "${result.systemName || result.emitterName}"`
      : `Niagara Emitter "${result.emitterName}"`;
    addLog({ type: 'info', message: `LogNiagara: Copied ${targetLabel} to UE5 clipboard.` });
    toast.success(`Copied UE5 ${asSystem ? 'Niagara System' : 'Niagara Emitter'} to clipboard!`);
  }, [effectiveNiagaraConfig, addLog]);

  const handleCopyGasT3D = useCallback(() => {
    const result = compileGameplayAbilityToT3D(gasAbility);
    navigator.clipboard.writeText(result.t3dText);
    setIsGasCopied(true);
    setTimeout(() => setIsGasCopied(false), 2000);
    addLog({ type: 'info', message: `LogGAS: Copied GameplayAbility "${gasAbility.abilityName}" Blueprint T3D to clipboard.` });
    toast.success('Copied UE5 Gameplay Ability to clipboard!');
  }, [gasAbility, addLog]);

  const handleCopyGasAbilityCpp = useCallback(() => {
    const result = generateGameplayAbilityCpp(gasAbility);
    navigator.clipboard.writeText(`${result.headerFile}\n\n// ================= Source (.cpp) =================\n\n${result.sourceFile}`);
    toast.success('Copied C++ GameplayAbility (.h + .cpp) to clipboard!');
  }, [gasAbility]);

  const handleCopyUE5 = useCallback(() => {
    if (activeGraphType === 'ShadersUE') {
      handleCopyMaterialUE5();
    } else if (activeGraphType === 'NiagaraVFX') {
      handleCopyNiagaraUE5();
    } else if (activeGraphType === 'GASStudio') {
      handleCopyGasT3D();
    } else {
      copyGraphToUE5Clipboard(nodes, edges, addLog);
    }
  }, [activeGraphType, handleCopyMaterialUE5, handleCopyNiagaraUE5, handleCopyGasT3D, nodes, edges, addLog]);

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
    const pool = getNodePresetsForGraph(activeGraphType);
    const preset = pool.find(p => p.id === presetId) || STANDARD_UE_NODES.find(p => p.id === presetId);
    if (!preset) return;
    const x = clientX !== undefined ? clientX - 100 : lastMousePosRef.current.x, y = clientY !== undefined ? clientY - 40 : lastMousePosRef.current.y;
    setNodes([...nodes, { id: uuidv4(), type: 'customNode', position: { x: Math.max(50, x), y: Math.max(50, y) }, data: { title: preset.title, subtitle: preset.subtitle, nodeType: preset.nodeType, color: preset.color, inputs: preset.inputs.map(i => ({ ...i })), outputs: preset.outputs.map(o => ({ ...o })) } }]);
    toast.success(`Spawned "${preset.title}"`);
  }, [nodes, setNodes, activeGraphType]);

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
          onExportJSON={handleExport} onCopyUE5={handleCopyUE5} snapToGrid={panelState.snapToGrid}
          onToggleSnapToGrid={() => { const next = !panelState.snapToGrid; setPanelState(s => ({ ...s, snapToGrid: next })); toast(next ? 'Snap to Grid (16px) Enabled' : 'Snap to Grid Disabled', { icon: '📐' }); }}
          canUndo={canUndo} canRedo={canRedo} onUndo={() => { undo(); blueprintAudio.playStepPulse(); toast('Undo (Ctrl+Z)', { icon: '↩️', duration: 1200 }); }}
          onRedo={() => { redo(); blueprintAudio.playStepPulse(); toast('Redo (Ctrl+Y)', { icon: '↪️', duration: 1200 }); }}
          onFormatGraph={() => { if (nodes.length > 1) { pushHistory('Format Graph Layout'); setNodes(formatGraphLayout(nodes, edges)); blueprintAudio.playStepPulse(); toast.success('Formatted execution flow (Shift+F)'); } }}
          onAutoArrange={() => { const perRow = Math.max(1, Math.ceil(Math.sqrt(nodes.length))); setNodes(nodes.map((n, i) => ({ ...n, position: { x: 100 + (i % perRow) * 370, y: 150 + Math.floor(i / perRow) * 250 } }))); pushHistory('Auto-arrange'); toast.success('Nodes organized in grid layout'); }}
          onSaveTemplate={handleSaveTemplate} showMiniMap={panelState.showMiniMap} onToggleMiniMap={() => setPanelState(s => ({ ...s, showMiniMap: !s.showMiniMap }))}
          onClearCanvas={() => { if (window.confirm('Clear all nodes and wires from canvas?')) { clearBlueprint(); toast.success('Canvas cleared'); } }} onOpenBYOK={() => setModal('byok', true)}
          theme={theme} onToggleTheme={toggleTheme} isDetailsOpen={panelState.isDetailsOpen} onToggleDetails={() => setPanelState(s => ({ ...s, isDetailsOpen: !s.isDetailsOpen }))}
        />
        {activeGraphType === 'ShadersUE' && (
          <ShaderPresetsToolbar
            onSelectPreset={handleSelectShaderPreset}
            onCopyUE5={handleCopyMaterialUE5}
            isCopied={isShaderCopied}
          />
        )}
        <div className="flex-1 flex relative overflow-hidden">
          {activeGraphType === 'NiagaraVFX' && (
            <div className="h-full flex flex-col shrink-0 z-10 border-r border-zinc-800 bg-zinc-900 overflow-hidden">
              <EmitterStageStack
                config={effectiveNiagaraConfig}
                onChangeConfig={handleNiagaraConfigChange}
                onCopyUE5={() => handleCopyNiagaraUE5(false)}
                onCopySystem={() => handleCopyNiagaraUE5(true)}
                isCopied={isNiagaraCopied}
              />
            </div>
          )}
          <div className="flex-1 h-full relative overflow-hidden">
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
          </div>
          {activeGraphType === 'ShadersUE' && (
            <ShaderPreviewViewport
              materialProperties={materialProperties}
              nodes={nodes}
              edges={edges}
              className="h-full"
            />
          )}
          {activeGraphType === 'NiagaraVFX' && (
            <NiagaraPreviewViewport
              config={effectiveNiagaraConfig}
              className="h-full"
            />
          )}
          {activeGraphType === 'GASStudio' && (
            <div className="w-[420px] h-full flex flex-col border-l border-zinc-800 bg-zinc-950 z-10 shrink-0 overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0 text-xs">
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => setActiveGasTab('tags')}
                    className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      activeGasTab === 'tags'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    Tag Matrix
                  </button>
                  <button
                    onClick={() => setActiveGasTab('effects')}
                    className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      activeGasTab === 'effects'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    Effects
                  </button>
                  <button
                    onClick={() => setActiveGasTab('attributes')}
                    className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                      activeGasTab === 'attributes'
                        ? 'bg-purple-600/30 text-purple-300 border border-purple-500/50'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
                    }`}
                  >
                    Attributes
                  </button>
                </div>
                <div className="flex items-center space-x-1.5">
                  <button
                    onClick={handleCopyGasT3D}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-purple-600/20 hover:bg-purple-600/30 text-purple-300 border border-purple-500/40 text-[11px] font-mono transition-colors cursor-pointer"
                    title="Copy UE5 GameplayAbility T3D Graph"
                  >
                    {isGasCopied ? 'Copied!' : 'Copy T3D'}
                  </button>
                  <button
                    onClick={handleCopyGasAbilityCpp}
                    className="flex items-center space-x-1 px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 text-[11px] font-mono transition-colors cursor-pointer"
                    title="Copy GameplayAbility C++ (.h + .cpp)"
                  >
                    C++
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto">
                {activeGasTab === 'tags' && (
                  <GameplayTagMatrix
                    policy={gasAbility.tagPolicy}
                    onChangePolicy={(newPolicy) => setGasAbility(a => ({ ...a, tagPolicy: newPolicy }))}
                  />
                )}
                {activeGasTab === 'effects' && (
                  <GameplayEffectDrawer
                    effect={gasAbility.costEffect || PRESET_GAMEPLAY_EFFECTS[0]}
                    onChangeEffect={(newEffect) => setGasAbility(a => ({ ...a, costEffect: newEffect }))}
                    onSelectPreset={(preset) => setGasAbility(a => ({ ...a, costEffect: preset }))}
                  />
                )}
                {activeGasTab === 'attributes' && (
                  <AttributeSetInspector className="h-full border-0 shadow-none rounded-none" />
                )}
              </div>
            </div>
          )}
        </div>
        <NodeDetailsDrawer
          selectedNodes={selectedNodesList}
          edges={edges}
          isOpen={panelState.isDetailsOpen}
          offsetRight={detailsOffsetRight}
          onToggle={() => setPanelState(s => ({ ...s, isDetailsOpen: !s.isDetailsOpen }))}
          onWrapComment={handleAddComment}
          onStraighten={handleStraightenConnections}
          onDuplicate={handleDuplicateSelected}
          onDelete={handleDeleteSelected}
        />
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
