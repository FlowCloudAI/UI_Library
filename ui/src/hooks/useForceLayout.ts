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

// 默认配置（针对500节点优化，保证<200ms性能）
const DEFAULT_CONFIG: Omit<ForceLayoutConfig, 'width' | 'height'> = {
    linkDistance: 350,
    chargeStrength: -1200,
    centerStrength: 0.03,
    collideRadius: 140,
    linkStrength: 0.35,
    iterations: 300,
    alphaMin: 0.05,
    alphaDecay: 0.03,
    componentGap: 600,
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
 * 计算点到线段的最短距离和垂足
 */
const pointToSegmentDistance = (
    px: number, py: number,
    x1: number, y1: number,
    x2: number, y2: number
) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const lengthSquared = dx * dx + dy * dy;
    
    if (lengthSquared === 0) {
        // 线段退化为点
        const dist = Math.sqrt((px - x1) ** 2 + (py - y1) ** 2);
        return { distance: dist, closestX: x1, closestY: y1 };
    }
    
    // 计算投影参数 t
    let t = ((px - x1) * dx + (py - y1) * dy) / lengthSquared;
    t = Math.max(0, Math.min(1, t)); // 限制在线段范围内
    
    const closestX = x1 + t * dx;
    const closestY = y1 + t * dy;
    const distance = Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
    
    return { distance, closestX, closestY };
};

/**
 * 应用边-节点排斥力（避免边穿过节点）
 */
const applyEdgeNodeRepulsion = (
    nodes: ForceNode[],
    edges: ForceEdge[],
    repulsionStrength: number = 50,
    nodeRadius: number = 70
) => {
    nodes.forEach((node) => {
        if (!node.x || !node.y) return;
        
        let forceX = 0;
        let forceY = 0;
        
        const nodeX = node.x; // 提取为确定的 number 类型
        const nodeY = node.y;
        
        edges.forEach((edge) => {
            const sourceId = typeof edge.source === 'string' ? edge.source : (edge.source as any).id;
            const targetId = typeof edge.target === 'string' ? edge.target : (edge.target as any).id;
            
            // 跳过与该节点相连的边
            if (sourceId === node.id || targetId === node.id) return;
            
            const sourceNode = nodes.find(n => n.id === sourceId);
            const targetNode = nodes.find(n => n.id === targetId);
            
            if (!sourceNode || !targetNode || !sourceNode.x || !sourceNode.y || !targetNode.x || !targetNode.y) return;
            
            // 计算节点到边的距离
            const { distance, closestX, closestY } = pointToSegmentDistance(
                nodeX, nodeY,
                sourceNode.x, sourceNode.y,
                targetNode.x, targetNode.y
            );
            
            // 如果距离小于阈值，施加排斥力
            if (distance < nodeRadius && distance > 0.001) {
                const force = (nodeRadius - distance) / nodeRadius * repulsionStrength;
                const dirX = nodeX - closestX;
                const dirY = nodeY - closestY;
                const len = Math.sqrt(dirX * dirX + dirY * dirY);
                
                if (len > 0.001) {
                    forceX += (dirX / len) * force;
                    forceY += (dirY / len) * force;
                }
            }
        });
        
        // 应用力到节点位置
        if (Math.abs(forceX) > 0.001 || Math.abs(forceY) > 0.001) {
            node.x! += forceX;
            node.y! += forceY;
        }
    });
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
            
            // 深拷贝节点数据，避免修改原数据
            // 使用更大的随机范围，促进均匀分布
            const simNodes: ForceNode[] = nodes.map((node) => ({
                ...node,
                x: (Math.random() - 0.5) * finalConfig.width * 1.2,
                y: (Math.random() - 0.5) * finalConfig.height * 1.2,
            }));
            
            const simEdges: ForceEdge[] = edges.map((edge) => ({
                ...edge,
                source: edge.source,
                target: edge.target,
            }));
            
            // 检测连通分量
            const components = findConnectedComponents(simNodes, simEdges);
            const componentOffsets = calculateComponentOffsets(components, finalConfig);
            
            // 应用分量偏移
            simNodes.forEach((node) => {
                const offset = componentOffsets.get(node.id);
                if (offset) {
                    node.x! += offset.offsetX;
                    node.y! += offset.offsetY;
                }
            });
            
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
            
            // 同步执行迭代（不带动画）
            const iterations = finalConfig.iterations || 300;
            for (let i = 0; i < iterations; ++i) {
                simulation.tick();
                
                // 每 10 次迭代应用一次边-节点排斥力（平衡性能和效果）
                if (i % 10 === 0) {
                    applyEdgeNodeRepulsion(simNodes, simEdges, 50, 70);
                }
            }
            
            // 最后一次强力调整
            applyEdgeNodeRepulsion(simNodes, simEdges, 80, 70);
            
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
