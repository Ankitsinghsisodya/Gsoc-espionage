import {
    BookOpen,
    Building2,
    Code2,
    ExternalLink,
    FileText,
    Hash,
    Lightbulb,
    Link,
    LucideIcon,
    Mail,
    MessageSquare,
    Rss,
    Search,
    Send,
    Twitter,
} from 'lucide-react';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import allOrgsData from '../../data/allOrgs2026.json';
import newOrgsData from '../../data/newOrgs2026.json';

interface ContactLink {
    name: string;
    value: string;
}

interface OrgData {
    name: string;
    slug: string;
    logo_url?: string;
    tagline?: string;
    description?: string;
    website_url?: string;
    ideas_link?: string;
    contributor_guidance_url?: string;
    source_code?: string;
    license?: string;
    categories?: string[];
    tech_tags?: string[];
    topic_tags?: string[];
    contact_links?: ContactLink[];
}

type OrgTab = 'all' | 'new';

interface GsocOrgsState {
    activeTab: OrgTab;
    searchQuery: string;
}

const allOrgs = allOrgsData as OrgData[];
const newOrgs = newOrgsData as OrgData[];
const newOrgSlugs = new Set(newOrgs.map(o => o.slug));

// Map contact link name → { label, Icon }
const CONTACT_META: Record<string, { label: string; Icon: LucideIcon }> = {
    email:        { label: 'Email',        Icon: Mail },
    mailingList:  { label: 'Mailing List', Icon: Mail },
    mailing_list: { label: 'Mailing List', Icon: Mail },
    chat:         { label: 'Chat',         Icon: MessageSquare },
    slack:        { label: 'Slack',        Icon: MessageSquare },
    gitter:       { label: 'Gitter',       Icon: MessageSquare },
    discord:      { label: 'Discord',      Icon: MessageSquare },
    irc:          { label: 'IRC',          Icon: Hash },
    telegram:     { label: 'Telegram',     Icon: Send },
    twitter:      { label: 'Twitter',      Icon: Twitter },
    blog:         { label: 'Blog',         Icon: Rss },
};

function getContactMeta(name: string): { label: string; Icon: LucideIcon } {
    return CONTACT_META[name] ?? { label: name, Icon: Link };
}

function contactHref(link: ContactLink): string {
    const v = link.value.trim();
    if (!v.startsWith('http') && v.includes('@')) return `mailto:${v}`;
    return v;
}

function handleLogoError(e: React.SyntheticEvent<HTMLImageElement>) {
    const img = e.currentTarget;
    img.style.display = 'none';
    const fallback = img.nextElementSibling as HTMLElement | null;
    if (fallback) fallback.style.display = 'flex';
}

export class GsocOrgs extends React.Component<{}, GsocOrgsState> {
    constructor(props: {}) {
        super(props);
        this.state = { activeTab: 'all', searchQuery: '' };
    }

    private handleTabChange = (tab: OrgTab): void => {
        this.setState({ activeTab: tab, searchQuery: '' });
    };

