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

  it('parses K2Node_BreakStruct and K2Node_MakeStruct into struct decomposition nodes', () => {
    const rawT3D = `
Begin Object Class=/Script/BlueprintGraph.K2Node_BreakStruct Name="K2Node_BreakStruct_0"
   StructType=ScriptStruct'"/Script/Engine.HitResult"'
   NodePosX=100
   NodePosY=100
   NodeGuid=A1B2C3D4E5F678901234567890ABCDE1
   CustomProperties Pin (PinId=B1B2C3D4E5F678901234567890ABCDE2,PinName="HitResult",PinType.PinCategory="struct",Direction="EGPD_Input")
   CustomProperties Pin (PinId=C1B2C3D4E5F678901234567890ABCDE3,PinName="Location",PinType.PinCategory="struct",Direction="EGPD_Output")
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_MakeStruct Name="K2Node_MakeStruct_0"
   StructType=ScriptStruct'"/Script/Engine.Vector"'
   NodePosX=400
   NodePosY=100
   NodeGuid=D1B2C3D4E5F678901234567890ABCDE4
   CustomProperties Pin (PinId=E1B2C3D4E5F678901234567890ABCDE5,PinName="X",PinType.PinCategory="real",Direction="EGPD_Input")
   CustomProperties Pin (PinId=F1B2C3D4E5F678901234567890ABCDE6,PinName="Return Value",PinType.PinCategory="struct",Direction="EGPD_Output")
End Object
    `.trim();

    const parsed = parseUE5T3DToGraph(rawT3D);
    expect(parsed.nodes.length).toBe(2);
    expect(parsed.nodes[0].data.title).toBe('Break Hit Result');
    expect(parsed.nodes[1].data.title).toBe('Make Vector');
  });

  it('parses T3D graphs with hyphenated standard UUIDs without truncating PinId or dropping edges', () => {
    const t3d = `
  Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_A"
     CustomProperties Pin (PinId=A1B2C3D4-E5F6-7890-ABCD-EF1234567890,PinName="OutA",PinType.PinCategory="int",Direction="EGPD_Output",LinkedTo=(Node_B B2C3D4E5-F678-90AB-CDEF-1234567890AB))
  End Object
  Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_B"
     CustomProperties Pin (PinId=B2C3D4E5-F678-90AB-CDEF-1234567890AB,PinName="InB",PinType.PinCategory="int",Direction="EGPD_Input",LinkedTo=(Node_A A1B2C3D4-E5F6-7890-ABCD-EF1234567890))
  End Object
    `.trim();

    const result = parseUE5T3DToGraph(t3d);
    expect(result.nodes.length).toBe(2);
    expect(result.edges.length).toBe(1);
    expect(result.edges[0].sourceHandle).toBe('int-outa');
    expect(result.edges[0].targetHandle).toBe('int-inb');
  });

  it('losslessly roundtrips multi-word pins between compileGraphToT3D and parseUE5T3DToGraph', () => {
    const originalNodes: Node<NodeData>[] = [
      {
        id: 'n1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Make Vector',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      },
      {
        id: 'n2',
        type: 'customNode',
        position: { x: 300, y: 0 },
        data: {
          title: 'Set Actor Location',
          nodeType: 'function',
          inputs: [{ name: 'New Location', type: 'vector' }],
          outputs: [],
        },
      },
    ];

    const originalEdges: Edge[] = [
      {
        id: 'e1',
        source: 'n1',
        target: 'n2',
        sourceHandle: 'vector-return-value',
        targetHandle: 'vector-new-location',
      },
    ];

    const compiled = compileGraphToT3D(originalNodes, originalEdges);
    expect(compiled.warnings).toHaveLength(0);
    expect(compiled.t3dText).toContain('LinkedTo=');

    const parsed = parseUE5T3DToGraph(compiled.t3dText);
    expect(parsed.nodes).toHaveLength(2);
    expect(parsed.edges).toHaveLength(1);
  });
});

