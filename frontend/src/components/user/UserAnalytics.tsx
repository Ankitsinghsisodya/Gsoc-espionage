import { ExternalLink, GitMerge, GitPullRequest, MapPin, Users } from 'lucide-react';
import React from 'react';
import { PullRequest, UserProfileStats } from '../../types';
import { Card } from '../common/Card';

/**
 * User analytics component props
 */
interface UserAnalyticsProps {
    userStats: UserProfileStats;
}

/**
 * User analytics component state
 */
interface UserAnalyticsState {
    selectedRepo: string;
    prFilter: 'all' | 'open' | 'merged' | 'closed';
}

/**
 * User Analytics Dashboard Component
 * Displays comprehensive GitHub user statistics with repo filtering
 */
export class UserAnalytics extends React.Component<UserAnalyticsProps, UserAnalyticsState> {
    constructor(props: UserAnalyticsProps) {
        super(props);
        this.state = {
            selectedRepo: '',
            prFilter: 'all',
        };
    }

    /**
     * Get filtered PRs based on selected repo and filter
     */
    private getFilteredPRs(): PullRequest[] {
        const { userStats } = this.props;
        const { selectedRepo, prFilter } = this.state;

        let prs = userStats.pullRequests;

        // Filter by repository
        if (selectedRepo) {
            prs = prs.filter(pr => pr.repositoryName === selectedRepo);
        }

        // Filter by status
        switch (prFilter) {
            case 'open':
                return prs.filter(pr => pr.state === 'open');
            case 'merged':
                return prs.filter(pr => pr.merged);
            case 'closed':
                return prs.filter(pr => pr.state === 'closed' && !pr.merged);
            default:
                return prs;
        }
    }

