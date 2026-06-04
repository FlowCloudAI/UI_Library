# FlowCloudAI 组件库（lib_ui）

`lib_ui` 提供统一组件包 `flowcloudai-ui`，用于桌面端、网站端与演示应用的 UI 一致性复用。  
仓库核心任务是对外提供稳定 API 与统一设计 token，并通过演示应用验证接入行为。

## 项目简介

`ui` 目录定义可复用组件与构建配置，`app` 目录作为接入演示和回归入口。  
上层项目建议通过包名方式依赖，减少源码穿透导致的样式和版本漂移。

## 快速开始

### 安装与本地构建

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

1. 在 `ui` 下执行 `npm run build`。  
2. 在 `app` 下执行 `npm run install:local`。  
3. 启动演示页确认关键组件渲染与 token 兼容。  

## 主要功能 / 使用方式

- 统一组件库与 `--fc-*` Token。  
- 组件打包、边界检查与本地接入脚本。  
- 演示应用用于接入样例与回归验证。  

## 技术栈

- React 19、TypeScript、Vite、tsup  

## 目录结构（仅顶层）

```text
lib_ui/
├── ui/
├── app/
├── docs/
└── scripts/
```

## 许可证与贡献方式

- 许可证：仓库未发现独立 `LICENSE` 文件（TODO：确认授权与分发策略）。  
- 贡献前请补充 `npm run lint` 与 `ui` 的 `npm run build` 结果。  
- PR 需附样式兼容性与 API 影响说明。  

文档同步时间：2026-06-03 21:04:46 +08:00
