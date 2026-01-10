import React from 'react';

/**
 * Card component props
 */
interface CardProps {
    children: React.ReactNode;
    className?: string;
    onClick?: () => void;
    hoverable?: boolean;
}

/**
 * Card container component
 * @class Card
 * @extends {React.Component<CardProps>}
 */
export class Card extends React.Component<CardProps> {
    /**
     * Render card
     */
    public render(): React.ReactNode {
        const { children, className = '', onClick, hoverable = false } = this.props;

        const hoverClasses = hoverable || onClick
            ? 'cursor-pointer hover:scale-[1.02] hover:border-primary-500/30'
            : '';

        return (
            <div
                className={`card p-4 ${hoverClasses} ${className}`}
                onClick={onClick}
            >
                {children}
            </div>
        );
    }
}
