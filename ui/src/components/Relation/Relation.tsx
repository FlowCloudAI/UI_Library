// src/components/Relation/Relation.tsx
import React, { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { FC } from 'react';
import {
    Background,
    BaseEdge,
    Edge,
    EdgeLabelRenderer,
    EdgeProps,
    Handle,
    MarkerType,
    Node,
    NodeProps,
    Position,
    ReactFlow,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import './Relation.css';
import type { LayoutProvider, LayoutResponse } from './layout-provider';
import { useBackendLayout } from '../../hooks/useBackendLayout';

export type RelationDirection = 'one_way' | 'two_way';
export type RelationLabelMode = 'always' | 'selected' | 'hover' | 'important' | 'never';

export interface RelationTypeStyle {
    color?: string;
    icon?: string;
}

export interface RelationNodeData extends Record<string, unknown> {
    id: string;
    name?: string;
    title?: string;
    type?: string;
    group?: string;
    categoryId?: string;
    summary?: string;
    description?: string;
    content?: string;
    avatar?: string;
    importance?: number;
    color?: string;
    icon?: string;
}

export interface RelationEdgeData extends Record<string, unknown> {
    source: string;
    target: string;
    label?: string;
    content?: string;
    type?: string;
    relation?: RelationDirection;
    direction?: RelationDirection;
    strength?: number;
    important?: boolean;
}

export interface RelationLayoutState {
    graphSignature: string | null;
    nodesInitialized: boolean;
    layoutReady: boolean;
    layoutLoading: boolean;
    layoutError: Error | null;
    relayout: (options?: { force?: boolean }) => Promise<void>;
}

export interface RelationProps {
    data?: {
        nodes: RelationNodeData[];
        edges: RelationEdgeData[];
    };
    layoutProvider: LayoutProvider;
    nodeOrigin?: [number, number];
    onNodeClick?: (node: RelationNodeData) => void;
    onEdgeClick?: (edge: RelationEdgeData) => void;
    theme?: 'dark' | 'light';
    height?: string | number;
    width?: string | number;
    className?: string;
    style?: React.CSSProperties;
    enableRefresh?: boolean;
    autoFitContainer?: boolean;
    labelMode?: RelationLabelMode;
    typeStyles?: Record<string, RelationTypeStyle>;
    renderLayoutStatus?: (state: RelationLayoutState) => React.ReactNode;
}

type FlowNodeData = RelationNodeData & {
    theme: 'light' | 'dark';
    displayName: string;
    displaySummary?: string;
    resolvedColor: string;
    resolvedIcon: string;
    groupLabel?: string;
    typeLabel?: string;
};

type RelationFlowNode = Node<FlowNodeData, 'custom'>;

type RelationEdgeRenderData = Record<string, unknown> & {
    relEdge: RelationEdgeData;
    resolvedLabel?: string;
    labelMode: RelationLabelMode;
    isImportant: boolean;
    lineOffset: number;
    sourcePoint?: Point;
    targetPoint?: Point;
};

type RelationFlowEdge = Edge<RelationEdgeRenderData, 'relation'>;

type Point = {
    x: number;
    y: number;
};

type RectBox = {
    x: number;
    y: number;
    width: number;
    height: number;
};

type RoutingAxis = 'h' | 'v';

type RoutingGraphEdge = {
    to: string;
    axis: RoutingAxis;
    length: number;
};

type RoutingState = {
    key: string;
    axis: RoutingAxis | 'start';
};

type RoutedSegment = {
    start: Point;
    end: Point;
    axis: RoutingAxis | 'd';
    key: string;
};

const HIDDEN_HANDLE_STYLE = {
    opacity: 0,
    width: 8,
    height: 8,
    pointerEvents: 'none' as const,
};

const DEFAULT_NODE_COLORS = ['#3b82f6', '#10b981', '#ec4899', '#f97316', '#8b5cf6', '#06b6d4'];
const DEFAULT_EDGE_COLORS = ['#64748b', '#0ea5e9', '#14b8a6', '#f59e0b', '#ef4444', '#8b5cf6'];
const DEFAULT_NODE_WIDTH = 292;
const DEFAULT_NODE_HEIGHT = 154;
const LOG_PREFIX = '[RelationGraph]';

const KNOWN_NODE_STYLES: Record<string, RelationTypeStyle> = {
    person: { color: '#3b82f6', icon: 'P' },
    organization: { color: '#10b981', icon: 'O' },
    event: { color: '#ec4899', icon: 'E' },
    location: { color: '#f97316', icon: 'L' },
    concept: { color: '#8b5cf6', icon: 'C' },
    character: { color: '#3b82f6', icon: 'CH' },
    faction: { color: '#10b981', icon: 'FA' },
    artifact: { color: '#f59e0b', icon: 'AR' },
};

const KNOWN_EDGE_COLORS: Record<string, string> = {
    friend: '#10b981',
    enemy: '#ef4444',
    subordinate: '#3b82f6',
    superior: '#8b5cf6',
    neutral: '#64748b',
};

const hashString = (value: string) => {
    let hash = 2166136261;

    for (let i = 0; i < value.length; i += 1) {
        hash ^= value.charCodeAt(i);
        hash += (hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24);
    }

    return Math.abs(hash >>> 0);
};

const pickFromPalette = (key: string | undefined, palette: string[], fallback: string) => {
    if (!key) {
        return fallback;
    }

    return palette[hashString(key) % palette.length] || fallback;
};

const resolveNodeGroup = (node: RelationNodeData) => node.group || node.categoryId || node.type || 'ungrouped';
const resolveNodeName = (node: RelationNodeData) => node.title || node.name || node.id;
const resolveNodeSummary = (node: RelationNodeData) => node.summary || node.description || (typeof node.content === 'string' ? node.content : undefined);
const resolveEdgeLabel = (edge: RelationEdgeData) => edge.label || edge.content;
const resolveEdgeDirection = (edge: RelationEdgeData): RelationDirection => edge.direction || edge.relation || 'one_way';
const isImportantEdge = (edge: RelationEdgeData) => Boolean(edge.important || (edge.strength || 0) >= 1.35);

const getNodeColor = (
    type: string | undefined,
    explicitColor: string | undefined,
    typeStyles?: Record<string, RelationTypeStyle>
) => {
    if (explicitColor) {
        return explicitColor;
    }

    return (
        (type && typeStyles?.[type]?.color) ||
        (type && KNOWN_NODE_STYLES[type]?.color) ||
        pickFromPalette(type, DEFAULT_NODE_COLORS, '#64748b')
    );
};

const getEdgeColor = (edge: RelationEdgeData) =>
    (edge.type && KNOWN_EDGE_COLORS[edge.type]) ||
    pickFromPalette(edge.type || edge.label || edge.content, DEFAULT_EDGE_COLORS, '#64748b');

const getNodeIcon = (node: RelationNodeData, typeStyles?: Record<string, RelationTypeStyle>) => {
    if (node.icon) {
        return node.icon;
    }

    const fromTypeStyle = node.type ? typeStyles?.[node.type]?.icon || KNOWN_NODE_STYLES[node.type]?.icon : undefined;
    if (fromTypeStyle) {
        return fromTypeStyle;
    }

    return resolveNodeName(node).slice(0, 2).toUpperCase();
};

const getRectCenter = (rect: RectBox): Point => ({
    x: rect.x + rect.width / 2,
    y: rect.y + rect.height / 2,
});

const getRectangleIntersection = (rect: RectBox, target: Point): Point => {
    const center = getRectCenter(rect);
    const dx = target.x - center.x;
    const dy = target.y - center.y;

    if (dx === 0 && dy === 0) {
        return center;
    }

    const scale = 1 / Math.max(Math.abs(dx) / (rect.width / 2), Math.abs(dy) / (rect.height / 2));

    return {
        x: center.x + dx * scale,
        y: center.y + dy * scale,
    };
};

const movePointAlongLine = (from: Point, to: Point, distance: number): Point => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;

    return {
        x: from.x + (dx / length) * distance,
        y: from.y + (dy / length) * distance,
    };
};

const offsetPointByNormal = (point: Point, from: Point, to: Point, distance: number): Point => {
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;

    return {
        x: point.x + (-dy / length) * distance,
        y: point.y + (dx / length) * distance,
    };
};

const getQuadraticCurveControlPoint = (source: Point, target: Point, curveOffset: number): Point => {
    const dx = target.x - source.x;
    const dy = target.y - source.y;
    const length = Math.hypot(dx, dy) || 1;
    const midX = (source.x + target.x) / 2;
    const midY = (source.y + target.y) / 2;

    return {
        x: midX + (-dy / length) * curveOffset,
        y: midY + (dx / length) * curveOffset,
    };
};

const getQuadraticCurvePath = (source: Point, control: Point, target: Point) =>
    `M ${source.x} ${source.y} Q ${control.x} ${control.y} ${target.x} ${target.y}`;

const getQuadraticCurvePointAt = (source: Point, control: Point, target: Point, t: number): Point => {
    const oneMinusT = 1 - t;

    return {
        x: oneMinusT * oneMinusT * source.x + 2 * oneMinusT * t * control.x + t * t * target.x,
        y: oneMinusT * oneMinusT * source.y + 2 * oneMinusT * t * control.y + t * t * target.y,
    };
};

const getQuadraticCurveTangentAt = (source: Point, control: Point, target: Point, t: number): Point => ({
    x: 2 * (1 - t) * (control.x - source.x) + 2 * t * (target.x - control.x),
    y: 2 * (1 - t) * (control.y - source.y) + 2 * t * (target.y - control.y),
});

const expandRect = (rect: RectBox, padding: number): RectBox => ({
    x: rect.x - padding,
    y: rect.y - padding,
    width: rect.width + padding * 2,
    height: rect.height + padding * 2,
});

const isPointInsideRect = (point: Point, rect: RectBox) =>
    point.x >= rect.x &&
    point.x <= rect.x + rect.width &&
    point.y >= rect.y &&
    point.y <= rect.y + rect.height;

const segmentsIntersect = (a1: Point, a2: Point, b1: Point, b2: Point) => {
    const cross = (p1: Point, p2: Point, p3: Point) =>
        (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);
    const onSegment = (p1: Point, p2: Point, point: Point) =>
        Math.min(p1.x, p2.x) <= point.x &&
        point.x <= Math.max(p1.x, p2.x) &&
        Math.min(p1.y, p2.y) <= point.y &&
        point.y <= Math.max(p1.y, p2.y);

    const d1 = cross(a1, a2, b1);
    const d2 = cross(a1, a2, b2);
    const d3 = cross(b1, b2, a1);
    const d4 = cross(b1, b2, a2);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
        return true;
    }

    if (d1 === 0 && onSegment(a1, a2, b1)) return true;
    if (d2 === 0 && onSegment(a1, a2, b2)) return true;
    if (d3 === 0 && onSegment(b1, b2, a1)) return true;
    if (d4 === 0 && onSegment(b1, b2, a2)) return true;

    return false;
};

