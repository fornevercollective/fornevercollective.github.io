# Project Structure

```
fornevercollective/
├── src/
│   ├── static/              # Static assets (JS, CSS)
│   │   ├── editor.js
│   │   ├── news-aggregator.js
│   │   ├── social-aggregator.js
│   │   ├── custom-search.js
│   │   ├── map-viewer.js
│   │   ├── iosim.js
│   │   └── style.css
│   └── templates/           # HTML templates
│       └── index.html
│
├── scripts/                  # Server and utility scripts
│   ├── server.py            # Python HTTP server
│   ├── server.js            # Node.js HTTP server
│   └── start.sh             # Quick start script
│
├── deploy/                   # Deployment scripts
│   ├── deploy.sh            # General deployment
│   └── uv-deploy.sh         # UV-specific deployment
│
├── pyproject.toml            # UV/Python project config
├── Makefile                 # Build and deployment commands
├── .uvrc                    # UV runtime config
├── .gitignore               # Git ignore rules
├── README.md                # Main documentation
└── QUICKSTART.md            # Quick start guide
```

## Quick Deploy Commands

### Using UV
```bash
make uv-deploy
# or
./deploy/uv-deploy.sh
```

### Using Make
```bash
make install    # Install dependencies
make serve      # Start server
make build      # Build for deployment
make deploy     # Create deployment package
```

### Manual
```bash
# Start server
python3 scripts/server.py
# or
node scripts/server.js
# or
./scripts/start.sh
```

## Deployment Package Structure

After `make build`, the `deploy/dist/` directory contains:
- All static files
- All templates
- Server scripts
- Configuration files

This can be deployed to any server.
