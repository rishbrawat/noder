import React from 'react';
import { SHADER_PRESETS } from '../data/materialNodesCatalog';
import { ShaderPreset } from '../types/materialTypes';
import { LuSparkles, LuCopy, LuCheck } from 'react-icons/lu';

interface ShaderPresetsToolbarProps {
  onSelectPreset: (preset: ShaderPreset) => void;
  onCopyUE5: () => void;
  isCopied?: boolean;
}

export const ShaderPresetsToolbar: React.FC<ShaderPresetsToolbarProps> = ({
  onSelectPreset,
  onCopyUE5,
  isCopied = false,
}) => {
  return (
    <div className="flex items-center justify-between px-3 py-2 bg-zinc-900/90 border-b border-zinc-800 text-xs backdrop-blur">
      <div className="flex items-center space-x-2">
        <span className="flex items-center space-x-1 text-gold-400 font-medium">
          <LuSparkles className="w-3.5 h-3.5" />
          <span>PBR Presets:</span>
        </span>
        <div className="flex items-center space-x-1.5 overflow-x-auto no-scrollbar py-0.5">
          {SHADER_PRESETS.map((preset) => (
            <button
              key={preset.id}
              onClick={() => onSelectPreset(preset)}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-zinc-800/80 hover:bg-zinc-700 text-zinc-200 border border-zinc-700/60 transition-all hover:scale-105"
              title={preset.description}
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block shadow-sm"
                style={{ backgroundColor: preset.previewColor }}
              />
              <span>{preset.name}</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onCopyUE5}
        className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/40 font-mono font-medium transition-colors"
        title="Copy MaterialExpression T3D to Clipboard (Paste in UE5 Material Editor)"
      >
        {isCopied ? <LuCheck className="w-3.5 h-3.5 text-green-400" /> : <LuCopy className="w-3.5 h-3.5" />}
        <span>{isCopied ? 'Copied to UE5!' : 'Copy UE5 Material'}</span>
      </button>
    </div>
  );
};