const doesSegmentIntersectRect = (start: Point, end: Point, rect: RectBox) => {
    if (isPointInsideRect(start, rect) || isPointInsideRect(end, rect)) {
        return true;
    }

    const topLeft = { x: rect.x, y: rect.y };
    const topRight = { x: rect.x + rect.width, y: rect.y };
    const bottomLeft = { x: rect.x, y: rect.y + rect.height };
    const bottomRight = { x: rect.x + rect.width, y: rect.y + rect.height };

    return (
        segmentsIntersect(start, end, topLeft, topRight) ||
        segmentsIntersect(start, end, topRight, bottomRight) ||
        segmentsIntersect(start, end, bottomRight, bottomLeft) ||
        segmentsIntersect(start, end, bottomLeft, topLeft)
    );
};

const dedupePolyline = (points: Point[]) =>
    points.filter((point, index) => {
        if (index === 0) {
            return true;
        }

        const prev = points[index - 1];
        return Math.abs(prev.x - point.x) > 0.5 || Math.abs(prev.y - point.y) > 0.5;
    });

const simplifyPolyline = (points: Point[]) => {
    const normalized = dedupePolyline(points);

    if (normalized.length <= 2) {
        return normalized;
    }

    const simplified: Point[] = [normalized[0]];

    for (let index = 1; index < normalized.length - 1; index += 1) {
        const prev = simplified[simplified.length - 1];
        const current = normalized[index];
        const next = normalized[index + 1];
        const isCollinear =
            (Math.abs(prev.x - current.x) < 0.5 && Math.abs(current.x - next.x) < 0.5) ||
            (Math.abs(prev.y - current.y) < 0.5 && Math.abs(current.y - next.y) < 0.5);

        if (!isCollinear) {
            simplified.push(current);
        }
    }

    simplified.push(normalized[normalized.length - 1]);
    return simplified;
};

