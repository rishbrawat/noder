import React from 'react';
import { NodeProps, Handle, Position } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';

export const MaterialNodeCard: React.FC<NodeProps<NodeData>> = ({ data, selected }) => {
  const isRoot = data.title === 'Material Root' || data.nodeType === 'customNode';
  const headerColor = data.color || (isRoot ? '#E11D48' : '#2563EB');

  // Check if constant color swatch can be rendered
  const previewColor = data.outputs?.[0]?.defaultValue;
  const isColorVector = Array.isArray(previewColor) && previewColor.length >= 3;

  return (
    <div
      className={`min-w-[190px] rounded-lg bg-zinc-900 border text-xs shadow-xl transition-all duration-150 select-none overflow-hidden ${
        selected ? 'border-gold-400 ring-2 ring-gold-400/30' : 'border-zinc-700 hover:border-zinc-500'
      }`}
    >
      {/* Node Header */}
      <div
        className="px-3 py-1.5 flex items-center justify-between font-medium text-white border-b border-black/30"
        style={{ backgroundColor: headerColor }}
      >
        <span className="truncate">{data.title}</span>
        {data.subtitle && <span className="text-[10px] opacity-75">{data.subtitle}</span>}
      </div>

      {/* Optional Color Swatch Preview for Constants */}
      {isColorVector && (
        <div
          className="h-4 w-full border-b border-zinc-800"
          style={{
            backgroundColor: `rgb(${Math.round(previewColor[0] * 255)}, ${Math.round(
              previewColor[1] * 255
            )}, ${Math.round(previewColor[2] * 255)})`,
          }}
        />
      )}

      {/* Body Pins */}
      <div className="p-2 space-y-1.5">
        <div className="flex justify-between items-start">
          {/* Inputs */}
          <div className="space-y-1">
            {(data.inputs || []).map((pin, i) => (
              <div key={i} className="relative flex items-center space-x-1.5 py-0.5">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={`${pin.type}-${pin.name.toLowerCase().replace(/\s+/g, '')}`}
                  className="!w-2.5 !h-2.5 !bg-cyan-400 !border !border-black"
                />
                <span className="text-[11px] text-zinc-300 font-mono pl-1">{pin.name}</span>
              </div>
            ))}
          </div>

          {/* Outputs */}
          <div className="space-y-1 text-right">
            {(data.outputs || []).map((pin, i) => (
              <div key={i} className="relative flex items-center justify-end space-x-1.5 py-0.5">
                <span className="text-[11px] text-zinc-300 font-mono pr-1">{pin.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={`${pin.type}-${pin.name.toLowerCase().replace(/\s+/g, '')}`}
                  className="!w-2.5 !h-2.5 !bg-gold-400 !border !border-black"
                />
              </div>
            ))}
          </div>
        </div>

        {data.description && (
          <p className="text-[10px] text-zinc-400 pt-1 border-t border-zinc-800 italic">
            {data.description}
          </p>
        )}
      </div>
    </div>
  );
};
