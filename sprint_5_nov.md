# Noder Sprint Blueprint — November 5, 2026
## The Tri-Engine Expansion: Shaders, Niagara VFX, and Gameplay Ability System (GAS)

---

## 1. Executive Sprint Overview

### 1.1 Objective
Mass-produce the foundational architecture for the three most demanded creative departments in Unreal Engine 5:
1. **ShadersUE (Material Graph Studio + 3D Live Viewport)**
2. **Niagara VFX Studio (Particle Flow Graph + Live GPU Particle Sim)**
3. **GAS Studio (Gameplay Ability System + Gameplay Tag Topology)**

### 1.2 Core Principle: Zero UI / Feature Regressions
* The existing **EventGraph** and **ConstructionGraph** systems remain 100% operational.
* All new capabilities are **additive and modular**, plugged in via the existing top-bar navigation graph switcher.
* Canvas state, history undo/redo, Dagre layout engine, Output Log, and Details Drawer are reused seamlessly across all graph modalities.
* Quality Gate: All **124 existing Vitest tests**, TypeScript strict compilation (`tsc -b`), and ESLint (`0 warnings`) must remain green at all stages.

---

## 2. Feature Specification 1: ShadersUE (Material Graph Studio)

### 2.1 Overview & Value Proposition
Unreal Engine 5 Material Graphs are pure mathematical dataflow DAGs without execution wires. `ShadersUE` allows developers and technical artists to design, synthesize, and tweak complex PBR materials and visual shaders with instant live visual feedback in a docked 3D WebGL viewport.

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│              Material Node Canvas             │             3D Live Shader Ball               │
│                                               │                                               │
│ [Time] ──────> [Multiply (Speed)]             │                    ╭─────╮                    │
│                       │                       │                  │  3D   │ (Rotating PBR      │
│                       ▼                       │                  │ Model │  Shader Ball)      │
│ [Panner] ────> [Texture Sample (Noise)]       │                    ╰─────╯                    │
│                       │                       │                                               │
│                       ▼                       │ Orbit Controls • HDRI Environment Lighting    │
│ [Lerp] ──────> [Base Color (RGB)]             │ Preview Meshes: [Sphere] [Cube] [Plane] [Teapot]
│ [Fresnel] ───> [Emissive Color (Gold Rim)]    │ Master Inputs: BaseColor, Metallic, Roughness,│
│ [Scalar] ────> [Roughness (0.15)]             │ Normal, Emissive, Opacity, WPO                │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 2.2 Epic Material Expression Catalog
* **Constants & Parameters:** Scalar (`1`), Vector2, Vector3 / Constant3Vector (`RGB`), Vector4, Static Switch Parameter, Texture Object, Texture Sample.
* **Math Operations:** Add, Subtract, Multiply, Divide, Fmod, Abs, Power, Sqrt, Min/Max, Clamp, Saturate, Sin, Cos, Tangent.
* **Vector & Coordinate Math:** Dot Product, Cross Product, Normalize, Length, Distance, Reflection Vector, Camera Vector WS, Pixel Normal WS, World Position.
* **Texture & Mapping:** Texture Coordinate (UV tiling), Panner, Rotator, Triplanar Projection, BumpOffset (Parallax).
* **Color & Blending:** LinearInterpolate (Lerp), Desaturation, BlendAngleCorrectedNormals, ComponentMask (R, G, B, A isolation).
* **VFX & Dynamics:** Fresnel, DistanceToNearestSurface, DepthFade, WorldPositionOffset (WPO vertex animation).

### 2.3 Interactive 3D WebGL Viewport (`ShaderPreviewViewport.tsx`)
* **Technology:** Three.js / WebGL with `MeshPhysicalMaterial` / custom GLSL shaders.
* **Preview Meshes:**
  * **UE5 Style Shader Ball** (bevelled edges and recessed core for testing specular highlights and roughness falloff).
  * Sphere, Cube, Cylinder, Plane, and Custom GLTF upload support.
* **Lighting Rig:** Studio 3-point lighting + HDRI environment reflection map with camera orbit controls (OrbitControls: drag rotate, right-click pan, scroll zoom).
* **Real-Time Graph Compiler:** Translates visual node network directly into custom WebGL fragment shader uniforms, updating the 3D model in real time (60 FPS) without compilation hitches.

