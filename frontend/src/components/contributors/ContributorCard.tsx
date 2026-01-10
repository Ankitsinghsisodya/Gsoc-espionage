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
}

/**
 * Individual contributor card component
 * @class ContributorCard
 * @extends {React.Component<ContributorCardProps>}
 */
export class ContributorCard extends React.Component<ContributorCardProps> {
    /**
     * Render component
     */
    public render(): React.ReactNode {
        const { contributor, onClick } = this.props;

        return (
            <Card hoverable onClick={onClick}>
                <div className="flex items-center gap-4">
                    {/* Avatar */}
                    <img
                        src={contributor.avatarUrl}
                        alt={contributor.username}
                        className="w-12 h-12 rounded-full border-2 border-dark-600"
                    />

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-white truncate">
                                {contributor.username}
                            </h3>
                            {contributor.isMaintainer && (
                                <span className="badge badge-maintainer flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    Maintainer
                                </span>
                            )}
                        </div>

                        {/* Stats */}
                        <div className="flex items-center gap-4 mt-1">
                            <div className="flex items-center gap-1 text-sm text-gray-400">
                                <GitPullRequest className="w-4 h-4" />
                                <span>{contributor.totalPRs} PRs</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-purple-400">
                                <GitMerge className="w-4 h-4" />
                                <span>{contributor.mergedPRs} merged</span>
                            </div>
                        </div>
                    </div>

                    {/* Merge Rate */}
                    <div className="text-right">
                        <p className="text-lg font-bold text-white">
                            {contributor.totalPRs > 0
                                ? Math.round((contributor.mergedPRs / contributor.totalPRs) * 100)
                                : 0}%
                        </p>
                        <p className="text-xs text-gray-400">merge rate</p>
                    </div>
                </div>
            </Card>
        );
    }
}