const isSegmentBlocked = (start: Point, end: Point, obstacles: RectBox[]) =>
    obstacles.some((rect) => doesSegmentIntersectRect(start, end, rect));

const isPolylineBlocked = (points: Point[], obstacles: RectBox[]) => {
    for (let index = 0; index < points.length - 1; index += 1) {
        if (isSegmentBlocked(points[index], points[index + 1], obstacles)) {
            return true;
        }
    }

    return false;
};

const getPolylineLength = (points: Point[]) => {
    let length = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
        length += Math.hypot(points[index + 1].x - points[index].x, points[index + 1].y - points[index].y);
    }

    return length;
};

const getPointAtPolylineRatio = (points: Point[], ratio: number) => {
    const totalLength = getPolylineLength(points) || 1;
    const targetLength = totalLength * ratio;
    let walked = 0;

    for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        const segmentLength = Math.hypot(end.x - start.x, end.y - start.y);

        if (walked + segmentLength >= targetLength) {
            const segmentRatio = (targetLength - walked) / (segmentLength || 1);
            return {
                x: start.x + (end.x - start.x) * segmentRatio,
                y: start.y + (end.y - start.y) * segmentRatio,
            };
        }

        walked += segmentLength;
    }

    return points[points.length - 1];
};

const getPolylinePath = (points: Point[]) => points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ');

const getPointKey = (point: Point) => `${Math.round(point.x * 10) / 10}:${Math.round(point.y * 10) / 10}`;

const manhattanDistance = (left: Point, right: Point) => Math.abs(left.x - right.x) + Math.abs(left.y - right.y);

const pointsEqual = (left: Point, right: Point, epsilon = 0.5) =>
    Math.abs(left.x - right.x) <= epsilon && Math.abs(left.y - right.y) <= epsilon;

const getSegmentAxis = (start: Point, end: Point): RoutingAxis | 'd' => {
    if (Math.abs(start.y - end.y) < 0.5) {
        return 'h';
    }
    if (Math.abs(start.x - end.x) < 0.5) {
        return 'v';
    }
    return 'd';
};

const getNormalizedSegmentKey = (start: Point, end: Point) => {
    const axis = getSegmentAxis(start, end);
    const normalize = (value: number) => Math.round(value * 10) / 10;

    if (axis === 'h') {
        const minX = normalize(Math.min(start.x, end.x));
        const maxX = normalize(Math.max(start.x, end.x));
        return `h:${normalize(start.y)}:${minX}:${maxX}`;
    }

    if (axis === 'v') {
        const minY = normalize(Math.min(start.y, end.y));
        const maxY = normalize(Math.max(start.y, end.y));
        return `v:${normalize(start.x)}:${minY}:${maxY}`;
    }

    const startKey = getPointKey(start);
    const endKey = getPointKey(end);
    return startKey < endKey ? `d:${startKey}:${endKey}` : `d:${endKey}:${startKey}`;
};

const getPolylineSegments = (points: Point[]): RoutedSegment[] => {
    const normalized = simplifyPolyline(points);
    const segments: RoutedSegment[] = [];

    for (let index = 0; index < normalized.length - 1; index += 1) {
        const start = normalized[index];
        const end = normalized[index + 1];

        if (pointsEqual(start, end)) {
            continue;
        }

        segments.push({
            start,
            end,
            axis: getSegmentAxis(start, end),
            key: getNormalizedSegmentKey(start, end),
        });
    }

    return segments;
};

const countSegmentPenalty = (start: Point, end: Point, usedSegments: RoutedSegment[]) => {
    const candidateKey = getNormalizedSegmentKey(start, end);
    let overlapCount = 0;
    let crossingCount = 0;

    usedSegments.forEach((segment) => {
        if (segment.key === candidateKey) {
            overlapCount += 1;
            return;
        }

        const sharesEndpoint =
            pointsEqual(start, segment.start) ||
            pointsEqual(start, segment.end) ||
            pointsEqual(end, segment.start) ||
            pointsEqual(end, segment.end);

        if (!sharesEndpoint && segmentsIntersect(start, end, segment.start, segment.end)) {
            crossingCount += 1;
        }
    });

    return overlapCount * 36 + crossingCount * 52;
};

const scoreRouteCandidate = (points: Point[], usedSegments: RoutedSegment[]) => {
    const normalized = simplifyPolyline(points);
    const bends = Math.max(normalized.length - 2, 0);
    const straightBonus = normalized.length === 2 ? 120 : normalized.length === 3 ? 32 : 0;
    const occupancyPenalty = getPolylineSegments(normalized).reduce(
        (total, segment) => total + countSegmentPenalty(segment.start, segment.end, usedSegments),
        0
    );

    return getPolylineLength(normalized) + bends * 38 + occupancyPenalty - straightBonus;
};

