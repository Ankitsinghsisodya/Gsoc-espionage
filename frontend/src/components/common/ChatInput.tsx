import { ArrowUp, Clock, History, Plus, X } from 'lucide-react';
import React from 'react';
import { StorageService } from '../../services/StorageService';
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
    showAutocomplete: boolean;
    recentSearches: string[];
    highlightedIndex: number;
}

/**
 * Claude-style chat input field with recent searches autocomplete
 */
export class ChatInput extends React.Component<ChatInputProps, ChatInputState> {
    private inputRef = React.createRef<HTMLInputElement>();

    constructor(props: ChatInputProps) {
        super(props);
        this.state = {
            showFilterDropdown: false,
            showAutocomplete: false,
            recentSearches: [],
            highlightedIndex: -1,
        };
    }

    componentDidMount(): void {
        // Load recent searches on mount
        this.loadRecentSearches();
        // Close dropdowns when clicking outside
        document.addEventListener('click', this.handleClickOutside);
    }

    componentWillUnmount(): void {
        document.removeEventListener('click', this.handleClickOutside);
    }

    private handleClickOutside = (e: MouseEvent): void => {
        const target = e.target as HTMLElement;
        if (!target.closest('.chat-input-wrapper')) {
            this.setState({ showAutocomplete: false, showFilterDropdown: false });
        }
    };

    private loadRecentSearches = (showDropdown: boolean = false): void => {
        const searches = StorageService.getRecentSearches();
        this.setState({
            recentSearches: searches,
            showAutocomplete: showDropdown && searches.length > 0
        });
    };

    private getFilteredSearches = (): string[] => {
        const { value } = this.props;
        const { recentSearches } = this.state;

        if (!value.trim()) {
            return recentSearches;
        }

        return recentSearches.filter(s =>
            s.toLowerCase().includes(value.toLowerCase())
        );
    };

    private handleKeyDown = (e: React.KeyboardEvent): void => {
        const { showAutocomplete, highlightedIndex } = this.state;
        const filteredSearches = this.getFilteredSearches();

        // Handle autocomplete navigation
        if (showAutocomplete && filteredSearches.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                this.setState({
                    highlightedIndex: Math.min(highlightedIndex + 1, filteredSearches.length - 1)
                });
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                this.setState({
                    highlightedIndex: Math.max(highlightedIndex - 1, -1)
                });
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                this.setState({ showAutocomplete: false, highlightedIndex: -1 });
                return;
            }
            if (e.key === 'Enter' && highlightedIndex >= 0) {
                e.preventDefault();
                this.selectSuggestion(filteredSearches[highlightedIndex]);
                return;
            }
        }

        // Handle submit
        if (e.key === 'Enter' && !e.shiftKey) {
            if (!this.props.loading && this.props.value.trim()) {
                e.preventDefault();
                this.handleSubmit();
            }
        }
    };

    private handleInputChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.props.onChange(e.target.value);
        this.setState({
            showAutocomplete: true,
            highlightedIndex: -1
        });
    };

    private handleInputFocus = (): void => {
        this.loadRecentSearches(true);
    };

    private selectSuggestion = (suggestion: string): void => {
        this.props.onChange(suggestion);
        this.setState({
            showAutocomplete: false,
            highlightedIndex: -1
        });
        this.inputRef.current?.focus();
    };

    private removeSuggestion = (e: React.MouseEvent, suggestion: string): void => {
        e.stopPropagation();
        StorageService.removeRecentSearch(suggestion);
        this.loadRecentSearches();
    };

    private handleSubmit = (): void => {
        const { value, onSubmit } = this.props;
        if (value.trim()) {
            StorageService.addRecentSearch(value.trim());
            this.loadRecentSearches();
        }
        onSubmit();
        this.setState({ showAutocomplete: false });
    };

    private toggleFilterDropdown = (): void => {
        this.setState((state) => ({
            showFilterDropdown: !state.showFilterDropdown,
            showAutocomplete: false
        }));
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
        const { value, placeholder, loading, timeFilter } = this.props;
        const { showFilterDropdown, showAutocomplete, highlightedIndex } = this.state;
        const filteredSearches = this.getFilteredSearches();
        const showDropdown = showAutocomplete && filteredSearches.length > 0;

        return (
            <div className="chat-input-container">
                <div className="chat-input-wrapper">
                    {/* Autocomplete dropdown */}
                    {showDropdown && (
                        <div className="chat-input-autocomplete">
                            <div className="chat-input-autocomplete-header">
                                <History className="w-3 h-3" />
                                <span>Recent searches</span>
                            </div>
                            {filteredSearches.map((suggestion, index) => (
                                <div
                                    key={suggestion}
                                    className={`chat-input-autocomplete-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                                    onClick={() => this.selectSuggestion(suggestion)}
                                    onMouseEnter={() => this.setState({ highlightedIndex: index })}
                                >
                                    <span className="chat-input-autocomplete-text">{suggestion}</span>
                                    <button
                                        className="chat-input-autocomplete-remove"
                                        onClick={(e) => this.removeSuggestion(e, suggestion)}
                                        title="Remove from history"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    <input
                        ref={this.inputRef}
                        type="text"
                        className="chat-input"
                        placeholder={placeholder || "Enter a GitHub repository URL..."}
                        value={value}
                        onChange={this.handleInputChange}
                        onKeyDown={this.handleKeyDown}
                        onFocus={this.handleInputFocus}
                        disabled={loading}
                        autoComplete="off"
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
                            onClick={this.handleSubmit}
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
