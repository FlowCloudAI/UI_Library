// src/hooks/useForceLayout.ts
import { useCallback, useRef } from 'react';
import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCollide,
    SimulationNodeDatum,
    SimulationLinkDatum,
} from 'd3-force';

// 节点数据类型
export interface ForceNode extends SimulationNodeDatum {
    id: string;
    name: string;
    type?: string;
    description?: string;
    importance?: number;
}

// 边数据类型
export interface ForceEdge extends SimulationLinkDatum<ForceNode> {
    source: string;
    target: string;
    label?: string;
    type?: string;
    strength?: number;
}

// 布局配置参数
export interface ForceLayoutConfig {
    width: number;
    height: number;
    linkDistance?: number;
    chargeStrength?: number;
    collideRadius?: number;
    linkStrength?: number;
    iterations?: number;
    alphaMin?: number;
    alphaDecay?: number;
    componentGap?: number;
}

const DEFAULT_CONFIG: Omit<ForceLayoutConfig, 'width' | 'height'> = {
    linkDistance: 180,
    chargeStrength: -700,
    collideRadius: 100,
    linkStrength: 0.6,
    iterations: 400,
    alphaMin: 0.01,
    alphaDecay: 0.015,
    componentGap: 300,
};

/**
 * 检测图中的连通分量
 */
const findConnectedComponents = (nodes: ForceNode[], edges: ForceEdge[]): string[][] => {
    const adjacencyMap = new Map<string, Set<string>>();

    nodes.forEach((node) => {
        adjacencyMap.set(node.id, new Set());
    });

    edges.forEach((edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;

        if (adjacencyMap.has(sourceId)) adjacencyMap.get(sourceId)!.add(targetId);
        if (adjacencyMap.has(targetId)) adjacencyMap.get(targetId)!.add(sourceId);
    });

    const visited = new Set<string>();
    const components: string[][] = [];

    for (const node of nodes) {
        if (visited.has(node.id)) continue;

        const component: string[] = [];
        const queue = [node.id];
        visited.add(node.id);

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            component.push(currentId);

            const neighbors = adjacencyMap.get(currentId);
            if (neighbors) {
                for (const neighborId of neighbors) {
                    if (!visited.has(neighborId)) {
                        visited.add(neighborId);
                        queue.push(neighborId);
                    }
                }
            }
        }

        components.push(component);
    }

    return components;
};

/**
 * 为不同连通分量分配空间位置
 */
const calculateComponentOffsets = (
    components: string[][],
    config: ForceLayoutConfig
): Map<string, { offsetX: number; offsetY: number }> => {
    const offsets = new Map<string, { offsetX: number; offsetY: number }>();
    const gap = config.componentGap || 300;

    const cols = Math.ceil(Math.sqrt(components.length));
    const componentSize = Math.max(config.width, config.height) * 0.6;
    const gridSpacing = componentSize + gap;
    const rows = Math.ceil(components.length / cols);

    components.forEach((component, index) => {
        const col = index % cols;
        const row = Math.floor(index / cols);

        const offsetX = (col - (cols - 1) / 2) * gridSpacing;
        const offsetY = (row - (rows - 1) / 2) * gridSpacing;

        component.forEach((nodeId) => {
            offsets.set(nodeId, { offsetX, offsetY });
        });
    });

    return offsets;
};

/**
 * 力导向布局 Hook
 * 注意：不使用 forceCenter，由调用方的 normalizeLayoutPositions 统一处理居中和缩放
 */
export const useForceLayout = () => {
    const simulationRef = useRef<any>(null);

    const calculateLayout = useCallback(
        (
            nodes: ForceNode[],
            edges: ForceEdge[],
            config: Partial<ForceLayoutConfig> = {}
        ): Array<{ id: string; x: number; y: number }> => {
            if (nodes.length === 0) return [];

            const finalConfig: ForceLayoutConfig = { ...DEFAULT_CONFIG, ...config } as ForceLayoutConfig;

            const simNodes: ForceNode[] = nodes.map((node) => ({
                ...node,
                x: (Math.random() - 0.5) * finalConfig.width * 0.8,
                y: (Math.random() - 0.5) * finalConfig.height * 0.8,
            }));

            const simEdges: ForceEdge[] = edges.map((edge) => ({
                ...edge,
                source: edge.source,
                target: edge.target,
            }));

            const components = findConnectedComponents(simNodes, simEdges);
            if (components.length > 1) {
                const componentOffsets = calculateComponentOffsets(components, finalConfig);
                simNodes.forEach((node) => {
                    const offset = componentOffsets.get(node.id);
                    if (offset) {
                        node.x! += offset.offsetX;
                        node.y! += offset.offsetY;
                    }
                });
            }

            const simulation = forceSimulation<ForceNode>()
                .nodes(simNodes)
                .force('charge', forceManyBody().strength(finalConfig.chargeStrength!))
                .force(
                    'link',
                    forceLink<ForceNode, ForceEdge>(simEdges)
                        .id((d: any) => d.id)
                        .distance(finalConfig.linkDistance!)
                        .strength(finalConfig.linkStrength!)
                )
                .force('collide', forceCollide(finalConfig.collideRadius!))
                .alphaMin(finalConfig.alphaMin!)
                .alphaDecay(finalConfig.alphaDecay!)
                .stop();

            const iterations = finalConfig.iterations || 300;
            for (let i = 0; i < iterations; ++i) {
                simulation.tick();
            }

            const positions = simNodes.map((node) => ({
                id: node.id,
                x: node.x || 0,
                y: node.y || 0,
            }));

            simulationRef.current = simulation;

            return positions;
        },
        []
    );

    const stopSimulation = useCallback(() => {
        if (simulationRef.current) {
            simulationRef.current.stop();
            simulationRef.current = null;
        }
    }, []);

    return { calculateLayout, stopSimulation };
};
