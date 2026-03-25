import { Button, useAlert } from "flowcloudai-ui"

export function AlertDemo() {
    const { showAlert } = useAlert()

    return (
        <>
            <div className="demo-section">
                <h4>提示模式（alert）</h4>
                <div className="demo-row">
                    <Button onClick={() => showAlert("操作已完成", "success")}>成功</Button>
                    <Button onClick={() => showAlert("网络请求失败", "error")}>错误</Button>
                    <Button onClick={() => showAlert("请注意此操作", "warning")}>警告</Button>
                    <Button onClick={() => showAlert("有新消息到达", "info")}>信息</Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>确认模式（confirm）</h4>
                <div className="demo-row">
                    <Button
                        variant="danger"
                        onClick={async () => {
                            const res = await showAlert("确定要删除这条记录吗？", "warning", "confirm")
                            if (res === "yes") await showAlert("已删除", "success", "toast", 2000)
                        }}
                    >
                        删除确认
                    </Button>
                </div>
            </div>
            <div className="demo-section">
                <h4>Toast 模式（自动消失）</h4>
                <div className="demo-row">
                    <Button onClick={() => showAlert("操作成功，2s 后关闭", "success", "toast", 2000)}>2s Toast</Button>
                    <Button onClick={() => showAlert("加载完成，3s 后关闭", "info", "toast", 3000)}>3s Toast</Button>
                </div>
            </div>
        </>
    )
}
