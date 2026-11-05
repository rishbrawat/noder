import { describe, it, expect } from 'vitest';
import { NiagaraEmitterConfig } from '../types/niagaraTypes';
import { ParticleSimulationEngine } from '../utils/particleSimulationEngine';

describe('NiagaraVFX: Particle Simulation Engine', () => {
  const testConfig: NiagaraEmitterConfig = {
    emitterName: 'NE_TestEmitter',
    simTarget: 'GPUComputeSim',
    spawnRate: 100,
    burstInstantaneousCount: 50,
    lifetimeMin: 1.0,
    lifetimeMax: 2.0,
    initialVelocityConeAngle: 30,
    initialVelocityMagnitude: 400,
    gravityForceZ: -980,
    dragCoefficient: 0.5,
    curlNoiseStrength: 100,
    curlNoiseFrequency: 1.5,
    initialColor: [1.0, 0.5, 0.1, 1.0],
    endColor: [0.1, 0.05, 0.0, 0.0],
    spriteRendererFacing: 'FacingCamera',
    blendMode: 'Additive',
  };

  it('should initialize Float32Array buffers with correct dimensions', () => {
    const maxParticles = 1000;
    const engine = new ParticleSimulationEngine(testConfig, maxParticles);
    const buffers = engine.getBuffers();

    expect(buffers.maxParticles).toBe(maxParticles);
    expect(buffers.positions.length).toBe(maxParticles * 3);
    expect(buffers.colors.length).toBe(maxParticles * 4);
    expect(buffers.activeCount).toBe(0); // initial burst occurs, but activeCount is updated on step()
  });

  it('should activate particles on initial burst step', () => {
    const engine = new ParticleSimulationEngine(testConfig, 500);
    engine.step(0.016); // 1 frame at 60fps
    const buffers = engine.getBuffers();

    expect(buffers.activeCount).toBeGreaterThanOrEqual(50);
  });

  it('should respect zero burst count when configured with burstInstantaneousCount = 0', () => {
    const zeroBurstConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 0,
    };
    const engine = new ParticleSimulationEngine(zeroBurstConfig, 500);
    engine.step(0.016);
    const buffers = engine.getBuffers();

    expect(buffers.activeCount).toBe(0);
  });

  it('should update emitter configuration dynamically via updateConfig', () => {
    const engine = new ParticleSimulationEngine(testConfig, 500);
    engine.updateConfig({ spawnRate: 0 });
    engine.reset();
    engine.step(0.016);
    const buffers = engine.getBuffers();

    // With spawnRate 0 and initial burst 50, exactly 50 particles should be active
    expect(buffers.activeCount).toBe(50);
  });

  it('should reset particle pool and re-trigger burst upon reset()', () => {
    const engine = new ParticleSimulationEngine(testConfig, 500);
    engine.step(0.05);
    expect(engine.getBuffers().activeCount).toBeGreaterThan(0);

    engine.reset();
    engine.step(0.016);
    expect(engine.getBuffers().activeCount).toBeGreaterThanOrEqual(50);
  });

  it('should continuously spawn particles over time steps when spawnRate > 0', () => {
    const continuousConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 200,
      burstInstantaneousCount: 0,
    };
    const engine = new ParticleSimulationEngine(continuousConfig, 1000);
    
    // Step forward multiple frames
    for (let i = 0; i < 10; i++) {
      engine.step(0.016);
    }
    const buffers = engine.getBuffers();
    expect(buffers.activeCount).toBeGreaterThan(0);
  });

  it('should clamp delta time to maximum 0.05s to prevent simulation tunneling', () => {
    const engine = new ParticleSimulationEngine(testConfig, 500);
    // Huge delta time step (e.g. 5.0 seconds due to tab backgrounding)
    expect(() => engine.step(5.0)).not.toThrow();
    const buffers = engine.getBuffers();
    expect(buffers.activeCount).toBeLessThanOrEqual(500);
  });

  it('should retire dead particles and move them offscreen to (99999, 99999, 99999) with zero alpha', () => {
    const shortLifeConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 10,
      lifetimeMin: 0.1,
      lifetimeMax: 0.1,
    };
    const engine = new ParticleSimulationEngine(shortLifeConfig, 50);
    engine.step(0.016);
    expect(engine.getBuffers().activeCount).toBe(10);

    // Advance time past lifetime (0.1s)
    for (let i = 0; i < 10; i++) {
      engine.step(0.02);
    }

    const buffers = engine.getBuffers();
    expect(buffers.activeCount).toBe(0);

    // Inactive particles placed at (99999, 99999, 99999)
    expect(buffers.positions[0]).toBe(99999);
    expect(buffers.positions[1]).toBe(99999);
    expect(buffers.positions[2]).toBe(99999);
    expect(buffers.colors[3]).toBe(0); // alpha zero
  });

  it('should accelerate particles downwards under negative gravityForceZ', () => {
    const gravityConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0, // No initial velocity
      gravityForceZ: -2000,
      curlNoiseStrength: 0,
      dragCoefficient: 0,
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(gravityConfig, 10);
    engine.step(0.016);
    const initialY = engine.getBuffers().positions[1];

    engine.step(0.04);
    const nextY = engine.getBuffers().positions[1];
    expect(nextY).toBeLessThan(initialY);
  });

  it('should dampen particle velocities through aerodynamic drag', () => {
    const highDragConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 500,
      gravityForceZ: 0,
      curlNoiseStrength: 0,
      dragCoefficient: 20.0, // High drag damping
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(highDragConfig, 10);
    // Run several steps to allow drag to dampen velocity
    for (let i = 0; i < 20; i++) {
      engine.step(0.02);
    }
    const pos1 = engine.getBuffers().positions[0];
    engine.step(0.02);
    const pos2 = engine.getBuffers().positions[0];
    
    // Position delta should be very small due to strong damping
    expect(Math.abs(pos2 - pos1)).toBeLessThan(0.1);
  });

  it('should reflect vertical velocity on ground collision at y = -1.2', () => {
    const floorBounceConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0,
      gravityForceZ: -5000, // Heavy downward gravity
      curlNoiseStrength: 0,
      dragCoefficient: 0,
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(floorBounceConfig, 10);
    
    // Run until floor collision occurs
    for (let i = 0; i < 30; i++) {
      engine.step(0.03);
    }
    const yPos = engine.getBuffers().positions[1];
    expect(yPos).toBeCloseTo(-1.2, 2);
  });

  it('should interpolate particle colors and fade alpha towards zero over lifetime', () => {
    const colorFadeConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialColor: [1.0, 0.0, 0.0, 1.0],
      endColor: [0.0, 0.0, 1.0, 0.0],
      lifetimeMin: 1.0,
      lifetimeMax: 1.0,
    };
    const engine = new ParticleSimulationEngine(colorFadeConfig, 10);
    engine.step(0.016); // early in life: normalized age ~ 0.016
    const earlyAlpha = engine.getBuffers().colors[3];
    expect(earlyAlpha).toBeGreaterThan(0.9);

    // Step to midway through life (~0.5s)
    for (let i = 0; i < 15; i++) {
      engine.step(0.03);
    }
    const midAlpha = engine.getBuffers().colors[3];
    expect(midAlpha).toBeLessThan(earlyAlpha);
  });

  it('should cap active particles strictly at maxParticles without buffer overflow', () => {
    const maxParticles = 50;
    const overflowConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 10000,
      burstInstantaneousCount: 200,
    };
    const engine = new ParticleSimulationEngine(overflowConfig, maxParticles);
    
    for (let i = 0; i < 10; i++) {
      engine.step(0.05);
    }
    const buffers = engine.getBuffers();
    expect(buffers.activeCount).toBeLessThanOrEqual(maxParticles);
  });

  it('should recycle dead particles with O(1) free-list stack without memory fragmentation', () => {
    const poolSize = 20;
    const recyclingConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 10,
      lifetimeMin: 0.05,
      lifetimeMax: 0.05,
    };
    const engine = new ParticleSimulationEngine(recyclingConfig, poolSize);
    expect(engine.getAvailableDeadCount()).toBe(10); // 10 spawned out of 20

    // Step past lifetime (0.05s) to retire particles (clamped at 0.05 max dt)
    for (let i = 0; i < 3; i++) {
      engine.step(0.03);
    }
    expect(engine.getBuffers().activeCount).toBe(0);
    expect(engine.getAvailableDeadCount()).toBe(20); // all returned to pool

    // Re-burst to verify slots are immediately reused
    engine.burst(15);
    expect(engine.getAvailableDeadCount()).toBe(5);
    engine.step(0.01);
    expect(engine.getBuffers().activeCount).toBe(15);
  });

  it('should simulate 10,000 particles at 60 FPS within high performance budget', () => {
    const maxParticles = 10000;
    const highLoadConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 5000,
      burstInstantaneousCount: 10000,
      lifetimeMin: 2.0,
      lifetimeMax: 3.0,
    };
    const engine = new ParticleSimulationEngine(highLoadConfig, maxParticles);
    
    // Simulate 30 frames (0.5s of real-time 60fps execution)
    const startTime = performance.now();
    for (let frame = 0; frame < 30; frame++) {
      engine.step(0.016);
    }
    const duration = performance.now() - startTime;

    const buffers = engine.getBuffers();
    expect(buffers.activeCount).toBe(10000);
    // 30 frames of 10,000 particles should comfortably execute well under 500ms in JavaScript
    expect(duration).toBeLessThan(500);
  });

  it('should constrain initial particle spawn positions within configured sphereRadius', () => {
    const smallSphereConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 100,
      sphereRadius: 10.0, // small radius (10cm = 0.06m in sim coordinates)
    };
    const engine = new ParticleSimulationEngine(smallSphereConfig, 100);
    engine.step(0.001); // minimal step to observe initial positions

    const buffers = engine.getBuffers();
    const maxAllowedDist = 0.15; // with buffer
    for (let i = 0; i < 100; i++) {
      const x = buffers.positions[i * 3];
      const y = buffers.positions[i * 3 + 1];
      const z = buffers.positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + (y - 0.05) * (y - 0.05) + z * z);
      expect(dist).toBeLessThanOrEqual(maxAllowedDist);
    }
  });

  it('should apply configurable floor bounce restitution coefficient', () => {
    const highBounceConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0,
      gravityForceZ: -8000,
      bounciness: 0.85, // high restitution
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(highBounceConfig, 10);
    
    // Step until collision occurs
    for (let i = 0; i < 20; i++) {
      engine.step(0.03);
    }
    // Floor is clamped at -1.2, position should be at or rebounding above -1.2
    const yPos = engine.getBuffers().positions[1];
    expect(yPos).toBeGreaterThanOrEqual(-1.2);
  });

  it('should accelerate particles towards Point Attractor position with radial pull', () => {
    const attractorConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0,
      gravityForceZ: 0,
      curlNoiseStrength: 0,
      dragCoefficient: 0,
      sphereRadius: 0,
      lifetimeMin: 5,
      lifetimeMax: 5,
      pointAttractorEnabled: true,
      pointAttractorStrength: 2000,
      pointAttractorPosition: [2.0, 1.0, 0.0],
      pointAttractorRadius: 100,
      pointAttractorFalloff: 1.0,
    };
    const engine = new ParticleSimulationEngine(attractorConfig, 10);
    engine.step(0.02); // Initial step to spawn particle near (0, 0.05, 0)
    const initX = engine.getBuffers().positions[0];

    // Step forward several frames
    for (let i = 0; i < 15; i++) {
      engine.step(0.02);
    }
    const currentX = engine.getBuffers().positions[0];
    // Particle should have moved towards attractor at X = 2.0
    expect(currentX).toBeGreaterThan(initX);
  });

  it('should interpolate particle size from initialSize to endSize in sizesBuffer', () => {
    const sizeConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialSize: 20.0,
      endSize: 2.0,
      sizeOverLifeEnabled: true,
      lifetimeMin: 1.0,
      lifetimeMax: 1.0,
    };
    const engine = new ParticleSimulationEngine(sizeConfig, 10);
    engine.step(0.02);
    const buffers = engine.getBuffers();
    expect(buffers.sizes).toBeDefined();
    expect(buffers.sizes.length).toBe(10);
    // Early life: size should be close to 20
    const earlySize = buffers.sizes[0];
    expect(earlySize).toBeGreaterThan(15.0);

    // Step past half lifetime (~0.5s)
    for (let i = 0; i < 15; i++) {
      engine.step(0.03);
    }
    const midSize = engine.getBuffers().sizes[0];
    expect(midSize).toBeLessThan(earlySize);
  });

  it('should apply linear force (ambient wind) along configured vector', () => {
    const windConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0,
      gravityForceZ: 0,
      curlNoiseStrength: 0,
      dragCoefficient: 0,
      sphereRadius: 0,
      linearForce: [500, 0, 0], // wind along +X
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(windConfig, 10);
    engine.step(0.01);
    const startX = engine.getBuffers().positions[0];

    for (let i = 0; i < 10; i++) {
      engine.step(0.02);
    }
    const finalX = engine.getBuffers().positions[0];
    expect(finalX).toBeGreaterThan(startX);
  });

  it('should preserve constant initialSize when sizeOverLifeEnabled is false', () => {
    const fixedSizeConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialSize: 15.0,
      endSize: 2.0,
      sizeOverLifeEnabled: false,
      lifetimeMin: 1.0,
      lifetimeMax: 1.0,
    };
    const engine = new ParticleSimulationEngine(fixedSizeConfig, 10);
    engine.step(0.02);
    expect(engine.getBuffers().sizes[0]).toBe(15.0);

    for (let i = 0; i < 20; i++) {
      engine.step(0.03);
    }
    expect(engine.getBuffers().sizes[0]).toBe(15.0);
  });

  it('should gracefully handle non-positive dt values without advancing time', () => {
    const engine = new ParticleSimulationEngine(testConfig, 10);
    expect(() => engine.step(0)).not.toThrow();
    expect(() => engine.step(-0.5)).not.toThrow();
  });

  it('should normalize arbitrary non-unit collision plane normals during reflection', () => {
    const unnormalizedPlaneConfig: NiagaraEmitterConfig = {
      ...testConfig,
      spawnRate: 0,
      burstInstantaneousCount: 1,
      initialVelocityMagnitude: 0,
      gravityForceZ: -500,
      collisionEnabled: true,
      collisionPlaneNormal: [0, 5.0, 0], // non-unit normal along +Y
      collisionPlaneHeight: 0.0,
      bounciness: 0.5,
      lifetimeMin: 5,
      lifetimeMax: 5,
    };
    const engine = new ParticleSimulationEngine(unnormalizedPlaneConfig, 10);
    // Step forward until particle hits the floor plane at Y = 0.0
    for (let i = 0; i < 15; i++) {
      engine.step(0.03);
    }
    const yPos = engine.getBuffers().positions[1];
    expect(yPos).toBeGreaterThanOrEqual(0.0);
  });
});
