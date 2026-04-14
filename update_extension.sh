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

# Try to install using code command
if command -v code &> /dev/null; then
    echo "🚀 Installing extension..."
    code --install-extension "$VSIX_FILE" --force
    if [ $? -eq 0 ]; then
        echo "✅ Extension updated successfully!"
        echo "🔄 Please reload VS Code to apply changes."
    else
        echo "❌ Failed to install extension via command line."
        echo "📋 Please install manually:"
        echo "   1. Open VS Code"
        echo "   2. Ctrl+Shift+P → 'Extensions: Install from VSIX...'"
        echo "   3. Select: $VSIX_FILE"
    fi
else
    echo "⚠️  VS Code 'code' command not found in PATH."
    echo "📋 Please install manually:"
    echo "   1. Open VS Code"
    echo "   2. Ctrl+Shift+P → 'Extensions: Install from VSIX...'"
    echo "   3. Select: $VSIX_FILE"
fi