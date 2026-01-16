import { Crown, GitMerge, GitPullRequest } from 'lucide-react';
import React from 'react';
import { ContributorStats } from '../../types';
import { Card } from '../common/Card';

/**
 * Contributor card props
 */
interface ContributorCardProps {
    contributor: ContributorStats;
    onClick?: () => void;
    rank?: number;
}

/**
 * Individual contributor card component with rank display
 */
export class ContributorCard extends React.Component<ContributorCardProps> {
    public render(): React.ReactNode {
        const { contributor, onClick, rank } = this.props;

        const mergeRate = contributor.totalPRs > 0
            ? Math.round((contributor.mergedPRs / contributor.totalPRs) * 100)
            : 0;

        return (
            <Card hoverable onClick={onClick}>
                <div className="contributor-card">
                    {/* Rank Badge */}
                    {rank && rank <= 3 && (
                        <div className={`contributor-rank rank-${rank}`}>
                            #{rank}
                        </div>
                    )}

                    {/* Avatar */}
                    <img
                        src={contributor.avatarUrl}
                        alt={`${contributor.username}'s avatar`}
                        className="contributor-avatar"
                        loading="lazy"
                    />

                    {/* Info */}
                    <div className="contributor-info">
                        <div className="contributor-name-row">
                            <h3 className="contributor-name">
                                {contributor.username}
                            </h3>
                            {contributor.isMaintainer && (
                                <span className="badge badge-maintainer">
                                    <Crown className="w-3 h-3" aria-hidden="true" />
                                    Maintainer
                                </span>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="contributor-stats">
                            <div className="contributor-stat">
                                <GitPullRequest className="w-4 h-4" aria-hidden="true" />
                                <span>{contributor.totalPRs} PRs</span>
                            </div>
                            <div className="contributor-stat merged">
                                <GitMerge className="w-4 h-4" aria-hidden="true" />
                                <span>{contributor.mergedPRs} merged</span>
                            </div>
                            <div className="contributor-stat open">
                                <span>{contributor.openPRs} open</span>
                            </div>
                        </div>
                    </div>

                    {/* Merge Rate */}
                    <div className="contributor-merge-rate">
                        <p className="contributor-merge-rate-value">{mergeRate}%</p>
                        <p className="contributor-merge-rate-label">merge rate</p>
                    </div>
                </div>
            </Card>
        );
    }
}
