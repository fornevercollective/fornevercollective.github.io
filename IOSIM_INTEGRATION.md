# iosim.js Integration Guide

## Overview

The `iosim.js` module provides a complete iOS device simulator integration for the fornevercollective project, with Cursor CLI support, multi-method sync, and scalability features.

## Files

- **`src/static/iosim.js`** - Main iosim module (standalone, deployable)
- **`src/static/style.css`** - All iosim styles (already integrated)
- **`src/templates/index.html`** - HTML template with iosim section

## Features

### 1. Live Cursor CLI Integration
- Detects `cursor` or `agent` commands automatically
- Executes via Electron's Cursor Composer handler
- Streams output in real-time
- Syncs commands/results across all instances

### 2. Multi-Method Sync (Redundancy)
- **WebSocket** - Real-time bidirectional sync
- **HTTP/REST API** - Fallback sync method
- **BroadcastChannel** - Same-origin tab sync
- **IPC** - Electron direct communication
- **localStorage** - Offline persistence

### 3. Scalability Features
- Instance registry for load balancing
- Auto-cleanup of stale instances
- Multiple instance support
- Configurable endpoints

### 4. Device Management
- Device selection dropdown
- Visual device preview
- Device address generation
- QR code for device sharing
- Device ID tracking

## Usage

### Basic Integration

The iosim.js is already integrated in `index.html`:

```html
<script src="https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js"></script>
<script src="/static/iosim.js"></script>
```

### Configuration

Configure iosim via global config:

```html
<script>
  window.IOSIM_CONFIG = {
    apiEndpoint: 'http://localhost:8080',
    wsEndpoint: 'ws://localhost:8080',
    enableCursorCLI: true,
    enableScalability: true,
    instanceId: 'custom-instance-id',
    multipleInstances: false
  };
</script>
<script src="/static/iosim.js"></script>
```

### API Endpoints Required

The Electron app must provide these endpoints:

- `GET /api/devices` - Get device list
- `POST /api/simulator/launch` - Launch simulator
- `POST /api/terminal/execute` - Execute commands
- `POST /api/cursor/composer` - Cursor CLI execution
- `POST /api/cursor/composer/sync` - Sync Cursor commands
- `POST /api/instances/register` - Instance registration
- `GET /api/instances` - List active instances
- `GET /sync/ping` - Health check
- `GET /sync/doc/{docId}` - Get document
- `POST /sync/doc` - Update document
- `WS /ws/doc/{docId}` - Document WebSocket
- `WS /ws/iosim` - iosim WebSocket

## Terminal Commands

### UV Commands
```bash
uv pip install package
uv pip list
uv --version
```

### Cursor CLI Commands
```bash
cursor chat "analyze this device"
agent chat "fix the sync issue"
```

## Device Sharing

Each iosim instance generates:
- **Device ID** - Unique 8-character ID
- **Device Address** - Shareable URL with device info
- **QR Code** - Scan to connect to device

## Sync Methods

All sync methods work simultaneously for redundancy:

1. **WebSocket** - Fastest, real-time
2. **HTTP** - Reliable fallback
3. **BroadcastChannel** - Same-origin tabs
4. **IPC** - Electron direct
5. **localStorage** - Always available

## Production Deployment

The iosim.js module is production-ready with:
- Error handling and fallbacks
- Timeout management
- Instance cleanup
- Load balancing support
- Mobile responsive design

## Dependencies

- **QRCode.js** - For QR code generation (loaded via CDN)
- **Electron App** - For backend API (optional, graceful degradation)

## Browser Support

- Modern browsers with ES6+ support
- WebSocket API
- BroadcastChannel API (optional)
- Fetch API with AbortController

## Mobile Support

Fully responsive design with:
- Touch-friendly controls
- Mobile-optimized layouts
- QR code scanning support
- Adaptive UI elements
