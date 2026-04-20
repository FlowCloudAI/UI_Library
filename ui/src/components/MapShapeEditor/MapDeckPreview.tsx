import {type CSSProperties, type RefObject, useEffect, useMemo, useRef, useState} from 'react';
import DeckGL, {type DeckGLRef} from '@deck.gl/react';
import {
    type Effect,
    type Layer,
    LayerExtension,
    OrthographicController,
    OrthographicView,
    type PickingInfo
} from '@deck.gl/core';
import {
    BitmapLayer,
    IconLayer,
    type IconLayerProps,
    PolygonLayer,
    type PolygonLayerProps,
    ScatterplotLayer,
    type ScatterplotLayerProps,
    TextLayer,
    type TextLayerProps,
} from '@deck.gl/layers';
import {CanvasContext} from '@luma.gl/core';

import type {
    MapEditorCanvas,
    MapPreviewKeyLocation,
    MapPreviewScene,
    MapPreviewShape,
    MapShapeEditorViewBox,
} from './types';
import './MapShapeEditor.css';

const PREVIEW_VIEW = new OrthographicView({ id: 'fc-map-deck-preview' });
const MIN_RENDER_SIZE = 2;
const DECK_MIN_VIEWBOX_SCALE = 0.18; // matches SVG editor — most zoomed in (~556%)
const DECK_MAX_VIEWBOX_SCALE = 2;    // matches SVG editor — most zoomed out (50%)
const CANVAS_CONTEXT_PATCH_FLAG = '__fcMapDeckPreviewCanvasContextPatched__';

// ── Shader inject ──────────────────────────────────────────────────────────────

/**
 * Per-layer GLSL injection map.  Keys are deck.gl shader hook names, e.g.:
 *   'vs:#decl', 'fs:#decl', 'vs:DECKGL_FILTER_COLOR', 'fs:DECKGL_FILTER_COLOR'
 */
export type MapDeckShaderInject = Record<string, string>;

/**
 * Wraps a `MapDeckShaderInject` map in an anonymous `LayerExtension` so it can
 * be passed to any layer's `extensions` prop.
 */
export function makeInjectExtension(inject: MapDeckShaderInject): LayerExtension {
    return new class extends LayerExtension {
        override getShaders() {
            return {inject};
        }
    }();
}

interface DeckViewState {
    target: [number, number, number];
    zoom: number;
}

// ── Internal types ─────────────────────────────────────────────────────────────

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

// ── Public prop types ──────────────────────────────────────────────────────────

export interface MapDeckPreviewProps {
    scene: MapPreviewScene | null;
    className?: string;
    style?: CSSProperties;
    emptyHint?: string;

    /** Show/hide TextLayer labels above key locations. Default: true */
    showLabels?: boolean;

    /**
     * Override any PolygonLayer prop except `id`, `data`, and `getPolygon`.
     * Spread before locked props, so structural accessors always win.
     */
    polygonLayerProps?: Omit<PolygonLayerProps<MapPreviewShape>, 'id' | 'data' | 'getPolygon'>;

    /**
     * Override any ScatterplotLayer prop except `id`, `data`, and `getPosition`.
     */
    scatterplotLayerProps?: Omit<ScatterplotLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getPosition'>;

    /**
     * Key location render mode. `auto` renders icon markers when location.icon
     * is present, otherwise falls back to circle markers.
     */
    keyLocationRenderMode?: 'circle' | 'icon' | 'auto';

    /**
     * Override any IconLayer prop except `id`, `data`, `getPosition`, and `getIcon`.
     */
    iconLayerProps?: Omit<IconLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getPosition' | 'getIcon'>;

    /**
     * Override any TextLayer prop except `id`, `data`, and `getText`.
     * `getPosition` is overridable — default places labels 18px above marker.
     */
    textLayerProps?: Omit<TextLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getText'>;

    /** GLSL inject map for the PolygonLayer. Merged with `polygonLayerProps.extensions`. */
    polygonShaderInject?: MapDeckShaderInject;
    /** GLSL inject map for the ScatterplotLayer. */
    scatterplotShaderInject?: MapDeckShaderInject;
    /** GLSL inject map for the IconLayer. */
    iconShaderInject?: MapDeckShaderInject;
    /** GLSL inject map for the TextLayer. */
    textShaderInject?: MapDeckShaderInject;

