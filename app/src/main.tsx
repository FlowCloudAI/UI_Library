// app/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { AlertProvider } from 'flowcloudai-ui/Alert';
import { ContextMenuProvider } from 'flowcloudai-ui/ContextMenu';
import { ThemeProvider } from 'flowcloudai-ui/ThemeProvider';

// @ts-ignore - CSS 导入，无需类型
import 'flowcloudai-ui/style'
import './theme-override.css'

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme={"system"}>
            <AlertProvider>
                <ContextMenuProvider>
                    <App/>
                </ContextMenuProvider>
            </AlertProvider>
        </ThemeProvider>
    </React.StrictMode>
);
