import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import { ThemeProvider } from 'flowcloudai-ui'
import "flowcloudai-ui/style";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme={"system"}>
            <App/>
        </ThemeProvider>
    </React.StrictMode>
);