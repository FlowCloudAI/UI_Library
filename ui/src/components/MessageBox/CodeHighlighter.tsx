// CodeHighlighter.tsx
// 重量级语法高亮：PrismLight + 17 种 Prism 语法在本模块求值并注册。
// 仅由 MessageBox 的 CodeBlock 在实际渲染围栏代码块时通过动态 import() 拉取，
// 使不含代码块的会话不必常驻 react-syntax-highlighter + refractor 语法体积。
import {PrismLight as SyntaxHighlighter} from 'react-syntax-highlighter';
import bash from 'react-syntax-highlighter/dist/esm/languages/prism/bash.js';
import c from 'react-syntax-highlighter/dist/esm/languages/prism/c.js';
import cpp from 'react-syntax-highlighter/dist/esm/languages/prism/cpp.js';
import csharp from 'react-syntax-highlighter/dist/esm/languages/prism/csharp.js';
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css.js';
import go from 'react-syntax-highlighter/dist/esm/languages/prism/go.js';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java.js';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript.js';
import json from 'react-syntax-highlighter/dist/esm/languages/prism/json.js';
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx.js';
import markdown from 'react-syntax-highlighter/dist/esm/languages/prism/markdown.js';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python.js';
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust.js';
import sql from 'react-syntax-highlighter/dist/esm/languages/prism/sql.js';
import tsx from 'react-syntax-highlighter/dist/esm/languages/prism/tsx.js';
import typescript from 'react-syntax-highlighter/dist/esm/languages/prism/typescript.js';
import yaml from 'react-syntax-highlighter/dist/esm/languages/prism/yaml.js';

SyntaxHighlighter.registerLanguage('bash', bash);
SyntaxHighlighter.registerLanguage('c', c);
SyntaxHighlighter.registerLanguage('cpp', cpp);
SyntaxHighlighter.registerLanguage('csharp', csharp);
SyntaxHighlighter.registerLanguage('css', css);
SyntaxHighlighter.registerLanguage('go', go);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('json', json);
SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('markdown', markdown);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('rust', rust);
SyntaxHighlighter.registerLanguage('sql', sql);
SyntaxHighlighter.registerLanguage('tsx', tsx);
SyntaxHighlighter.registerLanguage('typescript', typescript);
SyntaxHighlighter.registerLanguage('yaml', yaml);
SyntaxHighlighter.alias('bash', ['sh', 'shell', 'zsh']);
SyntaxHighlighter.alias('cpp', ['c++']);
SyntaxHighlighter.alias('csharp', ['cs']);
SyntaxHighlighter.alias('javascript', ['js', 'mjs', 'cjs']);
SyntaxHighlighter.alias('markdown', ['md']);
SyntaxHighlighter.alias('typescript', ['ts']);
SyntaxHighlighter.alias('yaml', ['yml']);

export interface CodeHighlighterProps {
    /** 已归一化的规范语言名（由 MessageBox 的 getCodeLanguage 保证受支持）。 */
    language: string;
    className?: string;
    code: string;
}

export default function CodeHighlighter({language, className, code}: CodeHighlighterProps) {
    return (
        <SyntaxHighlighter
            className={className}
            language={language}
            PreTag="pre"
            CodeTag="span"
            useInlineStyles={false}
        >
            {code}
        </SyntaxHighlighter>
    );
}
