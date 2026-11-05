import { describe, it, expect, beforeEach } from 'vitest';
import { useBlueprintStore } from '../blueprintStore';
import { Node } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('BlueprintStore Undo/Redo History Stack', () => {
  beforeEach(() => {
    useBlueprintStore.setState({
      nodes: [],
      edges: [],
      past: [],
      future: [],
      canUndo: false,
      canRedo: false,
    });
  });

  it('records history when adding a node and allows undo and redo', () => {
    const store = useBlueprintStore.getState();
    const testNode: Node<NodeData> = {
      id: 'node-1',
      position: { x: 100, y: 100 },
      data: {
        title: 'Print String',
        subtitle: 'Debug',
        nodeType: 'function',
        color: '#065F46',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }],
      },
    };

    store.addNode(testNode);

    const afterAdd = useBlueprintStore.getState();
    expect(afterAdd.nodes).toHaveLength(1);
    expect(afterAdd.canUndo).toBe(true);
    expect(afterAdd.canRedo).toBe(false);
    expect(afterAdd.past).toHaveLength(1);

    // Undo should restore empty canvas
    afterAdd.undo();
    const afterUndo = useBlueprintStore.getState();
    expect(afterUndo.nodes).toHaveLength(0);
    expect(afterUndo.canUndo).toBe(false);
    expect(afterUndo.canRedo).toBe(true);

    // Redo should restore node-1
    afterUndo.redo();
    const afterRedo = useBlueprintStore.getState();
    expect(afterRedo.nodes).toHaveLength(1);
    expect(afterRedo.nodes[0].id).toBe('node-1');
    expect(afterRedo.canUndo).toBe(true);
    expect(afterRedo.canRedo).toBe(false);
  });

  it('clears future stack when a new mutation is pushed', () => {
    const store = useBlueprintStore.getState();
    const nodeA: Node<NodeData> = {
      id: 'node-a',
      position: { x: 0, y: 0 },
      data: { title: 'A', subtitle: '', nodeType: 'function', color: '#000', inputs: [], outputs: [] },
    };
    const nodeB: Node<NodeData> = {
      id: 'node-b',
      position: { x: 100, y: 0 },
      data: { title: 'B', subtitle: '', nodeType: 'function', color: '#000', inputs: [], outputs: [] },
    };

    store.addNode(nodeA);
    store.undo();
    expect(useBlueprintStore.getState().canRedo).toBe(true);

    // Pushing a new mutation should invalidate the future redo stack
    useBlueprintStore.getState().addNode(nodeB);
    const updated = useBlueprintStore.getState();
    expect(updated.nodes[0].id).toBe('node-b');
    expect(updated.canRedo).toBe(false);
    expect(updated.future).toHaveLength(0);
  });

  it('caps history stack at 50 snapshots', () => {
    const store = useBlueprintStore.getState();
    for (let i = 0; i < 60; i++) {
      store.pushHistory(`Snapshot ${i}`);
    }
    const current = useBlueprintStore.getState();
    expect(current.past.length).toBeLessThanOrEqual(50);
  });

  describe('Multi-Graph Store Isolation', () => {
    it('isolates nodes and edges per graph mode without state leakage', () => {
      // Start in EventGraph and add an event node
      useBlueprintStore.setState({ activeGraphType: 'EventGraph', nodes: [], edges: [], subGraphs: {} });
      const eventNode: Node<NodeData> = {
        id: 'event-node-1',
        position: { x: 0, y: 0 },
        data: { title: 'Event BeginPlay', nodeType: 'event', inputs: [], outputs: [{ name: 'Then', type: 'exec' }] },
      };
      useBlueprintStore.getState().addNode(eventNode);
      expect(useBlueprintStore.getState().nodes).toHaveLength(1);

      // Switch to ShadersUE
      useBlueprintStore.getState().switchGraph('ShadersUE');
      const shadersState = useBlueprintStore.getState();
      expect(shadersState.activeGraphType).toBe('ShadersUE');
      // Should have loaded default material graph with root
      expect(shadersState.nodes.some(n => n.data.title === 'Material Root')).toBe(true);
      expect(shadersState.nodes.some(n => n.id === 'event-node-1')).toBe(false);

      // Switch to NiagaraVFX
      useBlueprintStore.getState().switchGraph('NiagaraVFX');
      const niagaraState = useBlueprintStore.getState();
      expect(niagaraState.activeGraphType).toBe('NiagaraVFX');
      expect(niagaraState.nodes.some(n => n.data.title.includes('Emitter') || n.data.title.includes('Particle'))).toBe(true);
      expect(niagaraState.nodes.some(n => n.id === 'event-node-1')).toBe(false);

      // Switch to GASStudio
      useBlueprintStore.getState().switchGraph('GASStudio');
      const gasState = useBlueprintStore.getState();
      expect(gasState.activeGraphType).toBe('GASStudio');
      expect(gasState.nodes.some(n => n.data.title.includes('Ability'))).toBe(true);
      expect(gasState.nodes.some(n => n.id === 'event-node-1')).toBe(false);

      // Switch back to EventGraph: eventNode must be preserved
      useBlueprintStore.getState().switchGraph('EventGraph');
      const restoredEventState = useBlueprintStore.getState();
      expect(restoredEventState.activeGraphType).toBe('EventGraph');
      expect(restoredEventState.nodes).toHaveLength(1);
      expect(restoredEventState.nodes[0].id).toBe('event-node-1');
    });

    it('clears future redo stack and selections when switching graphs', () => {
      useBlueprintStore.setState({
        activeGraphType: 'EventGraph',
        nodes: [{ id: 'dummy', position: { x: 0, y: 0 }, data: { title: 'D', nodeType: 'function', inputs: [], outputs: [] } }],
        edges: [],
        future: [{ nodes: [], edges: [] }],
        canRedo: true,
        selectedNodes: [{ id: 'dummy', position: { x: 0, y: 0 }, data: { title: 'D', nodeType: 'function', inputs: [], outputs: [] } }],
      });

      useBlueprintStore.getState().switchGraph('ShadersUE');
      const switched = useBlueprintStore.getState();
      expect(switched.future).toHaveLength(0);
      expect(switched.canRedo).toBe(false);
      expect(switched.selectedNodes).toHaveLength(0);
    });
  });
});

