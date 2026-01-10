import { FolderGit2, Home, Key, Moon, Settings, Sun, Trash2, X } from 'lucide-react';
import React from 'react';
import { Theme, ThemeService } from '../../services';

/**
 * Sidebar component props
 */
interface SidebarProps {
    hasToken: boolean;
    onToggleToken: () => void;
    onNewAnalysis: () => void;
    isCollapsed?: boolean;
    isOpen?: boolean;
    onToggleCollapse?: () => void;
}

/**
 * Sidebar component state
 */
interface SidebarState {
    theme: Theme;
    settingsOpen: boolean;
}

/**
 * Sidebar navigation with settings
 */
export class Sidebar extends React.Component<SidebarProps, SidebarState> {
    private themeUnsubscribe: (() => void) | null = null;

    constructor(props: SidebarProps) {
        super(props);
        this.state = {
            theme: ThemeService.getTheme(),
            settingsOpen: false,
        };
    }

    public componentDidMount(): void {
        this.themeUnsubscribe = ThemeService.subscribe((theme) => {
            this.setState({ theme });
        });
    }

    public componentWillUnmount(): void {
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
        }
    }

    private handleThemeToggle = (): void => {
        ThemeService.toggleTheme();
    };

    private toggleSettings = (): void => {
        this.setState((state) => ({ settingsOpen: !state.settingsOpen }));
    };

    private clearHistory = (): void => {
        localStorage.removeItem('recent_analyses');
        window.location.reload();
    };

    public render(): React.ReactNode {
        const { hasToken, onToggleToken, onNewAnalysis, isCollapsed, isOpen } = this.props;
        const { theme, settingsOpen } = this.state;

        if (isCollapsed) {
            return null;
        }

        const sidebarClass = `sidebar ${isOpen ? 'open' : ''}`;

        return (
            <aside className={sidebarClass}>
                {/* Header */}
                <div className="sidebar-header">
                    <div className="sidebar-logo">
                        <FolderGit2 className="sidebar-logo-icon" />
                        <span className="sidebar-logo-text">PR Analyzer</span>
                    </div>
                </div>

                {/* Main Actions */}
                <div className="sidebar-section">
                    <button onClick={onNewAnalysis} className="sidebar-nav-btn">
                        <Home className="w-4 h-4" />
                        Dashboard
                    </button>
                    <button
                        onClick={() => {
                            onToggleToken();
                            if (this.props.onToggleCollapse) this.props.onToggleCollapse(); // Close sidebar on mobile
                        }}
                        className={`sidebar-nav-btn ${hasToken ? 'text-green-500' : ''}`}
                    >
                        <Key className="w-4 h-4" />
                        {hasToken ? 'Manage Token' : 'Add GitHub Token'}
                    </button>
                </div>

                {/* Spacer */}
                <div className="flex-1" />

                {/* Footer */}
                <div className="sidebar-footer">
                    {/* Theme Toggle */}
                    <button
                        onClick={this.handleThemeToggle}
                        className="sidebar-footer-btn"
                        title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                    >
                        {theme === 'dark' ? (
                            <Sun className="w-4 h-4" />
                        ) : (
                            <Moon className="w-4 h-4" />
                        )}
                    </button>

                    {/* Settings */}
                    <button
                        onClick={this.toggleSettings}
                        className={`sidebar-footer-btn ${settingsOpen ? 'active' : ''}`}
                        title="Settings"
                    >
                        <Settings className="w-4 h-4" />
                    </button>
                </div>

                {/* Settings Panel */}
                {settingsOpen && (
                    <div className="settings-panel">
                        <div className="settings-header">
                            <h3>Settings</h3>
                            <button onClick={this.toggleSettings} className="settings-close">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="settings-content">
                            <div className="settings-item">
                                <span className="settings-label">Theme</span>
                                <button
                                    onClick={this.handleThemeToggle}
                                    className="settings-toggle"
                                >
                                    {theme === 'dark' ? (
                                        <>
                                            <Moon className="w-4 h-4" />
                                            Dark
                                        </>
                                    ) : (
                                        <>
                                            <Sun className="w-4 h-4" />
                                            Light
                                        </>
                                    )}
                                </button>
                            </div>
                            <div className="settings-item">
                                <span className="settings-label">History</span>
                                <button
                                    onClick={this.clearHistory}
                                    className="settings-danger"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    Clear
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </aside>
        );
    }
}
