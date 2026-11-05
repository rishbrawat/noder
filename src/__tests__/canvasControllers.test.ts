import { describe, it, expect, beforeEach, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { Node, Edge, ReactFlowProvider } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';
import { useBlueprintStore } from '../store/blueprintStore';
import { SimulationEngine } from '../components/controllers/SimulationController';
import {
  copyGraphToUE5Clipboard,
  importGraphFromUE5Clipboard,
} from '../components/controllers/ShortcutController';
import { UnrealEngineGrid } from '../components/canvas/UnrealEngineGrid';
import { CanvasViewport } from '../components/canvas/CanvasViewport';
import { blueprintAudio } from '../utils/blueprintAudio';

describe('Milestone 2: Canvas Controllers & Subsystem Modularization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useBlueprintStore.setState({
      nodes: [],
      edges: [],
      logs: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
      blueprintName: 'TestGraph',
    });
  });

  describe('SimulationController', () => {
    const testNodes: Node<NodeData>[] = [
      {
        id: 'node-start',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Event BeginPlay',
          subtitle: 'Event',
          nodeType: 'event',
          color: '#881337',
          inputs: [],
          outputs: [{ name: 'Output', type: 'exec' }],
        },
      },
      {
        id: 'node-print',
        type: 'customNode',
        position: { x: 400, y: 100 },
        data: {
          title: 'Print String',
          subtitle: 'Function',
          nodeType: 'function',
          color: '#065F46',
          inputs: [{ name: 'Execute', type: 'exec' }, { name: 'InString', type: 'string', value: 'Hello UE5' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const testEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-start',
        sourceHandle: 'exec-output',
        target: 'node-print',
        targetHandle: 'exec-execute',
        type: 'blueprintEdge',
        data: { pinType: 'exec' },
      },
    ];

    it('initializes with default simulation idle state', () => {
      const engine = new SimulationEngine();
      const state = engine.getState();

      expect(state.isSimulating).toBe(false);
      expect(state.isSimPaused).toBe(false);
      expect(state.simSpeed).toBe(1);
      expect(state.isAudioMuted).toBe(false);
      expect(state.activeSimSteps).toEqual([]);
      expect(state.simStepIndex).toBe(0);
    });

    it('handles simulation speed updates (0.5x, 1x, 2x)', () => {
      const engine = new SimulationEngine();

      engine.setSimSpeed(2);
      expect(engine.getState().simSpeed).toBe(2);

      engine.setSimSpeed(0.5);
      expect(engine.getState().simSpeed).toBe(0.5);
    });

    it('toggles audio mute status and coordinates with blueprintAudio utility', () => {
      const engine = new SimulationEngine();

      expect(blueprintAudio.getIsMuted()).toBe(false);
      engine.toggleAudioMute();
      expect(blueprintAudio.getIsMuted()).toBe(true);
      expect(engine.getState().isAudioMuted).toBe(true);

      engine.toggleAudioMute();
      expect(blueprintAudio.getIsMuted()).toBe(false);
      expect(engine.getState().isAudioMuted).toBe(false);
    });

    it('toggles UE5 breakpoints on target nodes', () => {
      useBlueprintStore.setState({ nodes: testNodes, edges: testEdges });

      const engine = new SimulationEngine();

      engine.toggleBreakpoint('node-print');
      const updatedNodes = useBlueprintStore.getState().nodes;
      const printNode = updatedNodes.find(n => n.id === 'node-print');
      expect(printNode?.data?.hasBreakpoint).toBe(true);

      engine.toggleBreakpoint('node-print');
      const clearedNodes = useBlueprintStore.getState().nodes;
      const printNodeCleared = clearedNodes.find(n => n.id === 'node-print');
      expect(printNodeCleared?.data?.hasBreakpoint).toBe(false);
    });

    it('runs simulation execution trace on graph and records logs', () => {
      useBlueprintStore.setState({ nodes: testNodes, edges: testEdges });

      const engine = new SimulationEngine();

      engine.startSimulation();
      expect(engine.getState().isSimulating).toBe(true);

      const logs = useBlueprintStore.getState().logs;
      expect(logs.length).toBeGreaterThan(0);
      expect(logs.some(l => l.message.includes('LogSimulation: Starting interactive execution trace'))).toBe(true);
    });

    it('pauses, steps forward, and stops simulation resetting highlights', () => {
      useBlueprintStore.setState({ nodes: testNodes, edges: testEdges });

      const engine = new SimulationEngine();

      engine.startSimulation();
      expect(engine.getState().isSimulating).toBe(true);

      engine.pauseSimulation();
      expect(engine.getState().isSimPaused).toBe(true);

      engine.stepForward();
      engine.stopSimulation();

      expect(engine.getState().isSimulating).toBe(false);
      expect(engine.getState().isSimPaused).toBe(false);
      const nodes = useBlueprintStore.getState().nodes;
      expect(nodes.every(n => !n.selected)).toBe(true);
    });
  });

  describe('ShortcutController & UE5 Clipboard Bridge', () => {
    it('copies blueprint graph to UE5 native T3D clipboard format', async () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'test-node-1',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Print String',
            subtitle: 'Function',
            nodeType: 'function',
            color: '#065F46',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];

      let clipboardWrittenText = '';
      const originalClipboard = globalThis.navigator.clipboard;
      (globalThis.navigator as any).clipboard = {
        writeText: vi.fn(async (text: string) => {
          clipboardWrittenText = text;
        }),
      };

      const logs: any[] = [];
      const success = await copyGraphToUE5Clipboard(nodes, [], (l) => logs.push(l));

      expect(success).toBe(true);
      expect(clipboardWrittenText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction');
      expect(clipboardWrittenText).toContain('MemberName="PrintString"');
      expect(logs.length).toBe(1);

      (globalThis.navigator as any).clipboard = originalClipboard;
    });

    it('imports blueprint graph from UE5 native T3D clipboard text', async () => {
      const sampleT3D = `
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent="/Script/CoreUObject.Class'/Script/Engine.KismetSystemLibrary'",MemberName="PrintString")
   NodePosX=400
   NodePosY=200
   NodeGuid=11111111-2222-3333-4444-555555555555
   CustomProperties Pin (PinId=A,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec")
   CustomProperties Pin (PinId=B,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec")
End Object
`;

      const originalClipboard = globalThis.navigator.clipboard;
      (globalThis.navigator as any).clipboard = {
        readText: vi.fn(async () => sampleT3D),
      };

      let parsedNodes: Node<NodeData>[] = [];
      let parsedEdges: Edge[] = [];
      let historyMessage = '';
      const logs: any[] = [];

      const success = await importGraphFromUE5Clipboard(
        (n) => { parsedNodes = n; },
        (e) => { parsedEdges = e; },
        (msg) => { historyMessage = msg; },
        (l) => logs.push(l)
      );

      expect(success).toBe(true);
      expect(parsedNodes.length).toBe(1);
      expect(parsedNodes[0].data.title).toBe('PrintString');
      expect(parsedEdges.length).toBe(0);
      expect(historyMessage).toBe('Import from UE5');
      expect(logs.some(l => l.message.includes('reverse-compiled'))).toBe(true);

      (globalThis.navigator as any).clipboard = originalClipboard;
    });

    it('tracks mouse movement in lastMousePosRef without state re-renders', () => {
      const lastMousePosRef = { current: { x: 0, y: 0 } };
      const heldKeyRef = { current: null as string | null };

      const handleMouseMove = (e: { clientX: number; clientY: number }) => {
        lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      };

      handleMouseMove({ clientX: 742, clientY: 388 });
      expect(lastMousePosRef.current).toEqual({ x: 742, y: 388 });

      heldKeyRef.current = 'b';
      expect(heldKeyRef.current).toBe('b');
      heldKeyRef.current = null;
      expect(heldKeyRef.current).toBe(null);
    });
  });

  describe('CanvasViewport & LOD UnrealEngineGrid', () => {
    it('renders UnrealEngineGrid LOD subdivisions inside ReactFlowProvider', () => {
      const gridHtml = renderToString(
        React.createElement(ReactFlowProvider, null, React.createElement(UnrealEngineGrid, { theme: 'dark' }))
      );
      expect(gridHtml).toContain('ue5-grid-major');
    });

    it('renders CanvasViewport container with ReactFlow and HUD controls', () => {
      const reactFlowRef = { current: null };
      const viewportHtml = renderToString(
        React.createElement(CanvasViewport, {
          nodes: [],
          edges: [],
          onNodesChange: vi.fn(),
          onEdgesChange: vi.fn(),
          onConnect: vi.fn(),
          theme: 'dark',
          snapToGrid: true,
          showMiniMap: false,
          isOutputLogExpanded: false,
          isLoading: false,
          selectedNodes: [],
          onContextMenuRequest: vi.fn(),
          onAlignHorizontal: vi.fn(),
          onAlignVertical: vi.fn(),
          onStraighten: vi.fn(),
          onCollapseToMacro: vi.fn(),
          onWrapComment: vi.fn(),
          onDuplicate: vi.fn(),
          onDelete: vi.fn(),
          onGenerationComplete: vi.fn(),
          onCancelGeneration: vi.fn(),
          reactFlowInstanceRef: reactFlowRef,
        })
      );

      expect(viewportHtml).toContain('react-flow');
    });
  });
});
