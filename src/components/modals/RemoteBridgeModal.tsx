import React, { useState } from 'react';
import { LuRadio, LuTerminal, LuCopy, LuCheck, LuExternalLink, LuSend } from 'react-icons/lu';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { generateUE5PythonScript } from '../../utils/uePythonGenerator';
import { toast } from 'react-hot-toast';

interface RemoteBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintName: string;
  targetClass: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export const RemoteBridgeModal: React.FC<RemoteBridgeModalProps> = ({
  isOpen,
  onClose,
  blueprintName,
  targetClass,
  nodes,
  edges,
}) => {
  const [isSyncing, setIsSyncing] = useState(false);
  const [hasSynced, setHasSynced] = useState(false);
  const [copiedCmd, setCopiedCmd] = useState(false);

  if (!isOpen) return null;

  const liveCommand = `py "import urllib.request; exec(urllib.request.urlopen('http://localhost:5000/api/ue5/live_script').read().decode('utf-8'))"`;

  const handleSyncToBridge = async () => {
    try {
      setIsSyncing(true);
      const { script: pythonScript } = generateUE5PythonScript(nodes, edges, {
        blueprintName: blueprintName || 'MainGraph',
        targetClass: targetClass || 'Character',
      });
      const apiUrl = `${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/ue5/live_script`;

      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: pythonScript }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setHasSynced(true);
      toast.success('Live payload synced! Ready to execute in Unreal Engine 5.');
    } catch (e: any) {
      console.error('Remote sync error:', e);
      toast.error('Failed to sync to live bridge. Ensure Flask server is running.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCopyCommand = () => {
    navigator.clipboard.writeText(liveCommand);
    setCopiedCmd(true);
    toast.success('Copied UE5 Live Command to clipboard!');
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none animate-fade-in">
      <div className="bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-black/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-lg bg-green-500/10 border border-green-500/30 flex items-center justify-center">
              <LuRadio className="w-4 h-4 text-green-500 animate-pulse" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Unreal Engine 5 Live Remote Execution Bridge
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-green-500/20 text-green-500 border border-green-500/30">
                  HTTP / Python RPC
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Direct headless asset creation inside a running Unreal Engine 5 editor
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
        <div className="p-5 space-y-4 text-xs">
          {/* Action 1: Sync Payload */}
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                Step 1: Broadcast Graph to Live Bridge
              </span>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Pushes {nodes.length} nodes and {edges.length} connections to the local engine bridge endpoint.
              </p>
            </div>
            <button
              onClick={handleSyncToBridge}
              disabled={isSyncing}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all ${
                hasSynced
                  ? 'bg-green-600 text-white hover:bg-green-500'
                  : 'bg-gold-500 text-black hover:bg-gold-400'
              }`}
            >
              {hasSynced ? <LuCheck size={14} /> : <LuSend size={14} />}
              <span>{isSyncing ? 'Syncing...' : hasSynced ? 'Synced & Live' : 'Sync Graph'}</span>
            </button>
          </div>

          {/* Action 2: Copy 1-Liner Command */}
          <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
                Step 2: Run 1-Liner in UE5 Output Log
              </span>
              <button
                onClick={handleCopyCommand}
                className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors text-[11px]"
              >
                {copiedCmd ? <LuCheck size={12} className="text-green-500" /> : <LuCopy size={12} />}
                <span>{copiedCmd ? 'Copied!' : 'Copy Command'}</span>
              </button>
            </div>

            <div className="p-2.5 rounded bg-black border border-zinc-800 font-mono text-[11px] text-green-400 break-all select-all">
              {liveCommand}
            </div>
          </div>

          {/* Instructions Walkthrough */}
          <div className="p-3.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-zinc-700 dark:text-zinc-300 space-y-1.5 text-[11px]">
            <p className="font-semibold text-gold-500 uppercase font-mono tracking-wider text-[10px]">
              How it works inside Unreal Engine 5:
            </p>
            <ol className="list-decimal list-inside space-y-1 text-zinc-600 dark:text-zinc-400">
              <li>Open your project in Unreal Engine 5.4 or 5.5.</li>
              <li>Press <kbd className="px-1 rounded bg-black text-white font-mono">`</kbd> (tilde) or open <strong>Window &rarr; Output Log</strong>.</li>
              <li>Ensure the command input dropdown is set to <strong>Cmd / Python</strong>.</li>
              <li>Paste the command above and press Enter. The asset is automatically synthesized!</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-black/40 flex items-center justify-between shrink-0">
          <a
            href="https://dev.epicgames.com/documentation/en-us/unreal-engine/scripting-the-unreal-editor-using-python"
            target="_blank"
            rel="noreferrer"
            className="flex items-center space-x-1 text-[11px] text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200"
          >
            <span>Unreal Python API Docs</span>
            <LuExternalLink size={11} />
          </a>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-semibold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
