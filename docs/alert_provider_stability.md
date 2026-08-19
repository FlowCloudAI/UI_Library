# AlertProvider 稳定化简短报告

## 问题

`flowcloudai-ui` 的 `AlertProvider` 当前把弹窗状态 `alert` 放在 Provider 内部 state 中。每次调用 `showAlert` 打开或关闭提示时，Provider 都会重新渲染。

当前实现中 `showAlert` 函数和 Context value 都是在每次渲染时重新创建的：

```tsx
<AlertContext.Provider value={{ showAlert }}>
```

这会导致所有 `useAlert()` 消费者收到新的 Context value，从而触发额外重渲染。

## 影响

普通页面通常只是一次性弹出提示，额外重渲染不明显。`Settings` 页面存在自动保存 effect，且保存函数依赖 `showAlert`，因此弹窗状态变化会间接导致自动保存 effect 重新调度，问题更容易被观察到。

## 根治建议

在 `AlertProvider` 内稳定化提示 API：

- 用 `useCallback` 固定 `showAlert` 的函数引用。
- 如有必要，同步稳定 `openAlert` 等内部回调。
- 用 `useMemo` 固定 Context value，例如 `useMemo(() => ({showAlert}), [showAlert])`。

这样弹窗自身状态变化只影响提示 UI，不会让所有 `useAlert()` 消费者因为 Context value 引用变化而重渲染。
