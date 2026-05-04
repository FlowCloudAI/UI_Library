# TeraEditor

`TeraEditor` 是一个面向单模板场景的 Tera 编辑器组件，基于 `Monaco` 实现，提供 `HTML + Tera` 语法高亮、内置基础语法检查，以及可选的外部增强校验接口。

## 组件定位

适用场景：

- 在前端直接编辑 Tera 模板字符串
- 需要比普通 `textarea` 更强的高亮与错误提示
- 需要先做结构性预检查，再按需接入后端或宿主校验

当前版本边界：

- 仅支持单模板编辑
- 不处理 `extends`、`include`、宏文件等多模板关系
- 不追求与 Rust `tera` crate 完全一致
- 不包含自动补全、格式化、跳转定义等语言服务

## 基本用法

```tsx
import { useState } from 'react'
import { TeraEditor } from 'flowcloudai-ui'

export function Example() {
  const [value, setValue] = useState(`{% if user %}\n  <p>{{ user.name }}</p>\n{% endif %}`)

  return (
    <TeraEditor
      value={value}
      onChange={setValue}
      minHeight={360}
    />
  )
}
```

## 外部增强校验

`TeraEditor` 提供两种扩展方式：

### `diagnostics`

由调用方直接传入问题列表。适合这些场景：

- 后端已经返回了结构化错误
- 宿主有自己的规则引擎
- 需要精确控制展示内容和范围

```tsx
const diagnostics = [
  {
    message: '变量未定义',
    severity: 'warning',
    startLineNumber: 2,
    startColumn: 6,
    endLineNumber: 2,
    endColumn: 18,
  },
]

<TeraEditor
  value={value}
  onChange={setValue}
  diagnostics={diagnostics}
/>
```

### `validate`

由调用方提供同步或异步校验函数。组件会在内容变化后调用，并自动只保留最后一次输入对应的校验结果。

```tsx
<TeraEditor
  value={value}
  onChange={setValue}
  validate={async (template) => {
    const response = await fetch('/api/tera/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ template }),
    })
    return await response.json()
  }}
/>
```

建议：

- `diagnostics` 适合“结果已知”的场景
- `validate` 适合“组件帮你触发校验”的场景
- 两者可以同时使用，最终都会合并显示

## 内置基础校验规则

当前内置规则只覆盖低误报、结构性的问题：

- 未闭合的 `{{ ... }}`
- 未闭合的 `{% ... %}`
- 未闭合的 `{# ... #}`
- `if / endif` 配对失败
- `for / endfor` 配对失败
- `block / endblock` 配对失败
- `macro / endmacro` 配对失败
- `raw / endraw` 配对失败
- 孤立的结束标签，例如单独出现 `endif`
- 结束标签与当前块类型不匹配
- `else` / `elif` 出现在非 `if` 上下文

这些规则只用于提供“编辑期即时反馈”，不能替代真实 Tera 渲染链路的最终校验。

## 已知边界

- 如果你需要和生产中的 Rust `tera` 引擎完全一致的结果，应该把真实校验逻辑放到宿主或后端，再通过 `diagnostics` 或 `validate` 回传
- 组件当前的高亮基于 `HTML + Tera` 的轻量语言定义，不是完整 HTML parser，也不是完整 Tera parser
- `raw` 块内部会尽量避免误报，但仍以“编辑辅助”优先，不保证覆盖所有边缘语法
