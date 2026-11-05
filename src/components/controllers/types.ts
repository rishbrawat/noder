import React from 'react';
import { SimStep } from '../../utils/blueprintSimulator';

export interface SimulationState {
  isSimulating: boolean;
  isSimPaused: boolean;
  isAudioMuted: boolean;
  simSpeed: number; // 0.5x, 1x, 2x (interval = 600ms / simSpeed)
  activeSimSteps: SimStep[];
  simStepIndex: number;
}

export interface SimulationActions {
  startSimulation: (startNodeId?: string) => void;
  stopSimulation: () => void;
  pauseSimulation: () => void;
  resumeSimulation: () => void;
  stepForward: () => void;
  toggleBreakpoint: (nodeId?: string) => void;
  toggleAudioMute: () => void;
  setSimSpeed: (speed: number) => void;
}

export interface UseSimulationControllerReturn extends SimulationState, SimulationActions {}

export interface ShortcutControllerProps {
  // Graph history
  onUndo: () => void;
  onRedo: () => void;

  // Graph structural actions
  onAddComment: () => void;
  onStraightenConnections: () => void;
  onAlignHorizontal: () => void;
  onAlignVertical: () => void;
  onFormatGraph: () => void;
  onDeleteSelected: () => void;
  onDuplicateSelected: () => void;
  onCollapseToMacro: () => void;
  onToggleBreakpoint: () => void;

  // Spawning & Context Menu
  onOpenContextMenu: (pos: { x: number; y: number }) => void;
  onQuickSpawn?: (presetId: string, clientX?: number, clientY?: number) => void;

  // Simulation bindings
  isSimulating: boolean;
  isSimPaused: boolean;
  onResumeSimulation: () => void;
  onStepForward: () => void;

  // Clipboard UE5 bridge
  onPasteUE5: (t3dText: string) => void;

  // Ref-based zero-overhead cursor & held-key tracking (avoids re-renders)
  lastMousePosRef: React.MutableRefObject<{ x: number; y: number }>;
  heldKeyRef: React.MutableRefObject<string | null>;
}
