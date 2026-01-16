import { Crown, ExternalLink, GitMerge, GitPullRequest, User } from 'lucide-react';
import React from 'react';
import { GitHubService } from '../../services';
import { ContributorStats, PullRequest } from '../../types';
import { Loader } from '../common';
import { Modal } from '../common/Modal';

/**
 * PR filter type
 */
type PRFilter = 'all' | 'open' | 'merged';

/**
 * Contributor modal props
 */
interface ContributorModalProps {
    contributor: ContributorStats | null;
    isOpen: boolean;
    onClose: () => void;
    /** Optional repository filter in 'owner/repo' format to show only PRs from this repo */
    repoFilter?: string;
    /** Optional callback to analyze user's full profile */
    onAnalyzeUser?: (username: string) => void;
}

/**
 * Contributor modal state
 */
interface ContributorModalState {
    pullRequests: PullRequest[];
    allPullRequests: PullRequest[];
    loading: boolean;
    filter: PRFilter;
    selectedRepo: string;
}

/**
 * Detailed contributor statistics modal with PR list
 */
export class ContributorModal extends React.Component<ContributorModalProps, ContributorModalState> {
    constructor(props: ContributorModalProps) {
        super(props);
        this.state = {
            pullRequests: [],
            allPullRequests: [],
            loading: false,
            filter: 'all',
            selectedRepo: '',
        };
    }

    public componentDidUpdate(prevProps: ContributorModalProps): void {
        // Fetch PRs when modal opens
        if (this.props.isOpen && !prevProps.isOpen && this.props.contributor) {
            this.fetchPullRequests();
        }
        // Reset when modal closes
        if (!this.props.isOpen && prevProps.isOpen) {
            this.setState({ pullRequests: [], allPullRequests: [], filter: 'all', selectedRepo: '' });
        }
    }

    /**
     * Fetch pull requests for the contributor
     */
    private async fetchPullRequests(): Promise<void> {
        const { contributor } = this.props;
        if (!contributor) return;

        this.setState({ loading: true });

        try {
            const profile = await GitHubService.fetchUserStats(contributor.username, '3m');
            const prs = profile.pullRequests || [];
            // Store all PRs and set initial selectedRepo to show all
            this.setState({
                allPullRequests: prs,
                pullRequests: prs,
                loading: false,
                selectedRepo: '',
            });
        } catch (error) {
            console.error('Failed to fetch pull requests:', error);
            this.setState({ loading: false });
        }
    }

    /**
     * Filter pull requests based on selected filter
     */
    private getFilteredPRs(): PullRequest[] {
        const { allPullRequests, filter, selectedRepo } = this.state;

        // First filter by repo
        let prs = selectedRepo
            ? allPullRequests.filter(pr => pr.repositoryName === selectedRepo)
            : allPullRequests;

        // Then filter by status
        switch (filter) {
            case 'open':
                return prs.filter(pr => pr.state === 'open');
            case 'merged':
                return prs.filter(pr => pr.merged);
            default:
                return prs;
        }
    }

    /**
     * Get unique repos from PRs
     */
    private getRepoOptions(): string[] {
        const { allPullRequests } = this.state;
        const repos = new Set(allPullRequests.map(pr => pr.repositoryName));
        return Array.from(repos).sort();
    }

