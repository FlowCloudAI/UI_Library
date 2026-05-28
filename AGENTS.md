# lib_ui — AGENTS.md

## 项目概览

`lib_ui` 是 FlowCloudAI 组件体系仓库，包含可发布包 `flowcloudai-ui` 与前端演示项目。  
上层应用应通过包名依赖，避免源码级穿透造成 React 实例重复或样式污染。

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

`lib_ui` 无统一 `npm run test`，`npm run lint` 与组件 build 是最小验证边界。

## 代码风格与命名约定

- React/TypeScript 采用严格模式，组件与 hook 命名清晰。  
- `flowcloudai-ui` 包公共 API 优先保证向后兼容。  
- 样式以语义化 token 为主，避免魔法常量。

## 目录结构与职责

```text
lib_ui/
├── ui/      # 核心组件源码与发布构建
├── app/     # 演示应用与接入验证
└── docs/    # 说明文档与设计约定
```

## 安全 / 禁止事项

- 不在组件库提交真实密钥、私有地址或环境变量示例。  
- 禁止直接引用上游私有资源路径，所有测试数据使用示例值。  
- 合并前确认 `npm run lint` 与 `npm run build` 通过。

## 贡献方式与 PR 规范

- 组件/API 变更需补齐使用示例或演示步骤。  
- PR 说明需包含兼容性影响与视觉回归观察点。  
- 提交信息默认中文。

## 项目特有坑点

- 避免直接引用 `../../ui/src`，必须通过 `flowcloudai-ui` 包名。  
- 演示链路依赖 npm 链接行为，`npm run install:local` 与本地 `dist` 要求一致。

## 文档同步依据（本次核对）

- 同步时间：2026-05-28 18:02:58 +08:00  
- 依据文件：`lib_ui/package.json`、`lib_ui/ui/package.json`、`lib_ui/app/package.json`
