import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./appkit";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme";
import { ToastProvider } from "./components/Toast";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <ToastProvider>
        <App />
      </ToastProvider>
    </ThemeProvider>
  </StrictMode>
);
