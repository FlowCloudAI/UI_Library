# FlowCloudAI 组件库（lib_ui）

`lib_ui` 提供统一组件包 `flowcloudai-ui`，用于桌面端、网站端和演示应用的 UI 一致性复用。  
通过统一 token 与组件接口减少跨项目重复实现成本。

## 项目简介

仓库包含组件源码、演示应用和构建发布链路。  
上层项目应通过包名/本地链接接入，不建议源码穿透。

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

1. 在 `ui` 下运行 `npm run build`。  
2. 在 `app` 运行 `npm run install:local` 进行本地接入。  
3. 打开演示页验证关键组件。  

## 主要功能 / 使用方式

- 统一 UI 组件与 `--fc-*` Token。  
- `tsup` 打包与发布配置。  
- 演示应用用于接入回归验证。  

## 技术栈

- React 19、TypeScript、Vite、tsup。  

## 目录结构（仅顶层）

```text
lib_ui/
├── ui/
├── app/
└── docs/
```

## 许可证与贡献方式

- 许可证按仓库声明。  
- 提交前补充 `npm run lint` 与 `ui` 的 `npm run build` 结果。  
- PR 说明包含样式兼容性与 API 影响。  

文档同步时间：2026-06-03 16:28:02 +08:00
