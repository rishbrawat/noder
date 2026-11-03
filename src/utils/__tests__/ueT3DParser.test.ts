import { describe, it, expect } from 'vitest';
import { parseUE5T3DToGraph } from '../ueT3DParser';
import { compileGraphToT3D } from '../ueT3DCompiler';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('UE5 T3D Parser (Reverse Compiler)', () => {
  it('parses valid Unreal Engine 5 T3D ASCII clipboard format into nodes and edges', () => {
    const rawT3D = `
Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_0"
   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="ReceiveBeginPlay")
   bOverrideFunction=True
   NodePosX=100
   NodePosY=200
   NodeGuid=4A86DE594249A296D4B7059E441315FB
   CustomProperties Pin (PinId=73BE375E4D1B50D97D6E26B66C5DB101,PinName="then",PinType.PinCategory="exec",Direction="EGPD_Output",LinkedTo=(K2Node_CallFunction_0 E4B11E58488E8F50247C1C85A82B022B,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent=Class'"/Script/Engine.KismetSystemLibrary"',MemberName="PrintString")
   NodePosX=500
   NodePosY=200
   NodeGuid=054DC47444747B0703AC0CBBE9388339
   CustomProperties Pin (PinId=E4B11E58488E8F50247C1C85A82B022B,PinName="execute",PinType.PinCategory="exec",Direction="EGPD_Input",LinkedTo=(K2Node_Event_0 73BE375E4D1B50D97D6E26B66C5DB101,))
   CustomProperties Pin (PinId=8E04D1B94A496B85994E8CA7EE423021,PinName="then",PinType.PinCategory="exec",Direction="EGPD_Output")
   CustomProperties Pin (PinId=0BEAE4C34533036F49BC7786B06263B2,PinName="InString",PinType.PinCategory="string",Direction="EGPD_Input",DefaultValue="Hello from UE5")
End Object
    `.trim();

    const result = parseUE5T3DToGraph(rawT3D);

    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);

    const eventNode = result.nodes.find(n => n.data.nodeType === 'event');
    const funcNode = result.nodes.find(n => n.data.nodeType === 'function');

    expect(eventNode).toBeDefined();
    expect(funcNode).toBeDefined();
    expect(eventNode!.data.title).toContain('BeginPlay');
    expect(funcNode!.data.title).toBe('PrintString');

    // Verify coordinate accuracy
    expect(eventNode!.position.x).toBe(100);
    expect(funcNode!.position.x).toBe(500);

    // Verify connection wiring
    expect(result.edges[0].source).toBe(eventNode!.id);
    expect(result.edges[0].target).toBe(funcNode!.id);
  });

  it('performs full roundtrip: Noder Graph -> T3D -> Noder Graph', () => {
    const originalNodes: Node<NodeData>[] = [
      {
        id: 'node-a',
        type: 'customNode',
        position: { x: 120, y: 150 },
        data: {
          title: 'Event BeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'node-b',
        type: 'customNode',
        position: { x: 480, y: 150 },
        data: {
          title: 'Print String',
          nodeType: 'function',
          inputs: [{ name: 'Execute', type: 'exec' }, { name: 'In String', type: 'string', value: 'Roundtrip Test' }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const originalEdges: Edge[] = [
      {
        id: 'edge-1',
        source: 'node-a',
        target: 'node-b',
        sourceHandle: 'exec-then',
        targetHandle: 'exec-execute',
      },
    ];

    const compiled = compileGraphToT3D(originalNodes, originalEdges);
    expect(compiled.t3dText).toContain('Begin Object');

    const parsed = parseUE5T3DToGraph(compiled.t3dText);
    expect(parsed.nodes.length).toBe(2);
    expect(parsed.edges.length).toBe(1);
  });

  it('parses Unreal EdGraphNode_Comment blocks into commentNode', () => {
    const rawT3D = `Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment Name="EdGraphNode_Comment_1"
   NodePosX=200
   NodePosY=300
   NodeWidth=500
   NodeHeight=350
   NodeComment="Character Movement Logic"
   NodeGuid=A1B2C3D4E5F678901234567890ABCDEF
End Object`;

    const parsed = parseUE5T3DToGraph(rawT3D);
    expect(parsed.nodes.length).toBe(1);
    expect(parsed.nodes[0].type).toBe('commentNode');
    expect(parsed.nodes[0].data.title).toBe('Character Movement Logic');
    expect(parsed.nodes[0].position.x).toBe(200);
    expect(parsed.nodes[0].position.y).toBe(300);
  });
});

