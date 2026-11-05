import { useRef, useEffect, useSyncExternalStore } from 'react';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';
import { useBlueprintStore } from '../../store/blueprintStore';
import { buildSimulationSteps } from '../../utils/blueprintSimulator';
import { blueprintAudio } from '../../utils/blueprintAudio';
import { toast } from 'react-hot-toast';
import { SimulationState, UseSimulationControllerReturn } from './types';

export interface UseSimulationControllerOptions {
  nodes?: Node<NodeData>[];
  edges?: Edge[];
  blueprintName?: string;
  setNodes?: (nodes: Node<NodeData>[]) => void;
  setEdges?: (edges: Edge[]) => void;
  addLog?: (entry: { type: any; message: string; id?: string; timestamp?: string }) => void;
}

export class SimulationEngine {
  private state: SimulationState = {
    isSimulating: false,
    isSimPaused: false,
    isAudioMuted: false,
    simSpeed: 1,
    activeSimSteps: [],
    simStepIndex: 0,
  };

  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private options: UseSimulationControllerOptions;

  constructor(options: UseSimulationControllerOptions = {}) {
    this.options = options;
  }

  public updateOptions(options: UseSimulationControllerOptions) {
    this.options = options;
  }

  public getState = (): SimulationState => {
    return this.state;
  };

