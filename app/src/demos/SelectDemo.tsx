import { Select } from 'flowcloudai-ui/Select'

export function SelectDemo() {
    return (
        <>
            <div className="demo-section">
                <h4>基础 / 分组搜索</h4>
                <div className="demo-col" style={{ maxWidth: 360 }}>
                    <Select options={[
                        { value: '1', label: '选项1' },
                        { value: '2', label: '选项2' },
                        { value: '3', label: '选项3' },
                    ]}/>
                    <Select
                        options={[
                            { value: '1', label: '选项1', group: '分组A' },
                            { value: '2', label: '选项2', group: '分组A' },
                            { value: '3', label: '选项3', group: '分组B' },
                            { value: '4', label: '选项4', group: '分组B' },
                            { value: '5', label: '选项5（禁用）', group: '分组B', disabled: true },
                        ]}
                        searchable
                    />
                </div>
            </div>
            <div className="demo-section">
                <h4>多选 / 虚拟滚动</h4>
                <div className="demo-col" style={{ maxWidth: 360 }}>
                    <Select
                        options={[
                            { value: '1', label: '苹果' },
                            { value: '2', label: '香蕉' },
                            { value: '3', label: '橙子' },
                            { value: '4', label: '葡萄' },
                        ]}
                        multiple placeholder="请选择水果"
                    />
                    <Select
                        options={Array.from({ length: 200 }, (_, i) => ({ value: String(i), label: `选项 ${i + 1}` }))}
                        searchable virtualScroll placeholder="从200个选项中搜索"
                    />
                </div>
            </div>
            <div className="demo-section">
                <h4>圆角</h4>
                <div className="demo-col" style={{ maxWidth: 360 }}>
                    <Select radius="none" options={[{ value: '1', label: '无圆角 (none)' }, { value: '2', label: '选项2' }]}/>
                    <Select radius="md"   options={[{ value: '1', label: 'md（默认）' }, { value: '2', label: '选项2' }]}/>
                    <Select radius="full" options={[{ value: '1', label: '胶囊形 (full)' }, { value: '2', label: '选项2' }]}/>
                </div>
            </div>
            <div className="demo-section">
                <h4>颜色 / 禁用</h4>
                <div className="demo-col" style={{ maxWidth: 360 }}>
                    <Select
                        options={[
                            { value: '1', label: '选项1' },
                            { value: '2', label: '选项2' },
                            { value: '3', label: '选项3' },
                        ]}
                        defaultValue="2"
                        selectedColor="#10b981" selectedBackground="#d1fae5" hoverBackground="#f0fdf4"
                    />
                    <Select options={[{ value: '1', label: '选项1' }]} defaultValue="1" disabled/>
                </div>
            </div>
        </>
    )
}
