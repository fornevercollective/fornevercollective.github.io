// Simple text editor with URL hash storage (inspired by textarea.my and notes.kognise.dev)

// Utility: Fetch with timeout
async function fetchWithTimeout(url, options = {}, timeout = 10000) {
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

class SimpleEditor {
    constructor() {
        this.editor = document.getElementById('editor');
        this.charCount = document.getElementById('char-count');
        this.wordCount = document.getElementById('word-count');
        this.shareBtn = document.getElementById('share-btn');
        this.newDocBtn = document.getElementById('new-doc-btn');
        this.clearBtn = document.getElementById('clear-btn');
        this.copyUrlBtn = document.getElementById('copy-url-btn');
        this.shareUrlInput = document.getElementById('share-url');
        this.currentDocId = null;
        this.currentFormat = 'text';
        this.formatType = document.getElementById('format-type');
        this.detectFormatBtn = document.getElementById('detect-format-btn');
        this.formatConvertBtn = document.getElementById('format-convert-btn');
        this.formatConvertSelect = document.getElementById('format-convert-select');
        this.formatValidateBtn = document.getElementById('format-validate-btn');
        this.formatBeautifyBtn = document.getElementById('format-beautify-btn');
        this.detectedLanguage = document.getElementById('detected-language');
        this.formatStatus = document.getElementById('format-status');
        
        this.init();
    }

    init() {
        // Load content from URL hash or localStorage
        this.loadContent();
        
        // Auto-save on input
        this.editor.addEventListener('input', () => {
            this.updateCounts();
            this.saveContent();
        });

        // Share functionality
        this.shareBtn.addEventListener('click', () => {
            this.share();
        });

        // New document functionality
        if (this.newDocBtn) {
            this.newDocBtn.addEventListener('click', () => {
                this.createNewDoc();
            });
        }

        // Copy URL functionality
        if (this.copyUrlBtn) {
            this.copyUrlBtn.addEventListener('click', () => {
                if (this.shareUrlInput) {
                    this.copyToClipboard(this.shareUrlInput.value);
                }
            });
        }

        // Toggle QR code functionality
        const toggleQrBtn = document.getElementById('toggle-qr-btn');
        if (toggleQrBtn) {
            toggleQrBtn.addEventListener('click', () => {
                this.toggleQRCode();
            });
        }

        // Download QR code functionality
        const downloadQrBtn = document.getElementById('download-qr-btn');
        if (downloadQrBtn) {
            downloadQrBtn.addEventListener('click', () => {
                this.downloadQRCode();
            });
        }

        // Clear functionality
        this.clearBtn.addEventListener('click', () => {
            if (confirm('Are you sure you want to clear all content?')) {
                this.clear();
            }
        });

        // Handle hash changes (back/forward navigation)
        window.addEventListener('hashchange', () => {
            this.loadContent();
        });

        // Check for document ID in URL on load
        this.checkForDocId();

        // Format controls
        if (this.formatType) {
            this.formatType.addEventListener('change', () => {
                this.currentFormat = this.formatType.value;
                this.updateEditorClass();
                this.detectFormat();
            });
        }

        if (this.detectFormatBtn) {
            this.detectFormatBtn.addEventListener('click', () => {
                this.detectFormat();
            });
        }

        if (this.formatConvertBtn) {
            this.formatConvertBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                // Toggle dropdown visibility
                if (this.formatConvertSelect) {
                    const isVisible = this.formatConvertSelect.classList.contains('show');
                    if (isVisible) {
                        this.formatConvertSelect.classList.remove('show');
                    } else {
                        this.formatConvertSelect.classList.add('show');
                        // Filter out current format from options
                        this.updateConvertOptions();
                    }
                } else {
                    // Fallback to old prompt method
                    this.convertFormat();
                }
            });
        }

        if (this.formatConvertSelect) {
            this.formatConvertSelect.addEventListener('change', (e) => {
                const toFormat = e.target.value;
                if (toFormat) {
                    this.convertFormat(toFormat);
                    // Reset dropdown
                    e.target.value = '';
                    e.target.classList.remove('show');
                }
            });

            // Hide dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (this.formatConvertSelect && 
                    !this.formatConvertSelect.contains(e.target) && 
                    e.target !== this.formatConvertBtn &&
                    !this.formatConvertBtn.contains(e.target)) {
                    this.formatConvertSelect.classList.remove('show');
                }
            });
        }

        if (this.formatValidateBtn) {
            this.formatValidateBtn.addEventListener('click', () => {
                this.validateFormat();
            });
        }

        if (this.formatBeautifyBtn) {
            this.formatBeautifyBtn.addEventListener('click', () => {
                this.beautifyFormat();
            });
        }

        // Auto-detect format on input
        let detectTimeout;
        this.editor.addEventListener('input', () => {
            clearTimeout(detectTimeout);
            detectTimeout = setTimeout(() => {
                this.detectFormat();
            }, 1000);
        });

        // Initial format detection
        this.detectFormat();

        // Update counts on load
        this.updateCounts();
    }

    updateConvertOptions() {
        if (!this.formatConvertSelect) return;
        
        // Disable the current format option
        const options = this.formatConvertSelect.querySelectorAll('option');
        options.forEach(option => {
            if (option.value === this.currentFormat) {
                option.disabled = true;
                option.style.opacity = '0.5';
            } else {
                option.disabled = false;
                option.style.opacity = '1';
            }
        });
    }

    // Compress text using simple encoding (like textarea.my)
    compress(text) {
        try {
            // Simple base64 encoding for URL storage
            return btoa(unescape(encodeURIComponent(text)));
        } catch (e) {
            return text;
        }
    }

    // Decompress text
    decompress(compressed) {
        try {
            return decodeURIComponent(escape(atob(compressed)));
        } catch (e) {
            return compressed;
        }
    }

    // Save content to URL hash and localStorage
    saveContent() {
        const content = this.editor.value;
        
        // Save to localStorage
        try {
            localStorage.setItem('fornever-editor-content', content);
        } catch (e) {
            console.warn('localStorage not available');
        }

        // If we have a document ID, save to that document
        if (this.currentDocId) {
            this.saveContentToDoc(this.currentDocId, content);
            return; // Don't update URL hash for documents
        }

        // Save to URL hash (compressed) - only for non-document shares
        if (content.trim()) {
            const compressed = this.compress(content);
            // Only update hash if content changed significantly (avoid constant updates)
            if (window.location.hash !== '#' + compressed) {
                window.history.replaceState(null, '', '#' + compressed);
            }
        } else {
            // Clear hash if content is empty
            if (window.location.hash && !window.location.hash.match(/^#doc\//)) {
                window.history.replaceState(null, '', window.location.pathname);
            }
        }
    }

    // Check for document ID in URL
    checkForDocId() {
        const hashMatch = window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/);
        if (hashMatch) {
            const docId = hashMatch[1];
            this.currentDocId = docId;
            
            // Try to load document
            if (this.loadDoc(docId)) {
                // Show share URL
                this.showShareUrl(window.location.href);
                // Start syncing (for future real-time collaboration)
                this.startSyncing(docId);
            } else {
                // Document doesn't exist, create it
                const content = this.editor.value;
                this.saveContentToDoc(docId, content);
            }
        }
    }

    // Start syncing document (for real-time collaboration)
    // Supports multiple sync methods for redundancy: WebSocket, Tailscale, BroadcastChannel, IPC
    startSyncing(docId) {
        this.syncMethods = {
            websocket: null,
            tailscale: null,
            broadcastChannel: null,
            ipc: null
        };
        
        // Initialize all sync methods
        this.initWebSocketSync(docId);
        this.initTailscaleSync(docId);
        this.initBroadcastChannelSync(docId);
        this.initIPCSync(docId);
        
        // Auto-save on input with multi-method sync
        let saveTimeout;
        this.editor.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                const content = this.editor.value;
                this.saveContentToDoc(docId, content);
                this.syncToAllMethods(docId, content);
                this.updateCounts();
            }, 500); // Debounce saves
        });
        
        // Listen for incoming sync updates
        this.setupSyncListeners(docId);
    }

    // Initialize WebSocket sync
    initWebSocketSync(docId) {
        try {
            // Try to connect to Electron's WebSocket server (if available)
            const wsUrl = `ws://localhost:8080/ws/doc/${docId}`;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                console.log('[Sync] WebSocket connected');
                this.syncMethods.websocket = ws;
            };
            
            ws.onerror = () => {
                console.log('[Sync] WebSocket unavailable, using fallback');
                this.syncMethods.websocket = null;
            };
            
            ws.onclose = () => {
                this.syncMethods.websocket = null;
            };
        } catch (e) {
            console.log('[Sync] WebSocket not available');
        }
    }

    // Initialize Tailscale sync (via HTTP API)
    initTailscaleSync(docId) {
        // Check if sync endpoint is available (Electron HTTP server)
        this.syncMethods.tailscale = {
            available: false,
            endpoint: 'http://localhost:8080/sync'
        };
        
        // Test connection
        fetch(this.syncMethods.tailscale.endpoint + '/ping', { method: 'GET' })
            .then(res => {
                if (res.ok) {
                    this.syncMethods.tailscale.available = true;
                    console.log('[Sync] HTTP sync available');
                }
            })
            .catch(() => {
                console.log('[Sync] HTTP sync unavailable');
            });
    }

    // Initialize BroadcastChannel sync (for same-origin tabs/windows)
    initBroadcastChannelSync(docId) {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel(`doc-sync-${docId}`);
                this.syncMethods.broadcastChannel = channel;
                console.log('[Sync] BroadcastChannel initialized');
            }
        } catch (e) {
            console.log('[Sync] BroadcastChannel not available');
        }
    }

    // Initialize IPC sync (for Electron environment)
    initIPCSync(docId) {
        // Check if we're running in Electron
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                this.syncMethods.ipc = ipcRenderer;
                console.log('[Sync] IPC sync available (Electron)');
            } catch (e) {
                console.log('[Sync] IPC not available');
            }
        }
    }

    // Sync content to all available methods
    syncToAllMethods(docId, content) {
        const syncData = {
            docId: docId,
            content: content,
            timestamp: new Date().toISOString(),
            source: 'editor'
        };

        // WebSocket sync
        if (this.syncMethods.websocket && this.syncMethods.websocket.readyState === WebSocket.OPEN) {
            try {
                this.syncMethods.websocket.send(JSON.stringify({
                    type: 'doc-update',
                    ...syncData
                }));
            } catch (e) {
                console.warn('[Sync] WebSocket send failed:', e);
            }
        }

        // Tailscale sync
        if (this.syncMethods.tailscale && this.syncMethods.tailscale.available) {
            fetch(this.syncMethods.tailscale.endpoint + '/doc', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            }).catch(() => {
                // Silent fail, other methods will handle it
            });
        }

        // BroadcastChannel sync
        if (this.syncMethods.broadcastChannel) {
            try {
                this.syncMethods.broadcastChannel.postMessage({
                    type: 'doc-update',
                    ...syncData
                });
            } catch (e) {
                console.warn('[Sync] BroadcastChannel send failed:', e);
            }
        }

        // IPC sync (Electron)
        if (this.syncMethods.ipc) {
            try {
                this.syncMethods.ipc.send('doc-sync', syncData);
            } catch (e) {
                console.warn('[Sync] IPC send failed:', e);
            }
        }
    }

    // Setup listeners for incoming sync updates
    setupSyncListeners(docId) {
        // WebSocket listener
        if (this.syncMethods.websocket) {
            this.syncMethods.websocket.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'doc-update' && data.docId === docId && data.source !== 'editor') {
                        this.applySyncUpdate(data.content);
                    }
                } catch (e) {
                    console.warn('[Sync] WebSocket message parse failed:', e);
                }
            };
        }

        // BroadcastChannel listener
        if (this.syncMethods.broadcastChannel) {
            this.syncMethods.broadcastChannel.onmessage = (event) => {
                const data = event.data;
                if (data.type === 'doc-update' && data.docId === docId && data.source !== 'editor') {
                    this.applySyncUpdate(data.content);
                }
            };
        }

        // IPC listener (Electron)
        if (this.syncMethods.ipc) {
            this.syncMethods.ipc.on('doc-sync-update', (event, data) => {
                if (data.docId === docId && data.source !== 'editor') {
                    this.applySyncUpdate(data.content);
                }
            });
        }

        // Poll HTTP endpoint for updates (fallback)
        if (this.syncMethods.tailscale && this.syncMethods.tailscale.available) {
            let lastUpdateTime = null;
            setInterval(() => {
                fetch(this.syncMethods.tailscale.endpoint + `/doc/${docId}`)
                    .then(res => res.json())
                    .then(data => {
                        if (data.content && data.updatedAt !== lastUpdateTime) {
                            lastUpdateTime = data.updatedAt;
                            // Only apply if content is different and not from this editor
                            if (data.content !== this.editor.value) {
                                this.applySyncUpdate(data.content);
                            }
                        }
                    })
                    .catch(() => {
                        // Silent fail
                    });
            }, 2000); // Poll every 2 seconds
        }
    }

    // Apply sync update from remote source
    applySyncUpdate(content) {
        // Only update if content is different to avoid loops
        if (content !== this.editor.value) {
            const cursorPos = this.editor.selectionStart;
            this.editor.value = content;
            this.updateCounts();
            
            // Restore cursor position if possible
            if (cursorPos <= content.length) {
                this.editor.setSelectionRange(cursorPos, cursorPos);
            }
            
            // Visual indicator
            this.showSyncIndicator();
        }
    }

    // Show visual sync indicator
    showSyncIndicator() {
        const indicator = document.createElement('div');
        indicator.className = 'sync-indicator';
        indicator.textContent = '🔄 Synced';
        indicator.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: rgba(0, 102, 255, 0.9);
            color: white;
            padding: 8px 16px;
            border-radius: 6px;
            font-size: 12px;
            z-index: 10000;
            animation: fadeOut 2s forwards;
        `;
        
        // Add fadeOut animation if not exists
        if (!document.getElementById('sync-indicator-style')) {
            const style = document.createElement('style');
            style.id = 'sync-indicator-style';
            style.textContent = `
                @keyframes fadeOut {
                    0% { opacity: 1; }
                    70% { opacity: 1; }
                    100% { opacity: 0; }
                }
            `;
            document.head.appendChild(style);
        }
        
        document.body.appendChild(indicator);
        setTimeout(() => indicator.remove(), 2000);
    }

    // Load content from URL hash or localStorage
    loadContent() {
        let content = '';

        // Check for document ID first
        const hashMatch = window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/);
        if (hashMatch) {
            const docId = hashMatch[1];
            this.currentDocId = docId;
            if (this.loadDoc(docId)) {
                return; // Content loaded from document
            }
        }

        // Try to load from URL hash (compressed content)
        if (window.location.hash && window.location.hash.length > 1 && !hashMatch) {
            try {
                const hashContent = window.location.hash.substring(1);
                content = this.decompress(hashContent);
            } catch (e) {
                console.warn('Failed to decompress hash content');
            }
        }

        // Fall back to localStorage if hash is empty
        if (!content) {
            try {
                content = localStorage.getItem('fornever-editor-content') || '';
            } catch (e) {
                console.warn('localStorage not available');
            }
        }

        this.editor.value = content;
        this.updateCounts();
    }

    // Update character and word counts
    updateCounts() {
        const text = this.editor.value;
        const chars = text.length;
        const words = text.trim() ? text.trim().split(/\s+/).length : 0;

        this.charCount.textContent = `${chars.toLocaleString()} character${chars !== 1 ? 's' : ''}`;
        this.wordCount.textContent = `${words.toLocaleString()} word${words !== 1 ? 's' : ''}`;
    }

    // Generate unique document ID
    generateDocId() {
        // Generate a short, unique ID (similar to pastebin)
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 8; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    // Create new document with unique ID
    createNewDoc() {
        const docId = this.generateDocId();
        const newUrl = `${window.location.origin}${window.location.pathname}#doc/${docId}`;
        
        // Clear editor
        this.editor.value = '';
        this.updateCounts();
        
        // Update URL
        window.history.pushState(null, '', newUrl);
        
        // Show share URL
        this.showShareUrl(newUrl);
        
        // Save empty document
        this.saveContent();
        
        // Focus editor
        this.editor.focus();
    }

    // Share current content with unique document ID
    share() {
        const content = this.editor.value;
        
        // Check if we already have a document ID in URL
        const hashMatch = window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/);
        let docId = hashMatch ? hashMatch[1] : null;
        
        if (!docId) {
            // Create new document ID
            docId = this.generateDocId();
        }
        
        // Create shareable URL
        const shareUrl = `${window.location.origin}${window.location.pathname}#doc/${docId}`;
        
        // Save content with document ID
        this.saveContentToDoc(docId, content);
        
        // Show share URL
        this.showShareUrl(shareUrl);
        
        // Update browser URL
        window.history.replaceState(null, '', shareUrl);
        
        // Copy to clipboard
        this.copyToClipboard(shareUrl);
    }

    // Save content to document storage
    saveContentToDoc(docId, content) {
        try {
            // Save to localStorage with document ID
            const docData = {
                content: content,
                createdAt: localStorage.getItem(`doc_${docId}_created`) || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            
            // Preserve creation date
            if (!localStorage.getItem(`doc_${docId}_created`)) {
                localStorage.setItem(`doc_${docId}_created`, docData.createdAt);
            }
            
            localStorage.setItem(`doc_${docId}`, JSON.stringify(docData));
            
            // Also save current document reference
            localStorage.setItem('current_doc_id', docId);
            
            // Sync to all methods (redundancy)
            if (this.syncMethods) {
                this.syncToAllMethods(docId, content);
            }
        } catch (e) {
            console.warn('localStorage not available');
        }
    }

    // Load content from document ID
    loadDoc(docId) {
        try {
            const docData = localStorage.getItem(`doc_${docId}`);
            if (docData) {
                const doc = JSON.parse(docData);
                this.editor.value = doc.content;
                this.updateCounts();
                return true;
            }
        } catch (e) {
            console.warn('Failed to load document:', e);
        }
        return false;
    }

    // Show share URL input
    showShareUrl(url) {
        const shareUrlDisplay = document.getElementById('share-url-display');
        const shareUrlInput = document.getElementById('share-url');
        
        if (shareUrlDisplay && shareUrlInput) {
            shareUrlInput.value = url;
            shareUrlDisplay.style.display = 'flex';
            
            // Generate QR code for the share URL
            this.generateQRCode(url);
        }
    }

    // Generate QR code for share URL
    async generateQRCode(url) {
        const qrCanvas = document.getElementById('share-url-qr');
        if (!qrCanvas) return;

        try {
            // Check if QRCode library is available (qrcode.js)
            if (typeof QRCode !== 'undefined' && QRCode.toCanvas) {
                // Clear previous QR code
                const ctx = qrCanvas.getContext('2d');
                ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
                
                // Generate QR code using qrcode.js library
                await QRCode.toCanvas(qrCanvas, url, {
                    width: 120,
                    margin: 1,
                    color: {
                        dark: '#1a1a1a',
                        light: '#ffffff'
                    },
                    errorCorrectionLevel: 'M'
                });
                
                // Show QR code container
                const qrContainer = qrCanvas.closest('.share-url-qr-container');
                if (qrContainer) {
                    qrContainer.style.display = 'flex';
                }
            } else if (typeof qrcode !== 'undefined') {
                // Alternative library format
                qrcode.toCanvas(qrCanvas, url, {
                    width: 120,
                    margin: 1
                }, (error) => {
                    if (error) {
                        console.warn('QR code generation failed:', error);
                        this.hideQRCode();
                    } else {
                        const qrContainer = qrCanvas.closest('.share-url-qr-container');
                        if (qrContainer) {
                            qrContainer.style.display = 'flex';
                        }
                    }
                });
            } else {
                // Library not loaded, hide QR code
                this.hideQRCode();
            }
        } catch (error) {
            console.warn('Failed to generate QR code:', error);
            this.hideQRCode();
        }
    }

    // Hide QR code container
    hideQRCode() {
        const qrContainer = document.querySelector('.share-url-qr-container');
        if (qrContainer) {
            qrContainer.style.display = 'none';
        }
    }

    // Hide share URL input
    hideShareUrl() {
        const shareUrlDisplay = document.getElementById('share-url-display');
        if (shareUrlDisplay) {
            shareUrlDisplay.style.display = 'none';
        }
    }

    // Toggle QR code visibility
    toggleQRCode() {
        const qrContainer = document.querySelector('.share-url-qr-container');
        if (qrContainer) {
            const isHidden = qrContainer.style.display === 'none' || 
                           qrContainer.style.display === '';
            qrContainer.style.display = isHidden ? 'flex' : 'none';
            
            // Update button title
            const toggleBtn = document.getElementById('toggle-qr-btn');
            if (toggleBtn) {
                toggleBtn.title = isHidden ? 'Hide QR Code' : 'Show QR Code';
            }
        }
    }

    // Download QR code as image
    downloadQRCode() {
        const qrCanvas = document.getElementById('share-url-qr');
        if (!qrCanvas) return;

        try {
            // Get the share URL to use as filename
            const shareUrl = this.shareUrlInput?.value || 'share-url';
            const docIdMatch = shareUrl.match(/#doc\/([a-zA-Z0-9]+)/);
            const filename = docIdMatch ? `qr-code-${docIdMatch[1]}.png` : 'qr-code-share.png';

            // Convert canvas to blob and download
            qrCanvas.toBlob((blob) => {
                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);
            }, 'image/png');
        } catch (error) {
            console.warn('Failed to download QR code:', error);
            alert('Failed to download QR code. Please try again.');
        }
    }

    // Copy URL to clipboard
    copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(() => {
                const copyBtn = document.getElementById('copy-url-btn');
                if (copyBtn) {
                    copyBtn.textContent = 'Copied!';
                    setTimeout(() => {
                        copyBtn.textContent = 'Copy';
                    }, 2000);
                }
            }).catch(() => {
                this.fallbackCopy(text);
            });
        } else {
            this.fallbackCopy(text);
        }
    }

    // Fallback copy method
    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.shareBtn.textContent = 'Copied!';
            setTimeout(() => {
                this.shareBtn.textContent = 'Share';
            }, 2000);
        } catch (e) {
            alert('Failed to copy. Please copy the URL manually:\n' + text);
        }
        
        document.body.removeChild(textarea);
    }

    // Clear editor content
    clear() {
        this.editor.value = '';
        this.updateCounts();
        this.saveContent();
        this.editor.focus();
    }

    updateEditorClass() {
        // Update editor class for syntax highlighting hints
        this.editor.className = `format-${this.currentFormat}`;
    }

    detectFormat() {
        const content = this.editor.value.trim();
        if (!content) {
            if (this.detectedLanguage) {
                this.detectedLanguage.textContent = '';
            }
            return;
        }

        // Check for URL/data source patterns first (like hexed.it)
        const urlPattern = /^(https?:\/\/|ws:\/\/|wss:\/\/|tcp:\/\/|udp:\/\/|file:\/\/)/i;
        const ipPortPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/;
        const dataUriPattern = /^data:([^;]+);base64,/i;
        
        // Detect if content is a URL or data source reference
        if (urlPattern.test(content) || ipPortPattern.test(content) || dataUriPattern.test(content)) {
            this.detectFromSource(content);
            return;
        }

        // Detect format based on content patterns
        let detected = 'text';
        let confidence = 0;

        // JSON detection
        if ((content.startsWith('{') && content.endsWith('}')) || 
            (content.startsWith('[') && content.endsWith(']'))) {
            try {
                JSON.parse(content);
                detected = 'json';
                confidence = 100;
            } catch (e) {
                // Not valid JSON
            }
        }

        // Markdown detection
        if (!detected || detected === 'text') {
            const markdownPatterns = [
                /^#{1,6}\s+.+/m,  // Headers
                /\*\*.*\*\*/,     // Bold
                /\[.*\]\(.*\)/,   // Links
                /```[\s\S]*```/,  // Code blocks
                /^\s*[-*+]\s+/m   // Lists
            ];
            const markdownScore = markdownPatterns.filter(p => p.test(content)).length;
            if (markdownScore >= 2) {
                detected = 'markdown';
                confidence = markdownScore * 20;
            }
        }

        // Hex detection
        if (!detected || detected === 'text') {
            const hexPattern = /^[0-9A-Fa-f\s]+$/;
            if (hexPattern.test(content.replace(/\s+/g, '')) && content.length > 10) {
                detected = 'hex';
                confidence = 80;
            }
        }

        // Binary detection (very basic)
        if (!detected || detected === 'text') {
            if (/^[01\s]+$/.test(content) && content.length > 20) {
                detected = 'binary';
                confidence = 70;
            }
        }

        // Language detection based on keywords (GitHub Linguist style)
        if (!detected || detected === 'text') {
            const languagePatterns = {
                javascript: [/\bfunction\s+\w+\s*\(/, /\bconst\s+\w+\s*=/, /\blet\s+\w+\s*=/, /console\.log/],
                python: [/\bdef\s+\w+\s*\(/, /\bimport\s+\w+/, /\bprint\s*\(/, /:\s*$/],
                html: [/<html/i, /<head/i, /<body/i, /<\/\w+>/],
                css: [/\{[^}]*\}/, /:\s*[^;]+;/, /@media/, /@import/],
                sql: [/\bSELECT\b/i, /\bFROM\b/i, /\bWHERE\b/i, /\bINSERT\b/i],
                yaml: [/^[\w-]+:\s*[\w-]+$/m, /^[\w-]+:\s*$/m],
                xml: [/<\?xml/, /<[\w-]+>/, /<\/[\w-]+>/]
            };

            for (const [lang, patterns] of Object.entries(languagePatterns)) {
                const score = patterns.filter(p => p.test(content)).length;
                if (score >= 2 && score > confidence / 10) {
                    detected = lang;
                    confidence = score * 30;
                }
            }
        }

        // Update UI
        if (detected !== 'text' && confidence > 50 && this.detectedLanguage) {
            if (this.formatType) {
                this.formatType.value = detected;
            }
            this.currentFormat = detected;
            this.updateEditorClass();
            this.detectedLanguage.textContent = `Detected: ${detected} (${confidence}%)`;
            this.detectedLanguage.style.color = '#666';
        } else if (this.detectedLanguage) {
            this.detectedLanguage.textContent = '';
        }
    }

    async detectFromSource(source) {
        // Detect format from URL, IP:port, or data source
        const urlPattern = /^(https?:\/\/|ws:\/\/|wss:\/\/)/i;
        const ipPortPattern = /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}):(\d+)$/;
        const dataUriPattern = /^data:([^;]+);base64,(.+)$/i;
        
        let detected = 'text';
        let confidence = 0;
        let sourceType = 'unknown';

        if (this.detectedLanguage) {
            this.detectedLanguage.textContent = 'Detecting from source...';
            this.detectedLanguage.style.color = '#666';
        }

        try {
            // Handle data URI
            if (dataUriPattern.test(source)) {
                const match = source.match(dataUriPattern);
                const mimeType = match[1];
                const base64Data = match[2];
                
                sourceType = 'data-uri';
                detected = this.detectFromMimeType(mimeType);
                confidence = 90;
                
                // Decode and analyze base64 content
                try {
                    const decoded = atob(base64Data);
                    const hexView = Array.from(new Uint8Array(decoded.length))
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(' ');
                    
                    if (this.detectedLanguage) {
                        this.detectedLanguage.textContent = `Data URI: ${mimeType} (${decoded.length} bytes)`;
                    }
                } catch (e) {
                    // Invalid base64
                }
            }
            // Handle HTTP/HTTPS URLs
            else if (urlPattern.test(source)) {
                sourceType = 'url';
                const url = new URL(source);
                const extension = url.pathname.split('.').pop().toLowerCase();
                
                detected = this.detectFromExtension(extension);
                confidence = 70;
                
                // Try to fetch and analyze content
                try {
                    const response = await fetch(source, { 
                        method: 'HEAD',
                        mode: 'no-cors' 
                    });
                    
                    // If CORS allows, fetch content
                    const contentResponse = await fetchWithTimeout(source, {}, 15000);
                    const contentType = contentResponse.headers.get('content-type') || '';
                    const content = await contentResponse.text();
                    
                    detected = this.detectFromMimeType(contentType) || detected;
                    confidence = 85;
                    
                    // Update editor with fetched content
                    this.editor.value = content;
                    this.updateCounts();
                    
                    if (this.detectedLanguage) {
                        this.detectedLanguage.textContent = `Fetched from ${url.hostname}: ${detected}`;
                    }
                } catch (e) {
                    // CORS or fetch failed, use extension-based detection
                    if (this.detectedLanguage) {
                        this.detectedLanguage.textContent = `URL detected: ${detected} (from extension)`;
                    }
                }
            }
            // Handle IP:Port (hex/binary stream detection)
            else if (ipPortPattern.test(source)) {
                sourceType = 'socket';
                const match = source.match(ipPortPattern);
                const ip = match[1];
                const port = parseInt(match[2]);
                
                if (this.detectedLanguage) {
                    this.detectedLanguage.textContent = `Socket: ${ip}:${port} (use WebSocket/Hex mode)`;
                    this.detectedLanguage.style.color = '#F59E0B';
                }
                
                // Suggest hex format for binary streams
                detected = 'hex';
                confidence = 60;
                
                // Show connection option
                this.showSocketConnectionOption(ip, port);
            }
            // Handle WebSocket URLs
            else if (/^ws:\/\/|^wss:\/\//i.test(source)) {
                sourceType = 'websocket';
                detected = 'hex'; // Default for binary streams
                confidence = 70;
                
                if (this.detectedLanguage) {
                    this.detectedLanguage.textContent = 'WebSocket detected (use Hex mode for binary)';
                }
            }
            
            // Update format selector
            if (detected && this.formatType) {
                this.formatType.value = detected;
                this.currentFormat = detected;
                this.updateEditorClass();
            }
            
        } catch (error) {
            if (this.detectedLanguage) {
                this.detectedLanguage.textContent = `Detection error: ${error.message}`;
                this.detectedLanguage.style.color = '#EF4444';
            }
        }
    }

    detectFromMimeType(mimeType) {
        const mimeMap = {
            'application/json': 'json',
            'application/xml': 'xml',
            'text/xml': 'xml',
            'text/html': 'html',
            'text/css': 'css',
            'text/javascript': 'javascript',
            'application/javascript': 'javascript',
            'text/x-python': 'python',
            'application/x-python': 'python',
            'text/yaml': 'yaml',
            'application/x-yaml': 'yaml',
            'text/markdown': 'markdown',
            'text/plain': 'text',
            'application/octet-stream': 'hex',
            'application/x-binary': 'binary'
        };
        
        for (const [mime, format] of Object.entries(mimeMap)) {
            if (mimeType.includes(mime)) {
                return format;
            }
        }
        
        return 'text';
    }

    detectFromExtension(ext) {
        const extMap = {
            'json': 'json',
            'xml': 'xml',
            'html': 'html',
            'htm': 'html',
            'css': 'css',
            'js': 'javascript',
            'ts': 'typescript',
            'py': 'python',
            'yaml': 'yaml',
            'yml': 'yaml',
            'md': 'markdown',
            'txt': 'text',
            'hex': 'hex',
            'bin': 'binary',
            'csv': 'csv',
            'sql': 'sql',
            'sh': 'bash'
        };
        
        return extMap[ext.toLowerCase()] || 'text';
    }

    showSocketConnectionOption(ip, port) {
        // Create a connection option UI
        const statusEl = this.formatStatus;
        if (statusEl) {
            statusEl.innerHTML = `
                <span>Socket detected: ${ip}:${port}</span>
                <button id="connect-socket-btn" style="margin-left: 0.5rem; padding: 0.25rem 0.5rem; background: var(--accent-color); color: white; border: none; border-radius: 3px; cursor: pointer; font-size: 0.75rem;">
                    Connect
                </button>
            `;
            
            const connectBtn = document.getElementById('connect-socket-btn');
            if (connectBtn) {
                connectBtn.addEventListener('click', () => {
                    this.connectToSocket(ip, port);
                });
            }
        }
    }

    async connectToSocket(ip, port) {
        // Connect to socket and stream hex data (similar to hexed.it)
        try {
            const wsUrl = `ws://${ip}:${port}`;
            const ws = new WebSocket(wsUrl);
            
            ws.onopen = () => {
                if (this.formatStatus) {
                    this.formatStatus.textContent = `Connected to ${ip}:${port}`;
                    this.formatStatus.style.color = '#10B981';
                }
                
                // Set format to hex for binary stream
                if (this.formatType) {
                    this.formatType.value = 'hex';
                    this.currentFormat = 'hex';
                    this.updateEditorClass();
                }
            };
            
            ws.onmessage = (event) => {
                // Convert binary data to hex
                if (event.data instanceof ArrayBuffer) {
                    const bytes = new Uint8Array(event.data);
                    const hex = Array.from(bytes)
                        .map(b => b.toString(16).padStart(2, '0'))
                        .join(' ');
                    
                    // Append to editor
                    this.editor.value += hex + '\n';
                    this.updateCounts();
                } else {
                    // Text data
                    this.editor.value += event.data;
                    this.updateCounts();
                }
            };
            
            ws.onerror = (error) => {
                if (this.formatStatus) {
                    this.formatStatus.textContent = `Connection error: ${error.message || 'Failed to connect'}`;
                    this.formatStatus.style.color = '#EF4444';
                }
            };
            
            ws.onclose = () => {
                if (this.formatStatus) {
                    this.formatStatus.textContent = 'Connection closed';
                    this.formatStatus.style.color = '#666';
                }
            };
            
        } catch (error) {
            if (this.formatStatus) {
                this.formatStatus.textContent = `Error: ${error.message}`;
                this.formatStatus.style.color = '#EF4444';
            }
        }
    }

    convertFormat(toFormat = null) {
        const content = this.editor.value;
        const fromFormat = this.currentFormat;
        
        // If toFormat not provided, use prompt as fallback
        if (!toFormat) {
            toFormat = prompt('Convert to format:', 'json');
        }

        if (!toFormat) return;

        try {
            let converted = content;

            // JSON conversions
            if (fromFormat === 'json' && toFormat === 'yaml') {
                const obj = JSON.parse(content);
                converted = this.jsonToYaml(obj);
            } else if (fromFormat === 'yaml' && toFormat === 'json') {
                converted = JSON.stringify(this.yamlToJson(content), null, 2);
            } else if (fromFormat === 'hex' && toFormat === 'text') {
                converted = this.hexToString(content);
            } else if (fromFormat === 'text' && toFormat === 'hex') {
                converted = this.stringToHex(content);
            } else if (fromFormat === 'binary' && toFormat === 'text') {
                converted = this.binaryToString(content);
            } else if (fromFormat === 'text' && toFormat === 'binary') {
                converted = this.stringToBinary(content);
            }

            this.editor.value = converted;
            this.currentFormat = toFormat;
            if (this.formatType) {
                this.formatType.value = toFormat;
            }
            this.updateEditorClass();
            this.updateCounts();
            if (this.formatStatus) {
                this.formatStatus.textContent = `Converted: ${fromFormat} → ${toFormat}`;
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 3000);
            }
        } catch (error) {
            if (this.formatStatus) {
                this.formatStatus.textContent = `Error: ${error.message}`;
                this.formatStatus.style.color = '#EF4444';
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 3000);
            }
        }
    }

    validateFormat() {
        const content = this.editor.value;
        let isValid = false;
        let message = '';

        try {
            switch (this.currentFormat) {
                case 'json':
                    JSON.parse(content);
                    isValid = true;
                    message = 'Valid JSON';
                    break;
                case 'xml':
                    const parser = new DOMParser();
                    const xmlDoc = parser.parseFromString(content, 'text/xml');
                    if (xmlDoc.documentElement.nodeName === 'parsererror') {
                        message = 'Invalid XML';
                    } else {
                        isValid = true;
                        message = 'Valid XML';
                    }
                    break;
                case 'html':
                    const htmlDoc = new DOMParser().parseFromString(content, 'text/html');
                    isValid = true;
                    message = 'Valid HTML';
                    break;
                default:
                    message = 'No validator available';
            }

            if (this.formatStatus) {
                this.formatStatus.textContent = message;
                this.formatStatus.style.color = isValid ? '#10B981' : '#EF4444';
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 3000);
            }
        } catch (error) {
            if (this.formatStatus) {
                this.formatStatus.textContent = `Invalid ${this.currentFormat}: ${error.message}`;
                this.formatStatus.style.color = '#EF4444';
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 3000);
            }
        }
    }

    beautifyFormat() {
        const content = this.editor.value;
        let beautified = content;

        try {
            switch (this.currentFormat) {
                case 'json':
                    const obj = JSON.parse(content);
                    beautified = JSON.stringify(obj, null, 2);
                    break;
                case 'html':
                case 'xml':
                    beautified = this.formatXML(content);
                    break;
                case 'css':
                    beautified = this.formatCSS(content);
                    break;
                case 'javascript':
                case 'typescript':
                    beautified = this.formatJavaScript(content);
                    break;
            }

            this.editor.value = beautified;
            this.updateCounts();
            if (this.formatStatus) {
                this.formatStatus.textContent = 'Beautified';
                this.formatStatus.style.color = '#10B981';
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 2000);
            }
        } catch (error) {
            if (this.formatStatus) {
                this.formatStatus.textContent = `Error: ${error.message}`;
                this.formatStatus.style.color = '#EF4444';
                setTimeout(() => {
                    this.formatStatus.textContent = '';
                }, 3000);
            }
        }
    }

    // Utility functions for format conversion
    jsonToYaml(obj, indent = 0) {
        let yaml = '';
        const spaces = '  '.repeat(indent);

        if (Array.isArray(obj)) {
            obj.forEach(item => {
                if (typeof item === 'object') {
                    yaml += spaces + '-\n' + this.jsonToYaml(item, indent + 1);
                } else {
                    yaml += spaces + '- ' + item + '\n';
                }
            });
        } else if (typeof obj === 'object') {
            Object.entries(obj).forEach(([key, value]) => {
                if (typeof value === 'object' && value !== null) {
                    yaml += spaces + key + ':\n' + this.jsonToYaml(value, indent + 1);
                } else {
                    yaml += spaces + key + ': ' + value + '\n';
                }
            });
        }

        return yaml;
    }

    yamlToJson(yaml) {
        // Simple YAML to JSON (basic implementation)
        const lines = yaml.split('\n');
        const result = {};
        lines.forEach(line => {
            const match = line.match(/^(\s*)([\w-]+):\s*(.+)$/);
            if (match) {
                const key = match[2];
                const value = match[3].trim();
                result[key] = value;
            }
        });
        return result;
    }

    hexToString(hex) {
        const hexClean = hex.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < hexClean.length; i += 2) {
            const charCode = parseInt(hexClean.substr(i, 2), 16);
            if (charCode > 0 && charCode < 128) {
                str += String.fromCharCode(charCode);
            }
        }
        return str;
    }

    stringToHex(str) {
        return str.split('').map(char => 
            char.charCodeAt(0).toString(16).padStart(2, '0')
        ).join(' ');
    }

    binaryToString(binary) {
        const binaryClean = binary.replace(/\s+/g, '');
        let str = '';
        for (let i = 0; i < binaryClean.length; i += 8) {
            const byte = binaryClean.substr(i, 8);
            const charCode = parseInt(byte, 2);
            if (charCode > 0 && charCode < 128) {
                str += String.fromCharCode(charCode);
            }
        }
        return str;
    }

    stringToBinary(str) {
        return str.split('').map(char => 
            char.charCodeAt(0).toString(2).padStart(8, '0')
        ).join(' ');
    }

    formatXML(xml) {
        // Basic XML formatting
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xml, 'text/xml');
        const serializer = new XMLSerializer();
        return serializer.serializeToString(xmlDoc);
    }

    formatCSS(css) {
        // Basic CSS formatting
        return css
            .replace(/\{/g, ' {\n  ')
            .replace(/\}/g, '\n}\n')
            .replace(/;/g, ';\n  ')
            .replace(/\n\s+\n/g, '\n');
    }

    formatJavaScript(js) {
        // Basic JS formatting (minimal)
        return js
            .replace(/\{/g, ' {\n  ')
            .replace(/\}/g, '\n}')
            .replace(/;/g, ';\n')
            .replace(/\n\s+\n/g, '\n');
    }
}

