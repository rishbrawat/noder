import { NiagaraEmitterConfig } from '../types/niagaraTypes';

export interface Particle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  lifetime: number;
  alive: boolean;
}

export class ParticleSimulationEngine {
  private particles: Particle[];
  private maxParticles: number;
  private config: NiagaraEmitterConfig;
  private positionsBuffer: Float32Array;
  private colorsBuffer: Float32Array;
  private activeCount: number = 0;
  private deadIndices: number[];

  constructor(config: NiagaraEmitterConfig, maxParticles: number = 10000) {
    this.config = config;
    this.maxParticles = maxParticles;
    this.particles = new Array(maxParticles);
    this.positionsBuffer = new Float32Array(maxParticles * 3);
    this.colorsBuffer = new Float32Array(maxParticles * 4);
    this.deadIndices = new Array(maxParticles);

    for (let i = 0; i < maxParticles; i++) {
      this.particles[i] = {
        x: 0,
        y: 0,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        age: 0,
        lifetime: 1,
        alive: false,
      };
      // Reverse index fill so pop() serves slots 0, 1, 2...
      this.deadIndices[i] = maxParticles - 1 - i;

      // Inactive particles placed offscreen
      this.positionsBuffer[i * 3] = 99999;
      this.positionsBuffer[i * 3 + 1] = 99999;
      this.positionsBuffer[i * 3 + 2] = 99999;
      this.colorsBuffer[i * 4 + 3] = 0;
    }

    // Trigger initial burst
    this.burst(this.config.burstInstantaneousCount);
  }

