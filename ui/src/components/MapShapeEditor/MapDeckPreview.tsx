import {type CSSProperties, type RefObject, useEffect, useRef, useState} from 'react';
import DeckGL, {type DeckGLRef} from '@deck.gl/react';
import {type Layer, OrthographicView, type PickingInfo} from '@deck.gl/core';
import {PolygonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';
import {CanvasContext} from '@luma.gl/core';

import type {MapPreviewKeyLocation, MapPreviewScene, MapPreviewShape} from './types';
import './MapShapeEditor.css';

const PREVIEW_VIEW = new OrthographicView({ id: 'fc-map-deck-preview' });
const MIN_RENDER_SIZE = 2;
const CANVAS_CONTEXT_PATCH_FLAG = '__fcMapDeckPreviewCanvasContextPatched__';

interface ElementSize {
    width: number;
    height: number;
}

interface ResizeObserverBoxLike {
    inlineSize: number;
    blockSize: number;
}

interface CanvasContextDeviceLike {
    limits?: {
        maxTextureDimension2D?: number;
    };
    props?: {
        onResize?: (canvasContext: CanvasContext, info: { oldPixelSize: [number, number] }) => void;
        onVisibilityChange?: (canvasContext: CanvasContext) => void;
        onDevicePixelRatioChange?: (canvasContext: CanvasContext, info: { oldRatio: number }) => void;
    };
}

type MutableCanvasContext = Omit<CanvasContext, 'device'> & {
    device?: CanvasContextDeviceLike;
    _handleIntersection(entries: IntersectionObserverEntry[]): void;
    _handleResize(entries: ResizeObserverEntry[]): void;
    _observeDevicePixelRatio(): void;
    _updateDrawingBufferSize(): void;
};

type MutableCanvasContextPrototype = MutableCanvasContext & {
    [CANVAS_CONTEXT_PATCH_FLAG]?: boolean;
};

export interface MapDeckPreviewRenderOptions {
    polygonLineWidth?: number;
    locationRadius?: number;
    locationStrokeColor?: [number, number, number, number];
    labelFontSize?: number;
    labelColor?: [number, number, number, number];
    labelFontFamily?: string;
    showLabels?: boolean;
    showLocationStroke?: boolean;
}

export interface MapDeckPreviewProps {
    scene: MapPreviewScene | null;
    className?: string;
    style?: CSSProperties;
    emptyHint?: string;
    previewRenderOptions?: MapDeckPreviewRenderOptions;
    onDeckClick?: (detail: MapDeckPreviewPickDetail) => void;
    onDeckHover?: (detail: MapDeckPreviewPickDetail) => void;
    onShapeClick?: (detail: MapDeckPreviewShapePickDetail) => void;
    onShapeHover?: (detail: MapDeckPreviewShapePickDetail) => void;
    onKeyLocationClick?: (detail: MapDeckPreviewKeyLocationPickDetail) => void;
    onKeyLocationHover?: (detail: MapDeckPreviewKeyLocationPickDetail) => void;
}

interface MapDeckPreviewPickBaseDetail {
    index: number;
    layerId?: string;
    x: number;
    y: number;
    coordinate?: number[];
}

export interface MapDeckPreviewEmptyPickDetail extends MapDeckPreviewPickBaseDetail {
    kind: 'empty';
    object: null;
}

export interface MapDeckPreviewShapePickDetail extends MapDeckPreviewPickBaseDetail {
    kind: 'shape';
    object: MapPreviewShape;
}

export interface MapDeckPreviewKeyLocationPickDetail extends MapDeckPreviewPickBaseDetail {
    kind: 'keyLocation';
    object: MapPreviewKeyLocation;
}

export type MapDeckPreviewPickDetail =
    | MapDeckPreviewEmptyPickDetail
    | MapDeckPreviewShapePickDetail
    | MapDeckPreviewKeyLocationPickDetail;

const DEFAULT_LOCATION_STROKE_COLOR: [number, number, number, number] = [255, 255, 255, 255];
const DEFAULT_LABEL_COLOR: [number, number, number, number] = [38, 43, 56, 255];
const DEFAULT_LABEL_FONT_FAMILY = '"Microsoft YaHei UI", sans-serif';

function normalizeElementSize(width: number, height: number): ElementSize {
    return {
        width: Number.isFinite(width) ? Math.max(0, Math.round(width)) : 0,
        height: Number.isFinite(height) ? Math.max(0, Math.round(height)) : 0,
    };
}

function resolveResizeObserverBox(
    box: readonly ResizeObserverSize[] | ResizeObserverSize | undefined,
): ResizeObserverBoxLike | null {
    if (!box) {
        return null;
    }

    if (Array.isArray(box)) {
        return box[0] ?? null;
    }

    return box as ResizeObserverBoxLike;
}

function getFallbackDrawingBufferSize(canvasContext: MutableCanvasContext): [number, number] {
    const fallbackWidth = Math.max(
        1,
        Math.ceil(canvasContext.canvas.width || canvasContext.htmlCanvas?.clientWidth || canvasContext.cssWidth || 1),
    );
    const fallbackHeight = Math.max(
        1,
        Math.ceil(canvasContext.canvas.height || canvasContext.htmlCanvas?.clientHeight || canvasContext.cssHeight || 1),
    );

    return [fallbackWidth, fallbackHeight];
}

function hasCanvasContextDevice(canvasContext: MutableCanvasContext): boolean {
    return Number.isFinite(canvasContext.device?.limits?.maxTextureDimension2D)
        && Boolean(canvasContext.device?.props);
}

function ensureCanvasContextSafetyPatch() {
    const canvasContextPrototype = CanvasContext.prototype as unknown as MutableCanvasContextPrototype;
    if (canvasContextPrototype[CANVAS_CONTEXT_PATCH_FLAG]) {
        return;
    }

    const originalGetMaxDrawingBufferSize = canvasContextPrototype.getMaxDrawingBufferSize;
    const originalHandleIntersection = canvasContextPrototype._handleIntersection;
    const originalHandleResize = canvasContextPrototype._handleResize;
    const originalObserveDevicePixelRatio = canvasContextPrototype._observeDevicePixelRatio;

    canvasContextPrototype.getMaxDrawingBufferSize = function patchedGetMaxDrawingBufferSize(this: MutableCanvasContext) {
        if (hasCanvasContextDevice(this)) {
            return originalGetMaxDrawingBufferSize.call(this);
        }

        return getFallbackDrawingBufferSize(this);
    };

    canvasContextPrototype._handleIntersection = function patchedHandleIntersection(
        this: MutableCanvasContext,
        entries: IntersectionObserverEntry[],
    ) {
        if (this.device?.props?.onVisibilityChange) {
            originalHandleIntersection.call(this, entries);
            return;
        }

        const entry = entries.find(currentEntry => currentEntry.target === this.canvas);
        if (!entry) {
            return;
        }

        this.isVisible = entry.isIntersecting;
    };

    canvasContextPrototype._handleResize = function patchedHandleResize(
        this: MutableCanvasContext,
        entries: ResizeObserverEntry[],
    ) {
        if (hasCanvasContextDevice(this) && this.device?.props?.onResize) {
            originalHandleResize.call(this, entries);
            return;
        }

        const entry = entries.find(currentEntry => currentEntry.target === this.canvas);
        if (!entry) {
            return;
        }

        const contentBox = resolveResizeObserverBox(entry.contentBoxSize);
        const devicePixelBox = resolveResizeObserverBox(entry.devicePixelContentBoxSize);
        const oldPixelSize = this.getDevicePixelSize();
        const nextCssWidth = contentBox?.inlineSize ?? entry.contentRect.width;
        const nextCssHeight = contentBox?.blockSize ?? entry.contentRect.height;
        const nextDevicePixelRatio = globalThis.devicePixelRatio || 1;
        const nextDevicePixelWidth = Math.round(devicePixelBox?.inlineSize ?? nextCssWidth * nextDevicePixelRatio);
        const nextDevicePixelHeight = Math.round(devicePixelBox?.blockSize ?? nextCssHeight * nextDevicePixelRatio);

        this.cssWidth = nextCssWidth;
        this.cssHeight = nextCssHeight;
        this.devicePixelWidth = Math.max(1, nextDevicePixelWidth);
        this.devicePixelHeight = Math.max(1, nextDevicePixelHeight);

        this._updateDrawingBufferSize();
        this.device?.props?.onResize?.(this as unknown as CanvasContext, {oldPixelSize});
    };

    canvasContextPrototype._observeDevicePixelRatio = function patchedObserveDevicePixelRatio(this: MutableCanvasContext) {
        if (this.device?.props?.onDevicePixelRatioChange) {
            originalObserveDevicePixelRatio.call(this);
            return;
        }

        const oldRatio = this.devicePixelRatio;
        this.devicePixelRatio = globalThis.devicePixelRatio || 1;
        this.updatePosition();

        if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
            window
                .matchMedia(`(resolution: ${this.devicePixelRatio}dppx)`)
                .addEventListener('change', () => {
                    (CanvasContext.prototype as unknown as MutableCanvasContextPrototype)._observeDevicePixelRatio.call(this);
                }, {once: true});
        }

        this.device?.props?.onDevicePixelRatioChange?.(this as unknown as CanvasContext, {oldRatio});
    };

    canvasContextPrototype[CANVAS_CONTEXT_PATCH_FLAG] = true;
}

