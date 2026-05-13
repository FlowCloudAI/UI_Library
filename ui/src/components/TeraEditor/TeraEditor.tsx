import './TeraEditor.css';
import Editor, {type OnMount} from '@monaco-editor/react';
import React, {
    forwardRef,
    useCallback,
    useEffect,
    useImperativeHandle,
    useMemo,
    useRef,
    useState,
} from 'react';
import type {editor as MonacoEditorApi} from 'monaco-editor';
import {useTheme} from '../../ThemeProvider';
import {TERA_EDITOR_DARK_THEME, TERA_EDITOR_LIGHT_THEME, TERA_HTML_LANGUAGE_ID, ensureTeraMonacoLanguage} from './teraLanguage';
import {validateTeraTemplate} from './teraValidation';
import type {
    TeraEditorDiagnostic,
    TeraEditorInstance,
    TeraEditorMonaco,
    TeraEditorProps,
    TeraEditorRef,
} from './types';

const MARKER_OWNER = 'fc-tera-editor';

function normalizeDiagnostics(diagnostics: TeraEditorDiagnostic[] | undefined): TeraEditorDiagnostic[] {
    return (diagnostics ?? []).map(item => ({
        ...item,
        severity: item.severity ?? 'error',
        source: item.source ?? 'TeraEditor',
    }));
}

function toMarkerSeverity(monaco: TeraEditorMonaco, severity: TeraEditorDiagnostic['severity']) {
    switch (severity) {
        case 'warning':
            return monaco.MarkerSeverity.Warning;
        case 'info':
            return monaco.MarkerSeverity.Info;
        case 'hint':
            return monaco.MarkerSeverity.Hint;
        case 'error':
        default:
            return monaco.MarkerSeverity.Error;
    }
}

function getThemeName(resolvedTheme: 'light' | 'dark') {
    return resolvedTheme === 'dark' ? TERA_EDITOR_DARK_THEME : TERA_EDITOR_LIGHT_THEME;
}

function applyMarkers(
    monaco: TeraEditorMonaco | null,
    editor: TeraEditorInstance | null,
    diagnostics: TeraEditorDiagnostic[],
) {
    const model = editor?.getModel();
    if (!monaco || !model) return;

    monaco.editor.setModelMarkers(
        model,
        MARKER_OWNER,
        diagnostics.map(item => ({
            ...item,
            severity: toMarkerSeverity(monaco, item.severity),
        })),
    );
}

