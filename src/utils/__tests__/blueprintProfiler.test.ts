import { describe, it, expect } from 'vitest';
import { profileBlueprintGraph } from '../blueprintProfiler';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('blueprintProfiler', () => {
  it('returns Ship-Ready score 100 for empty graph', () => {
    const audit = profileBlueprintGraph([], []);
    expect(audit.overallScore).toBe(100);
    expect(audit.verdict).toBe('Ship-Ready');
  });

  it('detects heavy performance penalty for Event Tick with downstream trace', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'tick-node',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Event Tick',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'trace-node',
        type: 'customNode',
        position: { x: 400, y: 100 },
        data: {
          title: 'LineTraceByChannel',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e1',
        source: 'tick-node',
        target: 'trace-node',
        sourceHandle: 'exec-then',
        targetHandle: 'exec-execute',
      },
    ];

    const audit = profileBlueprintGraph(nodes, edges);
    expect(audit.overallScore).toBeLessThan(80);
    expect(audit.tickNodeCount).toBe(1);
    expect(audit.nodeAudits.some(n => n.severity === 'critical')).toBe(true);
    expect(audit.recommendations.some(r => r.includes('Event Tick'))).toBe(true);
  });

  it('rewards pure mathematical nodes with optimal severity', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'math-1',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Vector + Vector',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      },
    ];

    const audit = profileBlueprintGraph(nodes, []);
    expect(audit.overallScore).toBe(100);
    expect(audit.pureMathCount).toBe(1);
    expect(audit.nodeAudits[0].severity).toBe('optimal');
  });
});

