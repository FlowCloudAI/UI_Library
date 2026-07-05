import {readFileSync, readdirSync, statSync} from 'node:fs'
import {join, relative, sep} from 'node:path'
import {fileURLToPath} from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const failures = []

const normalizePath = (path) => path.split(sep).join('/')

const readUtf8 = (path) => readFileSync(path, 'utf8')

const walkFiles = (dir, exts, ignoredParts = []) => {
    const result = []

    const walk = (current) => {
        for (const entry of readdirSync(current)) {
            const fullPath = join(current, entry)
            const rel = normalizePath(relative(root, fullPath))

            if (ignoredParts.some((part) => rel.includes(part))) {
                continue
            }

            const stat = statSync(fullPath)
            if (stat.isDirectory()) {
                walk(fullPath)
                continue
            }

            if (exts.some((ext) => entry.endsWith(ext))) {
                result.push(fullPath)
            }
        }
    }

    walk(join(root, dir))
    return result
}

const fail = (message) => failures.push(message)

const assertNoPattern = (files, pattern, description) => {
    for (const file of files) {
        const text = readUtf8(file)
        const rel = normalizePath(relative(root, file))

        if (pattern.test(text)) {
            fail(`${rel}: ${description}`)
        }
    }
}

const sourceFiles = [
    ...walkFiles('ui/src', ['.ts', '.tsx']),
    ...walkFiles('app/src', ['.ts', '.tsx']),
]
const currentDocs = [
    join(root, 'README.md'),
    join(root, 'AGENTS.md'),
]

assertNoPattern(
    walkFiles('app/src', ['.ts', '.tsx']),
    /(?:\.\.\/){1,}ui\/src|(?:\.\.\\){1,}ui\\src/,
    '演示应用必须从 flowcloudai-ui 包名导入，不能相对导入 ui/src',
)

assertNoPattern(
    walkFiles('ui/src', ['.ts', '.tsx']),
    /@tauri-apps\/api|App\/src|worldflow_core|core_ai_client/,
    '组件库不能反向依赖 App、Tauri 或 Rust 业务层',
)

assertNoPattern(
    [join(root, 'ui/src/index.ts')],
    /^export\s+\*/m,
    '公共入口必须使用显式导出白名单，不能使用 export *',
)

assertNoPattern(
    [...sourceFiles, ...currentDocs],
    /MapShapeEditor|MapDeckPreview|MapShapeSvgEditor|MapShapeViewport/,
    '已删除地图编辑组件不能继续出现在当前源码或当前入口文档中',
)

const lineBaselines = new Set([
    'ui/src/components/Tree/Tree.tsx',
    'ui/src/components/MessageBox/MessageBox.tsx',
    'ui/src/components/Bar/TabBar.tsx',
    'ui/src/components/MarkdownEditor/MarkdownEditor.tsx',
    'ui/src/components/Slider/Slider.tsx',
    'ui/src/components/Select/Select.tsx',
    'ui/src/components/TeraEditor/teraValidation.ts',
    'ui/src/components/MessageBox/MessageBox.css',
    'ui/src/components/Tree/Tree.css',
    'ui/src/components/Bar/TabBar.css',
    'ui/src/components/Button/Button.css',
    'ui/src/style/index.css',
    'app/src/demos/TreeDemo.tsx',
    'app/src/demos/MessageBoxDemo.tsx',
    'app/src/demos/SemanticTokensDemo.tsx',
    'app/src/demos/SemanticTokensDemo.css',
])

const checkedLineFiles = [
    ...walkFiles('ui/src', ['.ts', '.tsx', '.css']),
    ...walkFiles('app/src', ['.ts', '.tsx', '.css']),
]

for (const file of checkedLineFiles) {
    const rel = normalizePath(relative(root, file))
    const lineCount = readUtf8(file).split(/\r?\n/).length
    const limit = rel.endsWith('.css') ? 300 : 300

    if (lineCount > limit && !lineBaselines.has(rel)) {
        fail(`${rel}: ${lineCount} 行，超过 ${limit} 行；新增大文件需要先拆分或加入明确治理计划`)
    }
}

if (failures.length > 0) {
    console.error('边界检查失败：')
    for (const failure of failures) {
        console.error(`- ${failure}`)
    }
    process.exit(1)
}

console.log('边界检查通过')
