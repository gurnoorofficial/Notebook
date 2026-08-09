import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./appkit";
import "./index.css";
import App from "./App.jsx";
import { ThemeProvider } from "./theme";
import { ToastProvider } from "./components/Toast";
import { LoadingBarProvider } from "./components/LoadingBar";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <ThemeProvider>
      <LoadingBarProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </LoadingBarProvider>
    </ThemeProvider>
  </StrictMode>
);

if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("/sw.js").catch((error) => {
      console.warn("Service worker registration failed.", error);
    });
  });
}