### 2.4 Unreal Engine 5 Output Pipeline
* Serializes the material graph directly into Unreal Engine's native **`MaterialExpression` T3D clipboard format**:
  ```text
  Begin Object Class=/Script/Engine.MaterialGraphNode Name="MaterialGraphNode_0"
     Begin Object Class=/Script/Engine.MaterialExpressionFresnel Name="MaterialExpressionFresnel_0"
        Exponent=3.000000
        BaseReflectFraction=0.040000
     End Object
     MaterialExpression=MaterialExpressionFresnel'"MaterialExpressionFresnel_0"'
  End Object
  ```
* One-click **"Copy UE5 Material"** allows pasting directly into the UE5.4 / 5.5 Material Editor.

---

## 3. Feature Specification 2: Niagara VFX Studio (Particle Flow Studio)

### 3.1 Overview & Value Proposition
Niagara is Unreal Engine's next-generation particle simulation system. Niagara graphs consist of sequential stage modules (System Spawn, Emitter Spawn, Particle Spawn, Particle Update, and Renderers). Noder will provide an intuitive visual flow for authoring particle emitters with live WebGL particle previews.

```
┌───────────────────────────────────────────────┬───────────────────────────────────────────────┐
│             Niagara Emitter Graph             │           WebGL Particle Preview Viewport     │
│                                               │                                               │
│ [Emitter Spawn]                               │                *   .  *  .                    │
│   ├─ Spawn Burst Instantaneous (Count: 250)   │             .  *  (Vortex)  *                 │
│                                               │            *  .   / \   .  *                  │
│ [Particle Spawn]                              │           .  *   /   \   *  .                 │
│   ├─ Add Velocity in Cone (Velocity: 600)     │                                               │
│   ├─ Initialize Particle (Lifetime: 2.5s)     │ 3D Particle Cloud:                            │
│                                               │ • 5,000 GPU Particles Simulation              │
│ [Particle Update]                             │ • Real-time turbulence, curl noise, gravity   │
│   ├─ Gravity Force (Z: -980)                  │ • Interactive camera orbit & pause/reset      │
│   ├─ Curl Noise Force (Strength: 250)         │ • Color Over Life (Gold -> Orange -> Smoke)   │
│   ├─ Color Over Life (Color Curve RGB)        │                                               │
│                                               │ [Play/Pause] [Restart Emitter] [Particle Count│
│ [Renderer]                                    │                                               │
│   └─ Sprite Renderer (Additive Blend)         │                                               │
└───────────────────────────────────────────────┴───────────────────────────────────────────────┘
```

### 3.2 Niagara Module & Node Pipeline
* **Emitter Stages:**
  1. **Emitter Spawn:** Runs once upon emitter initialization (e.g. infinite loop vs burst).
  2. **Emitter Update:** Runs every frame for emitter-level variables (Spawn Rate, Burst Trigger).
  3. **Particle Spawn:** Evaluated once per spawned particle (Initial Color, Initial Size, Initial Velocity, Sphere Location).
  4. **Particle Update:** Evaluated every frame for each living particle (Gravity Force, Curl Noise, Drag, Scale Color, Collision Query).
  5. **Renderer Modules:** Sprite Renderer (Facing Mode, SubUV, Alignment), Ribbon Renderer, Mesh Renderer.
* **Math & Force Expressions:**
  * Vector Math, Curl Noise Vector, Vortex Force, Point Attractor (Black hole pull), Scale Sprite Size by Speed, Collision Query against floor plane.

### 3.3 Live WebGL GPU Particle Preview
* Built using Three.js `InstancedMesh` / `Points` with custom vertex shaders to simulate up to 10,000 particles at 60 FPS.
* Physics engine computes:
  * Acceleration, velocity, and position integration.
  * Drag coefficient damping.
  * Floor plane bounce and restitution.
  * Color ramps and alpha fade-out over normalized lifetime (`Age / Lifetime`).

### 3.4 Native UE5 Niagara Export
* Compiles the visual emitter graph into the native **Niagara System / Emitter T3D copy-paste format** for direct import into UE5 Niagara Editor.

---

## 4. Feature Specification 3: GAS Studio (Gameplay Ability System)

### 4.1 Overview & Value Proposition
The **Gameplay Ability System (GAS)** is Epic Games' enterprise framework for building RPGs, MOBA abilities, hero shooters, and combat games. Instead of chaotic variable spaghetti, GAS is built on **Gameplay Abilities, Gameplay Effects, Attribute Sets, and Gameplay Tags**.

