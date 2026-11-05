import React, { useState } from 'react';
import { 
  GameplayEffectDefinition, 
  AttributeModifierOp, 
  StandardAttributeName, 
  GameplayTag 
} from '../types/gasTypes';
import { STANDARD_ATTRIBUTES, PRESET_GAMEPLAY_EFFECTS, STANDARD_GAMEPLAY_TAGS } from '../data/gasCatalog';
import { evaluateModifier } from '../utils/gasModifierEvaluator';
import { generateGameplayEffectCpp } from '../utils/gasCppGenerator';
import { 
  LuZap, 
  LuPlus, 
  LuTrash2, 
  LuClock, 
  LuTag, 
  LuX, 
  LuTriangleAlert, 
  LuCopy, 
  LuCheck 
} from 'react-icons/lu';

interface GameplayEffectDrawerProps {
  effect: GameplayEffectDefinition;
  onChangeEffect: (newEffect: GameplayEffectDefinition) => void;
  onSelectPreset?: (preset: GameplayEffectDefinition) => void;
}

export const GameplayEffectDrawer: React.FC<GameplayEffectDrawerProps> = ({
  effect,
  onChangeEffect,
  onSelectPreset,
}) => {
  const [selectedTagToAdd, setSelectedTagToAdd] = useState<GameplayTag>(STANDARD_GAMEPLAY_TAGS[0]);
  const [copiedType, setCopiedType] = useState<'h' | 'cpp' | null>(null);

  const addModifier = () => {
    onChangeEffect({
      ...effect,
      modifiers: [
        ...effect.modifiers,
        {
          attribute: 'Health',
          modifierOp: 'Add',
          magnitude: -20,
        },
      ],
    });
  };

  const removeModifier = (index: number) => {
    onChangeEffect({
      ...effect,
      modifiers: effect.modifiers.filter((_, i) => i !== index),
    });
  };

  const updateModifier = (index: number, patch: Partial<GameplayEffectDefinition['modifiers'][0]>) => {
    const next = [...effect.modifiers];
    next[index] = { ...next[index], ...patch };
    onChangeEffect({ ...effect, modifiers: next });
  };

  const addGrantedTag = () => {
    if (effect.grantedTags.includes(selectedTagToAdd)) return;
    onChangeEffect({
      ...effect,
      grantedTags: [...effect.grantedTags, selectedTagToAdd],
    });
  };

  const removeGrantedTag = (tag: GameplayTag) => {
    onChangeEffect({
      ...effect,
      grantedTags: effect.grantedTags.filter((t) => t !== tag),
    });
  };

  const handleCopyCpp = (type: 'h' | 'cpp') => {
    const res = generateGameplayEffectCpp(effect);
    const textToCopy = type === 'h' ? res.headerFile : res.sourceFile;
    navigator.clipboard.writeText(textToCopy);
    setCopiedType(type);
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg p-3 text-xs space-y-3 shadow-xl select-none">
      {/* Header & Presets */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
        <div className="flex items-center space-x-2">
          <LuZap className="w-4 h-4 text-gold-400" />
          <span className="font-semibold text-zinc-100">Gameplay Effect: {effect.effectName}</span>
        </div>

        <div className="flex items-center space-x-2">
          {onSelectPreset && (
            <div className="flex items-center space-x-1">
              <span className="text-[10px] text-zinc-400">Presets:</span>
              {PRESET_GAMEPLAY_EFFECTS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => onSelectPreset(p)}
                  className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-[10px] text-zinc-300 font-mono transition-colors"
                >
                  {p.effectName}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800">
            <button
              onClick={() => handleCopyCpp('h')}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[10px] transition-colors"
              title="Copy UE5 GameplayEffect C++ Header (.h)"
            >
              {copiedType === 'h' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
              <span>.h</span>
            </button>
            <button
              onClick={() => handleCopyCpp('cpp')}
              className="flex items-center space-x-1 px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700 font-mono text-[10px] transition-colors"
              title="Copy UE5 GameplayEffect C++ Source (.cpp)"
            >
              {copiedType === 'cpp' ? <LuCheck className="w-3 h-3 text-green-400" /> : <LuCopy className="w-3 h-3" />}
              <span>.cpp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Duration Policy */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-zinc-950/40 p-2.5 rounded border border-zinc-800/80">
        <div className="space-y-1">
          <label className="text-zinc-400 font-medium">Duration Policy:</label>
          <select
            value={effect.durationPolicy}
            onChange={(e) => onChangeEffect({ ...effect, durationPolicy: e.target.value as any })}
            className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-1 text-xs outline-none"
          >
            <option value="Instant">Instant (Damage / Direct Heal)</option>
            <option value="Infinite">Infinite (Passive Buff / Armor)</option>
            <option value="HasDuration">Has Duration (Timed Buff / DOT)</option>
          </select>
        </div>

        {effect.durationPolicy === 'HasDuration' && (
          <div className="space-y-1">
            <label className="text-zinc-400 font-medium flex items-center space-x-1">
              <LuClock className="w-3 h-3 text-cyan-400" />
              <span>Duration (seconds):</span>
            </label>
            <input
              type="number"
              step="0.5"
              min="0.1"
              value={effect.durationMagnitude}
              onChange={(e) => onChangeEffect({ ...effect, durationMagnitude: Number(e.target.value) })}
              className="w-full bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-1 font-mono text-xs outline-none"
            />
          </div>
        )}
      </div>

      {/* Attribute Modifiers List */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-medium text-zinc-200">Attribute Modifiers ({effect.modifiers.length})</span>
          <button
            onClick={addModifier}
            className="flex items-center space-x-1 px-2 py-0.5 rounded bg-gold-500/20 hover:bg-gold-500/30 text-gold-400 border border-gold-500/40 text-[11px]"
          >
            <LuPlus className="w-3 h-3" />
            <span>Add Modifier</span>
          </button>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto">
          {effect.modifiers.map((mod, idx) => {
            const attrDef = STANDARD_ATTRIBUTES.find((a) => a.name === mod.attribute);
            const baseVal = attrDef ? attrDef.defaultValue : 100;
            const evalVal = evaluateModifier(baseVal, mod.modifierOp, mod.magnitude);
            const isZeroDiv = mod.modifierOp === 'Divide' && mod.magnitude === 0;

            return (
              <div
                key={idx}
                className="flex flex-col bg-zinc-950/60 p-2 rounded border border-zinc-800/80 space-y-1.5"
              >
                <div className="flex items-center space-x-2">
                  <select
                    value={mod.attribute}
                    onChange={(e) => updateModifier(idx, { attribute: e.target.value as StandardAttributeName })}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 text-xs outline-none font-mono"
                  >
                    {STANDARD_ATTRIBUTES.map((a) => (
                      <option key={a.name} value={a.name}>
                        {a.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={mod.modifierOp}
                    onChange={(e) => updateModifier(idx, { modifierOp: e.target.value as AttributeModifierOp })}
                    className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 text-xs outline-none font-mono"
                  >
                    <option value="Add">Add (+/-)</option>
                    <option value="Multiply">Multiply (*)</option>
                    <option value="Divide">Divide (/)</option>
                    <option value="Override">Override (=)</option>
                  </select>

                  <input
                    type="number"
                    value={mod.magnitude}
                    onChange={(e) => updateModifier(idx, { magnitude: Number(e.target.value) })}
                    className="w-20 bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 font-mono text-xs outline-none"
                  />

                  <button
                    onClick={() => removeModifier(idx)}
                    className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors ml-auto"
                    title="Remove Modifier"
                  >
                    <LuTrash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Math Simulation Output */}
                <div className="flex items-center justify-between text-[10px] font-mono px-1 text-zinc-400 bg-zinc-900/80 py-0.5 rounded border border-zinc-800/50">
                  <span>Base: {baseVal}</span>
                  {isZeroDiv ? (
                    <span className="flex items-center space-x-1 text-red-400">
                      <LuTriangleAlert className="w-3 h-3" />
                      <span>Division by 0 prevented</span>
                    </span>
                  ) : (
                    <span className="text-cyan-300">
                      Result: {Math.round(evalVal * 100) / 100}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {effect.modifiers.length === 0 && (
            <p className="text-[11px] text-zinc-500 italic text-center py-2">
              No attribute modifiers assigned to this effect yet.
            </p>
          )}
        </div>
      </div>

      {/* Granted Gameplay Tags */}
      <div className="space-y-1.5 pt-2 border-t border-zinc-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-1.5 text-zinc-300 font-medium">
            <LuTag className="w-3.5 h-3.5 text-cyan-400" />
            <span>Granted Gameplay Tags ({effect.grantedTags.length})</span>
          </div>

          <div className="flex items-center space-x-1">
            <select
              value={selectedTagToAdd}
              onChange={(e) => setSelectedTagToAdd(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-1.5 py-0.5 text-[11px] font-mono outline-none"
            >
              {STANDARD_GAMEPLAY_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
            <button
              onClick={addGrantedTag}
              className="flex items-center space-x-0.5 px-2 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-[10px]"
            >
              <LuPlus className="w-2.5 h-2.5" />
              <span>Add</span>
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 p-1.5 bg-zinc-950/40 rounded border border-zinc-800/80 min-h-[36px]">
          {effect.grantedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center space-x-1 px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]"
            >
              <span>{tag}</span>
              <button
                onClick={() => removeGrantedTag(tag)}
                className="hover:text-red-400 ml-1"
                title={`Remove ${tag}`}
              >
                <LuX className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}

          {effect.grantedTags.length === 0 && (
            <span className="text-[10px] text-zinc-500 italic py-1">No tags granted by this effect.</span>
          )}
        </div>
      </div>
    </div>
  );
};
