import { describe, it, expect } from 'vitest';
import { sanitizeBlueprintData } from '../blueprintSanitizer';
import { LLMBlueprintData } from '../../types/BlueprintTypes';

describe('Blueprint Strict Schema Sanitizer', () => {
  it('clamps standard nodes with hallucinated pins to canonical UE5 definitions while preserving literals', () => {
    const rawData: LLMBlueprintData = {
      blueprintName: 'Test Sanitizer',
      blueprintDescription: 'Clamping test',
      nodes: [
        {
          id: 'n1',
          title: 'Line Trace By Channel',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Start', type: 'vector' },
            { name: 'End', type: 'vector' },
            { name: 'Trace Channel', type: 'string', value: 'Visibility' },
            { name: 'FakeHallucinatedPin', type: 'bool' as any, value: true }, // Invalid phantom pin!
          ],
          outputs: [
            { name: 'Then', type: 'exec' },
            { name: 'Out Hit', type: 'object' },
            { name: 'Return Value', type: 'bool' },
          ],
        },
      ],
      connections: [],
    };

    const result = sanitizeBlueprintData(rawData);
    expect(result.correctionsCount).toBeGreaterThan(0);
    const sanitizedNode = result.data.nodes[0];

    // Phantom pin should be stripped
    expect(sanitizedNode.inputs.some(p => p.name === 'FakeHallucinatedPin')).toBe(false);
    // Value of Trace Channel should be preserved
    const tracePin = sanitizedNode.inputs.find(p => p.name === 'Trace Channel');
    expect(tracePin?.value).toBe('Visibility');
  });

  it('prunes dangling wires targeting nonexistent nodes', () => {
    const rawData: LLMBlueprintData = {
      blueprintName: 'Dangling Wire Test',
      blueprintDescription: '',
      nodes: [
        {
          id: 'node-a',
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      ],
      connections: [
        {
          sourceNodeId: 'node-a',
          sourcePinName: 'Then',
          targetNodeId: 'node-nonexistent',
          targetPinName: 'Execute',
        },
      ],
    };

    const result = sanitizeBlueprintData(rawData);
    expect(result.data.connections).toHaveLength(0);
    expect(result.corrections.some(c => c.includes('Pruned dangling wire'))).toBe(true);
  });
});

