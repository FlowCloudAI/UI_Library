// src/vite-env.d.ts
/// <reference types="vite/client" />

declare module '*.css' {
  const content: Record<string, string>;
  export default content;
}

// 支持纯 CSS 副作用导入
declare module '*.css' {
  export default string;
}