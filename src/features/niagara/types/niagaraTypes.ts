export type NiagaraStage = 
  | 'SystemSpawn'
  | 'EmitterSpawn'
  | 'EmitterUpdate'
  | 'ParticleSpawn'
  | 'ParticleUpdate'
  | 'Renderers';

export interface NiagaraModuleDefinition {
  id: string;
  name: string;
  stage: NiagaraStage;
  category: 'Spawn' | 'Update' | 'Forces' | 'Color & Size' | 'Renderers' | 'Collision';
  description: string;
  color: string;
  ueClassName: string;
  inputs: Array<{ name: string; type: string; defaultValue?: any }>;
  outputs?: Array<{ name: string; type: string }>;
  defaultParameters: Record<string, any>;
}

export interface NiagaraEmitterConfig {
  emitterName: string;
  simTarget: 'CPUSim' | 'GPUComputeSim';
  spawnRate: number;
  burstInstantaneousCount: number;
  lifetimeMin: number;
  lifetimeMax: number;
  initialVelocityConeAngle: number;
  initialVelocityMagnitude: number;
  gravityForceZ: number;
  dragCoefficient: number;
  curlNoiseStrength: number;
  curlNoiseFrequency: number;
  initialColor: [number, number, number, number];
  endColor: [number, number, number, number];
  spriteRendererFacing: 'FacingCamera' | 'VelocityAligned';
  blendMode: 'Additive' | 'Translucent' | 'Opaque';
  loopDuration?: number;
  determinism?: boolean;
  sphereRadius?: number;
  bounciness?: number;
  // Size Over Life
  initialSize?: number;
  endSize?: number;
  sizeOverLifeEnabled?: boolean;
  // Point Attractor
  pointAttractorEnabled?: boolean;
  pointAttractorStrength?: number;
  pointAttractorPosition?: [number, number, number];
  pointAttractorRadius?: number;
  pointAttractorFalloff?: number;
  // Collision Plane
  collisionEnabled?: boolean;
  collisionPlaneHeight?: number;
  collisionPlaneNormal?: [number, number, number];
  collisionFriction?: number;
  // Linear / Wind Force
  linearForce?: [number, number, number];
}

