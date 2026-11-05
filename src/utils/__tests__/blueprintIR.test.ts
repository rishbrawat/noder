import { describe, it, expect } from 'vitest';
import { graphToMinifiedIR } from '../blueprintIR';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('graphToMinifiedIR', () => {
  const sampleNodes: Node<NodeData>[] = [
    {
      id: 'node_1',
      type: 'customNode',
      position: { x: 100, y: 150 },
      data: {
        title: 'InputAction IA_Sprint',
        nodeType: 'event',
        inputs: [],
        outputs: [
          { name: 'Started', type: 'exec' },
          { name: 'Completed', type: 'exec' },
        ],
      },
    },
    {
      id: 'node_2',
      type: 'customNode',
      position: { x: 450, y: 150 },
      data: {
        title: 'Set Max Walk Speed',
        nodeType: 'function',
        inputs: [
          { name: 'Execute', type: 'exec' },
          { name: 'Speed', type: 'float', value: 800.0 },
        ],
        outputs: [{ name: 'Then', type: 'exec' }],
      },
    },
  ];

  const sampleEdges: Edge[] = [
    {
      id: 'e1',
      source: 'node_1',
      sourceHandle: 'exec-started',
      target: 'node_2',
      targetHandle: 'exec-execute',
      type: 'default',
    },
  ];

  it('compresses full graph into compact minified IR with significant token reduction', () => {
    const { irData, stats } = graphToMinifiedIR(sampleNodes, sampleEdges);

    expect(irData.nodeCount).toBe(2);
    expect(irData.nodes.length).toBe(2);
    expect(irData.wires.length).toBe(1);
    expect(irData.wires[0]).toContain('node_1.started -> node_2.execute');

    // Should achieve substantial character/token reduction compared to raw ReactFlow JSON
    expect(stats.reductionPercentage).toBeGreaterThanOrEqual(40);
    expect(stats.estimatedTokensSaved).toBeGreaterThan(0);
  });

  it('correctly filters to scoped nodes and tags boundary wires', () => {
    const { irData } = graphToMinifiedIR(sampleNodes, sampleEdges, {
      scopedNodeIds: ['node_2'],
    });

    expect(irData.nodeCount).toBe(1);
    expect(irData.scopedCount).toBe(1);
    expect(irData.nodes[0].id).toBe('node_2');
    expect(irData.nodes[0].isScoped).toBe(true);

    // Boundary wire entering node_2 from outside
    expect(irData.wires.length).toBe(1);
    expect(irData.wires[0]).toContain('[BOUNDARY]');
  });
});
