import React from 'react';
import {
  LuAlignHorizontalJustifyCenter,
  LuAlignVerticalJustifyCenter,
  LuSparkles,
  LuMinimize2,
  LuMessageSquare,
  LuCopy,
  LuTrash2
} from 'react-icons/lu';

interface SelectionActionHUDProps {
  selectedCount: number;
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
  onStraighten: () => void;
  onCollapseToMacro: () => void;
  onWrapComment: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

export const SelectionActionHUD: React.FC<SelectionActionHUDProps> = ({
  selectedCount,
  onAlignHorizontal,
  onAlignVertical,
  onStraighten,
  onCollapseToMacro,
  onWrapComment,
  onDuplicate,
  onDelete,
}) => {
  if (selectedCount < 2) return null;

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 bg-black/90 dark:bg-zinc-900/95 border border-gold-500/50 rounded-full shadow-2xl backdrop-blur-md text-xs text-white select-none">
      <span className="font-mono text-gold-400 font-semibold px-2 py-0.5 rounded-full bg-gold-500/15 border border-gold-500/30 text-[11px]">
        {selectedCount} Selected
      </span>
      <span className="text-zinc-600">|</span>
      <button
        onClick={onAlignHorizontal}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Align Horizontally (Shift+A)"
      >
        <LuAlignHorizontalJustifyCenter size={14} />
      </button>
      <button
        onClick={onAlignVertical}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Align Vertically (Shift+W)"
      >
        <LuAlignVerticalJustifyCenter size={14} />
      </button>
      <button
        onClick={onStraighten}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Straighten Connections (Q)"
      >
        <LuSparkles size={14} />
      </button>
      <button
        onClick={onCollapseToMacro}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Collapse to Macro (Ctrl+G)"
      >
        <LuMinimize2 size={14} />
      </button>
      <button
        onClick={onWrapComment}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Wrap in Comment (C)"
      >
        <LuMessageSquare size={14} />
      </button>
      <button
        onClick={onDuplicate}
        className="p-1.5 hover:text-gold-400 hover:bg-zinc-800 rounded transition-colors text-zinc-300"
        title="Duplicate Selected (Ctrl+D)"
      >
        <LuCopy size={14} />
      </button>
      <button
        onClick={onDelete}
        className="p-1.5 hover:text-red-400 hover:bg-red-500/20 text-red-400 rounded transition-colors"
        title="Delete Selected (Del)"
      >
        <LuTrash2 size={14} />
      </button>
    </div>
  );
};

