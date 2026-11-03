import React, { useState, useMemo } from 'react';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { computeBlueprintDiff } from '../../utils/blueprintDiff';
import { LuGitCompare, LuPlus, LuMinus, LuRefreshCw, LuCheck } from 'react-icons/lu';
import { toast } from 'react-hot-toast';

interface DiffModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentNodes: Node<NodeData>[];
  currentEdges: Edge[];
  snapshots: { id: string; name: string; timestamp: string; nodes: Node<NodeData>[]; edges: Edge[] }[];
  onRollback: (snapshotNodes: Node<NodeData>[], snapshotEdges: Edge[]) => void;
}

export const DiffModal: React.FC<DiffModalProps> = ({
  isOpen,
  onClose,
  currentNodes,
  currentEdges,
  snapshots,
  onRollback,
}) => {
  const [selectedSnapshotId, setSelectedSnapshotId] = useState<string>(
    snapshots.length > 0 ? snapshots[0].id : ''
  );

  const selectedSnapshot = useMemo(() => {
    return snapshots.find(s => s.id === selectedSnapshotId) || snapshots[0] || null;
  }, [snapshots, selectedSnapshotId]);

  const diffResult = useMemo(() => {
    if (!selectedSnapshot) return null;
    return computeBlueprintDiff(
      selectedSnapshot.nodes,
      selectedSnapshot.edges,
      currentNodes,
      currentEdges
    );
  }, [selectedSnapshot, currentNodes, currentEdges]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none animate-fade-in">
      <div className="bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-3xl w-full max-h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-black/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-gold-500/10 border border-gold-500/30 flex items-center justify-center">
              <LuGitCompare className="w-4 h-4 text-gold-500" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Visual Blueprint Graph Diff
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Compare current canvas against historical revisions
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

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 flex-1 text-xs">
          {/* Snapshot Selector */}
          <div className="flex items-center space-x-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800">
            <span className="font-medium text-zinc-700 dark:text-zinc-300 shrink-0">Compare with:</span>
            {snapshots.length === 0 ? (
              <span className="text-zinc-500 italic text-[11px]">No historical snapshots saved yet.</span>
            ) : (
              <select
                value={selectedSnapshotId}
                onChange={(e) => setSelectedSnapshotId(e.target.value)}
                className="bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-800 rounded px-2.5 py-1 text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:border-gold-500 flex-1"
              >
                {snapshots.map(s => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.timestamp}) — {s.nodes.length} nodes
                  </option>
                ))}
              </select>
            )}
          </div>

          {diffResult && (
            <>
              {/* Diff Summary Badges */}
              <div className="grid grid-cols-4 gap-2 text-center font-mono">
                <div className="p-2.5 rounded-lg bg-green-500/10 border border-green-500/20 text-green-500">
                  <span className="text-[10px] uppercase block text-green-600 dark:text-green-400">Added</span>
                  <span className="text-lg font-bold">+{diffResult.summary.addedNodes}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
                  <span className="text-[10px] uppercase block text-red-600 dark:text-red-400">Removed</span>
                  <span className="text-lg font-bold">-{diffResult.summary.removedNodes}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-gold-500">
                  <span className="text-[10px] uppercase block text-gold-600 dark:text-gold-400">Modified</span>
                  <span className="text-lg font-bold">~{diffResult.summary.modifiedNodes}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 text-zinc-500">
                  <span className="text-[10px] uppercase block">Unchanged</span>
                  <span className="text-lg font-bold">{diffResult.summary.unchangedNodes}</span>
                </div>
              </div>

              {/* Node Changes List */}
              <div className="space-y-1.5">
                <span className="text-[11px] font-mono font-semibold uppercase tracking-wider text-zinc-400">
                  Node Delta List
                </span>
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden divide-y divide-zinc-200 dark:divide-zinc-800/60 max-h-56 overflow-y-auto">
                  {diffResult.nodeDiffs.map((diff, i) => (
                    <div
                      key={i}
                      className="px-3 py-2 flex items-center justify-between bg-white dark:bg-zinc-900/40 text-xs"
                    >
                      <div className="flex items-center space-x-2">
                        {diff.changeType === 'added' && (
                          <span className="p-0.5 rounded bg-green-500/20 text-green-500">
                            <LuPlus size={12} />
                          </span>
                        )}
                        {diff.changeType === 'removed' && (
                          <span className="p-0.5 rounded bg-red-500/20 text-red-500">
                            <LuMinus size={12} />
                          </span>
                        )}
                        {diff.changeType === 'modified' && (
                          <span className="p-0.5 rounded bg-gold-500/20 text-gold-500">
                            <LuRefreshCw size={12} />
                          </span>
                        )}
                        {diff.changeType === 'unchanged' && (
                          <span className="p-0.5 rounded bg-zinc-200 dark:bg-zinc-800 text-zinc-400">
                            <LuCheck size={12} />
                          </span>
                        )}
                        <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                          {diff.title}
                        </span>
                      </div>
                      <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                        {diff.details}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-zinc-500">
            {diffResult?.summary.isIdentical ? 'Canvas matches snapshot perfectly.' : 'Revisions detected.'}
          </span>
          <div className="flex items-center space-x-2">
            {selectedSnapshot && !diffResult?.summary.isIdentical && (
              <button
                onClick={() => {
                  onRollback(selectedSnapshot.nodes, selectedSnapshot.edges);
                  toast.success(`Reverted graph to ${selectedSnapshot.name}`);
                  onClose();
                }}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded border border-red-500/40 bg-red-500/10 hover:bg-red-500/20 text-red-400 text-xs font-medium transition-colors"
              >
                <span>Revert to this Snapshot</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-gold-500 hover:bg-gold-400 text-black text-xs font-semibold shadow-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
