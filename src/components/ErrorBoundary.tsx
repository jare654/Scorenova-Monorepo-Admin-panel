import React, { ReactNode, ErrorInfo } from "react";
import { AlertTriangle, RefreshCw, Copy, Check, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
  showDetails: boolean;
}

/**
 * Error boundary to catch and handle React component errors gracefully
 * Shows clear diagnostics and actionable recovery buttons
 */
export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
      showDetails: true,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[ErrorBoundary caught an error]:", error, errorInfo);
    this.setState({ errorInfo });
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
  };

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.href = "/dashboard";
  };

  handleCopy = () => {
    const errorText = `Error: ${this.state.error?.message || "Unknown error"}\n\nStack:\n${this.state.error?.stack || "No stack trace"}\n\nComponent Stack:\n${this.state.errorInfo?.componentStack || "No component stack"}`;
    navigator.clipboard.writeText(errorText);
    this.setState({ copied: true });
    setTimeout(() => this.setState({ copied: false }), 2000);
  };

  render() {
    if (this.state.hasError) {
      const errorMessage = this.state.error?.message || "An unexpected error occurred.";
      const errorStack = this.state.error?.stack;
      const componentStack = this.state.errorInfo?.componentStack;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 select-text">
          <div className="max-w-xl w-full space-y-5 rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl text-center">
            <div className="h-14 w-14 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>

            <div className="space-y-1.5">
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Something went wrong</h1>
              <p className="text-sm text-muted-foreground">
                We encountered an unexpected error. You can try recovering or return to the dashboard.
              </p>
            </div>

            {/* Error message box */}
            <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-wider text-destructive mb-1">Error Message</p>
              <p className="text-sm font-mono text-foreground break-all">{errorMessage}</p>
            </div>

            {/* Collapsible stack trace */}
            {(errorStack || componentStack) && (
              <div className="text-left space-y-2">
                <button
                  type="button"
                  onClick={() => this.setState((prev) => ({ showDetails: !prev.showDetails }))}
                  className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
                >
                  <span>Diagnostic Details</span>
                  {this.state.showDetails ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </button>

                {this.state.showDetails && (
                  <div className="relative">
                    <pre className="max-h-48 overflow-auto rounded-lg bg-muted/60 p-3 text-[11px] font-mono leading-relaxed text-muted-foreground border border-border/60 whitespace-pre-wrap break-all">
                      {errorStack || componentStack}
                    </pre>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={this.handleCopy}
                      className="absolute top-2 right-2 h-7 px-2 text-xs gap-1 bg-background/80 hover:bg-background shadow-xs"
                    >
                      {this.state.copied ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-500" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy Details
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Action buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
              <Button onClick={this.handleRetry} variant="outline" className="w-full sm:flex-1 gap-2 h-10">
                <RefreshCw className="h-4 w-4" /> Try Again
              </Button>
              <Button onClick={this.handleReset} className="w-full sm:flex-1 h-10">
                Return to Dashboard
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
