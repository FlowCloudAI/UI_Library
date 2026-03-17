import { Button, ButtonGroup, ButtonToolbar } from "flowcloudai-ui";
import { CheckButton, RollingBox } from "flowcloudai-ui";
import {useState} from "react";

export default function App() {
    const [enabled, setEnabled] = useState(false);

    return (
        <div style={
            {
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20}}>
            // 基础用法
            <Button>默认主要按钮</Button>
            <Button variant="secondary">次要按钮</Button>
            <Button variant="outline">轮廓按钮</Button>
            <Button variant="ghost">幽灵按钮</Button>

            // 语义色
            <Button variant="danger">删除</Button>
            <Button variant="success">确认</Button>
            <Button variant="warning">警告</Button>

            // 尺寸
            <Button size="xs">超小</Button>
            <Button size="sm">小</Button>
            <Button size="lg">大</Button>
            <Button size="xl">超大</Button>

            // 带图标
            <Button iconLeft="←">返回</Button>
            <Button iconRight="→">前进</Button>
            <Button iconOnly iconLeft="★"/>

            // 状态
            <Button disabled>禁用</Button>
            <Button block>块级按钮</Button>

            // 按钮组
            <ButtonGroup>
                <Button variant="secondary">左</Button>
                <Button variant="secondary">中</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            <ButtonGroup>
                <Button variant="outline">左</Button>
                <Button variant="secondary">右</Button>
            </ButtonGroup>

            // 工具栏
            <ButtonToolbar align="right">
                <Button variant="outline">取消</Button>
                <Button variant="primary">保存</Button>
            </ButtonToolbar>

            <ButtonToolbar align="center">
                <Button variant="outline">取消</Button>
                <Button variant="primary">确认</Button>
            </ButtonToolbar>


            // 基础用法
            <CheckButton />

            // 带标签
            <CheckButton labelLeft="关" labelRight="开" />

            // 受控组件
            const [enabled, setEnabled] = React.useState(false);
            <CheckButton
                checked={enabled}
                onChange={setEnabled}
                labelRight="启用通知"
            />

            // 不同尺寸
            <CheckButton size="sm" />
            <CheckButton size="md" />
            <CheckButton size="lg" />

            // 禁用状态
            <CheckButton disabled />
            <CheckButton disabled checked labelRight="已锁定" />

            // 基础用法（默认垂直滚动，auto模式）
            <RollingBox style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            // 永远显示滚动条
            <RollingBox showThumb="show" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            // 永不显示滚动条（隐藏但可滚动）
            <RollingBox showThumb="hide" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>

            // 水平滚动
            <RollingBox horizontal showThumb="show" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ width: '2000px', display: 'flex' }}>
                    <div>
                        内容...
                    </div>
                    <div>
                        内容...
                    </div>
                    <div>
                        内容...
                    </div>
                    <div>
                        内容...
                    </div>
                </div>
            </RollingBox>

            // 细滚动条 + 显示轨道
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

            // 粗滚动条
            <RollingBox thumbSize="thick" style={{ height: '300px', border: '1px solid #ccc', padding: '10px', borderRadius: '5px'}}>
                <div style={{ height: '1000px' }}>
                    内容...
                </div>
            </RollingBox>
        </div>
    );
}