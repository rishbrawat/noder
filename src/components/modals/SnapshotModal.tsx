import React, { useState, useEffect, useCallback } from 'react';
import { LuX, LuCamera, LuHistory, LuRotateCcw, LuTrash2, LuGitCompare } from 'react-icons/lu';
import { Node, Edge } from 'reactflow';
import { NodeData, BlueprintSnapshot } from '../../types/BlueprintTypes';
import { toast } from 'react-hot-toast';

interface SnapshotModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintName: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
  onRestoreSnapshot: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  onOpenDiff?: (snapshot: BlueprintSnapshot) => void;
}

const STORAGE_PREFIX = 'noder_snapshots_';

export const SnapshotModal: React.FC<SnapshotModalProps> = ({
  isOpen,
  onClose,
  blueprintName,
  nodes,
  edges,
  onRestoreSnapshot,
  onOpenDiff,
}) => {
  const [snapshotName, setSnapshotName] = useState('');
  const [snapshots, setSnapshots] = useState<BlueprintSnapshot[]>([]);

  const storageKey = `${STORAGE_PREFIX}${blueprintName.replace(/\s+/g, '_')}`;

  const loadSavedSnapshots = useCallback(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) {
        setSnapshots(JSON.parse(raw));
      } else {
        setSnapshots([]);
      }
    } catch {
      setSnapshots([]);
    }
  }, [storageKey]);

  useEffect(() => {
    if (isOpen) {
      loadSavedSnapshots();
      setSnapshotName(`${blueprintName} Rev ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    }
  }, [isOpen, blueprintName, loadSavedSnapshots]);

  if (!isOpen) return null;

  const handleCreateSnapshot = () => {
    if (!snapshotName.trim()) {
      toast.error('Please provide a snapshot name');
      return;
    }

    const newSnapshot: BlueprintSnapshot = {
      id: `snap_${Date.now()}`,
      name: snapshotName.trim(),
      timestamp: new Date().toLocaleString(),
      nodeCount: nodes.length,
      edgeCount: edges.length,
      nodes: JSON.parse(JSON.stringify(nodes)),
      edges: JSON.parse(JSON.stringify(edges)),
    };

    const updated = [newSnapshot, ...snapshots];
    setSnapshots(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast.success(`Captured snapshot: "${newSnapshot.name}"`);
      setSnapshotName(`${blueprintName} Rev ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`);
    } catch {
      toast.error('Failed to save snapshot to local storage');
    }
  };

  const handleRestore = (snap: BlueprintSnapshot) => {
    onRestoreSnapshot(snap.nodes, snap.edges);
    toast.success(`Restored snapshot: "${snap.name}"`);
    onClose();
  };

  const handleDelete = (id: string) => {
    const updated = snapshots.filter(s => s.id !== id);
    setSnapshots(updated);
    try {
      localStorage.setItem(storageKey, JSON.stringify(updated));
      toast.success('Snapshot deleted');
    } catch {
      toast.error('Failed to update storage');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-2xl max-h-[85vh] flex flex-col bg-noder-dark border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-noder-panel border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
              <LuHistory className="w-4 h-4" />
            </div>
            <div>
              <span className="text-sm font-semibold tracking-wide text-zinc-100">
                Blueprint Revisions & Snapshots
              </span>
              <p className="text-[11px] text-zinc-400 font-mono">
                Asset: {blueprintName} &bull; {snapshots.length} saved revision{snapshots.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Create Snapshot Bar */}
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center space-x-2">
          <input
            type="text"
            value={snapshotName}
            onChange={(e) => setSnapshotName(e.target.value)}
            placeholder="Snapshot name (e.g., Before Sprint Rework)"
            className="flex-1 px-3 py-1.5 text-xs rounded bg-black/70 border border-zinc-700 text-zinc-100 placeholder-zinc-500 focus:outline-none focus:border-gold-500 font-sans"
          />
          <button
            onClick={handleCreateSnapshot}
            className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-gold-500 text-black hover:bg-gold-400 transition-colors shrink-0"
          >
            <LuCamera className="w-3.5 h-3.5" />
            <span>Capture Snapshot</span>
          </button>
        </div>

        {/* Snapshots List */}
        <div className="flex-1 overflow-auto p-4 space-y-2">
          {snapshots.length === 0 ? (
            <div className="text-center py-10 text-zinc-500 space-y-2">
              <LuHistory className="w-8 h-8 mx-auto text-zinc-600" />
              <p className="text-xs">No snapshots saved yet.</p>
              <p className="text-[11px] text-zinc-600">
                Capture snapshots before making experimental changes to safely restore earlier graph states.
              </p>
            </div>
          ) : (
            snapshots.map((snap) => (
              <div
                key={snap.id}
                className="p-3 rounded bg-zinc-900 border border-zinc-800/80 hover:border-zinc-700 flex items-center justify-between text-xs transition-colors"
              >
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <span className="font-semibold text-zinc-200">{snap.name}</span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-800 text-zinc-400 border border-zinc-700">
                      {snap.nodeCount} nodes &bull; {snap.edgeCount} edges
                    </span>
                  </div>
                  <p className="text-[10px] text-zinc-500 font-mono">{snap.timestamp}</p>
                </div>

                <div className="flex items-center space-x-1.5">
                  {onOpenDiff && (
                    <button
                      onClick={() => onOpenDiff(snap)}
                      className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium transition-colors border border-zinc-700"
                      title="Visually compare diff against current canvas"
                    >
                      <LuGitCompare className="w-3 h-3 text-gold-500" />
                      <span>Diff</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleRestore(snap)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-gold-500 hover:text-black text-zinc-300 text-xs font-medium transition-colors border border-zinc-700"
                    title="Restore this exact blueprint state"
                  >
                    <LuRotateCcw className="w-3 h-3" />
                    <span>Restore</span>
                  </button>
                  <button
                    onClick={() => handleDelete(snap.id)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors"
                    title="Delete snapshot"
                  >
                    <LuTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-noder-panel border-t border-zinc-800 text-[11px] text-zinc-400">
          <span>Snapshots are persisted in your local browser workspace storage</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
