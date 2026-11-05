import { Connection, Node, Edge } from 'reactflow';
import { NodeData, PinData, PinType, PinContainerType, normalizeContainerType } from '../types/BlueprintTypes';
import { getWildcardGroupsForNode } from './ueWildcardResolver';

/**
 * Valid hashable types required for UE5 TSet elements and TMap keys.
 * In Unreal Engine, types used in Sets or as Map keys must define GetTypeHash().
 */
export const HASHABLE_TYPES = new Set<PinType>([
  'int',
  'float',
  'bool',
  'string',
  'name',
  'byte',
  'object',
  'class',
]);

/**
 * Checks if a pin type is hashable (valid for Sets and Map keys).
 */
export function isHashablePinType(type?: PinType): boolean {
  if (!type) return false;
  return HASHABLE_TYPES.has(type);
}

/**
 * Canonicalizes a pin name or handle identifier by lowercasing and stripping all non-alphanumeric chars.
 */
export function canonicalizePinName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, '');
}

/**
 * Extracts canonical pin name from React Flow handle ID.
 * Handle IDs typically follow `${pinType}-${pinName}` or `pin-${pinName}`.
 */
export function extractPinNameFromHandle(handleId?: string | null): string {
  if (!handleId) return '';
  const parts = handleId.split('-');
  const raw = parts.length > 1 ? parts.slice(1).join('-') : handleId;
  return canonicalizePinName(raw);
}

/**
 * Finds matching pin on a node by handle ID or pin name, robust against kebab-case, spaces, and type prefixes.
 */
export function findPin(node: Node<NodeData>, handleId?: string | null, direction: 'input' | 'output' = 'input'): PinData | undefined {
  const pins = direction === 'input' ? (node.data?.inputs || []) : (node.data?.outputs || []);
  if (!handleId) return pins[0];

  const canonHandle = canonicalizePinName(handleId);
  const extracted = extractPinNameFromHandle(handleId);

  // Exact match on handle, canonical name, or type-prefixed handle
  const found = pins.find(p => {
    const canonPin = canonicalizePinName(p.name);
    const pinHandle = `${p.type}-${canonPin}`;
    return (
      canonPin === extracted ||
      canonPin === canonHandle ||
      p.name.toLowerCase() === handleId.toLowerCase() ||
      pinHandle === handleId ||
      canonicalizePinName(`${p.type}-${p.name}`) === canonHandle
    );
  });

  return found || pins.find(p => {
    const canonPin = canonicalizePinName(p.name);
    return canonPin.length > 2 && (extracted.includes(canonPin) || canonPin.includes(extracted));
  });
}

/**
 * Checks if scalar types are compatible, including safe numeric widening.
 */
export function areScalarTypesCompatible(sourceType: PinType, targetType: PinType): boolean {
  if (sourceType === targetType) return true;
  if (sourceType === 'wildcard' || targetType === 'wildcard') return true;

  // Safe numeric widening in Unreal Engine: byte -> int -> float
  if (sourceType === 'byte' && (targetType === 'int' || targetType === 'float')) return true;
  if (sourceType === 'int' && targetType === 'float') return true;

  // Object and Class hierarchy compatibility
  if ((sourceType === 'object' || sourceType === 'class') && (targetType === 'object' || targetType === 'class')) {
    return true;
  }

  return false;
}

function isContainerPinType(type?: string): boolean {
  if (!type) return false;
  return normalizeContainerType(type as PinContainerType, type as PinType) !== 'none';
}

/**
 * Checks if two pins are compatible based on container types, inner types, and hashable key rules.
 */
