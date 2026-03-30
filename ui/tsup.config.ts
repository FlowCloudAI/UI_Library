// tsup.config.ts
import {defineConfig} from "tsup";

export default defineConfig({
    entry: ['src/index.ts'],
    format: ['esm'],
    dts: true,
    clean: true,
    tsconfig: 'tsconfig.app.json',
    // 不用 injectStyle，改为生成独立 CSS 文件
    // 消费者 import 'flowcloudai-ui/dist/index.css'
})