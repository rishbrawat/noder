import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToString } from 'react-dom/server';
import { GameplayTagMatrix } from '../components/GameplayTagMatrix';
import { GameplayTagPolicyMatrix, GameplayTag } from '../types/gasTypes';
import { 
  STANDARD_GAMEPLAY_TAGS, 
  PRESET_ABILITY_DODGE,
  PRESET_ABILITY_CHARGED_BLAST,
  PRESET_ABILITY_PARRY,
  PRESET_ABILITY_TELEPORT,
  GAS_ABILITY_TASKS,
  STANDARD_EXECUTION_CALCULATIONS
} from '../data/gasCatalog';

describe('GASStudio: Gameplay Tag Topology & Policy Matrix', () => {
  it('should enforce hierarchical [Domain].[Subdomain].[Leaf] format across all standard tags', () => {
    const tagRegex = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;
    expect(STANDARD_GAMEPLAY_TAGS.length).toBeGreaterThan(10);
    
    STANDARD_GAMEPLAY_TAGS.forEach((tag) => {
      expect(tag).toMatch(tagRegex);
      const segments = tag.split('.');
      expect(segments.length).toBeGreaterThanOrEqual(2);
      expect(['State', 'Ability', 'GameplayCue']).toContain(segments[0]);
    });
  });

  it('should validate PRESET_ABILITY_DODGE tag policy as conflict-free', () => {
    const policy = PRESET_ABILITY_DODGE.tagPolicy;
    const intersection = policy.activationRequiredTags.filter((tag) =>
      policy.activationBlockedTags.includes(tag)
    );
    expect(intersection).toEqual([]);

    const html = renderToString(
      React.createElement(GameplayTagMatrix, {
        policy,
        onChangePolicy: vi.fn(),
      })
    );
    expect(html).toContain('Policy Valid');
    expect(html).not.toContain('Conflict(s)');
  });

  it('should detect and flag fatal conflict when a tag is simultaneously Required and Blocked', () => {
    const conflictingPolicy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded', 'State.Combat.Stunned'],
      activationBlockedTags: ['State.Combat.Stunned', 'State.Dead'],
      sourceGrantedTags: ['State.Invulnerable'],
      targetTags: [],
    };

    const html = renderToString(
      React.createElement(GameplayTagMatrix, {
        policy: conflictingPolicy,
        onChangePolicy: vi.fn(),
      })
    );

    expect(html).toContain('1<!-- --> Conflict(s)');
    expect(html).toContain('Fatal Conflict: &quot;State.Combat.Stunned&quot; cannot be simultaneously Required and Blocked.');
    expect(html).not.toContain('Policy Valid');
  });

  it('should detect multiple simultaneous conflicts between Required and Blocked containers', () => {
    const multiConflictPolicy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded', 'State.Stunned', 'State.Dead'],
      activationBlockedTags: ['State.Stunned', 'State.Dead', 'Ability.Cooldown.Dodge'],
      sourceGrantedTags: [],
      targetTags: [],
    };

    const html = renderToString(
      React.createElement(GameplayTagMatrix, {
        policy: multiConflictPolicy,
        onChangePolicy: vi.fn(),
      })
    );

    expect(html).toContain('2<!-- --> Conflict(s)');
    expect(html).toContain('Fatal Conflict: &quot;State.Stunned&quot; cannot be simultaneously Required and Blocked.');
    expect(html).toContain('Fatal Conflict: &quot;State.Dead&quot; cannot be simultaneously Required and Blocked.');
  });

  it('should evaluate activation condition: actor must possess all required tags', () => {
    const policy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded', 'State.Interacting'],
      activationBlockedTags: ['State.Stunned'],
      sourceGrantedTags: [],
      targetTags: [],
    };

    const evaluateCanActivate = (actorTags: GameplayTag[]): boolean => {
      const hasAllRequired = policy.activationRequiredTags.every((req) => actorTags.includes(req));
      const hasNoBlocked = !policy.activationBlockedTags.some((blk) => actorTags.includes(blk));
      return hasAllRequired && hasNoBlocked;
    };

    // Missing 'State.Interacting'
    expect(evaluateCanActivate(['State.Grounded'])).toBe(false);

    // Has both required tags and no blocked tags
    expect(evaluateCanActivate(['State.Grounded', 'State.Interacting'])).toBe(true);
  });

  it('should evaluate activation suppression: actor possessing any blocked tag is denied', () => {
    const policy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded'],
      activationBlockedTags: ['State.Stunned', 'State.Dead'],
      sourceGrantedTags: [],
      targetTags: [],
    };

    const evaluateCanActivate = (actorTags: GameplayTag[]): boolean => {
      const hasAllRequired = policy.activationRequiredTags.every((req) => actorTags.includes(req));
      const hasNoBlocked = !policy.activationBlockedTags.some((blk) => actorTags.includes(blk));
      return hasAllRequired && hasNoBlocked;
    };

    // Has required tag but also has blocked tag 'State.Stunned'
    expect(evaluateCanActivate(['State.Grounded', 'State.Stunned'])).toBe(false);

    // Has required tag and unrelated tag
    expect(evaluateCanActivate(['State.Grounded', 'Ability.Melee.Combo1'])).toBe(true);
  });

  it('should apply source granted tags upon ability activation to actor tag container', () => {
    const policy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded'],
      activationBlockedTags: ['State.Stunned'],
      sourceGrantedTags: ['State.Invulnerable', 'State.Dodging'],
      targetTags: [],
    };

    const applyGrantedTags = (actorTags: Set<GameplayTag>): Set<GameplayTag> => {
      const updated = new Set(actorTags);
      policy.sourceGrantedTags.forEach((tag) => updated.add(tag));
      return updated;
    };

    const initialActorTags = new Set<GameplayTag>(['State.Grounded']);
    const updatedTags = applyGrantedTags(initialActorTags);

    expect(updatedTags.has('State.Invulnerable')).toBe(true);
    expect(updatedTags.has('State.Dodging')).toBe(true);
    expect(updatedTags.has('State.Grounded')).toBe(true);
  });

  it('should render all three matrix buckets (Required, Blocked, Granted) in the DOM', () => {
    const policy: GameplayTagPolicyMatrix = {
      activationRequiredTags: ['State.Grounded'],
      activationBlockedTags: ['State.Stunned'],
      sourceGrantedTags: ['State.Dodging'],
      targetTags: [],
    };

    const html = renderToString(
      React.createElement(GameplayTagMatrix, {
        policy,
        onChangePolicy: vi.fn(),
      })
    );

    expect(html).toContain('1. Activation Required Tags');
    expect(html).toContain('2. Activation Blocked Tags');
    expect(html).toContain('3. Source Granted Tags');
    expect(html).toContain('State.Grounded');
    expect(html).toContain('State.Stunned');
    expect(html).toContain('State.Dodging');
  });

  it('should render custom tag input and quick add action buttons', () => {
    const policy: GameplayTagPolicyMatrix = {
      activationRequiredTags: [],
      activationBlockedTags: [],
      sourceGrantedTags: [],
      targetTags: [],
    };

    const html = renderToString(
      React.createElement(GameplayTagMatrix, {
        policy,
        onChangePolicy: vi.fn(),
      })
    );

    expect(html).toContain('New custom tag: Domain.Subdomain.Leaf');
    expect(html).toContain('+ Required');
    expect(html).toContain('+ Blocked');
    expect(html).toContain('+ Granted');
  });

  it('should validate all standard ability presets are conflict-free', () => {
    const presets = [
      PRESET_ABILITY_DODGE,
      PRESET_ABILITY_CHARGED_BLAST,
      PRESET_ABILITY_PARRY,
      PRESET_ABILITY_TELEPORT,
    ];

    presets.forEach((preset) => {
      const p = preset.tagPolicy;
      const conflicts = p.activationRequiredTags.filter((t) => p.activationBlockedTags.includes(t));
      expect(conflicts).toEqual([]);
      expect(preset.abilityName).toBeDefined();
      expect(preset.instancingPolicy).toBeDefined();
      expect(preset.netExecutionPolicy).toBeDefined();
    });
  });

  it('should verify GAS_ABILITY_TASKS catalog registers all 4 standard tasks with valid UE proxy classes', () => {
    expect(GAS_ABILITY_TASKS.length).toBe(4);
    const taskTypes = GAS_ABILITY_TASKS.map((t) => t.taskType);
    expect(taskTypes).toContain('PlayMontageAndWait');
    expect(taskTypes).toContain('WaitDelay');
    expect(taskTypes).toContain('WaitGameplayEvent');
    expect(taskTypes).toContain('WaitTargetData');

    GAS_ABILITY_TASKS.forEach((task) => {
      expect(task.ueProxyClass).toContain('/Script/GameplayAbilities.AbilityTask_');
      expect(task.proxyFactoryFunction).toBeDefined();
      expect(task.inputs.some((pin) => pin.isExec)).toBe(true);
      expect(task.outputs.some((pin) => pin.isExec)).toBe(true);
    });
  });

  it('should verify STANDARD_EXECUTION_CALCULATIONS catalog contains armor and shield calculations', () => {
    expect(STANDARD_EXECUTION_CALCULATIONS.length).toBeGreaterThanOrEqual(2);
    const ids = STANDARD_EXECUTION_CALCULATIONS.map((c) => c.id);
    expect(ids).toContain('calc_armor_mitigation');
    expect(ids).toContain('calc_shield_absorption');
  });
});
