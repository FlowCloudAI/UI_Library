# lib_ui — AGENTS.md

## 项目概览

`lib_ui` 是 FlowCloudAI 的前端组件仓库，维护可发布的 `flowcloudai-ui` 组件包，并通过 `app` 示例项目验证接入效果。  
该仓库目标是保证桌面端、网站端、演示应用之间的视觉与交互一致性。

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
- 组件命名与导出保持语义稳定，优先兼容向后兼容策略。  
- 样式优先使用 `flowcloudai-ui` 的 `--fc-*` 语义 token。  
- 避免在跨仓库场景直接引用 `../../ui/src` 等源码穿透路径。  

## 目录结构与模块职责

```text
lib_ui/
├── ui/          # 组件源码、构建与发布产物配置
├── app/         # 本地接入演示与回归页面
├── docs/        # 设计与维护文档
├── scripts/     # 约束/边界检查脚本
└── memory/      # 仓库内部记忆与辅助说明
```

## 安全 / 禁止事项

- 不提交真实密钥、测试账号、第三方生产地址。  
- 避免提交大型无授权素材或外部版权文件。  
- 组件改动需补充兼容性说明，防止 `flowcloudai-ui` 破坏上游接入方。  

## 提交与 PR 规范

- 提交信息默认中文，单次变更聚焦单个组件域或接入链路。  
- PR 需说明样式兼容影响、示例回归步骤和 `npm run lint` / `npm run build` 结果。  
- 修改 `ui` 公开 API 时补充使用方升级说明。  

## 项目特有坑点

- 不允许跨仓库直接 import 内部源码，需保持包级接入。  
- `app` 与 `ui` 目录结构变化会影响本地链接验证，请同步确认 `npm run install:local`。  
- 组件 token 变更需同步审核桌面端和站点使用者。  

## 文档同步依据（本次核对）

- 同步时间：2026-06-04 17:03:10 +08:00
- 依据文件：`lib_ui/package.json`、`lib_ui/ui/package.json`、`lib_ui/app/package.json`、`lib_ui/ui/src`、`lib_ui/app/src`
