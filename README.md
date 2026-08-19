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

## Capsule 按钮设计规范

- 使用 `Button radius="full"` 表达 capsule，不在业务样式中单独模拟胶囊圆角。
- 横向内边距必须不小于纵向内边距的两倍；组件按尺寸提供 `xs 4/8px`、`sm 8/16px`、`md 12/24px`、`lg 16/32px`、`xl 24/48px`（纵向/横向）。业务样式不得将横向内边距压低到该比例以下。
- Capsule 只定义形状，可与 `primary`、`outline`、`ghost` 等视觉变体组合；圆形按钮和纯图标按钮继续使用 `circle` / `iconOnly`，不套用 capsule 留白规则。

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

- 许可证：`lib_ui/LICENSE`。  
- PR 建议补充 `npm run lint` 与 `cd ui && npm run build` 结果。  
- 提交时注明公共 API 变更、影响面和迁移建议。  

文档同步时间：2026-08-02 17:32:23 +08:00
