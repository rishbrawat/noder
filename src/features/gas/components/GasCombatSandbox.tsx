import React, { useState, useEffect, useRef } from 'react';
import { 
  GameplayAbilityDefinition, 
  AttributeDefinition 
} from '../types/gasTypes';
import { STANDARD_ATTRIBUTES } from '../data/gasCatalog';
import { 
  LuSwords, 
  LuRotateCcw, 
  LuZap, 
  LuHeart, 
  LuShield, 
  LuSparkles,
  LuClock
} from 'react-icons/lu';
import { toast } from 'react-hot-toast';

interface GasCombatSandboxProps {
  ability?: GameplayAbilityDefinition;
  attributes?: AttributeDefinition[];
  className?: string;
}

export const GasCombatSandbox: React.FC<GasCombatSandboxProps> = ({
  ability,
  attributes = STANDARD_ATTRIBUTES,
  className = '',
}) => {
  // Live Simulated Actor Attributes
  const [health, setHealth] = useState<number>(100);
  const [maxHealth] = useState<number>(100);
  const [shield, setShield] = useState<number>(50);
  const [maxShield] = useState<number>(50);
  const [stamina, setStamina] = useState<number>(100);
  const [maxStamina] = useState<number>(100);
  const [mana, setMana] = useState<number>(80);
  const [maxMana] = useState<number>(100);

  // Active Tag Container
  const [activeTags, setActiveTags] = useState<Set<string>>(new Set(['State.Alive', 'Status.Ready']));
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [combatLogs, setCombatLogs] = useState<string[]>([
    'Combat Sandbox initialized @ 120 FPS.',
    'ASC bound to Target_Dummy_01 with UPlayerAttributeSet.',
  ]);

  const lastTickRef = useRef<number>(performance.now());
  const cooldownDuration = ability?.cooldownEffect?.durationMagnitude ?? 1.5;

  // 120 FPS High-Refresh Natural Regeneration Loop
  useEffect(() => {
    let frameId: number;

    const tick = (now: number) => {
      frameId = requestAnimationFrame(tick);
      const dt = Math.min((now - lastTickRef.current) / 1000, 0.05);
      lastTickRef.current = now;

      // Natural passive stamina & shield regen
      setStamina((prev) => Math.min(maxStamina, prev + 15 * dt));
      setShield((prev) => Math.min(maxShield, prev + 5 * dt));
      setMana((prev) => Math.min(maxMana, prev + 8 * dt));

      // Cooldown tick
      setCooldownRemaining((prev) => {
        if (prev <= 0) return 0;
        const next = Math.max(0, prev - dt);
        if (next === 0) {
          setActiveTags((tags) => {
            const copy = new Set(tags);
            copy.delete('State.Cooldown');
            copy.delete('State.AbilityActive');
            copy.add('Status.Ready');
            return copy;
          });
        }
        return next;
      });
    };

    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [maxStamina, maxShield, maxMana]);

  const addLog = (msg: string) => {
    setCombatLogs((prev) => [msg, ...prev.slice(0, 8)]);
  };

  const handleCastAbility = () => {
    const cost = ability?.costEffect?.modifiers?.[0]?.magnitude ?? 25;
    const abilityName = ability?.abilityName || 'GA_DodgeRoll';

    // 1. Tag policy check
    if (activeTags.has('State.Cooldown')) {
      toast.error(`Ability blocked by tag: [State.Cooldown] (${cooldownRemaining.toFixed(1)}s remaining)`);
      addLog(`❌ Cast failed: [State.Cooldown] active.`);
      return;
    }

    if (activeTags.has('State.Stunned')) {
      toast.error('Cannot cast: Actor is Stunned!');
      addLog(`❌ Cast failed: [State.Stunned] active.`);
      return;
    }

    // 2. Resource check
    if (stamina < cost) {
      toast.error(`Insufficient Stamina! Need ${cost}, have ${Math.round(stamina)}`);
      addLog(`❌ Cast failed: Insufficient Stamina (${Math.round(stamina)}/${cost}).`);
      return;
    }

    // 3. Commit Ability
    setStamina((prev) => Math.max(0, prev - cost));
    setCooldownRemaining(cooldownDuration);
    
    setActiveTags((tags) => {
      const copy = new Set(tags);
      copy.delete('Status.Ready');
      copy.add('State.Cooldown');
      copy.add('State.AbilityActive');
      return copy;
    });

    addLog(`⚡ Activated ${abilityName}! Cost: -${cost} Stamina.`);
    toast.success(`Cast ${abilityName}! Cooldown ${cooldownDuration}s started.`, { icon: '⚔️' });
  };

  const handleTakeDamage = (amount: number) => {
    setShield((prevShield) => {
      if (prevShield >= amount) {
        addLog(`🛡️ Shield absorbed ${amount} damage.`);
        return prevShield - amount;
      }
      const leftover = amount - prevShield;
      setHealth((prevHealth) => {
        const nextHealth = Math.max(0, prevHealth - leftover);
        if (nextHealth === 0) {
          setActiveTags((tags) => new Set([...tags, 'State.Dead']));
          addLog(`💀 Actor died! Health reached 0.`);
        } else {
          addLog(`💥 Took ${amount} damage! Shield broken, Health: ${nextHealth.toFixed(0)}`);
        }
        return nextHealth;
      });
      return 0;
    });
  };

  const handleResetSandbox = () => {
    setHealth(100);
    setShield(50);
    setStamina(100);
    setMana(80);
    setCooldownRemaining(0);
    setActiveTags(new Set(['State.Alive', 'Status.Ready']));
    setCombatLogs(['Reset Combat Sandbox state. Ready.']);
    toast.success('Combat sandbox reset to full vitals.');
  };

  return (
    <div className={`flex flex-col bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-xs space-y-3 shadow-2xl select-none font-sans ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <LuSwords className="w-4 h-4 text-purple-400" />
          <span className="font-semibold text-zinc-100">Live GAS Combat Sandbox</span>
          <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">120 FPS</span>
        </div>
        <button
          onClick={handleResetSandbox}
          className="flex items-center space-x-1 p-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white transition-colors cursor-pointer"
          title="Reset Health, Stamina & Tags"
        >
          <LuRotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Target Dummy Vital Bars */}
      <div className="space-y-2 bg-zinc-900/70 p-2.5 rounded border border-zinc-800">
        <div className="flex items-center justify-between text-[11px] font-mono text-zinc-300">
          <span className="font-semibold text-zinc-200">Target_Dummy_01 (Pawn)</span>
          <span className="text-[10px] text-zinc-500">UPlayerAttributeSet ({attributes.length} attrs)</span>
        </div>

        {/* Health */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-red-400 flex items-center gap-1"><LuHeart className="w-3 h-3" /> Health</span>
            <span className="text-zinc-300">{health.toFixed(0)} / {maxHealth}</span>
          </div>
          <div className="w-full h-2 rounded bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-red-600 to-red-400 transition-all duration-75"
              style={{ width: `${(health / maxHealth) * 100}%` }}
            />
          </div>
        </div>

        {/* Shield */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-cyan-400 flex items-center gap-1"><LuShield className="w-3 h-3" /> Shield</span>
            <span className="text-zinc-300">{shield.toFixed(0)} / {maxShield}</span>
          </div>
          <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-cyan-600 to-cyan-400 transition-all duration-75"
              style={{ width: `${(shield / maxShield) * 100}%` }}
            />
          </div>
        </div>

        {/* Stamina */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-yellow-400 flex items-center gap-1"><LuZap className="w-3 h-3" /> Stamina</span>
            <span className="text-zinc-300">{stamina.toFixed(0)} / {maxStamina}</span>
          </div>
          <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-yellow-600 to-yellow-400 transition-all duration-75"
              style={{ width: `${(stamina / maxStamina) * 100}%` }}
            />
          </div>
        </div>

        {/* Mana */}
        <div className="space-y-0.5">
          <div className="flex justify-between text-[10px] font-mono">
            <span className="text-blue-400 flex items-center gap-1"><LuSparkles className="w-3 h-3" /> Mana</span>
            <span className="text-zinc-300">{mana.toFixed(0)} / {maxMana}</span>
          </div>
          <div className="w-full h-1.5 rounded bg-zinc-800 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-75"
              style={{ width: `${(mana / maxMana) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Active Gameplay Tags */}
      <div className="space-y-1">
        <span className="text-[10px] font-mono uppercase text-zinc-400 block font-semibold">Active Tag Container</span>
        <div className="flex flex-wrap gap-1">
          {Array.from(activeTags).map((tag) => (
            <span
              key={tag}
              className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                tag.includes('Cooldown')
                  ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse'
                  : tag.includes('Dead')
                  ? 'bg-red-500/20 text-red-400 border-red-500/40'
                  : tag.includes('Ability')
                  ? 'bg-purple-500/20 text-purple-300 border-purple-500/40'
                  : 'bg-zinc-800 text-zinc-300 border-zinc-700'
              }`}
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Ability Trigger Controls */}
      <div className="space-y-1.5">
        <button
          onClick={handleCastAbility}
          disabled={cooldownRemaining > 0 || health <= 0}
          className={`w-full py-2.5 rounded font-bold text-xs flex items-center justify-center space-x-2 transition-all cursor-pointer shadow-lg ${
            cooldownRemaining > 0
              ? 'bg-zinc-800 text-zinc-500 border border-zinc-700 cursor-not-allowed'
              : health <= 0
              ? 'bg-red-900/40 text-red-400 border border-red-800 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white border border-purple-400/40 active:scale-[0.98]'
          }`}
        >
          {cooldownRemaining > 0 ? (
            <>
              <LuClock className="w-4 h-4 animate-spin text-orange-400" />
              <span>Cooldown ({cooldownRemaining.toFixed(1)}s)</span>
            </>
          ) : (
            <>
              <LuZap className="w-4 h-4 text-yellow-300" />
              <span>Activate {ability?.abilityName || 'GA_DodgeRoll'} (Cost: 25 Stamina)</span>
            </>
          )}
        </button>

        {/* Combat actions: Deal Damage & Burn */}
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => handleTakeDamage(25)}
            className="py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-red-300 border border-zinc-700 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Deal 25 Damage
          </button>
          <button
            onClick={() => handleTakeDamage(50)}
            className="py-1.5 rounded bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-800/60 text-[11px] font-medium transition-colors cursor-pointer"
          >
            Heavy Hit (50 Dmg)
          </button>
        </div>
      </div>

      {/* Real-time ASC Combat Log */}
      <div className="space-y-1 bg-black/60 p-2 rounded border border-zinc-800/80 font-mono text-[10px]">
        <span className="text-zinc-500 uppercase tracking-widest text-[9px] block">Live ASC Execution Log</span>
        <div className="space-y-0.5 max-h-20 overflow-y-auto select-text text-zinc-400">
          {combatLogs.map((log, idx) => (
            <div key={idx} className="truncate">
              {log}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
