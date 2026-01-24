// News Aggregator - Live feed from major news agencies

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

class NewsAggregator {
    constructor() {
        this.articles = [];
        this.filteredArticles = [];
        this.sources = [
            { id: 'bbc', name: 'BBC', rss: 'http://feeds.bbci.co.uk/news/rss.xml', bias: -15, reliability: 95 },
            { id: 'reuters', name: 'Reuters', rss: 'https://www.reuters.com/rssFeed/worldNews', bias: 0, reliability: 98 },
            { id: 'ap', name: 'Associated Press', rss: 'https://apnews.com/apf-topnews', bias: -5, reliability: 97 },
            { id: 'cnn', name: 'CNN', rss: 'https://rss.cnn.com/rss/edition.rss', bias: -25, reliability: 88 },
            { id: 'techcrunch', name: 'TechCrunch', rss: 'https://techcrunch.com/feed/', bias: -10, reliability: 85 },
            { id: 'theverge', name: 'The Verge', rss: 'https://www.theverge.com/rss/index.xml', bias: -20, reliability: 82 },
        ];
        
        // Bias scale: -100 (left) to +100 (right), 0 = center
        this.biasScale = {
            left: { min: -100, max: -40, color: '#3B82F6', label: 'Left' },
            centerLeft: { min: -40, max: -15, color: '#60A5FA', label: 'Center-Left' },
            center: { min: -15, max: 15, color: '#FBBF24', label: 'Center' },
            centerRight: { min: 15, max: 40, color: '#FB923C', label: 'Center-Right' },
            right: { min: 40, max: 100, color: '#EF4444', label: 'Right' }
        };
        this.currentCategory = 'all';
        this.currentSource = 'all';
        this.currentBias = 'all';
        this.searchQuery = '';
        this.contentTypes = {
            text: true,
            image: true,
            video: true,
            live: true
        };
        this.refreshInterval = null;
        this.init();
    }

    init() {
        this.feedContent = document.getElementById('feed-content');
        this.feedSearch = document.getElementById('feed-search');
        this.feedCategory = document.getElementById('feed-category');
        this.feedSource = document.getElementById('feed-source');
        this.feedBias = document.getElementById('feed-bias');
        this.feedRefresh = document.getElementById('feed-refresh');
        this.feedCount = document.getElementById('feed-count');
        this.feedStatus = document.getElementById('feed-status');
        this.filterText = document.getElementById('filter-text');
        this.filterImage = document.getElementById('filter-image');
        this.filterVideo = document.getElementById('filter-video');
        this.filterLive = document.getElementById('filter-live');

        // Event listeners
        this.feedSearch.addEventListener('input', () => {
            this.searchQuery = this.feedSearch.value.toLowerCase();
            this.filterArticles();
        });

        this.feedCategory.addEventListener('change', () => {
            this.currentCategory = this.feedCategory.value;
            this.filterArticles();
        });

        this.feedSource.addEventListener('change', () => {
            this.currentSource = this.feedSource.value;
            this.filterArticles();
        });

        this.feedBias.addEventListener('change', () => {
            this.currentBias = this.feedBias.value;
            this.filterArticles();
        });

        this.feedRefresh.addEventListener('click', () => {
            this.loadNews();
        });

        // Content type filters
        this.filterText.addEventListener('change', () => {
            this.contentTypes.text = this.filterText.checked;
            this.filterArticles();
        });

        this.filterImage.addEventListener('change', () => {
            this.contentTypes.image = this.filterImage.checked;
            this.filterArticles();
        });

        this.filterVideo.addEventListener('change', () => {
            this.contentTypes.video = this.filterVideo.checked;
            this.filterArticles();
        });

        this.filterLive.addEventListener('change', () => {
            this.contentTypes.live = this.filterLive.checked;
            this.filterArticles();
        });

        // Load news on init
        this.loadNews();
        
        // Auto-refresh every 5 minutes
        this.refreshInterval = setInterval(() => {
            this.loadNews();
        }, 5 * 60 * 1000);
    }

