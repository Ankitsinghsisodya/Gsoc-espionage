import { ArrowDown, ArrowUp } from 'lucide-react';
import React from 'react';
import { ContributorStats } from '../../types';
import { ContributorCard } from './ContributorCard';

/**
 * Sort options for contributors
 */
type SortField = 'totalPRs' | 'mergedPRs' | 'openPRs' | 'closedPRs';
type SortDirection = 'asc' | 'desc';

const SORT_OPTIONS: { value: SortField; label: string }[] = [
    { value: 'totalPRs', label: 'Total PRs' },
    { value: 'mergedPRs', label: 'Merged PRs' },
    { value: 'openPRs', label: 'Open PRs' },
    { value: 'closedPRs', label: 'Closed PRs' },
];

/**
 * Contributor list props
 */
interface ContributorListProps {
    contributors: ContributorStats[];
    onContributorClick?: (contributor: ContributorStats) => void;
}

/**
 * Contributor list state
 */
interface ContributorListState {
    sortField: SortField;
    sortDirection: SortDirection;
}

/**
 * Contributor list component with sorting
 */
export class ContributorList extends React.Component<ContributorListProps, ContributorListState> {
    constructor(props: ContributorListProps) {
        super(props);
        this.state = {
            sortField: 'totalPRs',
            sortDirection: 'desc',
        };
    }

    private handleSortChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ sortField: e.target.value as SortField });
    };

    private toggleSortDirection = (): void => {
        this.setState((state) => ({
            sortDirection: state.sortDirection === 'asc' ? 'desc' : 'asc',
        }));
    };

    private getSortedContributors(): ContributorStats[] {
        const { contributors } = this.props;
        const { sortField, sortDirection } = this.state;

        return [...contributors].sort((a, b) => {
            let aVal = a[sortField];
            let bVal = b[sortField];

            // Handle undefined/null values
            if (aVal == null) aVal = 0;
            if (bVal == null) bVal = 0;

            const diff = sortDirection === 'asc' ? aVal - bVal : bVal - aVal;
            return diff;
        });
    }

    public render(): React.ReactNode {
        const { contributors, onContributorClick } = this.props;
        const { sortField, sortDirection } = this.state;

        if (contributors.length === 0) {
            return (
                <div className="empty-state">
                    <p>No contributors found for this period.</p>
                </div>
            );
        }

        const sortedContributors = this.getSortedContributors();

        return (
            <div className="contributor-list">
                {/* Header with Sort Controls */}
                <div className="contributor-list-header">
                    <h3 className="contributor-list-title">
                        Contributors ({contributors.length})
                    </h3>

                    <div className="contributor-sort-controls">
                        <label className="contributor-sort-label">Sort by:</label>
                        <select
                            className="contributor-sort-select"
                            value={sortField}
                            onChange={this.handleSortChange}
                        >
                            {SORT_OPTIONS.map((option) => (
                                <option key={option.value} value={option.value}>
                                    {option.label}
                                </option>
                            ))}
                        </select>
                        <button
                            className="contributor-sort-direction"
                            onClick={this.toggleSortDirection}
                            title={`Sort ${sortDirection === 'asc' ? 'descending' : 'ascending'}`}
                        >
                            {sortDirection === 'asc' ? (
                                <ArrowUp className="w-4 h-4" />
                            ) : (
                                <ArrowDown className="w-4 h-4" />
                            )}
                        </button>
                    </div>
                </div>

                {/* Contributor Grid */}
                <div className="contributor-grid">
                    {sortedContributors.map((contributor, index) => (
                        <ContributorCard
                            key={contributor.username}
                            contributor={contributor}
                            onClick={() => onContributorClick?.(contributor)}
                            rank={index + 1}
                        />
                    ))}
                </div>
            </div>
        );
    }
}
