import React, { useState } from 'react';
import { LuX, LuCopy, LuCheck, LuDownload, LuTerminal, LuCpu } from 'react-icons/lu';
import { toast } from 'react-hot-toast';

interface T3DInspectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  t3dContent: string;
  nodeCount: number;
  connectionCount: number;
}

export const T3DInspectorModal: React.FC<T3DInspectorModalProps> = ({
  isOpen,
  onClose,
  t3dContent,
  nodeCount,
  connectionCount,
}) => {
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(t3dContent);
      setCopied(true);
      toast.success('Copied T3D code! Press Ctrl+V inside Unreal Engine 5.');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([t3dContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Noder_Graph_${Date.now()}.t3d`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success('Downloaded .t3d file');
    } catch {
      toast.error('Failed to download .t3d');
    }
  };

  const lineCount = t3dContent ? t3dContent.split('\n').length : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-noder-dark border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-white font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-noder-panel border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
              <LuTerminal className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
                Unreal Engine 5 T3D Clipboard Inspector
                <span className="text-[10px] px-2 py-0.5 rounded bg-gold-500/20 text-gold-300 font-mono border border-gold-500/30">
                  UE 5.0 - 5.5+
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Native ASCII format recognized by the Unreal Engine Event Graph</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Bar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-black/40 border-b border-zinc-900 text-xs text-zinc-400">
          <div className="flex items-center space-x-4">
            <span className="flex items-center gap-1.5">
              <LuCpu className="w-3.5 h-3.5 text-red-400" />
              <strong className="text-zinc-200">{nodeCount}</strong> Nodes
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <strong className="text-zinc-200">{connectionCount}</strong> Wire Connections
            </span>
            <span className="text-zinc-700">|</span>
            <span>
              <strong className="text-zinc-200">{lineCount}</strong> T3D Lines
            </span>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleDownload}
              className="px-3 py-1 text-xs rounded border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 transition-colors flex items-center gap-1.5"
            >
              <LuDownload className="w-3.5 h-3.5" />
              Download .t3d
            </button>
            <button
              onClick={handleCopy}
              className={`px-3 py-1 text-xs font-medium rounded transition-all duration-200 flex items-center gap-1.5 ${
                copied
                  ? 'bg-green-600 text-white'
                  : 'bg-gold-500 hover:bg-gold-400 text-black font-semibold'
              }`}
            >
              {copied ? <LuCheck className="w-3.5 h-3.5" /> : <LuCopy className="w-3.5 h-3.5" />}
              {copied ? 'Copied to Clipboard!' : 'Copy for UE5 (Ctrl+V)'}
            </button>
          </div>
        </div>

        {/* Code Viewport */}
        <div className="flex-1 overflow-auto p-4 bg-black font-mono text-[11px] leading-relaxed text-zinc-300 select-text">
          {t3dContent ? (
            <pre className="whitespace-pre">{t3dContent}</pre>
          ) : (
            <div className="h-48 flex items-center justify-center text-zinc-600 text-xs">
              No nodes compiled yet. Generate or add nodes to inspect the T3D stream.
            </div>
          )}
        </div>

        {/* Footer Instructions */}
        <div className="px-5 py-3 bg-noder-panel border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            <span>How to import: In Unreal Engine 5, open any Blueprint &gt; Event Graph, then press <strong>Ctrl + V</strong>.</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

