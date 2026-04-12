import {
    type CSSProperties,
    type MouseEvent as ReactMouseEvent,
    type PointerEvent as ReactPointerEvent,
    useEffect,
    useRef,
    useState,
} from 'react';

import {Button} from '../Button/Button';
import {defaultMapShapeEditorApi, submitMapShapeScene} from './api';
import {MapDeckPreview} from './MapDeckPreview';
import {validateMapEditorDraft} from './validation';
import type {
    MapEditorCanvas,
    MapKeyLocationDraft,
    MapPreviewScene,
    MapShapeDraft,
    MapShapeEditorApi,
    MapShapeEditorDraft,
    MapShapeSaveRequest,
    MapShapeVertex,
    MapValidationIssue,
} from './types';
import './MapShapeEditor.css';

const DEFAULT_CANVAS: MapEditorCanvas = {
    width: 1000,
    height: 640,
};

const LOCATION_DRAG_THRESHOLD = 4;
const PAN_DRAG_THRESHOLD = 3;
const NEW_SHAPE_FILL_PALETTE = ['#d8ecff', '#eaf5d7', '#fdf0de', '#eee9fd'];
const NEW_SHAPE_STROKE_PALETTE = ['#185fa5', '#426815', '#aa4e0c', '#5038b0'];

type SubmissionStatus = 'idle' | 'frontend_error' | 'saving' | 'backend_error' | 'success';

interface SubmissionState {
    status: SubmissionStatus;
    message: string;
}

interface CoordinateSnapshot {
    id: string;
    x: number;
    y: number;
}

type DragState =
    | { kind: 'vertex'; shapeId: string; vertexId: string }
    | { kind: 'keyLocation'; locationId: string }
    | {
        kind: 'shape';
        shapeId: string;
        startPoint: { x: number; y: number };
        originVertices: CoordinateSnapshot[];
        originLocations: CoordinateSnapshot[];
    };

type PendingPointerState =
    | {
        kind: 'keyLocation';
        locationId: string;
        startClientX: number;
        startClientY: number;
    }
    | {
        kind: 'shape';
        shapeId: string;
        startClientX: number;
        startClientY: number;
        startPoint: { x: number; y: number };
        originVertices: CoordinateSnapshot[];
        originLocations: CoordinateSnapshot[];
    };

interface ShapeTranslationDelta {
    x: number;
    y: number;
}

interface ShapeTranslationOptions {
    canvas: MapEditorCanvas;
    currentPoint: { x: number; y: number };
    originVertices: CoordinateSnapshot[];
    startPoint: { x: number; y: number };
}

interface EditorViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

interface PanState {
    startClientX: number;
    startClientY: number;
    originViewBox: EditorViewBox;
    hasMoved: boolean;
}

function clamp(value: number, min: number, max: number): number {
    return Math.min(Math.max(value, min), max);
}

function createInitialViewBox(canvas: MapEditorCanvas): EditorViewBox {
    return {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
    };
}

function clampViewBox(viewBox: EditorViewBox, canvas: MapEditorCanvas): EditorViewBox {
    const width = clamp(viewBox.width, canvas.width * 0.18, canvas.width);
    const height = clamp(viewBox.height, canvas.height * 0.18, canvas.height);

    return {
        width,
        height,
        x: clamp(viewBox.x, 0, canvas.width - width),
        y: clamp(viewBox.y, 0, canvas.height - height),
    };
}

function cloneDraft(draft: MapShapeEditorDraft): MapShapeEditorDraft {
    return {
        shapes: draft.shapes.map(shape => ({
            ...shape,
            vertices: shape.vertices.map(vertex => ({ ...vertex })),
        })),
        keyLocations: draft.keyLocations.map(location => ({ ...location })),
    };
}

function createLocalId(prefix: string): string {
    const randomPart = typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

    return `${prefix}-${randomPart}`;
}

function getShapeCenter(shape: MapShapeDraft, fallbackCanvas: MapEditorCanvas): { x: number; y: number } {
    if (shape.vertices.length === 0) {
        return {
            x: fallbackCanvas.width / 2,
            y: fallbackCanvas.height / 2,
        };
    }

    const summary = shape.vertices.reduce((accumulator, vertex) => ({
        x: accumulator.x + vertex.x,
        y: accumulator.y + vertex.y,
    }), { x: 0, y: 0 });

    return {
        x: summary.x / shape.vertices.length,
        y: summary.y / shape.vertices.length,
    };
}

function toSvgPoint(svgElement: SVGSVGElement, clientX: number, clientY: number, canvas: MapEditorCanvas) {
    const point = svgElement.createSVGPoint();
    point.x = clientX;
    point.y = clientY;

    const screenMatrix = svgElement.getScreenCTM();
    if (screenMatrix) {
        const localPoint = point.matrixTransform(screenMatrix.inverse());
        return {
            x: clamp(localPoint.x, 0, canvas.width),
            y: clamp(localPoint.y, 0, canvas.height),
        };
    }

    const rect = svgElement.getBoundingClientRect();
    return {
        x: clamp(((clientX - rect.left) / rect.width) * canvas.width, 0, canvas.width),
        y: clamp(((clientY - rect.top) / rect.height) * canvas.height, 0, canvas.height),
    };
}

function projectPointToSegment(
    point: { x: number; y: number },
    start: MapShapeVertex,
    end: MapShapeVertex,
) {
    const dx = end.x - start.x;
    const dy = end.y - start.y;
    const lengthSquared = dx * dx + dy * dy;

    if (lengthSquared === 0) {
        return { x: start.x, y: start.y };
    }

    const ratio = clamp(((point.x - start.x) * dx + (point.y - start.y) * dy) / lengthSquared, 0, 1);
    return {
        x: start.x + dx * ratio,
        y: start.y + dy * ratio,
    };
}