const buildSparseRoutingGraph = (
    sourcePoint: Point,
    targetPoint: Point,
    sourceRect: RectBox | undefined,
    targetRect: RectBox | undefined,
    obstacles: RectBox[]
) => {
    const routingMargin = 34;
    const axisPadding = 52;
    const xs = new Set<number>([sourcePoint.x, targetPoint.x]);
    const ys = new Set<number>([sourcePoint.y, targetPoint.y]);
    const centers: Point[] = [sourcePoint, targetPoint];
    const obstacleBounds = obstacles;

    if (sourceRect) {
        xs.add(sourceRect.x - axisPadding);
        xs.add(sourceRect.x + sourceRect.width + axisPadding);
        ys.add(sourceRect.y - axisPadding);
        ys.add(sourceRect.y + sourceRect.height + axisPadding);
    }

    if (targetRect) {
        xs.add(targetRect.x - axisPadding);
        xs.add(targetRect.x + targetRect.width + axisPadding);
        ys.add(targetRect.y - axisPadding);
        ys.add(targetRect.y + targetRect.height + axisPadding);
    }

    obstacleBounds.forEach((rect) => {
        xs.add(rect.x);
        xs.add(rect.x + rect.width);
        xs.add(rect.x - routingMargin);
        xs.add(rect.x + rect.width + routingMargin);
        ys.add(rect.y);
        ys.add(rect.y + rect.height);
        ys.add(rect.y - routingMargin);
        ys.add(rect.y + rect.height + routingMargin);
        centers.push(getRectCenter(rect));
    });

    const minX = Math.min(...centers.map((point) => point.x), ...obstacleBounds.map((rect) => rect.x)) - 140;
    const maxX =
        Math.max(...centers.map((point) => point.x), ...obstacleBounds.map((rect) => rect.x + rect.width)) + 140;
    const minY = Math.min(...centers.map((point) => point.y), ...obstacleBounds.map((rect) => rect.y)) - 120;
    const maxY =
        Math.max(...centers.map((point) => point.y), ...obstacleBounds.map((rect) => rect.y + rect.height)) + 120;

    const xValues = Array.from(xs)
        .filter((value) => value >= minX && value <= maxX)
        .sort((left, right) => left - right);
    const yValues = Array.from(ys)
        .filter((value) => value >= minY && value <= maxY)
        .sort((left, right) => left - right);

    const pointMap = new Map<string, Point>();
    const rowMap = new Map<number, Point[]>();
    const columnMap = new Map<number, Point[]>();

    const registerPoint = (point: Point) => {
        const key = getPointKey(point);
        if (!pointMap.has(key)) {
            pointMap.set(key, point);
        }
    };

    xValues.forEach((x) => {
        yValues.forEach((y) => {
            const point = { x, y };
            if (obstacleBounds.some((rect) => isPointInsideRect(point, rect))) {
                return;
            }

            registerPoint(point);
        });
    });

    registerPoint(sourcePoint);
    registerPoint(targetPoint);

    pointMap.forEach((point) => {
        if (!rowMap.has(point.y)) {
            rowMap.set(point.y, []);
        }
        rowMap.get(point.y)!.push(point);

        if (!columnMap.has(point.x)) {
            columnMap.set(point.x, []);
        }
        columnMap.get(point.x)!.push(point);
    });

    const adjacency = new Map<string, RoutingGraphEdge[]>();
    const connectPoints = (left: Point, right: Point, axis: RoutingAxis) => {
        if (left.x === right.x && left.y === right.y) {
            return;
        }

        if (isSegmentBlocked(left, right, obstacleBounds)) {
            return;
        }

        const leftKey = getPointKey(left);
        const rightKey = getPointKey(right);
        const distance = Math.hypot(right.x - left.x, right.y - left.y);

        if (!adjacency.has(leftKey)) {
            adjacency.set(leftKey, []);
        }
        if (!adjacency.has(rightKey)) {
            adjacency.set(rightKey, []);
        }

        adjacency.get(leftKey)!.push({ to: rightKey, axis, length: distance });
        adjacency.get(rightKey)!.push({ to: leftKey, axis, length: distance });
    };

    rowMap.forEach((points) => {
        const sorted = [...points].sort((left, right) => left.x - right.x);
        for (let index = 0; index < sorted.length - 1; index += 1) {
            connectPoints(sorted[index], sorted[index + 1], 'h');
        }
    });

    columnMap.forEach((points) => {
        const sorted = [...points].sort((left, right) => left.y - right.y);
        for (let index = 0; index < sorted.length - 1; index += 1) {
            connectPoints(sorted[index], sorted[index + 1], 'v');
        }
    });

    return {
        adjacency,
        points: pointMap,
        startKey: getPointKey(sourcePoint),
        targetKey: getPointKey(targetPoint),
    };
};

const findSparseGridRoute = (
    sourcePoint: Point,
    targetPoint: Point,
    sourceRect: RectBox | undefined,
    targetRect: RectBox | undefined,
    obstacles: RectBox[],
    usedSegments: RoutedSegment[]
) => {
    const graph = buildSparseRoutingGraph(sourcePoint, targetPoint, sourceRect, targetRect, obstacles);
    const targetPointRef = graph.points.get(graph.targetKey);

    if (!graph.adjacency.has(graph.startKey) || !graph.adjacency.has(graph.targetKey) || !targetPointRef) {
        return undefined;
    }

    const openStates: RoutingState[] = [{ key: graph.startKey, axis: 'start' }];
    const openSet = new Set<string>(['start|' + graph.startKey]);
    const cameFrom = new Map<string, string>();
    const gScore = new Map<string, number>([['start|' + graph.startKey, 0]]);
    const fScore = new Map<string, number>([
        [
            'start|' + graph.startKey,
            manhattanDistance(graph.points.get(graph.startKey) || sourcePoint, targetPointRef),
        ],
    ]);

    const getStateId = (state: RoutingState) => `${state.axis}|${state.key}`;

    while (openStates.length > 0) {
        let currentIndex = 0;

        for (let index = 1; index < openStates.length; index += 1) {
            if (
                (fScore.get(getStateId(openStates[index])) || Number.POSITIVE_INFINITY) <
                (fScore.get(getStateId(openStates[currentIndex])) || Number.POSITIVE_INFINITY)
            ) {
                currentIndex = index;
            }
        }

        const currentState = openStates.splice(currentIndex, 1)[0];
        const currentStateId = getStateId(currentState);
        openSet.delete(currentStateId);

        if (currentState.key === graph.targetKey) {
            const pathKeys: string[] = [currentState.key];
            let walker = currentStateId;

            while (cameFrom.has(walker)) {
                walker = cameFrom.get(walker)!;
                pathKeys.unshift(walker.split('|')[1]);
            }

            return simplifyPolyline(
                pathKeys
                    .map((key) => graph.points.get(key))
                    .filter((point): point is Point => Boolean(point))
            );
        }

        const currentPoint = graph.points.get(currentState.key);
        if (!currentPoint) {
            continue;
        }

        const currentEdges = graph.adjacency.get(currentState.key) || [];
        currentEdges.forEach((edge) => {
            const neighborState: RoutingState = {
                key: edge.to,
                axis: edge.axis,
            };
            const neighborStateId = getStateId(neighborState);
            const neighborPoint = graph.points.get(edge.to);

            if (!neighborPoint) {
                return;
            }

            const bendPenalty = currentState.axis === 'start' || currentState.axis === edge.axis ? 0 : 34;
            const segmentPenalty = countSegmentPenalty(currentPoint, neighborPoint, usedSegments);
            const tentativeScore =
                (gScore.get(currentStateId) || Number.POSITIVE_INFINITY) + edge.length + bendPenalty + segmentPenalty;

            if (tentativeScore >= (gScore.get(neighborStateId) || Number.POSITIVE_INFINITY)) {
                return;
            }

            cameFrom.set(neighborStateId, currentStateId);
            gScore.set(neighborStateId, tentativeScore);
            fScore.set(neighborStateId, tentativeScore + manhattanDistance(neighborPoint, targetPointRef));

            if (!openSet.has(neighborStateId)) {
                openSet.add(neighborStateId);
                openStates.push(neighborState);
            }
        });
    }

    return undefined;
};

