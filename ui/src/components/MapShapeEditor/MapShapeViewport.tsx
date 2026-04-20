import {type CSSProperties, useState} from 'react';

import type {MapEditorCanvas, MapPreviewScene, MapShapeEditorViewBox} from './types';
import type {MapDeckPreviewProps} from './MapDeckPreview';
import {MapDeckPreview} from './MapDeckPreview';
import type {MapShapeSvgEditorProps} from './MapShapeSvgEditor';
import {MapShapeSvgEditor} from './MapShapeSvgEditor';
import {createInitialMapShapeEditorViewBox} from './mapShapeEditorSvgUtils';
import './MapShapeEditor.css';

export type MapShapeViewportMode = 'edit' | 'preview';

export interface MapShapeViewportProps {
    mode: MapShapeViewportMode;
    canvas: MapEditorCanvas;
    scene: MapPreviewScene | null;
    /**
     * Controlled viewBox for the edit layer.  Required in edit mode to keep
     * the SVG editor and deck preview in sync.  Ignored in preview mode.
     * If omitted in edit mode, the viewport manages viewBox internally.
     */
    viewBox?: MapShapeEditorViewBox;
    onViewBoxChange?: (viewBox: MapShapeEditorViewBox) => void;
    /**
     * Props forwarded to `MapShapeSvgEditor`.  `canvas`, `viewBox`, and
     * `onViewBoxChange` are controlled by the viewport and must not be set here.
     */
    svgProps?: Omit<MapShapeSvgEditorProps, 'canvas' | 'viewBox' | 'onViewBoxChange'>;
    /**
     * Props forwarded to `MapDeckPreview`.  `scene`, `syncViewBox`, `disableTooltip`,
     * and `interactive` are managed by the viewport and must not be set here.
     */
    deckProps?: Omit<MapDeckPreviewProps, 'scene' | 'syncViewBox' | 'disableTooltip' | 'interactive'>;
    className?: string;
    style?: CSSProperties;
}

export function MapShapeViewport({
                                     mode,
                                     canvas,
                                     scene,
                                     viewBox: viewBoxProp,
                                     onViewBoxChange,
                                     svgProps,
                                     deckProps,
                                     className,
                                     style,
                                 }: MapShapeViewportProps) {
    const [internalViewBox, setInternalViewBox] = useState<MapShapeEditorViewBox>(
        () => createInitialMapShapeEditorViewBox(canvas),
    );

    const isEditMode = mode === 'edit';
    const viewBox = viewBoxProp ?? internalViewBox;
    const svgEditorClassName = [
        'fc-map-shape-viewport__svg-editor',
        svgProps?.className,
    ].filter(Boolean).join(' ');
    const deckPreviewClassName = [
        'fc-map-shape-viewport__deck-preview',
        deckProps?.className,
    ].filter(Boolean).join(' ');

    const handleViewBoxChange = (next: MapShapeEditorViewBox) => {
        if (viewBoxProp === undefined) {
            setInternalViewBox(next);
        }
        onViewBoxChange?.(next);
    };

    return (
        <div
            className={`fc-map-shape-viewport${className ? ` ${className}` : ''}`}
            style={{
                position: 'relative',
                width: '100%',
                aspectRatio: `${canvas.width} / ${canvas.height}`,
                overflow: 'hidden',
                ...style,
            }}
        >
            {/* deck preview — always rendered, positioned below SVG in edit mode */}
            <div className="fc-map-shape-viewport__layer fc-map-shape-viewport__deck-layer">
                <MapDeckPreview
                    {...deckProps}
                    scene={scene}
                    syncViewBox={isEditMode ? viewBox : undefined}
                    disableTooltip={isEditMode}
                    interactive={!isEditMode}
                    className={deckPreviewClassName}
                />
            </div>

            {/* SVG editing layer — edit mode only, rendered above deck */}
            {isEditMode && (
                <div className="fc-map-shape-viewport__layer fc-map-shape-viewport__svg-layer">
                    <MapShapeSvgEditor
                        {...(svgProps as MapShapeSvgEditorProps)}
                        canvas={canvas}
                        viewBox={viewBox}
                        onViewBoxChange={handleViewBoxChange}
                        className={svgEditorClassName}
                        width="100%"
                        height="100%"
                    />
                </div>
            )}
        </div>
    );
}
