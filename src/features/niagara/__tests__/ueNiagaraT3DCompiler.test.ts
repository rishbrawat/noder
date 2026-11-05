import { describe, it, expect } from 'vitest';
import { NiagaraEmitterConfig } from '../types/niagaraTypes';
import { compileNiagaraToT3D } from '../utils/ueNiagaraT3DCompiler';

describe('NiagaraVFX: UE5 Niagara Emitter T3D Compiler', () => {
  const baseConfig: NiagaraEmitterConfig = {
    emitterName: 'NE_MagicFountain',
    simTarget: 'GPUComputeSim',
    spawnRate: 250,
    burstInstantaneousCount: 100,
    lifetimeMin: 1.25,
    lifetimeMax: 3.5,
    initialVelocityConeAngle: 35,
    initialVelocityMagnitude: 600,
    gravityForceZ: -980,
    dragCoefficient: 0.75,
    curlNoiseStrength: 150,
    curlNoiseFrequency: 1.8,
    initialColor: [1.0, 0.75, 0.2, 1.0],
    endColor: [0.3, 0.1, 0.05, 0.0],
    spriteRendererFacing: 'FacingCamera',
    blendMode: 'Additive',
  };

  it('should compile valid NiagaraEmitter Begin and End Object blocks with designated emitter name', () => {
    const result = compileNiagaraToT3D(baseConfig);
    expect(result.emitterName).toBe('NE_MagicFountain');
    expect(result.moduleCount).toBe(8);
    expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraEmitter Name="NE_MagicFountain"');
    expect(result.t3dText).toContain('End Object');
  });

  it('should fallback to default emitter name NE_ParticleEmitter when emitterName is empty', () => {
    const result = compileNiagaraToT3D({ ...baseConfig, emitterName: '' });
    expect(result.emitterName).toBe('NE_ParticleEmitter');
    expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraEmitter Name="NE_ParticleEmitter"');
  });

  it('should correctly format ENiagaraSimTarget for GPUComputeSim and CPUSim', () => {
    const gpuResult = compileNiagaraToT3D({ ...baseConfig, simTarget: 'GPUComputeSim' });
    expect(gpuResult.t3dText).toContain('SimTarget=ENiagaraSimTarget::GPUComputeSim');

    const cpuResult = compileNiagaraToT3D({ ...baseConfig, simTarget: 'CPUSim' });
    expect(cpuResult.t3dText).toContain('SimTarget=ENiagaraSimTarget::CPUSim');
  });

  it('should serialize continuous SpawnRate in EmitterUpdateScript', () => {
    const result = compileNiagaraToT3D({ ...baseConfig, spawnRate: 500 });
    expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraScript Name="EmitterUpdateScript"');
    expect(result.t3dText).toContain('FunctionName="SpawnRate"');
    expect(result.t3dText).toContain('SpawnRate=500.000000');
  });

  it('should include SpawnBurstInstantaneous when burst count > 0', () => {
    const result = compileNiagaraToT3D({ ...baseConfig, burstInstantaneousCount: 300 });
    expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Burst"');
    expect(result.t3dText).toContain('FunctionName="SpawnBurstInstantaneous"');
    expect(result.t3dText).toContain('SpawnCount=300');
  });

  it('should omit SpawnBurstInstantaneous block when burst count is 0', () => {
    const result = compileNiagaraToT3D({ ...baseConfig, burstInstantaneousCount: 0 });
    expect(result.t3dText).not.toContain('NiagaraNodeFunctionCall_Burst');
    expect(result.t3dText).not.toContain('SpawnBurstInstantaneous');
  });

  it('should serialize particle initialization with formatted lifetimes and initial color vector', () => {
    const result = compileNiagaraToT3D({
      ...baseConfig,
      lifetimeMin: 0.8,
      lifetimeMax: 2.4,
      initialColor: [0.1, 0.9, 0.4, 0.85],
    });
    expect(result.t3dText).toContain('FunctionName="InitializeParticle"');
    expect(result.t3dText).toContain('LifetimeMin=0.80');
    expect(result.t3dText).toContain('LifetimeMax=2.40');
    expect(result.t3dText).toContain('Color=(R=0.10,G=0.90,B=0.40,A=0.85)');
  });

  it('should serialize velocity cone launch with magnitude and angle', () => {
    const result = compileNiagaraToT3D({
      ...baseConfig,
      initialVelocityMagnitude: 750,
      initialVelocityConeAngle: 45,
    });
    expect(result.t3dText).toContain('FunctionName="AddVelocityInCone"');
    expect(result.t3dText).toContain('VelocityStrength=750.000000');
    expect(result.t3dText).toContain('ConeAngle=45.000000');
  });

  it('should serialize physics forces including gravity, curl noise, and drag damping', () => {
    const result = compileNiagaraToT3D({
      ...baseConfig,
      gravityForceZ: -1200,
      curlNoiseStrength: 320,
      curlNoiseFrequency: 2.25,
      dragCoefficient: 0.65,
    });
    expect(result.t3dText).toContain('FunctionName="GravityForce"');
    expect(result.t3dText).toContain('Gravity=(X=0.000000,Y=0.000000,Z=-1200.000000)');
    expect(result.t3dText).toContain('FunctionName="CurlNoiseForce"');
    expect(result.t3dText).toContain('NoiseStrength=320.000000');
    expect(result.t3dText).toContain('NoiseFrequency=2.25');
    expect(result.t3dText).toContain('FunctionName="Drag"');
    expect(result.t3dText).toContain('Drag=0.65');
  });

  it('should serialize SpriteRendererProperties with facing mode and default material reference', () => {
    const result = compileNiagaraToT3D({
      ...baseConfig,
      spriteRendererFacing: 'VelocityAligned',
    });
    expect(result.t3dText).toContain('Begin Object Class=/Script/Niagara.NiagaraSpriteRendererProperties Name="NiagaraSpriteRendererProperties_0"');
    expect(result.t3dText).toContain('FacingMode=ENiagaraSpriteFacingMode::VelocityAligned');
    expect(result.t3dText).toContain('Alignment=ENiagaraSpriteAlignment::VelocityAligned');
    expect(result.t3dText).toContain('Material=Material\'"/Niagara/DefaultAssets/DefaultSpriteMaterial.DefaultSpriteMaterial"\'');
  });

  it('should serialize bDeterminism flag accurately based on config', () => {
    const trueDetResult = compileNiagaraToT3D({ ...baseConfig, determinism: true });
    expect(trueDetResult.t3dText).toContain('bDeterminism=True');

    const falseDetResult = compileNiagaraToT3D({ ...baseConfig, determinism: false });
    expect(falseDetResult.t3dText).toContain('bDeterminism=False');

    const defaultDetResult = compileNiagaraToT3D(baseConfig);
    expect(defaultDetResult.t3dText).toContain('bDeterminism=False');
  });

  it('should dynamically report moduleCount based on active modules', () => {
    const withBurst = compileNiagaraToT3D({ ...baseConfig, burstInstantaneousCount: 150 });
    expect(withBurst.moduleCount).toBe(8);

    const withoutBurst = compileNiagaraToT3D({ ...baseConfig, burstInstantaneousCount: 0 });
    expect(withoutBurst.moduleCount).toBe(7);
  });

  it('should strictly format T3D text using Windows CRLF line delimiters for UE5 clipboard compatibility', () => {
    const result = compileNiagaraToT3D(baseConfig);
    expect(result.t3dText).toContain('\r\n');
    const lines = result.t3dText.split('\r\n');
    expect(lines.length).toBeGreaterThan(15);
    expect(lines[0]).toBe('Begin Object Class=/Script/Niagara.NiagaraEmitter Name="NE_MagicFountain"');
    expect(lines[lines.length - 1]).toBe('End Object');
  });
});

