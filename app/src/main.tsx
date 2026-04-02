// app/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, AlertProvider, ContextMenuProvider } from 'flowcloudai-ui';

// @ts-ignore - CSS import, no types needed
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