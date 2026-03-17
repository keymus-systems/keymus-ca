# Keymus Chat System - Complete Setup Guide

## 🚀 Quick Start

### 1. Start the Chat Server

```bash
cd /home/kai/Documents/keymus/chat-server
node server.js
```

Server will start on **port 3001**. You should see:
```
🚀 Keymus Chat Server running on port 3001
```

### 2. Start the Frontend

Open a **new terminal** and run:
```bash
cd /home/kai/Documents/keymus
npm run start
```

This opens your website on **http://localhost:8080**

---

## 💬 Testing Chat as a Client

### Enable the Chat Widget

The chat widget needs to be added to your HTML pages. Add these lines **before the closing `</body>` tag** in any public page (home.html, about.html, etc.):

```html
<!-- Chat Widget CSS -->
<link rel="stylesheet" href="css/chat-panel.css">

<!-- Chat System Scripts -->
<script src="js/chat-socket.js"></script>
<script src="js/chat-widget.js"></script>
```

### Test the Flow

1. **Open Homepage**: Visit http://localhost:8080/home.html
2. **Click the Blue Chat Button**: Look for the floating button in bottom-right corner
3. **Type a Message**: The chat panel will slide up
4. **Send**: Your message gets saved to the database instantly
5. **Check Console**: Open browser DevTools (F12) to see connection logs

### What You'll See

- ✅ Floating blue chat button with badge
- ✅ Chat panel slides up when clicked
- ✅ Your messages appear instantly
- ✅ Typing indicators when you're typing
- ✅ Connection status (green = connected)
- ✅ Anonymous session created automatically (no login needed)

---

## 🔧 Testing Admin Backend

### Create Admin Chat Page

You don't have an admin chat page yet. Here's what you need to do:

**Option 1: Add to Existing Admin Page**

If you have an admin.html or dashboard.html, add these scripts before `</body>`:

```html
<!-- Chat Admin Styles -->
<link rel="stylesheet" href="css/chat-panel.css">

<!-- Admin Chat Scripts -->
<script src="js/chat-socket.js"></script>
<script src="js/admin-chat-socket.js"></script>

<script>
// Initialize admin chat system
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize admin socket connection
    await AdminChatSocket.init();
    
    // Listen for new conversations
    AdminChatSocket.on('newConversation', (conversation) => {
        console.log('New conversation:', conversation);
        // Update your UI here
    });
    
    // Listen for new messages
    AdminChatSocket.on('newMessage', (message) => {
        console.log('New message:', message);
        // Update your UI here
    });
    
    // Get all conversations
    AdminChatSocket.refresh((data) => {
        console.log('All conversations:', data.conversations);
    });
});

// Reply to a conversation
function replyToConversation(conversationId, message) {
    AdminChatSocket.reply(conversationId, message, {}, (result) => {
        if (result.success) {
            console.log('Reply sent!', result.message);
        }
    });
}

// Resolve a conversation
function resolveConversation(conversationId) {
    AdminChatSocket.resolve(conversationId, (result) => {
        if (result.success) {
            console.log('Conversation resolved!');
        }
    });
}
</script>
```

**Option 2: Quick Admin Test via REST API**

```bash
# Get admin token (replace with your actual admin JWT from your main backend)
export ADMIN_TOKEN="your-admin-jwt-token-here"

# View all conversations
curl http://localhost:3001/api/admin/chat/conversations \
  -H "Authorization: Bearer $ADMIN_TOKEN"

# Reply to a conversation
curl -X POST http://localhost:3001/api/admin/chat/conversations/CONVERSATION_ID/reply \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Hello! How can I help you?","asPersona":"Support Team"}'

# Get stats
curl http://localhost:3001/api/admin/chat/stats \
  -H "Authorization: Bearer $ADMIN_TOKEN"
```

### Admin Login Requirements

⚠️ **Important**: Admin features require a valid admin JWT token. You need to either:

1. **Update JWT_SECRET**: Edit `chat-server/.env` and set `JWT_SECRET` to match your main backend
2. **Create Test Admin Token**: Or create a test admin user in your main system

The chat server expects JWT tokens with:
```json
{
  "id": "user-id",
  "role": "admin",  // Must be "admin" for admin features
  "displayName": "Admin Name"
}
```

---

## 📊 Verify Data in Database

Check if messages are being saved:

