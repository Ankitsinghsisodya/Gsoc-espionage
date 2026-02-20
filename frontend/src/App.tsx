import { ArrowLeft, ArrowRight, Building2, ChevronDown, ChevronUp, Download, GitBranch, Key, Moon, Search, Sun } from 'lucide-react';
import React, { Suspense } from 'react';
import { Helmet } from 'react-helmet-async';
import { NavigateFunction, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary, Loader, ToastAction, ToastContainer, ToastData, createToast } from './components/common';
import { ContributorList, ContributorModal } from './components/contributors';
import { RepositoryStats } from './components/repository';
import { UserAnalytics } from './components/user';
import { ExportService, GitHubService, StorageService, Theme, ThemeService } from './services';
import { ContributorStats, RepositoryStats as RepositoryStatsType, TimeFilter, UserProfileStats } from './types';
import { GitHubUrlParser } from './utils';

// Lazy-loaded: keeps initial bundle lean; org JSON (~500 KB) loads only on demand
const GsocOrgs = React.lazy(() =>
    import('./components/orgs').then(m => ({ default: m.GsocOrgs }))
);



interface AppProps {
    /** Provided by AppWithRouter wrapper when React Router is present */
    navigate?: NavigateFunction;
    /** Current pathname from React Router (e.g. '/', '/orgs') */
    locationPathname?: string;
}

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
    previousAnalysis: { type: 'repo' | 'user'; url: string } | null;
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
    showAutocomplete: boolean;
    recentSearches: string[];
    highlightedIndex: number;
    showOrgsView: boolean;
}

const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
    { value: '2w', label: '2 weeks' },
    { value: '1m', label: '1 month' },
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: '12m', label: '12 months' },
    { value: 'all', label: 'All time' },
];

/**
 * Main application component with dashboard-style UI
 */
class App extends React.Component<AppProps, AppState> {
    private themeUnsubscribe: (() => void) | null = null;

    constructor(props: AppProps) {
        super(props);
        this.state = {
            loading: false,
            analyzing: false,
            error: null,
            repositoryStats: null,
            userStats: null,
            analysisType: null,
            previousAnalysis: null,
            branches: [],
            selectedBranch: '',
            selectedContributor: null,
            theme: ThemeService.getTheme(),
            repositoryUrl: '',
            timeFilter: '3m',
            showResults: false,
            toasts: [],
            githubToken: this.loadGitHubToken(),
            showTokenInput: false,
            showAutocomplete: false,
            recentSearches: [],
            highlightedIndex: -1,
            // Derive initial orgs view from router location prop (or fallback to pathname)
            showOrgsView: (props.locationPathname ?? window.location.pathname) === '/orgs',
        };
    }



    public componentDidMount(): void {
        this.themeUnsubscribe = ThemeService.subscribe((theme) => {
            this.setState({ theme });
        });

        // Popstate handles back/forward for ?user= and ?repo= query-param deep links
        window.addEventListener('popstate', this.handlePopState);

        // Auto-fill search box from URL query params (only when not on orgs view)
        if (!this.state.showOrgsView) {
            this.parseUrlAndFillSearch();
        }
    }

    public componentDidUpdate(prevProps: AppProps): void {
        // Sync orgs view state when React Router navigates (back/forward buttons)
        if (prevProps.locationPathname !== this.props.locationPathname) {
            this.setState({ showOrgsView: this.props.locationPathname === '/orgs' });
        }
    }

    /**
     * Parse URL query parameters and fill search box
     */
    private parseUrlAndFillSearch = (): void => {
        const urlParams = new URLSearchParams(window.location.search);
        const userParam = urlParams.get('user');
        const repoParam = urlParams.get('repo');

        if (userParam) {
            // For user URLs, set the username
            this.setState({ repositoryUrl: userParam }, () => {
                // Auto-submit the search
                this.handleSubmit({ preventDefault: () => { } } as React.FormEvent);
            });
        } else if (repoParam) {
            // For repo URLs, construct the GitHub URL format
            this.setState({ repositoryUrl: repoParam }, () => {
                // Auto-submit the search
                this.handleSubmit({ preventDefault: () => { } } as React.FormEvent);
            });
        }
    };

    public componentWillUnmount(): void {
        if (this.themeUnsubscribe) {
            this.themeUnsubscribe();
        }
        window.removeEventListener('popstate', this.handlePopState);
    }

