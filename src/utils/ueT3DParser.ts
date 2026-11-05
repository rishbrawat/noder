import { v4 as uuidv4 } from 'uuid';
import { Node, Edge } from 'reactflow';
import { NodeData, PinType, PinData, NodeType, PinContainerType } from '../types/BlueprintTypes';

interface ParsedPin {
  guid: string;
  name: string;
  type: PinType;
  containerType?: PinContainerType;
  innerType?: PinType;
  valueType?: PinType;
  direction: 'input' | 'output';
  defaultValue?: any;
  linkedTo: { targetNodeName: string; targetPinGuid: string }[];
}

interface ParsedNode {
  objectName: string;
  className: string;
  title: string;
  nodeType: NodeType;
  posX: number;
  posY: number;
  pins: ParsedPin[];
}

/**
 * Maps Unreal Engine pin categories to Noder PinType.
 */
function mapUECategoryToPinType(category: string, subCategoryObject?: string): PinType {
  const cat = category.toLowerCase();
  if (cat === 'exec') return 'exec';
  if (cat === 'bool' || cat === 'boolean') return 'bool';
  if (cat === 'int' || cat === 'integer' || cat === 'int64') return 'int';
  if (cat === 'real' || cat === 'float' || cat === 'double') return 'float';
  if (cat === 'string') return 'string';
  if (cat === 'name') return 'name';
  if (cat === 'byte') return 'byte';
  if (cat === 'struct') {
    if (subCategoryObject?.includes('Vector2D')) return 'vector2d';
    if (subCategoryObject?.includes('Vector4')) return 'vector4';
    if (subCategoryObject?.includes('Vector')) return 'vector';
    if (subCategoryObject?.includes('Rotator')) return 'rotator';
    if (subCategoryObject?.includes('Transform')) return 'transform';
    return 'vector';
  }
  if (cat === 'object' || cat === 'interface') return 'object';
  if (cat === 'class') return 'class';
  return 'string';
}

/**
 * Determines node display color based on UE5 conventions anchored in Black, Red, Green, Gold, White.
 */
export function getNodeColor(nodeType: string, title: string): string {
  const lower = title.toLowerCase();
  // Events, Input Actions & Triggers -> Deep Unreal Red
  if (nodeType === 'event' || /^(event|inputaction|receive|oncomponent)/i.test(title)) return '#991B1B';
  // Flow Control (Branch, Sequence, Gate, Timeline, FlipFlop) -> Unreal Gold / Amber
  if (lower === 'branch' || lower.includes('sequence') || lower.includes('timeline') || lower.includes('gate') || nodeType === 'macro') return '#B45309';
  // Pure Math, Converters, Getters -> Emerald Green
  if (/^(make|break|get|add|subtract|multiply|divide|less|greater|equal|normalize|dot|cross|vector|rotator)/i.test(title)) return '#15803D';
  // Variables -> Emerald Green for Getters, Graphite/Black for Setters
  if (nodeType === 'variable') return lower.startsWith('set') ? '#18181B' : '#15803D';
  // Impure functions & actions -> Sleek Obsidian/Graphite
  return '#18181B';
}

/**
 * Parses native Unreal Engine 5 T3D ASCII clipboard format into React Flow nodes and edges.
 * Allows developers to copy nodes inside Unreal Engine 5 and paste them directly into Noder.
 */
