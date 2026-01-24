#!/usr/bin/env python3
"""
Simple HTTP server for fornevercollective
Serves the static files on localhost:8000
"""

import http.server
import socketserver
import webbrowser
import os
import sys
from pathlib import Path

PORT = int(os.environ.get('PORT', os.environ.get('UV_PORT', 8000)))
BASE_DIR = Path(__file__).parent.parent

class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(BASE_DIR), **kwargs)
    
    def end_headers(self):
        # Add CORS headers
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        super().end_headers()
    
    def translate_path(self, path):
        # Parse the URL path
        url_path = self.path.split('?')[0]  # Remove query string
        
        # Handle root and empty paths
        if url_path == '/' or url_path == '':
            return str(BASE_DIR / 'src' / 'templates' / 'index.html')
        
        # Handle /static/ requests
        if url_path.startswith('/static/'):
            filename = url_path[8:]  # Remove '/static/' prefix
            static_file = BASE_DIR / 'src' / 'static' / filename
            if static_file.exists() and static_file.is_file():
                return str(static_file)
            # If not found, fall through to return index.html
        
        # Handle direct file requests (for backwards compatibility)
        if url_path.startswith('/'):
            filename = url_path[1:]  # Remove leading '/'
            # Try static files first
            static_file = BASE_DIR / 'src' / 'static' / filename
            if static_file.exists() and static_file.is_file():
                return str(static_file)
            # Try templates
            template_file = BASE_DIR / 'src' / 'templates' / filename
            if template_file.exists() and template_file.is_file():
                return str(template_file)
        
        # Default: serve index.html for SPA routing
        return str(BASE_DIR / 'src' / 'templates' / 'index.html')
    
    def do_GET(self):
        """Handle GET requests with proper error handling"""
        try:
            f = self.send_head()
            if f:
                try:
                    self.copyfile(f, self.wfile)
                finally:
                    f.close()
        except BrokenPipeError:
            # Client disconnected, ignore
            pass
        except Exception as e:
            # If file not found and not a static file, serve index.html for SPA routing
            if not self.path.startswith('/static/'):
                try:
                    index_path = BASE_DIR / 'src' / 'templates' / 'index.html'
                    if index_path.exists():
                        self.path = '/'
                        f = self.send_head()
                        if f:
                            try:
                                self.copyfile(f, self.wfile)
                            finally:
                                f.close()
                            return
                except:
                    pass
            self.send_error(404, f"File not found: {self.path}")

def main():
    try:
        with socketserver.TCPServer(("", PORT), Handler) as httpd:
            url = f"http://localhost:{PORT}"
            print(f"🚀 Server starting at {url}")
            print(f"📁 Serving directory: {BASE_DIR}")
            print(f"🛑 Press Ctrl+C to stop the server")
            print()
            
            # Open browser automatically
            try:
                webbrowser.open(url)
            except:
                pass
            
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        sys.exit(0)
    except OSError as e:
        if e.errno == 48:  # Address already in use
            print(f"❌ Port {PORT} is already in use")
            print(f"💡 Try: lsof -ti:{PORT} | xargs kill")
            sys.exit(1)
        else:
            raise

if __name__ == "__main__":
    main()
