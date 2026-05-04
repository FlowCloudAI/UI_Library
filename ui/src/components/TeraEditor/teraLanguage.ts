import type * as Monaco from 'monaco-editor';

export const TERA_HTML_LANGUAGE_ID = 'tera-html';
export const TERA_EDITOR_LIGHT_THEME = 'fc-tera-editor-light';
export const TERA_EDITOR_DARK_THEME = 'fc-tera-editor-dark';

let languageReady = false;

function defineThemes(monaco: typeof Monaco) {
    monaco.editor.defineTheme(TERA_EDITOR_LIGHT_THEME, {
        base: 'vs',
        inherit: true,
        rules: [
            {token: 'tera.comment', foreground: '6B7280'},
            {token: 'tera.block.delimiter', foreground: '7C3AED'},
            {token: 'tera.expression.delimiter', foreground: '0F766E'},
            {token: 'tera.keyword', foreground: '7C3AED', fontStyle: 'bold'},
            {token: 'tera.identifier', foreground: '1F2937'},
            {token: 'tera.operator', foreground: 'C2410C'},
            {token: 'tera.number', foreground: '0F766E'},
            {token: 'tera.string', foreground: '047857'},
            {token: 'tag', foreground: '185FA5'},
            {token: 'attribute.name', foreground: '9A3412'},
            {token: 'attribute.value', foreground: '047857'},
        ],
        colors: {
            'editor.background': '#FFFFFF',
            'editor.foreground': '#1A1A1A',
            'editorLineNumber.foreground': '#9CA3AF',
            'editorLineNumber.activeForeground': '#5F5F5F',
            'editorIndentGuide.background1': '#E5E7EB',
            'editor.selectionBackground': '#DBEAFE',
            'editor.inactiveSelectionBackground': '#E5EEF8',
        },
    });

    monaco.editor.defineTheme(TERA_EDITOR_DARK_THEME, {
        base: 'vs-dark',
        inherit: true,
        rules: [
            {token: 'tera.comment', foreground: '6B7280'},
            {token: 'tera.block.delimiter', foreground: 'C084FC'},
            {token: 'tera.expression.delimiter', foreground: '5EEAD4'},
            {token: 'tera.keyword', foreground: 'C084FC', fontStyle: 'bold'},
            {token: 'tera.identifier', foreground: 'E5E7EB'},
            {token: 'tera.operator', foreground: 'FDBA74'},
            {token: 'tera.number', foreground: '5EEAD4'},
            {token: 'tera.string', foreground: '86EFAC'},
            {token: 'tag', foreground: '7DD3FC'},
            {token: 'attribute.name', foreground: 'FDBA74'},
            {token: 'attribute.value', foreground: '86EFAC'},
        ],
        colors: {
            'editor.background': '#111827',
            'editor.foreground': '#E5E7EB',
            'editorLineNumber.foreground': '#6B7280',
            'editorLineNumber.activeForeground': '#D1D5DB',
            'editorIndentGuide.background1': '#1F2937',
            'editor.selectionBackground': '#1E40AF55',
            'editor.inactiveSelectionBackground': '#1F293755',
        },
    });
}

export function ensureTeraMonacoLanguage(monaco: typeof Monaco) {
    if (languageReady) return;
    languageReady = true;

    monaco.languages.register({id: TERA_HTML_LANGUAGE_ID});
    monaco.languages.setLanguageConfiguration(TERA_HTML_LANGUAGE_ID, {
        comments: {
            blockComment: ['{#', '#}'],
        },
        brackets: [
            ['{', '}'],
            ['[', ']'],
            ['(', ')'],
            ['<', '>'],
        ],
        autoClosingPairs: [
            {open: '{', close: '}'},
            {open: '[', close: ']'},
            {open: '(', close: ')'},
            {open: '"', close: '"'},
            {open: '\'', close: '\''},
        ],
        surroundingPairs: [
            {open: '{', close: '}'},
            {open: '[', close: ']'},
            {open: '(', close: ')'},
            {open: '"', close: '"'},
            {open: '\'', close: '\''},
        ],
    });

    monaco.languages.setMonarchTokensProvider(TERA_HTML_LANGUAGE_ID, {
        defaultToken: '',
        tokenPostfix: '.tera',
        tokenizer: {
            root: [
                [/\{#-?/, 'tera.comment', '@teraComment'],
                [/\{\{-?/, 'tera.expression.delimiter', '@teraExpression'],
                [/\{%-?/, 'tera.block.delimiter', '@teraBlock'],
                [/<!DOCTYPE/, 'metatag', '@doctype'],
                [/<!--/, 'comment', '@htmlComment'],
                [/(<\/)([\w:-]+)(\s*)(>)/, ['delimiter', 'tag', '', 'delimiter']],
                [/(<)([\w:-]+)/, ['delimiter', 'tag'], '@htmlTag'],
                [/[^<{]+/, ''],
                [/./, ''],
            ],
            doctype: [
                [/[^>]+/, 'metatag.content'],
                [/>/, 'metatag', '@pop'],
            ],
            htmlComment: [
                [/-->/, 'comment', '@pop'],
                [/[^-]+/, 'comment.content'],
                [/./, 'comment.content'],
            ],
            htmlTag: [
                [/\s+/, ''],
                [/\{#-?/, 'tera.comment', '@teraComment'],
                [/\{\{-?/, 'tera.expression.delimiter', '@teraExpression'],
                [/\{%-?/, 'tera.block.delimiter', '@teraBlock'],
                [/([\w:-]+)(\s*=\s*)("[^"]*")/, ['attribute.name', '', 'attribute.value']],
                [/([\w:-]+)(\s*=\s*)('[^']*')/, ['attribute.name', '', 'attribute.value']],
                [/[\w:-]+/, 'attribute.name'],
                [/\/?>/, 'delimiter', '@pop'],
            ],
            teraComment: [
                [/-?#}/, 'tera.comment', '@pop'],
                [/[^#-]+/, 'tera.comment'],
                [/./, 'tera.comment'],
            ],
            teraExpression: [
                [/-?}}/, 'tera.expression.delimiter', '@pop'],
                [/\b(true|false|none|and|or|not|in|is)\b/, 'tera.keyword'],
                [/\b(loop|self|super)\b/, 'tera.keyword'],
                [/\b[A-Za-z_][A-Za-z0-9_]*\b/, 'tera.identifier'],
                [/\d+(?:\.\d+)?/, 'tera.number'],
                [/"([^"\\]|\\.)*"/, 'tera.string'],
                [/'([^'\\]|\\.)*'/, 'tera.string'],
                [/[|=<>!:+\-/*%.(),\[\]]/, 'tera.operator'],
                [/\s+/, ''],
            ],
            teraBlock: [
                [/-?%}/, 'tera.block.delimiter', '@pop'],
                [/\b(if|elif|else|endif|for|endfor|block|endblock|macro|endmacro|set|include|extends|import|from|raw|endraw|filter|endfilter)\b/, 'tera.keyword'],
                [/\b(true|false|none|and|or|not|in|is)\b/, 'tera.keyword'],
                [/\b[A-Za-z_][A-Za-z0-9_]*\b/, 'tera.identifier'],
                [/\d+(?:\.\d+)?/, 'tera.number'],
                [/"([^"\\]|\\.)*"/, 'tera.string'],
                [/'([^'\\]|\\.)*'/, 'tera.string'],
                [/[|=<>!:+\-/*%.(),\[\]]/, 'tera.operator'],
                [/\s+/, ''],
            ],
        },
    });

    defineThemes(monaco);
}
