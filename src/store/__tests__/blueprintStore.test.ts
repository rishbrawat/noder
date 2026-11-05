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
});

