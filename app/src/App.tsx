import { Button, ButtonGroup, ButtonToolbar } from "flowcloudai-ui";
import {
    CheckButton, RollingBox, Input, Select, Slider, SideBar, Tree,
    Avatar, ListGroup, ListGroupItem
} from "flowcloudai-ui";
import {useEffect, useState} from "react";

export default function App() {
    const [enabled, setEnabled] = useState(false);
    const [selectedItem, setSelectedItem] = useState('1');

    useEffect(() => {
        console.log('enabled', enabled);
    }, [enabled]);

    return (
        <div style={
            {
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20
            }}>
            {/* 基础用法 */}
            <Button>默认主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>

            {/* 语义色 */}
            <Button variant="danger">删除</Button>
            <Button variant="success">确认</Button>
            <Button variant="warning">警告</Button>

            {/* 尺寸 */}
            <Button size="xs">超小</Button>
            <Button size="sm">小</Button>
            <Button size="lg">大</Button>
            <Button size="xl">超大</Button>

            {/* 带图标 */}
            <Button iconLeft="←">返回</Button>
            <Button iconRight="→">前进</Button>
            <Button iconOnly iconLeft="★"/>

            {/* 状态 */}
            <Button disabled>禁用</Button>
            <Button block>块级按钮</Button>

            {/* 按钮组 */}
            <ButtonGroup>
                <Button variant="secondary">左</Button>
                <Button variant="secondary">中</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            <ButtonGroup>
                <Button variant="outline">左</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            {/* 工具栏 */}
            <ButtonToolbar align="right">
                <Button variant="outline">取消</Button>
                <Button variant="primary">保存</Button>
            </ButtonToolbar>

            <ButtonToolbar align="center">
                <Button variant="outline">取消</Button>
                <Button variant="primary">确认</Button>
            </ButtonToolbar>

            {/* CheckButton */}
            <CheckButton />
            <CheckButton labelLeft="关" labelRight="开" />
            <CheckButton
                checked={enabled}
                onChange={setEnabled}
                labelRight="启用通知"
            />
            <CheckButton size="sm" />
            <CheckButton size="md" />
            <CheckButton size="lg" />
            <CheckButton disabled />
            <CheckButton disabled checked labelRight="已锁定" />

            {/* RollingBox */}
            <RollingBox style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox showThumb="show" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox showThumb="hide" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox horizontal showThumb="show" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ width: '2000px', display: 'flex' }}>
                    <div>内容1</div>
                    <div>内容2</div>
                    <div>内容3</div>
                    <div>内容4</div>
                </div>
            </RollingBox>

            <RollingBox
                showThumb="show"
                thumbSize="thin"
                showTrack
                style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}
            >
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            <RollingBox thumbSize="thick" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            {/* Input */}
            <Input
                size="lg"
                prefix="@"
                suffix=".com"
                passwordToggle
                allowClear
                status="success"
                helperText="格式正确"
            />

            {/* Slider */}
            <Slider range min={0} max={100} defaultValue={[20, 80]} tooltip marks={{0:'0%',50:'50%',100:'100%'}} />
            <Slider orientation="vertical" />

            {/* Select */}
            <Select
                options={[
                    { value: '1', label: '选项1', group: '分组A' },
                    { value: '2', label: '选项2', group: '分组A' },
                    { value: '3', label: '选项3', group: '分组B' }
                ]}
                searchable
                multiple
                virtualScroll
            />

            {/* SideBar */}
            <SideBar
                items={[
                    { key: '1', label: '首页', icon: '🏠' },
                    { key: '2', label: '设置', icon: '⚙️', children: [
                            { key: '2-1', label: '个人' },
                            { key: '2-2', label: '系统' }
                        ]}
                ]}
                collapsed
            />

            {/* Tree */}
            <Tree
                treeData={[
                    { key: '1', title: '父节点', children: [
                            { key: '1-1', title: '子节点1', isLeaf: true },
                            { key: '1-2', title: '子节点2', isLeaf: true }
                        ]}
                ]}
                loadData={async (node) => { /* 异步加载 */ }}
                searchable
                showLine
            />

            {/* Avatar组件测试 */}
            <div style={{ borderTop: '2px solid #eee', margin: '20px 0', padding: '20px 0' }}>
                <h3 style={{ marginBottom: 20 }}>Avatar 头像组件测试</h3>

                {/* 尺寸变体 */}
                <div style={{ marginBottom: 20 }}>
                    <h4>尺寸变体</h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Avatar size="xs" />
                        <Avatar size="sm" />
                        <Avatar size="md" />
                        <Avatar size="lg" />
                        <Avatar size="xl" />
                    </div>
                </div>

                {/* 形状 */}
                <div style={{ marginBottom: 20 }}>
                    <h4>形状</h4>
                    <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
                        <Avatar shape="circle" />
                        <Avatar shape="square" />
                    </div>
                </div>
            </div>

            {/* ListGroup组件测试 */}
            <div style={{ borderTop: '2px solid #eee', margin: '20px 0', padding: '20px 0' }}>
                <h3 style={{ marginBottom: 20 }}>ListGroup 列表组组件测试</h3>

                {/* 基础列表组 */}
                <div style={{ marginBottom: 30, maxWidth: 300 }}>
                    <h4>基础列表组</h4>
                    <ListGroup>
                        <ListGroupItem>列表项 1</ListGroupItem>
                        <ListGroupItem>列表项 2</ListGroupItem>
                        <ListGroupItem>列表项 3</ListGroupItem>
                    </ListGroup>
                </div>

                {/* 带激活状态 */}
                <div style={{ marginBottom: 30, maxWidth: 300 }}>
                    <h4>带激活状态</h4>
                    <ListGroup>
                        <ListGroupItem
                            active={selectedItem === '1'}
                            onClick={() => setSelectedItem('1')}
                        >
                            首页
                        </ListGroupItem>
                        <ListGroupItem
                            active={selectedItem === '2'}
                            onClick={() => setSelectedItem('2')}
                        >
                            个人中心
                        </ListGroupItem>
                        <ListGroupItem
                            active={selectedItem === '3'}
                            onClick={() => setSelectedItem('3')}
                        >
                            设置
                        </ListGroupItem>
                    </ListGroup>
                    <p>当前选中: {selectedItem}</p>
                </div>

                {/* 禁用状态 */}
                <div style={{ marginBottom: 30, maxWidth: 300 }}>
                    <h4>禁用状态</h4>
                    <ListGroup>
                        <ListGroupItem>可用选项</ListGroupItem>
                        <ListGroupItem disabled>禁用选项</ListGroupItem>
                        <ListGroupItem>另一个可用选项</ListGroupItem>
                    </ListGroup>
                </div>
            </div>
        </div>
    );
}