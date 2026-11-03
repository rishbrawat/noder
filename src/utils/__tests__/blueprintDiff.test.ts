import { describe, it, expect } from 'vitest';
import { computeBlueprintDiff } from '../blueprintDiff';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('computeBlueprintDiff', () => {
  it('detects identical graphs', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'n1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];
    const edges: Edge[] = [];

    const diff = computeBlueprintDiff(nodes, edges, nodes, edges);
    expect(diff.summary.isIdentical).toBe(true);
    expect(diff.summary.addedNodes).toBe(0);
    expect(diff.summary.removedNodes).toBe(0);
    expect(diff.summary.unchangedNodes).toBe(1);
  });

  it('detects added, removed, and modified nodes', () => {
    const baseNodes: Node<NodeData>[] = [
      {
        id: 'n1',
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
        id: 'n2',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'In String', type: 'string', value: 'Hello' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const targetNodes: Node<NodeData>[] = [
      {
        id: 'n1',
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
        id: 'n2',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'In String', type: 'string', value: 'Modified Message' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'n3',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Play Sound 2D',
          nodeType: 'function',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const diff = computeBlueprintDiff(baseNodes, [], targetNodes, []);
    expect(diff.summary.isIdentical).toBe(false);
    expect(diff.summary.unchangedNodes).toBe(1);
    expect(diff.summary.modifiedNodes).toBe(1);
    expect(diff.summary.addedNodes).toBe(1);
  });
});

