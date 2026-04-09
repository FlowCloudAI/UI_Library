// ui/src/components/RelationGraph/graphSignature.ts
// Computes a stable string signature for the current graph state.
// The signature ONLY captures node dimensions and edge topology — never node positions.
// A change in signature means a new layout run is required.

import type { Edge, Node } from '@xyflow/react';

/**
 * Compute a deterministic graph signature string.
 *
 * Included fields:
 *  - Nodes:  id + measured.width + measured.height
 *  - Edges:  source + target + kind + sourceHandle + targetHandle
 *
 * Both lists are sorted before joining so signature is order-independent.
 *
 * A node whose dimensions are not yet measured contributes `id:?x?` — this
 * signature will differ from the post-measurement version, ensuring a layout
 * is triggered once all nodes are measured.
 */
export function computeGraphSignature(nodes: Node[], edges: Edge[]): string {
    const nodePart = nodes
        .map(n => {
            const w = n.measured?.width ?? '?';
            const h = n.measured?.height ?? '?';
            return `${n.id}:${w}x${h}`;
        })
        .sort()
        .join(';');

    const edgePart = edges
        .map(e => {
            const kind = (e.data as { kind?: string } | undefined)?.kind ?? '';
            const sh = e.sourceHandle ?? '';
            const th = e.targetHandle ?? '';
            return `${e.source}->${e.target}[${kind}](${sh},${th})`;
        })
        .sort()
        .join(';');

    return `N[${nodePart}]|E[${edgePart}]`;
}
