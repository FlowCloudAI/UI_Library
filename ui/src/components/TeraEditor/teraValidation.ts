import type {TeraEditorDiagnostic, TeraEditorDiagnosticSeverity} from './types';

type BlockKind = 'if' | 'for' | 'block' | 'macro' | 'raw';
type CloseKeyword = 'endif' | 'endfor' | 'endblock' | 'endmacro' | 'endraw';
type Position = { lineNumber: number; column: number };

interface RangeIndices {
    startIndex: number;
    endIndex: number;
}

interface DelimitedSection {
    startIndex: number;
    endIndex: number;
    contentStart: number;
    contentEnd: number;
    closed: boolean;
}

interface BlockKeywordInfo extends RangeIndices {
    keyword: string;
}

interface BlockStackEntry extends RangeIndices {
    kind: BlockKind;
}

const OPEN_BLOCK_KEYWORDS: ReadonlySet<BlockKind> = new Set(['if', 'for', 'block', 'macro', 'raw']);
const CLOSE_BLOCK_KEYWORDS: Record<CloseKeyword, BlockKind> = {
    endif: 'if',
    endfor: 'for',
    endblock: 'block',
    endmacro: 'macro',
    endraw: 'raw',
};

function buildLineStarts(text: string): number[] {
    const lineStarts = [0];
    for (let index = 0; index < text.length; index += 1) {
        if (text.charCodeAt(index) === 10) {
            lineStarts.push(index + 1);
        }
    }
    return lineStarts;
}

function indexToPosition(index: number, lineStarts: number[]): Position {
    let low = 0;
    let high = lineStarts.length - 1;

    while (low <= high) {
        const mid = Math.floor((low + high) / 2);
        const lineStart = lineStarts[mid];
        const nextLineStart = mid + 1 < lineStarts.length ? lineStarts[mid + 1] : Number.MAX_SAFE_INTEGER;

        if (index < lineStart) {
            high = mid - 1;
            continue;
        }

        if (index >= nextLineStart) {
            low = mid + 1;
            continue;
        }

        return {
            lineNumber: mid + 1,
            column: index - lineStart + 1,
        };
    }

    const lastLine = lineStarts.length - 1;
    return {
        lineNumber: lastLine + 1,
        column: Math.max(1, index - lineStarts[lastLine] + 1),
    };
}

function createDiagnostic(
    lineStarts: number[],
    range: RangeIndices,
    message: string,
    severity: TeraEditorDiagnosticSeverity = 'error',
    code?: string,
): TeraEditorDiagnostic {
    const safeEndIndex = Math.max(range.startIndex + 1, range.endIndex);
    const start = indexToPosition(range.startIndex, lineStarts);
    const end = indexToPosition(safeEndIndex, lineStarts);

    return {
        message,
        severity,
        startLineNumber: start.lineNumber,
        startColumn: start.column,
        endLineNumber: end.lineNumber,
        endColumn: end.column,
        source: 'TeraEditor',
        code,
    };
}

function readDelimitedSection(
    text: string,
    startIndex: number,
    kind: 'expression' | 'block' | 'comment',
): DelimitedSection {
    const openLength = text.charAt(startIndex + 2) === '-' ? 3 : 2;
    const closeNeedle = kind === 'expression' ? '}}' : kind === 'block' ? '%}' : '#}';
    const closeIndex = text.indexOf(closeNeedle, startIndex + openLength);

    if (closeIndex === -1) {
        return {
            startIndex,
            endIndex: text.length,
            contentStart: startIndex + openLength,
            contentEnd: text.length,
            closed: false,
        };
    }

    const closeStartIndex = closeIndex > startIndex + openLength && text.charAt(closeIndex - 1) === '-'
        ? closeIndex - 1
        : closeIndex;
    const closeLength = closeStartIndex === closeIndex ? 2 : 3;

    return {
        startIndex,
        endIndex: closeStartIndex + closeLength,
        contentStart: startIndex + openLength,
        contentEnd: closeStartIndex,
        closed: true,
    };
}

function extractBlockKeyword(text: string, section: DelimitedSection): BlockKeywordInfo | null {
    const content = text.slice(section.contentStart, section.contentEnd);
    const offset = content.search(/\S/u);

    if (offset === -1) return null;

    const match = /^[A-Za-z_][A-Za-z0-9_]*/u.exec(content.slice(offset));
    if (!match) return null;

    const startIndex = section.contentStart + offset;
    return {
        keyword: match[0],
        startIndex,
        endIndex: startIndex + match[0].length,
    };
}

