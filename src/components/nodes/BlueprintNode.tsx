import React, { memo, useState, useCallback, useMemo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, PinType, PinData, PinContainerType, normalizeContainerType } from '../../types/BlueprintTypes';
import { useBlueprintStore } from '../../store/blueprintStore';
import { toast } from 'react-hot-toast';

// Helper function to generate handle IDs
const getPinId = (pinType: PinType, pinName: string): string => {
  const processedName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `${pinType}-${processedName}`;
};

// Authentic Unreal Engine 5 Pin Color Palette
const getPinTextColorClass = (pinType: PinType): string => {
  switch (pinType) {
    case 'exec': return 'text-zinc-900 dark:text-white';
    case 'bool': return 'text-red-500 dark:text-red-400';
    case 'float':
    case 'int':
    case 'byte': return 'text-green-600 dark:text-green-400';
    case 'string':
    case 'name': return 'text-zinc-700 dark:text-zinc-300';
    case 'vector':
    case 'vector2d':
    case 'vector3':
    case 'vector4':
    case 'rotator':
    case 'transform': return 'text-gold-600 dark:text-gold-400';
    case 'object':
    case 'class': return 'text-sky-600 dark:text-sky-400';
    default: return 'text-zinc-500 dark:text-zinc-400';
  }
};

/**
 * Authentic Unreal Engine 5 Pin SVG Icon:
 * - Exec: True Chevron Arrow (Hollow when unplugged, Solid Filled when connected)
 * - Array: 3x3 / 2x2 Grid Icon
 * - Set: Segmented / Dashed Ring Icon
 * - Map: Key-Value Dual Box Icon
 * - Data: Rounded Pill (Hollow ring when unplugged, Solid Filled core when connected)
 */
