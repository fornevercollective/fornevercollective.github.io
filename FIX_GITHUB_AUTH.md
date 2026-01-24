# Fix GitHub Authorization - Show Cursor Instead of Visual Studio Code

GitHub is detecting Visual Studio Code instead of Cursor because VSCode's OAuth tokens are stored in macOS Keychain.

## Solution 1: Remove VSCode Credentials from Keychain (Recommended)

1. **Open Keychain Access** (Applications → Utilities → Keychain Access)

2. **Search for GitHub credentials:**
   - Search for: `github.com`
   - Look for entries with "vscode" or "Visual Studio Code" in the name

3. **Delete VSCode GitHub entries:**
   - Find entries like:
     - `vscodevscode.github-authentication`
     - `github.com` (if created by VSCode)
   - Right-click → Delete
   - Confirm deletion

4. **Re-authenticate in Cursor:**
   - In Cursor, try to push/pull
   - Cursor will prompt for GitHub authentication
   - Authenticate through Cursor's browser flow
   - This will store credentials under Cursor's identifier

## Solution 2: Use Personal Access Token (Alternative)

1. **Create a Personal Access Token:**
   - Go to GitHub → Settings → Developer settings → Personal access tokens → Tokens (classic)
   - Generate new token (classic)
   - Select scopes: `repo`, `workflow`, `write:packages`
   - Copy the token

2. **Update Git Credentials:**
   ```bash
   git credential-osxkeychain erase
   host=github.com
   protocol=https
   ```
   (Press Enter twice after the blank line)

3. **Use Token for Authentication:**
   - Next time you push/pull, use your GitHub username
   - Password: paste your personal access token
   - This will be stored under Git's credential helper (not VSCode)

## Solution 3: Command Line Fix

Remove all GitHub credentials and re-authenticate:

```bash
# Remove GitHub credentials from Keychain
security delete-internet-password -s github.com 2>/dev/null
security delete-generic-password -s "vscodevscode.github-authentication" 2>/dev/null

# Clear Git credential cache
git credential-osxkeychain erase <<EOF
host=github.com
protocol=https
EOF

# Test authentication (will prompt for credentials)
git ls-remote https://github.com/fornevercollective/fornevercollective.github.io.git
```

Then authenticate through Cursor when prompted.

## Verify Fix

After re-authenticating:
1. Make a commit and push
2. Check GitHub → Settings → Applications → Authorized OAuth Apps
3. You should see "Cursor" instead of "Visual Studio Code"

## Prevent Future Issues

- Always authenticate through Cursor's built-in GitHub integration
- Avoid using VSCode's GitHub extension if you're using Cursor
- Use Personal Access Tokens if you need consistent authentication across tools
