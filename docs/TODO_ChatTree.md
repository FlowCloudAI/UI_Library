# TODO: 对话分支切换 —— 剩余集成工作

## 背景

`client_core` 与 `ui-library` 已完成分支切换的基础设施（见下方"已完成"部分）。
剩余工作集中在 **App 层**（Tauri 桥接 + React 状态管理 + UI 装配）。

---

## 已完成（无需再动）

### client_core（commit `4b688c5`）

- `ConversationTree` 新增 `all_nodes()`、`children_of()`、`insert_node()`、`set_head()`
- `SessionHandle` 暴露 `get_all_nodes()`、`get_node()`、`get_children()`、`head()`、`checkout()`
- `SessionEvent::BranchChanged { node_id }` 在 checkout 成功时发出
- `auto_save` 保存全部节点（含 `parent`）+ `head`；`preload_history` 恢复分支拓扑
- `StoredMessage` 新增 `parent: Option<u64>`，`StoredConversation` 新增 `head: Option<u64>`，schema 升级到 v3（向后兼容 v2）

### ui-library（commit `bef36d6`）

- `MessageBox` props 新增 `nodeId`、`branchIndex`、`branchTotal`、`onSwitchBranch`
- `MessageBox` toolbar 内联分支导航器 UI（◀ N/M ▶）
- `ConversationTreeView` 新组件：对话树可视化，含分支点检测和点击切换

---

## 待完成（App 层，共 5 步）

### 1. 修复编译错误：`BranchChanged` 事件未处理

**文件：** `app_main/src-tauri/src/apis/ai_client/common.rs`

`spawn_session_event_loop` 中的 `match event` 目前没有 `BranchChanged` 分支，编译器会报错。

新增 `EventBranchChanged` payload 结构体，在 match 中转发为 `ai:branch_changed` 事件：

```rust
// common.rs —— 新增 payload
#[derive(Serialize, Clone)]
pub(crate) struct EventBranchChanged {
    pub(crate) session_id: String,
    pub(crate) run_id: String,
    pub(crate) node_id: u64,
}

// spawn_session_event_loop 的 match 中新增：
SessionEvent::BranchChanged { node_id } => {
    app_clone
        .emit("ai:branch_changed", EventBranchChanged {
            session_id: sid.clone(),
            run_id: rid.clone(),
            node_id,
        })
        .ok();
}
```

### 2. 前端监听 `ai:branch_changed` 事件

**文件：** `app_main/src/features/ai-chat/hooks/useAiSession.ts`

- 新增 `AiEventBranchChanged` 类型（在 `api/ai_client.ts` 或 hook 内）
- 在 `useEffect` 中 `listen<AiEventBranchChanged>('ai:branch_changed', ...)`
- 回调中更新 `lastUserNodeId` / 对应 run 的 `nodeId`

### 3. 暴露树查询 Tauri Command

**文件：** `app_main/src-tauri/src/apis/ai_client/sessions.rs`

新增 `ai_get_conversation_tree` command，调用 `SessionHandle::get_all_nodes()`：

```rust
#[tauri::command]
pub async fn ai_get_conversation_tree(
    ai_state: State<'_, AiState>,
    session_id: String,
) -> Result<Vec<ConversationNode>, String> {
    let handle = {
        let sessions = ai_state.sessions.lock().await;
        sessions.get(&session_id)
            .map(|entry| entry.handle.clone())
            .ok_or_else(|| format!("Session '{}' 不存在", session_id))?
    };
    Ok(handle.get_all_nodes().await)
}
```

`ConversationNode` 需要 `#[derive(Serialize)]`（已在 `tree.rs` 中派生，确认 `Message`/`ToolCall` 也已派生）。

### 4. 前端对接树数据并计算分支信息

**文件：** `app_main/src/features/ai-chat/hooks/useAiSession.ts`（或新建 `useConversationTree.ts`）

- 新增 `ai_get_conversation_tree` 的 TypeScript 封装（在 `api/ai_client.ts`）
- Hook 中维护 `ConversationNode[]` 状态
- 在 `TurnEnd` 和 `BranchChanged` 事件后调用 `ai_get_conversation_tree` 刷新
- 为每个消息计算 `branchIndex` / `branchTotal`：
  - 用 `ConversationTreeView` 中的 `buildTree()` 逻辑（可以提取到共享 utils）
  - 对每条消息查找其 `parent.children.length`，若 > 1 则传入 `branchTotal`
  - 计算当前节点在 siblings 中的位置作为 `branchIndex`

### 5. UI 装配

**文件：** App 的 Chat 页面组件（各项目不同）

- 在聊天界面侧边或顶部渲染 `ConversationTreeView`
- 传入 `nodes`（来自步骤 4 的树状态）、`head`、`onCheckout`
- 为每条 `MessageBox` 传入 `nodeId`、`branchIndex`、`branchTotal`、`onSwitchBranch`
- `onSwitchBranch` 方向 → 节点 ID 的映射：根据当前 `nodeId` 和 `direction`（prev/next），在 siblings 数组中查找对应节点，调用 `useAiSession.checkout(targetNodeId)`

---

## 预估工作量

| 步骤 | 文件数 | 新增行数 | 难度 |
|------|--------|----------|------|
| 1. 修复编译 + 事件转发 | 1 | ~15 | 低 |
| 2. 前端监听事件 | 2 | ~20 | 低 |
| 3. Tauri tree command | 1 | ~15 | 低 |
| 4. 前端树状态管理 | 2 | ~50 | 中 |
| 5. UI 装配 | 1-2 | ~40 | 中 |

**总计约 140 行，6-7 个文件。**
