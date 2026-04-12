import {
    MapShapeEditor,
    buildPreviewSceneFromDraft,
    createMockMapShapeEditorApi,
    type MapShapeEditorDraft,
} from 'flowcloudai-ui';

const DEMO_CANVAS = {
    width: 1000,
    height: 640,
};

const DEMO_DRAFT: MapShapeEditorDraft = {
    shapes: [
        {
            id: 'shape-warehouse',
            name: '仓储区',
            fill: '#d8ecff',
            stroke: '#185fa5',
            vertices: [
                { id: 'shape-warehouse-v1', x: 120, y: 120 },
                { id: 'shape-warehouse-v2', x: 420, y: 100 },
                { id: 'shape-warehouse-v3', x: 470, y: 280 },
                { id: 'shape-warehouse-v4', x: 180, y: 340 },
            ],
        },
        {
            id: 'shape-service',
            name: '服务区',
            fill: '#eaf5d7',
            stroke: '#426815',
            vertices: [
                { id: 'shape-service-v1', x: 600, y: 180 },
                { id: 'shape-service-v2', x: 850, y: 160 },
                { id: 'shape-service-v3', x: 900, y: 360 },
                { id: 'shape-service-v4', x: 640, y: 420 },
            ],
        },
    ],
    keyLocations: [
        { id: 'poi-1', name: '一号闸口', type: '出入口', x: 210, y: 132, shapeId: 'shape-warehouse' },
        { id: 'poi-2', name: '补给站', type: '补给点', x: 730, y: 250, shapeId: 'shape-service' },
        { id: 'poi-3', name: '值守台', type: '设备点', x: 350, y: 250, shapeId: 'shape-warehouse' },
    ],
};

const DEMO_PREVIEW = buildPreviewSceneFromDraft({
    canvas: DEMO_CANVAS,
    shapes: DEMO_DRAFT.shapes,
    keyLocations: DEMO_DRAFT.keyLocations,
});

const demoApi = createMockMapShapeEditorApi({ delayMs: 480 });

export function MapShapeEditorDemo() {
    return (
        <div className="demo-section" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <h4>地图轮廓编辑器（MapShapeEditor）</h4>
            <p style={{ margin: 0, color: 'var(--fc-color-text-secondary)', fontSize: 'var(--fc-font-size-sm)' }}>
                左侧是 SVG 编辑层，右侧和下方分别展示草稿信息与 deck 回显。拖动或插点后，点击“提交到后端”，deck 预览才会刷新。
            </p>
            <div>
                <MapShapeEditor
                    canvas={DEMO_CANVAS}
                    initialDraft={DEMO_DRAFT}
                    initialPreview={DEMO_PREVIEW}
                    api={demoApi}
                    width="100%"
                    height="auto"
                />
            </div>
        </div>
    );
}
