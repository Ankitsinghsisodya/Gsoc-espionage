import { AlertTriangle } from 'lucide-react';
import React from 'react';
import { Button } from './Button';

/**
 * Error boundary props
 */
interface ErrorBoundaryProps {
    children: React.ReactNode;
    fallback?: React.ReactNode;
}

/**
 * Error boundary state
 */
interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

/**
 * Error boundary component for catching React errors
 * @class ErrorBoundary
 * @extends {React.Component<ErrorBoundaryProps, ErrorBoundaryState>}
 */
export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    constructor(props: ErrorBoundaryProps) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    /**
     * Catch errors during render
     */
    public static getDerivedStateFromError(error: Error): ErrorBoundaryState {
        return { hasError: true, error };
    }

    /**
     * Log error details
     */
    public componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('Error caught by boundary:', error, errorInfo);
    }

    /**
     * Reset error state
     */
    private handleReset = (): void => {
        this.setState({ hasError: false, error: null });
    };

    /**
     * Render error fallback or children
     */
    public render(): React.ReactNode {
        const { hasError, error } = this.state;
        const { children, fallback } = this.props;

        if (hasError) {
            if (fallback) {
                return fallback;
            }

            return (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8">
                    <div className="p-4 bg-red-500/20 rounded-full mb-4">
                        <AlertTriangle className="w-12 h-12 text-red-400" />
                    </div>
                    <h2 className="text-xl font-semibold text-white mb-2">Something went wrong</h2>
                    <p className="text-gray-400 text-center mb-4 max-w-md">
                        {error?.message || 'An unexpected error occurred'}
                    </p>
                    <Button onClick={this.handleReset} variant="secondary">
                        Try Again
                    </Button>
                </div>
            );
        }

        return children;
    }
}
