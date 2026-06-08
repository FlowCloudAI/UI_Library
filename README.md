# FlowCloudAI 组件库（lib_ui）

## 项目简介

`lib_ui` 维护统一组件包 `flowcloudai-ui`，对外统一组件 API、`--fc-*` 设计 token 与交互行为。
通过 `ui` 与 `app` 示例项目支撑桌面端和网站端的接入一致性验证。

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

1. 在 `ui` 执行 `npm run build` 生成 `dist`。  
2. 在 `app` 执行 `npm run install:local` 并验证组件可引用。  
3. 在示例页面做关键组件渲染与 token 样式回归。  

## 主要功能 / 使用方式

- 提供 `flowcloudai-ui` 组件包与构建发布流程。  
- 统一 `--fc-*` 设计 token 与主题语义。  
- 示例工程用于接入方式、兼容性与视觉回归。  

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

- 许可证：本仓库未发现独立 `LICENSE`，按仓库当前授权策略执行。  
- PR 建议补充 `npm run lint` 与 `cd ui && npm run build` 结果。  
- 提交时注明公共 API 变更、影响面和迁移建议。  

文档同步时间：2026-06-08 13:20:10 +08:00
