// src/hooks/useForceLayout.ts
import { useCallback, useRef } from 'react';
import {
    forceSimulation,
    forceLink,
    forceManyBody,
    forceCenter,
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
    width: number; // 画布宽度
    height: number; // 画布高度
    linkDistance?: number; // 边的理想长度
    chargeStrength?: number; // 斥力强度（负值）
    centerStrength?: number; // 向心力强度
    collideRadius?: number; // 碰撞半径
    linkStrength?: number; // 边牵引力强度
    iterations?: number; // 迭代次数
    alphaMin?: number; // 收敛容差
    alphaDecay?: number; // 衰减率（控制收敛速度）
    componentGap?: number; // 连通分量之间的最小间距
}

// P0修复：力导向参数优化，解决节点拥挤
const DEFAULT_CONFIG: Omit<ForceLayoutConfig, 'width' | 'height'> = {
    linkDistance: 180,        // P0：边的理想距离 150-200
    chargeStrength: -700,     // P0：斥力强度 -600~-800
    centerStrength: 0.02,     // P0：极弱向心力或移除
    collideRadius: 75,        // P0：碰撞半径（节点宽140/2 + 边距）
    linkStrength: 0.6,        // P0：边牵引力强度
    iterations: 400,          // P0：迭代次数
    alphaMin: 0.01,
    alphaDecay: 0.015,        // P0：降低衰减率
    componentGap: 800,
};

/**
 * 检测图中的连通分量
 * @param nodes 节点数组
 * @param edges 边数组
 * @returns 连通分量数组，每个分量包含该分量中的节点ID
 */
const findConnectedComponents = (nodes: ForceNode[], edges: ForceEdge[]): string[][] => {
    const adjacencyMap = new Map<string, Set<string>>();
    
    // 初始化邻接表
    nodes.forEach((node) => {
        adjacencyMap.set(node.id, new Set());
    });
    
    // 构建邻接关系
    edges.forEach((edge) => {
        const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
        const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
        
        if (adjacencyMap.has(sourceId)) {
            adjacencyMap.get(sourceId)!.add(targetId);
        }
        if (adjacencyMap.has(targetId)) {
            adjacencyMap.get(targetId)!.add(sourceId);
        }
    });
    
    // BFS 查找连通分量
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
 * @param components 连通分量数组
 * @param config 布局配置
 * @returns 每个分量的偏移量
 */
const calculateComponentOffsets = (
    components: string[][],
    config: ForceLayoutConfig
): Map<string, { offsetX: number; offsetY: number }> => {
    const offsets = new Map<string, { offsetX: number; offsetY: number }>();
    const gap = config.componentGap || 200;
    
    // 简单策略：将分量排列成网格
    const cols = Math.ceil(Math.sqrt(components.length));
    const rows = Math.ceil(components.length / cols);
    
    // 估算每个分量的大小
    const componentSize = Math.max(config.width, config.height) * 0.6;
    const gridSpacing = componentSize + gap;
    
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
 */
export const useForceLayout = () => {
    const simulationRef = useRef<any>(null);
    
    /**
     * 计算力导向布局
     * @param nodes 节点数据
     * @param edges 边数据
     * @param config 布局配置
     * @returns 计算后的节点位置
     */
    const calculateLayout = useCallback(
        (
            nodes: ForceNode[],
            edges: ForceEdge[],
            config: Partial<ForceLayoutConfig> = {}
        ): Array<{ id: string; x: number; y: number }> => {
            if (nodes.length === 0) return [];
            
            const finalConfig: ForceLayoutConfig = { ...DEFAULT_CONFIG, ...config } as ForceLayoutConfig;
            
            // P0修复：使用随机初始化，范围扩大到 ±40% 画布
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
            
            // P0修复：检测连通分量，仅当有多个分量时才应用偏移
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
            
            // 创建力导向模拟
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
                .force(
                    'center',
                    forceCenter(finalConfig.width / 2, finalConfig.height / 2).strength(finalConfig.centerStrength!)
                )
                .force('collide', forceCollide(finalConfig.collideRadius!))
                .alphaMin(finalConfig.alphaMin!)
                .alphaDecay(finalConfig.alphaDecay!)
                .stop();
            
            // 修复点：同步执行迭代，删除 edge-node repulsion 和交叉检测逻辑
            const iterations = finalConfig.iterations || 300;
            for (let i = 0; i < iterations; ++i) {
                simulation.tick();
            }
            
            // 提取最终位置
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
    
    /**
     * 停止模拟（清理资源）
     */
    const stopSimulation = useCallback(() => {
        if (simulationRef.current) {
            simulationRef.current.stop();
            simulationRef.current = null;
        }
    }, []);
    
    return { calculateLayout, stopSimulation };
};
