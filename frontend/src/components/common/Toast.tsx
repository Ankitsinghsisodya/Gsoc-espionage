import { AlertTriangle, CheckCircle, Info, X, XCircle } from 'lucide-react';
import React from 'react';

/**
 * Toast type
 */
export type ToastType = 'success' | 'error' | 'warning' | 'info';

/**
 * Toast action
 */
export interface ToastAction {
    label: string;
    onClick: () => void;
}

/**
 * Toast data
 */
export interface ToastData {
    id: string;
    type: ToastType;
    title: string;
    message: string;
    duration?: number;
    action?: ToastAction;
}

/**
 * Toast props
 */
interface ToastProps {
    toast: ToastData;
    onDismiss: (id: string) => void;
}

/**
 * Toast container props
 */
interface ToastContainerProps {
    toasts: ToastData[];
    onDismiss: (id: string) => void;
}

/**
 * Individual Toast component
 */
export class Toast extends React.Component<ToastProps> {
    private timeoutId: ReturnType<typeof setTimeout> | null = null;

    public componentDidMount(): void {
        const { toast, onDismiss } = this.props;
        if (toast.duration !== 0) {
            this.timeoutId = setTimeout(() => {
                onDismiss(toast.id);
            }, toast.duration || 5000);
        }
    }

    public componentWillUnmount(): void {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
    }

    private getIcon(): React.ReactNode {
        const { toast } = this.props;
        const iconClass = 'w-5 h-5';

        switch (toast.type) {
            case 'success':
                return <CheckCircle className={iconClass} />;
            case 'error':
                return <XCircle className={iconClass} />;
            case 'warning':
                return <AlertTriangle className={iconClass} />;
            case 'info':
            default:
                return <Info className={iconClass} />;
        }
    }

    private handleAction = (): void => {
        const { toast, onDismiss } = this.props;
        if (toast.action) {
            toast.action.onClick();
            onDismiss(toast.id);
        }
    };

    public render(): React.ReactNode {
        const { toast, onDismiss } = this.props;

        return (
            <div className={`toast toast-${toast.type}`}>
                <div className="toast-icon">
                    {this.getIcon()}
                </div>
                <div className="toast-content">
                    <p className="toast-title">{toast.title}</p>
                    <p className="toast-message">{toast.message}</p>
                    {toast.action && (
                        <button className="toast-action" onClick={this.handleAction}>
                            {toast.action.label}
                        </button>
                    )}
                </div>
                <button
                    className="toast-dismiss"
                    onClick={() => onDismiss(toast.id)}
                    aria-label="Dismiss"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        );
    }
}

/**
 * Toast container - renders all active toasts
 */
export class ToastContainer extends React.Component<ToastContainerProps> {
    public render(): React.ReactNode {
        const { toasts, onDismiss } = this.props;

        if (toasts.length === 0) return null;

        return (
            <div className="toast-container">
                {toasts.map(toast => (
                    <Toast key={toast.id} toast={toast} onDismiss={onDismiss} />
                ))}
            </div>
        );
    }
}

/**
 * Toast helper to create toast data
 */
export const createToast = (
    type: ToastType,
    title: string,
    message: string,
    duration?: number,
    action?: ToastAction
): ToastData => ({
    id: `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    title,
    message,
    duration,
    action,
});
