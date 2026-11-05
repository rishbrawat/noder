import { 
  GameplayTag, 
  AttributeDefinition, 
  GameplayEffectDefinition, 
  GameplayAbilityDefinition,
  AbilityTaskDefinition,
  ExecutionCalculationFormula
} from '../types/gasTypes';

export const STANDARD_GAMEPLAY_TAGS: GameplayTag[] = [
  // States
  'State.Grounded',
  'State.Airborne',
  'State.Dodging',
  'State.Attacking',
  'State.Stunned',
  'State.Dead',
  'State.Invulnerable',
  'State.Interacting',

  // Abilities & Cooldowns
  'Ability.Cooldown.Dodge',
  'Ability.Cooldown.Fireball',
  'Ability.Cooldown.Ultimate',
  'Ability.Melee.Combo1',
  'Ability.Melee.Combo2',
  'Ability.Melee.Heavy',
  'Ability.Ranged.Fireball',

  // Visual & Audio Cues
  'GameplayCue.FX.HitSpark',
  'GameplayCue.FX.MuzzleFlash',
  'GameplayCue.Audio.Explosion',
  'GameplayCue.Audio.HealChime',
];

export const STANDARD_ATTRIBUTES: AttributeDefinition[] = [
  {
    name: 'Health',
    defaultValue: 100,
    minValue: 0,
    maxValue: 100,
    isReplicated: true,
    category: 'Vitals',
    description: 'Current vitality. Death occurs at 0.',
  },
  {
    name: 'MaxHealth',
    defaultValue: 100,
    minValue: 1,
    maxValue: 9999,
    isReplicated: true,
    category: 'Vitals',
    description: 'Upper boundary for Health healing.',
  },
  {
    name: 'Stamina',
    defaultValue: 100,
    minValue: 0,
    maxValue: 100,
    isReplicated: true,
    category: 'Vitals',
    description: 'Energy consumed by sprint, dodge rolls, and melee swings.',
  },
  {
    name: 'MaxStamina',
    defaultValue: 100,
    minValue: 1,
    maxValue: 999,
    isReplicated: true,
    category: 'Vitals',
    description: 'Upper boundary for Stamina replenishment.',
  },
  {
    name: 'Mana',
    defaultValue: 100,
    minValue: 0,
    maxValue: 100,
    isReplicated: true,
    category: 'Vitals',
    description: 'Resource spent on magical spells and abilities.',
  },
  {
    name: 'Shield',
    defaultValue: 50,
    minValue: 0,
    maxValue: 200,
    isReplicated: true,
    category: 'Defense',
    description: 'Ablative barrier absorbing damage before health depletion.',
  },
  {
    name: 'MovementSpeed',
    defaultValue: 600,
    minValue: 100,
    maxValue: 2000,
    isReplicated: true,
    category: 'Mobility',
    description: 'Base walk and sprint velocity in UE units/second.',
  },
  {
    name: 'Armor',
    defaultValue: 25,
    minValue: 0,
    maxValue: 500,
    isReplicated: true,
    category: 'Defense',
    description: 'Flat or percentage physical damage reduction.',
  },
];

export const PRESET_GAMEPLAY_EFFECTS: GameplayEffectDefinition[] = [
  {
    id: 'ge_dodge_cost',
    effectName: 'GE_DodgeCost',
    durationPolicy: 'Instant',
    durationMagnitude: 0,
    modifiers: [
      { attribute: 'Stamina', modifierOp: 'Add', magnitude: -25.0 }
    ],
    grantedTags: [],
    description: 'Instantly deducts 25 Stamina to execute a dodge roll.'
  },
  {
    id: 'ge_dodge_cooldown',
    effectName: 'GE_DodgeCooldown',
    durationPolicy: 'HasDuration',
    durationMagnitude: 1.5,
    modifiers: [],
    grantedTags: ['Ability.Cooldown.Dodge'],
    description: 'Prevents dodge roll reuse for 1.5s.'
  },
  {
    id: 'ge_fireball_damage',
    effectName: 'GE_FireballDamage',
    durationPolicy: 'Instant',
    durationMagnitude: 0,
    modifiers: [
      { attribute: 'Health', modifierOp: 'Add', magnitude: -45.0 }
    ],
    grantedTags: ['GameplayCue.FX.HitSpark'],
    description: 'Deals 45 fire damage instantly to target.'
  },
  {
    id: 'ge_speed_buff',
    effectName: 'GE_SpeedBuff_10s',
    durationPolicy: 'HasDuration',
    durationMagnitude: 10.0,
    modifiers: [
      { attribute: 'MovementSpeed', modifierOp: 'Multiply', magnitude: 1.35 }
    ],
    grantedTags: [],
    description: 'Boosts movement speed by +35% for 10 seconds.'
  }
];

