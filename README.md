# @xpell/3d

## 2.0.8 release candidate

Target publication date: **13 November 2026**; this candidate has not been published.
Use the coordinated 2.0.8 runtime dependencies. See [CHANGELOG](./CHANGELOG.md)
for package changes and qualification limits; [LICENSE](./LICENSE) contains the MIT terms.

## TypeScript browser compatibility (2.0.8)

Use **TypeScript 5.9.3** for browser consumers importing `@xpell/3d` in this
release. The qualified profile uses `strict: true`, `skipLibCheck: false`,
Bundler module resolution and the `ES2022`, `DOM` and `DOM.Iterable` libraries,
with `@types/three@0.182.0` and `@webgpu/types@0.1.68`.

The default DOM-library profile in **TypeScript 7.0.2 is unsupported for these
3D imports**: its WebGPU declarations overlap with the supplemental WebGPU
types pulled in by Three.js typings. The strict check produces 182 declaration
diagnostics. Do not rely on `skipLibCheck` to establish compatibility.

Separate TypeScript 7.0.2 server/NodeNext and UI/Dashboard/File Service browser
checks without 3D pass. Those results do not extend TS7 support to this 3D
profile. This policy changes no runtime API or dependency constraints; newer
compiler/type combinations require their own qualification.

Xpell 2 Alpha --- Spatial Runtime Layer

`@xpell/3d` is the 3D execution layer of the Xpell 2 platform.

It provides a structured, AI-native spatial runtime built on top of
Three.js, fully integrated with the Xpell runtime architecture.

This package works together with:

-   `@xpell/core` --- runtime contracts (XData 2, Nano-Commands 2, XEM)
-   `@xpell/ui` --- real-time UI layer
-   `@xpell/node` --- server runtime (xnode, Wormholes, XDB)

> This package is part of the Xpell 2 Alpha platform.\
> Learn more at https://xpell.ai

------------------------------------------------------------------------

## What @xpell/3d Provides

-   Real-time 3D scene management
-   Integration with XData 2 shared state
-   Event-driven architecture via XEM
-   Modular runtime behavior via XModule
-   Runtime mutation via Nano-Commands
-   Seamless integration with `@xpell/ui` and `@xpell/node`

This is not just a Three.js wrapper --- it is a structured runtime layer
designed for AI collaboration with live spatial systems.

------------------------------------------------------------------------

## Installation (Alpha)

npm install @xpell/3d@alpha

Typically used together with:

npm install @xpell/core@alpha\
npm install @xpell/ui@alpha\
npm install @xpell/node@alpha

Alpha builds are intentionally not published under the `latest` tag.

------------------------------------------------------------------------

## Architecture Role in Xpell 2

Xpell 2 is modular:

-   `@xpell/core` → Runtime contracts + execution engine\
-   `@xpell/ui` → Real-time UI framework\
-   `@xpell/3d` → Spatial runtime layer (Three.js-based)\
-   `@xpell/node` → Server runtime (xnode, Wormholes, XDB)

`@xpell/3d` is responsible only for 3D execution and spatial
interaction. It does NOT contain UI logic from XUI and does NOT
duplicate core runtime contracts.

------------------------------------------------------------------------

## Key Concepts

### Structured 3D Runtime

Scenes are runtime objects --- not static script blocks.

They can be:

-   Created
-   Mutated
-   Extended
-   Controlled via Nano-Commands
-   Driven by shared state (XData 2)

This enables real-time AI-driven scene evolution.

------------------------------------------------------------------------

### AI-Native Spatial Layer

Unlike traditional 3D engines that require rebuilds for behavioral
changes, `@xpell/3d` supports:

-   Runtime object registration
-   Structured event hooks
-   Command-based mutation
-   Declarative scene evolution

This makes vibe coding workflows possible in spatial environments.

------------------------------------------------------------------------

### Wormholes Integration

When combined with `@xpell/node`:

-   Scene state can synchronize in real time
-   Server-driven spatial changes are supported
-   Multi-user systems can share spatial state

------------------------------------------------------------------------

## Alpha Status

This package is currently in Alpha.

-   APIs may evolve
-   Contracts may be refined
-   Performance optimizations are ongoing

Intended for early adopters and architectural experimentation.

------------------------------------------------------------------------

## Roadmap Direction

Planned areas of evolution:

-   Declarative scene schemas
-   Agent-driven spatial mutations
-   Advanced shader/material runtime hooks
-   Tooling for vibe coding workflows
-   Performance tuning for large scene graphs

------------------------------------------------------------------------

## Documentation & Links

Website: https://xpell.ai\
GitHub: https://github.com/xpell-ai/xpell-3d\
Discord: https://discord.gg/cQU79ge3Dx

------------------------------------------------------------------------

## Versioning

Follows semantic versioning under the Xpell 2 release stream.

------------------------------------------------------------------------

## License

MIT License\
© Aime Technologies
