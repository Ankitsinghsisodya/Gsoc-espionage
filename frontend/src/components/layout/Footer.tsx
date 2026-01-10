import { Github, Heart } from 'lucide-react';
import React from 'react';

/**
 * Footer component
 * @class Footer
 * @extends {React.Component}
 */
export class Footer extends React.Component {
    /**
     * Render footer
     */
    public render(): React.ReactNode {
        return (
            <footer className="border-t border-dark-700 bg-dark-900/50 py-6">
                <div className="container mx-auto px-4">
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-gray-400">
                            <span>Built with</span>
                            <Heart className="w-4 h-4 text-red-400" />
                            <span>for the open source community</span>
                        </div>

                        <div className="flex items-center gap-4">
                            <a
                                href="https://github.com"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
                            >
                                <Github className="w-4 h-4" />
                                View on GitHub
                            </a>
                        </div>
                    </div>

                    <div className="mt-4 pt-4 border-t border-dark-800 text-center">
                        <p className="text-xs text-gray-500">
                            © {new Date().getFullYear()} PR Analyzer. All rights reserved.
                        </p>
                    </div>
                </div>
            </footer>
        );
    }
}
