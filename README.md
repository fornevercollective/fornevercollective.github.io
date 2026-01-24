# fornever

A minimalist landing page with text editing, news aggregation, social feeds, maps, and iOS simulator integration.

## Features

- **Simple Text Editor** - Clean, distraction-free text editing with format detection
- **Auto-save** - Content automatically saved to localStorage and URL hash
- **URL Sharing** - Share your notes via URL hash (compressed) with QR codes
- **Format Support** - JSON, Markdown, YAML, Python, JavaScript, TypeScript, HTML, CSS, XML, Hex, Binary, and more
- **Live Format Detection** - Detects format from content, URLs, IP:port, and data sources
- **News Aggregator** - Live feed from major news agencies with bias detection
- **Social Aggregator** - Curatable feeds from Twitter, TikTok, Instagram, Reddit, YouTube
- **Custom Search** - AI, Web, Code, and Semantic search capabilities
- **Map Viewer** - Interactive maps with multiple providers
- **iOS Simulator** - Device simulation with UV terminal and Cursor CLI integration
- **Real-time Sync** - Multi-method sync (WebSocket, HTTP, BroadcastChannel, IPC)
- **Dark Mode** - Automatically adapts to system preferences
- **Mobile Friendly** - Responsive design for all devices

## Quick Start

### Using UV (Recommended)

```bash
# Install UV if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Start development server
make serve
# or
uv run python scripts/server.py
```

### Using Python

```bash
# Start server
python3 scripts/server.py
```

### Using Node.js

```bash
# Start server
node scripts/server.js
```

### Using Make

```bash
# Install and serve
make install
make serve

# Build deployment package
make build
make deploy

# Quick UV deployment
make uv-deploy
```

## Project Structure

```
fornevercollective/
├── src/
│   ├── static/          # JavaScript and CSS files
│   │   ├── editor.js
│   │   ├── news-aggregator.js
│   │   ├── social-aggregator.js
│   │   ├── custom-search.js
│   │   ├── map-viewer.js
│   │   ├── iosim.js
│   │   └── style.css
│   └── templates/       # HTML templates
│       └── index.html
├── scripts/             # Server scripts
│   ├── server.py
│   ├── server.js
│   └── start.sh
├── deploy/              # Deployment scripts and packages
│   ├── deploy.sh
│   └── uv-deploy.sh
├── pyproject.toml       # UV/Python project configuration
├── Makefile            # Build and deployment commands
└── README.md
```

## Deployment

### Quick Deploy with UV

```bash
make uv-deploy
```

### Manual Deployment

```bash
# Build deployment package
make build

# Deploy package
cd deploy/dist
python3 server.py
```

### Production Deployment

1. Build the project: `make build`
2. Copy `deploy/dist/` to your server
3. Install dependencies: `uv sync` (if using UV)
4. Start server: `python3 server.py` or `node server.js`
5. Configure reverse proxy (nginx/Apache) if needed

## Configuration

### Environment Variables

- `PORT` - Server port (default: 8000)
- `IOSIM_PORT` - iOS simulator server port (default: 8080)
- `IOSIM_HOST` - iOS simulator server host (default: localhost)

### UV Configuration

The project uses UV for dependency management. Configuration is in `pyproject.toml`.

```bash
# Sync dependencies
uv sync

# Add development dependencies
uv add --dev pytest black ruff

# Run with UV
uv run python scripts/server.py
```

## Development

### Format Code

```bash
make format
```

### Lint Code

```bash
make lint
```

### Run Tests

```bash
make test
```

### Clean Build Artifacts

```bash
make clean
```

## API Endpoints (for iOS Simulator)

- `GET /api/devices` - Get device list
- `POST /api/simulator/launch` - Launch simulator
- `POST /api/terminal/execute` - Execute commands
- `POST /api/cursor/composer` - Cursor CLI execution
- `POST /api/cursor/composer/sync` - Sync Cursor commands
- `POST /api/instances/register` - Instance registration
- `GET /api/instances` - List active instances
- `GET /sync/ping` - Health check
- `POST /sync/doc` - Document sync
- `GET /sync/doc/{docId}` - Get document
- `WS /ws/doc/{docId}` - WebSocket document sync

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers

## License

MIT

## Inspired By

- [notes.kognise.dev](https://notes.kognise.dev) - Realtime notetaking
- [textarea.my](https://textarea.my) - Minimalist editor with URL storage
- [hexed.it](https://hexed.it) - Browser-based hex editing
