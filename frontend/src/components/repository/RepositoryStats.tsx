import { GitMerge, GitPullRequest, Tag, Users } from 'lucide-react';
import React from 'react';
import { RepositoryStats as RepositoryStatsType } from '../../types';
import { Card } from '../common/Card';

/**
 * Repository stats component props
 */
interface RepositoryStatsProps {
    stats: RepositoryStatsType;
}

/**
 * Repository statistics display component
 * @class RepositoryStats
 * @extends {React.Component<RepositoryStatsProps>}
 */
export class RepositoryStats extends React.Component<RepositoryStatsProps> {
    /**
     * Render stat card
     */
    private renderStatCard(
        icon: React.ReactNode,
        label: string,
        value: number | string,
        color: string
    ): React.ReactNode {
        return (
            <div className="stat-card flex items-center gap-4">
                <div className={`p-3 rounded-lg ${color}`}>
                    {icon}
                </div>
                <div>
                    <p className="text-2xl font-bold text-white">{value}</p>
                    <p className="text-sm text-gray-400">{label}</p>
                </div>
            </div>
        );
    }

    /**
     * Render component
     */
    public render(): React.ReactNode {
        const { stats } = this.props;

        const maintainers = stats.contributors.filter((c) => c.isMaintainer).length;
        const mergedCount = stats.contributors.reduce((sum, c) => sum + c.mergedPRs, 0);
        const labelCount = Object.keys(stats.labelDistribution).length;

        return (
            <Card className="animate-in">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h2 className="text-xl font-semibold text-white">
                            {stats.owner}/{stats.repo}
                        </h2>
                        <p className="text-sm text-gray-400">
                            {stats.branch || 'All branches'} • Last {stats.timeFilter === 'all' ? 'all time' : stats.timeFilter}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {this.renderStatCard(
                        <GitPullRequest className="w-6 h-6 text-white" />,
                        'Total PRs',
                        stats.totalPRs,
                        'bg-primary-500/20'
                    )}
                    {this.renderStatCard(
                        <GitMerge className="w-6 h-6 text-white" />,
                        'Merged',
                        mergedCount,
                        'bg-purple-500/20'
                    )}
                    {this.renderStatCard(
                        <Users className="w-6 h-6 text-white" />,
                        'Contributors',
                        `${stats.contributors.length} (${maintainers} maintainers)`,
                        'bg-green-500/20'
                    )}
                    {this.renderStatCard(
                        <Tag className="w-6 h-6 text-white" />,
                        'Labels Used',
                        labelCount,
                        'bg-orange-500/20'
                    )}
                </div>
            </Card>
        );
    }
}
