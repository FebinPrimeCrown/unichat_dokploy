# mypanel-backend
My Panel Backend (FastAPI)

Nginx Configuration for SSE

server {
    server_name back.stage.panel.domainhostingcafe.com;

    keepalive_timeout 5;
    client_max_body_size 4G;

    access_log /root/mypanel-backend/logs/nginx-access.log;
    error_log /root/mypanel-backend/logs/nginx-error.log;
    underscores_in_headers on;

    listen 443 ssl; # managed by Certbot
    ssl_certificate /etc/letsencrypt/live/back.stage.panel.domainhostingcafe.com/fullchain.pem; # managed by Certbot
    ssl_certificate_key /etc/letsencrypt/live/back.stage.panel.domainhostingcafe.com/privkey.pem; # managed by Certbot
    include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot

    location / {
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-device_fingerprint $http_x_device_fingerprint;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Cookie $http_cookie;
        proxy_redirect off;

        if (!-f $request_filename) {
            proxy_pass http://app_server;
            break;
        }
    }

    location /users/vms/events {  # SSE endpoint
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header Host $http_host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_set_header X-device_fingerprint $http_x_device_fingerprint;
        proxy_set_header Authorization $http_authorization;
        proxy_set_header Cookie $http_cookie;
        
        # Disable buffering for SSE
        proxy_buffering off;
        proxy_cache off;
        proxy_pass http://app_server;

        # Increase timeout for long-lived connections
        proxy_read_timeout 36000;
        proxy_send_timeout 36000;
    }
}