function formatCoordinate(value: number): string {
    return value.toFixed(1);
}

function buildNextLocationName(locations: MapKeyLocationDraft[]): string {
    return `关键地点 ${locations.length + 1}`;
}

function buildNextShapeName(shapes: MapShapeDraft[]): string {
    return `图形 ${shapes.length + 1}`;
}

function buildDraftShape(existingShapes: MapShapeDraft[]): MapShapeDraft {
    const index = existingShapes.length;

    return {
        id: createLocalId('shape'),
        name: buildNextShapeName(existingShapes),
        fill: NEW_SHAPE_FILL_PALETTE[index % NEW_SHAPE_FILL_PALETTE.length],
        stroke: NEW_SHAPE_STROKE_PALETTE[index % NEW_SHAPE_STROKE_PALETTE.length],
        vertices: [],
    };
}

function updateVertex(
    draft: MapShapeEditorDraft,
    shapeId: string,
    vertexId: string,
    point: { x: number; y: number },
): MapShapeEditorDraft {
    return {
        ...draft,
        shapes: draft.shapes.map(shape => {
            if (shape.id !== shapeId) return shape;

            return {
                ...shape,
                vertices: shape.vertices.map(vertex => (
                    vertex.id === vertexId ? { ...vertex, x: point.x, y: point.y } : vertex
                )),
            };
        }),
    };
}

function updateKeyLocation(
    draft: MapShapeEditorDraft,
    locationId: string,
    updater: (location: MapKeyLocationDraft) => MapKeyLocationDraft,
): MapShapeEditorDraft {
    return {
        ...draft,
        keyLocations: draft.keyLocations.map(location => (
            location.id === locationId ? updater(location) : location
        )),
    };
}

function buildShapePoints(shape: MapShapeDraft): string {
    return shape.vertices.map(vertex => `${vertex.x},${vertex.y}`).join(' ');
}

function getClampedShapeDelta({
    canvas,
    currentPoint,
    originVertices,
    startPoint,
}: ShapeTranslationOptions): ShapeTranslationDelta {
    const xs = originVertices.map(vertex => vertex.x);
    const ys = originVertices.map(vertex => vertex.y);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    const rawDeltaX = currentPoint.x - startPoint.x;
    const rawDeltaY = currentPoint.y - startPoint.y;

    return {
        x: clamp(rawDeltaX, -minX, canvas.width - maxX),
        y: clamp(rawDeltaY, -minY, canvas.height - maxY),
    };
}

function updateShapeTranslation(
    draft: MapShapeEditorDraft,
    shapeId: string,
    delta: ShapeTranslationDelta,
    originVertices: CoordinateSnapshot[],
    originLocations: CoordinateSnapshot[],
): MapShapeEditorDraft {
    const vertexMap = new Map(originVertices.map(vertex => [vertex.id, vertex]));
    const locationMap = new Map(originLocations.map(location => [location.id, location]));

    return {
        ...draft,
        shapes: draft.shapes.map(shape => {
            if (shape.id !== shapeId) return shape;

            return {
                ...shape,
                vertices: shape.vertices.map(vertex => {
                    const originVertex = vertexMap.get(vertex.id);
                    if (!originVertex) return vertex;

                    return {
                        ...vertex,
                        x: originVertex.x + delta.x,
                        y: originVertex.y + delta.y,
                    };
                }),
            };
        }),
        keyLocations: draft.keyLocations.map(location => {
            const originLocation = locationMap.get(location.id);
            if (!originLocation) return location;

            return {
                ...location,
                x: originLocation.x + delta.x,
                y: originLocation.y + delta.y,
            };
        }),
    };
}

function getShapeEdge(shape: MapShapeDraft, index: number) {
    const start = shape.vertices[index];
    const end = shape.vertices[(index + 1) % shape.vertices.length];
    return { start, end };
}

function buildFrontendValidationMessage(issues: MapValidationIssue[]): string {
    if (issues.length === 0) {
        return '前端校验已通过，可以提交到后端。';
    }

    return `前端校验未通过，共 ${issues.length} 项异常。`;
}

function buildIssueSummary(issues: MapValidationIssue[]): string {
    if (issues.length === 0) {
        return '校验通过';
    }

    return `异常 ${issues.length} 项`;
}

export interface MapShapeEditorProps {
    initialDraft: MapShapeEditorDraft;
    initialPreview?: MapPreviewScene | null;
    api?: MapShapeEditorApi;
    canvas?: MapEditorCanvas;
    width?: string | number;
    height?: string | number;
    className?: string;
    style?: CSSProperties;
}

