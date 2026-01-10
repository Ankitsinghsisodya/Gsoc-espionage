import { Code, Crown, ExternalLink, GitMerge } from 'lucide-react';
import React from 'react';
import { ContributorStats } from '../../types';
import { Modal } from '../common/Modal';

/**
 * Contributor modal props
 */
interface ContributorModalProps {
    contributor: ContributorStats | null;
    isOpen: boolean;
    onClose: () => void;
}

/**
 * Detailed contributor statistics modal
 * @class ContributorModal
 * @extends {React.Component<ContributorModalProps>}
 */
export class ContributorModal extends React.Component<ContributorModalProps> {
    /**
     * Render stat item
     */
    private renderStat(label: string, value: number | string, color: string = ''): React.ReactNode {
        return (
            <div className="stat-card text-center">
                <p className={`text-2xl font-bold ${color || 'text-white'}`}>{value}</p>
                <p className="text-sm text-gray-400">{label}</p>
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
                <div className="flex items-center gap-4 mb-6">
                    <img
                        src={contributor.avatarUrl}
                        alt={contributor.username}
                        className="w-20 h-20 rounded-full border-4 border-primary-500"
                    />
                    <div>
                        <div className="flex items-center gap-2">
                            <h2 className="text-2xl font-bold text-white">{contributor.username}</h2>
                            {contributor.isMaintainer && (
                                <span className="badge badge-maintainer flex items-center gap-1">
                                    <Crown className="w-3 h-3" />
                                    Maintainer
                                </span>
                            )}
                        </div>
                        <a
                            href={`https://github.com/${contributor.username}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-primary-400 hover:text-primary-300 mt-1"
                        >
                            View on GitHub
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    {this.renderStat('Total PRs', contributor.totalPRs)}
                    {this.renderStat('Merged', contributor.mergedPRs, 'text-purple-400')}
                    {this.renderStat('Open', contributor.openPRs, 'text-yellow-400')}
                    {this.renderStat('Closed', contributor.closedPRs, 'text-red-400')}
                </div>

                {/* Additional Stats */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    <div className="stat-card">
                        <div className="flex items-center gap-2 text-primary-400 mb-2">
                            <GitMerge className="w-5 h-5" />
                            <span className="font-medium">Merge Rate</span>
                        </div>
                        <p className="text-3xl font-bold text-white">{mergeRate}%</p>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-2 text-green-400 mb-2">
                            <Code className="w-5 h-5" />
                            <span className="font-medium">Lines Added</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            +{contributor.totalAdditions.toLocaleString()}
                        </p>
                    </div>

                    <div className="stat-card">
                        <div className="flex items-center gap-2 text-red-400 mb-2">
                            <Code className="w-5 h-5" />
                            <span className="font-medium">Lines Removed</span>
                        </div>
                        <p className="text-3xl font-bold text-white">
                            -{contributor.totalDeletions.toLocaleString()}
                        </p>
                    </div>
                </div>
            </Modal>
        );
    }
}
