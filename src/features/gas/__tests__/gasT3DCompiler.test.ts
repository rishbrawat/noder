import { describe, it, expect } from 'vitest';
import { GameplayAbilityDefinition } from '../types/gasTypes';
import { compileGameplayAbilityToT3D, compileAbilityTaskNodeToT3D } from '../utils/gasT3DCompiler';

describe('GASStudio: GameplayAbility UE5 Blueprint T3D Compiler', () => {
  const baseAbility: GameplayAbilityDefinition = {
    abilityName: 'GA_DashStrike',
    instancingPolicy: 'InstancedPerActor',
    netExecutionPolicy: 'LocalPredicted',
    activeMontage: 'AM_DashStrike',
    tagPolicy: {
      activationRequiredTags: ['State.Grounded'],
      activationBlockedTags: ['State.Stunned'],
      sourceGrantedTags: ['State.Dodging'],
      targetTags: [],
    },
  };

  it('should compile complete 4-node execution graph with matching abilityName and nodeCount', () => {
    const result = compileGameplayAbilityToT3D(baseAbility);
    expect(result.abilityName).toBe('GA_DashStrike');
    expect(result.nodeCount).toBe(4);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_ActivateAbility"');
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_CommitAbility"');
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="K2Node_AsyncAction_PlayMontage"');
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_EndAbility"');
  });

  it('should fall back to default ability name GA_CustomAbility when empty', () => {
    const result = compileGameplayAbilityToT3D({ ...baseAbility, abilityName: '' });
    expect(result.abilityName).toBe('GA_CustomAbility');
  });

  it('should fall back to AM_DefaultMontage when activeMontage is omitted or empty', () => {
    const result = compileGameplayAbilityToT3D({ ...baseAbility, activeMontage: '' });
    expect(result.t3dText).toContain('AnimMontage\'"/Game/Animations/AM_DefaultMontage.AM_DefaultMontage"\'');
  });

  it('should inject custom AnimMontage asset path into MontageToPlay input pin', () => {
    const result = compileGameplayAbilityToT3D({ ...baseAbility, activeMontage: 'AM_SuperSlash_Montage' });
    expect(result.t3dText).toContain('AnimMontage\'"/Game/Animations/AM_SuperSlash_Montage.AM_SuperSlash_Montage"\'');
  });

  it('should configure K2Node_Event_ActivateAbility with MemberName K2_ActivateAbility and then pin link', () => {
    const result = compileGameplayAbilityToT3D(baseAbility);
    expect(result.t3dText).toContain('MemberParent=Class\'"/Script/GameplayAbilities.GameplayAbility"\',MemberName="K2_ActivateAbility"');
    expect(result.t3dText).toContain('bOverrideFunction=True');
    expect(result.t3dText).toContain('PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_CommitAbility B1)');
  });

  it('should configure K2Node_CallFunction_CommitAbility with execute and then pin connections', () => {
    const result = compileGameplayAbilityToT3D(baseAbility);
    expect(result.t3dText).toContain('MemberParent=Class\'"/Script/GameplayAbilities.GameplayAbility"\',MemberName="K2_CommitAbility"');
    expect(result.t3dText).toContain('PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_ActivateAbility A2)');
    expect(result.t3dText).toContain('PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_AsyncAction_PlayMontage C1)');
    expect(result.t3dText).toContain('PinName="ReturnValue",Direction="EGPD_Output",PinType.PinCategory="bool"');
  });

  it('should configure AbilityTask_PlayMontageAndWait async task node with completion delegates', () => {
    const result = compileGameplayAbilityToT3D(baseAbility);
    expect(result.t3dText).toContain('ProxyFactoryFunctionName="CreatePlayMontageAndWaitProxy"');
    expect(result.t3dText).toContain('ProxyClass=Class\'"/Script/GameplayAbilities.AbilityTask_PlayMontageAndWait"\'');
    expect(result.t3dText).toContain('PinName="OnCompleted",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('PinName="OnInterrupted",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('PinName="OnCancelled",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
  });

  it('should configure K2Node_CallFunction_EndAbility with merged multi-delegate execution triggers', () => {
    const result = compileGameplayAbilityToT3D(baseAbility);
    expect(result.t3dText).toContain('MemberParent=Class\'"/Script/GameplayAbilities.GameplayAbility"\',MemberName="K2_EndAbility"');
    expect(result.t3dText).toContain('PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(K2Node_AsyncAction_PlayMontage C4,K2Node_AsyncAction_PlayMontage C5,K2Node_AsyncAction_PlayMontage C6)');
  });

  it('should compile WaitDelay ability task with Time parameter and OnFinish delegate link', () => {
    const delayAbility: GameplayAbilityDefinition = {
      abilityName: 'GA_DelayedBlast',
      instancingPolicy: 'InstancedPerExecution',
      netExecutionPolicy: 'ServerInitiated',
      activeTask: 'WaitDelay',
      taskDelayTime: 2.5,
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: [],
      },
    };

    const result = compileGameplayAbilityToT3D(delayAbility);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="K2Node_AsyncAction_WaitDelay"');
    expect(result.t3dText).toContain('ProxyFactoryFunctionName="WaitDelay"');
    expect(result.t3dText).toContain('ProxyClass=Class\'"/Script/GameplayAbilities.AbilityTask_WaitDelay"\'');
    expect(result.t3dText).toContain('PinName="Time",Direction="EGPD_Input",PinType.PinCategory="real",PinType.PinSubCategory="float",DefaultValue="2.5"');
    expect(result.t3dText).toContain('PinName="OnFinish",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('LinkedTo=(K2Node_AsyncAction_WaitDelay C3)');
  });

  it('should compile WaitGameplayEvent ability task with EventTag parameter and EventReceived delegate link', () => {
    const eventAbility: GameplayAbilityDefinition = {
      abilityName: 'GA_Parry',
      instancingPolicy: 'InstancedPerActor',
      netExecutionPolicy: 'LocalPredicted',
      activeTask: 'WaitGameplayEvent',
      taskEventTag: 'GameplayCue.FX.HitSpark',
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: [],
      },
    };

    const result = compileGameplayAbilityToT3D(eventAbility);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="K2Node_AsyncAction_WaitGameplayEvent"');
    expect(result.t3dText).toContain('ProxyFactoryFunctionName="WaitGameplayEvent"');
    expect(result.t3dText).toContain('ProxyClass=Class\'"/Script/GameplayAbilities.AbilityTask_WaitGameplayEvent"\'');
    expect(result.t3dText).toContain('PinName="EventTag",Direction="EGPD_Input",PinType.PinCategory="struct",PinType.PinSubCategoryObject=ScriptStruct\'"/Script/GameplayTags.GameplayTag"\',DefaultValue="GameplayCue.FX.HitSpark"');
    expect(result.t3dText).toContain('PinName="EventReceived",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('LinkedTo=(K2Node_AsyncAction_WaitGameplayEvent C5)');
  });

  it('should compile WaitTargetData ability task with ValidData and Cancelled delegate links', () => {
    const targetAbility: GameplayAbilityDefinition = {
      abilityName: 'GA_Teleport',
      instancingPolicy: 'InstancedPerExecution',
      netExecutionPolicy: 'LocalPredicted',
      activeTask: 'WaitTargetData',
      tagPolicy: {
        activationRequiredTags: [],
        activationBlockedTags: [],
        sourceGrantedTags: [],
        targetTags: [],
      },
    };

    const result = compileGameplayAbilityToT3D(targetAbility);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="K2Node_AsyncAction_WaitTargetData"');
    expect(result.t3dText).toContain('ProxyFactoryFunctionName="WaitTargetData"');
    expect(result.t3dText).toContain('ProxyClass=Class\'"/Script/GameplayAbilities.AbilityTask_WaitTargetData"\'');
    expect(result.t3dText).toContain('PinName="ConfirmationType",Direction="EGPD_Input",PinType.PinCategory="byte",DefaultValue="Instant"');
    expect(result.t3dText).toContain('PinName="ValidData",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('PinName="Cancelled",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_EndAbility D1)');
    expect(result.t3dText).toContain('LinkedTo=(K2Node_AsyncAction_WaitTargetData C3,K2Node_AsyncAction_WaitTargetData C4)');
  });

  it('should compile standalone AbilityTask nodes via compileAbilityTaskNodeToT3D', () => {
    const standaloneDelay = compileAbilityTaskNodeToT3D('WaitDelay', { delayTime: 3.0 });
    expect(standaloneDelay.nodeName).toBe('K2Node_AsyncAction_WaitDelay');
    expect(standaloneDelay.inputPinId).toBe('C1');
    expect(standaloneDelay.outputPinIds).toEqual(['C3']);
    expect(standaloneDelay.t3dText).toContain('DefaultValue="3.0"');

    const standaloneEvent = compileAbilityTaskNodeToT3D('WaitGameplayEvent', { eventTag: 'State.Combat.IncomingHit' });
    expect(standaloneEvent.nodeName).toBe('K2Node_AsyncAction_WaitGameplayEvent');
    expect(standaloneEvent.t3dText).toContain('DefaultValue="State.Combat.IncomingHit"');
  });
});

