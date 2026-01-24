// Social Media Aggregator - Curatable live feeds from multiple platforms

// Utility: Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 15000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    try {
        const response = await fetch(url, {
            ...options,
            signal: controller.signal
        });
        clearTimeout(timeoutId);
        return response;
    } catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            throw new Error(`Request timeout after ${timeout}ms`);
        }
        throw error;
    }
}

class SocialAggregator {
    constructor() {
        this.posts = [];
        this.filteredPosts = [];
        this.enabledPlatforms = new Set(['twitter', 'tiktok']);
        this.sortBy = 'latest';
        this.searchQuery = '';
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.socialFeed = document.getElementById('social-feed');
        this.socialSearch = document.getElementById('social-search');
        this.socialSort = document.getElementById('social-sort');
        this.socialRefresh = document.getElementById('social-refresh');
        this.socialCount = document.getElementById('social-count');
        this.socialStatus = document.getElementById('social-status');
        this.platformToggles = document.querySelectorAll('.social-platform-toggle input');
        this.socialControls = document.querySelector('.social-controls');
        this.socialControlsToggle = document.getElementById('social-controls-toggle');
        this.socialControlsContent = document.getElementById('social-controls-content');

        // Toggle controls collapse
        if (this.socialControlsToggle && this.socialControls) {
            this.socialControlsToggle.addEventListener('click', () => {
                this.socialControls.classList.toggle('collapsed');
            });
            
            // Also toggle on header click
            const header = this.socialControls.querySelector('.social-controls-header');
            if (header) {
                header.addEventListener('click', () => {
                    this.socialControls.classList.toggle('collapsed');
                });
            }
        }

        // Load saved curation preferences
        this.loadPreferences();

        // Platform toggle listeners
        this.platformToggles.forEach(toggle => {
            toggle.addEventListener('change', (e) => {
                const platform = e.target.dataset.platform;
                if (e.target.checked) {
                    this.enabledPlatforms.add(platform);
                } else {
                    this.enabledPlatforms.delete(platform);
                }
                this.savePreferences();
                this.loadSocialContent();
            });
        });

        // Search and filter listeners
        this.socialSearch.addEventListener('input', () => {
            this.searchQuery = this.socialSearch.value.toLowerCase();
            this.filterPosts();
        });

        this.socialSort.addEventListener('change', () => {
            this.sortBy = this.socialSort.value;
            this.filterPosts();
        });

        this.socialRefresh.addEventListener('click', () => {
            this.loadSocialContent();
        });

        // Load content
        this.loadSocialContent();

        // Auto-refresh every 2 minutes
        this.refreshInterval = setInterval(() => {
            this.loadSocialContent();
        }, 2 * 60 * 1000);
    }

