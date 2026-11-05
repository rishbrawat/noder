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

  it('correctly evaluates branch condition logic during simulation', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'ev',
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
        id: 'br',
        type: 'customNode',
        position: { x: 250, y: 0 },
        data: {
          title: 'Branch',
          nodeType: 'macro',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Condition', type: 'bool', value: false },
          ],
          outputs: [
            { name: 'True', type: 'exec' },
            { name: 'False', type: 'exec' },
          ],
        },
      },
      {
        id: 'fn_false',
        type: 'customNode',
        position: { x: 500, y: 100 },
        data: {
          title: 'Print String (Failed)',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'ev',
        target: 'br',
        sourceHandle: 'exec-then',
        targetHandle: 'exec-execute',
        data: { pinType: 'exec' },
      },
      {
        id: 'e2',
        source: 'br',
        target: 'fn_false',
        sourceHandle: 'exec-false',
        targetHandle: 'exec-execute',
        data: { pinType: 'exec' },
      },
    ];

    const steps = buildSimulationSteps(nodes, edges);
    const branchStep = steps.find(s => s.logMessage.includes('Branch Logic'));
    expect(branchStep).toBeDefined();
    expect(branchStep?.logMessage).toContain('FALSE');

    const lastStep = steps.find(s => s.activeNodeId === 'fn_false');
    expect(lastStep).toBeDefined();
  });

  it('correctly simulates multi-branch Sequence execution flow', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'ev',
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
        id: 'seq',
        type: 'customNode',
        position: { x: 250, y: 0 },
        data: {
          title: 'Sequence',
          nodeType: 'macro',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [
            { name: 'Then 0', type: 'exec' },
            { name: 'Then 1', type: 'exec' },
          ],
        },
      },
      {
        id: 'branch0',
        type: 'customNode',
        position: { x: 500, y: -50 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'In String', type: 'string', value: 'Branch Zero First' },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'branch1',
        type: 'customNode',
        position: { x: 500, y: 150 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'In String', type: 'string', value: 'Branch One Second' },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'ev', target: 'seq', sourceHandle: 'exec-then', targetHandle: 'exec-execute', data: { pinType: 'exec' } },
      { id: 'e2', source: 'seq', target: 'branch0', sourceHandle: 'exec-then-0', targetHandle: 'exec-execute', data: { pinType: 'exec' } },
      { id: 'e3', source: 'seq', target: 'branch1', sourceHandle: 'exec-then-1', targetHandle: 'exec-execute', data: { pinType: 'exec' } },
    ];

    const steps = buildSimulationSteps(nodes, edges);
    const seqStep = steps.find(s => s.logMessage.includes('Sequence Flow'));
    expect(seqStep).toBeDefined();

    // Verify both branches execute
    const printZero = steps.find(s => s.logMessage.includes('Branch Zero First'));
    const printOne = steps.find(s => s.logMessage.includes('Branch One Second'));
    expect(printZero).toBeDefined();
    expect(printOne).toBeDefined();
  });
});

