#!/bin/bash

echo "🫐 Member Berries Apple MCP Installation Script"
echo "=============================================="
echo ""

# Check if bun is installed
if ! command -v bun &> /dev/null; then
    echo "❌ Bun is not installed. Please install it first:"
    echo ""
    echo "   Using Homebrew (recommended):"
    echo "   brew install bun"
    echo ""
    echo "   Or using the install script:"
    echo "   curl -fsSL https://bun.sh/install | bash"
    echo ""
    exit 1
fi

echo "✅ Bun is installed"

# Install dependencies
echo "📦 Installing dependencies..."
bun install

if [ $? -eq 0 ]; then
    echo "✅ Dependencies installed successfully"
else
    echo "❌ Failed to install dependencies"
    exit 1
fi

# Get the current directory
CURRENT_DIR=$(pwd)

echo ""
echo "Installation complete!"
echo ""
echo "To add Member Berries to Claude Desktop:"
echo "1. Open Claude Desktop"
echo "2. Go to Settings > Developer > Model Context Protocol"
echo "3. Add this configuration:"
echo ""
echo '{'
echo '  "mcpServers": {'
echo '    "member-berries": {'
echo '      "command": "bun",'
echo '      "args": ["run", "'$CURRENT_DIR'/index.ts"]'
echo '    }'
echo '  }'
echo '}'
echo ""
echo "4. Optional: paste CLAUDE_PROMPT_SETUP.md into Custom Instructions"
echo "   (Built-in conversation starters work without it.)"
echo ""
echo "5. Restart Claude Desktop"
echo ""
echo "Member Berries is ready to 'member!"
