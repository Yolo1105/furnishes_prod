"use client";

import React, { Component, type ErrorInfo, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

const MAX_RETRIES = 3;

interface State {
  hasError: boolean;
  error?: Error;
  retryCount: number;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      const { retryCount } = this.state;
      const canRetry = retryCount < MAX_RETRIES;
      return (
        <div className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
          <p className="text-foreground mb-2 text-sm font-medium">
            Something went wrong
          </p>
          <p className="text-muted-foreground mb-4 text-xs">
            Refresh the page or try again later.
          </p>
          {canRetry ? (
            <button
              type="button"
              onClick={() =>
                this.setState((s) => ({
                  hasError: false,
                  retryCount: s.retryCount + 1,
                }))
              }
              className="text-primary text-xs font-medium hover:underline"
            >
              Try again
            </button>
          ) : (
            <p className="text-muted-foreground text-xs">
              Retry limit reached. Please refresh the page.
            </p>
          )}
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
