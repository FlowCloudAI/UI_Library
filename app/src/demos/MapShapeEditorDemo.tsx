import {createElement, useEffect, useMemo, useRef, useState} from 'react';
import {BlurFilter} from 'pixi.js';
import {
    buildPreviewSceneFromDraft,
    createEmptyShapeDraft,
    createInitialMapShapeEditorViewBox,
    createMapShapeEditorLocalId,
    createMockMapShapeEditorApi,
    getShapeCenter,
    MapDeckPreview,
    type MapKeyLocationDraft,
    MapPixiPreview,
    type MapPixiPreviewOverlayContext,
    type MapPreviewKeyLocationPickDetail,
    type MapPreviewPickDetail,
    type MapPreviewScene,
    type MapPreviewShapePickDetail,
    type MapPreviewTooltip,
    type MapRgbaColor,
    type MapShapeDraft,
    type MapShapeEditorDraft,
    type MapShapeEditorViewBox,
    type MapShapeSvgEditorShapeContextMenuDetail,
    MapShapeViewport,
    type MapShapeViewportRenderer,
    moveShapeInOrder,
    submitMapShapeScene,
    useContextMenu,
    validateMapEditorDraft,
} from 'flowcloudai-ui';

const DEMO_CANVAS = {
    width: 1000,
    height: 1000,
};

const DEMO_DRAFT: MapShapeEditorDraft = {
    shapes: [
        {
            id: 'shape-warehouse',
            name: '仓储区',
            fill: '#d8ecff',
            stroke: '#185fa5',
            vertices: [
                {id: 'shape-warehouse-v1', x: 120, y: 120},
                {id: 'shape-warehouse-v2', x: 420, y: 100},
                {id: 'shape-warehouse-v3', x: 470, y: 280},
                {id: 'shape-warehouse-v4', x: 180, y: 340},
            ],
        },
        {
            id: 'shape-service',
            name: '服务区',
            fill: '#eaf5d7',
            stroke: '#426815',
            vertices: [
                {id: 'shape-service-v1', x: 600, y: 180},
                {id: 'shape-service-v2', x: 850, y: 160},
                {id: 'shape-service-v3', x: 900, y: 360},
                {id: 'shape-service-v4', x: 640, y: 420},
            ],
        },
    ],
    keyLocations: [
        {id: 'poi-1', name: '一号闸口', type: '出入口', x: 210, y: 132, shapeId: 'shape-warehouse'},
        {id: 'poi-2', name: '补给站', type: '补给点', x: 730, y: 250, shapeId: 'shape-service'},
        {id: 'poi-3', name: '值守台', type: '设备点', x: 350, y: 250, shapeId: 'shape-warehouse'},
    ],
};

const DEMO_PREVIEW = buildPreviewSceneFromDraft({
    canvas: DEMO_CANVAS,
    shapes: DEMO_DRAFT.shapes,
    keyLocations: DEMO_DRAFT.keyLocations,
});

const demoApi = createMockMapShapeEditorApi({delayMs: 480});

type SubmitStatus = 'idle' | 'frontend_error' | 'saving' | 'backend_error' | 'success';
type EventLogLevel = 'state' | 'callback' | 'network';
type DemoKeyLocationRenderMode = 'circle' | 'icon' | 'auto';
type DemoTooltipMode = 'default' | 'compact' | 'rich' | 'off';
type DemoPixiRenderStyle = 'clean' | 'operations' | 'neon';
type PreviewPickDetail = MapPreviewPickDetail;

interface EventLogItem {
    id: string;
    level: EventLogLevel;
    message: string;
}

interface ButtonLikeProps {
    text: string;
    onClick: () => void;
    danger?: boolean;
}

function cloneDraft(draft: MapShapeEditorDraft): MapShapeEditorDraft {
    return {
        shapes: draft.shapes.map(shape => ({
            ...shape,
            vertices: shape.vertices.map(vertex => ({...vertex})),
        })),
        keyLocations: draft.keyLocations.map(location => ({...location})),
    };
}

function formatCoordinate(value: number): string {
    return value.toFixed(1);
}

