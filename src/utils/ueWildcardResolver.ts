import { Node, Edge } from 'reactflow';
import { NodeData, PinData, PinType, PinContainerType, normalizeContainerType } from '../types/BlueprintTypes';

export type WildcardRole = 'container' | 'element' | 'mapKey' | 'mapValue' | 'passthrough';

export interface WildcardPinSpec {
  pinName: string;
  direction?: 'input' | 'output';
  role: WildcardRole;
  containerType?: PinContainerType;
}

export interface NodeWildcardGroup {
  groupId: string;
  pins: WildcardPinSpec[];
}

/**
 * Standard wildcard definitions for known Unreal Engine 5 nodes.
 */
const STANDARD_WILDCARD_GROUPS: Record<string, NodeWildcardGroup[]> = {
  'foreachloop': [
    {
      groupId: 'ArrayElementGroup',
      pins: [
        { pinName: 'Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Array Element', direction: 'output', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'arrayadd': [
    {
      groupId: 'ArrayElementGroup',
      pins: [
        { pinName: 'Target Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'New Item', direction: 'input', role: 'element', containerType: 'none' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'arrayget': [
    {
      groupId: 'ArrayElementGroup',
      pins: [
        { pinName: 'Target Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Item', direction: 'output', role: 'element', containerType: 'none' },
        { pinName: 'Output', direction: 'output', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'arrayremove': [
    {
      groupId: 'ArrayElementGroup',
      pins: [
        { pinName: 'Target Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
        { pinName: 'Item to Remove', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'arrayfind': [
    {
      groupId: 'ArrayElementGroup',
      pins: [
        { pinName: 'Target Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Array', direction: 'input', role: 'container', containerType: 'array' },
        { pinName: 'Item to Find', direction: 'input', role: 'element', containerType: 'none' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'setadd': [
    {
      groupId: 'SetElementGroup',
      pins: [
        { pinName: 'Target Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'New Item', direction: 'input', role: 'element', containerType: 'none' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'setremove': [
    {
      groupId: 'SetElementGroup',
      pins: [
        { pinName: 'Target Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'setcontains': [
    {
      groupId: 'SetElementGroup',
      pins: [
        { pinName: 'Target Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'Set', direction: 'input', role: 'container', containerType: 'set' },
        { pinName: 'Item to Find', direction: 'input', role: 'element', containerType: 'none' },
        { pinName: 'Item', direction: 'input', role: 'element', containerType: 'none' },
      ],
    },
  ],
  'mapfind': [
    {
      groupId: 'MapKVGroup',
      pins: [
        { pinName: 'Target Map', direction: 'input', role: 'container', containerType: 'map' },
        { pinName: 'Map', direction: 'input', role: 'container', containerType: 'map' },
        { pinName: 'Key', direction: 'input', role: 'mapKey', containerType: 'none' },
        { pinName: 'Value', direction: 'output', role: 'mapValue', containerType: 'none' },
      ],
    },
  ],
  'mapadd': [
    {
      groupId: 'MapKVGroup',
      pins: [
        { pinName: 'Target Map', direction: 'input', role: 'container', containerType: 'map' },
        { pinName: 'Map', direction: 'input', role: 'container', containerType: 'map' },
        { pinName: 'Key', direction: 'input', role: 'mapKey', containerType: 'none' },
        { pinName: 'Value', direction: 'input', role: 'mapValue', containerType: 'none' },
      ],
    },
  ],
};

function normalizeKey(str: string): string {
  return str.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Returns wildcard equivalence groups for a given node.
 */
export function getWildcardGroupsForNode(node: Node<NodeData>): NodeWildcardGroup[] {
  // Check if explicit metadata exists on node data
  if ((node.data as any)?.wildcardGroups) {
    return (node.data as any).wildcardGroups as NodeWildcardGroup[];
  }

  const normTitle = normalizeKey(node.data?.title || '');

  // 1. Check standard known nodes
  for (const [key, groups] of Object.entries(STANDARD_WILDCARD_GROUPS)) {
    if (normTitle.includes(key)) {
      return groups;
    }
  }

  // 2. Reroute / Knot nodes: all non-exec pins are passthrough in the same group
  if (node.data?.nodeType === 'reroute' || normTitle.includes('reroute') || normTitle.includes('knot')) {
    const allPins = [...(node.data?.inputs || []), ...(node.data?.outputs || [])];
    const nonExecPins = allPins.filter(p => p.type !== 'exec');
    return [
      {
        groupId: 'PassthroughGroup',
        pins: nonExecPins.map(p => ({
          pinName: p.name,
          role: 'passthrough' as WildcardRole,
          containerType: normalizeContainerType(p.containerType, p.type),
        })),
      },
    ];
  }

  // 3. Fallback Heuristics:
  // Inspect input/output pins for 'wildcard' or container/element name patterns
  const allPins = [...(node.data?.inputs || []), ...(node.data?.outputs || [])];
  const wildcardPins = allPins.filter(p => p.type === 'wildcard');

  if (wildcardPins.length > 0) {
    // Check for container + element pairing
    const containerPin = wildcardPins.find(p => /array|set|map|list/i.test(p.name));
    const elementPin = wildcardPins.find(p => /elem|item|val/i.test(p.name) && p !== containerPin);

    if (containerPin && elementPin) {
      const isMap = /map/i.test(containerPin.name);
      const isSet = /set/i.test(containerPin.name);
      const containerType: PinContainerType = isMap ? 'map' : isSet ? 'set' : 'array';
      return [
        {
          groupId: 'DynamicContainerGroup',
          pins: [
            { pinName: containerPin.name, role: 'container', containerType },
            { pinName: elementPin.name, role: isMap ? 'mapValue' : 'element', containerType: 'none' },
          ],
        },
      ];
    }

    // Default: all wildcard pins belong to a shared passthrough group
    return [
      {
        groupId: 'DefaultWildcardGroup',
        pins: wildcardPins.map(p => ({
          pinName: p.name,
          role: 'passthrough' as WildcardRole,
          containerType: normalizeContainerType(p.containerType, p.type),
        })),
      },
    ];
  }

  return [];
}

/**
 * Canonicalizes a pin name or handle identifier by lowercasing and stripping all non-alphanumeric chars.
 */
export function canonicalizePinName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Finds matching pin from handle ID or pin name, robust against kebab-case, spaces, and type prefixes.
 */
function findPinByHandle(pins: PinData[], handleId?: string | null): PinData | undefined {
  if (!pins || pins.length === 0) return undefined;
  if (!handleId) {
    return pins.find(p => p.type !== 'exec') || pins[0];
  }

  const canonHandle = canonicalizePinName(handleId);
  const parts = handleId.split('-');
  const nameAfterPrefix = parts.length > 1 ? parts.slice(1).join('-') : handleId;
  const canonNameAfterPrefix = canonicalizePinName(nameAfterPrefix);

  const matched = pins.find(p => {
    const canonPin = canonicalizePinName(p.name);
    return (
      canonPin === canonNameAfterPrefix ||
      canonPin === canonHandle ||
      canonicalizePinName(`${p.type}-${p.name}`) === canonHandle ||
      p.name.toLowerCase() === handleId.toLowerCase()
    );
  });

  if (matched) return matched;

  const substrMatch = pins.find(p => {
    const canonPin = canonicalizePinName(p.name);
    return canonPin.length > 2 && (canonNameAfterPrefix.includes(canonPin) || canonPin.includes(canonNameAfterPrefix));
  });

  return substrMatch;
}

/**
 * Extracts concrete element and container information from a pin.
 */
function extractConcreteType(pin: PinData): {
  concreteType: PinType | null;
  container: 'none' | 'array' | 'set' | 'map';
  innerType?: PinType;
  valueType?: PinType;
} {
  const container = normalizeContainerType(pin.containerType, pin.type);

  if (container !== 'none') {
    const inner = pin.innerType || (pin.type !== 'array' && pin.type !== 'TArray' && pin.type !== 'set' && pin.type !== 'TSet' && pin.type !== 'map' && pin.type !== 'TMap' ? pin.type : undefined);
    return {
      concreteType: inner && inner !== 'wildcard' && inner !== 'exec' ? inner : null,
      container,
      innerType: inner,
      valueType: pin.valueType,
    };
  }

  if (pin.type !== 'wildcard' && pin.type !== 'exec') {
    return {
      concreteType: pin.type,
      container: 'none',
      innerType: undefined,
      valueType: undefined,
    };
  }

  return {
    concreteType: null,
    container: 'none',
  };
}

/**
 * Resolves wildcard pins on a target node when a connection is formed.
 * Supports bidirectional type deduction (element resolves container and vice-versa).
 */
export function resolveWildcardConnection(
  sourcePin: PinData,
  targetPin: PinData,
  targetNode: Node<NodeData>
): { updatedNode: Node<NodeData>; resolved: boolean } {
  const groups = getWildcardGroupsForNode(targetNode);
  if (!groups || groups.length === 0) {
    return { updatedNode: targetNode, resolved: false };
  }

  // Identify whether targetPin or sourcePin belongs to targetNode
  const targetInputs = targetNode.data?.inputs || [];
  const targetOutputs = targetNode.data?.outputs || [];
  const hasTargetPin = [...targetInputs, ...targetOutputs].some(
    p => p.name.toLowerCase() === targetPin.name.toLowerCase()
  );
  const hasSourcePin = [...targetInputs, ...targetOutputs].some(
    p => p.name.toLowerCase() === sourcePin.name.toLowerCase()
  );

  const affectedPin = hasTargetPin ? targetPin : hasSourcePin ? sourcePin : targetPin;
  const donorPin = affectedPin === targetPin ? sourcePin : targetPin;

  const donorInfo = extractConcreteType(donorPin);
  if (!donorInfo.concreteType && donorInfo.container === 'none') {
    // Donor has no concrete type information to propagate
    return { updatedNode: targetNode, resolved: false };
  }

  let resolvedAny = false;

  const updatedInputs = [...(targetNode.data?.inputs || [])];
  const updatedOutputs = [...(targetNode.data?.outputs || [])];

  for (const group of groups) {
    const matchingSpec = group.pins.find(
      p => p.pinName.toLowerCase() === affectedPin.name.toLowerCase()
    );

    if (!matchingSpec) continue;

    // We have located the equivalence group! Deduce types for all pins in this group.
    for (const spec of group.pins) {
      const updatePin = (pin: PinData): PinData => {
        if (pin.name.toLowerCase() !== spec.pinName.toLowerCase()) return pin;

        resolvedAny = true;

        if (spec.role === 'container') {
          // Container pin resolution
          const targetContainer = spec.containerType || donorInfo.container || 'array';
          const innerType = donorInfo.concreteType || donorInfo.innerType || 'int';
          return {
            ...pin,
            type: innerType,
            containerType: targetContainer,
            innerType,
            ...(donorInfo.valueType ? { valueType: donorInfo.valueType } : {}),
          };
        } else if (spec.role === 'element') {
          // Element pin resolution
          const elemType = donorInfo.concreteType || donorInfo.innerType || 'int';
          return {
            ...pin,
            type: elemType,
            containerType: 'none',
            innerType: undefined,
            valueType: undefined,
          };
        } else if (spec.role === 'mapKey') {
          const keyType = donorInfo.concreteType || donorInfo.innerType || 'string';
          return {
            ...pin,
            type: keyType,
            containerType: 'none',
          };
        } else if (spec.role === 'mapValue') {
          const valType = donorInfo.valueType || donorInfo.concreteType || 'int';
          return {
            ...pin,
            type: valType,
            containerType: 'none',
          };
        } else {
          // Passthrough
          return {
            ...pin,
            type: donorPin.type,
            containerType: donorPin.containerType,
            innerType: donorPin.innerType,
            valueType: donorPin.valueType,
          };
        }
      };

      for (let i = 0; i < updatedInputs.length; i++) {
        updatedInputs[i] = updatePin(updatedInputs[i]);
      }
      for (let i = 0; i < updatedOutputs.length; i++) {
        updatedOutputs[i] = updatePin(updatedOutputs[i]);
      }
    }
  }

  if (!resolvedAny) {
    return { updatedNode: targetNode, resolved: false };
  }

  const updatedNode: Node<NodeData> = {
    ...targetNode,
    data: {
      ...targetNode.data,
      inputs: updatedInputs,
      outputs: updatedOutputs,
    },
  };

  return { updatedNode, resolved: true };
}

/**
 * Resets wildcard groups on a node when wires are disconnected.
 * If remaining wires still supply concrete types, retains resolution;
 * if no wires supply concrete types, reverts group pins to 'wildcard'.
 */
export function resetWildcardGroup(
  node: Node<NodeData>,
  remainingEdges: Edge[],
  allNodes: Node<NodeData>[] = []
): Node<NodeData> {
  const groups = getWildcardGroupsForNode(node);
  if (!groups || groups.length === 0) {
    return node;
  }

  const nodeMap = new Map<string, Node<NodeData>>(allNodes.map(n => [n.id, n]));
  nodeMap.set(node.id, node);

  // Find all remaining edges connected to this node
  const nodeEdges = remainingEdges.filter(
    e => e.source === node.id || e.target === node.id
  );

  let updatedInputs = [...(node.data?.inputs || [])];
  let updatedOutputs = [...(node.data?.outputs || [])];

  for (const group of groups) {
    let concreteDonorFound: PinData | null = null;
    let matchedSpec: WildcardPinSpec | null = null;

    for (const edge of nodeEdges) {
      const isSource = edge.source === node.id;
      const handle = isSource ? edge.sourceHandle : edge.targetHandle;
      const otherNodeId = isSource ? edge.target : edge.source;
      const otherHandle = isSource ? edge.targetHandle : edge.sourceHandle;

      // Match edge handle against group pin specs using canonical name matching
      const spec = group.pins.find(p => {
        const canonSpec = canonicalizePinName(p.pinName);
        const parts = (handle || '').split('-');
        const nameAfterPrefix = parts.length > 1 ? parts.slice(1).join('-') : (handle || '');
        return (
          canonSpec === canonicalizePinName(nameAfterPrefix) ||
          canonSpec === canonicalizePinName(handle || '')
        );
      });
      if (!spec) continue;

      const otherNode = nodeMap.get(otherNodeId);
      if (!otherNode) continue;

      const otherPins = isSource ? (otherNode.data?.inputs || []) : (otherNode.data?.outputs || []);
      const otherPin = findPinByHandle(otherPins, otherHandle);

      if (otherPin) {
        const info = extractConcreteType(otherPin);
        if (info.concreteType) {
          concreteDonorFound = otherPin;
          matchedSpec = spec;
          break;
        }
      }
    }

    if (concreteDonorFound && matchedSpec) {
      // Re-resolve using the remaining concrete donor
      const dummySource = concreteDonorFound;
      const dummyTarget: PinData = { name: matchedSpec.pinName, type: 'wildcard' };
      const { updatedNode } = resolveWildcardConnection(dummySource, dummyTarget, {
        ...node,
        data: { ...node.data, inputs: updatedInputs, outputs: updatedOutputs },
      });
      updatedInputs = [...(updatedNode.data?.inputs || [])];
      updatedOutputs = [...(updatedNode.data?.outputs || [])];
      continue; // Accumulate and continue to evaluate subsequent groups
    }

    // No concrete wire remains for this group: reset all pins in this group to wildcard!
    for (const spec of group.pins) {
      const canonSpec = canonicalizePinName(spec.pinName);
      const resetPin = (pin: PinData): PinData => {
        if (canonicalizePinName(pin.name) !== canonSpec) return pin;
        return {
          ...pin,
          type: 'wildcard',
          containerType: spec.role === 'container' ? (spec.containerType || 'array') : 'none',
          innerType: undefined,
          valueType: undefined,
        };
      };

      for (let i = 0; i < updatedInputs.length; i++) {
        updatedInputs[i] = resetPin(updatedInputs[i]);
      }
      for (let i = 0; i < updatedOutputs.length; i++) {
        updatedOutputs[i] = resetPin(updatedOutputs[i]);
      }
    }
  }

  return {
    ...node,
    data: {
      ...node.data,
      inputs: updatedInputs,
      outputs: updatedOutputs,
    },
  };
}

/**
 * Propagates wildcard type resolutions transitively across connected edges in the graph.
 * Performs a fixed-point convergence to resolve multi-hop reroute chains and cascading macros.
 */
export function propagateWildcardTransitive(
  nodes: Node<NodeData>[],
  edges: Edge[]
): Node<NodeData>[] {
  let currentNodes = [...nodes];
  let changed = true;
  let iterations = 0;
  const maxIterations = 20;

  while (changed && iterations < maxIterations) {
    changed = false;
    iterations++;

    const nodeMap = new Map<string, Node<NodeData>>(currentNodes.map(n => [n.id, n]));

    for (const edge of edges) {
      const sourceNode = nodeMap.get(edge.source);
      const targetNode = nodeMap.get(edge.target);
      if (!sourceNode || !targetNode) continue;

      const sourcePin = findPinByHandle(sourceNode.data?.outputs || [], edge.sourceHandle);
      const targetPin = findPinByHandle(targetNode.data?.inputs || [], edge.targetHandle);

      if (!sourcePin || !targetPin) continue;

      // Do NOT propagate data wildcard deduction along exec execution flow wires
      if (sourcePin.type === 'exec' || targetPin.type === 'exec') continue;

      const sourceConcrete = extractConcreteType(sourcePin);
      const targetConcrete = extractConcreteType(targetPin);

      // Downstream deduction (source -> target)
      if (sourceConcrete.concreteType && (!targetConcrete.concreteType || targetPin.type === 'wildcard')) {
        const { updatedNode, resolved } = resolveWildcardConnection(sourcePin, targetPin, targetNode);
        if (resolved) {
          nodeMap.set(targetNode.id, updatedNode);
          changed = true;
        }
      }

      // Upstream deduction (target -> source, e.g. reroutes or bidirectional)
      if (targetConcrete.concreteType && (!sourceConcrete.concreteType || sourcePin.type === 'wildcard')) {
        const { updatedNode, resolved } = resolveWildcardConnection(targetPin, sourcePin, sourceNode);
        if (resolved) {
          nodeMap.set(sourceNode.id, updatedNode);
          changed = true;
        }
      }
    }

    currentNodes = Array.from(nodeMap.values());
  }

  return currentNodes;
}
