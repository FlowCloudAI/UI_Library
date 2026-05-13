import type * as Monaco from 'monaco-editor';

export const TERA_HTML_LANGUAGE_ID = 'tera-html';
export const TERA_EDITOR_LIGHT_THEME = 'fc-tera-editor-light';
export const TERA_EDITOR_DARK_THEME = 'fc-tera-editor-dark';

let languageReady = false;

// 这里使用的是库内设计令牌对应的固定色值映射。
// Monaco theme 不能直接读取 CSS 变量，因此需要在这里复制一份与
// `ui/src/style/index.css` 语义令牌一致的颜色方案。
const LIGHT_THEME_COLORS = {
    primary: '378ADD',          // --fc-color-primary
    primaryHover: '185FA5',     // --fc-color-primary-hover
    primarySubtle: 'EBF4FD',    // --fc-color-primary-subtle
    text: '1A1A1A',             // --fc-color-text
    textSecondary: '5F5F5F',    // --fc-color-text-secondary
    textTertiary: 'B3B3B3',     // --fc-color-text-tertiary
    background: 'FFFFFF',       // --fc-color-bg-elevated
    backgroundSecondary: 'F5F5F5', // --fc-color-bg-secondary
    border: 'D0D0D0',           // --fc-color-border
    borderLight: 'E0E0E0',      // --fc-color-border-light
    danger: 'E24B4A',           // --fc-color-danger
    success: '639922',          // --fc-color-success
    warning: 'D68000',          // --fc-color-warning
    info: '378ADD',             // --fc-color-info
    purple: '7C5CE8',           // --fc-color-purple
    teal: '00A3A3',             // --fc-color-teal
    orange: 'E8711A',           // --fc-color-orange
} as const;

const DARK_THEME_COLORS = {
    primary: '5DA4E8',          // --fc-color-primary（dark）
    primaryHover: '93C2F0',     // --fc-color-primary-hover（dark）
    primarySubtle: '1A3044',    // 近似 --fc-color-primary-subtle（dark）
    text: 'E8E8E6',             // --fc-color-text（dark）
    textSecondary: '9C9A92',    // --fc-color-text-secondary（dark）
    textTertiary: '636158',     // --fc-color-text-tertiary（dark）
    background: '282828',       // --fc-color-bg-elevated（dark）
    backgroundSecondary: '1A1A1A', // --fc-color-bg-secondary（dark）
    border: '333330',           // --fc-color-border（dark）
    borderLight: '2A2A28',      // --fc-color-border-light（dark）
    danger: 'F06060',           // --fc-color-danger（dark）
    success: '7EBB38',          // --fc-color-success（dark）
    warning: 'F0A030',          // --fc-color-warning（dark）
    info: '5DA4E8',             // --fc-color-info（dark）
    purple: 'A080F0',           // --fc-color-purple（dark）
    teal: '20C8C8',             // --fc-color-teal（dark）
    orange: 'F08840',           // --fc-color-orange（dark）
} as const;

function defineThemes(monaco: typeof Monaco) {
    const light = LIGHT_THEME_COLORS;
    const dark = DARK_THEME_COLORS;

    monaco.editor.defineTheme(TERA_EDITOR_LIGHT_THEME, {
        base: 'vs',
        inherit: true,
        rules: [
            {token: 'tera.comment', foreground: light.textTertiary},
            {token: 'tera.block.delimiter', foreground: light.purple},
            {token: 'tera.expression.delimiter', foreground: light.teal},
            {token: 'tera.keyword', foreground: light.purple, fontStyle: 'bold'},
            {token: 'tera.identifier', foreground: light.text},
            {token: 'tera.operator', foreground: light.orange},
            {token: 'tera.number', foreground: light.teal},
            {token: 'tera.string', foreground: light.success},
            {token: 'tag', foreground: light.primaryHover},
            {token: 'attribute.name', foreground: light.warning},
            {token: 'attribute.value', foreground: light.success},
        ],
        colors: {
            'editor.background': `#${light.background}`,
            'editor.foreground': `#${light.text}`,
            'editorLineNumber.foreground': `#${light.textTertiary}`,
            'editorIndentGuide.background1': `#${light.borderLight}`,
            'editor.selectionBackground': `#${light.primarySubtle}`,
            'editor.inactiveSelectionBackground': `#${light.backgroundSecondary}`,
            'editorCursor.foreground': `#${light.primary}`,
            'editor.lineHighlightBackground': `#${light.backgroundSecondary}`,
            'editorLineNumber.activeForeground': `#${light.primaryHover}`,
            'editorBracketMatch.border': `#${light.primary}`,
            'editorGutter.background': `#${light.background}`,
            'editorOverviewRuler.border': `#${light.border}`,
            'editorError.foreground': `#${light.danger}`,
            'editorWarning.foreground': `#${light.warning}`,
            'editorInfo.foreground': `#${light.info}`,
            'editorHoverWidget.background': `#${light.background}`,
            'editorHoverWidget.foreground': `#${light.text}`,
            'editorHoverWidget.border': `#${light.borderLight}`,
            'editorHoverWidget.statusBarBackground': `#${light.backgroundSecondary}`,
            'editorHoverWidget.highlightForeground': `#${light.primary}`,
        },
    });

    monaco.editor.defineTheme(TERA_EDITOR_DARK_THEME, {
        base: 'vs-dark',
        inherit: true,
        rules: [
            {token: 'tera.comment', foreground: dark.textTertiary},
            {token: 'tera.block.delimiter', foreground: dark.purple},
            {token: 'tera.expression.delimiter', foreground: dark.teal},
            {token: 'tera.keyword', foreground: dark.purple, fontStyle: 'bold'},
            {token: 'tera.identifier', foreground: dark.text},
            {token: 'tera.operator', foreground: dark.orange},
            {token: 'tera.number', foreground: dark.teal},
            {token: 'tera.string', foreground: dark.success},
            {token: 'tag', foreground: dark.primary},
            {token: 'attribute.name', foreground: dark.warning},
            {token: 'attribute.value', foreground: dark.success},
        ],
        colors: {
            'editor.background': `#${dark.background}`,
            'editor.foreground': `#${dark.text}`,
            'editorLineNumber.foreground': `#${dark.textTertiary}`,
            'editorLineNumber.activeForeground': `#${dark.primary}`,
            'editorIndentGuide.background1': `#${dark.borderLight}`,
            'editor.selectionBackground': `#${dark.primarySubtle}`,
            'editor.inactiveSelectionBackground': `#${dark.backgroundSecondary}`,
            'editorCursor.foreground': `#${dark.primaryHover}`,
            'editor.lineHighlightBackground': `#${dark.backgroundSecondary}`,
            'editorBracketMatch.border': `#${dark.primary}`,
            'editorGutter.background': `#${dark.background}`,
            'editorOverviewRuler.border': `#${dark.border}`,
            'editorError.foreground': `#${dark.danger}`,
            'editorWarning.foreground': `#${dark.warning}`,
            'editorInfo.foreground': `#${dark.info}`,
            'editorHoverWidget.background': `#${dark.background}`,
            'editorHoverWidget.foreground': `#${dark.text}`,
            'editorHoverWidget.border': `#${dark.borderLight}`,
            'editorHoverWidget.statusBarBackground': `#${dark.backgroundSecondary}`,
            'editorHoverWidget.highlightForeground': `#${dark.primary}`,
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
