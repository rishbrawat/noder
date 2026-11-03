import { describe, it, expect } from 'vitest';
import { generateUE5PythonScript } from '../uePythonGenerator';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('uePythonGenerator', () => {
  it('generates an executable Unreal Engine 5 Python automation script', () => {
    const mockNodes: Node<NodeData>[] = [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'node-2',
        type: 'customNode',
        position: { x: 400, y: 150 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'InString', type: 'string', value: 'Hello Unreal!' },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const mockEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-1',
        sourceHandle: 'exec-out-0',
        target: 'node-2',
        targetHandle: 'exec-in-0',
      },
    ];

    const result = generateUE5PythonScript(mockNodes, mockEdges, {
      blueprintName: 'BP_TestAutomation',
      targetClass: 'Character',
    });

    expect(result.fileName).toBe('BP_TestAutomation_Generator.py');
    expect(result.nodeCount).toBe(2);
    expect(result.connectionCount).toBe(1);
    expect(result.script).toContain('import unreal');
    expect(result.script).toContain('def generate_bp_testautomation_blueprint():');
    expect(result.script).toContain('package_path = "/Game/Blueprints"');
    expect(result.script).toContain('unreal.BlueprintFactory()');
    expect(result.script).toContain('/Script/Engine.Character');
    expect(result.script).toContain('T3D_CLIPBOARD_DATA = r\'\'\'');
    expect(result.script).toContain('Print String');
  });

  it('handles empty graphs gracefully', () => {
    const result = generateUE5PythonScript([], [], {
      blueprintName: 'BP_Empty',
    });

    expect(result.fileName).toBe('BP_Empty_Generator.py');
    expect(result.nodeCount).toBe(0);
    expect(result.connectionCount).toBe(0);
    expect(result.script).toContain('import unreal');
  });
});

