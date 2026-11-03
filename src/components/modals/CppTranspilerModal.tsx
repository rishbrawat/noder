import React, { useState } from 'react';
import { LuX, LuCopy, LuCheck, LuDownload, LuCode, LuCpu, LuShieldAlert } from 'react-icons/lu';
import { transpileBlueprintToCpp } from '../../utils/blueprintTranspiler';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { toast } from 'react-hot-toast';

interface CppTranspilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintName: string;
  targetClass: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export const CppTranspilerModal: React.FC<CppTranspilerModalProps> = ({
  isOpen,
  onClose,
  blueprintName,
  targetClass,
  nodes,
  edges,
}) => {
  const [activeTab, setActiveTab] = useState<'cpp' | 'h' | 'audit'>('cpp');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const result = transpileBlueprintToCpp(blueprintName, targetClass, nodes, edges);
  const activeCode = activeTab === 'h' ? result.headerCode : result.sourceCode;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeCode);
      setCopied(true);
      toast.success(`Copied Unreal Engine C++ ${activeTab === 'h' ? 'Header' : 'Source'}!`);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      const ext = activeTab === 'h' ? 'h' : 'cpp';
      const blob = new Blob([activeCode], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${blueprintName.replace(/[^a-zA-Z0-9_]/g, '')}.${ext}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded .${ext} file`);
    } catch {
      toast.error('Download failed');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-noder-dark border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-noder-panel border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
              <LuCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-zinc-100 flex items-center gap-2">
                Unreal Engine 5 C++ Transpiler
                <span className={`text-[10px] px-2 py-0.5 rounded font-mono border ${
                  result.complexityScore === 'Optimal'
                    ? 'bg-green-500/10 text-green-400 border-green-500/30'
                    : 'bg-gold-500/10 text-gold-400 border-gold-500/30'
                }`}>
                  Rating: {result.complexityScore}
                </span>
              </h3>
              <p className="text-xs text-zinc-400">Direct translation of visual Blueprint graph into native UE5 C++</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <LuX className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Bar */}
        <div className="flex items-center justify-between px-5 py-2 bg-black/50 border-b border-zinc-900 text-xs">
          <div className="flex space-x-1">
            <button
              onClick={() => setActiveTab('cpp')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'cpp'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Source (.cpp)
            </button>
            <button
              onClick={() => setActiveTab('h')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'h'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Header (.h)
            </button>
            <button
              onClick={() => setActiveTab('audit')}
              className={`px-3 py-1 rounded transition-colors ${
                activeTab === 'audit'
                  ? 'bg-zinc-800 text-white font-semibold'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              Architecture Audit
            </button>
          </div>

          {activeTab !== 'audit' && (
            <div className="flex items-center space-x-2">
              <button
                onClick={handleDownload}
                className="px-2.5 py-1 text-xs rounded border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-1.5"
              >
                <LuDownload className="w-3.5 h-3.5" />
                Download
              </button>
              <button
                onClick={handleCopy}
                className="px-3 py-1 text-xs font-semibold rounded bg-gold-500 hover:bg-gold-400 text-black transition-colors flex items-center gap-1.5"
              >
                {copied ? <LuCheck className="w-3.5 h-3.5" /> : <LuCopy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy C++'}
              </button>
            </div>
          )}
        </div>

        {/* Code / Audit Body */}
        <div className="flex-1 overflow-auto p-4 bg-black font-mono text-xs leading-relaxed text-zinc-300 select-text">
          {activeTab === 'audit' ? (
            <div className="space-y-4 font-sans text-xs p-2">
              <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800">
                <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                  <LuCpu className="w-4 h-4 text-gold-400" />
                  Graph Execution Summary
                </h4>
                <p className="text-zinc-400 leading-relaxed">{result.summary}</p>
              </div>

              <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="font-semibold text-zinc-200 mb-1 flex items-center gap-2">
                  <LuShieldAlert className="w-4 h-4 text-green-400" />
                  Performance & Memory Recommendations
                </h4>
                {result.perfAdvice.map((advice, i) => (
                  <div key={i} className="flex items-start gap-2 text-zinc-300">
                    <span className="text-gold-500 font-bold">•</span>
                    <span>{advice}</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <pre className="whitespace-pre">{activeCode}</pre>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-2.5 bg-noder-panel border-t border-zinc-800 flex items-center justify-between text-xs text-zinc-500">
          <span>Unreal Engine 5.0 - 5.5+ Native C++ API Compliant</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