    loadPreferences() {
        const saved = localStorage.getItem('social_curation');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.enabledPlatforms = new Set(prefs.platforms || ['twitter', 'tiktok']);
                this.sortBy = prefs.sortBy || 'latest';
                
                // Update UI
                this.platformToggles.forEach(toggle => {
                    toggle.checked = this.enabledPlatforms.has(toggle.dataset.platform);
                });
                this.socialSort.value = this.sortBy;
            } catch (e) {
                console.warn('Failed to load preferences:', e);
            }
        }
    }

    savePreferences() {
        const prefs = {
            platforms: Array.from(this.enabledPlatforms),
            sortBy: this.sortBy
        };
        localStorage.setItem('social_curation', JSON.stringify(prefs));
    }

    async loadSocialContent() {
        this.updateStatus('Loading...');
        this.socialFeed.innerHTML = '<div class="social-loading">Loading social content...</div>';

        try {
            const allPosts = [];

            // Load from each enabled platform
            const loadPromises = Array.from(this.enabledPlatforms).map(platform => {
                return this.loadPlatformContent(platform).catch(err => {
                    const errorMsg = err.message && err.message.includes('timeout')
                        ? `Timeout loading ${platform}`
                        : `Failed to load ${platform}`;
                    console.warn(errorMsg, err);
                    return [];
                });
            });

            const results = await Promise.all(loadPromises);
            results.forEach(posts => {
                allPosts.push(...posts);
            });

            // Sort posts
            this.posts = this.sortPosts(allPosts);
            this.filterPosts();
            this.updateStatus('Live');
        } catch (error) {
            console.error('Error loading social content:', error);
            const errorMsg = error.message && error.message.includes('timeout')
                ? 'Timeout - servers may be slow'
                : 'Error loading content';
            this.updateStatus(errorMsg);
            this.socialFeed.innerHTML = `<div class="social-error">Unable to load social content. ${error.message && error.message.includes('timeout') ? 'Request timed out.' : 'Please try again later.'}</div>`;
        }
    }

    async loadPlatformContent(platform) {
        switch (platform) {
            case 'twitter':
                return await this.loadTwitter();
            case 'tiktok':
                return await this.loadTikTok();
            case 'instagram':
                return await this.loadInstagram();
            case 'reddit':
                return await this.loadReddit();
            case 'youtube':
                return await this.loadYouTube();
            default:
                return [];
        }
    }

    async loadTwitter() {
        // Using Twitter API v2 or RSS feed
        // For demo, using RSS feed approach
        try {
            const rssUrl = 'https://rss.app/feeds/twitter-user-en.xml';
            const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(rssUrl)}`;
            
            const response = await fetchWithTimeout(proxyUrl, {}, 15000);
            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                return data.items.slice(0, 10).map(item => ({
                    id: `twitter_${Date.now()}_${Math.random()}`,
                    platform: 'twitter',
                    platformName: 'Twitter/X',
                    username: '@user',
                    content: this.stripHTML(item.description || item.title),
                    image: item.enclosure ? item.enclosure.link : null,
                    url: item.link,
                    timestamp: new Date(item.pubDate),
                    likes: Math.floor(Math.random() * 10000),
                    shares: Math.floor(Math.random() * 1000),
                    isVideo: false
                }));
            }
        } catch (error) {
            console.error('Twitter load error:', error);
        }

        // Fallback demo data
        return this.getDemoTwitterPosts();
    }

    async loadTikTok() {
        // TikTok doesn't have a public API, using demo/embed approach
        // In production, you'd use TikTok's embed API or oEmbed
        return this.getDemoTikTokPosts();
    }

    async loadInstagram() {
        // Instagram requires API access, using demo data
        return this.getDemoInstagramPosts();
    }

    async loadReddit() {
        try {
            // Reddit JSON API (no auth needed for public posts)
            const subreddits = ['popular', 'technology', 'programming'];
            const subreddit = subreddits[Math.floor(Math.random() * subreddits.length)];
            const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=10`;
            
            const response = await fetchWithTimeout(url, {}, 15000);
            const data = await response.json();
            
            if (data.data && data.data.children) {
                return data.data.children.map(child => {
                    const post = child.data;
                    return {
                        id: `reddit_${post.id}`,
                        platform: 'reddit',
                        platformName: 'Reddit',
                        username: `u/${post.author}`,
                        content: post.selftext || post.title,
                        image: post.preview ? post.preview.images[0]?.source?.url : null,
                        url: `https://reddit.com${post.permalink}`,
                        timestamp: new Date(post.created_utc * 1000),
                        likes: post.ups,
                        shares: post.num_comments,
                        subreddit: post.subreddit,
                        isVideo: post.is_video
                    };
                });
            }
        } catch (error) {
            console.error('Reddit load error:', error);
        }
        
        return [];
    }

    async loadYouTube() {
        // YouTube requires API key, using demo data
        return this.getDemoYouTubePosts();
    }

    getDemoTwitterPosts() {
        return [
            {
                id: 'twitter_demo_1',
                platform: 'twitter',
                platformName: 'Twitter/X',
                username: '@technews',
                content: 'Breaking: Major tech announcement coming soon. Stay tuned for updates!',
                image: null,
                url: '#',
                timestamp: new Date(),
                likes: 1234,
                shares: 56,
                isVideo: false
            },
            {
                id: 'twitter_demo_2',
                platform: 'twitter',
                platformName: 'Twitter/X',
                username: '@devlife',
                content: 'Just shipped a new feature. The team worked incredibly hard on this one! 🚀',
                image: null,
                url: '#',
                timestamp: new Date(Date.now() - 1800000),
                likes: 567,
                shares: 23,
                isVideo: false
            }
        ];
    }

    getDemoTikTokPosts() {
        return [
            {
                id: 'tiktok_demo_1',
                platform: 'tiktok',
                platformName: 'TikTok',
                username: '@creator',
                content: 'POV: You finally understand async/await 😂 #coding #webdev',
                image: null,
                url: '#',
                timestamp: new Date(Date.now() - 900000),
                likes: 45678,
                shares: 1234,
                isVideo: true,
                videoUrl: '#'
            },
            {
                id: 'tiktok_demo_2',
                platform: 'tiktok',
                platformName: 'TikTok',
                username: '@tech_tok',
                content: 'This AI tool will change how you code forever 🤯',
                image: null,
                url: '#',
                timestamp: new Date(Date.now() - 3600000),
                likes: 89234,
                shares: 5678,
                isVideo: true,
                videoUrl: '#'
            }
        ];
    }

    getDemoInstagramPosts() {
        return [
            {
                id: 'instagram_demo_1',
                platform: 'instagram',
                platformName: 'Instagram',
                username: '@photographer',
                content: 'Sunset vibes 🌅 #photography #nature',
                image: null,
                url: '#',
                timestamp: new Date(Date.now() - 7200000),
                likes: 1234,
                shares: 45,
                isVideo: false
            }
        ];
    }

    getDemoYouTubePosts() {
        return [
            {
                id: 'youtube_demo_1',
                platform: 'youtube',
                platformName: 'YouTube',
                username: 'Tech Channel',
                content: 'New tutorial: Building a modern web app from scratch',
                image: null,
                url: '#',
                timestamp: new Date(Date.now() - 10800000),
                likes: 5678,
                shares: 234,
                isVideo: true,
                videoUrl: '#'
            }
        ];
    }

    sortPosts(posts) {
        const sorted = [...posts];
        
        switch (this.sortBy) {
            case 'latest':
                return sorted.sort((a, b) => b.timestamp - a.timestamp);
            case 'popular':
                return sorted.sort((a, b) => (b.likes + b.shares) - (a.likes + a.shares));
            case 'trending':
                // Trending = recent + high engagement
                return sorted.sort((a, b) => {
                    const aScore = (a.likes + a.shares) / (Date.now() - a.timestamp);
                    const bScore = (b.likes + b.shares) / (Date.now() - b.timestamp);
                    return bScore - aScore;
                });
            default:
                return sorted;
        }
    }

    filterPosts() {
        this.filteredPosts = this.posts.filter(post => {
            if (this.searchQuery) {
                const searchText = (post.content + ' ' + post.username).toLowerCase();
                if (!searchText.includes(this.searchQuery)) {
                    return false;
                }
            }
            return true;
        });

        this.renderPosts();
    }

    renderPosts() {
        if (this.filteredPosts.length === 0) {
            this.socialFeed.innerHTML = '<div class="social-empty">No posts found. Try adjusting your filters or enable more platforms.</div>';
            this.socialCount.textContent = '0 posts';
            return;
        }

        const postsHTML = this.filteredPosts.map(post => `
            <div class="social-post" data-platform="${post.platform}">
                <div class="social-post-header">
                    <div class="social-post-author">
                        <span class="social-platform-badge ${post.platform}">${post.platformName}</span>
                        <span class="social-username">${post.username}</span>
                    </div>
                    <span class="social-post-time">${this.formatTime(post.timestamp)}</span>
                </div>
                <div class="social-post-content">
                    ${post.isVideo ? `
                        <div class="social-video-placeholder">
                            <span class="social-video-icon">▶</span>
                            <p>Video content</p>
                        </div>
                    ` : ''}
                    ${post.image ? `<img src="${post.image}" alt="Post image" class="social-post-image" onerror="this.style.display='none'">` : ''}
                    <p class="social-post-text">${this.escapeHTML(post.content)}</p>
                </div>
                <div class="social-post-footer">
                    <div class="social-engagement">
                        <span class="social-likes">❤️ ${this.formatNumber(post.likes)}</span>
                        <span class="social-shares">💬 ${this.formatNumber(post.shares)}</span>
                    </div>
                    <a href="${post.url}" target="_blank" rel="noopener noreferrer" class="social-view-link">View →</a>
                </div>
            </div>
        `).join('');

        this.socialFeed.innerHTML = postsHTML;
        this.socialCount.textContent = `${this.filteredPosts.length} post${this.filteredPosts.length !== 1 ? 's' : ''}`;
    }

    formatTime(date) {
        const now = new Date();
        const diff = now - date;
        const minutes = Math.floor(diff / 60000);
        const hours = Math.floor(diff / 3600000);
        const days = Math.floor(diff / 86400000);

        if (minutes < 1) return 'Just now';
        if (minutes < 60) return `${minutes}m ago`;
        if (hours < 24) return `${hours}h ago`;
        if (days < 7) return `${days}d ago`;
        return date.toLocaleDateString();
    }

    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }

    stripHTML(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    updateStatus(status) {
        this.socialStatus.textContent = status;
    }
}

// Initialize social aggregator when social section becomes active
let socialAggregator = null;

function initSocialAggregator() {
    const socialSection = document.getElementById('social');
    if (socialSection && socialSection.classList.contains('active') && !socialAggregator) {
        socialAggregator = new SocialAggregator();
    }
}

// Watch for social section activation
const socialObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const socialSection = document.getElementById('social');
            if (socialSection && socialSection.classList.contains('active')) {
                if (!socialAggregator) {
                    setTimeout(initSocialAggregator, 100);
                }
            }
        }
    });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const socialSection = document.getElementById('social');
        if (socialSection) {
            socialObserver.observe(socialSection, { attributes: true });
            if (socialSection.classList.contains('active')) {
                initSocialAggregator();
            }
        }
    });
} else {
    const socialSection = document.getElementById('social');
    if (socialSection) {
        socialObserver.observe(socialSection, { attributes: true });
        if (socialSection.classList.contains('active')) {
            initSocialAggregator();
        }
    }
}
