import { ArrowUp, Clock, Plus } from 'lucide-react';
import React from 'react';
import { TimeFilter } from '../../types';

/**
 * Chat input component props
 */
interface ChatInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    placeholder?: string;
    loading?: boolean;
    timeFilter: TimeFilter;
    onTimeFilterChange: (filter: TimeFilter) => void;
}

/**
 * Time filter options
 */
const TIME_FILTER_OPTIONS: { value: TimeFilter; label: string }[] = [
    { value: '2w', label: '2 weeks' },
    { value: '1m', label: '1 month' },
    { value: '3m', label: '3 months' },
    { value: '6m', label: '6 months' },
    { value: 'all', label: 'All time' },
];

/**
 * Chat input component state
 */
interface ChatInputState {
    showFilterDropdown: boolean;
}

/**
 * Claude-style chat input field
 */
export class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
    constructor(props: ChatInputProps) {
        super(props);
        this.state = {
            showFilterDropdown: false,
        };
    }

    private handleKeyDown = (e: React.KeyboardEvent): void => {
        if (e.key === 'Enter' && !e.shiftKey) {
            // Only submit if not loading and input has content
            if (!this.props.loading && this.props.value.trim()) {
                e.preventDefault();
                this.props.onSubmit();
            }
        }
    };

    private toggleFilterDropdown = (): void => {
        this.setState((state) => ({ showFilterDropdown: !state.showFilterDropdown }));
    };

    private handleFilterSelect = (filter: TimeFilter): void => {
        this.props.onTimeFilterChange(filter);
        this.setState({ showFilterDropdown: false });
    };

    private getFilterLabel = (): string => {
        const option = TIME_FILTER_OPTIONS.find(o => o.value === this.props.timeFilter);
        return option?.label || '1 month';
    };

    public render(): React.ReactNode {
        const { value, onChange, onSubmit, placeholder, loading, timeFilter } = this.props;
        const { showFilterDropdown } = this.state;

        return (
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    <input
                        type="text"
                        className="chat-input"
                        placeholder={placeholder || "Enter a GitHub repository URL..."}
                        value={value}
                        onChange={(e) => onChange(e.target.value)}
                        onKeyDown={this.handleKeyDown}
                        disabled={loading}
                    />

                    <div className="chat-input-actions">
                        {/* Attachment button */}
                        <button className="chat-input-btn" title="Options">
                            <Plus className="w-4 h-4" />
                        </button>

                        {/* Time filter */}
                        <div className="chat-input-filter-wrapper">
                            <button
                                className="chat-input-btn chat-input-filter"
                                onClick={this.toggleFilterDropdown}
                                title="Time filter"
                            >
                                <Clock className="w-4 h-4" />
                            </button>

                            {showFilterDropdown && (
                                <div className="chat-input-filter-dropdown">
                                    {TIME_FILTER_OPTIONS.map((option) => (
                                        <button
                                            key={option.value}
                                            className={`chat-input-filter-option ${timeFilter === option.value ? 'active' : ''}`}
                                            onClick={() => this.handleFilterSelect(option.value)}
                                        >
                                            {option.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Spacer */}
                        <div className="flex-1" />

                        {/* Filter indicator */}
                        <span className="chat-input-filter-label">{this.getFilterLabel()}</span>

                        {/* Submit button */}
                        <button
                            className={`chat-input-submit ${value.trim() ? 'active' : ''}`}
                            onClick={onSubmit}
                            disabled={loading || !value.trim()}
                            title="Analyze"
                        >
                            <ArrowUp className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>
        );
    }
}