const routeEdgeAroundObstacles = (
    sourcePoint: Point,
    targetPoint: Point,
    sourceRect: RectBox | undefined,
    targetRect: RectBox | undefined,
    obstacles: RectBox[],
    usedSegments: RoutedSegment[]
) => {
    const candidates: Point[][] = [];
    const directPoints = simplifyPolyline([sourcePoint, targetPoint]);

    if (!isPolylineBlocked(directPoints, obstacles)) {
        candidates.push(directPoints);
    }

    const hvRoute = simplifyPolyline([sourcePoint, { x: targetPoint.x, y: sourcePoint.y }, targetPoint]);
    if (!isPolylineBlocked(hvRoute, obstacles)) {
        candidates.push(hvRoute);
    }

    const vhRoute = simplifyPolyline([sourcePoint, { x: sourcePoint.x, y: targetPoint.y }, targetPoint]);
    if (!isPolylineBlocked(vhRoute, obstacles)) {
        candidates.push(vhRoute);
    }

    const sparseRoute = findSparseGridRoute(sourcePoint, targetPoint, sourceRect, targetRect, obstacles, usedSegments);
    if (sparseRoute && sparseRoute.length >= 2 && !isPolylineBlocked(sparseRoute, obstacles)) {
        candidates.push(sparseRoute);
    }

    if (candidates.length === 0) {
        return directPoints;
    }

    return candidates.reduce((best, candidate) =>
        scoreRouteCandidate(candidate, usedSegments) < scoreRouteCandidate(best, usedSegments) ? candidate : best
    );
};

void [expandRect, getPointAtPolylineRatio, getPolylinePath, routeEdgeAroundObstacles];

const buildFlowNodeData = (
    node: RelationNodeData,
    theme: 'light' | 'dark',
    typeStyles?: Record<string, RelationTypeStyle>
): FlowNodeData => ({
    ...node,
    group: resolveNodeGroup(node),
    theme,
    displayName: resolveNodeName(node),
    displaySummary: resolveNodeSummary(node),
    resolvedColor: getNodeColor(node.type, node.color, typeStyles),
    resolvedIcon: getNodeIcon(node, typeStyles),
    groupLabel: node.categoryId || node.group,
    typeLabel: node.type,
});

const indexNodesById = (nodes: RelationFlowNode[]) => new Map(nodes.map((node) => [node.id, node]));

const buildFlowNodes = (
    sourceNodes: RelationNodeData[],
    previousNodesById: Map<string, RelationFlowNode>,
    theme: 'light' | 'dark',
    typeStyles: Record<string, RelationTypeStyle> | undefined,
    nodeOrigin: [number, number]
): RelationFlowNode[] =>
    sourceNodes.map((node) => {
        const previousNode = previousNodesById.get(node.id);

        return {
            ...previousNode,
            id: node.id,
            type: 'custom',
            origin: nodeOrigin,
            position: previousNode?.position || { x: 0, y: 0 },
            draggable: false,
            connectable: false,
            data: buildFlowNodeData(node, theme, typeStyles),
        };
    });

const applyLayoutPositions = (
    nodes: RelationFlowNode[],
    positions: LayoutResponse['positions']
): RelationFlowNode[] =>
    nodes.map((node) => ({
        ...node,
        position: positions[node.id] || node.position,
    }));

const buildSiblingGroups = (edges: RelationEdgeData[]) => {
    const groups = new Map<string, number[]>();

    edges.forEach((edge, index) => {
        const key = [edge.source, edge.target].sort().join('::');
        if (!groups.has(key)) {
            groups.set(key, []);
        }
        groups.get(key)!.push(index);
    });

    return groups;
};

const getNodeRect = (node: RelationFlowNode): RectBox => {
    const width = node.measured?.width || node.width || DEFAULT_NODE_WIDTH;
    const height = node.measured?.height || node.height || DEFAULT_NODE_HEIGHT;
    const origin = node.origin || [0, 0];

    return {
        x: node.position.x - width * origin[0],
        y: node.position.y - height * origin[1],
        width,
        height,
    };
};

const buildNodeRectMap = (nodes: RelationFlowNode[]) => {
    const rectMap = new Map<string, RectBox>();

    nodes.forEach((node) => {
        rectMap.set(node.id, getNodeRect(node));
    });

    return rectMap;
};

