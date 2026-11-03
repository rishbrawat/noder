import { describe, it, expect } from 'vitest';
import { buildSimulationSteps } from '../blueprintSimulator';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('Blueprint Interactive Simulator (ueSim)', () => {
  it('generates sequential execution steps along connected exec wires', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'n1',
        type: 'customNode',
        position: { x: 100, y: 100 },
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
        position: { x: 450, y: 100 },
        data: {
          title: 'Set Max Walk Speed',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Max Walk Speed', type: 'float', value: 800.0 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        sourceHandle: 'exec-then',
        targetHandle: 'exec-execute',
        data: { pinType: 'exec' },
      },
    ];

    const steps = buildSimulationSteps(nodes, edges);
    expect(steps.length).toBeGreaterThanOrEqual(3);

    // First step is event trigger
    expect(steps[0].activeNodeId).toBe('n1');
    expect(steps[0].logMessage).toContain('Event BeginPlay');

    // Second step transitions to Set Max Walk Speed
    expect(steps[1].activeNodeId).toBe('n2');
    expect(steps[1].logMessage).toContain('Set Max Walk Speed');

    // Third step inspects the parameter
    expect(steps[2].logMessage).toContain('800');
  });

  it('handles empty graphs gracefully', () => {
    const steps = buildSimulationSteps([], []);
    expect(steps).toEqual([]);
  });
});

