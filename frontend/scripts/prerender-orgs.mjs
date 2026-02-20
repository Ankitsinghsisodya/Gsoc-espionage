/**
 * prerender-orgs.mjs
 *
 * Generates dist/orgs/index.html — a static, pre-rendered version of the GSoC
 * 2026 Organizations page. Runs automatically as a `postbuild` step.
 *
 * WHY: Google's JS rendering pipeline can take days/weeks to index SPA content.
 * By baking all 185 org names, descriptions, and ideas-list links into real HTML,
 * Googlebot sees full content instantly on the first crawl — no JS required.
 *
 * RESULT: When users visit gsoc.app/orgs, CloudFront serves this static file (if
 * the CloudFront Function URI rewrite is configured). The React app then hydrates
 * and takes over seamlessly.
 */

import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir   = join(__dirname, '..');
const distDir   = join(rootDir, 'dist');
const orgsDir   = join(distDir, 'orgs');

// ── Data ─────────────────────────────────────────────────────────────────────
const allOrgs  = JSON.parse(readFileSync(join(rootDir, 'src/data/allOrgs2026.json'), 'utf-8'));
const newOrgs  = JSON.parse(readFileSync(join(rootDir, 'src/data/newOrgs2026.json'), 'utf-8'));
const newSlugs = new Set(newOrgs.map(o => o.slug));

// ── Helpers ───────────────────────────────────────────────────────────────────
function esc(str = '') {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

// ── Schema.org ItemList ───────────────────────────────────────────────────────
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

// ── Static HTML for each org ──────────────────────────────────────────────────
const orgsHtml = allOrgs.map(org => {
    const isNew  = newSlugs.has(org.slug);
    const blurb  = esc(org.tagline || org.description || '');
    const techs  = (org.tech_tags  || []).slice(0, 5).map(esc).join(', ');
    const topics = (org.topic_tags || []).slice(0, 4).map(esc).join(', ');

    return `
  <article itemscope itemtype="https://schema.org/Organization" style="border:1px solid #30363d;border-radius:8px;padding:1rem;margin-bottom:1rem">
    <h2 itemprop="name" style="margin:0 0 .25rem">${esc(org.name)}${isNew ? ' <span style="color:#3fb950;font-size:.75rem;font-weight:600">[New 2026]</span>' : ''}</h2>
    ${org.website_url ? `<link itemprop="url" href="${esc(org.website_url)}">` : ''}
    ${blurb          ? `<p  itemprop="description" style="margin:.25rem 0;color:#8b949e">${blurb}</p>` : ''}
    ${techs          ? `<p  style="font-size:.8rem;color:#79c0ff">Tech: ${techs}</p>` : ''}
    ${topics         ? `<p  style="font-size:.8rem;color:#e3b341">Topics: ${topics}</p>` : ''}
    <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.5rem">
      ${org.ideas_link               ? `<a href="${esc(org.ideas_link)}"               rel="noopener noreferrer">Ideas list</a>` : ''}
      ${org.source_code              ? `<a href="${esc(org.source_code)}"              rel="noopener noreferrer">Source code</a>` : ''}
      ${org.contributor_guidance_url ? `<a href="${esc(org.contributor_guidance_url)}" rel="noopener noreferrer">Contributor guide</a>` : ''}
      ${org.website_url              ? `<a href="${esc(org.website_url)}"              rel="noopener noreferrer" itemprop="url">Website</a>` : ''}
    </div>
  </article>`;
}).join('\n');

// ── Patch dist/index.html → dist/orgs/index.html ─────────────────────────────
let html = readFileSync(join(distDir, 'index.html'), 'utf-8');

// 1. Title
html = html.replace(
    /<title>[^<]*<\/title>/,
    `<title>GSoC 2026 Organizations — ${allOrgs.length} Orgs | gsoc.app</title>`
);

// 2. Meta description
html = html.replace(
    /<meta name="description"\s+content="[^"]*"\s*\/>/,
    `<meta name="description" content="Browse all ${allOrgs.length} organizations participating in Google Summer of Code 2026, including ${newOrgs.length} new ones. Find ideas lists, tech stacks, and contact information on gsoc.app." />`
);

// 3. Canonical
html = html.replace(
    /<link rel="canonical" href="[^"]*"\s*\/>/,
    '<link rel="canonical" href="https://gsoc.app/orgs" />'
);

// 4. OG url + title + description
html = html
    .replace(/(<meta property="og:url"\s+content=")[^"]*(")/,    `$1https://gsoc.app/orgs$2`)
    .replace(/(<meta property="og:title"\s+content=")[^"]*(")/,  `$1GSoC 2026 Organizations — ${allOrgs.length} Orgs | gsoc.app$2`)
    .replace(/(<meta property="og:description"\s+content=")[^"]*(")/,
        `$1Browse all ${allOrgs.length} GSoC 2026 organizations including ${newOrgs.length} new ones.$2`)
    .replace(/(<meta name="twitter:url"\s+content=")[^"]*(")/,   `$1https://gsoc.app/orgs$2`)
    .replace(/(<meta name="twitter:title"\s+content=")[^"]*(")/,
        `$1GSoC 2026 Organizations — ${allOrgs.length} Orgs | gsoc.app$2`)
    .replace(/(<meta name="twitter:description"\s+content=")[^"]*(")/,
        `$1Browse all ${allOrgs.length} GSoC 2026 organizations including ${newOrgs.length} new ones.$2`);

// 5. Inject ItemList JSON-LD + noscript fallback before </body>
const injection = `
  <script type="application/ld+json">${JSON.stringify(itemListSchema)}</script>
  <noscript>
    <div style="padding:2rem;max-width:1100px;margin:0 auto;font-family:system-ui,sans-serif;background:#0d1117;color:#c9d1d9">
      <h1>GSoC 2026 Organizations (${allOrgs.length} total, ${newOrgs.length} new)</h1>
      <p>Google Summer of Code 2026 participating organizations. Enable JavaScript for the full interactive experience.</p>
      <hr style="border-color:#30363d">
      ${orgsHtml}
    </div>
  </noscript>`;

html = html.replace('</body>', `${injection}\n</body>`);

// ── Write output ──────────────────────────────────────────────────────────────
mkdirSync(orgsDir, { recursive: true });
writeFileSync(join(orgsDir, 'index.html'), html, 'utf-8');

console.log(`✓ Prerendered /orgs → dist/orgs/index.html  (${allOrgs.length} orgs, ${newOrgs.length} new)`);
