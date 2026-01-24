#!/bin/bash
# Fix GitHub authorization to show Cursor instead of Visual Studio Code

echo "🔍 Removing VSCode GitHub credentials from Keychain..."

# Remove VSCode OAuth tokens
security delete-generic-password -s "vscodevscode.github-authentication" 2>/dev/null && echo "✓ Removed VSCode OAuth token" || echo "  No VSCode OAuth token found"

# Remove GitHub.com internet passwords (may include VSCode entries)
security delete-internet-password -s github.com 2>/dev/null && echo "✓ Removed GitHub.com credentials" || echo "  No GitHub.com credentials found"

# Clear Git credential cache
echo ""
echo "🧹 Clearing Git credential cache..."
git credential-osxkeychain erase <<GITCRED
host=github.com
protocol=https

GITCRED

echo ""
echo "✅ Credentials cleared!"
echo ""
echo "📝 Next steps:"
echo "   1. In Cursor, try to push/pull from GitHub"
echo "   2. Cursor will prompt for GitHub authentication"
echo "   3. Authenticate through Cursor's browser flow"
echo "   4. Credentials will be stored under Cursor's identifier"
