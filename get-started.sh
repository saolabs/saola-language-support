#!/bin/bash
# Get Started Script for Template Languages VS Code Extension

echo "🎉 Welcome to Template Languages VS Code Extension Setup!"
echo ""
echo "This script will help you get started with the extension."
echo ""

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    echo "Visit: https://nodejs.org/"
    exit 1
fi

echo "✅ npm found: $(npm -v)"
echo ""

# Navigate to project directory
PROJECT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$PROJECT_DIR"

echo "📁 Project directory: $PROJECT_DIR"
echo ""

# Step 1: Install dependencies
echo "📦 Step 1: Installing dependencies..."
echo "Running: npm install"
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies"
    exit 1
fi

echo "✅ Dependencies installed successfully"
echo ""

# Step 2: Compile TypeScript
echo "🔨 Step 2: Compiling TypeScript..."
echo "Running: npm run compile"
npm run compile

if [ $? -ne 0 ]; then
    echo "❌ Failed to compile TypeScript"
    exit 1
fi

echo "✅ TypeScript compiled successfully"
echo ""

# Step 3: Summary
echo "════════════════════════════════════════════════════════════"
echo "✅ Setup Complete! Your extension is ready for testing."
echo "════════════════════════════════════════════════════════════"
echo ""
echo "📖 Next Steps:"
echo ""
echo "1. Open this project in VS Code:"
echo "   code ."
echo ""
echo "2. Press F5 to launch the extension in debug mode"
echo "   (or use Debug → Start Debugging menu)"
echo ""
echo "3. Test the extension:"
echo "   • Open one of the example files in examples/ folder"
echo "   • examples/example.one"
echo "   • examples/example.hcl"
echo "   • examples/example.arc"
echo ""
echo "4. Try these features:"
echo "   • Syntax highlighting (colors should appear)"
echo "   • Snippets (type: one:if, hcl:resource, arc:def)"
echo "   • Formatting (press Shift+Alt+F or Shift+Option+F)"
echo ""
echo "📚 Documentation:"
echo "   • README.md - User guide and features"
echo "   • QUICKSTART.md - Development guide"
echo "   • PROJECT_SUMMARY.md - Complete project overview"
echo ""
echo "🔧 Available Commands:"
echo "   npm run compile    - Compile TypeScript"
echo "   npm run watch      - Auto-compile on file changes"
echo "   npm run lint       - Check code quality"
echo "   npm run format     - Format code with Prettier"
echo ""
echo "Happy coding! 🚀"
echo ""
