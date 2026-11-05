import React, { useState, useEffect, useCallback } from 'react';
import { 
  LuRadio, 
  LuTerminal, 
  LuCopy, 
  LuCheck, 
  LuExternalLink, 
  LuSend, 
  LuZap, 
  LuRefreshCw, 
  LuCircleCheck, 
  LuCircleAlert 
} from 'react-icons/lu';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { generateUE5PythonScript } from '../../utils/uePythonGenerator';
import { compileGraphToT3D } from '../../utils/ueT3DCompiler';
import { blueprintAudio } from '../../utils/blueprintAudio';
import { toast } from 'react-hot-toast';

interface RemoteBridgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  blueprintName: string;
  targetClass: string;
  nodes: Node<NodeData>[];
  edges: Edge[];
}

interface BridgeDiagnostics {
  status: string;
  engine: string;
  version: string;
  unrealDetected: boolean;
  port: number;
}

export const RemoteBridgeModal: React.FC<RemoteBridgeModalProps> = ({
  isOpen,
  onClose,
  blueprintName,
  targetClass,
  nodes,
  edges,
}) => {
  const [activeTab, setActiveTab] = useState<'direct8080' | 'headless'>('direct8080');
  
  // Port 8080 Live Bridge State
  const [bridgeStatus, setBridgeStatus] = useState<'checking' | 'connected' | 'offline'>('checking');
  const [bridgeInfo, setBridgeInfo] = useState<BridgeDiagnostics | null>(null);
  const [isPushing8080, setIsPushing8080] = useState(false);
  const [hasPushed8080, setHasPushed8080] = useState(false);
  const [copiedPyCommand, setCopiedPyCommand] = useState(false);

  // Flask Bridge State
  const [isSyncingFlask, setIsSyncingFlask] = useState(false);
  const [hasSyncedFlask, setHasSyncedFlask] = useState(false);
  const [copiedFlaskCmd, setCopiedFlaskCmd] = useState(false);

  const uePyPath = 'd:/noder/unreal/NoderBridge.py';
  const ueLaunchCmd = `py "${uePyPath}"`;
  const liveFlaskCommand = `py "import urllib.request; exec(urllib.request.urlopen('http://localhost:5000/api/ue5/live_script').read().decode('utf-8'))"`;

  // Poll 127.0.0.1:8080 for bridge status
  const checkBridgeHealth = useCallback(async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 1200);

      const res = await fetch('http://127.0.0.1:8080/status', {
        method: 'GET',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        setBridgeInfo(data);
        setBridgeStatus('connected');
      } else {
        setBridgeStatus('offline');
        setBridgeInfo(null);
      }
    } catch {
      setBridgeStatus('offline');
      setBridgeInfo(null);
    }
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    setBridgeStatus('checking');
    checkBridgeHealth();

    const interval = setInterval(checkBridgeHealth, 3000);
    return () => clearInterval(interval);
  }, [isOpen, checkBridgeHealth]);

  // Push directly to Unreal Engine via Port 8080 HTTP server
  const handlePushToUnreal8080 = async () => {
    try {
      setIsPushing8080(true);
      const compiled = compileGraphToT3D(nodes, edges);

      const res = await fetch('http://127.0.0.1:8080/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          t3d: compiled.t3dText,
          name: blueprintName || 'BP_Graph',
          targetClass: targetClass || 'Actor',
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      setHasPushed8080(true);
      blueprintAudio.playSuccessChime();
      toast.success(data.message || 'Synced to Unreal Engine! Press Ctrl+V in your Blueprint graph.', {
        duration: 4000,
        icon: '⚡',
      });
    } catch (e: any) {
      console.error('Error pushing to Unreal 8080 bridge:', e);
      toast.error('Failed to communicate with NoderBridge. Ensure NoderBridge.py is running on port 8080.');
    } finally {
      setIsPushing8080(false);
    }
  };

  // Push headless script to Flask server
  const handleSyncToFlask = async () => {
    try {
      setIsSyncingFlask(true);
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

      setHasSyncedFlask(true);
      toast.success('Live payload synced! Ready to execute in Unreal Engine 5.');
    } catch (e: any) {
      console.error('Remote sync error:', e);
      toast.error('Failed to sync to live bridge. Ensure Flask server is running.');
    } finally {
      setIsSyncingFlask(false);
    }
  };

  const copyToClipboard = (text: string, setCopied: (v: boolean) => void) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success('Copied to clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 font-sans select-none animate-fade-in">
      <div className="bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-2xl max-w-2xl w-full flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-black/40 shrink-0">
          <div className="flex items-center space-x-2.5">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center border transition-colors ${
              bridgeStatus === 'connected'
                ? 'bg-green-500/10 border-green-500/30'
                : 'bg-gold-500/10 border-gold-500/30'
            }`}>
              <LuRadio className={`w-4 h-4 ${
                bridgeStatus === 'connected' ? 'text-green-500 animate-pulse' : 'text-gold-500'
              }`} />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Unreal Engine 5 Live Remote Bridge
                {bridgeStatus === 'connected' ? (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-mono bg-green-500/20 text-green-500 border border-green-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-ping inline-block mr-0.5" />
                    LIVE (Port 8080)
                  </span>
                ) : bridgeStatus === 'checking' ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-zinc-500/20 text-zinc-400 border border-zinc-500/30">
                    Probing...
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-amber-500/20 text-amber-500 border border-amber-500/30">
                    Bridge Offline
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                Direct headless asset creation & clipboard injection inside Unreal Engine 5
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

        {/* Tab Selector */}
        <div className="flex border-b border-zinc-200 dark:border-zinc-800 bg-zinc-100/60 dark:bg-zinc-900/40 text-xs px-5 pt-2 gap-4">
          <button
            onClick={() => setActiveTab('direct8080')}
            className={`pb-2 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'direct8080'
                ? 'border-gold-500 text-zinc-900 dark:text-white font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <LuZap size={13} className={bridgeStatus === 'connected' ? 'text-green-500' : 'text-gold-500'} />
            <span>Direct HTTP Bridge (Port 8080)</span>
          </button>
          <button
            onClick={() => setActiveTab('headless')}
            className={`pb-2 font-medium flex items-center gap-1.5 border-b-2 transition-colors ${
              activeTab === 'headless'
                ? 'border-gold-500 text-zinc-900 dark:text-white font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'
            }`}
          >
            <LuTerminal size={13} className="text-zinc-400" />
            <span>Headless Python Script (Flask)</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 text-xs overflow-y-auto max-h-[70vh]">
          {activeTab === 'direct8080' ? (
            <>
              {/* Connection Status Card */}
              <div className={`p-3.5 rounded-lg border flex items-center justify-between ${
                bridgeStatus === 'connected'
                  ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300'
                  : 'bg-zinc-50 dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
              }`}>
                <div className="flex items-center gap-2.5">
                  {bridgeStatus === 'connected' ? (
                    <LuCircleCheck className="w-5 h-5 text-green-500 shrink-0" />
                  ) : (
                    <LuCircleAlert className="w-5 h-5 text-amber-500 shrink-0" />
                  )}
                  <div>
                    <span className="font-semibold block text-zinc-900 dark:text-zinc-100">
                      {bridgeStatus === 'connected'
                        ? `Connected to ${bridgeInfo?.engine || 'Unreal Engine'} (${bridgeInfo?.version || '5.x'})`
                        : 'Unreal Engine Bridge Not Running'}
                    </span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      {bridgeStatus === 'connected'
                        ? 'Ready for instant 1-click graph transfer directly into your active Unreal Editor.'
                        : 'Run NoderBridge.py in Unreal Engine Output Log or start the script in terminal.'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={checkBridgeHealth}
                  className="p-1.5 rounded hover:bg-zinc-200 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
                  title="Refresh Connection"
                >
                  <LuRefreshCw size={13} />
                </button>
              </div>

              {/* Action: 1-Click Push to Unreal */}
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Instant Graph Push
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Compiles {nodes.length} nodes into Unreal T3D and broadcasts to port 8080.
                  </p>
                </div>
                <button
                  onClick={handlePushToUnreal8080}
                  disabled={isPushing8080 || bridgeStatus !== 'connected'}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all ${
                    bridgeStatus !== 'connected'
                      ? 'bg-zinc-300 dark:bg-zinc-800 text-zinc-500 cursor-not-allowed'
                      : hasPushed8080
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-gold-500 text-black hover:bg-gold-400'
                  }`}
                >
                  {hasPushed8080 ? <LuCheck size={14} /> : <LuZap size={14} />}
                  <span>
                    {isPushing8080 ? 'Injecting...' : hasPushed8080 ? 'Pushed! (Ctrl+V in UE)' : 'Push to Unreal Engine'}
                  </span>
                </button>
              </div>

              {/* Quick Launch Instruction Box */}
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
                    How to start NoderBridge inside Unreal Engine 5:
                  </span>
                  <button
                    onClick={() => copyToClipboard(ueLaunchCmd, setCopiedPyCommand)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors text-[11px]"
                  >
                    {copiedPyCommand ? <LuCheck size={12} className="text-green-500" /> : <LuCopy size={12} />}
                    <span>{copiedPyCommand ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded bg-black border border-zinc-800 font-mono text-[11px] text-green-400 break-all select-all">
                  {ueLaunchCmd}
                </div>

                <ol className="list-decimal list-inside space-y-1 text-[11px] text-zinc-500 dark:text-zinc-400 pt-1">
                  <li>In Unreal Engine, open <strong>Window &rarr; Output Log</strong> (or press <kbd className="px-1 rounded bg-black text-white font-mono">`</kbd>).</li>
                  <li>Ensure the input dropdown is set to <strong>Cmd / Python</strong>.</li>
                  <li>Paste the command above and press Enter. The status above will instantly switch to <strong>LIVE</strong>!</li>
                </ol>
              </div>
            </>
          ) : (
            <>
              {/* Headless Flask Mode */}
              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block">
                    Step 1: Broadcast Graph to Flask Server
                  </span>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Pushes full Python creation script to the local Flask server at http://localhost:5000.
                  </p>
                </div>
                <button
                  onClick={handleSyncToFlask}
                  disabled={isSyncingFlask}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded text-xs font-semibold shadow-sm transition-all ${
                    hasSyncedFlask
                      ? 'bg-green-600 text-white hover:bg-green-500'
                      : 'bg-gold-500 text-black hover:bg-gold-400'
                  }`}
                >
                  {hasSyncedFlask ? <LuCheck size={14} /> : <LuSend size={14} />}
                  <span>{isSyncingFlask ? 'Syncing...' : hasSyncedFlask ? 'Synced & Ready' : 'Sync Graph'}</span>
                </button>
              </div>

              <div className="p-4 rounded-lg bg-zinc-50 dark:bg-zinc-900/60 border border-zinc-200 dark:border-zinc-800 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                    <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
                    Step 2: Execute Headless Generator in UE5 Output Log
                  </span>
                  <button
                    onClick={() => copyToClipboard(liveFlaskCommand, setCopiedFlaskCmd)}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded bg-zinc-200 dark:bg-zinc-800 hover:bg-zinc-300 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 transition-colors text-[11px]"
                  >
                    {copiedFlaskCmd ? <LuCheck size={12} className="text-green-500" /> : <LuCopy size={12} />}
                    <span>{copiedFlaskCmd ? 'Copied!' : 'Copy Command'}</span>
                  </button>
                </div>

                <div className="p-2.5 rounded bg-black border border-zinc-800 font-mono text-[11px] text-green-400 break-all select-all">
                  {liveFlaskCommand}
                </div>
              </div>
            </>
          )}

          {/* Guide Note */}
          <div className="p-3.5 rounded-lg bg-gold-500/10 border border-gold-500/20 text-zinc-700 dark:text-zinc-300 space-y-1.5 text-[11px]">
            <p className="font-semibold text-gold-500 uppercase font-mono tracking-wider text-[10px]">
              Tip: Automatic Startup with init_unreal.py
            </p>
            <p className="text-zinc-600 dark:text-zinc-400">
              To have NoderBridge automatically start whenever you launch your Unreal Engine project, add{' '}
              <code className="text-gold-400 bg-black/40 px-1 py-0.5 rounded font-mono">import NoderBridge; NoderBridge.start_server()</code>{' '}
              to your project's <code className="text-zinc-300 bg-black/40 px-1 py-0.5 rounded font-mono">Content/Python/init_unreal.py</code>.
            </p>
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
