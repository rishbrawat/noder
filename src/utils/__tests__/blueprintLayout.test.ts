import { describe, it, expect } from 'vitest';
import { calculateBlueprintLayout, formatGraphLayout } from '../blueprintLayout';
import { LLMNodeData, LLMConnectionData, NodeData } from '../../types/BlueprintTypes';
import { Node, Edge } from 'reactflow';

describe('calculateBlueprintLayout', () => {
  it('calculates non-overlapping horizontal layers for sequential execution', () => {
    const nodes: LLMNodeData[] = [
      {
        id: 'node-1',
        title: 'InputAction IA_Sprint',
        nodeType: 'event',
        inputs: [],
        outputs: [{ name: 'Started', type: 'exec' }]
      },
      {
        id: 'node-2',
        title: 'Set Max Walk Speed',
        nodeType: 'function',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }]
      },
      {
        id: 'node-3',
        title: 'Print String',
        nodeType: 'function',
        inputs: [{ name: 'Execute', type: 'exec' }],
        outputs: [{ name: 'Then', type: 'exec' }]
      }
    ];

    const connections: LLMConnectionData[] = [
      { sourceNodeId: 'node-1', sourcePinName: 'Started', targetNodeId: 'node-2', targetPinName: 'Execute' },
      { sourceNodeId: 'node-2', sourcePinName: 'Then', targetNodeId: 'node-3', targetPinName: 'Execute' }
    ];

    const positions = calculateBlueprintLayout(nodes, connections);

    const pos1 = positions.get('node-1')!;
    const pos2 = positions.get('node-2')!;
    const pos3 = positions.get('node-3')!;

    expect(pos1).toBeDefined();
    expect(pos2).toBeDefined();
    expect(pos3).toBeDefined();

    // Verify left-to-right horizontal execution ordering
    expect(pos1.x).toBeLessThan(pos2.x);
    expect(pos2.x).toBeLessThan(pos3.x);
  });

  it('preserves valid spaced coordinates if LLM provides distinct positions', () => {
    const nodes: LLMNodeData[] = [
      {
        id: 'n1',
        title: 'Event BeginPlay',
        nodeType: 'event',
        position: { x: 100, y: 150 },
        inputs: [],
        outputs: []
      },
      {
        id: 'n2',
        title: 'Print String',
        nodeType: 'function',
        position: { x: 500, y: 150 },
        inputs: [],
        outputs: []
      }
    ];

    const positions = calculateBlueprintLayout(nodes, []);
    expect(positions.get('n1')).toEqual({ x: 100, y: 150 });
    expect(positions.get('n2')).toEqual({ x: 500, y: 150 });
  });

  it('formats active ReactFlow Blueprint canvas into linear execution flow with pure node alignment', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'ev-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: { title: 'Event BeginPlay', nodeType: 'event', inputs: [], outputs: [{ name: 'Then', type: 'exec' }] },
      },
      {
        id: 'fn-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }, { name: 'In String', type: 'string' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'pure-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Get Actor Name',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Return Value', type: 'string' }],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'ev-1', target: 'fn-1', sourceHandle: 'exec-then', targetHandle: 'exec-execute', data: { pinType: 'exec' } },
      { id: 'e2', source: 'pure-1', target: 'fn-1', sourceHandle: 'string-return', targetHandle: 'string-instring', data: { pinType: 'string' } },
    ];

    const formatted = formatGraphLayout(nodes, edges);
    const evNode = formatted.find(n => n.id === 'ev-1')!;
    const fnNode = formatted.find(n => n.id === 'fn-1')!;
    const pureNode = formatted.find(n => n.id === 'pure-1')!;

    // Verification: Event is to the left of the Impure Function
    expect(evNode.position.x).toBeLessThan(fnNode.position.x);

    // Verification: Pure Node is positioned to the left/underneath its consumer
    expect(pureNode.position.x).toBeLessThan(fnNode.position.x);
  });
});