// Section toggle functionality
class SectionManager {
    constructor() {
        this.editorSection = document.getElementById('editor-section');
        this.sections = document.querySelectorAll('.section.collapsible');
        this.navLinks = document.querySelectorAll('nav a.nav-link');
        this.init();
    }

    init() {
        // Make section headers clickable
        this.sections.forEach(section => {
            const header = section.querySelector('.section-header');
            if (header) {
                header.addEventListener('click', () => {
                    const sectionId = section.id;
                    this.showSectionInEditorArea(sectionId);
                    this.updateNavActive(sectionId);
                });
            }
        });

        // Handle navigation links
        this.navLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const href = link.getAttribute('href');
                const targetId = href ? href.substring(1) : '';
                
                // Update URL hash (but don't trigger hashchange to avoid double handling)
                if (window.location.hash !== href) {
                    window.history.pushState(null, '', href);
                }
                
                // Map 'note' to 'editor-section'
                if (targetId === 'note' || targetId === '') {
                    this.showEditor();
                    this.updateNavActive('note');
                } else {
                    // Show the section with the matching ID
                    this.showSectionInEditorArea(targetId);
                    this.updateNavActive(targetId);
                }
            });
        });

        // Check URL hash for section navigation (but not editor content hash)
        this.checkInitialSection();
        
        // Listen for hash changes (browser back/forward)
        window.addEventListener('hashchange', () => {
            this.checkInitialSection();
        });
    }

    showEditor() {
        // Hide all sections
        this.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show editor
        if (this.editorSection) {
            this.editorSection.classList.add('active');
            // Focus editor after a brief delay
            setTimeout(() => {
                const editor = document.getElementById('editor');
                if (editor) editor.focus();
            }, 100);
        }
    }

    showSectionInEditorArea(sectionId) {
        // Hide editor
        if (this.editorSection) {
            this.editorSection.classList.remove('active');
        }
        
        // Hide all sections
        this.sections.forEach(section => {
            section.classList.remove('active');
        });
        
        // Show target section
        const section = document.getElementById(sectionId);
        if (section) {
            section.classList.add('active');
            // Scroll to section smoothly
            section.scrollIntoView({ behavior: 'smooth', block: 'start' });
        } else {
            console.warn(`Section with id "${sectionId}" not found`);
            // Fallback to editor if section not found
            this.showEditor();
            this.updateNavActive('note');
        }
    }

    updateNavActive(activeId) {
        this.navLinks.forEach(link => {
            const href = link.getAttribute('href');
            const linkId = href ? href.substring(1) : '';
            
            // Map 'note' link to 'editor-section' section
            if (linkId === 'note' && (activeId === 'note' || activeId === 'editor-section')) {
                link.classList.add('active');
            } else if (linkId === activeId && linkId !== 'note') {
                link.classList.add('active');
            } else {
                link.classList.remove('active');
            }
        });
    }

    checkInitialSection() {
        // Only check hash if it's a simple section ID (not compressed editor content or doc ID)
        const hash = window.location.hash;
        
        // Skip if hash is a document ID (#doc/...) or compressed content
        if (hash && (hash.startsWith('#doc/') || hash.length > 100 || hash.includes('='))) {
            // This is editor content hash, don't change sections
            return;
        }
        
        if (hash && hash.length > 1) {
            const sectionId = hash.substring(1);
            
            // Handle 'note' hash
            if (sectionId === 'note' || sectionId === '') {
                this.showEditor();
                this.updateNavActive('note');
                return;
            }
            
            const section = document.getElementById(sectionId);
            // Only show if it's a valid section
            if (section) {
                if (sectionId === 'editor-section' || section.classList.contains('editor-section')) {
                    this.showEditor();
                    this.updateNavActive('note');
                } else if (section.classList.contains('collapsible')) {
                    this.showSectionInEditorArea(sectionId);
                    this.updateNavActive(sectionId);
                } else {
                    // Default to showing editor
                    this.showEditor();
                    this.updateNavActive('note');
                }
            } else {
                // Section not found, default to editor
                this.showEditor();
                this.updateNavActive('note');
            }
        } else {
            // No hash or empty hash, default to showing editor
            this.showEditor();
            this.updateNavActive('note');
        }
    }
}

