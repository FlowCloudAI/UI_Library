# FlowCloudAI 组件库（lib_ui）

`lib_ui` 维护统一组件包 `flowcloudai-ui`，用于桌面端和网站端复用 UI token、组件行为与交互约定。  
仓库通过 `ui` 与 `app` 示例项目实现组件发布与接入验证。

## 项目简介

`ui` 目录负责组件源码与构建产物；`app` 目录提供接入示例。  
建议通过包方式引用，避免源码穿透导致样式和版本漂移。

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

1. 在 `ui` 执行 `npm run build`。  
2. 在 `app` 执行 `npm run install:local`。  
3. 启动演示页面验证关键组件渲染与 token 兼容。  

## 主要功能 / 使用方式

- 提供统一组件包 `flowcloudai-ui`。  
- 统一 `--fc-*` 设计 token 与组件 API。  
- 示例工程用于接入方式验证与兼容性回归。  

## 技术栈

- React 19 + TypeScript + Vite + tsup

## 目录结构（仅顶层）

```text
lib_ui/
├── ui/
├── app/
├── docs/
└── scripts/
```

## 许可证与贡献方式

- 许可证：本仓库未发现独立 `LICENSE`，按仓库当前授权策略执行。  
- PR 建议补充 `npm run lint` 与 `ui` 的 `npm run build` 结果。  
- 提交时标注公共 API 改动、影响组件与迁移建议。  

文档同步时间：2026-06-05 12:44:21 +08:00
