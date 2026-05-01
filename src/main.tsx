import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./app/router";
import { AppErrorBoundary } from "./app/AppErrorBoundary";
import { I18nProvider } from "./i18n/I18nProvider";
import { ComingSoonPage } from "./pages/ComingSoonPage";
import "./styles.css";

const SHOW_COMING_SOON = true;

if (import.meta.env.PROD) {
  import("@vercel/analytics")
    .then((mod) => mod.inject())
    .catch(() => {});
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <I18nProvider>
        {SHOW_COMING_SOON ? <ComingSoonPage /> : <RouterProvider router={router} />}
      </I18nProvider>
    </AppErrorBoundary>
  </React.StrictMode>
);
