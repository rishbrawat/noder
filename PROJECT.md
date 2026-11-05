# Project: Tri-Engine Expansion (ShadersUE, Niagara VFX Studio, GAS Studio)

## Architecture
Noder is an Unreal Engine 5 visual node graph editor built in React, TypeScript, and Three.js.
The Tri-Engine Expansion adds three dedicated studios alongside the existing `EventGraph` and `ConstructionScript`:
1. **ShadersUE**: Pure mathematical dataflow Material Expression graph with live 3D Shader Ball WebGL preview, GLSL generation, and UE5 `MaterialExpression` T3D clipboard compiler.
2. **NiagaraVFX**: Particle Flow Studio with sequential stage pipeline, live GPU particle simulation engine (up to 10k particles at 60 FPS in WebGL dynamic buffers), and UE5 Niagara System/Emitter T3D clipboard compiler.
3. **GASStudio**: Gameplay Ability System studio with ability task definitions, GameplayEffect modifiers/durations, AttributeSet clamping math, Visual Gameplay Tag Policy Matrix, and paired C++ (`.h`/`.cpp`) and Blueprint T3D scaffolding compilers.
4. **Additive Modular UI Integration**: Non-breaking graph mode switcher in `BlueprintToolbar.tsx`, dynamic node catalog swapping in `NodeLibraryDrawer.tsx` and `UnrealContextMenu.tsx`, multi-graph state isolation in `blueprintStore.ts`, and collision-free auxiliary preview dock mounting in `BlueprintEditor.tsx`.

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Baseline Type & Icon Harmonization | Fix `PinData.defaultValue?: any;` and `react-icons/lu` exports | M1 | Survey |
| 2 | Material Expression Node Catalog | Pure mathematical dataflow nodes (Constants, Math, Vectors, UVs, VFX) | M2 | sprint_5_nov.md §2.2 |
| 3 | 3D Live Shader Ball Viewport | Three.js WebGL viewport with PBR Shader Ball, orbit controls, lighting | M2 | sprint_5_nov.md §2.3 |
| 4 | GLSL Fragment Shader Generator | Real-time DAG traversal evaluating PBR properties into GLSL / Three.js | M2 | sprint_5_nov.md §2.2 |
| 5 | MaterialExpression T3D Compiler | UE5.4/5.5 clipboard ASCII serialization for Material Expressions | M2 | sprint_5_nov.md §2.4 |
| 6 | Niagara Stage Module Pipeline | Sequential stages (System/Emitter/Particle Spawn & Update, Forces, Renderers) | M3 | sprint_5_nov.md §3.2 |
| 7 | WebGL GPU Particle Sim Engine | 10k particle simulation with Euler integration, curl noise, floor bounce | M3 | sprint_5_nov.md §3.3 |
| 8 | Emitter Stage Stack UI Dock | Dedicated stage stack inspector with live parameter controls | M3 | sprint_5_nov.md §3.2 |
| 9 | Niagara System/Emitter T3D Compiler | UE5 Niagara Emitter clipboard ASCII serialization | M3 | sprint_5_nov.md §3.4 |
| 10 | Gameplay Ability Definitions & Tasks | Ability instancing, net execution, and async task nodes (PlayMontage) | M4 | sprint_5_nov.md §4.2 |
| 11 | Gameplay Effect Modifiers & Durations | Add/Multiply/Override modifiers and Instant/Infinite/HasDuration policies | M4 | sprint_5_nov.md §4.2 |
| 12 | Visual Gameplay Tag Policy Matrix | Required, Blocked, and Granted tag containers with conflict checking | M4 | sprint_5_nov.md §4.2 |
| 13 | AttributeSet Clamping & C++ Scaffolding | Paired `.h`/`.cpp` scaffolding with ATTRIBUTE_ACCESSORS and PreAttributeChange | M4 | sprint_5_nov.md §4.3 |
| 14 | GAS Blueprint T3D Execution Graph | K2 execution graph with ActivateAbility, CommitAbility, PlayMontage, EndAbility | M4 | sprint_5_nov.md §4.3 |
| 15 | Graph Mode Switcher UI & Dynamic Catalogs | 5-mode top-bar switching, dynamic node library and context menu filtering | M5 | sprint_5_nov.md §5.1 |
| 16 | Collision-Free Auxiliary Dock Mounting | Mounting Shader, Niagara, and GAS preview docks in BlueprintEditor.tsx | M5 | sprint_5_nov.md §5.2 |
| 17 | Multi-Graph Store Isolation | Namespaced node/edge graphs in Zustand store with per-mode history | M5 | sprint_5_nov.md §5.1 |
| 18 | Context-Aware Linter & One-Click Copy | Validator rules for pure dataflow, top-bar one-click UE5 copy routing | M5 | sprint_5_nov.md §5.3 |
| 19 | E2E & Unit Test Expansion (180+ Tests) | Expansion from 124 to 299 passing tests across all modules | M6 / Test Track | DoD / Acceptance |
| 20 | Git Synchronization & Push | Clean commit log and sync with remote master on rishbrawat/noder (Commit 5023303) | M6 | Acceptance |

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| M1 | Baseline Harmonization | Fix PinData type, icon imports, preview hook dependencies | None | DONE |
| M2 | ShadersUE Implementation | Material nodes catalog, Shader Ball viewport, GLSL generator, T3D compiler | M1 | DONE |
| M3 | Niagara VFX Implementation | Stage stack, particle simulation engine, viewport, T3D compiler, graph evaluator | M1 | DONE |
| M4 | GAS Studio Implementation | Ability/Effect/Attribute types, Tag Matrix, C++ scaffolding, T3D compiler | M1 | DONE |
| M5 | Modular UI Integration | BlueprintEditor auxiliary dock mounting, dynamic catalog, mode copy routing | M2, M3, M4 | DONE |
| M6 | Final Acceptance & Hardening | 100% tests pass (299 tests), typecheck 0 errors, lint 0 errors, git sync | M5 | DONE |

