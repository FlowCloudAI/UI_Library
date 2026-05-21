import {defineConfig} from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

const tauriPlatform = process.env.TAURI_ENV_PLATFORM
const buildTarget =
    tauriPlatform === 'windows'
        ? 'chrome105'
        : tauriPlatform
            ? 'safari13'
            : 'es2020'

// https://vite.dev/config/
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: [
            {
                find: 'react/jsx-runtime',
                replacement: path.resolve(__dirname, './node_modules/react/jsx-runtime.js'),
            },
            {
                find: 'react/jsx-dev-runtime',
                replacement: path.resolve(__dirname, './node_modules/react/jsx-dev-runtime.js'),
            },
            {
                find: 'react',
                replacement: path.resolve(__dirname, './node_modules/react'),
            },
            {
                find: 'react-dom',
                replacement: path.resolve(__dirname, './node_modules/react-dom'),
            },
            {
                find: 'flowcloudai-ui/style',
                replacement: path.resolve(__dirname, '../ui/dist/index.css'),
            },
            {
                find: 'flowcloudai-ui',
                replacement: path.resolve(__dirname, '../ui/dist/index.js'),
            },
        ],
        dedupe: ['react', 'react-dom'],
        extensions: ['.cts', '.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs', '.json']
    },
    // 防止 Vite 清除 Rust 显示的错误
    clearScreen: false,
    server: {
        port: 5174,
        // Tauri 工作于固定端口，如果端口不可用则报错
        strictPort: true,
        // 如果设置了 host，Tauri 则会使用
        host: process.env.HOST || false,
        hmr: process.env.HOST
            ? {
                protocol: 'ws',
                host: process.env.HOST,
                port: 1421,
            }
            : undefined,
        watch: {
            // 告诉 Vite 忽略监听 `src-tauri` 目录
            ignored: ['**/src-tauri/**'],
        },
    },
    // 添加有关当前构建目标的额外前缀，使这些 CLI 设置的 Tauri 环境变量可以在客户端代码中访问
    envPrefix: ['VITE_', 'TAURI_ENV_*'],
    build: {
        // Tauri 在 Windows 上使用 Chromium，在 macOS 和 Linux 上使用 WebKit
        target: buildTarget,
        // 在 debug 构建中不使用 minify
        minify: !process.env.TAURI_ENV_DEBUG ? 'esbuild' : false,
        // 在 debug 构建中生成 sourcemap
        sourcemap: !!process.env.TAURI_ENV_DEBUG,
    },
})
