import React, { useState } from 'react';
import { GameplayTag, GameplayTagPolicyMatrix } from '../types/gasTypes';
import { STANDARD_GAMEPLAY_TAGS } from '../data/gasCatalog';
import { isValidGameplayTag } from '../utils/gasModifierEvaluator';
import { LuShieldAlert, LuTag, LuX, LuTriangleAlert, LuCircleCheck, LuPlus } from 'react-icons/lu';

interface GameplayTagMatrixProps {
  policy: GameplayTagPolicyMatrix;
  onChangePolicy: (newPolicy: GameplayTagPolicyMatrix) => void;
}

export const GameplayTagMatrix: React.FC<GameplayTagMatrixProps> = ({
  policy,
  onChangePolicy,
}) => {
  const [selectedTagToAdd, setSelectedTagToAdd] = useState<string>(STANDARD_GAMEPLAY_TAGS[0]);
  const [customTagInput, setCustomTagInput] = useState('');
  const [customTagError, setCustomTagError] = useState('');

  // Conflict Checking
  const conflicts: string[] = [];
  policy.activationRequiredTags.forEach((reqTag) => {
    if (policy.activationBlockedTags.includes(reqTag)) {
      conflicts.push(`Fatal Conflict: "${reqTag}" cannot be simultaneously Required and Blocked.`);
    }
  });

  const addTagToBucket = (
    bucket: 'activationRequiredTags' | 'activationBlockedTags' | 'sourceGrantedTags',
    tag: GameplayTag
  ) => {
    if (policy[bucket].includes(tag)) return;
    onChangePolicy({
      ...policy,
      [bucket]: [...policy[bucket], tag],
    });
  };

  const removeTagFromBucket = (
    bucket: 'activationRequiredTags' | 'activationBlockedTags' | 'sourceGrantedTags',
    tag: GameplayTag
  ) => {
    onChangePolicy({
      ...policy,
      [bucket]: policy[bucket].filter((t) => t !== tag),
    });
  };

  const handleAddCustomTag = (bucket: 'activationRequiredTags' | 'activationBlockedTags' | 'sourceGrantedTags') => {
    const trimmed = customTagInput.trim();
    if (!trimmed) return;
    if (!isValidGameplayTag(trimmed)) {
      setCustomTagError('Tag must follow [Domain].[Subdomain].[Leaf]');
      return;
    }
    setCustomTagError('');
    addTagToBucket(bucket, trimmed);
    setCustomTagInput('');
  };

  return (
    <div className="flex flex-col bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden text-xs shadow-xl select-none">
      {/* Header */}
      <div className="p-3 border-b border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <LuTag className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-zinc-100">Gameplay Tag Policy Matrix</span>
        </div>
        {conflicts.length === 0 ? (
          <span className="flex items-center space-x-1 text-green-400 text-[11px] font-mono">
            <LuCircleCheck className="w-3.5 h-3.5" />
            <span>Policy Valid</span>
          </span>
        ) : (
          <span className="flex items-center space-x-1 text-red-400 text-[11px] font-mono">
            <LuTriangleAlert className="w-3.5 h-3.5" />
            <span>{conflicts.length} Conflict(s)</span>
          </span>
        )}
      </div>

      {/* Conflicts Banner */}
      {conflicts.length > 0 && (
        <div className="bg-red-500/10 border-b border-red-500/30 p-2.5 space-y-1">
          {conflicts.map((c, i) => (
            <div key={i} className="flex items-center space-x-1.5 text-[11px] text-red-400">
              <LuShieldAlert className="w-3.5 h-3.5 shrink-0" />
              <span>{c}</span>
            </div>
          ))}
        </div>
      )}

      {/* Quick Add Tag Bar */}
      <div className="p-2.5 border-b border-zinc-800 bg-zinc-900/60 flex items-center space-x-2">
        <select
          value={selectedTagToAdd}
          onChange={(e) => setSelectedTagToAdd(e.target.value)}
          className="bg-zinc-800 border border-zinc-700 text-zinc-200 rounded px-2 py-1 text-xs outline-none flex-1 font-mono"
        >
          {STANDARD_GAMEPLAY_TAGS.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <button
          onClick={() => addTagToBucket('activationRequiredTags', selectedTagToAdd)}
          className="px-2 py-1 rounded bg-green-500/20 hover:bg-green-500/30 text-green-400 border border-green-500/40 text-[11px]"
        >
          + Required
        </button>
        <button
          onClick={() => addTagToBucket('activationBlockedTags', selectedTagToAdd)}
          className="px-2 py-1 rounded bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 text-[11px]"
        >
          + Blocked
        </button>
        <button
          onClick={() => addTagToBucket('sourceGrantedTags', selectedTagToAdd)}
          className="px-2 py-1 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/40 text-[11px]"
        >
          + Granted
        </button>
      </div>

      {/* Custom Tag Input Bar */}
      <div className="px-2.5 py-1.5 border-b border-zinc-800/80 bg-zinc-950/30 flex items-center space-x-2">
        <input
          type="text"
          placeholder="New custom tag: Domain.Subdomain.Leaf"
          value={customTagInput}
          onChange={(e) => {
            setCustomTagInput(e.target.value);
            if (customTagError) setCustomTagError('');
          }}
          className="bg-zinc-800/80 border border-zinc-700/80 text-zinc-200 placeholder-zinc-500 rounded px-2 py-0.5 text-[11px] outline-none flex-1 font-mono"
        />
        <button
          onClick={() => handleAddCustomTag('activationRequiredTags')}
          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-green-400 border border-zinc-700 text-[10px] font-mono flex items-center space-x-0.5"
          title="Add custom tag as Required"
        >
          <LuPlus className="w-2.5 h-2.5" />
          <span>Req</span>
        </button>
        <button
          onClick={() => handleAddCustomTag('activationBlockedTags')}
          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-red-400 border border-zinc-700 text-[10px] font-mono flex items-center space-x-0.5"
          title="Add custom tag as Blocked"
        >
          <LuPlus className="w-2.5 h-2.5" />
          <span>Blk</span>
        </button>
        <button
          onClick={() => handleAddCustomTag('sourceGrantedTags')}
          className="px-1.5 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-cyan-400 border border-zinc-700 text-[10px] font-mono flex items-center space-x-0.5"
          title="Add custom tag as Granted"
        >
          <LuPlus className="w-2.5 h-2.5" />
          <span>Gnt</span>
        </button>
      </div>
      {customTagError && (
        <div className="px-2.5 py-1 bg-yellow-500/10 border-b border-yellow-500/20 text-[10px] text-yellow-400 font-mono">
          {customTagError}
        </div>
      )}

      {/* Tag Matrix Columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 p-3 gap-3">
        {/* Required Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-zinc-300 font-medium">
            <span className="text-green-400 font-mono">1. Activation Required Tags</span>
            <span className="text-[10px] text-zinc-500 font-mono">({policy.activationRequiredTags.length})</span>
          </div>
          <p className="text-[10px] text-zinc-500">Actor must possess all these tags to activate ability.</p>
          <div className="flex flex-wrap gap-1.5 min-h-[60px] p-2 bg-zinc-950/40 rounded border border-zinc-800/80">
            {policy.activationRequiredTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-green-500/10 text-green-300 border border-green-500/30 font-mono text-[10px]"
              >
                <span>{tag}</span>
                <button
                  onClick={() => removeTagFromBucket('activationRequiredTags', tag)}
                  className="hover:text-red-400"
                >
                  <LuX className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Blocked Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-zinc-300 font-medium">
            <span className="text-red-400 font-mono">2. Activation Blocked Tags</span>
            <span className="text-[10px] text-zinc-500 font-mono">({policy.activationBlockedTags.length})</span>
          </div>
          <p className="text-[10px] text-zinc-500">Ability is suppressed if Actor possesses any of these tags.</p>
          <div className="flex flex-wrap gap-1.5 min-h-[60px] p-2 bg-zinc-950/40 rounded border border-zinc-800/80">
            {policy.activationBlockedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-red-500/10 text-red-300 border border-red-500/30 font-mono text-[10px]"
              >
                <span>{tag}</span>
                <button
                  onClick={() => removeTagFromBucket('activationBlockedTags', tag)}
                  className="hover:text-red-400"
                >
                  <LuX className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>

        {/* Granted Tags */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-zinc-300 font-medium">
            <span className="text-cyan-400 font-mono">3. Source Granted Tags</span>
            <span className="text-[10px] text-zinc-500 font-mono">({policy.sourceGrantedTags.length})</span>
          </div>
          <p className="text-[10px] text-zinc-500">Tags applied to the activating Avatar while ability is active.</p>
          <div className="flex flex-wrap gap-1.5 min-h-[60px] p-2 bg-zinc-950/40 rounded border border-zinc-800/80">
            {policy.sourceGrantedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center space-x-1 px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/30 font-mono text-[10px]"
              >
                <span>{tag}</span>
                <button
                  onClick={() => removeTagFromBucket('sourceGrantedTags', tag)}
                  className="hover:text-red-400"
                >
                  <LuX className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
