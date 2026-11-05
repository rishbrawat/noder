import { NiagaraEmitterConfig } from '../types/niagaraTypes';

export interface NiagaraT3DCompileResult {
  t3dText: string;
  emitterName: string;
  moduleCount: number;
}

/**
 * Compiles a Niagara Emitter configuration into native Unreal Engine Niagara Emitter / System T3D clipboard text.
 * Can be pasted directly into the UE5 Niagara System Editor.
 */
export function compileNiagaraToT3D(config: NiagaraEmitterConfig): NiagaraT3DCompileResult {
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
  lines.push(`      End Object`);
  lines.push(`      Begin Object Class=/Script/Niagara.NiagaraNodeFunctionCall Name="NiagaraNodeFunctionCall_VelocityCone"`);
  lines.push(`         FunctionName="AddVelocityInCone"`);
  lines.push(`         VelocityStrength=${config.initialVelocityMagnitude}.000000`);
  lines.push(`         ConeAngle=${config.initialVelocityConeAngle}.000000`);
  lines.push(`      End Object`);
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

  return {
    t3dText: lines.join('\r\n'),
    emitterName,
    moduleCount,
  };
}
