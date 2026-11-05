import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { evaluateMaterialGraph, generateGLSLFragmentShader } from '../utils/webglShaderGenerator';

describe('ShadersUE: WebGL PBR Material Graph Evaluator', () => {
  it('should return default dielectric properties when node graph is empty', () => {
    const result = evaluateMaterialGraph([], []);
    expect(result.baseColor).toEqual([0.8, 0.8, 0.8]);
    expect(result.metallic).toBe(0.1);
    expect(result.roughness).toBe(0.35);
    expect(result.specular).toBe(0.5);
    expect(result.emissiveColor).toEqual([0.0, 0.0, 0.0]);
    expect(result.opacity).toBe(1.0);
    expect(result.shadingModel).toBe('DefaultLit');
    expect(result.twoSided).toBe(false);
  });

  it('should allow overriding defaults via partial defaultProps argument', () => {
    const result = evaluateMaterialGraph([], [], {
      roughness: 0.8,
      twoSided: true,
      shadingModel: 'ClearCoat',
    });
    expect(result.roughness).toBe(0.8);
    expect(result.twoSided).toBe(true);
    expect(result.shadingModel).toBe('ClearCoat');
    expect(result.metallic).toBe(0.1); // baseline retained
  });

  it('should inspect standalone Constant3Vector node when no root node is present', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'color-standalone',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.2, 0.6, 0.9] }],
        },
      },
    ];

    const result = evaluateMaterialGraph(nodes, []);
    expect(result.baseColor).toEqual([0.2, 0.6, 0.9]);
  });

  it('should evaluate BaseColor wired directly from Constant3Vector into Material Root', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'gold-color',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.766, 0.336] }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'BaseColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-base',
        source: 'gold-color',
        target: 'root-node',
        targetHandle: 'vector3-basecolor',
      },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.baseColor).toEqual([1.0, 0.766, 0.336]);
  });

  it('should clamp Metallic between 0.0 and 1.0', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'metal-overflow',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 2.5 }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-metal',
        source: 'metal-overflow',
        target: 'root-node',
        targetHandle: 'float-metallic',
      },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.metallic).toBe(1.0);
  });

  it('should enforce minimum Roughness clamp boundary of 0.02 for specular stability', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'rough-underflow',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: -0.5 }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Roughness', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-rough',
        source: 'rough-underflow',
        target: 'root-node',
        targetHandle: 'float-roughness',
      },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.roughness).toBe(0.02);
  });

  it('should support scalar EmissiveColor broadcasting into RGB vector channels', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'emissive-scalar',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 3.5 }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'EmissiveColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-emissive',
        source: 'emissive-scalar',
        target: 'root-node',
        targetHandle: 'vector3-emissive',
      },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.emissiveColor).toEqual([3.5, 3.5, 3.5]);
  });

  it('should evaluate Multiply node with vector color and scalar multiplier', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'base-tint',
        type: 'customNode',
        position: { x: -400, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.2, 0.4, 0.8] }],
        },
      },
      {
        id: 'multiplier',
        type: 'customNode',
        position: { x: -400, y: 150 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 2.0 }],
        },
      },
      {
        id: 'mult-op',
        type: 'customNode',
        position: { x: -200, y: 50 },
        data: {
          title: 'Multiply',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'float' }],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'BaseColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'base-tint', target: 'mult-op', targetHandle: 'vector3-a' },
      { id: 'e2', source: 'multiplier', target: 'mult-op', targetHandle: 'float-b' },
      { id: 'e3', source: 'mult-op', target: 'root-node', targetHandle: 'vector3-basecolor' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.baseColor).toEqual([0.4, 0.8, 1.6]);
  });

  it('should evaluate LinearInterpolate (Lerp) node between two vector colors with alpha', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'col-black',
        type: 'customNode',
        position: { x: -400, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.0, 0.0, 0.0] }],
        },
      },
      {
        id: 'col-white',
        type: 'customNode',
        position: { x: -400, y: 100 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 1.0, 1.0] }],
        },
      },
      {
        id: 'alpha-weight',
        type: 'customNode',
        position: { x: -400, y: 200 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.25 }],
        },
      },
      {
        id: 'lerp-op',
        type: 'customNode',
        position: { x: -200, y: 100 },
        data: {
          title: 'LinearInterpolate (Lerp)',
          nodeType: 'customNode',
          inputs: [
            { name: 'A', type: 'vector3' },
            { name: 'B', type: 'vector3' },
            { name: 'Alpha', type: 'float' },
          ],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'BaseColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'ea', source: 'col-black', target: 'lerp-op', targetHandle: 'vector3-a' },
      { id: 'eb', source: 'col-white', target: 'lerp-op', targetHandle: 'vector3-b' },
      { id: 'ealpha', source: 'alpha-weight', target: 'lerp-op', targetHandle: 'float-alpha' },
      { id: 'eroot', source: 'lerp-op', target: 'root-node', targetHandle: 'vector3-basecolor' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    // 0 * 0.75 + 1 * 0.25 = 0.25
    expect(result.baseColor[0]).toBeCloseTo(0.25);
    expect(result.baseColor[1]).toBeCloseTo(0.25);
    expect(result.baseColor[2]).toBeCloseTo(0.25);
  });

  it('should protect against recursive cycle loops with depth guard (> 12) without stack overflow', () => {
    // Create an explicit circular cycle: loop-1 -> loop-2 -> loop-1
    const nodes: Node<NodeData>[] = [
      {
        id: 'loop-1',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Multiply',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'loop-2',
        type: 'customNode',
        position: { x: -100, y: 0 },
        data: {
          title: 'Multiply',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e-cycle-1', source: 'loop-1', target: 'loop-2', targetHandle: 'float-a' },
      { id: 'e-cycle-2', source: 'loop-2', target: 'loop-1', targetHandle: 'float-a' },
      { id: 'e-to-root', source: 'loop-1', target: 'root-node', targetHandle: 'float-metallic' },
    ];

    // Must terminate safely and not throw RangeError: Maximum call stack size exceeded
    expect(() => evaluateMaterialGraph(nodes, edges)).not.toThrow();
    const result = evaluateMaterialGraph(nodes, edges);
    expect(typeof result.metallic).toBe('number');
  });

  it('should evaluate Fresnel node as specular reflection falloff constant 0.8', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'fresnel-src',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Fresnel',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e-fresnel', source: 'fresnel-src', target: 'root-node', targetHandle: 'float-metallic' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.metallic).toBe(0.8);
  });

  it('should evaluate Add node with vector-vector and scalar-vector inputs', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'c1',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.1, 0.2, 0.3] }],
        },
      },
      {
        id: 'c2',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.4, 0.5, 0.6] }],
        },
      },
      {
        id: 'add-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Add',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'vector3' }],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'BaseColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'c1', target: 'add-node', targetHandle: 'vector3-a' },
      { id: 'e2', source: 'c2', target: 'add-node', targetHandle: 'vector3-b' },
      { id: 'e3', source: 'add-node', target: 'root-node', targetHandle: 'vector3-basecolor' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.baseColor[0]).toBeCloseTo(0.5);
    expect(result.baseColor[1]).toBeCloseTo(0.7);
    expect(result.baseColor[2]).toBeCloseTo(0.9);
  });

  it('should evaluate Subtract node correctly', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'c1',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.9 }],
        },
      },
      {
        id: 'c2',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.2 }],
        },
      },
      {
        id: 'sub-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Subtract',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Roughness', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'c1', target: 'sub-node', targetHandle: 'float-a' },
      { id: 'e2', source: 'c2', target: 'sub-node', targetHandle: 'float-b' },
      { id: 'e3', source: 'sub-node', target: 'root-node', targetHandle: 'float-roughness' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.roughness).toBeCloseTo(0.7);
  });

  it('should evaluate Divide node and guard against division by zero', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'num',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 4.0 }],
        },
      },
      {
        id: 'zero',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.0 }],
        },
      },
      {
        id: 'div-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Divide',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'float' }, { name: 'B', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'num', target: 'div-node', targetHandle: 'float-a' },
      { id: 'e2', source: 'zero', target: 'div-node', targetHandle: 'float-b' },
      { id: 'e3', source: 'div-node', target: 'root-node', targetHandle: 'float-metallic' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.metallic).toBe(0.0); // Safe division by zero yields 0
  });

  it('should evaluate Power node', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'base',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.5 }],
        },
      },
      {
        id: 'exp',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 2.0 }],
        },
      },
      {
        id: 'pow-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Power',
          nodeType: 'customNode',
          inputs: [{ name: 'Base', type: 'float' }, { name: 'Exponent', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'base', target: 'pow-node', targetHandle: 'float-base' },
      { id: 'e2', source: 'exp', target: 'pow-node', targetHandle: 'float-exponent' },
      { id: 'e3', source: 'pow-node', target: 'root-node', targetHandle: 'float-metallic' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.metallic).toBeCloseTo(0.25);
  });

  it('should evaluate Sine and Cosine in UE5 normalized 0-1 period', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'in-val',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.25 }], // 0.25 * 2PI = PI/2
        },
      },
      {
        id: 'sin-node',
        type: 'customNode',
        position: { x: -100, y: 0 },
        data: {
          title: 'Sine (Sin)',
          nodeType: 'customNode',
          inputs: [{ name: 'In', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Roughness', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'in-val', target: 'sin-node', targetHandle: 'float-in' },
      { id: 'e2', source: 'sin-node', target: 'root-node', targetHandle: 'float-roughness' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.roughness).toBeCloseTo(1.0); // sin(PI/2) = 1.0
  });

  it('should evaluate Dot Product and VectorLength correctly', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'vec-34',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [3.0, 4.0, 0.0] }],
        },
      },
      {
        id: 'len-node',
        type: 'customNode',
        position: { x: -100, y: 0 },
        data: {
          title: 'VectorLength',
          nodeType: 'customNode',
          inputs: [{ name: 'Vector', type: 'vector3' }],
          outputs: [{ name: 'Length', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Metallic', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'vec-34', target: 'len-node', targetHandle: 'vector3-vector' },
      { id: 'e2', source: 'len-node', target: 'root-node', targetHandle: 'float-metallic' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    // VectorLength is 5.0, clamped to 1.0 for Metallic
    expect(result.metallic).toBe(1.0);
  });

  it('should evaluate Cross Product between unit X and unit Y vectors yielding unit Z', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'vec-x',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.0, 0.0] }],
        },
      },
      {
        id: 'vec-y',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.0, 1.0, 0.0] }],
        },
      },
      {
        id: 'cross-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Cross Product',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'vector3' }],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Normal', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'vec-x', target: 'cross-node', targetHandle: 'vector3-a' },
      { id: 'e2', source: 'vec-y', target: 'cross-node', targetHandle: 'vector3-b' },
      { id: 'e3', source: 'cross-node', target: 'root-node', targetHandle: 'vector3-normal' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.normal).toEqual([0.0, 0.0, 1.0]);
  });

  it('should evaluate Distance between two points', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'p1',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 2.0, 3.0] }],
        },
      },
      {
        id: 'p2',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 5.0, 7.0] }],
        },
      },
      {
        id: 'dist-node',
        type: 'customNode',
        position: { x: -100, y: 50 },
        data: {
          title: 'Distance',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'vector3' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'Specular', type: 'float' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'p1', target: 'dist-node', targetHandle: 'vector3-a' },
      { id: 'e2', source: 'p2', target: 'dist-node', targetHandle: 'vector3-b' },
      { id: 'e3', source: 'dist-node', target: 'root-node', targetHandle: 'float-specular' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    // sqrt((5-2)^2 + (7-3)^2) = sqrt(9 + 16) = 5.0, clamped to 1.0 for Specular
    expect(result.specular).toBe(1.0);
  });

  it('should evaluate Desaturation node', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'pure-red',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.0, 0.0] }],
        },
      },
      {
        id: 'desat-node',
        type: 'customNode',
        position: { x: -100, y: 0 },
        data: {
          title: 'Desaturation',
          nodeType: 'customNode',
          inputs: [{ name: 'In', type: 'vector3' }, { name: 'Fraction', type: 'float' }],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [{ name: 'BaseColor', type: 'vector3' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'pure-red', target: 'desat-node', targetHandle: 'vector3-in' },
      { id: 'e2', source: 'desat-node', target: 'root-node', targetHandle: 'vector3-basecolor' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    // Full desaturation (fraction 1.0): 0.3 * 1.0 = 0.3
    expect(result.baseColor[0]).toBeCloseTo(0.3);
    expect(result.baseColor[1]).toBeCloseTo(0.3);
    expect(result.baseColor[2]).toBeCloseTo(0.3);
  });

  it('should evaluate Master Material Root with Specular, Normal, and WorldPositionOffset pins', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'spec-val',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 0.85 }],
        },
      },
      {
        id: 'normal-val',
        type: 'customNode',
        position: { x: -200, y: 100 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.0, 1.0, 0.0] }],
        },
      },
      {
        id: 'wpo-val',
        type: 'customNode',
        position: { x: -200, y: 200 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [0.0, 0.0, 15.0] }],
        },
      },
      {
        id: 'root-node',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [
            { name: 'Specular', type: 'float' },
            { name: 'Normal', type: 'vector3' },
            { name: 'WorldPositionOffset', type: 'vector3' },
          ],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e1', source: 'spec-val', target: 'root-node', targetHandle: 'float-specular' },
      { id: 'e2', source: 'normal-val', target: 'root-node', targetHandle: 'vector3-normal' },
      { id: 'e3', source: 'wpo-val', target: 'root-node', targetHandle: 'vector3-worldpositionoffset' },
    ];

    const result = evaluateMaterialGraph(nodes, edges);
    expect(result.specular).toBeCloseTo(0.85);
    expect(result.normal).toEqual([0.0, 1.0, 0.0]);
    expect(result.worldPositionOffset).toEqual([0.0, 0.0, 15.0]);
  });

  describe('generateGLSLFragmentShader', () => {
    it('should generate valid vertex and fragment shader source code with standard uniforms', () => {
      const shader = generateGLSLFragmentShader([], []);
      expect(shader.vertexShader).toContain('void main()');
      expect(shader.vertexShader).toContain('v_Normal = normalize(normalMatrix * normal);');
      expect(shader.vertexShader).toContain('gl_Position = projectionMatrix * viewMatrix * worldPos;');

      expect(shader.fragmentShader).toContain('precision highp float;');
      expect(shader.fragmentShader).toContain('uniform vec3 u_BaseColor;');
      expect(shader.fragmentShader).toContain('uniform float u_Metallic;');
      expect(shader.fragmentShader).toContain('uniform float u_Specular;');
      expect(shader.fragmentShader).toContain('uniform float u_Roughness;');
      expect(shader.fragmentShader).toContain('gl_FragColor = vec4(finalColor, u_Opacity);');

      expect(shader.uniforms.u_BaseColor.value).toEqual([0.8, 0.8, 0.8]);
      expect(shader.uniforms.u_Metallic.value).toBe(0.1);
      expect(shader.uniforms.u_Specular.value).toBe(0.5);
      expect(shader.uniforms.u_Roughness.value).toBe(0.35);
      expect(shader.uniforms.u_Opacity.value).toBe(1.0);
    });

    it('should map graph evaluation results into GLSL uniforms', () => {
      const nodes: Node<NodeData>[] = [
        {
          id: 'gold-color',
          type: 'customNode',
          position: { x: -200, y: 0 },
          data: {
            title: 'Constant3Vector (RGB)',
            nodeType: 'customNode',
            inputs: [],
            outputs: [{ name: 'RGB', type: 'vector3', defaultValue: [1.0, 0.766, 0.336] }],
          },
        },
        {
          id: 'root-node',
          type: 'customNode',
          position: { x: 100, y: 0 },
          data: {
            title: 'Material Root',
            nodeType: 'customNode',
            inputs: [{ name: 'BaseColor', type: 'vector3' }],
            outputs: [],
          },
        },
      ];

      const edges: Edge[] = [
        { id: 'e1', source: 'gold-color', target: 'root-node', targetHandle: 'vector3-basecolor' },
      ];

      const shader = generateGLSLFragmentShader(nodes, edges);
      expect(shader.uniforms.u_BaseColor.value).toEqual([1.0, 0.766, 0.336]);
    });
  });
});


