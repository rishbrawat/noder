import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { MaterialGraphProperties } from '../types/materialTypes';

export interface GLSLShaderResult {
  vertexShader: string;
  fragmentShader: string;
  uniforms: Record<string, { value: any }>;
}

/**
 * Evaluates the connected nodes into effective PBR material parameters
 * for WebGL / Three.js live rendering.
 */
export function evaluateMaterialGraph(
  nodes: Node<NodeData>[],
  edges: Edge[],
  defaultProps?: Partial<MaterialGraphProperties>
): MaterialGraphProperties {
  const defaults: MaterialGraphProperties = {
    baseColor: [0.8, 0.8, 0.8],
    metallic: 0.1,
    specular: 0.5,
    roughness: 0.35,
    emissiveColor: [0.0, 0.0, 0.0],
    opacity: 1.0,
    normal: [0, 0, 1],
    worldPositionOffset: [0, 0, 0],
    shadingModel: 'DefaultLit',
    twoSided: false,
    ...defaultProps,
  };

  if (!nodes || nodes.length === 0) {
    return defaults;
  }

  const rootNode = nodes.find(
    (n) => n.data.title === 'Material Root' || n.id.includes('root') || n.data.title?.toLowerCase().includes('output')
  );

  // Map node IDs to node
  const nodeMap = new Map<string, Node<NodeData>>();
  nodes.forEach((n) => nodeMap.set(n.id, n));

  // If there's no root node, check for constants directly
  if (!rootNode) {
    for (const node of nodes) {
      if (node.data.title === 'Constant3Vector (RGB)' || node.data.title === 'VectorParameter') {
        const pin = node.data.outputs?.[0];
        if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
          defaults.baseColor = [pin.defaultValue[0], pin.defaultValue[1], pin.defaultValue[2]];
        }
      }
    }
    return defaults;
  }

  // Find incoming edges to the root
  const rootEdges = edges.filter((e) => e.target === rootNode.id);

  // Helper to find edge connected to a specific handle or pin name of a node
  const findInputEdge = (nodeId: string, pinNameOrPattern: string): Edge | undefined => {
    const pattern = pinNameOrPattern.toLowerCase();
    return edges.find((e) => {
      if (e.target !== nodeId) return false;
      const h = (e.targetHandle || '').toLowerCase();
      return h.includes(pattern) || h.endsWith(`-${pattern}`) || h === pattern;
    });
  };

  // Recursive evaluator for node values
  const evaluateNodeValue = (nodeId: string, depth = 0): any => {
    if (depth > 12) return 0; // Prevent cycle loops
    const node = nodeMap.get(nodeId);
    if (!node) return 0;

    const title = node.data.title || '';

    // --- Constants & Parameters ---
    if (title.includes('Constant (Scalar)') || title === 'ScalarParameter') {
      const pin = node.data.outputs?.find((o) => o.name === 'Out' || o.name === 'Param');
      return typeof pin?.defaultValue === 'number' ? pin.defaultValue : 0.5;
    }

    if (title.includes('Constant2Vector')) {
      const pin = node.data.outputs?.find((o) => o.name === 'Out');
      if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
        return pin.defaultValue;
      }
      return [1.0, 1.0];
    }

    if (title.includes('Constant3Vector') || title === 'VectorParameter') {
      const pin = node.data.outputs?.find((o) => o.name === 'RGB' || o.name === 'RGBA');
      if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
        return pin.defaultValue;
      }
      return [1.0, 0.84, 0.0];
    }

    if (title.includes('Constant4Vector')) {
      const pin = node.data.outputs?.find((o) => o.name === 'RGBA');
      if (pin?.defaultValue && Array.isArray(pin.defaultValue)) {
        return pin.defaultValue;
      }
      return [1.0, 1.0, 1.0, 1.0];
    }

    const nodeDefaultProps = (node.data as Record<string, any>).defaultProperties;

    if (title === 'StaticSwitchParameter') {
      const isTrue = nodeDefaultProps?.DefaultValue !== false;
      const edge = isTrue ? findInputEdge(nodeId, 'true') : findInputEdge(nodeId, 'false');
      return edge ? evaluateNodeValue(edge.source, depth + 1) : [1.0, 1.0, 1.0];
    }

    // --- UV & Textures ---
    if (title.includes('TextureCoordinate') || title.includes('TexCoord')) {
      const ut = nodeDefaultProps?.UTiling ?? 1.0;
      const vt = nodeDefaultProps?.VTiling ?? 1.0;
      return [ut, vt];
    }

    if (title === 'Panner') {
      const inCoord = findInputEdge(nodeId, 'coordinate');
      const inSpeed = findInputEdge(nodeId, 'speed');
      const coord = inCoord ? evaluateNodeValue(inCoord.source, depth + 1) : [0.0, 0.0];
      const speed = inSpeed ? evaluateNodeValue(inSpeed.source, depth + 1) : [0.1, 0.0];
      const time = 1.0;
      return [
        (coord[0] ?? 0) + (speed[0] ?? 0.1) * time,
        (coord[1] ?? 0) + (speed[1] ?? 0.0) * time,
      ];
    }

    if (title === 'Rotator') {
      const inCoord = findInputEdge(nodeId, 'coordinate');
      const coord = inCoord ? evaluateNodeValue(inCoord.source, depth + 1) : [0.5, 0.5];
      const speed = nodeDefaultProps?.Speed ?? 0.25;
      const angle = 2 * Math.PI * speed;
      const cosA = Math.cos(angle);
      const sinA = Math.sin(angle);
      const cx = nodeDefaultProps?.CenterX ?? 0.5;
      const cy = nodeDefaultProps?.CenterY ?? 0.5;
      const dx = (coord[0] ?? 0.5) - cx;
      const dy = (coord[1] ?? 0.5) - cy;
      return [cosA * dx - sinA * dy + cx, sinA * dx + cosA * dy + cy];
    }

    if (title === 'Texture Sample' || title === 'TextureSample') {
      return [0.7, 0.7, 0.7];
    }

    // --- Math Operations ---
    if (title === 'Add') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : 0;
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : 0;

      if (typeof valA === 'number' && typeof valB === 'number') return valA + valB;
      if (Array.isArray(valA) && typeof valB === 'number') return valA.map((v) => v + valB);
      if (typeof valA === 'number' && Array.isArray(valB)) return valB.map((v) => valA + v);
      if (Array.isArray(valA) && Array.isArray(valB)) {
        return valA.map((v, i) => v + (valB[i] ?? 0));
      }
      return valA;
    }

    if (title === 'Subtract') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : 0;
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : 0;

      if (typeof valA === 'number' && typeof valB === 'number') return valA - valB;
      if (Array.isArray(valA) && typeof valB === 'number') return valA.map((v) => v - valB);
      if (typeof valA === 'number' && Array.isArray(valB)) return valB.map((v) => valA - v);
      if (Array.isArray(valA) && Array.isArray(valB)) {
        return valA.map((v, i) => v - (valB[i] ?? 0));
      }
      return valA;
    }

    if (title === 'Multiply') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : 1;
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : 1;

      if (typeof valA === 'number' && typeof valB === 'number') return valA * valB;
      if (Array.isArray(valA) && typeof valB === 'number') return valA.map((v) => v * valB);
      if (typeof valA === 'number' && Array.isArray(valB)) return valB.map((v) => v * valA);
      if (Array.isArray(valA) && Array.isArray(valB)) {
        return valA.map((v, i) => v * (valB[i] ?? 1));
      }
      return valA;
    }

    if (title === 'Divide') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : 1;
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : 1;

      if (typeof valA === 'number' && typeof valB === 'number') {
        return valB === 0 ? 0 : valA / valB;
      }
      if (Array.isArray(valA) && typeof valB === 'number') {
        return valB === 0 ? valA.map(() => 0) : valA.map((v) => v / valB);
      }
      if (typeof valA === 'number' && Array.isArray(valB)) {
        return valB.map((v) => (v === 0 ? 0 : valA / v));
      }
      if (Array.isArray(valA) && Array.isArray(valB)) {
        return valA.map((v, i) => {
          const div = valB[i] ?? 1;
          return div === 0 ? 0 : v / div;
        });
      }
      return valA;
    }

    if (title === 'Power') {
      const inBase = findInputEdge(nodeId, 'base') || findInputEdge(nodeId, 'in');
      const inExp = findInputEdge(nodeId, 'exponent') || findInputEdge(nodeId, 'exp');
      const base = inBase ? evaluateNodeValue(inBase.source, depth + 1) : 1;
      const exp = inExp ? evaluateNodeValue(inExp.source, depth + 1) : 2;

      if (typeof base === 'number' && typeof exp === 'number') {
        return Math.pow(Math.max(0, base), exp);
      }
      if (Array.isArray(base) && typeof exp === 'number') {
        return base.map((b) => Math.pow(Math.max(0, b), exp));
      }
      return base;
    }

    if (title === 'Clamp') {
      const inVal = findInputEdge(nodeId, 'in');
      const inMin = findInputEdge(nodeId, 'min');
      const inMax = findInputEdge(nodeId, 'max');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.5;
      const minV = inMin ? Number(evaluateNodeValue(inMin.source, depth + 1)) : 0.0;
      const maxV = inMax ? Number(evaluateNodeValue(inMax.source, depth + 1)) : 1.0;

      if (typeof val === 'number') {
        return Math.min(Math.max(val, minV), maxV);
      }
      if (Array.isArray(val)) {
        return val.map((v) => Math.min(Math.max(v, minV), maxV));
      }
      return val;
    }

    if (title === 'Saturate') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.5;

      if (typeof val === 'number') {
        return Math.min(Math.max(val, 0.0), 1.0);
      }
      if (Array.isArray(val)) {
        return val.map((v) => Math.min(Math.max(v, 0.0), 1.0));
      }
      return val;
    }

    if (title.includes('Sine') || title === 'Sin') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.0;
      // UE5 Sine uses normalized 0-1 period: sin(2 * PI * in)
      if (typeof val === 'number') {
        return Math.sin(2 * Math.PI * val);
      }
      if (Array.isArray(val)) {
        return val.map((v) => Math.sin(2 * Math.PI * v));
      }
      return 0.0;
    }

    if (title.includes('Cosine') || title === 'Cos') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.0;
      // UE5 Cosine uses normalized 0-1 period: cos(2 * PI * in)
      if (typeof val === 'number') {
        return Math.cos(2 * Math.PI * val);
      }
      if (Array.isArray(val)) {
        return val.map((v) => Math.cos(2 * Math.PI * v));
      }
      return 1.0;
    }

    if (title.includes('Tangent') || title === 'Tan') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.0;
      if (typeof val === 'number') {
        return Math.tan(val);
      }
      if (Array.isArray(val)) {
        return val.map((v) => Math.tan(v));
      }
      return 0.0;
    }

    if (title === 'Abs') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 0.0;
      if (typeof val === 'number') return Math.abs(val);
      if (Array.isArray(val)) return val.map((v) => Math.abs(v));
      return 0.0;
    }

    if (title.includes('SquareRoot') || title === 'Sqrt') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : 1.0;
      if (typeof val === 'number') return Math.sqrt(Math.max(0, val));
      if (Array.isArray(val)) return val.map((v) => Math.sqrt(Math.max(0, v)));
      return 1.0;
    }

    // --- Vector & Coordinate Math ---
    if (title === 'Dot Product') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : [1, 0, 0];
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : [1, 0, 0];

      if (Array.isArray(valA) && Array.isArray(valB)) {
        return valA.reduce((sum, a, i) => sum + a * (valB[i] ?? 0), 0);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return valA * valB;
      }
      return 1.0;
    }

    if (title === 'Cross Product') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : [1, 0, 0];
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : [0, 1, 0];

      const ax = valA[0] ?? 0, ay = valA[1] ?? 0, az = valA[2] ?? 0;
      const bx = valB[0] ?? 0, by = valB[1] ?? 0, bz = valB[2] ?? 0;
      return [
        ay * bz - az * by,
        az * bx - ax * bz,
        ax * by - ay * bx,
      ];
    }

    if (title === 'Normalize') {
      const inVec = findInputEdge(nodeId, 'vector') || findInputEdge(nodeId, 'in');
      const val = inVec ? evaluateNodeValue(inVec.source, depth + 1) : [0, 0, 1];
      if (Array.isArray(val)) {
        const len = Math.hypot(...val) || 1.0;
        return val.map((v) => v / len);
      }
      return [0, 0, 1];
    }

    if (title === 'VectorLength') {
      const inVec = findInputEdge(nodeId, 'vector') || findInputEdge(nodeId, 'in');
      const val = inVec ? evaluateNodeValue(inVec.source, depth + 1) : [0, 0, 1];
      if (Array.isArray(val)) {
        return Math.hypot(...val);
      }
      return typeof val === 'number' ? Math.abs(val) : 1.0;
    }

    if (title === 'Distance') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : [0, 0, 0];
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : [0, 0, 0];

      if (Array.isArray(valA) && Array.isArray(valB)) {
        const diff = valA.map((v, i) => v - (valB[i] ?? 0));
        return Math.hypot(...diff);
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return Math.abs(valA - valB);
      }
      return 0.0;
    }

    if (title === 'ReflectionVectorWS') {
      return [0.0, 0.0, 1.0];
    }

    if (title === 'CameraVectorWS' || title === 'PixelNormalWS') {
      return [0.0, 0.0, 1.0];
    }

    if (title === 'WorldPosition') {
      return [0.0, 0.0, 0.0];
    }

    // --- Color & Blending ---
    if (title === 'LinearInterpolate (Lerp)') {
      const inA = findInputEdge(nodeId, 'a');
      const inB = findInputEdge(nodeId, 'b');
      const inAlpha = findInputEdge(nodeId, 'alpha');
      const valA = inA ? evaluateNodeValue(inA.source, depth + 1) : [0.1, 0.1, 0.1];
      const valB = inB ? evaluateNodeValue(inB.source, depth + 1) : [1.0, 0.8, 0.2];
      const alpha = inAlpha ? Number(evaluateNodeValue(inAlpha.source, depth + 1)) : 0.5;

      if (Array.isArray(valA) && Array.isArray(valB)) {
        return [
          (valA[0] ?? 0) * (1 - alpha) + (valB[0] ?? 0) * alpha,
          (valA[1] ?? 0) * (1 - alpha) + (valB[1] ?? 0) * alpha,
          (valA[2] ?? 0) * (1 - alpha) + (valB[2] ?? 0) * alpha,
        ];
      }
      if (typeof valA === 'number' && typeof valB === 'number') {
        return valA * (1 - alpha) + valB * alpha;
      }
      return valA;
    }

    if (title === 'Desaturation') {
      const inVal = findInputEdge(nodeId, 'in');
      const inFrac = findInputEdge(nodeId, 'fraction');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : [1.0, 1.0, 1.0];
      const fraction = inFrac ? Number(evaluateNodeValue(inFrac.source, depth + 1)) : 1.0;

      if (Array.isArray(val)) {
        const r = val[0] ?? 0, g = val[1] ?? 0, b = val[2] ?? 0;
        const lum = 0.3 * r + 0.59 * g + 0.11 * b;
        return [
          r * (1 - fraction) + lum * fraction,
          g * (1 - fraction) + lum * fraction,
          b * (1 - fraction) + lum * fraction,
        ];
      }
      return val;
    }

    if (title === 'ComponentMask') {
      const inVal = findInputEdge(nodeId, 'in');
      const val = inVal ? evaluateNodeValue(inVal.source, depth + 1) : [1, 1, 1, 1];
      if (Array.isArray(val)) {
        return [val[0] ?? 0, val[1] ?? 0, val[2] ?? 0];
      }
      return val;
    }

    // --- VFX & Dynamics ---
    if (title === 'Fresnel') {
      return 0.8;
    }

    if (title === 'DepthFade') {
      return 1.0;
    }

    if (title === 'WorldPositionOffset') {
      const inOffset = findInputEdge(nodeId, 'offset') || findInputEdge(nodeId, 'in');
      return inOffset ? evaluateNodeValue(inOffset.source, depth + 1) : [0.0, 0.0, 0.0];
    }

    return 0.5;
  };

  rootEdges.forEach((edge) => {
    const targetHandle = (edge.targetHandle || '').toLowerCase();
    const val = evaluateNodeValue(edge.source);

    if (targetHandle.includes('basecolor')) {
      if (Array.isArray(val)) {
        defaults.baseColor = [val[0] ?? 0.8, val[1] ?? 0.8, val[2] ?? 0.8];
      }
    } else if (targetHandle.includes('metallic')) {
      defaults.metallic = typeof val === 'number' ? Math.min(Math.max(val, 0), 1) : 0.8;
    } else if (targetHandle.includes('specular')) {
      defaults.specular = typeof val === 'number' ? Math.min(Math.max(val, 0), 1) : 0.5;
    } else if (targetHandle.includes('roughness')) {
      defaults.roughness = typeof val === 'number' ? Math.min(Math.max(val, 0.02), 1) : 0.2;
    } else if (targetHandle.includes('emissive')) {
      if (Array.isArray(val)) {
        defaults.emissiveColor = [val[0] ?? 0, val[1] ?? 0, val[2] ?? 0];
      } else if (typeof val === 'number') {
        defaults.emissiveColor = [val, val, val];
      }
    } else if (targetHandle.includes('opacity')) {
      defaults.opacity = typeof val === 'number' ? Math.min(Math.max(val, 0), 1) : 1.0;
    } else if (targetHandle.includes('normal')) {
      if (Array.isArray(val)) {
        defaults.normal = [val[0] ?? 0, val[1] ?? 0, val[2] ?? 1];
      }
    } else if (targetHandle.includes('worldpositionoffset')) {
      if (Array.isArray(val)) {
        defaults.worldPositionOffset = [val[0] ?? 0, val[1] ?? 0, val[2] ?? 0];
      }
    }
  });

  return defaults;
}