ensureCanvasContextSafetyPatch();

function useElementSize<T extends HTMLElement>() {
    const elementRef = useRef<T | null>(null);
    const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

    useEffect(() => {
        const node = elementRef.current;
        if (!node) return;

        let frameId: number | null = null;
        let visibleFrameId: number | null = null;

        const commitSize = (width: number, height: number) => {
            const nextSize = normalizeElementSize(width, height);
            setSize(currentSize => (
                currentSize.width === nextSize.width && currentSize.height === nextSize.height
                    ? currentSize
                    : nextSize
            ));
        };

        const scheduleSizeUpdate = (width: number, height: number) => {
            if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
                commitSize(width, height);
                return;
            }

            if (frameId !== null) {
                window.cancelAnimationFrame(frameId);
            }

            frameId = window.requestAnimationFrame(() => {
                frameId = null;
                commitSize(width, height);
            });
        };

        const measure = () => {
            const rect = node.getBoundingClientRect();
            scheduleSizeUpdate(rect.width, rect.height);
        };

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;

            scheduleSizeUpdate(entry.contentRect.width, entry.contentRect.height);
        });

        observer.observe(node);

        const handleVisibilityChange = () => {
            if (typeof document === 'undefined' || document.visibilityState === 'hidden') {
                return;
            }

            if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
                measure();
                return;
            }

            if (visibleFrameId !== null) {
                window.cancelAnimationFrame(visibleFrameId);
            }

            visibleFrameId = window.requestAnimationFrame(() => {
                visibleFrameId = window.requestAnimationFrame(() => {
                    visibleFrameId = null;
                    measure();
                });
            });
        };

        measure();

        if (typeof document !== 'undefined') {
            document.addEventListener('visibilitychange', handleVisibilityChange);
        }

        return () => {
            observer.disconnect();

            if (typeof document !== 'undefined') {
                document.removeEventListener('visibilitychange', handleVisibilityChange);
            }

            if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
                if (frameId !== null) {
                    window.cancelAnimationFrame(frameId);
                }

                if (visibleFrameId !== null) {
                    window.cancelAnimationFrame(visibleFrameId);
                }
            }
        };
    }, []);

    return { elementRef, size };
}