// Initialize editor when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new SimpleEditor();
        new SectionManager();
    });
} else {
    new SimpleEditor();
    new SectionManager();
}

// Cache Refresh Functionality for Quest Browser
class CacheRefreshManager {
    constructor() {
        this.refreshBtn = document.getElementById('cache-refresh-btn');
        this.init();
    }

    init() {
        if (!this.refreshBtn) {
            console.warn('Cache refresh button not found');
            return;
        }

        // Add multiple event types for Quest browser compatibility
        const handleRefresh = (e) => {
            e.preventDefault();
            e.stopPropagation();
            this.performCacheRefresh();
        };

        this.refreshBtn.addEventListener('click', handleRefresh, { passive: false });
        this.refreshBtn.addEventListener('touchend', handleRefresh, { passive: false });
        this.refreshBtn.addEventListener('pointerup', handleRefresh, { passive: false });

        // Add visual feedback for Quest browser
        this.refreshBtn.addEventListener('touchstart', (e) => {
            e.stopPropagation();
            this.refreshBtn.style.opacity = '0.7';
            this.refreshBtn.style.transform = 'scale(0.95)';
        }, { passive: true });

        this.refreshBtn.addEventListener('touchend', () => {
            setTimeout(() => {
                this.refreshBtn.style.opacity = '1';
                this.refreshBtn.style.transform = 'scale(1)';
            }, 100);
        }, { passive: true });

        console.log('[Cache Refresh] Manager initialized');
    }

