#!/usr/bin/env node
/**
 * Simple HTTP server for fornevercollective
 * Serves the static files on localhost:8000
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

const PORT = process.env.PORT || process.env.UV_PORT || 8000;
const BASE_DIR = path.join(__dirname, '..');

const MIME_TYPES = {
    '.html': 'text/html',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
    // Add CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    // Parse URL (remove query string)
    const urlPath = req.url.split('?')[0];
    let filePath;
    
    // Map root to index.html
    if (urlPath === '/' || urlPath === '') {
        filePath = path.join(BASE_DIR, 'src', 'templates', 'index.html');
    }
    // Map /static/ to src/static/
    else if (urlPath.startsWith('/static/')) {
        const filename = urlPath.substring(8); // Remove '/static/' prefix
        filePath = path.join(BASE_DIR, 'src', 'static', filename);
    }
    // Try static files first (for backwards compatibility)
    else {
        const filename = urlPath.startsWith('/') ? urlPath.substring(1) : urlPath;
        const staticPath = path.join(BASE_DIR, 'src', 'static', filename);
        const templatePath = path.join(BASE_DIR, 'src', 'templates', filename);
        
        if (fs.existsSync(staticPath) && fs.statSync(staticPath).isFile()) {
            filePath = staticPath;
        } else if (fs.existsSync(templatePath) && fs.statSync(templatePath).isFile()) {
            filePath = templatePath;
        } else {
            // Default to index.html for SPA routing
            filePath = path.join(BASE_DIR, 'src', 'templates', 'index.html');
        }
    }

    const extname = String(path.extname(filePath)).toLowerCase();
    const contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                // For SPA routing, serve index.html for 404s
                const indexPath = path.join(BASE_DIR, 'src', 'templates', 'index.html');
                fs.readFile(indexPath, (indexError, indexContent) => {
                    if (indexError) {
                        res.writeHead(404, { 'Content-Type': 'text/html' });
                        res.end('<h1>404 - File Not Found</h1>', 'utf-8');
                    } else {
                        res.writeHead(200, { 'Content-Type': 'text/html' });
                        res.end(indexContent, 'utf-8');
                    }
                });
            } else {
                res.writeHead(500);
                res.end(`Server Error: ${error.code}`, 'utf-8');
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    const url = `http://localhost:${PORT}`;
    console.log(`🚀 Server starting at ${url}`);
    console.log(`📁 Serving directory: ${BASE_DIR}`);
    console.log(`🛑 Press Ctrl+C to stop the server`);
    console.log();

    // Open browser automatically (platform-specific)
    const command = process.platform === 'win32' 
        ? `start ${url}`
        : process.platform === 'darwin' 
        ? `open ${url}`
        : `xdg-open ${url}`;
    
    exec(command, (error) => {
        if (error) {
            console.log(`💡 Open ${url} in your browser`);
        }
    });
});

process.on('SIGINT', () => {
    console.log('\n🛑 Server stopped');
    process.exit(0);
});
