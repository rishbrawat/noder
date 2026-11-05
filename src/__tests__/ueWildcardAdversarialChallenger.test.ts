import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { NodeData, PinData } from '../types/BlueprintTypes';
import {
  resetWildcardGroup,
  propagateWildcardTransitive,
  canonicalizePinName,
} from '../utils/ueWildcardResolver';
import {
  isValidBlueprintConnection,
  arePinsCompatible,
  findPin,
} from '../utils/ueConnectionValidator';

describe('Adversarial Challenger Suite: Wildcards & Connection Validator', () => {
  // =========================================================================
  // Challenge 1: Canonical Name Matching Edge Cases & Collision Resistance
  // =========================================================================
  describe('Pin Name Canonicalization & Disambiguation', () => {
    it('accurately disambiguates overlapping pin names like "Item" vs "Item to Find"', () => {
      const node: Node<NodeData> = {
        id: 'node-find',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Array Find',
          nodeType: 'function',
          inputs: [
            { name: 'Target Array', type: 'wildcard', containerType: 'array' },
            { name: 'Item to Find', type: 'wildcard' },
          ],
          outputs: [{ name: 'Index', type: 'int' }],
        },
      };

      const matchedPin = findPin(node, 'wildcard-item-to-find', 'input');
      expect(matchedPin?.name).toBe('Item to Find');
    });

    it('handles exotic punctuation, parens, and multiple spaces in pin names', () => {
      expect(canonicalizePinName('Array  Element')).toBe('arrayelement');
      expect(canonicalizePinName('Return (Value)!')).toBe('returnvalue');
      expect(canonicalizePinName('New_Item__1')).toBe('newitem1');
    });
  });

  // =========================================================================
  // Challenge 2: Transitive Propagation Cycles and Termination
  // =========================================================================
  describe('Transitive Propagation Termination and Cycle Robustness', () => {
    it('terminates safely when cyclical reroute knots exist in the graph without hanging', () => {
      // Knot 1 -> Knot 2 -> Knot 3 -> Knot 1 (Cycle)
      const knot1: Node<NodeData> = {
        id: 'k1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Reroute 1',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };
      const knot2: Node<NodeData> = {
        id: 'k2',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Reroute 2',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };
      const knot3: Node<NodeData> = {
        id: 'k3',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Reroute 3',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };
      const source: Node<NodeData> = {
        id: 'src',
        type: 'customNode',
        position: { x: -100, y: 0 },
        data: {
          title: 'Source',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Value', type: 'int' }],
        },
      };

      const edges: Edge[] = [
        { id: 'e0', source: 'src', target: 'k1', sourceHandle: 'int-value', targetHandle: 'wildcard-in' },
        { id: 'e1', source: 'k1', target: 'k2', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e2', source: 'k2', target: 'k3', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e3', source: 'k3', target: 'k1', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
      ];

      const start = Date.now();
      const result = propagateWildcardTransitive([source, knot1, knot2, knot3], edges);
      const elapsed = Date.now() - start;

      // Must terminate well under 1 second (due to maxIterations = 20 guard)
      expect(elapsed).toBeLessThan(1000);

      // Knots should be resolved to int
      const rk1 = result.find(n => n.id === 'k1');
      const rk2 = result.find(n => n.id === 'k2');
      const rk3 = result.find(n => n.id === 'k3');
      expect(rk1?.data.outputs[0].type).toBe('int');
      expect(rk2?.data.outputs[0].type).toBe('int');
      expect(rk3?.data.outputs[0].type).toBe('int');
    });

    it('strictly isolates exec flow from poisoning data wildcard pins in complex branching', () => {
      const branch: Node<NodeData> = {
        id: 'branch-node',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Branch',
          nodeType: 'function',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Condition', type: 'bool' },
          ],
          outputs: [
            { name: 'True', type: 'exec' },
            { name: 'False', type: 'exec' },
          ],
        },
      };

      const rerouteExec: Node<NodeData> = {
        id: 'k-exec',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Reroute Exec',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      // Connecting exec 'True' to wildcard 'In' must NOT propagate exec as a concrete data type
      const edges: Edge[] = [
        { id: 'e-exec', source: 'branch-node', target: 'k-exec', sourceHandle: 'exec-true', targetHandle: 'wildcard-in' },
      ];

      const propagated = propagateWildcardTransitive([branch, rerouteExec], edges);
      const rKnot = propagated.find(n => n.id === 'k-exec');
      expect(rKnot?.data.inputs[0].type).toBe('wildcard');
      expect(rKnot?.data.outputs[0].type).toBe('wildcard');
    });
  });

  // =========================================================================
  // Challenge 3: Resetting Multi-Group Nodes with 3+ Groups
  // =========================================================================
  describe('Multi-Group Nodes with 3 Groups Partial Reset', () => {
    it('correctly resets only disconnected groups while preserving multiple connected groups', () => {
      const tripleNode: Node<NodeData> = {
        id: 'node-triple',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Triple Group Node',
          nodeType: 'customNode',
          wildcardGroups: [
            {
              groupId: 'Group1',
              pins: [
                { pinName: 'In1', direction: 'input', role: 'element', containerType: 'none' },
                { pinName: 'Out1', direction: 'output', role: 'element', containerType: 'none' },
              ],
            },
            {
              groupId: 'Group2',
              pins: [
                { pinName: 'In2', direction: 'input', role: 'element', containerType: 'none' },
                { pinName: 'Out2', direction: 'output', role: 'element', containerType: 'none' },
              ],
            },
            {
              groupId: 'Group3',
              pins: [
                { pinName: 'In3', direction: 'input', role: 'element', containerType: 'none' },
                { pinName: 'Out3', direction: 'output', role: 'element', containerType: 'none' },
              ],
            },
          ],
          inputs: [
            { name: 'In1', type: 'int' },
            { name: 'In2', type: 'float' },
            { name: 'In3', type: 'string' },
          ],
          outputs: [
            { name: 'Out1', type: 'int' },
            { name: 'Out2', type: 'float' },
            { name: 'Out3', type: 'string' },
          ],
        } as any,
      };

      const donor1: Node<NodeData> = {
        id: 'donor1',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: { title: 'D1', nodeType: 'function', inputs: [], outputs: [{ name: 'V1', type: 'int' }] },
      };
      const donor3: Node<NodeData> = {
        id: 'donor3',
        type: 'customNode',
        position: { x: -200, y: 100 },
        data: { title: 'D3', nodeType: 'function', inputs: [], outputs: [{ name: 'V3', type: 'string' }] },
      };

      // Only Group1 and Group3 are connected; Group2 is disconnected
      const remainingEdges: Edge[] = [
        { id: 'e1', source: 'donor1', target: 'node-triple', sourceHandle: 'int-v1', targetHandle: 'int-in1' },
        { id: 'e3', source: 'donor3', target: 'node-triple', sourceHandle: 'string-v3', targetHandle: 'string-in3' },
      ];

      const res = resetWildcardGroup(tripleNode, remainingEdges, [donor1, donor3, tripleNode]);

      // Group 1 retains int
      expect(res.data.inputs.find(p => p.name === 'In1')?.type).toBe('int');
      expect(res.data.outputs.find(p => p.name === 'Out1')?.type).toBe('int');

      // Group 2 is reset to wildcard
      expect(res.data.inputs.find(p => p.name === 'In2')?.type).toBe('wildcard');
      expect(res.data.outputs.find(p => p.name === 'Out2')?.type).toBe('wildcard');

      // Group 3 retains string
      expect(res.data.inputs.find(p => p.name === 'In3')?.type).toBe('string');
      expect(res.data.outputs.find(p => p.name === 'Out3')?.type).toBe('string');
    });

    it('resets all groups to wildcard when all edges are disconnected', () => {
      const tripleNode: Node<NodeData> = {
        id: 'node-triple-full-reset',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Triple Group Node',
          nodeType: 'customNode',
          wildcardGroups: [
            {
              groupId: 'Group1',
              pins: [{ pinName: 'In1', direction: 'input', role: 'element', containerType: 'none' }],
            },
            {
              groupId: 'Group2',
              pins: [{ pinName: 'In2', direction: 'input', role: 'element', containerType: 'none' }],
            },
          ],
          inputs: [
            { name: 'In1', type: 'int' },
            { name: 'In2', type: 'float' },
          ],
          outputs: [],
        } as any,
      };

      const res = resetWildcardGroup(tripleNode, [], [tripleNode]);
      expect(res.data.inputs[0].type).toBe('wildcard');
      expect(res.data.inputs[1].type).toBe('wildcard');
    });
  });

  // =========================================================================
  // Challenge 4: Set vs Map vs Array Hashability Boundaries
  // =========================================================================
  describe('Hashability Boundaries: Sets vs Maps vs Arrays', () => {
    it('allows Vector in TArray (valid in UE5), but rejects Vector in TSet and TMap Key', () => {
      // 1. TArray of Vectors is valid in UE5
      const vectorArrayA: PinData = { name: 'VecArrayA', type: 'vector', containerType: 'array', innerType: 'vector' };
      const vectorArrayB: PinData = { name: 'VecArrayB', type: 'vector', containerType: 'array', innerType: 'vector' };
      expect(arePinsCompatible(vectorArrayA, vectorArrayB)).toBe(true);

      // 2. TSet of Vectors is INVALID in UE5 (non-hashable)
      const vectorSetA: PinData = { name: 'VecSetA', type: 'vector', containerType: 'set', innerType: 'vector' };
      const vectorSetB: PinData = { name: 'VecSetB', type: 'vector', containerType: 'set', innerType: 'vector' };
      expect(arePinsCompatible(vectorSetA, vectorSetB)).toBe(false);

      // 3. TMap with Vector as KEY is INVALID in UE5
      const vectorMapKeyA: PinData = { name: 'VecKeyMapA', type: 'vector', containerType: 'map', innerType: 'vector', valueType: 'int' };
      const vectorMapKeyB: PinData = { name: 'VecKeyMapB', type: 'vector', containerType: 'map', innerType: 'vector', valueType: 'int' };
      expect(arePinsCompatible(vectorMapKeyA, vectorMapKeyB)).toBe(false);

      // 4. TMap with Vector as VALUE is VALID in UE5 (key is hashable string)
      const vectorMapValA: PinData = { name: 'VecValMapA', type: 'string', containerType: 'map', innerType: 'string', valueType: 'vector' };
      const vectorMapValB: PinData = { name: 'VecValMapB', type: 'string', containerType: 'map', innerType: 'string', valueType: 'vector' };
      expect(arePinsCompatible(vectorMapValA, vectorMapValB)).toBe(true);
    });

    it('rejects connecting Vector to Map Key wildcard pin via isValidBlueprintConnection', () => {
      const vecNode: Node<NodeData> = {
        id: 'node-v',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Make Vector',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      };

      const mapAddNode: Node<NodeData> = {
        id: 'node-mapadd',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Map Add',
          nodeType: 'function',
          inputs: [
            { name: 'Target Map', type: 'wildcard', containerType: 'map' },
            { name: 'Key', type: 'wildcard' },
            { name: 'Value', type: 'wildcard' },
          ],
          outputs: [],
        },
      };

      // Vector to Key: INVALID
      const keyConn = {
        source: 'node-v',
        target: 'node-mapadd',
        sourceHandle: 'vector-return-value',
        targetHandle: 'wildcard-key',
      };
      expect(isValidBlueprintConnection(keyConn, [vecNode, mapAddNode], [])).toBe(false);

      // Vector to Value: VALID
      const valConn = {
        source: 'node-v',
        target: 'node-mapadd',
        sourceHandle: 'vector-return-value',
        targetHandle: 'wildcard-value',
      };
      expect(isValidBlueprintConnection(valConn, [vecNode, mapAddNode], [])).toBe(true);
    });
  });

  // =========================================================================
  // Challenge 5: Nested Containers and Exec Containers
  // =========================================================================
  describe('Nested Container & Exec Container Prohibitions', () => {
    it('rejects TMap containing nested TArray value', () => {
      const nestedMapVal: PinData = {
        name: 'NestedMap',
        type: 'string',
        containerType: 'map',
        innerType: 'string',
        valueType: 'array',
      };
      expect(arePinsCompatible(nestedMapVal, nestedMapVal)).toBe(false);
    });

    it('rejects TArray containing exec elements', () => {
      const execArrayPin: PinData = {
        name: 'ExecArray',
        type: 'exec',
        containerType: 'array',
        innerType: 'exec',
      };
      expect(arePinsCompatible(execArrayPin, execArrayPin)).toBe(false);
    });

    it('rejects TMap with exec key or exec value', () => {
      const execMapKey: PinData = {
        name: 'ExecMapKey',
        type: 'exec',
        containerType: 'map',
        innerType: 'exec',
        valueType: 'int',
      };
      expect(arePinsCompatible(execMapKey, execMapKey)).toBe(false);

      const execMapVal: PinData = {
        name: 'ExecMapVal',
        type: 'string',
        containerType: 'map',
        innerType: 'string',
        valueType: 'exec',
      };
      expect(arePinsCompatible(execMapVal, execMapVal)).toBe(false);
    });
  });
});
