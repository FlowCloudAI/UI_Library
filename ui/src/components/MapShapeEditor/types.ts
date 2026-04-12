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

export type MapValidationSeverity = 'error';

export type MapValidationSource = 'shape' | 'keyLocation' | 'draft';

export type MapValidationCode =
    | 'shape_too_few_vertices'
    | 'shape_duplicate_vertices'
    | 'shape_close_vertices'
    | 'shape_self_intersection'
    | 'key_location_name_required'
    | 'key_location_type_required'
    | 'key_location_shape_required'
    | 'key_location_shape_missing'
    | 'key_location_outside_shape'
    | 'draft_no_shape'
    | 'draft_shape_drawing_in_progress';

export interface MapValidationIssue {
    code: MapValidationCode;
    severity: MapValidationSeverity;
    source: MapValidationSource;
    message: string;
    shapeId?: string;
    keyLocationId?: string;
}

export interface MapShapeValidationResult {
    shapeId: string;
    issues: MapValidationIssue[];
    isValid: boolean;
}

export interface MapKeyLocationValidationResult {
    keyLocationId: string;
    issues: MapValidationIssue[];
    isValid: boolean;
}

export interface MapDraftValidationResult {
    issues: MapValidationIssue[];
    isValid: boolean;
}

export interface MapValidationResult {
    issues: MapValidationIssue[];
    shapeResults: MapShapeValidationResult[];
    keyLocationResults: MapKeyLocationValidationResult[];
    draftResult: MapDraftValidationResult;
    isValid: boolean;
}

export type MapShapeSubmitErrorKind = 'timeout' | 'transport' | 'invalid_response';
