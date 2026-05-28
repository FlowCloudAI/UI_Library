# FlowCloudAI 组件库（lib_ui）

`lib_ui` 提供统一前端组件体系 `flowcloudai-ui`，供桌面端、网站与演示应用共享，减少 UI 重复实现。  
仓库包含组件源码、发布构建与本地 `app` 集成示例。

## 快速开始

### 安装与本地运行

```bash
cd lib_ui
npm install
npm run lint

cd ui
npm install
npm run build

cd ../app
npm install
npm run install:local
```

### 最小示例

1. 先构建 `ui` 包。  
2. 在 `app` 执行 `npm run install:local`。  
3. 打开演示页面，验证关键组件（按钮、输入、对话列表）的渲染和交互。

## 主要功能 / 使用方式

- 统一 token 与组件契约（`flowcloudai-ui`）。  
- 可打包的组件库导出与版本化发布。  
- `app` 演示项目用于快速验证接入行为。

## 技术栈

- React、TypeScript、Vite、tsup、`flowcloudai-ui`。

## 目录结构（仅顶层）

```text
lib_ui/
├── ui/    # 组件库源码与构建
├── app/   # 演示应用与接入验证
└── docs/  # 说明与设计文档
```

## 许可证与贡献方式

许可证以子仓库声明为准。  
提交前补充 `npm run lint`、`npm run build` 与 `app` 接入结果说明。
