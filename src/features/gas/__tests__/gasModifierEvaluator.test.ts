import { describe, it, expect } from 'vitest';
import { 
  evaluateModifier, 
  applyAttributeModifiers, 
  calculateDamageWithArmor, 
  calculateShieldAbsorption, 
  clampAttributeValue, 
  validateTagPolicy, 
  canActivateAbility, 
  applySourceGrantedTags, 
  isValidGameplayTag 
} from '../utils/gasModifierEvaluator';
import { AttributeModifier, GameplayTagPolicyMatrix } from '../types/gasTypes';
import { STANDARD_ATTRIBUTES } from '../data/gasCatalog';

describe('GASStudio: Modifier Math & Execution Calculations', () => {
  describe('evaluateModifier', () => {
    it('should correctly evaluate Add operation', () => {
      expect(evaluateModifier(100, 'Add', 25)).toBe(125);
      expect(evaluateModifier(100, 'Add', -30)).toBe(70);
    });

    it('should correctly evaluate Multiply operation', () => {
      expect(evaluateModifier(100, 'Multiply', 1.5)).toBe(150);
      expect(evaluateModifier(200, 'Multiply', 0.5)).toBe(100);
    });

    it('should correctly evaluate Divide operation and protect against divide-by-zero', () => {
      expect(evaluateModifier(100, 'Divide', 2)).toBe(50);
      // Guard against division by zero returns base value safely
      expect(evaluateModifier(100, 'Divide', 0)).toBe(100);
    });

    it('should correctly evaluate Override operation', () => {
      expect(evaluateModifier(100, 'Override', 999)).toBe(999);
      expect(evaluateModifier(50, 'Override', 0)).toBe(0);
    });
  });

  describe('applyAttributeModifiers canonical ordering', () => {
    it('should evaluate modifiers in standard GAS order: Add -> Multiply -> Divide -> Override', () => {
      // Regardless of array order, canonical GAS order evaluates Add then Multiply
      const mods: AttributeModifier[] = [
        { attribute: 'Health', modifierOp: 'Multiply', magnitude: 2.0 },
        { attribute: 'Health', modifierOp: 'Add', magnitude: 50 },
      ];
      // (100 + 50) * 2 = 300
      expect(applyAttributeModifiers(100, mods)).toBe(300);
    });

    it('should let Override modifier take absolute precedence over previous operations', () => {
      const mods: AttributeModifier[] = [
        { attribute: 'Health', modifierOp: 'Add', magnitude: 100 },
        { attribute: 'Health', modifierOp: 'Multiply', magnitude: 3.0 },
        { attribute: 'Health', modifierOp: 'Override', magnitude: 42 },
      ];
      expect(applyAttributeModifiers(100, mods)).toBe(42);
    });

    it('should return baseValue unchanged if modifier array is empty', () => {
      expect(applyAttributeModifiers(100, [])).toBe(100);
    });
  });

  describe('calculateDamageWithArmor mitigation formula', () => {
    it('should compute net damage with diminishing returns formula: 100 / (100 + Armor)', () => {
      // 100 damage against 100 armor = 100 * (100 / 200) = 50 damage (50% reduction)
      const res1 = calculateDamageWithArmor(100, 100);
      expect(res1.netDamage).toBe(50);
      expect(res1.reductionPercent).toBe(50);

      // 100 damage against 0 armor = 100 damage (0% reduction)
      const res0 = calculateDamageWithArmor(100, 0);
      expect(res0.netDamage).toBe(100);
      expect(res0.reductionPercent).toBe(0);

      // 100 damage against 300 armor = 100 * (100 / 400) = 25 damage (75% reduction)
      const res300 = calculateDamageWithArmor(100, 300);
      expect(res300.netDamage).toBe(25);
      expect(res300.reductionPercent).toBe(75);
    });

    it('should clamp incoming negative or zero damage cleanly to 0', () => {
      expect(calculateDamageWithArmor(0, 50)).toEqual({ netDamage: 0, reductionPercent: 0 });
      expect(calculateDamageWithArmor(-20, 50)).toEqual({ netDamage: 0, reductionPercent: 0 });
    });
  });

  describe('calculateShieldAbsorption barrier calculation', () => {
    it('should absorb incoming damage up to available shield', () => {
      // 40 damage against 100 shield: absorbed 40, 0 remaining, new shield 60
      const res = calculateShieldAbsorption(40, 100);
      expect(res.absorbedDamage).toBe(40);
      expect(res.remainingDamage).toBe(0);
      expect(res.newShield).toBe(60);
    });

    it('should spill excess damage to health when shield is depleted', () => {
      // 120 damage against 50 shield: absorbed 50, remaining 70, new shield 0
      const res = calculateShieldAbsorption(120, 50);
      expect(res.absorbedDamage).toBe(50);
      expect(res.remainingDamage).toBe(70);
      expect(res.newShield).toBe(0);
    });
  });

  describe('clampAttributeValue boundaries', () => {
    it('should clamp health between 0 and 100', () => {
      expect(clampAttributeValue('Health', 150, STANDARD_ATTRIBUTES)).toBe(100);
      expect(clampAttributeValue('Health', -20, STANDARD_ATTRIBUTES)).toBe(0);
      expect(clampAttributeValue('Health', 65, STANDARD_ATTRIBUTES)).toBe(65);
    });

    it('should clamp movement speed between 100 and 2000', () => {
      expect(clampAttributeValue('MovementSpeed', 50, STANDARD_ATTRIBUTES)).toBe(100);
      expect(clampAttributeValue('MovementSpeed', 2500, STANDARD_ATTRIBUTES)).toBe(2000);
      expect(clampAttributeValue('MovementSpeed', 850, STANDARD_ATTRIBUTES)).toBe(850);
    });
  });

  describe('validateTagPolicy & canActivateAbility', () => {
    it('should detect fatal conflicts where a tag is both Required and Blocked', () => {
      const policy: GameplayTagPolicyMatrix = {
        activationRequiredTags: ['State.Grounded', 'State.Stunned'],
        activationBlockedTags: ['State.Stunned', 'State.Dead'],
        sourceGrantedTags: [],
        targetTags: [],
      };
      const check = validateTagPolicy(policy);
      expect(check.isValid).toBe(false);
      expect(check.conflicts.length).toBe(1);
      expect(check.fatalTagOverlap).toContain('State.Stunned');
    });

    it('should confirm valid policy when Required and Blocked tag containers are disjoint', () => {
      const policy: GameplayTagPolicyMatrix = {
        activationRequiredTags: ['State.Grounded'],
        activationBlockedTags: ['State.Stunned', 'State.Dead'],
        sourceGrantedTags: ['State.Invulnerable'],
        targetTags: [],
      };
      const check = validateTagPolicy(policy);
      expect(check.isValid).toBe(true);
      expect(check.conflicts).toEqual([]);
      expect(check.fatalTagOverlap).toEqual([]);
    });

    it('should verify canActivate requires all required tags and no blocked tags', () => {
      const policy: GameplayTagPolicyMatrix = {
        activationRequiredTags: ['State.Grounded', 'State.Interacting'],
        activationBlockedTags: ['State.Stunned'],
        sourceGrantedTags: [],
        targetTags: [],
      };

      // Missing State.Interacting
      const eval1 = canActivateAbility(['State.Grounded'], policy);
      expect(eval1.canActivate).toBe(false);
      expect(eval1.missingRequired).toContain('State.Interacting');

      // Possesses blocked tag
      const eval2 = canActivateAbility(['State.Grounded', 'State.Interacting', 'State.Stunned'], policy);
      expect(eval2.canActivate).toBe(false);
      expect(eval2.activeBlocked).toContain('State.Stunned');

      // Valid
      const eval3 = canActivateAbility(['State.Grounded', 'State.Interacting'], policy);
      expect(eval3.canActivate).toBe(true);
      expect(eval3.missingRequired).toEqual([]);
      expect(eval3.activeBlocked).toEqual([]);
    });

    it('should correctly accumulate source granted tags onto actor tag set', () => {
      const policy: GameplayTagPolicyMatrix = {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: ['State.Dodging', 'State.Invulnerable'],
        targetTags: [],
      };

      const result = applySourceGrantedTags(['State.Grounded'], policy);
      expect(result).toContain('State.Grounded');
      expect(result).toContain('State.Dodging');
      expect(result).toContain('State.Invulnerable');
    });
  });

  describe('isValidGameplayTag hierarchy validator', () => {
    it('should accept valid multi-level hierarchical gameplay tags', () => {
      expect(isValidGameplayTag('State.Combat.Stunned')).toBe(true);
      expect(isValidGameplayTag('Ability.Melee.Combo1')).toBe(true);
      expect(isValidGameplayTag('GameplayCue.FX.HitSpark')).toBe(true);
      expect(isValidGameplayTag('State.Grounded')).toBe(true);
    });

    it('should reject single-token, empty, or improperly formatted tags', () => {
      expect(isValidGameplayTag('')).toBe(false);
      expect(isValidGameplayTag('SingleToken')).toBe(false);
      expect(isValidGameplayTag('State.')).toBe(false);
      expect(isValidGameplayTag('.State')).toBe(false);
      expect(isValidGameplayTag('State..Grounded')).toBe(false);
    });
  });
});

