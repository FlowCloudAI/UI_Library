# lib_ui 文档索引

> 更新日期：2026-08-19

## 状态含义

| 状态 | 含义 |
| --- | --- |
| `现行` | 当前有效，可直接作为判断依据 |
| `归档` | 已发布版本的变更记录，只用于追溯 |

## 文档

| 文档 | 状态 | 日期 | 说明 |
| --- | --- | --- | --- |
| [UI.md](UI.md) | 现行 | 2026-07-05 | **`flowcloudai-ui` 公开组件、工具函数、公开类型与用法全文**，依据 `ui/src/entries/*` 与 `ui/dist/*.d.ts` 整理。查组件 API 的第一入口。推荐按子路径导入 |
| [Baseline.md](Baseline.md) | 现行 | 2026-07-27 | 组件公共 API 基线规范。迁移方式是「新增统一 API + 旧 API 标记废弃」的兼容路线，不做一次性破坏性重构 |
| [TeraEditor.md](TeraEditor.md) | 现行 | 2026-05-13 | `TeraEditor` 组件：基于 Monaco 的单模板 Tera 编辑器，含 HTML + Tera 高亮与外部增强校验接口 |
| [TODO_ChatTree.md](TODO_ChatTree.md) | 现行 | 2026-05-21 | 对话分支切换的剩余集成工作。核心库与组件库的基础设施已完成，**剩余工作全在 App 层**（Tauri 桥接 + React 状态 + UI 装配） |
| [0.2.3.md](0.2.3.md) | 归档 | 2026-05-21 | `flowcloudai-ui@0.2.3` 变更说明：Tree 系列、VirtualList、输入与滑块、RollingBox、Alert、TeraEditor、MarkdownEditor |
| [0.2.0.md](0.2.0.md) | 归档 | 2026-05-21 | `flowcloudai-ui@0.2.0` 变更说明：一批新增对外能力与兼容性修正 |

## 开发记录（在工作区 `docs/devlog/`）

问题排查记录统一收在工作区根仓库，**不在本仓**——单独 clone `lib_ui` 看不到。索引 `docs/devlog/README.md`。

| 原文件 | 现位置 |
| --- | --- |
| `docs/alert_provider_stability.md` | `docs/devlog/2026-05-20-alert-provider-整树重渲染.md`（状态：**未解决**，只有根治建议） |

## 不在本目录的规范

- **Capsule 按钮设计规范**在 `lib_ui/README.md`，改胶囊按钮前先看那里
- `docs/前端风格指南.md`（根仓库）— 前端硬红线与 review 检查表，适用范围含 `ui/src/`
- `docs/archive/architecture-2026-05/Architecture_Lib_UI_Audit.md` — 2026-06-12 架构审查与双消费方依赖契约（归档）
