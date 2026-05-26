import { useState } from 'react'
import { ListGroup, ListGroupItem } from 'flowcloudai-ui/ListGroup'

export function ListGroupDemo() {
    const [selected, setSelected] = useState('1')

    return (
        <>
            <div className="demo-section">
                <h4>基础</h4>
                <div style={{ maxWidth: 300 }}>
                    <ListGroup>
                        <ListGroupItem>列表项 1</ListGroupItem>
                        <ListGroupItem>列表项 2</ListGroupItem>
                        <ListGroupItem>列表项 3</ListGroupItem>
                    </ListGroup>
                </div>
            </div>
            <div className="demo-section">
                <h4>激活状态</h4>
                <div style={{ maxWidth: 300 }}>
                    <ListGroup>
                        {['首页', '个人中心', '设置'].map((label, i) => (
                            <ListGroupItem
                                key={i}
                                active={selected === String(i + 1)}
                                onClick={() => setSelected(String(i + 1))}
                            >
                                {label}
                            </ListGroupItem>
                        ))}
                    </ListGroup>
                    <p style={{ fontSize: 12, color: 'var(--fc-color-text-secondary)', marginTop: 8 }}>
                        当前选中：{selected}
                    </p>
                </div>
            </div>
            <div className="demo-section">
                <h4>禁用</h4>
                <div style={{ maxWidth: 300 }}>
                    <ListGroup>
                        <ListGroupItem>可用选项</ListGroupItem>
                        <ListGroupItem disabled>禁用选项</ListGroupItem>
                        <ListGroupItem>另一个可用</ListGroupItem>
                    </ListGroup>
                </div>
            </div>
        </>
    )
}
