import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { I18nProvider } from "./i18n/I18nProvider";
import "./styles.css";

if (import.meta.env.PROD) {
  import("@vercel/analytics")
    .then((mod) => mod.inject())
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
