#!/bin/bash

echo "🫐 Member Berries MCP Test Script"
echo "================================"
echo ""

# Test if the server can start
echo "Testing server startup..."
timeout 5s bun run index.ts <<EOF
{"jsonrpc":"2.0","method":"initialize","params":{"protocolVersion":"1.0.0","capabilities":{},"clientInfo":{"name":"test","version":"1.0.0"}},"id":1}
{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}
EOF

if [ $? -eq 124 ]; then
    echo "✅ Server started successfully (timeout expected)"
else
    echo "❌ Server failed to start properly"
fi

echo ""
echo "Available tools should be:"
echo "- calendar"
echo "- notes" 
echo "- reminders"
echo ""
echo "Missing tools (removed for security):"
echo "- contacts ❌"
echo "- messages ❌"
echo "- mail ❌"
echo "- webSearch ❌"
echo "- maps ❌"
