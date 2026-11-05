import { GameplayAbilityDefinition, AbilityTaskType } from '../types/gasTypes';

export interface GasT3DCompileResult {
  t3dText: string;
  abilityName: string;
  nodeCount: number;
}

export interface AbilityTaskT3DOptions {
  nodePosX?: number;
  nodePosY?: number;
  nodeGuid?: string;
  montageName?: string;
  delayTime?: number;
  eventTag?: string;
  rate?: number;
  prevNodeName?: string;
  prevPinId?: string;
  nextNodeName?: string;
  nextPinId?: string;
}

/**
 * Compiles a standalone AbilityTask async action node into native UE5 K2Node_AsyncAction T3D format.
 */
export function compileAbilityTaskNodeToT3D(
  taskType: AbilityTaskType,
  options: AbilityTaskT3DOptions = {}
): { t3dText: string; nodeName: string; inputPinId: string; outputPinIds: string[] } {
  const posX = options.nodePosX ?? 450;
  const posY = options.nodePosY ?? 100;
  const guid = options.nodeGuid ?? 'A1B2C3D4000300030003000300030003';
  const prevLink = options.prevNodeName && options.prevPinId ? `,LinkedTo=(${options.prevNodeName} ${options.prevPinId})` : '';
  const nextTarget = options.nextNodeName && options.nextPinId ? `,LinkedTo=(${options.nextNodeName} ${options.nextPinId})` : '';

  const lines: string[] = [];

  switch (taskType) {
    case 'WaitDelay': {
      const nodeName = 'K2Node_AsyncAction_WaitDelay';
      const delay = options.delayTime !== undefined ? options.delayTime.toFixed(1) : '1.0';
      lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="${nodeName}"`);
      lines.push(`   ProxyFactoryFunctionName="WaitDelay"`);
      lines.push(`   ProxyClass=Class'"/Script/GameplayAbilities.AbilityTask_WaitDelay"'`);
      lines.push(`   NodePosX=${posX}`);
      lines.push(`   NodePosY=${posY}`);
      lines.push(`   NodeGuid=${guid}`);
      lines.push(`   CustomProperties Pin (PinId=C1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec"${prevLink})`);
      lines.push(`   CustomProperties Pin (PinId=C2,PinName="Time",Direction="EGPD_Input",PinType.PinCategory="real",PinType.PinSubCategory="float",DefaultValue="${delay}")`);
      lines.push(`   CustomProperties Pin (PinId=C3,PinName="OnFinish",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`End Object`);
      return { t3dText: lines.join('\r\n'), nodeName, inputPinId: 'C1', outputPinIds: ['C3'] };
    }

    case 'WaitGameplayEvent': {
      const nodeName = 'K2Node_AsyncAction_WaitGameplayEvent';
      const tag = options.eventTag ?? 'State.Combat';
      lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="${nodeName}"`);
      lines.push(`   ProxyFactoryFunctionName="WaitGameplayEvent"`);
      lines.push(`   ProxyClass=Class'"/Script/GameplayAbilities.AbilityTask_WaitGameplayEvent"'`);
      lines.push(`   NodePosX=${posX}`);
      lines.push(`   NodePosY=${posY}`);
      lines.push(`   NodeGuid=${guid}`);
      lines.push(`   CustomProperties Pin (PinId=C1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec"${prevLink})`);
      lines.push(`   CustomProperties Pin (PinId=C2,PinName="EventTag",Direction="EGPD_Input",PinType.PinCategory="struct",PinType.PinSubCategoryObject=ScriptStruct'"/Script/GameplayTags.GameplayTag"',DefaultValue="${tag}")`);
      lines.push(`   CustomProperties Pin (PinId=C3,PinName="OnlyTriggerOnce",Direction="EGPD_Input",PinType.PinCategory="bool",DefaultValue="false")`);
      lines.push(`   CustomProperties Pin (PinId=C4,PinName="OnlyMatchExact",Direction="EGPD_Input",PinType.PinCategory="bool",DefaultValue="true")`);
      lines.push(`   CustomProperties Pin (PinId=C5,PinName="EventReceived",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`   CustomProperties Pin (PinId=C6,PinName="Payload",Direction="EGPD_Output",PinType.PinCategory="struct",PinType.PinSubCategoryObject=ScriptStruct'"/Script/GameplayAbilities.GameplayEventData"')`);
      lines.push(`End Object`);
      return { t3dText: lines.join('\r\n'), nodeName, inputPinId: 'C1', outputPinIds: ['C5'] };
    }

    case 'WaitTargetData': {
      const nodeName = 'K2Node_AsyncAction_WaitTargetData';
      lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="${nodeName}"`);
      lines.push(`   ProxyFactoryFunctionName="WaitTargetData"`);
      lines.push(`   ProxyClass=Class'"/Script/GameplayAbilities.AbilityTask_WaitTargetData"'`);
      lines.push(`   NodePosX=${posX}`);
      lines.push(`   NodePosY=${posY}`);
      lines.push(`   NodeGuid=${guid}`);
      lines.push(`   CustomProperties Pin (PinId=C1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec"${prevLink})`);
      lines.push(`   CustomProperties Pin (PinId=C2,PinName="ConfirmationType",Direction="EGPD_Input",PinType.PinCategory="byte",DefaultValue="Instant")`);
      lines.push(`   CustomProperties Pin (PinId=C3,PinName="ValidData",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`   CustomProperties Pin (PinId=C4,PinName="Cancelled",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`   CustomProperties Pin (PinId=C5,PinName="Data",Direction="EGPD_Output",PinType.PinCategory="struct",PinType.PinSubCategoryObject=ScriptStruct'"/Script/GameplayAbilities.GameplayAbilityTargetDataHandle"')`);
      lines.push(`End Object`);
      return { t3dText: lines.join('\r\n'), nodeName, inputPinId: 'C1', outputPinIds: ['C3', 'C4'] };
    }

    case 'PlayMontageAndWait':
    default: {
      const nodeName = 'K2Node_AsyncAction_PlayMontage';
      const montage = options.montageName || 'AM_DefaultMontage';
      const rate = options.rate !== undefined ? options.rate.toFixed(1) : '1.0';
      lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_AsyncAction Name="${nodeName}"`);
      lines.push(`   ProxyFactoryFunctionName="CreatePlayMontageAndWaitProxy"`);
      lines.push(`   ProxyClass=Class'"/Script/GameplayAbilities.AbilityTask_PlayMontageAndWait"'`);
      lines.push(`   NodePosX=${posX}`);
      lines.push(`   NodePosY=${posY}`);
      lines.push(`   NodeGuid=${guid}`);
      lines.push(`   CustomProperties Pin (PinId=C1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec"${prevLink})`);
      lines.push(`   CustomProperties Pin (PinId=C2,PinName="MontageToPlay",Direction="EGPD_Input",PinType.PinCategory="object",PinType.PinSubCategoryObject=AnimMontage'"/Game/Animations/${montage}.${montage}"')`);
      lines.push(`   CustomProperties Pin (PinId=C3,PinName="Rate",Direction="EGPD_Input",PinType.PinCategory="real",PinType.PinSubCategory="float",DefaultValue="${rate}")`);
      lines.push(`   CustomProperties Pin (PinId=C4,PinName="OnCompleted",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`   CustomProperties Pin (PinId=C5,PinName="OnInterrupted",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`   CustomProperties Pin (PinId=C6,PinName="OnCancelled",Direction="EGPD_Output",PinType.PinCategory="exec"${nextTarget})`);
      lines.push(`End Object`);
      return { t3dText: lines.join('\r\n'), nodeName, inputPinId: 'C1', outputPinIds: ['C4', 'C5', 'C6'] };
    }
  }
}

/**
 * Compiles a GameplayAbility specification into native Unreal Engine Blueprint T3D text
 * featuring PlayMontageAndWait, WaitDelay, WaitGameplayEvent, or WaitTargetData task flows.
 */
export function compileGameplayAbilityToT3D(ability: GameplayAbilityDefinition): GasT3DCompileResult {
  const lines: string[] = [];
  const abilityName = ability.abilityName || 'GA_CustomAbility';
  const taskType: AbilityTaskType = ability.activeTask || 'PlayMontageAndWait';
  const montageName = ability.activeMontage || 'AM_DefaultMontage';

  // 1. ActivateAbility Event
  lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_Event Name="K2Node_Event_ActivateAbility"`);
  lines.push(`   EventReference=(MemberParent=Class'"/Script/GameplayAbilities.GameplayAbility"',MemberName="K2_ActivateAbility")`);
  lines.push(`   bOverrideFunction=True`);
  lines.push(`   NodePosX=-250`);
  lines.push(`   NodePosY=100`);
  lines.push(`   NodeGuid=A1B2C3D4000100010001000100010001`);
  lines.push(`   CustomProperties Pin (PinId=A1,PinName="OutputDelegate",Direction="EGPD_Output",PinType.PinCategory="delegate")`);
  lines.push(`   CustomProperties Pin (PinId=A2,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_CommitAbility B1))`);
  lines.push(`End Object`);

  // Determine Task Node Name & Links
  let asyncNodeName = 'K2Node_AsyncAction_PlayMontage';
  if (taskType === 'WaitDelay') asyncNodeName = 'K2Node_AsyncAction_WaitDelay';
  else if (taskType === 'WaitGameplayEvent') asyncNodeName = 'K2Node_AsyncAction_WaitGameplayEvent';
  else if (taskType === 'WaitTargetData') asyncNodeName = 'K2Node_AsyncAction_WaitTargetData';

  // 2. CommitAbility Function Call
  lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_CommitAbility"`);
  lines.push(`   FunctionReference=(MemberParent=Class'"/Script/GameplayAbilities.GameplayAbility"',MemberName="K2_CommitAbility")`);
  lines.push(`   NodePosX=100`);
  lines.push(`   NodePosY=100`);
  lines.push(`   NodeGuid=A1B2C3D4000200020002000200020002`);
  lines.push(`   CustomProperties Pin (PinId=B1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(K2Node_Event_ActivateAbility A2))`);
  lines.push(`   CustomProperties Pin (PinId=B2,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(${asyncNodeName} C1))`);
  lines.push(`   CustomProperties Pin (PinId=B3,PinName="ReturnValue",Direction="EGPD_Output",PinType.PinCategory="bool")`);
  lines.push(`End Object`);

  // 3. Async Action Task Node
  const taskCompiled = compileAbilityTaskNodeToT3D(taskType, {
    nodePosX: 450,
    nodePosY: 100,
    nodeGuid: 'A1B2C3D4000300030003000300030003',
    montageName,
    delayTime: ability.taskDelayTime ?? 1.0,
    eventTag: ability.taskEventTag ?? 'State.Combat',
    prevNodeName: 'K2Node_CallFunction_CommitAbility',
    prevPinId: 'B2',
    nextNodeName: 'K2Node_CallFunction_EndAbility',
    nextPinId: 'D1',
  });
  lines.push(taskCompiled.t3dText);

  // 4. EndAbility Function Call
  const endAbilityInputs = taskCompiled.outputPinIds
    .map((pin) => `${asyncNodeName} ${pin}`)
    .join(',');

  lines.push(`Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_EndAbility"`);
  lines.push(`   FunctionReference=(MemberParent=Class'"/Script/GameplayAbilities.GameplayAbility"',MemberName="K2_EndAbility")`);
  lines.push(`   NodePosX=850`);
  lines.push(`   NodePosY=100`);
  lines.push(`   NodeGuid=A1B2C3D4000400040004000400040004`);
  lines.push(`   CustomProperties Pin (PinId=D1,PinName="execute",Direction="EGPD_Input",PinType.PinCategory="exec",LinkedTo=(${endAbilityInputs}))`);
  lines.push(`   CustomProperties Pin (PinId=D2,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec")`);
  lines.push(`End Object`);

  return {
    t3dText: lines.join('\r\n'),
    abilityName,
    nodeCount: 4,
  };
}
