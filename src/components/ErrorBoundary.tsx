import { Component, ReactNode } from 'react';
import { Home, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * ErrorBoundary global — captura errores de renderizado en cualquier
 * componente hijo y muestra una pantalla de recuperación amigable.
 *
 * Uso:
 *   <ErrorBoundary>
 *     <MyComponent />
 *   </ErrorBoundary>
 */
class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // En producción aquí se enviaría a Sentry / LogRocket / etc.
    if (import.meta.env.DEV) {
      console.error('[ErrorBoundary] Error capturado:', error, info.componentStack);
    }
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;

      return (
        <div className="min-h-[60vh] flex items-center justify-center bg-section-warm px-6">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-5">
              <span className="text-2xl" role="img" aria-label="Error">⚠️</span>
            </div>
            <h1 className="font-display text-2xl text-foreground mb-2">
              Algo salió mal
            </h1>
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Ocurrió un error inesperado en esta sección. Puedes intentar recargar o volver al inicio.
            </p>
            {import.meta.env.DEV && this.state.error && (
              <pre className="text-left text-xs bg-destructive/5 border border-destructive/20 rounded-xl p-4 mb-6 overflow-x-auto text-destructive/80">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity"
              >
                <RefreshCw className="w-4 h-4" /> Intentar de nuevo
              </button>
              <a
                href="/"
                className="inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl border border-border text-sm font-semibold text-foreground hover:bg-secondary transition-colors"
              >
                <Home className="w-4 h-4" /> Volver al inicio
              </a>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
