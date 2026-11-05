# Test Infrastructure & Test Suite Architecture (TEST_INFRA)

## Executive Summary
This document establishes the test infrastructure and quality assurance matrix for Noder's **Tri-Engine Expansion** (ShadersUE, Niagara VFX Studio, GAS Studio).

The test suite enforces non-regressive functional correctness, opaque-box determinism, and Unreal Engine 5 compatibility across four testing tiers.

---

## Testing Tiers Catalog

```
┌────────────────────────────────────────────────────────────────────────┐
│ Tier 4: Adversarial & Boundary Stress Tests                            │
│ (Depth guards, zero division fallbacks, buffer overflows, tag conflict)│
├────────────────────────────────────────────────────────────────────────┤
│ Tier 3: UE5 Clipboard & Scaffolding Compilers                          │
│ (Material T3D, Niagara T3D, GAS Blueprint T3D, C++ .h / .cpp)          │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 2: Engine & State Evaluation Integration                          │
│ (Particle physics simulation, Euler integration, PBR graph evaluation) │
├────────────────────────────────────────────────────────────────────────┤
│ Tier 1: Unit & Component Foundation                                    │
│ (Math formulas, constants, node catalogs, tag policy matrix rules)     │
└────────────────────────────────────────────────────────────────────────┘
```

### Tier 1: Unit & Component Foundation
Pure isolated unit tests exercising individual modules, data models, and baseline operations:
- **ShadersUE**: Material expression node definitions, constant evaluation (Scalar, Vector2D, Vector3, Vector4), elementary math operations.
- **NiagaraVFX**: Emitter configuration defaults, module catalog schemas, particle state initialization.
- **GASStudio**: Attribute definitions, modifier types, GameplayTag topology structures, instancing policies.

### Tier 2: Simulation & Graph Evaluation Integration
Tests evaluating interconnected nodes, simulation steps, and dataflow execution:
- **ShadersUE**: `evaluateMaterialGraph` traversing multi-node DAGs (Constants -> Multiply -> Lerp -> Root), PBR parameter synthesis (BaseColor, Metallic, Roughness, Emissive).
- **NiagaraVFX**: `ParticleSimulationEngine` Euler integration, continuous spawn rates, burst explosions, lifetime decay, velocity cone trajectory, curl noise turbulence, drag resistance, and ground plane collision with restitution bounce.
- **GASStudio**: Tag policy matrix evaluation, activation eligibility conditions, attribute clamping pipelines.

### Tier 3: UE5 Clipboard & Scaffolding Serialization
Tests verifying exact ASCII format compliance with native Unreal Engine 5 syntax:
- **ShadersUE**: `compileMaterialToT3D` generating `Begin Object Class=/Script/Engine.MaterialGraphNode`, expression linkages (`Expression=MaterialExpression...`), pin connections, coordinate offsets, and `MaterialExpressionConstant3Vector`.
- **NiagaraVFX**: `compileNiagaraToT3D` generating `NiagaraEmitter`, `NiagaraScript` (Spawn & Update), `NiagaraNodeFunctionCall` (SpawnRate, VelocityCone, GravityForce, CurlNoiseForce, Drag), and `NiagaraSpriteRendererProperties`.
- **GASStudio**: `generateAttributeSetCpp` producing `.h` headers with `ATTRIBUTE_ACCESSORS` and `.cpp` implementations with `PreAttributeChange` / `PostGameplayEffectExecute`; `compileGameplayAbilityToT3D` producing Blueprint K2 graphs with `K2Node_Event_ActivateAbility`, `K2Node_CallFunction_CommitAbility`, `K2Node_AsyncAction_PlayMontage`, and `K2Node_CallFunction_EndAbility`.

### Tier 4: Adversarial, Boundary & Resource Stress
Adversarial tests ensuring runtime resilience, failure containment, and boundary protection:
- **ShadersUE**: Circular graph reference loop protection (`depth > 12`), division by zero recovery, unwired root inputs fallback to default dielectric gray (`[0.8, 0.8, 0.8]`), out-of-range roughness clamping $[0.02, 1.0]$.
- **NiagaraVFX**: Zero spawn rate with positive burst, maximum particle buffer cap saturation (exceeding 5,000 / 10,000 particles), extreme gravitational acceleration, substep clamping $\Delta t \le 0.05s$, floor penetration resilience.
- **GASStudio**: Contradictory tag policy detection ($ActivationRequiredTags \cap ActivationBlockedTags \neq \emptyset$), empty containers, division-by-zero modifier recovery, extreme attribute boundary values.

---

## Test Suite Inventory

| Test File | Target Module | Tier Coverage | Target Tests |
|-----------|---------------|---------------|--------------|
| `src/features/shaders/__tests__/ueMaterialT3DCompiler.test.ts` | `ueMaterialT3DCompiler.ts` | Tier 1, 3, 4 | 12 |
| `src/features/shaders/__tests__/webglShaderGenerator.test.ts` | `webglShaderGenerator.ts` | Tier 1, 2, 4 | 11 |
| `src/features/niagara/__tests__/ueNiagaraT3DCompiler.test.ts` | `ueNiagaraT3DCompiler.ts` | Tier 1, 3, 4 | 10 |
| `src/features/niagara/__tests__/particleSimulationEngine.test.ts` | `particleSimulationEngine.ts` | Tier 2, 4 | 13 |
| `src/features/gas/__tests__/gasCppGenerator.test.ts` | `gasCppGenerator.ts` | Tier 1, 3, 4 | 11 |
| `src/features/gas/__tests__/gasT3DCompiler.test.ts` | `gasT3DCompiler.ts` | Tier 1, 3, 4 | 8 |
| `src/features/gas/__tests__/gasTagMatrix.test.ts` | `gasCatalog.ts` / `gasTypes.ts` / Tag Matrix rules | Tier 1, 2, 4 | 8 |

**Baseline Tests**: 124 passing  
**New Feature Tests**: 73 tests  
**Projected Suite Total**: 197 passing tests (exceeding 180+ requirement)

---

## Execution Guide

### Run Complete Test Suite
```bash
npm test
# or
npx vitest run
```

### Run Feature Test Suites Individually
```bash
npx vitest run src/features/shaders
npx vitest run src/features/niagara
npx vitest run src/features/gas
```

---

## Quality & Non-Regression Rules
1. **Zero Mocks for Domain Logic**: All tests execute real compiler, engine, and generator functions directly.
2. **Deterministic Outputs**: All particle physics tests use fixed delta times and seeded or bounded assertions.
3. **UE5 Compatibility**: T3D outputs must match Unreal Engine 5.4 / 5.5 clipboard ASCII specifications.
4. **Zero Regressions**: All 19 pre-existing test files and 124 baseline tests must pass simultaneously.
