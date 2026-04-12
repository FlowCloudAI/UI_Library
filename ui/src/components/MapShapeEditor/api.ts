import type {
    DeckColor,
    MapPreviewKeyLocation,
    MapPreviewScene,
    MapPreviewShape,
    MapShapeEditorApi,
    MapShapeSaveRequest,
    MapShapeSaveResponse,
} from './types';

const SHAPE_FILL_PALETTE: DeckColor[] = [
    [55, 138, 221, 88],
    [99, 153, 34, 88],
    [232, 113, 26, 88],
    [124, 92, 232, 88],
];

const SHAPE_LINE_PALETTE: DeckColor[] = [
    [24, 95, 165, 255],
    [66, 104, 21, 255],
    [170, 78, 12, 255],
    [80, 56, 176, 255],
];

const LOCATION_COLOR_PALETTE: Record<string, DeckColor> = {
    '出入口': [226, 75, 74, 255],
    '补给点': [99, 153, 34, 255],
    '观察点': [0, 163, 163, 255],
    '设备点': [124, 92, 232, 255],
};

function hexToDeckColor(value: string | undefined, fallback: DeckColor): DeckColor {
    if (!value) return fallback;
    const normalized = value.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return fallback;

    const color = normalized.toLowerCase();
    return [
        Number.parseInt(color.slice(0, 2), 16),
        Number.parseInt(color.slice(2, 4), 16),
        Number.parseInt(color.slice(4, 6), 16),
        fallback[3],
    ];
}

function buildPreviewShapes(request: MapShapeSaveRequest): MapPreviewShape[] {
    return request.shapes.map((shape, index) => ({
        id: shape.id,
        name: shape.name,
        polygon: shape.vertices.map(vertex => [vertex.x, vertex.y] as [number, number]),
        fillColor: hexToDeckColor(shape.fill, SHAPE_FILL_PALETTE[index % SHAPE_FILL_PALETTE.length]),
        lineColor: hexToDeckColor(shape.stroke, SHAPE_LINE_PALETTE[index % SHAPE_LINE_PALETTE.length]),
    }));
}

function buildPreviewKeyLocations(request: MapShapeSaveRequest): MapPreviewKeyLocation[] {
    return request.keyLocations.map(location => ({
        id: location.id,
        name: location.name,
        type: location.type,
        position: [location.x, location.y],
        shapeId: location.shapeId ?? null,
        color: LOCATION_COLOR_PALETTE[location.type] ?? [212, 48, 106, 255],
    }));
}

export function buildPreviewSceneFromDraft(request: MapShapeSaveRequest): MapPreviewScene {
    return {
        canvas: request.canvas,
        shapes: buildPreviewShapes(request),
        keyLocations: buildPreviewKeyLocations(request),
    };
}

export function createMockMapShapeEditorApi(options?: { delayMs?: number }): MapShapeEditorApi {
    const delayMs = Math.max(0, options?.delayMs ?? 320);

    return {
        async saveScene(request: MapShapeSaveRequest): Promise<MapShapeSaveResponse> {
            if (delayMs > 0) {
                await new Promise(resolve => {
                    window.setTimeout(resolve, delayMs);
                });
            }

            return {
                scene: buildPreviewSceneFromDraft(request),
                savedAt: new Date().toISOString(),
                message: '已通过 mock 接口同步到 deck 展示层。',
            };
        },
    };
}

export const defaultMapShapeEditorApi = createMockMapShapeEditorApi();