export function MapShapeEditor({
    initialDraft,
    initialPreview = null,
    api = defaultMapShapeEditorApi,
    canvas = DEFAULT_CANVAS,
    width = '100%',
    height = 'auto',
    className,
    style,
}: MapShapeEditorProps) {
    const [draft, setDraft] = useState<MapShapeEditorDraft>(() => cloneDraft(initialDraft));
    const [preview, setPreview] = useState<MapPreviewScene | null>(initialPreview);
    const [viewBox, setViewBox] = useState<EditorViewBox>(() => createInitialViewBox(canvas));
    const [panState, setPanState] = useState<PanState | null>(null);
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(initialDraft.keyLocations[0]?.id ?? null);
    const [dragState, setDragState] = useState<DragState | null>(null);
    const [pendingPointerState, setPendingPointerState] = useState<PendingPointerState | null>(null);
    const [isAddingKeyLocation, setIsAddingKeyLocation] = useState(false);
    const [drawingShape, setDrawingShape] = useState<MapShapeDraft | null>(null);
    const [submissionState, setSubmissionState] = useState<SubmissionState>({
        status: 'idle',
        message: '尚未提交到后端。',
    });
    const svgRef = useRef<SVGSVGElement | null>(null);
    const suppressCanvasClickRef = useRef(false);

    useEffect(() => {
        const nextDraft = cloneDraft(initialDraft);
        setDraft(nextDraft);
        setSelectedShapeId(null);
        setSelectedLocationId(nextDraft.keyLocations[0]?.id ?? null);
    }, [initialDraft]);

    useEffect(() => {
        setPreview(initialPreview);
    }, [initialPreview]);

    useEffect(() => {
        setViewBox(createInitialViewBox(canvas));
    }, [canvas.height, canvas.width]);

    useEffect(() => {
        if (!selectedShapeId) return;
        if (draft.shapes.some(shape => shape.id === selectedShapeId)) return;
        setSelectedShapeId(null);
    }, [draft.shapes, selectedShapeId]);

    useEffect(() => {
        if (selectedLocationId && draft.keyLocations.some(location => location.id === selectedLocationId)) return;
        setSelectedLocationId(null);
    }, [draft.keyLocations, selectedLocationId]);

    const validationResult = validateMapEditorDraft(draft, {
        hasDrawingShapeInProgress: Boolean(drawingShape),
    });
    const invalidShapeIdSet = new Set(
        validationResult.shapeResults
            .filter(result => !result.isValid)
            .map(result => result.shapeId),
    );
    const invalidKeyLocationIdSet = new Set(
        validationResult.keyLocationResults
            .filter(result => !result.isValid)
            .map(result => result.keyLocationId),
    );
    const selectedShapeIssues = validationResult.shapeResults.find(result => result.shapeId === selectedShapeId)?.issues ?? [];
    const selectedLocationIssues = validationResult.keyLocationResults.find(result => result.keyLocationId === selectedLocationId)?.issues ?? [];
    const invalidShapeCount = validationResult.shapeResults.filter(result => !result.isValid).length;
    const invalidKeyLocationCount = validationResult.keyLocationResults.filter(result => !result.isValid).length;
    const frontendValidationMessage = validationResult.isValid
        ? '前端预校验已通过，可以提交到后端。'
        : buildFrontendValidationMessage(validationResult.issues);
    const canSubmitRequest = submissionState.status !== 'saving';
    const zoomPercentage = Math.round((canvas.width / viewBox.width) * 100);

    useEffect(() => {
        if (submissionState.status !== 'frontend_error') return;

        if (validationResult.isValid) {
            setSubmissionState({
                status: 'idle',
                message: '前端校验已通过，可以继续提交。',
            });
            return;
        }

        const nextMessage = buildFrontendValidationMessage(validationResult.issues);
        if (nextMessage !== submissionState.message) {
            setSubmissionState({
                status: 'frontend_error',
                message: nextMessage,
            });
        }
    }, [submissionState.message, submissionState.status, validationResult]);

    useEffect(() => {
        if (!dragState && !pendingPointerState && !panState) return;

        const handlePointerMove = (event: PointerEvent) => {
            if (panState) {
                const svgElement = svgRef.current;
                if (!svgElement) return;

                const rect = svgElement.getBoundingClientRect();
                if (rect.width <= 0 || rect.height <= 0) return;

                const deltaClientX = event.clientX - panState.startClientX;
                const deltaClientY = event.clientY - panState.startClientY;
                const nextViewBox = clampViewBox({
                    ...panState.originViewBox,
                    x: panState.originViewBox.x - (deltaClientX / rect.width) * panState.originViewBox.width,
                    y: panState.originViewBox.y - (deltaClientY / rect.height) * panState.originViewBox.height,
                }, canvas);
                const moved = Math.hypot(deltaClientX, deltaClientY) >= PAN_DRAG_THRESHOLD;

                setViewBox(nextViewBox);
                setPanState(currentState => (currentState ? {
                    ...currentState,
                    hasMoved: currentState.hasMoved || moved,
                } : currentState));
                return;
            }

            const svgElement = svgRef.current;
            if (!svgElement) return;

            const point = toSvgPoint(svgElement, event.clientX, event.clientY, canvas);
            if (dragState) {
                setDraft(currentDraft => {
                    if (dragState.kind === 'vertex') {
                        return updateVertex(currentDraft, dragState.shapeId, dragState.vertexId, point);
                    }

                    if (dragState.kind === 'shape') {
                        const delta = getClampedShapeDelta({
                            canvas,
                            currentPoint: point,
                            originVertices: dragState.originVertices,
                            startPoint: dragState.startPoint,
                        });

                        return updateShapeTranslation(
                            currentDraft,
                            dragState.shapeId,
                            delta,
                            dragState.originVertices,
                            dragState.originLocations,
                        );
                    }

                    return updateKeyLocation(currentDraft, dragState.locationId, location => ({
                        ...location,
                        x: point.x,
                        y: point.y,
                    }));
                });
                return;
            }

            if (!pendingPointerState) return;

            const distance = Math.hypot(
                event.clientX - pendingPointerState.startClientX,
                event.clientY - pendingPointerState.startClientY,
            );

            if (distance < LOCATION_DRAG_THRESHOLD) return;

            if (pendingPointerState.kind === 'keyLocation') {
                setPendingPointerState(null);
                setDragState({ kind: 'keyLocation', locationId: pendingPointerState.locationId });
                setSelectedLocationId(pendingPointerState.locationId);
                setDraft(currentDraft => updateKeyLocation(currentDraft, pendingPointerState.locationId, location => ({
                    ...location,
                    x: point.x,
                    y: point.y,
                })));
                return;
            }

            const nextShapeDragState: DragState = {
                kind: 'shape',
                shapeId: pendingPointerState.shapeId,
                startPoint: pendingPointerState.startPoint,
                originVertices: pendingPointerState.originVertices,
                originLocations: pendingPointerState.originLocations,
            };
            const delta = getClampedShapeDelta({
                canvas,
                currentPoint: point,
                originVertices: pendingPointerState.originVertices,
                startPoint: pendingPointerState.startPoint,
            });

            setPendingPointerState(null);
            setDragState(nextShapeDragState);
            setSelectedShapeId(pendingPointerState.shapeId);
            setSelectedLocationId(null);
            setDraft(currentDraft => updateShapeTranslation(
                currentDraft,
                pendingPointerState.shapeId,
                delta,
                pendingPointerState.originVertices,
                pendingPointerState.originLocations,
            ));
        };

        const handlePointerUp = () => {
            if (panState?.hasMoved) {
                suppressCanvasClickRef.current = true;
            }

            if (!dragState && pendingPointerState) {
                if (pendingPointerState.kind === 'keyLocation') {
                    setSelectedLocationId(pendingPointerState.locationId);
                } else {
                    setSelectedShapeId(pendingPointerState.shapeId);
                    setSelectedLocationId(null);
                }
            }

            if (dragState?.kind === 'keyLocation') {
                setSelectedLocationId(dragState.locationId);
            }

            setDragState(null);
            setPendingPointerState(null);
            setPanState(null);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
        window.addEventListener('pointercancel', handlePointerUp);

        return () => {
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
            window.removeEventListener('pointercancel', handlePointerUp);
        };
    }, [canvas, dragState, panState, pendingPointerState]);

    useEffect(() => {
        const svgElement = svgRef.current;
        if (!svgElement) return;

        const handleNativeWheel = (event: WheelEvent) => {
            event.preventDefault();

            const zoomFactor = event.deltaY < 0 ? 0.9 : 1.1;
            const pointer = toSvgPoint(svgElement, event.clientX, event.clientY, canvas);
            const nextWidth = viewBox.width * zoomFactor;
            const nextHeight = viewBox.height * zoomFactor;
            const widthRatio = nextWidth / viewBox.width;
            const heightRatio = nextHeight / viewBox.height;
            const nextViewBox = clampViewBox({
                width: nextWidth,
                height: nextHeight,
                x: pointer.x - (pointer.x - viewBox.x) * widthRatio,
                y: pointer.y - (pointer.y - viewBox.y) * heightRatio,
            }, canvas);

            setViewBox(nextViewBox);
        };

        svgElement.addEventListener('wheel', handleNativeWheel, {passive: false});

        return () => {
            svgElement.removeEventListener('wheel', handleNativeWheel);
        };
    }, [canvas, viewBox]);

    const selectedShape = draft.shapes.find(shape => shape.id === selectedShapeId) ?? null;
    const selectedLocation = draft.keyLocations.find(location => location.id === selectedLocationId) ?? null;

    const handleShapeClick = (shapeId: string) => {
        setPendingPointerState(null);
        setSelectedShapeId(shapeId);
        setSelectedLocationId(null);
    };

    const handleShapeDoubleClick = (
        event: ReactMouseEvent<SVGPolygonElement>,
        shapeId: string,
    ) => {
        if (isAddingKeyLocation) return;

        event.preventDefault();
        event.stopPropagation();
        handleShapeClick(shapeId);
    };

    const handleAddShape = () => {
        const nextShape = buildDraftShape(draft.shapes);
        setPendingPointerState(null);
        setIsAddingKeyLocation(false);
        setDrawingShape(nextShape);
        setSelectedShapeId(nextShape.id);
        setSelectedLocationId(null);
    };

    const handleCancelDrawingShape = () => {
        setDrawingShape(null);
    };

    const handleFinishDrawingShape = () => {
        if (!drawingShape || drawingShape.vertices.length < 3) return;

        setDraft(currentDraft => ({
            ...currentDraft,
            shapes: [...currentDraft.shapes, drawingShape],
        }));
        setDrawingShape(null);
        setSelectedShapeId(drawingShape.id);
        setSelectedLocationId(null);
    };

    const handleFinishDrawingShapeByDoubleClick = (event: ReactMouseEvent<SVGElement>) => {
        if (!drawingShape || drawingShape.vertices.length < 3) return;

        event.preventDefault();
        event.stopPropagation();
        handleFinishDrawingShape();
    };

    const handleShapePointerDown = (
        event: ReactPointerEvent<SVGPolygonElement>,
        shape: MapShapeDraft,
    ) => {
        if (isAddingKeyLocation || selectedShapeId !== shape.id) return;

        const svgElement = svgRef.current;
        if (!svgElement) return;

        event.preventDefault();
        event.stopPropagation();

        setPendingPointerState({
            kind: 'shape',
            shapeId: shape.id,
            startClientX: event.clientX,
            startClientY: event.clientY,
            startPoint: toSvgPoint(svgElement, event.clientX, event.clientY, canvas),
            originVertices: shape.vertices.map(vertex => ({ ...vertex })),
            originLocations: draft.keyLocations
                .filter(location => location.shapeId === shape.id)
                .map(location => ({ id: location.id, x: location.x, y: location.y })),
        });
    };

    const handleVertexPointerDown = (
        event: ReactPointerEvent<SVGCircleElement>,
        shapeId: string,
        vertexId: string,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setPendingPointerState(null);
        setSelectedShapeId(shapeId);
        setSelectedLocationId(null);
        setDragState({ kind: 'vertex', shapeId, vertexId });
    };

    const handleKeyLocationPointerDown = (
        event: ReactPointerEvent<SVGGElement>,
        locationId: string,
    ) => {
        event.preventDefault();
        event.stopPropagation();
        setPendingPointerState({
            kind: 'keyLocation',
            locationId,
            startClientX: event.clientX,
            startClientY: event.clientY,
        });
    };

    const handleEdgeDoubleClick = (
        event: ReactMouseEvent<SVGLineElement>,
        shapeId: string,
        edgeIndex: number,
    ) => {
        event.preventDefault();
        event.stopPropagation();

        const svgElement = svgRef.current;
        if (!svgElement) return;

        setDraft(currentDraft => ({
            ...currentDraft,
            shapes: currentDraft.shapes.map(shape => {
                if (shape.id !== shapeId) return shape;

                const { start, end } = getShapeEdge(shape, edgeIndex);
                const clickPoint = toSvgPoint(svgElement, event.clientX, event.clientY, canvas);
                const insertedPoint = projectPointToSegment(clickPoint, start, end);
                const vertices = [...shape.vertices];

                vertices.splice(edgeIndex + 1, 0, {
                    id: createLocalId('vertex'),
                    x: insertedPoint.x,
                    y: insertedPoint.y,
                });

                return {
                    ...shape,
                    vertices,
                };
            }),
        }));

        setSelectedShapeId(shapeId);
        setSelectedLocationId(null);
    };

    const handleCanvasPointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
        const target = event.target as SVGElement | null;
        const isBackgroundTarget = target?.tagName === 'svg' || target?.tagName === 'rect';
        const targetShapeId = target?.getAttribute('data-shape-id');
        const isUnselectedShapeTarget = Boolean(targetShapeId) && targetShapeId !== selectedShapeId;
        const shouldStartPan = event.button === 1 || (
            event.button === 0
            && !drawingShape
            && !isAddingKeyLocation
            && (isBackgroundTarget || isUnselectedShapeTarget)
        );
        if (!shouldStartPan) return;

        event.preventDefault();
        event.stopPropagation();
        setPendingPointerState(null);
        setDragState(null);
        setPanState({
            startClientX: event.clientX,
            startClientY: event.clientY,
            originViewBox: viewBox,
            hasMoved: false,
        });
    };

    const handleResetView = () => {
        setViewBox(createInitialViewBox(canvas));
    };

    const handleCanvasClick = (event: ReactMouseEvent<SVGSVGElement>) => {
        if (suppressCanvasClickRef.current) {
            suppressCanvasClickRef.current = false;
            return;
        }

        const svgElement = svgRef.current;
        if (!svgElement) return;

        if (drawingShape) {
            if (event.detail > 1) return;
            event.stopPropagation();
            const point = toSvgPoint(svgElement, event.clientX, event.clientY, canvas);

            setDrawingShape(currentShape => {
                if (!currentShape) return currentShape;

                return {
                    ...currentShape,
                    vertices: [
                        ...currentShape.vertices,
                        {id: createLocalId('vertex'), x: point.x, y: point.y},
                    ],
                };
            });
            return;
        }

        if (!isAddingKeyLocation) {
            const target = event.target as SVGElement | null;
            const isBackgroundTarget = target?.tagName === 'svg' || target?.tagName === 'rect';
            if (isBackgroundTarget) {
                setSelectedShapeId(null);
            }
            setSelectedLocationId(null);
            return;
        }

        const point = toSvgPoint(svgElement, event.clientX, event.clientY, canvas);
        const clickedShapeId = (event.target as SVGElement | null)?.getAttribute('data-shape-id');
        const newLocation: MapKeyLocationDraft = {
            id: createLocalId('key-location'),
            name: buildNextLocationName(draft.keyLocations),
            type: '观察点',
            x: point.x,
            y: point.y,
            shapeId: clickedShapeId ?? selectedShapeId,
        };

        setDraft(currentDraft => ({
            ...currentDraft,
            keyLocations: [...currentDraft.keyLocations, newLocation],
        }));
        setPendingPointerState(null);
        setSelectedLocationId(newLocation.id);
        setIsAddingKeyLocation(false);
    };

    const handleSelectedLocationFieldChange = (
        field: 'name' | 'type' | 'shapeId',
        value: string,
    ) => {
        if (!selectedLocationId) return;

        setDraft(currentDraft => updateKeyLocation(currentDraft, selectedLocationId, location => ({
            ...location,
            [field]: field === 'shapeId' ? (value || null) : value,
        })));
    };

    const handleDeleteLocation = () => {
        if (!selectedLocationId) return;

        setDraft(currentDraft => ({
            ...currentDraft,
            keyLocations: currentDraft.keyLocations.filter(location => location.id !== selectedLocationId),
        }));
        setSelectedLocationId(null);
    };

    const handleSave = async () => {
        if (!validationResult.isValid) {
            setSubmissionState({
                status: 'frontend_error',
                message: buildFrontendValidationMessage(validationResult.issues),
            });
            return;
        }

        const request: MapShapeSaveRequest = {
            canvas,
            shapes: draft.shapes,
            keyLocations: draft.keyLocations,
        };

        try {
            setSubmissionState({
                status: 'saving',
                message: '正在提交当前图形和关键地点…',
            });
            const response = await submitMapShapeScene(api, request, {timeoutMs: 6000});
            setPreview(response.scene);
            setSubmissionState({
                status: 'success',
                message: response.message ?? `提交成功，时间：${response.savedAt}`,
            });
        } catch (error) {
            setSubmissionState({
                status: 'backend_error',
                message: error instanceof Error ? error.message : String(error),
            });
        }
    };

    return (
        <div
            className={`fc-map-shape-editor${className ? ` ${className}` : ''}`}
            style={{ width, height, ...style }}
        >
            <div className="fc-map-shape-editor__workspace">
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">SVG 编辑层</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                双击图形进入编辑，拖动顶点实时改轮廓，双击边插入顶点；滚轮缩放，拖拽空白区域、未选中图形或中键可平移画布。
                            </p>
                        </div>
                        <div className="fc-map-shape-editor__toolbar">
                            <Button
                                size="sm"
                                variant={drawingShape ? 'warning' : 'secondary'}
                                onClick={drawingShape ? handleCancelDrawingShape : handleAddShape}
                            >
                                {drawingShape ? '取消绘制图形' : '新增图形'}
                            </Button>
                            {drawingShape && (
                                <Button
                                    size="sm"
                                    onClick={handleFinishDrawingShape}
                                    disabled={drawingShape.vertices.length < 3}
                                >
                                    完成绘制
                                </Button>
                            )}
                            <Button
                                size="sm"
                                variant={isAddingKeyLocation ? 'warning' : 'outline'}
                                onClick={() => {
                                    setDrawingShape(null);
                                    setIsAddingKeyLocation(current => !current);
                                }}
                            >
                                {isAddingKeyLocation ? '取消新增关键地点' : '新增关键地点'}
                            </Button>
                            <Button
                                size="sm"
                                onClick={() => void handleSave()}
                                disabled={!canSubmitRequest}
                            >
                                {submissionState.status === 'saving' ? '提交中…' : '提交到后端'}
                            </Button>
                        </div>
                    </div>

                    <div className="fc-map-shape-editor__editor-shell">
                        <div className="fc-map-shape-editor__viewport-tools">
                            <span className="fc-map-shape-editor__viewport-badge">缩放 {zoomPercentage}%</span>
                            <Button size="xs" variant="ghost" onClick={handleResetView}>
                                复位视图
                            </Button>
                        </div>
                        <svg
                            ref={svgRef}
                            className={[
                                'fc-map-shape-editor__canvas',
                                panState ? 'fc-map-shape-editor__canvas--panning' : '',
                            ].filter(Boolean).join(' ')}
                            viewBox={`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`}
                            onClick={handleCanvasClick}
                            onDoubleClick={handleFinishDrawingShapeByDoubleClick}
                            onPointerDown={handleCanvasPointerDown}
                        >
                            <defs>
                                <pattern
                                    id="fc-map-shape-editor-grid"
                                    width="40"
                                    height="40"
                                    patternUnits="userSpaceOnUse"
                                >
                                    <path
                                        d="M 40 0 L 0 0 0 40"
                                        fill="none"
                                        stroke="var(--fc-mse-grid)"
                                        strokeWidth="1"
                                    />
                                </pattern>
                            </defs>

                            <rect
                                x={0}
                                y={0}
                                width={canvas.width}
                                height={canvas.height}
                                fill="url(#fc-map-shape-editor-grid)"
                            />

                            {drawingShape && drawingShape.vertices.length > 0 && (
                                <g>
                                    {drawingShape.vertices.length > 1 && (
                                        <polyline
                                            className="fc-map-shape-editor__draft-line"
                                            points={drawingShape.vertices.map(vertex => `${vertex.x},${vertex.y}`).join(' ')}
                                        />
                                    )}
                                    {drawingShape.vertices.length >= 3 && (
                                        <polygon
                                            className="fc-map-shape-editor__draft-polygon"
                                            points={drawingShape.vertices.map(vertex => `${vertex.x},${vertex.y}`).join(' ')}
                                            style={{
                                                '--fc-mse-shape-fill-color': drawingShape.fill ?? 'var(--fc-color-primary-subtle)',
                                                '--fc-mse-shape-stroke-color': drawingShape.stroke ?? 'var(--fc-color-primary)',
                                            } as CSSProperties}
                                        />
                                    )}
                                    {drawingShape.vertices.map((vertex, index) => {
                                        const isLastVertex = index === drawingShape.vertices.length - 1;
                                        return (
                                            <circle
                                                key={vertex.id}
                                                className={[
                                                    'fc-map-shape-editor__draft-vertex',
                                                    isLastVertex ? 'fc-map-shape-editor__draft-vertex--closable' : '',
                                                ].filter(Boolean).join(' ')}
                                                cx={vertex.x}
                                                cy={vertex.y}
                                                r={isLastVertex ? 6 : 5}
                                                onDoubleClick={isLastVertex ? handleFinishDrawingShapeByDoubleClick : undefined}
                                            />
                                        );
                                    })}
                                </g>
                            )}

                            {draft.shapes.map(shape => {
                                const isSelected = shape.id === selectedShapeId;
                                const isInvalid = invalidShapeIdSet.has(shape.id);

                                return (
                                    <g key={shape.id}>
                                        <polygon
                                            data-shape-id={shape.id}
                                            points={buildShapePoints(shape)}
                                            className={[
                                                'fc-map-shape-editor__shape-polygon',
                                                isSelected ? 'fc-map-shape-editor__shape-polygon--selected' : '',
                                                isInvalid ? 'fc-map-shape-editor__shape-polygon--invalid' : '',
                                            ].filter(Boolean).join(' ')}
                                            style={{
                                                '--fc-mse-shape-fill-color': shape.fill ?? 'var(--fc-color-primary-subtle)',
                                                '--fc-mse-shape-stroke-color': shape.stroke ?? 'var(--fc-color-primary)',
                                            } as CSSProperties}
                                            strokeWidth={isSelected ? 3 : 2}
                                            onPointerDown={event => handleShapePointerDown(event, shape)}
                                            onDoubleClick={event => handleShapeDoubleClick(event, shape.id)}
                                        />

                                        {isSelected && shape.vertices.map((vertex, index) => {
                                            const { start, end } = getShapeEdge(shape, index);
                                            return (
                                                <g key={`${shape.id}-${vertex.id}`}>
                                                    <line
                                                        className="fc-map-shape-editor__edge-hit"
                                                        x1={start.x}
                                                        y1={start.y}
                                                        x2={end.x}
                                                        y2={end.y}
                                                        onDoubleClick={event => handleEdgeDoubleClick(event, shape.id, index)}
                                                    />
                                                    <line
                                                        className="fc-map-shape-editor__edge"
                                                        x1={start.x}
                                                        y1={start.y}
                                                        x2={end.x}
                                                        y2={end.y}
                                                    />
                                                    <circle
                                                        className="fc-map-shape-editor__vertex"
                                                        cx={vertex.x}
                                                        cy={vertex.y}
                                                        r={7}
                                                        onPointerDown={event => handleVertexPointerDown(event, shape.id, vertex.id)}
                                                    />
                                                </g>
                                            );
                                        })}
                                    </g>
                                );
                            })}

                            {draft.keyLocations.map(location => (
                                <g
                                    key={location.id}
                                    className={[
                                        'fc-map-shape-editor__key-location',
                                        location.id === selectedLocationId ? 'fc-map-shape-editor__key-location--selected' : '',
                                        invalidKeyLocationIdSet.has(location.id) ? 'fc-map-shape-editor__key-location--invalid' : '',
                                    ].filter(Boolean).join(' ')}
                                    transform={`translate(${location.x}, ${location.y})`}
                                    onClick={event => event.stopPropagation()}
                                    onPointerDown={event => handleKeyLocationPointerDown(event, location.id)}
                                >
                                    <circle
                                        className="fc-map-shape-editor__key-location-core"
                                        r={10}
                                        fill="var(--fc-color-danger)"
                                    />
                                    <text className="fc-map-shape-editor__key-location-label" x={0} y={-16} textAnchor="middle">
                                        {location.name}
                                    </text>
                                </g>
                            ))}
                        </svg>
                    </div>
                </section>

                <aside className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">编辑信息</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                草稿态只在左侧修改，deck 预览只消费提交后的后端回显数据。
                            </p>
                        </div>
                        {isAddingKeyLocation && (
                            <span className="fc-map-shape-editor__hint-badge">下一次点击画布将创建关键地点</span>
                        )}
                        {drawingShape && (
                            <span
                                className="fc-map-shape-editor__hint-badge">绘制中：点击画布逐点落点，至少 3 个点后完成</span>
                        )}
                    </div>

                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <div className="fc-map-shape-editor__stats">
                                <div className="fc-map-shape-editor__stat">
                                    <span className="fc-map-shape-editor__stat-label">图形数量</span>
                                    <strong className="fc-map-shape-editor__stat-value">{draft.shapes.length}</strong>
                                </div>
                                <div className="fc-map-shape-editor__stat">
                                    <span className="fc-map-shape-editor__stat-label">异常图形</span>
                                    <strong className="fc-map-shape-editor__stat-value">{invalidShapeCount}</strong>
                                </div>
                                <div className="fc-map-shape-editor__stat">
                                    <span className="fc-map-shape-editor__stat-label">关键地点</span>
                                    <strong className="fc-map-shape-editor__stat-value">{draft.keyLocations.length}</strong>
                                </div>
                                <div className="fc-map-shape-editor__stat">
                                    <span className="fc-map-shape-editor__stat-label">异常关键地点</span>
                                    <strong
                                        className="fc-map-shape-editor__stat-value">{invalidKeyLocationCount}</strong>
                                </div>
                                <div className="fc-map-shape-editor__stat">
                                    <span className="fc-map-shape-editor__stat-label">展示层图形</span>
                                    <strong className="fc-map-shape-editor__stat-value">{preview ? preview.shapes.length : 0}</strong>
                                </div>
                            </div>

                            <div className="fc-map-shape-editor__status-row">
                                <span
                                    className="fc-map-shape-editor__status-label">前端预校验 · {buildIssueSummary(validationResult.issues)}</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    validationResult.isValid ? 'fc-map-shape-editor__status--success' : 'fc-map-shape-editor__status--error',
                                ].filter(Boolean).join(' ')}>
                                    {frontendValidationMessage}
                                </div>
                            </div>

                            <div className="fc-map-shape-editor__status-row">
                                <span className="fc-map-shape-editor__status-label">后端提交</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    submissionState.status === 'success' ? 'fc-map-shape-editor__status--success' : '',
                                    submissionState.status === 'backend_error' ? 'fc-map-shape-editor__status--error' : '',
                                    submissionState.status === 'saving' ? 'fc-map-shape-editor__status--saving' : '',
                                ].filter(Boolean).join(' ')}>
                                    {submissionState.message}
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

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">图形列表</h4>
                            <p className="fc-map-shape-editor__section-note">双击左侧图形或点击下面的列表项切换到编辑态。</p>
                            <div className="fc-map-shape-editor__shape-list">
                                {draft.shapes.map(shape => {
                                    const center = getShapeCenter(shape, canvas);
                                    const relatedLocationCount = draft.keyLocations.filter(location => location.shapeId === shape.id).length;
                                    const isInvalid = invalidShapeIdSet.has(shape.id);
                                    return (
                                        <button
                                            key={shape.id}
                                            type="button"
                                            className={[
                                                'fc-map-shape-editor__chip',
                                                shape.id === selectedShapeId ? 'fc-map-shape-editor__chip--active' : '',
                                                isInvalid ? 'fc-map-shape-editor__chip--invalid' : '',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => handleShapeClick(shape.id)}
                                        >
                                            <span className="fc-map-shape-editor__chip-title">{shape.name}</span>
                                            <span className="fc-map-shape-editor__chip-meta">
                                                顶点 {shape.vertices.length} 个，关键地点 {relatedLocationCount} 个，中心点 {formatCoordinate(center.x)} / {formatCoordinate(center.y)}
                                            </span>
                                            <span className="fc-map-shape-editor__chip-meta">
                                                {shape.id === selectedShapeId ? '当前选中' : '点击切换'}
                                                {isInvalid ? ' · 存在校验异常' : ' · 轮廓可编辑'}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">关键地点</h4>
                            <p className="fc-map-shape-editor__section-note">支持新增、拖动和删除，默认关联当前选中的图形。</p>
                            <div className="fc-map-shape-editor__location-list">
                                {draft.keyLocations.length > 0 ? draft.keyLocations.map(location => {
                                    const relatedShape = draft.shapes.find(shape => shape.id === location.shapeId);
                                    const isInvalid = invalidKeyLocationIdSet.has(location.id);

                                    return (
                                        <button
                                            key={location.id}
                                            type="button"
                                            className={[
                                                'fc-map-shape-editor__chip',
                                                location.id === selectedLocationId ? 'fc-map-shape-editor__chip--active' : '',
                                                isInvalid ? 'fc-map-shape-editor__chip--invalid' : '',
                                            ].filter(Boolean).join(' ')}
                                            onClick={() => setSelectedLocationId(location.id)}
                                        >
                                            <span className="fc-map-shape-editor__chip-title">{location.name}</span>
                                            <span className="fc-map-shape-editor__chip-meta">
                                                {location.type} · {formatCoordinate(location.x)} / {formatCoordinate(location.y)}
                                            </span>
                                            <span className="fc-map-shape-editor__chip-meta">
                                                {relatedShape ? `关联：${relatedShape.name}` : '未关联图形'}
                                                {isInvalid ? ' · 存在校验异常' : ''}
                                            </span>
                                        </button>
                                    );
                                }) : (
                                    <div className="fc-map-shape-editor__empty">当前还没有关键地点，点击“新增关键地点”开始放置。</div>
                                )}
                            </div>
                        </div>

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">关键地点详情</h4>
                            {selectedLocation ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="fc-map-shape-editor-location-name">名称</label>
                                        <input
                                            id="fc-map-shape-editor-location-name"
                                            value={selectedLocation.name}
                                            onChange={event => handleSelectedLocationFieldChange('name', event.target.value)}
                                        />
                                    </div>

                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="fc-map-shape-editor-location-type">类型</label>
                                        <input
                                            id="fc-map-shape-editor-location-type"
                                            value={selectedLocation.type}
                                            onChange={event => handleSelectedLocationFieldChange('type', event.target.value)}
                                        />
                                    </div>

                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="fc-map-shape-editor-location-shape">关联图形</label>
                                        <select
                                            id="fc-map-shape-editor-location-shape"
                                            value={selectedLocation.shapeId ?? ''}
                                            onChange={event => handleSelectedLocationFieldChange('shapeId', event.target.value)}
                                        >
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

                                    <Button size="sm" variant="danger" onClick={handleDeleteLocation}>
                                        删除关键地点
                                    </Button>
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">选中一个关键地点后，可在这里编辑名称、类型和关联图形。</div>
                            )}
                        </div>

                        {selectedShape && (
                            <div className="fc-map-shape-editor__section">
                                <h4 className="fc-map-shape-editor__section-title">当前图形</h4>
                                <div className="fc-map-shape-editor__meta-row">
                                    <span>名称</span>
                                    <strong>{selectedShape.name}</strong>
                                </div>
                                <div className="fc-map-shape-editor__meta-row">
                                    <span>顶点数量</span>
                                    <strong>{selectedShape.vertices.length}</strong>
                                </div>
                                <div className="fc-map-shape-editor__meta-row">
                                    <span>关联关键地点</span>
                                    <strong>{draft.keyLocations.filter(location => location.shapeId === selectedShape.id).length}</strong>
                                </div>
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
                                <p className="fc-map-shape-editor__section-note">
                                    双击图形进入编辑；双击边可插入新顶点；选中图形后可整体拖动，关联关键地点会一起移动。
                                </p>
                            </div>
                        )}

                        {drawingShape && (
                            <div className="fc-map-shape-editor__section">
                                <h4 className="fc-map-shape-editor__section-title">绘制中的图形</h4>
                                <div className="fc-map-shape-editor__meta-row">
                                    <span>名称</span>
                                    <strong>{drawingShape.name}</strong>
                                </div>
                                <div className="fc-map-shape-editor__meta-row">
                                    <span>已落点数量</span>
                                    <strong>{drawingShape.vertices.length}</strong>
                                </div>
                                <p className="fc-map-shape-editor__section-note">
                                    当前是描点模式。点击画布继续加点，满足 3 个点后可双击画布或双击最后一个点自动闭合。
                                </p>
                            </div>
                        )}
                    </div>
                </aside>
            </div>

            <section className="fc-map-shape-editor__panel fc-map-shape-editor__preview">
                <div className="fc-map-shape-editor__panel-header">
                    <div>
                        <h3 className="fc-map-shape-editor__panel-title">deck 展示层</h3>
                        <p className="fc-map-shape-editor__panel-subtitle">
                            这里始终展示后端返回结果，不直接复用编辑态数据。
                        </p>
                    </div>
                    <div className="fc-map-shape-editor__meta-row">
                        <span>展示数据</span>
                        <strong>{preview ? `${preview.shapes.length} 个图形 / ${preview.keyLocations.length} 个关键地点` : '暂无'}</strong>
                    </div>
                </div>
                <div
                    className="fc-map-shape-editor__editor-shell fc-map-shape-editor__preview-shell"
                    style={{ aspectRatio: `${canvas.width} / ${canvas.height}` }}
                >
                    <MapDeckPreview scene={preview} />
                </div>
            </section>
        </div>
    );
}
