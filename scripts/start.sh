#!/bin/bash
# Start local server for fornevercollective

PORT=${PORT:-8000}

# Function to find available port
find_available_port() {
    local port=$1
    while lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; do
        port=$((port + 1))
    done
    echo $port
}

# Check if port is already in use
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

export PORT

# Check for Python 3
if command -v python3 &> /dev/null; then
    echo "🐍 Starting Python HTTP server on port $PORT..."
    python3 "$(dirname "$0")/server.py"
# Check for Node.js
elif command -v node &> /dev/null; then
    echo "📦 Starting Node.js HTTP server on port $PORT..."
    node "$(dirname "$0")/server.js"
# Fallback to Python 2
elif command -v python &> /dev/null; then
    echo "🐍 Starting Python HTTP server on port $PORT..."
    cd "$(dirname "$0")/.." && PORT=$PORT python -m SimpleHTTPServer $PORT
else
    echo "❌ No server found. Please install Python 3 or Node.js"
    echo "💡 Or open src/templates/index.html directly in your browser"
    exit 1
fi
