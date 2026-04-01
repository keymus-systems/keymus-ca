nginx 
_______
# HTTP — redirect everything to HTTPS
server {
    listen 80;
    server_name keymusecommerce.online www.keymusecommerce.online;
    return 301 https://$host$request_uri;
}

# HTTPS — main site + chat proxy
server {
    server_name keymusecommerce.online www.keymusecommerce.online;

    root /var/www/keymus-ca/dist;
    index home.html;

    location / {
        try_files $uri $uri/ /home.html;
    }

    location /chat/ {
        proxy_pass http://127.0.0.1:3001/;  # trailing slash REQUIRED — strips /chat/ prefix before forwarding
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/keymusecommerce.online/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/keymusecommerce.online/privkey.pem; # managed by Certbot
}

server {
    if ($host = www.keymusecommerce.online) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    if ($host = keymusecommerce.online) {
        return 301 https://$host$request_uri;
    } # managed by Certbot

    listen 80;
    server_name keymusecommerce.online www.keymusecommerce.online;
    return 404; # managed by Certbot
}

___
production env
____

# Chat Server Configuration
CHAT_PORT=3001

# PostgreSQL connection string
DATABASE_URL=postgresql://postgres:KaiKoder2024@localhost:5432/keymus_chat

# JWT secret - MUST match the main backend's JWT secret
JWT_SECRET=zY3QuqBioZYD8NUIHMzD7MDutJvIYuGOk0sMZqhNN1E

# Allowed origins (comma-separated)
ALLOWED_ORIGINS=https://keymusecommerce.online,https://www.keymusecommerce.online,http://localhost:8080,http://localhost:3000,http://127.0.0.1:8080,http://localhost:5500

# Guest token expiry
GUEST_TOKEN_EXPIRY=7d

# Rate limiting
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=60

# Email / SMTP Configuration (optional — emails logged to console if not set)
# For Gmail: Use an App Password (not your regular password)
# SMTP_HOST=smtp.gmail.com
# SMTP_PORT=587
# SMTP_USER=your-email@gmail.com
# SMTP_PASS=your-app-password
# EMAIL_FROM_NAME=Keymus Ecommerce
# EMAIL_FROM_ADDRESS=noreply@keymus.com
___
certbot
_____
root@vmi3170773:/etc/nginx/sites-available# sudo certbot --nginx -d keymusecommerce.online -d www.keymusecommerce.online
Saving debug log to /var/log/letsencrypt/letsencrypt.log
Requesting a certificate for keymusecommerce.online and www.keymusecommerce.online

Certbot failed to authenticate some domains (authenticator: nginx). The Certificate Authority reported these problems:
  Identifier: www.keymusecommerce.online
  Type:   dns
  Detail: DNS problem: NXDOMAIN looking up A for www.keymusecommerce.online - check that a DNS record exists for this domain; DNS problem: NXDOMAIN looking up AAAA for www.keymusecommerce.online - check that a DNS record exists for this domain

Hint: The Certificate Authority failed to verify the temporary nginx configuration changes made by Certbot. Ensure the listed domains point to this nginx server and that it is accessible from the internet.

Some challenges have failed.
Ask for help or search for solutions at https://community.letsencrypt.org. See the logfile /var/log/letsencrypt/letsencrypt.log or re-run Certbot with -v for more details.