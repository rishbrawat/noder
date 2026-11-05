import { Node, Edge } from 'reactflow';
import { NodeData, T3DCompileResult, normalizeContainerType } from '../types/BlueprintTypes';

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
  array: { category: 'string' },
  set: { category: 'string' },
  map: { category: 'string' },
  TArray: { category: 'string' },
  TSet: { category: 'string' },
  TMap: { category: 'string' },
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
 * Normalizes pin names for lookup across React Flow handles and UE5 pin definitions.
 * Strips whitespace, hyphens, and underscores, and converts to lower case so that:
 * "Return Value", "return-value", "return_value", and "returnvalue" all map to "returnvalue".
 */
export const normalizePinLookupKey = (name: string): string => {
  const sanitized = sanitizePinName(name);
  return sanitized.toLowerCase().replace(/[\s_-]+/g, '');
};

/**
 * Extracts pin name from React Flow handle identifier (e.g. 'int-return-value' -> 'return-value', or 'execute' -> 'execute').
 */
export const extractPinNameFromHandle = (handle?: string | null): string => {
  if (!handle) return '';
  const firstDash = handle.indexOf('-');
  if (firstDash === -1) return handle;
  return handle.substring(firstDash + 1);
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
    } else if (node.data?.title?.toLowerCase().startsWith('break ') || node.data?.title?.toLowerCase().startsWith('make ')) {
      baseClassName = node.data?.title?.toLowerCase().startsWith('break ') ? 'K2Node_BreakStruct' : 'K2Node_MakeStruct';
    } else if (nodeType === 'variable') {
      baseClassName = node.data?.title?.toLowerCase().startsWith('set') ? 'K2Node_VariableSet' : 'K2Node_VariableGet';
    }

    const ueNodeName = `${baseClassName}_${safeTitle}_${index}`;
    nodeNameMap.set(node.id, ueNodeName);

    (node.data?.inputs || []).forEach(pin => {
      const guid = generateUEGuid();
      const normKey = normalizePinLookupKey(pin.name);
      pinGuidMap.set(`${node.id}:in:${normKey}`, guid);
      pinGuidMap.set(`${node.id}:in:${sanitizePinName(pin.name).toLowerCase()}`, guid);
    });

    (node.data?.outputs || []).forEach(pin => {
      const guid = generateUEGuid();
      const normKey = normalizePinLookupKey(pin.name);
      pinGuidMap.set(`${node.id}:out:${normKey}`, guid);
      pinGuidMap.set(`${node.id}:out:${sanitizePinName(pin.name).toLowerCase()}`, guid);
    });
  });

  // Step 2: Build bidirectional connection adjacency maps
  const connectionsOut = new Map<string, { targetNodeName: string; targetPinGuid: string }[]>();
  const connectionsIn = new Map<string, { sourceNodeName: string; sourcePinGuid: string }[]>();

  edges.forEach(edge => {
    const sourceNodeName = nodeNameMap.get(edge.source);
    const targetNodeName = nodeNameMap.get(edge.target);

    // Handles are formatted as `${pinType}-${pinName}` or bare pin names
    const rawSourcePin = extractPinNameFromHandle(edge.sourceHandle) || 'then';
    const rawTargetPin = extractPinNameFromHandle(edge.targetHandle) || 'execute';

    const sourcePin = sanitizePinName(rawSourcePin);
    const targetPin = sanitizePinName(rawTargetPin);

    const normSource = normalizePinLookupKey(rawSourcePin);
    const normTarget = normalizePinLookupKey(rawTargetPin);

    const sourcePinGuid = pinGuidMap.get(`${edge.source}:out:${normSource}`)
      || pinGuidMap.get(`${edge.source}:out:${sourcePin.toLowerCase()}`);
    const targetPinGuid = pinGuidMap.get(`${edge.target}:in:${normTarget}`)
      || pinGuidMap.get(`${edge.target}:in:${targetPin.toLowerCase()}`);

    if (sourceNodeName && targetNodeName && sourcePinGuid && targetPinGuid) {
      const outKey = `${edge.source}:out:${normSource}`;
      const inKey = `${edge.target}:in:${normTarget}`;

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

    const normTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (nodeType === 'reroute' || title.toLowerCase() === 'reroute') {
      ueClass = '/Script/BlueprintGraph.K2Node_Knot';
      extraHeader = '';
    } else if (nodeType === 'event' || title.toLowerCase().startsWith('inputaction')) {
      ueClass = '/Script/BlueprintGraph.K2Node_Event';
      const eventName = title.includes('BeginPlay') ? 'ReceiveBeginPlay' :
                        title.includes('Tick') ? 'ReceiveTick' :
                        title.includes('AnyDamage') ? 'ReceiveAnyDamage' :
                        title.replace(/[^a-zA-Z0-9_]/g, '');
      extraHeader = `   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="${eventName}")\n   bOverrideFunction=True\n`;
    } else if (title.toLowerCase() === 'branch') {
      ueClass = '/Script/BlueprintGraph.K2Node_IfThenElse';
    } else if (nodeType === 'macro' || normTitle === 'foreachloop' || normTitle === 'flipflop' || normTitle === 'gate') {
      ueClass = '/Script/BlueprintGraph.K2Node_MacroInstance';
      const macroName = normTitle.includes('foreach') ? 'ForEachLoop' :
                        normTitle.includes('flipflop') ? 'FlipFlop' :
                        normTitle.includes('gate') ? 'Gate' :
                        title.replace(/[^a-zA-Z0-9]/g, '');
      extraHeader = `   MacroGraphReference=(MacroGraph=EdGraph'"/Engine/EditorBlueprintResources/StandardMacros.StandardMacros:${macroName}"')\n`;
    } else if (title.toLowerCase().startsWith('break ') || title.toLowerCase().startsWith('make ')) {
      const isBreak = title.toLowerCase().startsWith('break ');
      ueClass = isBreak ? '/Script/BlueprintGraph.K2Node_BreakStruct' : '/Script/BlueprintGraph.K2Node_MakeStruct';
      const rawStructName = title.replace(/^(break|make)\s+/i, '').replace(/\s+/g, '');
      const structName = rawStructName.toLowerCase() === 'hitresult' ? 'HitResult' : rawStructName;
      extraHeader = `   StructType=ScriptStruct'"/Script/Engine.${structName}"'\n`;
    } else if (nodeType === 'variable') {
      const isSet = title.toLowerCase().startsWith('set');
      ueClass = isSet ? '/Script/BlueprintGraph.K2Node_VariableSet' : '/Script/BlueprintGraph.K2Node_VariableGet';
      const varName = title.replace(/^(get|set)\s*/i, '').replace(/\s+/g, '');
      extraHeader = `   VariableReference=(MemberName="${varName}",bSelfContext=True)\n`;
    } else {
      const funcName = title.replace(/[^a-zA-Z0-9_]/g, '');
      const isGameplayStatics = /PlaySound|SpawnEmitter|GetPlayer|LineTrace|OpenLevel/i.test(title);
      const isCharacterMovement = /WalkSpeed|JumpZ|MovementMode/i.test(title);
      const hasArrayPin = (node.data?.inputs || []).some(p => normalizeContainerType(p.containerType, p.type) === 'array');
      const hasSetPin = (node.data?.inputs || []).some(p => normalizeContainerType(p.containerType, p.type) === 'set');
      const hasMapPin = (node.data?.inputs || []).some(p => normalizeContainerType(p.containerType, p.type) === 'map');

      const isArrayOp = hasArrayPin || /array/i.test(title) || /^Array_/i.test(funcName);
      const isSetOp = hasSetPin || /^(set\s+(add|remove|contains|clear|length|find|union|intersect)|set_)/i.test(title) || /^Set_/i.test(funcName);
      const isMapOp = hasMapPin || /map/i.test(title) || /^Map_/i.test(funcName);

      const parentClass = isArrayOp
        ? 'KismetArrayLibrary'
        : isSetOp
        ? 'KismetSetLibrary'
        : isMapOp
        ? 'KismetMapLibrary'
        : isGameplayStatics
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

    // Helper to format pin attributes including UE5 container properties
    const formatPin = (
      pin: any,
      direction: 'EGPD_Input' | 'EGPD_Output',
      pinGuid: string,
      links: any[]
    ): string => {
      const sanitizedName = sanitizePinName(pin.name);
      const container = normalizeContainerType(pin.containerType, pin.type);

      let effectiveType = pin.type;
      if (container !== 'none') {
        effectiveType = pin.innerType || (pin.type !== 'array' && pin.type !== 'TArray' && pin.type !== 'set' && pin.type !== 'TSet' && pin.type !== 'map' && pin.type !== 'TMap' ? pin.type : 'int');
      }

      const cat = PIN_CATEGORY_MAP[effectiveType] || { category: 'string' };

      const linkedToStr = links.length > 0
        ? `LinkedTo=(${links.map((l: any) => `${l.targetNodeName || l.sourceNodeName} ${l.targetPinGuid || l.sourcePinGuid}`).join(',')},)`
        : '';

      const defVal = (pin.value !== undefined && pin.value !== null && links.length === 0)
        ? `DefaultValue="${String(pin.value)}" `
        : '';

      const subCat = cat.subCategoryObject ? `PinType.PinSubCategoryObject=${cat.subCategoryObject} ` : '';

      let containerProps = '';
      if (container === 'array') {
        containerProps = 'PinType.ContainerType=Array,PinType.bIsArray=True,';
      } else if (container === 'set') {
        containerProps = 'PinType.ContainerType=Set,PinType.bIsSet=True,';
      } else if (container === 'map') {
        const valType = pin.valueType || 'int';
        const valCat = PIN_CATEGORY_MAP[valType] || { category: 'int' };
        const valSub = valCat.subCategoryObject ? `,TerminalSubCategoryObject=${valCat.subCategoryObject}` : '';
        containerProps = `PinType.ContainerType=Map,PinType.bIsMap=True,PinType.PinValueType=(TerminalCategory="${valCat.category}"${valSub}),`;
      }

      return `   CustomProperties Pin (PinId=${pinGuid},PinName="${sanitizedName}",PinType.PinCategory="${cat.category}",${subCat}${containerProps}Direction="${direction}",${defVal}${linkedToStr})\n`;
    };

    // Serialize Input Pins
    (node.data?.inputs || []).forEach(pin => {
      const normKey = normalizePinLookupKey(pin.name);
      const pinGuid = pinGuidMap.get(`${node.id}:in:${normKey}`) || generateUEGuid();
      const links = connectionsIn.get(`${node.id}:in:${normKey}`) || [];
      nodeBlock += formatPin(pin, 'EGPD_Input', pinGuid, links);
    });

    // Serialize Output Pins
    (node.data?.outputs || []).forEach(pin => {
      const normKey = normalizePinLookupKey(pin.name);
      const pinGuid = pinGuidMap.get(`${node.id}:out:${normKey}`) || generateUEGuid();
      const links = connectionsOut.get(`${node.id}:out:${normKey}`) || [];
      nodeBlock += formatPin(pin, 'EGPD_Output', pinGuid, links);
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