```
┌───────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   GAS Ability Topology View                                   │
│                                                                                               │
│  [Gameplay Ability: GA_DodgeRoll]                                                             │
│    │                                                                                          │
│    ├─ [Ability Cost Effect: GE_DodgeCost]                                                     │
│    │     └─ Attribute: Attributes.Stamina -= 25.0                                             │
│    │                                                                                          │
│    ├─ [Ability Cooldown Effect: GE_DodgeCooldown]                                             │
│    │     └─ Duration: 1.5s | Granted Tag: Ability.Cooldown.Dodge                              │
│    │                                                                                          │
│    ├─ [Tag Policy Matrix]                                                                     │
│    │     ├─ Activation Required Tags: [State.Grounded]                                        │
│    │     ├─ Activation Blocked Tags:  [State.Stunned, State.Dead, Ability.Cooldown.Dodge]    │
│    │     └─ Source Granted Tags:      [State.Invulnerable, Action.Dodging]                    │
│    │                                                                                          │
│    └─ [Execution Graph]                                                                       │
│          Play Montage And Wait (AM_DodgeRoll) ──> Launch Character ──> End Ability            │
└───────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 4.2 GAS Architecture Deliverables
1. **Gameplay Ability Definition (`UGameplayAbility`):**
   * Instancing Policy: Instanced per Actor, Instanced per Execution, Non-Instanced.
   * Net Execution Policy: Local Predicted, Server Only, Server Initiated.
   * Ability Tasks: `Play Montage And Wait`, `Wait Gameplay Event`, `Wait Delay`, `Wait Target Data`.
2. **Gameplay Effect Matrix (`UGameplayEffect`):**
   * Duration Policy: Instant (Damage/Heal), Infinite (Passive Buffs), Has Duration (10s Speed Boost).
   * Attribute Modifiers: Add, Multiply, Divide, Override.
   * Execution Calculations (`GameplayEffectExecutionCalculation` for armor formulas).
3. **Gameplay Tag Topology & Matrix:**
   * Hierarchical tag tree: `State.Combat.Stunned`, `Ability.Melee.Combo1`, `GameplayCue.FX.HitSpark`.
   * Real-time conflict checking: Prevents activating abilities while stunned or dead.
4. **Attribute Set Scaffolding:**
   * Standard PBR Gameplay Attributes: Health, MaxHealth, Stamina, MaxStamina, Mana, Shield, MovementSpeed.
   * `PreAttributeChange` and `PostGameplayEffectExecute` clamping math.

### 4.3 Native UE5 GAS Export
* Generates paired C++ header/source scaffolding (`.h` / `.cpp`) for AttributeSets and GameplayAbilities.
* Generates Blueprint T3D execution graphs for Ability Task orchestration.

---

## 5. Architectural Non-Breaking Integration Strategy

### 5.1 Universal Graph Mode Navigation
In `BlueprintToolbar.tsx`, the graph tabs expand cleanly:
```tsx
type ActiveGraphMode = 
  | 'EventGraph'      // Gameplay Logic & Lifecycle (Active)
  | 'Construction'    // Procedural Actor Setup (Active)
  | 'ShadersUE'       // Material Graph + 3D Preview (Sprint)
  | 'NiagaraVFX'      // Particle Emitters + GPU Sim (Sprint)
  | 'GASStudio';      // Abilities, Tags, & Effects (Sprint)