    /**
     * Handle repo filter change
     */
    private handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedRepo: e.target.value });
    };

    /**
     * Handle filter change
     */
    private handleFilterChange = (filter: PRFilter): void => {
        this.setState({ filter });
    };

    /**
     * Format relative time
     */
    private formatDate(dateString: string): string {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

        if (diffDays === 0) return 'Today';
        if (diffDays === 1) return 'Yesterday';
        if (diffDays < 7) return `${diffDays} days ago`;
        if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
        return `${Math.floor(diffDays / 365)} years ago`;
    }

    /**
     * Render stat item
     */
    private renderStat(label: string, value: number | string, color: string = ''): React.ReactNode {
        return (
            <div className="modal-stat-card">
                <p className={`modal-stat-value ${color}`}>{value}</p>
                <p className="modal-stat-label">{label}</p>
            </div>
        );
    }

    /**
     * Render filter tabs
     */
    private renderFilterTabs(): React.ReactNode {
        const { filter, selectedRepo, allPullRequests } = this.state;
        const { contributor } = this.props;

        if (!contributor) return null;

        const repoOptions = this.getRepoOptions();
        const filteredCount = this.getFilteredPRs().length;

        const tabs: { key: PRFilter; label: string }[] = [
            { key: 'all', label: 'All' },
            { key: 'open', label: 'Open' },
            { key: 'merged', label: 'Merged' },
        ];

        return (
            <div className="pr-filters-container">
                {/* Repo dropdown */}
                <div className="pr-repo-filter">
                    <select
                        className="repo-filter-select"
                        value={selectedRepo}
                        onChange={this.handleRepoChange}
                    >
                        <option value="">All Repositories ({allPullRequests.length} PRs)</option>
                        {repoOptions.map(repo => (
                            <option key={repo} value={repo}>{repo}</option>
                        ))}
                    </select>
                </div>

                {/* Status filter tabs */}
                <div className="pr-filter-tabs">
                    {tabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`pr-filter-tab ${filter === tab.key ? 'active' : ''}`}
                            onClick={() => this.handleFilterChange(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                <div className="pr-count-badge">
                    {filteredCount} PR{filteredCount !== 1 ? 's' : ''} found
                </div>
            </div>
        );
    }

    /**
     * Render PR list
     */
    private renderPRList(): React.ReactNode {
        const { loading } = this.state;
        const filteredPRs = this.getFilteredPRs();

        if (loading) {
            return (
                <div className="pr-list-loading">
                    <Loader size="sm" message="Loading pull requests..." />
                </div>
            );
        }

        if (filteredPRs.length === 0) {
            return (
                <div className="pr-list-empty">
                    <GitPullRequest className="w-8 h-8" />
                    <p>No pull requests found</p>
                </div>
            );
        }

        return (
            <div className="pr-list">
                {filteredPRs.map(pr => (
                    <a
                        key={pr.htmlUrl}
                        href={pr.htmlUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="pr-item"
                    >
                        <div className="pr-item-header">
                            <span className={`pr-state-badge ${pr.merged ? 'merged' : pr.state}`}>
                                {pr.merged ? 'Merged' : pr.state === 'open' ? 'Open' : 'Closed'}
                            </span>
                            <span className="pr-repo-name">{pr.repositoryName}</span>
                        </div>
                        <h4 className="pr-title">{pr.title}</h4>
                        <div className="pr-meta">
                            <span className="pr-number">#{pr.number}</span>
                            <span className="pr-date">{this.formatDate(pr.createdAt)}</span>
                            {(pr.additions > 0 || pr.deletions > 0) && (
                                <span className="pr-changes">
                                    <span className="pr-additions">+{pr.additions}</span>
                                    <span className="pr-deletions">-{pr.deletions}</span>
                                </span>
                            )}
                        </div>
                    </a>
                ))}
            </div>
        );
    }

    /**
     * Render component
     */
    public render(): React.ReactNode {
        const { contributor, isOpen, onClose } = this.props;

        if (!contributor) return null;

        const mergeRate = contributor.totalPRs > 0
            ? Math.round((contributor.mergedPRs / contributor.totalPRs) * 100)
            : 0;

        return (
            <Modal isOpen={isOpen} onClose={onClose} title="Contributor Details" size="lg">
                {/* Header */}
                <div className="modal-contributor-header">
                    <img
                        src={contributor.avatarUrl}
                        alt={`${contributor.username}'s profile picture`}
                        className="modal-contributor-avatar"
                        loading="lazy"
                    />
                    <div>
                        <div className="modal-contributor-name-row">
                            <h2 className="modal-contributor-name">{contributor.username}</h2>
                            {contributor.isMaintainer && (
                                <span className="badge badge-maintainer">
                                    <Crown className="w-3 h-3" aria-hidden="true" />
                                    Maintainer
                                </span>
                            )}
                        </div>
                        <div className="modal-actions">
                            <a
                                href={`https://github.com/${contributor.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="modal-github-link"
                            >
                                View on GitHub
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                            </a>
                            {this.props.onAnalyzeUser && (
                                <button
                                    type="button"
                                    className="modal-analyze-btn"
                                    onClick={() => {
                                        this.props.onAnalyzeUser!(contributor.username);
                                        this.props.onClose();
                                    }}
                                >
                                    <User className="w-4 h-4" aria-hidden="true" />
                                    Analyze Full Profile
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="modal-stats-grid">
                    {this.renderStat('Total PRs', contributor.totalPRs, 'text-primary')}
                    {this.renderStat('Merged', contributor.mergedPRs, 'text-merged')}
                    {this.renderStat('Open', contributor.openPRs, 'text-open')}
                    {this.renderStat('Closed', contributor.closedPRs, 'text-closed')}
                </div>

                {/* Merge Rate */}
                <div className="modal-merge-rate">
                    <div className="modal-merge-rate-header">
                        <GitMerge className="w-5 h-5" aria-hidden="true" />
                        <span>Merge Rate</span>
                    </div>
                    <div className="modal-merge-rate-bar">
                        <div
                            className="modal-merge-rate-fill"
                            style={{ width: `${mergeRate}%` }}
                        />
                    </div>
                    <p className="modal-merge-rate-value">{mergeRate}%</p>
                </div>

                {/* PR List Section */}
                <div className="pr-list-section">
                    <div className="pr-list-header">
                        <h3 className="pr-list-title">
                            <GitPullRequest className="w-5 h-5" aria-hidden="true" />
                            Pull Requests
                        </h3>
                    </div>
                    {this.renderFilterTabs()}
                    {this.renderPRList()}
                </div>
            </Modal>
        );
    }
}
