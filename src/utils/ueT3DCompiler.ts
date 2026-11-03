import { Node, Edge } from 'reactflow';
import { NodeData, T3DCompileResult } from '../types/BlueprintTypes';

export type { T3DCompileResult };

/**
 * Unreal Engine 5 Pin Category definitions.
 */
export const PIN_CATEGORY_MAP: Record<string, { category: string; subCategoryObject?: string }> = {
  exec: { category: 'exec' },
  bool: { category: 'bool' },
  int: { category: 'int' },
  float: { category: 'real', subCategoryObject: 'Float' },
  string: { category: 'string' },
  name: { category: 'name' },
  byte: { category: 'byte' },
  vector: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
  vector2d: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector2D' },
  vector3: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
  vector4: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector4' },
  rotator: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Rotator' },
  transform: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Transform' },
  object: { category: 'object', subCategoryObject: '/Script/CoreUObject.Object' },
  class: { category: 'class', subCategoryObject: '/Script/CoreUObject.Class' },
  wildcard: { category: 'wildcard' },
  materialattributes: { category: 'struct', subCategoryObject: '/Script/Engine.MaterialAttributes' },
};

/**
 * Generate 32-character uppercase hexadecimal GUID required by Unreal Engine.
 */
export const generateUEGuid = (): string => {
  return Array.from({ length: 32 }, () =>
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');
};

/**
 * Clean and format pin names for UE5 standard conventions.
 */
const sanitizePinName = (name: string): string => {
  const trimmed = name.trim();
  if (trimmed.toLowerCase() === 'execute' || trimmed.toLowerCase() === 'in') return 'execute';
  if (trimmed.toLowerCase() === 'then' || trimmed.toLowerCase() === 'out') return 'then';
  return trimmed;
};

/**
 * Compile React Flow graph nodes and edges into Unreal Engine 5 T3D ASCII clipboard format.
 * Developers can copy this string and paste directly into Unreal Engine's Blueprint Event Graph.
 */
export function compileGraphToT3D(
  nodes: Node<NodeData>[],
  edges: Edge[]
): T3DCompileResult {
  const warnings: string[] = [];
  const nodeNameMap = new Map<string, string>(); // ReactFlow NodeId -> UE Node Object Name
  const pinGuidMap = new Map<string, string>();  // ReactFlow NodeId:direction:pinNameLowerCase -> UE PinGuid

  // Step 1: Pre-generate Node Object Names and Pin GUIDs
  nodes.forEach((node, index) => {
    if (node.type === 'commentNode') {
      const ueNodeName = `EdGraphNode_Comment_${index}`;
      nodeNameMap.set(node.id, ueNodeName);
      return;
    }

    const safeTitle = (node.data?.title || 'Node').replace(/[^a-zA-Z0-9]/g, '');
    const nodeType = node.data?.nodeType || 'function';
    let baseClassName = 'K2Node_CallFunction';

    if (nodeType === 'reroute' || safeTitle.toLowerCase() === 'reroute') {
      baseClassName = 'K2Node_Knot';
    } else if (nodeType === 'event' || safeTitle.toLowerCase().startsWith('inputaction')) {
      baseClassName = 'K2Node_Event';
    } else if (node.data?.title?.toLowerCase() === 'branch') {
      baseClassName = 'K2Node_IfThenElse';
    } else if (nodeType === 'variable') {
      baseClassName = node.data?.title?.toLowerCase().startsWith('set') ? 'K2Node_VariableSet' : 'K2Node_VariableGet';
    }

    const ueNodeName = `${baseClassName}_${safeTitle}_${index}`;
    nodeNameMap.set(node.id, ueNodeName);

    (node.data?.inputs || []).forEach(pin => {
      const sanitized = sanitizePinName(pin.name);
      pinGuidMap.set(`${node.id}:in:${sanitized.toLowerCase()}`, generateUEGuid());
    });

    (node.data?.outputs || []).forEach(pin => {
      const sanitized = sanitizePinName(pin.name);
      pinGuidMap.set(`${node.id}:out:${sanitized.toLowerCase()}`, generateUEGuid());
    });
  });

  // Step 2: Build bidirectional connection adjacency maps
  const connectionsOut = new Map<string, { targetNodeName: string; targetPinGuid: string }[]>();
  const connectionsIn = new Map<string, { sourceNodeName: string; sourcePinGuid: string }[]>();

  edges.forEach(edge => {
    const sourceNodeName = nodeNameMap.get(edge.source);
    const targetNodeName = nodeNameMap.get(edge.target);

    // Handles are formatted as `${pinType}-${pinName}`
    const rawSourcePin = edge.sourceHandle?.split('-').slice(1).join('-') || 'then';
    const rawTargetPin = edge.targetHandle?.split('-').slice(1).join('-') || 'execute';

    const sourcePin = sanitizePinName(rawSourcePin);
    const targetPin = sanitizePinName(rawTargetPin);

    const sourcePinGuid = pinGuidMap.get(`${edge.source}:out:${sourcePin.toLowerCase()}`);
    const targetPinGuid = pinGuidMap.get(`${edge.target}:in:${targetPin.toLowerCase()}`);

    if (sourceNodeName && targetNodeName && sourcePinGuid && targetPinGuid) {
      const outKey = `${edge.source}:out:${sourcePin.toLowerCase()}`;
      const inKey = `${edge.target}:in:${targetPin.toLowerCase()}`;

      connectionsOut.set(outKey, [...(connectionsOut.get(outKey) || []), { targetNodeName, targetPinGuid }]);
      connectionsIn.set(inKey, [...(connectionsIn.get(inKey) || []), { sourceNodeName, sourcePinGuid }]);
    } else {
      warnings.push(`Could not map connection between ${edge.source}:${sourcePin} and ${edge.target}:${targetPin}`);
    }
  });

  // Step 3: Serialize each node into Unreal T3D ASCII format
  const outputBlocks: string[] = [];

  nodes.forEach(node => {
    const ueNodeName = nodeNameMap.get(node.id);
    if (!ueNodeName) return;

    if (node.type === 'commentNode') {
      const commentText = node.data?.title || 'Comment Group';
      const posX = Math.round(node.position?.x ?? 0);
      const posY = Math.round(node.position?.y ?? 0);
      const width = Math.round((node as any).width || (node.data as any)?.width || 450);
      const height = Math.round((node as any).height || (node.data as any)?.height || 300);
      const nodeGuid = generateUEGuid();
      const commentBlock = `Begin Object Class=/Script/UnrealEd.EdGraphNode_Comment Name="${ueNodeName}"\n   NodePosX=${posX}\n   NodePosY=${posY}\n   NodeWidth=${width}\n   NodeHeight=${height}\n   NodeComment="${commentText.replace(/"/g, '\\"')}"\n   CommentColor=(R=0.200000,G=0.200000,B=0.200000,A=1.000000)\n   NodeGuid=${nodeGuid}\nEnd Object\n`;
      outputBlocks.push(commentBlock);
      return;
    }

    const nodeGuid = generateUEGuid();
    const posX = Math.round(node.position?.x ?? 0);
    const posY = Math.round(node.position?.y ?? 0);
    const title = node.data?.title || 'Unknown';
    const nodeType = node.data?.nodeType || 'function';

    let ueClass = '/Script/BlueprintGraph.K2Node_CallFunction';
    let extraHeader = '';

    if (nodeType === 'event' || title.toLowerCase().startsWith('inputaction')) {
      ueClass = '/Script/BlueprintGraph.K2Node_Event';
      const eventName = title.includes('BeginPlay') ? 'ReceiveBeginPlay' :
                        title.includes('Tick') ? 'ReceiveTick' :
                        title.includes('AnyDamage') ? 'ReceiveAnyDamage' :
                        title.replace(/[^a-zA-Z0-9_]/g, '');
      extraHeader = `   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="${eventName}")\n   bOverrideFunction=True\n`;
    } else if (title.toLowerCase() === 'branch') {
      ueClass = '/Script/BlueprintGraph.K2Node_IfThenElse';
    } else if (nodeType === 'variable') {
      const isSet = title.toLowerCase().startsWith('set');
      ueClass = isSet ? '/Script/BlueprintGraph.K2Node_VariableSet' : '/Script/BlueprintGraph.K2Node_VariableGet';
      const varName = title.replace(/^(get|set)\s*/i, '').replace(/\s+/g, '');
      extraHeader = `   VariableReference=(MemberName="${varName}",bSelfContext=True)\n`;
    } else {
      const funcName = title.replace(/[^a-zA-Z0-9]/g, '');
      const isGameplayStatics = /PlaySound|SpawnEmitter|GetPlayer|LineTrace|OpenLevel/i.test(title);
      const isCharacterMovement = /WalkSpeed|JumpZ|MovementMode/i.test(title);
      const parentClass = isGameplayStatics
        ? 'GameplayStatics'
        : isCharacterMovement
        ? 'CharacterMovementComponent'
        : 'KismetSystemLibrary';
      extraHeader = `   FunctionReference=(MemberParent=Class'"/Script/Engine.${parentClass}"',MemberName="${funcName}")\n`;
    }

    let nodeBlock = `Begin Object Class=${ueClass} Name="${ueNodeName}"\n`;
    nodeBlock += extraHeader;
    nodeBlock += `   NodePosX=${posX}\n`;
    nodeBlock += `   NodePosY=${posY}\n`;
    nodeBlock += `   NodeGuid=${nodeGuid}\n`;

    // Serialize Input Pins
    (node.data?.inputs || []).forEach(pin => {
      const sanitizedName = sanitizePinName(pin.name);
      const pinGuid = pinGuidMap.get(`${node.id}:in:${sanitizedName.toLowerCase()}`) || generateUEGuid();
      const cat = PIN_CATEGORY_MAP[pin.type] || { category: 'string' };

      const links = connectionsIn.get(`${node.id}:in:${sanitizedName.toLowerCase()}`) || [];
      const linkedToStr = links.length > 0
        ? `LinkedTo=(${links.map(l => `${l.sourceNodeName} ${l.sourcePinGuid}`).join(',')},)`
        : '';

      const defVal = (pin.value !== undefined && pin.value !== null && links.length === 0)
        ? `DefaultValue="${String(pin.value)}" `
        : '';

      const subCat = cat.subCategoryObject ? `PinType.PinSubCategoryObject=${cat.subCategoryObject} ` : '';

      nodeBlock += `   CustomProperties Pin (PinId=${pinGuid},PinName="${sanitizedName}",PinType.PinCategory="${cat.category}",${subCat}Direction="EGPD_Input",${defVal}${linkedToStr})\n`;
    });

    // Serialize Output Pins
    (node.data?.outputs || []).forEach(pin => {
      const sanitizedName = sanitizePinName(pin.name);
      const pinGuid = pinGuidMap.get(`${node.id}:out:${sanitizedName.toLowerCase()}`) || generateUEGuid();
      const cat = PIN_CATEGORY_MAP[pin.type] || { category: 'string' };

      const links = connectionsOut.get(`${node.id}:out:${sanitizedName.toLowerCase()}`) || [];
      const linkedToStr = links.length > 0
        ? `LinkedTo=(${links.map(l => `${l.targetNodeName} ${l.targetPinGuid}`).join(',')},)`
        : '';

      const subCat = cat.subCategoryObject ? `PinType.PinSubCategoryObject=${cat.subCategoryObject} ` : '';

      nodeBlock += `   CustomProperties Pin (PinId=${pinGuid},PinName="${sanitizedName}",PinType.PinCategory="${cat.category}",${subCat}Direction="EGPD_Output",${linkedToStr})\n`;
    });

    nodeBlock += `End Object\n`;
    outputBlocks.push(nodeBlock);
  });

  return {
    t3dText: outputBlocks.join('\n'),
    nodeCount: nodes.length,
    connectionCount: edges.length,
    warnings
  };
}