    async loadNews() {
        this.updateStatus('Loading...');
        this.feedContent.innerHTML = '<div class="feed-loading">Loading news from multiple sources...</div>';

        try {
            // Try to use NewsAPI if available, otherwise fall back to RSS
            const newsAPIKey = localStorage.getItem('newsapi_key');
            if (newsAPIKey) {
                await this.loadFromNewsAPI(newsAPIKey);
            } else {
                await this.loadFromRSS();
            }
        } catch (error) {
            console.error('Error loading news:', error);
            const errorMsg = error.message && error.message.includes('timeout') 
                ? 'Request timeout - servers may be slow or unavailable'
                : 'Error loading news';
            this.updateStatus(errorMsg);
            this.feedContent.innerHTML = `
                <div class="feed-error">
                    <p>Unable to load news. ${error.message && error.message.includes('timeout') ? 'Request timed out.' : 'Trying alternative sources...'}</p>
                    <p class="feed-error-note">Note: For full functionality, add a NewsAPI key in localStorage: <code>localStorage.setItem('newsapi_key', 'your-key')</code></p>
                </div>
            `;
            // Fallback to demo data
            this.loadDemoNews();
        }
    }

    async loadFromNewsAPI(apiKey) {
        const url = `https://newsapi.org/v2/top-headlines?country=us&apiKey=${apiKey}&pageSize=50`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data.status === 'ok') {
            this.articles = data.articles.map(article => {
                const sourceId = article.source.id || article.source.name.toLowerCase().replace(/\s+/g, '');
                const sourceData = this.sources.find(s => s.id === sourceId) || { bias: 0, reliability: 75 };
                const description = article.description || '';
                const hasVideo = description.includes('video') || article.url.includes('youtube') || article.url.includes('vimeo');
                const isLive = article.title.toLowerCase().includes('live') || description.toLowerCase().includes('live');
                
                return {
                    title: article.title,
                    description: description,
                    url: article.url,
                    source: article.source.name,
                    sourceId: sourceId,
                    publishedAt: new Date(article.publishedAt),
                    image: article.urlToImage,
                    category: this.categorizeArticle(article.title, article.description),
                    bias: sourceData.bias,
                    reliability: sourceData.reliability,
                    hasVideo: hasVideo,
                    hasImage: !!article.urlToImage,
                    isLive: isLive,
                    videoUrl: hasVideo ? article.url : null
                };
            });
            this.filterArticles();
            this.updateStatus('Live');
        }
    }

    async loadFromRSS() {
        // Use RSS2JSON or similar proxy service
        const allArticles = [];
        
        // Load from multiple RSS feeds
        const rssPromises = this.sources.map(source => 
            this.fetchRSSFeed(source).catch(err => {
                console.warn(`Failed to load ${source.name}:`, err);
                return [];
            })
        );

        const results = await Promise.all(rssPromises);
        results.forEach(articles => {
            allArticles.push(...articles);
        });

        // Sort by date (newest first)
        allArticles.sort((a, b) => b.publishedAt - a.publishedAt);

        this.articles = allArticles;
        this.filterArticles();
        this.updateStatus('Live');
    }

    async fetchRSSFeed(source) {
        // Use a CORS proxy for RSS feeds
        const proxyUrl = `https://api.rss2json.com/v1/api.json?rss_url=${encodeURIComponent(source.rss)}`;
        
        try {
            const response = await fetchWithTimeout(proxyUrl, {}, 15000);
            const data = await response.json();
            
            if (data.status === 'ok' && data.items) {
                return data.items.map(item => {
                    const description = item.description ? this.stripHTML(item.description) : '';
                    const hasVideo = description.includes('video') || item.link.includes('youtube') || item.link.includes('vimeo');
                    const hasImage = item.enclosure && item.enclosure.type && item.enclosure.type.startsWith('image');
                    const isLive = item.title.toLowerCase().includes('live') || description.toLowerCase().includes('live');
                    
                    return {
                        title: item.title,
                        description: description.substring(0, 200),
                        url: item.link,
                        source: source.name,
                        sourceId: source.id,
                        publishedAt: new Date(item.pubDate),
                        image: item.enclosure ? item.enclosure.link : null,
                        category: this.categorizeArticle(item.title, item.description),
                        bias: source.bias || 0,
                        reliability: source.reliability || 75,
                        hasVideo: hasVideo,
                        hasImage: hasImage || !!item.enclosure,
                        isLive: isLive,
                        videoUrl: hasVideo ? item.link : null
                    };
                });
            }
        } catch (error) {
            console.error(`Error fetching ${source.name}:`, error);
        }
        
        return [];
    }

    categorizeArticle(title, description) {
        const text = (title + ' ' + (description || '')).toLowerCase();
        
        if (text.includes('breaking') || text.includes('urgent') || text.includes('alert')) {
            return 'breaking';
        }
        if (text.match(/\b(tech|ai|software|app|digital|internet|cyber|startup)\b/)) {
            return 'technology';
        }
        if (text.match(/\b(business|economy|market|stock|trade|company)\b/)) {
            return 'business';
        }
        if (text.match(/\b(science|research|study|discovery|space|climate)\b/)) {
            return 'science';
        }
        if (text.match(/\b(health|medical|disease|hospital|treatment)\b/)) {
            return 'health';
        }
        if (text.match(/\b(sport|game|player|team|match|championship)\b/)) {
            return 'sports';
        }
        if (text.match(/\b(movie|music|celebrity|entertainment|show)\b/)) {
            return 'entertainment';
        }
        if (text.match(/\b(politics|election|government|president|senate|congress)\b/)) {
            return 'politics';
        }
        
        return 'general';
    }

    stripHTML(html) {
        const tmp = document.createElement('DIV');
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || '';
    }

    filterArticles() {
        this.filteredArticles = this.articles.filter(article => {
            // Category filter
            if (this.currentCategory !== 'all' && article.category !== this.currentCategory) {
                return false;
            }

            // Source filter
            if (this.currentSource !== 'all' && article.sourceId !== this.currentSource) {
                return false;
            }

            // Bias filter
            if (this.currentBias !== 'all') {
                const biasInfo = this.getBiasInfo(article.bias || 0);
                if (biasInfo.label.toLowerCase().replace(/\s+/g, '') !== this.currentBias) {
                    return false;
                }
            }

            // Search filter
            if (this.searchQuery) {
                const searchText = (article.title + ' ' + article.description).toLowerCase();
                if (!searchText.includes(this.searchQuery)) {
                    return false;
                }
            }

            // Content type filter
            const articleType = this.getArticleContentType(article);
            if (!this.contentTypes[articleType]) {
                return false;
            }

            return true;
        });

        this.renderArticles();
    }

    getArticleContentType(article) {
        // Determine content type based on article properties
        if (article.isLive || article.liveStream) {
            return 'live';
        }
        if (article.videoUrl || article.hasVideo || article.mediaType === 'video') {
            return 'video';
        }
        if (article.image || article.urlToImage || article.hasImage) {
            return 'image';
        }
        return 'text';
    }

    renderArticles() {
        if (this.filteredArticles.length === 0) {
            this.feedContent.innerHTML = '<div class="feed-empty">No articles found. Try adjusting your filters.</div>';
            this.feedCount.textContent = '0 articles';
            return;
        }

        const articlesHTML = this.filteredArticles.map((article, index) => {
            const biasInfo = this.getBiasInfo(article.bias || 0);
            const reliability = article.reliability || 75;
            
            return `
            <article class="feed-article" data-category="${article.category}" data-source="${article.sourceId}" data-article-index="${index}">
                <div class="feed-article-header">
                    <span class="feed-source">${article.source}</span>
                    <span class="feed-time">${this.formatTime(article.publishedAt)}</span>
                    ${article.category === 'breaking' ? '<span class="feed-badge breaking">Breaking</span>' : ''}
                </div>
                <div class="feed-bias-chart">
                    <div class="bias-chart-container">
                        <div class="bias-scale">
                            <div class="bias-scale-left"></div>
                            <div class="bias-scale-center-left"></div>
                            <div class="bias-scale-center"></div>
                            <div class="bias-scale-center-right"></div>
                            <div class="bias-scale-right"></div>
                        </div>
                        <div class="bias-indicator" style="left: ${this.getBiasPosition(article.bias || 0)}%; background-color: ${biasInfo.color};" title="Bias: ${biasInfo.label} (${article.bias || 0})"></div>
                    </div>
                    <div class="bias-info">
                        <span class="bias-label" style="color: ${biasInfo.color}">${biasInfo.label}</span>
                        <span class="reliability-score">Reliability: ${reliability}%</span>
                    </div>
                </div>
                <h3 class="feed-article-title">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="feed-article-link">${article.title}</a>
                </h3>
                ${article.description ? `<p class="feed-article-description">${article.description}...</p>` : ''}
                ${article.isLive ? '<span class="feed-live-badge">🔴 LIVE</span>' : ''}
                ${article.hasVideo && article.videoUrl ? `
                    <div class="feed-video-container">
                        <a href="${article.videoUrl}" target="_blank" rel="noopener noreferrer" class="feed-video-link">
                            <span class="feed-video-icon">▶</span>
                            <span>Watch Video</span>
                        </a>
                    </div>
                ` : ''}
                ${article.image ? `<img src="${article.image}" alt="${article.title}" class="feed-article-image" onerror="this.style.display='none'">` : ''}
                <div class="feed-article-footer">
                    <button class="feed-summary-btn" data-article-index="${index}" title="View Summary">📄 Summary</button>
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="feed-read-more">Read more →</a>
                    <span class="feed-category-tag">${article.category}</span>
                </div>
            </article>
        `;
        }).join('');

        this.feedContent.innerHTML = articlesHTML;
        this.feedCount.textContent = `${this.filteredArticles.length} article${this.filteredArticles.length !== 1 ? 's' : ''}`;
        
        // Add click handlers for summary buttons
        this.attachSummaryHandlers();
    }

    attachSummaryHandlers() {
        const summaryButtons = this.feedContent.querySelectorAll('.feed-summary-btn');
        summaryButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const articleIndex = parseInt(button.getAttribute('data-article-index'));
                this.showArticleSummary(articleIndex);
            });
        });
    }

    showArticleSummary(articleIndex) {
        const article = this.filteredArticles[articleIndex];
        if (!article) return;

        const biasInfo = this.getBiasInfo(article.bias || 0);
        const reliability = article.reliability || 75;

        // Create or get summary modal
        let summaryModal = document.getElementById('feed-summary-modal');
        if (!summaryModal) {
            summaryModal = document.createElement('div');
            summaryModal.id = 'feed-summary-modal';
            summaryModal.className = 'feed-summary-modal';
            document.body.appendChild(summaryModal);
        }

        summaryModal.innerHTML = `
            <div class="feed-summary-content">
                <div class="feed-summary-header">
                    <div class="feed-summary-badges">
                        ${article.category === 'breaking' ? '<span class="feed-badge breaking">Breaking</span>' : ''}
                        ${article.isLive ? '<span class="feed-live-badge">🔴 LIVE</span>' : ''}
                        ${article.hasVideo ? '<span class="feed-badge video-badge">🎥 Video</span>' : ''}
                    </div>
                    <button class="feed-summary-close" id="feed-summary-close" title="Close">×</button>
                </div>
                
                <div class="feed-summary-source-info">
                    <span class="feed-source">${article.source}</span>
                    <span class="feed-time">${this.formatTime(article.publishedAt)}</span>
                    <span class="feed-category-tag">${article.category}</span>
                </div>

                <div class="feed-summary-bias-chart">
                    <div class="bias-chart-container">
                        <div class="bias-scale">
                            <div class="bias-scale-left"></div>
                            <div class="bias-scale-center-left"></div>
                            <div class="bias-scale-center"></div>
                            <div class="bias-scale-center-right"></div>
                            <div class="bias-scale-right"></div>
                        </div>
                        <div class="bias-indicator" style="left: ${this.getBiasPosition(article.bias || 0)}%; background-color: ${biasInfo.color};" title="Bias: ${biasInfo.label} (${article.bias || 0})"></div>
                    </div>
                    <div class="bias-info">
                        <span class="bias-label" style="color: ${biasInfo.color}">${biasInfo.label}</span>
                        <span class="reliability-score">Reliability: ${reliability}%</span>
                    </div>
                </div>

                <h2 class="feed-summary-title">${article.title}</h2>
                
                ${article.image ? `<img src="${article.image}" alt="${article.title}" class="feed-summary-image" onerror="this.style.display='none'">` : ''}
                
                <div class="feed-summary-description">
                    ${article.description || article.title}
                </div>

                ${article.hasVideo && article.videoUrl ? `
                    <div class="feed-video-container">
                        <a href="${article.videoUrl}" target="_blank" rel="noopener noreferrer" class="feed-video-link">
                            <span class="feed-video-icon">▶</span>
                            <span>Watch Video</span>
                        </a>
                    </div>
                ` : ''}

                <div class="feed-summary-footer">
                    <a href="${article.url}" target="_blank" rel="noopener noreferrer" class="feed-read-more">Read full article →</a>
                </div>
            </div>
        `;

        // Show modal
        summaryModal.style.display = 'flex';

        // Close button handler
        const closeBtn = summaryModal.querySelector('#feed-summary-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.closeArticleSummary();
            });
        }

        // Close on background click
        summaryModal.addEventListener('click', (e) => {
            if (e.target === summaryModal) {
                this.closeArticleSummary();
            }
        });

        // Close on Escape key
        const escapeHandler = (e) => {
            if (e.key === 'Escape') {
                this.closeArticleSummary();
                document.removeEventListener('keydown', escapeHandler);
            }
        };
        document.addEventListener('keydown', escapeHandler);
    }

    closeArticleSummary() {
        const summaryModal = document.getElementById('feed-summary-modal');
        if (summaryModal) {
            summaryModal.style.display = 'none';
        }
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

    getBiasInfo(bias) {
        // Bias scale: -100 (left) to +100 (right)
        if (bias <= this.biasScale.left.max) {
            return { ...this.biasScale.left, value: bias };
        } else if (bias <= this.biasScale.centerLeft.max) {
            return { ...this.biasScale.centerLeft, value: bias };
        } else if (bias <= this.biasScale.center.max) {
            return { ...this.biasScale.center, value: bias };
        } else if (bias <= this.biasScale.centerRight.max) {
            return { ...this.biasScale.centerRight, value: bias };
        } else {
            return { ...this.biasScale.right, value: bias };
        }
    }

    getBiasPosition(bias) {
        // Convert bias (-100 to +100) to percentage (0% to 100%)
        // -100 = 0%, 0 = 50%, +100 = 100%
        return ((bias + 100) / 200) * 100;
    }

    updateStatus(status) {
        this.feedStatus.textContent = status;
    }

    loadDemoNews() {
        // Demo data for when APIs are unavailable
        this.articles = [
            {
                title: 'Major Tech Breakthrough Announced',
                description: 'Scientists announce a significant advancement in quantum computing technology.',
                url: '#',
                source: 'Tech News',
                sourceId: 'tech',
                publishedAt: new Date(),
                category: 'technology',
                bias: -10,
                reliability: 85,
                hasImage: true,
                hasVideo: false,
                isLive: false,
                image: null
            },
            {
                title: 'Global Climate Summit Concludes - LIVE Coverage',
                description: 'World leaders reach new agreements on carbon emissions reduction targets. Watch live coverage.',
                url: '#',
                source: 'World News',
                sourceId: 'world',
                publishedAt: new Date(Date.now() - 3600000),
                category: 'breaking',
                bias: 0,
                reliability: 90,
                hasImage: false,
                hasVideo: true,
                isLive: true,
                videoUrl: '#'
            },
            {
                title: 'Breaking: Major News Event',
                description: 'Important news story with video coverage available.',
                url: '#',
                source: 'News Network',
                sourceId: 'network',
                publishedAt: new Date(Date.now() - 1800000),
                category: 'breaking',
                bias: -5,
                reliability: 88,
                hasImage: true,
                hasVideo: true,
                isLive: false,
                image: null,
                videoUrl: '#'
            }
        ];
        this.filterArticles();
        this.updateStatus('Demo Mode');
    }
}

// Initialize news aggregator when feed section becomes active
let newsAggregator = null;

function initNewsAggregator() {
    const feedSection = document.getElementById('feed');
    if (feedSection && feedSection.classList.contains('active') && !newsAggregator) {
        newsAggregator = new NewsAggregator();
    }
}

// Watch for feed section activation
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const feedSection = document.getElementById('feed');
            if (feedSection && feedSection.classList.contains('active')) {
                if (!newsAggregator) {
                    setTimeout(initNewsAggregator, 100);
                }
            }
        }
    });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const feedSection = document.getElementById('feed');
        if (feedSection) {
            observer.observe(feedSection, { attributes: true });
            if (feedSection.classList.contains('active')) {
                initNewsAggregator();
            }
        }
    });
} else {
    const feedSection = document.getElementById('feed');
    if (feedSection) {
        observer.observe(feedSection, { attributes: true });
        if (feedSection.classList.contains('active')) {
            initNewsAggregator();
        }
    }
}
