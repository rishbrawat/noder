import { describe, it, expect } from 'vitest';
import { applyBlueprintPatch } from '../blueprintPatcher';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('applyBlueprintPatch', () => {
  const initialNodes: Node<NodeData>[] = [
    {
      id: 'n_event',
      type: 'customNode',
      position: { x: 100, y: 150 },
      data: {
        title: 'InputAction IA_Sprint',
        nodeType: 'event',
        inputs: [],
        outputs: [{ name: 'Started', type: 'exec' }],
      },
    },
    {
      id: 'n_speed',
      type: 'customNode',
      position: { x: 420, y: 150 },
      data: {
        title: 'Set Max Walk Speed',
        nodeType: 'function',
        inputs: [
          { name: 'Execute', type: 'exec' },
          { name: 'Speed', type: 'float', value: 600 },
        ],
        outputs: [{ name: 'Then', type: 'exec' }],
      },
    },
  ];

  const initialEdges: Edge[] = [
    {
      id: 'e_init',
      source: 'n_event',
      sourceHandle: 'exec-started',
      target: 'n_speed',
      targetHandle: 'exec-execute',
      type: 'default',
    },
  ];

  it('updates existing node in place preserving coordinates while adding new nodes and connections', () => {
    const patchPayload = {
      summary: 'Updated speed value to 800 and inserted a Delay node',
      nodes: [
        // Modified existing node (id matches n_speed)
        {
          id: 'n_speed',
          title: 'Set Max Walk Speed',
          nodeType: 'function' as const,
          inputs: [
            { name: 'Execute', type: 'exec' as const },
            { name: 'Speed', type: 'float' as const, value: 800 },
          ],
          outputs: [{ name: 'Then', type: 'exec' as const }],
        },
        // Brand-new node
        {
          id: 'new_delay',
          title: 'Delay',
          nodeType: 'function' as const,
          inputs: [
            { name: 'Execute', type: 'exec' as const },
            { name: 'Duration', type: 'float' as const, value: 3.0 },
          ],
          outputs: [{ name: 'Completed', type: 'exec' as const }],
        },
      ],
      connections: [
        {
          sourceNodeId: 'n_speed',
          sourcePinName: 'Then',
          targetNodeId: 'new_delay',
          targetPinName: 'Execute',
        },
      ],
    };

    const result = applyBlueprintPatch(initialNodes, initialEdges, patchPayload);

    // Should have 3 total nodes (2 original + 1 added)
    expect(result.nodes.length).toBe(3);
    expect(result.stats.addedNodes).toBe(1);
    expect(result.stats.modifiedNodes).toBe(1);

    // Existing node coordinates must be perfectly preserved
    const updatedSpeedNode = result.nodes.find(n => n.id === 'n_speed');
    expect(updatedSpeedNode).toBeDefined();
    expect(updatedSpeedNode?.position).toEqual({ x: 420, y: 150 });
    expect(updatedSpeedNode?.data.inputs?.[1]?.value).toBe(800);

    // Newly added node should be positioned downstream relative to upstream parent
    const delayNode = result.nodes.find(n => n.data.title === 'Delay');
    expect(delayNode).toBeDefined();
    expect(delayNode?.position.x).toBeGreaterThan(420);

    // Connection should link n_speed to the new delay node
    expect(result.edges.length).toBe(2);
    const newEdge = result.edges.find(e => e.source === 'n_speed');
    expect(newEdge).toBeDefined();
    expect(newEdge?.target).toBe(delayNode?.id);
  });

  it('correctly removes specified nodes and their incident connections', () => {
    const patchPayload = {
      summary: 'Removed speed node',
      nodes: [],
      connections: [],
      removedNodeIds: ['n_speed'],
    };

    const result = applyBlueprintPatch(initialNodes, initialEdges, patchPayload);

    expect(result.nodes.length).toBe(1);
    expect(result.nodes[0].id).toBe('n_event');
    expect(result.stats.removedNodes).toBe(1);
    // Edge attached to n_speed should be pruned
    expect(result.edges.length).toBe(0);
  });
});

