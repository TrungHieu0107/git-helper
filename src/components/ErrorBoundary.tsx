import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertCircle, RotateCcw, Home } from 'lucide-react';
import { Button } from './ui/Button';
import { Card } from './ui/Card';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-background p-6 overflow-auto">
          <Card className="max-w-md w-full border-dracula-red/20 shadow-[0_0_50px_rgba(255,85,85,0.1)] p-8">
            <div className="flex flex-col items-center text-center gap-6">
              <div className="w-16 h-16 rounded-full bg-dracula-red/10 flex items-center justify-center border border-dracula-red/20 shadow-inner animate-pulse">
                <AlertCircle size={32} className="text-dracula-red" />
              </div>
              
              <div className="flex flex-col gap-2">
                <h1 className="text-xl font-bold text-foreground">Something went wrong</h1>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  The application encountered an unexpected runtime error. We've been notified and are working on it.
                </p>
              </div>

              {this.state.error && (
                <div className="w-full bg-secondary/10 border border-border/30 rounded-md p-3 text-left overflow-auto max-h-[150px] custom-scrollbar">
                  <code className="text-[11px] font-mono text-dracula-red leading-tight break-all">
                    {this.state.error.name}: {this.state.error.message}
                  </code>
                </div>
              )}

              <div className="flex items-center gap-3 w-full">
                <Button 
                  variant="primary" 
                  className="flex-1 h-10" 
                  onClick={this.handleReset}
                  leftIcon={<RotateCcw size={16} />}
                >
                  Reload App
                </Button>
                <Button 
                  variant="secondary" 
                  className="flex-1 h-10" 
                  onClick={() => window.location.href = '/'}
                  leftIcon={<Home size={16} />}
                >
                  Home
                </Button>
              </div>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}
