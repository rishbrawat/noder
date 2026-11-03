import { describe, it, expect } from 'vitest';
import { compileGraphToT3D, generateUEGuid } from '../ueT3DCompiler';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('Unreal Engine 5 T3D Compiler', () => {
  it('should generate valid 32-character uppercase hexadecimal GUIDs', () => {
    const guid = generateUEGuid();
    expect(guid).toHaveLength(32);
    expect(guid).toMatch(/^[0-9A-F]{32}$/);
  });

  it('should compile an Event BeginPlay node to valid Unreal T3D format', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 150 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'OutputDelegate', type: 'exec' }]
        }
      }
    ];

    const edges: Edge[] = [];
    const result = compileGraphToT3D(nodes, edges);

    expect(result.nodeCount).toBe(1);
    expect(result.connectionCount).toBe(0);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_Event');
    expect(result.t3dText).toContain('EventReference=(MemberParent=Class\'"/Script/Engine.Actor"\',MemberName="ReceiveBeginPlay")');
    expect(result.t3dText).toContain('NodePosX=100');
    expect(result.t3dText).toContain('NodePosY=150');
    expect(result.t3dText).toContain('CustomProperties Pin');
    expect(result.t3dText).toContain('PinType.PinCategory="exec"');
    expect(result.t3dText).toContain('Direction="EGPD_Output"');
    expect(result.t3dText).toContain('End Object');
  });

  it('should properly link nodes via LinkedTo parameters in both directions', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-start',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'OutputDelegate', type: 'exec' }]
        }
      },
      {
        id: 'node-print',
        type: 'customNode',
        position: { x: 450, y: 100 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'In String', type: 'string', value: 'Hello Unreal' }
          ],
          outputs: [{ name: 'Execute', type: 'exec' }]
        }
      }
    ];

    const edges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-start',
        sourceHandle: 'exec-outputdelegate',
        target: 'node-print',
        targetHandle: 'exec-execute'
      }
    ];

    const result = compileGraphToT3D(nodes, edges);

    expect(result.nodeCount).toBe(2);
    expect(result.connectionCount).toBe(1);
    expect(result.t3dText).toContain('LinkedTo=');
    expect(result.t3dText).toContain('DefaultValue="Hello Unreal"');
    expect(result.warnings).toHaveLength(0);
  });

  it('should compile Branch nodes as K2Node_IfThenElse', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-branch',
        type: 'customNode',
        position: { x: 300, y: 200 },
        data: {
          title: 'Branch',
          nodeType: 'function',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Condition', type: 'bool' }
          ],
          outputs: [
            { name: 'True', type: 'exec' },
            { name: 'False', type: 'exec' }
          ]
        }
      }
    ];

    const result = compileGraphToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_IfThenElse');
  });

  it('should compile comment box to EdGraphNode_Comment in T3D format', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'comment-1',
        type: 'commentNode',
        position: { x: 50, y: 50 },
        data: {
          title: 'Movement Mechanics',
          nodeType: 'macro',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const result = compileGraphToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment');
    expect(result.t3dText).toContain('NodeComment="Movement Mechanics"');
    expect(result.t3dText).toContain('NodePosX=50');
    expect(result.t3dText).toContain('NodePosY=50');
  });
});

