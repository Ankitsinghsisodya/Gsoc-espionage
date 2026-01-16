import { ArrowRight, ChevronDown, ChevronUp, Download, GitBranch, Key, Moon, Search, Sun } from 'lucide-react';
import React from 'react';
import { ErrorBoundary, Loader, ToastAction, ToastContainer, ToastData, createToast } from './components/common';
import { ContributorList, ContributorModal } from './components/contributors';
import { RepositoryStats } from './components/repository';
import { UserAnalytics } from './components/user';
import { ExportService, GitHubService, Theme, ThemeService } from './services';
import { ContributorStats, RepositoryStats as RepositoryStatsType, TimeFilter, UserProfileStats } from './types';
import { GitHubUrlParser } from './utils';



/**
 * Main application state
 */
interface AppState {
    loading: boolean;
    analyzing: boolean;
    error: string | null;
    repositoryStats: RepositoryStatsType | null;
    userStats: UserProfileStats | null;
    analysisType: 'repo' | 'user' | null;
    branches: string[];
    selectedBranch: string;
    selectedContributor: ContributorStats | null;
    theme: Theme;
    repositoryUrl: string;
    timeFilter: TimeFilter;
    showResults: boolean;
    toasts: ToastData[];
    githubToken: string;
    showTokenInput: boolean;
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
    { value: '2w', label: '2 weeks' },
    { value: '1m', label: '1 month' },
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: 'all', label: 'All time' },
];

/**
 * Main application component with dashboard-style UI
 */
class App extends React.Component<{}, AppState> {
    private themeUnsubscribe: (() => void) | null = null;

