# lib_ui 文档索引

> 更新日期：2026-08-19
>
> 组件公开 API 的事实索引目前在根仓库的 `docs/UI.md`，**P2 将下沉到本目录**。

## 状态含义

| 状态 | 含义 |
| --- | --- |
| `现行` | 当前有效，可直接作为判断依据 |
| `归档` | 已发布版本的变更记录，只用于追溯 |

## 文档

| 文档 | 状态 | 日期 | 说明 |
| --- | --- | --- | --- |
| [Baseline.md](Baseline.md) | 现行 | 2026-07-27 | 组件公共 API 基线规范。迁移路线是「新增统一 API + 旧 API 标记废弃」的兼容路线，不做一次性破坏性重构 |
| [TeraEditor.md](TeraEditor.md) | 现行 | 2026-05-13 | `TeraEditor` 组件：基于 Monaco 的单模板 Tera 编辑器，含 HTML + Tera 高亮与外部增强校验接口 |
| [TODO_ChatTree.md](TODO_ChatTree.md) | 现行 | 2026-05-21 | 对话分支切换的剩余集成工作。核心库与组件库的基础设施已完成，**剩余工作全在 App 层**（Tauri 桥接 + React 状态 + UI 装配） |
| [0.2.3.md](0.2.3.md) | 归档 | 2026-05-21 | `flowcloudai-ui@0.2.3` 变更说明：Tree 系列、VirtualList、输入与滑块、RollingBox、Alert、TeraEditor、MarkdownEditor |
| [0.2.0.md](0.2.0.md) | 归档 | 2026-05-21 | `flowcloudai-ui@0.2.0` 变更说明：一批新增对外能力与兼容性修正 |

## 相关的跨仓文档（在根 `docs/`）

- `docs/UI.md` — **组件、工具函数、公开类型与用法全文**。当前查组件 API 的第一入口。P2 下沉到本目录，与 `Baseline.md` 合并整理
- `docs/前端风格指南.md` — 前端硬红线与 review 检查表，适用范围含 `lib_ui/ui/src/`
- `docs/Architecture_Lib_UI_Audit.md` — 2026-06-12 架构审查与双消费方依赖契约（归档）
- `docs/app_main_fcui_token_audit_memory.md` — `--fc-*` 语义令牌审计结论固化（归档）
- 根仓库 `Alert_context.md` — `AlertProvider` 重渲染问题的单点报告。**P2 并入本目录**

## Capsule 按钮设计规范

该规范在 `lib_ui/README.md`，不在本目录，改胶囊按钮前先看那里。
