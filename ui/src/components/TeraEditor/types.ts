import type * as Monaco from 'monaco-editor';
import type React from 'react';

export type TeraEditorDiagnosticSeverity = 'error' | 'warning' | 'info' | 'hint';
export type TeraEditorMonaco = typeof Monaco;
export type TeraEditorInstance = Monaco.editor.IStandaloneCodeEditor;

export interface TeraEditorDiagnostic {
    message: string;
    severity?: TeraEditorDiagnosticSeverity;
    startLineNumber: number;
    startColumn: number;
    endLineNumber: number;
    endColumn: number;
    source?: string;
    code?: string;
}

export interface TeraEditorRef {
    focus: () => void;
    getEditorInstance: () => TeraEditorInstance | null;
    getMonacoInstance: () => TeraEditorMonaco | null;
}

export interface TeraEditorProps {
    value: string;
    onChange: (value: string) => void;
    height?: number | string;
    minHeight?: number;
    placeholder?: string;
    readOnly?: boolean;
    className?: string;
    style?: React.CSSProperties;
    diagnostics?: TeraEditorDiagnostic[];
    validate?: (value: string) => TeraEditorDiagnostic[] | Promise<TeraEditorDiagnostic[]>;
    onDiagnosticsChange?: (diagnostics: TeraEditorDiagnostic[]) => void;
    showMinimap?: boolean;
    wordWrap?: 'off' | 'on';
}
