// ui/src/components/RelationGraph/BidirectionalEdge.tsx
//
// Floating-edge implementation: attachment points are computed as the
// intersection of the node-center → opposite-center ray with the node's
// bounding-rectangle border, so edges always leave/arrive at the geometrically
// nearest border point rather than a fixed anchor.
//
// For bidirectional pairs (A→B and B→A) the shared perpendicular offset
// naturally separates the two lines to opposite sides — no extra flag needed.

import {
    BaseEdge,
    EdgeLabelRenderer,
    getBezierPath,
    useReactFlow,
    Position,
    type EdgeProps,
} from '@xyflow/react';

export interface RelationEdgeData extends Record<string, unknown> {
    label?: string;
    kind?: 'one_way' | 'two_way';
    bidirectional?: boolean;
}

const BIDIR_OFFSET = 8;

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/**
 * Find the point where the ray from the rect's centre toward `toward`
 * exits the rectangle border.
 */
function getRectBorderPoint(
    rx: number, ry: number, rw: number, rh: number,
    toward: { x: number; y: number },
): { x: number; y: number } {
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const dx = toward.x - cx;
    const dy = toward.y - cy;

    if (Math.abs(dx) < 0.001 && Math.abs(dy) < 0.001) {
        // Degenerate: same point — return right-edge midpoint as fallback
        return { x: cx + rw / 2, y: cy };
    }

    const hw = rw / 2;
    const hh = rh / 2;
    const scaleX = Math.abs(dx) > 0.001 ? hw / Math.abs(dx) : Infinity;
    const scaleY = Math.abs(dy) > 0.001 ? hh / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY);

    return { x: cx + dx * scale, y: cy + dy * scale };
}

/**
 * Convert a border exit point into the React Flow `Position` enum value
 * (which side of the node the edge exits from).
 * Used to give getBezierPath the correct control-point direction.
 */
function getBorderSide(
    bp: { x: number; y: number },
    rx: number, ry: number, rw: number, rh: number,
): Position {
    const cx = rx + rw / 2;
    const cy = ry + rh / 2;
    const dx = bp.x - cx;
    const dy = bp.y - cy;

    // Compare normalised distances to decide which side dominates
    const normX = rw > 0 ? Math.abs(dx) / (rw / 2) : 0;
    const normY = rh > 0 ? Math.abs(dy) / (rh / 2) : 0;

    if (normX >= normY) {
        return dx >= 0 ? Position.Right : Position.Left;
    } else {
        return dy >= 0 ? Position.Bottom : Position.Top;
    }
}

// ─── Edge component ───────────────────────────────────────────────────────────

export function BidirectionalEdge({
    id,
    source,
    target,
    data,
    markerEnd,
    style,
    selected,
}: EdgeProps) {
    const { getNode } = useReactFlow();

    const edgeData = (data ?? {}) as RelationEdgeData;
    const isBidirectional = edgeData.bidirectional ?? false;
    const label = edgeData.label;

    const sNode = getNode(source);
    const tNode = getNode(target);

    // Nodes not yet measured — skip rendering until layout arrives
    if (
        !sNode?.measured?.width  || !sNode.measured.height  ||
        !tNode?.measured?.width  || !tNode.measured.height
    ) {
        return null;
    }

    const sw = sNode.measured.width;
    const sh = sNode.measured.height;
    const tw = tNode.measured.width;
    const th = tNode.measured.height;

    // Canvas-space node centres
    const scx = sNode.position.x + sw / 2;
    const scy = sNode.position.y + sh / 2;
    const tcx = tNode.position.x + tw / 2;
    const tcy = tNode.position.y + th / 2;

    // Perpendicular offset for bidirectional pairs
    // (A→B and B→A have mirrored dx/dy → opposite perpendicular → they separate naturally)
    const ddx = tcx - scx;
    const ddy = tcy - scy;
    const dlen = Math.sqrt(ddx * ddx + ddy * ddy) || 1;
    const perpX = isBidirectional ? (-ddy / dlen) * BIDIR_OFFSET : 0;
    const perpY = isBidirectional ? ( ddx / dlen) * BIDIR_OFFSET : 0;

    // Border intersection: bias the "toward" direction by the offset so the
    // exit point itself shifts slightly, avoiding both lines exiting at the
    // exact same pixel when nodes are axis-aligned.
    const sp = getRectBorderPoint(
        sNode.position.x, sNode.position.y, sw, sh,
        { x: tcx + perpX, y: tcy + perpY },
    );
    const tp = getRectBorderPoint(
        tNode.position.x, tNode.position.y, tw, th,
        { x: scx + perpX, y: scy + perpY },
    );

    // Final attachment points (apply perpendicular translation)
    const ex1 = sp.x + perpX;
    const ey1 = sp.y + perpY;
    const ex2 = tp.x + perpX;
    const ey2 = tp.y + perpY;

    // Derive bezier handle direction from which side the edge exits/enters
    const srcSide = getBorderSide(sp, sNode.position.x, sNode.position.y, sw, sh);
    const tgtSide = getBorderSide(tp, tNode.position.x, tNode.position.y, tw, th);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX: ex1,
        sourceY: ey1,
        sourcePosition: srcSide,
        targetX: ex2,
        targetY: ey2,
        targetPosition: tgtSide,
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
                            transform: `translate(-50%,-50%) translate(${isBidirectional ? labelX - perpX : labelX}px,${isBidirectional ? labelY - perpY : labelY}px)`,
                        }}
                    >
                        {label}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
}