const PinIcon: React.FC<{
  pinType: PinType;
  pinName: string;
  isConnected: boolean;
  containerType?: PinContainerType;
}> = ({ pinType, pinName, isConnected, containerType }) => {
  const normContainer = normalizeContainerType(containerType, pinType);
  const isExec = pinType === 'exec';
  const isArray = normContainer === 'array' || /array|list/i.test(pinName);
  const isSet = normContainer === 'set';
  const isMap = normContainer === 'map';
  const colorClass = getPinTextColorClass(pinType);

  if (isExec) {
    return (
      <svg
        className={`w-3.5 h-3.5 ${colorClass} transition-transform group-hover:scale-125 pointer-events-none drop-shadow-sm`}
        viewBox="0 0 10 12"
      >
        <path
          d="M 1.5 1.5 L 8 6 L 1.5 10.5 Z"
          fill={isConnected ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  // Unreal Engine Array Pin Icon (3x3 grid)
  if (isArray) {
    return (
      <svg
        className={`w-3 h-3 ${colorClass} transition-transform group-hover:scale-125 pointer-events-none drop-shadow-sm`}
        viewBox="0 0 10 10"
      >
        <rect x="1" y="1" width="3" height="3" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
        <rect x="5.5" y="1" width="3" height="3" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
        <rect x="1" y="5.5" width="3" height="3" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
        <rect x="5.5" y="5.5" width="3" height="3" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  // Unreal Engine Set Pin Icon (Segmented / dashed circle)
  if (isSet) {
    return (
      <svg
        className={`w-3 h-3 ${colorClass} transition-transform group-hover:scale-125 pointer-events-none drop-shadow-sm`}
        viewBox="0 0 10 10"
      >
        <circle
          cx="5"
          cy="5"
          r="3.5"
          fill={isConnected ? 'currentColor' : 'none'}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeDasharray="2.5 1.5"
        />
      </svg>
    );
  }

  // Unreal Engine Map Pin Icon (Key-Value dual rectangles)
  if (isMap) {
    return (
      <svg
        className={`w-3.5 h-3 ${colorClass} transition-transform group-hover:scale-125 pointer-events-none drop-shadow-sm`}
        viewBox="0 0 12 10"
      >
        <rect x="1" y="1.5" width="4" height="7" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
        <rect x="6.5" y="1.5" width="4" height="7" rx="0.5" fill={isConnected ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.2" />
      </svg>
    );
  }

  return (
    <svg
      className={`w-2.5 h-2.5 ${colorClass} transition-transform group-hover:scale-125 pointer-events-none drop-shadow-sm`}
      viewBox="0 0 10 10"
    >
      <circle
        cx="5"
        cy="5"
        r="3.6"
        fill={isConnected ? 'currentColor' : 'none'}
        stroke="currentColor"
        strokeWidth="1.8"
      />
    </svg>
  );
};

const BlueprintNode: React.FC<NodeProps<NodeData>> = memo(({ id, data, selected }) => {
  const updateNodeData = useBlueprintStore(state => state.updateNodeData);
  const removeEdge = useBlueprintStore(state => state.removeEdge);

  const [editingPinName, setEditingPinName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  // 120fps Optimization: Isolate edge subscriptions using a node-specific handle signature.
  // Changes to unrelated wires elsewhere on the canvas will NOT trigger re-renders of this node.
  const connectedHandlesSig = useBlueprintStore(
    useCallback((state) => {
      const inHandles: string[] = [];
      const outHandles: string[] = [];
      for (const e of state.edges) {
        if (e.target === id && e.targetHandle) inHandles.push(e.targetHandle);
        if (e.source === id && e.sourceHandle) outHandles.push(e.sourceHandle);
      }
      return `${inHandles.sort().join(',')}|${outHandles.sort().join(',')}`;
    }, [id])
  );

  // Fast connection lookup sets for this specific node
  const { connectedInputHandles, connectedOutputHandles } = useMemo(() => {
    const [inPart, outPart] = (connectedHandlesSig || '|').split('|');
    return {
      connectedInputHandles: new Set(inPart ? inPart.split(',') : []),
      connectedOutputHandles: new Set(outPart ? outPart.split(',') : []),
    };
  }, [connectedHandlesSig]);

  // Alt + Click on Pin to sever connections (Unreal Engine muscle memory)
  // Imperatively queries current edges from store state without whole-canvas edge subscriptions
  const handlePinClick = useCallback((handleId: string, isTarget: boolean, e: React.MouseEvent) => {
    if (e.altKey) {
      e.stopPropagation();
      e.preventDefault();
      const currentEdges = useBlueprintStore.getState().edges;
      const connectedEdges = currentEdges.filter(edge =>
        isTarget
          ? (edge.target === id && edge.targetHandle === handleId)
          : (edge.source === id && edge.sourceHandle === handleId)
      );
      connectedEdges.forEach(edge => removeEdge(edge.id));
      if (connectedEdges.length > 0) {
        toast(`Disconnected pin (${connectedEdges.length} wire${connectedEdges.length > 1 ? 's' : ''})`, { icon: '✂️' });
      }
    }
  }, [id, removeEdge]);

  const handleStartEdit = useCallback((pin: PinData, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pin.type === 'bool') {
      // Direct boolean toggle
      const newBool = pin.value === true ? false : true;
      const updatedInputs = (data.inputs || []).map(p =>
        p.name === pin.name ? { ...p, value: newBool } : p
      );
      updateNodeData(id, { inputs: updatedInputs });
      return;
    }

    setEditingPinName(pin.name);
    setEditValue(pin.value !== undefined && pin.value !== null ? String(pin.value) : '');
  }, [data.inputs, id, updateNodeData]);

  const handleCommitEdit = useCallback((pinName: string, pinType: PinType) => {
    let finalValue: any = editValue;
    if (pinType === 'float' || pinType === 'int') {
      const parsed = Number(editValue);
      finalValue = isNaN(parsed) ? (pinType === 'int' ? 0 : 0.0) : parsed;
    }

    const updatedInputs = (data.inputs || []).map(p =>
      p.name === pinName ? { ...p, value: finalValue } : p
    );
    updateNodeData(id, { inputs: updatedInputs });
    setEditingPinName(null);
  }, [editValue, data.inputs, id, updateNodeData]);

  if (!data) {
    return (
      <div className="bg-red-950/90 text-red-200 rounded border border-red-700 p-2 text-xs">
        <strong>Error: Missing node data</strong>
      </div>
    );
  }

  // Authentic Unreal Engine Reroute Knot (K2Node_Knot)
  if (data.nodeType === 'reroute' || data.title?.toLowerCase() === 'reroute') {
    const pinType = data.inputs?.[0]?.type || (data.outputs?.[0]?.type || 'exec');
    const inputPinName = data.inputs?.[0]?.name || 'In';
    const outputPinName = data.outputs?.[0]?.name || 'Out';
    const inputHandleId = getPinId(pinType, inputPinName);
    const outputHandleId = getPinId(pinType, outputPinName);
    const hasConnection = connectedInputHandles.has(inputHandleId) || connectedOutputHandles.has(outputHandleId);
    const colorClass = getPinTextColorClass(pinType);

    return (
      <div
        className={`relative w-4 h-4 rounded-full flex items-center justify-center transition-transform cursor-move group ${
          selected
            ? 'ring-2 ring-gold-400 bg-gold-500/30 shadow-lg shadow-gold-500/40 scale-125'
            : 'bg-white dark:bg-zinc-900 border-zinc-400 dark:border-zinc-700 hover:scale-110 hover:border-gold-400/80 shadow-md'
        } ${colorClass}`}
        title="Unreal Engine Reroute Knot (K2Node_Knot) - Drag to route wires | Alt+Click to disconnect | Del to remove | Q to straighten"
      >
        <Handle
          type="target"
          position={Position.Left}
          id={inputHandleId}
          onClick={(e) => handlePinClick(inputHandleId, true, e)}
          className="!w-3 !h-3 !-left-1.5 !rounded-full !opacity-0 group-hover:!opacity-40 transition-opacity !border cursor-crosshair"
        />
        {/* Core Dot Indicator */}
        <div className={`w-2 h-2 rounded-full ${hasConnection ? 'bg-current shadow-sm' : 'border border-current bg-transparent'}`} />
        <Handle
          type="source"
          position={Position.Right}
          id={outputHandleId}
          onClick={(e) => handlePinClick(outputHandleId, false, e)}
          className="!w-3 !h-3 !-right-1.5 !rounded-full !opacity-0 group-hover:!opacity-40 transition-opacity !border cursor-crosshair"
        />
      </div>
    );
  }

  const nodeColor = data.color || '#18181B';
  const perfSeverity = (data as any)?.performanceSeverity as string | undefined;
  const heatmapRing = perfSeverity === 'critical'
    ? 'ring-2 ring-red-500 shadow-xl shadow-red-500/20'
    : perfSeverity === 'moderate'
    ? 'ring-2 ring-gold-500 shadow-xl shadow-gold-500/20'
    : perfSeverity === 'optimal'
    ? 'ring-1 ring-green-500/60'
    : '';

  const borderClass = selected 
    ? 'border-gold-500 ring-2 ring-gold-500/40 shadow-xl shadow-gold-500/10' 
    : heatmapRing 
    ? `${heatmapRing} border-zinc-300 dark:border-zinc-800`
    : 'border-zinc-300 dark:border-zinc-800 hover:border-zinc-400 dark:hover:border-zinc-700';

  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  return (
    <div className={`blueprint-node bg-white dark:bg-noder-panel text-zinc-900 dark:text-zinc-100 rounded-lg border ${borderClass} overflow-hidden min-w-[200px] max-w-[260px] select-none shadow-xl transition-all duration-150`}>
      {/* Node Header */}
      <div
        className="node-header px-3 py-2 font-medium text-xs flex items-center justify-between text-white relative shadow-sm"
        style={{ backgroundColor: nodeColor }}
      >
        <div className="flex items-center space-x-1.5 truncate mr-2">
          {data.hasBreakpoint && (
            <div 
              className="w-2.5 h-2.5 rounded-full bg-red-600 border border-white ring-2 ring-red-500/60 shadow-md shadow-red-600/60 animate-pulse shrink-0 cursor-pointer" 
              title="Unreal Engine Breakpoint Active (F9 to toggle)"
              onClick={(e) => {
                e.stopPropagation();
                updateNodeData(id, { hasBreakpoint: !data.hasBreakpoint });
              }}
            />
          )}
          <span className="truncate font-semibold tracking-wide text-white drop-shadow-sm">{data.title || 'Node'}</span>
          {data.subGraphId && (
            <span className="text-[8px] px-1 py-0.2 rounded font-mono bg-cyan-500/30 text-cyan-200 border border-cyan-400/40 tracking-wider">
              SUBGRAPH
            </span>
          )}
          {perfSeverity && (
            <span className={`text-[8px] px-1 py-0.2 rounded font-mono uppercase tracking-wider ${
              perfSeverity === 'critical' ? 'bg-red-500 text-white' :
              perfSeverity === 'moderate' ? 'bg-gold-500 text-black font-bold' :
              'bg-green-600 text-white'
            }`}>
              {perfSeverity}
            </span>
          )}
        </div>
        {data.subtitle && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/30 text-white/90 uppercase font-mono tracking-wider ml-2 truncate border border-white/10 shrink-0">
            {data.subtitle}
          </span>
        )}
      </div>

      {/* Pins Container */}
      <div className="pins-container p-3 flex justify-between gap-4 font-sans text-xs">
        {/* Input Pins */}
        <div className="pins pins-input space-y-2.5 flex-1">
          {inputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            const isExec = pin.type === 'exec';
            const isConnected = connectedInputHandles.has(handleId);
            const isEditing = editingPinName === pin.name;

            return (
              <div key={handleId} className="pin flex items-center text-xs relative group">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  onClick={(e) => handlePinClick(handleId, true, e)}
                  title={`${pin.type} (${pin.name}) - Drag to connect | Alt+Click to sever wire`}
                  className="!w-4 !h-4 !-left-2 !bg-transparent !border-none !rounded-none !flex !items-center !justify-center !cursor-crosshair z-10"
                >
                  <PinIcon pinType={pin.type} pinName={pin.name} isConnected={isConnected} containerType={pin.containerType} />
                </Handle>

                <span className="ml-2 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-[11px] font-medium">
                  {pin.name}
                </span>

                {/* Inline Editable Pin Value */}
                {!isExec && !isConnected && (
                  <div className="ml-1.5 inline-flex items-center">
                    {isEditing ? (
                      <input
                        type="text"
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => handleCommitEdit(pin.name, pin.type)}
                        onKeyDown={(e) => {
                          e.stopPropagation();
                          if (e.key === 'Enter') handleCommitEdit(pin.name, pin.type);
                          if (e.key === 'Escape') setEditingPinName(null);
                        }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-16 px-1 py-0 text-[10px] font-mono rounded bg-black text-gold-400 border border-gold-500 focus:outline-none"
                      />
                    ) : pin.value !== undefined && pin.value !== null ? (
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(pin, e)}
                        title="Click to edit literal value"
                        className="px-1.5 py-0.5 rounded bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 hover:text-gold-500 dark:hover:text-gold-400 text-[10px] font-mono border border-zinc-300 dark:border-zinc-700 cursor-pointer transition-colors"
                      >
                        {typeof pin.value === 'boolean'
                          ? (pin.value ? 'true' : 'false')
                          : typeof pin.value === 'object'
                          ? JSON.stringify(pin.value)
                          : String(pin.value)}
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={(e) => handleStartEdit(pin, e)}
                        title="Set default literal value"
                        className="opacity-0 group-hover:opacity-100 text-[9px] px-1 py-0 rounded text-zinc-400 hover:text-gold-400 hover:bg-zinc-800 transition-opacity"
                      >
                        +val
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Output Pins */}
        <div className="pins pins-output space-y-2.5 flex-1 flex flex-col items-end">
          {outputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            const isConnected = connectedOutputHandles.has(handleId);

            return (
              <div key={handleId} className="pin flex items-center justify-end text-xs relative group">
                <span className="mr-2 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-[11px] font-medium">
                  {pin.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  onClick={(e) => handlePinClick(handleId, false, e)}
                  title={`${pin.type} (${pin.name}) - Drag to connect | Alt+Click to sever wire`}
                  className="!w-4 !h-4 !-right-2 !bg-transparent !border-none !rounded-none !flex !items-center !justify-center !cursor-crosshair z-10"
                >
                  <PinIcon pinType={pin.type} pinName={pin.name} isConnected={isConnected} containerType={pin.containerType} />
                </Handle>
              </div>
            );
          })}
        </div>
      </div>

      {/* Description / Subtext with strict word wrapping to prevent horizontal stretching */}
      {data.description && (
        <div className="px-3 py-1.5 text-[10px] text-zinc-600 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/80 font-sans break-words whitespace-normal leading-relaxed select-text">
          {data.description}
        </div>
      )}
    </div>
  );
}, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});

BlueprintNode.displayName = 'BlueprintNode';
export default BlueprintNode;