```
Switching graph modes:
1. Dynamically swaps the active node library catalog (`STANDARD_UE_NODES` vs `MATERIAL_EXPRESSION_NODES` vs `NIAGARA_MODULE_NODES` vs `GAS_TASK_NODES`).
2. Toggles the auxiliary preview dock (Three.js 3D Shader Ball for Shaders; WebGL Particle Viewport for Niagara; Tag Matrix for GAS).
3. Preserves all existing graphs in Zustand store under namespaced graph IDs.

### 5.2 Directory Layout for New Modules
```
src/
├── features/
│   ├── shaders/
│   │   ├── components/
│   │   │   ├── ShaderPreviewViewport.tsx     // Three.js 3D Viewport
│   │   │   ├── ShaderPresetsToolbar.tsx      // PBR presets (Gold, Glass, Water)
│   │   │   └── MaterialNodeCard.tsx          // Specialized visual expression card
│   │   ├── data/
│   │   │   └── materialNodesCatalog.ts       // Epic Material Expression Registry
│   │   ├── utils/
│   │   │   ├── ueMaterialT3DCompiler.ts      // MaterialExpression T3D generator
│   │   │   └── webglShaderGenerator.ts       // Visual Graph to GLSL Fragment Shader
│   │   └── types/
│   │       └── materialTypes.ts
│   ├── niagara/
│   │   ├── components/
│   │   │   ├── NiagaraPreviewViewport.tsx    // WebGL GPU Particle Cloud
│   │   │   └── EmitterStageStack.tsx         // Spawn / Update / Render stack
│   │   ├── data/
│   │   │   └── niagaraModulesCatalog.ts      // Niagara modules registry
│   │   └── utils/
│   │       ├── ueNiagaraT3DCompiler.ts       // Niagara Emitter T3D generator
│   │       └── particleSimulationEngine.ts   // WebGL physics integrator
│   └── gas/
│       ├── components/
│       │   ├── GameplayTagMatrix.tsx         // Hierarchical tag conflict editor
│       │   ├── GameplayEffectDrawer.tsx      // Modifier & duration editor
│       │   └── AttributeSetInspector.tsx     // Attribute clamping definitions
│       ├── data/
│       │   └── gasCatalog.ts                 // Ability tasks & attributes
│       └── utils/
│           ├── gasCppGenerator.ts            // AttributeSet C++ generator
│           └── gasT3DCompiler.ts             // Ability graph T3D generator
```

---

## 6. Sprint Implementation Roadmap & Phases

```
┌────────────────────────────────────────────────────────────────────────┐
│                   Phase 1: Contracts & Type Catalogs                   │
│   • Define MaterialExpression, NiagaraModule, and GAS schemas          │
│   • Author comprehensive node registries with authentic pin definitions│
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               Phase 2: 3D Viewport Engines & WebGL Pipelines           │
│   • Implement Three.js Shader Ball viewport (OrbitControls, HDRI)      │
│   • Implement WebGL GPU Particle simulation canvas                     │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│             Phase 3: AI Synthesis Pipelines & Prompt Schemas           │
│   • Create Pydantic structured schemas for Materials, VFX, and GAS     │
│   • Multi-model cascade integration with persistent disk caching       │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│            Phase 4: Native UE5 Clipboard Compilers & Scaffolding       │
│   • MaterialExpression T3D Clipboard generator                         │
│   • Niagara System/Emitter T3D Clipboard generator                     │
│   • C++ AttributeSet and GameplayAbility scaffolding generator         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
┌───────────────────────────────────▼────────────────────────────────────┐
│               Phase 5: Verification, Tests & Quality Gates             │
│   • Vitest unit test expansion (aiming for 180+ tests passing)         │
│   • Zero TypeScript errors (`tsc -b`), zero ESLint warnings            │
│   • Production build verification (`npm run build`)                    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 7. Definition of Done (DoD) & Acceptance Criteria

1. **Non-Breaking Integrity:**
   * All existing 124 Vitest tests continue passing with zero failures.
   * Standard Blueprint EventGraph and Construction graph generation function without disruption.
   * `npm run typecheck` (`tsc -b`) yields `0 errors`.
   * `npm run lint` yields `0 warnings, 0 errors`.
2. **ShadersUE Deliverables:**
   * Users can switch to `ShadersUE` mode and view the live 3D Shader Ball.
   * AI can synthesize PBR and procedural VFX shaders (Fresnel, Panner, Noise, Lerp, WPO).
   * WebGL preview updates in real-time as nodes and constants are modified.
   * One-click copy generates authentic Unreal Engine `MaterialExpression` T3D text.
3. **Niagara VFX Deliverables:**
   * Users can switch to `NiagaraVFX` mode and view live simulated particles in 3D.
   * Emitter stack renders Spawn, Update, Force, and Renderer modules cleanly.
   * One-click copy generates native Unreal Engine Niagara Emitter clipboard buffer.
4. **GAS Studio Deliverables:**
   * Visual Gameplay Tag matrix with conflict resolution (Blocked vs Required tags).
   * Gameplay Effect modifier editor for Attributes (Health, Stamina, Mana).
   * Ability task graph with C++ and Blueprint scaffolding generation.
5. **Git Synchronization:**
   * Continuous commits and pushes to `master` branch on `rishbrawat/noder`.

