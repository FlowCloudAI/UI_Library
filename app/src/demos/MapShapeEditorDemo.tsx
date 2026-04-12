import {useState} from 'react';
import {
    buildPreviewSceneFromDraft,
    createEmptyShapeDraft,
    createInitialMapShapeEditorViewBox,
    createMapShapeEditorLocalId,
    createMockMapShapeEditorApi,
    getShapeCenter,
    MapDeckPreview,
    type MapDeckPreviewPickDetail,
    type MapDeckPreviewRenderOptions,
    type MapKeyLocationDraft,
    type MapPreviewScene,
    type MapShapeDraft,
    type MapShapeEditorDraft,
    MapShapeSvgEditor,
    submitMapShapeScene,
    useContextMenu,
    validateMapEditorDraft,
} from 'flowcloudai-ui';

const DEMO_CANVAS = {
    width: 1000,
    height: 1000,
};

const DEMO_DRAFT: MapShapeEditorDraft = {
    shapes: [
        {
            id: 'shape-warehouse',
            name: '仓储区',
            fill: '#d8ecff',
            stroke: '#185fa5',
            vertices: [
                {id: 'shape-warehouse-v1', x: 120, y: 120},
                {id: 'shape-warehouse-v2', x: 420, y: 100},
                {id: 'shape-warehouse-v3', x: 470, y: 280},
                {id: 'shape-warehouse-v4', x: 180, y: 340},
            ],
        },
        {
            id: 'shape-service',
            name: '服务区',
            fill: '#eaf5d7',
            stroke: '#426815',
            vertices: [
                {id: 'shape-service-v1', x: 600, y: 180},
                {id: 'shape-service-v2', x: 850, y: 160},
                {id: 'shape-service-v3', x: 900, y: 360},
                {id: 'shape-service-v4', x: 640, y: 420},
            ],
        },
    ],
    keyLocations: [
        {id: 'poi-1', name: '一号闸口', type: '出入口', x: 210, y: 132, shapeId: 'shape-warehouse'},
        {id: 'poi-2', name: '补给站', type: '补给点', x: 730, y: 250, shapeId: 'shape-service'},
        {id: 'poi-3', name: '值守台', type: '设备点', x: 350, y: 250, shapeId: 'shape-warehouse'},
    ],
};

const DEMO_PREVIEW = buildPreviewSceneFromDraft({
    canvas: DEMO_CANVAS,
    shapes: DEMO_DRAFT.shapes,
    keyLocations: DEMO_DRAFT.keyLocations,
});

const demoApi = createMockMapShapeEditorApi({delayMs: 480});

type SubmitStatus = 'idle' | 'frontend_error' | 'saving' | 'backend_error' | 'success';
type EventLogLevel = 'state' | 'callback' | 'network';

interface EventLogItem {
    id: string;
    level: EventLogLevel;
    message: string;
}

interface ButtonLikeProps {
    text: string;
    onClick: () => void;
    danger?: boolean;
}

function cloneDraft(draft: MapShapeEditorDraft): MapShapeEditorDraft {
    return {
        shapes: draft.shapes.map(shape => ({
            ...shape,
            vertices: shape.vertices.map(vertex => ({...vertex})),
        })),
        keyLocations: draft.keyLocations.map(location => ({...location})),
    };
}

function formatCoordinate(value: number): string {
    return value.toFixed(1);
}

function formatViewBoxValue(value: number): string {
    return Number.isFinite(value) ? value.toFixed(1) : '0.0';
}

function buildLocationName(locations: MapKeyLocationDraft[]): string {
    return `关键地点 ${locations.length + 1}`;
}

function createLog(level: EventLogLevel, message: string): EventLogItem {
    return {
        id: createMapShapeEditorLocalId('log'),
        level,
        message,
    };
}

function deckColorToHex(color: [number, number, number, number]): string {
    return `#${color.slice(0, 3).map(value => value.toString(16).padStart(2, '0')).join('')}`;
}

function hexToDeckColor(value: string, fallbackAlpha: number): [number, number, number, number] {
    const normalized = value.trim().replace('#', '');
    if (!/^[0-9a-fA-F]{6}$/.test(normalized)) {
        return [255, 255, 255, fallbackAlpha];
    }

    return [
        Number.parseInt(normalized.slice(0, 2), 16),
        Number.parseInt(normalized.slice(2, 4), 16),
        Number.parseInt(normalized.slice(4, 6), 16),
        fallbackAlpha,
    ];
}

function formatDeckPickDetail(detail: MapDeckPreviewPickDetail | null): string {
    if (!detail) {
        return '暂无';
    }

    if (detail.kind === 'empty') {
        return `空白区域 @ (${detail.x}, ${detail.y})`;
    }

    if (detail.kind === 'shape') {
        return `图形 ${detail.object.name} (${detail.object.id}) @ (${detail.x}, ${detail.y})`;
    }

    return `关键地点 ${detail.object.name} (${detail.object.id}) @ (${detail.x}, ${detail.y})`;
}

