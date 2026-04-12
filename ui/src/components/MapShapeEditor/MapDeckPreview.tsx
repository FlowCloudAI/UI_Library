import {type CSSProperties, useEffect, useRef, useState} from 'react';
import DeckGL from '@deck.gl/react';
import {OrthographicView} from '@deck.gl/core';
import {PolygonLayer, ScatterplotLayer, TextLayer} from '@deck.gl/layers';

import type {MapPreviewKeyLocation, MapPreviewScene, MapPreviewShape} from './types';

const PREVIEW_VIEW = new OrthographicView({ id: 'fc-map-deck-preview' });

interface ElementSize {
    width: number;
    height: number;
}

export interface MapDeckPreviewProps {
    scene: MapPreviewScene | null;
    className?: string;
    style?: CSSProperties;
    emptyHint?: string;
}

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

function buildLayers(scene: MapPreviewScene) {
    return [
        new PolygonLayer<MapPreviewShape>({
            id: 'fc-map-preview-polygons',
            data: scene.shapes,
            pickable: true,
            filled: true,
            stroked: true,
            wireframe: false,
            lineWidthMinPixels: 2,
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
            stroked: true,
            lineWidthMinPixels: 2,
            getPosition: item => item.position,
            getRadius: 8,
            getFillColor: item => item.color,
            getLineColor: () => [255, 255, 255, 255] as [number, number, number, number],
        }),
        new TextLayer<MapPreviewKeyLocation>({
            id: 'fc-map-preview-key-location-labels',
            data: scene.keyLocations,
            pickable: false,
            getPosition: item => [item.position[0], item.position[1] - 18],
            getText: item => item.name,
            getSize: 13,
            getColor: () => [38, 43, 56, 255] as [number, number, number, number],
            getTextAnchor: () => 'middle',
            getAlignmentBaseline: () => 'bottom',
            fontFamily: '"Microsoft YaHei UI", sans-serif',
        }),
    ];
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

export function MapDeckPreview({
    scene,
    className,
    style,
    emptyHint = '提交后将在这里显示后端回传的 deck 结果。',
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
                    layers={buildLayers(scene)}
                    views={PREVIEW_VIEW}
                    controller={false}
                    viewState={buildViewState(scene, size)}
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
