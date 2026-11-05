# Project: Noder — Phase 2 Architectural Implementation

## Architecture
Noder is a web-based Unreal Engine 5 Blueprint visual IDE and AI generation studio built on React 18, React Flow, TypeScript, Tailwind CSS, Vite, and a Python Flask backend (`api/index.py`) integrated with the Google GenAI SDK.

### System Subsystems & Boundaries
1. **UE5 Compiler & Type Subsystem** (`src/types/`, `src/utils/`):
   - Type definitions (`BlueprintTypes.ts`), container types (`TArray`, `TSet`, `TMap`), and wildcard resolution.
   - Bidirectional T3D compiler and parser (`ueT3DCompiler.ts`, `ueT3DParser.ts`).
   - Python automation bridge (`uePythonGenerator.ts`, `unreal/NoderBridge.py`).
2. **Frontend Canvas & Viewport Subsystem** (`src/components/`):
   - Orchestrator (`BlueprintEditor.tsx`), modularized into:
     - `SimulationController` (`src/components/controllers/SimulationController.ts`): Tracing, stepping, breakpoints, speed, audio.
     - `ShortcutController` (`src/components/controllers/ShortcutController.tsx`): Hotkeys, click-spawning, clipboard, focus trapping.
     - `CanvasViewport` (`src/components/canvas/CanvasViewport.tsx`): ReactFlow canvas, LOD grid, HUD, minimap, controls, NLPInput.
   - 120fps hardware-accelerated rendering pipeline and isolated node subscriptions.
3. **AI Generation Engine & Evaluation Subsystem** (`api/`, `src/services/`, `src/benchmark/`):
   - Multi-tier model cascade with quota circuit breaker (Templates -> Flash -> Pro -> Flash-Lite).
   - Multi-tier persistent cache (Redis -> SQLite -> In-Memory LRU).
   - Automated 50-Prompt LLM Evaluation Benchmark Suite across 5 gameplay domains with >=90% scoring threshold.
4. **Adversarial QA & Verification Gate**:
   - Zero-regression test suite (all 42 baseline tests + 71 new unit/integration/stress tests = 113 tests passing).
   - Strict TypeScript (`tsc -b`) and ESLint (0 warnings).

---

## Feature Inventory
| # | Feature | Description | Milestone | Source |
|---|---------|-------------|-----------|--------|
| 1 | Container Types Expansion | Add `TArray`, `TSet`, `TMap` to `BlueprintTypes.ts`, `PinContainerType`, `innerType`, `valueType` | M1 | Survey |
| 2 | Container Normalization Helper | Implement `normalizeContainerType` helper for robust container detection | M1 | Survey |
| 3 | Wildcard Pin Resolution Engine | Equivalence groups, bidirectional type deduction, transitive propagation, reset on disconnect | M1 | Survey |
| 4 | Container T3D Serialization | Output `ContainerType=Array/Set/Map`, `PinValueType`, route to `KismetArrayLibrary`/`KismetSetLibrary`/`KismetMapLibrary` | M1 | Survey |
| 5 | Container T3D Parser | Parse `ContainerType`, `bIsArray`, `bIsSet`, `bIsMap`, and `PinValueType` in `ueT3DParser.ts` | M1 | Survey |
| 6 | Python Automation Bridge | Add `/execute` endpoint to `NoderBridge.py`, auto-clipboard push and asset launch in `uePythonGenerator.ts` | M1 | Survey |
| 7 | Canvas Connection Rules Matrix | Implement `isValidConnection` for container matching and hashable key restrictions | M1 | Survey |
| 8 | Cursor Tracking Re-render Fix | Migrate `lastMousePos` from `useState` to `useRef`, eliminating 120+ unneeded re-renders/sec | M2 | Survey |
| 9 | Node Edge Subscription Isolation | Remove global `edges` subscription in `BlueprintNode.tsx` to stop canvas-wide invalidations | M2 | Survey |
| 10 | SimulationController Extraction | Encapsulate simulation execution, stepping, breakpoints (F9/F5/F10), audio in dedicated controller | M2 | Survey |
| 11 | ShortcutController Extraction | Encapsulate hotkeys, held click-spawn keys (B, S, D, P), clipboard paste, focus trapping | M2 | Survey |
| 12 | CanvasViewport Extraction | Encapsulate ReactFlow wrapper, LOD grid, HUD, minimap, controls, NLPInput, wire drag-drop | M2 | Survey |
| 13 | BlueprintEditor Monolith Reduction | Reduce `BlueprintEditor.tsx` from 1,605 lines to <280 lines clean orchestrator | M2 | Survey |
| 14 | 120fps GPU Layer Acceleration | Add `will-change: transform`, `transform: translateZ(0)`, and `contain: layout style paint` | M2 | Survey |
| 15 | Canonical Templates Activation | Wire `match_canonical_template()` in `api/index.py` for <2ms, 0-token instant generation | M3 | Survey |
| 16 | Intelligent Model Cascade | Implement 4-tier cascade: Tier 0 (Templates) -> Tier 1 (Flash) -> Tier 2 (Pro) -> Tier 3 (Lite) | M3 | Survey |
| 17 | Quota Circuit Breaker | Implement key and model quarantine on 429 RESOURCE_EXHAUSTED errors | M3 | Survey |
| 18 | Persistent SQLite Cache Backend | Add thread-safe SQLite disk persistence with SHA256 indexing and TTL cleanup | M3 | Survey |
| 19 | SSE Streaming Endpoint | Add `/api/generateBlueprintStream` with real-time reasoning chunk streaming | M3 | Survey |
| 20 | 50-Prompt Benchmark Suite | Build automated evaluation harness across 5 domains with 5-dimension scoring rubric (>=90%) | M3 | Survey |
| 21 | Vitest Baseline Preservation | Maintain 100% pass on all 42 baseline tests + new tests (113 tests total) | M4 | Survey |
| 22 | Strict TypeScript Quality | Zero errors on `tsc -b` | M4 | Survey |
| 23 | Strict ESLint Quality | Zero warnings and zero errors on `eslint src --max-warnings 0` | M4 | Survey |
| 24 | Adversarial QA & Forensic Integrity | Independent verification against facades, mocks, and edge case stress tests | M4 | Survey |

---

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | UE5 Type System & Compiler Enhancements | Container types (`TArray`, `TSet`, `TMap`), wildcard resolution engine, T3D generator/parser, Python bridge, connection validator | none | DONE |
| 2 | Frontend Canvas Modularization (120fps) | Decompose `BlueprintEditor.tsx` into `SimulationController`, `ShortcutController`, `CanvasViewport`, fix mousemove re-renders, isolate node edge subscriptions, GPU acceleration | M1 | IN_PROGRESS |
| 3 | AI Pipeline Optimization & Benchmark Suite | Canonical template activation, 4-tier model cascade, quota circuit breaker, SQLite cache, SSE streaming, automated 50-Prompt Benchmark Suite | M1 | PLANNED |
| 4 | Final Milestone E2E & Adversarial QA Gatekeeping | Full vitest run (42 baseline + new tests), strict typecheck, strict lint, edge case stress testing, forensic audit | M1, M2, M3 | PLANNED |