function usePageVisibility() {
    const [isVisible, setIsVisible] = useState(
        typeof document === 'undefined' ? true : document.visibilityState !== 'hidden',
    );

    useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const handleVisibilityChange = () => {
            setIsVisible(document.visibilityState !== 'hidden');
        };

        document.addEventListener('visibilitychange', handleVisibilityChange);
        return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
    }, []);

    return isVisible;
}

function requestDeckRedraw(deckRef: RefObject<DeckGLRef | null>, reason: string) {
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
        deckRef.current?.deck?.redraw(reason);
        return () => undefined;
    }

    const frameId = window.requestAnimationFrame(() => {
        deckRef.current?.deck?.redraw(reason);
    });

    return () => window.cancelAnimationFrame(frameId);
}

function buildViewState(scene: MapPreviewScene, size: ElementSize) {
    const safeWidth = Math.max(scene.canvas.width, 1);
    const safeHeight = Math.max(scene.canvas.height, 1);
    const availableWidth = Math.max(size.width, 1);
    const availableHeight = Math.max(size.height, 1);
    const scale = Math.min(availableWidth / safeWidth, availableHeight / safeHeight) * 0.92;
    const zoom = Math.log2(Math.max(scale, 0.01));

    return {
        target: [scene.canvas.width / 2, scene.canvas.height / 2, 0] as [number, number, number],
        zoom,
    };
}

