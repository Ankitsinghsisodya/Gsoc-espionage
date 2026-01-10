import React from 'react';
import { ErrorBoundary, Loader } from './components/common';
import { ContributorList, ContributorModal } from './components/contributors';
import { Footer, Header } from './components/layout';
import { RepositoryForm, RepositoryStats } from './components/repository';
import { ApiService, Theme, ThemeService } from './services';
import { ContributorStats, RepositoryStats as RepositoryStatsType, TimeFilter, User } from './types';

/**
 * Main application state
 */
interface AppState {
    user: User | null;
    loading: boolean;
    analyzing: boolean;
    error: string | null;
    repositoryStats: RepositoryStatsType | null;
    branches: string[];
    selectedContributor: ContributorStats | null;
    theme: Theme;
}

/**
 * Main application component
 * @class App
 * @extends {React.Component<{}, AppState>}
 */
class App extends React.Component<{}, AppState> {
    private themeUnsubscribe: (() => void) | null = null;

    constructor(props: {}) {
        super(props);
        this.state = {
            user: null,
            loading: true,
            analyzing: false,
            error: null,
            repositoryStats: null,
            branches: [],
            selectedContributor: null,
            theme: ThemeService.getTheme(),
        };
    }

    /**
     * Initialize app on mount
     */
    public async componentDidMount(): Promise<void> {
        // Check for auth callback
        this.handleAuthCallback();

        // Load current user
        await this.loadCurrentUser();

        // Subscribe to theme changes
        this.themeUnsubscribe = ThemeService.subscribe((theme) => {
            this.setState({ theme });
        });
    }

    /**
     * Cleanup on unmount
     */
    public componentWillUnmount(): void {
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
        }
    }

    /**
     * Handle OAuth callback redirect
     */
    private handleAuthCallback(): void {
        const params = new URLSearchParams(window.location.search);
        const token = params.get('token');
        const sessionId = params.get('sessionId');

        if (token) {
            ApiService.setAuth(token);
            localStorage.setItem('session_id', sessionId || '');
            // Clean URL
            window.history.replaceState({}, '', '/');
        }
    }

    /**
     * Load current authenticated user
     */
    private loadCurrentUser = async (): Promise<void> => {
        try {
            const user = await ApiService.getCurrentUser();
            this.setState({ user, loading: false });
        } catch {
            this.setState({ loading: false });
        }
    };

    /**
     * Handle login
     */
    private handleLogin = (provider: 'github' | 'google'): void => {
        const url = provider === 'github'
            ? ApiService.getGitHubAuthUrl()
            : ApiService.getGoogleAuthUrl();
        window.location.href = url;
    };

    /**
     * Handle logout
     */
    private handleLogout = async (): Promise<void> => {
        await ApiService.logout();
        this.setState({ user: null });
    };

    /**
     * Handle repository analysis
     */
    private handleAnalyze = async (url: string, branch: string, filter: TimeFilter): Promise<void> => {
        this.setState({ analyzing: true, error: null });

        try {
            const stats = await ApiService.analyzeRepository(url, branch, filter);
            this.setState({ repositoryStats: stats, analyzing: false });
        } catch (error: any) {
            const message = error.response?.data?.error?.message || 'Failed to analyze repository';
            this.setState({ error: message, analyzing: false });
        }
    };

    /**
     * Handle URL change to fetch branches
     */
    private handleUrlChange = async (url: string): Promise<void> => {
        // Try to parse URL and fetch branches
        const match = url.match(/(?:github\.com\/)?([^\/]+)\/([^\/\s]+)/);
        if (match) {
            try {
                const branches = await ApiService.getBranches(match[1], match[2]);
                this.setState({ branches });
            } catch {
                this.setState({ branches: [] });
            }
        }
    };

    /**
     * Handle contributor click
     */
    private handleContributorClick = (contributor: ContributorStats): void => {
        this.setState({ selectedContributor: contributor });
    };

    /**
     * Close contributor modal
     */
    private closeContributorModal = (): void => {
        this.setState({ selectedContributor: null });
    };

    /**
     * Render loading state
     */
    private renderLoading(): React.ReactNode {
        return (
            <div className="min-h-screen flex items-center justify-center bg-dark-900">
                <Loader size="lg" message="Loading..." />
            </div>
        );
    }

    /**
     * Render main content
     */
    private renderContent(): React.ReactNode {
        const { analyzing, error, repositoryStats, branches, selectedContributor } = this.state;

        return (
            <main className="flex-1 container mx-auto px-4 py-8">
                {/* Hero Section */}
                <div className="text-center mb-12">
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        <span className="gradient-text">Analyze</span> GitHub Pull Requests
                    </h1>
                    <p className="text-lg text-gray-400 max-w-2xl mx-auto">
                        Get detailed insights about contributors, code quality, and PR metrics for any GitHub repository.
                    </p>
                </div>

                {/* Repository Form */}
                <div className="max-w-3xl mx-auto mb-12">
                    <RepositoryForm
                        onSubmit={this.handleAnalyze}
                        loading={analyzing}
                        branches={branches}
                        onUrlChange={this.handleUrlChange}
                    />
                </div>

                {/* Error Message */}
                {error && (
                    <div className="max-w-3xl mx-auto mb-8 p-4 bg-red-500/20 border border-red-500/30 rounded-lg text-red-400">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {analyzing && (
                    <div className="flex justify-center py-12">
                        <Loader size="lg" message="Analyzing repository..." />
                    </div>
                )}

                {/* Results */}
                {repositoryStats && !analyzing && (
                    <div className="space-y-8 animate-in">
                        <RepositoryStats stats={repositoryStats} />
                        <ContributorList
                            contributors={repositoryStats.contributors}
                            onContributorClick={this.handleContributorClick}
                        />
                    </div>
                )}

                {/* Contributor Modal */}
                <ContributorModal
                    contributor={selectedContributor}
                    isOpen={selectedContributor !== null}
                    onClose={this.closeContributorModal}
                />
            </main>
        );
    }

    /**
     * Render application
     */
    public render(): React.ReactNode {
        const { user, loading } = this.state;

        if (loading) {
            return this.renderLoading();
        }

        return (
            <ErrorBoundary>
                <div className="min-h-screen flex flex-col bg-dark-900">
                    <Header
                        user={user}
                        onLogin={this.handleLogin}
                        onLogout={this.handleLogout}
                    />
                    {this.renderContent()}
                    <Footer />
                </div>
            </ErrorBoundary>
        );
    }
}

export default App;
