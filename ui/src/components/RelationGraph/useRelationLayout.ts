// ui/src/components/RelationGraph/useRelationLayout.ts
// Manages the full layout lifecycle:
//  - waits for React Flow to measure all nodes (useNodesInitialized)
//  - computes a graph signature to detect actual changes
//  - triggers the host-supplied async layout function
//  - guards against stale responses from concurrent/superseded requests
//  - executes a one-time fitBounds on first successful layout
//  - handles empty graphs without calling the layout function at all

import { useCallback, useEffect, useRef, useState } from 'react';
import { useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { Edge, Node } from '@xyflow/react';

import { computeGraphSignature } from './graphSignature';
import type { LayoutFunction, LayoutRequest, RelationLayoutState } from './types';

export interface UseRelationLayoutOptions {
    nodes: Node[];
    edges: Edge[];
    layoutFn: LayoutFunction;
    nodeOrigin?: [number, number];
    /** Padding passed to fitBounds (fraction of viewport, e.g. 0.1 = 10%). Default 0.1 */
    fitPadding?: number;
    /** fitBounds animation duration in ms. Default 500 */
    fitDuration?: number;
}

export function useRelationLayout({
    nodes,
    edges,
    layoutFn,
    nodeOrigin = [0, 0],
    fitPadding = 0.1,
    fitDuration = 500,
}: UseRelationLayoutOptions): RelationLayoutState {
    const nodesInitialized = useNodesInitialized();
    const { setNodes, fitBounds } = useReactFlow();

    const [layoutReady, setLayoutReady] = useState(false);
    const [layoutLoading, setLayoutLoading] = useState(false);
    const [layoutError, setLayoutError] = useState<Error | null>(null);

    // Signature of the last successfully applied layout — skip re-layout when equal
    const appliedSigRef = useRef<string | null>(null);
    // Signature of the most recently dispatched request — used for stale-response detection
    const pendingSigRef = useRef<string | null>(null);
    // Whether the one-time initial fitBounds has been executed
    const hasFitRef = useRef(false);

    const runLayout = useCallback(
        async (sig: string, snapshot: { nodes: Node[]; edges: Edge[] }) => {
            // Only nodes that have been measured by React Flow are included in the request.
            // Nodes without dimensions are silently excluded; the layout backend must
            // handle a partial node list gracefully.
            const measuredNodes = snapshot.nodes.filter(
                n => (n.measured?.width ?? 0) > 0 && (n.measured?.height ?? 0) > 0,
            );

            const request: LayoutRequest = {
                nodeOrigin,
                nodes: measuredNodes.map(n => ({
                    id: n.id,
                    width: n.measured!.width!,
                    height: n.measured!.height!,
                })),
                edges: snapshot.edges.map(e => {
                    const d = (e.data ?? {}) as { kind?: 'one_way' | 'two_way' };
                    return {
                        id: e.id,
                        source: e.source,
                        target: e.target,
                        sourceHandle: e.sourceHandle ?? undefined,
                        targetHandle: e.targetHandle ?? undefined,
                        kind: d.kind,
                    };
                }),
            };

            // Mark this as the currently-expected response
            pendingSigRef.current = sig;
            setLayoutLoading(true);
            setLayoutError(null);
            setLayoutReady(false);

            try {
                const response = await layoutFn(request);

                // ── Async safety: discard if a newer request superseded this one ──
                if (pendingSigRef.current !== sig) return;

                // Apply returned positions; nodes absent from positions keep their coords
                setNodes(prev =>
                    prev.map(node => {
                        const pos = response.positions[node.id];
                        if (!pos) return node;
                        return { ...node, position: { x: pos.x, y: pos.y } };
                    }),
                );

                appliedSigRef.current = sig;
                setLayoutReady(true);
                setLayoutLoading(false);

                // One-time viewport fit after the first successful layout
                if (!hasFitRef.current && response.bounds) {
                    hasFitRef.current = true;
                    // Defer to the next frame so React Flow has flushed the position update
                    setTimeout(() => {
                        fitBounds(response.bounds!, {
                            padding: fitPadding,
                            duration: fitDuration,
                        });
                    }, 0);
                }
            } catch (err) {
                // Discard errors from superseded requests
                if (pendingSigRef.current !== sig) return;
                setLayoutError(err instanceof Error ? err : new Error(String(err)));
                setLayoutLoading(false);
            }
        },
        // layoutFn, nodeOrigin, fitPadding, fitDuration control the request/fit shape;
        // setNodes and fitBounds are stable references from useReactFlow.
        [layoutFn, nodeOrigin, fitPadding, fitDuration, setNodes, fitBounds],
    );

    useEffect(() => {
        // ── Empty graph: mark ready without calling the layout function ──
        if (nodes.length === 0) {
            pendingSigRef.current = 'empty';
            appliedSigRef.current = 'empty';
            setLayoutReady(true);
            setLayoutLoading(false);
            setLayoutError(null);
            return;
        }

        // ── Wait for React Flow to measure all nodes ──
        if (!nodesInitialized) return;

        const sig = computeGraphSignature(nodes, edges);

        // ── Skip if the graph hasn't changed since the last applied layout ──
        if (sig === appliedSigRef.current) return;

        // Reset ready state before starting a new layout pass
        setLayoutReady(false);
        runLayout(sig, { nodes, edges });
    }, [nodesInitialized, nodes, edges, runLayout]);

    return { layoutReady, layoutLoading, layoutError };
}
