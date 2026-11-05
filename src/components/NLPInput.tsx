import React, { useState, useMemo } from 'react';
import { useBlueprint } from '../hooks/useBlueprint';
import { useBlueprintStore } from '../store/blueprintStore';
import { graphToMinifiedIR } from '../utils/blueprintIR';
import { 
  LuSparkles, 
  LuLoader, 
  LuArrowRight, 
  LuCrosshair, 
  LuFilePlus,
  LuLayers
} from 'react-icons/lu';

interface NLPInputProps {
  onGenerate?: (query: string) => void;
}

export const NLPInput: React.FC<NLPInputProps> = ({ onGenerate }) => {
  const [query, setQuery] = useState<string>('');
  const [targetClass, setTargetClass] = useState<string>('Character');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<'auto' | 'new'>('auto');

  const { loadBlueprint } = useBlueprint();
  const nodes = useBlueprintStore(state => state.nodes);
  const edges = useBlueprintStore(state => state.edges);

  const selectedNodes = useMemo(() => nodes.filter(n => n.selected), [nodes]);
  const hasNodes = nodes.length > 0;
  const isScoped = hasNodes && selectedNodes.length > 0 && editMode === 'auto';
  const isPatchMode = hasNodes && editMode === 'auto';

  const placeholderText = useMemo(() => {
    if (isScoped) {
      return `Describe change for ${selectedNodes.length} selected node(s) (e.g. 'Add 3s cooldown and stamina check')...`;
    }
    if (isPatchMode) {
      return "Describe addition or edit to active graph (e.g. 'Add sprint toggle with speed 800')...";
    }
    return "Describe your Unreal Engine 5 gameplay mechanic (e.g. grappling hook, health regen)...";
  }, [isScoped, isPatchMode, selectedNodes.length]);

  const handleExecute = async (promptText: string) => {
    if (!promptText.trim() || isGenerating) return;

    try {
      setIsGenerating(true);

      if (isPatchMode) {
        // Compile minified IR to achieve 90%+ token reduction
        const scopedIds = isScoped ? selectedNodes.map(n => n.id) : undefined;
        const { irData, stats } = graphToMinifiedIR(nodes, edges, { scopedNodeIds: scopedIds });

        console.info(
          `[Noder IR] Token Compression: ${stats.reductionPercentage}% reduction (${stats.estimatedTokensSaved} tokens saved).`
        );

        await loadBlueprint(promptText, targetClass, {
          isPatch: true,
          currentGraphIR: irData,
          scopedNodeIds: scopedIds,
        });
      } else {
        // Fresh generation from scratch
        await loadBlueprint(promptText, targetClass);
      }

      if (onGenerate) {
        onGenerate(promptText);
      }
      setQuery('');
    } catch (error) {
      console.error('Blueprint generation failed:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleExecute(query);
  };

  return (
    <div className="w-full">
      {/* Main Prompt Bar */}
      <form onSubmit={handleSubmit} className="w-full">
        <div className="relative flex items-center bg-white dark:bg-noder-panel border border-zinc-300 dark:border-zinc-800 rounded-lg shadow-xl overflow-hidden focus-within:border-gold-500 dark:focus-within:border-gold-500 transition-colors">
          {/* Target Class Selector */}
          <div className="border-r border-zinc-200 dark:border-zinc-800 px-2.5 py-2.5 bg-zinc-50 dark:bg-black/40">
            <select
              value={targetClass}
              onChange={(e) => setTargetClass(e.target.value)}
              disabled={isGenerating}
              className="bg-transparent text-xs font-mono font-medium text-zinc-700 dark:text-zinc-300 focus:outline-none cursor-pointer"
            >
              <option value="Character" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Character</option>
              <option value="Actor" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">Actor</option>
              <option value="PlayerController" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">PlayerController</option>
              <option value="GameModeBase" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-white">GameModeBase</option>
            </select>
          </div>

          {/* Context Window / Mode Indicator Pill */}
          {hasNodes && (
            <div className="pl-2 shrink-0">
              {isScoped ? (
                <div 
                  className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] bg-gold-500/15 text-gold-400 border border-gold-500/30"
                  title="Context is scoped strictly to the selected nodes"
                >
                  <LuCrosshair className="w-3 h-3 text-gold-400 animate-pulse" />
                  <span>Scoped ({selectedNodes.length})</span>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditMode(m => m === 'auto' ? 'new' : 'auto')}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-[10px] border transition-colors ${
                    isPatchMode
                      ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20'
                      : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-white'
                  }`}
                  title={isPatchMode ? "Click to switch to New Canvas mode" : "Click to switch to Extend/Patch mode"}
                >
                  {isPatchMode ? (
                    <>
                      <LuLayers className="w-3 h-3 text-green-400" />
                      <span>Extend ({nodes.length})</span>
                    </>
                  ) : (
                    <>
                      <LuFilePlus className="w-3 h-3 text-zinc-400" />
                      <span>New Canvas</span>
                    </>
                  )}
                </button>
              )}
            </div>
          )}

          {/* Text Input */}
          <div className="relative flex-1 flex items-center">
            <LuSparkles className="absolute left-3 w-4 h-4 text-gold-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={placeholderText}
              className="w-full py-2.5 pl-9 pr-3 text-xs md:text-sm font-sans bg-transparent text-zinc-900 dark:text-zinc-100 border-none focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
              disabled={isGenerating}
            />
          </div>

          {/* Generate / Patch Button */}
          <button
            type="submit"
            disabled={isGenerating || !query.trim()}
            className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-black font-semibold text-xs tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            {isGenerating ? (
              <>
                <LuLoader className="w-3.5 h-3.5 animate-spin text-black" />
                <span>{isPatchMode ? 'Patching...' : 'Compiling...'}</span>
              </>
            ) : (
              <>
                <span>{isPatchMode ? 'Extend' : 'Generate'}</span>
                <LuArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
