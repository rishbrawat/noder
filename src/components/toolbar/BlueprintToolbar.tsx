import React, { useState } from 'react';
import {
  LuArrowLeft,
  LuCornerUpLeft,
  LuCircleCheck,
  LuTriangleAlert,
  LuLoader,
  LuCheck,
  LuPlay,
  LuFolderTree,
  LuActivity,
  LuHistory,
  LuChevronDown,
  LuCode,
  LuTerminal,
  LuRadio,
  LuWrench,
  LuMinimize2,
  LuGitCompare,
  LuClipboardPaste,
  LuDownload,
  LuClipboardCopy,
  LuUndo2,
  LuRedo2,
  LuSparkles,
  LuLayoutGrid,
  LuSave,
  LuMap,
  LuTrash2,
  LuKey,
  LuSun,
  LuMoon,
  LuSlidersHorizontal
} from 'react-icons/lu';

interface BlueprintToolbarProps {
  projectName?: string;
  onNavigateBack?: () => void;
  blueprintName: string;
  activeSubGraphName: string | null;
  onExitSubGraph: () => void;
  activeGraphType: string;
  onSwitchGraph: (graphType: any) => void;
  nodeCount: number;
  validation: {
    isValid: boolean;
    errorCount: number;
    warningCount: number;
    issues: Array<{ id: string; nodeTitle?: string; message: string; tip?: string }>;
  };
  isSaving: boolean;
  lastSavedAt: Date | null;
  isSimulating: boolean;
  onStartSimulation: () => void;
  onOpenMyBlueprint: () => void;
  profilerScore: number;
  onOpenProfiler: () => void;
  onOpenSnapshot: () => void;
  onOpenCpp: () => void;
  onOpenPython: () => void;
  onOpenT3D: () => void;
  onOpenRemoteBridge: () => void;
  onOpenRefactor: () => void;
  onCollapseToMacro: () => void;
  onOpenDiff: () => void;
  onImportUE5: () => void;
  onExportJSON: () => void;
  onCopyUE5: () => void;
  snapToGrid: boolean;
  onToggleSnapToGrid: () => void;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onFormatGraph: () => void;
  onAutoArrange: () => void;
  onSaveTemplate: () => void;
  showMiniMap: boolean;
  onToggleMiniMap: () => void;
  onClearCanvas: () => void;
  onOpenBYOK: () => void;
  theme: string;
  onToggleTheme: () => void;
  isDetailsOpen: boolean;
  onToggleDetails: () => void;
}