function formatViewBoxValue(value: number): string {
    return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

function buildLocationName(locations: MapKeyLocationDraft[]): string {
    return `关键地点 ${locations.length + 1}`;
}

function createLog(level: EventLogLevel, message: string): EventLogItem {
    return {
        id: createMapShapeEditorLocalId('log'),
        level,
        message,
    };
}

function deckColorToHex(color: [number, number, number, number]): string {
    return `#${color.slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function deckColorToNumber(color: [number, number, number, number]): number {
    return (color[0] << 16) + (color[1] << 8) + color[2];
}

function hexToDeckColor(value: string, fallbackAlpha: number): [number, number, number, number] {
    const normalized = value.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return [255, 255, 255, fallbackAlpha];
    }

    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
        fallbackAlpha,
    ];
}

function getPolygonCenter(polygon: [number, number][]): [number, number] {
    if (polygon.length === 0) {
        return [0, 0];
    }

    const total = polygon.reduce((sum, point) => ({
        x: sum.x + point[0],
        y: sum.y + point[1],
    }), {x: 0, y: 0});

    return [total.x / polygon.length, total.y / polygon.length];
}

function drawPixiStyleOverlay(
    graphics: any,
    context: MapPixiPreviewOverlayContext,
    styleMode: DemoPixiRenderStyle,
    selectedShapeId: string | null,
    selectedLocationId: string | null,
    invalidShapeIds: string[],
    invalidLocationIds: string[],
) {
    graphics.clear();
    if (styleMode === 'clean') {
        return;
    }

    const {scene} = context;
    const isNeon = styleMode === 'neon';
    const gridStep = isNeon ? 50 : 100;
    const gridColor = isNeon ? 0x53f3ff : 0x2563eb;
    const accentColor = isNeon ? 0xff4fd8 : 0x0f766e;
    const warningColor = 0xff4d4d;
    const safeScale = Math.max(context.viewportTransform.scale, 0.01);
    const thinLine = Math.max(1 / safeScale, 0.8);
    const normalLine = Math.max(2 / safeScale, 1.2);

    for (let x = 0; x <= scene.canvas.width; x += gridStep) {
        graphics.moveTo(x, 0);
        graphics.lineTo(x, scene.canvas.height);
    }
    for (let y = 0; y <= scene.canvas.height; y += gridStep) {
        graphics.moveTo(0, y);
        graphics.lineTo(scene.canvas.width, y);
    }
    graphics.stroke({width: thinLine, color: gridColor, alpha: isNeon ? 0.2 : 0.1});

    graphics
        .rect(0, 0, scene.canvas.width, scene.canvas.height)
        .stroke({width: normalLine, color: gridColor, alpha: isNeon ? 0.48 : 0.22});

    scene.shapes.forEach(shape => {
        const points = shape.polygon.flatMap(point => point);
        const isSelected = shape.id === selectedShapeId;
        const isInvalid = invalidShapeIds.includes(shape.id);
        if (!isSelected && !isInvalid && !isNeon) {
            return;
        }

        const strokeColor = isInvalid ? warningColor : (isSelected ? accentColor : deckColorToNumber(shape.lineColor));
        const fillAlpha = isInvalid ? 0.1 : (isSelected ? 0.08 : 0.035);

        graphics
            .poly(points, true)
            .fill({color: strokeColor, alpha: fillAlpha})
            .stroke({
                width: normalLine + (isSelected || isInvalid ? 1 / safeScale : 0),
                color: strokeColor,
                alpha: isNeon ? 0.72 : 0.5,
            });

        if (isNeon || isSelected) {
            const center = getPolygonCenter(shape.polygon);
            graphics
                .circle(center[0], center[1], 26 / safeScale)
                .stroke({width: thinLine, color: strokeColor, alpha: 0.55});
        }
    });

    scene.keyLocations.forEach(location => {
        const isSelected = location.id === selectedLocationId;
        const isInvalid = invalidLocationIds.includes(location.id);
        const markerColor = isInvalid ? warningColor : (isSelected ? accentColor : deckColorToNumber(location.color));
        const radius = (isSelected || isInvalid ? 32 : 22) / safeScale;

        if (styleMode === 'operations') {
            if (!isSelected && !isInvalid) {
                return;
            }
        }

        graphics
            .circle(location.position[0], location.position[1], radius)
            .stroke({width: normalLine, color: markerColor, alpha: isNeon ? 0.72 : 0.48});
        graphics
            .circle(location.position[0], location.position[1], radius * 0.52)
            .fill({color: markerColor, alpha: isNeon ? 0.08 : 0.05})
            .stroke({width: thinLine, color: markerColor, alpha: 0.38});

        const relatedShape = scene.shapes.find(shape => shape.id === location.shapeId);
        if (relatedShape && (isNeon || isSelected || isInvalid)) {
            const center = getPolygonCenter(relatedShape.polygon);
            graphics.moveTo(center[0], center[1]);
            graphics.lineTo(location.position[0], location.position[1]);
            graphics.stroke({width: thinLine, color: markerColor, alpha: isNeon ? 0.36 : 0.24});
        }
    });
}

function formatPreviewPickDetail(detail: PreviewPickDetail | null): string {
    if (!detail) {
        return '暂无';
    }

    if (detail.kind === 'empty') {
        return `空白区域 @ (${detail.x}, ${detail.y})`;
    }

    if (detail.kind === 'shape') {
        return `图形 ${detail.object.name} (${detail.object.id}) @ (${detail.x}, ${detail.y})`;
    }

    return `关键地点 ${detail.object.name} (${detail.object.id}) @ (${detail.x}, ${detail.y})`;
}

function svgToDataUrl(svg: string): string {
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

const DEMO_BACKGROUND_IMAGE = svgToDataUrl(`
    <svg xmlns="http://www.w3.org/2000/svg" width="200" height="200">
        <defs><pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#e2e8f0" stroke-width="1"/>
        </pattern></defs>
        <rect width="200" height="200" fill="url(#grid)"/>
    </svg>
`);

function buildLocationIcon(type: string, color: string): {
    url: string;
    width: number;
    height: number;
    anchorX: number;
    anchorY: number
} | null {
    if (type === '出入口') {
        return {
            url: svgToDataUrl(`
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="${color}" fill-opacity="0.18" />
                    <path d="M22 6L35 18H29V34H15V18H9L22 6Z" fill="${color}" stroke="#ffffff" stroke-width="2.2" />
                </svg>
            `),
            width: 44,
            height: 44,
            anchorX: 22,
            anchorY: 22,
        };
    }

    if (type === '设备点') {
        return {
            url: svgToDataUrl(`
                <svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="17" fill="${color}" fill-opacity="0.16" />
                    <rect x="12" y="12" width="20" height="20" rx="6" fill="${color}" stroke="#ffffff" stroke-width="2.2" />
                    <path d="M18 22H26M22 18V26" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" />
                </svg>
            `),
            width: 44,
            height: 44,
            anchorX: 22,
            anchorY: 22,
        };
    }

    return null;
}

function enhancePreviewScene(scene: MapPreviewScene, iconMarkerSize: number): MapPreviewScene {
    return {
        ...scene,
        keyLocations: scene.keyLocations.map(location => {
            const locationColor = deckColorToHex(location.color);
            const icon = buildLocationIcon(location.type, locationColor);
            return {
                ...location,
                icon,
                iconSize: icon ? iconMarkerSize : undefined,
            };
        }),
    };
}

function buildDemoTooltip(detail: PreviewPickDetail, tooltipMode: DemoTooltipMode): MapPreviewTooltip | string | null {
    if (tooltipMode === 'off' || detail.kind === 'empty') {
        return null;
    }

    if (tooltipMode === 'default') {
        return null;
    }

    if (detail.kind === 'shape') {
        if (tooltipMode === 'compact') {
            return `图形：${detail.object.name}\n顶点数：${detail.object.polygon.length}`;
        }

        return {
            html: `
                <div style="display:flex;flex-direction:column;gap:4px;min-width:170px;">
                    <strong>${detail.object.name}</strong>
                    <span>ID：${detail.object.id}</span>
                    <span>顶点数：${detail.object.polygon.length}</span>
                    <span>填充色：${deckColorToHex(detail.object.fillColor)}</span>
                </div>
            `,
            style: {
                backgroundColor: 'rgba(16, 24, 40, 0.92)',
                color: '#ffffff',
                borderRadius: '10px',
                padding: '10px 12px',
                boxShadow: '0 12px 32px rgba(15, 23, 42, 0.28)',
            },
        };
    }

    if (tooltipMode === 'compact') {
        return `关键地点：${detail.object.name}\n类型：${detail.object.type}`;
    }

    return {
        html: `
            <div style="display:flex;flex-direction:column;gap:4px;min-width:180px;">
                <strong>${detail.object.name}</strong>
                <span>类型：${detail.object.type}</span>
                <span>关联图形：${detail.object.shapeId ?? '未关联'}</span>
                <span>坐标：${Math.round(detail.object.position[0])}, ${Math.round(detail.object.position[1])}</span>
                <span>图标：${detail.object.icon ? 'SVG 图标' : '圆点'}</span>
            </div>
        `,
        style: {
            backgroundColor: 'rgba(8, 15, 30, 0.94)',
            color: '#f8fafc',
            borderRadius: '12px',
            padding: '10px 12px',
            border: '1px solid rgba(148, 163, 184, 0.35)',
            boxShadow: '0 14px 30px rgba(15, 23, 42, 0.32)',
        },
    };
}

function ButtonLike({text, onClick, danger = false}: ButtonLikeProps) {
    return (
        <button
            type="button"
            className={['fc-map-shape-editor__chip', danger ? 'fc-map-shape-editor__chip--invalid' : ''].filter(Boolean).join(' ')}
            style={{width: 'auto'}}
            onClick={onClick}
        >
            {text}
        </button>
    );
}

function useStableDemoPixiBlurFilter(): BlurFilter {
    const filterRef = useRef<BlurFilter | null>(null);
    const destroyTimerRef = useRef<number | null>(null);

    if (!filterRef.current) {
        filterRef.current = new BlurFilter({strength: 2});
    }

    const filter = filterRef.current;

    useEffect(() => {
        if (typeof window !== 'undefined' && destroyTimerRef.current !== null) {
            window.clearTimeout(destroyTimerRef.current);
            destroyTimerRef.current = null;
        }

        return () => {
            if (typeof window === 'undefined') {
                filter.destroy();
                if (filterRef.current === filter) {
                    filterRef.current = null;
                }
                return;
            }

            destroyTimerRef.current = window.setTimeout(() => {
                filter.destroy();
                if (filterRef.current === filter) {
                    filterRef.current = null;
                }
                destroyTimerRef.current = null;
            }, 0);
        };
    }, [filter]);

    return filter;
}

export function MapShapeEditorDemo() {
    const {showContextMenu} = useContextMenu();
    const [draft, setDraft] = useState<MapShapeEditorDraft>(() => cloneDraft(DEMO_DRAFT));
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(DEMO_DRAFT.shapes[0]?.id ?? null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(DEMO_DRAFT.keyLocations[0]?.id ?? null);
    const [drawingShape, setDrawingShape] = useState<MapShapeDraft | null>(null);
    const [viewBox, setViewBox] = useState(() => createInitialMapShapeEditorViewBox(DEMO_CANVAS));
    const [preview, setPreview] = useState<MapPreviewScene | null>(DEMO_PREVIEW);
    const [viewportMode, setViewportMode] = useState<'edit' | 'preview'>('edit');
    const [previewRenderer, setPreviewRenderer] = useState<MapShapeViewportRenderer>('pixi');
    const [showDualRenderer, setShowDualRenderer] = useState(false);
    const [dualViewBox, setDualViewBox] = useState<MapShapeEditorViewBox | null>(null);
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const [submitMessage, setSubmitMessage] = useState('尚未触发提交。');
    const [forcedInvalidShapeIds, setForcedInvalidShapeIds] = useState<string[]>([]);
    const [forcedInvalidLocationIds, setForcedInvalidLocationIds] = useState<string[]>([]);
    const [previewHoverDetail, setPreviewHoverDetail] = useState<PreviewPickDetail | null>(null);
    const [previewClickDetail, setPreviewClickDetail] = useState<PreviewPickDetail | null>(null);
    const [polygonLineWidth, setPolygonLineWidth] = useState(2);
    const [locationRadius, setLocationRadius] = useState(8);
    const [locationStrokeColor, setLocationStrokeColor] = useState<MapRgbaColor>([255, 255, 255, 255]);
    const [showLocationStroke, setShowLocationStroke] = useState(true);
    const [keyLocationRenderMode, setKeyLocationRenderMode] = useState<DemoKeyLocationRenderMode>('auto');
    const [iconMarkerSize, setIconMarkerSize] = useState(30);
    const [labelFontSize, setLabelFontSize] = useState(13);
    const [labelColor, setLabelColor] = useState<MapRgbaColor>([38, 43, 56, 255]);
    const [labelFontFamily, setLabelFontFamily] = useState('"Microsoft YaHei UI", sans-serif');
    const [showLabels, setShowLabels] = useState(true);
    const [tooltipMode, setTooltipMode] = useState<DemoTooltipMode>('rich');
    const [pixiRenderStyle, setPixiRenderStyle] = useState<DemoPixiRenderStyle>('neon');
    const [readOnly, setReadOnly] = useState(false);
    const [showBackgroundImage, setShowBackgroundImage] = useState(false);
    const [pixiFilterEnabled, setPixiFilterEnabled] = useState(false);
    const [previewViewBox, setPreviewViewBox] = useState<MapShapeEditorViewBox | null>(null);
    const [eventLogs, setEventLogs] = useState<EventLogItem[]>([
        createLog('state', 'demo 已初始化。你可以从这里观察所有受控状态与回调能力。'),
    ]);

    const pushLog = (level: EventLogLevel, message: string) => {
        setEventLogs(currentLogs => [createLog(level, message), ...currentLogs].slice(0, 18));
    };

    const validationResult = validateMapEditorDraft(draft, {
        hasDrawingShapeInProgress: Boolean(drawingShape),
    });
    const derivedInvalidShapeIds = validationResult.shapeResults.filter(result => !result.isValid).map(result => result.shapeId);
    const derivedInvalidLocationIds = validationResult.keyLocationResults
        .filter(result => !result.isValid)
        .map(result => result.keyLocationId);
    const invalidShapeIds = Array.from(new Set([...derivedInvalidShapeIds, ...forcedInvalidShapeIds]));
    const invalidKeyLocationIds = Array.from(new Set([...derivedInvalidLocationIds, ...forcedInvalidLocationIds]));

    const selectedShape = draft.shapes.find(shape => shape.id === selectedShapeId) ?? null;
    const selectedLocation = draft.keyLocations.find(location => location.id === selectedLocationId) ?? null;
    const selectedShapeIssues = validationResult.shapeResults.find(result => result.shapeId === selectedShapeId)?.issues ?? [];
    const selectedLocationIssues = validationResult.keyLocationResults.find(result => result.keyLocationId === selectedLocationId)?.issues ?? [];
    const zoomPercentage = Math.round((DEMO_CANVAS.width / Math.max(viewBox.width, 1)) * 100);
    const previewScene = useMemo(
        () => (preview ? enhancePreviewScene(preview, iconMarkerSize) : null),
        [preview, iconMarkerSize],
    );
    const pixiBlurFilter = useStableDemoPixiBlurFilter();

    const updateDraft = (nextDraft: MapShapeEditorDraft) => {
        setDraft(nextDraft);
        pushLog('callback', `onDraftChange：图形 ${nextDraft.shapes.length} 个，关键地点 ${nextDraft.keyLocations.length} 个。`);
    };

    const updateSelectedShapeId = (nextShapeId: string | null) => {
        setSelectedShapeId(nextShapeId);
        pushLog('callback', `onSelectedShapeChange：${nextShapeId ?? 'null'}`);
    };

    const updateSelectedLocationId = (nextLocationId: string | null) => {
        setSelectedLocationId(nextLocationId);
        pushLog('callback', `onSelectedLocationChange：${nextLocationId ?? 'null'}`);
    };

    const updateDrawingShape = (nextShape: MapShapeDraft | null) => {
        setDrawingShape(nextShape);
        pushLog('callback', `onDrawingShapeChange：${nextShape ? `${nextShape.name}（${nextShape.vertices.length} 点）` : 'null'}`);
    };

    const updateViewBox = (nextViewBox: typeof viewBox) => {
        setViewBox(nextViewBox);
        pushLog('callback', `onViewBoxChange：${formatViewBoxValue(nextViewBox.x)}, ${formatViewBoxValue(nextViewBox.y)}, ${formatViewBoxValue(nextViewBox.width)}, ${formatViewBoxValue(nextViewBox.height)}`);
    };

    const deleteShape = (shapeId: string) => {
        const removedLocationIds = new Set(
            draft.keyLocations.filter(location => location.shapeId === shapeId).map(location => location.id),
        );

        setDraft(currentDraft => ({
            shapes: currentDraft.shapes.filter(shape => shape.id !== shapeId),
            keyLocations: currentDraft.keyLocations.filter(location => location.shapeId !== shapeId),
        }));
        setSelectedShapeId(current => (current === shapeId ? null : current));
        setSelectedLocationId(current => (current && removedLocationIds.has(current) ? null : current));
        pushLog('state', `调用方执行删除图形：${shapeId}`);
    };

    const deleteVertex = (shapeId: string, vertexId: string) => {
        setDraft(currentDraft => ({
            ...currentDraft,
            shapes: currentDraft.shapes.map(shape => (
                shape.id === shapeId
                    ? {...shape, vertices: shape.vertices.filter(vertex => vertex.id !== vertexId)}
                    : shape
            )),
        }));
        pushLog('state', `调用方执行删除顶点：${shapeId} / ${vertexId}`);
    };

    const deleteLocation = (locationId: string) => {
        setDraft(currentDraft => ({
            ...currentDraft,
            keyLocations: currentDraft.keyLocations.filter(location => location.id !== locationId),
        }));
        setSelectedLocationId(current => (current === locationId ? null : current));
        pushLog('state', `调用方执行删除关键地点：${locationId}`);
    };

    const moveShapeBackward = (shapeId: string) => {
        setDraft(currentDraft => {
            const currentIndex = currentDraft.shapes.findIndex(shape => shape.id === shapeId);
            if (currentIndex <= 0) return currentDraft;
            return {...currentDraft, shapes: moveShapeInOrder(currentDraft.shapes, shapeId, currentIndex - 1)};
        });
        pushLog('state', `调用方将图形下移一层：${shapeId}`);
    };

    const moveShapeForward = (shapeId: string) => {
        setDraft(currentDraft => {
            const currentIndex = currentDraft.shapes.findIndex(shape => shape.id === shapeId);
            if (currentIndex === -1 || currentIndex >= currentDraft.shapes.length - 1) return currentDraft;
            return {...currentDraft, shapes: moveShapeInOrder(currentDraft.shapes, shapeId, currentIndex + 1)};
        });
        pushLog('state', `调用方将图形上移一层：${shapeId}`);
    };

    const moveShapeToBack = (shapeId: string) => {
        setDraft(currentDraft => {
            const currentIndex = currentDraft.shapes.findIndex(shape => shape.id === shapeId);
            if (currentIndex <= 0) return currentDraft;
            return {...currentDraft, shapes: moveShapeInOrder(currentDraft.shapes, shapeId, 0)};
        });
        pushLog('state', `调用方将图形移到底层：${shapeId}`);
    };

    const moveShapeToFront = (shapeId: string) => {
        setDraft(currentDraft => {
            const currentIndex = currentDraft.shapes.findIndex(shape => shape.id === shapeId);
            if (currentIndex === -1 || currentIndex >= currentDraft.shapes.length - 1) return currentDraft;
            return {
                ...currentDraft,
                shapes: moveShapeInOrder(currentDraft.shapes, shapeId, currentDraft.shapes.length - 1)
            };
        });
        pushLog('state', `调用方将图形移到顶层：${shapeId}`);
    };

    const handleAddShape = () => {
        const nextShape = createEmptyShapeDraft(draft.shapes);
        updateDrawingShape(nextShape);
        updateSelectedShapeId(nextShape.id);
        updateSelectedLocationId(null);
    };

    const handleAddLocation = () => {
        const relatedShape = selectedShape ?? draft.shapes[0] ?? null;
        const center = relatedShape ? getShapeCenter(relatedShape, DEMO_CANVAS) : {
            x: DEMO_CANVAS.width / 2,
            y: DEMO_CANVAS.height / 2,
        };
        const nextLocation: MapKeyLocationDraft = {
            id: createMapShapeEditorLocalId('key-location'),
            name: buildLocationName(draft.keyLocations),
            type: '观察点',
            x: center.x,
            y: center.y,
            shapeId: relatedShape?.id ?? null,
        };

        updateDraft({...draft, keyLocations: [...draft.keyLocations, nextLocation]});
        updateSelectedShapeId(relatedShape?.id ?? null);
        updateSelectedLocationId(nextLocation.id);
    };

    const handleResetAll = () => {
        setDraft(cloneDraft(DEMO_DRAFT));
        setSelectedShapeId(DEMO_DRAFT.shapes[0]?.id ?? null);
        setSelectedLocationId(DEMO_DRAFT.keyLocations[0]?.id ?? null);
        setDrawingShape(null);
        setViewBox(createInitialMapShapeEditorViewBox(DEMO_CANVAS));
        setPreview(DEMO_PREVIEW);
        setViewportMode('edit');
        setPreviewRenderer('pixi');
        setShowDualRenderer(false);
        setDualViewBox(null);
        setSubmitStatus('idle');
        setSubmitMessage('已重置为 demo 初始状态。');
        setForcedInvalidShapeIds([]);
        setForcedInvalidLocationIds([]);
        setPreviewHoverDetail(null);
        setPreviewClickDetail(null);
        setPolygonLineWidth(2);
        setLocationRadius(8);
        setLocationStrokeColor([255, 255, 255, 255]);
        setShowLocationStroke(true);
        setKeyLocationRenderMode('auto');
        setIconMarkerSize(30);
        setLabelFontSize(13);
        setLabelColor([38, 43, 56, 255]);
        setLabelFontFamily('"Microsoft YaHei UI", sans-serif');
        setShowLabels(true);
        setTooltipMode('rich');
        setPixiRenderStyle('neon');
        setReadOnly(false);
        setShowBackgroundImage(false);
        setPixiFilterEnabled(false);
        setPreviewViewBox(null);
        pushLog('state', '调用方重置了所有状态。');
    };

    const handleRebuildPreviewFromDraft = () => {
        setPreview(buildPreviewSceneFromDraft({
            canvas: DEMO_CANVAS,
            shapes: draft.shapes,
            keyLocations: draft.keyLocations,
        }));
        pushLog('network', '调用方使用 buildPreviewSceneFromDraft 直接生成了展示层 scene。');
    };

    const handleSelectedShapeFieldChange = (field: 'name' | 'fill' | 'stroke', value: string) => {
        if (!selectedShapeId) return;
        updateDraft({
            ...draft,
            shapes: draft.shapes.map(shape => (
                shape.id === selectedShapeId ? {...shape, [field]: value} : shape
            )),
        });
    };

    const handleSelectedLocationFieldChange = (field: 'name' | 'type' | 'shapeId', value: string) => {
        if (!selectedLocationId) return;
        updateDraft({
            ...draft,
            keyLocations: draft.keyLocations.map(location => (
                location.id === selectedLocationId
                    ? {...location, [field]: field === 'shapeId' ? (value || null) : value}
                    : location
            )),
        });
    };

    const handleDrawingShapeFieldChange = (field: 'name' | 'fill' | 'stroke', value: string) => {
        if (!drawingShape) return;
        updateDrawingShape({...drawingShape, [field]: value});
    };

    const handleSubmit = async () => {
        if (!validationResult.isValid) {
            setSubmitStatus('frontend_error');
            setSubmitMessage(`前端校验未通过，共 ${validationResult.issues.length} 项异常。`);
            pushLog('network', 'submitMapShapeScene 被前端校验拦截。');
            return;
        }

        setSubmitStatus('saving');
        setSubmitMessage('正在调用 submitMapShapeScene，请稍候…');
        pushLog('network', '开始调用 submitMapShapeScene。');

        try {
            const response = await submitMapShapeScene(demoApi, {
                canvas: DEMO_CANVAS,
                shapes: draft.shapes,
                keyLocations: draft.keyLocations,
            });

            setPreview(response.scene);
            setSubmitStatus('success');
            setSubmitMessage(response.message ?? `提交成功：${response.savedAt}`);
            pushLog('network', `submitMapShapeScene 成功：${response.savedAt}`);
        } catch (error) {
            setSubmitStatus('backend_error');
            setSubmitMessage(error instanceof Error ? error.message : String(error));
            pushLog('network', `submitMapShapeScene 失败：${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const toggleForcedShapeInvalid = (shapeId: string) => {
        setForcedInvalidShapeIds(currentIds => (
            currentIds.includes(shapeId) ? currentIds.filter(id => id !== shapeId) : [...currentIds, shapeId]
        ));
        pushLog('state', `调用方切换 invalidShapeIds：${shapeId}`);
    };

    const toggleForcedLocationInvalid = (locationId: string) => {
        setForcedInvalidLocationIds(currentIds => (
            currentIds.includes(locationId) ? currentIds.filter(id => id !== locationId) : [...currentIds, locationId]
        ));
        pushLog('state', `调用方切换 invalidKeyLocationIds：${locationId}`);
    };

    const svgProps = {
        draft,
        selectedShapeId,
        selectedLocationId,
        drawingShape,
        readOnly,
        backgroundImage: showBackgroundImage ? DEMO_BACKGROUND_IMAGE : undefined,
        invalidShapeIds,
        invalidKeyLocationIds,
        onDraftChange: updateDraft,
        onSelectedShapeChange: updateSelectedShapeId,
        onSelectedLocationChange: updateSelectedLocationId,
        onDrawingShapeChange: updateDrawingShape,
        onRequestShapeDelete: (shapeId: string) => {
            pushLog('callback', `onRequestShapeDelete：${shapeId}`);
            deleteShape(shapeId);
        },
        onRequestVertexDelete: (shapeId: string, vertexId: string) => {
            pushLog('callback', `onRequestVertexDelete：${shapeId} / ${vertexId}`);
            deleteVertex(shapeId, vertexId);
        },
        onRequestLocationDelete: (locationId: string) => {
            pushLog('callback', `onRequestLocationDelete：${locationId}`);
            deleteLocation(locationId);
        },
        onShapeContextMenu: (detail: MapShapeSvgEditorShapeContextMenuDetail) => {
            pushLog('callback', `onShapeContextMenu：${detail.shapeId}`);
            showContextMenu(detail.nativeEvent, [
                {label: '上移一层', disabled: detail.isAtFront, onClick: () => moveShapeForward(detail.shapeId)},
                {label: '下移一层', disabled: detail.isAtBack, onClick: () => moveShapeBackward(detail.shapeId)},
                {label: '移到顶层', disabled: detail.isAtFront, onClick: () => moveShapeToFront(detail.shapeId)},
                {label: '移到底层', disabled: detail.isAtBack, onClick: () => moveShapeToBack(detail.shapeId)},
                {type: 'divider'},
                {label: '删除图形', danger: true, onClick: () => deleteShape(detail.shapeId)},
                {
                    label: '选中图形', onClick: () => {
                        updateSelectedShapeId(detail.shapeId);
                        updateSelectedLocationId(null);
                    }
                },
            ]);
        },
        onVertexContextMenu: (detail: { nativeEvent: MouseEvent; shapeId: string; vertexId: string }) => {
            pushLog('callback', `onVertexContextMenu：${detail.shapeId} / ${detail.vertexId}`);
            showContextMenu(detail.nativeEvent, [
                {label: '删除顶点', danger: true, onClick: () => deleteVertex(detail.shapeId, detail.vertexId)},
            ]);
        },
        onLocationContextMenu: (detail: { nativeEvent: MouseEvent; locationId: string }) => {
            pushLog('callback', `onLocationContextMenu：${detail.locationId}`);
            showContextMenu(detail.nativeEvent, [
                {label: '删除关键地点', danger: true, onClick: () => deleteLocation(detail.locationId)},
                {
                    label: '选中关键地点', onClick: () => {
                        updateSelectedShapeId(null);
                        updateSelectedLocationId(detail.locationId);
                    }
                },
            ]);
        },
        onCanvasContextMenu: (detail: { nativeEvent: MouseEvent; clientX: number; clientY: number }) => {
            pushLog('callback', `onCanvasContextMenu：client(${detail.clientX}, ${detail.clientY})`);
            showContextMenu(detail.nativeEvent, [
                {
                    label: '清空选中态', onClick: () => {
                        updateSelectedShapeId(null);
                        updateSelectedLocationId(null);
                    }
                },
                {label: '新增绘制图形', onClick: handleAddShape},
                {label: '新增关键地点（居中落点）', onClick: handleAddLocation},
            ]);
        },
    };

    const previewShapeStyle = useMemo(() => ({
        lineWidth: polygonLineWidth,
    }), [polygonLineWidth]);
    const previewKeyLocationStyle = useMemo(() => ({
        renderMode: keyLocationRenderMode,
        radius: locationRadius,
        strokeColor: locationStrokeColor,
        showStroke: showLocationStroke,
        iconSize: iconMarkerSize,
    }), [iconMarkerSize, keyLocationRenderMode, locationRadius, locationStrokeColor, showLocationStroke]);
    const previewLabelStyle = useMemo(() => ({
        fontSize: labelFontSize,
        color: labelColor,
        fontFamily: labelFontFamily,
    }), [labelColor, labelFontFamily, labelFontSize]);

    const deckProps = {
        showLabels,
        disableTooltip: tooltipMode === 'off',
        getTooltip: (detail: MapPreviewPickDetail) => buildDemoTooltip(detail, tooltipMode),
        onDeckHover: (detail: MapPreviewPickDetail) => setPreviewHoverDetail(detail),
        onDeckClick: (detail: MapPreviewPickDetail) => {
            setPreviewClickDetail(detail);
            pushLog('callback', `onDeckClick：${formatPreviewPickDetail(detail)}`);
        },
        onShapeClick: (detail: MapPreviewPickDetail) => {
            if (detail.kind === 'shape') pushLog('callback', `onShapeClick：${detail.object.name}`);
        },
        onKeyLocationClick: (detail: MapPreviewPickDetail) => {
            if (detail.kind === 'keyLocation') pushLog('callback', `onKeyLocationClick：${detail.object.name}`);
        },
    };
    const pixiProps = useMemo(() => ({
        showLabels,
        disableTooltip: tooltipMode === 'off',
        getTooltip: (detail: MapPreviewPickDetail) => buildDemoTooltip(detail, tooltipMode),
        renderOverlay: (context: MapPixiPreviewOverlayContext) => createElement('pixiGraphics' as any, {
            draw: (graphics: any) => drawPixiStyleOverlay(
                graphics,
                context,
                pixiRenderStyle,
                selectedShapeId,
                selectedLocationId,
                invalidShapeIds,
                invalidKeyLocationIds,
            ),
        }),
        sceneFilters: pixiFilterEnabled ? [pixiBlurFilter] : undefined,
        onPixiHover: (detail: MapPreviewPickDetail | null) => setPreviewHoverDetail(detail),
        onPixiClick: (detail: MapPreviewPickDetail) => {
            setPreviewClickDetail(detail);
            pushLog('callback', `onPixiClick：${formatPreviewPickDetail(detail)}`);
        },
        onShapeClick: (detail: MapPreviewPickDetail) => {
            if (detail.kind === 'shape') pushLog('callback', `onPixiShapeClick：${detail.object.name}`);
        },
        onKeyLocationClick: (detail: MapPreviewPickDetail) => {
            if (detail.kind === 'keyLocation') pushLog('callback', `onPixiKeyLocationClick：${detail.object.name}`);
        },
        onShapeHover: (detail: MapPreviewShapePickDetail | null) => {
            if (detail) pushLog('callback', `onShapeHover：${detail.object.name}`);
        },
        onKeyLocationHover: (detail: MapPreviewKeyLocationPickDetail | null) => {
            if (detail) pushLog('callback', `onKeyLocationHover：${detail.object.name}`);
        },
        emptyHint: '提交后将在这里显示后端回传的 Pixi 结果。',
    }), [
        invalidKeyLocationIds,
        invalidShapeIds,
        pixiBlurFilter,
        pixiFilterEnabled,
        pixiRenderStyle,
        selectedLocationId,
        selectedShapeId,
        showLabels,
        tooltipMode,
    ]);

    return (
        <div className="demo-section fc-map-shape-editor" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <h4>地图轮廓编辑器（MapShapeViewport 叠层视口）</h4>
            <p style={{margin: 0, color: 'var(--fc-color-text-secondary)', fontSize: 'var(--fc-font-size-sm)'}}>
                SVG 编辑层与预览层叠在同一视口。本 demo 默认使用 Pixi，并保留 Deck 切换用于对照验证。
            </p>

            {/* 总控台 */}
            <div className="fc-map-shape-editor__panel">
                <div className="fc-map-shape-editor__panel-header">
                    <div>
                        <h3 className="fc-map-shape-editor__panel-title">总控台</h3>
                        <p className="fc-map-shape-editor__panel-subtitle">所有受控状态与策略切换。</p>
                    </div>
                </div>
                <div className="fc-map-shape-editor__sidebar-body">
                    <div className="fc-map-shape-editor__section">
                        <div className="fc-map-shape-editor__toolbar">
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={handleResetAll}>
                                重置全部状态
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={() => setViewBox(createInitialMapShapeEditorViewBox(DEMO_CANVAS))}>
                                重置视图
                            </button>
                            <button
                                type="button"
                                className="fc-map-shape-editor__chip"
                                style={{width: 'auto'}}
                                onClick={() => {
                                    const next = !readOnly;
                                    setReadOnly(next);
                                    pushLog('state', `切换只读模式：${next ? '开启' : '关闭'}`);
                                }}
                            >
                                {readOnly ? '退出只读模式' : '进入只读模式'}
                            </button>
                            <button
                                type="button"
                                className="fc-map-shape-editor__chip"
                                style={{width: 'auto'}}
                                onClick={() => {
                                    const next = !showBackgroundImage;
                                    setShowBackgroundImage(next);
                                    pushLog('state', `切换底图：${next ? '显示' : '隐藏'}`);
                                }}
                            >
                                {showBackgroundImage ? '隐藏底图' : '显示底图'}
                            </button>
                            <button
                                type="button"
                                className="fc-map-shape-editor__chip"
                                style={{width: 'auto', fontWeight: 600}}
                                onClick={() => {
                                    const next = viewportMode === 'edit' ? 'preview' : 'edit';
                                    setViewportMode(next);
                                    pushLog('state', `切换视口模式：${next}`);
                                }}
                            >
                                {viewportMode === 'edit' ? '切换到预览模式' : '切换到编辑模式'}
                            </button>
                            <button
                                type="button"
                                className="fc-map-shape-editor__chip"
                                style={{width: 'auto', fontWeight: 600}}
                                onClick={() => {
                                    const next = previewRenderer === 'pixi' ? 'deck' : 'pixi';
                                    setPreviewRenderer(next);
                                    pushLog('state', `切换预览渲染器：${next}`);
                                }}
                            >
                                {previewRenderer === 'pixi' ? '当前 Pixi，切到 Deck' : '当前 Deck，切到 Pixi'}
                            </button>
                            <button
                                type="button"
                                className="fc-map-shape-editor__chip"
                                style={{width: 'auto', fontWeight: 600}}
                                onClick={() => {
                                    const next = !showDualRenderer;
                                    setShowDualRenderer(next);
                                    if (next) {
                                        setViewportMode('preview');
                                        pushLog('state', '进入 Deck / Pixi 双栏对照模式');
                                    } else {
                                        pushLog('state', '退出双栏对照，恢复单栏');
                                    }
                                }}
                            >
                                {showDualRenderer ? '退出双栏对照' : '进入双栏对照'}
                            </button>
                            {viewportMode === 'edit' && (
                                <>
                                    <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                            onClick={drawingShape ? () => updateDrawingShape(null) : handleAddShape}>
                                        {drawingShape ? '取消绘制图形' : '开始绘制图形'}
                                    </button>
                                    <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                            onClick={handleAddLocation}>
                                        新增关键地点
                                    </button>
                                </>
                            )}
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={handleRebuildPreviewFromDraft}>
                                用草稿刷新展示层
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={() => void handleSubmit()}>
                                调用 submitMapShapeScene
                            </button>
                        </div>

                        <div className="fc-map-shape-editor__stats">
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">视口模式</span>
                                <strong className="fc-map-shape-editor__stat-value">{viewportMode}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">预览渲染器</span>
                                <strong className="fc-map-shape-editor__stat-value">{previewRenderer}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">双栏对照</span>
                                <strong
                                    className="fc-map-shape-editor__stat-value">{showDualRenderer ? '开启' : '关闭'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">只读模式</span>
                                <strong
                                    className="fc-map-shape-editor__stat-value">{readOnly ? '开启' : '关闭'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">底图</span>
                                <strong
                                    className="fc-map-shape-editor__stat-value">{showBackgroundImage ? '显示' : '隐藏'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">预览视口</span>
                                <strong className="fc-map-shape-editor__stat-value">
                                    {previewViewBox
                                        ? `${formatViewBoxValue(previewViewBox.x)}, ${formatViewBoxValue(previewViewBox.y)}, ${formatViewBoxValue(previewViewBox.width)}, ${formatViewBoxValue(previewViewBox.height)}`
                                        : '外部控制'}
                                </strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">图形数量</span>
                                <strong className="fc-map-shape-editor__stat-value">{draft.shapes.length}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">关键地点</span>
                                <strong className="fc-map-shape-editor__stat-value">{draft.keyLocations.length}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">缩放比例</span>
                                <strong className="fc-map-shape-editor__stat-value">{zoomPercentage}%</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">选中图形</span>
                                <strong className="fc-map-shape-editor__stat-value">{selectedShapeId ?? 'null'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">绘制状态</span>
                                <strong className="fc-map-shape-editor__stat-value">
                                    {drawingShape ? `${drawingShape.vertices.length} 点` : '关闭'}
                                </strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* 主视口 + 侧边栏 */}
            <div className="fc-map-shape-editor__workspace"
                 style={{gridTemplateColumns: showDualRenderer ? 'minmax(0, 1fr) minmax(0, 1fr) minmax(360px, 1fr)' : 'minmax(0, 1.4fr) minmax(360px, 1fr)'}}>
                {showDualRenderer ? (
                    <>
                        <section className="fc-map-shape-editor__panel">
                            <div className="fc-map-shape-editor__panel-header">
                                <div>
                                    <h3 className="fc-map-shape-editor__panel-title">Deck 预览（主控）</h3>
                                    <p className="fc-map-shape-editor__panel-subtitle">
                                        左侧 Deck 预览层负责平移/缩放主控；右侧 Pixi 跟随同一份 viewBox。
                                    </p>
                                </div>
                            </div>
                            <MapDeckPreview
                                scene={previewScene}
                                enablePanZoom
                                enablePicking
                                shapeStyle={previewShapeStyle}
                                keyLocationStyle={previewKeyLocationStyle}
                                labelStyle={previewLabelStyle}
                                onPreviewViewBoxChange={setDualViewBox}
                                {...deckProps}
                            />
                        </section>
                        <section className="fc-map-shape-editor__panel">
                            <div className="fc-map-shape-editor__panel-header">
                                <div>
                                    <h3 className="fc-map-shape-editor__panel-title">Pixi 预览（跟随）</h3>
                                    <p className="fc-map-shape-editor__panel-subtitle">
                                        接收 Deck 的 viewBox 同步；picking 和 overlay 仍可用。
                                    </p>
                                </div>
                            </div>
                            <MapPixiPreview
                                scene={previewScene}
                                enablePanZoom
                                enablePicking
                                syncViewBox={dualViewBox ?? undefined}
                                shapeStyle={previewShapeStyle}
                                keyLocationStyle={previewKeyLocationStyle}
                                labelStyle={previewLabelStyle}
                                {...pixiProps}
                            />
                        </section>
                    </>
                ) : (
                    <section className="fc-map-shape-editor__panel">
                        <div className="fc-map-shape-editor__panel-header">
                            <div>
                                <h3 className="fc-map-shape-editor__panel-title">MapShapeViewport</h3>
                                <p className="fc-map-shape-editor__panel-subtitle">
                                    {previewRenderer === 'pixi'
                                        ? '当前使用 Pixi 预览层，可叠加扫描网格、区域光晕和关键地点态势覆盖层。'
                                        : (viewportMode === 'edit'
                                            ? '当前使用 Deck 预览层，SVG 编辑层叠在 Deck 上方。'
                                            : '当前使用 Deck 展示模式，悬浮可查看 tooltip。')}
                                </p>
                            </div>
                        </div>
                        <MapShapeViewport
                            mode={viewportMode}
                            renderer={previewRenderer}
                            canvas={DEMO_CANVAS}
                            scene={previewScene}
                            viewBox={viewBox}
                            onViewBoxChange={updateViewBox}
                            onPreviewViewBoxChange={viewportMode === 'preview' ? setPreviewViewBox : undefined}
                            svgProps={svgProps}
                            shapeStyle={previewShapeStyle}
                            keyLocationStyle={previewKeyLocationStyle}
                            labelStyle={previewLabelStyle}
                            deckProps={deckProps}
                            pixiProps={pixiProps}
                        />
                    </section>
                )}

                <aside className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">调用方状态区</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                所有这些内容都在视口组件外部，由调用方自由组合。
                            </p>
                        </div>
                    </div>

                    <div className="fc-map-shape-editor__sidebar-body">
                        {/* 提交与校验 */}
                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">提交与校验</h4>
                            <div className="fc-map-shape-editor__status-row">
                                <span className="fc-map-shape-editor__status-label">validateMapEditorDraft</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    validationResult.isValid ? 'fc-map-shape-editor__status--success' : 'fc-map-shape-editor__status--error',
                                ].join(' ')}>
                                    {validationResult.isValid ? '前端校验通过。' : `前端校验失败，共 ${validationResult.issues.length} 项。`}
                                </div>
                            </div>
                            <div className="fc-map-shape-editor__status-row">
                                <span className="fc-map-shape-editor__status-label">submitMapShapeScene</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    submitStatus === 'success' ? 'fc-map-shape-editor__status--success' : '',
                                    submitStatus === 'saving' ? 'fc-map-shape-editor__status--saving' : '',
                                    submitStatus === 'frontend_error' || submitStatus === 'backend_error' ? 'fc-map-shape-editor__status--error' : '',
                                ].filter(Boolean).join(' ')}>
                                    {submitMessage}
                                </div>
                            </div>
                            {validationResult.issues.length > 0 && (
                                <div className="fc-map-shape-editor__issue-list">
                                    {validationResult.issues.map(issue => (
                                        <div key={`${issue.code}-${issue.message}`}
                                             className="fc-map-shape-editor__issue-item">
                                            {issue.message}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* 预览渲染参数 */}
                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">预览渲染参数</h4>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-marker-mode">keyLocationRenderMode</label>
                                <select id="demo-deck-marker-mode" value={keyLocationRenderMode}
                                        onChange={event => setKeyLocationRenderMode(event.target.value as DemoKeyLocationRenderMode)}>
                                    <option value="auto">auto（有 icon 就走图标）</option>
                                    <option value="icon">icon（强制图标）</option>
                                    <option value="circle">circle（强制圆点）</option>
                                </select>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-line-width">shapeStyle.lineWidth</label>
                                <input id="demo-deck-line-width" type="number" value={polygonLineWidth}
                                       onChange={event => setPolygonLineWidth(Number(event.target.value))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-location-radius">keyLocationStyle.radius</label>
                                <input id="demo-deck-location-radius" type="number" value={locationRadius}
                                       onChange={event => setLocationRadius(Number(event.target.value))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-location-stroke">keyLocationStyle.strokeColor</label>
                                <input id="demo-deck-location-stroke" value={deckColorToHex(locationStrokeColor)}
                                       onChange={event => setLocationStrokeColor(hexToDeckColor(event.target.value, 255))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-icon-size">keyLocationStyle.iconSize</label>
                                <input id="demo-deck-icon-size" type="number" value={iconMarkerSize}
                                       onChange={event => setIconMarkerSize(Number(event.target.value))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-size">labelStyle.fontSize</label>
                                <input id="demo-deck-label-size" type="number" value={labelFontSize}
                                       onChange={event => setLabelFontSize(Number(event.target.value))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-color">labelStyle.color</label>
                                <input id="demo-deck-label-color" value={deckColorToHex(labelColor)}
                                       onChange={event => setLabelColor(hexToDeckColor(event.target.value, 255))}/>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-font">labelStyle.fontFamily</label>
                                <input id="demo-deck-label-font" value={labelFontFamily}
                                       onChange={event => setLabelFontFamily(event.target.value)}/>
                            </div>
                            <label className="fc-map-shape-editor__chip" style={{cursor: 'pointer'}}>
                                <input type="checkbox" checked={showLabels}
                                       onChange={event => setShowLabels(event.target.checked)}
                                       style={{marginRight: 8}}/>
                                <span className="fc-map-shape-editor__chip-title">showLabels</span>
                            </label>
                            <label className="fc-map-shape-editor__chip" style={{cursor: 'pointer'}}>
                                <input type="checkbox" checked={showLocationStroke}
                                       onChange={event => setShowLocationStroke(event.target.checked)}
                                       style={{marginRight: 8}}/>
                                <span className="fc-map-shape-editor__chip-title">keyLocationStyle.showStroke</span>
                            </label>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-tooltip-mode">tooltip 模式</label>
                                <select id="demo-deck-tooltip-mode" value={tooltipMode}
                                        onChange={event => setTooltipMode(event.target.value as DemoTooltipMode)}>
                                    <option value="rich">rich（HTML 卡片）</option>
                                    <option value="compact">compact（纯文本）</option>
                                    <option value="default">default（组件内置）</option>
                                    <option value="off">off（关闭 tooltip）</option>
                                </select>
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-pixi-render-style">Pixi 风格化覆盖层</label>
                                <select id="demo-pixi-render-style" value={pixiRenderStyle}
                                        onChange={event => setPixiRenderStyle(event.target.value as DemoPixiRenderStyle)}
                                        disabled={previewRenderer !== 'pixi'}>
                                    <option value="neon">neon（态势光晕 + 全域网格）</option>
                                    <option value="operations">operations（只强调选中/异常）</option>
                                    <option value="clean">clean（关闭覆盖层）</option>
                                </select>
                            </div>
                            <label className="fc-map-shape-editor__chip" style={{cursor: 'pointer'}}>
                                <input type="checkbox" checked={pixiFilterEnabled}
                                       onChange={event => setPixiFilterEnabled(event.target.checked)}
                                       disabled={previewRenderer !== 'pixi'}
                                       style={{marginRight: 8}}/>
                                <span className="fc-map-shape-editor__chip-title">sceneFilters（BlurFilter）</span>
                            </label>
                            <p className="fc-map-shape-editor__section-note">
                                本 demo 会在调用方先把 preview scene 二次增强：`出入口 / 设备点` 自动补 SVG 图标，并通过
                                `getTooltip` 控制悬浮内容。Pixi 模式下还会通过 `renderOverlay` 增加场景坐标覆盖层，切到
                                `neon` 可看到网格、区域光晕、关键地点扫描圈和关联线。
                            </p>
                        </div>

                        {/* 外部强制异常高亮 */}
                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">外部强制异常高亮</h4>
                            <p className="fc-map-shape-editor__section-note">
                                `invalidShapeIds / invalidKeyLocationIds` 不必来自校验函数，也可以完全由业务方自行指定。
                            </p>
                            <div className="fc-map-shape-editor__shape-list">
                                {draft.shapes.map(shape => (
                                    <label key={shape.id} className="fc-map-shape-editor__chip"
                                           style={{cursor: 'pointer'}}>
                                        <input type="checkbox" checked={forcedInvalidShapeIds.includes(shape.id)}
                                               onChange={() => toggleForcedShapeInvalid(shape.id)}
                                               style={{marginRight: 8}}/>
                                        <span className="fc-map-shape-editor__chip-title">{shape.name}</span>
                                    </label>
                                ))}
                                {draft.keyLocations.map(location => (
                                    <label key={location.id} className="fc-map-shape-editor__chip"
                                           style={{cursor: 'pointer'}}>
                                        <input type="checkbox" checked={forcedInvalidLocationIds.includes(location.id)}
                                               onChange={() => toggleForcedLocationInvalid(location.id)}
                                               style={{marginRight: 8}}/>
                                        <span className="fc-map-shape-editor__chip-title">{location.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        {/* 预览交互日志 */}
                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">预览交互（Deck / Pixi）</h4>
                            <div className="fc-map-shape-editor__meta-row">
                                <span>Hover</span>
                                <strong>{formatPreviewPickDetail(previewHoverDetail)}</strong>
                            </div>
                            <div className="fc-map-shape-editor__meta-row">
                                <span>Click</span>
                                <strong>{formatPreviewPickDetail(previewClickDetail)}</strong>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>

            {/* 选中图形 / 关键地点 / 绘制中图形 */}
            <div className="fc-map-shape-editor__workspace" style={{gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}}>
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">选中图形控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">图形名称、颜色、选中态和删除都可以完全由调用方控制。</p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-selected-shape">selectedShapeId</label>
                                <select id="demo-selected-shape" value={selectedShapeId ?? ''}
                                        onChange={event => updateSelectedShapeId(event.target.value || null)}>
                                    <option value="">未选中</option>
                                    {draft.shapes.map(shape => (
                                        <option key={shape.id} value={shape.id}>{shape.name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedShape ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-name">名称</label>
                                        <input id="demo-shape-name" value={selectedShape.name}
                                               onChange={event => handleSelectedShapeFieldChange('name', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-fill">填充色</label>
                                        <input id="demo-shape-fill" value={selectedShape.fill ?? ''}
                                               onChange={event => handleSelectedShapeFieldChange('fill', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-stroke">描边色</label>
                                        <input id="demo-shape-stroke" value={selectedShape.stroke ?? ''}
                                               onChange={event => handleSelectedShapeFieldChange('stroke', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__meta-row">
                                        <span>顶点数量</span>
                                        <strong>{selectedShape.vertices.length}</strong>
                                    </div>
                                    <ButtonLike text="删除当前图形" onClick={() => deleteShape(selectedShape.id)}
                                                danger/>
                                    {selectedShapeIssues.length > 0 && (
                                        <div className="fc-map-shape-editor__issue-list">
                                            {selectedShapeIssues.map(issue => (
                                                <div key={`${issue.code}-${issue.message}`}
                                                     className="fc-map-shape-editor__issue-item">
                                                    {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">当前没有选中图形。</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">关键地点控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">关键地点表单、关联图形和删除逻辑都完全在外部。</p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-selected-location">selectedLocationId</label>
                                <select id="demo-selected-location" value={selectedLocationId ?? ''}
                                        onChange={event => updateSelectedLocationId(event.target.value || null)}>
                                    <option value="">未选中</option>
                                    {draft.keyLocations.map(location => (
                                        <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedLocation ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-name">名称</label>
                                        <input id="demo-map-location-name" value={selectedLocation.name}
                                               onChange={event => handleSelectedLocationFieldChange('name', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-type">类型</label>
                                        <input id="demo-map-location-type" value={selectedLocation.type}
                                               onChange={event => handleSelectedLocationFieldChange('type', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-shape">关联图形</label>
                                        <select id="demo-map-location-shape" value={selectedLocation.shapeId ?? ''}
                                                onChange={event => handleSelectedLocationFieldChange('shapeId', event.target.value)}>
                                            <option value="">未关联</option>
                                            {draft.shapes.map(shape => (
                                                <option key={shape.id} value={shape.id}>{shape.name}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="fc-map-shape-editor__meta-row">
                                        <span>坐标</span>
                                        <strong>{formatCoordinate(selectedLocation.x)} / {formatCoordinate(selectedLocation.y)}</strong>
                                    </div>
                                    <ButtonLike text="删除当前关键地点"
                                                onClick={() => deleteLocation(selectedLocation.id)} danger/>
                                    {selectedLocationIssues.length > 0 && (
                                        <div className="fc-map-shape-editor__issue-list">
                                            {selectedLocationIssues.map(issue => (
                                                <div key={`${issue.code}-${issue.message}`}
                                                     className="fc-map-shape-editor__issue-item">
                                                    {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">当前没有选中关键地点。</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">绘制中图形控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">`drawingShape`
                                也是外部状态，业务方可以在侧边单独编辑它。</p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            {drawingShape ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-name">名称</label>
                                        <input id="demo-drawing-shape-name" value={drawingShape.name}
                                               onChange={event => handleDrawingShapeFieldChange('name', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-fill">填充色</label>
                                        <input id="demo-drawing-shape-fill" value={drawingShape.fill ?? ''}
                                               onChange={event => handleDrawingShapeFieldChange('fill', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-stroke">描边色</label>
                                        <input id="demo-drawing-shape-stroke" value={drawingShape.stroke ?? ''}
                                               onChange={event => handleDrawingShapeFieldChange('stroke', event.target.value)}/>
                                    </div>
                                    <div className="fc-map-shape-editor__meta-row">
                                        <span>已落点</span>
                                        <strong>{drawingShape.vertices.length}</strong>
                                    </div>
                                    <ButtonLike text="取消绘制" onClick={() => updateDrawingShape(null)}/>
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">
                                    当前没有绘制中的图形。点击上方"开始绘制图形"后，这里就会被业务表单接管。
                                </div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            {/* 事件日志 */}
            <div className="fc-map-shape-editor__workspace"
                 style={{gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'}}>
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">事件日志</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">这里展示回调链路，帮助判断接口究竟把什么交给了调用方。</p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            {eventLogs.map(log => (
                                <div key={log.id} className="fc-map-shape-editor__issue-item"
                                     style={{color: 'var(--fc-color-text)'}}>
                                    <strong>[{log.level}]</strong> {log.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">原始状态快照</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">调用方可直接查看、保存或二次派生这些状态。</p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <pre style={{margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12}}>
                                {JSON.stringify({
                                    viewportMode,
                                    renderer: previewRenderer,
                                    showDualRenderer,
                                    dualViewBox,
                                    selectedShapeId,
                                    selectedLocationId,
                                    drawingShape,
                                    viewBox,
                                    previewStyleOptions: {
                                        polygonLineWidth,
                                        keyLocationRenderMode,
                                        locationRadius,
                                        iconMarkerSize,
                                        locationStrokeColor,
                                        showLocationStroke,
                                        labelFontSize,
                                        labelColor,
                                        labelFontFamily,
                                        showLabels,
                                        tooltipMode,
                                        pixiRenderStyle,
                                    },
                                    invalidShapeIds,
                                    invalidKeyLocationIds,
                                    submitStatus,
                                    submitMessage,
                                }, null, 2)}
                            </pre>
                        </div>
                        <div className="fc-map-shape-editor__section">
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: 12,
                                maxHeight: 320,
                                overflow: 'auto'
                            }}>
                                {JSON.stringify(draft, null, 2)}
                            </pre>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
}
