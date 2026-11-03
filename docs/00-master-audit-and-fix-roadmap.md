# Master Audit & Fix Roadmap

**Project:** Noder (AI-Powered Unreal Engine 5 Blueprint Generator)  
**Target Goal:** Epic MegaGrants Compliance & Production-Ready Platform  
**Directory:** `docs/`  

---

## 1. Overview & Architecture Strategy

This directory contains in-depth, code-level technical specifications and implementation blueprints to systematically transform Noder from a fragile web mockup into a production-grade, Epic MegaGrants-worthy tool.

```
                           ┌─────────────────────────────────────────────────────────┐
                           │          00-master-audit-and-fix-roadmap.md             │
                           └────────────────────────────┬────────────────────────────┘
                                                        │
         ┌───────────────────────┬──────────────────────┼──────────────────────┬──────────────────────┐
         ▼                       ▼                      ▼                      ▼                      ▼
┌──────────────────┐    ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│   01-ue5-t3d-    │    │  02-persistence- │   │   03-backend-    │   │   04-canvas-     │   │ 05-type-safety-  │
│   integration-   │    │  and-state-      │   │   security-and-  │   │   performance-   │   │ and-test-        │
│   engine.md      │    │  management.md   │   │   ai-pipeline.md │   │   refactor.md    │   │ infrastructure.md│
└──────────────────┘    └──────────────────┘   └──────────────────┘   └──────────────────┘   └──────────────────┘
 [Core Domain Fix]       [Data Loss & Sync]     [Auth & AI Schema]     [Rendering & Bloat]    [Types & Tests]
```

---

## 2. Document Index & Targeted Code Areas

| Spec Document | Focus Area | Key Files Targeted in Code | Status |
| :--- | :--- | :--- | :--- |
| [01-ue5-t3d-integration-engine.md](file:///d:/noder/docs/01-ue5-t3d-integration-engine.md) | Native UE5 T3D Clipboard copy/paste, node translation, pin categorization, and UE5 bridge. | `src/utils/ueT3DCompiler.ts`, `src/types/BlueprintTypes.ts`, `src/components/BlueprintEditor.tsx` | ✅ **Implemented & Verified** |
| [02-persistence-and-state-management.md](file:///d:/noder/docs/02-persistence-and-state-management.md) | Real-time debounced auto-save, elimination of duplicate file trees, template saving. | `src/store/fileSystemStore.ts`, `src/components/BlueprintEditor.tsx`, `src/services/firestore.ts` | ✅ **Implemented & Verified** |
| [03-backend-security-and-ai-pipeline.md](file:///d:/noder/docs/03-backend-security-and-ai-pipeline.md) | Structured Outputs (`response_mime_type="application/json"`), target class awareness, clean JSON parsing. | `api/index.py`, `api/requirements.txt`, `src/services/blueprintGenerationService.ts` | ✅ **Implemented & Verified** |
| [04-canvas-performance-and-component-refactoring.md](file:///d:/noder/docs/04-canvas-performance-and-component-refactoring.md) | Remove $O(N \times M)$ `useEdges` inside nodes, strict memoization, clean toolbar & editor layout. | `src/components/nodes/BlueprintNode.tsx`, `src/components/edges/BlueprintEdge.tsx`, `src/components/BlueprintEditor.tsx` | ✅ **Implemented & Verified** |
| [05-type-safety-and-test-infrastructure.md](file:///d:/noder/docs/05-type-safety-and-test-infrastructure.md) | Fixing 50+ `tsc` errors, fixing broken `package.json` scripts, Vitest test suite, ESLint flat config. | `package.json`, `eslint.config.js`, `src/store/projectStore.ts`, `src/types/BlueprintTypes.ts` | ✅ **Implemented & Verified** |

---

## 3. Master Checklist & Progress Tracker

- [x] **Phase 0: Toolchain & Types**
  - [x] Fix `package.json` scripts (`server`, `lint`, `typecheck`, `test`).
  - [x] Eliminate all 50+ `tsc` compiler errors across all files (`npx tsc -b --force` exits with code 0).
  - [x] Configure Vitest test runner (100% test pass rate).
  - [x] ESLint Flat Config (`eslint.config.js`) passing with 0 errors and 0 warnings.
- [x] **Phase 1: Security & Persistence**
  - [x] Update `api/index.py` with structured JSON output and target class awareness.
  - [x] Modernize `api/requirements.txt`.
  - [x] Connect debounced auto-save (1.5s) to Firestore (`updateBlueprintFile`).
  - [x] Strip out duplicate file explorer code from `BlueprintEditor.tsx`.
  - [x] Implement real Firestore template saving (`saveBlueprintTemplate`).
  - [x] Add real-time Save Status badge ("Saving...", "Saved") to the top control bar.
- [x] **Phase 2: Unreal Engine 5 Native Integration**
  - [x] Build `ueT3DCompiler.ts` with 32-char hexadecimal uppercase GUIDs, pin categories, and default values.
  - [x] Support `K2Node_CallFunction`, `K2Node_Event`, `K2Node_IfThenElse`, `K2Node_VariableGet`.
  - [x] Wire up **"Copy for UE5 (Ctrl+V)"** clipboard action with feedback toast in `BlueprintEditor.tsx`.
  - [x] Case-insensitive pin matching for bidirectional `LinkedTo=(...)` serialization.
  - [x] Unit test suite in `src/utils/__tests__/ueT3DCompiler.test.ts`.
- [x] **Phase 3: Performance & Canvas Optimization**
  - [x] Remove `useEdges()` inside `BlueprintNode.tsx`, eliminating cascading re-renders on edge updates.
  - [x] Add custom memo comparison to `BlueprintNode.tsx`.
  - [x] Visual pin styling matching Unreal Engine 5 conventions (diamond exec pins, colored data circles).
  - [x] Clean up `BlueprintEditor.tsx` from 1,008 lines down to a clean, fast component.
