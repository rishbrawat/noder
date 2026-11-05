import { 
  AttributeModifierOp, 
  AttributeModifier, 
  GameplayTag, 
  GameplayTagPolicyMatrix, 
  StandardAttributeName, 
  AttributeDefinition 
} from '../types/gasTypes';
import { STANDARD_ATTRIBUTES } from '../data/gasCatalog';

/**
 * Evaluates a single attribute modifier operation according to Unreal Engine GAS mathematics.
 * - Add: V_new = V_base + M
 * - Multiply: V_new = V_base * M
 * - Divide: V_new = V_base / M (M != 0)
 * - Override: V_new = M
 */
export function evaluateModifier(baseValue: number, op: AttributeModifierOp, magnitude: number): number {
  switch (op) {
    case 'Add':
      return baseValue + magnitude;
    case 'Multiply':
      return baseValue * magnitude;
    case 'Divide':
      if (magnitude === 0) {
        // Guard against division by zero; preserves base value in accordance with robust runtime constraints
        return baseValue;
      }
      return baseValue / magnitude;
    case 'Override':
      return magnitude;
    default:
      return baseValue;
  }
}

/**
 * Applies an array of attribute modifiers following Unreal Engine's standard modifier evaluation order:
 * 1. Add (flat additions / subtractions)
 * 2. Multiply (percentage scalers)
 * 3. Divide (division scalers)
 * 4. Override (absolute override)
 */
export function applyAttributeModifiers(baseValue: number, modifiers: AttributeModifier[]): number {
  if (!modifiers || modifiers.length === 0) {
    return baseValue;
  }

  // Canonical GAS evaluation order
  const addMods = modifiers.filter((m) => m.modifierOp === 'Add');
  const mulMods = modifiers.filter((m) => m.modifierOp === 'Multiply');
  const divMods = modifiers.filter((m) => m.modifierOp === 'Divide');
  const ovrMods = modifiers.filter((m) => m.modifierOp === 'Override');

  let current = baseValue;

  for (const mod of addMods) {
    current = evaluateModifier(current, 'Add', mod.magnitude);
  }
  for (const mod of mulMods) {
    current = evaluateModifier(current, 'Multiply', mod.magnitude);
  }
  for (const mod of divMods) {
    current = evaluateModifier(current, 'Divide', mod.magnitude);
  }
  for (const mod of ovrMods) {
    current = evaluateModifier(current, 'Override', mod.magnitude);
  }

  return current;
}

/**
 * Calculates net damage through armor mitigation formula:
 * NetDamage = IncomingDamage * (100 / (100 + max(-99, Armor)))
 */
export function calculateDamageWithArmor(
  incomingDamage: number,
  armor: number
): { netDamage: number; reductionPercent: number } {
  if (incomingDamage <= 0) {
    return { netDamage: 0, reductionPercent: 0 };
  }

  const safeArmor = Math.max(-99, armor);
  const damageFactor = 100 / (100 + safeArmor);
  const netDamage = Math.max(0, incomingDamage * damageFactor);
  const reductionPercent = Math.max(0, Math.min(100, (1 - damageFactor) * 100));

  return {
    netDamage: Math.round(netDamage * 100) / 100,
    reductionPercent: Math.round(reductionPercent * 10) / 10,
  };
}

/**
 * Calculates shield absorption against incoming damage:
 * Absorbed = Min(Damage, Shield); Remaining = Damage - Absorbed
 */
export function calculateShieldAbsorption(
  incomingDamage: number,
  currentShield: number
): { remainingDamage: number; absorbedDamage: number; newShield: number } {
  const safeDamage = Math.max(0, incomingDamage);
  const safeShield = Math.max(0, currentShield);

  const absorbed = Math.min(safeDamage, safeShield);
  const remaining = safeDamage - absorbed;
  const newShield = safeShield - absorbed;

  return {
    remainingDamage: Math.round(remaining * 100) / 100,
    absorbedDamage: Math.round(absorbed * 100) / 100,
    newShield: Math.round(newShield * 100) / 100,
  };
}

/**
 * Clamps an attribute value between its configured minimum and maximum boundaries.
 */
export function clampAttributeValue(
  attributeName: StandardAttributeName,
  value: number,
  attributes: AttributeDefinition[] = STANDARD_ATTRIBUTES
): number {
  const def = attributes.find((a) => a.name === attributeName);
  if (!def) {
    return value;
  }
  return Math.max(def.minValue, Math.min(def.maxValue, value));
}

/**
 * Validates a GameplayTagPolicyMatrix for fatal conflicts:
 * ActivationRequiredTags ∩ ActivationBlockedTags = ∅
 */
export function validateTagPolicy(policy: GameplayTagPolicyMatrix): {
  isValid: boolean;
  conflicts: string[];
  fatalTagOverlap: GameplayTag[];
} {
  const conflicts: string[] = [];
  const fatalTagOverlap: GameplayTag[] = [];

  const blockedSet = new Set(policy.activationBlockedTags);
  for (const reqTag of policy.activationRequiredTags) {
    if (blockedSet.has(reqTag)) {
      fatalTagOverlap.push(reqTag);
      conflicts.push(`Fatal Conflict: "${reqTag}" cannot be simultaneously Required and Blocked.`);
    }
  }

  return {
    isValid: conflicts.length === 0,
    conflicts,
    fatalTagOverlap,
  };
}

/**
 * Evaluates whether an Actor with given tags can activate an ability:
 * - CanActivate requires: RequiredTags ⊆ ActorTags AND BlockedTags ∩ ActorTags = ∅
 */
export function canActivateAbility(
  actorTags: GameplayTag[],
  policy: GameplayTagPolicyMatrix
): { canActivate: boolean; missingRequired: GameplayTag[]; activeBlocked: GameplayTag[] } {
  const actorSet = new Set(actorTags);
  const missingRequired = policy.activationRequiredTags.filter((tag) => !actorSet.has(tag));
  const activeBlocked = policy.activationBlockedTags.filter((tag) => actorSet.has(tag));

  const canActivate = missingRequired.length === 0 && activeBlocked.length === 0;

  return {
    canActivate,
    missingRequired,
    activeBlocked,
  };
}

/**
 * Applies source granted tags to the activating Actor's tag set.
 */
export function applySourceGrantedTags(
  actorTags: GameplayTag[],
  policy: GameplayTagPolicyMatrix
): GameplayTag[] {
  const combined = new Set(actorTags);
  policy.sourceGrantedTags.forEach((tag) => combined.add(tag));
  return Array.from(combined);
}

/**
 * Validates tag hierarchy syntax: [Domain].[Subdomain].[Leaf...]
 */
export function isValidGameplayTag(tag: string): boolean {
  if (!tag || typeof tag !== 'string') return false;
  const tagRegex = /^[A-Za-z0-9]+(\.[A-Za-z0-9]+)+$/;
  return tagRegex.test(tag.trim());
}