const buildFlowEdges = (
    sourceEdges: RelationEdgeData[],
    labelMode: RelationLabelMode,
    nodes: RelationFlowNode[]
): RelationFlowEdge[] => {
    const siblingGroups = buildSiblingGroups(sourceEdges);
    const nodeRectMap = buildNodeRectMap(nodes);

    return sourceEdges.map((edge, index) => {
        const edgeColor = getEdgeColor(edge);
        const direction = resolveEdgeDirection(edge);
        const siblingKey = [edge.source, edge.target].sort().join('::');
        const siblingIndexes = siblingGroups.get(siblingKey) || [index];
        const siblingPosition = siblingIndexes.indexOf(index) - (siblingIndexes.length - 1) / 2;
        const sourceRect = nodeRectMap.get(edge.source);
        const targetRect = nodeRectMap.get(edge.target);
        const sourceCenter = sourceRect ? getRectCenter(sourceRect) : undefined;
        const targetCenter = targetRect ? getRectCenter(targetRect) : undefined;
        const edgeDistance =
            sourceCenter && targetCenter ? Math.hypot(targetCenter.x - sourceCenter.x, targetCenter.y - sourceCenter.y) : 0;
        const offsetMagnitude = Math.max(120, Math.min(edgeDistance * 0.18, 240));
        const lineOffset = siblingPosition * offsetMagnitude;
        const rawSourcePoint =
            sourceRect && targetCenter ? getRectangleIntersection(sourceRect, targetCenter) : undefined;
        const rawTargetPoint =
            targetRect && sourceCenter ? getRectangleIntersection(targetRect, sourceCenter) : undefined;
        const clippedSourcePoint =
            rawSourcePoint && rawTargetPoint ? movePointAlongLine(rawSourcePoint, rawTargetPoint, 8) : undefined;
        const clippedTargetPoint =
            rawTargetPoint && rawSourcePoint ? movePointAlongLine(rawTargetPoint, rawSourcePoint, 12) : undefined;
        const adjustedSourcePoint =
            clippedSourcePoint && clippedTargetPoint
                ? offsetPointByNormal(clippedSourcePoint, clippedSourcePoint, clippedTargetPoint, lineOffset)
                : undefined;
        const adjustedTargetPoint =
            clippedTargetPoint && clippedSourcePoint
                ? offsetPointByNormal(clippedTargetPoint, clippedSourcePoint, clippedTargetPoint, lineOffset)
                : undefined;

        return {
            id: `${edge.source}-${edge.target}-${index}`,
            source: edge.source,
            target: edge.target,
            type: 'relation',
            data: {
                relEdge: edge,
                resolvedLabel: resolveEdgeLabel(edge),
                labelMode,
                isImportant: isImportantEdge(edge),
                lineOffset,
                sourcePoint: adjustedSourcePoint,
                targetPoint: adjustedTargetPoint,
            },
            style: {
                stroke: edgeColor,
                strokeWidth: isImportantEdge(edge) ? 2.6 : 1.7,
                opacity: isImportantEdge(edge) ? 0.96 : 0.5,
            },
            markerStart:
                direction === 'two_way'
                    ? {
                          type: MarkerType.ArrowClosed,
                          width: 12,
                          height: 12,
                          color: edgeColor,
                      }
                    : undefined,
            markerEnd: {
                type: MarkerType.ArrowClosed,
                width: 12,
                height: 12,
                color: edgeColor,
            },
        };
    });
};

