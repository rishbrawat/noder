import React from 'react';
import { LuWrench, LuSparkles, LuCheck, LuTriangleAlert, LuInfo, LuTrash2 } from 'react-icons/lu';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { auditGraphOptimization, optimizeBlueprintGraph } from '../../utils/blueprintOptimizer';
import { toast } from 'react-hot-toast';

interface RefactorModalProps {
  isOpen: boolean;
  onClose: () => void;
  nodes: Node<NodeData>[];
  edges: Edge[];
  onApplyRefactor: (newNodes: Node<NodeData>[], newEdges: Edge[]) => void;
}

export const RefactorModal: React.FC<RefactorModalProps> = ({
  isOpen,
  onClose,
  nodes,
  edges,
  onApplyRefactor,
}) => {
  const audit = auditGraphOptimization(nodes, edges);

  if (!isOpen) return null;

  const handleExecuteRefactor = () => {
    const result = optimizeBlueprintGraph(nodes, edges);
    onApplyRefactor(result.optimizedNodes, result.optimizedEdges);
    toast.success(`Refactored! Pruned ${result.removedNodes.length} dead nodes.`);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none animate-fade-in">
      <div className="bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-black/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <LuWrench className="w-4 h-4 text-gold-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Unreal Blueprint Refactoring & Code Optimizer
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Automated detection and pruning of dead logic, redundant getters, and anti-patterns
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 text-lg p-1 transition-colors"
          >
            ×
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Score Comparison */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 text-center">
              <span className="text-[10px] uppercase font-mono text-zinc-500">Current Health Score</span>
              <div className="text-3xl font-extrabold text-gold-500 font-mono my-0.5">
                {audit.initialScore}<span className="text-sm text-zinc-500 font-normal">/100</span>
              </div>
              <span className="text-[10px] text-zinc-400">{audit.smells.length} architectural smells detected</span>
            </div>

            <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20 text-center">
              <span className="text-[10px] uppercase font-mono text-green-500">Projected Score After Refactor</span>
              <div className="text-3xl font-extrabold text-green-500 font-mono my-0.5">
                {audit.projectedScore}<span className="text-sm text-green-600/70 font-normal">/100</span>
              </div>
              <span className="text-[10px] text-green-500 flex items-center justify-center gap-1">
                <LuSparkles className="w-3 h-3" /> Clean Ship-Ready Architecture
              </span>
            </div>
          </div>

          {/* Code Smell Issues List */}
          <div className="space-y-2">
            <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
              Detected Code Smells ({audit.smells.length})
            </span>
            {audit.smells.length === 0 ? (
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-center text-zinc-500">
                <LuCheck className="w-5 h-5 mx-auto text-green-500 mb-1" />
                <span>Zero architectural code smells detected. Graph is clean!</span>
              </div>
            ) : (
              <div className="space-y-1.5 max-h-60 overflow-y-auto">
                {audit.smells.map((smell) => (
                  <div
                    key={smell.id}
                    className="p-2.5 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-start space-x-2.5"
                  >
                    {smell.severity === 'critical' ? (
                      <LuTriangleAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                    ) : smell.severity === 'warning' ? (
                      <LuTriangleAlert className="w-4 h-4 text-gold-500 shrink-0 mt-0.5" />
                    ) : (
                      <LuInfo className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {smell.nodeTitle}
                        </span>
                        <span className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded ${
                          smell.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                          smell.severity === 'warning' ? 'bg-gold-500/20 text-gold-400' :
                          'bg-zinc-800 text-zinc-400'
                        }`}>
                          {smell.type.replace('_', ' ')}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-300 mt-0.5">
                        {smell.message}
                      </p>
                      <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5 italic">
                        &rarr; {smell.recommendation}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            {audit.orphanNodeCount > 0 ? `${audit.orphanNodeCount} orphan nodes will be pruned.` : 'No nodes to delete.'}
          </span>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3 py-1.5 rounded border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteRefactor}
              disabled={audit.smells.length === 0}
              className="flex items-center space-x-1.5 px-4 py-1.5 rounded bg-gold-500 hover:bg-gold-400 text-black text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
            >
              <LuTrash2 size={13} />
              <span>Apply Automated Refactoring</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

