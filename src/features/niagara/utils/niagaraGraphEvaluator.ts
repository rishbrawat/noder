import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { NiagaraEmitterConfig } from '../types/niagaraTypes';
import { DEFAULT_NIAGARA_CONFIG } from '../data/niagaraModulesCatalog';

/**
 * Robust pin and handle name matcher that strips handle type prefixes like 'float-', 'vector-', etc.
 */
function matchesPin(handleOrName: string, expectedPin: string): boolean {
  const h = (handleOrName || '').toLowerCase().replace(/[\s_-]+/g, '');
  const p = expectedPin.toLowerCase().replace(/[\s_-]+/g, '');
  if (h === p) return true;
  const stripped = h.replace(/^(float|int|bool|vector[2-4]?|rotator|transform|exec|string|name|object|byte)/, '');
  return stripped === p;
}

/**
 * Recursively evaluates an incoming data pin connection from math, vector, or constant nodes.
 */
function evaluateIncomingValue(
  nodeId: string,
  _handleId: string | null | undefined,
  nodeMap: Map<string, Node<NodeData>>,
  incomingEdgesMap: Map<string, Edge[]>,
  depth = 0
): any {
  if (depth > 12) return 0;
  const node = nodeMap.get(nodeId);
  if (!node) return 0;

  const title = (node.data.title || '').trim();

  // 0. Unreal Engine Reroute Knot
  if (node.data.nodeType === 'reroute' || title.toLowerCase() === 'reroute') {
    const inEdge = incomingEdgesMap.get(node.id)?.[0];
    if (inEdge) {
      return evaluateIncomingValue(inEdge.source, inEdge.sourceHandle, nodeMap, incomingEdgesMap, depth + 1);
    }
    return node.data.inputs?.[0]?.value ?? node.data.inputs?.[0]?.defaultValue ?? 0;
  }

  // 1. Constants & Parameters
  if (title.includes('Constant (Scalar)') || title === 'ScalarParameter') {
    const pin = node.data.outputs?.find((o) => o.name === 'Out' || o.name === 'Param');
    const defaultProp = (node.data as any)?.defaultProperties?.R ?? (node.data as any)?.defaultProperties?.DefaultValue;
    if (typeof defaultProp === 'number') return defaultProp;
    if (typeof (pin as any)?.value === 'number') return (pin as any).value;
    return typeof pin?.defaultValue === 'number' ? pin.defaultValue : 1.0;
  }

  if (title.includes('Constant2Vector')) {
    const pin = node.data.outputs?.find((o) => o.name === 'Out');
    if (pin?.value && Array.isArray(pin.value)) return pin.value;
    if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
      return pin.defaultValue;
    }
    return [1.0, 1.0];
  }

  if (title.includes('Constant3Vector') || title === 'VectorParameter') {
    const pin = node.data.outputs?.find((o) => o.name === 'RGB' || o.name === 'RGBA');
    const constProp = (node.data as any)?.defaultProperties?.Constant;
    if (constProp && typeof constProp === 'object') {
      return [constProp.R ?? 1.0, constProp.G ?? 0.84, constProp.B ?? 0.0];
    }
    if (pin?.value && Array.isArray(pin.value)) return pin.value;
    if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
      return pin.defaultValue;
    }
    return [1.0, 0.8, 0.2];
  }

  if (title.includes('Constant4Vector')) {
    const pin = node.data.outputs?.find((o) => o.name === 'RGBA');
    if (pin?.value && Array.isArray(pin.value)) return pin.value;
    if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
      return pin.defaultValue;
    }
    return [1.0, 0.8, 0.2, 1.0];
  }

  // 2. Mathematical and Vector expressions
  const inEdges = incomingEdgesMap.get(node.id) || [];
  const getOperand = (pinName: string, defaultVal: any = 0): any => {
    const edge = inEdges.find((e) => matchesPin(e.targetHandle || '', pinName));
    if (edge) {
      return evaluateIncomingValue(edge.source, edge.sourceHandle, nodeMap, incomingEdgesMap, depth + 1);
    }
    const pin = node.data.inputs?.find((i) => matchesPin(i.name, pinName));
    return pin?.value !== undefined ? pin.value : (pin?.defaultValue ?? defaultVal);
  };

  if (title === 'Add' || title.includes('Add (Math)')) {
    const a = getOperand('a', 0);
    const b = getOperand('b', 0);
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((val, idx) => val + (b[idx] ?? 0));
    }
    if (Array.isArray(a) && typeof b === 'number') {
      return a.map((val) => val + b);
    }
    if (typeof a === 'number' && Array.isArray(b)) {
      return b.map((val) => val + a);
    }
    return Number(a) + Number(b);
  }

  if (title === 'Subtract' || title.includes('Subtract (Math)')) {
    const a = getOperand('a', 0);
    const b = getOperand('b', 0);
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((val, idx) => val - (b[idx] ?? 0));
    }
    if (Array.isArray(a) && typeof b === 'number') {
      return a.map((val) => val - b);
    }
    return Number(a) - Number(b);
  }

  if (title === 'Multiply' || title.includes('Multiply (Math)')) {
    const a = getOperand('a', 1);
    const b = getOperand('b', 1);
    if (Array.isArray(a) && typeof b === 'number') {
      return a.map((val) => val * b);
    }
    if (typeof a === 'number' && Array.isArray(b)) {
      return b.map((val) => val * a);
    }
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((val, idx) => val * (b[idx] ?? 1));
    }
    return Number(a) * Number(b);
  }

  if (title === 'Divide' || title.includes('Divide (Math)')) {
    const a = getOperand('a', 1);
    const b = getOperand('b', 1);
    const divisor = Number(b) === 0 ? 0.0001 : Number(b);
    if (Array.isArray(a)) {
      return a.map((val) => val / divisor);
    }
    return Number(a) / divisor;
  }

  if (title === 'Clamp' || title.includes('Clamp (Math)') || title.includes('Clamp (Float)')) {
    const val = Number(getOperand('value', 0));
    const min = Number(getOperand('min', 0));
    const max = Number(getOperand('max', 1));
    return Math.max(min, Math.min(max, val));
  }

  if (title.includes('Lerp') || title.includes('LinearInterpolate')) {
    const a = getOperand('a', 0);
    const b = getOperand('b', 1);
    const alpha = parseNumber(getOperand('alpha', 0.5), 0.5);
    if (Array.isArray(a) && Array.isArray(b)) {
      return a.map((val, idx) => val * (1 - alpha) + (b[idx] ?? 0) * alpha);
    }
    return Number(a) * (1 - alpha) + Number(b) * alpha;
  }

  if (title === 'Make Vector') {
    const x = parseNumber(getOperand('x', 0), 0);
    const y = parseNumber(getOperand('y', 0), 0);
    const z = parseNumber(getOperand('z', 0), 0);
    return [x, y, z];
  }

  if (title === 'Break Vector') {
    const inVec = getOperand('invec', [0, 0, 0]);
    const vec = parseVector3(inVec, [0, 0, 0]);
    const srcHandle = (_handleId || '').toLowerCase();
    if (srcHandle.includes('y')) return vec[1];
    if (srcHandle.includes('z')) return vec[2];
    return vec[0];
  }

  if (title === 'Vector + Vector') {
    const a = parseVector3(getOperand('a', [0, 0, 0]), [0, 0, 0]);
    const b = parseVector3(getOperand('b', [0, 0, 0]), [0, 0, 0]);
    return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
  }

  if (title === 'Vector - Vector') {
    const a = parseVector3(getOperand('a', [0, 0, 0]), [0, 0, 0]);
    const b = parseVector3(getOperand('b', [0, 0, 0]), [0, 0, 0]);
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  if (title === 'Vector * Float') {
    const a = parseVector3(getOperand('a', [0, 0, 0]), [0, 0, 0]);
    const b = parseNumber(getOperand('b', 1), 1);
    return [a[0] * b, a[1] * b, a[2] * b];
  }

  // Fallback: check first output pin default value or literal
  const outPin = node.data.outputs?.[0];
  if (outPin?.defaultValue !== undefined) {
    return outPin.defaultValue;
  }
  const inPin = node.data.inputs?.[0];
  if (inPin?.value !== undefined) return inPin.value;
  return inPin?.defaultValue ?? 0;
}

