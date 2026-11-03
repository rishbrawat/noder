import { describe, it, expect } from 'vitest';
import { validateBlueprintGraph } from '../blueprintValidator';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('validateBlueprintGraph', () => {
  it('returns valid with no warnings for empty graph', () => {
    const report = validateBlueprintGraph([], []);
    expect(report.isValid).toBe(true);
    expect(report.issues.length).toBe(0);
  });

  it('warns when graph has no entry point Event node', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'n1',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const report = validateBlueprintGraph(nodes, []);
    expect(report.warningCount).toBeGreaterThan(0);
    expect(report.issues.some(i => i.id === 'no-entry-event')).toBe(true);
  });

  it('flags unlinked execution inputs on impure functions', () => {
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
        position: { x: 400, y: 100 },
        data: {
          title: 'Set Max Walk Speed',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const report = validateBlueprintGraph(nodes, []);
    expect(report.issues.some(i => i.id === 'unconnected-exec-in-n2')).toBe(true);
  });

  it('passes validation when execution line is properly connected', () => {
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
        position: { x: 400, y: 100 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
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

    const report = validateBlueprintGraph(nodes, edges);
    expect(report.errorCount).toBe(0);
  });

  it('strictly flags latent actions like Delay inside ConstructionScript', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'cs-node',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Construction Script',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'delay-node',
        type: 'customNode',
        position: { x: 400, y: 100 },
        data: {
          title: 'Delay',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Duration', type: 'float', value: 2.0 },
          ],
          outputs: [{ name: 'Completed', type: 'exec' }],
        },
      },
    ];

    const report = validateBlueprintGraph(nodes, [], 'ConstructionScript');
    expect(report.isValid).toBe(false);
    expect(report.errorCount).toBe(1);
    const errorIssue = report.issues.find(i => i.severity === 'error');
    expect(errorIssue?.message).toContain('Latent action "Delay" is not allowed in Construction Script');
  });
});