function buildLayers(
    scene: MapPreviewScene,
    previewRenderOptions?: MapDeckPreviewRenderOptions,
) {
    const polygonLineWidth = Math.max(0, previewRenderOptions?.polygonLineWidth ?? 2);
    const locationRadius = Math.max(0, previewRenderOptions?.locationRadius ?? 8);
    const locationStrokeColor = previewRenderOptions?.locationStrokeColor ?? DEFAULT_LOCATION_STROKE_COLOR;
    const labelFontSize = Math.max(1, previewRenderOptions?.labelFontSize ?? 13);
    const labelColor = previewRenderOptions?.labelColor ?? DEFAULT_LABEL_COLOR;
    const labelFontFamily = previewRenderOptions?.labelFontFamily ?? DEFAULT_LABEL_FONT_FAMILY;
    const showLabels = previewRenderOptions?.showLabels ?? true;
    const showLocationStroke = previewRenderOptions?.showLocationStroke ?? true;

    const layers: Layer[] = [
        new PolygonLayer<MapPreviewShape>({
            id: 'fc-map-preview-polygons',
            data: scene.shapes,
            pickable: true,
            filled: true,
            stroked: true,
            wireframe: false,
            lineWidthMinPixels: polygonLineWidth,
            getPolygon: item => item.polygon,
            getFillColor: item => item.fillColor,
            getLineColor: item => item.lineColor,
        }),
        new ScatterplotLayer<MapPreviewKeyLocation>({
            id: 'fc-map-preview-key-locations',
            data: scene.keyLocations,
            pickable: true,
            radiusMinPixels: 6,
            radiusMaxPixels: 14,
            stroked: showLocationStroke,
            lineWidthMinPixels: 2,
            getPosition: item => item.position,
            getRadius: locationRadius,
            getFillColor: item => item.color,
            getLineColor: () => locationStrokeColor,
        }),
    ];

    if (showLabels) {
        layers.push(
            new TextLayer<MapPreviewKeyLocation>({
                id: 'fc-map-preview-key-location-labels',
                data: scene.keyLocations,
                pickable: false,
                getPosition: item => [item.position[0], item.position[1] - 18],
                getText: item => item.name,
                getSize: labelFontSize,
                getColor: () => labelColor,
                getTextAnchor: () => 'middle',
                getAlignmentBaseline: () => 'bottom',
                fontFamily: labelFontFamily,
            }),
        );
    }

    return layers;
}

