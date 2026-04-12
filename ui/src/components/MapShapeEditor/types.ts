export interface MapEditorCanvas {
    width: number;
    height: number;
}

export interface MapShapeVertex {
    id: string;
    x: number;
    y: number;
}

export interface MapShapeDraft {
    id: string;
    name: string;
    vertices: MapShapeVertex[];
    fill?: string;
    stroke?: string;
}

export interface MapKeyLocationDraft {
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;
    shapeId?: string | null;
}

export interface MapShapeEditorDraft {
    shapes: MapShapeDraft[];
    keyLocations: MapKeyLocationDraft[];
}

export interface MapShapeSaveRequest {
    canvas: MapEditorCanvas;
    shapes: MapShapeDraft[];
    keyLocations: MapKeyLocationDraft[];
}

export type DeckColor = [number, number, number, number];

export interface MapPreviewShape {
    id: string;
    name: string;
    polygon: [number, number][];
    fillColor: DeckColor;
    lineColor: DeckColor;
}

export interface MapPreviewKeyLocation {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    shapeId?: string | null;
    color: DeckColor;
}

export interface MapPreviewScene {
    canvas: MapEditorCanvas;
    shapes: MapPreviewShape[];
    keyLocations: MapPreviewKeyLocation[];
}

export interface MapShapeSaveResponse {
    scene: MapPreviewScene;
    savedAt: string;
    message?: string;
}

export interface MapShapeEditorApi {
    saveScene: (request: MapShapeSaveRequest) => Promise<MapShapeSaveResponse>;
}
