import { GitPullRequest } from 'lucide-react';
import React from 'react';

/**
 * Welcome greeting component props
 */
interface WelcomeGreetingProps {
    username?: string;
}

/**
 * Premium welcome greeting with animated icon
 */
export const WelcomeGreeting: React.FC<WelcomeGreetingProps> = ({ username }) => {
    const greeting = username
        ? `Welcome back, ${username}!`
        : 'Analyze GitHub PRs';

    const subtitle = username
        ? 'Ready to dive into some pull requests?'
        : 'Get detailed insights about contributors, code quality, and PR metrics';

    return (
        <div className="welcome-greeting">
            <div className="welcome-icon">
                <GitPullRequest className="w-12 h-12" style={{ color: '#58a6ff' }} />
            </div>
            <h1 className="welcome-title">{greeting}</h1>
            <p className="welcome-subtitle">{subtitle}</p>
        </div>
    );
};
