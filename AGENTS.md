# lib_ui — AGENTS.md

## 项目概览

`lib_ui` 是 FlowCloudAI 的前端组件仓库，维护可发布的 `flowcloudai-ui` 包与接入示例。  
目标是让桌面端、站点和插件能力复用一致的组件体系和 Token 约定。

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
- 组件与导出 API 遵循稳定语义，兼容策略优先于激进重构。  
- 样式优先使用 `flowcloudai-ui` 的 `--fc-*` Token。  

## 目录结构与模块职责

```text
lib_ui/
├── ui/          # 组件源代码、构建与发布配置
│   └── src/
├── app/         # 演示与接入校验场景
│   └── src/
├── docs/        # 设计与维护文档
└── scripts/     # 边界检查/发布辅助脚本
```

## 安全 / 禁止事项

- 不提交敏感密钥、服务端地址与测试账号。  
- 避免提交无版权授权的大体量素材。  
- 组件修改需补充兼容说明和 lint/build 结果。  

## 提交与 PR 规范

- 提交信息默认中文，单次聚焦单一组件或 API。  
- PR 需包含组件兼容性、发布影响、最小复现步骤。  
- 包名或样式 Token 改动前需补充示例场景回归。  

## 项目特有坑点

- 禁止跨仓库直接引用 `../../ui/src` 路径，必须通过 `flowcloudai-ui` 包或本地链接接入。  
- `npm run install:local` 依赖 `app` 与 `ui` 的目录结构，改动时同步验证。  

## 文档同步依据（本次核对）

- 同步时间：2026-06-03 16:28:02 +08:00
- 依据文件：`lib_ui/package.json`、`lib_ui/ui/package.json`、`lib_ui/app/package.json`、`lib_ui/ui/src`、`lib_ui/app/src`
