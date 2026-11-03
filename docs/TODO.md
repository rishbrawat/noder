# Noder Engineering TODO List

This document tracks upcoming architectural enhancements scheduled for implementation after resolving active user feedback and workflow blockers.

---

## 1. Context Window Optimization & Incremental Graph Editing
- [ ] **Minified Blueprint IR (Intermediate Representation)**
  - Build a lightweight graph serialization compiler that strips UI coordinates, internal handles, and styling.
  - Condenses 30-node graphs from ~10,000 tokens down to ~350 tokens (90%+ reduction) for LLM prompts.
- [ ] **Selection-Scoped Context for Iterative Graph Modifications**
  - When modifying an existing graph (*"Add a cooldown to sprint"* or *"Add error handling here"*), send only the selected nodes and their immediate boundary pins rather than the entire canvas.
- [ ] **Canvas Delta Patcher**
  - Merge the LLM's structured delta output back onto the active canvas without resetting viewport pan/zoom or deselecting unaffected nodes.

---

## 2. Multi-Key API Rotation & Quota Resiliency
- [ ] **Server-Side API Key Pool (`GEMINI_API_KEYS`)**
  - Support multiple comma-separated keys in environment variables.
  - Implement Least-Recently-Used (LRU) / Weighted Round-Robin selection.
- [ ] **HTTP 429 Circuit Breaker & Automatic Failover**
  - Automatically detect `429 ResourceExhausted` / quota limits, quarantine the rate-limited key for a cooldown period (e.g., 60s), and transparently retry the request with the next standby key without failing the user's action.
- [ ] **Model Cascade Fallbacks**
  - Primary: `gemini-4-argon` $\to$ Fallback: `gemini-3.8-flash` $\to$ Fallback: `gemini-3.5-pro` $\to$ Fallback: `gemini-3.5-flash`.
- [ ] **Client-Side BYOK (Bring Your Own Key)**
  - Provide an optional field in Project Settings where developers can supply their personal Gemini/OpenAI API key stored locally in browser `localStorage`.
