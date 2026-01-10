import { X } from 'lucide-react';
import React from 'react';

/**
 * Modal component props
 */
interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Modal dialog component
 * @class Modal
 * @extends {React.Component<ModalProps>}
 */
export class Modal extends React.Component<ModalProps> {
    /**
     * Handle overlay click
     */
    private handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>): void => {
        if (e.target === e.currentTarget) {
            this.props.onClose();
        }
    };

    /**
     * Handle escape key
     */
    private handleKeyDown = (e: KeyboardEvent): void => {
        if (e.key === 'Escape') {
            this.props.onClose();
        }
    };

    /**
     * Add event listener on mount
     */
    public componentDidMount(): void {
        document.addEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Remove event listener on unmount
     */
    public componentWillUnmount(): void {
        document.removeEventListener('keydown', this.handleKeyDown);
    }

    /**
     * Get modal size classes
     */
    private getSizeClasses(): string {
        const { size = 'md' } = this.props;

        const sizes = {
            sm: 'max-w-sm',
            md: 'max-w-lg',
            lg: 'max-w-2xl',
            xl: 'max-w-4xl',
        };

        return sizes[size];
    }

    /**
     * Render modal
     */
    public render(): React.ReactNode {
        const { isOpen, onClose, title, children } = this.props;

        if (!isOpen) return null;

        return (
            <div
                className="modal-overlay animate-fade-in"
                onClick={this.handleOverlayClick}
            >
                <div
                    className={`card w-full ${this.getSizeClasses()} mx-4 max-h-[90vh] overflow-hidden flex flex-col animate-slide-up`}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-dark-700 dark:border-dark-700 light:border-gray-200">
                        {title && (
                            <h2 className="text-xl font-semibold text-white dark:text-white light:text-gray-900">
                                {title}
                            </h2>
                        )}
                        <button
                            onClick={onClose}
                            className="p-1 text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Content */}
                    <div className="p-4 overflow-y-auto flex-1">
                        {children}
                    </div>
                </div>
            </div>
        );
    }
}
