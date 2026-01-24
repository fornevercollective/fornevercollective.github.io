# Deployment Guide

## Quick Deploy with UV

The fastest way to deploy:

```bash
make uv-deploy
```

This will:
1. Check/install UV
2. Sync dependencies
3. Build the project
4. Start the server

## Build for Deployment

```bash
# Build deployment package
make build

# Creates: deploy/dist/ with all files ready to deploy
```

## Manual Deployment Steps

1. **Build the project:**
   ```bash
   make build
   ```

2. **Copy `deploy/dist/` to your server**

3. **On the server:**
   ```bash
   cd deploy/dist
   
   # With UV
   uv sync
   uv run python server.py
   
   # Without UV
   python3 server.py
   ```

## Production Deployment

### Using Systemd (Linux)

Create `/etc/systemd/system/fornever.service`:

```ini
[Unit]
Description=fornevercollective Web Server
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/fornevercollective/deploy/dist
ExecStart=/usr/bin/python3 server.py
Restart=always
Environment=PORT=8000

[Install]
WantedBy=multi-user.target
```

Then:
```bash
sudo systemctl enable fornever
sudo systemctl start fornever
```

### Using PM2 (Node.js)

```bash
pm2 start server.js --name fornever
pm2 save
pm2 startup
```

### Using Docker

Create `Dockerfile`:

```dockerfile
FROM python:3.11-slim

WORKDIR /app
COPY deploy/dist/ .

EXPOSE 8000
CMD ["python3", "server.py"]
```

Build and run:
```bash
docker build -t fornever .
docker run -p 8000:8000 fornever
```

## Environment Variables

- `PORT` - Server port (default: 8000)
- `IOSIM_PORT` - iOS simulator port (default: 8080)
- `IOSIM_HOST` - iOS simulator host (default: localhost)

## Reverse Proxy (Nginx)

```nginx
server {
    listen 80;
    server_name yourdomain.com;

    location / {
        proxy_pass http://localhost:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```
