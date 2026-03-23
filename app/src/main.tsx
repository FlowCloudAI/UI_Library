import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import {ThemeProvider, AlertProvider} from 'flowcloudai-ui'
import "flowcloudai-ui/style";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ThemeProvider defaultTheme={"dark"}>
            <AlertProvider>
                <App/>
            </AlertProvider>
        </ThemeProvider>
    </React.StrictMode>
);