export function parseUE5T3DToGraph(t3dText: string): { nodes: Node<NodeData>[]; edges: Edge[] } {
  if (!t3dText || !t3dText.includes('Begin Object')) {
    throw new Error('Invalid UE5 T3D text: missing "Begin Object" declarations.');
  }

  const parsedNodes: ParsedNode[] = [];
  const objectRegex = /Begin Object\s+Class=([^\s]+)\s+Name="([^"]+)"([\s\S]*?)End Object/g;

  let match: RegExpExecArray | null;
  while ((match = objectRegex.exec(t3dText)) !== null) {
    const rawClass = match[1];
    const objectName = match[2];
    const body = match[3];

    // Determine position
    const posXMatch = body.match(/NodePosX=(-?\d+)/);
    const posYMatch = body.match(/NodePosY=(-?\d+)/);
    const posX = posXMatch ? parseInt(posXMatch[1], 10) : 100;
    const posY = posYMatch ? parseInt(posYMatch[1], 10) : 100;

    // Support Unreal Engine 5 Comment Boxes (EdGraphNode_Comment)
    if (rawClass.includes('EdGraphNode_Comment')) {
      const commentMatch = body.match(/NodeComment="([^"]+)"/);
      const commentTitle = commentMatch ? commentMatch[1] : 'Comment Group';
      const widthMatch = body.match(/NodeWidth=(\d+)/);
      const heightMatch = body.match(/NodeHeight=(\d+)/);
      const width = widthMatch ? parseInt(widthMatch[1], 10) : 450;
      const height = heightMatch ? parseInt(heightMatch[1], 10) : 300;

      parsedNodes.push({
        objectName,
        className: rawClass,
        title: commentTitle,
        nodeType: 'macro',
        posX,
        posY,
        pins: [],
        isComment: true,
        width,
        height,
      } as any);
      continue;
    }

    // Determine Title & NodeType
    let title = objectName;
    let nodeType: NodeType = 'function';

    const memberNameMatch = body.match(/MemberName="([^"]+)"/);
    if (memberNameMatch) {
      title = memberNameMatch[1];
      // Clean up common prefixes
      if (title.startsWith('Receive')) {
        title = 'Event ' + title.replace('Receive', '');
      }
    } else if (rawClass.includes('K2Node_MacroInstance')) {
      nodeType = 'macro';
      const macroMatch = body.match(/MacroGraph=EdGraph'"[^'"]*StandardMacros:([^"']+)"'/i);
      if (macroMatch) {
        const macroName = macroMatch[1];
        if (macroName === 'ForEachLoop') {
          title = 'For Each Loop';
        } else if (macroName === 'FlipFlop') {
          title = 'FlipFlop';
        } else if (macroName === 'Gate') {
          title = 'Gate';
        } else {
          title = macroName;
        }
      }
    } else if (rawClass.includes('K2Node_Knot') || objectName.toLowerCase().includes('knot')) {
      title = 'Reroute';
      nodeType = 'reroute';
    } else if (rawClass.includes('K2Node_IfThenElse') || objectName.toLowerCase().includes('branch')) {
      title = 'Branch';
      nodeType = 'macro';
    } else if (rawClass.includes('K2Node_BreakStruct') || rawClass.includes('K2Node_MakeStruct')) {
      const isBreak = rawClass.includes('K2Node_BreakStruct');
      const structMatch = body.match(/StructType=ScriptStruct'"[^'"]*[./]([a-zA-Z0-9_]+)"'/i);
      let rawStructName = structMatch ? structMatch[1] : '';
      if (!rawStructName || rawStructName.toLowerCase().includes('struct')) {
        const parts = objectName.split('_');
        rawStructName = parts.length > 2 ? parts[parts.length - 2] : 'Struct';
      }
      const formattedStruct = rawStructName === 'HitResult' ? 'Hit Result' : rawStructName.replace(/([A-Z])/g, ' $1').trim();
      title = `${isBreak ? 'Break' : 'Make'} ${formattedStruct}`;
      nodeType = 'function';
    } else if (rawClass.includes('K2Node_Event')) {
      nodeType = 'event';
      title = objectName.replace(/K2Node_Event_/i, 'Event ');
    } else if (rawClass.includes('K2Node_Variable')) {
      nodeType = 'variable';
    }

    if (rawClass.includes('K2Node_Event')) {
      nodeType = 'event';
    } else if (rawClass.includes('K2Node_VariableSet')) {
      nodeType = 'variable';
      if (!title.toLowerCase().startsWith('set')) title = 'Set ' + title;
    } else if (rawClass.includes('K2Node_VariableGet')) {
      nodeType = 'variable';
      if (!title.toLowerCase().startsWith('get')) title = 'Get ' + title;
    }

    // Extract CustomProperties Pin definitions line-by-line to handle nested LinkedTo=(...) correctly
    const pins: ParsedPin[] = [];
    const lines = body.split('\n');

    lines.forEach(line => {
      const trimmed = line.trim();
      if (!trimmed.startsWith('CustomProperties Pin')) return;

      const openParen = trimmed.indexOf('(');
      const closeParen = trimmed.lastIndexOf(')');
      if (openParen === -1 || closeParen === -1 || closeParen <= openParen) return;

      const pinContent = trimmed.substring(openParen + 1, closeParen);

      const pinIdMatch = pinContent.match(/PinId="?([^",\s)]+)"?/i);
      const pinNameMatch = pinContent.match(/PinName="([^"]+)"/);
      const pinCatMatch = pinContent.match(/PinType\.PinCategory="([^"]+)"/);
      const subCatMatch = pinContent.match(/PinType\.PinSubCategoryObject=([^\s,]+)/);
      const dirMatch = pinContent.match(/Direction="([^"]+)"/);
      const defValMatch = pinContent.match(/DefaultValue="([^"]*)"/);

      // Extract container and value type metadata
      const containerMatch = pinContent.match(/PinType\.ContainerType=(\w+)/i);
      const isArrayMatch = /PinType\.bIsArray=True/i.test(pinContent);
      const isSetMatch = /PinType\.bIsSet=True/i.test(pinContent);
      const isMapMatch = /PinType\.bIsMap=True/i.test(pinContent);

      let containerType: PinContainerType = 'none';
      if (containerMatch) {
        const raw = containerMatch[1].toLowerCase();
        if (raw === 'array') containerType = 'array';
        else if (raw === 'set') containerType = 'set';
        else if (raw === 'map') containerType = 'map';
      } else if (isArrayMatch) {
        containerType = 'array';
      } else if (isSetMatch) {
        containerType = 'set';
      } else if (isMapMatch) {
        containerType = 'map';
      }

      let valueType: PinType | undefined;
      const pinValMatch = pinContent.match(/PinType\.PinValueType=\(([^)]+)\)/i);
      if (pinValMatch) {
        const valBody = pinValMatch[1];
        const termCatMatch = valBody.match(/TerminalCategory="?([^",\s)]+)"?/i);
        const termSubMatch = valBody.match(/TerminalSubCategoryObject="?([^",\s)]+)"?/i);
        if (termCatMatch) {
          valueType = mapUECategoryToPinType(termCatMatch[1], termSubMatch ? termSubMatch[1] : undefined);
        }
      }

      if (pinIdMatch && pinNameMatch && pinCatMatch) {
        const guid = pinIdMatch[1];
        const name = pinNameMatch[1];
        const direction = dirMatch && dirMatch[1] === 'EGPD_Input' ? 'input' : 'output';
        const rawCategoryType = mapUECategoryToPinType(pinCatMatch[1], subCatMatch ? subCatMatch[1] : undefined);
        const defaultValue = defValMatch ? defValMatch[1] : undefined;

        let pinType: PinType = rawCategoryType;
        let innerType: PinType | undefined;
        if (containerType !== 'none') {
          innerType = rawCategoryType;
          pinType = rawCategoryType;
        }

        // Parse LinkedTo references: LinkedTo=(NodeName PinGuid,...)
        const linkedTo: { targetNodeName: string; targetPinGuid: string }[] = [];
        const linkedToMatch = pinContent.match(/LinkedTo=\(([^)]*)\)/);
        if (linkedToMatch && linkedToMatch[1].trim()) {
          const linksRaw = linkedToMatch[1].split(',');
          linksRaw.forEach(link => {
            const parts = link.trim().split(/\s+/);
            if (parts.length >= 2) {
              const targetNodeName = parts[0].replace(/^[("']+|[)"',]+$/g, '');
              const targetPinGuid = parts[1].replace(/^[("']+|[)"',]+$/g, '');
              if (targetNodeName && targetPinGuid) {
                linkedTo.push({ targetNodeName, targetPinGuid });
              }
            }
          });
        }

        pins.push({
          guid,
          name,
          type: pinType,
          containerType: containerType !== 'none' ? containerType : undefined,
          innerType,
          valueType,
          direction,
          defaultValue,
          linkedTo,
        });
      }
    });

    parsedNodes.push({
      objectName,
      className: rawClass,
      title,
      nodeType,
      posX,
      posY,
      pins,
    });
  }

  // Construct React Flow graph
  const nodeMap = new Map<string, string>(); // objectName -> uuid
  const pinGuidToHandleMap = new Map<string, { nodeId: string; handleId: string }>();

  const nodes: Node<NodeData>[] = parsedNodes.map(pn => {
    const id = uuidv4();
    nodeMap.set(pn.objectName, id);

    if ((pn as any).isComment) {
      return {
        id,
        type: 'commentNode',
        position: { x: pn.posX, y: pn.posY },
        style: {
          width: (pn as any).width || 450,
          height: (pn as any).height || 300,
          zIndex: -1,
        },
        data: {
          title: pn.title,
          color: '#CA8A04',
          inputs: [],
          outputs: [],
          nodeType: 'macro',
        },
      };
    }

    const inputPins: PinData[] = [];
    const outputPins: PinData[] = [];

    pn.pins.forEach(p => {
      const sanitizedName = p.name.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
      const handleId = `${p.type}-${sanitizedName}`;
      pinGuidToHandleMap.set(p.guid.toLowerCase(), { nodeId: id, handleId });

      const pinData: PinData = {
        name: p.name,
        type: p.type,
        ...(p.containerType && p.containerType !== 'none' ? { containerType: p.containerType } : {}),
        ...(p.innerType ? { innerType: p.innerType } : {}),
        ...(p.valueType ? { valueType: p.valueType } : {}),
        value: p.defaultValue,
      };

      if (p.direction === 'input') {
        inputPins.push(pinData);
      } else {
        outputPins.push(pinData);
      }
    });

    return {
      id,
      type: 'customNode',
      position: { x: pn.posX, y: pn.posY },
      data: {
        title: pn.title,
        subtitle: pn.nodeType,
        nodeType: pn.nodeType,
        color: getNodeColor(pn.nodeType, pn.title),
        inputs: inputPins,
        outputs: outputPins,
      },
    };
  });

  // Construct Edges using LinkedTo relationships
  const edges: Edge[] = [];
  const edgeKeySet = new Set<string>();

  parsedNodes.forEach(pn => {
    const sourceNodeId = nodeMap.get(pn.objectName);
    if (!sourceNodeId) return;

    pn.pins.forEach(pin => {
      if (pin.direction === 'output') {
        const sourceHandle = pinGuidToHandleMap.get(pin.guid.toLowerCase())?.handleId
          || `${pin.type}-${pin.name.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase()}`;

        pin.linkedTo.forEach(link => {
          const targetNodeId = nodeMap.get(link.targetNodeName);
          const targetHandle = pinGuidToHandleMap.get(link.targetPinGuid.toLowerCase())?.handleId;

          if (targetNodeId && targetHandle) {
            const edgeKey = `${sourceNodeId}:${sourceHandle}->${targetNodeId}:${targetHandle}`;
            if (!edgeKeySet.has(edgeKey)) {
              edgeKeySet.add(edgeKey);
              edges.push({
                id: `edge-${uuidv4()}`,
                source: sourceNodeId,
                target: targetNodeId,
                sourceHandle,
                targetHandle,
                type: 'blueprintEdge',
                animated: false,
                data: { pinType: pin.type },
              });
            }
          }
        });
      }
    });
  });

  return { nodes, edges };
}
