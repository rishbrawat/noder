import React, { useState } from 'react';
import { useBlueprint } from '../hooks/useBlueprint';
import { LuSparkles, LuLoader, LuArrowRight } from 'react-icons/lu';

interface NLPInputProps {
  onGenerate?: (query: string) => void;
}

export const NLPInput: React.FC<NLPInputProps> = ({ onGenerate }) => {
  const [query, setQuery] = useState<string>('');
  const [targetClass, setTargetClass] = useState<string>('Character');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const { loadBlueprint } = useBlueprint();

  const handleExecute = async (promptText: string) => {
    if (!promptText.trim() || isGenerating) return;

    try {
      setIsGenerating(true);
      await loadBlueprint(promptText, targetClass);
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

          {/* Text Input */}
          <div className="relative flex-1 flex items-center">
            <LuSparkles className="absolute left-3 w-4 h-4 text-gold-500 shrink-0" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Describe your Unreal Engine 5 gameplay mechanic (e.g., sprint toggle, projectile firing, health)..."
              className="w-full py-2.5 pl-9 pr-3 text-xs md:text-sm font-sans bg-transparent text-zinc-900 dark:text-zinc-100 border-none focus:outline-none placeholder-zinc-400 dark:placeholder-zinc-500"
              disabled={isGenerating}
            />
          </div>

          {/* Generate Button */}
          <button
            type="submit"
            disabled={isGenerating || !query.trim()}
            className="px-4 py-2.5 bg-gold-500 hover:bg-gold-400 text-black font-semibold text-xs tracking-wide transition-all disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1.5 shrink-0"
          >
            {isGenerating ? (
              <>
                <LuLoader className="w-3.5 h-3.5 animate-spin text-black" />
                <span>Compiling...</span>
              </>
            ) : (
              <>
                <span>Generate</span>
                <LuArrowRight className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
};