/**
 * Extracts a numeric or vector value from a node's input pin,
 * either by following an incoming connection wire or by reading the pin's literal value.
 */
function getPinValue(
  node: Node<NodeData>,
  pinName: string,
  nodeMap: Map<string, Node<NodeData>>,
  incomingEdgesMap: Map<string, Edge[]>,
  fallback: any
): any {
  const inEdges = incomingEdgesMap.get(node.id) || [];
  const edge = inEdges.find((e) => matchesPin(e.targetHandle || '', pinName));

  if (edge) {
    const val = evaluateIncomingValue(edge.source, edge.sourceHandle, nodeMap, incomingEdgesMap);
    if (val !== undefined && val !== null) return val;
  }

  const pin = node.data.inputs?.find((i) => matchesPin(i.name, pinName));
  if (pin) {
    if (pin.value !== undefined && pin.value !== null) return pin.value;
    if (pin.defaultValue !== undefined && pin.defaultValue !== null) return pin.defaultValue;
  }

  return fallback;
}

function parseNumber(val: any, fallback: number): number {
  if (typeof val === 'number' && !isNaN(val)) return val;
  if (typeof val === 'string') {
    const parsed = parseFloat(val);
    if (!isNaN(parsed)) return parsed;
  }
  if (Array.isArray(val) && val.length > 0) {
    const parsed = Number(val[0]);
    if (!isNaN(parsed)) return parsed;
  }
  return fallback;
}

