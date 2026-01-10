import { Clock, Search } from 'lucide-react';
import React from 'react';
import { TimeFilter } from '../../types';
import { Button } from '../common/Button';

/**
 * Repository form props
 */
interface RepositoryFormProps {
    onSubmit: (url: string, branch: string, filter: TimeFilter) => void;
    loading?: boolean;
    branches?: string[];
    onUrlChange?: (url: string) => void;
}

/**
 * Repository form state
 */
interface RepositoryFormState {
    url: string;
    branch: string;
    filter: TimeFilter;
}

/**
 * Time filter options
 */
const TIME_FILTERS: { value: TimeFilter; label: string }[] = [
    { value: '2w', label: '2 Weeks' },
    { value: '1m', label: '1 Month' },
    { value: '3m', label: '3 Months' },
    { value: '6m', label: '6 Months' },
    { value: 'all', label: 'All Time' },
];

/**
 * Repository URL input form
 * @class RepositoryForm
 * @extends {React.Component<RepositoryFormProps, RepositoryFormState>}
 */
export class RepositoryForm extends React.Component<RepositoryFormProps, RepositoryFormState> {
    constructor(props: RepositoryFormProps) {
        super(props);
        this.state = {
            url: '',
            branch: '',
            filter: '1m',
        };
    }

    /**
     * Handle form submission
     */
    private handleSubmit = (e: React.FormEvent): void => {
        e.preventDefault();
        const { url, branch, filter } = this.state;
        if (url.trim()) {
            this.props.onSubmit(url.trim(), branch, filter);
        }
    };

    /**
     * Handle URL change
     */
    private handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        const url = e.target.value;
        this.setState({ url });
        if (this.props.onUrlChange) {
            this.props.onUrlChange(url);
        }
    };

    /**
     * Handle branch change
     */
    private handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>): void => {
        this.setState({ branch: e.target.value });
    };

    /**
     * Handle filter change
     */
    private handleFilterChange = (filter: TimeFilter): void => {
        this.setState({ filter });
    };

    /**
     * Render form
     */
    public render(): React.ReactNode {
        const { loading, branches } = this.props;
        const { url, branch, filter } = this.state;

        return (
            <form onSubmit={this.handleSubmit} className="space-y-4">
                {/* URL Input */}
                <div className="relative">
                    <input
                        type="text"
                        value={url}
                        onChange={this.handleUrlChange}
                        placeholder="Enter GitHub repository URL (e.g., facebook/react)"
                        className="input pl-12 pr-4"
                        disabled={loading}
                    />
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
                </div>

                {/* Filters Row */}
                <div className="flex flex-wrap gap-4">
                    {/* Branch Selector */}
                    {branches && branches.length > 0 && (
                        <div className="flex-1 min-w-[200px]">
                            <select
                                value={branch}
                                onChange={this.handleBranchChange}
                                className="input"
                                disabled={loading}
                            >
                                <option value="">All branches</option>
                                {branches.map((b) => (
                                    <option key={b} value={b}>{b}</option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Time Filter */}
                    <div className="flex items-center gap-2">
                        <Clock className="w-5 h-5 text-gray-500" />
                        <div className="flex rounded-lg overflow-hidden border border-dark-600">
                            {TIME_FILTERS.map((tf) => (
                                <button
                                    key={tf.value}
                                    type="button"
                                    onClick={() => this.handleFilterChange(tf.value)}
                                    disabled={loading}
                                    className={`px-3 py-2 text-sm font-medium transition-colors ${filter === tf.value
                                            ? 'bg-primary-500 text-white'
                                            : 'bg-dark-700 text-gray-400 hover:text-white'
                                        }`}
                                >
                                    {tf.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Submit Button */}
                <Button
                    type="submit"
                    variant="primary"
                    loading={loading}
                    disabled={!url.trim()}
                    className="w-full sm:w-auto"
                >
                    Analyze Repository
                </Button>
            </form>
        );
    }
}