    /**
     * Get repositories sorted by PR count
     */
    private getSortedRepos(): Array<{ name: string; prCount: number; mergedCount: number }> {
        const { userStats } = this.props;

        return Object.entries(userStats.repositories)
            .map(([name, data]) => ({
                name,
                prCount: data.prCount,
                mergedCount: data.mergedCount,
            }))
            .sort((a, b) => b.prCount - a.prCount);
    }

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
     * Handle repo filter change
     */
    private handleRepoChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ selectedRepo: e.target.value });
    };

    /**
     * Handle PR filter change
     */
    private handlePRFilterChange = (filter: 'all' | 'open' | 'merged' | 'closed'): void => {
        this.setState({ prFilter: filter });
    };

    /**
     * Render profile header
     */
    private renderProfileHeader(): React.ReactNode {
        const { userStats } = this.props;

        return (
            <Card className="user-profile-header animate-in">
                <div className="user-profile-content">
                    <img
                        src={userStats.avatarUrl}
                        alt={`${userStats.username}'s avatar`}
                        className="user-avatar-large"
                        loading="lazy"
                    />
                    <div className="user-profile-info">
                        <div className="user-name-row">
                            <h2 className="user-display-name">{userStats.username}</h2>
                            <a
                                href={`https://github.com/${userStats.username}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="user-github-link"
                                aria-label={`View ${userStats.username} on GitHub`}
                            >
                                <ExternalLink className="w-4 h-4" aria-hidden="true" />
                                View on GitHub
                            </a>
                        </div>
                        {userStats.bio && (
                            <p className="user-bio">{userStats.bio}</p>
                        )}
                        <div className="user-meta">
                            {userStats.location && (
                                <span className="user-meta-item">
                                    <MapPin className="w-4 h-4" aria-hidden="true" />
                                    {userStats.location}
                                </span>
                            )}
                            <span className="user-meta-item">
                                <Users className="w-4 h-4" aria-hidden="true" />
                                {userStats.followers.toLocaleString()} followers
                            </span>
                            <span className="user-meta-item">
                                {userStats.publicRepos} public repos
                            </span>
                        </div>
                    </div>
                </div>
            </Card>
        );
    }

    /**
     * Render stats grid
     */
    private renderStatsGrid(): React.ReactNode {
        const { userStats } = this.props;
        const { totalStats } = userStats;
        const mergeRate = totalStats.totalPRs > 0
            ? Math.round((totalStats.mergedPRs / totalStats.totalPRs) * 100)
            : 0;

        const stats = [
            { label: 'Total PRs', value: totalStats.totalPRs, color: 'primary' },
            { label: 'Merged', value: totalStats.mergedPRs, color: 'merged' },
            { label: 'Open', value: totalStats.openPRs, color: 'open' },
            { label: 'Merge Rate', value: `${mergeRate}%`, color: 'rate' },
        ];

        return (
            <div className="user-stats-grid">
                {stats.map(stat => (
                    <div key={stat.label} className={`user-stat-card ${stat.color}`}>
                        <p className="user-stat-value">{stat.value}</p>
                        <p className="user-stat-label">{stat.label}</p>
                    </div>
                ))}
            </div>
        );
    }

    /**
     * Render repository contribution cards
     */
    private renderRepoContributions(): React.ReactNode {
        const repos = this.getSortedRepos();
        const { selectedRepo } = this.state;

        if (repos.length === 0) {
            return (
                <Card className="empty-state">
                    <p>No repository contributions found.</p>
                </Card>
            );
        }

        return (
            <Card className="repo-contributions-section animate-in">
                <h3 className="section-title">
                    <GitMerge className="w-5 h-5" aria-hidden="true" />
                    Repository Contributions ({repos.length})
                </h3>
                <div className="repo-contributions-grid">
                    {repos.slice(0, 12).map(repo => {
                        const mergeRate = repo.prCount > 0
                            ? Math.round((repo.mergedCount / repo.prCount) * 100)
                            : 0;
                        const isSelected = selectedRepo === repo.name;

                        return (
                            <button
                                key={repo.name}
                                className={`repo-contribution-card ${isSelected ? 'selected' : ''}`}
                                onClick={() => this.setState({ selectedRepo: isSelected ? '' : repo.name })}
                                aria-pressed={isSelected}
                            >
                                <h4 className="repo-name">{repo.name}</h4>
                                <div className="repo-stats">
                                    <span className="repo-pr-count">{repo.prCount} PRs</span>
                                    <span className="repo-merge-rate">{mergeRate}% merged</span>
                                </div>
                            </button>
                        );
                    })}
                </div>
                {repos.length > 12 && (
                    <p className="show-more-hint">Showing top 12 repositories by PR count</p>
                )}
            </Card>
        );
    }

    /**
     * Render PR list
     */
    private renderPRList(): React.ReactNode {
        const filteredPRs = this.getFilteredPRs();
        const { selectedRepo, prFilter } = this.state;
        const repos = this.getSortedRepos();

        const filterTabs: Array<{ key: 'all' | 'open' | 'merged' | 'closed'; label: string }> = [
            { key: 'all', label: 'All' },
            { key: 'open', label: 'Open' },
            { key: 'merged', label: 'Merged' },
            { key: 'closed', label: 'Closed' },
        ];

        return (
            <Card className="user-pr-list-section animate-in">
                <div className="pr-list-header">
                    <h3 className="section-title">
                        <GitPullRequest className="w-5 h-5" aria-hidden="true" />
                        Pull Requests
                    </h3>
                    <div className="pr-list-controls">
                        <select
                            className="repo-filter-select"
                            value={selectedRepo}
                            onChange={this.handleRepoChange}
                            aria-label="Filter by repository"
                        >
                            <option value="">All repositories</option>
                            {repos.map(repo => (
                                <option key={repo.name} value={repo.name}>
                                    {repo.name} ({repo.prCount})
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Filter tabs */}
                <div className="pr-filter-tabs">
                    {filterTabs.map(tab => (
                        <button
                            key={tab.key}
                            className={`pr-filter-tab ${prFilter === tab.key ? 'active' : ''}`}
                            onClick={() => this.handlePRFilterChange(tab.key)}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* PR List */}
                {filteredPRs.length === 0 ? (
                    <div className="pr-list-empty">
                        <GitPullRequest className="w-8 h-8" aria-hidden="true" />
                        <p>No pull requests found</p>
                    </div>
                ) : (
                    <div className="pr-list">
                        {filteredPRs.slice(0, 50).map(pr => (
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
                                </div>
                            </a>
                        ))}
                    </div>
                )}
                {filteredPRs.length > 50 && (
                    <p className="show-more-hint">Showing first 50 pull requests</p>
                )}
            </Card>
        );
    }

    public render(): React.ReactNode {
        return (
            <div className="user-analytics">
                {this.renderProfileHeader()}
                {this.renderStatsGrid()}
                {this.renderRepoContributions()}
                {this.renderPRList()}
            </div>
        );
    }
}
