// ui/src/components/RelationGraph/BidirectionalEdge.tsx
// Custom edge that renders bidirectional pairs (A→B and B→A) as offset parallel
// curves so they remain readable instead of completely overlapping.
//
// Detection is purely visual: the `bidirectional` flag in edge.data indicates
// this edge is part of a bidirectional pair.  The perpendicular offset math
// naturally separates A→B and B→A to opposite sides because their dx/dy vectors
// are mirror images — no explicit offsetSide parameter is needed.

import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    type EdgeProps,
} from '@xyflow/react';

/** Shape of the data object we attach to each edge in RelationGraph. */
export interface RelationEdgeData extends Record<string, unknown> {
    label?: string;
    kind?: 'one_way' | 'two_way';
    /** True when a reverse edge (target→source) also exists in the edge set. */
    bidirectional?: boolean;
}

/** Perpendicular offset distance in screen-space pixels for bidirectional pairs. */
const BIDIR_OFFSET = 18;

/**
 * BidirectionalEdge — a Bezier edge with automatic parallel-offset for
 * bidirectional pairs.
 *
 * For a bidirectional pair A→B / B→A:
 *  - The perpendicular vector of A→B points in direction (+perpX, +perpY)
 *  - The perpendicular vector of B→A points in direction (−perpX, −perpY)
 *    (because dx/dy are negated)
 * So both edges shift to OPPOSITE sides of the straight line AB automatically.
 */
export function BidirectionalEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    markerEnd,
    style,
    selected,
}: EdgeProps) {
    const edgeData = (data ?? {}) as RelationEdgeData;
    const isBidirectional = edgeData.bidirectional ?? false;
    const label = edgeData.label;

    let sx = sourceX;
    let sy = sourceY;
    let tx = targetX;
    let ty = targetY;

    if (isBidirectional) {
        const dx = targetX - sourceX;
        const dy = targetY - sourceY;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        // Perpendicular unit vector: rotate (dx,dy) by 90° clockwise → (-dy, dx)
        const perpX = (-dy / len) * BIDIR_OFFSET;
        const perpY = (dx / len) * BIDIR_OFFSET;
        sx += perpX;
        sy += perpY;
        tx += perpX;
        ty += perpY;
    }

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: sx,
        sourceY: sy,
        sourcePosition,
        targetX: tx,
        targetY: ty,
        targetPosition,
    });

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                markerEnd={markerEnd}
                style={{
                    stroke: selected
                        ? 'var(--fc-rg-edge-selected-color, var(--fc-color-primary))'
                        : 'var(--fc-rg-edge-color, var(--fc-gray-400))',
                    strokeWidth: selected ? 2 : 1.5,
                    ...style,
                }}
            />
            {label && (
                <EdgeLabelRenderer>
                    <div
                        className="fc-rg-edge-label nodrag nopan"
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
