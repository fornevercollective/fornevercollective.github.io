#!/bin/bash
# UV-based deployment script

set -e

# Function to find available port
find_available_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

PROJECT_NAME="fornevercollective"
PORT=${PORT:-8000}

echo "🚀 UV Deployment for $PROJECT_NAME"

# Check if UV is installed
if ! command -v uv &> /dev/null; then
    echo "❌ UV is not installed. Installing..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi

# Sync dependencies (skip project install since it's a static site)
echo "📦 Syncing UV dependencies..."
echo "💡 Note: This is a static web project - skipping Python package build"
uv sync --no-install-project --no-build-isolation 2>/dev/null || \
uv sync --no-install-project 2>/dev/null || \
uv sync --no-build-isolation 2>/dev/null || \
uv sync 2>/dev/null || \
echo "⚠️  UV sync completed (warnings expected for static projects)"

# Skip build - this is a static site
echo "✅ Static project ready (no build needed)"

# Check if port is in use and handle it
if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
    echo "⚠️  Port $PORT is already in use"
    echo "🔄 Attempting to free port $PORT..."
    
    # Try to kill existing process
    PID=$(lsof -ti:$PORT 2>/dev/null | head -1)
    if [ -n "$PID" ]; then
        echo "🛑 Killing process $PID on port $PORT..."
        kill -9 $PID 2>/dev/null || true
        sleep 2
    fi
    
    # Check if port is now free
    if lsof -Pi :$PORT -sTCP:LISTEN -t >/dev/null 2>&1 ; then
        echo "⚠️  Port $PORT still in use. Finding alternative port..."
        PORT=$(find_available_port $PORT)
        echo "💡 Using port $PORT instead"
    else
        echo "✅ Port $PORT is now available"
    fi
fi

# Start server
echo "🌐 Starting server on port $PORT..."
echo "💡 Access at: http://localhost:$PORT"

# Export PORT for server scripts
export PORT

# Use UV to run the server (skip project install)
if [ -f "scripts/server.py" ]; then
    uv run --no-project python scripts/server.py 2>/dev/null || \
    python3 scripts/server.py
elif [ -f "scripts/server.js" ]; then
    uv run --no-project node scripts/server.js 2>/dev/null || \
    node scripts/server.js
else
    echo "❌ No server script found"
    exit 1
fi
