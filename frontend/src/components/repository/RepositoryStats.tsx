import { GitMerge, GitPullRequest, GitPullRequestDraft, Tag } from 'lucide-react';
import React from 'react';
import { PullRequest, RepositoryStats as RepositoryStatsType } from '../../types';
import { Card } from '../common/Card';
import { Modal } from '../common/Modal';

/**
 * PR filter type for stat cards
 */
type StatFilter = 'all' | 'merged' | 'open' | 'labels' | null;

/**
 * Repository stats component props
 */
interface RepositoryStatsProps {
    stats: RepositoryStatsType;
}

/**
 * Repository stats component state
 */
interface RepositoryStatsState {
    activeFilter: StatFilter;
}

/**
 * Repository statistics display component with clickable stats
 */
export class RepositoryStats extends React.Component<RepositoryStatsProps, RepositoryStatsState> {
    constructor(props: RepositoryStatsProps) {
        super(props);
        this.state = {
            activeFilter: null,
        };
    }

    /**
     * Handle stat card click
     */
    private handleStatClick = (filter: StatFilter): void => {
        this.setState({ activeFilter: filter });
    };

    /**
     * Close the PR modal
     */
    private closeModal = (): void => {
        this.setState({ activeFilter: null });
    };

    /**
     * Get filtered PRs based on active filter
     */
    private getFilteredPRs(): PullRequest[] {
        const { stats } = this.props;
        const { activeFilter } = this.state;

        if (!activeFilter || !stats.recentPRs) return [];

        switch (activeFilter) {
            case 'merged':
                return stats.recentPRs.filter(pr => pr.merged);
            case 'open':
                return stats.recentPRs.filter(pr => pr.state === 'open');
            case 'all':
            default:
                return stats.recentPRs;
        }
    }

    /**
     * Get modal title based on filter
     */
    private getModalTitle(): string {
        const { activeFilter } = this.state;
        switch (activeFilter) {
            case 'merged':
                return 'Merged Pull Requests';
            case 'open':
                return 'Open Pull Requests';
            case 'labels':
                return 'Label Distribution';
            default:
                return 'All Pull Requests';
        }
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
     * Render stat card
     */
    private renderStatCard(
        icon: React.ReactNode,
        label: string,
        value: number | string,
        color: string = 'bg-primary',
        filter: StatFilter
    ): React.ReactNode {
        const { activeFilter } = this.state;
        const isActive = activeFilter === filter;

        return (
            <button
                className={`repo-stat-card clickable ${isActive ? 'active' : ''}`}
                onClick={() => this.handleStatClick(filter)}
                aria-label={`View ${label}: ${value}`}
                aria-pressed={isActive}
            >
                <div className={`repo-stat-icon ${color}`} aria-hidden="true">
                    {icon}
                </div>
                <div className="repo-stat-content">
                    <p className="repo-stat-value">{value}</p>
                    <p className="repo-stat-label">{label}</p>
                </div>
            </button>
        );
    }

    /**
     * Render label distribution
     */
    private renderLabelsContent(): React.ReactNode {
        const { stats } = this.props;
        const labels = Object.entries(stats.labelDistribution)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 20);

        if (labels.length === 0) {
            return (
                <div className="pr-list-empty">
                    <Tag className="w-8 h-8" aria-hidden="true" />
                    <p>No labels found</p>
                </div>
            );
        }

        return (
            <div className="labels-grid">
                {labels.map(([label, count]) => (
                    <div key={label} className="label-item">
                        <span className="label-name">{label}</span>
                        <span className="label-count">{count}</span>
                    </div>
                ))}
            </div>
        );
    }

    /**
     * Render PR list
     */
    private renderPRList(): React.ReactNode {
        const filteredPRs = this.getFilteredPRs();

        if (filteredPRs.length === 0) {
            return (
                <div className="pr-list-empty">
                    <GitPullRequest className="w-8 h-8" aria-hidden="true" />
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
                            <span className="pr-author">by {pr.user.login}</span>
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
     * Render modal content
     */
    private renderModalContent(): React.ReactNode {
        const { activeFilter } = this.state;

        if (activeFilter === 'labels') {
            return this.renderLabelsContent();
        }

        return this.renderPRList();
    }

    /**
     * Render component
     */
    public render(): React.ReactNode {
        const { stats } = this.props;
        const { activeFilter } = this.state;

        const mergedCount = stats.contributors.reduce((sum, c) => sum + c.mergedPRs, 0);
        const openCount = stats.contributors.reduce((sum, c) => sum + c.openPRs, 0);
        const labelCount = Object.keys(stats.labelDistribution).length;

        return (
            <>
                <Card className="animate-in">
                    <div className="repo-stats-header">
                        <div>
                            <h2 className="repo-stats-title">
                                {stats.owner}/{stats.repo}
                            </h2>
                            <p className="repo-stats-subtitle">
                                {stats.branch || 'All branches'} • Last {stats.timeFilter === 'all' ? 'all time' : stats.timeFilter}
                            </p>
                        </div>
                    </div>

                    <div className="repo-stats-grid">
                        {this.renderStatCard(
                            <GitPullRequest className="w-5 h-5" />,
                            'Total PRs',
                            stats.totalPRs,
                            'bg-primary',
                            'all'
                        )}
                        {this.renderStatCard(
                            <GitMerge className="w-5 h-5" />,
                            'Merged',
                            mergedCount,
                            'bg-merged',
                            'merged'
                        )}
                        {this.renderStatCard(
                            <GitPullRequestDraft className="w-5 h-5" />,
                            'Open',
                            openCount,
                            'bg-open',
                            'open'
                        )}
                        {this.renderStatCard(
                            <Tag className="w-5 h-5" />,
                            'Labels',
                            labelCount,
                            'bg-labels',
                            'labels'
                        )}
                    </div>
                </Card>

                {/* PR List Modal */}
                <Modal
                    isOpen={activeFilter !== null}
                    onClose={this.closeModal}
                    title={this.getModalTitle()}
                    size="lg"
                >
                    {this.renderModalContent()}
                </Modal>
            </>
        );
    }
}
