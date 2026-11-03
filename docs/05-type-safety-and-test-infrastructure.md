# Technical Specification: Type Safety, Toolchain & Automated Testing Infrastructure

**Document ID:** `DOC-05-TYPE-SAFETY-TESTING`  
**Target Codebase Files:**
* `package.json` (Scripts, dependencies, Vitest setup)
* `eslint.config.js` (Flat config fixes)
* `src/types/BlueprintTypes.ts` (Comprehensive type definitions)
* `src/store/projectStore.ts` (Timestamp and schema fixes)
* `src/store/fileSystemStore.ts` (Hierarchy properties)
* `src/components/BlueprintEditor.tsx` (Typing props)
* `src/components/edges/BlueprintEdge.tsx` (Interface extension)
* `src/hooks/useBlueprint.ts` (Unused variables and schema contracts)

---

## 1. Problem Statement

Running `npx tsc -b --force` currently exits with **code 1** and over 50 compiler errors. Furthermore, the `npm run lint` and `npm run server` scripts are broken:

1. **Broken ESLint Execution**:
   `npm run lint` executes `eslint . --ext ts,tsx ...`. In ESLint 9 Flat Config (`eslint.config.js`), the `--ext` flag is unsupported and causes an immediate crash.
2. **Broken Server Script**:
   `npm run server` tries to run `python server.py`, which does not exist in the root folder.
3. **Core TypeScript Compilation Failures**:
   * **Missing Properties on Interfaces**: `subtitle` on `NodeData`; `childrenObjects` on `BlueprintFile`.
   * **Firestore Timestamp Type Mismatches**: Mock timestamp objects `{ seconds: number, nanoseconds: number }` missing `.toDate()`, `.toMillis()`, etc. in `projectStore.ts`.
   * **React Flow Incompatible Prop**: `attribution="false"` passed to `<ReactFlow>` (deprecated in React Flow 11).
   * **Unused Locals and Imports**: Strict TS config flags dozens of unused imports and parameters (`LuFolderArchive`, `Position`, `index`, etc.).
   * **Unresolved Module Import**: `blueprintGenerator.ts` imports non-existent `../schemas/blueprintNodeSchema`.
4. **Zero Automated Testing**:
   There are no unit tests, integration tests, or CI checks.

---

## 2. Step-by-Step Resolution Guide

### Step 1: Fix `package.json` Scripts & Dependencies

Update `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc -b && vite build",
    "lint": "eslint src/ --max-warnings 0",
    "lint:fix": "eslint src/ --fix",
    "test": "vitest run",
    "test:watch": "vitest",
    "server": "python api/index.py",
    "typecheck": "tsc -b"
  }
}
```

Install Vitest:
```bash
npm install -D vitest @vitest/coverage-v8
```

---

### Step 2: Fix `src/types/BlueprintTypes.ts`

Ensure all properties used across components exist in the type definition:

```typescript
import { Node, Edge } from 'reactflow';

export type PinType = 
  | 'exec' 
  | 'bool' 
  | 'float' 
  | 'int' 
  | 'string' 
  | 'vector' 
  | 'rotator'
  | 'transform'
  | 'object' 
  | 'class' 
  | 'name' 
  | 'byte' 
  | 'wildcard';

export type NodeType = 'event' | 'function' | 'variable' | 'macro' | 'customNode';

export interface PinData {
  name: string;
  type: PinType;
  description?: string;
  value?: any;
}

export interface NodeData {
  title: string;
  subtitle?: string; // Fixes TS2339 in BlueprintNode & useBlueprint
  nodeType: NodeType;
  inputs: PinData[];
  outputs: PinData[];
  description?: string;
  color?: string;
}

export type BlueprintNode = Node<NodeData>;
export type BlueprintEdge = Edge;

export interface LLMNodeData {
  id: string;
  title: string;
  nodeType: NodeType;
  color?: string;
  description?: string; // Fixes TS2339 in useBlueprint.ts
  position?: { x: number; y: number }; // Fixes TS2339 in useBlueprint.ts
  inputs: { name: string; type: PinType; value?: any }[];
  outputs: { name: string; type: PinType }[];
}

export interface LLMConnectionData {
  sourceNodeId: string;
  sourcePinName: string;
  targetNodeId: string;
  targetPinName: string;
}

export interface LLMBlueprintData {
  blueprintName?: string;
  blueprintDescription?: string;
  nodes: LLMNodeData[];
  connections: LLMConnectionData[];
}
```