export function arePinsCompatible(sourcePin: PinData, targetPin: PinData): boolean {
  const srcContainer = normalizeContainerType(sourcePin.containerType, sourcePin.type);
  const tgtContainer = normalizeContainerType(targetPin.containerType, targetPin.type);

  // Exec pins can ONLY connect to Exec pins, and Exec pins cannot be containers
  if (sourcePin.type === 'exec' || targetPin.type === 'exec') {
    if (sourcePin.type !== 'exec' || targetPin.type !== 'exec') {
      return false;
    }
    if (srcContainer !== 'none' || tgtContainer !== 'none') {
      return false;
    }
    return true;
  }

  // Reject exec inside containers
  if (sourcePin.innerType === 'exec' || targetPin.innerType === 'exec' ||
      sourcePin.valueType === 'exec' || targetPin.valueType === 'exec') {
    return false;
  }

  // Reject nested containers in UE5 (e.g. TArray<TArray<T>>, TSet<TArray<T>>, TMap<K, TArray<V>>)
  if (srcContainer !== 'none') {
    if (isContainerPinType(sourcePin.innerType) || isContainerPinType(sourcePin.valueType)) {
      return false;
    }
  }
  if (tgtContainer !== 'none') {
    if (isContainerPinType(targetPin.innerType) || isContainerPinType(targetPin.valueType)) {
      return false;
    }
  }

  // Wildcard resolution cases
  const isSrcWildcard = sourcePin.type === 'wildcard';
  const isTgtWildcard = targetPin.type === 'wildcard';

  if (isSrcWildcard && isTgtWildcard) {
    return true;
  }

  // If one pin is a container and the other is a scalar
  if (srcContainer !== tgtContainer) {
    // If one is wildcard container/element or passthrough, permit connection for resolution
    if (isSrcWildcard || isTgtWildcard) {
      // In UE5, an array pin cannot connect directly to an individual scalar element pin,
      // UNLESS connecting into a wildcard element pin or container pin of a compatible node.
      return true;
    }
    return false;
  }

  // Both are Containers
  if (srcContainer !== 'none' && tgtContainer !== 'none') {
    // Container types must match exactly (array to array, set to set, map to map)
    if (srcContainer !== tgtContainer) {
      return false;
    }

    const srcInner = sourcePin.innerType || (sourcePin.type !== 'array' && sourcePin.type !== 'TArray' && sourcePin.type !== 'set' && sourcePin.type !== 'TSet' && sourcePin.type !== 'map' && sourcePin.type !== 'TMap' ? sourcePin.type : undefined);
    const tgtInner = targetPin.innerType || (targetPin.type !== 'array' && targetPin.type !== 'TArray' && targetPin.type !== 'set' && targetPin.type !== 'TSet' && targetPin.type !== 'map' && targetPin.type !== 'TMap' ? targetPin.type : undefined);

    // Array compatibility: inner types must match
    if (srcContainer === 'array') {
      if (srcInner && tgtInner && srcInner !== 'wildcard' && tgtInner !== 'wildcard') {
        return srcInner === tgtInner;
      }
      return true;
    }

    // Set compatibility: inner types must match AND be hashable
    if (srcContainer === 'set') {
      if (srcInner && !isHashablePinType(srcInner) && srcInner !== 'wildcard') {
        return false;
      }
      if (tgtInner && !isHashablePinType(tgtInner) && tgtInner !== 'wildcard') {
        return false;
      }
      if (srcInner && tgtInner && srcInner !== 'wildcard' && tgtInner !== 'wildcard') {
        return srcInner === tgtInner;
      }
      return true;
    }

    // Map compatibility: key must match and be hashable; value must match
    if (srcContainer === 'map') {
      if (srcInner && !isHashablePinType(srcInner) && srcInner !== 'wildcard') {
        return false;
      }
      if (tgtInner && !isHashablePinType(tgtInner) && tgtInner !== 'wildcard') {
        return false;
      }
      if (srcInner && tgtInner && srcInner !== 'wildcard' && tgtInner !== 'wildcard') {
        if (srcInner !== tgtInner) return false;
      }

      const srcVal = sourcePin.valueType;
      const tgtVal = targetPin.valueType;
      if (srcVal && tgtVal && srcVal !== 'wildcard' && tgtVal !== 'wildcard') {
        return srcVal === tgtVal;
      }
      return true;
    }
  }

  // Both are Scalars
  return areScalarTypesCompatible(sourcePin.type, targetPin.type);
}

/**
 * Validates a proposed Blueprint wire connection against UE5 typing and container rules.
 */
export function isValidBlueprintConnection(
  connection: Connection,
  nodes: Node<NodeData>[],
  edges: Edge[] = []
): boolean {
  if (!connection.source || !connection.target) return false;

  // Cannot connect a node to itself
  if (connection.source === connection.target) return false;

  const sourceNode = nodes.find(n => n.id === connection.source);
  const targetNode = nodes.find(n => n.id === connection.target);
  if (!sourceNode || !targetNode) return false;

  // Locate source pin (from source outputs) and target pin (from target inputs)
  const sourcePin = findPin(sourceNode, connection.sourceHandle, 'output') ||
                    findPin(sourceNode, connection.sourceHandle, 'input');
  const targetPin = findPin(targetNode, connection.targetHandle, 'input') ||
                    findPin(targetNode, connection.targetHandle, 'output');

  if (!sourcePin || !targetPin) return false;

  // Check if non-exec target data input already has an existing connection
  if (targetPin.type !== 'exec') {
    const alreadyConnected = edges.some(
      e => e.target === connection.target &&
           e.targetHandle === connection.targetHandle &&
           (e.source !== connection.source || e.sourceHandle !== connection.sourceHandle)
    );
    if (alreadyConnected) {
      return false;
    }
  }

  // Enforce Set / Map hashability constraints on wildcard connections
  if (sourcePin.type === 'wildcard' || targetPin.type === 'wildcard') {
    const isTargetWildcard = targetPin.type === 'wildcard';
    const wildcardNode = isTargetWildcard ? targetNode : sourceNode;
    const wildcardPin = isTargetWildcard ? targetPin : sourcePin;
    const concretePin = isTargetWildcard ? sourcePin : targetPin;

    const concreteType = concretePin.innerType || concretePin.type;
    if (concreteType && concreteType !== 'wildcard' && !isHashablePinType(concreteType)) {
      const groups = getWildcardGroupsForNode(wildcardNode);
      const canonWildcardName = canonicalizePinName(wildcardPin.name);

      for (const group of groups) {
        const hasSet = group.pins.some(p => p.containerType === 'set') || group.groupId.toLowerCase().includes('set');
        const spec = group.pins.find(p => canonicalizePinName(p.pinName) === canonWildcardName);

        if (spec) {
          if (hasSet || spec.containerType === 'set' || spec.role === 'mapKey') {
            return false;
          }
        }
      }
    }
  }

  return arePinsCompatible(sourcePin, targetPin);
}
