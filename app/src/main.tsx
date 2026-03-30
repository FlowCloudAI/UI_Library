// app/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import 'flowcloudai-ui/style'
import { ThemeProvider, AlertProvider, ContextMenuProvider } from 'flowcloudai-ui';
import './theme-override.css'; // must come after flowcloudai-ui to win the cascade

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme={"system"}>
            <AlertProvider>
                <ContextMenuProvider>
                    <App />
                </ContextMenuProvider>
            </AlertProvider>
        </ThemeProvider>
    </React.StrictMode>
);