function getTooltipText(object: unknown): string | null {
    if (!object || typeof object !== 'object') return null;

    if ('polygon' in object) {
        const shape = object as MapPreviewShape;
        return `图形：${shape.name}`;
    }

    if ('position' in object) {
        const location = object as MapPreviewKeyLocation;
        return `关键地点：${location.name}\n类型：${location.type}`;
    }

    return null;
}

function toPickDetail(info: PickingInfo): MapDeckPreviewPickDetail {
    const baseDetail: MapDeckPreviewPickBaseDetail = {
        index: info.index,
        layerId: info.layer?.id,
        x: info.x,
        y: info.y,
        coordinate: Array.isArray(info.coordinate) ? [...info.coordinate] : undefined,
    };

    if (!info.object || typeof info.object !== 'object') {
        return {
            kind: 'empty',
            object: null,
            ...baseDetail,
        };
    }

    if ('polygon' in info.object) {
        return {
            kind: 'shape',
            object: info.object as MapPreviewShape,
            ...baseDetail,
        };
    }

    if ('position' in info.object) {
        return {
            kind: 'keyLocation',
            object: info.object as MapPreviewKeyLocation,
            ...baseDetail,
        };
    }

    return {
        kind: 'empty',
        object: null,
        ...baseDetail,
    };
}

export function MapDeckPreview({
    scene,
    className,
    style,
    emptyHint = '提交后将在这里显示后端回传的 deck 结果。',
                                   previewRenderOptions,
                                   onDeckClick,
                                   onDeckHover,
                                   onShapeClick,
                                   onShapeHover,
                                   onKeyLocationClick,
                                   onKeyLocationHover,
}: MapDeckPreviewProps) {
    const { elementRef, size } = useElementSize<HTMLDivElement>();
    const deckRef = useRef<DeckGLRef | null>(null);
    const isPageVisible = usePageVisibility();
    const [isDeviceReady, setIsDeviceReady] = useState(false);
    const hasRenderableSize = size.width >= MIN_RENDER_SIZE && size.height >= MIN_RENDER_SIZE;
    const shouldRenderDeck = Boolean(scene && hasRenderableSize && isPageVisible);

    useEffect(() => {
        if (!shouldRenderDeck) {
            setIsDeviceReady(false);
        }
    }, [shouldRenderDeck]);

    useEffect(() => {
        if (!shouldRenderDeck || !isDeviceReady) {
            return undefined;
        }

        return requestDeckRedraw(deckRef, 'MapDeckPreview resized');
    }, [isDeviceReady, scene, shouldRenderDeck, size.height, size.width]);

    return (
        <div
            ref={elementRef}
            className={`fc-map-deck-preview${className ? ` ${className}` : ''}`}
            style={style}
        >
            {shouldRenderDeck && scene ? (
                <DeckGL
                    ref={deckRef}
                    layers={buildLayers(scene, previewRenderOptions)}
                    views={PREVIEW_VIEW}
                    controller={false}
                    viewState={buildViewState(scene, size)}
                    onDeviceInitialized={() => {
                        setIsDeviceReady(true);
                    }}
                    onLoad={() => {
                        requestDeckRedraw(deckRef, 'MapDeckPreview loaded');
                    }}
                    onClick={info => {
                        const detail = toPickDetail(info);
                        onDeckClick?.(detail);

                        if (detail.kind === 'shape') {
                            onShapeClick?.(detail);
                        }

                        if (detail.kind === 'keyLocation') {
                            onKeyLocationClick?.(detail);
                        }
                    }}
                    onHover={info => {
                        const detail = toPickDetail(info);
                        onDeckHover?.(detail);

                        if (detail.kind === 'shape') {
                            onShapeHover?.(detail);
                        }

                        if (detail.kind === 'keyLocation') {
                            onKeyLocationHover?.(detail);
                        }
                    }}
                    getTooltip={({ object }) => {
                        const text = getTooltipText(object);
                        return text ? { text } : null;
                    }}
                />
            ) : (
                <div className="fc-map-deck-preview__empty">{emptyHint}</div>
            )}
        </div>
    );
}
