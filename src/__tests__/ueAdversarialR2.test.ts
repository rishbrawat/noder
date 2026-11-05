import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';
import { generateUE5PythonScript } from '../utils/uePythonGenerator';
import { compileGraphToT3D, normalizePinLookupKey, extractPinNameFromHandle } from '../utils/ueT3DCompiler';
import { parseUE5T3DToGraph } from '../utils/ueT3DParser';

/**
 * Validates Python script syntax using Python's standard `ast.parse()`.
 */
function assertPythonAstValid(script: string): void {
  execSync('python -c "import ast, sys; ast.parse(sys.stdin.read())"', {
    input: script,
    encoding: 'utf-8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
}

describe('Milestone 1 Iteration 2 Adversarial Stress Test Suite', () => {

  // =========================================================================
  // SUITE 1: uePythonGenerator Indentation, String & AST Parsing Stress Tests
  // =========================================================================
  describe('uePythonGenerator Adversarial Tests', () => {
    it('1.1 parses cleanly with empty graph and default options', () => {
      const res = generateUE5PythonScript([], []);
      expect(res.fileName).toBe('BP_GameplayAsset_Generator.py');
      expect(res.nodeCount).toBe(0);
      expect(res.connectionCount).toBe(0);
      expect(() => assertPythonAstValid(res.script)).not.toThrow();
    });

    it('1.2 parses cleanly with boundary conditions on node list size (0, 1, 9, 10, 11, 25 nodes)', () => {
      const counts = [0, 1, 9, 10, 11, 25];
      for (const count of counts) {
        const nodes: Node<NodeData>[] = Array.from({ length: count }, (_, i) => ({
          id: `node-${i}`,
          type: 'customNode',
          position: { x: i * 50, y: i * 30 },
          data: {
            title: `Node Title ${i}`,
            nodeType: i % 2 === 0 ? 'function' : 'event',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        }));
        const res = generateUE5PythonScript(nodes, [], { blueprintName: `BP_Size_${count}` });
        expect(() => assertPythonAstValid(res.script)).not.toThrow();
      }
    });

    it('1.3 parses cleanly with Python reserved keywords in blueprintName', () => {
      const keywords = ['class', 'def', 'import', 'for', 'while', 'pass', 'return', 'if', 'else', 'try', 'except', 'lambda', 'with', 'as', 'global', 'nonlocal', 'yield', 'assert', 'break', 'continue'];
      for (const kw of keywords) {
        const res = generateUE5PythonScript([], [], { blueprintName: kw });
        // Function name will be `generate_${kw}_blueprint` which is a valid identifier
        expect(res.script).toContain(`def generate_${kw}_blueprint():`);
        expect(() => assertPythonAstValid(res.script)).not.toThrow();
      }
    });

    it('1.4 sanitizes extreme adversarial quotes, slashes, unicode, and injection attempts in blueprintName', () => {
      const adversarialNames = [
        'BP_"DoubleQuotes"',
        "BP_'SingleQuotes'",
        'BP_"""TripleDouble"""',
        "BP_'''TripleSingle'''",
        'BP_`Backticks`',
        'BP_${InjectCode}',
        'BP_\\Backslash\\Path',
        'BP_/Forward/Slash',
        'BP_; DROP TABLE Blueprints; --',
        'BP_\nNewline\rCarriage',
        'BP_\tTab',
        'BP_🚀_Emoji_Asset',
        'BP-With-Dashes-And Spaces',
        '123_BP_Starts_With_Number',
        '   ',
        '???!!!###$$$%%%^^^&&&***',
      ];

      for (const name of adversarialNames) {
        const res = generateUE5PythonScript([], [], { blueprintName: name });
        expect(() => assertPythonAstValid(res.script)).not.toThrow();
        expect(res.fileName).toMatch(/^[a-zA-Z0-9_]+_Generator\.py$/);
      }
    });

    it('1.5 sanitizes targetClass and packagePath injection attempts', () => {
      const adversarialTargets = [
        { targetClass: 'Actor" Injection', packagePath: '/Game/Blueprints"; rm -rf /' },
        { targetClass: 'Character\nMalicious', packagePath: '/Game/Path/With "Quotes"' },
        { targetClass: 'Pawn; class Malicious: pass', packagePath: '/Game/Test\r\n' },
        { targetClass: '', packagePath: '' },
      ];

      for (const opt of adversarialTargets) {
        const res = generateUE5PythonScript([], [], opt);
        expect(() => assertPythonAstValid(res.script)).not.toThrow();
      }
    });

    it('1.6 escapes node titles and types containing quotes, backslashes, and special characters in summary logs', () => {
      const trickyNodes: Node<NodeData>[] = [
        {
          id: 'n1',
          type: 'customNode',
          position: { x: 0, y: 0 },
          data: {
            title: 'Node with "Double Quotes" and \'Single Quotes\'',
            nodeType: 'function',
            inputs: [],
            outputs: [],
          },
        },
        {
          id: 'n2',
          type: 'customNode',
          position: { x: 100, y: 0 },
          data: {
            title: 'Node with \\ Backslash and \\\\ Double Backslash',
            nodeType: 'macro',
            inputs: [],
            outputs: [],
          },
        },
        {
          id: 'n3',
          type: 'customNode',
          position: { x: 200, y: 0 },
          data: {
            title: 'Node with """ Triple Double """ and \'\'\' Triple Single \'\'\'',
            nodeType: 'event',
            inputs: [],
            outputs: [],
          },
        },
        {
          id: 'n4',
          type: 'customNode',
          position: { x: 300, y: 0 },
          data: {
            title: undefined as any,
            nodeType: undefined as any,
            inputs: [],
            outputs: [],
          },
        },
      ];

      const res = generateUE5PythonScript(trickyNodes, [], { blueprintName: 'BP_TrickyNodes' });
      expect(() => assertPythonAstValid(res.script)).not.toThrow();
    });
  });

  // =========================================================================
  // SUITE 2: ueT3DCompiler Multi-Word Pins, Handles, and Edge Serialization
  // =========================================================================
  describe('ueT3DCompiler Adversarial Tests', () => {
    it('2.1 correctly normalizes pin lookup keys across various separators and casings', () => {
      expect(normalizePinLookupKey('Return Value')).toBe('returnvalue');
      expect(normalizePinLookupKey('return-value')).toBe('returnvalue');
      expect(normalizePinLookupKey('return_value')).toBe('returnvalue');
      expect(normalizePinLookupKey('Return   Value')).toBe('returnvalue');
      expect(normalizePinLookupKey('RETURN VALUE')).toBe('returnvalue');
      expect(normalizePinLookupKey('Hit Result')).toBe('hitresult');
      expect(normalizePinLookupKey('hit_result')).toBe('hitresult');
      expect(normalizePinLookupKey('hit-result')).toBe('hitresult');
      expect(normalizePinLookupKey('Array Element')).toBe('arrayelement');
      expect(normalizePinLookupKey('In')).toBe('execute');
      expect(normalizePinLookupKey('Execute')).toBe('execute');
      expect(normalizePinLookupKey('Out')).toBe('then');
      expect(normalizePinLookupKey('Then')).toBe('then');
    });

    it('2.2 extracts pin name from diverse handle patterns', () => {
      expect(extractPinNameFromHandle('vector-return-value')).toBe('return-value');
      expect(extractPinNameFromHandle('wildcard-array-element')).toBe('array-element');
      expect(extractPinNameFromHandle('exec-then')).toBe('then');
      expect(extractPinNameFromHandle('struct-hit-result')).toBe('hit-result');
      expect(extractPinNameFromHandle('return-value')).toBe('value'); // first dash
      expect(extractPinNameFromHandle('returnvalue')).toBe('returnvalue');
      expect(extractPinNameFromHandle('')).toBe('');
      expect(extractPinNameFromHandle(null)).toBe('');
      expect(extractPinNameFromHandle(undefined)).toBe('');
    });

    it('2.3 links multi-word pins between nodes with zero warnings and valid LinkedTo output', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'node-foreach',
          type: 'customNode',
          position: { x: 0, y: 0 },
          data: {
            title: 'For Each Loop',
            nodeType: 'macro',
            inputs: [
              { name: 'Exec', type: 'exec' },
              { name: 'Array', type: 'array', containerType: 'array', innerType: 'float' },
            ],
            outputs: [
              { name: 'Loop Body', type: 'exec' },
              { name: 'Array Element', type: 'float' },
              { name: 'Array Index', type: 'int' },
              { name: 'Completed', type: 'exec' },
            ],
          },
        },
        {
          id: 'node-print',
          type: 'customNode',
          position: { x: 400, y: 0 },
          data: {
            title: 'Print String',
            nodeType: 'function',
            inputs: [
              { name: 'Execute', type: 'exec' },
              { name: 'In String', type: 'string' },
            ],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'e-exec',
          source: 'node-foreach',
          target: 'node-print',
          sourceHandle: 'exec-loop-body',
          targetHandle: 'exec-execute',
        },
        {
          id: 'e-data',
          source: 'node-foreach',
          target: 'node-print',
          sourceHandle: 'float-array-element',
          targetHandle: 'string-in-string',
        },
      ];

      const res = compileGraphToT3D(nodes, edges);
      expect(res.warnings).toHaveLength(0);
      expect(res.connectionCount).toBe(2);
      expect(res.nodeCount).toBe(2);

      // Verify LinkedTo syntax contains both links
      expect(res.t3dText).toContain('PinName="Loop Body"');
      expect(res.t3dText).toContain('PinName="Array Element"');
      expect(res.t3dText).toContain('PinName="In String"');

      // Both nodes should have LinkedTo statements
      const linkedToMatches = res.t3dText.match(/LinkedTo=\([^)]+\)/g);
      expect(linkedToMatches).toBeDefined();
      expect(linkedToMatches!.length).toBeGreaterThanOrEqual(4); // 2 on source, 2 on target
    });

    it('2.4 handles fan-out (1 output connected to multiple inputs) and fan-in (multiple outputs to 1 input)', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'src1',
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
          id: 'tgt1',
          type: 'customNode',
          position: { x: 300, y: -100 },
          data: {
            title: 'Break Hit Result',
            nodeType: 'function',
            inputs: [{ name: 'Hit Result', type: 'object' }, { name: 'Location', type: 'vector' }],
            outputs: [],
          },
        },
        {
          id: 'tgt2',
          type: 'customNode',
          position: { x: 300, y: 100 },
          data: {
            title: 'Set Actor Location',
            nodeType: 'function',
            inputs: [{ name: 'New Location', type: 'vector' }],
            outputs: [],
          },
        },
      ];

      const edges: Edge[] = [
        {
          id: 'e1',
          source: 'src1',
          target: 'tgt1',
          sourceHandle: 'vector-return-value',
          targetHandle: 'vector-location',
        },
        {
          id: 'e2',
          source: 'src1',
          target: 'tgt2',
          sourceHandle: 'vector-return-value',
          targetHandle: 'vector-new-location',
        },
      ];

      const res = compileGraphToT3D(nodes, edges);
      expect(res.warnings).toHaveLength(0);

      // The output pin on src1 should link to BOTH tgt1 and tgt2 in a single LinkedTo=(...,...,)
      const src1Block = res.t3dText.split('Begin Object').find(b => b.includes('MakeVector') || b.includes('src1'));
      expect(src1Block).toBeDefined();
      const outputPinLine = src1Block!.split('\n').find(l => l.includes('PinName="Return Value"'));
      expect(outputPinLine).toBeDefined();
      expect(outputPinLine).toContain('LinkedTo=');
      // Should have 2 comma-separated targets
      const linkMatch = outputPinLine!.match(/LinkedTo=\(([^)]+)\)/);
      expect(linkMatch).toBeDefined();
      const targets = linkMatch![1].split(',').filter(t => t.trim().length > 0);
      expect(targets.length).toBe(2);
    });

    it('2.5 compiles container pins (TArray, TSet, TMap) with authentic UE5 T3D metadata', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'node-containers',
          type: 'customNode',
          position: { x: 0, y: 0 },
          data: {
            title: 'Container Operations',
            nodeType: 'function',
            inputs: [
              { name: 'MyArray', type: 'array', containerType: 'array', innerType: 'int' },
              { name: 'MySet', type: 'set', containerType: 'set', innerType: 'string' },
              { name: 'MyMap', type: 'map', containerType: 'map', innerType: 'int', valueType: 'float' },
            ],
            outputs: [
              { name: 'OutArray', type: 'array', containerType: 'array', innerType: 'int' },
            ],
          },
        },
      ];

      const res = compileGraphToT3D(nodes, []);
      expect(res.t3dText).toContain('PinType.ContainerType=Array,PinType.bIsArray=True');
      expect(res.t3dText).toContain('PinType.ContainerType=Set,PinType.bIsSet=True');
      expect(res.t3dText).toContain('PinType.ContainerType=Map,PinType.bIsMap=True,PinType.PinValueType=(TerminalCategory="real",TerminalSubCategoryObject=Float)');
    });

    it('2.6 compiles comment boxes and reroute knots accurately', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'comment-1',
          type: 'commentNode',
          position: { x: -100, y: -200 },
          data: {
            title: 'Movement & Combat Logic',
            nodeType: 'macro',
            inputs: [],
            outputs: [],
          },
        },
        {
          id: 'reroute-1',
          type: 'customNode',
          position: { x: 200, y: 150 },
          data: {
            title: 'Reroute',
            nodeType: 'reroute',
            inputs: [{ name: 'In', type: 'exec' }],
            outputs: [{ name: 'Out', type: 'exec' }],
          },
        },
      ];

      const res = compileGraphToT3D(nodes, []);
      expect(res.t3dText).toContain('Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment');
      expect(res.t3dText).toContain('NodePosX=-100');
      expect(res.t3dText).toContain('NodePosY=-200');
      expect(res.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_Knot');
    });
  });

  // =========================================================================
  // SUITE 3: ueT3DParser Hyphenated UUIDs, Edge Parsing, and Resiliency
  // =========================================================================
  describe('ueT3DParser Adversarial Tests', () => {
    it('3.1 parses standard RFC 4122 hyphenated lowercase and uppercase UUIDs without truncation', () => {
      const t3d = `
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_A"
   NodePosX=100
   NodePosY=100
   CustomProperties Pin (PinId=f47ac10b-58cc-4372-a567-0e02b2c3d479,PinName="OutVal",PinType.PinCategory="int",Direction="EGPD_Output",LinkedTo=(Node_B 7c9e6679-7425-40de-944b-e07fc1f90ae7,))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_B"
   NodePosX=400
   NodePosY=100
   CustomProperties Pin (PinId=7C9E6679-7425-40DE-944B-E07FC1F90AE7,PinName="InVal",PinType.PinCategory="int",Direction="EGPD_Input",LinkedTo=(Node_A f47ac10b-58cc-4372-a567-0e02b2c3d479,))
End Object
      `.trim();

      const res = parseUE5T3DToGraph(t3d);
      expect(res.nodes).toHaveLength(2);
      expect(res.edges).toHaveLength(1);
      expect(res.edges[0].sourceHandle).toBe('int-outval');
      expect(res.edges[0].targetHandle).toBe('int-inval');
    });

    it('3.2 parses quoted PinIds with hyphens and spaces in PinName', () => {
      const t3d = `
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_Alpha"
   NodePosX=0
   NodePosY=0
   CustomProperties Pin (PinId="11223344-5566-7788-99AA-BBCCDDEEFF00",PinName="Return Value",PinType.PinCategory="struct",PinType.PinSubCategoryObject=/Script/CoreUObject.Vector,Direction="EGPD_Output",LinkedTo=(Node_Beta "AABBCCDD-EEFF-0011-2233-445566778899",))
End Object
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_Beta"
   NodePosX=300
   NodePosY=0
   CustomProperties Pin (PinId="aabbccdd-eeff-0011-2233-445566778899",PinName="Target Location",PinType.PinCategory="struct",PinType.PinSubCategoryObject=/Script/CoreUObject.Vector,Direction="EGPD_Input",LinkedTo=(Node_Alpha "11223344-5566-7788-99AA-BBCCDDEEFF00",))
End Object
      `.trim();

      const res = parseUE5T3DToGraph(t3d);
      expect(res.nodes).toHaveLength(2);
      expect(res.edges).toHaveLength(1);
      expect(res.edges[0].sourceHandle).toBe('vector-return-value');
      expect(res.edges[0].targetHandle).toBe('vector-target-location');
    });

    it('3.3 correctly parses container metadata (Array, Set, Map) from T3D text', () => {
      const t3d = `
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="Node_Containers"
   NodePosX=0
   NodePosY=0
   CustomProperties Pin (PinId=00000000000000000000000000000001,PinName="ItemArray",PinType.PinCategory="int",PinType.ContainerType=Array,PinType.bIsArray=True,Direction="EGPD_Input")
   CustomProperties Pin (PinId=00000000000000000000000000000002,PinName="NameSet",PinType.PinCategory="string",PinType.ContainerType=Set,PinType.bIsSet=True,Direction="EGPD_Input")
   CustomProperties Pin (PinId=00000000000000000000000000000003,PinName="ScoreMap",PinType.PinCategory="string",PinType.ContainerType=Map,PinType.bIsMap=True,PinType.PinValueType=(TerminalCategory="int"),Direction="EGPD_Output")
End Object
      `.trim();

      const res = parseUE5T3DToGraph(t3d);
      expect(res.nodes).toHaveLength(1);
      const node = res.nodes[0];
      const inPins = node.data.inputs;
      const outPins = node.data.outputs;

      const arrPin = inPins.find(p => p.name === 'ItemArray');
      expect(arrPin).toBeDefined();
      expect(arrPin!.containerType).toBe('array');

      const setPin = inPins.find(p => p.name === 'NameSet');
      expect(setPin).toBeDefined();
      expect(setPin!.containerType).toBe('set');

      const mapPin = outPins.find(p => p.name === 'ScoreMap');
      expect(mapPin).toBeDefined();
      expect(mapPin!.containerType).toBe('map');
      expect(mapPin!.valueType).toBe('int');
    });

    it('3.4 throws descriptive error when given invalid or empty T3D input', () => {
      expect(() => parseUE5T3DToGraph('')).toThrow(/missing "Begin Object"/i);
      expect(() => parseUE5T3DToGraph('Random text without UE5 objects')).toThrow(/missing "Begin Object"/i);
    });

    it('3.5 parses negative coordinates and large dimensions correctly', () => {
      const t3d = `
Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment Name="Comment_Neg"
   NodePosX=-1250
   NodePosY=-850
   NodeWidth=1200
   NodeHeight=800
   NodeComment="Subsystem Area"
   NodeGuid=11112222333344445555666677778888
End Object
      `.trim();

      const res = parseUE5T3DToGraph(t3d);
      expect(res.nodes).toHaveLength(1);
      expect(res.nodes[0].position.x).toBe(-1250);
      expect(res.nodes[0].position.y).toBe(-850);
      expect(res.nodes[0].type).toBe('commentNode');
    });
  });

  // =========================================================================
  // SUITE 4: End-to-End Roundtrip Stress: Graph -> T3D -> Graph -> T3D
  // =========================================================================
  describe('Full Graph Roundtrip Fidelity', () => {
    it('4.1 survives double roundtrip (Noder -> T3D -> Noder -> T3D) with multi-word pins & containers', () => {
      const originalNodes: Node<NodeData>[] = [
        {
          id: 'node-event',
          type: 'customNode',
          position: { x: 0, y: 100 },
          data: {
            title: 'Event BeginPlay',
            nodeType: 'event',
            inputs: [],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
        {
          id: 'node-make',
          type: 'customNode',
          position: { x: 300, y: 100 },
          data: {
            title: 'Make Vector',
            nodeType: 'function',
            inputs: [
              { name: 'X', type: 'float', value: 10.5 },
              { name: 'Y', type: 'float', value: 20.0 },
              { name: 'Z', type: 'float', value: 30.25 },
            ],
            outputs: [{ name: 'Return Value', type: 'vector' }],
          },
        },
        {
          id: 'node-break',
          type: 'customNode',
          position: { x: 600, y: 100 },
          data: {
            title: 'Break Hit Result',
            nodeType: 'function',
            inputs: [{ name: 'Hit Result', type: 'object' }],
            outputs: [
              { name: 'Location', type: 'vector' },
              { name: 'Hit Item', type: 'int' },
            ],
          },
        },
      ];

      const originalEdges: Edge[] = [
        {
          id: 'e1',
          source: 'node-make',
          target: 'node-break',
          sourceHandle: 'vector-return-value',
          targetHandle: 'object-hit-result',
        },
      ];

      // Round 1: Noder -> T3D
      const t3d1 = compileGraphToT3D(originalNodes, originalEdges);
      expect(t3d1.warnings).toHaveLength(0);
      expect(t3d1.t3dText).toContain('LinkedTo=');

      // Round 1: T3D -> Noder
      const parsed1 = parseUE5T3DToGraph(t3d1.t3dText);
      expect(parsed1.nodes).toHaveLength(3);
      expect(parsed1.edges).toHaveLength(1);

      // Verify node positions & titles survived
      const makeNode1 = parsed1.nodes.find(n => n.data.title === 'Make Vector');
      const breakNode1 = parsed1.nodes.find(n => n.data.title === 'Break Hit Result');
      expect(makeNode1).toBeDefined();
      expect(breakNode1).toBeDefined();

      // Round 2: Noder -> T3D
      const t3d2 = compileGraphToT3D(parsed1.nodes, parsed1.edges);
      expect(t3d2.warnings).toHaveLength(0);
      expect(t3d2.t3dText).toContain('LinkedTo=');

      // Round 2: T3D -> Noder
      const parsed2 = parseUE5T3DToGraph(t3d2.t3dText);
      expect(parsed2.nodes).toHaveLength(3);
      expect(parsed2.edges).toHaveLength(1);
    });

    it('4.2 generates valid Python script from a roundtripped graph', () => {
      const originalNodes: Node<NodeData>[] = [
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
            inputs: [
              { name: 'Execute', type: 'exec' },
              { name: 'In String', type: 'string', value: 'Adversarial Test' },
            ],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];

      const originalEdges: Edge[] = [
        {
          id: 'e1',
          source: 'n1',
          target: 'n2',
          sourceHandle: 'exec-then',
          targetHandle: 'exec-execute',
        },
      ];

      // Roundtrip through T3D
      const compiled = compileGraphToT3D(originalNodes, originalEdges);
      const parsed = parseUE5T3DToGraph(compiled.t3dText);

      // Feed parsed graph into Python Generator
      const pyResult = generateUE5PythonScript(parsed.nodes, parsed.edges, {
        blueprintName: 'BP_Roundtrip_Automation',
        targetClass: 'Actor',
        packagePath: '/Game/Adversarial',
      });

      expect(pyResult.nodeCount).toBe(2);
      expect(pyResult.connectionCount).toBe(1);
      expect(() => assertPythonAstValid(pyResult.script)).not.toThrow();
    });

    it('4.3 correctly compiles and parses Sequence node with multiple numbered outputs (Then 0, Then 1, Then 2)', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'seq-1',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Sequence',
            nodeType: 'function',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [
              { name: 'Then 0', type: 'exec' },
              { name: 'Then 1', type: 'exec' },
              { name: 'Then 2', type: 'exec' },
            ],
          },
        },
        {
          id: 'fn-0',
          type: 'customNode',
          position: { x: 400, y: 0 },
          data: {
            title: 'Print String',
            nodeType: 'function',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [],
          },
        },
        {
          id: 'fn-1',
          type: 'customNode',
          position: { x: 400, y: 150 },
          data: {
            title: 'Print String',
            nodeType: 'function',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [],
          },
        },
        {
          id: 'fn-2',
          type: 'customNode',
          position: { x: 400, y: 300 },
          data: {
            title: 'Print String',
            nodeType: 'function',
            inputs: [{ name: 'Execute', type: 'exec' }],
            outputs: [],
          },
        },
      ];

      const edges: Edge[] = [
        { id: 'e0', source: 'seq-1', target: 'fn-0', sourceHandle: 'exec-then-0', targetHandle: 'exec-execute' },
        { id: 'e1', source: 'seq-1', target: 'fn-1', sourceHandle: 'exec-then-1', targetHandle: 'exec-execute' },
        { id: 'e2', source: 'seq-1', target: 'fn-2', sourceHandle: 'exec-then-2', targetHandle: 'exec-execute' },
      ];

      const compiled = compileGraphToT3D(nodes, edges);
      expect(compiled.warnings).toHaveLength(0);
      expect(compiled.connectionCount).toBe(3);

      const parsed = parseUE5T3DToGraph(compiled.t3dText);
      expect(parsed.nodes).toHaveLength(4);
      expect(parsed.edges).toHaveLength(3);
    });

    it('4.4 preserves complex pin values and default values across roundtrip without corruption', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'node-vals',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Math Node',
            nodeType: 'function',
            inputs: [
              { name: 'IntVal', type: 'int', value: 42 },
              { name: 'FloatVal', type: 'float', value: 3.14159 },
              { name: 'StringVal', type: 'string', value: 'Hello Unreal Engine 5' },
              { name: 'BoolVal', type: 'bool', value: true },
            ],
            outputs: [
              { name: 'Return Value', type: 'float' },
            ],
          },
        },
      ];

      const compiled = compileGraphToT3D(nodes, []);
      expect(compiled.t3dText).toContain('DefaultValue="42"');
      expect(compiled.t3dText).toContain('DefaultValue="3.14159"');
      expect(compiled.t3dText).toContain('DefaultValue="Hello Unreal Engine 5"');
      expect(compiled.t3dText).toContain('DefaultValue="true"');

      const parsed = parseUE5T3DToGraph(compiled.t3dText);
      expect(parsed.nodes).toHaveLength(1);
      const parsedInputs = parsed.nodes[0].data.inputs;

      expect(parsedInputs.find(p => p.name === 'IntVal')?.value).toBe('42');
      expect(parsedInputs.find(p => p.name === 'FloatVal')?.value).toBe('3.14159');
      expect(parsedInputs.find(p => p.name === 'StringVal')?.value).toBe('Hello Unreal Engine 5');
      expect(parsedInputs.find(p => p.name === 'BoolVal')?.value).toBe('true');
    });
  });
});