```bash
# Connect to PostgreSQL
psql -U postgres -d keymus_chat

# View all users
SELECT * FROM chat_users;

# View all conversations
SELECT * FROM conversations;

# View all messages
SELECT * FROM messages ORDER BY created_at DESC LIMIT 10;

# Exit PostgreSQL
\q
```

---

## 🔥 Production Deployment Guide

### Architecture Overview

```
Internet → Nginx (Port 80/443) → Chat Server (Port 3001)
                                  ↓
                              PostgreSQL (Port 5432)
```

### Step 1: Server Setup (VPS/Cloud)

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 18+
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL
sudo apt install -y postgresql postgresql-contrib

# Install PM2 (process manager)
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### Step 2: PostgreSQL Configuration

```bash
# Switch to postgres user
sudo -i -u postgres

# Create production database
createdb keymus_chat_prod

# Create production user
psql
CREATE USER keymus_chat WITH PASSWORD 'your-strong-password-here';
GRANT ALL PRIVILEGES ON DATABASE keymus_chat_prod TO keymus_chat;
\q
exit
```

### Step 3: Deploy Chat Server

```bash
# Create app directory
sudo mkdir -p /var/www/keymus-chat
sudo chown $USER:$USER /var/www/keymus-chat

# Upload your code (use git, scp, or rsync)
cd /var/www/keymus-chat
git clone your-repo-url .
# Or: scp -r chat-server/ user@server:/var/www/keymus-chat/

# Install dependencies
cd /var/www/keymus-chat/chat-server
npm install --production

# Create production .env
nano .env
```

**Production `.env` file**:
```env
NODE_ENV=production
CHAT_PORT=3001
DATABASE_URL=postgresql://keymus_chat:your-strong-password-here@localhost:5432/keymus_chat_prod
JWT_SECRET=your-production-jwt-secret-matching-main-backend
ALLOWED_ORIGINS=https://yourdomain.com,https://www.yourdomain.com,https://admin.yourdomain.com
GUEST_TOKEN_EXPIRY=7d
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=100
```

```bash
# Apply database migrations
node db/migrate.js

# Test server
node server.js
# Press Ctrl+C to stop after verifying it works
```

### Step 4: PM2 Process Manager

```bash
# Start with PM2
pm2 start server.js --name keymus-chat

# Save PM2 config
pm2 save

# Setup PM2 to start on boot
pm2 startup
# Copy and run the command it outputs

# View logs
pm2 logs keymus-chat

# Monitor
pm2 monit

# Restart
pm2 restart keymus-chat
```

### Step 5: Nginx Reverse Proxy

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/keymus-chat
```

**Nginx Configuration**:
```nginx
# WebSocket upgrade headers
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

