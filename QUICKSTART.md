# Quick Start Guide

## Installation

### Using UV (Recommended)

```bash
# Install UV if not already installed
curl -LsSf https://astral.sh/uv/install.sh | sh

# Install dependencies
uv sync

# Start server
make serve
```

### Using Make

```bash
# Install and start
make install
make serve
```

### Manual Start

```bash
# Python
python3 scripts/server.py

# Node.js
node scripts/server.js

# Or use the start script
./scripts/start.sh
```

## Quick Deploy

### UV Deployment

```bash
make uv-deploy
```

### Build and Deploy

```bash
# Build deployment package
make build

# Deploy
make deploy
```

## Project Structure

```
fornevercollective/
├── src/
│   ├── static/          # JS and CSS files
│   └── templates/       # HTML templates
├── scripts/             # Server scripts
├── deploy/              # Deployment scripts
├── pyproject.toml       # UV configuration
└── Makefile            # Build commands
```

## Environment Variables

- `PORT` - Server port (default: 8000)

## Access

Once started, open: http://localhost:8000