    private handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
        this.setState({ searchQuery: e.target.value });
    };

    private getFilteredOrgs(): OrgData[] {
        const { activeTab, searchQuery } = this.state;
        const base = activeTab === 'new' ? newOrgs : allOrgs;
        if (!searchQuery.trim()) return base;
        const q = searchQuery.toLowerCase();
        return base.filter(org =>
            org.name.toLowerCase().includes(q) ||
            org.tagline?.toLowerCase().includes(q) ||
            org.description?.toLowerCase().includes(q) ||
            org.categories?.some(c => c.toLowerCase().includes(q)) ||
            org.tech_tags?.some(t => t.toLowerCase().includes(q)) ||
            org.topic_tags?.some(t => t.toLowerCase().includes(q))
        );
    }

    public render(): React.ReactNode {
        const { activeTab, searchQuery } = this.state;
        const filtered = this.getFilteredOrgs();

        // Schema.org ItemList — tells Google exactly which organizations are on this page.
        // This is the highest-impact structured data for entity-based ranking.
        const itemListSchema = {
            '@context': 'https://schema.org',
            '@type': 'ItemList',
            name: 'GSoC 2026 Participating Organizations',
            description: `All ${allOrgs.length} organizations participating in Google Summer of Code 2026, including ${newOrgs.length} new organizations.`,
            url: 'https://gsoc.app/orgs',
            numberOfItems: allOrgs.length,
            itemListElement: allOrgs.map((org, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                item: {
                    '@type': 'Organization',
                    name: org.name,
                    description: org.tagline || org.description,
                    url: org.website_url ?? `https://summerofcode.withgoogle.com/programs/2026/organizations/${org.slug}`,
                    ...(org.logo_url ? { logo: org.logo_url } : {}),
                },
            })),
        };

        return (
            <>
            <Helmet>
                <title>{`GSoC 2026 Organizations — ${allOrgs.length} Orgs | gsoc.app`}</title>
                <meta
                    name="description"
                    content={`Browse all ${allOrgs.length} organizations participating in Google Summer of Code 2026, including ${newOrgs.length} new ones. Find ideas lists, tech stacks, and contact information.`}
                />
                <link rel="canonical" href="https://gsoc.app/orgs" />
                <script type="application/ld+json">{JSON.stringify(itemListSchema)}</script>
            </Helmet>
            <div className="gsoc-orgs-view">
                {/* Header */}
                <div className="gsoc-orgs-header">
                    <div className="gsoc-orgs-title-row">
                        <Building2 className="gsoc-orgs-icon" aria-hidden="true" />
                        <div>
                            <h1 className="gsoc-orgs-title">GSoC 2026 Organizations</h1>
                            <p className="gsoc-orgs-subtitle">
                                Participating organizations for Google Summer of Code 2026
                            </p>
                        </div>
                    </div>
                    <div className="gsoc-orgs-stats">
                        <div className="gsoc-stat-pill">
                            <span className="gsoc-stat-value">{allOrgs.length}</span>
                            <span className="gsoc-stat-label">Total Orgs</span>
                        </div>
                        <div className="gsoc-stat-pill new">
                            <span className="gsoc-stat-value">{newOrgs.length}</span>
                            <span className="gsoc-stat-label">New This Year</span>
                        </div>
                    </div>
                </div>

                {/* Search */}
                <div className="gsoc-search-wrapper">
                    <Search className="gsoc-search-icon" aria-hidden="true" />
                    <input
                        type="text"
                        className="gsoc-search-input"
                        placeholder="Search by name, category, technology, or topic..."
                        value={searchQuery}
                        onChange={this.handleSearchChange}
                        aria-label="Search organizations"
                    />
                </div>

                {/* Tabs */}
                <div className="org-tab-bar" role="tablist">
                    <button
                        role="tab"
                        className={`org-tab ${activeTab === 'all' ? 'active' : ''}`}
                        onClick={() => this.handleTabChange('all')}
                        aria-selected={activeTab === 'all'}
                    >
                        All Organizations
                        <span className="org-tab-count">{allOrgs.length}</span>
                    </button>
                    <button
                        role="tab"
                        className={`org-tab ${activeTab === 'new' ? 'active' : ''}`}
                        onClick={() => this.handleTabChange('new')}
                        aria-selected={activeTab === 'new'}
                    >
                        New This Year
                        <span className={`org-tab-count ${activeTab === 'new' ? '' : 'new-count'}`}>
                            {newOrgs.length}
                        </span>
                    </button>
                </div>

                {searchQuery && (
                    <p className="gsoc-results-count">
                        {filtered.length} result{filtered.length !== 1 ? 's' : ''} for &quot;{searchQuery}&quot;
                    </p>
                )}

                {/* Grid */}
                {filtered.length > 0 ? (
                    <div className="orgs-grid">
                        {filtered.map(org => {
                            const isNew = newOrgSlugs.has(org.slug);
                            const initials = org.name.split(' ').slice(0, 2).map(w => w[0]).join('').toUpperCase();
                            const blurb = org.tagline || org.description;

                            return (
                                <div key={org.slug} className="org-card">
                                    {/* Logo + name */}
                                    <div className="org-card-header">
                                        <div className="org-logo-wrap">
                                            {org.logo_url && (
                                                <img
                                                    src={org.logo_url}
                                                    alt={org.name}
                                                    className="org-logo"
                                                    onError={handleLogoError}
                                                />
                                            )}
                                            <span
                                                className="org-logo-fallback"
                                                style={{ display: org.logo_url ? 'none' : 'flex' }}
                                                aria-hidden="true"
                                            >
                                                {initials}
                                            </span>
                                        </div>

                                        <div className="org-card-name-col">
                                            <div className="org-name-badge-row">
                                                <h3 className="org-card-name">{org.name}</h3>
                                                {isNew && activeTab === 'all' && (
                                                    <span className="org-new-badge">NEW</span>
                                                )}
                                            </div>
                                            {/* Categories + license */}
                                            <div className="org-meta-row">
                                                {org.categories?.slice(0, 2).map(c => (
                                                    <span key={c} className="org-category">{c}</span>
                                                ))}
                                                {org.license && (
                                                    <span className="org-license">{org.license}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Tagline / description */}
                                    {blurb && (
                                        <p className="org-tagline">{blurb}</p>
                                    )}

                                    {/* Website */}
                                    {org.website_url && (
                                        <a
                                            href={org.website_url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="org-website"
                                        >
                                            <ExternalLink className="w-3 h-3" aria-hidden="true" />
                                            {org.website_url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                                        </a>
                                    )}

                                    {/* Tech tags */}
                                    {org.tech_tags && org.tech_tags.length > 0 && (
                                        <div className="org-tags-section">
                                            <span className="org-tags-label">Technologies</span>
                                            <div className="org-tags">
                                                {org.tech_tags.slice(0, 5).map(tag => (
                                                    <span key={tag} className="org-tag tech">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Topic tags */}
                                    {org.topic_tags && org.topic_tags.length > 0 && (
                                        <div className="org-tags-section">
                                            <span className="org-tags-label">Topics</span>
                                            <div className="org-tags">
                                                {org.topic_tags.slice(0, 4).map(tag => (
                                                    <span key={tag} className="org-tag topic">{tag}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    {/* Contact links */}
                                    {org.contact_links && org.contact_links.length > 0 && (
                                        <div className="org-tags-section">
                                            <span className="org-tags-label">Contact</span>
                                            <div className="org-tags">
                                                {org.contact_links.slice(0, 4).map(link => {
                                                    const { label, Icon } = getContactMeta(link.name);
                                                    return (
                                                        <a
                                                            key={link.value}
                                                            href={contactHref(link)}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="org-tag contact"
                                                            title={link.value}
                                                        >
                                                            <Icon size={10} />
                                                            {label}
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )}

                                    {/* Action links */}
                                    <div className="org-actions">
                                        {org.ideas_link && (
                                            <a
                                                href={org.ideas_link}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="org-action-btn ideas"
                                                title="View project ideas"
                                            >
                                                <Lightbulb className="w-3 h-3" aria-hidden="true" />
                                                Ideas
                                            </a>
                                        )}
                                        {org.source_code && (
                                            <a
                                                href={org.source_code}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="org-action-btn source"
                                                title="View source code"
                                            >
                                                <Code2 className="w-3 h-3" aria-hidden="true" />
                                                Source
                                            </a>
                                        )}
                                        {org.contributor_guidance_url && (
                                            <a
                                                href={org.contributor_guidance_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="org-action-btn guide"
                                                title="Contributor guidance"
                                            >
                                                <BookOpen className="w-3 h-3" aria-hidden="true" />
                                                Contribute
                                            </a>
                                        )}
                                        {!org.ideas_link && !org.source_code && !org.contributor_guidance_url && org.website_url && (
                                            <a
                                                href={org.website_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="org-action-btn guide"
                                                title="Visit website"
                                            >
                                                <FileText className="w-3 h-3" aria-hidden="true" />
                                                Learn More
                                            </a>
                                        )}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <div className="orgs-empty-state">
                        <Search className="w-12 h-12" aria-hidden="true" />
                        <p>No organizations match &quot;{searchQuery}&quot;</p>
                        <button
                            type="button"
                            className="orgs-clear-search"
                            onClick={() => this.setState({ searchQuery: '' })}
                        >
                            Clear search
                        </button>
                    </div>
                )}
            </div>
            </>
        );
    }
}
