# Publishing to VSCode Marketplace

## Prerequisites

1. **Microsoft Account**: Sign up at https://account.microsoft.com if you don't have one
2. **Publisher Account**: Create at https://marketplace.visualstudio.com/manage
3. **Personal Access Token (PAT)**: Generate from https://dev.azure.com

## Step-by-Step Guide

### 1. Create Publisher Account

1. Go to https://marketplace.visualstudio.com/manage
2. Sign in with your Microsoft account
3. Click "Create publisher"
4. Fill in:
   - **Publisher ID**: Choose a unique ID (e.g., `gmsyrimis`)
   - **Display Name**: Your name or company name
   - **Description**: Brief description of your extensions

### 2. Generate Personal Access Token

1. Go to https://dev.azure.com
2. Click your profile icon (top right) → "Personal access tokens"
3. Click "+ New Token"
4. Configure:
   - **Name**: `VSCode Extension Publishing`
   - **Organization**: All accessible organizations
   - **Expiration**: Custom (365 days recommended)
   - **Scopes**: Click "Show all scopes" → Check **Marketplace** → **Manage**
5. Click "Create"
6. **IMPORTANT**: Copy the token immediately (you won't see it again!)

### 3. Update package.json

Update the `publisher` field in `package.json` to match your Publisher ID:

```json
{
  "publisher": "your-publisher-id"
}
```

### 4. Login to vsce

```bash
npx vsce login your-publisher-id
```

When prompted, paste your Personal Access Token.

### 5. Publish the Extension

```bash
# First time publish
npx vsce publish

# Or specify version bump
npx vsce publish patch  # 0.2.1 -> 0.2.2
npx vsce publish minor  # 0.2.1 -> 0.3.0
npx vsce publish major  # 0.2.1 -> 1.0.0
```

### 6. Verify Publication

1. Go to https://marketplace.visualstudio.com/manage
2. You should see your extension listed
3. It may take a few minutes to appear in the marketplace search

## Quick Publish Commands

```bash
# Build and publish in one go
npm run build && npx vsce publish

# Publish with version bump
npm run build && npx vsce publish patch
```

## Updating the Extension

When you make changes:

```bash
# 1. Update code
# 2. Build
npm run build

# 3. Test locally
code --install-extension openapi-preview-X.X.X.vsix

# 4. Commit changes
git add .
git commit -m "Your changes"
git push

# 5. Publish update
npx vsce publish patch
```

## Troubleshooting

### "Publisher not found"
- Make sure you've created a publisher at https://marketplace.visualstudio.com/manage
- Verify the publisher ID in package.json matches exactly

### "Authentication failed"
- Your PAT may have expired
- Generate a new PAT with Marketplace > Manage scope
- Run `npx vsce login your-publisher-id` again

### "Extension already exists"
- If you're updating, use `npx vsce publish` (not `npx vsce publish --force`)
- Make sure to bump the version number

## Resources

- [VSCode Publishing Guide](https://code.visualstudio.com/api/working-with-extensions/publishing-extension)
- [Marketplace Management](https://marketplace.visualstudio.com/manage)
- [Azure DevOps](https://dev.azure.com)