    async performCacheRefresh() {
        console.log('[Cache Refresh] Starting cache refresh...');
        
        // Show loading indicator
        const originalText = this.refreshBtn.textContent;
        this.refreshBtn.textContent = '⏳';
        this.refreshBtn.disabled = true;

        try {
            // 1. Clear localStorage (but preserve important data)
            await this.clearLocalStorage();

            // 2. Clear service worker caches
            await this.clearServiceWorkerCaches();

            // 3. Clear browser cache (best effort)
            await this.clearBrowserCache();

            // 4. Show success message
            this.showMessage('Cache cleared successfully! Reloading...', 'success');

            // 5. Wait a moment then reload
            setTimeout(() => {
                window.location.reload(true); // Force reload from server
            }, 1000);
        } catch (error) {
            console.error('[Cache Refresh] Error:', error);
            this.showMessage('Cache refresh completed with warnings. Reloading...', 'warning');
            setTimeout(() => {
                window.location.reload(true);
            }, 1500);
        }
    }

    async clearLocalStorage() {
        try {
            // Get current document ID before clearing
            const currentDocId = localStorage.getItem('current_doc_id');
            const currentDocData = currentDocId ? localStorage.getItem(`doc_${currentDocId}`) : null;

            // Clear all localStorage
            localStorage.clear();

            // Restore current document if it exists (optional - user might want full clear)
            // Comment out the next 3 lines if you want a complete cache clear
            // if (currentDocId && currentDocData) {
            //     localStorage.setItem(`doc_${currentDocId}`, currentDocData);
            //     localStorage.setItem('current_doc_id', currentDocId);
            // }

            console.log('[Cache Refresh] localStorage cleared');
        } catch (error) {
            console.warn('[Cache Refresh] localStorage clear failed:', error);
        }
    }

