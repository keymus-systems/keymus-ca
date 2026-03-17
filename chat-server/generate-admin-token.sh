#!/bin/bash
# Generate Test Admin JWT Token for Keymus Chat
# Usage: ./generate-admin-token.sh

cd "$(dirname "$0")/chat-server"

# Load environment variables
if [ -f .env ]; then
    export $(cat .env | grep -v '^#' | xargs)
fi

# Check if JWT_SECRET is set
if [ -z "$JWT_SECRET" ]; then
    echo "❌ Error: JWT_SECRET not found in .env file"
    echo "Please set JWT_SECRET in chat-server/.env"
    exit 1
fi

# Generate token using Node.js
echo "🔑 Generating admin JWT token..."
echo ""

TOKEN=$(node -e "
const jwt = require('jsonwebtoken');
const token = jwt.sign(
    {
        id: 'admin_test_001',
        displayName: 'Test Admin',
        email: 'admin@keymus.test',
        role: 'admin',
        isGuest: false,
        isAdmin: true
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
);
console.log(token);
")

if [ $? -eq 0 ]; then
    echo "✅ Token generated successfully!"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "📋 Copy this token:"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "$TOKEN"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "🔧 Usage Options:"
    echo ""
    echo "1️⃣  Set in Browser (for admin-chat.html):"
    echo "   - Open admin-chat.html in browser"
    echo "   - Open DevTools (F12) → Console"
    echo "   - Run: localStorage.setItem('auth_token', '$TOKEN')"
    echo "   - Refresh the page"
    echo ""
    echo "2️⃣  Test via REST API:"
    echo "   export TOKEN=\"$TOKEN\""
    echo ""
    echo "   # View conversations"
    echo "   curl http://localhost:3001/api/admin/chat/conversations \\"
    echo "     -H \"Authorization: Bearer \$TOKEN\""
    echo ""
    echo "   # Get stats"
    echo "   curl http://localhost:3001/api/admin/chat/stats \\"
    echo "     -H \"Authorization: Bearer \$TOKEN\""
    echo ""
    echo "3️⃣  Auto-set in browser (requires xdotool):"
    echo "   echo '$TOKEN' | xclip -selection clipboard"
    echo "   (Token copied to clipboard)"
    echo ""
else
    echo "❌ Failed to generate token"
    echo "Make sure you're in the correct directory and have jsonwebtoken installed"
    exit 1
fi
