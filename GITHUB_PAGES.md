# GitHub Pages Deployment

This project is configured to work on GitHub Pages at `https://fornevercollective.github.io`.

## Structure

For GitHub Pages, the following files must be in the repository root:

```
fornevercollective.github.io/
├── index.html          # Main HTML file (synced from src/templates/index.html)
├── static/             # Static assets (synced from src/static/)
│   ├── editor.js
│   ├── iosim.js
│   ├── news-aggregator.js
│   ├── social-aggregator.js
│   ├── custom-search.js
│   ├── map-viewer.js
│   └── style.css
├── .nojekyll           # Disable Jekyll processing
├── .github/
│   └── workflows/
│       └── deploy.yml  # GitHub Actions deployment
└── src/                # Source files (for development)
    ├── static/
    └── templates/
```

## Syncing Files for GitHub Pages

After making changes to source files, sync them to root:

```bash
make github-pages
```

This will:
1. Copy `src/templates/index.html` → `index.html`
2. Copy `src/static/` → `static/`

## GitHub Pages Configuration

1. Go to repository Settings → Pages
2. Source: Deploy from a branch
3. Branch: `main` (or your default branch)
4. Folder: `/ (root)`
5. Save

## Automatic Deployment

The `.github/workflows/deploy.yml` workflow automatically deploys on push to `main`.

## Manual Deployment

1. Sync files: `make github-pages`
2. Commit changes:
   ```bash
   git add index.html static/ .nojekyll
   git commit -m "Update GitHub Pages"
   git push
   ```

## Paths

All paths in `index.html` use absolute paths (`/static/...`) which work correctly from the GitHub Pages root.

## Testing Locally

To test the GitHub Pages structure locally:

```bash
# Serve from root (simulates GitHub Pages)
cd /Users/tref/fornevercollective/fornevercollective.github.io
python3 -m http.server 8000
# Open http://localhost:8000
```

Or use the development server (which handles routing):

```bash
make serve
# or
python3 scripts/server.py
```

## Notes

- The `src/` folder contains source files for development
- Root-level `index.html` and `static/` are for GitHub Pages deployment
- Both structures work identically - paths are the same (`/static/...`)
- `.nojekyll` prevents Jekyll from processing the site
