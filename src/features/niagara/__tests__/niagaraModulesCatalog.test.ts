import { describe, it, expect } from 'vitest';
import { NIAGARA_MODULES as DATA_MODULES, DEFAULT_NIAGARA_CONFIG } from '../data/niagaraModulesCatalog';
import { NIAGARA_MODULES as UTILS_MODULES } from '../utils/niagaraModulesCatalog';
import { NiagaraStage } from '../types/niagaraTypes';

describe('NiagaraVFX: Modules Catalog & Stage Pipeline', () => {
  const expectedStages: NiagaraStage[] = [
    'SystemSpawn',
    'EmitterSpawn',
    'EmitterUpdate',
    'ParticleSpawn',
    'ParticleUpdate',
    'Renderers',
  ];

  it('should cover all 6 sequential stages in the Niagara pipeline', () => {
    const presentStages = new Set(DATA_MODULES.map((m) => m.stage));
    for (const stage of expectedStages) {
      expect(presentStages.has(stage)).toBe(true);
    }
  });

  it('should maintain exact catalog parity between data/ and utils/ exports', () => {
    expect(UTILS_MODULES).toEqual(DATA_MODULES);
    expect(UTILS_MODULES.length).toBeGreaterThanOrEqual(11);
  });

  it('should guarantee unique module identifiers across all stages', () => {
    const ids = DATA_MODULES.map((m) => m.id);
    const uniqueIds = new Set(ids);
    expect(ids.length).toBe(uniqueIds.size);
  });

  it('should include System State in Stage 1 System Spawn', () => {
    const systemSpawnModules = DATA_MODULES.filter((m) => m.stage === 'SystemSpawn');
    expect(systemSpawnModules.length).toBeGreaterThanOrEqual(1);
    const stateMod = systemSpawnModules.find((m) => m.id === 'niagara_system_state');
    expect(stateMod).toBeDefined();
    expect(stateMod?.ueClassName).toBe('NiagaraNodeFunctionCall_SystemState');
    expect(stateMod?.defaultParameters.loopDuration).toBe(2.0);
    expect(stateMod?.defaultParameters.determinism).toBe(false);
  });

  it('should include Emitter Properties in Stage 2 Emitter Spawn', () => {
    const emitterSpawnModules = DATA_MODULES.filter((m) => m.stage === 'EmitterSpawn');
    const emitterProps = emitterSpawnModules.find((m) => m.id === 'niagara_emitter_properties');
    expect(emitterProps).toBeDefined();
    expect(emitterProps?.ueClassName).toBe('NiagaraEmitterProperties');
    expect(emitterProps?.defaultParameters.simTarget).toBe('GPUComputeSim');
  });

  it('should include Spawn Rate and Instantaneous Burst in Stage 3 Emitter Update', () => {
    const updateModules = DATA_MODULES.filter((m) => m.stage === 'EmitterUpdate');
    const spawnRate = updateModules.find((m) => m.id === 'niagara_spawn_rate');
    const burst = updateModules.find((m) => m.id === 'niagara_spawn_burst_instantaneous');
    expect(spawnRate).toBeDefined();
    expect(burst).toBeDefined();
  });

  it('should include Particle Init, Velocity Cone, and Sphere Location in Stage 4 Particle Spawn', () => {
    const spawnModules = DATA_MODULES.filter((m) => m.stage === 'ParticleSpawn');
    const init = spawnModules.find((m) => m.id === 'niagara_initialize_particle');
    const cone = spawnModules.find((m) => m.id === 'niagara_add_velocity_cone');
    const sphere = spawnModules.find((m) => m.id === 'niagara_sphere_location');
    expect(init).toBeDefined();
    expect(cone).toBeDefined();
    expect(sphere).toBeDefined();
  });

  it('should include Gravity, Curl Noise, Drag, Color Ramp, and Collision in Stage 5 Particle Update', () => {
    const updateModules = DATA_MODULES.filter((m) => m.stage === 'ParticleUpdate');
    const gravity = updateModules.find((m) => m.id === 'niagara_gravity_force');
    const curl = updateModules.find((m) => m.id === 'niagara_curl_noise_force');
    const drag = updateModules.find((m) => m.id === 'niagara_drag_damping');
    const color = updateModules.find((m) => m.id === 'niagara_color_over_life');
    const collision = updateModules.find((m) => m.id === 'niagara_collision_query');
    expect(gravity).toBeDefined();
    expect(curl).toBeDefined();
    expect(drag).toBeDefined();
    expect(color).toBeDefined();
    expect(collision).toBeDefined();
  });

  it('should include Sprite and Ribbon Renderers in Stage 6 Renderers', () => {
    const rendererModules = DATA_MODULES.filter((m) => m.stage === 'Renderers');
    const sprite = rendererModules.find((m) => m.id === 'niagara_sprite_renderer');
    const ribbon = rendererModules.find((m) => m.id === 'niagara_ribbon_renderer');
    expect(sprite).toBeDefined();
    expect(ribbon).toBeDefined();
  });

  it('should define complete DEFAULT_NIAGARA_CONFIG satisfying all simulation parameters', () => {
    expect(DEFAULT_NIAGARA_CONFIG.emitterName).toBe('NE_ExplosionBurst');
    expect(DEFAULT_NIAGARA_CONFIG.simTarget).toBe('GPUComputeSim');
    expect(DEFAULT_NIAGARA_CONFIG.spawnRate).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.burstInstantaneousCount).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.lifetimeMin).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.lifetimeMax).toBeGreaterThanOrEqual(DEFAULT_NIAGARA_CONFIG.lifetimeMin);
    expect(DEFAULT_NIAGARA_CONFIG.initialVelocityMagnitude).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.gravityForceZ).toBeLessThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.dragCoefficient).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.curlNoiseStrength).toBeGreaterThan(0);
    expect(DEFAULT_NIAGARA_CONFIG.initialColor.length).toBe(4);
    expect(DEFAULT_NIAGARA_CONFIG.endColor.length).toBe(4);
    expect(DEFAULT_NIAGARA_CONFIG.loopDuration).toBeDefined();
    expect(DEFAULT_NIAGARA_CONFIG.determinism).toBeDefined();
    expect(DEFAULT_NIAGARA_CONFIG.sphereRadius).toBeDefined();
    expect(DEFAULT_NIAGARA_CONFIG.bounciness).toBeDefined();
  });
});
