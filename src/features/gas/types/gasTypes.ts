export type GameplayTag = string;

export type AbilityInstancingPolicy = 
  | 'InstancedPerActor'
  | 'InstancedPerExecution'
  | 'NonInstanced';

export type AbilityNetExecutionPolicy = 
  | 'LocalPredicted'
  | 'LocalOnly'
  | 'ServerOnly'
  | 'ServerInitiated';

export type EffectDurationPolicy = 
  | 'Instant'
  | 'Infinite'
  | 'HasDuration';

export type AttributeModifierOp = 
  | 'Add'
  | 'Multiply'
  | 'Divide'
  | 'Override';

export type StandardAttributeName = 
  | 'Health'
  | 'MaxHealth'
  | 'Stamina'
  | 'MaxStamina'
  | 'Mana'
  | 'MaxMana'
  | 'Shield'
  | 'MovementSpeed'
  | 'AttackPower'
  | 'Armor';

export interface AttributeModifier {
  attribute: StandardAttributeName;
  modifierOp: AttributeModifierOp;
  magnitude: number;
}

export interface GameplayEffectDefinition {
  id: string;
  effectName: string;
  durationPolicy: EffectDurationPolicy;
  durationMagnitude: number;
  modifiers: AttributeModifier[];
  grantedTags: GameplayTag[];
  description?: string;
}

export interface GameplayTagPolicyMatrix {
  activationRequiredTags: GameplayTag[];
  activationBlockedTags: GameplayTag[];
  sourceGrantedTags: GameplayTag[];
  targetTags: GameplayTag[];
}

export interface GameplayAbilityDefinition {
  abilityName: string;
  instancingPolicy: AbilityInstancingPolicy;
  netExecutionPolicy: AbilityNetExecutionPolicy;
  tagPolicy: GameplayTagPolicyMatrix;
  costEffect?: GameplayEffectDefinition;
  cooldownEffect?: GameplayEffectDefinition;
  activeMontage?: string;
  activeTask?: AbilityTaskType;
  taskDelayTime?: number;
  taskEventTag?: GameplayTag;
}

export type AbilityTaskType = 
  | 'PlayMontageAndWait'
  | 'WaitDelay'
  | 'WaitGameplayEvent'
  | 'WaitTargetData';

export interface AbilityTaskPin {
  name: string;
  type: string;
  direction: 'input' | 'output';
  defaultValue?: string | number | boolean;
  isExec?: boolean;
}

export interface AbilityTaskDefinition {
  id: string;
  taskType: AbilityTaskType;
  title: string;
  category: string;
  ueProxyClass: string;
  proxyFactoryFunction: string;
  description: string;
  inputs: AbilityTaskPin[];
  outputs: AbilityTaskPin[];
}

export interface ExecutionCalculationFormula {
  id: string;
  name: string;
  description: string;
  calculationClass: string;
  formula: string;
}

export interface AttributeDefinition {
  name: StandardAttributeName;
  defaultValue: number;
  minValue: number;
  maxValue: number;
  isReplicated: boolean;
  category: string;
  description: string;
}

