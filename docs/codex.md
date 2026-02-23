# XPELL-3D codex.md — AI Agent Contract for Vibe Coding

## Purpose
This document defines the strict contract for **xpell-3d** — the 3D runtime layer of the Xpell ecosystem.

xpell-3d builds on **xpell-core** and **xpell-ui** to provide:
- THREE.js scene orchestration
- Physics integration (Cannon.js)
- 3D object lifecycle
- Runtime-safe bridges between Xpell objects and Three.js objects

This document MUST be applied by any AI agent modifying or generating code in **xpell-3d**.

---

## Scope & Position in the Stack

```
xpell-core   → runtime engine (loop, XObject, XData, XEventManager)
xpell-ui     → UI + DOM runtime
xpell-3d     → 3D world + Three.js + physics (this project)
```

xpell-3d:
- EXTENDS the runtime model of xpell-core
- MAY depend on xpell-ui utilities
- MUST remain engine-driven (no ad-hoc imperative Three.js logic)

---

## Core Responsibilities

xpell-3d provides:
- X3DWorld — scene, renderer, camera, controls
- X3DObject — runtime-safe wrapper around Three.js + Cannon.js
- Deterministic syncing between runtime state, Three.js, and physics
- Nano-commands for 3D behavior
- Asset loading (GLTF/FBX/DRACO)

xpell-3d does NOT provide:
- Application logic
- UI widgets
- Persistence
- Editor state

---

## Runtime Object Model

### X3DObject
- Extends XObject
- Represents one logical 3D entity
- Owns runtime state, optional Three.js object, optional Cannon.js body

### Non-Negotiable Rule
Three.js objects and Cannon bodies are implementation details and MUST NOT be exposed as mutable public state.

---

## Public 3D Mutation API

Canonical setters (required):
- setPosition({ x, y, z })
- setRotation({ x, y, z, order? })
- setScale({ x, y, z })

Compatibility helpers (required):
- setPositionFromVector3
- setRotationFromEuler
- setScaleFromVector3
- setPositionXYZ
- translate
- rotate
- scaleBy

All helpers MUST delegate to canonical setters.

---

## Read Access

- Getters MAY exist
- Must return copies, never mutable references

Allowed:
- get position(): { x, y, z }

Forbidden:
- get position(): THREE.Vector3

---

## Nano Commands

Nano-commands MUST call public APIs.
Direct access to private runtime fields is forbidden.

---

## XData Rules

xpell-3d fully inherits XData2 rules from xpell-core.
No shadow state, no implicit polling, no hidden mirrors.

---

## Forbidden Patterns

- Exposing Three.js objects publicly
- Direct mutation of Three.js or Cannon outside X3DObject
- Loosening encapsulation to fix compile errors
- UI logic in xpell-3d

---

## One-Line Anchor

xpell-3d is a deterministic 3D runtime layer that synchronizes Xpell objects, Three.js, and physics through explicit APIs only.

