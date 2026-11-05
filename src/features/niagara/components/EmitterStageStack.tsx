import React, { useState } from 'react';
import { NiagaraEmitterConfig, NiagaraStage } from '../types/niagaraTypes';
import { NIAGARA_MODULES } from '../data/niagaraModulesCatalog';
import { LuFlame, LuCopy, LuCheck, LuEye, LuChevronLeft, LuChevronRight } from 'react-icons/lu';

interface EmitterStageStackProps {
  config: NiagaraEmitterConfig;
  onChangeConfig: (patch: Partial<NiagaraEmitterConfig>) => void;
  onCopyUE5: () => void;
  onCopySystem?: () => void;
  isCopied?: boolean;
}

const STAGES: { stage: NiagaraStage; label: string; icon: string }[] = [
  { stage: 'SystemSpawn', label: 'System Spawn', icon: '🌐' },
  { stage: 'EmitterSpawn', label: 'Emitter Spawn', icon: '⚡' },
  { stage: 'EmitterUpdate', label: 'Emitter Update', icon: '⏱️' },
  { stage: 'ParticleSpawn', label: 'Particle Spawn', icon: '🌱' },
  { stage: 'ParticleUpdate', label: 'Particle Update', icon: '🌀' },
  { stage: 'Renderers', label: 'Renderers', icon: '🎨' },
];

