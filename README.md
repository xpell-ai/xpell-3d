# @xpell/3d

Xpell 2 Alpha --- Spatial Runtime Layer

@xpell/3d is the 3D runtime layer of the Xpell 2 ecosystem.\
It provides a structured, AI-native 3D execution environment built on
top of Three.js, fully integrated with the Xpell runtime architecture.

------------------------------------------------------------------------

## Overview

@xpell/3d enables:

-   Real-time 3D scene management
-   Integration with XData 2 shared state
-   Event-driven architecture via XEM
-   Modular runtime behavior via XModule
-   Live evolution of 3D scenes (vibe coding compatible)
-   Seamless integration with @xpell/ui and @xpell/node

This is not just a Three.js wrapper --- it is a structured runtime layer
designed for AI collaboration with live 3D systems.

------------------------------------------------------------------------

## Installation (Alpha)

``` bash
npm install @xpell/3d@alpha
```

You will typically also install:

``` bash
npm install @xpell/core@alpha
npm install @xpell/ui@alpha
```

------------------------------------------------------------------------

## Architecture Role in Xpell 2

Xpell 2 is modular:

-   @xpell/core → Runtime contracts, XData 2, Nano-Commands 2, XEM
-   @xpell/node → Server runtime (xnode), Wormholes, XDB
-   @xpell/ui → 2D real-time UI layer
-   @xpell/3d → Spatial runtime layer (Three.js-based)

@xpell/3d is responsible only for 3D execution and spatial interaction.
It does NOT contain UI logic from XUI and does NOT duplicate core
runtime contracts.

------------------------------------------------------------------------

## Key Concepts

### 1. Structured 3D Runtime

Scenes are not static script blocks. They are runtime objects that can
be:

-   Created
-   Mutated
-   Extended
-   Controlled via Nano-Commands
-   Driven by shared state (XData 2)

This makes real-time AI modification possible.

------------------------------------------------------------------------

### 2. AI-Native Spatial Layer

Unlike traditional 3D engines where code must be rebuilt to change
behavior, @xpell/3d supports:

-   Runtime object registration
-   Structured event hooks
-   Command-based mutation
-   Declarative scene evolution

This is essential for vibe coding workflows.

------------------------------------------------------------------------

### 3. Integration with Wormholes

When used with @xpell/node:

-   Scene state can sync in real time
-   Server-driven 3D changes are possible
-   Multi-user spatial systems can be built

------------------------------------------------------------------------

## Alpha Status

@xpell/3d is currently in **Alpha**.

This means:

-   APIs may evolve
-   Contracts may be refined
-   Performance optimizations are ongoing

Feedback and experimentation are encouraged.

------------------------------------------------------------------------

## Roadmap Direction

Planned evolution areas:

-   Declarative scene schema support
-   Agent-driven spatial mutations
-   Advanced shader/material runtime hooks
-   Better tooling for vibe coding integration
-   Performance tuning for large scene graphs

------------------------------------------------------------------------

## License

MIT (unless otherwise specified)

------------------------------------------------------------------------

## About

Xpell 2 is developed by Aime Technologies.

Learn more: https://xpell.ai

Join the discussion: https://discord.gg/cQU79ge3Dx
