// app/src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider, AlertProvider, ContextMenuProvider } from '../../ui/src';
import "../../ui/src/style/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme="dark">
            <AlertProvider>
                <ContextMenuProvider>
                    <App />
                </ContextMenuProvider>
            </AlertProvider>
        </ThemeProvider>
    </React.StrictMode>
);