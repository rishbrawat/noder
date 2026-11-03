import React from 'react';
import { LuX, LuFlame, LuShieldAlert, LuActivity } from 'react-icons/lu';
import { PerformanceAuditResult } from '../../types/BlueprintTypes';

interface BlueprintProfilerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audit: PerformanceAuditResult;
  isHeatmapActive: boolean;
  onToggleHeatmap: () => void;
}

export const BlueprintProfilerModal: React.FC<BlueprintProfilerModalProps> = ({
  isOpen,
  onClose,
  audit,
  isHeatmapActive,
  onToggleHeatmap,
}) => {
  if (!isOpen) return null;

  const scoreColor =
    audit.overallScore >= 80
      ? 'text-green-500'
      : audit.overallScore >= 60
      ? 'text-gold-400'
      : 'text-red-500';

  const badgeBg =
    audit.overallScore >= 80
      ? 'bg-green-500/10 border-green-500/30 text-green-400'
      : audit.overallScore >= 60
      ? 'bg-gold-500/10 border-gold-500/30 text-gold-400'
      : 'bg-red-500/10 border-red-500/30 text-red-400';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in font-sans">
      <div className="relative w-full max-w-3xl max-h-[85vh] flex flex-col bg-noder-dark border border-zinc-800 rounded-lg shadow-2xl overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-noder-panel border-b border-zinc-800">
          <div className="flex items-center space-x-3">
            <div className="p-1.5 rounded bg-zinc-900 border border-zinc-800 text-gold-400">
              <LuActivity className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="text-sm font-semibold tracking-wide text-zinc-100">
                  Unreal Engine 5 Blueprint Performance Profiler
                </span>
                <span className={`px-2 py-0.5 text-[10px] uppercase font-mono tracking-wider border rounded ${badgeBg}`}>
                  {audit.verdict}
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 font-mono">
                Game Thread CPU Frametime Audit & Technical Artist Guidelines
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

        {/* Overview Stats Bar */}
        <div className="grid grid-cols-4 gap-3 p-4 bg-zinc-900/50 border-b border-zinc-800 text-center">
          <div className="p-2.5 rounded bg-black/40 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Score</div>
            <div className={`text-2xl font-bold font-mono ${scoreColor}`}>
              {audit.overallScore}<span className="text-xs text-zinc-500">/100</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/40 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Est. Frame Time</div>
            <div className="text-2xl font-bold font-mono text-zinc-100">
              {audit.estimatedFrameCostMs} <span className="text-xs text-zinc-500">ms</span>
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/40 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Tick Invocations</div>
            <div className={`text-2xl font-bold font-mono ${audit.tickNodeCount > 0 ? 'text-red-400' : 'text-green-400'}`}>
              {audit.tickNodeCount}
            </div>
          </div>

          <div className="p-2.5 rounded bg-black/40 border border-zinc-800/80">
            <div className="text-[11px] text-zinc-400 uppercase font-mono">Pure Math Nodes</div>
            <div className="text-2xl font-bold font-mono text-gold-400">
              {audit.pureMathCount}
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Action Recommendations */}
          <div className="p-3.5 rounded bg-zinc-900 border border-zinc-800 space-y-2">
            <div className="flex items-center space-x-2 text-xs font-semibold text-gold-400">
              <LuShieldAlert className="w-4 h-4" />
              <span>Architectural Recommendations</span>
            </div>
            <ul className="space-y-1.5 text-xs text-zinc-300">
              {audit.recommendations.map((rec, i) => (
                <li key={i} className="flex items-start space-x-2">
                  <span className="text-gold-500 font-bold">&bull;</span>
                  <span>{rec}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Node Audit Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-300 uppercase tracking-wider font-mono">
                Node Execution Breakdown ({audit.nodeAudits.length})
              </span>
              <button
                onClick={onToggleHeatmap}
                className={`flex items-center space-x-1.5 px-2.5 py-1 text-xs rounded font-medium border transition-colors ${
                  isHeatmapActive
                    ? 'bg-gold-500 text-black border-gold-400 font-semibold'
                    : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:text-white'
                }`}
              >
                <LuFlame className="w-3.5 h-3.5" />
                <span>{isHeatmapActive ? 'Heatmap: Active' : 'Enable Canvas Heatmap'}</span>
              </button>
            </div>

            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {audit.nodeAudits.map((item) => {
                const sevBadge =
                  item.severity === 'critical'
                    ? 'border-red-500/40 bg-red-500/10 text-red-400'
                    : item.severity === 'moderate'
                    ? 'border-gold-500/40 bg-gold-500/10 text-gold-400'
                    : 'border-green-500/40 bg-green-500/10 text-green-400';

                return (
                  <div
                    key={item.nodeId}
                    className="p-2.5 rounded bg-zinc-900/80 border border-zinc-800/80 flex items-start justify-between text-xs hover:border-zinc-700 transition-colors"
                  >
                    <div className="space-y-0.5 max-w-lg">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-zinc-200">{item.nodeTitle}</span>
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-mono border uppercase ${sevBadge}`}>
                          {item.severity}
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-400">{item.reason}</p>
                      {item.recommendation && (
                        <p className="text-[10px] text-gold-400/90 italic font-sans">
                          Tip: {item.recommendation}
                        </p>
                      )}
                    </div>

                    <div className="text-right shrink-0 font-mono text-[11px] text-zinc-400">
                      Cost: <strong className="text-zinc-200">{item.costScore}/10</strong>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-noder-panel border-t border-zinc-800 text-[11px] text-zinc-400">
          <span>Based on Epic Games Unreal Engine 5 Performance & Optimization Guide</span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
