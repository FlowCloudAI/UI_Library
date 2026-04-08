export interface LayoutRequest {
    nodeOrigin?: [number, number];
    nodes: {
        id: string;
        width: number;
        height: number;
    }[];
    edges: {
        id?: string;
        source: string;
        target: string;
        sourceHandle?: string;
        targetHandle?: string;
        kind?: 'one_way' | 'two_way';
    }[];
}

export interface LayoutResponse {
    positions: Record<string, { x: number; y: number }>;
    bounds?: {
        x: number;
        y: number;
        width: number;
        height: number;
    };
    layoutHash?: string;
}

export interface LayoutProvider {
    computeLayout(request: LayoutRequest): Promise<LayoutResponse>;
}

const DEFAULT_MOCK_PADDING = 120;
const DEFAULT_MOCK_COLUMNS = 3;
const DEFAULT_MOCK_GAP_X = 960;
const DEFAULT_MOCK_GAP_Y = 720;

const getNodeLayer = (nodeId: string, edges: LayoutRequest['edges']) => {
    const incoming = edges.filter((edge) => edge.target === nodeId).length;
    const outgoing = edges.filter((edge) => edge.source === nodeId).length;

    if (outgoing >= incoming + 2) {
        return 0;
    }

    if (incoming >= outgoing + 2) {
        return 2;
    }

    return 1;
};

const toOriginPosition = (
    x: number,
    y: number,
    width: number,
    height: number,
    nodeOrigin: [number, number]
) => ({
    x: x + width * nodeOrigin[0],
    y: y + height * nodeOrigin[1],
});

export const mockLayoutProvider: LayoutProvider = {
    async computeLayout(request) {
        console.debug('[RelationMockProvider]', 'computeLayout called', {
            nodesCount: request.nodes.length,
            edgesCount: request.edges.length,
            nodeOrigin: request.nodeOrigin,
        });

        const nodeOrigin = request.nodeOrigin || [0, 0];
        const positions: LayoutResponse['positions'] = {};

        if (request.nodes.length === 0) {
            console.debug('[RelationMockProvider]', 'return empty layout');
            return {
                positions,
                bounds: {
                    x: 0,
                    y: 0,
                    width: 0,
                    height: 0,
                },
                layoutHash: 'mock:empty',
            };
        }

        const layeredNodes = request.nodes
            .map((node) => ({
                ...node,
                layer: getNodeLayer(node.id, request.edges),
            }))
            .sort((left, right) => {
                if (left.layer !== right.layer) {
                    return left.layer - right.layer;
                }

                return left.id.localeCompare(right.id);
            });

        const columns = Math.max(1, DEFAULT_MOCK_COLUMNS);
        let maxRight = 0;
        let maxBottom = 0;

        layeredNodes.forEach((node, index) => {
            const row = Math.floor(index / columns);
            const column = index % columns;
            const baseX = column * DEFAULT_MOCK_GAP_X + node.layer * 180;
            const baseY = row * DEFAULT_MOCK_GAP_Y + (node.layer - 1) * 120;

            positions[node.id] = toOriginPosition(baseX, baseY, node.width, node.height, nodeOrigin);
            maxRight = Math.max(maxRight, baseX + node.width);
            maxBottom = Math.max(maxBottom, baseY + node.height);
        });

        const bounds = {
            x: 0,
            y: 0,
            width: maxRight + DEFAULT_MOCK_PADDING * 2,
            height: maxBottom + DEFAULT_MOCK_PADDING * 2,
        };

        console.debug('[RelationMockProvider]', 'return layout result', {
            positionsCount: Object.keys(positions).length,
            bounds,
        });

        return {
            positions,
            bounds,
            layoutHash: `mock:${request.nodes.length}:${request.edges.length}`,
        };
    },
};