  public updateConfig(newConfig: Partial<NiagaraEmitterConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  public burst(count: number) {
    const toSpawn = Math.min(count, this.maxParticles);
    for (let i = 0; i < toSpawn; i++) {
      this.spawnParticle();
    }
  }

  public reset() {
    this.deadIndices = new Array(this.maxParticles);
    for (let i = 0; i < this.maxParticles; i++) {
      this.particles[i].alive = false;
      this.particles[i].age = 0;
      this.deadIndices[i] = this.maxParticles - 1 - i;
      this.positionsBuffer[i * 3] = 99999;
      this.positionsBuffer[i * 3 + 1] = 99999;
      this.positionsBuffer[i * 3 + 2] = 99999;
      this.colorsBuffer[i * 4 + 3] = 0;
    }
    this.activeCount = 0;
    this.burst(this.config.burstInstantaneousCount);
  }

  private spawnParticle(): boolean {
    // O(1) dead particle slot recycling via free-list stack
    if (this.deadIndices.length === 0) return false;
    const index = this.deadIndices.pop()!;
    const p = this.particles[index];

    p.alive = true;
    p.age = 0;
    p.lifetime =
      this.config.lifetimeMin +
      Math.random() * Math.max(0, this.config.lifetimeMax - this.config.lifetimeMin);

    // Initial position inside a sphere origin
    const theta = Math.random() * 2 * Math.PI;
    const phi = Math.acos(2 * Math.random() - 1);
    const radiusMeters = ((this.config.sphereRadius ?? 25.0) / 100) * 0.6;
    const r = Math.random() * radiusMeters;

    p.x = r * Math.sin(phi) * Math.cos(theta);
    p.y = 0.05 + r * Math.sin(phi) * Math.sin(theta);
    p.z = r * Math.cos(phi);

    // Initial velocity in cone pointing upwards (+Y)
    const angleRad = (this.config.initialVelocityConeAngle * Math.PI) / 180;
    const coneTheta = Math.random() * 2 * Math.PI;
    const conePhi = Math.random() * angleRad;
    const speed = (this.config.initialVelocityMagnitude / 100) * (0.7 + Math.random() * 0.6);

    p.vx = speed * Math.sin(conePhi) * Math.cos(coneTheta);
    p.vy = speed * Math.cos(conePhi);
    p.vz = speed * Math.sin(conePhi) * Math.sin(coneTheta);

    return true;
  }

  public step(dt: number) {
    // Sub-step clamping dt <= 0.05s to prevent simulation tunneling
    const clampedDt = Math.min(dt, 0.05);

    // Continuous spawn based on spawn rate
    const spawnPerFrame = this.config.spawnRate * clampedDt;
    const wholeSpawns = Math.floor(spawnPerFrame);
    const fractional = spawnPerFrame - wholeSpawns;

    for (let i = 0; i < wholeSpawns; i++) {
      this.spawnParticle();
    }
    if (Math.random() < fractional) {
      this.spawnParticle();
    }

    const gravityAcc = (this.config.gravityForceZ / 100) * clampedDt;
    const dragFactor = Math.max(0, 1.0 - this.config.dragCoefficient * clampedDt);
    const noiseStrength = (this.config.curlNoiseStrength / 100) * clampedDt;
    const freq = this.config.curlNoiseFrequency;
    const restitution = this.config.bounciness ?? 0.45;

    let livingCount = 0;

    for (let i = 0; i < this.maxParticles; i++) {
      const p = this.particles[i];
      if (!p.alive) {
        // Guarantee inactive slot coordinates stay offscreen
        this.positionsBuffer[i * 3] = 99999;
        this.positionsBuffer[i * 3 + 1] = 99999;
        this.positionsBuffer[i * 3 + 2] = 99999;
        this.colorsBuffer[i * 4 + 3] = 0;
        continue;
      }

      p.age += clampedDt;
      if (p.age >= p.lifetime) {
        p.alive = false;
        this.deadIndices.push(i);
        this.positionsBuffer[i * 3] = 99999;
        this.positionsBuffer[i * 3 + 1] = 99999;
        this.positionsBuffer[i * 3 + 2] = 99999;
        this.colorsBuffer[i * 4 + 3] = 0;
        continue;
      }

      livingCount++;
      const normAge = p.age / p.lifetime;

      // 1. Apply Gravity
      p.vy += gravityAcc;

      // 2. Apply 3D Curl Turbulence
      const nx = Math.sin(p.y * freq + p.age * 2) * noiseStrength;
      const ny = Math.cos(p.z * freq + p.age * 2) * noiseStrength * 0.5;
      const nz = Math.sin(p.x * freq + p.age * 2) * noiseStrength;

      // 3. Aerodynamic Drag Damping
      p.vx = (p.vx + nx) * dragFactor;
      p.vy = (p.vy + ny) * dragFactor;
      p.vz = (p.vz + nz) * dragFactor;

      // 4. Semi-implicit Euler Position Integration
      p.x += p.vx * clampedDt;
      p.y += p.vy * clampedDt;
      p.z += p.vz * clampedDt;

      // 5. Floor Plane Collision & Reflection at y = -1.2
      if (p.y < -1.2) {
        p.y = -1.2;
        p.vy = -p.vy * restitution;
        p.vx *= 0.8; // friction
        p.vz *= 0.8;
      }

      // 6. Write to WebGL Positions Buffer
      this.positionsBuffer[i * 3] = p.x;
      this.positionsBuffer[i * 3 + 1] = p.y;
      this.positionsBuffer[i * 3 + 2] = p.z;

      // 7. Color Over Life Ramp Interpolation
      const c0 = this.config.initialColor;
      const c1 = this.config.endColor;
      const r = c0[0] * (1 - normAge) + c1[0] * normAge;
      const g = c0[1] * (1 - normAge) + c1[1] * normAge;
      const b = c0[2] * (1 - normAge) + c1[2] * normAge;
      const a = (c0[3] * (1 - normAge) + c1[3] * normAge) * (1 - normAge);

      this.colorsBuffer[i * 4] = r;
      this.colorsBuffer[i * 4 + 1] = g;
      this.colorsBuffer[i * 4 + 2] = b;
      this.colorsBuffer[i * 4 + 3] = Math.max(0, a);
    }

    this.activeCount = livingCount;
  }

  public getBuffers() {
    return {
      positions: this.positionsBuffer,
      colors: this.colorsBuffer,
      activeCount: this.activeCount,
      maxParticles: this.maxParticles,
    };
  }

  public getAvailableDeadCount(): number {
    return this.deadIndices.length;
  }
}
