#!/bin/bash
# Quick deployment script for fornevercollective

set -e

PROJECT_NAME="fornevercollective"
DEPLOY_DIR="./deploy/dist"
PORT=${PORT:-8000}

echo "🚀 Starting deployment for $PROJECT_NAME"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf "$DEPLOY_DIR"
mkdir -p "$DEPLOY_DIR"

# Copy static files
echo "📦 Copying static files..."
cp -r src/static/* "$DEPLOY_DIR/" 2>/dev/null || true
cp -r src/templates/* "$DEPLOY_DIR/" 2>/dev/null || true

# Copy server files
echo "🔧 Copying server files..."
cp scripts/server.py "$DEPLOY_DIR/" 2>/dev/null || true
cp scripts/server.js "$DEPLOY_DIR/" 2>/dev/null || true

# Copy configuration files
echo "⚙️  Copying configuration..."
cp pyproject.toml "$DEPLOY_DIR/" 2>/dev/null || true
cp README.md "$DEPLOY_DIR/" 2>/dev/null || true
cp .gitignore "$DEPLOY_DIR/" 2>/dev/null || true

# Create deployment package
echo "📦 Creating deployment package..."
cd "$DEPLOY_DIR"
tar -czf "../${PROJECT_NAME}-deploy.tar.gz" . 2>/dev/null || zip -r "../${PROJECT_NAME}-deploy.zip" . 2>/dev/null || true
cd - > /dev/null

echo "✅ Deployment package created: deploy/${PROJECT_NAME}-deploy.tar.gz"
echo "💡 To deploy:"
echo "   1. Extract the package on your server"
echo "   2. Run: python3 server.py"
echo "   3. Or use: uv run server.py"
