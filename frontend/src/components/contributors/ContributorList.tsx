import React from 'react';
import { ContributorStats } from '../../types';
import { ContributorCard } from './ContributorCard';

/**
 * Contributor list props
 */
interface ContributorListProps {
    contributors: ContributorStats[];
    onContributorClick?: (contributor: ContributorStats) => void;
}

/**
 * Contributor list component
 * @class ContributorList
 * @extends {React.Component<ContributorListProps>}
 */
export class ContributorList extends React.Component<ContributorListProps> {
    /**
     * Render component
     */
    public render(): React.ReactNode {
        const { contributors, onContributorClick } = this.props;

        if (contributors.length === 0) {
            return (
                <div className="text-center py-12 text-gray-400">
                    <p>No contributors found for this period.</p>
                </div>
            );
        }

        return (
            <div className="space-y-4">
                <h3 className="text-lg font-semibold text-white">
                    Contributors ({contributors.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2">
                    {contributors.map((contributor) => (
                        <ContributorCard
                            key={contributor.username}
                            contributor={contributor}
                            onClick={() => onContributorClick?.(contributor)}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