  public subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  };

  private notify() {
    this.state = { ...this.state };
    this.listeners.forEach(fn => fn());
  }

  public destroy() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.listeners.clear();
  }

  public setSimSpeed = (speed: number) => {
    const valid = speed > 0 ? speed : 1;
    this.state.simSpeed = valid;
    this.notify();
  };

  public toggleAudioMute = () => {
    const next = !this.state.isAudioMuted;
    this.state.isAudioMuted = next;
    blueprintAudio.setMuted(next);
    this.notify();
  };

  private clearHighlights() {
    const store = useBlueprintStore.getState();
    const setNodes = this.options.setNodes ?? store.setNodes;
    const setEdges = this.options.setEdges ?? store.setEdges;
    setNodes(store.nodes.map(n => ({ ...n, selected: false })));
    setEdges(store.edges.map(e => ({ ...e, data: { ...e.data, isSimulating: false } })));
  }

  public stopSimulation = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.isSimulating = false;
    this.state.isSimPaused = false;
    this.state.simStepIndex = 0;
    this.clearHighlights();

    const addLog = this.options.addLog ?? useBlueprintStore.getState().addLog;
    addLog({
      type: 'warn',
      message: 'LogSimulation: Simulation aborted by user.',
    });
    this.notify();
  };

  public pauseSimulation = () => {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    this.state.isSimPaused = true;
    const addLog = this.options.addLog ?? useBlueprintStore.getState().addLog;
    addLog({
      type: 'info',
      message: 'LogSimulation: Simulation paused.',
    });
    this.notify();
  };

  private playStepAt(idx: number) {
    const steps = this.state.activeSimSteps;
    if (idx >= steps.length) {
      this.state.isSimulating = false;
      this.state.isSimPaused = false;
      this.clearHighlights();
      blueprintAudio.playSuccessChime();
      this.notify();
      return;
    }

    const step = steps[idx];
    const store = useBlueprintStore.getState();
    const setNodes = this.options.setNodes ?? store.setNodes;
    const setEdges = this.options.setEdges ?? store.setEdges;
    const addLog = this.options.addLog ?? store.addLog;

    setNodes(store.nodes.map(n => ({ ...n, selected: n.id === step.activeNodeId })));
    setEdges(store.edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        isSimulating: e.id === step.activeEdgeId,
      }
    })));

    addLog({
      type: step.logType,
      message: step.logMessage,
    });

    const nextIdx = idx + 1;
    this.state.simStepIndex = nextIdx;

    if (step.isBreakpoint) {
      this.state.isSimPaused = true;
      blueprintAudio.playBreakpointHit();
      toast('Breakpoint hit! Simulation suspended (F5 to resume, F10 to step).', { icon: '🛑' });
      this.notify();
      return;
    }

    if (step.logType === 'success') {
      blueprintAudio.playSuccessChime();
    } else {
      blueprintAudio.playStepPulse();
    }

    this.notify();

    const delay = Math.max(100, Math.round(600 / (this.state.simSpeed || 1)));
    this.timer = setTimeout(() => {
      this.playStepAt(nextIdx);
    }, delay);
  }

  public startSimulation = (startNodeId?: string) => {
    const store = useBlueprintStore.getState();
    const currentNodes = this.options.nodes ?? store.nodes;
    const currentEdges = this.options.edges ?? store.edges;
    const blueprintName = this.options.blueprintName ?? store.blueprintName;
    const addLog = this.options.addLog ?? store.addLog;

    if (currentNodes.length === 0) {
      toast.error('No nodes to simulate');
      return;
    }

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const steps = buildSimulationSteps(currentNodes, currentEdges, startNodeId);
    if (steps.length === 0) {
      this.state.isSimulating = false;
      this.notify();
      return;
    }

    this.state.isSimulating = true;
    this.state.isSimPaused = false;
    this.state.activeSimSteps = steps;
    this.state.simStepIndex = 0;

    addLog({
      type: 'info',
      message: '──────────────────────────────────────────',
    });
    addLog({
      type: 'exec',
      message: `LogSimulation: Starting interactive execution trace for ${blueprintName || 'MainGraph'}...`,
    });

    blueprintAudio.playEventChime();
    this.notify();
    this.playStepAt(0);
  };

  public resumeSimulation = () => {
    const steps = this.state.activeSimSteps;
    const currentIdx = this.state.simStepIndex;
    if (currentIdx >= steps.length) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    this.state.isSimPaused = false;
    toast.success('Resuming execution trace');
    this.notify();
    this.playStepAt(currentIdx);
  };

  public stepForward = () => {
    const steps = this.state.activeSimSteps;
    const currentIdx = this.state.simStepIndex;
    if (currentIdx >= steps.length) return;

    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }

    const step = steps[currentIdx];
    const store = useBlueprintStore.getState();
    const setNodes = this.options.setNodes ?? store.setNodes;
    const setEdges = this.options.setEdges ?? store.setEdges;
    const addLog = this.options.addLog ?? store.addLog;

    setNodes(store.nodes.map(n => ({ ...n, selected: n.id === step.activeNodeId })));
    setEdges(store.edges.map(e => ({
      ...e,
      data: {
        ...e.data,
        isSimulating: e.id === step.activeEdgeId,
      }
    })));

    if (step.isBreakpoint) {
      blueprintAudio.playBreakpointHit();
    } else {
      blueprintAudio.playStepPulse();
    }

    addLog({
      type: step.logType,
      message: step.logMessage,
    });

    const nextIdx = currentIdx + 1;
    this.state.simStepIndex = nextIdx;

    if (nextIdx >= steps.length) {
      this.state.isSimulating = false;
      this.state.isSimPaused = false;
      this.clearHighlights();
      blueprintAudio.playSuccessChime();
      toast.success('Simulation completed');
    } else if (step.isBreakpoint) {
      this.state.isSimPaused = true;
    }

    this.notify();
  };

  public toggleBreakpoint = (nodeId?: string) => {
    const store = useBlueprintStore.getState();
    const currentNodes = this.options.nodes ?? store.nodes;
    const setNodes = this.options.setNodes ?? store.setNodes;
    let target: Node<NodeData> | undefined;

    if (nodeId) {
      target = currentNodes.find(n => n.id === nodeId);
    } else {
      const selected = currentNodes.filter(n => n.selected);
      if (selected.length === 0) {
        toast('Select a node to toggle breakpoint (F9)', { icon: 'ℹ️' });
        return;
      }
      target = selected[0];
    }

    if (!target) return;

    const newBreakpoint = !target.data?.hasBreakpoint;
    setNodes(currentNodes.map(n => n.id === target?.id ? {
      ...n,
      data: {
        ...n.data,
        hasBreakpoint: newBreakpoint,
      }
    } : n));

    toast(
      newBreakpoint ? `Breakpoint set on "${target.data?.title || 'Node'}" (F9)` : 'Breakpoint removed',
      { icon: '🔴' }
    );
  };
}

export function useSimulationController(
  options: UseSimulationControllerOptions = {}
): UseSimulationControllerReturn {
  const engineRef = useRef<SimulationEngine | null>(null);
  if (!engineRef.current) {
    engineRef.current = new SimulationEngine(options);
  }
  const engine = engineRef.current;

  useEffect(() => {
    engine.updateOptions(options);
  });

  useEffect(() => {
    return () => {
      engine.destroy();
    };
  }, [engine]);

  const state = useSyncExternalStore(engine.subscribe, engine.getState, engine.getState);

  return {
    ...state,
    startSimulation: engine.startSimulation,
    stopSimulation: engine.stopSimulation,
    pauseSimulation: engine.pauseSimulation,
    resumeSimulation: engine.resumeSimulation,
    stepForward: engine.stepForward,
    toggleBreakpoint: engine.toggleBreakpoint,
    toggleAudioMute: engine.toggleAudioMute,
    setSimSpeed: engine.setSimSpeed,
  };
}

export default useSimulationController;