---

### Step 3: Fix Edge Component Props in `src/components/edges/BlueprintEdge.tsx`

Extend React Flow's `EdgeProps` without declaring duplicate properties:

```typescript
import React, { memo } from 'react';
import { EdgeProps, getBezierPath, Position } from 'reactflow';

interface BlueprintEdgeData {
  label?: string;
  pinType?: string;
}

const BlueprintEdge = memo<EdgeProps<BlueprintEdgeData>>(({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition = Position.Right,
  targetPosition = Position.Left,
  style = {},
  markerEnd,
  data,
  className
}) => {
  const [edgePath, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const pinType = data?.pinType || className?.split('-')[1] || 'default';

  return (
    <>
      <path
        id={id}
        className={`react-flow__edge-path ${className || ''}`}
        d={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
      {data?.label && (
        <foreignObject
          width={100}
          height={40}
          x={labelX - 50}
          y={labelY - 20}
          className="react-flow__edge-textwrapper"
        >
          <div className="bg-gray-800 text-xs px-2 py-1 rounded text-white text-center">
            {data.label}
          </div>
        </foreignObject>
      )}
    </>
  );
});

BlueprintEdge.displayName = 'BlueprintEdge';
export default BlueprintEdge;
```

---

### Step 4: Fix Firestore Timestamp Mocking in `src/store/projectStore.ts`

Replace pseudo-timestamp objects with `Timestamp.now()` from `firebase/firestore`:

```typescript
import { Timestamp } from 'firebase/firestore';

// In createProject or mock initial state:
const newProject: Project = {
  id: 'local-temp-id',
  name,
  description: description || undefined,
  userId,
  createdAt: Timestamp.now(),
  updatedAt: Timestamp.now(),
};
```

---

### Step 5: Fix `<ReactFlow>` Props in `src/components/BlueprintEditor.tsx`

In [BlueprintEditor.tsx#L810](file:///d:/noder/src/components/BlueprintEditor.tsx#L810):
```tsx
// BEFORE (Causes TS error):
attribution="false"

// AFTER (Complies with React Flow 11):
proOptions={{ hideAttribution: true }}
```

---

### Step 6: Fix ESLint Flat Config in `eslint.config.js`

```javascript
import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'api'] },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  }
);
```

---

## 3. Automated Test Suite Setup (Vitest)

Create `vite.config.ts` test configuration:

```typescript
/// <reference types="vitest" />
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'happy-dom',
    setupFiles: './src/test/setup.ts',
  },
});
```

Create `src/utils/__tests__/ueT3DCompiler.test.ts`:

```typescript
import { describe, it, expect } from 'vitest';
import { compileGraphToT3D } from '../ueT3DCompiler';
import { Node, Edge } from 'reactflow';
import { NodeData } from '../../types/BlueprintTypes';

describe('ueT3DCompiler', () => {
  it('should compile an Event BeginPlay node to valid Unreal T3D format', () => {
    const nodes: Node<NodeData>[] = [
      {
        id: 'node-1',
        type: 'customNode',
        position: { x: 100, y: 100 },
        data: {
          title: 'ReceiveBeginPlay',
          nodeType: 'event',
          inputs: [],
          outputs: [{ name: 'OutputDelegate', type: 'exec' }]
        }
      }
    ];

    const edges: Edge[] = [];

    const result = compileGraphToT3D(nodes, edges);

    expect(result.nodeCount).toBe(1);
    expect(result.t3dText).toContain('Begin Object Class=/Script/BlueprintGraph.K2Node_Event');
    expect(result.t3dText).toContain('CustomProperties Pin');
    expect(result.t3dText).toContain('End Object');
  });
});
```

---

## 4. Verification Protocol

1. **Compilation Check**:
   * Run `npm run typecheck` (`tsc -b`).
   * Must exit with **code 0** and zero errors.
2. **Linting Check**:
   * Run `npm run lint`.
   * Must scan `src/` and report zero errors.
3. **Automated Unit Tests**:
   * Run `npm test`.
   * All compiler and graph transform tests must pass.

