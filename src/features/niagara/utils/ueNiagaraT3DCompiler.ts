import { NiagaraEmitterConfig } from '../types/niagaraTypes';

export interface NiagaraT3DCompileOptions {
  asSystem?: boolean;
  systemName?: string;
}

export interface NiagaraT3DCompileResult {
  t3dText: string;
  emitterName: string;
  systemName?: string;
  moduleCount: number;
}

/**
 * Compiles a Niagara Emitter configuration into native Unreal Engine Niagara Emitter T3D clipboard text.
 * Can be pasted directly into the UE5 Niagara System Editor.
 */
export function compileNiagaraEmitterToT3D(config: NiagaraEmitterConfig): NiagaraT3DCompileResult {
  const lines: string[] = [];
  const emitterName = config.emitterName || 'NE_ParticleEmitter';

  lines.push(`Begin Object Class=/Script/Niagara.NiagaraEmitter Name="${emitterName}"`);
  lines.push(`   SimTarget=ENiagaraSimTarget::${config.simTarget}`);
  lines.push(`   bLocalSpace=False`);
  lines.push(`   bDeterminism=${config.determinism ? 'True' : 'False'}`);
  
  // Emitter Spawn & Update Scripts
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="EmitterSpawnScript"`);
  lines.push(`   End Object`);

  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="EmitterUpdateScript"`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_SpawnRate"`);
  lines.push(`         FunctionName="SpawnRate"`);
  lines.push(`         SpawnRate=${config.spawnRate}.000000`);
  lines.push(`      End Object`);
  if (config.burstInstantaneousCount > 0) {
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Burst"`);
    lines.push(`         FunctionName="SpawnBurstInstantaneous"`);
    lines.push(`         SpawnCount=${config.burstInstantaneousCount}`);
    lines.push(`      End Object`);
  }
  lines.push(`   End Object`);

  // Particle Spawn Script
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="ParticleSpawnScript"`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Init"`);
  lines.push(`         FunctionName="InitializeParticle"`);
  lines.push(`         LifetimeMin=${config.lifetimeMin.toFixed(2)}`);
  lines.push(`         LifetimeMax=${config.lifetimeMax.toFixed(2)}`);
  lines.push(`         Color=(R=${config.initialColor[0].toFixed(2)},G=${config.initialColor[1].toFixed(2)},B=${config.initialColor[2].toFixed(2)},A=${config.initialColor[3].toFixed(2)})`);
  if (config.initialSize !== undefined) {
    lines.push(`         SpriteSize=(X=${config.initialSize.toFixed(2)},Y=${config.initialSize.toFixed(2)})`);
  }
  lines.push(`      End Object`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_VelocityCone"`);
  lines.push(`         FunctionName="AddVelocityInCone"`);
  lines.push(`         VelocityStrength=${config.initialVelocityMagnitude}.000000`);
  lines.push(`         ConeAngle=${config.initialVelocityConeAngle}.000000`);
  lines.push(`      End Object`);
  if (config.sphereRadius !== undefined && config.sphereRadius > 0) {
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_SphereLocation"`);
    lines.push(`         FunctionName="SphereLocation"`);
    lines.push(`         SphereRadius=${config.sphereRadius.toFixed(2)}`);
    lines.push(`      End Object`);
  }
  lines.push(`   End Object`);

  // Particle Update Script
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="ParticleUpdateScript"`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Gravity"`);
  lines.push(`         FunctionName="GravityForce"`);
  lines.push(`         Gravity=(X=0.000000,Y=0.000000,Z=${config.gravityForceZ}.000000)`);
  lines.push(`      End Object`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_CurlNoise"`);
  lines.push(`         FunctionName="CurlNoiseForce"`);
  lines.push(`         NoiseStrength=${config.curlNoiseStrength}.000000`);
  lines.push(`         NoiseFrequency=${config.curlNoiseFrequency.toFixed(2)}`);
  lines.push(`      End Object`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Drag"`);
  lines.push(`         FunctionName="Drag"`);
  lines.push(`         Drag=${config.dragCoefficient.toFixed(2)}`);
  lines.push(`      End Object`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_ColorOverLife"`);
  lines.push(`         FunctionName="ColorOverLife"`);
  lines.push(`         EndColor=(R=${config.endColor[0].toFixed(2)},G=${config.endColor[1].toFixed(2)},B=${config.endColor[2].toFixed(2)},A=${config.endColor[3].toFixed(2)})`);
  lines.push(`      End Object`);

  const hasPointAttractor = (config.pointAttractorEnabled ?? false) || ((config.pointAttractorStrength ?? 0) !== 0);
  if (hasPointAttractor) {
    const pos = config.pointAttractorPosition ?? [0, 1.0, 0];
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_PointAttractor"`);
    lines.push(`         FunctionName="PointAttractionForce"`);
    lines.push(`         AttractorPosition=(X=${pos[0].toFixed(2)},Y=${pos[1].toFixed(2)},Z=${pos[2].toFixed(2)})`);
    lines.push(`         AttractionStrength=${(config.pointAttractorStrength ?? 500).toFixed(2)}`);
    lines.push(`         AttractionRadius=${(config.pointAttractorRadius ?? 100).toFixed(2)}`);
    lines.push(`         FalloffExponent=${(config.pointAttractorFalloff ?? 2.0).toFixed(2)}`);
    lines.push(`      End Object`);
  }

  const hasLinearForce =
    config.linearForce &&
    (config.linearForce[0] !== 0 || config.linearForce[1] !== 0 || config.linearForce[2] !== 0);
  if (hasLinearForce) {
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_AccelerationForce"`);
    lines.push(`         FunctionName="AccelerationForce"`);
    lines.push(`         Acceleration=(X=${config.linearForce![0].toFixed(2)},Y=${config.linearForce![1].toFixed(2)},Z=${config.linearForce![2].toFixed(2)})`);
    lines.push(`      End Object`);
  }

  if (config.sizeOverLifeEnabled && config.initialSize !== undefined && config.endSize !== undefined) {
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_ScaleSpriteSize"`);
    lines.push(`         FunctionName="ScaleSpriteSize"`);
    lines.push(`         InitialSize=${config.initialSize.toFixed(2)}`);
    lines.push(`         EndSize=${config.endSize.toFixed(2)}`);
    lines.push(`      End Object`);
  }

  if (config.collisionEnabled) {
    const norm = config.collisionPlaneNormal ?? [0, 1, 0];
    lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_Collision"`);
    lines.push(`         FunctionName="Collision"`);
    lines.push(`         Restitution=${(config.bounciness ?? 0.45).toFixed(2)}`);
    lines.push(`         Friction=${(config.collisionFriction ?? 0.20).toFixed(2)}`);
    lines.push(`         PlaneHeight=${(config.collisionPlaneHeight ?? -1.20).toFixed(2)}`);
    lines.push(`         PlaneNormal=(X=${norm[0].toFixed(2)},Y=${norm[1].toFixed(2)},Z=${norm[2].toFixed(2)})`);
    lines.push(`      End Object`);
  }

  lines.push(`   End Object`);

  // Renderer Module
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraSpriteRendererProperties Name="NiagaraSpriteRendererProperties_0"`);
  lines.push(`      FacingMode=ENiagaraSpriteFacingMode::${config.spriteRendererFacing}`);
  lines.push(`      Alignment=ENiagaraSpriteAlignment::VelocityAligned`);
  lines.push(`      Material=Material'"/Niagara/DefaultAssets/DefaultSpriteMaterial.DefaultSpriteMaterial"'`);
  lines.push(`   End Object`);

  lines.push(`End Object`);

  let moduleCount = 7;
  if (config.burstInstantaneousCount > 0) {
    moduleCount++;
  }
  if (hasPointAttractor) {
    moduleCount++;
  }
  if (hasLinearForce) {
    moduleCount++;
  }
  if (config.sizeOverLifeEnabled && config.initialSize !== undefined && config.endSize !== undefined) {
    moduleCount++;
  }
  if (config.collisionEnabled) {
    moduleCount++;
  }
  if (config.sphereRadius !== undefined && config.sphereRadius > 0) {
    moduleCount++;
  }

  return {
    t3dText: lines.join('\r\n'),
    emitterName,
    moduleCount,
  };
}

/**
 * Compiles a Niagara System configuration into native Unreal Engine Niagara System T3D clipboard text.
 * Can be pasted directly into the UE5 Content Browser.
 */
export function compileNiagaraSystemToT3D(config: NiagaraEmitterConfig, systemName?: string): NiagaraT3DCompileResult {
  const emitterResult = compileNiagaraEmitterToT3D(config);
  const sysName = systemName || (config.emitterName ? config.emitterName.replace(/^NE_/, 'NS_') : 'NS_ParticleSystem');

  const lines: string[] = [];
  lines.push(`Begin Object Class=/Script/Niagara.NiagaraSystem Name="${sysName}"`);
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="SystemSpawnScript"`);
  lines.push(`   End Object`);
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraScript Name="SystemUpdateScript"`);
  lines.push(`   End Object`);
  lines.push(`   Begin Object Class=/Script/Niagara.NiagaraEmitterHandle Name="NiagaraEmitterHandle_0"`);
  lines.push(`      Id=A0000000000000000000000000000001`);
  lines.push(`      Name="${emitterResult.emitterName}"`);
  lines.push(`      bIsEnabled=True`);
  lines.push(`   End Object`);

  // Indent emitter block inside system
  const emitterLines = emitterResult.t3dText.split('\r\n');
  for (const line of emitterLines) {
    lines.push(`   ${line}`);
  }

  lines.push(`End Object`);

  return {
    t3dText: lines.join('\r\n'),
    emitterName: emitterResult.emitterName,
    systemName: sysName,
    moduleCount: emitterResult.moduleCount,
  };
}

/**
 * Compiles a Niagara Emitter or System configuration into native Unreal Engine T3D clipboard text.
 * Defaults to UNiagaraEmitter; specify { asSystem: true } to export as UNiagaraSystem.
 */
export function compileNiagaraToT3D(
  config: NiagaraEmitterConfig,
  options?: NiagaraT3DCompileOptions
): NiagaraT3DCompileResult {
  if (options?.asSystem) {
    return compileNiagaraSystemToT3D(config, options.systemName);
  }
  return compileNiagaraEmitterToT3D(config);
}
