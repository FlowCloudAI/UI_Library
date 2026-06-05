# lib_ui — AGENTS.md

## 项目概览

`lib_ui` 是 FlowCloudAI 共享组件仓库，产出 `flowcloudai-ui` 包，并通过 `app` 示例工程验证接入效果。  
目标是提供稳定的 UI API 与设计 token，减少桌面端和站点端组件行为差异。

## 构建 / 运行 / 测试 / lint

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

## 代码风格与命名约定

- TypeScript/React 使用 ESM 严格模式。  
- 组件命名与导出保持语义稳定，优先兼容版本演进。  
- 样式优先使用 `flowcloudai-ui` 的 `--fc-*` token。  
- 避免跨仓库直接引用内源文件（禁止 `../../ui/src` 等穿透路径）。  

## 目录结构与模块职责

```text
lib_ui/
├── ui/          # 组件源码与打包产物入口
├── app/         # 接入示例与回归验证
├── docs/        # 文档与使用说明
├── scripts/     # 边界/导出检查脚本
└── memory/      # 维护备注与上下文
```

## 安全 / 禁止事项

- 不提交真实模型密钥、测试账号、生产地址与鉴权材料。  
- 不提交版权敏感素材和外部二进制文件。  
- 修改公共组件需补充兼容性说明，避免影响接入方。  

## 提交与 PR 规范

- 提交信息默认中文，单次变更聚焦组件域或接入链路。  
- PR 需附 `npm run lint` 与 `cd ui && npm run build` 结果。  
- 修改公开 API 时附依赖方升级说明与示例。  

## 项目特有坑点

- 不允许跨仓库直接 import `ui/src` 内部源码，须走包级依赖。  
- `app` 与 `ui` 目录变更会影响 `npm run install:local` 的本地联调结果。  
- token 与样式语义变更需同步桌面端与网站端回归。  

文档同步时间：2026-06-05 12:44:21 +08:00
