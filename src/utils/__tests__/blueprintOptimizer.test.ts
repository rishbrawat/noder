import { describe, it, expect } from 'vitest';
import { auditGraphOptimization, optimizeBlueprintGraph } from '../blueprintOptimizer';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('blueprintOptimizer', () => {
  it('detects orphan nodes and optimizes graph by removing them', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'root-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'node-connected',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [],
        },
      },
      {
        id: 'node-dead-orphan',
        type: 'customNode',
        position: { x: 400, y: 200 },
        data: {
          title: 'Make Vector',
          nodeType: 'function',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'root-1',
        target: 'node-connected',
      },
    ];

    const audit = auditGraphOptimization(nodes, edges);
    expect(audit.orphanNodeCount).toBe(1);
    expect(audit.smells.length).toBeGreaterThan(0);

    const result = optimizeBlueprintGraph(nodes, edges);
    expect(result.optimizedNodes.length).toBe(2);
    expect(result.removedNodes).toContain('Make Vector');
  });
});