# Chat API server
server {
    listen 80;
    server_name chat.yourdomain.com;  # Or api.yourdomain.com
    
    # Redirect to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name chat.yourdomain.com;
    
    # SSL certificates (use Let's Encrypt - see Step 6)
    ssl_certificate /etc/letsencrypt/live/chat.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/chat.yourdomain.com/privkey.pem;
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    
    # Proxy to Node.js chat server
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        
        # WebSocket support
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        
        # Standard proxy headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts for WebSocket
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Health check endpoint
    location /health {
        proxy_pass http://localhost:3001/health;
        access_log off;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/keymus-chat /etc/nginx/sites-enabled/

# Test Nginx config
sudo nginx -t

# Restart Nginx
sudo systemctl restart nginx
```

### Step 6: SSL Certificates (Let's Encrypt)

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot --nginx -d chat.yourdomain.com

# Auto-renewal is configured automatically
# Test renewal
sudo certbot renew --dry-run
```

### Step 7: Deploy Frontend

```bash
# Build optimized frontend
cd /home/kai/Documents/keymus
npm run build

# Upload dist/ folder to your web server
scp -r dist/* user@server:/var/www/yourdomain.com/html/

# Or use your hosting provider's deployment method
```

**Update frontend chat-socket.js for production** (line ~15):
```javascript
const CHAT_API_URL = 'https://chat.yourdomain.com';  // Production chat server
```

### Step 8: Environment Variables Sync

⚠️ **Critical**: Ensure `JWT_SECRET` is **identical** in:
- Main backend `.env`
- Chat server `.env` (`/var/www/keymus-chat/chat-server/.env`)

This allows users authenticated in your main app to use chat seamlessly.

### Step 9: Firewall Configuration

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP & HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Enable firewall
sudo ufw enable

# Check status
sudo ufw status
```

### Step 10: Monitoring & Logging

```bash
# View chat server logs
pm2 logs keymus-chat

# View Nginx access logs
sudo tail -f /var/log/nginx/access.log

# View Nginx error logs
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-14-main.log
```

---

## 🔍 Troubleshooting

### Chat Button Not Appearing

1. Check if scripts are loaded: Open DevTools → Network tab → Filter "chat"
2. Verify files exist: `ls js/chat-*.js css/chat-*.css`
3. Check console for JavaScript errors (F12)

### Messages Not Sending

1. Check chat server is running: `curl http://localhost:3001/health`
2. Check browser console for Socket.io connection errors
3. Verify PostgreSQL is running: `sudo systemctl status postgresql`
4. Check CORS settings in `chat-server/.env`

### Admin Can't Access Conversations

1. Verify admin JWT token has `role: "admin"`
2. Check JWT_SECRET matches between backends
3. Test admin endpoint: `curl http://localhost:3001/api/admin/chat/conversations -H "Authorization: Bearer TOKEN"`

### WebSocket Connection Failing

1. Check firewall allows port 3001
2. Verify Socket.io client library loads (check DevTools → Network)
3. Check browser console for Socket.io errors
4. Fallback polling should work even if WebSocket fails

### Database Connection Errors

1. Check PostgreSQL is running: `sudo systemctl status postgresql`
2. Verify DATABASE_URL in `.env`
3. Test connection: `psql $DATABASE_URL`
4. Check user permissions

---

## 📝 API Endpoints Reference

### Client Endpoints

```
POST   /api/chat/anonymous                    Create anonymous session
GET    /api/chat/conversations                 List my conversations
POST   /api/chat/conversations                 Create new conversation
GET    /api/chat/conversations/:id/messages    Get messages
POST   /api/chat/conversations/:id/messages    Send message
GET    /api/chat/unread                        Get unread count
```

### Admin Endpoints (Requires admin JWT)

```
GET    /api/admin/chat/conversations                  List all conversations
GET    /api/admin/chat/conversations/:id/messages     View conversation
POST   /api/admin/chat/conversations/:id/reply        Send admin reply
PATCH  /api/admin/chat/conversations/:id/resolve      Mark resolved
PATCH  /api/admin/chat/conversations/:id/reopen       Reopen conversation
GET    /api/admin/chat/stats                          Dashboard stats
GET    /api/admin/chat/online-users                   Online users
```

### WebSocket Events

**Client Namespace (`/chat`)**:
- `chat:send` - Send message
- `chat:typing` - Typing indicator
- `chat:read` - Mark as read
- `chat:new-message` - Receive new message
- `chat:conversation-resolved` - Conversation closed

**Admin Namespace (`/admin`)**:
- `admin:reply` - Send admin reply
- `admin:resolve` - Resolve conversation
- `admin:new-conversation` - New conversation created
- `admin:new-message` - New message in any conversation

---

## 🎯 Next Steps

1. **Enable Chat Widget**: Add the 3 script lines to your HTML pages
2. **Test Client Flow**: Open homepage, click chat button, send message
3. **Create Admin Page**: Build UI for admins to view and respond to conversations
4. **Sync JWT Secrets**: Update `.env` files to match
5. **Deploy to Production**: Follow production guide above

---

## 📚 File Structure

```
/home/kai/Documents/keymus/
├── chat-server/              # Backend chat server
│   ├── server.js            # Main entry point
│   ├── .env                 # Configuration
│   ├── db/                  # Database layer
│   ├── routes/              # REST endpoints
│   ├── socket/              # WebSocket handlers
│   └── middleware/          # Auth, rate limiting
│
├── js/                      # Frontend JavaScript
│   ├── chat-socket.js       # Socket.io client wrapper
│   ├── chat-widget.js       # Client chat UI
│   └── admin-chat-socket.js # Admin Socket.io bridge
│
└── css/
    └── chat-panel.css       # Chat widget styles
```

---

## 🆘 Support

If you encounter issues:

1. Check server logs: `pm2 logs keymus-chat` (production) or console output (dev)
2. Check browser console (F12) for JavaScript errors
3. Verify database: `psql -U postgres -d keymus_chat -c "SELECT COUNT(*) FROM messages;"`
4. Test REST API with curl to isolate WebSocket vs backend issues
5. Check network tab in DevTools for failed requests
