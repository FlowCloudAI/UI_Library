import {type CSSProperties, useEffect, useRef, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {type Layer, OrthographicView, type PickingInfo} from '@deck.gl/core';
import {PolygonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';

import type {MapPreviewKeyLocation, MapPreviewScene, MapPreviewShape} from './types';
import './MapShapeEditor.css';

const PREVIEW_VIEW = new OrthographicView({ id: 'fc-map-deck-preview' });

interface ElementSize {
    width: number;
    height: number;
}

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

function useElementSize<T extends HTMLElement>() {
    const elementRef = useRef<T | null>(null);
    const [size, setSize] = useState<ElementSize>({ width: 0, height: 0 });

    useEffect(() => {
        const node = elementRef.current;
        if (!node) return;

        const observer = new ResizeObserver(entries => {
            const entry = entries[0];
            if (!entry) return;

            setSize({
                width: entry.contentRect.width,
                height: entry.contentRect.height,
            });
        });

        observer.observe(node);
        return () => observer.disconnect();
    }, []);

    return { elementRef, size };
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

    return (
        <div
            ref={elementRef}
            className={`fc-map-deck-preview${className ? ` ${className}` : ''}`}
            style={style}
        >
            {scene && size.width > 0 && size.height > 0 ? (
                <DeckGL
                    layers={buildLayers(scene, previewRenderOptions)}
                    views={PREVIEW_VIEW}
                    controller={false}
                    viewState={buildViewState(scene, size)}
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
