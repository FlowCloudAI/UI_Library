export interface MapEditorCanvas {
    width: number;
    height: number;
}

export interface MapShapeEditorViewBox {
    x: number;
    y: number;
    width: number;
    height: number;
}

export const MAP_SHAPE_PROTOCOL_VERSION = 'map_shape_mvp_v1' as const;

export type MapShapeProtocolVersion = typeof MAP_SHAPE_PROTOCOL_VERSION;

export interface MapShapeExtensible {
    ext?: Record<string, unknown>;
}

export interface MapShapeVertex {
    id: string;
    x: number;
    y: number;
    bizId?: string | null;
}

export interface MapShapeDraft extends MapShapeExtensible {
    id: string;
    name: string;
    vertices: MapShapeVertex[];
    fill?: string;
    stroke?: string;
    bizId?: string | null;
    kind?: 'coastline';
}

export interface MapKeyLocationDraft extends MapShapeExtensible {
    id: string;
    name: string;
    type: string;
    x: number;
    y: number;
    shapeId?: string | null;
    bizId?: string | null;
}

export interface MapShapeEditorDraft {
    shapes: MapShapeDraft[];
    keyLocations: MapKeyLocationDraft[];
}

export interface MapShapeRequestMeta extends MapShapeExtensible {
    protocolVersion?: MapShapeProtocolVersion;
    scenario?: 'coastline_mvp';
    requestId?: string;
}

export interface MapShapeSaveRequest {
    canvas: MapEditorCanvas;
    shapes: MapShapeDraft[];
    keyLocations: MapKeyLocationDraft[];
    meta?: MapShapeRequestMeta;
}

export type DeckColor = [number, number, number, number];

export interface MapPreviewShape extends MapShapeExtensible {
    id: string;
    name: string;
    polygon: [number, number][];
    fillColor: DeckColor;
    lineColor: DeckColor;
    bizId?: string | null;
    kind?: 'coastline';
}

export interface MapPreviewKeyLocation extends MapShapeExtensible {
    id: string;
    name: string;
    type: string;
    position: [number, number];
    shapeId?: string | null;
    color: DeckColor;
    icon?: MapPreviewKeyLocationIcon | null;
    iconSize?: number;
    bizId?: string | null;
}

export interface MapPreviewKeyLocationIcon extends MapShapeExtensible {
    url: string;
    width?: number;
    height?: number;
    anchorX?: number;
    anchorY?: number;
    mask?: boolean;
}

export interface MapPreviewBackgroundImage {
    url: string;
    /** 0–1，默认 1 */
    opacity?: number;
    /** 图片适配模式，默认 'fill' */
    fit?: 'fill' | 'cover' | 'contain';
}

export interface MapPreviewScene extends MapShapeExtensible {
    canvas: MapEditorCanvas;
    shapes: MapPreviewShape[];
    keyLocations: MapPreviewKeyLocation[];
    backgroundImage?: MapPreviewBackgroundImage;
}

export interface MapShapeResponseMeta extends MapShapeExtensible {
    protocolVersion?: MapShapeProtocolVersion;
    scenario?: 'coastline_mvp';
    requestId?: string;
    persisted?: boolean;
}

export interface MapShapeSaveResponse {
    scene: MapPreviewScene;
    savedAt: string;
    message?: string;
    meta?: MapShapeResponseMeta;
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

export type MapShapeServiceErrorCode =
    | 'MAP_SHAPE_VALIDATION_FAILED'
    | 'MAP_SHAPE_PERMISSION_DENIED'
    | 'MAP_SHAPE_NOT_FOUND'
    | 'MAP_SHAPE_CONFLICT'
    | 'MAP_SHAPE_INTERNAL_ERROR'
    | (string & {});

export interface MapShapeFieldError extends MapShapeExtensible {
    field: string;
    code: string;
    message: string;
}

export interface MapShapeSaveErrorResponse extends MapShapeExtensible {
    code: MapShapeServiceErrorCode;
    message: string;
    requestId?: string;
    retryable?: boolean;
    fieldErrors?: MapShapeFieldError[];
}