function ButtonLike({text, onClick, danger = false}: ButtonLikeProps) {
    return (
        <button
            type="button"
            className={['fc-map-shape-editor__chip', danger ? 'fc-map-shape-editor__chip--invalid' : ''].filter(Boolean).join(' ')}
            style={{width: 'auto'}}
            onClick={onClick}
        >
            {text}
        </button>
    );
}

export function MapShapeEditorDemo() {
    const {showContextMenu} = useContextMenu();
    const [draft, setDraft] = useState<MapShapeEditorDraft>(() => cloneDraft(DEMO_DRAFT));
    const [selectedShapeId, setSelectedShapeId] = useState<string | null>(DEMO_DRAFT.shapes[0]?.id ?? null);
    const [selectedLocationId, setSelectedLocationId] = useState<string | null>(DEMO_DRAFT.keyLocations[0]?.id ?? null);
    const [drawingShape, setDrawingShape] = useState<MapShapeDraft | null>(null);
    const [viewBox, setViewBox] = useState(() => createInitialMapShapeEditorViewBox(DEMO_CANVAS));
    const [preview, setPreview] = useState<MapPreviewScene | null>(DEMO_PREVIEW);
    const [submitStatus, setSubmitStatus] = useState<SubmitStatus>('idle');
    const [submitMessage, setSubmitMessage] = useState('尚未触发提交。');
    const [forcedInvalidShapeIds, setForcedInvalidShapeIds] = useState<string[]>([]);
    const [forcedInvalidLocationIds, setForcedInvalidLocationIds] = useState<string[]>([]);
    const [deckHoverDetail, setDeckHoverDetail] = useState<MapDeckPreviewPickDetail | null>(null);
    const [deckClickDetail, setDeckClickDetail] = useState<MapDeckPreviewPickDetail | null>(null);
    const [deckRenderOptions, setDeckRenderOptions] = useState<MapDeckPreviewRenderOptions>({
        polygonLineWidth: 2,
        locationRadius: 8,
        locationStrokeColor: [255, 255, 255, 255],
        labelFontSize: 13,
        labelColor: [38, 43, 56, 255],
        labelFontFamily: '"Microsoft YaHei UI", sans-serif',
        showLabels: true,
        showLocationStroke: true,
    });
    const [eventLogs, setEventLogs] = useState<EventLogItem[]>([
        createLog('state', 'demo 已初始化。你可以从这里观察所有受控状态与回调能力。'),
    ]);

    const pushLog = (level: EventLogLevel, message: string) => {
        setEventLogs(currentLogs => [createLog(level, message), ...currentLogs].slice(0, 18));
    };

    const validationResult = validateMapEditorDraft(draft, {
        hasDrawingShapeInProgress: Boolean(drawingShape),
    });
    const derivedInvalidShapeIds = validationResult.shapeResults.filter(result => !result.isValid).map(result => result.shapeId);
    const derivedInvalidLocationIds = validationResult.keyLocationResults
        .filter(result => !result.isValid)
        .map(result => result.keyLocationId);
    const invalidShapeIds = Array.from(new Set([...derivedInvalidShapeIds, ...forcedInvalidShapeIds]));
    const invalidKeyLocationIds = Array.from(new Set([...derivedInvalidLocationIds, ...forcedInvalidLocationIds]));

    const selectedShape = draft.shapes.find(shape => shape.id === selectedShapeId) ?? null;
    const selectedLocation = draft.keyLocations.find(location => location.id === selectedLocationId) ?? null;
    const selectedShapeIssues = validationResult.shapeResults.find(result => result.shapeId === selectedShapeId)?.issues ?? [];
    const selectedLocationIssues = validationResult.keyLocationResults.find(result => result.keyLocationId === selectedLocationId)?.issues ?? [];
    const zoomPercentage = Math.round((DEMO_CANVAS.width / Math.max(viewBox.width, 1)) * 100);

    const updateDraft = (nextDraft: MapShapeEditorDraft) => {
        setDraft(nextDraft);
        pushLog('callback', `onDraftChange：图形 ${nextDraft.shapes.length} 个，关键地点 ${nextDraft.keyLocations.length} 个。`);
    };

    const updateSelectedShapeId = (nextShapeId: string | null) => {
        setSelectedShapeId(nextShapeId);
        pushLog('callback', `onSelectedShapeChange：${nextShapeId ?? 'null'}`);
    };

    const updateSelectedLocationId = (nextLocationId: string | null) => {
        setSelectedLocationId(nextLocationId);
        pushLog('callback', `onSelectedLocationChange：${nextLocationId ?? 'null'}`);
    };

    const updateDrawingShape = (nextShape: MapShapeDraft | null) => {
        setDrawingShape(nextShape);
        pushLog('callback', `onDrawingShapeChange：${nextShape ? `${nextShape.name}（${nextShape.vertices.length} 点）` : 'null'}`);
    };

    const updateViewBox = (nextViewBox: typeof viewBox) => {
        setViewBox(nextViewBox);
        pushLog('callback', `onViewBoxChange：${formatViewBoxValue(nextViewBox.x)}, ${formatViewBoxValue(nextViewBox.y)}, ${formatViewBoxValue(nextViewBox.width)}, ${formatViewBoxValue(nextViewBox.height)}`);
    };
    const deleteShape = (shapeId: string) => {
        const removedLocationIds = new Set(
            draft.keyLocations.filter(location => location.shapeId === shapeId).map(location => location.id),
        );

        setDraft(currentDraft => ({
            shapes: currentDraft.shapes.filter(shape => shape.id !== shapeId),
            keyLocations: currentDraft.keyLocations.filter(location => location.shapeId !== shapeId),
        }));
        setSelectedShapeId(current => (current === shapeId ? null : current));
        setSelectedLocationId(current => (current && removedLocationIds.has(current) ? null : current));
        pushLog('state', `调用方执行删除图形：${shapeId}`);
    };

    const deleteVertex = (shapeId: string, vertexId: string) => {
        setDraft(currentDraft => ({
            ...currentDraft,
            shapes: currentDraft.shapes.map(shape => (
                shape.id === shapeId
                    ? {...shape, vertices: shape.vertices.filter(vertex => vertex.id !== vertexId)}
                    : shape
            )),
        }));
        pushLog('state', `调用方执行删除顶点：${shapeId} / ${vertexId}`);
    };

    const deleteLocation = (locationId: string) => {
        setDraft(currentDraft => ({
            ...currentDraft,
            keyLocations: currentDraft.keyLocations.filter(location => location.id !== locationId),
        }));
        setSelectedLocationId(current => (current === locationId ? null : current));
        pushLog('state', `调用方执行删除关键地点：${locationId}`);
    };

    const handleAddShape = () => {
        const nextShape = createEmptyShapeDraft(draft.shapes);
        updateDrawingShape(nextShape);
        updateSelectedShapeId(nextShape.id);
        updateSelectedLocationId(null);
    };

    const handleAddLocation = () => {
        const relatedShape = selectedShape ?? draft.shapes[0] ?? null;
        const center = relatedShape ? getShapeCenter(relatedShape, DEMO_CANVAS) : {
            x: DEMO_CANVAS.width / 2,
            y: DEMO_CANVAS.height / 2,
        };
        const nextLocation: MapKeyLocationDraft = {
            id: createMapShapeEditorLocalId('key-location'),
            name: buildLocationName(draft.keyLocations),
            type: '观察点',
            x: center.x,
            y: center.y,
            shapeId: relatedShape?.id ?? null,
        };

        updateDraft({
            ...draft,
            keyLocations: [...draft.keyLocations, nextLocation],
        });
        updateSelectedShapeId(relatedShape?.id ?? null);
        updateSelectedLocationId(nextLocation.id);
    };

    const handleResetAll = () => {
        setDraft(cloneDraft(DEMO_DRAFT));
        setSelectedShapeId(DEMO_DRAFT.shapes[0]?.id ?? null);
        setSelectedLocationId(DEMO_DRAFT.keyLocations[0]?.id ?? null);
        setDrawingShape(null);
        setViewBox(createInitialMapShapeEditorViewBox(DEMO_CANVAS));
        setPreview(DEMO_PREVIEW);
        setSubmitStatus('idle');
        setSubmitMessage('已重置为 demo 初始状态。');
        setForcedInvalidShapeIds([]);
        setForcedInvalidLocationIds([]);
        setDeckHoverDetail(null);
        setDeckClickDetail(null);
        setDeckRenderOptions({
            polygonLineWidth: 2,
            locationRadius: 8,
            locationStrokeColor: [255, 255, 255, 255],
            labelFontSize: 13,
            labelColor: [38, 43, 56, 255],
            labelFontFamily: '"Microsoft YaHei UI", sans-serif',
            showLabels: true,
            showLocationStroke: true,
        });
        pushLog('state', '调用方重置了所有状态。');
    };

    const handleRebuildPreviewFromDraft = () => {
        setPreview(buildPreviewSceneFromDraft({
            canvas: DEMO_CANVAS,
            shapes: draft.shapes,
            keyLocations: draft.keyLocations,
        }));
        pushLog('network', '调用方使用 buildPreviewSceneFromDraft 直接生成了展示层 scene。');
    };

    const handleSelectedShapeFieldChange = (
        field: 'name' | 'fill' | 'stroke',
        value: string,
    ) => {
        if (!selectedShapeId) return;

        updateDraft({
            ...draft,
            shapes: draft.shapes.map(shape => (
                shape.id === selectedShapeId
                    ? {...shape, [field]: value}
                    : shape
            )),
        });
    };

    const handleSelectedLocationFieldChange = (
        field: 'name' | 'type' | 'shapeId',
        value: string,
    ) => {
        if (!selectedLocationId) return;

        updateDraft({
            ...draft,
            keyLocations: draft.keyLocations.map(location => (
                location.id === selectedLocationId
                    ? {...location, [field]: field === 'shapeId' ? (value || null) : value}
                    : location
            )),
        });
    };

    const handleDrawingShapeFieldChange = (
        field: 'name' | 'fill' | 'stroke',
        value: string,
    ) => {
        if (!drawingShape) return;

        updateDrawingShape({
            ...drawingShape,
            [field]: value,
        });
    };

    const handleSubmit = async () => {
        if (!validationResult.isValid) {
            setSubmitStatus('frontend_error');
            setSubmitMessage(`前端校验未通过，共 ${validationResult.issues.length} 项异常。`);
            pushLog('network', 'submitMapShapeScene 被前端校验拦截。');
            return;
        }

        setSubmitStatus('saving');
        setSubmitMessage('正在调用 submitMapShapeScene，请稍候…');
        pushLog('network', '开始调用 submitMapShapeScene。');

        try {
            const response = await submitMapShapeScene(demoApi, {
                canvas: DEMO_CANVAS,
                shapes: draft.shapes,
                keyLocations: draft.keyLocations,
            });

            setPreview(response.scene);
            setSubmitStatus('success');
            setSubmitMessage(response.message ?? `提交成功：${response.savedAt}`);
            pushLog('network', `submitMapShapeScene 成功：${response.savedAt}`);
        } catch (error) {
            setSubmitStatus('backend_error');
            setSubmitMessage(error instanceof Error ? error.message : String(error));
            pushLog('network', `submitMapShapeScene 失败：${error instanceof Error ? error.message : String(error)}`);
        }
    };

    const toggleForcedShapeInvalid = (shapeId: string) => {
        setForcedInvalidShapeIds(currentIds => (
            currentIds.includes(shapeId)
                ? currentIds.filter(id => id !== shapeId)
                : [...currentIds, shapeId]
        ));
        pushLog('state', `调用方切换 invalidShapeIds：${shapeId}`);
    };

    const toggleForcedLocationInvalid = (locationId: string) => {
        setForcedInvalidLocationIds(currentIds => (
            currentIds.includes(locationId)
                ? currentIds.filter(id => id !== locationId)
                : [...currentIds, locationId]
        ));
        pushLog('state', `调用方切换 invalidKeyLocationIds：${locationId}`);
    };

    const editorDeleteProps = {
        onRequestShapeDelete: (shapeId: string) => {
            pushLog('callback', `onRequestShapeDelete：${shapeId}`);
            deleteShape(shapeId);
        },
        onRequestVertexDelete: (shapeId: string, vertexId: string) => {
            pushLog('callback', `onRequestVertexDelete：${shapeId} / ${vertexId}`);
            deleteVertex(shapeId, vertexId);
        },
        onRequestLocationDelete: (locationId: string) => {
            pushLog('callback', `onRequestLocationDelete：${locationId}`);
            deleteLocation(locationId);
        },
        onShapeContextMenu: (detail: { nativeEvent: MouseEvent; shapeId: string }) => {
            pushLog('callback', `onShapeContextMenu：${detail.shapeId}`);
            showContextMenu(detail.nativeEvent, [
                {
                    label: '删除图形',
                    danger: true,
                    onClick: () => deleteShape(detail.shapeId),
                },
                {
                    label: '选中图形',
                    onClick: () => {
                        updateSelectedShapeId(detail.shapeId);
                        updateSelectedLocationId(null);
                    },
                },
            ]);
        },
        onVertexContextMenu: (detail: { nativeEvent: MouseEvent; shapeId: string; vertexId: string }) => {
            pushLog('callback', `onVertexContextMenu：${detail.shapeId} / ${detail.vertexId}`);
            showContextMenu(detail.nativeEvent, [
                {
                    label: '删除顶点',
                    danger: true,
                    onClick: () => deleteVertex(detail.shapeId, detail.vertexId),
                },
            ]);
        },
        onLocationContextMenu: (detail: { nativeEvent: MouseEvent; locationId: string }) => {
            pushLog('callback', `onLocationContextMenu：${detail.locationId}`);
            showContextMenu(detail.nativeEvent, [
                {
                    label: '删除关键地点',
                    danger: true,
                    onClick: () => deleteLocation(detail.locationId),
                },
                {
                    label: '选中关键地点',
                    onClick: () => {
                        updateSelectedShapeId(null);
                        updateSelectedLocationId(detail.locationId);
                    },
                },
            ]);
        },
    };
    return (
        <div className="demo-section fc-map-shape-editor" style={{display: 'flex', flexDirection: 'column', gap: 16}}>
            <h4>地图轮廓编辑器（接口上限展台）</h4>
            <p style={{margin: 0, color: 'var(--fc-color-text-secondary)', fontSize: 'var(--fc-font-size-sm)'}}>
                这个 demo 不再模拟一个固定业务页，而是尽量把 `MapShapeSvgEditor` 的可控状态、可接管逻辑和可观察回调全部摊开。
            </p>

            <div className="fc-map-shape-editor__panel">
                <div className="fc-map-shape-editor__panel-header">
                    <div>
                        <h3 className="fc-map-shape-editor__panel-title">总控台</h3>
                        <p className="fc-map-shape-editor__panel-subtitle">
                            这里集中展示调用方可控的状态与策略切换。
                        </p>
                    </div>
                </div>
                <div className="fc-map-shape-editor__sidebar-body">
                    <div className="fc-map-shape-editor__section">
                        <div className="fc-map-shape-editor__toolbar">
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={handleResetAll}>
                                重置全部状态
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={() => updateViewBox(createInitialMapShapeEditorViewBox(DEMO_CANVAS))}>
                                重置视图
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={drawingShape ? () => updateDrawingShape(null) : handleAddShape}>
                                {drawingShape ? '取消绘制图形' : '开始绘制图形'}
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={handleAddLocation}>
                                新增关键地点
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={handleRebuildPreviewFromDraft}>
                                用草稿直接刷新预览
                            </button>
                            <button type="button" className="fc-map-shape-editor__chip" style={{width: 'auto'}}
                                    onClick={() => void handleSubmit()}>
                                调用 submitMapShapeScene
                            </button>
                        </div>

                        <div className="fc-map-shape-editor__meta-row">
                            <span>右键菜单</span>
                            <strong>图形 / 顶点 / 关键地点均支持删除</strong>
                        </div>

                        <div className="fc-map-shape-editor__stats">
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">图形数量</span>
                                <strong className="fc-map-shape-editor__stat-value">{draft.shapes.length}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">关键地点</span>
                                <strong className="fc-map-shape-editor__stat-value">{draft.keyLocations.length}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">缩放比例</span>
                                <strong className="fc-map-shape-editor__stat-value">{zoomPercentage}%</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">选中图形</span>
                                <strong className="fc-map-shape-editor__stat-value">{selectedShapeId ?? 'null'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">选中地点</span>
                                <strong
                                    className="fc-map-shape-editor__stat-value">{selectedLocationId ?? 'null'}</strong>
                            </div>
                            <div className="fc-map-shape-editor__stat">
                                <span className="fc-map-shape-editor__stat-label">绘制状态</span>
                                <strong
                                    className="fc-map-shape-editor__stat-value">{drawingShape ? `${drawingShape.vertices.length} 点` : '关闭'}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="fc-map-shape-editor__workspace"
                 style={{gridTemplateColumns: 'minmax(0, 1.4fr) minmax(360px, 1fr)'}}>
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">MapShapeSvgEditor</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                右键空白区可触发 `onCanvasContextMenu`。右键图形、顶点、关键地点的处理方式由上面的删除策略切换控制。
                            </p>
                        </div>
                    </div>

                    <MapShapeSvgEditor
                        canvas={DEMO_CANVAS}
                        draft={draft}
                        selectedShapeId={selectedShapeId}
                        selectedLocationId={selectedLocationId}
                        drawingShape={drawingShape}
                        viewBox={viewBox}
                        invalidShapeIds={invalidShapeIds}
                        invalidKeyLocationIds={invalidKeyLocationIds}
                        onDraftChange={updateDraft}
                        onSelectedShapeChange={updateSelectedShapeId}
                        onSelectedLocationChange={updateSelectedLocationId}
                        onDrawingShapeChange={updateDrawingShape}
                        onViewBoxChange={updateViewBox}
                        onCanvasContextMenu={detail => {
                            pushLog('callback', `onCanvasContextMenu：client(${detail.clientX}, ${detail.clientY})`);
                            showContextMenu(detail.nativeEvent, [
                                {
                                    label: '清空选中态',
                                    onClick: () => {
                                        updateSelectedShapeId(null);
                                        updateSelectedLocationId(null);
                                    },
                                },
                                {
                                    label: '新增绘制图形',
                                    onClick: handleAddShape,
                                },
                                {
                                    label: '新增关键地点（居中落点）',
                                    onClick: handleAddLocation,
                                },
                            ]);
                        }}
                        {...editorDeleteProps}
                    />
                </section>

                <aside className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">调用方状态区</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                所有下面这些内容都不在 SVG 组件内部，而是由调用方自由组合。
                            </p>
                        </div>
                    </div>

                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">提交与校验</h4>
                            <div className="fc-map-shape-editor__status-row">
                                <span className="fc-map-shape-editor__status-label">validateMapEditorDraft</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    validationResult.isValid ? 'fc-map-shape-editor__status--success' : 'fc-map-shape-editor__status--error',
                                ].join(' ')}>
                                    {validationResult.isValid ? '前端校验通过。' : `前端校验失败，共 ${validationResult.issues.length} 项。`}
                                </div>
                            </div>
                            <div className="fc-map-shape-editor__status-row">
                                <span className="fc-map-shape-editor__status-label">submitMapShapeScene</span>
                                <div className={[
                                    'fc-map-shape-editor__status',
                                    submitStatus === 'success' ? 'fc-map-shape-editor__status--success' : '',
                                    submitStatus === 'saving' ? 'fc-map-shape-editor__status--saving' : '',
                                    submitStatus === 'frontend_error' || submitStatus === 'backend_error'
                                        ? 'fc-map-shape-editor__status--error'
                                        : '',
                                ].filter(Boolean).join(' ')}>
                                    {submitMessage}
                                </div>
                            </div>
                            {validationResult.issues.length > 0 ? (
                                <div className="fc-map-shape-editor__issue-list">
                                    {validationResult.issues.map(issue => (
                                        <div key={`${issue.code}-${issue.message}`}
                                             className="fc-map-shape-editor__issue-item">
                                            {issue.message}
                                        </div>
                                    ))}
                                </div>
                            ) : null}
                        </div>

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">视窗参数</h4>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-map-viewbox-x">viewBox.x</label>
                                <input
                                    id="demo-map-viewbox-x"
                                    type="number"
                                    value={viewBox.x}
                                    onChange={event => updateViewBox({...viewBox, x: Number(event.target.value)})}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-map-viewbox-y">viewBox.y</label>
                                <input
                                    id="demo-map-viewbox-y"
                                    type="number"
                                    value={viewBox.y}
                                    onChange={event => updateViewBox({...viewBox, y: Number(event.target.value)})}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-map-viewbox-width">viewBox.width</label>
                                <input
                                    id="demo-map-viewbox-width"
                                    type="number"
                                    value={viewBox.width}
                                    onChange={event => updateViewBox({...viewBox, width: Number(event.target.value)})}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-map-viewbox-height">viewBox.height</label>
                                <input
                                    id="demo-map-viewbox-height"
                                    type="number"
                                    value={viewBox.height}
                                    onChange={event => updateViewBox({...viewBox, height: Number(event.target.value)})}
                                />
                            </div>
                        </div>

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">Deck 渲染参数</h4>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-line-width">polygonLineWidth</label>
                                <input
                                    id="demo-deck-line-width"
                                    type="number"
                                    value={deckRenderOptions.polygonLineWidth ?? 2}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        polygonLineWidth: Number(event.target.value),
                                    }))}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-location-radius">locationRadius</label>
                                <input
                                    id="demo-deck-location-radius"
                                    type="number"
                                    value={deckRenderOptions.locationRadius ?? 8}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        locationRadius: Number(event.target.value),
                                    }))}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-location-stroke">locationStrokeColor</label>
                                <input
                                    id="demo-deck-location-stroke"
                                    value={deckColorToHex(deckRenderOptions.locationStrokeColor ?? [255, 255, 255, 255])}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        locationStrokeColor: hexToDeckColor(event.target.value, 255),
                                    }))}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-size">labelFontSize</label>
                                <input
                                    id="demo-deck-label-size"
                                    type="number"
                                    value={deckRenderOptions.labelFontSize ?? 13}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        labelFontSize: Number(event.target.value),
                                    }))}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-color">labelColor</label>
                                <input
                                    id="demo-deck-label-color"
                                    value={deckColorToHex(deckRenderOptions.labelColor ?? [38, 43, 56, 255])}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        labelColor: hexToDeckColor(event.target.value, 255),
                                    }))}
                                />
                            </div>
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-deck-label-font">labelFontFamily</label>
                                <input
                                    id="demo-deck-label-font"
                                    value={deckRenderOptions.labelFontFamily ?? '"Microsoft YaHei UI", sans-serif'}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        labelFontFamily: event.target.value,
                                    }))}
                                />
                            </div>
                            <label className="fc-map-shape-editor__chip" style={{cursor: 'pointer'}}>
                                <input
                                    type="checkbox"
                                    checked={deckRenderOptions.showLabels ?? true}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        showLabels: event.target.checked,
                                    }))}
                                    style={{marginRight: 8}}
                                />
                                <span className="fc-map-shape-editor__chip-title">showLabels</span>
                            </label>
                            <label className="fc-map-shape-editor__chip" style={{cursor: 'pointer'}}>
                                <input
                                    type="checkbox"
                                    checked={deckRenderOptions.showLocationStroke ?? true}
                                    onChange={event => setDeckRenderOptions(current => ({
                                        ...current,
                                        showLocationStroke: event.target.checked,
                                    }))}
                                    style={{marginRight: 8}}
                                />
                                <span className="fc-map-shape-editor__chip-title">showLocationStroke</span>
                            </label>
                        </div>

                        <div className="fc-map-shape-editor__section">
                            <h4 className="fc-map-shape-editor__section-title">外部强制异常高亮</h4>
                            <p className="fc-map-shape-editor__section-note">
                                `invalidShapeIds / invalidKeyLocationIds` 不必来自校验函数，也可以完全由业务方自行指定。
                            </p>
                            <div className="fc-map-shape-editor__shape-list">
                                {draft.shapes.map(shape => (
                                    <label key={shape.id} className="fc-map-shape-editor__chip"
                                           style={{cursor: 'pointer'}}>
                                        <input
                                            type="checkbox"
                                            checked={forcedInvalidShapeIds.includes(shape.id)}
                                            onChange={() => toggleForcedShapeInvalid(shape.id)}
                                            style={{marginRight: 8}}
                                        />
                                        <span className="fc-map-shape-editor__chip-title">{shape.name}</span>
                                    </label>
                                ))}
                                {draft.keyLocations.map(location => (
                                    <label key={location.id} className="fc-map-shape-editor__chip"
                                           style={{cursor: 'pointer'}}>
                                        <input
                                            type="checkbox"
                                            checked={forcedInvalidLocationIds.includes(location.id)}
                                            onChange={() => toggleForcedLocationInvalid(location.id)}
                                            style={{marginRight: 8}}
                                        />
                                        <span className="fc-map-shape-editor__chip-title">{location.name}</span>
                                    </label>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
            <div className="fc-map-shape-editor__workspace" style={{gridTemplateColumns: 'repeat(3, minmax(0, 1fr))'}}>
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">选中图形控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                图形名称、颜色、选中态和删除都可以完全由调用方控制。
                            </p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-selected-shape">selectedShapeId</label>
                                <select
                                    id="demo-selected-shape"
                                    value={selectedShapeId ?? ''}
                                    onChange={event => updateSelectedShapeId(event.target.value || null)}
                                >
                                    <option value="">未选中</option>
                                    {draft.shapes.map(shape => (
                                        <option key={shape.id} value={shape.id}>{shape.name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedShape ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-name">名称</label>
                                        <input
                                            id="demo-shape-name"
                                            value={selectedShape.name}
                                            onChange={event => handleSelectedShapeFieldChange('name', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-fill">填充色</label>
                                        <input
                                            id="demo-shape-fill"
                                            value={selectedShape.fill ?? ''}
                                            onChange={event => handleSelectedShapeFieldChange('fill', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-shape-stroke">描边色</label>
                                        <input
                                            id="demo-shape-stroke"
                                            value={selectedShape.stroke ?? ''}
                                            onChange={event => handleSelectedShapeFieldChange('stroke', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__meta-row">
                                        <span>顶点数量</span>
                                        <strong>{selectedShape.vertices.length}</strong>
                                    </div>
                                    <ButtonLike text="删除当前图形" onClick={() => deleteShape(selectedShape.id)}
                                                danger/>
                                    {selectedShapeIssues.length > 0 ? (
                                        <div className="fc-map-shape-editor__issue-list">
                                            {selectedShapeIssues.map(issue => (
                                                <div key={`${issue.code}-${issue.message}`}
                                                     className="fc-map-shape-editor__issue-item">
                                                    {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">当前没有选中图形。</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">关键地点控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                关键地点表单、关联图形和删除逻辑都完全在外部。
                            </p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <div className="fc-map-shape-editor__field">
                                <label htmlFor="demo-selected-location">selectedLocationId</label>
                                <select
                                    id="demo-selected-location"
                                    value={selectedLocationId ?? ''}
                                    onChange={event => updateSelectedLocationId(event.target.value || null)}
                                >
                                    <option value="">未选中</option>
                                    {draft.keyLocations.map(location => (
                                        <option key={location.id} value={location.id}>{location.name}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedLocation ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-name">名称</label>
                                        <input
                                            id="demo-map-location-name"
                                            value={selectedLocation.name}
                                            onChange={event => handleSelectedLocationFieldChange('name', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-type">类型</label>
                                        <input
                                            id="demo-map-location-type"
                                            value={selectedLocation.type}
                                            onChange={event => handleSelectedLocationFieldChange('type', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-map-location-shape">关联图形</label>
                                        <select
                                            id="demo-map-location-shape"
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
                                    <ButtonLike text="删除当前关键地点"
                                                onClick={() => deleteLocation(selectedLocation.id)} danger/>
                                    {selectedLocationIssues.length > 0 ? (
                                        <div className="fc-map-shape-editor__issue-list">
                                            {selectedLocationIssues.map(issue => (
                                                <div key={`${issue.code}-${issue.message}`}
                                                     className="fc-map-shape-editor__issue-item">
                                                    {issue.message}
                                                </div>
                                            ))}
                                        </div>
                                    ) : null}
                                </>
                            ) : (
                                <div className="fc-map-shape-editor__empty">当前没有选中关键地点。</div>
                            )}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">绘制中图形控制</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                `drawingShape` 也是外部状态，业务方可以在侧边单独编辑它。
                            </p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            {drawingShape ? (
                                <>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-name">名称</label>
                                        <input
                                            id="demo-drawing-shape-name"
                                            value={drawingShape.name}
                                            onChange={event => handleDrawingShapeFieldChange('name', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-fill">填充色</label>
                                        <input
                                            id="demo-drawing-shape-fill"
                                            value={drawingShape.fill ?? ''}
                                            onChange={event => handleDrawingShapeFieldChange('fill', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__field">
                                        <label htmlFor="demo-drawing-shape-stroke">描边色</label>
                                        <input
                                            id="demo-drawing-shape-stroke"
                                            value={drawingShape.stroke ?? ''}
                                            onChange={event => handleDrawingShapeFieldChange('stroke', event.target.value)}
                                        />
                                    </div>
                                    <div className="fc-map-shape-editor__meta-row">
                                        <span>已落点</span>
                                        <strong>{drawingShape.vertices.length}</strong>
                                    </div>
                                    <ButtonLike text="取消绘制" onClick={() => updateDrawingShape(null)}/>
                                </>
                            ) : (
                                <div
                                    className="fc-map-shape-editor__empty">当前没有绘制中的图形。点击上方“开始绘制图形”后，这里就会被业务表单接管。</div>
                            )}
                        </div>
                    </div>
                </section>
            </div>

            <div className="fc-map-shape-editor__workspace"
                 style={{gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)'}}>
                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">事件日志</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                这里展示回调链路，帮助判断接口究竟把什么交给了调用方。
                            </p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            {eventLogs.map(log => (
                                <div key={log.id} className="fc-map-shape-editor__issue-item"
                                     style={{color: 'var(--fc-color-text)'}}>
                                    <strong>[{log.level}]</strong> {log.message}
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                <section className="fc-map-shape-editor__panel">
                    <div className="fc-map-shape-editor__panel-header">
                        <div>
                            <h3 className="fc-map-shape-editor__panel-title">原始状态快照</h3>
                            <p className="fc-map-shape-editor__panel-subtitle">
                                调用方可直接查看、保存或二次派生这些状态。
                            </p>
                        </div>
                    </div>
                    <div className="fc-map-shape-editor__sidebar-body">
                        <div className="fc-map-shape-editor__section">
                            <pre style={{margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontSize: 12}}>
                                {JSON.stringify({
                                    selectedShapeId,
                                    selectedLocationId,
                                    drawingShape,
                                    viewBox,
                                    deckRenderOptions,
                                    invalidShapeIds,
                                    invalidKeyLocationIds,
                                    submitStatus,
                                    submitMessage,
                                }, null, 2)}
                            </pre>
                        </div>
                        <div className="fc-map-shape-editor__section">
                            <pre style={{
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                fontSize: 12,
                                maxHeight: 320,
                                overflow: 'auto'
                            }}>
                                {JSON.stringify(draft, null, 2)}
                            </pre>
                        </div>
                    </div>
                </section>
            </div>

            <section className="fc-map-shape-editor__panel">
                <div className="fc-map-shape-editor__panel-header">
                    <div>
                        <h3 className="fc-map-shape-editor__panel-title">MapDeckPreview</h3>
                        <p className="fc-map-shape-editor__panel-subtitle">
                            这里继续只消费 `scene`。你可以选择直接用草稿构造 scene，也可以走提交链路后再刷新。
                        </p>
                    </div>
                </div>
                <div className="fc-map-shape-editor__editor-shell fc-map-shape-editor__preview-shell"
                     style={{aspectRatio: `${DEMO_CANVAS.width} / ${DEMO_CANVAS.height}`}}>
                    <MapDeckPreview
                        scene={preview}
                        previewRenderOptions={deckRenderOptions}
                        onDeckHover={detail => {
                            setDeckHoverDetail(detail);
                        }}
                        onDeckClick={detail => {
                            setDeckClickDetail(detail);
                            pushLog('callback', `onDeckClick：${formatDeckPickDetail(detail)}`);
                        }}
                        onShapeClick={detail => {
                            pushLog('callback', `onShapeClick：${detail.object.name}`);
                        }}
                        onKeyLocationClick={detail => {
                            pushLog('callback', `onKeyLocationClick：${detail.object.name}`);
                        }}
                    />
                </div>
                <div className="fc-map-shape-editor__sidebar-body">
                    <div className="fc-map-shape-editor__section">
                        <div className="fc-map-shape-editor__meta-row">
                            <span>Deck Hover</span>
                            <strong>{formatDeckPickDetail(deckHoverDetail)}</strong>
                        </div>
                        <div className="fc-map-shape-editor__meta-row">
                            <span>Deck Click</span>
                            <strong>{formatDeckPickDetail(deckClickDetail)}</strong>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
}
