# lib_ui — AGENTS.md

## 项目概览

`lib_ui` 是 FlowCloudAI 的共享组件仓库，维护 `flowcloudai-ui` 组件包与接入示例。
它负责跨 `app_main` 与 `site_flowcloudai` 的 UI 一致性与设计 token 能力沉淀。

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

该仓库无完整 test 脚本，质量关口以 lint 和 `ui` 打包结果为主。

## 代码风格与命名约定

- TypeScript/React 使用 ESM 严格模式。  
- 组件 API 与导出保持语义稳定，优先保证向后兼容。  
- 样式优先使用 `flowcloudai-ui` 的 `--fc-*` token 与统一设计变量。  
- 禁止跨仓库直接引用 `ui/src` 内部源码，必须走包级 API。  

## 目录结构与模块职责

```text
lib_ui/
├── ui/          # 组件源码与打包配置
├── app/         # 接入示例与回归验证
├── docs/        # 文档与使用说明
├── scripts/     # 边界检查与约束脚本
└── memory/      # 维护备注与上下文
```

## 安全 / 禁止事项

- 不提交真实模型密钥、测试账号、生产地址与鉴权材料。  
- 不提交版权敏感素材和外部二进制文件。  
- 修改公共组件需补充兼容性说明，避免影响接入方。  

## 提交与 PR 规范

- 提交信息默认中文，单次变更聚焦组件域或接入链路。  
- PR 需附 `npm run lint` 与 `cd ui && npm run build` 结果。  
- 修改公开 API 时补充依赖方升级说明与最小示例。  

## 项目特有坑点

- 组件变更会直接影响 `app_main` 与 `site_flowcloudai` 的视觉一致性。  
- `app` 与 `ui` 目录更新可能影响 `npm run install:local` 联调结果。  
- token 与样式语义变更需同步文档和接入仓库回归。  

文档同步时间：2026-06-08 13:20:10 +08:00