function parseVector3(val: any, fallback: [number, number, number]): [number, number, number] {
  if (Array.isArray(val) && val.length >= 3) {
    return [Number(val[0]) || 0, Number(val[1]) || 0, Number(val[2]) || 0];
  }
  if (typeof val === 'number') {
    return [val, val, val];
  }
  return fallback;
}

function parseColor(val: any, fallback: [number, number, number, number]): [number, number, number, number] {
  if (Array.isArray(val) && val.length >= 4) {
    return [Number(val[0]) || 0, Number(val[1]) || 0, Number(val[2]) || 0, Number(val[3]) || 0];
  }
  if (Array.isArray(val) && val.length === 3) {
    return [Number(val[0]) || 0, Number(val[1]) || 0, Number(val[2]) || 0, 1.0];
  }
  return fallback;
}

/**
 * Actively evaluates the ReactFlow canvas nodes and edges into an authoritative
 * NiagaraEmitterConfig for the physics simulation loop and UE5 clipboard generator.
 */
export function evaluateNiagaraGraph(
  nodes: Node<NodeData>[],
  edges: Edge[],
  baseConfig?: Partial<NiagaraEmitterConfig>
): NiagaraEmitterConfig {
  const config: NiagaraEmitterConfig = {
    ...DEFAULT_NIAGARA_CONFIG,
    ...baseConfig,
  };

  if (!nodes || nodes.length === 0) {
    return config;
  }

  const nodeMap = new Map<string, Node<NodeData>>();
  const incomingEdgesMap = new Map<string, Edge[]>();
  const outgoingEdgesMap = new Map<string, Edge[]>();

  nodes.forEach((n) => {
    nodeMap.set(n.id, n);
    incomingEdgesMap.set(n.id, []);
    outgoingEdgesMap.set(n.id, []);
  });

  edges.forEach((e) => {
    incomingEdgesMap.get(e.target)?.push(e);
    outgoingEdgesMap.get(e.source)?.push(e);
  });

  // Check if any execution connections exist in the graph
  const execEdges = edges.filter(
    (e) =>
      e.data?.pinType === 'exec' ||
      (e.sourceHandle || '').toLowerCase().includes('exec') ||
      (e.targetHandle || '').toLowerCase().includes('exec')
  );

  const activeNodeIds = new Set<string>();

  if (execEdges.length > 0) {
    // Collect entry nodes: nodes that have outgoing exec edges but no incoming exec edge
    const incomingExecTargets = new Set(execEdges.map((e) => e.target));
    const entryNodes = nodes.filter((n) => {
      const hasOutgoingExec = execEdges.some((e) => e.source === n.id);
      const hasIncomingExec = incomingExecTargets.has(n.id);
      return (
        hasOutgoingExec && !hasIncomingExec
      ) || n.data.nodeType === 'event' || n.data.title.includes('Spawn') || n.data.title.includes('System');
    });

    // Traverse execution flow from entry nodes
    const queue = entryNodes.map((n) => n.id);
    queue.forEach((id) => activeNodeIds.add(id));

    while (queue.length > 0) {
      const currentId = queue.shift()!;
      const outEdges = outgoingEdgesMap.get(currentId) || [];
      for (const edge of outEdges) {
        const isExec =
          edge.data?.pinType === 'exec' ||
          (edge.sourceHandle || '').toLowerCase().includes('exec') ||
          (edge.targetHandle || '').toLowerCase().includes('exec');
        if (isExec && !activeNodeIds.has(edge.target)) {
          activeNodeIds.add(edge.target);
          queue.push(edge.target);
        }
      }
    }
  } else {
    // If no execution edges exist, all Niagara module nodes in the canvas are considered active
    nodes.forEach((n) => activeNodeIds.add(n.id));
  }

  // Flags to detect whether default or custom forces and renderers are currently connected
  let forcesActive = false;
  let spawnActive = false;
  let renderActive = false;

  for (const node of nodes) {
    const isActive = activeNodeIds.has(node.id);
    const title = (node.data.title || '').trim();
    const id = node.id;

    // --- 1. Emitter Update / Spawn Rate ---
    if (title === 'Spawn Rate' || title === 'Emitter Update' || id === 'niagara-spawn-1') {
      if (isActive) {
        spawnActive = true;
        const rateVal = getPinValue(node, 'SpawnRate', nodeMap, incomingEdgesMap, undefined);
        if (rateVal !== undefined) {
          config.spawnRate = Math.max(0, parseNumber(rateVal, config.spawnRate));
        } else if (node.data.subtitle && node.data.subtitle.includes('Spawn Rate:')) {
          const match = node.data.subtitle.match(/(\d+)/);
          if (match) config.spawnRate = parseInt(match[1], 10);
        }
      }
    }

    // --- 2. Spawn Burst Instantaneous ---
    if (title === 'Spawn Burst Instantaneous' || title.includes('Burst')) {
      if (isActive) {
        const burstCount = getPinValue(node, 'SpawnCount', nodeMap, incomingEdgesMap, undefined);
        if (burstCount !== undefined) {
          config.burstInstantaneousCount = Math.max(0, Math.floor(parseNumber(burstCount, config.burstInstantaneousCount)));
        }
      }
    }

    // --- 3. Initialize Particle ---
    if (title === 'Initialize Particle' || title.includes('Initialize')) {
      if (isActive) {
        const lifeMin = getPinValue(node, 'LifetimeMin', nodeMap, incomingEdgesMap, undefined);
        if (lifeMin !== undefined) config.lifetimeMin = Math.max(0.01, parseNumber(lifeMin, config.lifetimeMin));

        const lifeMax = getPinValue(node, 'LifetimeMax', nodeMap, incomingEdgesMap, undefined);
        if (lifeMax !== undefined) config.lifetimeMax = Math.max(config.lifetimeMin, parseNumber(lifeMax, config.lifetimeMax));

        const initCol = getPinValue(node, 'InitialColor', nodeMap, incomingEdgesMap, undefined);
        if (initCol !== undefined) config.initialColor = parseColor(initCol, config.initialColor);

        const spriteSize = getPinValue(node, 'SpriteSize', nodeMap, incomingEdgesMap, undefined);
        if (spriteSize !== undefined) {
          config.initialSize = parseNumber(spriteSize, config.initialSize ?? 12.0);
        }
      }
    }

    // --- 4. Add Velocity in Cone ---
    if (title === 'Add Velocity in Cone' || title.includes('Velocity in Cone')) {
      if (isActive) {
        const vel = getPinValue(node, 'VelocityStrength', nodeMap, incomingEdgesMap, undefined);
        if (vel !== undefined) config.initialVelocityMagnitude = parseNumber(vel, config.initialVelocityMagnitude);

        const angle = getPinValue(node, 'ConeAngle', nodeMap, incomingEdgesMap, undefined);
        if (angle !== undefined) config.initialVelocityConeAngle = parseNumber(angle, config.initialVelocityConeAngle);
      }
    }

    // --- 5. Sphere Location ---
    if (title === 'Sphere Location') {
      if (isActive) {
        const radius = getPinValue(node, 'SphereRadius', nodeMap, incomingEdgesMap, undefined);
        if (radius !== undefined) config.sphereRadius = Math.max(0, parseNumber(radius, config.sphereRadius ?? 25.0));
      }
    }

    // --- 6. Gravity Force ---
    if (title === 'Gravity Force') {
      if (isActive) {
        forcesActive = true;
        const gVal = getPinValue(node, 'Gravity', nodeMap, incomingEdgesMap, undefined);
        if (gVal !== undefined) {
          if (Array.isArray(gVal) && gVal.length >= 3) {
            config.gravityForceZ = Number(gVal[1]) !== 0 && Number(gVal[2]) === 0 ? Number(gVal[1]) : Number(gVal[2]);
          } else {
            config.gravityForceZ = parseNumber(gVal, config.gravityForceZ);
          }
        }
      }
    }

    // --- 7. Particle Update (Forces) [Composite default node] ---
    if (title === 'Particle Update (Forces)' || id === 'niagara-forces-1') {
      if (isActive) {
        forcesActive = true;
        const grav = getPinValue(node, 'Gravity', nodeMap, incomingEdgesMap, undefined);
        if (grav !== undefined) config.gravityForceZ = parseNumber(grav, config.gravityForceZ);

        const noise = getPinValue(node, 'CurlNoise', nodeMap, incomingEdgesMap, undefined);
        if (noise !== undefined) config.curlNoiseStrength = parseNumber(noise, config.curlNoiseStrength);

        const drag = getPinValue(node, 'Drag', nodeMap, incomingEdgesMap, undefined);
        if (drag !== undefined) config.dragCoefficient = parseNumber(drag, config.dragCoefficient);
      }
    }

    // --- 8. Curl Noise Force ---
    if (title === 'Curl Noise Force') {
      if (isActive) {
        forcesActive = true;
        const str = getPinValue(node, 'NoiseStrength', nodeMap, incomingEdgesMap, undefined);
        if (str !== undefined) config.curlNoiseStrength = parseNumber(str, config.curlNoiseStrength);

        const freq = getPinValue(node, 'NoiseFrequency', nodeMap, incomingEdgesMap, undefined);
        if (freq !== undefined) config.curlNoiseFrequency = parseNumber(freq, config.curlNoiseFrequency);
      }
    }

    // --- 9. Drag Damping ---
    if (title === 'Drag' || title.includes('Drag')) {
      if (isActive) {
        const dragVal = getPinValue(node, 'DragCoefficient', nodeMap, incomingEdgesMap, undefined);
        if (dragVal !== undefined) config.dragCoefficient = Math.max(0, parseNumber(dragVal, config.dragCoefficient));
      }
    }

    // --- 10. Point Attractor ---
    if (title === 'Point Attractor' || title.includes('Attractor')) {
      if (isActive) {
        forcesActive = true;
        config.pointAttractorEnabled = true;
        const str = getPinValue(node, 'AttractorStrength', nodeMap, incomingEdgesMap, undefined);
        if (str !== undefined) config.pointAttractorStrength = parseNumber(str, config.pointAttractorStrength ?? 500);

        const pos = getPinValue(node, 'AttractorPosition', nodeMap, incomingEdgesMap, undefined);
        if (pos !== undefined) config.pointAttractorPosition = parseVector3(pos, config.pointAttractorPosition ?? [0, 1.0, 0]);

        const rad = getPinValue(node, 'AttractorRadius', nodeMap, incomingEdgesMap, undefined);
        if (rad !== undefined) config.pointAttractorRadius = parseNumber(rad, config.pointAttractorRadius ?? 100);

        const falloff = getPinValue(node, 'FalloffExponent', nodeMap, incomingEdgesMap, undefined);
        if (falloff !== undefined) config.pointAttractorFalloff = parseNumber(falloff, config.pointAttractorFalloff ?? 2.0);
      }
    }

    // --- 11. Acceleration Force ---
    if (title === 'Acceleration Force') {
      if (isActive) {
        forcesActive = true;
        const acc = getPinValue(node, 'Acceleration', nodeMap, incomingEdgesMap, undefined);
        if (acc !== undefined) config.linearForce = parseVector3(acc, config.linearForce ?? [0, 0, 0]);
      }
    }

    // --- 12. Size Over Life ---
    if (title === 'Size Over Life' || title.includes('ScaleSpriteSize') || title.includes('Scale Size')) {
      if (isActive) {
        config.sizeOverLifeEnabled = true;
        const sInit = getPinValue(node, 'InitialSize', nodeMap, incomingEdgesMap, undefined);
        if (sInit !== undefined) config.initialSize = parseNumber(sInit, config.initialSize ?? 12.0);

        const sEnd = getPinValue(node, 'EndSize', nodeMap, incomingEdgesMap, undefined);
        if (sEnd !== undefined) config.endSize = parseNumber(sEnd, config.endSize ?? 2.0);
      }
    }

    // --- 13. Color Over Life ---
    if (title === 'Color Over Life') {
      if (isActive) {
        const colStart = getPinValue(node, 'StartColor', nodeMap, incomingEdgesMap, undefined);
        if (colStart !== undefined) config.initialColor = parseColor(colStart, config.initialColor);

        const colEnd = getPinValue(node, 'EndColor', nodeMap, incomingEdgesMap, undefined);
        if (colEnd !== undefined) config.endColor = parseColor(colEnd, config.endColor);
      }
    }

    // --- 14. Collision Plane & Collision Query ---
    if (title === 'Collision Plane' || title === 'Collision Query & Response') {
      if (isActive) {
        config.collisionEnabled = true;
        const rest = getPinValue(node, 'Restitution', nodeMap, incomingEdgesMap, undefined);
        if (rest !== undefined) config.bounciness = parseNumber(rest, config.bounciness ?? 0.45);

        const fric = getPinValue(node, 'Friction', nodeMap, incomingEdgesMap, undefined);
        if (fric !== undefined) config.collisionFriction = parseNumber(fric, config.collisionFriction ?? 0.2);

        const pHeight = getPinValue(node, 'PlaneHeight', nodeMap, incomingEdgesMap, undefined);
        if (pHeight !== undefined) config.collisionPlaneHeight = parseNumber(pHeight, config.collisionPlaneHeight ?? -1.2);

        const pNorm = getPinValue(node, 'PlaneNormal', nodeMap, incomingEdgesMap, undefined);
        if (pNorm !== undefined) config.collisionPlaneNormal = parseVector3(pNorm, config.collisionPlaneNormal ?? [0, 1, 0]);
      }
    }

    // --- 15. Renderers (Sprite Renderer, Ribbon Renderer, etc.) ---
    if (title.includes('Renderer') || id === 'niagara-render-1') {
      if (isActive) {
        renderActive = true;
        const facing = getPinValue(node, 'FacingMode', nodeMap, incomingEdgesMap, undefined);
        if (facing === 'VelocityAligned' || facing === 'FacingCamera') {
          config.spriteRendererFacing = facing;
        }

        const blend = getPinValue(node, 'BlendMode', nodeMap, incomingEdgesMap, undefined);
        if (blend === 'Additive' || blend === 'Translucent' || blend === 'Opaque') {
          config.blendMode = blend;
        }
      }
    }

    // --- 16. Emitter Properties ---
    if (title === 'Emitter Properties') {
      if (isActive) {
        if (node.data.subtitle && node.data.subtitle.includes('CPUSim')) {
          config.simTarget = 'CPUSim';
        } else if (node.data.subtitle && node.data.subtitle.includes('GPUComputeSim')) {
          config.simTarget = 'GPUComputeSim';
        }
      }
    }

    // --- 17. System State ---
    if (title === 'System State') {
      if (isActive) {
        const loop = getPinValue(node, 'LoopDuration', nodeMap, incomingEdgesMap, undefined);
        if (loop !== undefined) config.loopDuration = parseNumber(loop, config.loopDuration ?? 2.0);

        const det = getPinValue(node, 'Determinism', nodeMap, incomingEdgesMap, undefined);
        if (det !== undefined) config.determinism = Boolean(det);
      }
    }
  }

  // If execution edges exist and specific stages were severed:
  if (execEdges.length > 0) {
    if (!spawnActive) {
      config.spawnRate = 0;
      config.burstInstantaneousCount = 0;
    }
    if (!forcesActive) {
      config.gravityForceZ = 0;
      config.curlNoiseStrength = 0;
      config.dragCoefficient = 0;
      config.pointAttractorEnabled = false;
      config.pointAttractorStrength = 0;
      config.linearForce = [0, 0, 0];
    }
    if (!renderActive) {
      config.initialColor = [0, 0, 0, 0];
      config.endColor = [0, 0, 0, 0];
    }
  }

  return config;
}
