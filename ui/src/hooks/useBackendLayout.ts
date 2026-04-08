import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { type Node, useNodesInitialized, useReactFlow } from '@xyflow/react';
import type { LayoutProvider, LayoutRequest, LayoutResponse } from '../components/Relation/layout-provider';

export interface UseBackendLayoutOptions<TNode extends Pick<Node, 'id' | 'measured'>> {
    enabled: boolean;
    nodes: TNode[];
    edges: LayoutRequest['edges'];
    layoutProvider: LayoutProvider;
    nodeOrigin?: [number, number];
    fitPadding?: number;
    fitDuration?: number;
    applyLayout: (response: LayoutResponse, request: LayoutRequest) => void;
}

export interface UseBackendLayoutResult {
    graphSignature: string | null;
    nodesInitialized: boolean;
    layoutReady: boolean;
    layoutLoading: boolean;
    layoutError: Error | null;
    relayout: (options?: { force?: boolean }) => Promise<void>;
}

type PreparedLayout = {
    graphSignature: string;
    request: LayoutRequest;
};

const DEFAULT_FIT_PADDING = 0.24;
const DEFAULT_FIT_DURATION = 300;
const LOG_PREFIX = '[RelationLayout]';

const normalizeDimension = (value?: number) => {
    if (!Number.isFinite(value)) {
        return null;
    }

    return Number(value!.toFixed(2));
};

const toError = (error: unknown) => {
    if (error instanceof Error) {
        return error;
    }

    return new Error(typeof error === 'string' ? error : 'Layout request failed');
};

const compareLayoutEdge = (left: LayoutRequest['edges'][number], right: LayoutRequest['edges'][number]) => {
    const leftKey = [
        left.source,
        left.target,
        left.kind || 'one_way',
        left.sourceHandle || '',
        left.targetHandle || '',
    ].join('|');
    const rightKey = [
        right.source,
        right.target,
        right.kind || 'one_way',
        right.sourceHandle || '',
        right.targetHandle || '',
    ].join('|');

    return leftKey.localeCompare(rightKey);
};