/**
 * Generates compilable WebGL GLSL vertex & fragment shaders and uniform bindings
 * for the live 3D material preview viewport.
 */
export function generateGLSLFragmentShader(
  nodes: Node<NodeData>[],
  edges: Edge[],
  defaultProps?: Partial<MaterialGraphProperties>
): GLSLShaderResult {
  const pbr = evaluateMaterialGraph(nodes, edges, defaultProps);

  const vertexShader = `
precision highp float;

varying vec3 v_Normal;
varying vec3 v_WorldPosition;
varying vec2 v_Uv;

void main() {
  v_Normal = normalize(normalMatrix * normal);
  v_Uv = uv;
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  v_WorldPosition = worldPos.xyz;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`.trim();

  const fragmentShader = `
precision highp float;

uniform vec3 u_BaseColor;
uniform float u_Metallic;
uniform float u_Specular;
uniform float u_Roughness;
uniform vec3 u_Emissive;
uniform float u_Opacity;
uniform float u_Time;

varying vec3 v_Normal;
varying vec3 v_WorldPosition;
varying vec2 v_Uv;

void main() {
  vec3 N = normalize(v_Normal);
  vec3 V = normalize(cameraPosition - v_WorldPosition);
  
  // Studio 3-Point Lighting Rig Directions
  vec3 L_Key  = normalize(vec3(4.0, 5.0, 4.0));
  vec3 L_Fill = normalize(vec3(-4.0, 2.0, 2.0));
  vec3 L_Rim  = normalize(vec3(0.0, -3.0, -4.0));
  
  float NdotKey  = max(dot(N, L_Key),  0.0);
  float NdotFill = max(dot(N, L_Fill), 0.0);
  float NdotRim  = max(dot(N, L_Rim),  0.0);
  
  // Diffuse illumination with ambient baseline
  vec3 diffuse = u_BaseColor * (NdotKey * 1.0 + NdotFill * 0.45 + NdotRim * 0.25 + vec3(0.18));
  
  // Specular Blinn-Phong highlight
  vec3 H = normalize(L_Key + V);
  float shininess = mix(96.0, 4.0, u_Roughness);
  float spec = pow(max(dot(N, H), 0.0), shininess) * u_Specular;
  
  // Fresnel rim falloff
  float fresnel = pow(1.0 - max(dot(N, V), 0.0), 3.0) * (1.0 - u_Roughness);
  
  vec3 finalColor = diffuse + vec3(spec) + u_Emissive + (fresnel * 0.35 * (1.0 - u_Roughness));
  gl_FragColor = vec4(finalColor, u_Opacity);
}
`.trim();

  const uniforms = {
    u_BaseColor: { value: pbr.baseColor },
    u_Metallic: { value: pbr.metallic },
    u_Specular: { value: pbr.specular },
    u_Roughness: { value: pbr.roughness },
    u_Emissive: { value: pbr.emissiveColor },
    u_Opacity: { value: pbr.opacity },
    u_Time: { value: 0.0 },
  };

  return {
    vertexShader,
    fragmentShader,
    uniforms,
  };
}
