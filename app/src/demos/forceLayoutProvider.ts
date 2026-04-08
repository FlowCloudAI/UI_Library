import {
    forceCollide,
    forceLink,
    forceManyBody,
    forceSimulation,
    forceX,
    forceY,
    type SimulationLinkDatum,
    type SimulationNodeDatum,
} from 'd3-force'
import type { LayoutProvider, LayoutRequest } from 'flowcloudai-ui'

type SimNode = SimulationNodeDatum & {
    id: string
    width: number
    height: number
    radius: number
    degree: number
    anchorX: number
    anchorY: number
}

type SimEdge = SimulationLinkDatum<SimNode> & {
    source: string | SimNode
    target: string | SimNode
    kind?: 'one_way' | 'two_way'
}

const LOG_PREFIX = '[RelationForceProvider]'
const COMPONENT_GAP_X = 2600
const COMPONENT_GAP_Y = 2200
const PADDING = 260

const hashString = (value: string) => {
    let hash = 2166136261

    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index)
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24)
    }

    return Math.abs(hash >>> 0)
}

const toOriginPositionFromCenter = (
    centerX: number,
    centerY: number,
    width: number,
    height: number,
    nodeOrigin: [number, number]
) => ({
    x: centerX - width / 2 + width * nodeOrigin[0],
    y: centerY - height / 2 + height * nodeOrigin[1],
})

const buildAdjacency = (request: LayoutRequest) => {
    const adjacency = new Map<string, Set<string>>()

    request.nodes.forEach((node) => {
        adjacency.set(node.id, new Set())
    })

    request.edges.forEach((edge) => {
        adjacency.get(edge.source)?.add(edge.target)
        adjacency.get(edge.target)?.add(edge.source)
    })

    return adjacency
}

const getConnectedComponents = (adjacency: Map<string, Set<string>>) => {
    const visited = new Set<string>()
    const components: string[][] = []

    adjacency.forEach((_neighbors, nodeId) => {
        if (visited.has(nodeId)) {
            return
        }

        const queue = [nodeId]
        const component: string[] = []
        visited.add(nodeId)

        while (queue.length > 0) {
            const current = queue.shift()!
            component.push(current)

            adjacency.get(current)?.forEach((neighbor) => {
                if (visited.has(neighbor)) {
                    return
                }

                visited.add(neighbor)
                queue.push(neighbor)
            })
        }

        components.push(component)
    })

    return components.sort((left, right) => right.length - left.length)
}

const getInitialAnchor = (componentIndex: number, componentCount: number) => {
    const columns = Math.max(1, Math.ceil(Math.sqrt(componentCount)))
    const row = Math.floor(componentIndex / columns)
    const column = componentIndex % columns

    return {
        x: column * COMPONENT_GAP_X,
        y: row * COMPONENT_GAP_Y,
    }
}

export const demoForceLayoutProvider: LayoutProvider = {
    async computeLayout(request) {
        console.debug(LOG_PREFIX, 'computeLayout called', {
            nodesCount: request.nodes.length,
            edgesCount: request.edges.length,
        })

        if (request.nodes.length === 0) {
            return {
                positions: {},
                bounds: { x: 0, y: 0, width: 0, height: 0 },
                layoutHash: 'force:empty',
            }
        }

        const nodeOrigin = request.nodeOrigin || [0, 0]
        const nodeById = new Map(request.nodes.map((node) => [node.id, node]))
        const degreeMap = new Map(request.nodes.map((node) => [node.id, 0]))

        request.edges.forEach((edge) => {
            degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1)
            degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1)
        })

        const adjacency = buildAdjacency(request)
        const components = getConnectedComponents(adjacency)
        const componentByNodeId = new Map<string, number>()

        components.forEach((component, componentIndex) => {
            component.forEach((nodeId) => {
                componentByNodeId.set(nodeId, componentIndex)
            })
        })

        const simNodes: SimNode[] = request.nodes.map((node) => {
            const componentIndex = componentByNodeId.get(node.id) || 0
            const anchor = getInitialAnchor(componentIndex, components.length)
            const seed = hashString(node.id)
            const angle = (seed % 360) * (Math.PI / 180)
            const radius = 260 + (seed % 5) * 120

            return {
                id: node.id,
                width: node.width,
                height: node.height,
                radius: Math.max(node.width, node.height) * 2.4,
                degree: degreeMap.get(node.id) || 0,
                anchorX: anchor.x,
                anchorY: anchor.y,
                x: anchor.x + Math.cos(angle) * radius,
                y: anchor.y + Math.sin(angle) * radius,
            }
        })

        const simEdges: SimEdge[] = request.edges.map((edge) => ({
            source: edge.source,
            target: edge.target,
            kind: edge.kind,
        }))

        const simulation = forceSimulation(simNodes)
            .force(
                'charge',
                forceManyBody<SimNode>().strength((node) => -14000 - node.degree * 900)
            )
            .force(
                'link',
                forceLink<SimNode, SimEdge>(simEdges)
                    .id((node) => node.id)
                    .distance((edge) => (edge.kind === 'two_way' ? 1500 : 1320))
                    .strength((edge) => (edge.kind === 'two_way' ? 0.12 : 0.1))
            )
            .force(
                'collide',
                forceCollide<SimNode>((node) => node.radius).iterations(8)
            )
            .force(
                'anchorX',
                forceX<SimNode>((node) => node.anchorX).strength(0.045)
            )
            .force(
                'anchorY',
                forceY<SimNode>((node) => node.anchorY).strength(0.045)
            )
            .alphaMin(0.01)
            .alphaDecay(0.015)
            .stop()

        for (let iteration = 0; iteration < 520; iteration += 1) {
            simulation.tick()
        }

        const minCenterX = Math.min(...simNodes.map((node) => (node.x || 0) - node.width / 2))
        const minCenterY = Math.min(...simNodes.map((node) => (node.y || 0) - node.height / 2))
        const positions: Record<string, { x: number; y: number }> = {}
        let maxRight = 0
        let maxBottom = 0

        simNodes.forEach((node) => {
            const shiftedCenterX = (node.x || 0) - minCenterX + PADDING + node.width / 2
            const shiftedCenterY = (node.y || 0) - minCenterY + PADDING + node.height / 2
            positions[node.id] = toOriginPositionFromCenter(
                shiftedCenterX,
                shiftedCenterY,
                node.width,
                node.height,
                nodeOrigin
            )

            maxRight = Math.max(maxRight, shiftedCenterX + node.width / 2)
            maxBottom = Math.max(maxBottom, shiftedCenterY + node.height / 2)
        })

        const bounds = {
            x: 0,
            y: 0,
            width: maxRight + PADDING,
            height: maxBottom + PADDING,
        }

        console.debug(LOG_PREFIX, 'return layout result', {
            positionsCount: Object.keys(positions).length,
            bounds,
        })

        return {
            positions,
            bounds,
            layoutHash: `force:${request.nodes.length}:${request.edges.length}`,
        }
    },
}
