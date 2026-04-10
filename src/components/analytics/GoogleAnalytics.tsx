import { useEffect } from "react";
import { useLocation } from "react-router-dom";

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID?.trim();

export function GoogleAnalytics() {
  const location = useLocation();

  useEffect(() => {
    if (!measurementId || typeof window === "undefined" || document.getElementById("ga-script")) {
      return;
    }

    const externalScript = document.createElement("script");
    externalScript.id = "ga-script";
    externalScript.async = true;
    externalScript.src = `https://www.googletagmanager.com/gtag/js?id=${measurementId}`;
    document.head.appendChild(externalScript);

    const inlineScript = document.createElement("script");
    inlineScript.id = "ga-inline";
    inlineScript.text = `
      window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      window.gtag = gtag;
      gtag('js', new Date());
      gtag('config', '${measurementId}', { send_page_view: false });
    `;
    document.head.appendChild(inlineScript);
  }, []);

  useEffect(() => {
    if (!measurementId || typeof window === "undefined" || typeof window.gtag !== "function") {
      return;
    }

    window.gtag("config", measurementId, {
      page_path: `${location.pathname}${location.search}${location.hash}`,
      page_title: document.title
    });
  }, [location]);

  return null;
}