    /** Additional deck.gl layers appended after the built-in layers. */
    extraLayers?: Layer[];

    /** deck.gl `effects` array (e.g. PostProcessEffect). */
    deckEffects?: Effect[];

    /**
     * When provided, the view-state is derived from this viewBox instead of
     * auto-fitting the scene.  Pass the SVG editor's viewBox to keep both
     * layers perfectly in sync.
     */
    syncViewBox?: MapShapeEditorViewBox;

    /** When true, `getTooltip` is disabled (no hover tooltip). */
    disableTooltip?: boolean;

    /**
     * Customize the built-in hover tooltip. Return `null` to suppress it.
     * Returning a string is equivalent to `{ text: string }`.
     */
    getTooltip?: (detail: MapDeckPreviewPickDetail) => MapDeckPreviewTooltip | string | null;

    /**
     * When true, enables zoom (wheel) and pan (drag) via OrthographicController.
     * View state is managed internally and resets to auto-fit when `scene` changes.
     * Has no effect when `syncViewBox` is set.
     */
    interactive?: boolean;

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

export interface MapDeckPreviewTooltip {
    text?: string;
    html?: string;
    className?: string;
    style?: Partial<CSSStyleDeclaration>;
}

// ── Defaults ───────────────────────────────────────────────────────────────────

const DEFAULT_LOCATION_STROKE_COLOR: [number, number, number, number] = [255, 255, 255, 255];
const DEFAULT_LABEL_COLOR: [number, number, number, number] = [38, 43, 56, 255];
const DEFAULT_LABEL_FONT_FAMILY = '"Microsoft YaHei UI", sans-serif';

// ── luma.gl canvas context safety patch ───────────────────────────────────────

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

// ── Background image support ───────────────────────────────────────────────────

type BackgroundBounds = [number, number, number, number];

function computeBackgroundBounds(
    canvasW: number,
    canvasH: number,
    imgW: number,
    imgH: number,
    fit: 'cover' | 'contain',
): BackgroundBounds {
    if (imgW === 0 || imgH === 0) return [0, 0, canvasW, canvasH];

    const canvasRatio = canvasW / canvasH;
    const imgRatio = imgW / imgH;
    let renderW: number;
    let renderH: number;

    if (fit === 'cover') {
        if (imgRatio > canvasRatio) {
            renderH = canvasH;
            renderW = imgRatio * canvasH;
        } else {
            renderW = canvasW;
            renderH = canvasW / imgRatio;
        }
    } else {
        if (imgRatio > canvasRatio) {
            renderW = canvasW;
            renderH = canvasW / imgRatio;
        } else {
            renderH = canvasH;
            renderW = imgRatio * canvasH;
        }
    }

    const ox = (canvasW - renderW) / 2;
    const oy = (canvasH - renderH) / 2;
    return [ox, oy, ox + renderW, oy + renderH];
}

function useImageNaturalSize(url: string | undefined): { w: number; h: number } | null {
    const [naturalSize, setNaturalSize] = useState<{ w: number; h: number } | null>(null);

    useEffect(() => {
        if (!url) {
            setNaturalSize(null);
            return;
        }
        let cancelled = false;
        const img = new Image();
        img.onload = () => {
            if (!cancelled) setNaturalSize({w: img.naturalWidth, h: img.naturalHeight});
        };
        img.onerror = () => {
            if (!cancelled) setNaturalSize(null);
        };
        img.src = url;
        return () => {
            cancelled = true;
        };
    }, [url]);

    return naturalSize;
}

// ── Hooks ──────────────────────────────────────────────────────────────────────

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

// ── View state ─────────────────────────────────────────────────────────────────

function buildAutoViewState(canvas: MapEditorCanvas, size: ElementSize) {
    const safeWidth = Math.max(canvas.width, 1);
    const safeHeight = Math.max(canvas.height, 1);
    const availableWidth = Math.max(size.width, 1);
    const availableHeight = Math.max(size.height, 1);
    const scale = Math.min(availableWidth / safeWidth, availableHeight / safeHeight) * 0.92;
    const zoom = Math.log2(Math.max(scale, 0.01));

    return {
        target: [canvas.width / 2, canvas.height / 2, 0] as [number, number, number],
        zoom,
    };
}

function buildSyncedViewState(viewBox: MapShapeEditorViewBox, containerWidth: number) {
    const zoom = Math.log2(Math.max(containerWidth / Math.max(viewBox.width, 1), 0.01));
    return {
        target: [viewBox.x + viewBox.width / 2, viewBox.y + viewBox.height / 2, 0] as [number, number, number],
        zoom,
    };
}

/**
 * Clamp an interactive deck view state so zoom and pan stay within the same
 * limits as the SVG editor's clampMapShapeEditorViewBox.
 *
 * Pan formula mirrors the SVG editor:
 *   viewBox.x ∈ [min(0, xMargin), max(0, xMargin)]  where xMargin = canvas.width - vw
 *   → target.x ∈ [min(vw/2, canvas.width − vw/2), max(vw/2, canvas.width − vw/2)]
 */
function clampDeckViewState(
    state: DeckViewState,
    canvas: MapEditorCanvas,
    containerWidth: number,
    containerHeight: number,
): DeckViewState {
    const baseZoom = Math.log2(Math.max(containerWidth / Math.max(canvas.width, 1), 0.01));
    const minZoom = baseZoom - Math.log2(DECK_MAX_VIEWBOX_SCALE);
    const maxZoom = baseZoom - Math.log2(DECK_MIN_VIEWBOX_SCALE);
    const zoom = Math.min(Math.max(state.zoom, minZoom), maxZoom);
    const scale = Math.pow(2, zoom);
    const vw = Math.max(containerWidth / scale, 1);
    const vh = Math.max(containerHeight / scale, 1);
    const tx = Math.min(
        Math.max(state.target[0], Math.min(vw / 2, canvas.width - vw / 2)),
        Math.max(vw / 2, canvas.width - vw / 2),
    );
    const ty = Math.min(
        Math.max(state.target[1], Math.min(vh / 2, canvas.height - vh / 2)),
        Math.max(vh / 2, canvas.height - vh / 2),
    );
    return {...state, target: [tx, ty, state.target[2]], zoom};
}

// ── Layer builder ──────────────────────────────────────────────────────────────

interface BuildLayersOptions {
    scene: MapPreviewScene;
    showLabels: boolean;
    polygonLayerProps?: Omit<PolygonLayerProps<MapPreviewShape>, 'id' | 'data' | 'getPolygon'>;
    scatterplotLayerProps?: Omit<ScatterplotLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getPosition'>;
    keyLocationRenderMode: 'circle' | 'icon' | 'auto';
    iconLayerProps?: Omit<IconLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getPosition' | 'getIcon'>;
    textLayerProps?: Omit<TextLayerProps<MapPreviewKeyLocation>, 'id' | 'data' | 'getText'>;
    polygonShaderInject?: MapDeckShaderInject;
    scatterplotShaderInject?: MapDeckShaderInject;
    iconShaderInject?: MapDeckShaderInject;
    textShaderInject?: MapDeckShaderInject;
    extraLayers?: Layer[];
    backgroundBounds?: BackgroundBounds;
}

function mergeExtensions(userProps: {
    extensions?: LayerExtension[]
} | undefined, inject: MapDeckShaderInject | undefined): LayerExtension[] {
    return [
        ...(userProps?.extensions ?? []),
        ...(inject ? [makeInjectExtension(inject)] : []),
    ];
}

function shouldRenderKeyLocationAsIcon(
    location: MapPreviewKeyLocation,
    renderMode: 'circle' | 'icon' | 'auto',
): boolean {
    if (!location.icon?.url) {
        return false;
    }

    return renderMode === 'icon' || renderMode === 'auto';
}

function buildLayers({
                         scene,
                         showLabels,
                         polygonLayerProps,
                         scatterplotLayerProps,
                         keyLocationRenderMode,
                         iconLayerProps,
                         textLayerProps,
                         polygonShaderInject,
                         scatterplotShaderInject,
                         iconShaderInject,
                         textShaderInject,
                         extraLayers,
                         backgroundBounds,
                     }: BuildLayersOptions): Layer[] {
    const layers: Layer[] = [];
    const circleKeyLocations = scene.keyLocations.filter(location => (
        keyLocationRenderMode === 'circle'
        || !shouldRenderKeyLocationAsIcon(location, keyLocationRenderMode)
    ));
    const iconKeyLocations = scene.keyLocations.filter(location => shouldRenderKeyLocationAsIcon(location, keyLocationRenderMode));

    if (scene.backgroundImage?.url && backgroundBounds) {
        layers.push(
            new BitmapLayer({
                id: 'fc-map-preview-background',
                image: scene.backgroundImage.url,
                bounds: backgroundBounds,
                opacity: scene.backgroundImage.opacity ?? 1,
                pickable: false,
            }),
        );
    }

    layers.push(
        new PolygonLayer<MapPreviewShape>({
            pickable: true,
            filled: true,
            stroked: true,
            wireframe: false,
            lineWidthMinPixels: 2,
            getFillColor: item => item.fillColor,
            getLineColor: item => item.lineColor,
            ...polygonLayerProps,
            id: 'fc-map-preview-polygons',
            data: scene.shapes,
            getPolygon: item => item.polygon,
            extensions: mergeExtensions(polygonLayerProps, polygonShaderInject),
        }),
    );

    if (circleKeyLocations.length > 0) {
        layers.push(
            new ScatterplotLayer<MapPreviewKeyLocation>({
                pickable: true,
                radiusMinPixels: 6,
                radiusMaxPixels: 14,
                stroked: true,
                lineWidthMinPixels: 2,
                getRadius: 8,
                getFillColor: item => item.color,
                getLineColor: () => DEFAULT_LOCATION_STROKE_COLOR,
                ...scatterplotLayerProps,
                id: 'fc-map-preview-key-locations',
                data: circleKeyLocations,
                getPosition: item => item.position,
                extensions: mergeExtensions(scatterplotLayerProps, scatterplotShaderInject),
            }),
        );
    }

    if (iconKeyLocations.length > 0) {
        layers.push(
            new IconLayer<MapPreviewKeyLocation>({
                pickable: true,
                sizeUnits: 'pixels',
                sizeBasis: 'height',
                getSize: item => item.iconSize ?? 28,
                getColor: () => [255, 255, 255, 255],
                ...iconLayerProps,
                id: 'fc-map-preview-key-location-icons',
                data: iconKeyLocations,
                getPosition: item => item.position,
                getIcon: item => {
                    const icon = item.icon;
                    const fallbackSize = Math.max(1, Math.round(item.iconSize ?? 28));
                    return {
                        url: icon?.url ?? '',
                        width: Math.max(1, Math.round(icon?.width ?? fallbackSize)),
                        height: Math.max(1, Math.round(icon?.height ?? fallbackSize)),
                        anchorX: Math.round(icon?.anchorX ?? ((icon?.width ?? fallbackSize) / 2)),
                        anchorY: Math.round(icon?.anchorY ?? ((icon?.height ?? fallbackSize) / 2)),
                        mask: icon?.mask ?? false,
                    };
                },
                extensions: mergeExtensions(iconLayerProps, iconShaderInject),
            }),
        );
    }

    if (showLabels) {
        layers.push(
            new TextLayer<MapPreviewKeyLocation>({
                pickable: false,
                characterSet: 'auto',
                getPosition: item => {
                    const labelOffset = shouldRenderKeyLocationAsIcon(item, keyLocationRenderMode)
                        ? Math.max((item.iconSize ?? 28) / 2 + 8, 18)
                        : 18;
                    return [item.position[0], item.position[1] - labelOffset];
                },
                getSize: 13,
                getColor: () => DEFAULT_LABEL_COLOR,
                getTextAnchor: () => 'middle',
                getAlignmentBaseline: () => 'bottom',
                fontFamily: DEFAULT_LABEL_FONT_FAMILY,
                ...textLayerProps,
                id: 'fc-map-preview-key-location-labels',
                data: scene.keyLocations,
                getText: item => item.name,
                extensions: mergeExtensions(textLayerProps, textShaderInject),
            }),
        );
    }

    if (extraLayers?.length) {
        layers.push(...extraLayers);
    }

    return layers;
}

// ── Tooltip ────────────────────────────────────────────────────────────────────

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

function normalizeTooltip(
    value: MapDeckPreviewTooltip | string | null | undefined,
): MapDeckPreviewTooltip | null {
    if (!value) {
        return null;
    }

    if (typeof value === 'string') {
        return {text: value};
    }

    if (value.text || value.html) {
        return value;
    }

    return null;
}

function getDefaultTooltip(detail: MapDeckPreviewPickDetail): MapDeckPreviewTooltip | null {
    if (detail.kind === 'empty') {
        return null;
    }

    const text = getTooltipText(detail.object);
    return text ? {text} : null;
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

// ── Component ──────────────────────────────────────────────────────────────────

export function MapDeckPreview({
    scene,
    className,
    style,
    emptyHint = '提交后将在这里显示后端回传的 deck 结果。',
                                   showLabels = true,
                                   polygonLayerProps,
                                   scatterplotLayerProps,
                                   keyLocationRenderMode = 'auto',
                                   iconLayerProps,
                                   textLayerProps,
                                   polygonShaderInject,
                                   scatterplotShaderInject,
                                   iconShaderInject,
                                   textShaderInject,
                                   extraLayers,
                                   deckEffects,
                                   syncViewBox,
                                   disableTooltip = false,
                                   getTooltip,
                                   interactive = false,
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
    const [interactiveViewState, setInteractiveViewState] = useState<DeckViewState | null>(null);

    useEffect(() => {
        setInteractiveViewState(null);
    }, [scene, interactive]);
    const hasRenderableSize = size.width >= MIN_RENDER_SIZE && size.height >= MIN_RENDER_SIZE;
    const shouldRenderDeck = Boolean(scene && hasRenderableSize && isPageVisible);

    const bgImage = scene?.backgroundImage;
    const bgFit = bgImage?.fit ?? 'fill';
    const imageNaturalSize = useImageNaturalSize(
        bgImage?.url && bgFit !== 'fill' ? bgImage.url : undefined,
    );
    const backgroundBounds = useMemo<BackgroundBounds | undefined>(() => {
        if (!scene || !bgImage?.url) return undefined;
        if (bgFit === 'fill' || !imageNaturalSize) {
            return [0, 0, scene.canvas.width, scene.canvas.height];
        }
        return computeBackgroundBounds(
            scene.canvas.width, scene.canvas.height,
            imageNaturalSize.w, imageNaturalSize.h,
            bgFit,
        );
    }, [bgFit, bgImage?.url, imageNaturalSize, scene]);

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

    const isControlled = interactive && !syncViewBox;
    const viewState = scene
        ? (syncViewBox
            ? buildSyncedViewState(syncViewBox, size.width)
            : (interactiveViewState ?? (hasRenderableSize ? buildAutoViewState(scene.canvas, size) : null)))
        : null;

    return (
        <div
            ref={elementRef}
            className={`fc-map-deck-preview${className ? ` ${className}` : ''}`}
            style={style}
        >
            {shouldRenderDeck && scene && viewState ? (
                <DeckGL
                    ref={deckRef}
                    layers={buildLayers({
                        scene,
                        showLabels,
                        polygonLayerProps,
                        scatterplotLayerProps,
                        keyLocationRenderMode,
                        iconLayerProps,
                        textLayerProps,
                        polygonShaderInject,
                        scatterplotShaderInject,
                        iconShaderInject,
                        textShaderInject,
                        extraLayers,
                        backgroundBounds,
                    })}
                    views={PREVIEW_VIEW}
                    controller={isControlled ? {type: OrthographicController} : false}
                    viewState={viewState}
                    onViewStateChange={isControlled ? ({viewState: next}) => {
                        const nextViewState = next as DeckViewState;
                        setInteractiveViewState(
                            hasRenderableSize
                                ? clampDeckViewState(nextViewState, scene.canvas, size.width, size.height)
                                : nextViewState,
                        );
                    } : undefined}
                    effects={deckEffects ?? []}
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
                    getTooltip={disableTooltip ? undefined : info => {
                        const detail = toPickDetail(info);
                        const customTooltip = normalizeTooltip(getTooltip?.(detail));
                        return customTooltip ?? getDefaultTooltip(detail);
                    }}
                />
            ) : (
                <div className="fc-map-deck-preview__empty">{emptyHint}</div>
            )}
        </div>
    );
}