export const BlueprintToolbar: React.FC<BlueprintToolbarProps> = ({
  projectName,
  onNavigateBack,
  blueprintName,
  activeSubGraphName,
  onExitSubGraph,
  activeGraphType,
  onSwitchGraph,
  nodeCount,
  validation,
  isSaving,
  lastSavedAt,
  isSimulating,
  onStartSimulation,
  onOpenMyBlueprint,
  profilerScore,
  onOpenProfiler,
  onOpenSnapshot,
  onOpenCpp,
  onOpenPython,
  onOpenT3D,
  onOpenRemoteBridge,
  onOpenRefactor,
  onCollapseToMacro,
  onOpenDiff,
  onImportUE5,
  onExportJSON,
  onCopyUE5,
  snapToGrid,
  onToggleSnapToGrid,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onFormatGraph,
  onAutoArrange,
  onSaveTemplate,
  showMiniMap,
  onToggleMiniMap,
  onClearCanvas,
  onOpenBYOK,
  theme,
  onToggleTheme,
  isDetailsOpen,
  onToggleDetails,
}) => {
  const [showLintPopover, setShowLintPopover] = useState(false);
  const [isBridgesDropdownOpen, setIsBridgesDropdownOpen] = useState(false);

  return (
    <header className="h-12 border-b border-zinc-200 dark:border-zinc-800 bg-white/95 dark:bg-noder-dark/95 backdrop-blur px-3 flex items-center justify-between shrink-0 select-none z-20 shadow-sm">
      {/* Left: Breadcrumbs & Graph Tabs */}
      <div className="flex items-center space-x-2">
        {onNavigateBack && (
          <button
            onClick={onNavigateBack}
            className="p-1.5 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            title="Return to Workspaces"
          >
            <LuArrowLeft size={16} />
          </button>
        )}
        <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200 hidden sm:inline truncate max-w-[120px]">
          {projectName || 'Workspace'}
        </span>
        <span className="text-zinc-400 dark:text-zinc-600 hidden sm:inline">/</span>
        {activeSubGraphName ? (
          <div className="flex items-center space-x-1.5">
            <span className="text-xs font-mono font-bold text-cyan-400">
              {activeSubGraphName}
            </span>
            <button
              onClick={onExitSubGraph}
              className="flex items-center space-x-1 text-[10px] text-zinc-400 hover:text-white px-1.5 py-0.2 rounded bg-zinc-800 transition-colors"
              title="Return to Main EventGraph"
            >
              <LuCornerUpLeft size={11} />
              <span>Exit</span>
            </button>
          </div>
        ) : (
          <span className="text-xs font-mono font-medium text-gold-500 dark:text-gold-400 truncate max-w-[130px]">
            {blueprintName || 'MainGraph'}
          </span>
        )}

        {/* Sub-Graph Tabs */}
        <div className="flex items-center bg-zinc-100 dark:bg-black/50 rounded-md p-0.5 border border-zinc-200 dark:border-zinc-800 ml-1">
          <button
            onClick={() => onSwitchGraph('EventGraph')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeGraphType === 'EventGraph'
                ? 'bg-white dark:bg-zinc-800 text-gold-500 dark:text-gold-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>⚡ EventGraph</span>
            {activeGraphType === 'EventGraph' && (
              <span className="text-[10px] px-1 rounded bg-gold-500/10 font-mono text-gold-500">
                {nodeCount}
              </span>
            )}
          </button>
          <button
            onClick={() => onSwitchGraph('ConstructionScript')}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
              activeGraphType === 'ConstructionScript'
                ? 'bg-white dark:bg-zinc-800 text-green-500 dark:text-green-400 shadow-sm'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
          >
            <span>🛠️ Construction</span>
          </button>
        </div>

        {/* Graph Linter Diagnostic Pill */}
        <div className="relative">
          <button
            onClick={() => setShowLintPopover(!showLintPopover)}
            className={`flex items-center space-x-1 px-2 py-1 rounded text-[11px] font-mono border transition-colors ${
              validation.errorCount > 0
                ? 'border-red-500/40 bg-red-500/10 text-red-500'
                : validation.warningCount > 0
                ? 'border-gold-500/40 bg-gold-500/10 text-gold-500'
                : 'border-green-500/40 bg-green-500/10 text-green-500'
            }`}
            title="Blueprint Graph Linter (ueLint)"
          >
            {validation.isValid && validation.warningCount === 0 ? (
              <>
                <LuCircleCheck className="w-3.5 h-3.5 text-green-500" />
                <span className="hidden md:inline">Valid</span>
              </>
            ) : (
              <>
                <LuTriangleAlert className="w-3.5 h-3.5" />
                <span>{validation.warningCount}w</span>
              </>
            )}
          </button>

          {/* Lint Issues Dropdown */}
          {showLintPopover && (
            <div className="absolute top-8 left-0 w-72 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-3 z-50 text-xs animate-fade-in">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800 mb-2">
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">Graph Diagnostics</span>
                <button onClick={() => setShowLintPopover(false)} className="text-zinc-400 hover:text-zinc-600">×</button>
              </div>
              {validation.issues.length === 0 ? (
                <p className="text-green-600 dark:text-green-400 text-[11px]">All execution flow pins and node signatures are intact.</p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {validation.issues.map(iss => (
                    <div key={iss.id} className="p-1.5 rounded bg-zinc-50 dark:bg-zinc-900 border border-zinc-100 dark:border-zinc-800 text-[11px]">
                      <p className="font-medium text-zinc-800 dark:text-zinc-200">{iss.nodeTitle ? `${iss.nodeTitle}: ` : ''}{iss.message}</p>
                      {iss.tip && <p className="text-[10px] text-zinc-500 dark:text-zinc-400 mt-0.5">{iss.tip}</p>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Studio Tool Groups & Bridges */}
      <div className="flex items-center space-x-1.5 shrink-0">
        {/* Auto-Save Indicator */}
        <div className="mr-1 hidden xl:flex items-center space-x-1 text-[10px] font-mono text-zinc-500">
          {isSaving ? (
            <>
              <LuLoader className="w-3 h-3 animate-spin text-gold-500" />
              <span>Saving</span>
            </>
          ) : lastSavedAt ? (
            <>
              <LuCheck className="w-3 h-3 text-green-500" />
              <span>Saved</span>
            </>
          ) : null}
        </div>

        {/* Primary Simulation Button */}
        <button
          onClick={onStartSimulation}
          disabled={isSimulating}
          className={`flex items-center space-x-1.5 px-2.5 py-1 rounded border text-xs font-medium transition-colors ${
            isSimulating
              ? 'border-gold-500 bg-gold-500/20 text-gold-400 animate-pulse'
              : 'border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200'
          }`}
          title="Step-by-step visual execution simulator"
        >
          <LuPlay size={12} className="text-gold-500" />
          <span>{isSimulating ? 'Simulating...' : 'Simulate'}</span>
        </button>

        {/* My Blueprint / Variables */}
        <button
          onClick={onOpenMyBlueprint}
          className="flex items-center space-x-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
          title="Actor Variables (My Blueprint)"
        >
          <LuFolderTree size={13} className="text-gold-500" />
          <span className="hidden lg:inline">Variables</span>
        </button>

        {/* Performance Profiler */}
        <button
          onClick={onOpenProfiler}
          className={`flex items-center space-x-1 px-2 py-1 rounded border text-xs font-medium transition-colors ${
            profilerScore >= 80
              ? 'border-green-500/40 bg-green-500/10 text-green-500'
              : 'border-gold-500/40 bg-gold-500/10 text-gold-500'
          }`}
          title="Unreal Performance Profiler"
        >
          <LuActivity size={12} />
          <span>{profilerScore}</span>
        </button>

        {/* Snapshots History */}
        <button
          onClick={onOpenSnapshot}
          className="p-1.5 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 transition-colors"
          title="Blueprint Snapshot Revisions"
        >
          <LuHistory size={14} className="text-gold-500" />
        </button>

        {/* Bridges & Tools Dropdown */}
        <div className="relative">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setIsBridgesDropdownOpen(!isBridgesDropdownOpen);
            }}
            className="flex items-center space-x-1 px-2 py-1 rounded border border-zinc-300 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-900 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-800 dark:text-zinc-200 text-xs font-medium transition-colors"
            title="Unreal Engine Code & Clipboard Bridges"
          >
            <span>Bridges</span>
            <LuChevronDown size={12} className="text-zinc-400" />
          </button>

          {isBridgesDropdownOpen && (
            <div
              onClick={(e) => e.stopPropagation()}
              className="absolute right-0 top-8 w-52 bg-white dark:bg-noder-dark border border-zinc-200 dark:border-zinc-800 rounded-lg shadow-2xl p-1.5 z-50 text-xs animate-fade-in space-y-0.5"
            >
              <button
                onClick={() => {
                  onOpenCpp();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuCode className="w-3.5 h-3.5 text-green-500" />
                <span>Transpile to C++ (.h/.cpp)</span>
              </button>
              <button
                onClick={() => {
                  onOpenPython();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuTerminal className="w-3.5 h-3.5 text-gold-500" />
                <span>Python Script (.py)</span>
              </button>
              <button
                onClick={() => {
                  onOpenT3D();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuTerminal className="w-3.5 h-3.5 text-zinc-400" />
                <span>Inspect T3D ASCII</span>
              </button>
              <button
                onClick={() => {
                  onOpenRemoteBridge();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuRadio className="w-3.5 h-3.5 text-green-500" />
                <span>Live UE5 Remote Bridge</span>
              </button>
              <button
                onClick={() => {
                  onOpenRefactor();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuWrench className="w-3.5 h-3.5 text-gold-500" />
                <span>Refactor & Clean Graph</span>
              </button>
              <button
                onClick={() => {
                  onCollapseToMacro();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuMinimize2 className="w-3.5 h-3.5 text-gold-500" />
                <span>Collapse to Macro (Ctrl+G)</span>
              </button>
              <button
                onClick={() => {
                  onOpenDiff();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuGitCompare className="w-3.5 h-3.5 text-gold-500" />
                <span>Visual Graph Diff</span>
              </button>
              <div className="h-[1px] bg-zinc-200 dark:bg-zinc-800 my-1" />
              <button
                onClick={() => {
                  onImportUE5();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuClipboardPaste className="w-3.5 h-3.5 text-gold-500" />
                <span>Paste / Import from UE5</span>
              </button>
              <button
                onClick={() => {
                  onExportJSON();
                  setIsBridgesDropdownOpen(false);
                }}
                className="w-full flex items-center space-x-2 px-2.5 py-1.5 rounded hover:bg-zinc-100 dark:hover:bg-zinc-800 text-left text-zinc-800 dark:text-zinc-200 transition-colors"
              >
                <LuDownload className="w-3.5 h-3.5 text-zinc-400" />
                <span>Export Graph JSON</span>
              </button>
            </div>
          )}
        </div>

        {/* Quick Action: Copy for UE5 */}
        <button
          onClick={onCopyUE5}
          className="flex items-center space-x-1.5 px-3 py-1 rounded bg-gold-500 hover:bg-gold-400 text-black text-xs font-semibold shadow-sm transition-all shrink-0 cursor-pointer"
          title="Copy to clipboard for Ctrl+V paste into Unreal Engine 5"
        >
          <LuClipboardCopy size={13} />
          <span>Copy UE5</span>
        </button>

        <div className="h-4 w-[1px] bg-zinc-300 dark:bg-zinc-800 mx-0.5" />

        {/* Utilities: Grid, Save, Clear, MiniMap, Theme */}
        <button
          onClick={onToggleSnapToGrid}
          className={`px-1.5 py-0.5 rounded text-[10px] font-mono border transition-colors cursor-pointer ${
            snapToGrid
              ? 'border-gold-500/50 bg-gold-500/15 text-gold-400 font-semibold shadow-sm'
              : 'border-zinc-300 dark:border-zinc-700 text-zinc-400 hover:text-zinc-200'
          }`}
          title="Toggle Unreal Engine Snap to Grid (16px)"
        >
          16px
        </button>
        {/* Undo / Redo */}
        <button
          onClick={onUndo}
          disabled={!canUndo}
          className={`p-1 rounded transition-colors ${
            canUndo
              ? 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
              : 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <LuUndo2 size={14} />
        </button>
        <button
          onClick={onRedo}
          disabled={!canRedo}
          className={`p-1 rounded transition-colors ${
            canRedo
              ? 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer'
              : 'text-zinc-300 dark:text-zinc-700 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <LuRedo2 size={14} />
        </button>
        <div className="h-3 w-[1px] bg-zinc-300 dark:bg-zinc-800 mx-0.5" />
        <button
          onClick={onFormatGraph}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Epic Format Graph Layout (Shift+F)"
        >
          <LuSparkles size={14} className="text-gold-500" />
        </button>
        <button
          onClick={onAutoArrange}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Auto-arrange Grid Layout"
        >
          <LuLayoutGrid size={14} />
        </button>
        <button
          onClick={onSaveTemplate}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Save as Template"
        >
          <LuSave size={14} />
        </button>
        <button
          onClick={onToggleMiniMap}
          className={`p-1 rounded transition-colors cursor-pointer ${
            showMiniMap
              ? 'bg-gold-500/10 text-gold-500'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title="Toggle MiniMap Navigator"
        >
          <LuMap size={14} />
        </button>
        <button
          onClick={onClearCanvas}
          className="p-1 rounded text-zinc-400 hover:text-red-500 hover:bg-red-500/10 transition-colors cursor-pointer"
          title="Clear Canvas"
        >
          <LuTrash2 size={14} />
        </button>
        <button
          onClick={onOpenBYOK}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Personal Gemini API Key (BYOK) - Unlimited Quota"
        >
          <LuKey size={14} className={typeof localStorage !== 'undefined' && localStorage.getItem('noder_byok_gemini_key') ? 'text-green-500' : 'text-gold-500'} />
        </button>
        <button
          onClick={onToggleTheme}
          className="p-1 rounded text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Toggle Theme"
        >
          {theme === 'dark' ? <LuSun size={14} className="text-gold-400" /> : <LuMoon size={14} />}
        </button>

        {/* Details Panel Toggle Button in Toolbar */}
        <button
          onClick={onToggleDetails}
          className={`p-1.5 rounded transition-colors cursor-pointer ${
            isDetailsOpen
              ? 'bg-gold-500/20 text-gold-400 border border-gold-500/40 shadow-sm'
              : 'text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-transparent'
          }`}
          title="Toggle Node & Graph Details Panel"
        >
          <LuSlidersHorizontal size={14} />
        </button>
      </div>
    </header>
  );
};
