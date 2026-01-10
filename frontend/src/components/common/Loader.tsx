import React from 'react';

/**
 * Loader component props
 */
interface LoaderProps {
    size?: 'sm' | 'md' | 'lg';
    message?: string;
}

/**
 * Loading spinner component
 * @class Loader
 * @extends {React.Component<LoaderProps>}
 */
export class Loader extends React.Component<LoaderProps> {
    /**
     * Get size classes
     */
    private getSizeClasses(): string {
        const { size = 'md' } = this.props;

        const sizes = {
            sm: 'w-6 h-6',
            md: 'w-10 h-10',
            lg: 'w-16 h-16',
        };

        return sizes[size];
    }

    /**
     * Render loader
     */
    public render(): React.ReactNode {
        const { message } = this.props;

        return (
            <div className="flex flex-col items-center justify-center gap-4">
                <div
                    className={`${this.getSizeClasses()} border-4 border-dark-600 border-t-primary-500 rounded-full animate-spin`}
                />
                {message && (
                    <p className="text-gray-400 text-sm">{message}</p>
                )}
            </div>
        );
    }
}

/**
 * Full page loader
 * @class PageLoader
 * @extends {React.Component<LoaderProps>}
 */
export class PageLoader extends React.Component<LoaderProps> {
    /**
     * Render full page loader
     */
    public render(): React.ReactNode {
        return (
            <div className="fixed inset-0 flex items-center justify-center bg-dark-900/80 backdrop-blur-sm z-50">
                <Loader {...this.props} size="lg" />
            </div>
        );
    }
}
