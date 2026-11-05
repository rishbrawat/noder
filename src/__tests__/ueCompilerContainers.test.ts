import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import {
  NodeData,
  PinData,
  normalizeContainerType,
} from '../types/BlueprintTypes';
import {
  resolveWildcardConnection,
  resetWildcardGroup,
  propagateWildcardTransitive,
  getWildcardGroupsForNode,
} from '../utils/ueWildcardResolver';
import {
  isValidBlueprintConnection,
  isHashablePinType,
  areScalarTypesCompatible,
  arePinsCompatible,
} from '../utils/ueConnectionValidator';
import { compileGraphToT3D } from '../utils/ueT3DCompiler';
import { parseUE5T3DToGraph } from '../utils/ueT3DParser';
import { generateUE5PythonScript } from '../utils/uePythonGenerator';

describe('UE5 Compiler, Container Types, Wildcard Resolution & Python Bridge', () => {
  // =========================================================================
  // 1. Container Types & Normalization Tests
  // =========================================================================
  describe('Container Types Normalization', () => {
    it('normalizes container types correctly for standard and alias notations', () => {
      expect(normalizeContainerType('array')).toBe('array');
      expect(normalizeContainerType('TArray')).toBe('array');
      expect(normalizeContainerType(undefined, 'array')).toBe('array');
      expect(normalizeContainerType(undefined, 'TArray')).toBe('array');

      expect(normalizeContainerType('set')).toBe('set');
      expect(normalizeContainerType('TSet')).toBe('set');
      expect(normalizeContainerType(undefined, 'set')).toBe('set');
      expect(normalizeContainerType(undefined, 'TSet')).toBe('set');

      expect(normalizeContainerType('map')).toBe('map');
      expect(normalizeContainerType('TMap')).toBe('map');
      expect(normalizeContainerType(undefined, 'map')).toBe('map');
      expect(normalizeContainerType(undefined, 'TMap')).toBe('map');

      expect(normalizeContainerType('none')).toBe('none');
      expect(normalizeContainerType(undefined, 'int')).toBe('none');
      expect(normalizeContainerType()).toBe('none');
    });

    it('identifies hashable pin types for Set elements and Map keys', () => {
      expect(isHashablePinType('int')).toBe(true);
      expect(isHashablePinType('float')).toBe(true);
      expect(isHashablePinType('bool')).toBe(true);
      expect(isHashablePinType('string')).toBe(true);
      expect(isHashablePinType('name')).toBe(true);
      expect(isHashablePinType('byte')).toBe(true);
      expect(isHashablePinType('object')).toBe(true);
      expect(isHashablePinType('class')).toBe(true);

      // Non-hashable in UE5 sets/map-keys
      expect(isHashablePinType('exec')).toBe(false);
      expect(isHashablePinType('materialattributes')).toBe(false);
      expect(isHashablePinType('vector')).toBe(false);
      expect(isHashablePinType('rotator')).toBe(false);
      expect(isHashablePinType('transform')).toBe(false);
    });
  });

  // =========================================================================
  // 2. Blueprint Connection Validator Tests
  // =========================================================================
  describe('Connection Validation Matrix', () => {
    it('allows identical scalar connections and safe numeric widening', () => {
      expect(areScalarTypesCompatible('int', 'int')).toBe(true);
      expect(areScalarTypesCompatible('float', 'float')).toBe(true);
      expect(areScalarTypesCompatible('string', 'string')).toBe(true);

      // Widening: byte -> int -> float
      expect(areScalarTypesCompatible('byte', 'int')).toBe(true);
      expect(areScalarTypesCompatible('byte', 'float')).toBe(true);
      expect(areScalarTypesCompatible('int', 'float')).toBe(true);

      // Narrowing or mismatched: disallowed
      expect(areScalarTypesCompatible('float', 'int')).toBe(false);
      expect(areScalarTypesCompatible('string', 'int')).toBe(false);
    });

    it('enforces container-to-container matching rules', () => {
      const arrayIntPin: PinData = { name: 'Items', type: 'int', containerType: 'array', innerType: 'int' };
      const arrayFloatPin: PinData = { name: 'Values', type: 'float', containerType: 'array', innerType: 'float' };
      const arrayIntTarget: PinData = { name: 'TargetItems', type: 'int', containerType: 'array', innerType: 'int' };
      const scalarIntPin: PinData = { name: 'Count', type: 'int' };
      const setIntPin: PinData = { name: 'UniqueInts', type: 'int', containerType: 'set', innerType: 'int' };

      // Array to Array matching innerType
      expect(arePinsCompatible(arrayIntPin, arrayIntTarget)).toBe(true);

      // Array to Array mismatched innerType (arrays cannot widen in UE5)
      expect(arePinsCompatible(arrayIntPin, arrayFloatPin)).toBe(false);

      // Array to Scalar: invalid
      expect(arePinsCompatible(arrayIntPin, scalarIntPin)).toBe(false);

      // Scalar to Array: invalid
      expect(arePinsCompatible(scalarIntPin, arrayIntPin)).toBe(false);

      // Array to Set: invalid
      expect(arePinsCompatible(arrayIntPin, setIntPin)).toBe(false);
    });

    it('enforces Set hashability and Map key/value constraints', () => {
      const validSet: PinData = { name: 'Names', type: 'string', containerType: 'set', innerType: 'string' };
      const invalidSet: PinData = { name: 'Vectors', type: 'vector', containerType: 'set', innerType: 'vector' };
      const targetSet: PinData = { name: 'InNames', type: 'string', containerType: 'set', innerType: 'string' };

      expect(arePinsCompatible(validSet, targetSet)).toBe(true);
      expect(arePinsCompatible(invalidSet, invalidSet)).toBe(false);

      const validMap: PinData = { name: 'Scores', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' };
      const matchingMap: PinData = { name: 'InScores', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' };
      const mismatchedMapVal: PinData = { name: 'InScores', type: 'string', containerType: 'map', innerType: 'string', valueType: 'float' };
      const invalidKeyMap: PinData = { name: 'BadMap', type: 'vector', containerType: 'map', innerType: 'vector', valueType: 'int' };

      expect(arePinsCompatible(validMap, matchingMap)).toBe(true);
      expect(arePinsCompatible(validMap, mismatchedMapVal)).toBe(false);
      expect(arePinsCompatible(invalidKeyMap, invalidKeyMap)).toBe(false);
    });

    it('prohibits exec containers and nested containers in UE5', () => {
      const execSetPinA: PinData = { name: 'ExecSetA', type: 'exec', containerType: 'set' };
      const execSetPinB: PinData = { name: 'ExecSetB', type: 'exec', containerType: 'set' };
      expect(arePinsCompatible(execSetPinA, execSetPinB)).toBe(false);

      const nestedArrayPinA: PinData = { name: 'NestedArrA', type: 'int', containerType: 'array', innerType: 'array' };
      const nestedArrayPinB: PinData = { name: 'NestedArrB', type: 'int', containerType: 'array', innerType: 'array' };
      expect(arePinsCompatible(nestedArrayPinA, nestedArrayPinB)).toBe(false);

      const setOfArraysPin: PinData = { name: 'SetOfArrays', type: 'int', containerType: 'set', innerType: 'array' };
      expect(arePinsCompatible(setOfArraysPin, setOfArraysPin)).toBe(false);
    });

    it('rejects self-connections and duplicate wires into data input pins', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'node-1',
          type: 'customNode',
          position: { x: 0, y: 0 },
          data: {
            title: 'Node 1',
            nodeType: 'function',
            inputs: [],
            outputs: [{ name: 'Result', type: 'int' }],
          },
        },
        {
          id: 'node-2',
          type: 'customNode',
          position: { x: 200, y: 0 },
          data: {
            title: 'Node 2',
            nodeType: 'function',
            inputs: [{ name: 'A', type: 'int' }],
            outputs: [],
          },
        },
      ];

      // Self-connection
      expect(isValidBlueprintConnection({
        source: 'node-1',
        target: 'node-1',
        sourceHandle: 'int-result',
        targetHandle: 'int-a',
      }, nodes, [])).toBe(false);

      // Valid connection
      expect(isValidBlueprintConnection({
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'int-result',
        targetHandle: 'int-a',
      }, nodes, [])).toBe(true);

      // Duplicate wire to target input pin 'A'
      const existingEdges: Edge[] = [
        {
          id: 'edge-existing',
          source: 'node-other',
          target: 'node-2',
          sourceHandle: 'int-val',
          targetHandle: 'int-a',
        },
      ];
      expect(isValidBlueprintConnection({
        source: 'node-1',
        target: 'node-2',
        sourceHandle: 'int-result',
        targetHandle: 'int-a',
      }, nodes, existingEdges)).toBe(false);
    });
  });

  // =========================================================================
  // 3. Wildcard Resolution Engine Tests
  // =========================================================================
  describe('Wildcard Resolution Engine', () => {
    it('detects wildcard equivalence groups for standard and custom nodes', () => {
      const forEachNode: Node<NodeData> = {
        id: 'node-foreach-spec',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [{ name: 'Array', type: 'object' }],
          outputs: [{ name: 'Array Element', type: 'object' }],
        },
      };

      const groups = getWildcardGroupsForNode(forEachNode);
      expect(groups.length).toBeGreaterThan(0);
      expect(groups[0].groupId).toBe('ArrayElementGroup');
      expect(groups[0].pins.some(p => p.pinName === 'Array' && p.role === 'container')).toBe(true);
      expect(groups[0].pins.some(p => p.pinName === 'Array Element' && p.role === 'element')).toBe(true);
    });
    it('resolves For Each Loop element output when connecting a concrete array input', () => {
      const forEachNode: Node<NodeData> = {
        id: 'node-foreach',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Array', type: 'wildcard', containerType: 'array' },
          ],
          outputs: [
            { name: 'Loop Body', type: 'exec' },
            { name: 'Array Element', type: 'wildcard' },
            { name: 'Array Index', type: 'int' },
            { name: 'Completed', type: 'exec' },
          ],
        },
      };

      const sourceArrayPin: PinData = {
        name: 'FloatList',
        type: 'float',
        containerType: 'array',
        innerType: 'float',
      };
      const targetArrayPin: PinData = {
        name: 'Array',
        type: 'wildcard',
        containerType: 'array',
      };

      const { updatedNode, resolved } = resolveWildcardConnection(sourceArrayPin, targetArrayPin, forEachNode);

      expect(resolved).toBe(true);

      const resolvedArrayPin = updatedNode.data.inputs.find(p => p.name === 'Array');
      const resolvedElemPin = updatedNode.data.outputs.find(p => p.name === 'Array Element');

      expect(resolvedArrayPin?.innerType).toBe('float');
      expect(resolvedArrayPin?.containerType).toBe('array');
      expect(resolvedElemPin?.type).toBe('float');
      expect(resolvedElemPin?.containerType).toBe('none');
    });

    it('performs bidirectional type deduction: connecting element pin resolves container pin', () => {
      const forEachNode: Node<NodeData> = {
        id: 'node-foreach-bidi',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Array', type: 'wildcard', containerType: 'array' },
          ],
          outputs: [
            { name: 'Loop Body', type: 'exec' },
            { name: 'Array Element', type: 'wildcard' },
            { name: 'Array Index', type: 'int' },
            { name: 'Completed', type: 'exec' },
          ],
        },
      };

      // Connect Array Element to a concrete int consumer pin
      const consumerPin: PinData = { name: 'Value', type: 'int' };
      const elementPin: PinData = { name: 'Array Element', type: 'wildcard' };

      const { updatedNode, resolved } = resolveWildcardConnection(consumerPin, elementPin, forEachNode);
      expect(resolved).toBe(true);

      const resolvedElemPin = updatedNode.data.outputs.find(p => p.name === 'Array Element');
      const resolvedArrayPin = updatedNode.data.inputs.find(p => p.name === 'Array');

      expect(resolvedElemPin?.type).toBe('int');
      expect(resolvedArrayPin?.innerType).toBe('int');
      expect(resolvedArrayPin?.containerType).toBe('array');
    });

    it('resets wildcard group to wildcard when wires are disconnected', () => {
      const resolvedNode: Node<NodeData> = {
        id: 'node-foreach-reset',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Execute', type: 'exec' },
            { name: 'Array', type: 'int', containerType: 'array', innerType: 'int' },
          ],
          outputs: [
            { name: 'Loop Body', type: 'exec' },
            { name: 'Array Element', type: 'int' },
            { name: 'Array Index', type: 'int' },
          ],
        },
      };

      // With 0 remaining edges, pins should reset to wildcard
      const resetNode = resetWildcardGroup(resolvedNode, []);

      const resetArrayPin = resetNode.data.inputs.find(p => p.name === 'Array');
      const resetElemPin = resetNode.data.outputs.find(p => p.name === 'Array Element');

      expect(resetArrayPin?.type).toBe('wildcard');
      expect(resetArrayPin?.innerType).toBeUndefined();
      expect(resetElemPin?.type).toBe('wildcard');
    });

    it('retains resolved type if another wire in the group remains connected', () => {
      const donorNode: Node<NodeData> = {
        id: 'node-donor',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Get Int Array',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'IntArray', type: 'int', containerType: 'array', innerType: 'int' }],
        },
      };

      const resolvedNode: Node<NodeData> = {
        id: 'node-foreach-retain',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Array', type: 'int', containerType: 'array', innerType: 'int' },
          ],
          outputs: [
            { name: 'Array Element', type: 'int' },
          ],
        },
      };

      const remainingEdge: Edge = {
        id: 'edge-array-donor',
        source: 'node-donor',
        target: 'node-foreach-retain',
        sourceHandle: 'int-intarray',
        targetHandle: 'int-array',
      };

      const updated = resetWildcardGroup(resolvedNode, [remainingEdge], [donorNode, resolvedNode]);
      const elemPin = updated.data.outputs.find(p => p.name === 'Array Element');
      expect(elemPin?.type).toBe('int');
    });

    it('propagates wildcard resolutions transitively across multi-hop reroute chains', () => {
      const nodeSource: Node<NodeData> = {
        id: 'n-source',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Source Numbers',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Nums', type: 'int', containerType: 'array', innerType: 'int' }],
        },
      };

      const nodeKnot1: Node<NodeData> = {
        id: 'n-knot1',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Reroute',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const nodeKnot2: Node<NodeData> = {
        id: 'n-knot2',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Reroute',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const nodeForEach: Node<NodeData> = {
        id: 'n-foreach',
        type: 'customNode',
        position: { x: 600, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [{ name: 'Array', type: 'wildcard', containerType: 'array' }],
          outputs: [{ name: 'Array Element', type: 'wildcard' }],
        },
      };

      const edges: Edge[] = [
        { id: 'e1', source: 'n-source', target: 'n-knot1', sourceHandle: 'int-nums', targetHandle: 'wildcard-in' },
        { id: 'e2', source: 'n-knot1', target: 'n-knot2', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e3', source: 'n-knot2', target: 'n-foreach', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-array' },
      ];

      const nodes = [nodeSource, nodeKnot1, nodeKnot2, nodeForEach];
      const propagated = propagateWildcardTransitive(nodes, edges);

      const finalKnot1 = propagated.find(n => n.id === 'n-knot1');
      const finalKnot2 = propagated.find(n => n.id === 'n-knot2');
      const finalForEach = propagated.find(n => n.id === 'n-foreach');

      expect(finalKnot1?.data.outputs[0].innerType).toBe('int');
      expect(finalKnot2?.data.outputs[0].innerType).toBe('int');
      expect(finalForEach?.data.outputs[0].type).toBe('int');
    });
  });

  // =========================================================================
  // 4. UE5 T3D Compiler & Parser Roundtrip Tests
  // =========================================================================
  describe('T3D Compiler & Parser Container Fidelity', () => {
    it('serializes container properties and routes to native UE5 Kismet libraries', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'node-array-add',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Array Add',
            nodeType: 'function',
            inputs: [
              { name: 'Target Array', type: 'int', containerType: 'array', innerType: 'int' },
              { name: 'New Item', type: 'int', value: 42 },
            ],
            outputs: [{ name: 'Return Value', type: 'int' }],
          },
        },
        {
          id: 'node-set-add',
          type: 'customNode',
          position: { x: 400, y: 100 },
          data: {
            title: 'Set Add',
            nodeType: 'function',
            inputs: [
              { name: 'Target Set', type: 'string', containerType: 'set', innerType: 'string' },
              { name: 'New Item', type: 'string', value: 'Hero' },
            ],
            outputs: [],
          },
        },
        {
          id: 'node-map-find',
          type: 'customNode',
          position: { x: 700, y: 100 },
          data: {
            title: 'Map Find',
            nodeType: 'function',
            inputs: [
              { name: 'Target Map', type: 'string', containerType: 'map', innerType: 'string', valueType: 'vector' },
              { name: 'Key', type: 'string' },
            ],
            outputs: [
              { name: 'Value', type: 'vector' },
            ],
          },
        },
      ];

      const result = compileGraphToT3D(nodes, []);

      // Verify Kismet Library Parent Class routing
      expect(result.t3dText).toContain('MemberParent=Class\'"/Script/Engine.KismetArrayLibrary"\'');
      expect(result.t3dText).toContain('MemberParent=Class\'"/Script/Engine.KismetSetLibrary"\'');
      expect(result.t3dText).toContain('MemberParent=Class\'"/Script/Engine.KismetMapLibrary"\'');

      // Verify Container serialization tokens
      expect(result.t3dText).toContain('PinType.ContainerType=Array');
      expect(result.t3dText).toContain('PinType.bIsArray=True');
      expect(result.t3dText).toContain('PinType.ContainerType=Set');
      expect(result.t3dText).toContain('PinType.bIsSet=True');
      expect(result.t3dText).toContain('PinType.ContainerType=Map');
      expect(result.t3dText).toContain('PinType.bIsMap=True');
      expect(result.t3dText).toContain('PinType.PinValueType=(TerminalCategory="struct",TerminalSubCategoryObject=/Script/CoreUObject.Vector)');
    });

    it('performs full lossless roundtrip with container nodes and pins', () => {
      const originalNodes: Node<NodeData>[] = [
        {
          id: 'orig-node-1',
          type: 'customNode',
          position: { x: 150, y: 250 },
          data: {
            title: 'Array Add',
            nodeType: 'function',
            inputs: [
              { name: 'Target Array', type: 'int', containerType: 'array', innerType: 'int' },
              { name: 'New Item', type: 'int', value: 99 },
            ],
            outputs: [{ name: 'Return Value', type: 'int' }],
          },
        },
        {
          id: 'orig-node-2',
          type: 'customNode',
          position: { x: 500, y: 250 },
          data: {
            title: 'Map Find',
            nodeType: 'function',
            inputs: [
              { name: 'Target Map', type: 'string', containerType: 'map', innerType: 'string', valueType: 'vector' },
              { name: 'Key', type: 'string' },
            ],
            outputs: [{ name: 'Value', type: 'vector' }],
          },
        },
      ];

      const compiled = compileGraphToT3D(originalNodes, []);
      const parsed = parseUE5T3DToGraph(compiled.t3dText);

      expect(parsed.nodes.length).toBe(2);

      const arrayNode = parsed.nodes.find(n => n.data.title.includes('Array'));
      const mapNode = parsed.nodes.find(n => n.data.title.includes('Map'));

      expect(arrayNode).toBeDefined();
      expect(mapNode).toBeDefined();

      const parsedArrayPin = arrayNode!.data.inputs.find(p => p.name === 'Target Array');
      expect(parsedArrayPin?.containerType).toBe('array');
      expect(parsedArrayPin?.innerType).toBe('int');

      const parsedMapPin = mapNode!.data.inputs.find(p => p.name === 'Target Map');
      expect(parsedMapPin?.containerType).toBe('map');
      expect(parsedMapPin?.innerType).toBe('string');
      expect(parsedMapPin?.valueType).toBe('vector');
    });
  });

  // =========================================================================
  // 5. Python Generator Automated Clipboard & Asset Launch Tests
  // =========================================================================
  describe('UE5 Python Automation Generator', () => {
    it('injects automated clipboard push and asset editor launch commands', () => {
      const mockNodes: Node<NodeData>[] = [
        {
          id: 'node-ev',
          type: 'customNode',
          position: { x: 100, y: 100 },
          data: {
            title: 'Event BeginPlay',
            nodeType: 'event',
            inputs: [],
            outputs: [{ name: 'Then', type: 'exec' }],
          },
        },
      ];

      const result = generateUE5PythonScript(mockNodes, [], {
        blueprintName: 'BP_AutoClipboard',
        targetClass: 'Actor',
      });

      expect(result.script).toContain('unreal.SystemLibrary.set_clipboard_content(T3D_CLIPBOARD_DATA)');
      expect(result.script).toContain('unreal.get_editor_subsystem(unreal.AssetEditorSubsystem)');
      expect(result.script).toContain('asset_editor_subsystem.open_editor_for_assets([blueprint_asset])');
      expect(result.script).toContain('T3D_CLIPBOARD_DATA = r\'\'\'');
    });
  });
});
