import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, PinType, PinData } from '../../types/BlueprintTypes';
import { useBlueprintStore } from '../../store/blueprintStore';

// Helper function to generate handle IDs
const getPinId = (pinType: PinType, pinName: string): string => {
  const processedName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `${pinType}-${processedName}`;
};

// Minimalist pin colors anchored around the Black, Red, Green, Gold, White design system
const getPinColorClass = (pinType: PinType): string => {
  switch (pinType) {
    case 'exec': return 'border-white dark:border-zinc-100 bg-white/20 dark:bg-white/10';
    case 'bool': return 'border-red-500 bg-red-500/20';
    case 'float':
    case 'int':
    case 'byte': return 'border-green-500 bg-green-500/20';
    case 'string':
    case 'name': return 'border-zinc-200 bg-zinc-200/20';
    case 'vector':
    case 'vector2d':
    case 'vector3':
    case 'vector4':
    case 'rotator':
    case 'transform': return 'border-gold-500 bg-gold-500/20';
    case 'object':
    case 'class': return 'border-gold-400 bg-gold-400/20';
    default: return 'border-zinc-400 bg-zinc-400/20';
  }
};

const BlueprintNode: React.FC<NodeProps<NodeData>> = memo(({ id, data, selected }) => {
  const updateNodeData = useBlueprintStore(state => state.updateNodeData);
  const [editingPinName, setEditingPinName] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');

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
    const pinColorClass = getPinColorClass(pinType);
    const inputPinName = data.inputs?.[0]?.name || 'In';
    const outputPinName = data.outputs?.[0]?.name || 'Out';

    return (
      <div
        className={`relative w-7 h-7 rounded-full flex items-center justify-center transition-all ${
          selected
            ? 'ring-2 ring-gold-400 bg-gold-500/20 shadow-lg shadow-gold-500/30'
            : 'bg-zinc-900 border border-zinc-700 hover:border-gold-400/60 shadow-md'
        }`}
        title="Unreal Engine Reroute Knot (K2Node_Knot)"
      >
        <Handle
          type="target"
          position={Position.Left}
          id={getPinId(pinType, inputPinName)}
          className={`!w-2 !h-2 !-left-1 !rounded-full !border ${pinColorClass}`}
        />
        <div className={`w-2 h-2 rounded-full border ${pinColorClass}`} />
        <Handle
          type="source"
          position={Position.Right}
          id={getPinId(pinType, outputPinName)}
          className={`!w-2 !h-2 !-right-1 !rounded-full !border ${pinColorClass}`}
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
    <div className={`blueprint-node bg-white dark:bg-noder-panel text-zinc-900 dark:text-zinc-100 rounded-lg border ${borderClass} overflow-hidden min-w-[220px] select-none shadow-xl transition-all duration-150`}>
      {/* Node Header */}
      <div
        className="node-header px-3 py-2 font-medium text-xs flex items-center justify-between text-white relative"
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
          <span className="truncate font-semibold tracking-wide text-white">{data.title || 'Node'}</span>
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
            const isEditing = editingPinName === pin.name;

            return (
              <div key={handleId} className="pin flex items-center text-xs relative group">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className={`w-2.5 h-2.5 border-2 ${getPinColorClass(pin.type)} ${
                    isExec ? '!rounded-none rotate-45' : '!rounded-full'
                  } transition-transform group-hover:scale-125`}
                  style={{ left: '-13px' }}
                />
                <span className="ml-1 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-[11px]">
                  {pin.name}
                </span>

                {/* Inline Editable Pin Value */}
                {!isExec && (
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
                        title="Set default value"
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
            const isExec = pin.type === 'exec';

            return (
              <div key={handleId} className="pin flex items-center justify-end text-xs relative group">
                <span className="mr-1 text-zinc-700 dark:text-zinc-300 group-hover:text-zinc-900 dark:group-hover:text-white transition-colors text-[11px]">
                  {pin.name}
                </span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={`w-2.5 h-2.5 border-2 ${getPinColorClass(pin.type)} ${
                    isExec ? '!rounded-none rotate-45' : '!rounded-full'
                  } transition-transform group-hover:scale-125`}
                  style={{ right: '-13px' }}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* Description / Subtext */}
      {data.description && (
        <div className="px-3 py-1.5 text-[10px] text-zinc-500 dark:text-zinc-400 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-100 dark:bg-black/80 font-sans">
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
