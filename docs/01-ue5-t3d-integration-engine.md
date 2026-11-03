# Technical Specification: Unreal Engine 5 Native Integration & T3D Clipboard Compiler

**Document ID:** `DOC-01-UE5-INTEGRATION`  
**Target Codebase Files:**
* `src/utils/ueT3DCompiler.ts` (New compiler module)
* `src/types/BlueprintTypes.ts` (Data contracts update)
* `src/components/BlueprintEditor.tsx` (Toolbar copy action)
* `src/services/blueprintGenerationService.ts` (Export pipeline update)

---

## 1. Problem Statement & MegaGrant Impact

The core reason Noder cannot currently win an Epic MegaGrant is that **its export does not connect to Unreal Engine 5**. 
In [BlueprintEditor.tsx#L295](file:///d:/noder/src/components/BlueprintEditor.tsx#L295), the "Export" button downloads a file containing React Flow coordinates:
```json
{
  "nodes": [...],
  "edges": [...],
  "projectName": "MyProject"
}
```
Unreal Engine 5 has **zero** capability to ingest this JSON. A developer opening this file gets an unusable text file, breaking the central value proposition of the product.

### The Solution: Unreal Engine Blueprint T3D Format
When a developer highlights nodes in Unreal Engine 5's Blueprint Editor and presses `Ctrl + C`, Unreal writes a standardized ASCII representation (Unreal Text 3D / T3D) to the system clipboard. When `Ctrl + V` is pressed inside Unreal Engine, the editor parses this text and instantiates real C++ graph nodes.

By compiling Noder's internal graph into valid Unreal T3D clipboard text, developers can click **"Copy for UE5"** in Noder, switch to Unreal Engine 5, and press `Ctrl + V` to immediately paste functioning nodes.

---

## 2. Unreal Engine 5 T3D Format Specification

### 2.1. Basic Structure of a Blueprint Clipboard Export
```text
Begin Object Class=/Script/BlueprintGraph.K2Node_CallFunction Name="K2Node_CallFunction_0"
   FunctionReference=(MemberParent=Class'"/Script/Engine.KismetSystemLibrary"',MemberName="PrintString")
   NodePosX=400
   NodePosY=150
   NodeGuid=962B28DC43D55A6E46DA4F949F449911
   CustomProperties Pin (PinId=3B39798E45DC4993B0F75AAEC3A8BCF1,PinName="execute",PinType.PinCategory="exec",Direction="EGPD_Input")
   CustomProperties Pin (PinId=5503022B487A24D47D937FA3C8B72D0B,PinName="then",Direction="EGPD_Output",PinType.PinCategory="exec",LinkedTo=(K2Node_CallFunction_1 6D7D31564EF14BE28C2E208A1847551F,))
   CustomProperties Pin (PinId=C99F9444458319DCACDDFBB56EE17C8A,PinName="InString",PinType.PinCategory="string",DefaultValue="Hello from Noder",Direction="EGPD_Input")
End Object
```

### 2.2. Core Node Classes in Unreal Engine 5

| Unreal C++ Node Class | Usage | Common Member Functions / Identifiers |
| :--- | :--- | :--- |
| `K2Node_CallFunction` | Invoking static, library, or member functions | `FunctionReference=(MemberParent=...,MemberName=...)` |
| `K2Node_Event` | Graph entry points (BeginPlay, Tick, Custom) | `EventReference=(MemberParent=...,MemberName="ReceiveBeginPlay")` |
| `K2Node_IfThenElse` | Branch node (boolean condition) | Native branching (`Condition`, `Then`, `Else`) |
| `K2Node_VariableGet` | Reading variables | `VariableReference=(MemberName="MyVariable",bSelfContext=True)` |
| `K2Node_VariableSet` | Writing variables | `VariableReference=(MemberName="MyVariable",bSelfContext=True)` |
| `K2Node_ExecutionSequence` | Sequence node (multiple execution chains) | `Then_0`, `Then_1`, `Then_2` |

### 2.3. Pin Category Mapping

Noder pin types must translate directly into Unreal Engine's `PinType.PinCategory` and optional `PinSubCategoryObject`:

```typescript
export interface UEPinDefinition {
  pinCategory: string;
  pinSubCategoryObject?: string;
  defaultValue?: string;
  direction: 'EGPD_Input' | 'EGPD_Output';
}

export const PIN_TYPE_MAP: Record<string, { category: string; subCategoryObject?: string }> = {
  exec: { category: 'exec' },
  bool: { category: 'bool' },
  int: { category: 'int' },
  float: { category: 'real', subCategoryObject: 'Float' }, // UE5 uses 'real' with Float/Double
  string: { category: 'string' },
  vector: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Vector' },
  rotator: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Rotator' },
  transform: { category: 'struct', subCategoryObject: '/Script/CoreUObject.Transform' },
  object: { category: 'object', subCategoryObject: '/Script/CoreUObject.Object' },
};
```

---

## 3. Implementation Plan: `src/utils/ueT3DCompiler.ts`

### 3.1. GUID Generation
Unreal Engine requires 32-character uppercase hexadecimal GUIDs without dashes for each node and pin:
```typescript
export const generateUEGuid = (): string => {
  return Array.from({ length: 32 }, () => 
    Math.floor(Math.random() * 16).toString(16).toUpperCase()
  ).join('');
};
```

### 3.2. Compiler Algorithm
The compiler accepts Noder's `Node<NodeData>[]` and `Edge[]` and produces an ASCII string:

```typescript
import { Node, Edge } from 'reactflow';
import { NodeData } from '../types/BlueprintTypes';

export interface T3DCompileResult {
  t3dText: string;
  nodeCount: number;
  connectionCount: number;
  warnings: string[];
}

export function compileGraphToT3D(
  nodes: Node<NodeData>[],
  edges: Edge[]
): T3DCompileResult {
  const warnings: string[] = [];
  const nodeGuidMap = new Map<string, string>(); // ReactFlow NodeId -> UE Node Name
  const pinGuidMap = new Map<string, string>();  // ReactFlow NodeId:PinName -> UE PinGuid

  // Step 1: Pre-generate Node names and Pin GUIDs
  nodes.forEach((node, index) => {
    const ueNodeName = `K2Node_${node.data.nodeType || 'CallFunction'}_${index}`;
    nodeGuidMap.set(node.id, ueNodeName);

    (node.data.inputs || []).forEach(pin => {
      pinGuidMap.set(`${node.id}:in:${pin.name}`, generateUEGuid());
    });
    (node.data.outputs || []).forEach(pin => {
      pinGuidMap.set(`${node.id}:out:${pin.name}`, generateUEGuid());
    });
  });

  // Step 2: Build adjacency connection map
  // sourceNodeId:sourcePinName -> Array<{ targetNodeName, targetPinGuid }>
  const connectionsOut = new Map<string, { targetNodeName: string; targetPinGuid: string }[]>();
  const connectionsIn = new Map<string, { sourceNodeName: string; sourcePinGuid: string }[]>();

  edges.forEach(edge => {
    const sourceNodeName = nodeGuidMap.get(edge.source);
    const targetNodeName = nodeGuidMap.get(edge.target);
    const sourcePinName = edge.sourceHandle?.split('-').slice(1).join('-') || '';
    const targetPinName = edge.targetHandle?.split('-').slice(1).join('-') || '';

    const sourcePinGuid = pinGuidMap.get(`${edge.source}:out:${sourcePinName}`);
    const targetPinGuid = pinGuidMap.get(`${edge.target}:in:${targetPinName}`);

    if (sourceNodeName && targetNodeName && sourcePinGuid && targetPinGuid) {
      const outKey = `${edge.source}:out:${sourcePinName}`;
      const inKey = `${edge.target}:in:${targetPinName}`;

      connectionsOut.set(outKey, [...(connectionsOut.get(outKey) || []), { targetNodeName, targetPinGuid }]);
      connectionsIn.set(inKey, [...(connectionsIn.get(inKey) || []), { sourceNodeName, sourcePinGuid }]);
    }
  });

  // Step 3: Serialize each node
  const outputBlocks: string[] = [];

  nodes.forEach(node => {
    const ueNodeName = nodeGuidMap.get(node.id)!;
    const nodeGuid = generateUEGuid();
    const posX = Math.round(node.position.x);
    const posY = Math.round(node.position.y);

    let nodeClass = '/Script/BlueprintGraph.K2Node_CallFunction';
    let extraHeader = '';

    if (node.data.nodeType === 'event') {
      nodeClass = '/Script/BlueprintGraph.K2Node_Event';
      extraHeader = `   EventReference=(MemberParent=Class'"/Script/Engine.Actor"',MemberName="${node.data.title}")\n   bOverrideFunction=True\n`;
    } else if (node.data.title === 'Branch') {
      nodeClass = '/Script/BlueprintGraph.K2Node_IfThenElse';
    } else {
      extraHeader = `   FunctionReference=(MemberParent=Class'"/Script/Engine.KismetSystemLibrary"',MemberName="${node.data.title.replace(/\s+/g, '')}")\n`;
    }

    let nodeBlock = `Begin Object Class=${nodeClass} Name="${ueNodeName}"\n`;
    nodeBlock += extraHeader;
    nodeBlock += `   NodePosX=${posX}\n`;
    nodeBlock += `   NodePosY=${posY}\n`;
    nodeBlock += `   NodeGuid=${nodeGuid}\n`;

    // Serialize Input Pins
    (node.data.inputs || []).forEach(pin => {
      const pinGuid = pinGuidMap.get(`${node.id}:in:${pin.name}`)!;
      const categoryInfo = PIN_TYPE_MAP[pin.type] || { category: 'string' };
      const links = connectionsIn.get(`${node.id}:in:${pin.name}`) || [];
      const linkedToStr = links.map(l => `LinkedTo=(${l.sourceNodeName} ${l.sourcePinGuid},)`).join(' ');

      const defaultVal = pin.value !== undefined && pin.value !== null ? `DefaultValue="${pin.value}" ` : '';
      const subCat = categoryInfo.subCategoryObject ? `PinType.PinSubCategoryObject=${categoryInfo.subCategoryObject} ` : '';

      nodeBlock += `   CustomProperties Pin (PinId=${pinGuid},PinName="${pin.name}",PinType.PinCategory="${categoryInfo.category}",${subCat}Direction="EGPD_Input",${defaultVal}${linkedToStr})\n`;
    });

    // Serialize Output Pins
    (node.data.outputs || []).forEach(pin => {
      const pinGuid = pinGuidMap.get(`${node.id}:out:${pin.name}`)!;
      const categoryInfo = PIN_TYPE_MAP[pin.type] || { category: 'string' };
      const links = connectionsOut.get(`${node.id}:out:${pin.name}`) || [];
      const linkedToStr = links.map(l => `LinkedTo=(${l.targetNodeName} ${l.targetPinGuid},)`).join(' ');

      const subCat = categoryInfo.subCategoryObject ? `PinType.PinSubCategoryObject=${categoryInfo.subCategoryObject} ` : '';

      nodeBlock += `   CustomProperties Pin (PinId=${pinGuid},PinName="${pin.name}",PinType.PinCategory="${categoryInfo.category}",${subCat}Direction="EGPD_Output",${linkedToStr})\n`;
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
```

---

## 4. UI Integration: Direct Clipboard Copy Button

In [BlueprintEditor.tsx](file:///d:/noder/src/components/BlueprintEditor.tsx), add a primary action button in the top toolbar:

```tsx
const handleCopyToUE5 = useCallback(async () => {
  try {
    if (nodes.length === 0) {
      toast.error("No nodes in the canvas to copy");
      return;
    }

    const { t3dText, nodeCount } = compileGraphToT3D(nodes, edges);
    await navigator.clipboard.writeText(t3dText);
    
    toast.success(
      `Copied ${nodeCount} nodes to clipboard! Paste directly into UE5 Blueprint Graph with Ctrl+V.`,
      { duration: 5000, icon: '📋' }
    );
  } catch (error) {
    console.error("Clipboard export failed:", error);
    toast.error("Failed to copy to clipboard");
  }
}, [nodes, edges]);
```

---

## 5. Testing & Verification Protocol

1. **Unit Test**: Execute a synthetic graph test in Vitest verifying valid `Begin Object ... End Object` wrappers and matched Pin IDs.
2. **UE5 Compatibility Test**:
   * Open Unreal Engine 5.3, 5.4, or 5.5.
   * Create an Actor Blueprint and open the Event Graph.
   * Generate a Sprint Mechanic or Jump Mechanic in Noder.
   * Click **"Copy for UE5"**.
   * In UE5, press `Ctrl + V`.
   * Verify that nodes appear on the canvas, pins connect automatically, and the graph compiles cleanly with zero compilation errors.

