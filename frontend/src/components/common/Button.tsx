import React from 'react';

/**
 * Button component props
 */
interface ButtonProps {
    children: React.ReactNode;
    onClick?: () => void;
    variant?: 'primary' | 'secondary' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    disabled?: boolean;
    loading?: boolean;
    type?: 'button' | 'submit';
    className?: string;
    icon?: React.ReactNode;
}

/**
 * Button component state
 */
interface ButtonState { }

/**
 * Reusable button component
 * @class Button
 * @extends {React.Component<ButtonProps, ButtonState>}
 */
export class Button extends React.Component<ButtonProps, ButtonState> {
    /**
     * Get button classes based on variant and size
     */
    private getClasses(): string {
        const { variant = 'primary', size = 'md', disabled, loading, className = '' } = this.props;

        const baseClasses = 'btn';

        const variantClasses = {
            primary: 'btn-primary',
            secondary: 'btn-secondary',
            ghost: 'btn-ghost',
        };

        const sizeClasses = {
            sm: 'px-3 py-1.5 text-sm',
            md: 'px-4 py-2',
            lg: 'px-6 py-3 text-lg',
        };

        const stateClasses = disabled || loading ? 'opacity-50 cursor-not-allowed' : '';

        return `${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${stateClasses} ${className}`;
    }

    /**
     * Render button
     */
    public render(): React.ReactNode {
        const { children, onClick, disabled, loading, type = 'button', icon } = this.props;

        return (
            <button
                type={type}
                onClick={onClick}
                disabled={disabled || loading}
                className={this.getClasses()}
            >
                {loading && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                            fill="none"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        />
                    </svg>
                )}
                {icon && !loading && icon}
                {children}
            </button>
        );
    }
}
