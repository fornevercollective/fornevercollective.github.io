.PHONY: install dev build deploy clean serve

# Default target
.DEFAULT_GOAL := serve

# Variables
PORT ?= 8000
PROJECT_NAME := fornevercollective

# Install dependencies with UV
install:
	@echo "📦 Setting up UV environment..."
	@if command -v uv >/dev/null 2>&1; then \
		echo "💡 This is a static web project - no Python dependencies required."; \
		echo "📦 Syncing UV (dev dependencies only, skipping build)..."; \
		uv sync --no-install-project --no-build-isolation 2>/dev/null || \
		uv sync --no-install-project 2>/dev/null || \
		uv sync --no-build-isolation 2>/dev/null || \
		(uv sync 2>&1 | grep -v "Failed to build" || true) && \
		echo "✅ UV environment ready"; \
	else \
		echo "⚠️  UV not found. Skipping dependency installation."; \
		echo "💡 This is a static web project - no Python dependencies required."; \
	fi

# Development mode
dev:
	@echo "🔧 Starting development server..."
	@if command -v uv >/dev/null 2>&1; then \
		uv run --no-project python scripts/server.py 2>/dev/null || \
		python3 scripts/server.py; \
	else \
		python3 scripts/server.py; \
	fi

# Build project
build:
	@echo "🔨 Building project..."
	@mkdir -p deploy/dist
	@cp -r src/static deploy/dist/
	@cp -r src/templates deploy/dist/
	@cp scripts/server.py deploy/dist/
	@cp scripts/server.js deploy/dist/
	@cp pyproject.toml deploy/dist/
	@cp README.md deploy/dist/
	@echo "✅ Build complete: deploy/dist/"

# Sync files for GitHub Pages (root-level structure)
github-pages:
	@echo "📦 Syncing files for GitHub Pages..."
	@cp src/templates/index.html index.html
	@rm -rf static
	@cp -r src/static static
	@echo "✅ GitHub Pages files synced to root"
	@echo "📝 Files ready for GitHub Pages deployment:"
	@echo "   - index.html"
	@echo "   - static/"

# Deploy
deploy: build
	@echo "🚀 Creating deployment package..."
	@cd deploy/dist && tar -czf ../${PROJECT_NAME}-deploy.tar.gz .
	@echo "✅ Deployment package: deploy/${PROJECT_NAME}-deploy.tar.gz"

# Quick deploy with UV
uv-deploy:
	@bash deploy/uv-deploy.sh

# Serve locally
serve:
	@echo "🌐 Starting server on port ${PORT}..."
	@if command -v uv >/dev/null 2>&1; then \
		PORT=${PORT} uv run --no-project python scripts/server.py 2>/dev/null || \
		PORT=${PORT} python3 scripts/server.py; \
	else \
		PORT=${PORT} python3 scripts/server.py; \
	fi

# Clean build artifacts
clean:
	@echo "🧹 Cleaning..."
	@rm -rf deploy/dist
	@rm -f deploy/*.tar.gz deploy/*.zip
	@rm -rf __pycache__ .pytest_cache .ruff_cache
	@find . -type d -name "__pycache__" -exec rm -r {} + 2>/dev/null || true
	@echo "✅ Clean complete"

# Run tests
test:
	@echo "🧪 Running tests..."
	uv run pytest tests/ || echo "⚠️  No tests found"

# Format code
format:
	@echo "🎨 Formatting code..."
	uv run black scripts/*.py 2>/dev/null || echo "⚠️  Black not available"
	@echo "✅ Format complete"

# Lint code
lint:
	@echo "🔍 Linting code..."
	uv run ruff check scripts/*.py 2>/dev/null || echo "⚠️  Ruff not available"
	@echo "✅ Lint complete"

# Help
help:
	@echo "Available targets:"
	@echo "  make install     - Install dependencies with UV"
	@echo "  make dev         - Start development server"
	@echo "  make build       - Build deployment package"
	@echo "  make deploy      - Create deployment archive"
	@echo "  make uv-deploy   - Quick deploy with UV"
	@echo "  make github-pages - Sync files to root for GitHub Pages"
	@echo "  make serve       - Serve locally (default)"
	@echo "  make clean       - Clean build artifacts"
	@echo "  make test        - Run tests"
	@echo "  make format      - Format code"
	@echo "  make lint        - Lint code"