export const PRESET_ABILITY_DODGE: GameplayAbilityDefinition = {
  abilityName: 'GA_DodgeRoll',
  instancingPolicy: 'InstancedPerActor',
  netExecutionPolicy: 'LocalPredicted',
  activeMontage: 'AM_DodgeRoll',
  activeTask: 'PlayMontageAndWait',
  tagPolicy: {
    activationRequiredTags: ['State.Grounded'],
    activationBlockedTags: ['State.Stunned', 'State.Dead', 'Ability.Cooldown.Dodge'],
    sourceGrantedTags: ['State.Invulnerable', 'State.Dodging'],
    targetTags: []
  },
  costEffect: PRESET_GAMEPLAY_EFFECTS[0],
  cooldownEffect: PRESET_GAMEPLAY_EFFECTS[1]
};

export const PRESET_ABILITY_CHARGED_BLAST: GameplayAbilityDefinition = {
  abilityName: 'GA_ChargedBlast',
  instancingPolicy: 'InstancedPerExecution',
  netExecutionPolicy: 'ServerInitiated',
  activeTask: 'WaitDelay',
  taskDelayTime: 1.5,
  tagPolicy: {
    activationRequiredTags: ['State.Grounded'],
    activationBlockedTags: ['State.Stunned', 'State.Dead'],
    sourceGrantedTags: ['State.Attacking'],
    targetTags: []
  },
  costEffect: PRESET_GAMEPLAY_EFFECTS[0],
  cooldownEffect: PRESET_GAMEPLAY_EFFECTS[2]
};

export const PRESET_ABILITY_PARRY: GameplayAbilityDefinition = {
  abilityName: 'GA_ParryCounter',
  instancingPolicy: 'InstancedPerActor',
  netExecutionPolicy: 'LocalPredicted',
  activeTask: 'WaitGameplayEvent',
  taskEventTag: 'State.Combat',
  tagPolicy: {
    activationRequiredTags: ['State.Grounded'],
    activationBlockedTags: ['State.Stunned', 'State.Dead'],
    sourceGrantedTags: ['State.Invulnerable'],
    targetTags: []
  }
};

export const PRESET_ABILITY_TELEPORT: GameplayAbilityDefinition = {
  abilityName: 'GA_TargetedTeleport',
  instancingPolicy: 'InstancedPerExecution',
  netExecutionPolicy: 'LocalPredicted',
  activeTask: 'WaitTargetData',
  tagPolicy: {
    activationRequiredTags: ['State.Grounded'],
    activationBlockedTags: ['State.Stunned', 'State.Dead'],
    sourceGrantedTags: ['State.Invulnerable'],
    targetTags: []
  }
};