export const TeraEditor = forwardRef<TeraEditorRef, TeraEditorProps>(function TeraEditor({
    value,
    onChange,
    height,
    minHeight = 360,
    fontFamily = 'var(--fc-font-family)',
    fontSize = 14,
    lineHeight = 22,
    placeholder = '请输入 Tera 模板...',
    readOnly = false,
    className,
    style,
    diagnostics,
    validate,
    onDiagnosticsChange,
    showMinimap = false,
    wordWrap = 'on',
}: TeraEditorProps, ref) {
    const {resolvedTheme} = useTheme();
    const editorRef = useRef<TeraEditorInstance | null>(null);
    const monacoRef = useRef<TeraEditorMonaco | null>(null);
    const validationRequestRef = useRef(0);
    const [focused, setFocused] = useState(false);
    const [validateDiagnostics, setValidateDiagnostics] = useState<TeraEditorDiagnostic[]>([]);

    const builtInDiagnostics = useMemo(
        () => normalizeDiagnostics(validateTeraTemplate(value)),
        [value],
    );
    const propDiagnostics = useMemo(
        () => normalizeDiagnostics(diagnostics),
        [diagnostics],
    );

    useEffect(() => {
        let active = true;
        const requestId = validationRequestRef.current + 1;
        validationRequestRef.current = requestId;

        if (!validate) {
            setValidateDiagnostics([]);
            return () => {
                active = false;
            };
        }

        Promise.resolve(validate(value))
            .then(result => {
                if (!active || validationRequestRef.current !== requestId) return;
                setValidateDiagnostics(normalizeDiagnostics(result));
            })
            .catch(error => {
                if (!active || validationRequestRef.current !== requestId) return;
                console.warn('TeraEditor 外部校验失败：', error);
                setValidateDiagnostics([]);
            });

        return () => {
            active = false;
        };
    }, [validate, value]);

    const mergedDiagnostics = useMemo(
        () => [...builtInDiagnostics, ...propDiagnostics, ...validateDiagnostics],
        [builtInDiagnostics, propDiagnostics, validateDiagnostics],
    );

    useEffect(() => {
        applyMarkers(monacoRef.current, editorRef.current, mergedDiagnostics);
        onDiagnosticsChange?.(mergedDiagnostics);
    }, [mergedDiagnostics, onDiagnosticsChange]);

    useEffect(() => {
        if (!monacoRef.current) return;
        monacoRef.current.editor.setTheme(getThemeName(resolvedTheme));
    }, [resolvedTheme]);

    useImperativeHandle(ref, () => ({
        focus: () => editorRef.current?.focus(),
        getEditorInstance: () => editorRef.current,
        getMonacoInstance: () => monacoRef.current,
    }), []);

    const handleBeforeMount = useCallback((monaco: TeraEditorMonaco) => {
        ensureTeraMonacoLanguage(monaco);
        monaco.editor.setTheme(getThemeName(resolvedTheme));
    }, [resolvedTheme]);

    const handleMount = useCallback<OnMount>((editor, monaco) => {
        editorRef.current = editor as TeraEditorInstance;
        monacoRef.current = monaco as TeraEditorMonaco;

        editor.onDidFocusEditorText(() => setFocused(true));
        editor.onDidBlurEditorText(() => setFocused(false));

        applyMarkers(monacoRef.current, editorRef.current, mergedDiagnostics);
        monaco.editor.setTheme(getThemeName(resolvedTheme));
    }, [mergedDiagnostics, resolvedTheme]);

    const handleChange = useCallback((nextValue: string | undefined) => {
        onChange(nextValue ?? '');
    }, [onChange]);

    const editorOptions = useMemo<MonacoEditorApi.IStandaloneEditorConstructionOptions>(() => ({
        automaticLayout: true,
        minimap: {enabled: showMinimap},
        wordWrap,
        readOnly,
        lineNumbers: 'on',
        lineDecorationsWidth: 12,
        glyphMargin: false,
        fontFamily,
        fontSize,
        lineHeight,
        smoothScrolling: true,
        scrollBeyondLastLine: false,
        overviewRulerBorder: false,
        renderValidationDecorations: 'on',
        fixedOverflowWidgets: true,
        matchBrackets: 'always',
        tabSize: 2,
        insertSpaces: true,
        padding: {
            top: 12,
            bottom: 12,
        },
    }), [fontFamily, fontSize, lineHeight, readOnly, showMinimap, wordWrap]);

    const editorHeight = height ?? minHeight;
    const surfaceStyle: React.CSSProperties = {
        height: typeof editorHeight === 'number' ? `${editorHeight}px` : editorHeight,
        minHeight,
    };
    const rootStyle: React.CSSProperties = {
        '--fc-tera-editor-font-family': fontFamily,
        '--fc-tera-editor-font-size': `${fontSize}px`,
        '--fc-tera-editor-line-height': `${lineHeight}px`,
        ...style,
    } as React.CSSProperties;
    const statusClassName = [
        'fc-tera-editor__status',
        mergedDiagnostics.length > 0 ? 'fc-tera-editor__status--has-problems' : '',
    ].filter(Boolean).join(' ');

    return (
        <div className={['fc-tera-editor', className].filter(Boolean).join(' ')} style={rootStyle}>
            <div className="fc-tera-editor__surface" style={surfaceStyle}>
                {!value && !focused && placeholder && (
                    <div className="fc-tera-editor__placeholder">{placeholder}</div>
                )}
                <Editor
                    language={TERA_HTML_LANGUAGE_ID}
                    value={value}
                    onChange={handleChange}
                    beforeMount={handleBeforeMount}
                    onMount={handleMount}
                    options={editorOptions}
                />
            </div>
            <div className={statusClassName}>
                <span className="fc-tera-editor__status-count">
                    {mergedDiagnostics.length > 0 ? `${mergedDiagnostics.length} 个问题` : '语法检查通过'}
                </span>
                <span className="fc-tera-editor__status-note">
                    {readOnly ? '只读模式' : '支持内置校验与外部增强校验'}
                </span>
            </div>
        </div>
    );
});
