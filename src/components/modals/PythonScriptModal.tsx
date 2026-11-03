import React, { useState } from 'react';
import { LuX, LuCopy, LuCheck, LuDownload, LuTerminal, LuFileCode, LuInfo } from 'react-icons/lu';
import { generateUE5PythonScript } from '../../utils/uePythonGenerator';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { toast } from 'react-hot-toast';

interface PythonScriptModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintName: string;
  targetClass: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

export const PythonScriptModal: React.FC<PythonScriptModalProps> = ({
  isOpen,
  onClose,
  blueprintName,
  targetClass,
  nodes,
  edges,
}) => {
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'script' | 'guide'>('script');

  if (!isOpen) return null;

  const result = generateUE5PythonScript(nodes, edges, {
    blueprintName,
    targetClass,
    packagePath: '/Game/Blueprints',
  });

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(result.script);
      setCopied(true);
      toast.success('Copied Unreal Engine Python automation script!');
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Failed to copy script to clipboard');
    }
  };

  const handleDownload = () => {
    try {
      const blob = new Blob([result.script], { type: 'text/x-python;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = result.fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${result.fileName}`);
    } catch {
      toast.error('Failed to download python file');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-4xl max-h-[85vh] flex flex-col bg-noder-dark border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-noder-panel border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
              <LuTerminal className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-wide text-zinc-100">
                  Unreal Engine 5 Python Automation Bridge
                </span>
                <span className="px-1.5 py-0.5 text-[10px] uppercase font-mono tracking-wider bg-gold-500/10 text-gold-400 border border-gold-500/20 rounded">
                  UE 5.0 - 5.5+
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Asset: /Game/Blueprints/{blueprintName} | Target: {targetClass}
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

        {/* Tab & Action Toolbar */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-zinc-900/60 border-b border-zinc-800/80">
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setActiveTab('script')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'script'
                  ? 'bg-zinc-800 text-gold-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LuFileCode className="w-3.5 h-3.5" />
              <span>{result.fileName}</span>
            </button>
            <button
              onClick={() => setActiveTab('guide')}
              className={`flex items-center space-x-2 px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                activeTab === 'guide'
                  ? 'bg-zinc-800 text-gold-400 border border-zinc-700'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              <LuInfo className="w-3.5 h-3.5" />
              <span>Execution Guide</span>
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={handleCopy}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded bg-zinc-900 border border-zinc-700 text-zinc-200 hover:border-gold-500 hover:text-gold-400 transition-colors"
            >
              {copied ? <LuCheck className="w-3.5 h-3.5 text-green-400" /> : <LuCopy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Script'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded bg-gold-500 text-black font-semibold hover:bg-gold-400 transition-colors shadow-sm"
            >
              <LuDownload className="w-3.5 h-3.5" />
              <span>Download .py</span>
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 bg-black/60 font-mono text-xs">
          {activeTab === 'script' ? (
            <pre className="text-zinc-300 leading-relaxed whitespace-pre-wrap select-all font-mono">
              {result.script}
            </pre>
          ) : (
            <div className="space-y-4 font-sans text-xs text-zinc-300 max-w-2xl mx-auto py-2">
              <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold text-gold-400">Method 1: Unreal Editor GUI (Recommended)</h4>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>Click <strong className="text-white">Download .py</strong> above to save the automation file.</li>
                  <li>In your active Unreal Engine 5 editor window, click the top menu: <strong className="text-white">Tools &rarr; Execute Python Script...</strong></li>
                  <li>Pick the downloaded <code className="text-gold-400">{result.fileName}</code> file.</li>
                  <li>The Blueprint asset will be synthesized directly into your Content Browser under <code className="text-gold-400">/Game/Blueprints/</code>!</li>
                </ol>
              </div>

              <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold text-gold-400">Method 2: Unreal Engine Output Log</h4>
                <ol className="list-decimal list-inside space-y-1 text-zinc-300">
                  <li>Open the Unreal Engine Output Log: <strong className="text-white">Window &rarr; Output Log</strong>.</li>
                  <li>In the bottom command line input, click the language dropdown (defaults to <code className="text-zinc-400">Cmd</code>) and switch to <strong className="text-white">Python</strong>.</li>
                  <li>Click <strong className="text-white">Copy Script</strong> above, paste it into the console, and press Enter.</li>
                </ol>
              </div>

              <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
                <h4 className="text-sm font-semibold text-gold-400">Method 3: Unreal Headless Commandlet (CI / CD Pipelines)</h4>
                <div className="bg-black/80 p-2.5 rounded border border-zinc-800 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                  UnrealEditor-Cmd.exe &quot;C:\Projects\MyGame\MyGame.uproject&quot; -run=pythonscript -script=&quot;C:\path\to\{result.fileName}&quot;
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Metrics */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-noder-panel border-t border-zinc-800 text-[11px] text-zinc-400">
          <div>
            <span>Nodes: <strong className="text-zinc-200">{result.nodeCount}</strong></span>
            <span className="mx-2">&bull;</span>
            <span>Connections: <strong className="text-zinc-200">{result.connectionCount}</strong></span>
          </div>
          <div className="text-zinc-500 font-mono">
            Unreal Python API (unreal.AssetTools / unreal.EditorAssetLibrary)
          </div>
        </div>
      </div>
    </div>
  );
};

