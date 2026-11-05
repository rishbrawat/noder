import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { compileMaterialToT3D } from '../utils/ueMaterialT3DCompiler';

describe('ShadersUE: MaterialExpression UE5 T3D Compiler', () => {
  it('should compile an empty node graph returning zero counts and valid result container', () => {
    const result = compileMaterialToT3D([], []);
    expect(result.nodeCount).toBe(0);
    expect(result.connectionCount).toBe(0);
    expect(result.warnings).toEqual([]);
    expect(result.t3dText).toBe('');
  });

  it('should compile Constant3Vector with valid Unreal Engine MaterialExpression formatting', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-vec3-1',
        type: 'customNode',
        position: { x: 120.4, y: 240.8 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.nodeCount).toBe(1);
    expect(result.connectionCount).toBe(0);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialGraphNode Name="MaterialGraphNode_0"');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionConstant3Vector Name="MaterialExpressionConstant3Vector_0"');
    expect(result.t3dText).toContain('MaterialExpression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\'');
    expect(result.t3dText).toContain('NodePosX=120');
    expect(result.t3dText).toContain('NodePosY=241');
    expect(result.t3dText).toContain('Constant=(R=1,G=0.84,B=0,A=0)');
    expect(result.t3dText).toContain('Material=Material\'"/Game/Materials/M_CustomShader.M_CustomShader"\'');
    expect(result.t3dText).toContain('End Object');
  });

  it('should compile Scalar Constant and format 32-character upper-case hex NodeGuid', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'scalar-abc-1234',
        type: 'customNode',
        position: { x: -350, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionConstant Name="MaterialExpressionConstant_0"');
    expect(result.t3dText).toContain('R=1');
    expect(result.t3dText).toMatch(/NodeGuid=[0-9A-Z]{32}/);
  });

  it('should compile VectorParameter with ParameterName and DefaultValue', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-param-1',
        type: 'customNode',
        position: { x: 50, y: 80 },
        data: {
          title: 'VectorParameter',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionVectorParameter');
    expect(result.t3dText).toContain('ParameterName=Param_Color');
    expect(result.t3dText).toContain('DefaultValue=(R=1,G=1,B=1,A=1)');
  });

  it('should compile UV TextureCoordinate with UTiling and VTiling parameters', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-texcoord-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'TextureCoordinate (TexCoord)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'UV', type: 'vector2d' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionTextureCoordinate');
    expect(result.t3dText).toContain('UTiling=1');
    expect(result.t3dText).toContain('VTiling=1');
  });

  it('should compile Panner with Coordinate and Time inputs wiring', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'texcoord-src',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'TextureCoordinate (TexCoord)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'UV', type: 'vector2d' }],
        },
      },
      {
        id: 'panner-target',
        type: 'customNode',
        position: { x: 100, y: 0 },
        data: {
          title: 'Panner',
          nodeType: 'customNode',
          inputs: [
            { name: 'Coordinate', type: 'vector2d' },
            { name: 'Time', type: 'float' },
          ],
          outputs: [{ name: 'UV', type: 'vector2d' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge-coord',
        source: 'texcoord-src',
        sourceHandle: 'vector2d-uv',
        target: 'panner-target',
        targetHandle: 'vector2d-coordinate',
      },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.connectionCount).toBe(1);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionPanner Name="MaterialExpressionPanner_1"');
    expect(result.t3dText).toContain('Coordinate=(Expression=MaterialExpressionTextureCoordinate\'"MaterialExpressionTextureCoordinate_0"\')');
  });

  it('should compile elementary math node (Multiply) and link inputs A and B', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'color-a',
        type: 'customNode',
        position: { x: -300, y: 50 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3' }],
        },
      },
      {
        id: 'scalar-b',
        type: 'customNode',
        position: { x: -300, y: 200 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'mult-node',
        type: 'customNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Multiply',
          nodeType: 'customNode',
          inputs: [
            { name: 'A', type: 'vector3' },
            { name: 'B', type: 'float' },
          ],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-a',
        source: 'color-a',
        sourceHandle: 'vector3-rgb',
        target: 'mult-node',
        targetHandle: 'vector3-a',
      },
      {
        id: 'e-b',
        source: 'scalar-b',
        sourceHandle: 'float-out',
        target: 'mult-node',
        targetHandle: 'float-b',
      },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.nodeCount).toBe(3);
    expect(result.connectionCount).toBe(2);
    expect(result.t3dText).toContain('A=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('B=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
  });

  it('should compile LinearInterpolate (Lerp) node with A, B, and Alpha connections', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'const-a',
        type: 'customNode',
        position: { x: -200, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'const-b',
        type: 'customNode',
        position: { x: -200, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'fresnel-alpha',
        type: 'customNode',
        position: { x: -200, y: 200 },
        data: {
          title: 'Fresnel',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'lerp-node',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'LinearInterpolate (Lerp)',
          nodeType: 'customNode',
          inputs: [
            { name: 'A', type: 'float' },
            { name: 'B', type: 'float' },
            { name: 'Alpha', type: 'float' },
          ],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e-1', source: 'const-a', target: 'lerp-node', targetHandle: 'float-a' },
      { id: 'e-2', source: 'const-b', target: 'lerp-node', targetHandle: 'float-b' },
      { id: 'e-3', source: 'fresnel-alpha', target: 'lerp-node', targetHandle: 'float-alpha' },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionLinearInterpolate Name="MaterialExpressionLinearInterpolate_3"');
    expect(result.t3dText).toContain('A=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_0"\')');
    expect(result.t3dText).toContain('B=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    expect(result.t3dText).toContain('Alpha=(Expression=MaterialExpressionFresnel\'"MaterialExpressionFresnel_2"\')');
  });

  it('should compile Master Material Root node and assign BaseColor, Metallic, Roughness', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'base-color',
        type: 'customNode',
        position: { x: -250, y: 50 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3' }],
        },
      },
      {
        id: 'metallic-val',
        type: 'customNode',
        position: { x: -250, y: 150 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'material-root',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [
            { name: 'BaseColor', type: 'vector3' },
            { name: 'Metallic', type: 'float' },
            { name: 'Roughness', type: 'float' },
          ],
          outputs: [{ name: 'Material', type: 'materialattributes' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e-root-base',
        source: 'base-color',
        sourceHandle: 'vector3-rgb',
        target: 'material-root',
        targetHandle: 'vector3-basecolor',
      },
      {
        id: 'e-root-metallic',
        source: 'metallic-val',
        sourceHandle: 'float-out',
        target: 'material-root',
        targetHandle: 'float-metallic',
      },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.Material Name="M_CustomShader"');
    expect(result.t3dText).toContain('BaseColor=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('Metallic=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    // Roughness is unwired, so it should not have an expression assignment
    expect(result.t3dText).not.toContain('Roughness=(Expression=');
    expect(result.t3dText).toContain('End Object');
  });

  it('should fall back to MaterialExpressionConstant for unknown custom node titles', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'unknown-node-99',
        type: 'customNode',
        position: { x: 10, y: 20 },
        data: {
          title: 'NonExistentMathNodeXYZ',
          nodeType: 'customNode',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialGraphNode Name="MaterialGraphNode_0"');
    expect(result.t3dText).toContain('MaterialExpression=MaterialExpressionConstant\'"MaterialExpressionConstant_0"\'');
  });

  it('should support pin name fallback matching when targetHandle has simple name', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'src-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'mat-root-simple',
        type: 'customNode',
        position: { x: 200, y: 0 },
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
        id: 'e-simple',
        source: 'src-1',
        target: 'mat-root-simple',
        targetHandle: 'Roughness', // Direct name instead of type-name handle
      },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.t3dText).toContain('Roughness=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_0"\')');
  });

  it('should correctly omit root node from standalone MaterialGraphNode list', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'root-alone',
        type: 'customNode',
        position: { x: 50, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [],
          outputs: [],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    // Root node is emitted in M_CustomShader block, not as MaterialGraphNode_0
    expect(result.t3dText).not.toContain('Begin Object Class=/Script/Engine.MaterialGraphNode Name="MaterialGraphNode_0"');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.Material Name="M_CustomShader"');
  });

  it('should compile Tangent, Abs, and SquareRoot expressions to authentic UE5 classes', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-tan',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Tangent (Tan)',
          nodeType: 'customNode',
          inputs: [{ name: 'In', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'node-abs',
        type: 'customNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Abs',
          nodeType: 'customNode',
          inputs: [{ name: 'In', type: 'vector3' }],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
      {
        id: 'node-sqrt',
        type: 'customNode',
        position: { x: 0, y: 200 },
        data: {
          title: 'SquareRoot (Sqrt)',
          nodeType: 'customNode',
          inputs: [{ name: 'In', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionTangent');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionAbs');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionSquareRoot');
  });

  it('should compile VectorLength, Distance, and ReflectionVectorWS expressions', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-veclen',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'VectorLength',
          nodeType: 'customNode',
          inputs: [{ name: 'Vector', type: 'vector3' }],
          outputs: [{ name: 'Length', type: 'float' }],
        },
      },
      {
        id: 'node-dist',
        type: 'customNode',
        position: { x: 0, y: 100 },
        data: {
          title: 'Distance',
          nodeType: 'customNode',
          inputs: [{ name: 'A', type: 'vector3' }, { name: 'B', type: 'vector3' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'node-refl',
        type: 'customNode',
        position: { x: 0, y: 200 },
        data: {
          title: 'ReflectionVectorWS',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'vector3' }],
        },
      },
    ];

    const result = compileMaterialToT3D(nodes, []);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionVectorLength');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionDistance');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.MaterialExpressionReflectionVectorWS');
  });

  it('should compile full 8-pin Master Material assignments for BaseColor, Metallic, Specular, Roughness, EmissiveColor, Opacity, Normal, WorldPositionOffset', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'src-color',
        type: 'customNode',
        position: { x: -300, y: 0 },
        data: {
          title: 'Constant3Vector (RGB)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'RGB', type: 'vector3' }],
        },
      },
      {
        id: 'src-scalar',
        type: 'customNode',
        position: { x: -300, y: 100 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'customNode',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'mat-root',
        type: 'customNode',
        position: { x: 200, y: 50 },
        data: {
          title: 'Material Root',
          nodeType: 'customNode',
          inputs: [
            { name: 'BaseColor', type: 'vector3' },
            { name: 'Metallic', type: 'float' },
            { name: 'Specular', type: 'float' },
            { name: 'Roughness', type: 'float' },
            { name: 'EmissiveColor', type: 'vector3' },
            { name: 'Opacity', type: 'float' },
            { name: 'Normal', type: 'vector3' },
            { name: 'WorldPositionOffset', type: 'vector3' },
          ],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      { id: 'e-bc', source: 'src-color', target: 'mat-root', targetHandle: 'vector3-basecolor' },
      { id: 'e-met', source: 'src-scalar', target: 'mat-root', targetHandle: 'float-metallic' },
      { id: 'e-spec', source: 'src-scalar', target: 'mat-root', targetHandle: 'float-specular' },
      { id: 'e-rgh', source: 'src-scalar', target: 'mat-root', targetHandle: 'float-roughness' },
      { id: 'e-em', source: 'src-color', target: 'mat-root', targetHandle: 'vector3-emissivecolor' },
      { id: 'e-op', source: 'src-scalar', target: 'mat-root', targetHandle: 'float-opacity' },
      { id: 'e-norm', source: 'src-color', target: 'mat-root', targetHandle: 'vector3-normal' },
      { id: 'e-wpo', source: 'src-color', target: 'mat-root', targetHandle: 'vector3-worldpositionoffset' },
    ];

    const result = compileMaterialToT3D(nodes, edges);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Engine.Material Name="M_CustomShader"');
    expect(result.t3dText).toContain('BaseColor=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('Metallic=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    expect(result.t3dText).toContain('Specular=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    expect(result.t3dText).toContain('Roughness=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    expect(result.t3dText).toContain('EmissiveColor=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('Opacity=(Expression=MaterialExpressionConstant\'"MaterialExpressionConstant_1"\')');
    expect(result.t3dText).toContain('Normal=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('WorldPositionOffset=(Expression=MaterialExpressionConstant3Vector\'"MaterialExpressionConstant3Vector_0"\')');
    expect(result.t3dText).toContain('End Object');
  });
});

