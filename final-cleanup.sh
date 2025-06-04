#!/bin/bash

echo "🫐 Cleaning up Member Berries folders..."
echo ""

# First, delete the old member-berries-mcp project
OLD_PROJECT="/Users/rogers/GitHub/member-berries-mcp"
if [ -d "$OLD_PROJECT" ]; then
    echo "❌ Removing old project: member-berries-mcp"
    rm -rf "$OLD_PROJECT"
    echo "✅ Old project deleted"
else
    echo "✅ Old project already removed"
fi

echo ""

# Now clean up the new project
cd /Users/rogers/GitHub/member-berries-apple-mcp

echo "🧹 Cleaning up member-berries-apple-mcp..."

# Remove temporary clone directory
if [ -d "temp-apple-mcp" ]; then
    echo "  - Removing temp-apple-mcp directory..."
    rm -rf temp-apple-mcp
fi

# Remove clone script
if [ -f "clone-repo.sh" ]; then
    echo "  - Removing clone-repo.sh..."
    rm clone-repo.sh
fi

# Remove the cleanup script itself after running
if [ -f "cleanup.sh" ]; then
    echo "  - Removing old cleanup.sh..."
    rm cleanup.sh
fi

# Move implementation summary into member-berries folder
if [ -f "IMPLEMENTATION_SUMMARY.md" ]; then
    echo "  - Moving IMPLEMENTATION_SUMMARY.md to member-berries folder..."
    mv IMPLEMENTATION_SUMMARY.md member-berries/
fi

# Remove make-executable script from member-berries folder if it exists
if [ -f "member-berries/make-executable.sh" ]; then
    echo "  - Removing make-executable.sh..."
    rm member-berries/make-executable.sh
fi

echo ""
echo "✅ All cleanup complete!"
echo ""
echo "📁 Final structure:"
echo "member-berries-apple-mcp/"
echo "└── member-berries/         # The actual MCP server"
echo "    ├── index.ts           # Main server with memory integration"
echo "    ├── tools.ts           # Tool definitions including memberberries tool"
echo "    ├── memory/            # Memory layer for conversation context"
echo "    │   └── MemberBerriesMemory.ts"
echo "    ├── utils/             # Calendar, Notes, Reminders utilities"
echo "    ├── package.json       # Dependencies"
echo "    ├── README.md          # Documentation"
echo "    ├── LICENSE            # MIT License"
echo "    ├── CLAUDE_PROMPT_SETUP.md    # Custom prompt for natural conversations"
echo "    ├── PHILOSOPHY.md      # Our respectful positioning"
echo "    ├── UNIQUE_SELLING_PROPOSITION.md"
echo "    ├── SECURITY_ENHANCEMENTS.md"
echo "    ├── install.sh         # Installation script"
echo "    └── test.sh            # Test script"
echo ""
echo "🫐 Member Berries is clean and ready to 'member!"
