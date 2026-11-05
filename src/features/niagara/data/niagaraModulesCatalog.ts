import { NiagaraModuleDefinition, NiagaraEmitterConfig } from '../types/niagaraTypes';

export const NIAGARA_MODULES: NiagaraModuleDefinition[] = [
  // --- Stage 1: System Spawn ---
  {
    id: 'niagara_system_state',
    name: 'System State',
    stage: 'SystemSpawn',
    category: 'Spawn',
    description: 'Controls System life cycle, determinism, and loop duration.',
    color: '#3B82F6',
    ueClassName: 'NiagaraNodeFunctionCall_SystemState',
    inputs: [
      { name: 'LoopDuration', type: 'float', defaultValue: 2.0 },
      { name: 'Determinism', type: 'bool', defaultValue: false },
    ],
    defaultParameters: {
      loopDuration: 2.0,
      determinism: false,
    },
  },

  // --- Stage 2: Emitter Spawn ---
  {
    id: 'niagara_emitter_properties',
    name: 'Emitter Properties',
    stage: 'EmitterSpawn',
    category: 'Spawn',
    description: 'Defines simulation target (GPU/CPU) and looping behavior.',
    color: '#0284C7',
    ueClassName: 'NiagaraEmitterProperties',
    inputs: [],
    defaultParameters: {
      simTarget: 'GPUComputeSim',
      loopBehavior: 'Infinite',
      loopDuration: 2.0,
    },
  },


  // --- Emitter Update ---
  {
    id: 'niagara_spawn_rate',
    name: 'Spawn Rate',
    stage: 'EmitterUpdate',
    category: 'Spawn',
    description: 'Continuously spawns particles at a steady frequency per second.',
    color: '#0284C7',
    ueClassName: 'NiagaraNodeFunctionCall_SpawnRate',
    inputs: [{ name: 'SpawnRate', type: 'float', defaultValue: 150 }],
    defaultParameters: {
      spawnRate: 150,
    },
  },
  {
    id: 'niagara_spawn_burst_instantaneous',
    name: 'Spawn Burst Instantaneous',
    stage: 'EmitterUpdate',
    category: 'Spawn',
    description: 'Spawns an instantaneous burst explosion of particles.',
    color: '#0284C7',
    ueClassName: 'NiagaraNodeFunctionCall_SpawnBurstInstantaneous',
    inputs: [{ name: 'SpawnCount', type: 'int', defaultValue: 250 }],
    defaultParameters: {
      spawnCount: 250,
      spawnTime: 0.0,
    },
  },

  // --- Particle Spawn ---
  {
    id: 'niagara_initialize_particle',
    name: 'Initialize Particle',
    stage: 'ParticleSpawn',
    category: 'Spawn',
    description: 'Sets initial lifetime, initial color, and particle size.',
    color: '#16A34A',
    ueClassName: 'NiagaraNodeFunctionCall_InitializeParticle',
    inputs: [
      { name: 'LifetimeMin', type: 'float', defaultValue: 1.5 },
      { name: 'LifetimeMax', type: 'float', defaultValue: 3.0 },
      { name: 'InitialColor', type: 'vector4', defaultValue: [1.0, 0.7, 0.1, 1.0] },
      { name: 'SpriteSize', type: 'vector2d', defaultValue: [12.0, 12.0] },
    ],
    defaultParameters: {
      lifetimeMin: 1.5,
      lifetimeMax: 3.0,
      initialColor: [1.0, 0.7, 0.1, 1.0],
      spriteSize: [12.0, 12.0],
    },
  },
  {
    id: 'niagara_add_velocity_cone',
    name: 'Add Velocity in Cone',
    stage: 'ParticleSpawn',
    category: 'Forces',
    description: 'Launches particles outward along a cone directional distribution.',
    color: '#16A34A',
    ueClassName: 'NiagaraNodeFunctionCall_AddVelocityInCone',
    inputs: [
      { name: 'VelocityStrength', type: 'float', defaultValue: 500.0 },
      { name: 'ConeAngle', type: 'float', defaultValue: 45.0 },
      { name: 'ConeAxis', type: 'vector3', defaultValue: [0, 1, 0] },
    ],
    defaultParameters: {
      velocityStrength: 500.0,
      coneAngle: 45.0,
      coneAxis: [0, 1, 0],
    },
  },
  {
    id: 'niagara_sphere_location',
    name: 'Sphere Location',
    stage: 'ParticleSpawn',
    category: 'Spawn',
    description: 'Distributes particle spawn origin positions across or inside a sphere surface.',
    color: '#16A34A',
    ueClassName: 'NiagaraNodeFunctionCall_SphereLocation',
    inputs: [{ name: 'SphereRadius', type: 'float', defaultValue: 25.0 }],
    defaultParameters: {
      sphereRadius: 25.0,
      surfaceOnly: false,
    },
  },

  // --- Particle Update ---
  {
    id: 'niagara_gravity_force',
    name: 'Gravity Force',
    stage: 'ParticleUpdate',
    category: 'Forces',
    description: 'Applies constant world acceleration gravity (UE default -980 cm/s²).',
    color: '#D97706',
    ueClassName: 'NiagaraNodeFunctionCall_GravityForce',
    inputs: [{ name: 'Gravity', type: 'vector3', defaultValue: [0, -980.0, 0] }],
    defaultParameters: {
      gravity: [0, -980.0, 0],
    },
  },
  {
    id: 'niagara_curl_noise_force',
    name: 'Curl Noise Force',
    stage: 'ParticleUpdate',
    category: 'Forces',
    description: 'Applies divergence-free 3D turbulent curl noise for fluid vortex smoke.',
    color: '#D97706',
    ueClassName: 'NiagaraNodeFunctionCall_CurlNoiseForce',
    inputs: [
      { name: 'NoiseStrength', type: 'float', defaultValue: 250.0 },
      { name: 'NoiseFrequency', type: 'float', defaultValue: 1.5 },
    ],
    defaultParameters: {
      noiseStrength: 250.0,
      noiseFrequency: 1.5,
    },
  },
  {
    id: 'niagara_drag_damping',
    name: 'Drag',
    stage: 'ParticleUpdate',
    category: 'Forces',
    description: 'Applies aerodynamic drag resistance to smoothly decelerate fast particles.',
    color: '#D97706',
    ueClassName: 'NiagaraNodeFunctionCall_Drag',
    inputs: [{ name: 'DragCoefficient', type: 'float', defaultValue: 0.8 }],
    defaultParameters: {
      dragCoefficient: 0.8,
    },
  },
  {
    id: 'niagara_color_over_life',
    name: 'Color Over Life',
    stage: 'ParticleUpdate',
    category: 'Color & Size',
    description: 'Interpolates color and alpha based on normalized age (0.0 to 1.0).',
    color: '#D97706',
    ueClassName: 'NiagaraNodeFunctionCall_ColorOverLife',
    inputs: [
      { name: 'StartColor', type: 'vector4', defaultValue: [1.0, 0.8, 0.2, 1.0] },
      { name: 'EndColor', type: 'vector4', defaultValue: [0.2, 0.1, 0.05, 0.0] },
    ],
    defaultParameters: {
      startColor: [1.0, 0.8, 0.2, 1.0],
      endColor: [0.2, 0.1, 0.05, 0.0],
    },
  },
  {
    id: 'niagara_collision_query',
    name: 'Collision Query & Response',
    stage: 'ParticleUpdate',
    category: 'Collision',
    description: 'Bounces particles off collision geometry and floor planes.',
    color: '#D97706',
    ueClassName: 'NiagaraNodeFunctionCall_Collision',
    inputs: [{ name: 'Restitution', type: 'float', defaultValue: 0.65 }],
    defaultParameters: {
      restitution: 0.65,
      friction: 0.2,
    },
  },

  // --- Renderers ---
  {
    id: 'niagara_sprite_renderer',
    name: 'Sprite Renderer',
    stage: 'Renderers',
    category: 'Renderers',
    description: 'Renders particles as camera-facing textured billboards with additive or translucent blending.',
    color: '#9333EA',
    ueClassName: 'NiagaraSpriteRendererProperties',
    inputs: [],
    defaultParameters: {
      alignment: 'VelocityAligned',
      facingMode: 'FaceCamera',
      blendMode: 'Additive',
    },
  },
  {
    id: 'niagara_ribbon_renderer',
    name: 'Ribbon Renderer',
    stage: 'Renderers',
    category: 'Renderers',
    description: 'Connects particles into continuous smooth geometric trails / lightning ribbons.',
    color: '#9333EA',
    ueClassName: 'NiagaraRibbonRendererProperties',
    inputs: [],
    defaultParameters: {
      ribbonWidth: 8.0,
      tessellationFactor: 4,
    },
  },
];

export const DEFAULT_NIAGARA_CONFIG: NiagaraEmitterConfig = {
  emitterName: 'NE_ExplosionBurst',
  simTarget: 'GPUComputeSim',
  spawnRate: 200,
  burstInstantaneousCount: 300,
  lifetimeMin: 1.2,
  lifetimeMax: 2.8,
  initialVelocityConeAngle: 50,
  initialVelocityMagnitude: 600,
  gravityForceZ: -350,
  dragCoefficient: 0.65,
  curlNoiseStrength: 180,
  curlNoiseFrequency: 1.2,
  initialColor: [1.0, 0.8, 0.2, 1.0],
  endColor: [0.2, 0.05, 0.02, 0.0],
  spriteRendererFacing: 'FacingCamera',
  blendMode: 'Additive',
  loopDuration: 2.0,
  determinism: false,
  sphereRadius: 25.0,
  bounciness: 0.45,
};

