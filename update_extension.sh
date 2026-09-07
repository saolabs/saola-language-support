#!/bin/bash

# Script to automatically update Saola Language Support extension
# Usage: ./update_extension.sh

echo "🔄 Updating Saola Language Support extension..."

# Get the latest .vsix file
VSIX_FILE=$(ls -t saola-language-support-*.vsix | head -1)

if [ -z "$VSIX_FILE" ]; then
    echo "❌ No .vsix file found!"
    exit 1
fi

echo "📦 Found extension file: $VSIX_FILE"

# Detect IDE CLI binary
IDE_CMD=""
if command -v code &> /dev/null; then
    IDE_CMD="code"
elif command -v antigravity-ide &> /dev/null; then
    IDE_CMD="antigravity-ide"
elif [ -x "/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide" ]; then
    IDE_CMD="/Applications/Antigravity IDE.app/Contents/Resources/app/bin/antigravity-ide"
fi

if [ -n "$IDE_CMD" ]; then
    echo "🚀 Installing extension via $IDE_CMD..."
    "$IDE_CMD" --install-extension "$VSIX_FILE" --force
    if [ $? -eq 0 ]; then
        echo "✅ Extension updated successfully!"
        echo "🔄 Please reload IDE window (Cmd+Shift+P -> 'Developer: Reload Window') to apply changes."
    else
        echo "❌ Failed to install extension via command line."
        echo "📋 Please install manually:"
        echo "   1. Open IDE"
        echo "   2. Cmd+Shift+P → 'Extensions: Install from VSIX...'"
        echo "   3. Select: $VSIX_FILE"
    fi
else
    echo "⚠️  Neither 'code' nor 'antigravity-ide' command found in PATH."
    echo "📋 Please install manually:"
    echo "   1. Open VS Code"
    echo "   2. Ctrl+Shift+P → 'Extensions: Install from VSIX...'"
    echo "   3. Select: $VSIX_FILE"
fi