export const useBackendLayout = <TNode extends Pick<Node, 'id' | 'measured'>>({
    enabled,
    nodes,
    edges,
    layoutProvider,
    nodeOrigin = [0, 0],
    fitPadding = DEFAULT_FIT_PADDING,
    fitDuration = DEFAULT_FIT_DURATION,
    applyLayout,
}: UseBackendLayoutOptions<TNode>): UseBackendLayoutResult => {
    const { fitBounds, fitView } = useReactFlow();
    const nodesInitialized = useNodesInitialized();
    const mountedRef = useRef(true);
    const requestIdRef = useRef(0);
    const latestGraphSignatureRef = useRef<string | null>(null);
    const lastRequestedSignatureRef = useRef<string | null>(null);
    const applyLayoutRef = useRef(applyLayout);
    const [layoutReady, setLayoutReady] = useState(!enabled);
    const [layoutLoading, setLayoutLoading] = useState(enabled);
    const [layoutError, setLayoutError] = useState<Error | null>(null);

    useEffect(() => {
        applyLayoutRef.current = applyLayout;
    }, [applyLayout]);

    useEffect(() => {
        mountedRef.current = true;
        console.debug(LOG_PREFIX, 'hook mounted');

        return () => {
            mountedRef.current = false;
            console.debug(LOG_PREFIX, 'hook unmounted');
        };
    }, []);

    const preparedLayout = useMemo<PreparedLayout | null>(() => {
        if (!enabled || !nodesInitialized || nodes.length === 0) {
            return null;
        }

        const normalizedNodes = [...nodes]
            .map((node) => {
                const width = normalizeDimension(node.measured?.width);
                const height = normalizeDimension(node.measured?.height);

                if (width === null || height === null) {
                    return null;
                }

                return {
                    id: node.id,
                    width,
                    height,
                };
            })
            .sort((left, right) => {
                if (!left || !right) {
                    return 0;
                }

                return left.id.localeCompare(right.id);
            });

        if (normalizedNodes.some((node) => node === null)) {
            return null;
        }

        const stableNodes = normalizedNodes.filter(
            (node): node is NonNullable<(typeof normalizedNodes)[number]> => Boolean(node)
        );
        const stableEdges = [...edges]
            .map((edge) => ({
                id: edge.id,
                source: edge.source,
                target: edge.target,
                sourceHandle: edge.sourceHandle,
                targetHandle: edge.targetHandle,
                kind: edge.kind || 'one_way',
            }))
            .sort(compareLayoutEdge);

        return {
            graphSignature: JSON.stringify({
                nodes: stableNodes,
                edges: stableEdges.map((edge) => ({
                    source: edge.source,
                    target: edge.target,
                    kind: edge.kind,
                    sourceHandle: edge.sourceHandle,
                    targetHandle: edge.targetHandle,
                })),
            }),
            request: {
                nodeOrigin,
                nodes: stableNodes,
                edges: stableEdges,
            },
        };
    }, [edges, enabled, nodeOrigin[0], nodeOrigin[1], nodes, nodesInitialized]);

    useEffect(() => {
        latestGraphSignatureRef.current = preparedLayout?.graphSignature || null;
    }, [preparedLayout]);

    useEffect(() => {
        lastRequestedSignatureRef.current = null;
        console.debug(LOG_PREFIX, 'provider or nodeOrigin changed; reset lastRequestedSignature');
    }, [layoutProvider, nodeOrigin[0], nodeOrigin[1]]);

    useEffect(() => {
        if (!enabled) {
            requestIdRef.current += 1;
            lastRequestedSignatureRef.current = null;
            setLayoutReady(true);
            setLayoutLoading(false);
            setLayoutError(null);
            console.debug(LOG_PREFIX, 'layout disabled; mark ready');
            return;
        }

        if (nodes.length === 0 || !nodesInitialized || !preparedLayout) {
            setLayoutReady(false);
            setLayoutLoading(true);
            console.debug(LOG_PREFIX, 'waiting before layout', {
                nodesCount: nodes.length,
                nodesInitialized,
                hasPreparedLayout: Boolean(preparedLayout),
            });
        }
    }, [enabled, nodes.length, nodesInitialized, preparedLayout]);

    const relayout = useCallback(
        async ({ force = false }: { force?: boolean } = {}) => {
            if (!enabled || nodes.length === 0 || !preparedLayout) {
                console.debug(LOG_PREFIX, 'skip relayout', {
                    enabled,
                    nodesCount: nodes.length,
                    hasPreparedLayout: Boolean(preparedLayout),
                    force,
                });
                return;
            }

            if (!force && lastRequestedSignatureRef.current === preparedLayout.graphSignature) {
                console.debug(LOG_PREFIX, 'skip relayout because graphSignature is unchanged', {
                    graphSignature: preparedLayout.graphSignature,
                });
                return;
            }

            const currentRequestId = requestIdRef.current + 1;
            requestIdRef.current = currentRequestId;
            lastRequestedSignatureRef.current = preparedLayout.graphSignature;

            setLayoutReady(false);
            setLayoutLoading(true);
            setLayoutError(null);
            console.debug(LOG_PREFIX, 'request layout', {
                requestId: currentRequestId,
                graphSignature: preparedLayout.graphSignature,
                nodesCount: preparedLayout.request.nodes.length,
                edgesCount: preparedLayout.request.edges.length,
                nodeOrigin: preparedLayout.request.nodeOrigin,
            });

            try {
                const response = await layoutProvider.computeLayout(preparedLayout.request);
                console.debug(LOG_PREFIX, 'layout response resolved', {
                    requestId: currentRequestId,
                    positionsCount: Object.keys(response.positions).length,
                    hasBounds: Boolean(response.bounds),
                    layoutHash: response.layoutHash,
                });

                if (!mountedRef.current) {
                    console.debug(LOG_PREFIX, 'drop layout response because hook is unmounted', {
                        requestId: currentRequestId,
                    });
                    return;
                }

                if (
                    currentRequestId !== requestIdRef.current ||
                    latestGraphSignatureRef.current !== preparedLayout.graphSignature
                ) {
                    console.debug(LOG_PREFIX, 'drop stale layout response', {
                        requestId: currentRequestId,
                        currentRequestIdRef: requestIdRef.current,
                        latestGraphSignature: latestGraphSignatureRef.current,
                        responseGraphSignature: preparedLayout.graphSignature,
                    });
                    return;
                }

                applyLayoutRef.current(response, preparedLayout.request);
                setLayoutReady(true);
                setLayoutLoading(false);
                console.debug(LOG_PREFIX, 'layout applied', {
                    requestId: currentRequestId,
                });

                requestAnimationFrame(() => {
                    if (currentRequestId !== requestIdRef.current) {
                        console.debug(LOG_PREFIX, 'skip viewport update for stale request', {
                            requestId: currentRequestId,
                            currentRequestIdRef: requestIdRef.current,
                        });
                        return;
                    }

                    const viewportPromise = response.bounds
                        ? fitBounds(response.bounds, {
                              padding: fitPadding,
                              duration: fitDuration,
                          })
                        : fitView({
                              padding: fitPadding,
                              duration: fitDuration,
                          });

                    console.debug(LOG_PREFIX, 'update viewport', {
                        requestId: currentRequestId,
                        mode: response.bounds ? 'fitBounds' : 'fitView',
                    });
                    void viewportPromise.catch(() => {});
                });
            } catch (error) {
                if (!mountedRef.current || currentRequestId !== requestIdRef.current) {
                    console.debug(LOG_PREFIX, 'ignore layout error from stale or unmounted request', {
                        requestId: currentRequestId,
                    });
                    return;
                }

                setLayoutError(toError(error));
                setLayoutReady(false);
                setLayoutLoading(false);
                console.error(LOG_PREFIX, 'layout request failed', {
                    requestId: currentRequestId,
                    error,
                });
            }
        },
        [enabled, fitBounds, fitDuration, fitPadding, fitView, layoutProvider, nodes.length, preparedLayout]
    );

    useEffect(() => {
        if (!preparedLayout || !enabled || nodes.length === 0 || !nodesInitialized) {
            return;
        }

        void relayout();
    }, [enabled, nodes.length, nodesInitialized, preparedLayout, relayout]);

    return {
        graphSignature: preparedLayout?.graphSignature || null,
        nodesInitialized,
        layoutReady,
        layoutLoading,
        layoutError,
        relayout,
    };
};
