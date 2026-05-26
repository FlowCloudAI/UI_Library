import {useMemo, useState} from 'react';
import {Button, ButtonGroup} from 'flowcloudai-ui/Button';
import {CheckButton} from 'flowcloudai-ui/CheckButton';
import {TeraEditor, type TeraEditorDiagnostic} from 'flowcloudai-ui/TeraEditor';

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

const EXTERNAL_DIAGNOSTIC_TEMPLATE = `{% block content %}
<section class="hero">
  <h1>{{ title }}</h1>
  <p>{{ external_hint }}</p>
</section>
{% endblock %}`;

export function TeraEditorDemo() {
    const [value, setValue] = useState(NORMAL_TEMPLATE);
    const [useMockDiagnostics, setUseMockDiagnostics] = useState(false);
    const [useAsyncValidate, setUseAsyncValidate] = useState(true);
    const [readOnly, setReadOnly] = useState(false);
    const [diagnosticCount, setDiagnosticCount] = useState(0);
    const [fontSize, setFontSize] = useState(14);
    const [lineHeight, setLineHeight] = useState(22);
    const [fontFamily, setFontFamily] = useState<'var(--fc-font-family)' | '\'Consolas\', \'Courier New\', monospace'>('var(--fc-font-family)');

    const diagnostics = useMemo<TeraEditorDiagnostic[] | undefined>(() => {
        if (!useMockDiagnostics) return undefined;
        if (!value.includes('external_hint')) return [];

        return [
            {
                message: '演示：这个问题来自外部直接注入的 diagnostics。',
                severity: 'info',
                startLineNumber: 4,
                startColumn: 8,
                endLineNumber: 4,
                endColumn: 25,
                source: 'Demo',
                code: 'demo-external-diagnostic',
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
                    <Button size="sm" variant="secondary" onClick={() => setValue(EXTERNAL_DIAGNOSTIC_TEMPLATE)}>
                        加载外部诊断示例
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => setValue('{% block content %}\n<p>danger</p>\n{% endblock %}')}>
                        加载异步校验示例
                    </Button>
                </ButtonGroup>

                <ButtonGroup>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setFontSize(value => Math.max(12, value - 1))}
                    >
                        缩小字号
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setFontSize(value => Math.min(20, value + 1))}
                    >
                        放大字号
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setLineHeight(value => Math.max(18, value - 2))}
                    >
                        紧凑行高
                    </Button>
                    <Button
                        size="sm"
                        variant="secondary"
                        onClick={() => setLineHeight(value => Math.min(32, value + 2))}
                    >
                        舒展行高
                    </Button>
                    <Button
                        size="sm"
                        variant={fontFamily === 'var(--fc-font-family)' ? 'primary' : 'secondary'}
                        onClick={() => setFontFamily('var(--fc-font-family)')}
                    >
                        主题字体
                    </Button>
                    <Button
                        size="sm"
                        variant={fontFamily !== 'var(--fc-font-family)' ? 'primary' : 'secondary'}
                        onClick={() => setFontFamily('\'Consolas\', \'Courier New\', monospace')}
                    >
                        等宽字体
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
                当前问题数：{diagnosticCount}，字号：{fontSize}px，行高：{lineHeight}px，字体：
                {fontFamily === 'var(--fc-font-family)' ? '主题字体' : 'Consolas / Courier New'}
            </div>

            <TeraEditor
                value={value}
                onChange={setValue}
                minHeight={420}
                fontFamily={fontFamily}
                fontSize={fontSize}
                lineHeight={lineHeight}
                diagnostics={diagnostics}
                validate={validate}
                readOnly={readOnly}
                onDiagnosticsChange={items => setDiagnosticCount(items.length)}
            />
        </div>
    );
}