export const EmitterStageStack: React.FC<EmitterStageStackProps> = ({
  config,
  onChangeConfig,
  onCopyUE5,
  onCopySystem,
  isCopied = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);

  if (isCollapsed) {
    return (
      <div className="w-10 h-full flex flex-col items-center py-3 bg-zinc-900 border-r border-zinc-800 shrink-0 select-none">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-1.5 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors cursor-pointer"
          title="Expand Emitter Stage Stack"
        >
          <LuChevronRight className="w-4 h-4 text-orange-400" />
        </button>
        <div className="mt-4 [writing-mode:vertical-lr] text-[11px] font-semibold text-zinc-400 tracking-wider uppercase flex items-center space-x-2">
          <span>Emitter Stack</span>
          <LuFlame className="w-3.5 h-3.5 text-orange-400 rotate-90" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 flex flex-col bg-zinc-900 border-r border-zinc-800 h-full overflow-y-auto select-none text-xs shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 flex items-center justify-between bg-zinc-950/60">
        <div className="flex items-center space-x-2">
          <LuFlame className="w-4 h-4 text-orange-400" />
          <span className="font-semibold text-zinc-100">{config.emitterName}</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-orange-500/10 text-orange-400 border border-orange-500/30">
            {config.simTarget}
          </span>
          <button
            onClick={() => setIsCollapsed(true)}
            className="p-1 rounded text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors ml-1 cursor-pointer"
            title="Collapse Emitter Stage Stack (Frees Canvas Width)"
          >
            <LuChevronLeft className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Copy Niagara T3D Buttons */}
      <div className="p-2.5 border-b border-zinc-800 bg-zinc-900/50 space-y-1.5">
        <button
          onClick={onCopyUE5}
          className="w-full flex items-center justify-center space-x-1.5 py-1.5 rounded bg-orange-500/20 hover:bg-orange-500/30 text-orange-400 border border-orange-500/40 font-mono transition-colors"
          title="Copy Niagara Emitter T3D buffer to Clipboard"
        >
          {isCopied ? <LuCheck className="w-3.5 h-3.5 text-green-400" /> : <LuCopy className="w-3.5 h-3.5" />}
          <span>{isCopied ? 'Copied to UE5 Clipboard!' : 'Copy UE5 Niagara Emitter'}</span>
        </button>
        {onCopySystem && (
          <button
            onClick={onCopySystem}
            className="w-full flex items-center justify-center space-x-1.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono transition-colors text-[10px]"
            title="Copy full UNiagaraSystem T3D buffer to Clipboard"
          >
            <LuCopy className="w-3 h-3 text-orange-400" />
            <span>Copy UE5 Niagara System</span>
          </button>
        )}
      </div>

      {/* Stage Sections */}
      <div className="p-2 space-y-3 flex-1 overflow-y-auto">
        {STAGES.map(({ stage, label, icon }) => {
          const modules = NIAGARA_MODULES.filter((m) => m.stage === stage);
          return (
            <div key={stage} className="border border-zinc-800 rounded-md bg-zinc-950/40 overflow-hidden">
              <div className="px-2.5 py-1.5 bg-zinc-800/60 border-b border-zinc-800 flex items-center justify-between font-medium text-zinc-200">
                <span className="flex items-center space-x-1.5">
                  <span>{icon}</span>
                  <span>{label}</span>
                </span>
                <span className="text-[10px] text-zinc-400 font-mono">({modules.length})</span>
              </div>

              <div className="p-2 space-y-2">
                {modules.map((mod) => (
                  <div
                    key={mod.id}
                    className="p-1.5 rounded bg-zinc-900/80 border border-zinc-800/80 hover:border-zinc-700 transition-colors flex items-center justify-between text-[11px]"
                  >
                    <div className="flex items-center space-x-1.5 truncate">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: mod.color }} />
                      <span className="text-zinc-300 truncate">{mod.name}</span>
                    </div>
                    <LuEye className="w-3 h-3 text-zinc-500 flex-shrink-0" />
                  </div>
                ))}

                {/* Stage 1: System Spawn Controls */}
                {stage === 'SystemSpawn' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="flex justify-between text-zinc-400">
                      <span>Loop Duration:</span>
                      <span className="font-mono text-zinc-200">{(config.loopDuration ?? 2.0).toFixed(1)}s</span>
                    </div>
                    <input
                      type="range"
                      min={0.5}
                      max={10.0}
                      step={0.1}
                      value={config.loopDuration ?? 2.0}
                      onChange={(e) => onChangeConfig({ loopDuration: Number(e.target.value) })}
                      className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                    />
                    <label className="flex items-center justify-between text-zinc-400 pt-1 cursor-pointer">
                      <span>Determinism:</span>
                      <input
                        type="checkbox"
                        checked={Boolean(config.determinism)}
                        onChange={(e) => onChangeConfig({ determinism: e.target.checked })}
                        className="accent-orange-500 rounded"
                      />
                    </label>
                  </div>
                )}

                {/* Stage 2: Emitter Spawn Controls */}
                {stage === 'EmitterSpawn' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="flex justify-between text-zinc-400">
                      <span>Sim Target:</span>
                      <span className="font-mono text-zinc-200">{config.simTarget}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-1">
                      <button
                        onClick={() => onChangeConfig({ simTarget: 'GPUComputeSim' })}
                        className={`py-1 rounded text-center font-mono text-[9px] border transition-colors ${
                          config.simTarget === 'GPUComputeSim'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        GPU Sim
                      </button>
                      <button
                        onClick={() => onChangeConfig({ simTarget: 'CPUSim' })}
                        className={`py-1 rounded text-center font-mono text-[9px] border transition-colors ${
                          config.simTarget === 'CPUSim'
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                            : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                        }`}
                      >
                        CPU Sim
                      </button>
                    </div>
                  </div>
                )}

                {/* Stage 3: Emitter Update Controls */}
                {stage === 'EmitterUpdate' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Spawn Rate:</span>
                        <span className="font-mono text-zinc-200">{config.spawnRate} / s</span>
                      </div>
                      <input
                        type="range"
                        min={10}
                        max={1000}
                        value={config.spawnRate}
                        onChange={(e) => onChangeConfig({ spawnRate: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Instant Burst:</span>
                        <span className="font-mono text-zinc-200">{config.burstInstantaneousCount}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={10}
                        value={config.burstInstantaneousCount}
                        onChange={(e) => onChangeConfig({ burstInstantaneousCount: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Stage 4: Particle Spawn Controls */}
                {stage === 'ParticleSpawn' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Cone Angle:</span>
                        <span className="font-mono text-zinc-200">{config.initialVelocityConeAngle}°</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={90}
                        value={config.initialVelocityConeAngle}
                        onChange={(e) => onChangeConfig({ initialVelocityConeAngle: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Launch Speed:</span>
                        <span className="font-mono text-zinc-200">{config.initialVelocityMagnitude}</span>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={1500}
                        step={25}
                        value={config.initialVelocityMagnitude}
                        onChange={(e) => onChangeConfig({ initialVelocityMagnitude: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Lifetime Max:</span>
                        <span className="font-mono text-zinc-200">{config.lifetimeMax.toFixed(1)}s</span>
                      </div>
                      <input
                        type="range"
                        min={0.5}
                        max={5.0}
                        step={0.1}
                        value={config.lifetimeMax}
                        onChange={(e) => onChangeConfig({ lifetimeMax: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Stage 5: Particle Update Controls */}
                {stage === 'ParticleUpdate' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Gravity Z:</span>
                        <span className="font-mono text-zinc-200">{config.gravityForceZ}</span>
                      </div>
                      <input
                        type="range"
                        min={-980}
                        max={200}
                        value={config.gravityForceZ}
                        onChange={(e) => onChangeConfig({ gravityForceZ: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Curl Noise:</span>
                        <span className="font-mono text-zinc-200">{config.curlNoiseStrength}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={500}
                        value={config.curlNoiseStrength}
                        onChange={(e) => onChangeConfig({ curlNoiseStrength: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Drag Damping:</span>
                        <span className="font-mono text-zinc-200">{config.dragCoefficient.toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={2.0}
                        step={0.05}
                        value={config.dragCoefficient}
                        onChange={(e) => onChangeConfig({ dragCoefficient: Number(e.target.value) })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    {/* Point Attractor */}
                    <div className="space-y-1 pt-1 border-t border-zinc-800/40">
                      <div className="flex justify-between text-zinc-400">
                        <span>Point Attractor:</span>
                        <span className="font-mono text-zinc-200">{config.pointAttractorStrength ?? 0}</span>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={1000}
                        step={25}
                        value={config.pointAttractorStrength ?? 0}
                        onChange={(e) => onChangeConfig({
                          pointAttractorStrength: Number(e.target.value),
                          pointAttractorEnabled: Number(e.target.value) > 0,
                        })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>

                    {/* Size Over Life */}
                    <div className="space-y-1 pt-1 border-t border-zinc-800/40">
                      <div className="flex justify-between text-zinc-400">
                        <span>Size Over Life:</span>
                        <span className="font-mono text-zinc-200">{(config.initialSize ?? 12).toFixed(0)} → {(config.endSize ?? 2).toFixed(0)}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="range"
                          min={1}
                          max={30}
                          value={config.initialSize ?? 12}
                          onChange={(e) => onChangeConfig({ initialSize: Number(e.target.value), sizeOverLifeEnabled: true })}
                          className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                          title="Initial Size"
                        />
                        <input
                          type="range"
                          min={0}
                          max={30}
                          value={config.endSize ?? 2}
                          onChange={(e) => onChangeConfig({ endSize: Number(e.target.value), sizeOverLifeEnabled: true })}
                          className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                          title="End Size"
                        />
                      </div>
                    </div>

                    {/* Floor Bounce Restitution */}
                    <div className="space-y-1 pt-1 border-t border-zinc-800/40">
                      <div className="flex justify-between text-zinc-400">
                        <span>Floor Bounciness:</span>
                        <span className="font-mono text-zinc-200">{(config.bounciness ?? 0.45).toFixed(2)}</span>
                      </div>
                      <input
                        type="range"
                        min={0.0}
                        max={1.0}
                        step={0.05}
                        value={config.bounciness ?? 0.45}
                        onChange={(e) => onChangeConfig({ bounciness: Number(e.target.value), collisionEnabled: true })}
                        className="w-full accent-orange-500 h-1 bg-zinc-800 rounded"
                      />
                    </div>
                  </div>
                )}

                {/* Stage 6: Renderers Controls */}
                {stage === 'Renderers' && (
                  <div className="pt-1.5 border-t border-zinc-800/50 space-y-1.5 text-[10px]">
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Facing Mode:</span>
                        <span className="font-mono text-zinc-200">{config.spriteRendererFacing}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-1">
                        <button
                          onClick={() => onChangeConfig({ spriteRendererFacing: 'FacingCamera' })}
                          className={`py-1 rounded text-center font-mono text-[9px] border transition-colors ${
                            config.spriteRendererFacing === 'FacingCamera'
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          Face Camera
                        </button>
                        <button
                          onClick={() => onChangeConfig({ spriteRendererFacing: 'VelocityAligned' })}
                          className={`py-1 rounded text-center font-mono text-[9px] border transition-colors ${
                            config.spriteRendererFacing === 'VelocityAligned'
                              ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                              : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                          }`}
                        >
                          Velocity Aligned
                        </button>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-zinc-400">
                        <span>Blend Mode:</span>
                        <span className="font-mono text-zinc-200">{config.blendMode}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-1">
                        {(['Additive', 'Translucent', 'Opaque'] as const).map((mode) => (
                          <button
                            key={mode}
                            onClick={() => onChangeConfig({ blendMode: mode })}
                            className={`py-1 rounded text-center font-mono text-[9px] border transition-colors ${
                              config.blendMode === mode
                                ? 'bg-orange-500/20 text-orange-400 border-orange-500/50'
                                : 'bg-zinc-800 text-zinc-400 border-zinc-700 hover:text-zinc-200'
                            }`}
                          >
                            {mode}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