## Interface Contracts
### `PinData` Contract (`src/types/BlueprintTypes.ts`)
```typescript
export interface PinData {
  id: string;
  name: string;
  type: PinType;
  direction: PinDirection;
  isArray?: boolean;
  isMap?: boolean;
  isSet?: boolean;
  value?: any;
  defaultValue?: any; // Required for Shaders, Niagara, and GAS parameter defaults
}
```

### Multi-Graph Store Contract (`src/store/blueprintStore.ts`)
```typescript
interface BlueprintState {
  activeGraphType: 'EventGraph' | 'ConstructionScript' | 'Construction' | 'Function' | 'ShadersUE' | 'NiagaraVFX' | 'GASStudio';
  subGraphs: Record<string, { nodes: Node[]; edges: Edge[] }>;
  switchGraph: (targetType: GraphType) => void;
}
```

### Clipboard Export Contract (`src/components/toolbar/BlueprintToolbar.tsx`)
```typescript
interface BlueprintToolbarProps {
  onCopyUE5?: () => void;
  // Based on activeGraphType, routes to:
  // - EventGraph / Construction: compileNodesToUE_T3D
  // - ShadersUE: compileMaterialGraphToUE_T3D
  // - NiagaraVFX: compileNiagaraEmitterToUE_T3D
  // - GASStudio: compileGameplayAbilityToT3D / copyCpp
}
```

## Code Layout
- `src/features/shaders/`:
  - `components/`: `ShaderPreviewViewport.tsx`, `ShaderPresetsToolbar.tsx`, `MaterialNodeCard.tsx`
  - `utils/`: `materialNodesCatalog.ts`, `ueMaterialT3DCompiler.ts`, `webglShaderGenerator.ts`
  - `types/`: `materialTypes.ts`
  - `__tests__/`: `ueMaterialT3DCompiler.test.ts`, `webglShaderGenerator.test.ts`, `shaderComponentsAndCatalog.test.ts`
- `src/features/niagara/`:
  - `components/`: `NiagaraPreviewViewport.tsx`, `EmitterStageStack.tsx`
  - `utils/`: `niagaraModulesCatalog.ts`, `ueNiagaraT3DCompiler.ts`, `particleSimulationEngine.ts`
  - `types/`: `niagaraTypes.ts`
  - `__tests__/`: `ueNiagaraT3DCompiler.test.ts`, `particleSimulationEngine.test.ts`, `niagaraModulesCatalog.test.ts`
- `src/features/gas/`:
  - `components/`: `GameplayTagMatrix.tsx`, `GameplayEffectDrawer.tsx`, `AttributeSetInspector.tsx`
  - `utils/`: `gasCatalog.ts`, `gasCppGenerator.ts`, `gasT3DCompiler.ts`, `gasModifierEvaluator.ts`
  - `types/`: `gasTypes.ts`
  - `__tests__/`: `gasCppGenerator.test.ts`, `gasT3DCompiler.test.ts`, `gasTagMatrix.test.ts`, `gasModifierEvaluator.test.ts`
- `src/components/`:
  - `BlueprintEditor.tsx`: Main studio layout housing canvas and conditionally docked auxiliary viewports
  - `toolbar/BlueprintToolbar.tsx`: Top bar containing 5-mode graph switcher and mode-aware UE5 copy
  - `drawer/NodeLibraryDrawer.tsx` & `UnrealContextMenu.tsx`: Dynamic node catalog providers
- `src/utils/`:
  - `blueprintValidator.ts`: Mode-aware graph validation rules