    async clearServiceWorkerCaches() {
        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const registration of registrations) {
                    await registration.unregister();
                }
                console.log('[Cache Refresh] Service workers unregistered');
            }

            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
                console.log('[Cache Refresh] Service worker caches cleared');
            }
        } catch (error) {
            console.warn('[Cache Refresh] Service worker cache clear failed:', error);
        }
    }

    async clearBrowserCache() {
        try {
            // Try to clear browser cache using Cache API
            if ('cache' in window && window.cache && window.cache.delete) {
                await window.cache.delete();
                console.log('[Cache Refresh] Browser cache cleared');
            }
        } catch (error) {
            console.warn('[Cache Refresh] Browser cache clear not supported:', error);
        }
    }

    showMessage(message, type = 'info') {
        const messageDiv = document.createElement('div');
        messageDiv.className = 'cache-refresh-message';
        messageDiv.textContent = message;
        messageDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: ${type === 'success' ? '#4CAF50' : type === 'warning' ? '#FF9800' : '#2196F3'};
            color: white;
            padding: 1.5rem 2rem;
            border-radius: 8px;
            font-size: 1.1rem;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.3);
            text-align: center;
            min-width: 300px;
            animation: fadeInOut 2s;
        `;

        // Add animation style if not exists
        if (!document.getElementById('cache-refresh-message-style')) {
            const style = document.createElement('style');
            style.id = 'cache-refresh-message-style';
            style.textContent = `
                @keyframes fadeInOut {
                    0% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                    20% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
                    100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(messageDiv);
        setTimeout(() => messageDiv.remove(), 2000);
    }
}

// Initialize Cache Refresh Manager when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        new CacheRefreshManager();
    });
} else {
    new CacheRefreshManager();
}