const CustomNode: FC<NodeProps<RelationFlowNode>> = ({ data }) => {
    const isDark = data.theme === 'dark';

    return (
        <div
            className="relation-node"
            style={{
                background: isDark ? '#111827' : '#ffffff',
                border: `2px solid ${data.resolvedColor}`,
                borderRadius: '16px',
                padding: '16px 18px',
                width: `${DEFAULT_NODE_WIDTH}px`,
                minHeight: `${DEFAULT_NODE_HEIGHT}px`,
                cursor: 'pointer',
                boxShadow: isDark ? '0 8px 22px rgba(0,0,0,0.34)' : '0 6px 18px rgba(15,23,42,0.08)',
                boxSizing: 'border-box',
            }}
        >
            <Handle type="source" position={Position.Right} id="source" style={HIDDEN_HANDLE_STYLE} />
            <Handle type="target" position={Position.Left} id="target" style={HIDDEN_HANDLE_STYLE} />

            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div
                    style={{
                        width: '38px',
                        height: '38px',
                        borderRadius: '12px',
                        background: `${data.resolvedColor}1f`,
                        color: data.resolvedColor,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        flexShrink: 0,
                    }}
                >
                    {data.resolvedIcon}
                </div>

                <div style={{ minWidth: 0, flex: 1 }}>
                    <div
                        style={{
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: '6px',
                            marginBottom: '8px',
                        }}
                    >
                        {data.typeLabel && (
                            <span
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    background: `${data.resolvedColor}18`,
                                    color: data.resolvedColor,
                                }}
                            >
                                {data.typeLabel}
                            </span>
                        )}
                        {data.groupLabel && (
                            <span
                                style={{
                                    padding: '2px 8px',
                                    borderRadius: '999px',
                                    fontSize: '10px',
                                    fontWeight: 600,
                                    background: isDark ? 'rgba(51,65,85,0.6)' : 'rgba(241,245,249,0.95)',
                                    color: isDark ? '#cbd5e1' : '#475569',
                                }}
                            >
                                {data.groupLabel}
                            </span>
                        )}
                    </div>

                    <div
                        style={{
                            fontWeight: 700,
                            fontSize: '14px',
                            lineHeight: 1.35,
                            color: isDark ? '#f8fafc' : '#0f172a',
                            wordBreak: 'break-word',
                        }}
                    >
                        {data.displayName}
                    </div>

                    {data.displaySummary && (
                        <div
                            style={{
                                marginTop: '8px',
                                fontSize: '11px',
                                lineHeight: 1.5,
                                color: isDark ? '#94a3b8' : '#64748b',
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 4,
                                overflow: 'hidden',
                                wordBreak: 'break-word',
                            }}
                        >
                            {data.displaySummary}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RelationSmartEdge: FC<EdgeProps<RelationFlowEdge>> = ({
    id,
    data,
    selected,
    sourceX,
    sourceY,
    targetX,
    targetY,
    markerStart,
    markerEnd,
    style,
}) => {
    const [isHovered, setIsHovered] = useState(false);
    const sourcePoint = data?.sourcePoint || { x: sourceX, y: sourceY };
    const targetPoint = data?.targetPoint || { x: targetX, y: targetY };
    const lineOffset = data?.lineOffset || 0;
    const distance = Math.hypot(targetPoint.x - sourcePoint.x, targetPoint.y - sourcePoint.y);
    const baseCurveOffset = Math.max(42, Math.min(distance * 0.12, 120));
    const appliedCurveOffset = lineOffset === 0 ? baseCurveOffset : lineOffset;
    const controlPoint = getQuadraticCurveControlPoint(sourcePoint, targetPoint, appliedCurveOffset);
    const edgePath = getQuadraticCurvePath(sourcePoint, controlPoint, targetPoint);
    const labelBasePoint = getQuadraticCurvePointAt(sourcePoint, controlPoint, targetPoint, 0.5);
    const tangent = getQuadraticCurveTangentAt(sourcePoint, controlPoint, targetPoint, 0.5);
    const tangentEndPoint = {
        x: labelBasePoint.x + tangent.x,
        y: labelBasePoint.y + tangent.y,
    };
    const labelDistance = 20 + Math.min(Math.abs(appliedCurveOffset) * 0.08, 18);
    const labelPoint = offsetPointByNormal(
        labelBasePoint,
        labelBasePoint,
        tangentEndPoint,
        appliedCurveOffset >= 0 ? labelDistance : -labelDistance
    );

    const shouldShowLabel =
        Boolean(data?.resolvedLabel) &&
        data?.labelMode !== 'never' &&
        (data?.labelMode === 'always' ||
            selected ||
            (data?.labelMode === 'hover' && isHovered) ||
            (data?.labelMode === 'important' && data?.isImportant));

    return (
        <>
            <BaseEdge
                id={id}
                path={edgePath}
                style={style}
                markerStart={markerStart}
                markerEnd={markerEnd}
                interactionWidth={28}
                onMouseEnter={() => setIsHovered(true)}
                onMouseLeave={() => setIsHovered(false)}
            />
            {shouldShowLabel && data?.resolvedLabel && (
                <EdgeLabelRenderer>
                    <div
                        className={`relation-edge-label ${selected ? 'is-selected' : ''}`}
                        style={{
                            transform: `translate(-50%, -50%) translate(${labelPoint.x}px, ${labelPoint.y}px)`,
                        }}
                    >
                        {data.resolvedLabel}
                    </div>
                </EdgeLabelRenderer>
            )}
        </>
    );
};

const nodeTypes = { custom: CustomNode };
const edgeTypes = { relation: RelationSmartEdge };

const RelationContent: FC<RelationProps> = ({
    data,
    layoutProvider,
    nodeOrigin,
    onNodeClick,
    onEdgeClick,
    theme = 'light',
    height = '100%',
    width = '100%',
    className = '',
    style = {},
    enableRefresh = true,
    autoFitContainer = true,
    labelMode = 'always',
    typeStyles,
    renderLayoutStatus,
}) => {
    const [nodes, setNodes, onNodesChange] = useNodesState<RelationFlowNode>([]);
    const [edges, setEdges, onEdgesChange] = useEdgesState<RelationFlowEdge>([]);
    const nodesRef = useRef(nodes);
    const dataRef = useRef(data);
    const labelModeRef = useRef(labelMode);
    const resolvedNodeOrigin = useMemo<[number, number]>(() => nodeOrigin || [0, 0], [nodeOrigin?.[0], nodeOrigin?.[1]]);

    const isDark = theme === 'dark';
    const bgColor = isDark ? '#0f172a' : '#f8fafc';

    useEffect(() => {
        nodesRef.current = nodes;
    }, [nodes]);

    useEffect(() => {
        dataRef.current = data;
        labelModeRef.current = labelMode;
    }, [data, labelMode]);

    useEffect(() => {
        if (!data?.nodes?.length) {
            startTransition(() => {
                setNodes([]);
                setEdges([]);
            });
            console.debug(LOG_PREFIX, 'clear graph because data is empty');
            return;
        }

        console.debug(LOG_PREFIX, 'build flow nodes from source data', {
            nodesCount: data.nodes.length,
            edgesCount: data.edges.length,
            theme,
            nodeOrigin: resolvedNodeOrigin,
        });
        startTransition(() => {
            setNodes((previousNodes) =>
                buildFlowNodes(data.nodes, indexNodesById(previousNodes), theme, typeStyles, resolvedNodeOrigin)
            );
        });
    }, [data, resolvedNodeOrigin, setEdges, setNodes, theme, typeStyles]);

    useEffect(() => {
        if (!data?.nodes?.length) {
            return;
        }

        console.debug(LOG_PREFIX, 'rebuild flow edges', {
            edgesCount: data.edges.length,
            nodesCount: nodes.length,
            labelMode,
        });
        startTransition(() => {
            setEdges(buildFlowEdges(data.edges, labelMode, nodes));
        });
    }, [data, labelMode, nodes, setEdges]);

    const layoutEdges = useMemo(
        () =>
            data?.edges.map((edge, index) => ({
                id: `${edge.source}-${edge.target}-${index}`,
                source: edge.source,
                target: edge.target,
                sourceHandle: undefined,
                targetHandle: undefined,
                kind: resolveEdgeDirection(edge),
            })) || [],
        [data]
    );

    const applyLayout = useCallback(
        (response: LayoutResponse) => {
            const nextNodes = applyLayoutPositions(nodesRef.current, response.positions);
            console.debug(LOG_PREFIX, 'apply layout response to nodes', {
                currentNodesCount: nodesRef.current.length,
                nextNodesCount: nextNodes.length,
                positionsCount: Object.keys(response.positions).length,
                hasBounds: Boolean(response.bounds),
            });

            startTransition(() => {
                setNodes(nextNodes);
                setEdges(buildFlowEdges(dataRef.current?.edges || [], labelModeRef.current, nextNodes));
            });
        },
        [setEdges, setNodes]
    );

    const { graphSignature, nodesInitialized, layoutReady, layoutLoading, layoutError, relayout } = useBackendLayout({
        enabled: Boolean(data?.nodes?.length),
        nodes,
        edges: layoutEdges,
        layoutProvider,
        nodeOrigin: resolvedNodeOrigin,
        applyLayout,
    });

    const layoutState = useMemo<RelationLayoutState>(
        () => ({
            graphSignature,
            nodesInitialized,
            layoutReady,
            layoutLoading,
            layoutError,
            relayout,
        }),
        [graphSignature, layoutError, layoutLoading, layoutReady, nodesInitialized, relayout]
    );

    const handleNodeClick = useCallback(
        (_event: React.MouseEvent, node: Node) => {
            if (!onNodeClick) {
                return;
            }

            const relationNode = node as RelationFlowNode;
            const {
                theme: _theme,
                displayName: _displayName,
                displaySummary: _displaySummary,
                resolvedColor: _resolvedColor,
                resolvedIcon: _resolvedIcon,
                groupLabel: _groupLabel,
                typeLabel: _typeLabel,
                ...nodeData
            } = relationNode.data;

            onNodeClick(nodeData);
        },
        [onNodeClick]
    );

    const handleEdgeClick = useCallback(
        (_event: React.MouseEvent, edge: Edge) => {
            const relationEdge = edge as RelationFlowEdge;
            if (onEdgeClick && relationEdge.data?.relEdge) {
                onEdgeClick(relationEdge.data.relEdge);
            }
        },
        [onEdgeClick]
    );

    if (!data?.nodes?.length) {
        return (
            <div
                style={{
                    width: autoFitContainer ? '100%' : width,
                    height: autoFitContainer ? '100%' : height,
                    backgroundColor: bgColor,
                    borderRadius: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: isDark ? '#94a3b8' : '#64748b',
                    border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                    boxSizing: 'border-box',
                }}
            >
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '40px', marginBottom: '14px' }}>RG</div>
                    <div>No relation data</div>
                </div>
            </div>
        );
    }

    return (
        <div
            data-theme={theme}
            className={`relation-container ${className}`}
            style={{
                width: autoFitContainer ? '100%' : width,
                height: autoFitContainer ? '100%' : height,
                ...style,
                backgroundColor: bgColor,
                borderRadius: '12px',
                overflow: 'hidden',
                position: 'relative',
                border: `2px solid ${isDark ? '#334155' : '#e2e8f0'}`,
                boxSizing: 'border-box',
            }}
        >
            {enableRefresh && (
                <button
                    onClick={() => {
                        void relayout({ force: true });
                    }}
                    disabled={layoutLoading}
                    style={{
                        position: 'absolute',
                        top: '12px',
                        right: '12px',
                        zIndex: 10,
                        background: isDark ? '#334155' : '#ffffff',
                        border: `1px solid ${isDark ? '#475569' : '#e2e8f0'}`,
                        borderRadius: '8px',
                        padding: '8px 12px',
                        cursor: layoutLoading ? 'wait' : 'pointer',
                        fontSize: '14px',
                        color: isDark ? '#e2e8f0' : '#1e293b',
                        boxShadow: isDark ? '0 2px 8px rgba(0,0,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                        transition: 'all 0.2s ease',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        opacity: layoutLoading ? 0.76 : 1,
                    }}
                >
                    <span>{layoutLoading ? 'Layouting...' : 'Relayout'}</span>
                </button>
            )}

            {renderLayoutStatus ? (
                renderLayoutStatus(layoutState)
            ) : (
                <>
                    {layoutLoading && !layoutReady && (
                        <div
                            style={{
                                position: 'absolute',
                                inset: 0,
                                zIndex: 8,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                background: isDark ? 'rgba(15,23,42,0.48)' : 'rgba(248,250,252,0.72)',
                                backdropFilter: 'blur(4px)',
                            }}
                        >
                            <div
                                style={{
                                    padding: '14px 18px',
                                    borderRadius: '12px',
                                    background: isDark ? 'rgba(15,23,42,0.94)' : 'rgba(255,255,255,0.96)',
                                    border: `1px solid ${isDark ? 'rgba(71,85,105,0.88)' : 'rgba(203,213,225,0.88)'}`,
                                    color: isDark ? '#e2e8f0' : '#0f172a',
                                    boxShadow: isDark
                                        ? '0 12px 28px rgba(2,6,23,0.36)'
                                        : '0 12px 28px rgba(15,23,42,0.12)',
                                    fontSize: '13px',
                                    fontWeight: 600,
                                }}
                            >
                                {nodesInitialized ? 'Calculating layout...' : 'Measuring nodes...'}
                            </div>
                        </div>
                    )}

                    {layoutError && (
                        <div
                            style={{
                                position: 'absolute',
                                left: '12px',
                                top: '12px',
                                zIndex: 9,
                                maxWidth: 'min(420px, calc(100% - 96px))',
                                padding: '10px 12px',
                                borderRadius: '10px',
                                background: isDark ? 'rgba(127,29,29,0.92)' : 'rgba(254,242,242,0.98)',
                                border: `1px solid ${isDark ? 'rgba(248,113,113,0.4)' : 'rgba(252,165,165,0.7)'}`,
                                color: isDark ? '#fee2e2' : '#7f1d1d',
                                boxShadow: isDark
                                    ? '0 10px 24px rgba(2,6,23,0.32)'
                                    : '0 10px 24px rgba(15,23,42,0.12)',
                            }}
                        >
                            <div style={{ fontSize: '12px', fontWeight: 700, marginBottom: '4px' }}>Layout failed</div>
                            <div style={{ fontSize: '12px', lineHeight: 1.45 }}>{layoutError.message}</div>
                            <button
                                onClick={() => {
                                    void relayout({ force: true });
                                }}
                                style={{
                                    marginTop: '8px',
                                    border: 'none',
                                    borderRadius: '7px',
                                    padding: '6px 10px',
                                    background: isDark ? '#fecaca' : '#7f1d1d',
                                    color: isDark ? '#7f1d1d' : '#ffffff',
                                    cursor: 'pointer',
                                    fontSize: '12px',
                                    fontWeight: 700,
                                }}
                            >
                                Retry
                            </button>
                        </div>
                    )}
                </>
            )}

            <ReactFlow
                nodes={nodes}
                edges={edges}
                nodeOrigin={resolvedNodeOrigin}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={handleNodeClick}
                onEdgeClick={handleEdgeClick}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                nodesDraggable={false}
                nodesConnectable={false}
                elementsSelectable={true}
                selectNodesOnDrag={false}
                fitView={false}
                minZoom={0.3}
                maxZoom={2}
                zoomOnScroll={true}
                panOnDrag={true}
                proOptions={{ hideAttribution: true }}
            >
                <Background color={isDark ? '#1e293b' : '#e2e8f0'} gap={20} size={1} />
            </ReactFlow>
        </div>
    );
};

const Relation: FC<RelationProps> = (props) => {
    return (
        <ReactFlowProvider>
            <RelationContent {...props} />
        </ReactFlowProvider>
    );
};

export { Relation };
export default Relation;
