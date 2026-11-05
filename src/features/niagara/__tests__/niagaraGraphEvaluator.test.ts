import { describe, it, expect } from 'vitest';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../../types/BlueprintTypes';
import { evaluateNiagaraGraph } from '../utils/niagaraGraphEvaluator';

describe('NiagaraVFX: Graph Evaluator (ReactFlow Canvas to Physics Engine)', () => {
  it('should evaluate default connected Niagara graph with expected baseline configuration', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'niagara-spawn-1',
        type: 'customNode',
        position: { x: 100, y: 120 },
        data: {
          title: 'Emitter Update',
          subtitle: 'Spawn Rate: 200/s',
          nodeType: 'event',
          color: '#0284C7',
          inputs: [{ name: 'SpawnRate', type: 'float', value: 200 }],
          outputs: [{ name: 'Then', type: 'exec' }],
          description: 'Spawns particles continuously at 200/s.',
        },
      },
      {
        id: 'niagara-forces-1',
        type: 'customNode',
        position: { x: 420, y: 120 },
        data: {
          title: 'Particle Update (Forces)',
          subtitle: 'Gravity & Turbulence',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Gravity', type: 'float', value: -350 },
            { name: 'CurlNoise', type: 'float', value: 180 },
            { name: 'Drag', type: 'float', value: 0.65 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
          description: 'Forces.',
        },
      },
      {
        id: 'niagara-render-1',
        type: 'customNode',
        position: { x: 740, y: 120 },
        data: {
          title: 'Sprite Renderer',
          subtitle: 'Additive Blending',
          nodeType: 'function',
          color: '#9333EA',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'FacingMode', type: 'string', value: 'FacingCamera' },
            { name: 'BlendMode', type: 'string', value: 'Additive' },
          ],
          outputs: [],
          description: 'Renderer.',
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'edge_1_2',
        source: 'niagara-spawn-1',
        sourceHandle: 'exec-then',
        target: 'niagara-forces-1',
        targetHandle: 'exec-exec',
        type: 'blueprintEdge',
        data: { pinType: 'exec' },
      },
      {
        id: 'edge_2_3',
        source: 'niagara-forces-1',
        sourceHandle: 'exec-then',
        target: 'niagara-render-1',
        targetHandle: 'exec-exec',
        type: 'blueprintEdge',
        data: { pinType: 'exec' },
      },
    ];

    const config = evaluateNiagaraGraph(nodes, edges);
    expect(config.spawnRate).toBe(200);
    expect(config.gravityForceZ).toBe(-350);
    expect(config.curlNoiseStrength).toBe(180);
    expect(config.dragCoefficient).toBe(0.65);
    expect(config.spriteRendererFacing).toBe('FacingCamera');
    expect(config.blendMode).toBe('Additive');
  });

  it('should neutralize forces when the forces node is disconnected from the execution chain', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'niagara-spawn-1',
        type: 'customNode',
        position: { x: 100, y: 120 },
        data: {
          title: 'Emitter Update',
          subtitle: 'Spawn Rate: 200/s',
          nodeType: 'event',
          color: '#0284C7',
          inputs: [{ name: 'SpawnRate', type: 'float', value: 250 }],
          outputs: [{ name: 'Then', type: 'exec' }],
          description: '',
        },
      },
      {
        id: 'niagara-forces-1',
        type: 'customNode',
        position: { x: 420, y: 120 },
        data: {
          title: 'Particle Update (Forces)',
          subtitle: 'Gravity & Turbulence',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Gravity', type: 'float', value: -980 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
          description: '',
        },
      },
    ];

    // Severed: edge from spawn to forces is omitted
    const edges: Edge[] = [];

    const config = evaluateNiagaraGraph(nodes, edges);
    // When no exec edges exist in graph, all placed nodes evaluate directly:
    expect(config.gravityForceZ).toBe(-980);
    
    // Now with an exec edge to another node, forces node is clearly disconnected:
    const edgesWithSeveredForces: Edge[] = [
      {
        id: 'edge_other',
        source: 'niagara-spawn-1',
        sourceHandle: 'exec-then',
        target: 'other-node',
        targetHandle: 'exec-exec',
        data: { pinType: 'exec' },
      },
    ];
    const disconnectedConfig = evaluateNiagaraGraph(nodes, edgesWithSeveredForces);
    expect(disconnectedConfig.gravityForceZ).toBe(0);
    expect(disconnectedConfig.curlNoiseStrength).toBe(0);
  });

  it('should actively evaluate Point Attractor module with custom parameters', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'attractor-1',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'Point Attractor',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'AttractorStrength', type: 'float', value: 750 },
            { name: 'AttractorPosition', type: 'vector3', value: [1.5, 2.0, -0.5] },
            { name: 'AttractorRadius', type: 'float', value: 150 },
            { name: 'FalloffExponent', type: 'float', value: 3.0 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const config = evaluateNiagaraGraph(nodes, []);
    expect(config.pointAttractorEnabled).toBe(true);
    expect(config.pointAttractorStrength).toBe(750);
    expect(config.pointAttractorPosition).toEqual([1.5, 2.0, -0.5]);
    expect(config.pointAttractorRadius).toBe(150);
    expect(config.pointAttractorFalloff).toBe(3.0);
  });

  it('should actively evaluate Size Over Life module', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'size-1',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'Size Over Life',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'InitialSize', type: 'float', value: 24.0 },
            { name: 'EndSize', type: 'float', value: 4.0 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const config = evaluateNiagaraGraph(nodes, []);
    expect(config.sizeOverLifeEnabled).toBe(true);
    expect(config.initialSize).toBe(24.0);
    expect(config.endSize).toBe(4.0);
  });

  it('should actively evaluate Collision Plane module with restitution and friction', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'collision-1',
        type: 'customNode',
        position: { x: 300, y: 100 },
        data: {
          title: 'Collision Plane',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'PlaneHeight', type: 'float', value: -0.8 },
            { name: 'PlaneNormal', type: 'vector3', value: [0, 1, 0] },
            { name: 'Restitution', type: 'float', value: 0.75 },
            { name: 'Friction', type: 'float', value: 0.35 },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const config = evaluateNiagaraGraph(nodes, []);
    expect(config.collisionEnabled).toBe(true);
    expect(config.collisionPlaneHeight).toBe(-0.8);
    expect(config.collisionPlaneNormal).toEqual([0, 1, 0]);
    expect(config.bounciness).toBe(0.75);
    expect(config.collisionFriction).toBe(0.35);
  });

  it('should evaluate data wires from Constant and Math nodes connected to Niagara inputs', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'const-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'function',
          color: '#16A34A',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 300 }],
        },
      },
      {
        id: 'math-mult',
        type: 'customNode',
        position: { x: 150, y: 0 },
        data: {
          title: 'Multiply',
          nodeType: 'function',
          color: '#16A34A',
          inputs: [
            { name: 'A', type: 'float', value: 0 },
            { name: 'B', type: 'float', value: 2 },
          ],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'spawn-rate-1',
        type: 'customNode',
        position: { x: 350, y: 0 },
        data: {
          title: 'Spawn Rate',
          nodeType: 'function',
          color: '#0284C7',
          inputs: [{ name: 'SpawnRate', type: 'float', value: 50 }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e_const_to_mult',
        source: 'const-1',
        sourceHandle: 'float-out',
        target: 'math-mult',
        targetHandle: 'float-a',
      },
      {
        id: 'e_mult_to_spawn',
        source: 'math-mult',
        sourceHandle: 'float-out',
        target: 'spawn-rate-1',
        targetHandle: 'float-spawnrate',
      },
    ];

    const config = evaluateNiagaraGraph(nodes, edges);
    // 300 * 2 = 600
    expect(config.spawnRate).toBe(600);
  });

  it('should evaluate Make Vector and Vector + Vector nodes connected to Acceleration Force', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'make-vec-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Make Vector',
          nodeType: 'function',
          color: '#4C1D95',
          inputs: [
            { name: 'X', type: 'float', value: 100 },
            { name: 'Y', type: 'float', value: 50 },
            { name: 'Z', type: 'float', value: 25 },
          ],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      },
      {
        id: 'vec-add-1',
        type: 'customNode',
        position: { x: 200, y: 0 },
        data: {
          title: 'Vector + Vector',
          nodeType: 'function',
          color: '#4C1D95',
          inputs: [
            { name: 'A', type: 'vector', value: [0, 0, 0] },
            { name: 'B', type: 'vector', value: [50, 10, 5] },
          ],
          outputs: [{ name: 'Return Value', type: 'vector' }],
        },
      },
      {
        id: 'acc-force-1',
        type: 'customNode',
        position: { x: 400, y: 0 },
        data: {
          title: 'Acceleration Force',
          nodeType: 'function',
          color: '#D97706',
          inputs: [
            { name: 'Exec', type: 'exec' },
            { name: 'Acceleration', type: 'vector3', value: [0, 0, 0] },
          ],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e_make_to_add',
        source: 'make-vec-1',
        sourceHandle: 'vector-return-value',
        target: 'vec-add-1',
        targetHandle: 'vector-a',
      },
      {
        id: 'e_add_to_acc',
        source: 'vec-add-1',
        sourceHandle: 'vector-return-value',
        target: 'acc-force-1',
        targetHandle: 'vector3-acceleration',
      },
    ];

    const config = evaluateNiagaraGraph(nodes, edges);
    // [100 + 50, 50 + 10, 25 + 5] = [150, 60, 30]
    expect(config.linearForce).toEqual([150, 60, 30]);
  });

  it('should support Unreal Engine Reroute Knots between scalar sources and module pins', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'const-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Constant (Scalar)',
          nodeType: 'function',
          color: '#0284C7',
          inputs: [],
          outputs: [{ name: 'Out', type: 'float', defaultValue: 450 }],
        },
      },
      {
        id: 'reroute-1',
        type: 'customNode',
        position: { x: 150, y: 0 },
        data: {
          title: 'Reroute',
          nodeType: 'reroute',
          color: '#71717A',
          inputs: [{ name: 'In', type: 'float' }],
          outputs: [{ name: 'Out', type: 'float' }],
        },
      },
      {
        id: 'drag-node-1',
        type: 'customNode',
        position: { x: 300, y: 0 },
        data: {
          title: 'Drag',
          nodeType: 'function',
          color: '#D97706',
          inputs: [{ name: 'DragCoefficient', type: 'float', value: 0.1 }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e_const_reroute',
        source: 'const-1',
        sourceHandle: 'float-out',
        target: 'reroute-1',
        targetHandle: 'float-in',
      },
      {
        id: 'e_reroute_drag',
        source: 'reroute-1',
        sourceHandle: 'float-out',
        target: 'drag-node-1',
        targetHandle: 'float-dragcoefficient',
      },
    ];

    const config = evaluateNiagaraGraph(nodes, edges);
    expect(config.dragCoefficient).toBe(450);
  });

  it('should recognize Ribbon Renderer and keep visual color alpha active', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'spawn-1',
        type: 'customNode',
        position: { x: 0, y: 0 },
        data: {
          title: 'Emitter Update',
          nodeType: 'event',
          color: '#0284C7',
          inputs: [{ name: 'SpawnRate', type: 'float', value: 100 }],
          outputs: [{ name: 'Then', type: 'exec' }],
        },
      },
      {
        id: 'ribbon-1',
        type: 'customNode',
        position: { x: 250, y: 0 },
        data: {
          title: 'Ribbon Renderer',
          nodeType: 'function',
          color: '#9333EA',
          inputs: [{ name: 'Exec', type: 'exec' }],
          outputs: [],
        },
      },
    ];

    const edges: Edge[] = [
      {
        id: 'e_exec_ribbon',
        source: 'spawn-1',
        sourceHandle: 'exec-then',
        target: 'ribbon-1',
        targetHandle: 'exec-exec',
        data: { pinType: 'exec' },
      },
    ];

    const config = evaluateNiagaraGraph(nodes, edges);
    expect(config.initialColor[3]).toBeGreaterThan(0);
    expect(config.spawnRate).toBe(100);
  });
});
