import React, { memo, useState, useCallback } from 'react';
import { NodeProps, NodeResizer } from 'reactflow';
import { LuTrash2, LuPalette, LuMessageSquare } from 'react-icons/lu';
import { useBlueprintStore } from '../../store/blueprintStore';

export interface BlueprintCommentData {
  title: string;
  comment?: string;
  color?: string;
  width?: number;
  height?: number;
}

const PRESET_COLORS = [
  { label: 'Gold (Utility)', value: '#CA8A04', bg: 'rgba(202, 138, 4, 0.06)', border: '#CA8A04', text: 'text-gold-400' },
  { label: 'Green (Movement)', value: '#15803D', bg: 'rgba(21, 128, 61, 0.06)', border: '#15803D', text: 'text-green-400' },
  { label: 'Red (Combat/Events)', value: '#991B1B', bg: 'rgba(153, 27, 27, 0.06)', border: '#991B1B', text: 'text-red-400' },
  { label: 'Black (Graphite)', value: '#27272A', bg: 'rgba(39, 39, 42, 0.12)', border: '#52525B', text: 'text-zinc-300' },
  { label: 'White (Neutral)', value: '#E4E4E7', bg: 'rgba(244, 244, 245, 0.04)', border: '#A1A1AA', text: 'text-zinc-100' },
];

export const BlueprintCommentNode: React.FC<NodeProps<BlueprintCommentData>> = memo(({ id, data, selected }) => {
  const { removeNode, updateNodeData } = useBlueprintStore();
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [title, setTitle] = useState(data?.title || 'Comment Group');
  const [showColorPicker, setShowColorPicker] = useState(false);

  const currentColor = data?.color || '#CA8A04';
  const colorPreset = PRESET_COLORS.find(c => c.value === currentColor) || PRESET_COLORS[0];

  const handleTitleSubmit = useCallback(() => {
    setIsEditingTitle(false);
    updateNodeData(id, { title });
  }, [id, title, updateNodeData]);

  const handleSelectColor = useCallback((colorHex: string) => {
    updateNodeData(id, { color: colorHex });
    setShowColorPicker(false);
  }, [id, updateNodeData]);

  return (
    <div
      className={`relative rounded-lg border transition-all font-sans select-none overflow-hidden ${
        selected ? 'ring-2 ring-gold-400/80 shadow-2xl' : 'shadow-lg'
      }`}
      style={{
        backgroundColor: colorPreset.bg,
        borderColor: selected ? colorPreset.border : `${colorPreset.border}88`,
        borderWidth: selected ? 2 : 1,
        minWidth: 280,
        minHeight: 180,
        width: '100%',
        height: '100%',
        pointerEvents: 'none', // Allow interacting with nodes positioned inside comment box
      }}
    >
      <NodeResizer
        minWidth={240}
        minHeight={140}
        isVisible={selected}
        lineClassName="!border-gold-500"
        handleClassName="!h-3 !w-3 !bg-gold-500 !border-2 !border-black !rounded-sm pointer-events-auto"
      />

      {/* Comment Header Bar */}
      <div
        className="pointer-events-auto px-3 py-1.5 flex items-center justify-between text-xs font-semibold bg-zinc-900/95 dark:bg-black/90 border-b border-zinc-800 backdrop-blur-sm"
        style={{ borderTop: `2px solid ${colorPreset.border}` }}
      >
        <div className="flex items-center space-x-2 flex-1 mr-2 min-w-0">
          <LuMessageSquare className={`w-3.5 h-3.5 shrink-0 ${colorPreset.text}`} />
          {isEditingTitle ? (
            <input
              type="text"
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={handleTitleSubmit}
              onKeyDown={(e) => {
                e.stopPropagation();
                if (e.key === 'Enter') handleTitleSubmit();
                if (e.key === 'Escape') setIsEditingTitle(false);
              }}
              onClick={(e) => e.stopPropagation()}
              className="px-1.5 py-0.5 text-xs font-mono rounded bg-zinc-950 text-white border border-gold-500 focus:outline-none w-full"
            />
          ) : (
            <span
              onDoubleClick={(e) => {
                e.stopPropagation();
                setIsEditingTitle(true);
              }}
              title="Double-click to edit title"
              className={`truncate cursor-pointer hover:underline font-mono text-[11px] uppercase tracking-wider ${colorPreset.text}`}
            >
              // {title}
            </span>
          )}
        </div>

        {/* Comment Controls */}
        <div className="flex items-center space-x-1 shrink-0 pointer-events-auto">
          <div className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowColorPicker(!showColorPicker);
              }}
              className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              title="Change comment color"
            >
              <LuPalette size={12} />
            </button>

            {showColorPicker && (
              <div
                onClick={(e) => e.stopPropagation()}
                className="absolute right-0 top-6 z-50 p-1.5 bg-black/95 border border-zinc-700 rounded shadow-xl flex space-x-1"
              >
                {PRESET_COLORS.map(c => (
                  <button
                    key={c.value}
                    onClick={() => handleSelectColor(c.value)}
                    className="w-4 h-4 rounded-full border border-white/30 hover:scale-125 transition-transform"
                    style={{ backgroundColor: c.value }}
                    title={c.label}
                  />
                ))}
              </div>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation();
              removeNode(id);
            }}
            className="p-1 rounded text-zinc-400 hover:text-red-400 hover:bg-zinc-800 transition-colors"
            title="Delete comment box"
          >
            <LuTrash2 size={12} />
          </button>
        </div>
      </div>

      {/* Subtle UE5 Watermark in Corner */}
      <div className="absolute bottom-2 right-3 pointer-events-none text-[9px] font-mono tracking-widest uppercase opacity-20 text-zinc-500">
        UE5 Comment
      </div>
    </div>
  );
});

BlueprintCommentNode.displayName = 'BlueprintCommentNode';
export default BlueprintCommentNode;
