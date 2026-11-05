import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import {
  NodeData,
  PinData,
} from '../types/BlueprintTypes';
import {
  resetWildcardGroup,
  propagateWildcardTransitive,
} from '../utils/ueWildcardResolver';
import {
  isValidBlueprintConnection,
  isHashablePinType,
  arePinsCompatible,
} from '../utils/ueConnectionValidator';

describe('Adversarial Stress Testing: Wildcard Resolution & Container Validation', () => {
  // =========================================================================
  // 1. Deeply Chained Wildcards (5+ Reroute Knots and Macros in Series)
  // =========================================================================
  describe('1. Deeply Chained Wildcards', () => {
    it('1.1 resolves a forward chain of 5 reroute knots connected to a For Each Loop', () => {
      const sourceNode: Node<NodeData> = {
        id: 'node-source',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Source Array',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'StringArray', type: 'string', containerType: 'array', innerType: 'string' }],
        },
      };

      const knots: Node<NodeData>[] = Array.from({ length: 5 }, (_, i) => ({
        id: `knot-${i + 1}`,
        type: 'customNode',
        position: { x: 100 * (i + 1), y: 0 },
        data: {
          title: `Reroute ${i + 1}`,
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      }));

      const forEachNode: Node<NodeData> = {
        id: 'node-foreach',
        type: 'customNode',
        position: { x: 700, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Array', type: 'wildcard', containerType: 'array' },
          ],
          outputs: [
            { name: 'Loop Body', type: 'exec' },
            { name: 'Array Element', type: 'wildcard' },
          ],
        },
      };

      const edges: Edge[] = [
        { id: 'e-src-k1', source: 'node-source', target: 'knot-1', sourceHandle: 'string-stringarray', targetHandle: 'wildcard-in' },
        { id: 'e-k1-k2', source: 'knot-1', target: 'knot-2', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e-k2-k3', source: 'knot-2', target: 'knot-3', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e-k3-k4', source: 'knot-3', target: 'knot-4', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e-k4-k5', source: 'knot-4', target: 'knot-5', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e-k5-fe', source: 'knot-5', target: 'node-foreach', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-array' },
      ];

      const allNodes = [sourceNode, ...knots, forEachNode];
      const propagated = propagateWildcardTransitive(allNodes, edges);

      // Verify every knot was resolved to string array
      for (let i = 1; i <= 5; i++) {
        const knot = propagated.find(n => n.id === `knot-${i}`);
        expect(knot).toBeDefined();
        expect(knot?.data.outputs[0].containerType).toBe('array');
        expect(knot?.data.outputs[0].innerType).toBe('string');
      }

      // Verify For Each Loop element output was resolved to string
      const resolvedFE = propagated.find(n => n.id === 'node-foreach');
      expect(resolvedFE).toBeDefined();
      const elemPin = resolvedFE?.data.outputs.find(p => p.name === 'Array Element');
      expect(elemPin?.type).toBe('string');
    });

    it('1.2 resolves 10 reroute knots with reversed edge ordering (worst-case convergence)', () => {
      const sourceNode: Node<NodeData> = {
        id: 'node-source-10',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Source Numbers',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Nums', type: 'int', containerType: 'array', innerType: 'int' }],
        },
      };

      const knots: Node<NodeData>[] = Array.from({ length: 10 }, (_, i) => ({
        id: `k-${i + 1}`,
        type: 'customNode',
        position: { x: 50 * (i + 1), y: 0 },
        data: {
          title: `Knot ${i + 1}`,
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      }));

      // Create edges in REVERSE topological order: (k9->k10, k8->k9, ..., source->k1)
      const edges: Edge[] = [];
      for (let i = 9; i >= 1; i--) {
        edges.push({
          id: `e-k${i}-k${i + 1}`,
          source: `k-${i}`,
          target: `k-${i + 1}`,
          sourceHandle: 'wildcard-out',
          targetHandle: 'wildcard-in',
        });
      }
      edges.push({
        id: 'e-src-k1',
        source: 'node-source-10',
        target: 'k-1',
        sourceHandle: 'int-nums',
        targetHandle: 'wildcard-in',
      });

      const allNodes = [sourceNode, ...knots];
      const propagated = propagateWildcardTransitive(allNodes, edges);

      // Verify the final knot (k-10) resolved to int array
      const knot10 = propagated.find(n => n.id === 'k-10');
      expect(knot10?.data.outputs[0].innerType).toBe('int');
      expect(knot10?.data.outputs[0].containerType).toBe('array');
    });

    it('1.3 propagates across macro series: ForEach -> Reroutes -> ArrayAdd -> Reroutes -> ForEach', () => {
      const source: Node<NodeData> = {
        id: 'src-float-arr',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Float Array Source',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Floats', type: 'float', containerType: 'array', innerType: 'float' }],
        },
      };

      const fe1: Node<NodeData> = {
        id: 'fe-1',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Array', type: 'wildcard', containerType: 'array' },
          ],
          outputs: [
            { name: 'Loop Body', type: 'exec' },
            { name: 'Array Element', type: 'wildcard' },
            { name: 'Array Index', type: 'int' },
          ],
        },
      };

      const knot1: Node<NodeData> = {
        id: 'k-mid-1',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Reroute',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const arrayAdd: Node<NodeData> = {
        id: 'arr-add',
        type: 'customNode',
        position: { x: 600, y: 0 },
        data: {
          title: 'Array Add',
          nodeType: 'function',
          inputs: [
            { name: 'Target Array', type: 'wildcard', containerType: 'array' },
            { name: 'New Item', type: 'wildcard' },
          ],
          outputs: [{ name: 'Return Value', type: 'int' }],
        },
      };

      const edges: Edge[] = [
        { id: 'e1', source: 'src-float-arr', target: 'fe-1', sourceHandle: 'float-floats', targetHandle: 'wildcard-array' },
        { id: 'e2', source: 'fe-1', target: 'k-mid-1', sourceHandle: 'wildcard-array-element', targetHandle: 'wildcard-in' },
        { id: 'e3', source: 'k-mid-1', target: 'arr-add', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-new-item' },
      ];

      const propagated = propagateWildcardTransitive([source, fe1, knot1, arrayAdd], edges);

      const resolvedAdd = propagated.find(n => n.id === 'arr-add');
      const targetArrPin = resolvedAdd?.data.inputs.find(p => p.name === 'Target Array');
      const newItemPin = resolvedAdd?.data.inputs.find(p => p.name === 'New Item');

      expect(newItemPin?.type).toBe('float');
      expect(targetArrPin?.innerType).toBe('float');
    });

    it('1.4 resolves upstream deduction across 5 reroute knots', () => {
      // 5 knots in series where Knot 5 feeds into a concrete int consumer
      const knots: Node<NodeData>[] = Array.from({ length: 5 }, (_, i) => ({
        id: `up-k-${i + 1}`,
        type: 'customNode',
        position: { x: 100 * (i + 1), y: 0 },
        data: {
          title: `Reroute ${i + 1}`,
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      }));

      const consumer: Node<NodeData> = {
        id: 'consumer-node',
        type: 'customNode',
        position: { x: 700, y: 0 },
        data: {
          title: 'Int Consumer',
          nodeType: 'function',
          inputs: [{ name: 'Value', type: 'int' }],
          outputs: [],
        },
      };

      const edges: Edge[] = [
        { id: 'ue-1', source: 'up-k-1', target: 'up-k-2', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ue-2', source: 'up-k-2', target: 'up-k-3', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ue-3', source: 'up-k-3', target: 'up-k-4', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ue-4', source: 'up-k-4', target: 'up-k-5', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ue-5', source: 'up-k-5', target: 'consumer-node', sourceHandle: 'wildcard-out', targetHandle: 'int-value' },
      ];

      const propagated = propagateWildcardTransitive([...knots, consumer], edges);

      // Verify Knot 1 received the deduction upstream from Consumer
      const knot1 = propagated.find(n => n.id === 'up-k-1');
      expect(knot1?.data.outputs[0].type).toBe('int');
    });
  });

  // =========================================================================
  // 2. Cyclic & Branching Topologies
  // =========================================================================
  describe('2. Cyclic and Branching Topologies', () => {
    it('2.1 handles closed reroute cycles gracefully without infinite loop or crash', () => {
      const source: Node<NodeData> = {
        id: 'cycle-src',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Int Source',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Val', type: 'int' }],
        },
      };

      const knotA: Node<NodeData> = {
        id: 'k-cycle-a',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Reroute A',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const knotB: Node<NodeData> = {
        id: 'k-cycle-b',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Reroute B',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const knotC: Node<NodeData> = {
        id: 'k-cycle-c',
        type: 'customNode',
        position: { x: 300, y: 0 },
        data: {
          title: 'Reroute C',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      // Cycle: Source -> A -> B -> C -> A
      const edges: Edge[] = [
        { id: 'ce-src', source: 'cycle-src', target: 'k-cycle-a', sourceHandle: 'int-val', targetHandle: 'wildcard-in' },
        { id: 'ce-ab', source: 'k-cycle-a', target: 'k-cycle-b', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ce-bc', source: 'k-cycle-b', target: 'k-cycle-c', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'ce-ca', source: 'k-cycle-c', target: 'k-cycle-a', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
      ];

      const start = Date.now();
      const propagated = propagateWildcardTransitive([source, knotA, knotB, knotC], edges);
      const elapsed = Date.now() - start;

      // Must complete in under 500ms (no hang)
      expect(elapsed).toBeLessThan(500);

      const resA = propagated.find(n => n.id === 'k-cycle-a');
      const resB = propagated.find(n => n.id === 'k-cycle-b');
      const resC = propagated.find(n => n.id === 'k-cycle-c');

      expect(resA?.data.outputs[0].type).toBe('int');
      expect(resB?.data.outputs[0].type).toBe('int');
      expect(resC?.data.outputs[0].type).toBe('int');
    });

    it('2.2 pure wildcard cycle terminates immediately without concrete inputs', () => {
      const knotA: Node<NodeData> = {
        id: 'pure-a',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Reroute A',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const knotB: Node<NodeData> = {
        id: 'pure-b',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Reroute B',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const edges: Edge[] = [
        { id: 'e-ab', source: 'pure-a', target: 'pure-b', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
        { id: 'e-ba', source: 'pure-b', target: 'pure-a', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-in' },
      ];

      const propagated = propagateWildcardTransitive([knotA, knotB], edges);
      const finalA = propagated.find(n => n.id === 'pure-a');
      expect(finalA?.data.outputs[0].type).toBe('wildcard');
    });

    it('2.3 resolves branching tree topology (1 source to multiple independent wildcard branches)', () => {
      const source: Node<NodeData> = {
        id: 'map-src',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Map Source',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'PlayerScores', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' }],
        },
      };

      const rootKnot: Node<NodeData> = {
        id: 'root-knot',
        type: 'customNode',
        position: { x: 200, y: 100 },
        data: {
          title: 'Reroute Root',
          nodeType: 'reroute',
          inputs: [{ name: 'In', type: 'wildcard' }],
          outputs: [{ name: 'Out', type: 'wildcard' }],
        },
      };

      const branch1: Node<NodeData> = {
        id: 'branch-1-mapfind',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Map Find',
          nodeType: 'function',
          inputs: [
            { name: 'Target Map', type: 'wildcard', containerType: 'map' },
            { name: 'Key', type: 'wildcard' },
          ],
          outputs: [{ name: 'Value', type: 'wildcard' }],
        },
      };

      const branch2: Node<NodeData> = {
        id: 'branch-2-mapadd',
        type: 'customNode',
        position: { x: 400, y: 200 },
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

      const edges: Edge[] = [
        { id: 'b-src-root', source: 'map-src', target: 'root-knot', sourceHandle: 'string-playerscores', targetHandle: 'wildcard-in' },
        { id: 'b-root-b1', source: 'root-knot', target: 'branch-1-mapfind', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-target-map' },
        { id: 'b-root-b2', source: 'root-knot', target: 'branch-2-mapadd', sourceHandle: 'wildcard-out', targetHandle: 'wildcard-target-map' },
      ];

      const propagated = propagateWildcardTransitive([source, rootKnot, branch1, branch2], edges);

      const resFind = propagated.find(n => n.id === 'branch-1-mapfind');
      const resAdd = propagated.find(n => n.id === 'branch-2-mapadd');

      // Check Map Find key & value deduction
      const findKey = resFind?.data.inputs.find(p => p.name === 'Key');
      const findVal = resFind?.data.outputs.find(p => p.name === 'Value');
      expect(findKey?.type).toBe('string');
      expect(findVal?.type).toBe('int');

      // Check Map Add key & value deduction
      const addKey = resAdd?.data.inputs.find(p => p.name === 'Key');
      const addVal = resAdd?.data.inputs.find(p => p.name === 'Value');
      expect(addKey?.type).toBe('string');
      expect(addVal?.type).toBe('int');
    });
  });

  // =========================================================================
  // 3. Partial Disconnection vs. Total Disconnection
  // =========================================================================
  describe('3. Partial vs. Total Disconnection Edge Cases', () => {
    it('3.1 resets all pins to wildcard upon total disconnection', () => {
      const node: Node<NodeData> = {
        id: 'node-fe-total',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [{ name: 'Array', type: 'int', containerType: 'array', innerType: 'int' }],
          outputs: [{ name: 'Array Element', type: 'int' }],
        },
      };

      const reset = resetWildcardGroup(node, []);
      expect(reset.data.inputs[0].type).toBe('wildcard');
      expect(reset.data.inputs[0].innerType).toBeUndefined();
      expect(reset.data.outputs[0].type).toBe('wildcard');
    });

    it('3.2 retains resolution when container input wire remains connected', () => {
      const donor: Node<NodeData> = {
        id: 'node-arr-donor',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Donor',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Arr', type: 'float', containerType: 'array', innerType: 'float' }],
        },
      };

      const node: Node<NodeData> = {
        id: 'node-fe-partial',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [{ name: 'Array', type: 'float', containerType: 'array', innerType: 'float' }],
          outputs: [{ name: 'Array Element', type: 'float' }],
        },
      };

      const remainingEdge: Edge = {
        id: 'rem-edge-arr',
        source: 'node-arr-donor',
        target: 'node-fe-partial',
        sourceHandle: 'float-arr',
        targetHandle: 'float-array',
      };

      const result = resetWildcardGroup(node, [remainingEdge], [donor, node]);
      expect(result.data.outputs[0].type).toBe('float');
      expect(result.data.inputs[0].innerType).toBe('float');
    });

    it('3.3 retains resolution when multi-word element output wire (Array Element) remains connected', () => {
      const consumer: Node<NodeData> = {
        id: 'node-elem-consumer',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Consumer',
          nodeType: 'function',
          inputs: [{ name: 'Item', type: 'float' }],
          outputs: [],
        },
      };

      const node: Node<NodeData> = {
        id: 'node-fe-multiword',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'For Each Loop',
          nodeType: 'macro',
          inputs: [{ name: 'Array', type: 'float', containerType: 'array', innerType: 'float' }],
          outputs: [{ name: 'Array Element', type: 'float' }],
        },
      };

      // In React Flow, multi-word handle is 'float-array-element' or 'wildcard-array-element'
      const remainingEdge: Edge = {
        id: 'rem-edge-elem',
        source: 'node-fe-multiword',
        target: 'node-elem-consumer',
        sourceHandle: 'float-array-element',
        targetHandle: 'float-item',
      };

      const result = resetWildcardGroup(node, [remainingEdge], [consumer, node]);
      // If resetWildcardGroup fails to parse multi-word handles, this pin will improperly reset to 'wildcard'!
      expect(result.data.outputs[0].type).toBe('float');
      expect(result.data.inputs[0].innerType).toBe('float');
    });

    it('3.4 correctly processes multiple wildcard groups on a single node without premature return', () => {
      const nodeMultiGroup: Node<NodeData> = {
        id: 'node-mg',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Dual Wildcard Node',
          nodeType: 'customNode',
          wildcardGroups: [
            {
              groupId: 'GroupA',
              pins: [
                { pinName: 'InA', direction: 'input', role: 'element', containerType: 'none' },
                { pinName: 'OutA', direction: 'output', role: 'element', containerType: 'none' },
              ],
            },
            {
              groupId: 'GroupB',
              pins: [
                { pinName: 'InB', direction: 'input', role: 'element', containerType: 'none' },
                { pinName: 'OutB', direction: 'output', role: 'element', containerType: 'none' },
              ],
            },
          ],
          inputs: [
            { name: 'InA', type: 'int' },
            { name: 'InB', type: 'string' },
          ],
          outputs: [
            { name: 'OutA', type: 'int' },
            { name: 'OutB', type: 'string' },
          ],
        } as any,
      };

      const donorA: Node<NodeData> = {
        id: 'donor-a',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Donor A',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'ValA', type: 'int' }],
        },
      };

      // Only GroupA has a remaining edge (connected to donorA). GroupB is completely disconnected.
      const remainingEdges: Edge[] = [
        { id: 'e-ga', source: 'donor-a', target: 'node-mg', sourceHandle: 'int-vala', targetHandle: 'int-ina' },
      ];

      const result = resetWildcardGroup(nodeMultiGroup, remainingEdges, [donorA, nodeMultiGroup]);

      // GroupA must retain int
      expect(result.data.outputs.find(p => p.name === 'OutA')?.type).toBe('int');

      // GroupB has no remaining edges and must reset to wildcard!
      // If resetWildcardGroup returns prematurely in group A's loop, OutB will erroneously remain 'string'!
      expect(result.data.outputs.find(p => p.name === 'OutB')?.type).toBe('wildcard');
    });
  });

  // =========================================================================
  // 4. Container Connection Validation Edge Cases
  // =========================================================================
  describe('4. Container Connection Validation Matrix Edge Cases', () => {
    it('4.1 rejects mismatched container inner types across all container kinds', () => {
      // Array mismatch: int vs float
      expect(arePinsCompatible(
        { name: 'A', type: 'int', containerType: 'array', innerType: 'int' },
        { name: 'B', type: 'float', containerType: 'array', innerType: 'float' }
      )).toBe(false);

      // Set mismatch: string vs int
      expect(arePinsCompatible(
        { name: 'A', type: 'string', containerType: 'set', innerType: 'string' },
        { name: 'B', type: 'int', containerType: 'set', innerType: 'int' }
      )).toBe(false);

      // Map key mismatch: string vs int
      expect(arePinsCompatible(
        { name: 'A', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' },
        { name: 'B', type: 'int', containerType: 'map', innerType: 'int', valueType: 'int' }
      )).toBe(false);

      // Map value mismatch: int vs float
      expect(arePinsCompatible(
        { name: 'A', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' },
        { name: 'B', type: 'string', containerType: 'map', innerType: 'string', valueType: 'float' }
      )).toBe(false);
    });

    it('4.2 rejects non-hashable Set elements and Map keys in Unreal Engine 5', () => {
      const nonHashableStructTypes = ['vector', 'rotator', 'transform', 'materialattributes'] as const;

      for (const nhType of nonHashableStructTypes) {
        expect(isHashablePinType(nhType)).toBe(false);

        // Set with non-hashable innerType must be rejected
        expect(arePinsCompatible(
          { name: 'SetA', type: nhType as any, containerType: 'set', innerType: nhType as any },
          { name: 'SetB', type: nhType as any, containerType: 'set', innerType: nhType as any }
        )).toBe(false);

        // Map with non-hashable key must be rejected
        expect(arePinsCompatible(
          { name: 'MapA', type: nhType as any, containerType: 'map', innerType: nhType as any, valueType: 'int' },
          { name: 'MapB', type: nhType as any, containerType: 'map', innerType: nhType as any, valueType: 'int' }
        )).toBe(false);
      }

      // Special case: exec pin with containerType set must also be rejected
      const execContainerA: PinData = { name: 'ExecSetA', type: 'exec', containerType: 'set', innerType: 'exec' };
      const execContainerB: PinData = { name: 'ExecSetB', type: 'exec', containerType: 'set', innerType: 'exec' };
      expect(arePinsCompatible(execContainerA, execContainerB)).toBe(false);
    });

    it('4.3 rejects cross-container connections (Array to Set, Array to Map, Set to Map)', () => {
      const arrPin: PinData = { name: 'Arr', type: 'int', containerType: 'array', innerType: 'int' };
      const setPin: PinData = { name: 'Set', type: 'int', containerType: 'set', innerType: 'int' };
      const mapPin: PinData = { name: 'Map', type: 'int', containerType: 'map', innerType: 'int', valueType: 'int' };

      expect(arePinsCompatible(arrPin, setPin)).toBe(false);
      expect(arePinsCompatible(arrPin, mapPin)).toBe(false);
      expect(arePinsCompatible(setPin, mapPin)).toBe(false);
    });

    it('4.4 rejects scalar to container and container to scalar connections', () => {
      const scalarPin: PinData = { name: 'Num', type: 'int' };
      const arrPin: PinData = { name: 'Arr', type: 'int', containerType: 'array', innerType: 'int' };
      const setPin: PinData = { name: 'Set', type: 'int', containerType: 'set', innerType: 'int' };
      const mapPin: PinData = { name: 'Map', type: 'string', containerType: 'map', innerType: 'string', valueType: 'int' };

      expect(arePinsCompatible(scalarPin, arrPin)).toBe(false);
      expect(arePinsCompatible(arrPin, scalarPin)).toBe(false);
      expect(arePinsCompatible(scalarPin, setPin)).toBe(false);
      expect(arePinsCompatible(setPin, scalarPin)).toBe(false);
      expect(arePinsCompatible(scalarPin, mapPin)).toBe(false);
      expect(arePinsCompatible(mapPin, scalarPin)).toBe(false);
    });

    it('4.5 non-hashable type to Set element pin validation (Set Add / Set Contains)', () => {
      const vectorNode: Node<NodeData> = {
        id: 'node-vec',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Make Vector',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      };

      const setAddNode: Node<NodeData> = {
        id: 'node-setadd',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Set Add',
          nodeType: 'function',
          inputs: [
            { name: 'Target Set', type: 'wildcard', containerType: 'set' },
            { name: 'New Item', type: 'wildcard' },
          ],
          outputs: [],
        },
      };

      // In UE5, connecting a Vector to a Set's element pin is illegal because Vector is not hashable.
      const connection = {
        source: 'node-vec',
        target: 'node-setadd',
        sourceHandle: 'vector-return-value',
        targetHandle: 'wildcard-new-item',
      };
      const isValid = isValidBlueprintConnection(connection, [vectorNode, setAddNode], []);
      expect(isValid).toBe(false);
    });

    it('4.6 validates connections between pins with multi-word names', () => {
      const nodeA: Node<NodeData> = {
        id: 'node-a',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Math Node',
          nodeType: 'function',
          inputs: [],
          outputs: [{ name: 'Result Value', type: 'int' }],
        },
      };

      const nodeB: Node<NodeData> = {
        id: 'node-b',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Consumer Node',
          nodeType: 'function',
          inputs: [{ name: 'Input Value', type: 'int' }],
          outputs: [],
        },
      };

      // Standard React Flow handles from getPinId('int', 'Result Value') and getPinId('int', 'Input Value')
      const connection = {
        source: 'node-a',
        target: 'node-b',
        sourceHandle: 'int-result-value',
        targetHandle: 'int-input-value',
      };

      const valid = isValidBlueprintConnection(connection, [nodeA, nodeB], []);
      expect(valid).toBe(true);
    });

    it('4.7 rejects nested containers (e.g. TArray<TArray<int>>, TSet<TArray<int>>)', () => {
      // In UE5, nested containers are unsupported on Blueprint pins
      const nestedArrayPinA: PinData = {
        name: 'MatrixA',
        type: 'array',
        containerType: 'array',
        innerType: 'array',
      };
      const nestedArrayPinB: PinData = {
        name: 'MatrixB',
        type: 'array',
        containerType: 'array',
        innerType: 'array',
      };

      // Connecting nested array to nested array should be rejected as invalid Blueprint pin types
      expect(arePinsCompatible(nestedArrayPinA, nestedArrayPinB)).toBe(false);

      const setOfArraysPin: PinData = {
        name: 'SetOfArrays',
        type: 'set',
        containerType: 'set',
        innerType: 'array',
      };
      expect(arePinsCompatible(setOfArraysPin, setOfArraysPin)).toBe(false);
    });
  });
});
