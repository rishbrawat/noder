# Technical Specification: Canvas Performance & Component Decomposition

**Document ID:** `DOC-04-CANVAS-PERFORMANCE-REFACTOR`  
**Target Codebase Files:**
* `src/components/nodes/BlueprintNode.tsx` (Eliminating re-render triggers & edge scans)
* `src/components/edges/BlueprintEdge.tsx` (Edge path caching & styling)
* `src/components/BlueprintEditor.tsx` (Decomposing the 1,008-line monolith)
* `src/components/LandingPage.tsx` (Decomposing the 1,200+ line monolith)

---

## 1. Problem Statement

### 1.1. Rendering Bottleneck: Re-render Explosions in `BlueprintNode.tsx`
In [BlueprintNode.tsx#L27](file:///d:/noder/src/components/nodes/BlueprintNode.tsx#L27):
```typescript
const edges = useEdges();
```
* **Critical Flaw**: In React Flow, `useEdges()` subscribes the calling component to the entire edge collection state. Whenever any edge is hovered, clicked, animated, added, or removed, **every single node in the entire graph re-renders**.
* **$O(N \times M)$ Pin Lookup**: Inside the node's render loop (line 73):
  ```typescript
  const isConnected = edges.some(edge => edge.target === id && edge.targetHandle === handleId);
  ```
  Every pin on every node performs an $O(E)$ search through all edges. With 40 nodes and 150 pins, this executes over 20,000 array checks on every tiny UI change.
* **Console Spam**: Line 29 prints `console.log(\`Rendering node \${id} with data:\`, data)`. In active drag/connect operations, the console prints thousands of logs, causing severe UI lag.

### 1.2. Component Bloat & Maintenance Debt
* **`BlueprintEditor.tsx` (1,008 lines)**: Combines canvas setup, auto-layout algorithms, modal state, duplicate file tree management, window resize listeners, and error toasts in a single file.
* **`LandingPage.tsx` (1,200+ lines, 46.5 KB)**: Combines navigation, hero, interactive canvas mockups, feature cards, testimonials, pricing, and FAQ in a single monolithic file.

---

## 2. Canvas Performance Optimization Plan

### Step 1: Remove `useEdges()` from `BlueprintNode.tsx`

Instead of letting every node poll the global edge list, compute connection states either:
1. At the **Graph State / Store level** when edges change, updating node `data.connectedPins = Set<string>`.
2. Or use CSS pseudo-classes on handles (`.react-flow__handle-connected`). React Flow automatically appends the class `.react-flow__handle-connecting` and handles connections natively.

Refactored `BlueprintNode.tsx`:

```tsx
import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData, PinType } from '../../types/BlueprintTypes';

// Helper for pin styling
const getPinColorClass = (pinType: PinType): string => {
  switch (pinType) {
    case 'exec': return 'border-gray-200 bg-transparent rounded-none rotate-45'; // Diamond exec pin
    case 'bool': return 'border-red-500 bg-red-500/20 rounded-full';
    case 'float': return 'border-green-400 bg-green-400/20 rounded-full';
    case 'int': return 'border-teal-400 bg-teal-400/20 rounded-full';
    case 'string': return 'border-pink-500 bg-pink-500/20 rounded-full';
    case 'vector': return 'border-amber-400 bg-amber-400/20 rounded-full';
    case 'object': return 'border-blue-400 bg-blue-400/20 rounded-full';
    default: return 'border-gray-400 bg-gray-400/20 rounded-full';
  }
};

const getPinId = (pinType: PinType, pinName: string): string => {
  const cleanName = pinName.replace(/\s+|[^a-zA-Z0-9_-]/g, '-').toLowerCase();
  return `${pinType}-${cleanName}`;
};

// Strict memoization comparison: re-render ONLY if data or selection changes
const BlueprintNode: React.FC<NodeProps<NodeData>> = memo(({ data, selected, id }) => {
  if (!data) return null;

  const nodeColor = data.color || '#1E293B';
  const inputs = data.inputs || [];
  const outputs = data.outputs || [];

  return (
    <div
      className={`blueprint-node select-none bg-[#18181B]/95 text-white rounded-md border text-xs shadow-2xl transition-shadow ${
        selected ? 'border-amber-400 shadow-amber-400/20 ring-1 ring-amber-400' : 'border-[#27272A]'
      } min-w-[200px] overflow-hidden font-sans`}
    >
      {/* Node Header */}
      <div
        className="px-3 py-2 font-semibold text-xs flex items-center justify-between border-b border-white/10"
        style={{ backgroundColor: nodeColor }}
      >
        <span className="truncate">{data.title || 'Node'}</span>
        {data.nodeType && (
          <span className="text-[10px] uppercase font-mono tracking-wider opacity-75">{data.nodeType}</span>
        )}
      </div>

      {/* Pins Layout */}
      <div className="flex justify-between p-2.5 space-x-4 bg-[#121214]">
        {/* Input Pins Column */}
        <div className="space-y-2 flex-1">
          {inputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            return (
              <div key={handleId} className="flex items-center space-x-2 relative group">
                <Handle
                  type="target"
                  position={Position.Left}
                  id={handleId}
                  className={`w-2.5 h-2.5 border-2 ${getPinColorClass(pin.type)} -left-3.5 hover:scale-125 transition-transform`}
                />
                <span className="text-gray-300 group-hover:text-white transition-colors">{pin.name}</span>
                {pin.value !== undefined && pin.value !== null && (
                  <span className="ml-1 px-1 py-0.5 rounded bg-black/40 text-[10px] text-gray-400 font-mono">
                    {String(pin.value)}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Output Pins Column */}
        <div className="space-y-2 flex-1 flex flex-col items-end">
          {outputs.map((pin) => {
            const handleId = getPinId(pin.type, pin.name);
            return (
              <div key={handleId} className="flex items-center space-x-2 relative group">
                <span className="text-gray-300 group-hover:text-white transition-colors">{pin.name}</span>
                <Handle
                  type="source"
                  position={Position.Right}
                  id={handleId}
                  className={`w-2.5 h-2.5 border-2 ${getPinColorClass(pin.type)} -right-3.5 hover:scale-125 transition-transform`}
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}, (prev, next) => {
  return prev.selected === next.selected && prev.data === next.data;
});

BlueprintNode.displayName = 'BlueprintNode';
export default BlueprintNode;
```

---

## 3. Component Decomposition Architecture

### 3.1. Refactoring `BlueprintEditor.tsx`

Extract modular subcomponents into `src/components/editor/`:

```
src/components/
├── BlueprintEditor.tsx (Slim orchestrator: ~200 lines)
└── editor/
    ├── EditorHeader.tsx (Project title, Auto-Save badge, Action buttons)
    ├── EditorToolbar.tsx (Copy to UE5, Export, Auto-arrange, Clear)
    ├── CanvasContainer.tsx (ReactFlow canvas, controls, background)
    └── AutoArrangeEngine.ts (Graph layout calculation logic)
```

#### Directory Layout & Responsibilities:
1. **`EditorHeader.tsx`**: Renders project name breadcrumbs, back button, file metadata, and real-time save indicator.
2. **`EditorToolbar.tsx`**: Contains the **"Copy for UE5 (Ctrl+V)"**, **"Save as Template"**, and zoom/fit actions.
3. **`CanvasContainer.tsx`**: Wraps `<ReactFlow>` and provider with strict memoization on node/edge change handlers.
4. **`AutoArrangeEngine.ts`**: Pure calculation helper (outside React lifecycle) to position nodes in top-to-bottom or left-to-right execution hierarchy.

---

### 3.2. Refactoring `LandingPage.tsx`

Extract modular subcomponents into `src/components/landing/`:

```
src/components/
├── LandingPage.tsx (Slim layout: ~120 lines)
└── landing/
    ├── HeroSection.tsx (Headline, prompt demo input, CTA buttons)
    ├── FeatureGrid.tsx (UE5 parity, AI pipeline, speed metrics)
    ├── InteractiveDemo.tsx (Live read-only React Flow canvas preview)
    ├── PricingSection.tsx (Developer / Studio tiers)
    └── Footer.tsx (Links, community, license)
```

---

## 4. Verification Protocol

1. **FPS Benchmark**:
   * Load a 50-node blueprint.
   * Pan and zoom the canvas rapidly.
   * Verify frame rate stays at 60 FPS without frame drops in Chrome DevTools Performance monitor.
2. **Re-render Isolation Test**:
   * Using React Developer Tools ("Highlight updates when components render"):
   * Drag an edge between two nodes.
   * Verify that **only** the two connected nodes flash; all other 48 nodes must NOT re-render.
3. **Clean Code Verification**:
   * Ensure `BlueprintEditor.tsx` line count is reduced from 1,008 lines to under 250 lines.
   * Ensure `LandingPage.tsx` line count is reduced from 1,200+ lines to under 150 lines.

