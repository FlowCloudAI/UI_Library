import {useMemo, useState} from 'react';
import {Button, ButtonGroup, CheckButton, TeraEditor, type TeraEditorDiagnostic} from 'flowcloudai-ui';

const NORMAL_TEMPLATE = `{% block content %}
<section class="hero">
  <h1>{{ title }}</h1>
  {% if user %}
    <p>你好，{{ user.name }}</p>
  {% else %}
    <p>请先登录</p>
  {% endif %}
</section>
{% endblock %}`;

const INVALID_TEMPLATE = `{% if user %}
<div>
  {{ user.name }
</div>
{% endfor %}`;

export function TeraEditorDemo() {
    const [value, setValue] = useState(NORMAL_TEMPLATE);
    const [useMockDiagnostics, setUseMockDiagnostics] = useState(true);
    const [useAsyncValidate, setUseAsyncValidate] = useState(true);
    const [readOnly, setReadOnly] = useState(false);
    const [diagnosticCount, setDiagnosticCount] = useState(0);

    const diagnostics = useMemo<TeraEditorDiagnostic[] | undefined>(() => {
        if (!useMockDiagnostics) return undefined;
        if (!value.includes('title')) return [];

        return [
            {
                message: '演示：title 变量来自外部注入诊断。',
                severity: 'info',
                startLineNumber: 3,
                startColumn: 10,
                endLineNumber: 3,
                endColumn: 19,
                source: 'Demo',
                code: 'demo-title',
            },
        ];
    }, [useMockDiagnostics, value]);

    const validate = useAsyncValidate
        ? async (nextValue: string): Promise<TeraEditorDiagnostic[]> => {
            await new Promise(resolve => {
                window.setTimeout(resolve, 220);
            });

            const result: TeraEditorDiagnostic[] = [];

            if (nextValue.includes('danger')) {
                result.push({
                    message: '演示：检测到 danger 关键字，来自异步增强校验。',
                    severity: 'warning',
                    startLineNumber: 1,
                    startColumn: 1,
                    endLineNumber: 1,
                    endColumn: Math.min(nextValue.length + 1, 7),
                    source: 'AsyncValidate',
                    code: 'danger-keyword',
                });
            }

            return result;
        }
        : undefined;

    return (
        <div className="demo-section">
            <h4>Tera 模板编辑器</h4>
            <p style={{ color: 'var(--fc-color-text-secondary)' }}>
                提供 HTML + Tera 高亮、基础语法检查，以及外部 diagnostics / validate 扩展能力。
            </p>

            <div className="demo-row" style={{ marginBottom: 12, gap: 12, flexWrap: 'wrap' }}>
                <ButtonGroup>
                    <Button size="sm" onClick={() => setValue(NORMAL_TEMPLATE)}>
                        加载正常模板
                    </Button>
                    <Button size="sm" variant="warning" onClick={() => setValue(INVALID_TEMPLATE)}>
                        加载错误模板
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setValue('{% block content %}\n<p>danger</p>\n{% endblock %}')}>
                        加载异步校验示例
                    </Button>
                </ButtonGroup>

                <CheckButton
                    checked={useMockDiagnostics}
                    onChange={setUseMockDiagnostics}
                    labelLeft="关闭"
                    labelRight="注入 diagnostics"
                    size="sm"
                />
                <CheckButton
                    checked={useAsyncValidate}
                    onChange={setUseAsyncValidate}
                    labelLeft="关闭"
                    labelRight="启用 validate"
                    size="sm"
                />
                <CheckButton
                    checked={readOnly}
                    onChange={setReadOnly}
                    labelLeft="编辑"
                    labelRight="只读"
                    size="sm"
                />
            </div>

            <div className="demo-row" style={{ marginBottom: 12, color: 'var(--fc-color-text-secondary)' }}>
                当前问题数：{diagnosticCount}
            </div>

            <TeraEditor
                value={value}
                onChange={setValue}
                minHeight={420}
                diagnostics={diagnostics}
                validate={validate}
                readOnly={readOnly}
                onDiagnosticsChange={items => setDiagnosticCount(items.length)}
            />
        </div>
    );
}
