# Deploy do Portal na VPS

## 1. Criar arquivo .env

Na pasta `portal/`, crie o arquivo `.env`:

```bash
nano /root/traccarpro.com.br/portal/.env
```

Conteúdo (ajuste usuário, senha, banco):

```
DATABASE_URL="postgresql://usuario:senha@localhost:5432/traccarpro_portal"
NEXT_PUBLIC_APP_URL="https://traccarpro.com.br"
```

## 2. Banco PostgreSQL

Certifique-se de que o PostgreSQL está rodando e o banco existe:

```bash
sudo -u postgres psql -c "CREATE DATABASE traccarpro_portal;"   # se ainda não existir
```

## 3. Migrations

```bash
cd /root/traccarpro.com.br/portal
npx prisma migrate deploy
```

## 4. Build

```bash
npm run build
```

## 5. Rodar o Portal

### Opção A: PM2 (recomendado)

```bash
npm install -g pm2
cd /root/traccarpro.com.br/portal
pm2 start npm --name "portal" -- start
pm2 save
pm2 startup   # para iniciar automaticamente no boot
```

### Opção B: systemd

Crie `/etc/systemd/system/traccarpro-portal.service`:

```ini
[Unit]
Description=TraccarPro Portal (Next.js)
After=network.target postgresql.service

[Service]
Type=simple
User=root
WorkingDirectory=/root/traccarpro.com.br/portal
ExecStart=/usr/bin/npm run start
Restart=on-failure
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Depois:
```bash
sudo systemctl daemon-reload
sudo systemctl enable traccarpro-portal
sudo systemctl start traccarpro-portal
```

### Opção C: nohup (temporário)

```bash
cd /root/traccarpro.com.br/portal
nohup npm run start > portal.log 2>&1 &
```

## 6. Nginx – proxy para o Portal

O Next.js roda na porta 3000. Se o mesmo dominio tambem usa Traccar em `/login` e `/api`,
nao use `location /api` generico para o portal.
Roteie somente os endpoints do portal e coloque essas regras antes de `location /api` e `location /` do Traccar:

```nginx
upstream portal_backend {
    server 127.0.0.1:3000;
    keepalive 16;
}

location = /cadastro {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /cadastro/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /_next/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /admin {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /admin/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /proposta {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /proposta/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/signup-requests {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/signup-requests/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/onboarding {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/onboarding/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location = /api/admin/signup-requests {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}

location ^~ /api/admin/signup-requests/ {
    proxy_pass http://portal_backend;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
}
```

Recarregue o nginx:
```bash
sudo nginx -t && sudo systemctl reload nginx
```
