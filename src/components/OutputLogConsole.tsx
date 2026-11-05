import React, { useState } from 'react';
import { LuTerminal, LuPlay, LuSquare, LuTrash2, LuChevronUp, LuChevronDown, LuStepForward, LuPause, LuVolume2, LuVolumeX } from 'react-icons/lu';
import { SimLogEntry } from '../utils/blueprintSimulator';

interface OutputLogConsoleProps {
  logs: SimLogEntry[];
  isSimulating: boolean;
  isPaused?: boolean;
  isAudioMuted?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: (expanded: boolean) => void;
  onToggleMute?: () => void;
  onStartSimulation: () => void;
  onStopSimulation: () => void;
  onResumeSimulation?: () => void;
  onStepForward?: () => void;
  onClearLogs: () => void;
}

export const OutputLogConsole: React.FC<OutputLogConsoleProps> = ({
  logs,
  isSimulating,
  isPaused,
  isAudioMuted,
  isExpanded: controlledExpanded,
  onToggleExpand,
  onToggleMute,
  onStartSimulation,
  onStopSimulation,
  onResumeSimulation,
  onStepForward,
  onClearLogs,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggle = () => {
    const next = !isExpanded;
    if (onToggleExpand) {
      onToggleExpand(next);
    } else {
      setInternalExpanded(next);
    }
  };
  const [filter, setFilter] = useState<'all' | 'ai' | 'compiler' | 'exec' | 'data'>('all');

  const filteredLogs = logs.filter(l => {
    if (filter === 'ai') return l.type === 'ai';
    if (filter === 'compiler') return l.type === 'compiler';
    if (filter === 'exec') return l.type === 'exec';
    if (filter === 'data') return l.type === 'data';
    return true;
  });

  return (
    <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-200 font-mono select-none ${
      isExpanded ? 'h-64' : 'h-8'
    } bg-black/95 border-t border-zinc-800 text-zinc-300 shadow-2xl flex flex-col`}>
      {/* Console Bar Header */}
      <div className="h-8 px-4 flex items-center justify-between bg-noder-dark border-b border-zinc-900 shrink-0 text-xs">
        <div className="flex items-center space-x-3">
          <button
            onClick={handleToggle}
            className="flex items-center space-x-1.5 text-zinc-400 hover:text-white transition-colors"
          >
            <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
            <span className="font-semibold tracking-wide uppercase text-[10px]">Output Log</span>
            {isExpanded ? <LuChevronDown className="w-3.5 h-3.5" /> : <LuChevronUp className="w-3.5 h-3.5" />}
          </button>

          <span className="text-zinc-700">|</span>

          {onToggleMute && (
            <button
              onClick={onToggleMute}
              className={`p-1 rounded transition-colors ${
                isAudioMuted ? 'text-zinc-600 hover:text-zinc-400' : 'text-gold-400 hover:text-gold-300'
              }`}
              title={isAudioMuted ? 'Audio Synthesizer: Muted' : 'Audio Synthesizer: Active'}
            >
              {isAudioMuted ? <LuVolumeX size={13} /> : <LuVolume2 size={13} />}
            </button>
          )}

          {/* Simulation Controls */}
          {isSimulating ? (
            <div className="flex items-center space-x-1.5">
              <button
                onClick={onStopSimulation}
                className="flex items-center space-x-1 px-2 py-0.5 rounded bg-red-600/20 text-red-400 border border-red-600/40 hover:bg-red-600/30 text-[10px] transition-colors"
                title="Stop execution trace"
              >
                <LuSquare className="w-3 h-3" />
                <span>Stop</span>
              </button>

              {isPaused ? (
                <>
                  <button
                    onClick={onResumeSimulation}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-green-500/20 text-green-400 border border-green-500/40 hover:bg-green-500/30 text-[10px] transition-colors"
                    title="Resume simulation (F5)"
                  >
                    <LuPlay className="w-3 h-3 text-green-400" />
                    <span>Resume (F5)</span>
                  </button>
                  <button
                    onClick={onStepForward}
                    className="flex items-center space-x-1 px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/40 hover:bg-gold-500/30 text-[10px] transition-colors"
                    title="Step forward one node (F10)"
                  >
                    <LuStepForward className="w-3 h-3 text-gold-400" />
                    <span>Step (F10)</span>
                  </button>
                  <span className="text-[10px] text-red-400 flex items-center gap-1 font-mono">
                    <LuPause className="w-3 h-3" />
                    [BREAKPOINT PAUSED]
                  </span>
                </>
              ) : (
                <span className="text-[10px] text-gold-400 animate-pulse font-mono">
                  [Executing Trace...]
                </span>
              )}
            </div>
          ) : (
            <button
              onClick={onStartSimulation}
              className="flex items-center space-x-1 px-2 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/40 hover:bg-gold-500/30 text-[10px] transition-colors"
            >
              <LuPlay className="w-3 h-3" />
              <span>▶ Simulate Graph</span>
            </button>
          )}
        </div>

        {/* Filter Pills & Actions */}
        {isExpanded && (
          <div className="flex items-center space-x-2 text-[10px]">
            <span className="text-zinc-500">Filter:</span>
            <button
              onClick={() => setFilter('all')}
              className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'all' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              All ({logs.length})
            </button>
            <button
              onClick={() => setFilter('ai')}
              className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'ai' ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40' : 'text-zinc-500 hover:text-gold-300'}`}
            >
              AI Plan
            </button>
            <button
              onClick={() => setFilter('compiler')}
              className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'compiler' ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40' : 'text-zinc-500 hover:text-sky-300'}`}
            >
              Compiler
            </button>
            <button
              onClick={() => setFilter('exec')}
              className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'exec' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Exec
            </button>
            <button
              onClick={() => setFilter('data')}
              className={`px-1.5 py-0.5 rounded transition-colors ${filter === 'data' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Data
            </button>
            <span className="text-zinc-700">|</span>
            <button
              onClick={onClearLogs}
              className="p-1 text-zinc-500 hover:text-red-400 transition-colors"
              title="Clear Log"
            >
              <LuTrash2 className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>

      {/* Expanded Logs Terminal Viewport */}
      {isExpanded && (
        <div className="flex-1 overflow-y-auto p-3 text-[11px] leading-relaxed space-y-1 select-text bg-black/90">
          {filteredLogs.length === 0 ? (
            <div className="text-zinc-600 text-center py-6 text-xs">
              No log messages yet. Click <strong>"▶ Simulate Graph"</strong> to trace execution.
            </div>
          ) : (
            filteredLogs.map(l => (
              <div key={l.id} className="flex items-start space-x-2">
                <span className="text-zinc-600 shrink-0 text-[10px]">{l.timestamp}</span>
                <span className={`flex-1 break-words ${
                  l.type === 'ai'
                    ? 'text-gold-400 font-medium'
                    : l.type === 'compiler'
                    ? 'text-sky-400'
                    : l.type === 'exec'
                    ? 'text-gold-300 font-semibold'
                    : l.type === 'data'
                    ? 'text-green-400'
                    : l.type === 'warn'
                    ? 'text-red-400'
                    : l.type === 'success'
                    ? 'text-emerald-400 font-semibold'
                    : 'text-zinc-400'
                }`}>
                  {l.message}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