    constructor(props: {}) {
        super(props);
        this.state = {
            loading: false,
            analyzing: false,
            error: null,
            repositoryStats: null,
            userStats: null,
            analysisType: null,
            branches: [],
            selectedBranch: '',
            selectedContributor: null,
            theme: ThemeService.getTheme(),
            repositoryUrl: '',
            timeFilter: '1m',
            showResults: false,
            toasts: [],
            githubToken: this.loadGitHubToken(),
            showTokenInput: false,
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



    private loadGitHubToken = (): string => {
        try {
            return localStorage.getItem('github_personal_token') || '';
        } catch {
            return '';
        }
    };

    private handleTokenChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ githubToken: e.target.value });
    };

    private saveGitHubToken = (): void => {
        const { githubToken } = this.state;
        try {
            if (githubToken.trim()) {
                localStorage.setItem('github_personal_token', githubToken.trim());
                this.addToast('success', 'Token Saved', 'Your GitHub token has been saved locally.');
            } else {
                localStorage.removeItem('github_personal_token');
                this.addToast('info', 'Token Removed', 'Your GitHub token has been removed.');
            }
        } catch {
            this.addToast('error', 'Save Failed', 'Could not save token to localStorage.');
        }
    };

    private toggleTokenInput = (): void => {
        this.setState(prev => ({ showTokenInput: !prev.showTokenInput }));
    };

    private handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ repositoryUrl: e.target.value });
    };

    private handleTimeFilterChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ timeFilter: e.target.value as TimeFilter });
    };

    private handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedBranch: e.target.value });
    };


    private handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        const { repositoryUrl, timeFilter, selectedBranch, githubToken } = this.state;

        if (!repositoryUrl.trim()) return;

        this.setState({ analyzing: true, error: null, userStats: null, repositoryStats: null });

        try {
            // Detect URL type (user vs repository)
            const urlInfo = GitHubUrlParser.detectUrlType(repositoryUrl);

            if (urlInfo.type === 'user' && urlInfo.username) {
                // Fetch user statistics
                const userStats = await GitHubService.fetchUserStats(urlInfo.username, timeFilter);
                this.setState({
                    userStats,
                    analysisType: 'user',
                    analyzing: false,
                    showResults: true,
                });
            } else if (urlInfo.type === 'repo' && urlInfo.owner && urlInfo.repo) {
                // Fetch repository statistics
                const branches = await GitHubService.fetchBranches(urlInfo.owner, urlInfo.repo);
                const stats = await GitHubService.fetchRepositoryStats(repositoryUrl, selectedBranch, timeFilter);
                this.setState({
                    repositoryStats: stats,
                    branches,
                    analysisType: 'repo',
                    analyzing: false,
                    showResults: true,
                });
            } else {
                throw new Error('Invalid GitHub URL. Enter a username (e.g., octocat) or repository (e.g., facebook/react)');
            }
        } catch (error: any) {
            const message = error.message || 'Failed to analyze';

            // Check for rate limit error
            if (message.toLowerCase().includes('rate limit')) {
                if (githubToken) {
                    this.addToast('warning', 'Rate Limit Exceeded',
                        'GitHub API rate limit reached. Please wait before trying again.',
                        10000
                    );
                } else {
                    this.addToast('warning', 'Rate Limit Exceeded',
                        'GitHub API rate limit reached (60/hour). Add a personal token for 5,000/hour!',
                        0,
                        {
                            label: 'Add Token',
                            onClick: () => this.setState({ showTokenInput: true, showResults: false }),
                        }
                    );
                }
            } else {
                this.addToast('error', 'Analysis Failed', message);
            }

            this.setState({ error: message, analyzing: false });
        }
    };

    private handleContributorClick = (contributor: ContributorStats): void => {
        this.setState({ selectedContributor: contributor });
    };

    private closeContributorModal = (): void => {
        this.setState({ selectedContributor: null });
    };

    private addToast = (type: 'success' | 'error' | 'warning' | 'info', title: string, message: string, duration?: number, action?: ToastAction): void => {
        const toast = createToast(type, title, message, duration, action);
        this.setState(prev => ({ toasts: [...prev.toasts, toast] }));
    };

    private dismissToast = (id: string): void => {
        this.setState(prev => ({ toasts: prev.toasts.filter(t => t.id !== id) }));
    };

    private renderLoading(): React.ReactNode {
        return (
            <div className="app-layout">
                <div className="main-content">
                    <div className="loading-container">
                        <Loader size="lg" message="Loading..." />
                    </div>
                </div>
            </div>
        );
    }

    private renderHero(): React.ReactNode {
        const { repositoryUrl, timeFilter, analyzing, error } = this.state;

        return (
            <div className="hero-section">
                {/* Hero Header */}
                <div className="hero-header">
                    <div className="hero-icon" aria-hidden="true">
                        <GitBranch className="w-10 h-10" />
                    </div>
                    <h1 className="hero-title">GSoC Espionage</h1>
                    <p className="hero-subtitle">
                        Get detailed insights about GitHub users and repositories. Track PR activity, contributor stats, and code metrics.
                    </p>
                </div>

                {/* Search Form */}
                <form onSubmit={this.handleSubmit} className="search-form" role="search">
                    <div className="search-input-group">
                        <Search className="search-icon" aria-hidden="true" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Enter username (octocat) or repo (facebook/react)"
                            value={repositoryUrl}
                            onChange={this.handleUrlChange}
                            disabled={analyzing}
                            aria-label="GitHub username or repository URL"
                        />
                    </div>

                    <div className="search-options">
                        <select
                            className="branch-select"
                            value={this.state.selectedBranch}
                            onChange={this.handleBranchChange}
                            disabled={analyzing}
                            aria-label="Select branch"
                        >
                            <option value="">All branches</option>
                            {this.state.branches.map(branch => (
                                <option key={branch} value={branch}>{branch}</option>
                            ))}
                        </select>

                        <select
                            className="time-select"
                            value={timeFilter}
                            onChange={this.handleTimeFilterChange}
                            disabled={analyzing}
                            aria-label="Select time range"
                        >
                            {TIME_FILTERS.map(f => (
                                <option key={f.value} value={f.value}>{f.label}</option>
                            ))}
                        </select>

                        <button
                            type="submit"
                            className="analyze-btn"
                            disabled={analyzing || !repositoryUrl.trim()}
                        >
                            {analyzing ? (
                                <>Analyzing...</>
                            ) : (
                                <>
                                    Analyze
                                    <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                </>
                            )}
                        </button>
                    </div>
                </form>

                {/* GitHub Token Section - Non-obtrusive */}
                <div className="api-token-section">
                    <button
                        type="button"
                        className="api-token-toggle"
                        onClick={this.toggleTokenInput}
                        aria-expanded={this.state.showTokenInput}
                        aria-controls="token-input-section"
                    >
                        <Key className="w-4 h-4" aria-hidden="true" />
                        <span>Use personal GitHub token for higher rate limits</span>
                        <span className={`rate-limit-badge ${this.state.githubToken ? 'has-token' : ''}`}>
                            {this.state.githubToken ? '5,000/hr' : '60/hr'}
                        </span>
                        {this.state.showTokenInput ? (
                            <ChevronUp className="w-4 h-4" aria-hidden="true" />
                        ) : (
                            <ChevronDown className="w-4 h-4" aria-hidden="true" />
                        )}
                    </button>

                    {this.state.showTokenInput && (
                        <div id="token-input-section" className="api-token-input-section">
                            <p className="api-token-hint">
                                Get a personal access token from{' '}
                                <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
                                    GitHub Settings
                                </a>{' '}
                                (no scopes needed for public repos)
                            </p>
                            <div className="api-token-input-group">
                                <input
                                    type="password"
                                    className="api-token-input"
                                    placeholder="ghp_xxxxxxxxxxxx"
                                    value={this.state.githubToken}
                                    onChange={this.handleTokenChange}
                                    aria-label="GitHub personal access token"
                                />
                                <button
                                    type="button"
                                    className="api-token-save-btn"
                                    onClick={this.saveGitHubToken}
                                >
                                    {this.state.githubToken ? 'Save' : 'Clear'}
                                </button>
                            </div>
                            <p className="api-token-note">
                                🔒 Token is stored only in your browser's localStorage
                            </p>
                        </div>
                    )}
                </div>

                {/* Error Message */}
                {error && (
                    <div className="error-message" role="alert" aria-live="assertive">
                        {error}
                    </div>
                )}

                {/* Loading State */}
                {analyzing && (
                    <div className="analyzing-state">
                        <Loader size="md" message="Fetching repository data..." />
                    </div>
                )}

                {/* Quick Stats Cards */}
                <div className="feature-cards">
                    <div className="feature-card">
                        <div className="feature-card-icon purple">📊</div>
                        <h3>PR Analytics</h3>
                        <p>Track open, merged, and closed pull requests over time</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-card-icon blue">👥</div>
                        <h3>Contributors</h3>
                        <p>Identify maintainers and top contributors</p>
                    </div>
                    <div className="feature-card">
                        <div className="feature-card-icon green">📈</div>
                        <h3>Metrics</h3>
                        <p>Review times, merge rates, and code changes</p>
                    </div>
                </div>
            </div>
        );
    }

    private renderResults(): React.ReactNode {
        const { repositoryStats, userStats, analysisType, selectedContributor, repositoryUrl, timeFilter, analyzing, error } = this.state;

        return (
            <div className="results-container">
                {/* Search Bar (compact) */}
                <form onSubmit={this.handleSubmit} className="compact-search-form">
                    <div className="compact-search-input-group">
                        <Search className="search-icon" />
                        <input
                            type="text"
                            className="search-input"
                            placeholder="Enter username or repo (e.g., octocat, facebook/react)"
                            value={repositoryUrl}
                            onChange={this.handleUrlChange}
                            disabled={analyzing}
                        />
                    </div>
                    <select
                        className="branch-select compact"
                        value={this.state.selectedBranch}
                        onChange={this.handleBranchChange}
                        disabled={analyzing}
                    >
                        <option value="">All branches</option>
                        {this.state.branches.map(branch => (
                            <option key={branch} value={branch}>{branch}</option>
                        ))}
                    </select>
                    <select
                        className="time-select compact"
                        value={timeFilter}
                        onChange={this.handleTimeFilterChange}
                        disabled={analyzing}
                    >
                        {TIME_FILTERS.map(f => (
                            <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                    <button
                        type="submit"
                        className="analyze-btn compact"
                        disabled={analyzing || !repositoryUrl.trim()}
                    >
                        {analyzing ? 'Analyzing...' : 'Analyze'}
                    </button>
                </form>

                {/* Error Message */}
                {error && (
                    <div className="error-message" role="alert">
                        {error}
                    </div>
                )}

                {/* Results */}
                {analysisType === 'repo' && repositoryStats && !analyzing && (
                    <div className="results-content">
                        {/* Export Buttons */}
                        <div className="export-buttons">
                            <button
                                type="button"
                                className="export-btn"
                                onClick={() => ExportService.exportRepositoryCsv(repositoryStats)}
                                title="Download contributor data as CSV"
                            >
                                <Download className="w-4 h-4" aria-hidden="true" />
                                Export CSV
                            </button>
                            <button
                                type="button"
                                className="export-btn"
                                onClick={() => ExportService.exportRepositoryJson(repositoryStats)}
                                title="Download full analysis as JSON"
                            >
                                <Download className="w-4 h-4" aria-hidden="true" />
                                Export JSON
                            </button>
                        </div>

                        <RepositoryStats stats={repositoryStats} />
                        <ContributorList
                            contributors={repositoryStats.contributors}
                            onContributorClick={this.handleContributorClick}
                        />
                    </div>
                )}

                {/* User Analytics Results */}
                {analysisType === 'user' && userStats && !analyzing && (
                    <div className="results-content">
                        <UserAnalytics userStats={userStats} />
                    </div>
                )}

                <ContributorModal
                    contributor={selectedContributor}
                    isOpen={selectedContributor !== null}
                    onClose={this.closeContributorModal}
                    repoFilter={repositoryStats ? `${repositoryStats.owner}/${repositoryStats.repo}` : undefined}
                />
            </div>
        );
    }

    public render(): React.ReactNode {
        const { loading, showResults } = this.state;

        if (loading) {
            return this.renderLoading();
        }

        return (
            <ErrorBoundary>
                <div className="app-layout no-sidebar">
                    {/* Theme Toggle */}
                    <button
                        className="theme-toggle-btn"
                        onClick={() => ThemeService.toggleTheme()}
                        title={this.state.theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
                        aria-label="Toggle theme"
                    >
                        {this.state.theme === 'dark' ? (
                            <Sun className="w-5 h-5" />
                        ) : (
                            <Moon className="w-5 h-5" />
                        )}
                    </button>

                    <main className="main-content">
                        {showResults ? this.renderResults() : this.renderHero()}
                    </main>

                    {/* Toast Notifications */}
                    <ToastContainer toasts={this.state.toasts} onDismiss={this.dismissToast} />
                </div>
            </ErrorBoundary>
        );
    }
}

export default App;
