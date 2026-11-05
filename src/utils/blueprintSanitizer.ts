import { LLMBlueprintData, LLMNodeData, LLMConnectionData, PinType } from '../types/BlueprintTypes';
import { STANDARD_UE_NODES, StandardUENodePreset } from '../data/standardUENodes';

const VALID_PIN_TYPES = new Set<PinType>([
  'exec',
  'bool',
  'float',
  'int',
  'string',
  'name',
  'byte',
  'vector',
  'vector2d',
  'vector3',
  'vector4',
  'rotator',
  'transform',
  'object',
  'class',
  'wildcard',
  'materialattributes',
  'array',
  'set',
  'map',
  'TArray',
  'TSet',
  'TMap',
]);

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^a-z0-9]/g, '');
}

// Build fast lookup map for standard UE5 nodes
const standardNodeMap = new Map<string, StandardUENodePreset>();
STANDARD_UE_NODES.forEach(preset => {
  standardNodeMap.set(normalizeTitle(preset.title), preset);
});

export interface SanitizationResult {
  data: LLMBlueprintData;
  correctionsCount: number;
  corrections: string[];
}

/**
 * Strict Schema Auto-Sanitizer:
 * Validates and repairs LLM-generated graph JSON against authentic Unreal Engine 5 node definitions,
 * correcting hallucinated pins, wrong data types, invalid handles, and broken connections before
 * they ever touch the canvas or Unreal T3D compiler.
 */
export function sanitizeBlueprintData(rawData: LLMBlueprintData): SanitizationResult {
  const corrections: string[] = [];
  let correctionsCount = 0;

  const sanitizedNodes: LLMNodeData[] = (rawData.nodes || []).map(node => {
    const norm = normalizeTitle(node.title || '');
    const standardPreset = standardNodeMap.get(norm);

    if (standardPreset) {
      // Node is a canonical Unreal Engine 5 node: clamp pins and metadata to official definition
      const valueMap = new Map<string, any>();
      (node.inputs || []).forEach(p => {
        if (p.value !== undefined) {
          valueMap.set(p.name.toLowerCase().replace(/\s+/g, ''), p.value);
        }
      });

      const canonicalInputs = standardPreset.inputs.map(stdPin => {
        const key = stdPin.name.toLowerCase().replace(/\s+/g, '');
        const val = valueMap.has(key) ? valueMap.get(key) : stdPin.value;
        const matchingPin = (node.inputs || []).find(p => p.name.toLowerCase().replace(/\s+/g, '') === key);
        const resolvedType = (matchingPin && VALID_PIN_TYPES.has(matchingPin.type) && (stdPin.type === 'wildcard' || stdPin.type === 'object'))
          ? matchingPin.type
          : stdPin.type;
        return {
          name: stdPin.name,
          type: resolvedType,
          ...(matchingPin?.containerType ? { containerType: matchingPin.containerType } : {}),
          ...(matchingPin?.innerType ? { innerType: matchingPin.innerType } : {}),
          ...(matchingPin?.valueType ? { valueType: matchingPin.valueType } : {}),
          ...(val !== undefined ? { value: val } : {}),
        };
      });

      const canonicalOutputs = standardPreset.outputs.map(stdPin => {
        const key = stdPin.name.toLowerCase().replace(/\s+/g, '');
        const matchingOut = (node.outputs || []).find(p => p.name.toLowerCase().replace(/\s+/g, '') === key);
        const resolvedType = (matchingOut && VALID_PIN_TYPES.has(matchingOut.type) && (stdPin.type === 'wildcard' || stdPin.type === 'object'))
          ? matchingOut.type
          : stdPin.type;
        return {
          name: stdPin.name,
          type: resolvedType,
          ...(matchingOut?.containerType ? { containerType: matchingOut.containerType } : {}),
          ...(matchingOut?.innerType ? { innerType: matchingOut.innerType } : {}),
          ...(matchingOut?.valueType ? { valueType: matchingOut.valueType } : {}),
        };
      });

      // Check if LLM had extra or invalid pins
      if (node.inputs.length !== canonicalInputs.length || node.outputs.length !== canonicalOutputs.length) {
        corrections.push(`Clamped "${node.title}" pins to authentic Unreal Engine 5 schema.`);
        correctionsCount++;
      }

      return {
        ...node,
        title: standardPreset.title,
        subtitle: standardPreset.subtitle,
        nodeType: standardPreset.nodeType,
        color: standardPreset.color,
        inputs: canonicalInputs,
        outputs: canonicalOutputs,
      };
    }

    // Node is a custom function or macro: validate and sanitize pin types
    const sanitizedInputs = (node.inputs || []).map(pin => {
      let pinType: PinType = pin.type;
      if (!VALID_PIN_TYPES.has(pinType)) {
        pinType = /exec|then|trigger/i.test(pin.name) ? 'exec' : 'float';
        corrections.push(`Repaired invalid pin type "${pin.type}" to "${pinType}" on node "${node.title}".`);
        correctionsCount++;
      }
      return {
        ...pin,
        type: pinType,
      };
    });

    const sanitizedOutputs = (node.outputs || []).map(pin => {
      let pinType: PinType = pin.type;
      if (!VALID_PIN_TYPES.has(pinType)) {
        pinType = /exec|then|trigger/i.test(pin.name) ? 'exec' : 'float';
        corrections.push(`Repaired invalid pin type "${pin.type}" to "${pinType}" on node "${node.title}".`);
        correctionsCount++;
      }
      return {
        ...pin,
        type: pinType,
      };
    });

    return {
      ...node,
      inputs: sanitizedInputs,
      outputs: sanitizedOutputs,
    };
  });

  const nodeMap = new Map<string, LLMNodeData>(sanitizedNodes.map(n => [n.id, n]));

  // Sanitize connections: ensure source and target exist and pins align
  const sanitizedConnections: LLMConnectionData[] = [];
  (rawData.connections || []).forEach(conn => {
    const srcNode = nodeMap.get(conn.sourceNodeId);
    const tgtNode = nodeMap.get(conn.targetNodeId);

    if (!srcNode || !tgtNode) {
      corrections.push(`Pruned dangling wire between "${conn.sourceNodeId}" and "${conn.targetNodeId}".`);
      correctionsCount++;
      return;
    }

    // Match source pin (case-tolerant)
    const matchingOut = srcNode.outputs.find(
      o => o.name.toLowerCase().replace(/\s+/g, '') === conn.sourcePinName.toLowerCase().replace(/\s+/g, '')
    ) || srcNode.outputs[0];

    // Match target pin (case-tolerant)
    const matchingIn = tgtNode.inputs.find(
      i => i.name.toLowerCase().replace(/\s+/g, '') === conn.targetPinName.toLowerCase().replace(/\s+/g, '')
    ) || tgtNode.inputs[0];

    if (!matchingOut || !matchingIn) {
      corrections.push(`Pruned unconnectable wire between "${srcNode.title}" and "${tgtNode.title}".`);
      correctionsCount++;
      return;
    }

    sanitizedConnections.push({
      sourceNodeId: conn.sourceNodeId,
      sourcePinName: matchingOut.name,
      targetNodeId: conn.targetNodeId,
      targetPinName: matchingIn.name,
    });
  });

  return {
    data: {
      ...rawData,
      nodes: sanitizedNodes,
      connections: sanitizedConnections,
    },
    correctionsCount,
    corrections,
  };
}