export const GAS_ABILITY_TASKS: AbilityTaskDefinition[] = [
  {
    id: 'gas_task_play_montage_and_wait',
    taskType: 'PlayMontageAndWait',
    title: 'Play Montage And Wait',
    category: 'Animation',
    ueProxyClass: '/Script/GameplayAbilities.AbilityTask_PlayMontageAndWait',
    proxyFactoryFunction: 'CreatePlayMontageAndWaitProxy',
    description: 'Animates the Avatar skeletal mesh with an AnimMontage and provides completion, interrupt, and cancellation delegates.',
    inputs: [
      { name: 'execute', type: 'exec', direction: 'input', isExec: true },
      { name: 'MontageToPlay', type: 'AnimMontage', direction: 'input', defaultValue: 'AM_DodgeRoll' },
      { name: 'Rate', type: 'float', direction: 'input', defaultValue: 1.0 },
      { name: 'StartSection', type: 'name', direction: 'input', defaultValue: 'None' },
      { name: 'bStopWhenAbilityEnds', type: 'bool', direction: 'input', defaultValue: true },
      { name: 'AnimRootMotionTranslationScale', type: 'float', direction: 'input', defaultValue: 1.0 }
    ],
    outputs: [
      { name: 'OnCompleted', type: 'exec', direction: 'output', isExec: true },
      { name: 'OnBlendOut', type: 'exec', direction: 'output', isExec: true },
      { name: 'OnInterrupted', type: 'exec', direction: 'output', isExec: true },
      { name: 'OnCancelled', type: 'exec', direction: 'output', isExec: true }
    ]
  },
  {
    id: 'gas_task_wait_delay',
    taskType: 'WaitDelay',
    title: 'Wait Delay',
    category: 'Flow Control',
    ueProxyClass: '/Script/GameplayAbilities.AbilityTask_WaitDelay',
    proxyFactoryFunction: 'WaitDelay',
    description: 'Latent asynchronous timer task that delays execution before resuming or ending ability.',
    inputs: [
      { name: 'execute', type: 'exec', direction: 'input', isExec: true },
      { name: 'Time', type: 'float', direction: 'input', defaultValue: 1.0 }
    ],
    outputs: [
      { name: 'OnFinish', type: 'exec', direction: 'output', isExec: true }
    ]
  },
  {
    id: 'gas_task_wait_gameplay_event',
    taskType: 'WaitGameplayEvent',
    title: 'Wait Gameplay Event',
    category: 'Events',
    ueProxyClass: '/Script/GameplayAbilities.AbilityTask_WaitGameplayEvent',
    proxyFactoryFunction: 'WaitGameplayEvent',
    description: 'Waits asynchronously for a matching Gameplay Tag event trigger with payload data.',
    inputs: [
      { name: 'execute', type: 'exec', direction: 'input', isExec: true },
      { name: 'EventTag', type: 'FGameplayTag', direction: 'input', defaultValue: 'State.Combat' },
      { name: 'OnlyTriggerOnce', type: 'bool', direction: 'input', defaultValue: false },
      { name: 'OnlyMatchExact', type: 'bool', direction: 'input', defaultValue: true }
    ],
    outputs: [
      { name: 'EventReceived', type: 'exec', direction: 'output', isExec: true },
      { name: 'Payload', type: 'FGameplayEventData', direction: 'output', isExec: false }
    ]
  },
  {
    id: 'gas_task_wait_target_data',
    taskType: 'WaitTargetData',
    title: 'Wait Target Data',
    category: 'Targeting',
    ueProxyClass: '/Script/GameplayAbilities.AbilityTask_WaitTargetData',
    proxyFactoryFunction: 'WaitTargetData',
    description: 'Waits for player targeting confirmation or actor cursor selection before proceeding.',
    inputs: [
      { name: 'execute', type: 'exec', direction: 'input', isExec: true },
      { name: 'ConfirmationType', type: 'EGameplayTargetingConfirmation', direction: 'input', defaultValue: 'Instant' }
    ],
    outputs: [
      { name: 'ValidData', type: 'exec', direction: 'output', isExec: true },
      { name: 'Cancelled', type: 'exec', direction: 'output', isExec: true },
      { name: 'Data', type: 'FGameplayAbilityTargetDataHandle', direction: 'output', isExec: false }
    ]
  }
];

export const STANDARD_EXECUTION_CALCULATIONS: ExecutionCalculationFormula[] = [
  {
    id: 'calc_armor_mitigation',
    name: 'Armor Damage Mitigation',
    description: 'Standard diminishing returns armor mitigation formula.',
    calculationClass: 'UExecutionCalculation_ArmorMitigation',
    formula: 'NetDamage = IncomingDamage * (100.0 / (100.0 + Armor))'
  },
  {
    id: 'calc_shield_absorption',
    name: 'Shield Barrier Absorption',
    description: 'Absorbs incoming damage up to current shield capacity before spilling to health.',
    calculationClass: 'UExecutionCalculation_ShieldAbsorption',
    formula: 'Absorbed = Min(IncomingDamage, Shield); RemainingDamage = IncomingDamage - Absorbed'
  }
];