    /**
     * Handle browser back/forward for ?user= / ?repo= deep-link navigation.
     * Orgs ↔ home navigation is handled by React Router via componentDidUpdate.
     */
    private handlePopState = (event: PopStateEvent): void => {
        if (event.state?.url) {
            this.setState({ repositoryUrl: event.state.url }, () => {
                this.handleSubmit({ preventDefault: () => { } } as React.FormEvent);
            });
        } else if (!event.state?.view) {
            // No state = go to home (PR analytics)
            this.setState({
                showResults: false,
                repositoryStats: null,
                userStats: null,
                analysisType: null,
                previousAnalysis: null,
            });
        }
    };



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
        this.setState({
            repositoryUrl: e.target.value,
            showAutocomplete: true,
            highlightedIndex: -1
        });
    };

    private loadRecentSearches = (): void => {
        const searches = StorageService.getRecentSearches();
        this.setState({
            recentSearches: searches,
            showAutocomplete: searches.length > 0
        });
    };

    private getFilteredSearches = (): string[] => {
        const { repositoryUrl, recentSearches } = this.state;
        if (!repositoryUrl.trim()) {
            return recentSearches;
        }
        return recentSearches.filter(s =>
            s.toLowerCase().includes(repositoryUrl.toLowerCase())
        );
    };

    private handleSearchInputFocus = (): void => {
        this.loadRecentSearches();
    };

    private selectSuggestion = (suggestion: string): void => {
        this.setState({
            repositoryUrl: suggestion,
            showAutocomplete: false,
            highlightedIndex: -1
        });
    };

    private removeSuggestion = (e: React.MouseEvent, suggestion: string): void => {
        e.stopPropagation();
        StorageService.removeRecentSearch(suggestion);
        this.loadRecentSearches();
    };

    private handleSearchInputKeyDown = (e: React.KeyboardEvent): void => {
        const { showAutocomplete, highlightedIndex } = this.state;
        const filteredSearches = this.getFilteredSearches();

        if (showAutocomplete && filteredSearches.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.setState({
                    highlightedIndex: Math.min(highlightedIndex + 1, filteredSearches.length - 1)
                });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.setState({
                    highlightedIndex: Math.max(highlightedIndex - 1, -1)
                });
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.setState({ showAutocomplete: false, highlightedIndex: -1 });
                return;
            }
            if (e.key === 'Enter' && highlightedIndex >= 0) {
                e.preventDefault();
                this.selectSuggestion(filteredSearches[highlightedIndex]);
                return;
            }
        }
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

                // Push to browser history for back button support
                window.history.pushState({ url: repositoryUrl, type: 'user' }, '', `?user=${urlInfo.username}`);

                // Save to recent searches
                StorageService.addRecentSearch(repositoryUrl.trim());

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

                // Push to browser history for back button support
                window.history.pushState({ url: repositoryUrl, type: 'repo' }, '', `?repo=${urlInfo.owner}/${urlInfo.repo}`);

                // Save to recent searches
                StorageService.addRecentSearch(repositoryUrl.trim());

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
            let message = error.message || 'Failed to analyze';

            // Improve error messages based on URL type
            const urlInfo = GitHubUrlParser.detectUrlType(repositoryUrl);
            if (message.toLowerCase().includes('not found')) {
                if (urlInfo.type === 'user') {
                    message = `User "${urlInfo.username}" not found on GitHub`;
                } else if (urlInfo.type === 'repo') {
                    message = `Repository "${urlInfo.owner}/${urlInfo.repo}" not found on GitHub`;
                }
            }

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

    /**
     * Analyze a user's full profile (from contributor modal)
     */
    private handleAnalyzeUser = async (username: string): Promise<void> => {
        const { repositoryUrl, analysisType } = this.state;

        // Save current state for back navigation
        if (analysisType) {
            this.setState({ previousAnalysis: { type: analysisType, url: repositoryUrl } });
        }

        // Set the username as the new URL and trigger analysis
        this.setState({ repositoryUrl: username }, () => {
            // Create a synthetic form event to trigger submit
            this.handleSubmit({ preventDefault: () => { } } as React.FormEvent);
        });
    };

    /**
     * Go back to previous analysis
     */
    private handleGoBack = async (): Promise<void> => {
        const { previousAnalysis } = this.state;
        if (!previousAnalysis) return;

        this.setState({ repositoryUrl: previousAnalysis.url, previousAnalysis: null }, () => {
            this.handleSubmit({ preventDefault: () => { } } as React.FormEvent);
        });
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
                            placeholder="github.com/username or github.com/owner/repo"
                            value={repositoryUrl}
                            onChange={this.handleUrlChange}
                            onFocus={this.handleSearchInputFocus}
                            onKeyDown={this.handleSearchInputKeyDown}
                            disabled={analyzing}
                            aria-label="GitHub username or repository URL"
                            autoComplete="off"
                        />

                        {/* Autocomplete dropdown */}
                        {this.state.showAutocomplete && this.getFilteredSearches().length > 0 && (
                            <div className="search-autocomplete">
                                <div className="search-autocomplete-header">
                                    <span>Recent searches</span>
                                </div>
                                {this.getFilteredSearches().map((suggestion, index) => (
                                    <div
                                        key={suggestion}
                                        className={`search-autocomplete-item ${index === this.state.highlightedIndex ? 'highlighted' : ''}`}
                                        onClick={() => this.selectSuggestion(suggestion)}
                                        onMouseEnter={() => this.setState({ highlightedIndex: index })}
                                    >
                                        <span className="search-autocomplete-text">{suggestion}</span>
                                        <button
                                            type="button"
                                            className="search-autocomplete-remove"
                                            onClick={(e) => this.removeSuggestion(e, suggestion)}
                                            title="Remove from history"
                                        >
                                            ×
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
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
                        {/* Back Button */}
                        {this.state.previousAnalysis && (
                            <button
                                type="button"
                                className="back-button"
                                onClick={this.handleGoBack}
                            >
                                <ArrowLeft className="w-4 h-4" aria-hidden="true" />
                                Back to Repository
                            </button>
                        )}
                        <UserAnalytics userStats={userStats} />
                    </div>
                )}

                <ContributorModal
                    contributor={selectedContributor}
                    isOpen={selectedContributor !== null}
                    onClose={this.closeContributorModal}
                    repoFilter={repositoryStats ? `${repositoryStats.owner}/${repositoryStats.repo}` : undefined}
                    onAnalyzeUser={this.handleAnalyzeUser}
                />
            </div>
        );
    }

    public render(): React.ReactNode {
        const { loading, showResults, showOrgsView } = this.state;

        if (loading) {
            return this.renderLoading();
        }

        return (
            <ErrorBoundary>
                <div className="app-layout no-sidebar">
                    {/* GSoC Orgs Mode Toggle - top left */}
                    <button
                        className={`orgs-mode-toggle ${showOrgsView ? 'active' : ''}`}
                        onClick={() => {
                            const next = !showOrgsView;
                            if (this.props.navigate) {
                                // Let React Router drive navigation (updates location prop → componentDidUpdate syncs state)
                                this.props.navigate(next ? '/orgs' : '/');
                            } else {
                                this.setState({ showOrgsView: next });
                            }
                        }}
                        title={showOrgsView ? 'Switch to PR Analytics' : 'View GSoC 2026 Organizations'}
                        aria-label="Toggle between PR analytics and GSoC 2026 organizations"
                        aria-pressed={showOrgsView}
                    >
                        <span className="orgs-toggle-track" aria-hidden="true">
                            <span className="orgs-toggle-thumb" />
                        </span>
                        <Building2 className="orgs-toggle-icon w-4 h-4" aria-hidden="true" />
                        <span className="orgs-toggle-label">GSoC 2026 Orgs</span>
                    </button>

                    {/* Theme Toggle - top right */}
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
                        {showOrgsView
                            ? (
                                <Suspense fallback={
                                    <div className="loading-container">
                                        <Loader size="lg" message="Loading organizations..." />
                                    </div>
                                }>
                                    <GsocOrgs />
                                </Suspense>
                            )
                            : (showResults ? this.renderResults() : this.renderHero())
                        }
                    </main>

                    {/* Toast Notifications */}
                    <ToastContainer toasts={this.state.toasts} onDismiss={this.dismissToast} />
                </div>
            </ErrorBoundary>
        );
    }
}

/**
 * Thin functional wrapper that feeds React Router context into the class component.
 * Helmet here manages the per-route <title>, <meta description>, and <link canonical>
 * so every route gets unique, crawlable meta without touching the class component.
 */
function AppWithRouter() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const isOrgs = pathname === '/orgs';

    return (
        <>
            <Helmet>
                <title>
                    {isOrgs
                        ? 'GSoC 2026 Organizations — 185 Orgs | gsoc.app'
                        : 'GSoC 2026 PR Analytics & Contributor Insights | gsoc.app'}
                </title>
                <meta
                    name="description"
                    content={isOrgs
                        ? 'Browse all 185 organizations participating in Google Summer of Code 2026, including 22 new ones. Find ideas lists, tech stacks, and contact information on gsoc.app.'
                        : 'Analyze GitHub PR activity, contributor stats, merge rates, and code metrics for any repo. Track Google Summer of Code 2026 project contributions on gsoc.app.'}
                />
                <link rel="canonical" href={`https://gsoc.app${isOrgs ? '/orgs' : '/'}`} />
                <meta property="og:title" content={isOrgs
                    ? 'GSoC 2026 Organizations — 185 Orgs | gsoc.app'
                    : 'GSoC 2026 PR Analytics & Contributor Insights | gsoc.app'}
                />
                <meta property="og:url" content={`https://gsoc.app${isOrgs ? '/orgs' : '/'}`} />
                <meta property="og:description" content={isOrgs
                    ? 'Browse all 185 GSoC 2026 organizations including 22 new ones. Find ideas lists, tech stacks, and contact information.'
                    : 'Analyze GitHub PR activity, contributor stats, and code metrics. Track Google Summer of Code 2026 contributions.'}
                />
                <meta name="twitter:title" content={isOrgs
                    ? 'GSoC 2026 Organizations — 185 Orgs | gsoc.app'
                    : 'GSoC 2026 PR Analytics & Contributor Insights | gsoc.app'}
                />
                <meta name="twitter:url" content={`https://gsoc.app${isOrgs ? '/orgs' : '/'}`} />
                <meta name="twitter:description" content={isOrgs
                    ? 'Browse all 185 GSoC 2026 organizations including 22 new ones.'
                    : 'Analyze GitHub PR activity and contributor stats for Google Summer of Code 2026 projects.'}
                />
            </Helmet>
            <App navigate={navigate} locationPathname={pathname} />
        </>
    );
}

export default AppWithRouter;
