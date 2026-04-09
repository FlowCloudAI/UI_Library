---
name: RelationGraph component
description: New RelationGraph component built from scratch — no layout algorithm, host injects async layoutFn
type: project
---

RelationGraph was built from scratch in ui/src/components/RelationGraph/ per a detailed spec.

**Why:** The old Relation component (now deleted from git history) mixed layout algorithms with rendering. The new design separates concerns: frontend only renders and measures; the host injects a LayoutFunction.

**How to apply:** When extending or modifying the graph component, keep the protocol types in types.ts frozen (field names are part of the public contract). Layout logic must never be added to the frontend.

Key files:
- types.ts — frozen protocol (LayoutRequest / LayoutResponse / LayoutFunction)
- graphSignature.ts — signature: node id+dimensions + edge topology (not positions)
- useRelationLayout.ts — hook: useNodesInitialized trigger, stale-discard via pendingSigRef, one-time fitBounds
- BidirectionalEdge.tsx — perpendicular offset for A→B / B→A pairs (no offsetSide needed — mirrored dx/dy naturally separate)
- RelationGraph.tsx — ReactFlowProvider wrapper, buildRFNodes preserves measured+position on sync
- RelationGraphDemo.tsx — uses mockGridLayout as stand-in LayoutFunction
