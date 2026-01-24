// Custom AI Search - Free AI with customizable search styles
class CustomSearch {
    constructor() {
        this.searchMode = 'ai';
        this.searchModel = 'default';
        this.searchStyle = 'conversational';
        this.maxResults = 10;
        this.savedQueries = [];
        this.searchHistory = [];
        this.init();
    }

    init() {
        this.searchQuery = document.getElementById('search-query');
        this.searchBtn = document.getElementById('search-btn');
        this.searchClear = document.getElementById('search-clear');
        this.searchSave = document.getElementById('search-save');
        this.searchModeRadios = document.querySelectorAll('input[name="search-mode"]');
        this.searchModelSelect = document.getElementById('search-model');
        this.searchStyleSelect = document.getElementById('search-style');
        this.searchMaxResults = document.getElementById('search-max-results');
        this.searchResults = document.getElementById('search-results');
        this.savedQueriesList = document.querySelector('.saved-queries-list');

        // Load saved preferences
        this.loadPreferences();
        this.loadSavedQueries();

        // Event listeners
        this.searchBtn.addEventListener('click', () => this.performSearch());
        this.searchClear.addEventListener('click', () => this.clearSearch());
        this.searchSave.addEventListener('click', () => this.saveCurrentQuery());

        this.searchQuery.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                this.performSearch();
            }
        });

        this.searchModeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.searchMode = e.target.value;
                this.updateSearchUI();
                this.savePreferences();
            });
        });

        this.searchModelSelect.addEventListener('change', () => {
            this.searchModel = this.searchModelSelect.value;
            this.savePreferences();
        });

        this.searchStyleSelect.addEventListener('change', () => {
            this.searchStyle = this.searchStyleSelect.value;
            this.savePreferences();
        });

        this.searchMaxResults.addEventListener('change', () => {
            this.maxResults = parseInt(this.searchMaxResults.value) || 10;
            this.savePreferences();
        });

        this.updateSearchUI();
    }

    updateSearchUI() {
        // Update placeholder based on mode
        const placeholders = {
            ai: 'Ask anything... Use natural language, code snippets, or complex queries',
            web: 'Search the web... Enter keywords, phrases, or questions',
            code: 'Search code... Enter function names, patterns, or code snippets',
            semantic: 'Semantic search... Describe what you\'re looking for'
        };
        this.searchQuery.placeholder = placeholders[this.searchMode] || placeholders.ai;

        // Update model options based on mode
        if (this.searchMode === 'ai') {
            this.searchModelSelect.innerHTML = `
                <option value="default">Default Model</option>
                <option value="huggingface">Hugging Face (Free)</option>
                <option value="ollama">Ollama (Local)</option>
                <option value="custom">Custom API</option>
            `;
        } else if (this.searchMode === 'web') {
            this.searchModelSelect.innerHTML = `
                <option value="duckduckgo">DuckDuckGo</option>
                <option value="searx">SearXNG</option>
                <option value="custom">Custom</option>
            `;
        } else if (this.searchMode === 'code') {
            this.searchModelSelect.innerHTML = `
                <option value="github">GitHub</option>
                <option value="stackoverflow">Stack Overflow</option>
                <option value="custom">Custom</option>
            `;
        }
    }

    async performSearch() {
        const query = this.searchQuery.value.trim();
        if (!query) {
            this.showError('Please enter a search query');
            return;
        }

        this.searchResults.innerHTML = '<div class="search-loading">Searching...</div>';
        
        // Add to history
        this.addToHistory(query);

        try {
            let results = [];
            
            switch (this.searchMode) {
                case 'ai':
                    results = await this.performAISearch(query);
                    break;
                case 'web':
                    results = await this.performWebSearch(query);
                    break;
                case 'code':
                    results = await this.performCodeSearch(query);
                    break;
                case 'semantic':
                    results = await this.performSemanticSearch(query);
                    break;
            }

            this.displayResults(results, query);
        } catch (error) {
            console.error('Search error:', error);
            this.showError(`Search failed: ${error.message}. Using demo results.`);
            this.displayResults(this.getDemoResults(query), query);
        }
    }

    async performAISearch(query) {
        // Format query based on style
        const formattedQuery = this.formatQuery(query, this.searchStyle);
        
        // Try Hugging Face Inference API (free, no key needed for some models)
        if (this.searchModel === 'huggingface') {
            return await this.searchHuggingFace(formattedQuery);
        }
        
        // Try Ollama (if running locally)
        if (this.searchModel === 'ollama') {
            return await this.searchOllama(formattedQuery);
        }

        // Default: Use web search as fallback with AI-style formatting
        return await this.searchWithAIFormatting(formattedQuery);
    }

    async searchHuggingFace(query) {
        // Using Hugging Face Inference API (free tier available)
        // Model: microsoft/DialoGPT-medium or similar
        try {
            const response = await fetch('https://api-inference.huggingface.co/models/google/flan-t5-base', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ inputs: query })
            });

            if (response.ok) {
                const data = await response.json();
                return [{
                    title: 'AI Response',
                    content: Array.isArray(data) ? data[0]?.generated_text : data.generated_text || 'Response generated',
                    source: 'Hugging Face AI',
                    url: '#',
                    relevance: 1.0
                }];
            }
        } catch (error) {
            console.warn('Hugging Face API error:', error);
        }

        // Fallback to demo
        return this.getDemoAIResults(query);
    }

    async searchOllama(query) {
        // Ollama local API (if running)
        try {
            const response = await fetch('http://localhost:11434/api/generate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    model: 'llama2',
                    prompt: query,
                    stream: false
                })
            });

            if (response.ok) {
                const data = await response.json();
                return [{
                    title: 'Ollama Response',
                    content: data.response || 'Response generated',
                    source: 'Ollama (Local)',
                    url: '#',
                    relevance: 1.0
                }];
            }
        } catch (error) {
            console.warn('Ollama not available:', error);
            throw new Error('Ollama not running locally');
        }
    }

    async searchWithAIFormatting(query) {
        // Use DuckDuckGo with AI-style formatting
        return await this.performWebSearch(query, true);
    }

    async performWebSearch(query, aiFormatted = false) {
        // Use DuckDuckGo Instant Answer API
        try {
            const searchUrl = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
            const response = await fetch(searchUrl);
            const data = await response.json();

            const results = [];

            if (data.AbstractText) {
                results.push({
                    title: data.Heading || 'Search Result',
                    content: data.AbstractText,
                    source: data.AbstractSource || 'DuckDuckGo',
                    url: data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                    relevance: 1.0
                });
            }

            if (data.RelatedTopics && data.RelatedTopics.length > 0) {
                data.RelatedTopics.slice(0, this.maxResults - results.length).forEach(topic => {
                    results.push({
                        title: topic.Text ? topic.Text.split(' - ')[0] : 'Related Topic',
                        content: topic.Text || '',
                        source: 'DuckDuckGo',
                        url: topic.FirstURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                        relevance: 0.8
                    });
                });
            }

            if (results.length === 0) {
                // Fallback: create result from query
                results.push({
                    title: `Search: ${query}`,
                    content: `Search results for "${query}". Click to view on DuckDuckGo.`,
                    source: 'DuckDuckGo',
                    url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
                    relevance: 1.0
                });
            }

            return results.slice(0, this.maxResults);
        } catch (error) {
            console.error('Web search error:', error);
            return this.getDemoWebResults(query);
        }
    }

    async performCodeSearch(query) {
        // Search GitHub or Stack Overflow
        if (this.searchModel === 'github') {
            return await this.searchGitHub(query);
        } else if (this.searchModel === 'stackoverflow') {
            return await this.searchStackOverflow(query);
        }
        
        return this.getDemoCodeResults(query);
    }

    async searchGitHub(query) {
        try {
            // GitHub search API (public, no auth needed for basic searches)
            const url = `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${this.maxResults}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.items) {
                return data.items.map(item => ({
                    title: item.full_name,
                    content: item.description || 'No description',
                    source: 'GitHub',
                    url: item.html_url,
                    language: item.language,
                    stars: item.stargazers_count,
                    relevance: 1.0
                }));
            }
        } catch (error) {
            console.error('GitHub search error:', error);
        }

        return this.getDemoCodeResults(query);
    }

    async searchStackOverflow(query) {
        // Stack Overflow API
        try {
            const url = `https://api.stackexchange.com/2.3/search/advanced?order=desc&sort=relevance&q=${encodeURIComponent(query)}&site=stackoverflow&pagesize=${this.maxResults}`;
            const response = await fetch(url);
            const data = await response.json();

            if (data.items) {
                return data.items.map(item => ({
                    title: item.title,
                    content: `Score: ${item.score} | Answers: ${item.answer_count}`,
                    source: 'Stack Overflow',
                    url: item.link,
                    score: item.score,
                    answers: item.answer_count,
                    relevance: 1.0
                }));
            }
        } catch (error) {
            console.error('Stack Overflow search error:', error);
        }

        return this.getDemoCodeResults(query);
    }

    async performSemanticSearch(query) {
        // Semantic search using embeddings or similarity
        // For now, use enhanced web search with semantic hints
        const semanticQuery = this.addSemanticContext(query);
        return await this.performWebSearch(semanticQuery, true);
    }

    formatQuery(query, style) {
        const stylePrompts = {
            conversational: `In a conversational way, ${query}`,
            technical: `Provide a technical explanation: ${query}`,
            creative: `With creative thinking, ${query}`,
            analytical: `Analyze and explain: ${query}`
        };

        return stylePrompts[style] || query;
    }

    addSemanticContext(query) {
        return `Find semantically related content about: ${query}`;
    }

    displayResults(results, query) {
        if (results.length === 0) {
            this.searchResults.innerHTML = `
                <div class="search-empty">
                    <p>No results found for "${query}"</p>
                    <p class="search-hint">Try rephrasing your query or changing search mode</p>
                </div>
            `;
            return;
        }

        const resultsHTML = results.map((result, index) => `
            <div class="search-result" data-relevance="${result.relevance || 1.0}">
                <div class="search-result-header">
                    <h3 class="search-result-title">
                        <a href="${result.url}" target="_blank" rel="noopener noreferrer">${this.escapeHTML(result.title)}</a>
                    </h3>
                    <span class="search-result-source">${result.source}</span>
                </div>
                <p class="search-result-content">${this.escapeHTML(result.content)}</p>
                ${result.language ? `<span class="search-result-meta">Language: ${result.language}</span>` : ''}
                ${result.stars ? `<span class="search-result-meta">⭐ ${result.stars}</span>` : ''}
                ${result.score ? `<span class="search-result-meta">Score: ${result.score}</span>` : ''}
            </div>
        `).join('');

        this.searchResults.innerHTML = `
            <div class="search-results-header">
                <span class="search-results-count">${results.length} result${results.length !== 1 ? 's' : ''} for "${this.escapeHTML(query)}"</span>
                <span class="search-mode-badge">${this.searchMode}</span>
            </div>
            <div class="search-results-list">
                ${resultsHTML}
            </div>
        `;
    }

    clearSearch() {
        this.searchQuery.value = '';
        this.searchResults.innerHTML = `
            <div class="search-placeholder">
                <p>Enter your query above and choose your search style</p>
                <p class="search-hint">💡 Tip: Use natural language, code, or structured queries</p>
            </div>
        `;
    }

    saveCurrentQuery() {
        const query = this.searchQuery.value.trim();
        if (!query) {
            this.showError('No query to save');
            return;
        }

        const savedQuery = {
            query,
            mode: this.searchMode,
            model: this.searchModel,
            style: this.searchStyle,
            timestamp: new Date().toISOString()
        };

        this.savedQueries.push(savedQuery);
        this.saveSavedQueries();
        this.renderSavedQueries();
    }

    loadSavedQueries() {
        const saved = localStorage.getItem('saved_search_queries');
        if (saved) {
            try {
                this.savedQueries = JSON.parse(saved);
                this.renderSavedQueries();
            } catch (e) {
                console.warn('Failed to load saved queries:', e);
            }
        }
    }

    saveSavedQueries() {
        localStorage.setItem('saved_search_queries', JSON.stringify(this.savedQueries));
    }

    renderSavedQueries() {
        if (this.savedQueries.length === 0) {
            this.savedQueriesList.innerHTML = '<span class="no-saved">None</span>';
            return;
        }

        const queriesHTML = this.savedQueries.slice(-5).reverse().map((saved, index) => `
            <button class="saved-query-item" data-index="${this.savedQueries.length - 1 - index}">
                ${this.escapeHTML(saved.query.substring(0, 30))}${saved.query.length > 30 ? '...' : ''}
            </button>
        `).join('');

        this.savedQueriesList.innerHTML = queriesHTML;

        // Add click handlers
        this.savedQueriesList.querySelectorAll('.saved-query-item').forEach(btn => {
            btn.addEventListener('click', () => {
                const index = parseInt(btn.dataset.index);
                const saved = this.savedQueries[index];
                this.searchQuery.value = saved.query;
                this.searchMode = saved.mode;
                this.searchModel = saved.model;
                this.searchStyle = saved.style;
                
                // Update UI
                document.querySelector(`input[name="search-mode"][value="${saved.mode}"]`).checked = true;
                this.searchModelSelect.value = saved.model;
                this.searchStyleSelect.value = saved.style;
                this.updateSearchUI();
                this.performSearch();
            });
        });
    }

    addToHistory(query) {
        this.searchHistory.unshift(query);
        if (this.searchHistory.length > 50) {
            this.searchHistory = this.searchHistory.slice(0, 50);
        }
        localStorage.setItem('search_history', JSON.stringify(this.searchHistory));
    }

    loadPreferences() {
        const saved = localStorage.getItem('search_preferences');
        if (saved) {
            try {
                const prefs = JSON.parse(saved);
                this.searchMode = prefs.mode || 'ai';
                this.searchModel = prefs.model || 'default';
                this.searchStyle = prefs.style || 'conversational';
                this.maxResults = prefs.maxResults || 10;

                // Update UI
                document.querySelector(`input[name="search-mode"][value="${this.searchMode}"]`).checked = true;
                this.searchModelSelect.value = this.searchModel;
                this.searchStyleSelect.value = this.searchStyle;
                this.searchMaxResults.value = this.maxResults;
            } catch (e) {
                console.warn('Failed to load preferences:', e);
            }
        }
    }

    savePreferences() {
        const prefs = {
            mode: this.searchMode,
            model: this.searchModel,
            style: this.searchStyle,
            maxResults: this.maxResults
        };
        localStorage.setItem('search_preferences', JSON.stringify(prefs));
    }

    showError(message) {
        this.searchResults.innerHTML = `<div class="search-error">${this.escapeHTML(message)}</div>`;
    }

    escapeHTML(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getDemoResults(query) {
        return [{
            title: `Demo Result for: ${query}`,
            content: 'This is a demo result. Configure API keys or use local services for real results.',
            source: 'Demo',
            url: '#',
            relevance: 1.0
        }];
    }

    getDemoAIResults(query) {
        return [{
            title: 'AI Response',
            content: `Based on your query "${query}", here's a response formatted in ${this.searchStyle} style. Configure Hugging Face or Ollama for real AI responses.`,
            source: 'Demo AI',
            url: '#',
            relevance: 1.0
        }];
    }

    getDemoWebResults(query) {
        return [{
            title: `Web Search: ${query}`,
            content: `Search results for "${query}". Click to view on DuckDuckGo.`,
            source: 'DuckDuckGo',
            url: `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
            relevance: 1.0
        }];
    }

    getDemoCodeResults(query) {
        return [{
            title: `Code Search: ${query}`,
            content: `Code search results for "${query}". Configure GitHub or Stack Overflow API for real results.`,
            source: 'Demo',
            url: '#',
            relevance: 1.0
        }];
    }
}

// Initialize search when links section becomes active
let customSearch = null;

function initCustomSearch() {
    const linksSection = document.getElementById('links');
    if (linksSection && linksSection.classList.contains('active') && !customSearch) {
        customSearch = new CustomSearch();
    }
}

// Watch for links section activation
const searchObserver = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
            const linksSection = document.getElementById('links');
            if (linksSection && linksSection.classList.contains('active')) {
                if (!customSearch) {
                    setTimeout(initCustomSearch, 100);
                }
            }
        }
    });
});

// Start observing when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const linksSection = document.getElementById('links');
        if (linksSection) {
            searchObserver.observe(linksSection, { attributes: true });
            if (linksSection.classList.contains('active')) {
                initCustomSearch();
            }
        }
    });
} else {
    const linksSection = document.getElementById('links');
    if (linksSection) {
        searchObserver.observe(linksSection, { attributes: true });
        if (linksSection.classList.contains('active')) {
            initCustomSearch();
        }
    }
}
