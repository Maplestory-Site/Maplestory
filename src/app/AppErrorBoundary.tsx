import type { ReactNode } from "react";
import { Component } from "react";

type AppErrorBoundaryProps = {
  children: ReactNode;
};

type AppErrorBoundaryState = {
  error: Error | null;
};

export class AppErrorBoundary extends Component<AppErrorBoundaryProps, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[app] Render error:", error);
  }

  render() {
    const { error } = this.state;

    if (!error) {
      return this.props.children;
    }

    return (
      <div style={{ padding: "32px", fontFamily: "Inter, sans-serif" }}>
        <h1 style={{ fontSize: "20px", marginBottom: "12px" }}>App Error</h1>
        <p style={{ marginBottom: "8px" }}>האתר נפל בשלב הרינדור. הנה השגיאה:</p>
        <pre style={{ whiteSpace: "pre-wrap", background: "#111", color: "#f4f4f4", padding: "16px", borderRadius: "8px" }}>
          {error.message}
        </pre>
      </div>
    );
  }
}
