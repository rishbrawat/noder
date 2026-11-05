import React from 'react';
import { Node, Edge } from 'reactflow';
import { NodeData, BlueprintSnapshot, PerformanceAuditResult } from '../../types/BlueprintTypes';
import { T3DInspectorModal } from './T3DInspectorModal';
import { CppTranspilerModal } from './CppTranspilerModal';
import { PythonScriptModal } from './PythonScriptModal';
import { BlueprintProfilerModal } from './BlueprintProfilerModal';
import { SnapshotModal } from './SnapshotModal';
import { DiffModal } from './DiffModal';
import { RemoteBridgeModal } from './RemoteBridgeModal';
import { RefactorModal } from './RefactorModal';
import { BYOKModal } from './BYOKModal';

interface EditorModalsProps {
  nodes: Node<NodeData>[];
  edges: Edge[];
  blueprintName: string;
  compiledT3D: { t3dText: string; nodeCount: number; connectionCount: number };
  savedSnapshots: BlueprintSnapshot[];
  profilerAudit: PerformanceAuditResult;
  isHeatmapActive: boolean;

  // Modal open states
  isT3DModalOpen: boolean;
  setIsT3DModalOpen: (open: boolean) => void;
  isCppModalOpen: boolean;
  setIsCppModalOpen: (open: boolean) => void;
  isPythonModalOpen: boolean;
  setIsPythonModalOpen: (open: boolean) => void;
  isProfilerOpen: boolean;
  setIsProfilerOpen: (open: boolean) => void;
  isSnapshotOpen: boolean;
  setIsSnapshotOpen: (open: boolean) => void;
  isDiffOpen: boolean;
  setIsDiffOpen: (open: boolean) => void;
  isRemoteBridgeOpen: boolean;
  setIsRemoteBridgeOpen: (open: boolean) => void;
  isRefactorOpen: boolean;
  setIsRefactorOpen: (open: boolean) => void;
  isBYOKOpen: boolean;
  setIsBYOKOpen: (open: boolean) => void;

  // Handlers
  onToggleHeatmap: () => void;
  onRestoreSnapshot: (nodes: Node<NodeData>[], edges: Edge[]) => void;
  onApplyRefactor: (nodes: Node<NodeData>[], edges: Edge[]) => void;
}

export const EditorModals: React.FC<EditorModalsProps> = ({
  nodes,
  edges,
  blueprintName,
  compiledT3D,
  savedSnapshots,
  profilerAudit,
  isHeatmapActive,
  isT3DModalOpen,
  setIsT3DModalOpen,
  isCppModalOpen,
  setIsCppModalOpen,
  isPythonModalOpen,
  setIsPythonModalOpen,
  isProfilerOpen,
  setIsProfilerOpen,
  isSnapshotOpen,
  setIsSnapshotOpen,
  isDiffOpen,
  setIsDiffOpen,
  isRemoteBridgeOpen,
  setIsRemoteBridgeOpen,
  isRefactorOpen,
  setIsRefactorOpen,
  isBYOKOpen,
  setIsBYOKOpen,
  onToggleHeatmap,
  onRestoreSnapshot,
  onApplyRefactor,
}) => {
  return (
    <>
      {/* T3D Live Inspector Modal */}
      <T3DInspectorModal
        isOpen={isT3DModalOpen}
        onClose={() => setIsT3DModalOpen(false)}
        t3dContent={compiledT3D.t3dText}
        nodeCount={compiledT3D.nodeCount}
        connectionCount={compiledT3D.connectionCount}
      />

      {/* C++ Transpiler Modal */}
      <CppTranspilerModal
        isOpen={isCppModalOpen}
        onClose={() => setIsCppModalOpen(false)}
        blueprintName={blueprintName}
        targetClass="Character"
        nodes={nodes}
        edges={edges}
      />

      {/* Python Automation Script Modal */}
      <PythonScriptModal
        isOpen={isPythonModalOpen}
        onClose={() => setIsPythonModalOpen(false)}
        blueprintName={blueprintName}
        targetClass="Character"
        nodes={nodes}
        edges={edges}
      />

      {/* Blueprint Performance Profiler Modal */}
      <BlueprintProfilerModal
        isOpen={isProfilerOpen}
        onClose={() => setIsProfilerOpen(false)}
        audit={profilerAudit}
        isHeatmapActive={isHeatmapActive}
        onToggleHeatmap={onToggleHeatmap}
        onOpenRefactor={() => setIsRefactorOpen(true)}
      />

      {/* Snapshot & Revisions History Modal */}
      <SnapshotModal
        isOpen={isSnapshotOpen}
        onClose={() => setIsSnapshotOpen(false)}
        blueprintName={blueprintName}
        nodes={nodes}
        edges={edges}
        onRestoreSnapshot={onRestoreSnapshot}
        onOpenDiff={() => {
          setIsSnapshotOpen(false);
          setIsDiffOpen(true);
        }}
      />

      {/* Visual Graph Diff Modal */}
      <DiffModal
        isOpen={isDiffOpen}
        onClose={() => setIsDiffOpen(false)}
        currentNodes={nodes}
        currentEdges={edges}
        snapshots={savedSnapshots}
        onRollback={onRestoreSnapshot}
      />

      {/* Unreal Engine 5 Live Remote Execution Bridge Modal */}
      <RemoteBridgeModal
        isOpen={isRemoteBridgeOpen}
        onClose={() => setIsRemoteBridgeOpen(false)}
        blueprintName={blueprintName || 'MainGraph'}
        targetClass="Character"
        nodes={nodes}
        edges={edges}
      />

      {/* Blueprint Refactoring & Code Optimizer Modal */}
      <RefactorModal
        isOpen={isRefactorOpen}
        onClose={() => setIsRefactorOpen(false)}
        nodes={nodes}
        edges={edges}
        onApplyRefactor={onApplyRefactor}
      />

      {/* Bring Your Own Key (BYOK) Modal */}
      <BYOKModal
        isOpen={isBYOKOpen}
        onClose={() => setIsBYOKOpen(false)}
      />
    </>
  );
};
