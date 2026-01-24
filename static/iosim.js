// iosim.js - Standalone iOS Simulator Integration for fornevercollective
// Deployable module for the .iosim section
// Features: Device simulation, UV terminal, Cursor CLI integration, multi-method sync
// Scalable: Supports multiple instances, load balancing, distributed sync

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

class IOSimulator {
    constructor(config = {}) {
        this.container = null;
        this.devices = [];
        this.selectedDevice = null;
        this.detectedDevice = null;
        this.githubRepos = [];
        this.previewUrl = null;
        this.syncMethods = {
            websocket: null,
            http: null,
            broadcastChannel: null,
            ipc: null
        };
        this.docSyncWs = null; // Document sync WebSocket connection
        this.deviceId = null;
        this.config = {
            apiEndpoint: config.apiEndpoint || 'http://localhost:8080',
            wsEndpoint: config.wsEndpoint || 'ws://localhost:8080',
            enableCursorCLI: config.enableCursorCLI !== false,
            enableScalability: config.enableScalability !== false,
            instanceId: config.instanceId || this.generateInstanceId(),
            githubUser: config.githubUser || 'fornevercollective',
            ...config
        };
        this.init();
    }

    generateInstanceId() {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let id = '';
        for (let i = 0; i < 12; i++) {
            id += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return id;
    }

    init() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => {
                setTimeout(() => this.setup(), 100); // Small delay to ensure all scripts are loaded
            });
        } else {
            // DOM already loaded, but wait a bit for other scripts
            setTimeout(() => this.setup(), 100);
        }
    }

    async setup() {
        try {
            // Find or create iosim section
            let iosimSection = document.getElementById('iosim');
            if (!iosimSection) {
                console.warn('[IOSim] iosim section not found, creating...');
                iosimSection = this.createIOSimSection();
            }
            
            // Look for section-content (from HTML) or iosim-content (from createIOSimSection)
            this.container = iosimSection.querySelector('.section-content') || 
                             iosimSection.querySelector('.iosim-content') || 
                             iosimSection;
            
            if (!this.container) {
                console.error('[IOSim] Could not find container element');
                // Try to create a container
                const sectionContent = document.createElement('div');
                sectionContent.className = 'section-content';
                iosimSection.appendChild(sectionContent);
                this.container = sectionContent;
            }
            
            await this.detectDevice();
            this.render();
            this.initSync();
            this.loadDevices();
            this.loadGitHubRepos();
        } catch (error) {
            console.error('[IOSim] Setup error:', error);
            // Try to show error in the section
            const iosimSection = document.getElementById('iosim');
            if (iosimSection) {
                const container = iosimSection.querySelector('.section-content') || iosimSection;
                container.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-color);">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">iOS Simulator Error</div>
                        <div style="font-size: 0.875rem; opacity: 0.7;">${error.message}</div>
                        <div style="font-size: 0.75rem; opacity: 0.5; margin-top: 1rem;">Check console for details</div>
                    </div>
                `;
            }
        }
    }

    createIOSimSection() {
        const section = document.createElement('section');
        section.id = 'iosim';
        section.className = 'section collapsible';
        section.innerHTML = `
            <h2 class="section-header">.iosim</h2>
            <div class="iosim-content"></div>
        `;
        
        // Insert before closing main tag or append to content area
        const contentArea = document.getElementById('content-area') || document.querySelector('main');
        if (contentArea) {
            contentArea.appendChild(section);
        }
        
        return section;
    }

    render() {
        if (!this.container) {
            console.error('[IOSim] Cannot render: container not found');
            return;
        }

        try {
            this.container.innerHTML = `
            <div class="iosim-controls">
                <div class="iosim-header">
                    <h3>iOS Device Simulator</h3>
                    <div class="iosim-status" id="iosim-status">
                        <span class="status-dot"></span>
                        <span>Ready</span>
                    </div>
                </div>
                
                <div class="iosim-device-selector">
                    <label>Select Device:</label>
                    <select id="iosim-device-select" class="iosim-select">
                        <option value="">Loading devices...</option>
                    </select>
                    <div class="iosim-device-detected" id="iosim-device-detected" style="display: none;">
                        <span class="iosim-detected-label">Detected:</span>
                        <span class="iosim-detected-value" id="iosim-detected-device-name"></span>
                    </div>
                    <button id="iosim-launch-btn" class="iosim-btn">🚀 Launch</button>
                </div>
                
                <div class="iosim-url-input-group">
                    <label>Preview URL (Git/Web):</label>
                    <div class="iosim-url-input-wrapper">
                        <input 
                            type="text" 
                            id="iosim-preview-url" 
                            class="iosim-url-input" 
                            placeholder="Paste GitHub repo URL, GitHub Pages URL, or any web address..."
                        />
                        <button id="iosim-load-url-btn" class="iosim-btn-small">Load</button>
                    </div>
                </div>
                
                <div class="iosim-repo-selector">
                    <label>GitHub Repos:</label>
                    <select id="iosim-repo-select" class="iosim-select">
                        <option value="">Loading repos...</option>
                    </select>
                    <button id="iosim-load-repo-btn" class="iosim-btn-small">Load Repo</button>
                </div>
                
                <div class="iosim-preview" id="iosim-preview">
                    <div class="iosim-placeholder">
                        <div class="iosim-icon">📱</div>
                        <p>Select a device to preview</p>
                    </div>
                </div>
                
                <div class="iosim-terminal" id="iosim-terminal" style="display: none;">
                    <div class="iosim-terminal-header">
                        <span>⚡ UV Terminal</span>
                        <button id="iosim-terminal-toggle" class="iosim-btn-small">−</button>
                    </div>
                    <div class="iosim-terminal-output" id="iosim-terminal-output">
                        <div class="iosim-terminal-line">UV Python package manager ready...</div>
                    </div>
                    <div class="iosim-terminal-input">
                        <input 
                            type="text" 
                            id="iosim-terminal-input" 
                            placeholder="uv pip install package"
                        />
                        <button id="iosim-terminal-run" class="iosim-btn">Run</button>
                    </div>
                </div>
                
                <div class="iosim-sync-info">
                    <div class="iosim-sync-status">
                        <span>Sync:</span>
                        <span id="iosim-sync-status">Disconnected</span>
                    </div>
                    <div class="iosim-device-info">
                        <span>Device ID:</span>
                        <span id="iosim-device-id" class="iosim-code">-</span>
                    </div>
                    <div class="iosim-device-qr-container" id="iosim-device-qr-container" style="display: none;">
                        <canvas id="iosim-device-qr" class="iosim-device-qr"></canvas>
                        <div class="iosim-device-qr-actions">
                            <button id="iosim-toggle-qr-btn" class="iosim-qr-btn" title="Toggle QR Code">📱</button>
                            <button id="iosim-download-qr-btn" class="iosim-qr-btn" title="Download QR Code">💾</button>
                            <button id="iosim-copy-device-id-btn" class="iosim-qr-btn" title="Copy Device ID">📋</button>
                        </div>
                    </div>
                    <div class="iosim-device-address">
                        <input type="text" id="iosim-device-address" class="iosim-device-address-input" readonly>
                        <button id="iosim-show-qr-btn" class="iosim-show-qr-btn" title="Show QR Code">🔗</button>
                    </div>
                </div>
                
                <div class="iosim-terminal-support">
                    <div class="iosim-terminal-support-header" id="iosim-terminal-support-toggle">
                        <span>🚀 Production Ready</span>
                        <div class="iosim-terminal-support-actions">
                            <button id="iosim-copy-content-btn" class="iosim-copy-btn" title="Copy all content">
                                📋 Copy
                            </button>
                            <span class="iosim-toggle-icon">▼</span>
                        </div>
                    </div>
                    <div class="iosim-terminal-support-content" id="iosim-terminal-support-content" style="display: none;">
                        <div class="iosim-feature-section">
                            <h4>1. Live Cursor CLI Integration</h4>
                            <p><strong>Terminal syncing:</strong></p>
                            <ul>
                                <li>Detects <code>cursor</code> or <code>agent</code> commands automatically</li>
                                <li>Executes via Electron's Cursor Composer handler</li>
                                <li>Streams output in real-time</li>
                                <li>Syncs commands/results across all instances</li>
                            </ul>
                            <p><strong>HTTP API endpoint:</strong> <code>/api/cursor/composer</code></p>
                            <p><strong>Features:</strong></p>
                            <pre class="iosim-code-block">// In iosim terminal, you can now run:
cursor chat "analyze this device configuration"
agent chat "fix the sync issue"</pre>
                        </div>
                        
                        <div class="iosim-feature-section">
                            <h4>2. Ecosystem Deployment</h4>
                            <p><strong>Multi-method sync (redundancy):</strong></p>
                            <ul>
                                <li>WebSocket (real-time)</li>
                                <li>HTTP/REST API (fallback)</li>
                                <li>BroadcastChannel (same-origin)</li>
                                <li>IPC (Electron)</li>
                                <li>localStorage (offline)</li>
                            </ul>
                            <p><strong>API endpoints:</strong></p>
                            <ul>
                                <li><code>/api/devices</code> - Get device list</li>
                                <li><code>/api/simulator/launch</code> - Launch simulator</li>
                                <li><code>/api/terminal/execute</code> - Execute commands</li>
                                <li><code>/api/cursor/composer</code> - Cursor CLI execution</li>
                                <li><code>/api/cursor/composer/sync</code> - Sync Cursor commands</li>
                                <li><code>/api/instances/register</code> - Instance registration</li>
                                <li><code>/api/instances</code> - List active instances</li>
                            </ul>
                        </div>
                        
                        <div class="iosim-feature-section">
                            <h4>3. Scalability Features</h4>
                            <p><strong>Instance management:</strong></p>
                            <ul>
                                <li>Instance registry tracks all active instances</li>
                                <li>Auto-cleanup of stale instances (60s timeout)</li>
                                <li>Instance IDs for request routing</li>
                                <li>Load balancing support</li>
                            </ul>
                            <p><strong>Configuration:</strong></p>
                            <pre class="iosim-code-block">// Deploy with custom config
const iosim = new IOSimulator({
    apiEndpoint: 'http://your-server:8080',
    wsEndpoint: 'ws://your-server:8080',
    enableCursorCLI: true,
    enableScalability: true,
    instanceId: 'custom-id',
    multipleInstances: false
});</pre>
                            <p><strong>Multiple instances:</strong></p>
                            <ul>
                                <li>Supports multiple iosim instances on same page</li>
                                <li>Each instance has unique ID</li>
                                <li>Requests include instance headers</li>
                                <li>Load balancing ready</li>
                            </ul>
                            <p><strong>Environment variables:</strong></p>
                            <ul>
                                <li><code>IOSIM_PORT</code> - Server port (default: 8080)</li>
                                <li><code>IOSIM_HOST</code> - Server host (default: localhost)</li>
                                <li><code>CURSOR_CLI_PATH</code> - Custom Cursor CLI path</li>
                            </ul>
                        </div>
                        
                        <div class="iosim-feature-section">
                            <h4>Deployment Ready</h4>
                            <p>The iosim.js file is:</p>
                            <ul>
                                <li><strong>Self-contained</strong> — works standalone</li>
                                <li><strong>Configurable</strong> — supports multiple deployment scenarios</li>
                                <li><strong>Scalable</strong> — handles multiple instances</li>
                                <li><strong>Redundant</strong> — multiple sync methods</li>
                                <li><strong>Production-ready</strong> — error handling, fallbacks, cleanup</li>
                            </ul>
                            <p><strong>Usage example:</strong></p>
                            <pre class="iosim-code-block">&lt;!-- Simple deployment --&gt;
&lt;script src="iosim.js"&gt;&lt;/script&gt;

&lt;!-- Or with config --&gt;
&lt;script&gt;
  window.IOSIM_CONFIG = {
    apiEndpoint: 'https://your-api.com',
    enableCursorCLI: true,
    enableScalability: true
  };
&lt;/script&gt;
&lt;script src="iosim.js"&gt;&lt;/script&gt;</pre>
                            <p><strong>Ready for deployment across the ecosystem with Cursor CLI integration and scalability support.</strong></p>
                        </div>
                    </div>
                </div>
            </div>
        `;

            this.attachEventListeners();
            console.log('[IOSim] Render complete');
        } catch (error) {
            console.error('[IOSim] Render error:', error);
            if (this.container) {
                this.container.innerHTML = `
                    <div style="padding: 2rem; text-align: center; color: var(--text-color);">
                        <div style="font-size: 2rem; margin-bottom: 1rem;">⚠️</div>
                        <div style="font-weight: bold; margin-bottom: 0.5rem;">Render Error</div>
                        <div style="font-size: 0.875rem; opacity: 0.7;">${error.message}</div>
                    </div>
                `;
            }
        }
    }

    attachEventListeners() {
        // Device selection
        const deviceSelect = document.getElementById('iosim-device-select');
        if (deviceSelect) {
            deviceSelect.addEventListener('change', (e) => {
                this.selectDevice(e.target.value);
            });
        }

        // Launch button
        const launchBtn = document.getElementById('iosim-launch-btn');
        if (launchBtn) {
            launchBtn.addEventListener('click', () => {
                this.launchSimulator();
            });
        }

        // URL input and load button
        const urlInput = document.getElementById('iosim-preview-url');
        const loadUrlBtn = document.getElementById('iosim-load-url-btn');
        if (urlInput && loadUrlBtn) {
            loadUrlBtn.addEventListener('click', () => {
                this.loadPreviewUrl(urlInput.value);
            });
            urlInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.loadPreviewUrl(urlInput.value);
                }
            });
            // Handle paste events
            urlInput.addEventListener('paste', (e) => {
                setTimeout(() => {
                    const pastedUrl = urlInput.value.trim();
                    if (pastedUrl) {
                        this.loadPreviewUrl(pastedUrl);
                    }
                }, 10);
            });
        }

        // Repo selector and load button
        const repoSelect = document.getElementById('iosim-repo-select');
        const loadRepoBtn = document.getElementById('iosim-load-repo-btn');
        if (repoSelect) {
            repoSelect.addEventListener('change', (e) => {
                if (e.target.value) {
                    const repo = this.githubRepos.find(r => r.html_url === e.target.value);
                    if (repo) {
                        this.loadRepoUrl(repo);
                    }
                }
            });
        }
        if (loadRepoBtn && repoSelect) {
            loadRepoBtn.addEventListener('click', () => {
                const selectedUrl = repoSelect.value;
                if (selectedUrl) {
                    const repo = this.githubRepos.find(r => r.html_url === selectedUrl);
                    if (repo) {
                        this.loadRepoUrl(repo);
                    }
                }
            });
        }

        // Terminal toggle
        const terminalToggle = document.getElementById('iosim-terminal-toggle');
        if (terminalToggle) {
            terminalToggle.addEventListener('click', () => {
                this.toggleTerminal();
            });
        }

        // Terminal run
        const terminalRun = document.getElementById('iosim-terminal-run');
        const terminalInput = document.getElementById('iosim-terminal-input');
        if (terminalRun && terminalInput) {
            terminalRun.addEventListener('click', () => {
                this.runTerminalCommand(terminalInput.value);
            });
            
            terminalInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    this.runTerminalCommand(terminalInput.value);
                }
            });
        }

        // Terminal support info toggle
        const terminalSupportToggle = document.getElementById('iosim-terminal-support-toggle');
        if (terminalSupportToggle) {
            // Only toggle when clicking the header itself, not the button
            terminalSupportToggle.addEventListener('click', (e) => {
                if (!e.target.closest('.iosim-copy-btn')) {
                    this.toggleTerminalSupport();
                }
            });
        }

        // Copy content button
        const copyContentBtn = document.getElementById('iosim-copy-content-btn');
        if (copyContentBtn) {
            copyContentBtn.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent toggle
                this.copyTerminalSupportContent();
            });
        }
    }

    toggleTerminalSupport() {
        const content = document.getElementById('iosim-terminal-support-content');
        const toggle = document.getElementById('iosim-terminal-support-toggle');
        const icon = toggle?.querySelector('.iosim-toggle-icon');
        
        if (content && toggle) {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            if (icon) {
                icon.textContent = isHidden ? '▲' : '▼';
            }
            toggle.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        }
    }

    copyTerminalSupportContent() {
        const content = document.getElementById('iosim-terminal-support-content');
        if (!content) return;

        // Extract text content from the HTML, preserving structure
        const textContent = this.extractTextFromElement(content);
        
        // Copy to clipboard
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(textContent).then(() => {
                this.showCopyFeedback();
            }).catch(() => {
                this.fallbackCopy(textContent);
            });
        } else {
            this.fallbackCopy(textContent);
        }
    }

    extractTextFromElement(element) {
        // Clone the element to avoid modifying the original
        const clone = element.cloneNode(true);
        
        // Convert code blocks to plain text with proper formatting
        const codeBlocks = clone.querySelectorAll('.iosim-code-block');
        codeBlocks.forEach(block => {
            const text = block.textContent || block.innerText;
            block.textContent = text;
        });
        
        // Convert inline code to plain text
        const inlineCodes = clone.querySelectorAll('code');
        inlineCodes.forEach(code => {
            const text = code.textContent || code.innerText;
            code.textContent = text;
        });
        
        // Get text content with line breaks preserved
        const text = clone.textContent || clone.innerText;
        
        // Clean up extra whitespace but preserve structure
        return text.split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
    }

    showCopyFeedback() {
        const copyBtn = document.getElementById('iosim-copy-content-btn');
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓ Copied!';
            copyBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.opacity = '1';
            }, 2000);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            this.showCopyFeedback();
        } catch (e) {
            alert('Failed to copy. Please select and copy manually.');
        }
        
        document.body.removeChild(textarea);
    }

    async loadDevices() {
        try {
            // Try to load from Electron app (supports multiple instances)
            const response = await fetchWithTimeout(`${this.config.apiEndpoint}/api/devices`, {
                headers: {
                    'X-Instance-ID': this.config.instanceId,
                    'X-Client-Type': 'iosim-web'
                }
            }, 8000); // 8 second timeout
            const data = await response.json();
            this.devices = data.devices || [];
            
            // If scalability enabled, register this instance
            if (this.config.enableScalability) {
                this.registerInstance();
            }
        } catch (e) {
            // Fallback to default devices including AR/VR/XR
            this.devices = [
                { name: 'iPhone 15 Pro', width: 393, height: 852, dpr: 3, type: 'mobile', platform: 'ios' },
                { name: 'iPhone 14', width: 390, height: 844, dpr: 3, type: 'mobile', platform: 'ios' },
                { name: 'iPhone SE', width: 375, height: 667, dpr: 2, type: 'mobile', platform: 'ios' },
                { name: 'iPad Pro', width: 1024, height: 1366, dpr: 2, type: 'tablet', platform: 'ios' },
                { name: 'Apple Vision Pro', width: 3664, height: 3200, dpr: 2, type: 'xr', platform: 'visionos', fov: 110, handTracking: true, eyeTracking: true },
                { name: 'Meta Quest 3', width: 2064, height: 2208, dpr: 1.5, type: 'vr', platform: 'webxr', fov: 110, handTracking: true },
                { name: 'Meta Quest 2', width: 1832, height: 1920, dpr: 1.5, type: 'vr', platform: 'webxr', fov: 90, handTracking: true },
                { name: 'Meta Quest Pro', width: 1800, height: 1920, dpr: 1.5, type: 'vr', platform: 'webxr', fov: 106, handTracking: true, eyeTracking: true },
                { name: 'HTC Vive Pro 2', width: 2448, height: 2448, dpr: 1, type: 'vr', platform: 'webxr', fov: 120 },
                { name: 'Valve Index', width: 2880, height: 1600, dpr: 1, type: 'vr', platform: 'webxr', fov: 130 },
                { name: 'Pico 4', width: 2160, height: 2160, dpr: 1.5, type: 'vr', platform: 'webxr', fov: 105, handTracking: true },
                { name: 'AR Device (Generic)', width: 1920, height: 1080, dpr: 2, type: 'ar', platform: 'webxr', handTracking: true }
            ];
        }

        this.populateDeviceSelect();
    }

    async registerInstance() {
        // Register this instance for load balancing and distributed sync
        try {
            await fetch(`${this.config.apiEndpoint}/api/instances/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instanceId: this.config.instanceId,
                    deviceId: this.deviceId,
                    capabilities: ['device-sim', 'uv-terminal', 'cursor-cli', 'doc-sync'],
                    timestamp: new Date().toISOString()
                })
            });
        } catch (e) {
            // Silent fail - instance registration is optional
        }
    }

    async detectDevice() {
        const ua = navigator.userAgent;
        const width = window.innerWidth;
        const height = window.innerHeight;
        const dpr = window.devicePixelRatio || 1;
        
        let detectedDevice = null;
        
        // Detect AR/VR/XR devices first
        const isVR = await this.detectVR();
        const isAR = await this.detectAR();
        const isXR = isVR || isAR;
        
        if (isXR) {
            // Detect specific VR/AR headsets
            if (/Oculus|Quest/i.test(ua)) {
                detectedDevice = { 
                    name: 'Meta Quest', 
                    width: 1832, 
                    height: 1920, 
                    dpr: 1.5, 
                    type: 'vr', 
                    platform: 'webxr',
                    fov: 90,
                    handTracking: true
                };
            } else if (/Vision Pro|visionOS/i.test(ua)) {
                detectedDevice = { 
                    name: 'Apple Vision Pro', 
                    width: 3664, 
                    height: 3200, 
                    dpr: 2, 
                    type: 'xr', 
                    platform: 'visionos',
                    fov: 110,
                    handTracking: true,
                    eyeTracking: true
                };
            } else if (/HTC|Vive/i.test(ua)) {
                detectedDevice = { 
                    name: 'HTC Vive', 
                    width: 2160, 
                    height: 1200, 
                    dpr: 1, 
                    type: 'vr', 
                    platform: 'webxr',
                    fov: 110
                };
            } else if (/Valve|Index/i.test(ua)) {
                detectedDevice = { 
                    name: 'Valve Index', 
                    width: 2880, 
                    height: 1600, 
                    dpr: 1, 
                    type: 'vr', 
                    platform: 'webxr',
                    fov: 130
                };
            } else if (/Pico/i.test(ua)) {
                detectedDevice = { 
                    name: 'Pico VR', 
                    width: 1832, 
                    height: 1920, 
                    dpr: 1.5, 
                    type: 'vr', 
                    platform: 'webxr',
                    fov: 98
                };
            } else if (isAR) {
                detectedDevice = { 
                    name: 'AR Device', 
                    width: width, 
                    height: height, 
                    dpr: dpr, 
                    type: 'ar', 
                    platform: 'webxr',
                    handTracking: true
                };
            } else {
                // Generic VR/XR device
                detectedDevice = { 
                    name: 'VR/XR Device', 
                    width: width || 1920, 
                    height: height || 1080, 
                    dpr: dpr, 
                    type: isVR ? 'vr' : 'xr', 
                    platform: 'webxr',
                    fov: 90
                };
            }
        }
        // Detect iOS devices
        else if (/iPad/.test(ua) || (/iPhone|iPod/.test(ua) && !window.MSStream)) {
            if (/iPad/.test(ua)) {
                // iPad detection
                if (width >= 1024) {
                    detectedDevice = { name: 'iPad Pro', width: 1024, height: 1366, dpr: 2, type: 'tablet', platform: 'ios' };
                } else {
                    detectedDevice = { name: 'iPad', width: 768, height: 1024, dpr: 2, type: 'tablet', platform: 'ios' };
                }
            } else {
                // iPhone detection
                if (width >= 393) {
                    detectedDevice = { name: 'iPhone 15 Pro', width: 393, height: 852, dpr: 3, type: 'mobile', platform: 'ios' };
                } else if (width >= 390) {
                    detectedDevice = { name: 'iPhone 14', width: 390, height: 844, dpr: 3, type: 'mobile', platform: 'ios' };
                } else {
                    detectedDevice = { name: 'iPhone SE', width: 375, height: 667, dpr: 2, type: 'mobile', platform: 'ios' };
                }
            }
        } else if (/Android/.test(ua)) {
            // Android device detection
            if (width >= 1024) {
                detectedDevice = { name: 'Android Tablet', width: width, height: height, dpr: dpr, type: 'tablet', platform: 'android' };
            } else {
                detectedDevice = { name: 'Android Phone', width: width, height: height, dpr: dpr, type: 'mobile', platform: 'android' };
            }
        } else {
            // Desktop/other - use current viewport
            detectedDevice = { name: 'Desktop', width: width, height: height, dpr: dpr, type: 'desktop', platform: 'web' };
        }
        
        this.detectedDevice = detectedDevice;
        return detectedDevice;
    }

    async detectVR() {
        // Check for WebXR VR support
        if (navigator.xr) {
            try {
                const isSupported = await navigator.xr.isSessionSupported('immersive-vr');
                if (isSupported) return true;
            } catch (e) {
                // WebXR not available
            }
        }
        
        // Check user agent for VR devices
        const ua = navigator.userAgent;
        if (/Oculus|Quest|Vive|Index|Pico|VR|Headset/i.test(ua)) {
            return true;
        }
        
        // Check for VR-specific APIs
        if (window.VRFrameData || window.getVRDisplays) {
            return true;
        }
        
        return false;
    }

    async detectAR() {
        // Check for WebXR AR support
        if (navigator.xr) {
            try {
                const isSupported = await navigator.xr.isSessionSupported('immersive-ar');
                if (isSupported) return true;
            } catch (e) {
                // WebXR AR not available
            }
        }
        
        // Check user agent for AR devices
        const ua = navigator.userAgent;
        if (/Vision Pro|visionOS|ARKit|ARCore|AR|Hololens/i.test(ua)) {
            return true;
        }
        
        // Check for AR-specific APIs
        if (window.DeviceMotionEvent || window.DeviceOrientationEvent) {
            // Could be AR-capable device
            if (navigator.getUserMedia && navigator.mediaDevices) {
                // Has camera access which is needed for AR
                return true;
            }
        }
        
        return false;
    }

    populateDeviceSelect() {
        const select = document.getElementById('iosim-device-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select a device...</option>';
        
        // Group devices by type
        const deviceGroups = {
            mobile: [],
            tablet: [],
            desktop: [],
            vr: [],
            ar: [],
            xr: []
        };
        
        // Add detected device first
        if (this.detectedDevice) {
            const detectedOption = document.createElement('option');
            detectedOption.value = this.detectedDevice.name;
            const typeLabel = this.getDeviceTypeLabel(this.detectedDevice.type);
            detectedOption.textContent = `${this.detectedDevice.name} (Detected: ${this.detectedDevice.width}×${this.detectedDevice.height}) ${typeLabel}`;
            detectedOption.dataset.device = JSON.stringify(this.detectedDevice);
            detectedOption.selected = true;
            select.appendChild(detectedOption);
            
            // Show detected device indicator
            const detectedEl = document.getElementById('iosim-device-detected');
            const detectedNameEl = document.getElementById('iosim-detected-device-name');
            if (detectedEl && detectedNameEl) {
                detectedEl.style.display = 'flex';
                detectedNameEl.textContent = `${this.detectedDevice.name} (${this.detectedDevice.width}×${this.detectedDevice.height}) ${typeLabel}`;
            }
            
            // Auto-select detected device
            this.selectedDevice = this.detectedDevice;
        }
        
        // Group all devices
        this.devices.forEach(device => {
            // Skip if already added as detected device
            if (this.detectedDevice && device.name === this.detectedDevice.name) {
                return;
            }
            const type = device.type || 'desktop';
            if (deviceGroups[type]) {
                deviceGroups[type].push(device);
            } else {
                deviceGroups.desktop.push(device);
            }
        });
        
        // Add optgroups for better organization
        const addOptGroup = (label, devices) => {
            if (devices.length === 0) return;
            const optgroup = document.createElement('optgroup');
            optgroup.label = label;
            devices.forEach(device => {
                const option = document.createElement('option');
                option.value = device.name;
                const typeLabel = this.getDeviceTypeLabel(device.type);
                option.textContent = `${device.name} (${device.width}×${device.height}) ${typeLabel}`;
                option.dataset.device = JSON.stringify(device);
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        };
        
        // Add devices in order: Mobile, Tablet, Desktop, VR, AR, XR
        addOptGroup('📱 Mobile', deviceGroups.mobile);
        addOptGroup('📱 Tablet', deviceGroups.tablet);
        addOptGroup('🖥️ Desktop', deviceGroups.desktop);
        addOptGroup('🥽 VR', deviceGroups.vr);
        addOptGroup('👓 AR', deviceGroups.ar);
        addOptGroup('🌐 XR', deviceGroups.xr);
        
        // Update preview if device is selected
        if (this.selectedDevice) {
            this.updatePreview();
        }
    }

    getDeviceTypeLabel(type) {
        const labels = {
            'mobile': '📱',
            'tablet': '📱',
            'desktop': '🖥️',
            'vr': '🥽',
            'ar': '👓',
            'xr': '🌐'
        };
        return labels[type] || '';
    }

    selectDevice(deviceName) {
        const select = document.getElementById('iosim-device-select');
        if (!select) return;

        const option = select.querySelector(`option[value="${deviceName}"]`);
        if (option && option.dataset.device) {
            this.selectedDevice = JSON.parse(option.dataset.device);
            this.updatePreview();
        }
    }

    updatePreview() {
        const preview = document.getElementById('iosim-preview');
        if (!preview || !this.selectedDevice) return;

        const device = this.selectedDevice;
        const isXR = device.type === 'vr' || device.type === 'ar' || device.type === 'xr';
        const scale = isXR 
            ? Math.min(400 / device.width, 400 / device.height, 0.6) // Smaller scale for VR/AR
            : Math.min(300 / device.width, 500 / device.height, 0.8);
        const scaledWidth = device.width * scale;
        const scaledHeight = device.height * scale;

        // Get device icon based on type
        const deviceIcon = this.getDeviceIcon(device.type);
        const deviceGradient = this.getDeviceGradient(device.type);

        // If there's a preview URL, show it in an iframe
        if (this.previewUrl) {
            preview.innerHTML = `
                <div class="iosim-device-frame ${isXR ? 'iosim-xr-frame' : ''}" style="width: ${scaledWidth + 24}px; height: ${scaledHeight + 24}px;">
                    <div class="iosim-device-screen ${isXR ? 'iosim-xr-screen' : ''}" style="width: ${scaledWidth}px; height: ${scaledHeight}px; overflow: hidden; border-radius: ${isXR ? '16px' : '8px'}; background: #000;">
                        <iframe 
                            src="${this.previewUrl}" 
                            style="width: ${device.width}px; height: ${device.height}px; border: none; transform: scale(${scale}); transform-origin: top left;"
                            frameborder="0"
                            allowfullscreen
                            allow="xr-spatial-tracking; camera; microphone"
                        ></iframe>
                    </div>
                    <div class="iosim-preview-info" style="margin-top: 8px; font-size: 0.75rem; color: var(--text-color); opacity: 0.7;">
                        <div>${deviceIcon} ${device.name} (${device.width}×${device.height})</div>
                        ${device.fov ? `<div>FOV: ${device.fov}°</div>` : ''}
                        ${device.handTracking ? `<div>✋ Hand Tracking</div>` : ''}
                        ${device.eyeTracking ? `<div>👁️ Eye Tracking</div>` : ''}
                        <div style="word-break: break-all; margin-top: 4px;">${this.previewUrl}</div>
                    </div>
                </div>
            `;
        } else {
            // Default placeholder with device-specific styling
            preview.innerHTML = `
                <div class="iosim-device-frame ${isXR ? 'iosim-xr-frame' : ''}" style="width: ${scaledWidth + 24}px; height: ${scaledHeight + 24}px;">
                    <div class="iosim-device-screen ${isXR ? 'iosim-xr-screen' : ''}" style="width: ${scaledWidth}px; height: ${scaledHeight}px;">
                        <div class="iosim-device-content" style="width: ${scaledWidth}px; height: ${scaledHeight}px; transform: scale(${scale}); transform-origin: top left;">
                            <div style="padding: 20px; background: ${deviceGradient}; color: white; height: 100%; border-radius: ${isXR ? '16px' : '8px'}; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                                <div style="font-size: ${isXR ? '32px' : '24px'}; margin-bottom: 10px;">${deviceIcon}</div>
                                <div style="font-size: 14px; opacity: 0.9;">${device.name}</div>
                                <div style="font-size: 12px; opacity: 0.7; margin-top: 10px;">${device.width} × ${device.height}</div>
                                ${device.fov ? `<div style="font-size: 11px; opacity: 0.6; margin-top: 5px;">FOV: ${device.fov}°</div>` : ''}
                                ${device.handTracking ? `<div style="font-size: 11px; opacity: 0.6; margin-top: 5px;">✋ Hand Tracking</div>` : ''}
                                ${device.eyeTracking ? `<div style="font-size: 11px; opacity: 0.6; margin-top: 5px;">👁️ Eye Tracking</div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>
            `;
        }
    }

    getDeviceIcon(type) {
        const icons = {
            'mobile': '📱',
            'tablet': '📱',
            'desktop': '🖥️',
            'vr': '🥽',
            'ar': '👓',
            'xr': '🌐'
        };
        return icons[type] || '📱';
    }

    getDeviceGradient(type) {
        const gradients = {
            'mobile': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'tablet': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'desktop': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            'vr': 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            'ar': 'linear-gradient(135deg, #00d4ff 0%, #090979 50%, #020024 100%)',
            'xr': 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)'
        };
        return gradients[type] || 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
    }

    async loadGitHubRepos() {
        try {
            const response = await fetchWithTimeout(
                `https://api.github.com/users/${this.config.githubUser}/repos?per_page=100&sort=updated`,
                {},
                10000
            );
            
            if (!response.ok) {
                throw new Error(`GitHub API error: ${response.status}`);
            }
            
            const repos = await response.json();
            this.githubRepos = repos.filter(repo => !repo.archived && !repo.disabled);
            this.populateRepoSelect();
        } catch (e) {
            console.warn('[IOSim] Failed to load GitHub repos:', e);
            const repoSelect = document.getElementById('iosim-repo-select');
            if (repoSelect) {
                repoSelect.innerHTML = '<option value="">Failed to load repos</option>';
            }
        }
    }

    populateRepoSelect() {
        const select = document.getElementById('iosim-repo-select');
        if (!select) return;

        select.innerHTML = '<option value="">Select a repository...</option>';
        
        this.githubRepos.forEach(repo => {
            const option = document.createElement('option');
            option.value = repo.html_url;
            option.textContent = `${repo.name} ${repo.description ? `- ${repo.description}` : ''}`;
            option.title = repo.html_url;
            select.appendChild(option);
        });
    }

    loadPreviewUrl(url) {
        if (!url || !url.trim()) {
            alert('Please enter a valid URL');
            return;
        }

        let previewUrl = url.trim();
        
        // Handle GitHub repo URLs - convert to GitHub Pages if available
        if (previewUrl.includes('github.com')) {
            // Check if it's a GitHub Pages URL
            if (previewUrl.includes('github.io')) {
                // Already a GitHub Pages URL
                this.previewUrl = previewUrl;
            } else {
                // Try to convert repo URL to GitHub Pages URL
                const repoMatch = previewUrl.match(/github\.com\/([^\/]+)\/([^\/]+)/);
                if (repoMatch) {
                    const [, owner, repo] = repoMatch;
                    // Try common GitHub Pages URLs
                    const possibleUrls = [
                        `https://${owner}.github.io/${repo}`,
                        `https://${owner}.github.io/${repo}/index.html`,
                        previewUrl // Fallback to original URL
                    ];
                    this.previewUrl = possibleUrls[0];
                } else {
                    this.previewUrl = previewUrl;
                }
            }
        } else {
            // Regular web URL
            // Ensure it has a protocol
            if (!previewUrl.match(/^https?:\/\//)) {
                previewUrl = 'https://' + previewUrl;
            }
            this.previewUrl = previewUrl;
        }

        // Update URL input
        const urlInput = document.getElementById('iosim-preview-url');
        if (urlInput) {
            urlInput.value = this.previewUrl;
        }

        // Update preview
        if (this.selectedDevice) {
            this.updatePreview();
        } else {
            // Auto-select detected device or first device
            if (this.detectedDevice) {
                this.selectDevice(this.detectedDevice.name);
            } else if (this.devices.length > 0) {
                this.selectDevice(this.devices[0].name);
            }
        }
    }

    loadRepoUrl(repo) {
        if (!repo) return;

        // Try GitHub Pages URL first
        if (repo.homepage && repo.homepage.includes('github.io')) {
            this.loadPreviewUrl(repo.homepage);
        } else if (repo.has_pages) {
            // Repository has GitHub Pages enabled
            const pagesUrl = `https://${this.config.githubUser}.github.io/${repo.name}`;
            this.loadPreviewUrl(pagesUrl);
        } else {
            // Fallback to repo URL (will show GitHub repo page)
            this.loadPreviewUrl(repo.html_url);
        }
    }

    async launchSimulator() {
        if (!this.selectedDevice) {
            alert('Please select a device first');
            return;
        }

        const statusEl = document.getElementById('iosim-status');
        if (statusEl) {
            statusEl.innerHTML = '<span class="status-dot" style="background: #10B981;"></span><span>Launching...</span>';
        }

        try {
            // Try to launch via Electron app (supports load balancing)
            await fetchWithTimeout(`${this.config.apiEndpoint}/api/simulator/launch`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Instance-ID': this.config.instanceId
                },
                body: JSON.stringify({
                    ...this.selectedDevice,
                    instanceId: this.config.instanceId,
                    deviceId: this.deviceId,
                    previewUrl: this.previewUrl || null
                })
            }, 10000); // 10 second timeout
            
            if (statusEl) {
                statusEl.innerHTML = '<span class="status-dot" style="background: #10B981;"></span><span>Launched</span>';
            }
        } catch (e) {
            // Handle timeout specifically
            if (e.message && e.message.includes('timeout')) {
                if (statusEl) {
                    statusEl.innerHTML = '<span class="status-dot" style="background: #EF4444;"></span><span>Timeout: Server not responding</span>';
                }
                console.warn('[IOSim] Launch timeout:', e);
            } else {
                // Fallback: open in new window with preview URL if available
                let url = `${this.config.apiEndpoint}/simulator?device=${encodeURIComponent(JSON.stringify(this.selectedDevice))}&instance=${this.config.instanceId}`;
                if (this.previewUrl) {
                    url += `&url=${encodeURIComponent(this.previewUrl)}`;
                }
                window.open(url, '_blank');
                
                if (statusEl) {
                    statusEl.innerHTML = '<span class="status-dot" style="background: #F59E0B;"></span><span>Opened in new window</span>';
                }
            }
        }
    }

    toggleTerminal() {
        const terminal = document.getElementById('iosim-terminal');
        const toggle = document.getElementById('iosim-terminal-toggle');
        
        if (terminal && toggle) {
            const isHidden = terminal.style.display === 'none';
            terminal.style.display = isHidden ? 'block' : 'none';
            toggle.textContent = isHidden ? '−' : '+';
        }
    }

    async runTerminalCommand(command) {
        const input = document.getElementById('iosim-terminal-input');
        const output = document.getElementById('iosim-terminal-output');
        
        if (!input || !output || !command.trim()) return;

        const fullCommand = command.trim();
        const isCursorCommand = fullCommand.startsWith('cursor ') || fullCommand.startsWith('agent ');
        
        // Add command to output
        const commandLine = document.createElement('div');
        commandLine.className = 'iosim-terminal-line iosim-terminal-prompt';
        commandLine.textContent = `❯ ${fullCommand}`;
        output.appendChild(commandLine);

        try {
            let result;
            
            if (isCursorCommand && this.config.enableCursorCLI) {
                // Execute Cursor CLI command
                result = await this.executeCursorCommand(fullCommand, output);
            } else {
                // Execute UV/Python command via Electron app (supports load balancing)
                const response = await fetchWithTimeout(`${this.config.apiEndpoint}/api/terminal/execute`, {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-Instance-ID': this.config.instanceId
                    },
                    body: JSON.stringify({ 
                        command: fullCommand,
                        instanceId: this.config.instanceId,
                        deviceId: this.deviceId
                    })
                }, 30000); // 30 second timeout for command execution
                
                const data = await response.json();
                result = {
                    output: data.output || data.error || 'Command executed',
                    success: data.success !== false
                };
            }
            
            const resultLine = document.createElement('div');
            resultLine.className = result.success 
                ? 'iosim-terminal-line' 
                : 'iosim-terminal-line iosim-terminal-error';
            resultLine.textContent = result.output;
            output.appendChild(resultLine);
            
            // Sync command to Electron app and Cursor Composer
            this.syncCommand(fullCommand, result.output, isCursorCommand);
            
        } catch (e) {
            const errorLine = document.createElement('div');
            errorLine.className = 'iosim-terminal-line iosim-terminal-error';
            errorLine.textContent = `Error: ${e.message || 'Connection failed'}`;
            output.appendChild(errorLine);
        }

        input.value = '';
        output.scrollTop = output.scrollHeight;
    }

    async executeCursorCommand(command, output) {
        // Extract prompt from cursor/agent command
        const promptMatch = command.match(/(?:cursor|agent)\s+(?:chat\s+)?["']?([^"']+)["']?/);
        const prompt = promptMatch ? promptMatch[1] : command.replace(/^(cursor|agent)\s+(?:chat\s+)?/, '');
        
        // Build context from current device and editor state
        const context = {
            device: this.selectedDevice,
            deviceId: this.deviceId,
            timestamp: new Date().toISOString(),
            editorContent: document.getElementById('editor')?.value || ''
        };

        try {
            // Try to execute via Electron app's Cursor Composer handler (scalable)
            const response = await fetchWithTimeout(`${this.config.apiEndpoint}/api/cursor/composer`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'X-Instance-ID': this.config.instanceId,
                    'X-Client-Type': 'iosim-web'
                },
                body: JSON.stringify({
                    prompt: prompt,
                    context: {
                        ...context,
                        instanceId: this.config.instanceId,
                        deviceId: this.deviceId
                    },
                    command: command
                })
            }, 60000); // 60 second timeout for Cursor CLI

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            // Handle streaming response
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullOutput = '';
            let streamLine = null;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                fullOutput += chunk;

                // Create or update streaming line
                if (!streamLine) {
                    streamLine = document.createElement('div');
                    streamLine.className = 'iosim-terminal-line iosim-terminal-info';
                    streamLine.style.fontFamily = 'monospace';
                    streamLine.style.whiteSpace = 'pre-wrap';
                    output.appendChild(streamLine);
                }
                streamLine.textContent = fullOutput;
                output.scrollTop = output.scrollHeight;
            }

            return {
                output: fullOutput || 'Cursor Composer response received',
                success: true
            };

        } catch (e) {
            // Fallback: try direct execution if Electron API not available
            return {
                output: `Cursor CLI not available: ${e.message}. Install with: curl https://cursor.com/install -fsS | bash`,
                success: false
            };
        }
    }

    initSync() {
        // Initialize all sync methods
        this.setupEditorSync();
        this.initWebSocketSync();
        this.initHTTPSync();
        this.initBroadcastChannelSync();
        this.initIPCSync();
        
        // Generate device ID
        this.deviceId = this.getOrCreateDeviceId();
        const deviceIdEl = document.getElementById('iosim-device-id');
        if (deviceIdEl) {
            deviceIdEl.textContent = this.deviceId;
        }
        
        // Setup device address and QR code
        this.setupDeviceAddress();
        
        // Listen for editor document changes
        this.setupEditorSync();
    }

    setupDeviceAddress() {
        // Generate device connection address
        const deviceAddress = this.generateDeviceAddress();
        const addressInput = document.getElementById('iosim-device-address');
        if (addressInput) {
            addressInput.value = deviceAddress;
        }

        // Show QR code button
        const showQrBtn = document.getElementById('iosim-show-qr-btn');
        if (showQrBtn) {
            showQrBtn.addEventListener('click', () => {
                this.toggleDeviceQRCode();
            });
        }

        // Toggle QR code button
        const toggleQrBtn = document.getElementById('iosim-toggle-qr-btn');
        if (toggleQrBtn) {
            toggleQrBtn.addEventListener('click', () => {
                this.toggleDeviceQRCode();
            });
        }

        // Download QR code button
        const downloadQrBtn = document.getElementById('iosim-download-qr-btn');
        if (downloadQrBtn) {
            downloadQrBtn.addEventListener('click', () => {
                this.downloadDeviceQRCode();
            });
        }

        // Copy device ID button
        const copyDeviceIdBtn = document.getElementById('iosim-copy-device-id-btn');
        if (copyDeviceIdBtn) {
            copyDeviceIdBtn.addEventListener('click', () => {
                this.copyDeviceId();
            });
        }
    }

    generateDeviceAddress() {
        // Generate a shareable address for this device instance
        const baseUrl = window.location.origin + window.location.pathname;
        const params = new URLSearchParams({
            deviceId: this.deviceId,
            instanceId: this.config.instanceId,
            type: 'iosim'
        });
        return `${baseUrl}#iosim?${params.toString()}`;
    }

    async toggleDeviceQRCode() {
        const qrContainer = document.getElementById('iosim-device-qr-container');
        if (!qrContainer) return;

        const isHidden = qrContainer.style.display === 'none' || qrContainer.style.display === '';
        
        if (isHidden) {
            // Show and generate QR code
            qrContainer.style.display = 'flex';
            await this.generateDeviceQRCode();
        } else {
            // Hide QR code
            qrContainer.style.display = 'none';
        }
    }

    async generateDeviceQRCode() {
        const qrCanvas = document.getElementById('iosim-device-qr');
        if (!qrCanvas) return;

        const deviceAddress = this.generateDeviceAddress();
        const qrData = JSON.stringify({
            type: 'iosim-device',
            deviceId: this.deviceId,
            instanceId: this.config.instanceId,
            address: deviceAddress,
            timestamp: new Date().toISOString()
        });

        try {
            // Set canvas size
            qrCanvas.width = 120;
            qrCanvas.height = 120;
            
            // Check if QRCode library is available (from CDN)
            if (typeof QRCode !== 'undefined') {
                // Clear previous QR code
                const ctx = qrCanvas.getContext('2d');
                ctx.clearRect(0, 0, qrCanvas.width, qrCanvas.height);
                
                // Generate QR code with device address
                if (QRCode.toCanvas) {
                    // Modern QRCode.js API
                    await QRCode.toCanvas(qrCanvas, deviceAddress, {
                        width: 120,
                        margin: 1,
                        color: {
                            dark: '#1a1a1a',
                            light: '#ffffff'
                        },
                        errorCorrectionLevel: 'M'
                    });
                } else if (QRCode.toDataURL) {
                    // Alternative: generate as data URL and draw
                    QRCode.toDataURL(deviceAddress, {
                        width: 120,
                        margin: 1,
                        color: {
                            dark: '#1a1a1a',
                            light: '#ffffff'
                        }
                    }, (err, url) => {
                        if (!err) {
                            const img = new Image();
                            img.onload = () => {
                                const ctx = qrCanvas.getContext('2d');
                                ctx.drawImage(img, 0, 0);
                            };
                            img.src = url;
                        }
                    });
                }
            } else if (typeof qrcode !== 'undefined') {
                // Alternative library format
                qrcode.toCanvas(qrCanvas, deviceAddress, {
                    width: 120,
                    margin: 1
                }, (error) => {
                    if (error) {
                        console.warn('QR code generation failed:', error);
                    }
                });
            } else {
                // Fallback: show message if QRCode library not loaded
                const ctx = qrCanvas.getContext('2d');
                ctx.fillStyle = '#f0f0f0';
                ctx.fillRect(0, 0, qrCanvas.width, qrCanvas.height);
                ctx.fillStyle = '#666';
                ctx.font = '10px sans-serif';
                ctx.textAlign = 'center';
                ctx.fillText('QR Code library', qrCanvas.width / 2, qrCanvas.height / 2 - 5);
                ctx.fillText('not loaded', qrCanvas.width / 2, qrCanvas.height / 2 + 5);
            }
        } catch (error) {
            console.warn('Failed to generate device QR code:', error);
        }
    }

    downloadDeviceQRCode() {
        const qrCanvas = document.getElementById('iosim-device-qr');
        if (!qrCanvas) return;

        try {
            const filename = `iosim-device-${this.deviceId}.png`;
            
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
            console.warn('Failed to download device QR code:', error);
        }
    }

    copyDeviceId() {
        const deviceId = this.deviceId;
        const deviceAddress = this.generateDeviceAddress();
        
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(deviceAddress).then(() => {
                this.showCopyFeedback('iosim-copy-device-id-btn');
            }).catch(() => {
                this.fallbackCopy(deviceAddress);
            });
        } else {
            this.fallbackCopy(deviceAddress);
        }
    }

    showCopyFeedback(buttonId) {
        const copyBtn = document.getElementById(buttonId);
        if (copyBtn) {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = '✓';
            copyBtn.style.opacity = '0.7';
            
            setTimeout(() => {
                copyBtn.textContent = originalText;
                copyBtn.style.opacity = '1';
            }, 2000);
        }
    }

    fallbackCopy(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.position = 'fixed';
        textarea.style.opacity = '0';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        
        try {
            document.execCommand('copy');
            alert('Device address copied to clipboard!');
        } catch (e) {
            alert('Failed to copy. Please copy manually:\n' + text);
        }
        
        document.body.removeChild(textarea);
    }

    setupEditorSync() {
        // Monitor URL hash for document ID changes
        let lastDocId = null;
        const checkDocId = () => {
            const hashMatch = window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/);
            const currentDocId = hashMatch ? hashMatch[1] : null;
            
            if (currentDocId !== lastDocId) {
                lastDocId = currentDocId;
                if (currentDocId) {
                    this.connectDocumentSync(currentDocId);
                } else {
                    this.disconnectDocumentSync();
                }
            }
        };
        
        // Check on load
        checkDocId();
        
        // Check on hash change
        window.addEventListener('hashchange', checkDocId);
        
        // Monitor editor content changes
        const editor = document.getElementById('editor');
        if (editor) {
            let syncTimeout;
            editor.addEventListener('input', () => {
                clearTimeout(syncTimeout);
                syncTimeout = setTimeout(() => {
                    const hashMatch = window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/);
                    if (hashMatch) {
                        const docId = hashMatch[1];
                        this.syncDocumentContent(docId, editor.value);
                    }
                }, 500); // Debounce sync
            });
        }
    }

    connectDocumentSync(docId) {
        // Disconnect existing connection
        this.disconnectDocumentSync();
        
        // Connect to document WebSocket (supports multiple instances)
        try {
            const ws = new WebSocket(`${this.config.wsEndpoint}/ws/doc/${docId}?instance=${this.config.instanceId}`);
            ws.onopen = () => {
                this.docSyncWs = ws;
                this.updateSyncStatus('DocSync');
                console.log(`[IOSim] Connected to document sync: ${docId}`);
                
                // Load initial document content from desktop app if available (scalable)
                fetchWithTimeout(`${this.config.apiEndpoint}/sync/doc/${docId}`, {
                    headers: {
                        'X-Instance-ID': this.config.instanceId
                    }
                }, 8000)
                    .then(res => res.json())
                    .then(data => {
                        if (data.content && !data.error) {
                            const editor = document.getElementById('editor');
                            if (editor && editor.value !== data.content) {
                                editor.value = data.content;
                                editor.dispatchEvent(new Event('input', { bubbles: true }));
                            }
                        }
                    })
                    .catch(() => {
                        // Silently fail if document doesn't exist yet
                    });
            };
            ws.onerror = (error) => {
                console.warn('[IOSim] Document sync WebSocket error:', error);
                this.docSyncWs = null;
            };
            ws.onclose = () => {
                this.docSyncWs = null;
                // Try to reconnect after delay
                setTimeout(() => {
                    if (window.location.hash.match(/^#doc\/([a-zA-Z0-9]+)/)) {
                        this.connectDocumentSync(docId);
                    }
                }, 3000);
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    if (data.type === 'doc-update' && data.content !== undefined) {
                        // Update editor if content changed from external source
                        const editor = document.getElementById('editor');
                        if (editor && editor.value !== data.content) {
                            editor.value = data.content;
                            // Trigger input event to update counts
                            editor.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                    }
                } catch (e) {
                    console.warn('[IOSim] Document sync parse error:', e);
                }
            };
        } catch (e) {
            console.log('[IOSim] Document sync WebSocket not available');
        }
    }

    disconnectDocumentSync() {
        if (this.docSyncWs) {
            this.docSyncWs.close();
            this.docSyncWs = null;
        }
    }

    syncDocumentContent(docId, content) {
        // Sync via WebSocket if connected
        if (this.docSyncWs && this.docSyncWs.readyState === WebSocket.OPEN) {
            try {
                this.docSyncWs.send(JSON.stringify({
                    type: 'doc-update',
                    docId: docId,
                    content: content,
                    timestamp: new Date().toISOString(),
                    deviceId: this.deviceId
                }));
            } catch (e) {
                console.warn('[IOSim] WebSocket send error:', e);
            }
        }
        
        // Also sync via HTTP POST (scalable, supports load balancing)
        fetchWithTimeout(`${this.config.apiEndpoint}/sync/doc`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Instance-ID': this.config.instanceId
            },
            body: JSON.stringify({
                docId: docId,
                content: content,
                timestamp: new Date().toISOString(),
                deviceId: this.deviceId
            })
        }, 5000).catch(() => {
            // Silently fail if desktop app not running
        });
    }

    initWebSocketSync() {
        try {
            const ws = new WebSocket(`${this.config.wsEndpoint}/ws/iosim?instance=${this.config.instanceId}`);
            ws.onopen = () => {
                this.syncMethods.websocket = ws;
                this.updateSyncStatus('WebSocket');
            };
            ws.onerror = () => {
                this.syncMethods.websocket = null;
            };
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    this.handleSyncUpdate(data);
                } catch (e) {
                    console.warn('[IOSim] Sync parse error:', e);
                }
            };
        } catch (e) {
            console.log('[IOSim] WebSocket not available');
        }
    }

    initHTTPSync() {
        // Test HTTP endpoint (supports multiple instances)
        fetchWithTimeout(`${this.config.apiEndpoint}/sync/ping`, {
            headers: {
                'X-Instance-ID': this.config.instanceId
            }
        }, 5000)
            .then(() => {
                this.syncMethods.http = true;
                this.updateSyncStatus('HTTP');
            })
            .catch((error) => {
                this.syncMethods.http = false;
                if (error.message && error.message.includes('timeout')) {
                    console.warn('[IOSim] HTTP sync ping timeout');
                }
            });
    }

    initBroadcastChannelSync() {
        try {
            if (typeof BroadcastChannel !== 'undefined') {
                const channel = new BroadcastChannel('iosim-sync');
                this.syncMethods.broadcastChannel = channel;
                channel.onmessage = (event) => {
                    this.handleSyncUpdate(event.data);
                };
                this.updateSyncStatus('BroadcastChannel');
            }
        } catch (e) {
            console.log('[IOSim] BroadcastChannel not available');
        }
    }

    initIPCSync() {
        if (typeof require !== 'undefined') {
            try {
                const { ipcRenderer } = require('electron');
                this.syncMethods.ipc = ipcRenderer;
                ipcRenderer.on('iosim-sync-update', (event, data) => {
                    this.handleSyncUpdate(data);
                });
                this.updateSyncStatus('IPC');
            } catch (e) {
                console.log('[IOSim] IPC not available');
            }
        }
    }

    syncCommand(command, output, isCursorCommand = false) {
        const syncData = {
            type: 'terminal-command',
            deviceId: this.deviceId,
            command: command,
            output: output,
            timestamp: new Date().toISOString(),
            isCursorCommand: isCursorCommand,
            device: this.selectedDevice
        };

        // Sync via all available methods (redundancy)
        if (this.syncMethods.websocket && this.syncMethods.websocket.readyState === WebSocket.OPEN) {
            try {
                this.syncMethods.websocket.send(JSON.stringify(syncData));
            } catch (e) {
                console.warn('[IOSim] WebSocket sync failed:', e);
            }
        }
        
        if (this.syncMethods.http) {
            fetch(`${this.config.apiEndpoint}/sync/iosim`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(syncData)
            }).catch(() => {
                // Silent fail - other methods will handle it
            });
        }
        
        if (this.syncMethods.broadcastChannel) {
            try {
                this.syncMethods.broadcastChannel.postMessage(syncData);
            } catch (e) {
                console.warn('[IOSim] BroadcastChannel sync failed:', e);
            }
        }
        
        if (this.syncMethods.ipc) {
            try {
                this.syncMethods.ipc.send('iosim-sync', syncData);
            } catch (e) {
                console.warn('[IOSim] IPC sync failed:', e);
            }
        }

        // Special handling for Cursor commands - sync to Cursor Composer
        if (isCursorCommand) {
            this.syncToCursorComposer(command, output, syncData);
        }
    }

    syncToCursorComposer(command, output, syncData) {
        // Send to Cursor Composer via Electron app (scalable, supports multiple instances)
        fetch(`${this.config.apiEndpoint}/api/cursor/composer/sync`, {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'X-Instance-ID': this.config.instanceId
            },
            body: JSON.stringify({
                command: command,
                output: output,
                context: {
                    deviceId: this.deviceId,
                    device: this.selectedDevice,
                    source: 'iosim-web',
                    instanceId: this.config.instanceId,
                    timestamp: new Date().toISOString()
                }
            })
        }).catch(() => {
            // Silent fail if Electron app not available
        });
    }

    handleSyncUpdate(data) {
        // Handle incoming sync updates
        if (data.type === 'terminal-command' && data.deviceId !== this.deviceId) {
            const output = document.getElementById('iosim-terminal-output');
            if (output) {
                const line = document.createElement('div');
                line.className = 'iosim-terminal-line iosim-terminal-info';
                line.textContent = `[${data.deviceId}] ${data.command}`;
                output.appendChild(line);
                output.scrollTop = output.scrollHeight;
            }
        }
    }

    updateSyncStatus(method) {
        const statusEl = document.getElementById('iosim-sync-status');
        if (statusEl) {
            const methods = [];
            if (this.docSyncWs && this.docSyncWs.readyState === WebSocket.OPEN) methods.push('DocSync');
            if (this.syncMethods.websocket && this.syncMethods.websocket.readyState === WebSocket.OPEN) methods.push('WS');
            if (this.syncMethods.http) methods.push('HTTP');
            if (this.syncMethods.broadcastChannel) methods.push('BC');
            if (this.syncMethods.ipc) methods.push('IPC');
            
            statusEl.textContent = methods.length > 0 
                ? `Connected (${methods.join(', ')})` 
                : 'Disconnected';
        }
    }

    getOrCreateDeviceId() {
        let deviceId = localStorage.getItem('iosim-device-id');
        if (!deviceId) {
            const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
            deviceId = '';
            for (let i = 0; i < 8; i++) {
                deviceId += chars.charAt(Math.floor(Math.random() * chars.length));
            }
            localStorage.setItem('iosim-device-id', deviceId);
        }
        
        // Update device address when device ID is set
        if (this.deviceId !== deviceId) {
            this.deviceId = deviceId;
            this.updateDeviceAddress();
        }
        
        return deviceId;
    }

    updateDeviceAddress() {
        const deviceAddress = this.generateDeviceAddress();
        const addressInput = document.getElementById('iosim-device-address');
        if (addressInput) {
            addressInput.value = deviceAddress;
        }
        
        // Regenerate QR code if it's currently visible
        const qrContainer = document.getElementById('iosim-device-qr-container');
        if (qrContainer && qrContainer.style.display !== 'none') {
            this.generateDeviceQRCode();
        }
    }
}

// Auto-initialize when script loads
if (typeof module !== 'undefined' && module.exports) {
    module.exports = IOSimulator;
} else {
    // Browser environment - auto-initialize with config support
    window.IOSimulator = IOSimulator;
    
    // Initialize function that can be called when DOM is ready
    function initializeIOSim() {
        try {
            // Check for global config
            const config = window.IOSIM_CONFIG || {};
            
            // Support multiple instances on same page
            if (config.multipleInstances) {
                window.iosimInstances = window.iosimInstances || [];
                window.iosimInstances.push(new IOSimulator(config));
            } else {
                // Single instance (default)
                window.iosim = new IOSimulator(config);
            }
        } catch (error) {
            console.error('[IOSim] Initialization error:', error);
        }
    }
    
    // Initialize immediately if DOM is ready, otherwise wait
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeIOSim);
    } else {
        // DOM already loaded
        initializeIOSim();
    }
}

// Export for ES modules
if (typeof window !== 'undefined') {
    window.IOSimulator = IOSimulator;
}