function detectTokenType(text: string, index: number): 'expression' | 'block' | 'comment' | null {
    if (text.charAt(index) !== '{') return null;
    const second = text.charAt(index + 1);
    if (second === '{') return 'expression';
    if (second === '%') return 'block';
    if (second === '#') return 'comment';
    return null;
}

function isCloseKeyword(keyword: string): keyword is CloseKeyword {
    return keyword in CLOSE_BLOCK_KEYWORDS;
}

export function validateTeraTemplate(value: string): TeraEditorDiagnostic[] {
    const diagnostics: TeraEditorDiagnostic[] = [];
    const lineStarts = buildLineStarts(value);
    const blockStack: BlockStackEntry[] = [];

    let index = 0;
    while (index < value.length) {
        const activeRaw = blockStack[blockStack.length - 1]?.kind === 'raw';
        const tokenType = detectTokenType(value, index);

        if (!tokenType) {
            index += 1;
            continue;
        }

        if (activeRaw && tokenType !== 'block') {
            index += 1;
            continue;
        }

        const section = readDelimitedSection(value, index, tokenType);

        if (activeRaw && tokenType === 'block') {
            if (!section.closed) {
                index += 1;
                continue;
            }

            const keywordInfo = extractBlockKeyword(value, section);
            if (keywordInfo?.keyword === 'endraw') {
                blockStack.pop();
            }
            index = section.endIndex;
            continue;
        }

        if (!section.closed) {
            const code = tokenType === 'expression'
                ? 'unclosed-expression'
                : tokenType === 'block'
                    ? 'unclosed-block'
                    : 'unclosed-comment';
            const label = tokenType === 'expression'
                ? '表达式'
                : tokenType === 'block'
                    ? '语句块'
                    : '注释块';
            diagnostics.push(createDiagnostic(
                lineStarts,
                {startIndex: section.startIndex, endIndex: section.startIndex + (value.charAt(section.startIndex + 2) === '-' ? 3 : 2)},
                `未闭合的 Tera${label}。`,
                'error',
                code,
            ));
            index = value.length;
            continue;
        }

        if (tokenType !== 'block') {
            index = section.endIndex;
            continue;
        }

        const keywordInfo = extractBlockKeyword(value, section);
        if (!keywordInfo) {
            index = section.endIndex;
            continue;
        }

        const {keyword} = keywordInfo;

        if (OPEN_BLOCK_KEYWORDS.has(keyword as BlockKind)) {
            blockStack.push({
                kind: keyword as BlockKind,
                startIndex: keywordInfo.startIndex,
                endIndex: keywordInfo.endIndex,
            });
            index = section.endIndex;
            continue;
        }

        if (isCloseKeyword(keyword)) {
            const expectedKind = CLOSE_BLOCK_KEYWORDS[keyword];
            const current = blockStack[blockStack.length - 1];

            if (!current) {
                diagnostics.push(createDiagnostic(
                    lineStarts,
                    keywordInfo,
                    `多余的结束标签 ${keyword}。`,
                    'error',
                    'orphan-close-block',
                ));
                index = section.endIndex;
                continue;
            }

            if (current.kind !== expectedKind) {
                diagnostics.push(createDiagnostic(
                    lineStarts,
                    keywordInfo,
                    `结束标签 ${keyword} 与当前块 ${current.kind} 不匹配。`,
                    'error',
                    'mismatched-close-block',
                ));
                index = section.endIndex;
                continue;
            }

            blockStack.pop();
            index = section.endIndex;
            continue;
        }

        if (keyword === 'else' || keyword === 'elif') {
            const current = blockStack[blockStack.length - 1];
            if (!current || current.kind !== 'if') {
                diagnostics.push(createDiagnostic(
                    lineStarts,
                    keywordInfo,
                    `${keyword} 只能出现在 if 块内部。`,
                    'error',
                    'invalid-branch-keyword',
                ));
            }
            index = section.endIndex;
            continue;
        }

        index = section.endIndex;
    }

    while (blockStack.length > 0) {
        const current = blockStack.pop()!;
        const closeKeyword = current.kind === 'if'
            ? 'endif'
            : current.kind === 'for'
                ? 'endfor'
                : current.kind === 'block'
                    ? 'endblock'
                    : current.kind === 'macro'
                        ? 'endmacro'
                        : 'endraw';
        diagnostics.push(createDiagnostic(
            lineStarts,
            current,
            `缺少结束标签 ${closeKeyword}。`,
            'error',
            'missing-close-block',
        ));
    }

    return diagnostics;
}
