import { describe, it, expect } from 'vitest';
import { AttributeDefinition, GameplayAbilityDefinition, GameplayEffectDefinition } from '../types/gasTypes';
import { 
  generateAttributeSetCpp, 
  generateGameplayAbilityCpp, 
  generateGameplayEffectCpp, 
  formatCppFloat 
} from '../utils/gasCppGenerator';

describe('GASStudio: C++ Scaffolding Generator', () => {
  const sampleAttributes: AttributeDefinition[] = [
    {
      name: 'Health',
      defaultValue: 100,
      minValue: 0,
      maxValue: 100,
      isReplicated: true,
      category: 'Vitals',
      description: 'Current health points.',
    },
    {
      name: 'Mana',
      defaultValue: 50,
      minValue: 0,
      maxValue: 200,
      isReplicated: true,
      category: 'Vitals',
      description: 'Current mana points.',
    },
    {
      name: 'MovementSpeed',
      defaultValue: 600,
      minValue: 100,
      maxValue: 1500,
      isReplicated: false, // Non-replicated for testing
      category: 'Mobility',
      description: 'Locomotion speed.',
    },
  ];

  it('should automatically prepend U prefix to class name when omitted', () => {
    const result = generateAttributeSetCpp('PlayerAttributeSet', sampleAttributes);
    expect(result.className).toBe('UPlayerAttributeSet');
    expect(result.headerFile).toContain('class YOURGAME_API UPlayerAttributeSet : public UAttributeSet');
    expect(result.headerFile).toContain('#include "PlayerAttributeSet.generated.h"');
    expect(result.sourceFile).toContain('#include "PlayerAttributeSet.h"');
    expect(result.sourceFile).toContain('UPlayerAttributeSet::UPlayerAttributeSet()');
  });

  it('should retain existing U prefix when already provided in class name', () => {
    const result = generateAttributeSetCpp('UEnemyAttributeSet', sampleAttributes);
    expect(result.className).toBe('UEnemyAttributeSet');
    expect(result.headerFile).toContain('class YOURGAME_API UEnemyAttributeSet : public UAttributeSet');
  });

  it('should define the standard ATTRIBUTE_ACCESSORS macro in generated header', () => {
    const result = generateAttributeSetCpp('BaseAttributes', sampleAttributes);
    expect(result.headerFile).toContain('#define ATTRIBUTE_ACCESSORS(ClassName, PropertyName)');
    expect(result.headerFile).toContain('GAMEPLAYATTRIBUTE_PROPERTY_GETTER(ClassName, PropertyName)');
    expect(result.headerFile).toContain('GAMEPLAYATTRIBUTE_VALUE_GETTER(PropertyName)');
    expect(result.headerFile).toContain('GAMEPLAYATTRIBUTE_VALUE_SETTER(PropertyName)');
    expect(result.headerFile).toContain('GAMEPLAYATTRIBUTE_VALUE_INITTER(PropertyName)');
  });

  it('should declare UPROPERTY, FGameplayAttributeData, and OnRep functions in header', () => {
    const result = generateAttributeSetCpp('HeroAttributes', sampleAttributes);
    expect(result.headerFile).toContain('UPROPERTY(BlueprintReadOnly, Category = "Vitals", ReplicatedUsing = OnRep_Health)');
    expect(result.headerFile).toContain('FGameplayAttributeData Health;');
    expect(result.headerFile).toContain('ATTRIBUTE_ACCESSORS(UHeroAttributes, Health);');
    expect(result.headerFile).toContain('virtual void OnRep_Health(const FGameplayAttributeData& OldHealth);');
  });

  it('should generate constructor initializing all attributes to defaultValue.0f', () => {
    const result = generateAttributeSetCpp('CombatAttributes', sampleAttributes);
    expect(result.sourceFile).toContain('InitHealth(100.0f);');
    expect(result.sourceFile).toContain('InitMana(50.0f);');
    expect(result.sourceFile).toContain('InitMovementSpeed(600.0f);');
  });

  it('should generate PreAttributeChange clamping logic with min and max boundaries', () => {
    const result = generateAttributeSetCpp('StatsAttributes', sampleAttributes);
    expect(result.sourceFile).toContain('void UStatsAttributes::PreAttributeChange(const FGameplayAttribute& Attribute, float& NewValue)');
    expect(result.sourceFile).toContain('Super::PreAttributeChange(Attribute, NewValue);');
    expect(result.sourceFile).toContain('if (Attribute == GetHealthAttribute())');
    expect(result.sourceFile).toContain('NewValue = FMath::Clamp(NewValue, 0.0f, 100.0f);');
    expect(result.sourceFile).toContain('if (Attribute == GetManaAttribute())');
    expect(result.sourceFile).toContain('NewValue = FMath::Clamp(NewValue, 0.0f, 200.0f);');
  });

  it('should generate PostGameplayEffectExecute clamping logic', () => {
    const result = generateAttributeSetCpp('StatsAttributes', sampleAttributes);
    expect(result.sourceFile).toContain('void UStatsAttributes::PostGameplayEffectExecute(const FGameplayEffectModCallbackData& Data)');
    expect(result.sourceFile).toContain('Super::PostGameplayEffectExecute(Data);');
    expect(result.sourceFile).toContain('if (Data.EvaluatedData.Attribute == GetHealthAttribute())');
    expect(result.sourceFile).toContain('SetHealth(FMath::Clamp(GetHealth(), 0.0f, 100.0f));');
  });

  it('should generate DOREPLIFETIME only for replicated attributes in GetLifetimeReplicatedProps', () => {
    const result = generateAttributeSetCpp('NetworkAttributes', sampleAttributes);
    expect(result.sourceFile).toContain('DOREPLIFETIME_CONDITION_NOTIFY(UNetworkAttributes, Health, COND_None, REPNOTIFY_Always);');
    expect(result.sourceFile).toContain('DOREPLIFETIME_CONDITION_NOTIFY(UNetworkAttributes, Mana, COND_None, REPNOTIFY_Always);');
    // MovementSpeed is isReplicated = false
    expect(result.sourceFile).not.toContain('DOREPLIFETIME_CONDITION_NOTIFY(UNetworkAttributes, MovementSpeed');
  });

  it('should generate OnRep notification callbacks using GAMEPLAYATTRIBUTE_REPNOTIFY', () => {
    const result = generateAttributeSetCpp('ReplicatedAttributes', sampleAttributes);
    expect(result.sourceFile).toContain('void UReplicatedAttributes::OnRep_Health(const FGameplayAttributeData& OldHealth)');
    expect(result.sourceFile).toContain('GAMEPLAYATTRIBUTE_REPNOTIFY(UReplicatedAttributes, Health, OldHealth);');
  });

  it('should generate GameplayAbility C++ scaffolding with instancing and net execution policies', () => {
    const ability: GameplayAbilityDefinition = {
      abilityName: 'GA_FireballSpell',
      instancingPolicy: 'InstancedPerActor',
      netExecutionPolicy: 'LocalPredicted',
      tagPolicy: {
        activationRequiredTags: ['State.Grounded'],
        activationBlockedTags: ['State.Stunned', 'State.Dead'],
        sourceGrantedTags: ['Ability.Ranged.Fireball'],
        targetTags: [],
      },
    };

    const result = generateGameplayAbilityCpp(ability);
    expect(result.className).toBe('UGA_FireballSpell');
    expect(result.headerFile).toContain('class YOURGAME_API UGA_FireballSpell : public UGameplayAbility');
    expect(result.sourceFile).toContain('InstancingPolicy = EGameplayAbilityInstancingPolicy::InstancedPerActor;');
    expect(result.sourceFile).toContain('NetExecutionPolicy = EGameplayAbilityNetExecutionPolicy::LocalPredicted;');
  });

  it('should configure tag policy containers in GameplayAbility constructor', () => {
    const ability: GameplayAbilityDefinition = {
      abilityName: 'DodgeRoll',
      instancingPolicy: 'InstancedPerExecution',
      netExecutionPolicy: 'ServerInitiated',
      tagPolicy: {
        activationRequiredTags: ['State.Grounded'],
        activationBlockedTags: ['State.Stunned', 'Ability.Cooldown.Dodge'],
        sourceGrantedTags: ['State.Invulnerable', 'State.Dodging'],
        targetTags: [],
      },
    };

    const result = generateGameplayAbilityCpp(ability);
    expect(result.sourceFile).toContain('ActivationRequiredTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Grounded")));');
    expect(result.sourceFile).toContain('ActivationBlockedTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Stunned")));');
    expect(result.sourceFile).toContain('ActivationBlockedTags.AddTag(FGameplayTag::RequestGameplayTag(FName("Ability.Cooldown.Dodge")));');
    expect(result.sourceFile).toContain('SourceGrantedTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Invulnerable")));');
    expect(result.sourceFile).toContain('SourceGrantedTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Dodging")));');
  });

  it('should include CommitAbility validation guard and EndAbility logic in ActivateAbility', () => {
    const ability: GameplayAbilityDefinition = {
      abilityName: 'MeleeStrike',
      instancingPolicy: 'NonInstanced',
      netExecutionPolicy: 'ServerOnly',
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: [],
      },
    };

    const result = generateGameplayAbilityCpp(ability);
    expect(result.sourceFile).toContain('if (!CommitAbility(Handle, ActorInfo, ActivationInfo))');
    expect(result.sourceFile).toContain('EndAbility(Handle, ActorInfo, ActivationInfo, true, true);');
    expect(result.sourceFile).toContain('Super::EndAbility(Handle, ActorInfo, ActivationInfo, bReplicateEndAbility, bWasCancelled);');
  });

  it('should format float values with valid C++ suffix without double decimals', () => {
    expect(formatCppFloat(100)).toBe('100.0f');
    expect(formatCppFloat(0)).toBe('0.0f');
    expect(formatCppFloat(1.5)).toBe('1.5f');
    expect(formatCppFloat(0.25)).toBe('0.25f');
  });

  it('should configure CostGameplayEffectClass and CooldownGameplayEffectClass when provided', () => {
    const abilityWithEffects: GameplayAbilityDefinition = {
      abilityName: 'GA_Spell',
      instancingPolicy: 'InstancedPerActor',
      netExecutionPolicy: 'LocalPredicted',
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: [],
      },
      costEffect: {
        id: 'ge_mana_cost',
        effectName: 'GE_ManaCost',
        durationPolicy: 'Instant',
        durationMagnitude: 0,
        modifiers: [],
        grantedTags: [],
      },
      cooldownEffect: {
        id: 'ge_spell_cd',
        effectName: 'UGE_SpellCooldown',
        durationPolicy: 'HasDuration',
        durationMagnitude: 5.0,
        modifiers: [],
        grantedTags: [],
      },
    };

    const result = generateGameplayAbilityCpp(abilityWithEffects);
    expect(result.sourceFile).toContain('CostGameplayEffectClass = UGE_ManaCost::StaticClass();');
    expect(result.sourceFile).toContain('CooldownGameplayEffectClass = UGE_SpellCooldown::StaticClass();');
  });

  it('should configure TargetRequiredTags when targetTags are present in policy', () => {
    const abilityWithTarget: GameplayAbilityDefinition = {
      abilityName: 'GA_Smite',
      instancingPolicy: 'InstancedPerActor',
      netExecutionPolicy: 'LocalPredicted',
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: ['State.Vulnerable', 'State.TargetLocked'],
      },
    };

    const result = generateGameplayAbilityCpp(abilityWithTarget);
    expect(result.sourceFile).toContain('TargetRequiredTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Vulnerable")));');
    expect(result.sourceFile).toContain('TargetRequiredTags.AddTag(FGameplayTag::RequestGameplayTag(FName("State.TargetLocked")));');
  });

  it('should generate complete GameplayEffect C++ scaffolding with duration and modifiers', () => {
    const effect: GameplayEffectDefinition = {
      id: 'ge_poison',
      effectName: 'GE_PoisonDot',
      durationPolicy: 'HasDuration',
      durationMagnitude: 8.0,
      modifiers: [
        { attribute: 'Health', modifierOp: 'Add', magnitude: -10.0 },
        { attribute: 'MovementSpeed', modifierOp: 'Multiply', magnitude: 0.8 },
      ],
      grantedTags: ['State.Combat.Stunned'],
    };

    const result = generateGameplayEffectCpp(effect);
    expect(result.className).toBe('UGE_PoisonDot');
    expect(result.headerFile).toContain('class YOURGAME_API UGE_PoisonDot : public UGameplayEffect');
    expect(result.sourceFile).toContain('DurationPolicy = EGameplayEffectDurationType::HasDuration;');
    expect(result.sourceFile).toContain('DurationMagnitude = FGameplayEffectModifierMagnitude(FScalableFloat(8.0f));');
    expect(result.sourceFile).toContain('ModInfo.Attribute = FGameplayAttribute(UBaseAttributeSet::GetHealthAttribute());');
    expect(result.sourceFile).toContain('ModInfo.ModifierOp = EGameplayModOp::Add;');
    expect(result.sourceFile).toContain('ModInfo.Attribute = FGameplayAttribute(UBaseAttributeSet::GetMovementSpeedAttribute());');
    expect(result.sourceFile).toContain('ModInfo.ModifierOp = EGameplayModOp::Multiply;');
    expect(result.sourceFile).toContain('InheritableGameplayEffectTags.Added.AddTag(FGameplayTag::RequestGameplayTag(FName("State.Combat.Stunned")));');
  });
});
