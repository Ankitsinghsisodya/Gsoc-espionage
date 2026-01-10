import { ChevronDown, GitBranch, Github, LogOut, Moon, Sun, User } from 'lucide-react';
import React from 'react';
import { Theme, ThemeService } from '../../services';
import { User as UserType } from '../../types';

/**
 * Header component props
 */
interface HeaderProps {
    user: UserType | null;
    onLogin: (provider: 'github' | 'google') => void;
    onLogout: () => void;
}

/**
 * Header component state
 */
interface HeaderState {
    theme: Theme;
    userMenuOpen: boolean;
}

/**
 * Application header with navigation and auth
 * @class Header
 * @extends {React.Component<HeaderProps, HeaderState>}
 */
export class Header extends React.Component<HeaderProps, HeaderState> {
    private themeUnsubscribe: (() => void) | null = null;

    constructor(props: HeaderProps) {
        super(props);
        this.state = {
            theme: ThemeService.getTheme(),
            userMenuOpen: false,
        };
    }

    /**
     * Subscribe to theme changes
     */
    public componentDidMount(): void {
        this.themeUnsubscribe = ThemeService.subscribe((theme) => {
            this.setState({ theme });
        });
    }

    /**
     * Cleanup subscription
     */
    public componentWillUnmount(): void {
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
        }
    }

    /**
     * Toggle theme
     */
    private handleThemeToggle = (): void => {
        ThemeService.toggleTheme();
    };

    /**
     * Toggle user menu
     */
    private toggleUserMenu = (): void => {
        this.setState((state) => ({ userMenuOpen: !state.userMenuOpen }));
    };

    /**
     * Render header
     */
    public render(): React.ReactNode {
        const { user, onLogin, onLogout } = this.props;
        const { theme, userMenuOpen } = this.state;

        return (
            <header className="sticky top-0 z-40 w-full border-b border-dark-700 bg-dark-900/80 backdrop-blur-lg">
                <div className="container mx-auto px-4 h-16 flex items-center justify-between">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-gradient-to-br from-primary-500 to-accent-purple rounded-lg">
                            <GitBranch className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <h1 className="text-xl font-bold gradient-text">PR Analyzer</h1>
                            <p className="text-xs text-gray-500">GitHub Insights</p>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-4">
                        {/* Theme Toggle */}
                        <button
                            onClick={this.handleThemeToggle}
                            className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-dark-700 transition-colors"
                            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
                        >
                            {theme === 'dark' ? (
                                <Sun className="w-5 h-5" />
                            ) : (
                                <Moon className="w-5 h-5" />
                            )}
                        </button>

                        {/* User Menu or Login */}
                        {user ? (
                            <div className="relative">
                                <button
                                    onClick={this.toggleUserMenu}
                                    className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-dark-700 transition-colors"
                                >
                                    {user.avatarUrl ? (
                                        <img
                                            src={user.avatarUrl}
                                            alt={user.username}
                                            className="w-8 h-8 rounded-full border-2 border-primary-500"
                                        />
                                    ) : (
                                        <div className="w-8 h-8 rounded-full bg-primary-500 flex items-center justify-center">
                                            <User className="w-4 h-4 text-white" />
                                        </div>
                                    )}
                                    <span className="text-sm font-medium text-white hidden sm:block">
                                        {user.username}
                                    </span>
                                    <ChevronDown className="w-4 h-4 text-gray-400" />
                                </button>

                                {/* Dropdown Menu */}
                                {userMenuOpen && (
                                    <div className="absolute right-0 mt-2 w-48 card py-2 animate-fade-in">
                                        <div className="px-4 py-2 border-b border-dark-700">
                                            <p className="text-sm font-medium text-white">{user.username}</p>
                                            {user.email && (
                                                <p className="text-xs text-gray-400">{user.email}</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={onLogout}
                                            className="w-full px-4 py-2 text-left text-sm text-gray-400 hover:text-white hover:bg-dark-700 flex items-center gap-2"
                                        >
                                            <LogOut className="w-4 h-4" />
                                            Sign Out
                                        </button>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <button
                                onClick={() => onLogin('github')}
                                className="btn btn-primary"
                            >
                                <Github className="w-4 h-4" />
                                <span className="hidden sm:inline">Login with GitHub</span>
                                <span className="sm:hidden">Login</span>
                            </button>
                        )}
                    </div>
                </div>
            </header>
        );
    }
}
