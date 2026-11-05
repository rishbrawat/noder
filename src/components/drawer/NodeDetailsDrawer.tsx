import React, { useState } from 'react';
import { Node, Edge } from 'reactflow';
import { NodeData, PinType, PinData } from '../../types/BlueprintTypes';
import { useBlueprintStore } from '../../store/blueprintStore';
import {
  LuSlidersHorizontal,
  LuChevronRight,
  LuChevronDown,
  LuCircleDot,
  LuTrash2,
  LuCopy,
  LuMessageSquare,
  LuMaximize2,
  LuInfo,
  LuShieldAlert,
  LuBrain
} from 'react-icons/lu';

interface NodeDetailsDrawerProps {
  selectedNodes: Node<NodeData>[];
  edges: Edge[];
  isOpen: boolean;
  onToggle: () => void;
  onWrapComment: () => void;
  onStraighten: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const getPinTypeBadgeColor = (pinType: PinType): string => {
  switch (pinType) {
    case 'exec': return 'bg-zinc-200 dark:bg-white/20 text-zinc-900 dark:text-white border-zinc-400 dark:border-white/40';
    case 'bool': return 'bg-red-100 dark:bg-red-500/20 text-red-700 dark:text-red-400 border-red-300 dark:border-red-500/40';
    case 'float':
    case 'int':
    case 'byte': return 'bg-green-100 dark:bg-green-500/20 text-green-700 dark:text-green-400 border-green-300 dark:border-green-500/40';
    case 'string':
    case 'name': return 'bg-zinc-200 dark:bg-zinc-500/20 text-zinc-800 dark:text-zinc-300 border-zinc-300 dark:border-zinc-500/40';
    case 'vector':
    case 'vector2d':
    case 'vector3':
    case 'vector4':
    case 'rotator':
    case 'transform': return 'bg-amber-100 dark:bg-gold-500/20 text-amber-800 dark:text-gold-400 border-amber-300 dark:border-gold-500/40';
    case 'object':
    case 'class': return 'bg-sky-100 dark:bg-sky-500/20 text-sky-800 dark:text-sky-400 border-sky-300 dark:border-sky-500/40';
    default: return 'bg-zinc-200 dark:bg-zinc-500/20 text-zinc-700 dark:text-zinc-400 border-zinc-300 dark:border-zinc-500/40';
  }
};

export const NodeDetailsDrawer: React.FC<NodeDetailsDrawerProps> = ({
  selectedNodes,
  edges,
  isOpen,
  onToggle,
  onWrapComment,
  onStraighten,
  onDuplicate,
  onDelete,
}) => {
  const updateNodeData = useBlueprintStore(state => state.updateNodeData);
  const blueprintName = useBlueprintStore(state => state.blueprintName);
  const blueprintDescription = useBlueprintStore(state => state.blueprintDescription);
  const setBlueprintName = useBlueprintStore(state => state.setBlueprintName);
  const setBlueprintDescription = useBlueprintStore(state => state.setBlueprintDescription);
  const architecturePlan = useBlueprintStore(state => state.architecturePlan);

  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    inputs: true,
    outputs: true,
    actions: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const selectedNode = selectedNodes.length === 1 ? selectedNodes[0] : null;

  const handleInputChange = (pinName: string, pinType: PinType, newValue: any) => {
    if (!selectedNode) return;
    const currentInputs = selectedNode.data.inputs || [];
    const updatedInputs = currentInputs.map(p => {
      if (p.name !== pinName) return p;
      let parsed = newValue;
      if (pinType === 'float' || pinType === 'int') {
        parsed = Number(newValue);
        if (isNaN(parsed)) parsed = pinType === 'int' ? 0 : 0.0;
      }
      return { ...p, value: parsed };
    });
    updateNodeData(selectedNode.id, { inputs: updatedInputs });
  };

  const handleToggleBreakpoint = () => {
    if (!selectedNode) return;
    updateNodeData(selectedNode.id, { hasBreakpoint: !selectedNode.data.hasBreakpoint });
  };

  return (
    <aside
      className={`fixed top-12 right-0 bottom-8 z-20 flex transition-all duration-200 select-none ${
        isOpen ? 'w-80' : 'w-0'
      }`}
      aria-label="Node Details Panel"
    >
      {/* Toggle Pill Button on left border */}
      <button
        onClick={onToggle}
        className="absolute -left-7 top-14 bg-white dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300 hover:text-gold-500 dark:hover:text-gold-400 border-l border-y border-zinc-300 dark:border-zinc-700 rounded-l-md px-1.5 py-3 shadow-xl flex flex-col items-center justify-center transition-colors cursor-pointer"
        title={isOpen ? "Collapse Details Panel" : "Expand Details Panel"}
      >
        <LuSlidersHorizontal className="w-3.5 h-3.5 mb-1 text-gold-500" />
        <span className="text-[9px] font-mono [writing-mode:vertical-lr] tracking-widest uppercase">
          Details
        </span>
      </button>

      {/* Main Drawer Body with full Dark & Light Theme styling */}
      <div className={`w-80 h-full bg-white/95 dark:bg-black/95 border-l border-zinc-200 dark:border-zinc-800 text-zinc-800 dark:text-zinc-200 flex flex-col overflow-hidden shadow-2xl backdrop-blur-md ${!isOpen && 'hidden'}`}>
        {/* Header */}
        <div className="h-10 px-3 bg-zinc-100 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between shrink-0">
          <div className="flex items-center space-x-2 truncate">
            <LuSlidersHorizontal className="w-4 h-4 text-gold-500 shrink-0" />
            <span className="font-semibold text-xs tracking-wider uppercase text-zinc-900 dark:text-zinc-100 truncate">
              {selectedNode ? 'Node Details' : selectedNodes.length > 1 ? 'Selection' : 'Graph Settings'}
            </span>
          </div>
          <button
            onClick={onToggle}
            className="text-zinc-400 hover:text-zinc-900 dark:hover:text-white p-1 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Close Details Panel"
          >
            <LuChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 text-xs font-sans">
          {/* SCENARIO 1: SINGLE NODE SELECTED */}
          {selectedNode && (
            <>
              {/* Node Header Banner */}
              <div 
                className="p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 flex flex-col gap-1 shadow-sm"
                style={{ backgroundColor: `${selectedNode.data.color || '#1e1e24'}22` }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-mono tracking-widest text-zinc-500 dark:text-zinc-400 uppercase font-semibold">
                    {selectedNode.data.nodeType || 'FUNCTION'}
                  </span>
                  <button
                    onClick={handleToggleBreakpoint}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
                      selectedNode.data.hasBreakpoint
                        ? 'bg-red-500/20 text-red-600 dark:text-red-300 border-red-500 shadow-sm animate-pulse'
                        : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700 hover:text-red-500 hover:border-red-500/60'
                    }`}
                    title="Toggle Unreal Breakpoint (F9)"
                  >
                    <LuCircleDot className="w-3 h-3 text-red-500" />
                    <span>F9</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={selectedNode.data.title || ''}
                  onChange={(e) => updateNodeData(selectedNode.id, { title: e.target.value })}
                  className="font-bold text-sm bg-transparent text-zinc-900 dark:text-white focus:outline-none border-b border-transparent focus:border-gold-500 transition-colors"
                  placeholder="Node Title..."
                />
                {selectedNode.data.subtitle && (
                  <span className="text-[10px] text-zinc-500 dark:text-zinc-400 font-mono">
                    Target: {selectedNode.data.subtitle}
                  </span>
                )}
              </div>

              {/* General Section */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
                <button
                  onClick={() => toggleSection('general')}
                  className="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 flex items-center justify-between text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  <span>General</span>
                  {expandedSections.general ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronRight className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.general && (
                  <div className="p-3 space-y-2.5">
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase block mb-1">Node ID</label>
                      <input
                        type="text"
                        readOnly
                        value={selectedNode.id}
                        className="w-full px-2 py-1 bg-white dark:bg-black/60 border border-zinc-300 dark:border-zinc-800 rounded font-mono text-[10px] text-zinc-600 dark:text-zinc-400 select-all"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase block mb-1">Documentation Note</label>
                      <textarea
                        rows={2}
                        value={selectedNode.data.description || ''}
                        onChange={(e) => updateNodeData(selectedNode.id, { description: e.target.value })}
                        placeholder="Add Blueprint documentation or purpose..."
                        className="w-full px-2 py-1 bg-white dark:bg-black/60 border border-zinc-300 dark:border-zinc-800 rounded text-xs text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-gold-500 resize-none"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Inputs & Literals Section */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
                <button
                  onClick={() => toggleSection('inputs')}
                  className="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 flex items-center justify-between text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  <span>Input Pins ({selectedNode.data.inputs?.length || 0})</span>
                  {expandedSections.inputs ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronRight className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.inputs && (
                  <div className="p-3 space-y-2">
                    {(selectedNode.data.inputs || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic">No input pins</p>
                    ) : (
                      (selectedNode.data.inputs || []).map((pin: PinData) => {
                        const isExec = pin.type === 'exec';
                        const isConnected = edges.some(e => e.target === selectedNode.id && e.targetHandle?.includes(pin.name.toLowerCase().replace(/\s+/g, '')));

                        return (
                          <div key={pin.name} className="flex flex-col gap-1 p-2 rounded bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800/60">
                            <div className="flex items-center justify-between">
                              <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">{pin.name}</span>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[9px] px-1 py-0.2 rounded font-mono border uppercase ${getPinTypeBadgeColor(pin.type)}`}>
                                  {pin.type}
                                </span>
                                {isConnected && (
                                  <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/40">
                                    wired
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Editable literal value when unconnected */}
                            {!isExec && !isConnected && (
                              <div className="mt-1 flex items-center gap-2">
                                <span className="text-[10px] text-zinc-500 font-mono">Value:</span>
                                {pin.type === 'bool' ? (
                                  <input
                                    type="checkbox"
                                    checked={Boolean(pin.value)}
                                    onChange={(e) => handleInputChange(pin.name, pin.type, e.target.checked)}
                                    className="accent-gold-500 w-3.5 h-3.5 rounded cursor-pointer"
                                  />
                                ) : (
                                  <input
                                    type={pin.type === 'float' || pin.type === 'int' ? 'number' : 'text'}
                                    value={pin.value !== undefined && pin.value !== null ? String(pin.value) : ''}
                                    placeholder={pin.type === 'float' ? '0.0' : pin.type === 'int' ? '0' : 'None'}
                                    onChange={(e) => handleInputChange(pin.name, pin.type, e.target.value)}
                                    className="flex-1 px-1.5 py-0.5 bg-zinc-50 dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-700 rounded text-xs font-mono text-zinc-900 dark:text-zinc-200 focus:outline-none focus:border-gold-500"
                                  />
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Outputs Section */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
                <button
                  onClick={() => toggleSection('outputs')}
                  className="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 flex items-center justify-between text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  <span>Output Pins ({selectedNode.data.outputs?.length || 0})</span>
                  {expandedSections.outputs ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronRight className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.outputs && (
                  <div className="p-3 space-y-2">
                    {(selectedNode.data.outputs || []).length === 0 ? (
                      <p className="text-[11px] text-zinc-400 italic">No output pins</p>
                    ) : (
                      (selectedNode.data.outputs || []).map((pin: PinData) => {
                        const isConnected = edges.some(e => e.source === selectedNode.id && e.sourceHandle?.includes(pin.name.toLowerCase().replace(/\s+/g, '')));

                        return (
                          <div key={pin.name} className="flex items-center justify-between p-2 rounded bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800/60">
                            <span className="font-medium text-zinc-800 dark:text-zinc-200 text-xs">{pin.name}</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`text-[9px] px-1 py-0.2 rounded font-mono border uppercase ${getPinTypeBadgeColor(pin.type)}`}>
                                {pin.type}
                              </span>
                              {isConnected && (
                                <span className="text-[9px] px-1 py-0.2 rounded font-mono bg-gold-500/20 text-gold-600 dark:text-gold-400 border border-gold-500/40">
                                  wired
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>

              {/* Quick Actions */}
              <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-zinc-50 dark:bg-zinc-900/40">
                <button
                  onClick={() => toggleSection('actions')}
                  className="w-full px-3 py-1.5 bg-zinc-100 dark:bg-zinc-900/80 hover:bg-zinc-200 dark:hover:bg-zinc-800/80 flex items-center justify-between text-zinc-700 dark:text-zinc-300 text-[11px] font-semibold tracking-wider uppercase transition-colors cursor-pointer"
                >
                  <span>Quick Actions</span>
                  {expandedSections.actions ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronRight className="w-3.5 h-3.5" />}
                </button>
                {expandedSections.actions && (
                  <div className="p-3 grid grid-cols-2 gap-2">
                    <button
                      onClick={onStraighten}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
                      title="Straighten connected wires (Q)"
                    >
                      <LuMaximize2 className="w-3.5 h-3.5 text-gold-500" />
                      <span>Straighten (Q)</span>
                    </button>
                    <button
                      onClick={onWrapComment}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
                      title="Wrap in Comment Box (C)"
                    >
                      <LuMessageSquare className="w-3.5 h-3.5 text-gold-500" />
                      <span>Comment (C)</span>
                    </button>
                    <button
                      onClick={onDuplicate}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 text-xs transition-colors cursor-pointer"
                      title="Duplicate Node (Ctrl+D)"
                    >
                      <LuCopy className="w-3.5 h-3.5 text-zinc-500" />
                      <span>Duplicate</span>
                    </button>
                    <button
                      onClick={onDelete}
                      className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60 text-xs transition-colors cursor-pointer"
                      title="Delete Node (Del)"
                    >
                      <LuTrash2 className="w-3.5 h-3.5 text-red-500" />
                      <span>Delete</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {/* SCENARIO 2: MULTIPLE NODES SELECTED */}
          {selectedNodes.length > 1 && (
            <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-3">
              <div className="flex items-center gap-2 text-gold-600 dark:text-gold-400 font-semibold text-sm">
                <LuSlidersHorizontal className="w-4 h-4 text-gold-500" />
                <span>{selectedNodes.length} Nodes Selected</span>
              </div>
              <p className="text-zinc-500 dark:text-zinc-400 text-xs">
                Use the floating HUD or the buttons below for batch alignment, commenting, and positioning.
              </p>
              <div className="space-y-2 pt-2">
                <button
                  onClick={onWrapComment}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-gold-500/10 hover:bg-gold-500/20 text-gold-700 dark:text-gold-300 border border-gold-500/40 font-medium transition-colors cursor-pointer"
                >
                  <LuMessageSquare className="w-4 h-4 text-gold-500" />
                  <span>Wrap Selection in Comment Box (C)</span>
                </button>
                <button
                  onClick={onStraighten}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 border border-zinc-300 dark:border-zinc-700 transition-colors cursor-pointer"
                >
                  <LuMaximize2 className="w-4 h-4 text-gold-500" />
                  <span>Straighten Connected Wires (Q)</span>
                </button>
                <button
                  onClick={onDelete}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/60 text-red-600 dark:text-red-300 border border-red-200 dark:border-red-800/60 transition-colors cursor-pointer"
                >
                  <LuTrash2 className="w-4 h-4 text-red-500" />
                  <span>Delete Selected Nodes (Del)</span>
                </button>
              </div>
            </div>
          )}

          {/* SCENARIO 3: NO NODES SELECTED (GRAPH OVERVIEW) */}
          {selectedNodes.length === 0 && (
            <div className="space-y-4">
              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center gap-2 text-zinc-800 dark:text-zinc-300 font-semibold text-xs uppercase tracking-wider">
                  <LuInfo className="w-3.5 h-3.5 text-gold-500" />
                  <span>Blueprint Asset</span>
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase block mb-1">Asset Name</label>
                  <input
                    type="text"
                    value={blueprintName}
                    onChange={(e) => setBlueprintName(e.target.value)}
                    className="w-full px-2 py-1 bg-white dark:bg-black/60 border border-zinc-300 dark:border-zinc-800 rounded font-medium text-xs text-zinc-900 dark:text-white focus:outline-none focus:border-gold-500"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase block mb-1">Description</label>
                  <textarea
                    rows={3}
                    value={blueprintDescription}
                    onChange={(e) => setBlueprintDescription(e.target.value)}
                    placeholder="Describe gameplay mechanics..."
                    className="w-full px-2 py-1 bg-white dark:bg-black/60 border border-zinc-300 dark:border-zinc-800 rounded text-xs text-zinc-800 dark:text-zinc-300 focus:outline-none focus:border-gold-500 resize-none"
                  />
                </div>
              </div>

              {/* AI Architecture Reasoning Section */}
              {architecturePlan && (
                <div className="p-3 rounded-lg bg-gold-500/10 dark:bg-gold-500/10 border border-gold-500/30 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-gold-700 dark:text-gold-400 font-semibold text-xs uppercase tracking-wider">
                      <LuBrain className="w-3.5 h-3.5 text-gold-500" />
                      <span>AI Architecture Plan</span>
                    </div>
                    <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-600 dark:text-gold-300">
                      CoT Verified
                    </span>
                  </div>
                  <div className="p-2 rounded bg-white/80 dark:bg-black/60 border border-gold-500/20 text-[11px] font-mono leading-relaxed text-zinc-800 dark:text-zinc-200 select-text max-h-48 overflow-y-auto whitespace-pre-wrap">
                    {architecturePlan}
                  </div>
                </div>
              )}

              <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <span className="text-[10px] font-mono text-zinc-500 dark:text-zinc-400 uppercase tracking-wider block font-semibold">Graph Statistics</span>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="p-2 rounded bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xl font-bold font-mono text-gold-600 dark:text-gold-400">{useBlueprintStore.getState().nodes.length}</span>
                    <span className="block text-[10px] text-zinc-500 uppercase mt-0.5">Nodes</span>
                  </div>
                  <div className="p-2 rounded bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800">
                    <span className="text-xl font-bold font-mono text-green-600 dark:text-green-400">{edges.length}</span>
                    <span className="block text-[10px] text-zinc-500 uppercase mt-0.5">Wires</span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-white dark:bg-black/40 border border-zinc-200 dark:border-zinc-800/80 text-[11px] text-zinc-600 dark:text-zinc-400 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-800 dark:text-zinc-300 font-semibold mb-1">
                  <LuShieldAlert className="w-3.5 h-3.5 text-gold-500" />
                  <span>Editor Tips</span>
                </div>
                <p>• Select any node to inspect and edit its pins.</p>
                <p>• Hold <kbd className="px-1 py-0.2 bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 rounded font-mono text-[9px]">Alt</kbd> + Click on a wire or pin to sever it.</p>
                <p>• Drag an unlinked wire into empty canvas to open the context spawn menu.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};
